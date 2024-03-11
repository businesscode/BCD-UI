/*
  Copyright 2010-2024 BusinessCode GmbH, Germany

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
package de.businesscode.bcdui.web.filters;

import java.io.IOException;
import java.net.URLDecoder;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.ThreadContext;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.UnavailableSecurityManagerException;
import org.apache.shiro.subject.Subject;

import de.businesscode.bcdui.logging.SessionSqlLogger;
import de.businesscode.bcdui.logging.LoginSqlLogger;
import de.businesscode.bcdui.logging.LoginSqlLogger.LOGIN_RESULTS;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.toolbox.ServletUtils;
import de.businesscode.bcdui.web.accessLogging.RequestHashGenerator;
import de.businesscode.bcdui.web.clientLogging.FrontendLoggingFacility;
import de.businesscode.bcdui.web.errorLogging.ErrorLogEvent;
import de.businesscode.bcdui.web.servlets.SubjectPreferences;
import de.businesscode.util.SOAPFaultMessage;
import de.businesscode.util.Utils;

/**
 * This class is a very first entry point of any requests.
 *
 * Responsibilities: - tags the MDC for the logger in order to trace events in
 * debug mode
 *
 */
public class RequestLifeCycleFilter implements Filter {
  /**
   * the key used to store current session id for thread being issueing log
   * events
   */
  /**
   * used in {@link #isThreadBoundToHttpRequest()}
   */
  private static final ThreadLocal<Boolean> requestTaggingFlag = new ThreadLocal<Boolean>();
  public static final String SESSION_KEY_BCD_SESSIONCREATED = "BCD.sessionCreated";
  public static final String MDC_KEY_BCD_REQUESTHASH = "BCD.requestHash";
  public static final String MDC_KEY_BCD_PAGEHASH = "BCD.pageHash";
  public static final String MDC_KEY_IS_CLIENT_LOG = "BCD.isClientLog";
  public static final String MDC_KEY_SESSION_ID = "BCD.httpSessionId";
  private static final Pattern pattern = Pattern.compile("\\$\\{bcdClient:(\\w+)\\}");
  private static final String CONTENT_SECURITY_POLICY = "ContentSecurityPolicy";
  private static final ArrayList<String> contentSecurityPolicy = new ArrayList<>();

  public static final String LOGGER_NAME = RequestLifeCycleFilter.class.getName();
  private Logger log = getLogger();
  private final Logger virtLoggerSession = LogManager.getLogger("de.businesscode.bcdui.logging.virtlogger.session");
  private final Logger virtLoggerLogin = LogManager.getLogger("de.businesscode.bcdui.logging.virtlogger.login");
  private final Logger virtLoggerError = LogManager.getLogger("de.businesscode.bcdui.logging.virtlogger.error");

  /**
   * tells if given request is issued for logging transceiver
   *
   * @param url
   * @return
   */
  private boolean isTransceiverRequest(String url) {
    return (url == null ? "" : url).indexOf("servlets/FrontendLogTransceiver") > -1;
  }

