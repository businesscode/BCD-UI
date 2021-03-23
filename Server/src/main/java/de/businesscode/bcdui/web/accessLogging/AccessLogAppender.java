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

import javax.servlet.http.HttpServletRequest;

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

import de.businesscode.bcdui.logging.AccessSqlLogger;
import de.businesscode.bcdui.web.filters.RequestLifeCycleFilter;
import de.businesscode.bcdui.web.wrs.WrsAccessLogEvent;
import de.businesscode.util.Utils;

@Plugin(name = "AccessLogAppender", category = "Core", elementType = "appender", printObject = true)
public class AccessLogAppender extends AbstractAppender {
  
  public AccessLogAppender(final String name, final Filter filter, final Layout<? extends Serializable> layout, 
      final boolean ignoreExceptions, final Property[] properties) {
    super(name, filter, layout, ignoreExceptions, properties);
    start();
  }
  
  @PluginFactory
  public static AccessLogAppender createAppender(@PluginAttribute("name") String name,
                                                 @PluginElement("Layout") Layout<? extends Serializable> layout,
                                                 @PluginElement("Filters") Filter filter) {
      if (layout == null)
          layout = PatternLayout.createDefaultLayout();
      return new AccessLogAppender(name, filter, layout, false, null);
  }
  
  public static AccessLogAppender createAppender() {
    return createAppender("AccessLogAppender", null, null);
  }

  @Override
  public void append(LogEvent event) {
    // It is assumed that every LoggingEvent passed to the appender is an WrsAccessLogEvent.
    // If this is not the case, there is a programming error, which should lead to an uncaught exception.
    WrsAccessLogEvent wrsLogEvent = (WrsAccessLogEvent) event.getMessage();

    try {
      HttpServletRequest request = wrsLogEvent.getRequest();
      if (request != null) {
        String pageHash = ThreadContext.get(RequestLifeCycleFilter.MDC_KEY_BCD_PAGEHASH),
               requestHash = ThreadContext.get(RequestLifeCycleFilter.MDC_KEY_BCD_REQUESTHASH),
               sessionId = ThreadContext.get(RequestLifeCycleFilter.MDC_KEY_SESSION_ID),
               reqQuery = request.getQueryString(),
               requestUrl = request.getRequestURL().toString() + (reqQuery != null ? "?" + reqQuery : ""),
               bindingSetName = wrsLogEvent.getBindingSetName(),
               requestXML = wrsLogEvent.getRequestDoc() != null ? Utils.serializeElement(wrsLogEvent.getRequestDoc()) : null;

        if (requestUrl.length()> 2000)
          requestUrl = requestUrl.substring(0, 2000);
        if (bindingSetName != null && bindingSetName.length()> 255)
          bindingSetName = bindingSetName.substring(0, 255);

        // log access
        if(AccessSqlLogger.getInstance().isEnabled()) {
          final AccessSqlLogger.LogRecord recordAccess = new AccessSqlLogger.LogRecord(
                sessionId
              , requestUrl
              , pageHash
              , requestHash
              , bindingSetName
              , requestXML
              , wrsLogEvent.getRowCount()
              , wrsLogEvent.getValueCount()
              , wrsLogEvent.getRsStartTime()
              , wrsLogEvent.getRsEndTime()
              , wrsLogEvent.getWriteDuration()
              , wrsLogEvent.getExecuteDuration()
          );
          AccessSqlLogger.getInstance().process(recordAccess);
        }
      }
    }
    catch (Exception e) {
      e.printStackTrace();
    }
  }
}
