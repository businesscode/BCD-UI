/*
  Copyright 2026-2026 BusinessCode GmbH, Germany

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
package de.businesscode.bcdui.subjectsettings.services;

import java.io.IOException;
import java.util.Map;

import de.businesscode.bcdui.logging.LoginSqlLogger;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.authc.AuthenticationException;

import static de.businesscode.util.Utils.getRemoteAddr;

/**
 * Servlet filter for a trusted backend caller acting on behalf of a BCD-UI user without that user
 * having a browser session - e.g. a bot acting for a user.
 * It expects a trusted caller (a shared secret), and an on-behalf-of identity in the form (idType/onBehalfId),
 * which could, for example, be a phone number.
 * The secret is verified and the identity resolved to a BCD-UI user id by {@link OnBehalfIdentityRealm}.
 *
 * The created authorization scope is just the current request: {@link RequestSession},
 * it destroys that session after the request finishes again on close.
 *
 * Pure shiro.ini configuration, just register here and add {@link OnBehalfIdentityRealm} to the realm chain:
 * <pre>
 * bcdRequestAuthentication = de.businesscode.bcdui.subjectsettings.services.RequestAuthenticationFilter
 * bcdOnBehalfIdentityRealm = de.businesscode.bcdui.subjectsettings.services.OnBehalfIdentityRealm
 * bcdOnBehalfIdentityRealm.trustedClientsSecrets = ##shared-secret-1##, ##shared-secret-n##
 * securityManager.realms = ..., $bcdOnBehalfIdentityRealm, ...
 * ...
 * [urls]
 * /bcdui/mcp/** = bcdRequestAuthentication
 * </pre>
 *
 * By default a request without the {@value #HEADER_CLIENT_SECRET} header is rejected - this filter is
 * meant to be the sole gate for its path (e.g. {@code /mcp/**}, a pure machine-to-machine endpoint).
 * Set {@link #setOptional(boolean)} to {@code true} to instead let such a request fall through to the
 * next filter in the chain unauthenticated by this filter - use this when the same URL must serve both
 * trusted per-request callers <em>and</em> regular interactive browser sessions:
 * <pre>
 * bcdRequestAuthenticationOptional.optional = true
 * ...
 * [urls]
 * /your/api/** = bcdRequestAuthenticationOptional, bcdAuthc
 * </pre>
 * A request presenting the header with a <em>wrong</em> secret is always rejected outright, regardless
 * of {@code optional} - a bad/rotated secret must not silently degrade into a normal login attempt.
 */
public class RequestAuthenticationFilter implements Filter {

  // If this matches one of the configured secrets, the caller is trusted
  public static final String HEADER_CLIENT_SECRET    = "X-BCD.ClientSecret";
  // For such a trusted caller, the following is trusted as well
  // Per default, OnBehalfIdType maps the a BindingItem in bcd_sec_user and OnBehalfId to the value to retrieve a user_id
  public static final String HEADER_ONBEHALF_ID_TYPE = "X-BCD.OnBehalfIdType";
  public static final String HEADER_ONBEHALF_ID      = "X-BCD.OnBehalfId";

  private final Logger log = LogManager.getLogger(getClass());
  private final Logger virtLoggerLogin = LogManager.getLogger("de.businesscode.bcdui.logging.virtlogger.login");

  private boolean optional = false;

  /** Set from shiro.ini: when true, a request without the {@value #HEADER_CLIENT_SECRET} header is passed
   * through to the next filter in the chain instead of being rejected - use this to let the same URL serve
   * both trusted per-request callers and regular browser sessions (chain this filter ahead of e.g. bcdAuthc
   * on that path). Defaults to false: this filter alone gates its configured path(s) and requires the header.
   */
  public void setOptional(boolean optional) {
    this.optional = optional;
  }

  @Override
  public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
    var httpRequest = (HttpServletRequest) request;
    var httpResponse = (HttpServletResponse) response;

    String requestSecret = httpRequest.getHeader(HEADER_CLIENT_SECRET);
    if (requestSecret == null) {
      if (optional) {
        // Not a trusted-caller request at all, defer to the next filter in the chain (e.g. session-based authc)
        chain.doFilter(request, response);
      } else {
        log.warn("Rejected request with missing '{}'", HEADER_CLIENT_SECRET);
        sendError(httpResponse, HttpServletResponse.SC_FORBIDDEN);
      }
      return;
    }

