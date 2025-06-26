/*
  Copyright 2010-2025 BusinessCode GmbH, Germany

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
package de.businesscode.bcdui.subjectsettings.oauth2;

import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Objects;

import javax.net.ssl.HttpsURLConnection;
import javax.sql.DataSource;

import de.businesscode.bcdui.subjectsettings.PrimaryPrincipal;
import de.businesscode.util.jdbc.wrapper.BcdSqlLogger;
import org.apache.commons.dbutils.QueryRunner;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang.StringUtils;
import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.authc.AuthenticationException;
import org.apache.shiro.authc.AuthenticationInfo;
import org.apache.shiro.authc.AuthenticationToken;
import org.apache.shiro.authc.SimpleAuthenticationInfo;
import org.apache.shiro.realm.AuthenticatingRealm;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import de.businesscode.bcdui.subjectsettings.SubjectSettings;
import de.businesscode.bcdui.toolbox.config.BareConfiguration;
import de.businesscode.sqlengine.SQLEngine;
import de.businesscode.util.Utils;

/**
 * This Realm will accept logins from trusted oAuth authentication servers
 * Per default we also require the user to be found in bcd_sec_user to not lose control, as bcdAuthc resources only need a session and no permissions!
 * For permissions, which are added in BCD-UI JdbcRealm, entries in bcd_sec_user_settings are anyway necessary
 * This one is an authenticating realm only as such we obtain identity from resource server and let other realms obtain authorization data from elsewhere
 */
public class OAuthRealm extends AuthenticatingRealm {
  private static final String UTF8 = StandardCharsets.UTF_8.name();

  private final Logger logger = LogManager.getLogger(getClass());
  
  // OpenId standard names
  static protected final String ACCESS_TOKEN_NAME = "access_token";
  static protected final String ID_TOKEN_NAME = "id_token";

  // Mandatory settings, check your authentication provider
  private String clientSecret; // Needed even for PKCE flows for Azure unless the application is marked as public, i.e. being an unsafe client, Google always currently needs it (2025)
  private String tokenEndpoint;
  private OAuthAuthenticatingFilter authenticator;
  // This applies to the access token if no user info call is used, otherwise to the user info
  private String principalPropertyName = "email";
  // If true: No entry in bcd_sec_user necessary, it means everybody can get a session and access authc resources
  // Usually not what you want
  // Additional permissions will be read from bcd_sec_user_settings in both case true or false
  private boolean skipBcdSecUserTest = false;

  // Optional settings
  private String userInfoEndpoint; // If this class is overwritten and more then the identity, which can be derived from the token is needed.
  private boolean disableSslValidation = false; // For testing only

  public void setDisableSslValidation(boolean disableSslValidation) {
    this.disableSslValidation = disableSslValidation;
  }

  /**
   * Set in shiro.ini
   * We need to set the instance of filter class to determine in realm if that should support processing, in case we have many realms bound with multiple authenticators for given token
   *
   * @param authenticator
   */
  public void setAuthenticator(OAuthAuthenticatingFilter authenticator) {
    this.authenticator = authenticator;
  }

  public OAuthAuthenticatingFilter getAuthenticator() {
    return authenticator;
  }

  /**
   * Set in shiro.ini
   * sets the endpoint to /token API
   *
   * @param tokenEndpoint
   */
  public void setTokenEndpoint(String tokenEndpoint) {
    this.tokenEndpoint = tokenEndpoint;
  }

  public String getTokenEndpoint() {
    return tokenEndpoint;
  }

  /**
   * Set in shiro.ini
   * the API endpoint to obtain information about user basically providing JSON data containing {@link #getPrincipalPropertyName()} to extract
   *
   * @param apiEndPoint
   *          The endpoint to get principal's JSON
   */
  public void setUserInfoEndpoint(String apiEndPoint) {
    this.userInfoEndpoint = apiEndPoint;
  }

  public String getUserInfoEndpoint() {
    return userInfoEndpoint;
  }

  /**
   * Set in shiro.ini
   * secret we need to obtain access token from /token endpoint, used in {@link #callTokenEndpoint(OAuthToken, String)}
   *
   * @param clientSecret
   */
  public void setClientSecret(String clientSecret) {
    this.clientSecret = clientSecret;
  }

