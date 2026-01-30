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
package de.businesscode.bcdui.web;

import java.util.HashMap;

import org.apache.commons.lang3.StringUtils;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authc.AuthenticationException;
import org.apache.shiro.authc.AuthenticationInfo;
import org.apache.shiro.authc.AuthenticationToken;
import org.apache.shiro.authc.DisabledAccountException;
import org.apache.shiro.authc.ExcessiveAttemptsException;
import org.apache.shiro.authc.IncorrectCredentialsException;
import org.apache.shiro.authc.UnknownAccountException;
import org.apache.shiro.session.Session;
import org.apache.shiro.subject.PrincipalCollection;
import org.apache.shiro.subject.Subject;

import de.businesscode.bcdui.logging.LoginSqlLogger.LOGIN_RESULTS;
import de.businesscode.bcdui.subjectsettings.SecurityHelper;
import de.businesscode.bcdui.web.servlets.SubjectPreferences;

/**
 * Support for bcd_log_login logging as well as further security enhancement, such as session-fixation, see <a href="https://owasp.org/www-community/attacks/Session_fixation">OWASP Session_fixation</a>
 */
public class AuthenticationListener implements org.apache.shiro.authc.AuthenticationListener {

  @Override
  public void onFailure(AuthenticationToken token, AuthenticationException arg1) {
    String userLogin = token.getPrincipal() != null ? token.getPrincipal().toString() : "null";
    LOGIN_RESULTS result = LOGIN_RESULTS.FAILED;
    if (arg1 instanceof UnknownAccountException)
      result = LOGIN_RESULTS.ACC_UNKNOWN;
    else if (arg1 instanceof IncorrectCredentialsException)
      result = LOGIN_RESULTS.CREDS_WRONG;
    else if (arg1 instanceof DisabledAccountException)
      result = LOGIN_RESULTS.ACC_DISABLED;
    else if (arg1 instanceof ExcessiveAttemptsException)
      result = LOGIN_RESULTS.EXCESSIVE_ATTEMPTS;
    else if (arg1 instanceof AuthenticationException)
      result = LOGIN_RESULTS.FAILED;
    Session session = SecurityUtils.getSubject().getSession();
    // even create a session for failed login attempt
    session.setAttribute("BCD_LOGIN_USER", userLogin);
    session.setAttribute("BCD_LOGIN_RESULT", result);
  }

  @Override
  public void onLogout(PrincipalCollection arg0) {

  }

  @Override
  public void onSuccess(AuthenticationToken token, AuthenticationInfo info) {
    String userLogin = token.getPrincipal().toString();
    LOGIN_RESULTS result = LOGIN_RESULTS.OK;
    var session = renewSession(SecurityUtils.getSubject());
    session.setAttribute("BCD_LOGIN_USER", userLogin);
    session.setAttribute("BCD_LOGIN_RESULT", result);

    // set value for bcd_userId and bcd_userLogin subject setting filter
    SubjectPreferences.setPermission("bcd_userId:userId", SecurityHelper.getUserId(info));
    SubjectPreferences.setPermission("bcd_userLogin:userLogin", userLogin);

    // also make them available client sided (userId is available anyhow)
    SubjectPreferences.setPermission("bcdClient:userId", SecurityHelper.getUserId(info));
    SubjectPreferences.setPermission("bcdClient:userLogin", userLogin);
  }

  /**
   * re-creates a session and copy session atts if any found
   *
   * @see <a href="https://owasp.org/www-community/attacks/Session_fixation">Session_fixation</a>
   * @param subject
   * @return
   */
  private Session renewSession(Subject subject) {
    final var oldSession = subject.getSession(false);
    final var oldSessionObjMap = new HashMap<Object, Object>();

    if (oldSession != null) {
      for (var key : oldSession.getAttributeKeys()) {
        if (key instanceof String && StringUtils.startsWith((String) key, "org.apache.shiro")) {
          continue; // skip shiro internal atts
        }
        oldSessionObjMap.put(key, oldSession.getAttribute(key));
      }
      oldSession.stop();
    }

    final var newSession = subject.getSession();

    oldSessionObjMap.entrySet().forEach(entry -> newSession.setAttribute(entry.getKey(), entry.getValue()));

    return newSession;
  }
}