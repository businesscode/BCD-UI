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
package de.businesscode.bcdui.web;

import jakarta.servlet.http.HttpSession;
import jakarta.servlet.http.HttpSessionEvent;
import jakarta.servlet.http.HttpSessionListener;

import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;

import de.businesscode.bcdui.logging.LogoutSqlLogger;
import de.businesscode.bcdui.logging.SessionExpiredSqlLogger;
import de.businesscode.bcdui.web.filters.RequestLifeCycleFilter;

public class SessionListener implements HttpSessionListener{

  @Override
  public void sessionCreated(HttpSessionEvent sEvent) {
    sEvent.getSession().setAttribute(RequestLifeCycleFilter.SESSION_KEY_BCD_SESSIONCREATED, "true");
  }

  @Override
  public void sessionDestroyed(HttpSessionEvent se) {
    HttpSession session = se.getSession();

    Logger virtLoggerSession = LogManager.getLogger("de.businesscode.bcdui.logging.virtlogger.session");
    Logger virtLoggerLogin = LogManager.getLogger("de.businesscode.bcdui.logging.virtlogger.login");

    virtLoggerSession.info(new SessionExpiredSqlLogger.LogRecord(session.getId())); // was level DEBUG
    virtLoggerLogin.info(new LogoutSqlLogger.LogRecord(session.getId())); // was level DEBUG
  }
}