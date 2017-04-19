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
package de.businesscode.bcdui.web.filters;

import java.io.IOException;
import java.sql.SQLException;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import org.apache.log4j.Logger;
import org.apache.log4j.MDC;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.UnavailableSecurityManagerException;

import de.businesscode.bcdui.logging.SessionSqlLogger;
import de.businesscode.bcdui.logging.LoginSqlLogger;
import de.businesscode.bcdui.logging.LoginSqlLogger.LOGIN_RESULTS;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.toolbox.ServletUtils;
import de.businesscode.bcdui.web.accessLogging.RequestHashGenerator;
import de.businesscode.bcdui.web.clientLogging.FrontendLoggingFacility;
import de.businesscode.util.SOAPFaultMessage;


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

  public static final String LOGGER_NAME = RequestLifeCycleFilter.class.getName();
  private Logger log = getLogger();

  /**
   * tells if given request is issued for logging transceiver
   *
   * @param url
   * @return
   */
  private boolean isTransceiverRequest(String url) {
    return (url == null ? "" : url).indexOf("servlets/FrontendLogTransceiver") > -1;
  }

  private void doFilter(HttpServletRequest request,
      HttpServletResponse response, FilterChain chain) throws IOException,
      ServletException {
    request.setCharacterEncoding("UTF-8");
    response.setCharacterEncoding("UTF-8");
    requestTaggingFlag.set(true);

    String url = request.getRequestURL().toString();

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
      log.error("An exception occurred, we do rollback.",ex);
      try {
        Configuration.getInstance().closeAllConnections(true);
      } catch (SQLException e) {
        log.error("Error during rollback.",e);
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
    MDC.remove(MDC_KEY_IS_CLIENT_LOG);
  }

  /**
   * log messages are queued by session for the client
   *
   * @param request
   *          to obtain session id from
   */
  private void enableClientEventQueue(HttpServletRequest request) {
    MDC.put(MDC_KEY_IS_CLIENT_LOG, request.getSession(false).getId());
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

    final HttpSession session = request.getSession(true);
    MDC.put(MDC_KEY_SESSION_ID, session.getId());
    
    String uri = request.getRequestURI().toLowerCase();
    int idx = uri.indexOf(";jsessionid=");
    if (idx != -1)
      uri = uri.substring(0, idx);

    // Get requestHash from XHTTP header if available
    // Get pageHash from XHTTP header if available or generate it based on hashing the referrer/sessionId (this keeps accesses from same page together)
    // remember values in MDC for access logging use
    String requestHash = request.getHeader(RequestHashGenerator.X_HTTP_HEADER_REQUEST);
    String pageHash = request.getHeader(RequestHashGenerator.X_HTTP_HEADER_PAGE);
    if ((pageHash == null || pageHash.isEmpty()) && uri.indexOf("/bcdui/servlets") != -1)
      pageHash = RequestHashGenerator.generateHash(request);
    if (requestHash != null) MDC.put(MDC_KEY_BCD_REQUESTHASH, requestHash);
    if (pageHash != null)    MDC.put(MDC_KEY_BCD_PAGEHASH, pageHash);

    // log session once
    if (SessionSqlLogger.getInstance().isEnabled()) {
      String sessionCreated = (String)session.getAttribute(SESSION_KEY_BCD_SESSIONCREATED);
      if (sessionCreated != null) {
        session.removeAttribute(SESSION_KEY_BCD_SESSIONCREATED);
        final SessionSqlLogger.LogRecord record = new SessionSqlLogger.LogRecord(session.getId(), request.getHeader("user-agent"), request.getRemoteHost());
        log.debug(record);
      }
    }

    // log login once
    if (LoginSqlLogger.getInstance().isEnabled()) {
      try {
        org.apache.shiro.session.Session shiroSession = SecurityUtils.getSubject() != null ? SecurityUtils.getSubject().getSession(false) : null;
        if (shiroSession != null) {
          String userName = (String) SecurityUtils.getSubject().getSession(false).getAttribute("BCD_LOGIN_USER");
          LOGIN_RESULTS result = (LOGIN_RESULTS) shiroSession.getAttribute("BCD_LOGIN_RESULT");
          if (userName != null && result != null) {
            shiroSession.removeAttribute("BCD_LOGIN_USER");
            shiroSession.removeAttribute("BCD_LOGIN_RESULT");
            final LoginSqlLogger.LogRecord record = new LoginSqlLogger.LogRecord(session.getId(), request.getHeader("user-agent"), request.getRemoteHost(), userName, result);
            log.debug(record);
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
    MDC.clear();
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
    return Logger.getLogger(LOGGER_NAME);
  }

  /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~ javax.servlet.Filter API ~~~~~~~~~~~~~~~~~~~ */

  @Override
  public void destroy() {
  }

  @Override
  public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
    doFilter((HttpServletRequest) request, (HttpServletResponse) response, chain);
  }

  @Override
  public void init(FilterConfig filterConfig) throws ServletException {
  }
}
