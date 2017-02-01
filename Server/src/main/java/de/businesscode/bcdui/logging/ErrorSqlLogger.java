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
package de.businesscode.bcdui.logging;

import java.util.Collection;

import de.businesscode.bcdui.toolbox.config.BareConfiguration;
import de.businesscode.sqlengine.SQLEngine;
import de.businesscode.util.SingletonHolder;

/**
 * logs {@link ErrorSqlLogger.LogRecord} into database, binding set used is bcd_log_error,
 * this class is not intended to be customized or extended in projects. The existence of
 * the binding-set enables this logger automatically.
 *
 */
final public class ErrorSqlLogger extends ASqlLogger<ErrorSqlLogger.LogRecord> {
  private static final int DEFAULT_QUEUE_SIZE =       100;
  private static final long DEFAULT_QUEUE_SLEEP_MS =  10*1000;  //10seconds
  private static final String PARAM_QUEUE_SIZE =      "bcdui/loggers/db/error/queueSize";
  private static final String PARAM_QUEUE_SLEEP_MS =  "bcdui/loggers/db/error/queueSleepMs";

  /**
   * the result to log into database
   *
   */
  public static final class LogRecord {

    String sessionId;
    String pageHash;
    String requestHash;
    String logLevel;
    String requestUrl;
    String message;
    String stackTrace;
    String revision;

    public LogRecord(String sessionId, String requestUrl, String pageHash, String requestHash, String logLevel, String message, String stackTrace, String revision) {
      super();
      this.sessionId =  sessionId;
      this.pageHash = pageHash;
      this.requestHash = requestHash;
      this.logLevel = logLevel;
      this.requestUrl = requestUrl;
      this.message = message;
      this.stackTrace = stackTrace;
      this.revision = revision;
    }

    @Override
    public String toString() {
      return String.format("[SESSION:'%s', URL:'%s']", sessionId, requestUrl);
    }
  }

  private final static String TPL_INSERT_STMT =
      "#set($b = $bindings.bcd_log_error)" +
          " INSERT INTO $b.plainTableName (" +
          "   $b.sessionId-" +
          ",  $b.pageHash-" +
          ",  $b.requestHash-" +
          ",  $b.logLevel-" +
          ",  $b.requestUrl-" +
          ",  $b.message-" +
          ",  $b.stackTrace-" +
          ",  $b.revision-" +
          ") VALUES (?,?,?,?,?,?,?,?)";

  protected ErrorSqlLogger() {
    super("bcd_log_error",
        BareConfiguration.getInstance().getConfigurationParameter(PARAM_QUEUE_SIZE, DEFAULT_QUEUE_SIZE),
        BareConfiguration.getInstance().getConfigurationParameter(PARAM_QUEUE_SLEEP_MS, DEFAULT_QUEUE_SLEEP_MS));
  }

  private static SingletonHolder<ErrorSqlLogger> holder = new SingletonHolder<ErrorSqlLogger>() {
    @Override
    protected ErrorSqlLogger createInstance() {
      return new ErrorSqlLogger();
    }
  };

  public static ErrorSqlLogger getInstance() {
    return holder.get();
  }

  @Override
  protected String getSqlTemplate() {
    return new SQLEngine().transform(TPL_INSERT_STMT);
  }

  /**
   * processes given collection of type to dimensional object array to be consumed by batch SQL
   * @param records
   * @return
   */
  @Override
  protected Object[][] convertData(Collection<LogRecord> records) {
    Object[][] data = new Object[records.size()][];

    int cnt=0;
    for(LogRecord record: records){
      Object[] row = data[cnt++] = new Object[8];

      row[0] = record.sessionId;
      row[1] = record.pageHash;
      row[2] = record.requestHash;
      row[3] = record.logLevel;
      row[4] = record.requestUrl;
      row[5] = record.message;
      row[6] = record.stackTrace;
      row[7] = record.revision;
    }

    return data;
  }
}
