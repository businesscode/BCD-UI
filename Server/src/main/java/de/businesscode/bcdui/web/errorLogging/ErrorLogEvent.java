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

  private String message;
  private String data;
  private HttpServletRequest request;
  private Throwable thrwbl;

  /**
   *
   * @param message
   * @param request
   * @param data
   * @param thrwbl
   */
  public ErrorLogEvent(String message, HttpServletRequest request, String data, Throwable thrwbl) {
    this.message = message;
    this.request = request;
    this.data = data;
    this.thrwbl = thrwbl;
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

  /**
   * @return the request
   */
  public HttpServletRequest getRequest() {
    return request;
  }

  // ==========================================================================

  /**
   * @return the username from request
   */
  public String getUserName() {
    if (getRequest() != null) {
      if (getRequest().getUserPrincipal() != null) {
        return getRequest().getUserPrincipal().getName();
      }
      HttpSession session = getRequest().getSession(false);
      if (session != null && session.getAttribute("user") != null) {
        return session.getAttribute("user").toString();
      }
    }
    return null;
  }

  /**
   * @return the requestUrl from request
   */
  public String getRequestUrl() {
    if (getRequest() != null && getRequest().getRequestURL() != null) {
      return ServletUtils.getInstance().reconstructURL(getRequest());
    }
    return null;
  }

  /**
   * @return the refererUrl from request
   */
  public String getRefererUrl() {
    if (getRequest() != null) {
      return getRequest().getHeader("Referer");
    }
    return null;
  }

  /**
   * @return the remoteAddr from request
   */
  public String getRemoteAddr() {
    var request = getRequest();
    return request != null ? Utils.getRemoteAddr(request) : null;
  }

  /**
   * @return the userAgent from request
   */
  public String getUserAgent() {
    if (getRequest() != null) {
      return getRequest().getHeader("user-agent");
    }
    return null;
  }

  /**
   * @return the requestHash from request
   */
  public Integer getRequestHash() {
    if (getRequest() != null) {
      return getRequest().hashCode();
    }
    return null;
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
