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

import de.businesscode.bcdui.cache.CacheFactory;
import de.businesscode.bcdui.subjectsettings.SecurityException;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import net.sf.ehcache.Cache;
import net.sf.ehcache.Element;
import net.sf.ehcache.config.CacheConfiguration;

import org.apache.commons.codec.binary.Base64;
import org.apache.commons.codec.digest.DigestUtils;
import org.apache.commons.lang.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.authc.AuthenticationException;
import org.apache.shiro.authc.AuthenticationToken;
import org.apache.shiro.subject.Subject;
import org.apache.shiro.web.filter.AccessControlFilter;
import org.apache.shiro.web.filter.authc.AuthenticatingFilter;
import org.apache.shiro.web.util.SavedRequest;
import org.apache.shiro.web.util.WebUtils;

import java.io.IOException;
import java.io.Serializable;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Objects;
import java.util.UUID;

/**
 * The flow here is (start = not authenticated request)
 * <p>
 * <ol>
 * <li>Shiro asks {@link #isAccessAllowed(ServletRequest, ServletResponse, Object)}, which is false if subject is not authenticated
 * <li>{@link #onAccessDenied(ServletRequest, ServletResponse)} is called in unauthenticated case, here we detect if this a pending login-attempt (round-trip back from AD including auth-code token) or we save current request and initiate a redirect to oAuth authorization server and set redirect_url to link back to us
 * <li>OAuth server responses with "code" http parameter, as so {@link #isLoginRequest(ServletRequest, ServletResponse)} returns true here, as such {@link #onAccessDenied(ServletRequest, ServletResponse)} triggers {@link #executeLogin(ServletRequest, ServletResponse)}
 * <li>{@link #executeLogin(ServletRequest, ServletResponse)} queries {@link #createToken(ServletRequest, ServletResponse)} to create a token (which here is basically the auth-code we got from AD), this token is passed to {@link Subject#login(AuthenticationToken)}
 * <li>Shiro kicks in and asks each and every available realm to process the authentication token delegated in previous step, our OAuthRealm connects to AD, queries for user-property we need internally (user-id) and returns as authenticated principal. No authorization is done on this level, just
 * authentication, as such our oauth2 realm is authenticating only, and not authorizing
 * <li>whenever permission are checked, Shiro scans next realms to authorize, here our JdbcRealm loads properties from database according to principal (user-id)
 * <li>the {@link #onLoginSuccess(AuthenticationToken, Subject, ServletRequest, ServletResponse)} is overridden as to delegate to {@link #issueSuccessRedirect(ServletRequest, ServletResponse)} in order to redirect user to originally accessed url which was saved in step 2
 * <ol>
 * </p>
 * all final methods on these class define the flow and must not be changed.
 */
public class OAuthAuthenticatingFilter extends AuthenticatingFilter {

  public static enum RESPONSE_MODE {
    form_post("post"), get("get");

    private String httpMethod;

    private RESPONSE_MODE(String httpMethod) {
      this.httpMethod = httpMethod;
    }

    public String getHttpMethod() {
      return httpMethod;
    }
  }

  // Give some time to lookup pwd or do MFA etc. This is between opening the oAuth popup and the successful response from the authorization folder
  // For security reasons we want this short ,for convenience long. oAuth provider usually expire faster than 10 min anyway
  private static final int LOGIN_TIMEOUT_SEC = 10*60;
  private final Logger logger = LogManager.getLogger(getClass());
  protected static final String URL_PARAMETER_NAME = "oauth-provider-id";

  /**
   * we need to differentiate between provider instances (singletons, though) to handle redirectUrls by same instance implementation
   */
  private final String providerInstanceId = UUID.randomUUID().toString();
  protected final SecureRandom secureRandom = new SecureRandom();
  protected String clientId;
  protected String redirectUri;
  protected String authorizeEndpoint;
  protected String optionalProviderId;
  protected String scope;
  // Originally requested url (deep link) or else the value configured in shiro.ini or else "/"
  protected String successUrl;
  protected RESPONSE_MODE responseMode = RESPONSE_MODE.form_post;

  /**
   * @return the id of this instance
   */
  protected String getProviderInstanceId() {
    return providerInstanceId;
  }

  @Override
  public void setSuccessUrl(String successUrl) {
    this.successUrl = successUrl;
  }

