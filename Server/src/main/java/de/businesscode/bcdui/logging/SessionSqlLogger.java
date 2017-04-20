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

import java.sql.Timestamp;
import java.util.Collection;
import java.util.Date;

import de.businesscode.bcdui.toolbox.config.BareConfiguration;
import de.businesscode.sqlengine.SQLEngine;
import de.businesscode.util.SingletonHolder;

/**
 * logs {@link de.businesscode.bcdui.logging.SessionSqlLogger.LogRecord} into database, binding set used is bcd_log_session,
 * this class is not intended to be customized or extended in projects. The existence of
 * the binding-set enables this logger automatically.
 *
 */
final public class SessionSqlLogger extends ASqlLogger<SessionSqlLogger.LogRecord> {
  private static final int DEFAULT_QUEUE_SIZE =       100;
  private static final long DEFAULT_QUEUE_SLEEP_MS =  10*1000;  //10seconds
  private static final String PARAM_QUEUE_SIZE =      "bcdui/loggers/db/session/queueSize";
  private static final String PARAM_QUEUE_SLEEP_MS =  "bcdui/loggers/db/session/queueSleepMs";

  /**
   * the result to log into database
   *
   */
  public static final class LogRecord {
    String sessionId, userAgent,remoteAddress;
    final Date stamp = new Date();

    public LogRecord(String sessionId, String userAgent, String remoteAddress) {
      super();
      this.sessionId = sessionId;
      this.userAgent = userAgent;
      this.remoteAddress = remoteAddress;
    }

    @Override
    public String toString() {
      return String.format("[SESSION:'%s', AGENT:'%s']", sessionId, userAgent);
    }
  }

  private final static String TPL_INSERT_STMT =
      "#set($b = $bindings.bcd_log_session)" +
          " INSERT INTO $b.plainTableName (" +
          "   $b.logTime-" +
          ",  $b.sessionId-" +
          ",  $b.userAgent-" +
          ",  $b.remoteAddr-" +
          ") VALUES (?,?,?,?)";

  protected SessionSqlLogger() {
    super("bcd_log_session",
        BareConfiguration.getInstance().getConfigurationParameter(PARAM_QUEUE_SIZE, DEFAULT_QUEUE_SIZE),
        BareConfiguration.getInstance().getConfigurationParameter(PARAM_QUEUE_SLEEP_MS, DEFAULT_QUEUE_SLEEP_MS));
  }

  private static SingletonHolder<SessionSqlLogger> holder = new SingletonHolder<SessionSqlLogger>() {
    @Override
    protected SessionSqlLogger createInstance() {
      return new SessionSqlLogger();
    }
  };

  public static SessionSqlLogger getInstance() {
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
        record.userAgent,
        record.remoteAddress
      };
    }

    return data;
  }
}