  private void doFilter(HttpServletRequest request, HttpServletResponse response, FilterChain chain) throws IOException, ServletException {

    // set CSP Header
    response.addHeader("Content-Security-Policy", contentSecurityPolicy.get(0));

    request.setCharacterEncoding("UTF-8");
    response.setCharacterEncoding("UTF-8");
    requestTaggingFlag.set(true);

    String url = request.getRequestURL().toString();

    // when user is already authenticated and you enter login page again then forward to contextPath
    if (url.toLowerCase().endsWith("/login.html") || url.toLowerCase().endsWith("/login.jsp")) {
      Subject subject = null;
      try {
        subject = SecurityUtils.getSubject();
        if (subject.isAuthenticated())
          response.sendRedirect(url.substring(0, url.lastIndexOf("/")));
      } catch (Exception e) {/* no shiro at all */}
    }

    // when url uses ${bcdClient:} token, replace token with permission looked up value forward new url
    String decode = URLDecoder.decode(request.getRequestURI(), "UTF-8").substring(request.getContextPath().length());
    if (decode.indexOf("${bcdClient:") > -1) {
      Subject subject = null;
      try { subject = SecurityUtils.getSubject(); } catch (Exception e) {/* no shiro at all */}
      if (subject != null) {
        try {
          String s = decode;
          HashMap<String, String> replaceMap = new HashMap<>();
          Matcher matcher = pattern.matcher(s);
          while (matcher.find()) {
            String key = matcher.group(1);
            if (key != null && ! key.isEmpty()) {
              s = s.substring(matcher.start() + 1);
              matcher = pattern.matcher(s);
              // * as user right value will be replaced with an empty string during url replacement
              // use SubjectPreferences.getPermissionList to even get values on very 1st request
              List<String> permissions =  new ArrayList<>(SubjectPreferences.getPermissionList("bcdClient:" + key));
              String value = ! permissions.isEmpty() ? permissions.get(0) : "";
              replaceMap.put("${bcdClient:" + key + "}", "*".equals(value) ? "" : value);
            }
          }
          for (Map.Entry<String, String> set : replaceMap.entrySet())
            decode = decode.replace(set.getKey(), set.getValue());
          decode = decode.replace("//","/");
          request.getRequestDispatcher(decode).forward(request, response);
          return;
        }
        catch (Exception e) {
          log.warn("failed to forward url", e);
        }
      }
    }

    boolean isTransceiver = isTransceiverRequest(url);
    boolean isDebug = ServletUtils.getInstance().isFeDebug(request);

    beforeChain(url, request, response, isTransceiver, isDebug);

    try {
      chain.doFilter(request, response);
      Configuration.getInstance().closeAllConnections(false);
    } catch (Exception ex) {
      /*
       * We got an Exception in the user code so we make a rollback now.
       */
      String msg = ex.getMessage(); // we could also loop through all causes look for a msg, but this should be sufficient
      // all exceptions thrown during a request will be logged to the database (if that functionality is enabled)
      virtLoggerError.info(new ErrorLogEvent(msg != null && !msg.isEmpty() ? msg :  "An exception occurred, we do rollback.", request, ex));
      try {
        Configuration.getInstance().closeAllConnections(true);
      } catch (SQLException e) {
        msg = e.getMessage();
        virtLoggerError.info(new ErrorLogEvent("Error during rollback" + (msg != null && !msg.isEmpty() ? ": " + msg : "."), request, ex));
      }

      if(!response.isCommitted()){
        try {
          response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
          // response a SOAPFault with no details to the client
          SOAPFaultMessage.writeSOAPFaultToHTTPResponse(request, response, null, "Request could not be processed.");
        } catch (Exception e) {
          ; // ignore
        }
      }
    } finally {
      requestTaggingFlag.remove();
      afterChain(url, request, response, isTransceiver, isDebug);
      if (isDebug)
        disableClientEventQueue();
    }

  }

  /**
   * log messages are not queued for client anymore
   */
  private void disableClientEventQueue() {
    ThreadContext.remove(MDC_KEY_IS_CLIENT_LOG);
  }

  /**
   * log messages are queued by session for the client
   *
   * @param request
   *          to obtain session id from
   */
  private void enableClientEventQueue(HttpServletRequest request) {
    ThreadContext.put(MDC_KEY_IS_CLIENT_LOG, Utils.getSessionId(request, false));
    FrontendLoggingFacility.deployLogger();
  }

