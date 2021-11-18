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
package de.businesscode.bcdui.web.clientLogging;



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

import de.businesscode.bcdui.web.filters.RequestLifeCycleFilter;

@Plugin(name = "FrontendQueueAppender", category = "Core", elementType = "appender", printObject = true)
public class FrontendQueueAppender extends AbstractAppender {
  
  public FrontendQueueAppender(final String name, final Filter filter, final Layout<? extends Serializable> layout, 
      final boolean ignoreExceptions, final Property[] properties) {
    super(name, filter, layout, ignoreExceptions, properties);
    start();
  }
  
  @PluginFactory
  public static FrontendQueueAppender createAppender(@PluginAttribute("name") String name,
                                                     @PluginElement("Layout") Layout<? extends Serializable> layout,
                                                     @PluginElement("Filters") Filter filter) {
      if (layout == null)
          layout = PatternLayout.createDefaultLayout();
      return new FrontendQueueAppender(name, filter, layout, false, null);
  }
  
  public static FrontendQueueAppender createAppender() {
    return createAppender("FrontendQueueAppender", null, null);
  }

  @Override
  public void append(LogEvent event) {
    String sessionId = event.getContextData().getValue(RequestLifeCycleFilter.MDC_KEY_IS_CLIENT_LOG);
    // dont log if either originated from frontend log publisher or no MDC set
    if (sessionId == null || FrontendLogRecordPublisher.LOGGER_NAME.equals(event.getLoggerName()))
      return;

    String msg = getLayout() instanceof PatternLayout ? 
        ((PatternLayout) getLayout()).toSerializable(event) : 
          PatternLayout.createDefaultLayout().toSerializable(event);
    SingletonStringQueue.getInstance(sessionId).add(msg);
  }
}
