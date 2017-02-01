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

import org.apache.log4j.AppenderSkeleton;
import org.apache.log4j.spi.LoggingEvent;
import de.businesscode.bcdui.logging.SessionSqlLogger;
import de.businesscode.bcdui.logging.SessionSqlLogger.LogRecord;

public class BuiSessionLogAppender extends AppenderSkeleton {

  public BuiSessionLogAppender() {
  }

  public BuiSessionLogAppender(boolean isActive) {
    super(isActive);
  }

  @Override
  protected void append(LoggingEvent event) {
    if (event.getMessage() instanceof SessionSqlLogger.LogRecord) {
      LogRecord sessionLogEvent = (SessionSqlLogger.LogRecord) event.getMessage();
      if(SessionSqlLogger.getInstance().isEnabled()) {
        SessionSqlLogger.getInstance().process(sessionLogEvent);
      }
    }
  }

  @Override
  public boolean requiresLayout() {
    return false;
  }

  @Override
  public void close() {
  }
}
