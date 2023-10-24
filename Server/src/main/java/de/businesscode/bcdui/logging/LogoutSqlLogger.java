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

import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.Collection;
import java.util.Date;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import de.businesscode.bcdui.toolbox.config.BareConfiguration;
import de.businesscode.sqlengine.SQLEngine;
import de.businesscode.util.SingletonHolder;

/**
 * logs {@link de.businesscode.bcdui.logging.LogoutSqlLogger.LogRecord} into database, binding set used is bcd_log_session,
 * this class is not intended to be customized or extended in projects. The existence of
 * the binding-set enables this logger automatically.
 *
 */
final public class LogoutSqlLogger extends ASqlLogger<LogoutSqlLogger.LogRecord> {
  private static final int DEFAULT_QUEUE_SIZE =       100;
  private static final long DEFAULT_QUEUE_SLEEP_MS =  10000;  //10seconds
  private static final String PARAM_QUEUE_SIZE =      "bcdui/loggers/db/login/queueSize";
  private static final String PARAM_QUEUE_SLEEP_MS =  "bcdui/loggers/db/login/queueSleepMs";
  private static Logger logger = LogManager.getLogger(LogoutSqlLogger.class);
  /**
   * the result to log into database
   *
   */
  public static final class LogRecord extends LogEventBase {
    final String sessionId;
    final Date stamp = new Date();

    public LogRecord(String sessionId) {
      super();
      this.sessionId = sessionId;
    }

    @Override
    public String toString() {
      return String.format("[LOGOUT SESSION:'%s']", sessionId);
    }

    @Override
    public String getFormattedMessage() {
      return toString();
    }
  }

  private final static String TPL_UPDATE_STMT =
      "#set($b = $bindings.bcd_log_login)" +
          " UPDATE $b.plainTableName SET $b.sessionExpiredTime- = ? where $b.sessionId- = ?";

  protected LogoutSqlLogger() {
    super("bcd_log_login",
        BareConfiguration.getInstance().getConfigurationParameter(PARAM_QUEUE_SIZE, DEFAULT_QUEUE_SIZE),
        BareConfiguration.getInstance().getConfigurationParameter(PARAM_QUEUE_SLEEP_MS, DEFAULT_QUEUE_SLEEP_MS));
  }

  private static SingletonHolder<LogoutSqlLogger> holder = new SingletonHolder<LogoutSqlLogger>() {
    @Override
    protected LogoutSqlLogger createInstance() {
      return new LogoutSqlLogger();
    }
  };

  public static LogoutSqlLogger getInstance() {
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
      if(updates[i] == 0) {
        // This happens if a restricted page is accessed without a valid login and the user does not login before the temporary session expires.
        // In that case there is no log entry to update. So this is not considered a warning or error
        logger.trace("Failed to update session expiry in bcd_log_login for session: " + params[i][1]);
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
