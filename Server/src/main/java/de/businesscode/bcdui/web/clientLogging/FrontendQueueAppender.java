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

import org.apache.log4j.AppenderSkeleton;
import org.apache.log4j.spi.LoggingEvent;
import org.apache.log4j.xml.XMLLayout;

import de.businesscode.bcdui.web.filters.RequestLifeCycleFilter;

/**
 *         This appender is desgined to publish logging events to the Frontend
 *         logging subsystem for clients requested it. For this purpose we rely
 *         on the {@link RequestLifeCycleFilter} which has to tag those with the
 *         session id.
 *
 */
class FrontendQueueAppender extends AppenderSkeleton {

  public FrontendQueueAppender() {
    setLayout(new XMLLayout());
  }

  /*
   * @see
   * org.apache.log4j.AppenderSkeleton#append(org.apache.log4j.spi.LoggingEvent)
   */
  @Override
  protected void append(LoggingEvent event) {
    String sessionId = (String) event
        .getMDC(RequestLifeCycleFilter.MDC_KEY_IS_CLIENT_LOG);
    // dont log if either originated from frontend log publisher or no MDC set
    if (sessionId == null
        || FrontendLogRecordPublisher.LOGGER_NAME.equals(event.getLoggerName()))
      return;

    SingletonStringQueue.getInstance(sessionId).add(getLayout().format(event));
  }

  /*
   * @see org.apache.log4j.Appender#close()
   */
  @Override
  public void close() {
  }

  /*
   * return false as we dont want to enforce it in the properties
   *
   * @see org.apache.log4j.Appender#requiresLayout()
   */
  @Override
  public boolean requiresLayout() {
    return false;
  }
}
