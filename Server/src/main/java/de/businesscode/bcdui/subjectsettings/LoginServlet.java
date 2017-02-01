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
package de.businesscode.bcdui.subjectsettings;

import java.io.IOException;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authc.AuthenticationException;
import org.apache.shiro.authc.DisabledAccountException;
import org.apache.shiro.authc.ExcessiveAttemptsException;
import org.apache.shiro.authc.IncorrectCredentialsException;
import org.apache.shiro.authc.UnknownAccountException;
import org.apache.shiro.authc.UsernamePasswordToken;
import org.apache.shiro.subject.Subject;
import org.apache.shiro.web.util.WebUtils;

/**
 * Servlet for login and logout, depending on HTTP parameters using apache shiro frame work
 */
public class LoginServlet extends HttpServlet {

  public static final String AuthenticateErrorCodeToken = "AuthenticateErrorCodeToken";
  public enum AuthenticateErrorCode {
    UnknownAccountException, IncorrectCredentialsException, DisabledAccountException, ExcessiveAttemptsException
  }

  private static final long serialVersionUID = 4753691204483120874L;

  @Override
  public void init(ServletConfig config) throws ServletException {
    super.init(config);
  }

  public LoginServlet() {
    super();
  }

  /*
   * support logout only
   * @see post method
   */
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    String logout = request.getParameter("logout");
    String loginUrl = getServletContext().getContextPath() + "/login.jsp";
    if (logout != null && !"false".equals(logout)) {
      doLogout(request, response, loginUrl);
    } else {
      super.doGet(request, response);
    }
  }

  /*
   * Login and logout
   * If param logout is send (and is not false), then the current user is logged out
   * Otherwise params username and password are used for login, the caller is forwarded to the original requested page (if any)
   * or to /index.jsp
   */
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    String logout = request.getParameter("logout");
    String loginUrl = getServletContext().getContextPath() + "/login.jsp";
    if (logout != null && !"false".equals(logout)) {
      doLogout(request, response, loginUrl);
    } else {
      String username = request.getParameter("username");
      String password = request.getParameter("password");

      UsernamePasswordToken token = new UsernamePasswordToken(username, password);

      HttpSession ses = request.getSession(false);
      try {
        if( ses!=null )
          ses.removeAttribute(AuthenticateErrorCodeToken);
        Subject subject = SecurityUtils.getSubject();
        subject.login(token);
        token.clear();
        executeRedirect(request, response);

      } catch ( UnknownAccountException uae) {
        if( ses!=null )
          ses.setAttribute(AuthenticateErrorCodeToken, AuthenticateErrorCode.UnknownAccountException);
        response.sendRedirect(loginUrl);
      } catch ( IncorrectCredentialsException ice) {
        if( ses!=null )
          ses.setAttribute(AuthenticateErrorCodeToken, AuthenticateErrorCode.IncorrectCredentialsException);
        response.sendRedirect(loginUrl);
      } catch ( DisabledAccountException dae) {
        if( ses!=null )
          ses.setAttribute(AuthenticateErrorCodeToken, AuthenticateErrorCode.DisabledAccountException);
        response.sendRedirect(loginUrl);
      } catch ( ExcessiveAttemptsException eae) {
        if( ses!=null )
          ses.setAttribute(AuthenticateErrorCodeToken, AuthenticateErrorCode.ExcessiveAttemptsException);
        response.sendRedirect(loginUrl);
      } catch (AuthenticationException ae){
        ses.setAttribute(AuthenticateErrorCodeToken, AuthenticateErrorCode.UnknownAccountException);
        response.sendRedirect(loginUrl);
      } catch (Exception e) {
      }
    }
  }

  /**
   * override to implement a custom redirection, the default implementation uses shiros last
   * stored url accessed before the login screen
   * @param request
   * @param response
   * @throws IOException
   */
  protected void executeRedirect(HttpServletRequest request, HttpServletResponse response) throws IOException {
    WebUtils.redirectToSavedRequest(request, response, "/");
  }

  private void doLogout(HttpServletRequest request, HttpServletResponse response, String url) throws IOException {
    Subject subject = SecurityUtils.getSubject();

    if (subject != null) {
      subject.logout();
    }

    HttpSession session = request.getSession(false);
    if (session != null) {
      session.invalidate();
    }

    response.sendRedirect(url);
  }
}