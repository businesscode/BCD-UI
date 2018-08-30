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
package de.businesscode.bcdui.wrs.load;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Iterator;

import org.apache.log4j.Logger;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.wrs.IRequestOptions;
import de.businesscode.util.jdbc.Closer;

/**
 * This algorithmus <br>
 * reads input from input options, <br>
 * uses generator to interpret the options (generate SQL), <br>
 * executes sql and <br>
 * writes the resultSet out into the writer.
 */
public class DataLoader {
  //
  private static final Logger log = Logger.getLogger(DataLoader.class);
  //
  private final IRequestOptions options;
  //
  private final ISqlGenerator generator;
  private final IDataWriter dataWriter;
  private long executeDuration;
  private long writeDuration;
  private long rsStartTime;
  private long rsEndTime;

  /**
   * DataLoader
   *
   * @param options
   * @param generator
   * @param dataWriter
   */
  public DataLoader(IRequestOptions options, ISqlGenerator generator, IDataWriter dataWriter) {
    super();
    this.options = options;
    this.generator = generator;
    this.dataWriter = dataWriter;
  }

  /**
   * @return the options
   */
  protected final IRequestOptions getOptions() {
    return options;
  }

  // ================================================================================================

  /**
   * @return the generator
   */
  protected final ISqlGenerator getGenerator() {
    return generator;
  }

  /**
   * @return the dataWriter
   */
  protected final IDataWriter getDataWriter() {
    return dataWriter;
  }

  // ================================================================================================

  /**
   * isEmpty
   *
   * @return true if no query was specified from the request
   */
  public boolean isEmpty() {
    return getGenerator().isEmpty();
  }

  /**
   * @return the sql execution executeDuration
   */
  public final long getExecuteDuration() {
    return executeDuration;
  }

  /**
   * @param executeDuration
   *          the executeDuration to set
   */
  private void setExecuteDuration(long duration) {
    this.executeDuration = duration;
  }

  /**
   * @return the writeDuration
   */
  public long getWriteDuration() {
    return writeDuration;
  }

  /**
   * @param writeDuration the writeDuration to set
   */
  private void setWriteDuration(long writeDuration) {
    this.writeDuration = writeDuration;
  }

  /**
   * @return the rsStartTime
   */
  public long getRsStartTime() {
    return rsStartTime;
  }

  /**
   * @param rsStartTime the rsStartTime to set
   */
  private void setRsStartTime(long rsStartTime) {
    this.rsStartTime = rsStartTime;
  }

  /**
   * @return the rsEndTime
   */
  public long getRsEndTime() {
    return rsEndTime;
  }

  /**
   * @param rsEndTime the rsEndTime to set
   */
  private void setRsEndTime(long rsEndTime) {
    this.rsEndTime = rsEndTime;
  }

  // ================================================================================================

  private void insertParametersInSQLStatement(PreparedStatement statement, SQLStatementWithParams stmData) throws SQLException, ParseException {
    int i = 0;
    Iterator<BindingItem> bindingItemIt = stmData.getFilterBindingItems().iterator();
    SimpleDateFormat dateFormatter = new SimpleDateFormat("yyyy-MM-dd");
    SimpleDateFormat timestampFormatter = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss");
    for (String value : stmData.getFilterValues()) {
      BindingItem bindingItem = bindingItemIt.next();
      ++i;
      // log.trace("Setting parameter " + i + " with datatype " + bindingItem.getJDBCDataTypeName() + " to " + value);
      int dataType = bindingItem!=null ? bindingItem.getJDBCDataType() : Types.VARCHAR;
      switch( dataType ) {
        case Types.VARCHAR: // Frequent cases
        case Types.CHAR:
          statement.setString(i, value);
          break;
        case Types.DATE:
          statement.setDate(i, new Date(dateFormatter.parse(value).getTime()));
          break;
        case Types.TIMESTAMP:
          statement.setTimestamp(i, new Timestamp(timestampFormatter.parse(value).getTime()));
          break;
        case Types.NUMERIC:
        case Types.DECIMAL:
        case Types.DOUBLE:
        case Types.FLOAT:
        case Types.REAL:
          statement.setBigDecimal(i, new BigDecimal(value));
          break;
        case Types.INTEGER:
        case Types.BIGINT:
        case Types.SMALLINT:
        case Types.TINYINT:
          statement.setInt(i, new Integer(value));
          break;
        default:
          statement.setString(i, value);
      }
    }
  }