  @Override
  public String getSuccessUrl() {
    return this.successUrl;
  }

  public void setResponseMode(String responseMode) {
    this.responseMode = RESPONSE_MODE.valueOf(responseMode);
  }

  public String getClientId() {
    return clientId;
  }

  public String getAuthorizeEndpoint() {
    return authorizeEndpoint;
  }

  public void setScope(String scope) {
    this.scope = scope;
  }

  public String getScope() {
    return scope;
  }

  /**
   * Optionally hard-wire redirectUri in shiro.ini
   * If not set it is derived from the servlet context (http(s)://myserver.com/ctsPath/oauth)
   * @param redirectUri
   */
  public void setRedirectUri(String redirectUri) {
    this.redirectUri = redirectUri;
  }

  /**
   * Unless configured in shiro.ini, we use the current requests base url + /oauth.
   * Make sure, all values that can show up here are configured at the oAuth authorization server
   */
  public String getRedirectUri(HttpServletRequest request) {
    if( redirectUri == null ) {
      String baseUrl = request.getScheme() + "://" +
          request.getServerName() +
          (request.getServerPort() == 80 || request.getServerPort() == 443 ? "" : ":" + request.getServerPort()) +
          request.getContextPath()+
          "/oauth";
      return baseUrl;
    }
    return redirectUri;
  }

  public void setAuthorizeEndpoint(String authorityUrl) {
    this.authorizeEndpoint = authorityUrl;
  }

  public void setClientId(String clientId) {
    this.clientId = clientId;
  }

  public String getOptionalProviderId() {
    return optionalProviderId;
  }

  public void setOptionalProviderId(String optionalProviderId) {
    this.optionalProviderId = optionalProviderId;
  }

  /**
   * supports .enable flag and also handles a round-trip from authorization server; in order to provide extend with your logic please override {@link #isEnabledByProvider(ServletRequest, ServletResponse)}
   */
  @Override
  protected final boolean isEnabled(ServletRequest request, ServletResponse response) throws ServletException, IOException {
    /*
     * disabled by configuration
     */
    if (!super.isEnabled(request, response)) {
      logger.trace(".disabled by configuration");
      return false;
    }

    /*
     * is a login-request, as re-issued by authority
     */
    if (isLoginRequest(request, response)) {
      logger.trace("processing authserver request");
      return true;
    }

    /*
     * delegate decision
     */
    return isEnabledByProvider(request, response);
  }

  /**
   * current implementation checks if parameter URL_PARAMETER_NAME equals to {@link #getOptionalProviderId()}. You can override this method to provide different recognition, i.e. if specific HTTP header is set (i.e. by proxy)
   *
   * @param request
   * @param response
   * @return true to enable processing, false to disable processing or null to delegate decision further
   */
  protected Boolean isEnabledByProvider(ServletRequest request, ServletResponse response) {
    if (StringUtils.isEmpty(getOptionalProviderId())) {
      return true;
    }

    /*
     * check optional enablement
     */
    return getOptionalProviderId().equals(request.getParameter(URL_PARAMETER_NAME));
  }

  @Override
  public void setLoginUrl(String loginUrl) {
    throw new RuntimeException("dont use .loginUrl, use .authorizeEndpoint instead");
  }

