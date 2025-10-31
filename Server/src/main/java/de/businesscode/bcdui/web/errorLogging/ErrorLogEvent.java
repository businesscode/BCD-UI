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
package de.businesscode.bcdui.web.errorLogging;

import de.businesscode.bcdui.logging.LogEventBase;
import de.businesscode.bcdui.toolbox.ServletUtils;
import de.businesscode.util.Utils;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

/**
 * The error-logEvent for usage with the ErrorLogAppender. <br>
 * All thrown {@link jakarta.servlet.ServletException} are processed in
 * {@link de.businesscode.bcdui.web.filters.RequestLifeCycleFilter} and logged properly,
 * so there is usually no reason to manually use this class. <br>
 *
 * Example:
 * ...
 * private final Logger virtLoggerError = LogManager.getLogger("de.businesscode.bcdui.logging.virtlogger.error");
 * ...
 * virtLoggerError.info(new ErrorLogEvent("Error", request), exception);
 * ...
 */
public class ErrorLogEvent extends LogEventBase {
  private static final long serialVersionUID = 1L;

  private final String message;
  private final String data;
  private final String requestUrl;
  private final String userName;
  private final String userAgent;
  private final String refererUrl;
  private final String remoteAddr;
  private final Throwable thrwbl;
  private final Integer requestHash;

  /**
   *
   * @param message
   * @param request
   * @param data
   * @param thrwbl
   */
  public ErrorLogEvent(String message, HttpServletRequest request, String data, Throwable thrwbl) {
    this.message = message;
    this.data = data;
    this.thrwbl = thrwbl;
    this.requestUrl = getRequestUrl(request);
    this.userName = getUserName(request);
    this.userAgent = getUserAgent(request);
    this.refererUrl = getRefererUrl(request);
    this.remoteAddr = getRemoteAddr(request);
    this.requestHash = getRequestHash(request);
  }

  /**
   *
   * @param message
   * @param request
   * @param data
   */
  public ErrorLogEvent(String message, HttpServletRequest request, String data) {
    this(message, request, data, null);
  }

  /**
   *
   * @param message
   * @param request
   * @param thrwbl
   */
  public ErrorLogEvent(String message, HttpServletRequest request, Throwable thrwbl) {
    this(message, request, null, thrwbl);
  }

  /**
   *
   * @param message
   * @param request
   */
  public ErrorLogEvent(String message, HttpServletRequest request) {
    this(message, request, null, null);
  }

  /**
   * @return the message
   */
  public String getMessage() {
    return message;
  }

  // ==========================================================================

  /**
   * @param request
   * @return the username from request
   */
  public String getUserName(HttpServletRequest request) {
    if (request.getUserPrincipal() != null) {
      return request.getUserPrincipal().getName();
    }

    HttpSession session = request.getSession(false);
    if (session != null && session.getAttribute("user") != null) {
      return session.getAttribute("user").toString();
    }

    return null;
  }

  /**
   *
   * @return username from request, see {@link #getUserName(HttpServletRequest)}
   */
  public String getUserName() {
    return this.userName;
  }

  /**
   * @param request
   * @return the requestUrl from request
   */
  public String getRequestUrl(HttpServletRequest request) {
    if (request.getRequestURL() != null) {
      return ServletUtils.getInstance().reconstructURL(request);
    }
    return null;
  }

  /**
   * @return the requestUrl as of {@link HttpServletRequest#getRequestURL() see #getRequestUrl(HttpServletRequest)
   */
  public String getRequestUrl() {
    return requestUrl;
  }

  /**
   * @param request
   * @return the refererUrl from request
   */
  public String getRefererUrl(HttpServletRequest request) {
    return request.getHeader("Referer");
  }

  /**
   * @return the refererUrl from request, see {@link #getRefererUrl(HttpServletRequest)}
   */
  public String getRefererUrl() {
    return this.refererUrl;
  }

  /**
   * @param request
   * @return the remoteAddr from request
   */
  public String getRemoteAddr(HttpServletRequest request) {
    return Utils.getRemoteAddr(request);
  }

  /**
   * @return the remoteAddr from request, seee {@link #getRemoteAddr(HttpServletRequest)}
   */
  public String getRemoteAddr() {
    return this.remoteAddr;
  }

  /**
   * @param request
   * @return the userAgent from request
   */
  public String getUserAgent(HttpServletRequest request) {
    return request.getHeader("user-agent");
  }

  /**
   * @return the userAgent from request, see {@link #getUserAgent(HttpServletRequest)}
   */
  public String getUserAgent() {
    return this.userAgent;
  }

  /**
   * @param request
   * @return the requestHash from request
   */
  public Integer getRequestHash(HttpServletRequest request) {
    return request.hashCode();
  }

  /**
   *
   * @return the requestHash from request, see {@link #getRequestHash(HttpServletRequest)}
   */
  public Integer getRequestHash() {
    return this.requestHash;
  }

  // ==========================================================================

  @Override
  public String toString() {
    return "" + getMessage() + " | URL:" + getRequestUrl() + (this.data != null ? " | Data: " + data.replaceAll("\r\n", "") : "");
  }

  @Override
  public String getFormattedMessage() {
    return toString();
  }

  @Override
  public Throwable getThrowable() {
    return thrwbl;
  }
}
