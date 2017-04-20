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
 * logs {@link AccessSqlLogger.LogRecord} into database, binding set used is bcd_log_access,
 * this class is not intended to be customized or extended in projects. The existence of
 * the binding-set enables this logger automatically.
 *
 */
final public class AccessSqlLogger extends ASqlLogger<AccessSqlLogger.LogRecord> {
  private static final int DEFAULT_QUEUE_SIZE =       100;
  private static final long DEFAULT_QUEUE_SLEEP_MS =  10*1000;  //10seconds
  private static final String PARAM_QUEUE_SIZE =      "bcdui/loggers/db/access/queueSize";
  private static final String PARAM_QUEUE_SLEEP_MS =  "bcdui/loggers/db/access/queueSleepMs";

  /**
   * the result to log into database
   *
   */
  public static final class LogRecord {
    final Date stamp;
    String sessionId;
    String pageHash;
    String requestHash;
    String requestUrl;
    String bindingSetName;
    String requestXml;
    long rowCount;
    long valueCount;
    long rsStartTime;
    long rsEndTime;
    long writeDuration;
    long executeDuration;

    public LogRecord(String sessionId, String requestUrl, String pageHash, String requestHash, String bindingSetName, String requestXml, long rowCount, long valueCount, long rsStartTime, long rsEndTime, long writeDuration, long executeDuration) {
      super();
      this.sessionId =  sessionId;
      this.pageHash = pageHash;
      this.requestHash = requestHash;
      this.requestUrl = requestUrl;
      this.bindingSetName = bindingSetName;
      this.requestXml = requestXml;
      this.rowCount = rowCount;
      this.valueCount = valueCount;
      this.rsStartTime = rsStartTime;
      this.rsEndTime = rsEndTime;
      this.writeDuration = writeDuration;
      this.executeDuration = executeDuration;
      this.stamp = new Date();
    }

    @Override
    public String toString() {
      return String.format("[SESSION:'%s', URL:'%s']", sessionId, requestUrl);
    }
  }

  private final static String TPL_INSERT_STMT =
      "#set($b = $bindings.bcd_log_access)" +
          " INSERT INTO $b.plainTableName (" +
          "   $b.logTime-" +
          ",  $b.sessionId-" +
          ",  $b.pageHash-" +
          ",  $b.requestHash-" +
          ",  $b.requestUrl-" +
          ",  $b.bindingSetName-" +
          ",  $b.requestXml-" +
          ",  $b.rowCount-" +
          ",  $b.valueCount-" +
          ",  $b.rsStartTime-" +
          ",  $b.rsEndTime-" +
          ",  $b.writeDuration-" +
          ",  $b.executeDuration-" +
          ") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)";

  protected AccessSqlLogger() {
    super("bcd_log_access",
        BareConfiguration.getInstance().getConfigurationParameter(PARAM_QUEUE_SIZE, DEFAULT_QUEUE_SIZE),
        BareConfiguration.getInstance().getConfigurationParameter(PARAM_QUEUE_SLEEP_MS, DEFAULT_QUEUE_SLEEP_MS));
  }

  private static SingletonHolder<AccessSqlLogger> holder = new SingletonHolder<AccessSqlLogger>() {
    @Override
    protected AccessSqlLogger createInstance() {
      return new AccessSqlLogger();
    }
  };

  public static AccessSqlLogger getInstance() {
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
        record.requestUrl,
        record.bindingSetName,
        record.requestXml,
        record.rowCount,
        record.valueCount,
        record.rsStartTime,
        record.rsEndTime,
        record.writeDuration,
        record.executeDuration
      };
    }

    return data;
  }
}
