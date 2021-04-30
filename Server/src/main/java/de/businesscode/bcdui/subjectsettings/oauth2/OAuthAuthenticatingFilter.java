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

import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.util.UUID;

import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.lang.StringUtils;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authc.AuthenticationToken;
import org.apache.shiro.session.Session;
import org.apache.shiro.subject.Subject;
import org.apache.shiro.web.filter.authc.AuthenticatingFilter;
import org.apache.shiro.web.util.WebUtils;

/**
 * @formatter:off
 * The flow here is (start = not authenticated request)
 * 
 * 1. shiro asks {@link #isAccessAllowed(ServletRequest, ServletResponse, Object)}, which is false if subject is not authenticated
 * 2. {@link #onAccessDenied(ServletRequest, ServletResponse)} is called, here we detect if this a pending login-attempt (roundtrip back from AD including auth-code token) or we save current request and initiate a redirect to oauth authorization server and set redirect_url to link back to us
 * 3. server responses with "code" http parameter, as so {@link #isLoginRequest(ServletRequest, ServletResponse)} returns true here, as such {@link #onAccessDenied(ServletRequest, ServletResponse)} triggers {@link #executeLogin(ServletRequest, ServletResponse)}
 * 4. {@link #executeLogin(ServletRequest, ServletResponse)} queries {@link #createToken(ServletRequest, ServletResponse)} to create a token (which here is basically the auth-code we got from AD), this token is passed to {@link Subject#login(AuthenticationToken)}
 * 5. Shiro kicks in and asks each and every avaialable realm to process the authentication token delegated in previous step, our OAuthRealm connects to AD, queries for user-property we need internally (user-id) and returns as authenticated princial. No authorization is done on this level, just authentication, as such our oauth2 realm is authenticating only, and not authorizing
 * 6. whenever permission are checked, Shiro scans next realms to authorize, here our jdbcrealm loads properties from database according to prinpical (user-id)
 * 7. the {@link #onLoginSuccess(AuthenticationToken, Subject, ServletRequest, ServletResponse)} is overriden as to delegate to {@link #issueSuccessRedirect(ServletRequest, ServletResponse)} in order to redirect user to originally accessed url which was saved in step 2
 * 
 * @formatter:on
 * 
 * all final methods on these class define the flow and must not be changed.
 */
public class OAuthAuthenticatingFilter extends AuthenticatingFilter {
  private static final String UTF8 = "UTF-8";

  public static final String SESSION_ATTR_KEY_AUTH_STATE = "OAuthAuthenticatingFilter.authState";
  public static final String SESSION_ATTR_KEY_PROVIDER_INSTANCE_ID = "OAuthAuthenticatingFilter.instanceId";
  public static final String SESSION_ATTR_KEY_ORIG_URL = "OAuthAuthenticatingFilter.origUrl";

  /**
   * we need to differentiate between provider instances (singletons, though) to handle redirectUrls by same instance implementation
   */
  private final String providerInstanceId = UUID.randomUUID().toString();

  private final Logger logger = LogManager.getLogger(getClass());

  protected String clientId;
  protected String redirectUrl;
  protected String authorizeEndpoint;
  protected String urlParameterName = "oauth-provider-id";
  protected String optionalProviderId;
  protected String authScope;
  // we override this one
  protected String successUrl;

  /**
   * override successUrl and dont set a default one, since successUrl is usually a redirectUrl in our case, but in case we provide successUrl this will be
   * explicitely redirected after successful login overriding whatever original url user navigated to
   */
  @Override
  public void setSuccessUrl(String successUrl) {
    this.successUrl = successUrl;
  }

  @Override
  public String getSuccessUrl() {
    return this.successUrl;
  }

  public String getClientId() {
    return clientId;
  }

  public String getAuthorizeEndpoint() {
    return authorizeEndpoint;
  }

  public void setAuthScope(String authScope) {
    this.authScope = authScope;
  }

  /**
   * @return the scope as of oauth2, contains space separated scopes. must not be encoded as it will happen later
   */
  public String getAuthScope() {
    return authScope;
  }

  /**
   * sets the /authorize endpoint
   * 
   * @param authorityUrl
   */
  public void setAuthorizeEndpoint(String authorityUrl) {
    this.authorizeEndpoint = authorityUrl;
  }

  public void setRedirectUrl(String redirectUrl) {
    this.redirectUrl = redirectUrl;
  }