  /**
   * @param url
   * @param request
   * @param response
   * @param isDebug
   */
  private void beforeChain(String url, HttpServletRequest request,
      HttpServletResponse response, boolean isTransceiver, boolean isDebug) {

    // We want a global cache disable, so this cannot be done in the cientCacheFilter
    if (Configuration.isCacheDisabled())
      response.setHeader("Cache-Control", "no-cache; no-store");

    // session MAY be null
    final HttpSession session = request.getSession(false);
    // sessionId is never null
    final String sessionId = Utils.getSessionId(request, false);
    ThreadContext.put(MDC_KEY_SESSION_ID, sessionId);
    
    String uri = request.getRequestURI().toLowerCase();
    int idx = uri.indexOf(";jsessionid=");
    if (idx != -1)
      uri = uri.substring(0, idx);

    // Get requestHash from XHTTP header if available or generate it based on page hash and random number
    // Get pageHash from XHTTP header if available or generate it based on hashing the referrer/sessionId (this keeps accesses from same page together)
    // remember values in MDC for access logging use
    String requestHash = request.getHeader(RequestHashGenerator.X_HTTP_HEADER_REQUEST);
    String pageHash = request.getHeader(RequestHashGenerator.X_HTTP_HEADER_PAGE);
    if ((pageHash == null || pageHash.isEmpty()) && uri.indexOf("/bcdui/servlets") != -1)
      pageHash = RequestHashGenerator.generateHash(request);
    if ((requestHash == null || requestHash.isEmpty()) && uri.indexOf("/bcdui/servlets") != -1)
      requestHash = pageHash +"."+Math.round(Math.random()*1000);
    if (requestHash != null) ThreadContext.put(MDC_KEY_BCD_REQUESTHASH, requestHash);
    if (pageHash != null)    ThreadContext.put(MDC_KEY_BCD_PAGEHASH, pageHash);

    // log session once
    if (session != null && SessionSqlLogger.getInstance().isEnabled()) {
      // attribute created in de.businesscode.bcdui.web.SessionListener
      String sessionCreated = (String)session.getAttribute(SESSION_KEY_BCD_SESSIONCREATED);
      if (sessionCreated != null) {
        session.removeAttribute(SESSION_KEY_BCD_SESSIONCREATED);
        final SessionSqlLogger.LogRecord record = new SessionSqlLogger.LogRecord(sessionId, request.getHeader("user-agent"), request.getRemoteHost());
        virtLoggerSession.info(record); // was level DEBUG
      }
    }

    // log login once
    if (LoginSqlLogger.getInstance().isEnabled()) {
      try {
        org.apache.shiro.session.Session shiroSession = SecurityUtils.getSubject() != null ? SecurityUtils.getSubject().getSession(false) : null;
        if (shiroSession != null) {
          String userName = (String) shiroSession.getAttribute("BCD_LOGIN_USER");
          LOGIN_RESULTS result = (LOGIN_RESULTS) shiroSession.getAttribute("BCD_LOGIN_RESULT");
          if (userName != null && result != null) {
            shiroSession.removeAttribute("BCD_LOGIN_USER");
            shiroSession.removeAttribute("BCD_LOGIN_RESULT");
            final LoginSqlLogger.LogRecord record = new LoginSqlLogger.LogRecord(sessionId, request.getHeader("user-agent"), request.getRemoteHost(), userName, result);
            virtLoggerLogin.info(record); // was level DEBUG
          }
        }
      }
      catch (UnavailableSecurityManagerException e) { /* shiro isn't used at all */ }
    }

    /* enable queue for logEvents preparing to be pushed to the client */
    if (isDebug)
      enableClientEventQueue(request);

    // set Edge (= most current browser features) mode for IE
    // can be overwritten with a meta element on the page itself
    if (   uri.endsWith(".jsp")
        || uri.endsWith(".html")
        || uri.endsWith(".htm")
        || uri.endsWith("/")
        ) {
      response.setHeader("X-UA-Compatible", "IE=edge");
    }
  }

  /**
   * @param url
   * @param request
   * @param response
   * @param isDebug
   */
  private void afterChain(String url, HttpServletRequest request,
      HttpServletResponse response, boolean isTransceiver, boolean isDebug) {
    if (!isTransceiver && log.isTraceEnabled()) {
      if (request.getHeader(RequestHashGenerator.X_HTTP_HEADER_REQUEST) != null)
        log.trace("Finished processing.");
      else
        log.trace("Finished processing: " + url);
    }
    ThreadContext.clearMap();
  }

  /**
   *
   * @return TRUE if the current thread is bound to a HTTP request managed by a {@link RequestLifeCycleFilter}
   */
  public static boolean isThreadBoundToHttpRequest() {
     Boolean flag = requestTaggingFlag.get();
     return flag == null ? false : flag;
  }

  /**
   *
   * @return RequestLifeCycleLogger which allows to track any logstreams realted
   *         to the logical request.
   */
  public static Logger getLogger() {
    return LogManager.getLogger(LOGGER_NAME);
  }

  /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~ jakarta.servlet.Filter API ~~~~~~~~~~~~~~~~~~~ */

  @Override
  public void destroy() {
  }

  @Override
  public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
    doFilter((HttpServletRequest) request, (HttpServletResponse) response, chain);
  }

  @Override
  public void init(FilterConfig filterConfig) throws ServletException {
    String csp = filterConfig.getInitParameter(CONTENT_SECURITY_POLICY);
    contentSecurityPolicy.add(csp == null ? "default-src 'self' 'unsafe-eval' 'unsafe-inline'; object-src 'none'; img-src 'self' blob: data:" : csp);
  }
}
