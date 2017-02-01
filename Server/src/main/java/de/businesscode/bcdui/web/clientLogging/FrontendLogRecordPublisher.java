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

import org.apache.log4j.Level;
import org.apache.log4j.Logger;


/**
 * processes records coming from the frontend and propagates them
 * to bcdui loggers
 *
 */
class FrontendLogRecordPublisher {
  public static final String LOGGER_NAME = FrontendLogRecordPublisher.class.getName();
  private Logger log = Logger.getLogger(LOGGER_NAME);

  /**
   * special LogRecord to be filled which logically fits to the log4javascript's
   * representation of a record
   *
   */
  public static class LogRecord {
    private String message;
    private String url;
    private String level;

    /**
     * @param message
     * @param url
     * @param level
     */
    public LogRecord(String message, String url, String level) {
      super();
      this.message = message;
      this.url = url;
      this.level = level;
    }
    /**
     * @return the message
     */
    public String getMessage() {
      return message;
    }
    /**
     * @return the url
     */
    public String getUrl() {
      return url;
    }
    /**
     * @return the level
     */
    public String getLevel() {
      return level;
    }
  }

  public void propagate(LogRecord record){
    log.log(
        Level.toLevel(record.getLevel()),
        String.format("[url: %s]: %s", record.getUrl(), record.getMessage())
    );
  }
}
