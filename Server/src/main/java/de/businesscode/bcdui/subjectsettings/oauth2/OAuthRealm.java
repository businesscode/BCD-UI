/*
  Copyright 2010-2017 BusinessCode GmbH, Germany

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
import java.nio.charset.StandardCharsets;

import org.apache.commons.io.IOUtils;
import org.apache.commons.lang.StringUtils;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;
import org.apache.shiro.authc.AuthenticationException;
import org.apache.shiro.authc.AuthenticationInfo;
import org.apache.shiro.authc.AuthenticationToken;
import org.apache.shiro.authc.SimpleAuthenticationInfo;
import org.apache.shiro.realm.AuthenticatingRealm;

import com.google.gson.JsonElement;
import com.google.gson.JsonParser;

/**
 * This one is an authenticating realm only as such we obtain identity from resource server and let other realms obtain authorization data from elsewhere
 */
public class OAuthRealm extends AuthenticatingRealm {
  private static final String UTF8 = StandardCharsets.UTF_8.name();

  private final Logger logger = LogManager.getLogger(getClass());

  private String clientSecret;
  private String principalPropertyName;
  private String apiEndpoint;
  private String tokenEndpoint;
  private OAuthAuthenticatingFilter authenticator;

  /**
   * we need to set the instance of filter class to determine in realm if that should support processing, incase we have many realms bound with multiple
   * authenticators for given token
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
   * the API endpoint to obtain information about user basically providing JSON data containing {@link #getPrincipalPropertyName()} to extract
   * 
   * @param apiEndpoint
   */
  public void setApiEndpoint(String apiEndPoint) {
    this.apiEndpoint = apiEndPoint;
  }

  public String getApiEndpoint() {
    return apiEndpoint;
  }

  /**
   * secret we need to obtain access token from /token endpoint, used in {@link #createAccessToken(OAuthToken)}
   * 
   * @param clientSecret
   */
  public void setClientSecret(String clientSecret) {
    this.clientSecret = clientSecret;
  }

  /**
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

  /**
   * accepts {@link OAuthToken} and only from given authenticator, if provided
   */
  @Override
  public boolean supports(AuthenticationToken token) {
    return token instanceof OAuthToken && (getAuthenticator() == null || ((OAuthToken) token).isCreatedBy(getAuthenticator()));
  }

  /**
   * creates access token via {@link #createAccessToken(OAuthToken)} and passes to {@link #getUserPrincipal(String)} then constructs
   * {@link SimpleAuthenticationInfo} with returned principal
   */
  @Override
  protected AuthenticationInfo doGetAuthenticationInfo(AuthenticationToken authToken) {
    final OAuthToken oauthToken = (OAuthToken) authToken;
    final Object userPrincipal;
    try {
      userPrincipal = getUserPrincipal(createAccessToken(oauthToken));

      if (logger.isTraceEnabled()) {
        logger.trace("obtained user principal: " + userPrincipal);
      }

    } catch (IOException e) {
      throw new AuthenticationException("Failed to read user principal", e);
    }
    oauthToken.setPrincipal(userPrincipal);

    return new SimpleAuthenticationInfo(userPrincipal, oauthToken.getCredentials(), getName());
  }

  /**
   * implements getting user principal from resource server
   * 
   * @param accessToken
   *          - which is already obtained from authority server and ready to be used as a bearer
   * @return user principal, i.e. the email-address or other identifier
   * @throws IOException
   */
  protected Object getUserPrincipal(String accessToken) throws IOException {
    final String effectivePrincipalPropertyName = getPrincipalPropertyName();

    if (StringUtils.isEmpty(effectivePrincipalPropertyName)) {
      throw new RuntimeException(".principalPropertyName is not configured");
    }

    final URL url = new URL(getApiEndpoint());
    if (logger.isTraceEnabled()) {
      logger.trace("getting user principal from " + url);
    }
    final HttpURLConnection conn = (HttpURLConnection) url.openConnection();
    try {
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
        throw new IOException("extracting user princpial failed. response code: " + conn.getResponseCode() + "; " + conn.getResponseMessage());
      }
      // success
      try (InputStream is = conn.getInputStream()) {
        final String responseJson = IOUtils.toString(is, UTF8);
        if (logger.isTraceEnabled()) {
          logger.trace("response: " + responseJson);
        }
        return readJsonProperty(responseJson, effectivePrincipalPropertyName).getAsString();
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
   * @return
   * @throws IOException
   */
  protected String createAccessToken(OAuthToken oauthToken) throws IOException {
    if (logger.isTraceEnabled()) {
      logger.trace("creating access token for " + oauthToken);
    }

    final String effectiveTokenEndpoint = getTokenEndpoint();

    if (StringUtils.isEmpty(effectiveTokenEndpoint)) {
      throw new RuntimeException("not configured .tokenEndpoint");
    }

    final URL endPoint = new URL(effectiveTokenEndpoint);
    //@formatter:off
    String postParameters = "client_id=" + oauthToken.getClientId() +
        "&code=" + oauthToken.getAuthCode() +
        "&redirect_uri=" + oauthToken.getRedirectUrl() +
        "&grant_type=authorization_code" +
        "&client_secret=" + this.clientSecret;
    //@formatter:on

    if (logger.isTraceEnabled()) {
      logger.trace("requestParams: " + postParameters);
    }

    byte[] postData = postParameters.getBytes(StandardCharsets.UTF_8);
    int postDataLength = postData.length;

    final HttpURLConnection conn = (HttpURLConnection) endPoint.openConnection();
    try {
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

        return readJsonProperty(responseJson, "access_token").getAsString();
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
   * @param stringPropertyName
   * @return
   */
  protected JsonElement readJsonProperty(String jsonString, String propertyName) {
    return new JsonParser().parse(jsonString).getAsJsonObject().get(propertyName);
  }
}