  public void setClientId(String clientId) {
    this.clientId = clientId;
  }

  public String getUrlParameterName() {
    return urlParameterName;
  }

  public String getRedirectUrl() {
    return redirectUrl;
  }

  public void setUrlParameterName(String urlParameterName) {
    if (StringUtils.isEmpty(urlParameterName)) {
      throw new RuntimeException("parameter must not be empty");
    }
    this.urlParameterName = urlParameterName;
  }

  public String getOptionalProviderId() {
    return optionalProviderId;
  }

  public void setOptionalProviderId(String optionalProviderId) {
    this.optionalProviderId = optionalProviderId;
  }

  /**
   * supports .enable flag and also handles a round-trip from authorization server; in order to provide extend with your logic please override
   * {@link #isEnabledByProvider(ServletRequest, ServletResponse)}
   */
  @Override
  protected final boolean isEnabled(ServletRequest request, ServletResponse response) throws ServletException, IOException {
    /*
     * disabled by configuration
     */
    if (!super.isEnabled(request, response)) {
      if (!logger.isTraceEnabled()) {
        logger.trace(".disabled by configuration");
      }
      return false;
    }

    /*
     * is a login-request, as re-issued by authority
     */
    if (isLoginRequest(request, response)) {
      if (logger.isTraceEnabled()) {
        logger.trace("filter enabled due to a callback in progress");
      }
      return true;
    }

    /*
     * delegate decision
     */
    return isEnabledByProvider(request, response);
  }

  /**
   * current implementation checks if parameter {@link #getUrlParameterName()} equals to {@link #getOptionalProviderId()}. You can override this method to
   * provide different recognition, i.e. if specific HTTP header is set (i.e. by proxy)
   * 
   * @param request
   * @param response
   * @return true to enable processing, false to disable processing or null to delegate decision further
   */
  protected Boolean isEnabledByProvider(ServletRequest request, ServletResponse response) {
    if (getOptionalProviderId() == null) {
      return true;
    }

    /*
     * check optional enablement
     */
    return getOptionalProviderId().equals(request.getParameter(getUrlParameterName()));
  }

  @Override
  public void setLoginUrl(String loginUrl) {
    throw new RuntimeException("Not Supported");
  }

  /**
   * @param request
   * @param response
   * @return either configured redirectUrl or construct one to the context; currently .redirectUrl must be provided
   * @throws UnsupportedEncodingException
   */
  protected String constructRedirectUrl(ServletRequest request, ServletResponse response) throws IOException {
    if (this.redirectUrl == null) {
      throw new IOException(".redirectUrl is not provided.");
    }
    return URLEncoder.encode(this.redirectUrl, UTF8);
  }

  /**
   * need custom override, as such {@link #getLoginUrl()} is ineffective, because we need to construct redirect_uri the utilities of
   * {@link HttpServletResponse}. This method uses {@link #constructLoginUrl(ServletRequest, ServletResponse)} to create a login url to authority.
   * 
   * @param request
   * @param response
   * @throws IOException
   */
  @Override
  protected final void redirectToLogin(ServletRequest request, ServletResponse response) throws IOException {
    final String targetUrl = constructLoginUrl(request, response);
    if (logger.isTraceEnabled()) {
      logger.trace("redirectToLogin url: " + targetUrl);
    }
    WebUtils.issueRedirect(request, response, targetUrl);
  }

  /**
   * This method basically knows how to construct a login url to authority and delegate creation of redirect_uri to
   * {@link #constructRedirectUrl(ServletRequest, ServletResponse)}.
   * 
   * @see {@link #isLoginRequest(ServletRequest, ServletResponse)}
   * @param request
   * @param response
   * @return
   * @throws IOException
   */
  protected String constructLoginUrl(ServletRequest request, ServletResponse response) throws IOException {
    return getAuthorizeEndpoint() + "?response_type=code&scope=" + URLEncoder.encode(getAuthScope(), UTF8) + "&response_mode=form_post&redirect_uri="
        + constructRedirectUrl(request, response) + "&client_id=" + this.clientId + "&state="
        + URLEncoder.encode(retrieveSessionProperty(request, SESSION_ATTR_KEY_AUTH_STATE, "void"), UTF8) + "&nonce=" + UUID.randomUUID().toString();
  }

