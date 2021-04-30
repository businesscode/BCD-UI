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

import org.w3c.dom.Document;

import de.businesscode.bcdui.toolbox.config.BareConfiguration;
import de.businesscode.bcdui.web.servlets.ZipLet;
import de.businesscode.sqlengine.SQLEngine;
import de.businesscode.util.SingletonHolder;
import de.businesscode.util.Utils;

/**
 * logs {@link PageSqlLogger.LogRecord} into database, binding set used is bcd_log_page,
 * this class is not intended to be customized or extended in projects. The existence of
 * the binding-set enables this logger automatically.
 *
 */
final public class PageSqlLogger extends ASqlLogger<PageSqlLogger.LogRecord> {
  private static final int DEFAULT_QUEUE_SIZE =       100;
  private static final long DEFAULT_QUEUE_SLEEP_MS =  10*1000;  //10seconds
  private static final String PARAM_QUEUE_SIZE =      "bcdui/loggers/db/page/queueSize";
  private static final String PARAM_QUEUE_SLEEP_MS =  "bcdui/loggers/db/page/queueSleepMs";

  /**
   * the result to log into database
   *
   */
  public static final class LogRecord extends LogEventBase {
    String sessionId, url, pageHash;
    final Date stamp = new Date();

    public LogRecord(String sessionId, String url, String pageHash) {
      super();
      this.sessionId = sessionId;
      this.url = url;
      this.pageHash = pageHash;
    }

    @Override
    public String toString() {
      return String.format("[SESSION:'%s', URL:'%s']", sessionId, url);
    }

    @Override
    public String getFormattedMessage() {
      return toString();
    }
  }

  private final static String TPL_INSERT_STMT =
      "#set($b = $bindings.bcd_log_page)" +
          " INSERT INTO $b.plainTableName (" +
          "   $b.logTime-" +
          ",  $b.sessionId-" +
          ",  $b.requestUrl-" +
          ",  $b.pageHash-" +
          ",  $b.guiStatus-" +
          ") VALUES (?,?,?,?,?)";

  protected PageSqlLogger() {
    super("bcd_log_page",
        BareConfiguration.getInstance().getConfigurationParameter(PARAM_QUEUE_SIZE, DEFAULT_QUEUE_SIZE),
        BareConfiguration.getInstance().getConfigurationParameter(PARAM_QUEUE_SLEEP_MS, DEFAULT_QUEUE_SLEEP_MS));
  }

  private static SingletonHolder<PageSqlLogger> holder = new SingletonHolder<PageSqlLogger>() {
    @Override
    protected PageSqlLogger createInstance() {
      return new PageSqlLogger();
    }
  };

  public static PageSqlLogger getInstance() {
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

      // decompress guiStatus if we have one
      String guiStatus = record.url;
      int x = guiStatus != null ? guiStatus.indexOf("guiStatusGZ=") : -1;
      guiStatus = x != -1 ? record.url.substring(x + "guiStatusGZ=".length()) : null;
      x = guiStatus != null ? guiStatus.indexOf("&") : -1;
      guiStatus = x != -1 ? guiStatus.substring(0, x) : guiStatus;

      if (guiStatus != null) {
        try {
          Document doc = ZipLet.decodeAndDecompressToXML(guiStatus, null);
          guiStatus = doc != null ? Utils.serializeElement(doc) : null;
        }
        catch (Exception e) { guiStatus = null; }
      }

      data[cnt++] = new Object[]{
        new Timestamp(record.stamp.getTime()),
        record.sessionId,
        record.url,
        record.pageHash,
        guiStatus
      };
    }

    return data;
  }
}
