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
package de.businesscode.bcdui.toolbox;

import java.util.Date;

import javax.servlet.ServletRequest;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import de.businesscode.util.SingletonHolder;

public class ServletUtils {
  /**
   * debug flag can be enabled/disabled by providing request parameter named debug. The debug setting affects session scope and is valid until overriden by debug parameter again.
   *
   */
  private static final String KEY_FE_DEBUG = "FrameTag.FE_DEBUG";

  private static SingletonHolder<ServletUtils> holder = new SingletonHolder<ServletUtils>() {
    @Override
    protected ServletUtils createInstance() {
      return new ServletUtils();
    }
  };

  public static ServletUtils getInstance() {
    return holder.get();
  }

  /**
   * tells if FE is running in debug mode
   *
   * @param request
   * @return
   */
  private boolean isFeDebug(HttpSession session) {
    return Boolean.TRUE == (Boolean) session.getAttribute(KEY_FE_DEBUG);
  }

  /**
   * tells if FE is running in debug mode by matching the sessions and param value, param value has always precedence over sessions one.
   *
   * @param request
   * @return
   */
  private boolean isFeDebug(ServletRequest request, HttpSession session) {
    String paramDebugValue = request.getParameter("debug");
    paramDebugValue = (paramDebugValue != null && paramDebugValue.length() == 0) ? "TRUE":paramDebugValue;
    boolean paramIsDebug = Boolean.parseBoolean(paramDebugValue);

    return session == null ? paramIsDebug : paramDebugValue == null ? isFeDebug(session) : paramIsDebug;
  }

  /**
   * see {@link #isFeDebug(HttpServletRequest)}
   *
   * @param request
   * @return tells if debug is on or off.
   */
  private boolean isFeDebugStateless(HttpServletRequest request) {
    return isFeDebug(request, request.getSession(false));
  }

  /**
   * tells if application is running with frontend debug enabled flag. This method is stateful on session level and stores the debug status persistenly to sessesion variable whenever status changes.
   *
   * Private methods shall check the debug status without it being to be stored on session please use isFeDebugStateless(HttpServletRequest instead.
   *
   * @param request
   * @return
   */
  public boolean isFeDebug(HttpServletRequest request) {
    boolean currentState = isFeDebugStateless(request);

    HttpSession session = request.getSession(false);
    boolean sessionState = session != null && isFeDebug(session);

    if (session == null && currentState || session != null && currentState != sessionState) {
      setFeDebug(request, currentState);
    }

    return currentState;
  }

  /**
   * sets FE debug mode into session object.
   *
   * @param request
   * @param isFeDebug
   */
  public void setFeDebug(HttpServletRequest request, boolean isFeDebug) {
    request.getSession(true).setAttribute(KEY_FE_DEBUG, isFeDebug);
  }

  /**
   * retrieve session id w/o forcing the session instance to be created
   *
   * @param request to read session from
   * @return either session id or NULL
   */
  public String getSessionId(HttpServletRequest request) {
    HttpSession session = request.getSession(false);

    return session == null ? null : session.getId();
  }

  /**
   * reconstructURL
   *
   * @param request
   * @return
   */
  public String reconstructURL(HttpServletRequest request) {
    if (request.getQueryString() != null) {
      return request.getRequestURL().toString() + "?" + request.getQueryString();
    }
    else {
      return request.getRequestURL().toString();
    }
  }

  /**
 * Method reconstructURI
 * @param request
 * @return
 */
public String reconstructURI(HttpServletRequest request) {
      if (request.getQueryString() != null) {
          return request.getRequestURI().toString() + "?" + request.getQueryString();
      }
      else {
          return request.getRequestURI().toString();
      }
  }

  /**
   * computeExpirationDate
   *
   * @param liveTimeInMinutes
   * @return
   */
  public long computeExpirationDate(int liveTimeInMinutes) {
    long milliSeconds = new Date().getTime() + liveTimeInMinutes * 60000;
    return (milliSeconds / 86400000) * 86400000 + ((milliSeconds % 86400000) / (liveTimeInMinutes * 60000)) * liveTimeInMinutes * 60000;
  }

  /**
   * setExpirationHeader
   *
   * @param response
   * @param liveTimeInMinutes
   */
  public void setExpirationHeader(HttpServletResponse response, int liveTimeInMinutes) {
    if (liveTimeInMinutes <= 0) {
      response.setDateHeader("Expires", -1);
    }
    else {
      response.setDateHeader("Expires", computeExpirationDate(liveTimeInMinutes));
    }
  }

  /**
   * @deprecated use instead public void setExpirationHeader(HttpServletResponse response, int liveTimeInMinutes)
   *
   * @param response
   * @param time
   */
  @Deprecated
  public void setExpirationHeader(HttpServletResponse response, long time) {
    response.setDateHeader("Expires", time);
  }

  /**
   * addParameterToURL
   *
   * @param url
   * @param param
   * @param value
   * @return
   */
  public String addParameterToURL(String url, String param, String value) {
    char separator = (url.contains("?") ? '&' : '?');
    return url + separator + param + (value == null ? "" : ("=" + value));
  }

  /**
   * since IE6 requires a lot of workarounds, this method can be called to determine if given User-Agent ID claims to be IE6. see also {{@link #isAgentIE6(String)}
   *
   * @param userAgentString
   *          the String given by User-Agent header field
   * @return true if agent appears to be IE6
   * @throws NullPointerException
   *           if userAgentString is NULL
   */
  public boolean isAgentIE6(String userAgentString) throws NullPointerException {
    return userAgentString.contains("MSIE 6.");
  }

  /**
   * {{@link #isAgentIE6(String)}
   * @param req
   * @return
   */
  public boolean isAgentIE6(HttpServletRequest req) throws NullPointerException {
    return isAgentIE6(req.getHeader("User-Agent"));
  }

}
