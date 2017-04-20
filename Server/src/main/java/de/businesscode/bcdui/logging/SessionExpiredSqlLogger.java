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

import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.Collection;
import java.util.Date;

import org.apache.log4j.Logger;

import de.businesscode.bcdui.toolbox.config.BareConfiguration;
import de.businesscode.sqlengine.SQLEngine;
import de.businesscode.util.SingletonHolder;

/**
 * logs {@link LogRecord} into database, binding set used is bcd_log_session,
 * this class is not intended to be customized or extended in projects. The existence of
 * the binding-set enables this logger automatically.
 *
 */
final public class SessionExpiredSqlLogger extends ASqlLogger<SessionExpiredSqlLogger.LogRecord> {
  private static final int DEFAULT_QUEUE_SIZE =       100;
  private static final long DEFAULT_QUEUE_SLEEP_MS =  10*1000;  //10seconds
  private static final String PARAM_QUEUE_SIZE =      "bcdui/loggers/db/session/queueSize";
  private static final String PARAM_QUEUE_SLEEP_MS =  "bcdui/loggers/db/session/queueSleepMs";
  private static Logger logger = Logger.getLogger(SessionExpiredSqlLogger.class);
  /**
   * Log for expired session
   */
  public static final class LogRecord {
    final String sessionId;
    final Date stamp = new Date();

    public LogRecord(String sessionId) {
      super();
      this.sessionId = sessionId;
    }

    @Override
    public String toString() {
      return String.format("[EXPIRED SESSION:'%s']", sessionId);
    }
  }

  private final static String TPL_UPDATE_STMT =
      "#set($b = $bindings.bcd_log_session)" +
          " UPDATE $b.plainTableName SET $b.sessionExpiredTime- = ? where $b.sessionId- = ?";

  protected SessionExpiredSqlLogger() {
    super("bcd_log_session",
        BareConfiguration.getInstance().getConfigurationParameter(PARAM_QUEUE_SIZE, DEFAULT_QUEUE_SIZE),
        BareConfiguration.getInstance().getConfigurationParameter(PARAM_QUEUE_SLEEP_MS, DEFAULT_QUEUE_SLEEP_MS));
  }

  private static SingletonHolder<SessionExpiredSqlLogger> holder = new SingletonHolder<SessionExpiredSqlLogger>() {
    @Override
    protected SessionExpiredSqlLogger createInstance() {
      return new SessionExpiredSqlLogger();
    }
  };

  public static SessionExpiredSqlLogger getInstance() {
    return holder.get();
  }

  @Override
  protected String getSqlTemplate() {
    return new SQLEngine().transform(TPL_UPDATE_STMT);
  }

  @Override
  protected int[] executeStatement(Object[][] params) throws SQLException {
    int[] updates = super.executeStatement(params);
    // check and report when no updates done
    for(int i=0; i<updates.length; i++){
      if(updates[i] == 0){
        logger.warn("Failed to log session expiry, no hit for session: " + params[i][0]);
      }
    }
    return updates;
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
        record.sessionId
      };
    }

    return data;
  }
}