  /**
   * 2. creates {@link RequestContext} and sends http/302 with redirection to authority which will take over the authentication
   *
   * @param request
   * @param response
   * @throws IOException
   *           in case the redirect fails
   */
  @Override
  protected void redirectToLogin(ServletRequest request, ServletResponse response) throws IOException 
  {
    // Let's see where the user originally wanted to go to
    // This was stored on previous requests in de.businesscode.bcdui.subjectsettings.AuthenticationFilter as we only listen on /oauth
    String originalUrl = getSuccessUrl();
    SavedRequest sr = WebUtils.getSavedRequest(request);
    if( sr != null && sr.getMethod().equalsIgnoreCase(AccessControlFilter.GET_METHOD) && sr.getRequestUrl() != null ) originalUrl = sr.getRequestUrl();
    // Nothing configured and no previous request, then is is our last resort (and in most cases right) to be used later if login succeeded
    if( originalUrl == null ) originalUrl = ((HttpServletRequest)request).getContextPath();
    // In case we are root context, this will be empty. But setting location.href in js to an empty string does not have any effect, so we make sure it is / instead
    if( originalUrl.isEmpty() ) originalUrl = "/";
    
    // Store the state for dealing with the answer from the Identity Provider
    var requestContext = new RequestContext(this.providerInstanceId, originalUrl);
    RequestContext.put(requestContext.state, requestContext);
    
    // Bring the user to the Identity Provider
    var targetUrl = getAuthorizeEndpoint()
        + "?response_type=code"
        + "&scope=" + URLEncoder.encode(getScope(), StandardCharsets.UTF_8)
        + "&response_mode=" + this.responseMode.name()
        + "&redirect_uri=" + URLEncoder.encode(Objects.requireNonNull(getRedirectUri((HttpServletRequest) request), ".redirectUrl not configured"), StandardCharsets.UTF_8)
        + "&client_id=" + Objects.requireNonNull(this.getClientId(), ".clientId not configured")
        + "&state=" + URLEncoder.encode(requestContext.state, StandardCharsets.UTF_8)
        + "&nonce=" + URLEncoder.encode(requestContext.nonce, StandardCharsets.UTF_8)
        + "&code_challenge_method=S256&code_challenge=" + requestContext.codeVerifierS256Challenge;

    logger.trace("redirectToLogin url: '{}'", targetUrl);
    WebUtils.issueRedirect(request, response, targetUrl);
  }

  /**
   * {@link org.apache.shiro.web.filter.authc.AuthenticatingFilter#createToken}
   * @return authentication token which is used by {@link #executeLogin(ServletRequest, ServletResponse)} method
   */
  @Override
  protected AuthenticationToken createToken(ServletRequest request, ServletResponse response) throws Exception {
    String code = Objects.requireNonNull(StringUtils.trimToNull(((HttpServletRequest) request).getParameter("code")));
    String state = request.getParameter("state");
    RequestContext reqCtx = RequestContext.get(state);
    return new OAuthToken(this, this.clientId, getRedirectUri((HttpServletRequest) request), code, reqCtx.codeVerifier, reqCtx.nonce );
  }

  /**
   * User authenticated successfully against oAuth and is redirected to our pup-up,
   * which then informs its opener, usually login.html, to redirect to the target URL originally addressed
   */
  @Override
  protected boolean onLoginSuccess(AuthenticationToken token, Subject subject, ServletRequest request, ServletResponse response) throws Exception {
    String state = request.getParameter("state");
    // Something is wrong if no there
    RequestContext rc = RequestContext.get(state);
    if( rc != null ) {
      String originalTargetUrl = rc.originalTargetUrl;
      if( originalTargetUrl == null ) originalTargetUrl = getSuccessUrl();
      RequestContext.remove(state);
      
      response.setContentType("text/html");
      // We cannot http redirect here to support cookie SameSite=strict,
      // which means our newly created logged-in session would get lost again, because we would not receive the cookie
      response.getWriter().write(String.format("""
          <script>
            (function(targetUrl) {
              // Popup
              if( window.opener?.bcdui?.widgetNg.login.oAuthLoginOnSuccess ) {
                window.opener.bcdui.widgetNg.login.oAuthLoginOnSuccess( targetUrl );
                window.close();
              }
              // Inline
              else if( window?.bcdui?.widgetNg.login.oAuthLoginOnSuccess  ) {
                bcdui.widgetNg.login.oAuthLoginOnSuccess( targetUrl );
                window.close();
              }
              // Plain implementation or forwarded from an external link with a session
              else {
                location.href = targetUrl;
              }
            })("%s");
          </script>
        """, originalTargetUrl));
    } else {
      throw new SecurityException("Found an unknown state in the answer of an oAuth redirect");
    }
    return false; // prevent chain from processing since we have handled a redirect here
  }

