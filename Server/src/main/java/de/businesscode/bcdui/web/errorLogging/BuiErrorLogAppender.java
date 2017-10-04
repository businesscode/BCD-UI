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
package de.businesscode.bcdui.web.errorLogging;

import javax.servlet.http.HttpServletRequest;

import org.apache.log4j.AppenderSkeleton;
import org.apache.log4j.Level;
import org.apache.log4j.MDC;
import org.apache.log4j.spi.LoggingEvent;

import de.businesscode.bcdui.logging.ErrorSqlLogger;
import de.businesscode.bcdui.toolbox.ExceptionUtils;
import de.businesscode.bcdui.web.filters.RequestLifeCycleFilter;
import de.businesscode.util.Utils;

public class BuiErrorLogAppender extends AppenderSkeleton {

  public BuiErrorLogAppender() {
  }

  public BuiErrorLogAppender(boolean isActive) {
    super(isActive);
  }

  @Override
  protected void append(LoggingEvent event) {
    // we accept only WrsAccessLogEvent as message-object.
    if (event.getMessage() instanceof ErrorLogEvent) {
      ErrorLogEvent bcduiLogEvent = (ErrorLogEvent) event.getMessage();

      try {
        HttpServletRequest request = bcduiLogEvent.getRequest();
        if (request != null) {
          String pageHash = ((String)MDC.get(RequestLifeCycleFilter.MDC_KEY_BCD_PAGEHASH));
          String requestHash = ((String)MDC.get(RequestLifeCycleFilter.MDC_KEY_BCD_REQUESTHASH));
          String sessionId = ((String)MDC.get(RequestLifeCycleFilter.MDC_KEY_SESSION_ID));
          String requestUrl = bcduiLogEvent.getRequestUrl();
          if (requestUrl.length()> 2000)
            requestUrl = requestUrl.substring(0, 2000);
          Level errorLevel = event.getLevel();
          String level = errorLevel != null ? errorLevel.toString() : null;
          String revision = Utils.getBCDUIVersion();
          if (revision != null && revision.length() > 30)
            revision = revision.substring(0, 30);

          String clientMsg = event.getRenderedMessage();
          String throwInfo = event.getThrowableInformation() != null ? ExceptionUtils.getStackTrace(event.getThrowableInformation().getThrowable()) : null;
          String message = (clientMsg != null ? clientMsg : "") + (throwInfo != null ? throwInfo : "");

          // log error
          if(ErrorSqlLogger.getInstance().isEnabled()) {
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
          }
        }
      }
      catch (Exception e) {
        e.printStackTrace();
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