  /**
   * Overwrite default in shiro.ini
   * this is the property we extract from JSON response and use as a principal
   *
   * @param principalPropertyName
   */
  public void setPrincipalPropertyName(String principalPropertyName) {
    this.principalPropertyName = principalPropertyName;
  }

  public String getPrincipalPropertyName() {
    return principalPropertyName;
  }


  public boolean getSkipBcdSecUserTest() {
    return skipBcdSecUserTest;
  }

  public void setSkipBcdSecUserTest(boolean skipBcdSecUserTest) {
    this.skipBcdSecUserTest = skipBcdSecUserTest;
  }

  /**
   * accepts {@link OAuthToken} and only from given authenticator, if provided
   */
  @Override
  public boolean supports(AuthenticationToken token) {
    return token instanceof OAuthToken && (getAuthenticator() == null || ((OAuthToken) token).isCreatedBy(getAuthenticator()));
  }

  /**
   * creates access token via {@link #callTokenEndpoint(OAuthToken, String)} and passes to {@link #retrieveUserPrincipal(OAuthToken)} then constructs {@link SimpleAuthenticationInfo} with returned principal
   */
  @Override
  protected AuthenticationInfo doGetAuthenticationInfo(AuthenticationToken authToken) {
    final OAuthToken oauthToken = (OAuthToken) authToken;
    final PrincipalInfo localPi;
    try {
      final String providedPrincipal = retrieveUserPrincipal(oauthToken);
      oauthToken.setPrincipal(Objects.requireNonNull(providedPrincipal, "user-principal was not provided"));
      localPi = getPrincipleInfo(providedPrincipal);
      if( !assurePrincipleIsAllowed(providedPrincipal, localPi) ) return null;
      PrimaryPrincipal pp = localPi != null ? new PrimaryPrincipal(localPi.userId, providedPrincipal, localPi.fullName)
          : new PrimaryPrincipal(providedPrincipal, providedPrincipal, providedPrincipal);
      return new SimpleAuthenticationInfo(pp, oauthToken.getCredentials(), getName());
    } catch (Exception e) {
      logger.warn("Failed to read user principal", e);
      throw new AuthenticationException("Failed to read user principal", e);
    }

  }

  protected record PrincipalInfo(String userId, String fullName) {}
  /**
   * Unless explicitly disabled, we do enforce existence of principal in bcd_sec_user here
   * to avoid everybody getting a session who is known to the remote system but not ours
   * Can also be used as an extension point for example test for an additional flag ncd bcd_sec_user etc by overwriting this class for an oAuth provider in shiro.ini
   * @param principal
   * @return null if no information in bcd_sec_user should be or can be found
   * @throws Exception
   */
  protected PrincipalInfo getPrincipleInfo(String principal) throws Exception
  {
    // If we should not check bcd_sec_user, we also do not search for the id and use the login_name instead (as user_id)
    if( skipBcdSecUserTest ) return null;

    // Otherwise make sure the user exists and get his user_id
    String dsName = SubjectSettings.getInstance().getDataSourceName();
    DataSource dataSource = BareConfiguration.getInstance().getUnmanagedDataSource(dsName);
    final PrincipalInfo pi;

    BcdSqlLogger.setLevel(Level.OFF);
    try {
      String stmt = """ 
            #set( $k = $bindings.bcd_sec_user )
            select $k.user_id_, $k.name_ 
            from $k.getPlainTableName() 
            where $k.user_login_ = ? and $k.user_id_ is not null and ($k.is_disabled_ is null or $k.is_disabled_<>'1')""";
      pi = new QueryRunner(dataSource, true).query(new SQLEngine().transform(stmt), rs -> {
        if (rs.next()) {
          return new PrincipalInfo(rs.getString(1), rs.getString(2));
        } else {
          return null;
        }
      }, principal);
    } catch( Exception e ) {
      throw new SecurityException("Error, could not read bcd_sec_user when verifying externally authenticated user "+principal+" in "+getName(), e);
    } finally {
      BcdSqlLogger.reset();
    }

    if( pi == null ) logger.warn("Principal '"+principal+"' not found in bcd_sec_user, but is is required in "+getName());
    return pi;
  }
  
