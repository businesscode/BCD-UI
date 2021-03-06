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

import de.businesscode.bcdui.logging.PageSqlLogger;

@Plugin(name = "PageLogAppender", category = "Core", elementType = "appender", printObject = true)
public class PageLogAppender extends AbstractAppender {
  
  public PageLogAppender(final String name, final Filter filter, final Layout<? extends Serializable> layout, 
      final boolean ignoreExceptions, final Property[] properties) {
    super(name, filter, layout, ignoreExceptions, properties);
    start();
  }
  
  @PluginFactory
  public static PageLogAppender createAppender(@PluginAttribute("name") String name,
                                               @PluginElement("Layout") Layout<? extends Serializable> layout,
                                               @PluginElement("Filters") Filter filter) {
      if (layout == null)
          layout = PatternLayout.createDefaultLayout();
      return new PageLogAppender(name, filter, layout, false, null);
  }
  
  public static PageLogAppender createAppender() {
    return createAppender("PageLogAppender", null, null);
  }

  @Override
  public void append(LogEvent event) {
    // It is assumed that every LoggingEvent passed to the appender is an PageSqlLogger.LogRecord.
    // If this is not the case, there is a programming error, which should lead to an uncaught exception.
    PageSqlLogger.LogRecord pageLogEvent = (PageSqlLogger.LogRecord) event.getMessage();
    if (PageSqlLogger.getInstance().isEnabled())
      PageSqlLogger.getInstance().process(pageLogEvent);
  }
}
