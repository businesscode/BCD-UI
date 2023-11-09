/*
  Copyright 2010-2023 BusinessCode GmbH, Germany

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

import java.sql.Timestamp;
import java.util.Collection;
import java.util.Date;

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
  private static final long DEFAULT_QUEUE_SLEEP_MS =  10000;  //10seconds
  private static final String PARAM_QUEUE_SIZE =      "bcdui/loggers/db/error/queueSize";
  private static final String PARAM_QUEUE_SLEEP_MS =  "bcdui/loggers/db/error/queueSleepMs";

  /**
   * the result to log into database
   *
   */
  public static final class LogRecord {
    final Date stamp;
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
      this.stamp = new Date();
    }

    @Override
    public String toString() {
      return String.format("[SESSION:'%s', URL:'%s']", sessionId, requestUrl);
    }
  }

  private final static String TPL_INSERT_STMT =
      "#set($b = $bindings.bcd_log_error)" +
          " INSERT INTO $b.plainTableName (" +
          "   $b.logTime_" +
          ",  $b.sessionId_" +
          ",  $b.pageHash_" +
          ",  $b.requestHash_" +
          ",  $b.logLevel_" +
          ",  $b.requestUrl_" +
          ",  $b.message_" +
          ",  $b.stackTrace_" +
          ",  $b.revision_" +
          ") VALUES (?,?,?,?,?,?,?,?,?)";

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
      data[cnt++] = new Object[]{
        new Timestamp(record.stamp.getTime()),
        record.sessionId,
        record.pageHash,
        record.requestHash,
        record.logLevel,
        record.requestUrl,
        record.message,
        record.stackTrace,
        record.revision
      };
    }

    return data;
  }
}