  /**
   * Unless explicitly disabled, we do enforce existence of principal in bcd_sec_user here
   * to avoid everybody getting a session who is known to the remote system but not ours
   * Can also be used as an extension point for example test for an additional flag ncd bcd_sec_user etc by overwriting this class for an oAuth provider in shiro.ini
   * @param localPi
   * @param
   * @return
   */
  protected boolean assurePrincipleIsAllowed(String providedPrincipal, PrincipalInfo localPi) throws Exception {
    return skipBcdSecUserTest || localPi != null;
  }
  
  /**
   * implements retrieving user principal from resource server
   * First gets the id-token from the token endpoint
   * and then either retrieves it from the token 
   * or does an extra call to the info endpoint, if that is configured, which allows extracting more info in case we are overwritten 
   *
   * @param oauthToken
   *          - which is already obtained from authority server and ready to be used as a bearer
   * @return user principal, i.e. the email-address or other identifier
   * @throws IOException
   */
  protected String retrieveUserPrincipal(OAuthToken oauthToken) throws Exception {
    final String principalPropertyName = getPrincipalPropertyName();
    final String userPrincipal;

    // Usually we derive the principal name from the id-token
    // Only if the api-endpoint is explicitly set, we do another call to it to get it from there
    // Useful of this class is overwritten and more information is needed
    if (getUserInfoEndpoint() != null) {
      String accessToken = callTokenEndpoint(oauthToken, ACCESS_TOKEN_NAME);
      userPrincipal = getUserPrincipalFromUserInfoEndpoint(accessToken, principalPropertyName);
    } else {
      String idToken = callTokenEndpoint(oauthToken, ID_TOKEN_NAME);
      userPrincipal = getUserPrincipalFromIdToken(idToken, principalPropertyName, oauthToken.getNonce());
    }
    return userPrincipal;
  }

  /**
   * Default. Derive name of the principal from the ID token
   * @param accessToken
   * @return
   * @throws Exception
   */
  protected String getUserPrincipalFromIdToken(String accessToken, String principalPropertyName, String origNonce) throws Exception
  {
    // Simple parsing of OAUth id-tokens
    String[] parts = accessToken.split("\\.");
    if (parts.length != 3) throw new IllegalArgumentException(String.format("Invalid JWT, wrong number of parts found (%s instead of 3)", parts.length));

    String payloadString = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
    JsonObject payload = JsonParser.parseString(payloadString).getAsJsonObject();
    
    // We set the nonce in the authorization request and finding it in the token response assures there is not replay or man in the middle attack
    final String nonce = payload.get("nonce").getAsString();
    if( nonce == null || !nonce.equals(origNonce) ) throw new SecurityException("Received a wrong nonce in token response -> potential man in the middle attacK!");
    
    final String userPrincipal = payload.get(principalPropertyName).getAsString();
    return userPrincipal;
  }

  /**
   * Useful if overwriting this class to retrieve more properties of the principal than its unique name
   * Derive name of the principal from an extra call to the user info endpoint like https://graph.microsoft.com/v1.0/me/
   * Make sure the token we received earlier is allowed to access it, i.e. requested scope for example includes https://graph.microsoft.com/user.read
   * @param accessToken
   * @return
   * @throws Exception
   */
  protected String getUserPrincipalFromUserInfoEndpoint(String accessToken, String principalPropertyName) throws Exception
  {
    // Call the user info endpoint
    final URL url = new URL(getUserInfoEndpoint());
    if (logger.isTraceEnabled()) {
      logger.trace("getting user principal from " + url);
    }
    final HttpURLConnection conn = (HttpURLConnection) url.openConnection();
    try {
      if (conn instanceof HttpsURLConnection && this.disableSslValidation) {
        Utils.disableSslValidation((HttpsURLConnection) conn);
      }
      conn.setRequestMethod("GET");
      conn.setRequestProperty("Authorization", "Bearer " + accessToken);
      conn.setRequestProperty("Accept", "application/json");
      // error checking
      if (conn.getResponseCode() != HttpURLConnection.HTTP_OK) {
        try (InputStream is = conn.getErrorStream()) {
          if (is != null) {
            logger.error(IOUtils.toString(is, UTF8));
          }
        }
        throw new IOException("extracting user principal failed. response code: " + conn.getResponseCode() + "; " + conn.getResponseMessage());
      }
      // success, extract the principal name
      try (InputStream is = conn.getInputStream()) {
        final String responseJson = IOUtils.toString(is, UTF8);
        if (logger.isTraceEnabled()) {
          logger.trace("response: " + responseJson);
        }
        return readJsonProperty(responseJson, principalPropertyName, true).getAsString();
      }
    } finally {
      try {
        conn.disconnect();
      } catch (Exception e) {
        logger.warn("Ignore exception while disconnecting", e);
      }
    }
  }

