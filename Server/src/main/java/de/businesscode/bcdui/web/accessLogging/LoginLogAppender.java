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
package de.businesscode.bcdui.web.accessLogging;

import java.io.Serializable;

import org.apache.logging.log4j.core.Filter;
import org.apache.logging.log4j.core.Layout;
import org.apache.logging.log4j.core.LogEvent;
import org.apache.logging.log4j.core.appender.AbstractAppender;
import org.apache.logging.log4j.core.config.Property;
import org.apache.logging.log4j.core.config.plugins.Plugin;
import org.apache.logging.log4j.core.config.plugins.PluginAttribute;
import org.apache.logging.log4j.core.config.plugins.PluginElement;
import org.apache.logging.log4j.core.config.plugins.PluginFactory;
import org.apache.logging.log4j.core.layout.PatternLayout;

import de.businesscode.bcdui.logging.LoginSqlLogger;
import de.businesscode.bcdui.logging.LogoutSqlLogger;

@Plugin(name = "LoginLogAppender", category = "Core", elementType = "appender", printObject = true)
public class LoginLogAppender extends AbstractAppender {
  
  public LoginLogAppender(final String name, final Filter filter, final Layout<? extends Serializable> layout, 
      final boolean ignoreExceptions, final Property[] properties) {
    super(name, filter, layout, ignoreExceptions, properties);
    start();
  }
  
  @PluginFactory
  public static LoginLogAppender createAppender(@PluginAttribute("name") String name,
                                                @PluginElement("Layout") Layout<? extends Serializable> layout,
                                                @PluginElement("Filters") Filter filter) {
      if (layout == null)
          layout = PatternLayout.createDefaultLayout();
      return new LoginLogAppender(name, filter, layout, false, null);
  }
  
  public static LoginLogAppender createAppender() {
    return createAppender("LoginLogAppender", null, null);
  }

  @Override
  public void append(LogEvent event) {
    if (event.getMessage() instanceof LoginSqlLogger.LogRecord && LoginSqlLogger.getInstance().isEnabled()) {
      // Login event
      LoginSqlLogger.getInstance().process( (LoginSqlLogger.LogRecord) event.getMessage() );
    } else if (event.getMessage() instanceof LogoutSqlLogger.LogRecord && LogoutSqlLogger.getInstance().isEnabled()) {
      // Session expire event
      LogoutSqlLogger.getInstance().process( (LogoutSqlLogger.LogRecord) event.getMessage() );
    } // TODO : what if its neither? would be a programming error... compare to other appenders
  }
}