  /**
   * run
   *
   * @throws Exception
   */
  public void run() throws Exception {
    log.trace("Start data loading");
    setExecuteDuration(0);
    setWriteDuration(0);
    //
    if (!getGenerator().isEmpty()) {
      String dbSourceName = getGenerator().getDbSourceName();
      Connection connection = getOptions().getManagedConnection(dbSourceName);
      //
      if (connection != null) {
        log.trace("Got connection. dbSourceName=" + (dbSourceName == null ? "<default>" : dbSourceName));
      }
      else {
        throw new Exception("Canot find connection. dbSourceName=" + (dbSourceName == null ? "<default>" : dbSourceName));
      }
      //
      PreparedStatement statement = null;
      ResultSet resultSet = null;
      try {
        SQLStatementWithParams stmData = getGenerator().getSelectStatement();
        String sql = stmData.getStatement();
        if(log.isDebugEnabled()){
          log.debug("Query SQL: " + sql);
        }
        try {
          statement = prepareStatement(connection, sql);
          // log.trace("Statement prepared.");
          insertParametersInSQLStatement(statement, stmData);
        }
        catch (Exception e) { // Wrap the SQLException - add SQL to the exception message
          if (getOptions().isDebugMode()){
            throw new Exception("Couldn't prepare statement:\n" + sql, e);
          }else{
            throw new Exception("Couldn't prepare statement", e);
          }
        }
        //
        // max rows
        int maxRows = getOptions().getMaxRows();
        if (maxRows >= 0) {
          statement.setMaxRows(maxRows);
          log.trace("Max rows:" + maxRows);
        }
        //
        // TODO start row - here or in sql generator
        // TODO binding set version - see de.businesscode.soa.model.webRowSet.load.LoadXML.init(HttpServletRequest, String, String)
        //
        long timeBefore = System.currentTimeMillis();
        try {
          resultSet = executeQuery(statement);
          log.trace("SQL executed.");
        }
        catch (SQLException e) { // Wrap the SQLException - add SQL to the exception message
          if (getOptions().isDebugMode()){
            throw new Exception("Couldn't execute statement:\n" + sql, e);
          }else{
            throw new Exception("Couldn't execute statement", e);
          }
        }
        setExecuteDuration(System.currentTimeMillis() - timeBefore);
        //
        timeBefore = System.currentTimeMillis();
        setRsStartTime(System.currentTimeMillis());
        writeResult(resultSet);
        log.trace("Result written, " + getDataWriter().getRowCount() + " rows.");
        setWriteDuration(System.currentTimeMillis() - timeBefore);
        setRsEndTime(System.currentTimeMillis());
      }
      finally {
        Closer.closeAllSQLObjects(resultSet, statement);
      }
    }
    else {
      log.trace("Return empty document");
      writeResult(null); // write the empty result
    }
    log.trace("End data loading.");
  }

  // ================================================================================================

  /**
   * Create the prepared statement
   *
   * Clients can overwrite this method to implement same logic
   *
   * @param connection
   * @param sql
   * @return the statement
   * @throws Exception
   */
  protected PreparedStatement prepareStatement(Connection connection, String sql) throws Exception {
    return connection.prepareStatement(sql);
  }

  /**
   * Execute query generated by the generator
   *
   * Clients can overwrite this method to implement same logic
   *
   * @param statement
   * @return the result set
   * @throws Exception
   */
  protected ResultSet executeQuery(PreparedStatement statement) throws Exception {
    return statement.executeQuery();
  }

  /**
   * Write result out using the data writer.
   *
   * Clients can overwrite this method to implement same logic
   *
   * @param resultSet
   *          - data to write out. Can be null if generator was empty
   * @throws Exception
   */
  protected void writeResult(ResultSet resultSet) throws Exception {
    getDataWriter().write(getOptions(), getGenerator(), resultSet, getExecuteDuration());
  }

}
