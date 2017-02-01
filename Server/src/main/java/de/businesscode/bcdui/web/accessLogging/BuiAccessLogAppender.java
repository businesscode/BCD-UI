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

import javax.servlet.http.HttpServletRequest;

import org.apache.log4j.AppenderSkeleton;
import org.apache.log4j.MDC;
import org.apache.log4j.spi.LoggingEvent;

import de.businesscode.bcdui.logging.AccessSqlLogger;
import de.businesscode.bcdui.web.filters.RequestLifeCycleFilter;
import de.businesscode.bcdui.web.wrs.WrsAccessLogEvent;
import de.businesscode.util.Utils;

public class BuiAccessLogAppender extends AppenderSkeleton {

  public BuiAccessLogAppender() {
  }

  public BuiAccessLogAppender(boolean isActive) {
    super(isActive);
  }

  @Override
  protected void append(LoggingEvent event) {
    // we accept only WrsAccessLogEvent as message-object.
    if (event.getMessage() instanceof WrsAccessLogEvent) {
      WrsAccessLogEvent wrsLogEvent = (WrsAccessLogEvent) event.getMessage();

      try {
        HttpServletRequest request = wrsLogEvent.getRequest();
        if (request != null) {
          String pageHash = ((String)MDC.get(RequestLifeCycleFilter.MDC_KEY_BCD_PAGEHASH));
          String requestHash = ((String)MDC.get(RequestLifeCycleFilter.MDC_KEY_BCD_REQUESTHASH));
          String sessionId = ((String)MDC.get(RequestLifeCycleFilter.MDC_KEY_SESSION_ID));
          String requestUrl = request.getRequestURL().toString();
          String reqQuery = request.getQueryString();
          requestUrl += (reqQuery != null ? "?" + reqQuery : "");
          if (requestUrl.length()> 2000)
            requestUrl = requestUrl.substring(0, 2000);
          String bindingSetName = wrsLogEvent.getBindingSetName();
          if (bindingSetName != null && bindingSetName.length()> 255)
            bindingSetName = bindingSetName.substring(0, 255);
          String requestXML = wrsLogEvent.getRequestDoc()!=null ? Utils.serializeElement(wrsLogEvent.getRequestDoc()) : null;

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

  @Override
  public boolean requiresLayout() {
    return false;
  }

  @Override
  public void close() {
  }
}
