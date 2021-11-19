/*
  Copyright 2010-2021 BusinessCode GmbH, Germany

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

import java.io.PrintWriter;
import java.io.Serializable;
import java.io.StringWriter;

import javax.servlet.http.HttpServletRequest;

import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.ThreadContext;
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

import de.businesscode.bcdui.logging.ErrorSqlLogger;
import de.businesscode.bcdui.web.filters.RequestLifeCycleFilter;
import de.businesscode.util.Utils;

@Plugin(name = "ErrorLogAppender", category = "Core", elementType = "appender", printObject = true)
public class ErrorLogAppender extends AbstractAppender {
  
  public ErrorLogAppender(final String name, final Filter filter, final Layout<? extends Serializable> layout, 
      final boolean ignoreExceptions, final Property[] properties) {
    super(name, filter, layout, ignoreExceptions, properties);
    start(); // needs to be called explicitly, unless the appender is defined in the log4j2.xml config file (which is currently not)
  }
  
  @PluginFactory // this annotation is needed so log4j2 can create this appender (even if we create it manually)
  public static ErrorLogAppender createAppender(@PluginAttribute("name") String name,
                                                @PluginElement("Layout") Layout<? extends Serializable> layout,
                                                @PluginElement("Filters") Filter filter) {
      if (layout == null)
          layout = PatternLayout.createDefaultLayout();
      return new ErrorLogAppender(name, filter, layout, false, null);
  }
  
  /**
   * Just a convenience method to create this appender with default settings.
   * @return
   */
  public static ErrorLogAppender createAppender() {
    return createAppender("ErrorLogAppender", null, null);
  }

  @Override
  public void append(LogEvent event) {
    // It is assumed that every LoggingEvent passed to the appender is an ErrorLogEvent.
    // If this is not the case, there is a programming error, which should lead to an uncaught exception.
    ErrorLogEvent bcduiLogEvent = (ErrorLogEvent) event.getMessage();

    HttpServletRequest request = bcduiLogEvent.getRequest();
    if(ErrorSqlLogger.getInstance().isEnabled() && request != null) {
      try {
        Level errorLevel = event.getLevel();
        String pageHash = ThreadContext.get(RequestLifeCycleFilter.MDC_KEY_BCD_PAGEHASH),
               requestHash = ThreadContext.get(RequestLifeCycleFilter.MDC_KEY_BCD_REQUESTHASH),
               sessionId = ThreadContext.get(RequestLifeCycleFilter.MDC_KEY_SESSION_ID),
               requestUrl = bcduiLogEvent.getRequestUrl(),
               level = errorLevel != null ? errorLevel.toString() : null,
               revision = Utils.getBCDUIVersion(),
               throwInfo = null,
               clientMsg = bcduiLogEvent != null ? bcduiLogEvent.getFormattedMessage() : null;

        if (requestUrl.length()> 2000)
          requestUrl = requestUrl.substring(0, 2000);
        if (revision != null && revision.length() > 30)
          revision = revision.substring(0, 30);

        Throwable thrwbl = bcduiLogEvent.getThrowable();
        if (thrwbl == null) thrwbl = event.getThrown();
        if (thrwbl != null)
          try (StringWriter writer = new StringWriter(); PrintWriter prWriter = new PrintWriter(writer);) {
            event.getThrown().printStackTrace(prWriter);
            throwInfo = writer.toString();
          }
        String message = (clientMsg != null ? clientMsg : "") + (throwInfo != null ? System.lineSeparator() + throwInfo : "");

        // log error
        final ErrorSqlLogger.LogRecord recordError = new ErrorSqlLogger.LogRecord(
              sessionId
            , requestUrl
            , pageHash
            , requestHash
            , level
            , bcduiLogEvent.getMessage()
            , message
            , revision
        );
        ErrorSqlLogger.getInstance().process(recordError);
      } catch (Exception e) {
        e.printStackTrace();
      }
    }
  }
}