    String idType = httpRequest.getHeader(HEADER_ONBEHALF_ID_TYPE);
    String onBehalfId = httpRequest.getHeader(HEADER_ONBEHALF_ID);
    if (idType == null || onBehalfId == null) {
      log.warn("Rejected request with missing '{}'/'{}'", HEADER_ONBEHALF_ID_TYPE, HEADER_ONBEHALF_ID);
      sendError(httpResponse, HttpServletResponse.SC_FORBIDDEN);
      return;
    }

    // Standard login/access logging (bcd_log_login, bcd_log_session, ...) reads the real "user-agent"
    // header, which for a trusted machine caller is far less useful than the identity it is asserting -
    // override it so that detail ends up in those logs instead, without a separate manual log call.
    String path = httpRequest.getRequestURI();
    String agent = "OnBehalf-RequestSession path: '%s' type: '%s' id: '%s'".formatted(path, idType, onBehalfId);
    HttpServletRequest agentRequest = new HttpServletRequestWrapper(httpRequest) {
      @Override
      public String getHeader(String name) {
        return "user-agent".equalsIgnoreCase(name) ? agent : super.getHeader(name);
      }
    };

    // The raw, not-yet-verified assertion - OnBehalfIdentityRealm verifies the secret and resolves the
    // identity to a user id inside subject.login(token) below.
    RequestAuthenticationToken token = createToken(requestSecret, idType, onBehalfId, httpRequest);

    // Log in a Shiro Subject for this identity for this request (and only this request). A successful
    // login is recorded via the standard mechanism (AuthenticationListener.onSuccess -> bcd_log_login),
    // same as any other login; RequestSession.close() reliably tears down the session that creates.
    try (var ignored = new RequestSession(token, agentRequest, httpResponse)) {
      chain.doFilter(agentRequest, response);
    } catch (AuthenticationException e) {
      log.warn("Rejected request on-behalf (idType '{}', onBehalfId '{}')", idType, onBehalfId, e);
      // AuthenticationListener.onFailure() deliberately skips bcd_log_login for a failed
      // RequestAuthenticationToken login (no session survives to clean up here), so log it ourselves.
      // Shiro's multi-realm authentication discards OnBehalfIdentityRealm's actual exception type once
      // the aggregate result ends up empty (see RequestAuthenticationToken) - token.getFailureReason()
      // recovers the precise reason it stashed there before throwing.
      LoginSqlLogger.LOGIN_RESULTS reason = token.getFailureReason() != null ? token.getFailureReason() : LoginSqlLogger.LOGIN_RESULTS.FAILED;
      virtLoggerLogin.info(new LoginSqlLogger.LogRecord(null, agent, getRemoteAddr(httpRequest), onBehalfId, reason));
      sendError(httpResponse, HttpServletResponse.SC_FORBIDDEN);
    } catch (Exception e) {
      // Most exceptions will be caught by RequestLifeCycle filter before, these are likely login related
      log.error("Unexpected error for on-behalf-of request (idType '{}', onBehalfId '{}')", idType, onBehalfId, e);
      sendError(httpResponse, HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Sends a bare status code, no body/exception details - never lets an exception (e.g. from an
   * already-committed response) escape and reach the container's own, possibly stacktrace-revealing,
   * default error handling.
   */
  private void sendError(HttpServletResponse response, int status) {
    if (response.isCommitted()) {
      log.warn("Could not send status {}, response already committed", status);
      return;
    }
    try {
      response.sendError(status);
    } catch (IOException e) {
      log.warn("Could not send status {}: {}", status, e.getMessage());
    }
  }

  /**
   * Extension point to allow subclasses to create a token with additional information.
   * Derive them from request or any properties set in shiro.ini of sub-classes for example
   * @param requestSecret provided by trusted(?) caller
   * @param idType type of user id provided
   * @param onBehalfId user id of idType to be resolved to userId
   * @param request maybe important if overwriting this class
   * @return token for OnBehalfIdentityRealm
   */
  protected RequestAuthenticationToken createToken(String requestSecret, String idType, String onBehalfId, HttpServletRequest request)
      throws IOException, ServletException {
    return new RequestAuthenticationToken(requestSecret, idType, onBehalfId, Map.of());
  }

}