  /**
   * @return authentication token which is used by {@link #executeLogin(ServletRequest, ServletResponse)} method
   */
  @Override
  protected AuthenticationToken createToken(ServletRequest request, ServletResponse response) throws Exception {
    return new OAuthToken(this, this.clientId, this.redirectUrl, ((HttpServletRequest) request).getParameter("code"));
  }

  /**
   * delegate here to {@link #issueSuccessRedirect(ServletRequest, ServletResponse)} which we previously saved in
   * {@link #onAccessDenied(ServletRequest, ServletResponse)}
   */
  @Override
  protected final boolean onLoginSuccess(AuthenticationToken token, Subject subject, ServletRequest request, ServletResponse response) throws Exception {
    final String successUrl = getSuccessUrl();
    if (StringUtils.isEmpty(successUrl)) { // if not defined, we navigate to previously saved url
      if( SecurityUtils.getSubject().getSession(false) != null && SecurityUtils.getSubject().getSession(false).getAttribute(SESSION_ATTR_KEY_ORIG_URL) != null ) {
        String origUrl = SecurityUtils.getSubject().getSession(false).getAttribute(SESSION_ATTR_KEY_ORIG_URL).toString();
        if( origUrl.startsWith(getServletContext().getContextPath()) ) origUrl = origUrl.substring(getServletContext().getContextPath().length());
        WebUtils.issueRedirect(request, response, origUrl);
      } else {
        issueSuccessRedirect(request, response);
      }
    } else {
      WebUtils.issueRedirect(request, response, successUrl);
    }
    // prevent chain from processing since we have handled a redirect here
    return false;
  }

  /**
   * according to redirect_url set previously in {@link #redirectToLogin(ServletRequest, ServletResponse)}
   * 
   * @param request
   * @param response
   * @return
   */
  @Override
  protected boolean isLoginRequest(ServletRequest request, ServletResponse response) {
    final HttpServletRequest httpRequest = (HttpServletRequest) request;
    final String stateValue = request.getParameter("state");

    return "post".equalsIgnoreCase(httpRequest.getMethod()) && httpRequest.getParameter("code") != null
        && stateValue != null && stateValue.equals(retrieveSessionProperty(request, SESSION_ATTR_KEY_AUTH_STATE, "void"))
        && this.providerInstanceId != null && this.providerInstanceId.equals(retrieveSessionProperty(request, SESSION_ATTR_KEY_PROVIDER_INSTANCE_ID, "void"));
  }

  @SuppressWarnings("unchecked")
  protected <T> T retrieveSessionProperty(ServletRequest request, String key, T defaultValue) {
    final Subject subject = SecurityUtils.getSubject();
    final Session session = subject.getSession(false);
    if (session != null) {
      T val = (T) session.getAttribute(key);
      return val != null ? val : defaultValue;
    }
    return null;
  }

  protected void saveSessionProperty(ServletRequest request, String key, String value) {
    final Subject subject = SecurityUtils.getSubject();
    final Session session = subject.getSession();
    session.setAttribute(key, value);
  }

  /**
   * creates a state value used to prevent CRSF. this implementation creates UUID
   */
  protected String createStateValue() {
    return UUID.randomUUID().toString();
  }

  /**
   * handle {@link #saveRequestAndRedirectToLogin(ServletRequest, ServletResponse)} and redirection to authorization server, in addition creates a state, which
   * is checked in {@link #isLoginRequest(ServletRequest, ServletResponse)} to prevent CSRF and used in
   * {@link #constructLoginUrl(ServletRequest, ServletResponse)} to serialize a state to URL
   */
  @Override
  protected final boolean onAccessDenied(ServletRequest request, ServletResponse response) throws Exception {
    final boolean isLoggedIn;

    if (isLoginRequest(request, response)) {
      isLoggedIn = executeLogin(request, response);
    } else {
      isLoggedIn = false;

      saveSessionProperty(request, SESSION_ATTR_KEY_AUTH_STATE, createStateValue());
      saveSessionProperty(request, SESSION_ATTR_KEY_PROVIDER_INSTANCE_ID, this.providerInstanceId);
      saveSessionProperty(request, SESSION_ATTR_KEY_ORIG_URL, WebUtils.getSavedRequest(request)!=null ? WebUtils.getSavedRequest(request).getRequestUrl() : "/");

      /*
       * redirect to login-url (which is authorization server)
       */
      saveRequestAndRedirectToLogin(request, response);
    }
    
    return isLoggedIn;
  }
}
