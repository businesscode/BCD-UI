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

import java.io.IOException;
import java.io.Serializable;
import java.net.URLEncoder;
import java.security.SecureRandom;
import java.util.Objects;
import java.util.UUID;

import org.apache.commons.codec.binary.Base64;
import org.apache.commons.codec.digest.DigestUtils;
import org.apache.commons.lang.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authc.AuthenticationToken;
import org.apache.shiro.session.Session;
import org.apache.shiro.subject.Subject;
import org.apache.shiro.web.filter.AccessControlFilter;
import org.apache.shiro.web.filter.authc.AuthenticatingFilter;
import org.apache.shiro.web.util.SavedRequest;
import org.apache.shiro.web.util.WebUtils;

import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;

/**
 * The flow here is (start = not authenticated request)
 * <p>
 * <ol>
 * <li>shiro asks {@link #isAccessAllowed(ServletRequest, ServletResponse, Object)}, which is false if subject is not authenticated
 * <li>{@link #onAccessDenied(ServletRequest, ServletResponse)} is called, here we detect if this a pending login-attempt (roundtrip back from AD including auth-code token) or we save current request and initiate a redirect to oauth authorization server and set redirect_url to link back to us
 * <li>server responses with "code" http parameter, as so {@link #isLoginRequest(ServletRequest, ServletResponse)} returns true here, as such {@link #onAccessDenied(ServletRequest, ServletResponse)} triggers {@link #executeLogin(ServletRequest, ServletResponse)}
 * <li>{@link #executeLogin(ServletRequest, ServletResponse)} queries {@link #createToken(ServletRequest, ServletResponse)} to create a token (which here is basically the auth-code we got from AD), this token is passed to {@link Subject#login(AuthenticationToken)}
 * <li>Shiro kicks in and asks each and every avaialable realm to process the authentication token delegated in previous step, our OAuthRealm connects to AD, queries for user-property we need internally (user-id) and returns as authenticated princial. No authorization is done on this level, just
 * authentication, as such our oauth2 realm is authenticating only, and not authorizing
 * <li>whenever permission are checked, Shiro scans next realms to authorize, here our jdbcrealm loads properties from database according to prinpical (user-id)
 * <li>the {@link #onLoginSuccess(AuthenticationToken, Subject, ServletRequest, ServletResponse)} is overriden as to delegate to {@link #issueSuccessRedirect(ServletRequest, ServletResponse)} in order to redirect user to originally accessed url which was saved in step 2
 * <ol>
 * </p>
 * all final methods on these class define the flow and must not be changed.
 */
public class OAuthAuthenticatingFilter extends AuthenticatingFilter {
  private static final String UTF8 = "UTF-8";
  private static final String SESSION_ATTR_KEY_REQUEST_CONTEXT = "OAuthAuthenticatingFilter.requestContext";

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

  private final Logger logger = LogManager.getLogger(getClass());

  /**
   * we need to differentiate between provider instances (singletons, though) to handle redirectUrls by same instance implementation
   */
  private final String providerInstanceId = UUID.randomUUID().toString();
  protected final SecureRandom secureRandom = new SecureRandom();
  protected String clientId;
  protected String redirectUri;
  protected String authorizeEndpoint;
  protected String urlParameterName = "oauth-provider-id";
  protected String optionalProviderId;
  protected String scope;
  // we override this one
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

  public void setRedirectUri(String redirectUri) {
    this.redirectUri = redirectUri;
  }

  public String getRedirectUri() {
    return redirectUri;
  }

  public void setAuthorizeEndpoint(String authorityUrl) {
    this.authorizeEndpoint = authorityUrl;
  }

  public void setClientId(String clientId) {
    this.clientId = clientId;
  }

  public String getUrlParameterName() {
    return urlParameterName;
  }

