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

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;

import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.subject.Subject;

/**
 * <p>
 * extending Shiro's {@link org.apache.shiro.web.filter.authc.FormAuthenticationFilter} to add
 * additional authentication scheme.
 * </p>
 * 
 * <p>
 * uses {@link ExternalAuthenticationToken} which shall be supported by any of registered realm,
 * the default {@link JdbcRealm} supports such token. To enable SPNEGO you have also to attach
 * de.businesscode.bcdui.security.SpnegoValve to your context, i.e in context.xml:
 * <pre>
 * &lt;Context className="de.businesscode.bcdui.security.SpnegoValve">
 * </pre>
 * the implementation is provided by bcd-spnego.jar library located in externallib folder of BCD-UI,
 * that library has to be available to tomcat's common classloader, i.e. in TOMCAT_HOME/lib
 * </p>
 * 
 * <p>
 * <b>Usage:</b>
 * override the default 'authc' filter by setting to this class in [main] section of Shiro configuration:
 * 
 * <pre>
 * [main]
 * authc = de.businesscode.bcdui.subjectsettings.AuthenticationFilter
 * realm = de.businesscode.bcdui.subjectsettings.JdbcRealm
 * ...
 * </pre>
 * </p>
 */
public class AuthenticationFilter extends org.apache.shiro.web.filter.authc.FormAuthenticationFilter {
  private final Logger logger = LogManager.getLogger(getClass());

  @Override
  public void doFilterInternal(ServletRequest request, ServletResponse response, FilterChain chain) throws ServletException, IOException {
    if (request instanceof HttpServletRequest) {
      HttpServletRequest httpRequest = (HttpServletRequest) request;
      String spnegoPrincipal = SpnegoUtil.getPrincipalName(httpRequest);
      if (spnegoPrincipal != null) {
        Subject subj = SecurityUtils.getSubject();
        if (!subj.isAuthenticated()) {
          logger.trace("implicitely authenticating:" + spnegoPrincipal);
          try {
            subj.login(new ExternalAuthenticationToken(spnegoPrincipal));
          } catch (Exception e) {
            logger.warn("failed to implicitely authenticate user", e);
          }
        }
      }

    }
    super.doFilterInternal(request, response, chain);
  }
}