  /**
   * call against oauth2.0 "/token" endpoint to obtain an access token
   *
   * @param oauthToken
   * @return The access token
   * @throws IOException
   */
  protected String callTokenEndpoint(OAuthToken oauthToken, String tokenProperty) throws IOException {
    if (logger.isTraceEnabled()) {
      logger.trace("creating access token for " + oauthToken);
    }

    final String effectiveTokenEndpoint = getTokenEndpoint();

    if (StringUtils.isEmpty(effectiveTokenEndpoint)) {
      throw new RuntimeException("not configured .tokenEndpoint");
    }

    final URL endPoint = new URL(effectiveTokenEndpoint);
    String postParameters = "client_id=" + URLEncoder.encode(oauthToken.getClientId(), UTF8) +
        "&code=" + URLEncoder.encode(oauthToken.getAuthCode(), UTF8) +
        "&redirect_uri=" + URLEncoder.encode(oauthToken.getRedirectUri(), UTF8) +
        "&grant_type=authorization_code" +
        // Not needed in PKCE flows if the application is public and if the auth server supports that scenario without client_secret
        (clientSecret != null && !clientSecret.isBlank() ? "&client_secret=" + URLEncoder.encode(clientSecret, UTF8) : "") +
        "&code_verifier=" + URLEncoder.encode(oauthToken.codeVerifier, UTF8);

    if (logger.isTraceEnabled()) {
      logger.trace("requestParams: " + postParameters);
    }

    byte[] postData = postParameters.getBytes(StandardCharsets.UTF_8);
    int postDataLength = postData.length;

    final HttpURLConnection conn = (HttpURLConnection) endPoint.openConnection();
    try {
      if (conn instanceof HttpsURLConnection && this.disableSslValidation) {
        Utils.disableSslValidation((HttpsURLConnection) conn);
      }

      conn.setDoOutput(true);
      conn.setInstanceFollowRedirects(false);
      conn.setUseCaches(false);
      conn.setRequestMethod("POST");
      conn.setRequestProperty("Content-Type", "application/x-www-form-urlencoded");
      conn.setRequestProperty("charset", "utf-8");
      conn.setRequestProperty("Content-Length", Integer.toString(postDataLength));

      try (DataOutputStream wr = new DataOutputStream(conn.getOutputStream())) {
        wr.write(postData);
      }
      // error checking
      if (conn.getResponseCode() != HttpURLConnection.HTTP_OK) {
        try (InputStream is = conn.getErrorStream()) {
          if (is != null) {
            logger.error(IOUtils.toString(is, UTF8));
          }
        }
        throw new IOException("createAccessToken failed. response code: " + conn.getResponseCode() + "; " + conn.getResponseMessage());
      }
      // success
      try (InputStream is = conn.getInputStream()) {
        final String responseJson = IOUtils.toString(is, UTF8);

        if (logger.isTraceEnabled()) {
          logger.trace("response: " + responseJson);
        }

        return readJsonProperty(responseJson, tokenProperty, true).getAsString();
      }
    } finally {
      try {
        conn.disconnect();
      } catch (Exception e) {
        logger.warn("Ignore exception while disconnecting", e);
      }
    }
  }

  /**
   * helper to access plain property of a json string, i.e. readJsonProperty('{ foo:"bar" }', "foo").getAsString() returns "bar"
   *
   * @param jsonString
   * @param propertyName
   * @param isPropertyRequired
   * @return The property
   */
  protected JsonElement readJsonProperty(String jsonString, String propertyName, boolean isPropertyRequired) {
    var json = JsonParser.parseString(jsonString).getAsJsonObject();
    if (isPropertyRequired && !json.has(propertyName)) {
      Objects.requireNonNull(null, "property '" + propertyName + "' is missing");
    }
    return json.get(propertyName);
  }
}