  public void setUrlParameterName(String urlParameterName) {
    this.urlParameterName = Objects.requireNonNull(StringUtils.trimToNull(urlParameterName), ".urlParameterName");
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
   * current implementation checks if parameter {@link #getUrlParameterName()} equals to {@link #getOptionalProviderId()}. You can override this method to provide different recognition, i.e. if specific HTTP header is set (i.e. by proxy)
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
    return getOptionalProviderId().equals(request.getParameter(getUrlParameterName()));
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
   *           in case the redirect failes
   */
  @Override
  protected void redirectToLogin(ServletRequest request, ServletResponse response) throws IOException {
    var requestContext = createRequestContext(request);

    saveRequestContext(request, requestContext);

    // @formatter:off
    var targetUrl = getAuthorizeEndpoint()
        + "?response_type=code"
        + "&scope=" + URLEncoder.encode(getScope(), UTF8)
        + "&response_mode=" + this.responseMode.name()
        + "&redirect_uri=" + URLEncoder.encode(Objects.requireNonNull(getRedirectUri(), ".redirectUrl not configured"), UTF8)
        + "&client_id=" + Objects.requireNonNull(this.getClientId(), ".clientId not configured")
        + "&state=" + URLEncoder.encode(requestContext.state, UTF8)
        + "&nonce=" + URLEncoder.encode(createRandomString(), UTF8)
        + "&code_challenge_method=S256&code_challenge=" + requestContext.codeVerifierS256Challenge;
    // @formatter:on

    logger.trace("redirectToLogin url: '{}'", targetUrl);
    WebUtils.issueRedirect(request, response, targetUrl);
  }

  /**
   * @param request
   * @return request context instance
   */
  protected RequestContext createRequestContext(ServletRequest request) {
    return new RequestContext(this.providerInstanceId);
  }

  /**
   * retrieves previously saved context from session, also see {@link #saveRequestContext(ServletRequest, RequestContext)}
   *
   * @param request
   * @return previously created and saved requestcontext
   * @throws
   */
  protected RequestContext retrieveRequestContext(ServletRequest request) {
    return retrieveSessionProperty(request, SESSION_ATTR_KEY_REQUEST_CONTEXT, (RequestContext) null);
  }

  /**
   * saves context on in session, see {@link #retrieveRequestContext(ServletRequest)}
   *
   * @param request
   * @param requestContext
   */
  protected void saveRequestContext(ServletRequest request, RequestContext requestContext) {
    saveSessionProperty(request, SESSION_ATTR_KEY_REQUEST_CONTEXT, requestContext);
  }

  /**
   * @return authentication token which is used by {@link #executeLogin(ServletRequest, ServletResponse)} method
   */
  @Override
  protected AuthenticationToken createToken(ServletRequest request, ServletResponse response) throws Exception {
    return new OAuthToken(this, this.clientId, getRedirectUri(), Objects.requireNonNull(StringUtils.trimToNull(((HttpServletRequest) request).getParameter("code")), "http parameter 'code' missing"), retrieveRequestContext(request).codeVerifier);
  }

  @Override
  protected boolean onLoginSuccess(AuthenticationToken token, Subject subject, ServletRequest request, ServletResponse response) throws Exception {
    retrieveRequestContext(request).invalidate();
    issueSuccessRedirect(request, response);
    return false; // prevent chain from processing since we have handled a redirect here
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
    final var requestContext = retrieveRequestContext(request);

    // @formatter:off
    return
        this.responseMode.getHttpMethod().equalsIgnoreCase(httpRequest.getMethod())
        && httpRequest.getParameter("code") != null
        && requestContext != null && requestContext.isValid()
        && state != null && state.equals(requestContext.state)
        && this.providerInstanceId != null && this.providerInstanceId.equals(requestContext.providerInstanceId);
    // @formatter:on
  }

  @SuppressWarnings("unchecked")
  protected <T> T retrieveSessionProperty(ServletRequest request, Serializable key, T defaultValue) {
    final Subject subject = SecurityUtils.getSubject();
    final Session session = subject.getSession(false);
    if (session != null) {
      T val = (T) session.getAttribute(key);
      return val != null ? val : defaultValue;
    }
    return null;
  }

  protected void saveSessionProperty(ServletRequest request, Serializable key, Serializable value) {
    SecurityUtils.getSubject().getSession(true).setAttribute(key, value);
  }

  /**
   * creates a state value used to prevent CRSF
   *
   * @return random string
   */
  protected String createStateValue() {
    return createRandomString();
  }

  /**
   * 1. handles internal shiro flow. It the request is an incoming request redirected from authorization-server, perform {@link #executeLogin(ServletRequest, ServletResponse)}, otherwise {@link #redirectToLogin(ServletRequest, ServletResponse)}
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
       * current request is non-authorized request, initiate the shiro login flow
       */

      if (getSavedRequest(request) != null) {
        /*
         * we do not override the previously saved request, which can happen if chaining shiro filters
         */
        redirectToLogin(request, response);
      } else {
        saveRequestAndRedirectToLogin(request, response);
      }
      return false;
    }
  }

  /**
   * pendant to {@link #saveRequest(ServletRequest)}, which is missing in {@link AccessControlFilter} implementation
   *
   * @param request
   * @return
   */
  protected SavedRequest getSavedRequest(ServletRequest request) {
    return WebUtils.getSavedRequest(request);
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
   * @param value
   * @return SHA256-hashed string as base64 url encoded which can be used as a challenge
   */
  protected String createSha256String(String value) {
    return Base64.encodeBase64URLSafeString(DigestUtils.sha256(value));
  }

  /**
   * authentication request context
   */
  protected class RequestContext implements Serializable {
    private static final long serialVersionUID = 1L;
    private final String state, providerInstanceId, codeVerifier, codeVerifierS256Challenge;
    private boolean valid = true;

    protected RequestContext(String providerInstanceId) {
      Objects.requireNonNull(providerInstanceId);
      this.state = createRandomString();
      this.providerInstanceId = providerInstanceId;
      this.codeVerifier = createRandomString();
      this.codeVerifierS256Challenge = createSha256String(this.codeVerifier);
    }

    public boolean isValid() {
      return valid;
    }

    public void invalidate() {
      this.valid = false;
    }
  }
}