  /**
   * Handles the failure scenario for a login attempt.
   * IWe provides a response indicating the login failure to the user.
   *
   * @param token the authentication token used during the login attempt
   * @param e the authentication exception that caused the login failure
   * @param request the servlet request containing details of the login attempt
   * @param response the servlet response object to send feedback to the client
   * @return always returns false to indicate the login attempt has failed
   */
  @Override
  protected boolean onLoginFailure(AuthenticationToken token, AuthenticationException e, ServletRequest request, ServletResponse response) {
    String state = request.getParameter("state");
    RequestContext.remove(state);

    response.setContentType("text/html");
    try {
      response.getWriter().write("""
          <script>
            document.write(
              `<h1 style='position:fixed;top:50%;left:50%;transform: translate(-50%, -50%);'>
                 We are sorry, login is not possible with that id. <br/>
                 Please retry later or contact your system administrator.
               </h1>`);
            // Close login popup, if we are one.
            if(window.opener) setTimeout( window.close, 8000 );
          </script>
        """);
    } catch (IOException e1) {
      logger.warn("Could not write Login failure message");
    }
    return false;
  }
  

  /**
   * according to redirect_url set previously in {@link #redirectToLogin(ServletRequest, ServletResponse)}
   *
   * @param request
   * @param response
   * @return true if this is a login request
   */
  @Override
  protected boolean isLoginRequest(ServletRequest request, ServletResponse response) {
    final var httpRequest = (HttpServletRequest) request;
    final var state = request.getParameter("state");
    final var requestContext = RequestContext.get(state);

    return
        this.responseMode.getHttpMethod().equalsIgnoreCase(httpRequest.getMethod())
        && httpRequest.getParameter("code") != null
        && requestContext != null
        && state != null && state.equals(requestContext.state)
        && this.providerInstanceId != null && this.providerInstanceId.equals(requestContext.providerInstanceId);
  }

  /**
   * 1. handles internal Shiro flow. It the request is an incoming request redirected from authorization-server, perform {@link #executeLogin(ServletRequest, ServletResponse)}, otherwise {@link #redirectToLogin(ServletRequest, ServletResponse)}
   */
  @Override
  protected boolean onAccessDenied(ServletRequest request, ServletResponse response) throws Exception {
    if (isLoginRequest(request, response)) {
      /*
       * current request is the redirection callback with authorization code provided from server, we translate to .executeLogin() in shiro flow, which delegates to authenticating realms.
       */
      return executeLogin(request, response);
    } else {
      /*
       * current request is non-authorized request, initiate the shiro login flow. We are on /oAuth here
       */
      redirectToLogin(request, response);
      return false;
    }
  }

  /**
   * @return random code, which can be used as code_verifier, base64url encoded
   */
  protected String createRandomString() {
    final var randomBytes = new byte[32];
    secureRandom.nextBytes(randomBytes);
    return Base64.encodeBase64URLSafeString(randomBytes);
  }

  /**
   * Context of currently ongoing oAuth authentication flows (from selecting authenticate with oauth until success or failure)
   * Since strict cookies are not send on redirects and flex not on posts, we cannot use Shiro's session level way of keeping this but use ehcache instead
   */
  protected class RequestContext implements Serializable {

    private static final long serialVersionUID = 5076472346968750646L;

    private final String state, providerInstanceId, codeVerifier, codeVerifierS256Challenge, originalTargetUrl, nonce;

    protected RequestContext(String providerInstanceId, String originalTargetUrl) {
      Objects.requireNonNull(providerInstanceId);
      this.state = createRandomString();
      this.nonce = createRandomString();
      this.providerInstanceId = providerInstanceId;
      this.codeVerifier = createRandomString();
      this.codeVerifierS256Challenge = Base64.encodeBase64URLSafeString(DigestUtils.sha256(this.codeVerifier));
      this.originalTargetUrl = originalTargetUrl;
    }
    
    static protected final String EHCACHE_NAME = "BcdSsoCache";
    static protected final Cache cache;
    static {
      CacheConfiguration config = new CacheConfiguration()
          .name(EHCACHE_NAME)
          .maxEntriesLocalHeap(100)
          .timeToLiveSeconds(LOGIN_TIMEOUT_SEC);
      cache = new Cache(config);
      CacheFactory.getCacheManager().addCacheIfAbsent(cache); ;
    }

    static protected void put(String key, RequestContext rc) {
      Element e = new Element(key, rc);
      cache.put(e);
    }

    static protected RequestContext get(String key) {
      if( key == null ) return null;
      Element e = cache.get(key);
      if( e == null ) return null;
      return (RequestContext)e.getObjectValue();
    }

    static protected void remove(String key) {
      cache.remove(key);
    }
  }
}
