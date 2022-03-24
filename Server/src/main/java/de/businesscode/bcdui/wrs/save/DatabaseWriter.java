/*
  Copyright 2010-2021 BusinessCode GmbH, Germany

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
package de.businesscode.bcdui.wrs.save;

import java.io.ByteArrayInputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.SQLXML;
import java.sql.Timestamp;
import java.sql.Types;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashSet;
import java.util.Map;
import java.util.stream.Collectors;

import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;
import org.apache.shiro.codec.Base64;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.wrs.save.exc.KeyColumnsNotDefinedException;
import de.businesscode.util.jdbc.Closer;
import de.businesscode.util.jdbc.DatabaseCompatibility;
import de.businesscode.util.jdbc.SQLDetailException;

/**
 * The Class is a writer of WebRowSet document into database,
 * supports auto detection of key columns by updating, it means if key columns
 * are defined and in modifyRow the values from them are not modified - the key columns
 * were ignored by setting values in SQL statement
 *
 */
public class DatabaseWriter {

  private static final BigDecimal BIG_DECIMAL_ONE = new BigDecimal("1");

  private BindingSet bindingSet = null;
  private Connection defaultConnection = null;
  private BindingItem[] columns = null;
  private Integer[] columnTypes = null;
  private boolean[] isKeyColumn = null;
  private int maxBatchSize = 0;
  private Logger log = LogManager.getLogger(getClass().getCanonicalName());

  private SimpleDateFormat dateParser = new SimpleDateFormat("yyyy-MM-dd");
  private SimpleDateFormat timestampParser = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

  private PreparedStatement updateStatement = null;
  private PreparedStatement updateStatementExceptKeyCols = null;
  private PreparedStatement insertStatement = null;
  private PreparedStatement deleteStatement = null;

  private int updateBatchSize = 0;
  private int insertBatchSize = 0;
  private int deleteBatchSize = 0;

  /**
   *
   * Constructor
   *
   * @param bindingSetPr
   * @param defaultConnectionPr
   * @param columnsPr
   * @param columnTypesPr
   * @param keyColumnNames
   * @param maxBatchSizePr
   * @throws SQLException
   * @throws IllegalArgumentException if keyColumnNames does not contain all keys from bindingSetPr
   */
  public DatabaseWriter(BindingSet bindingSetPr, Connection defaultConnectionPr, BindingItem[] columnsPr, Integer[] columnTypesPr, Collection<String> keyColumnNames, int maxBatchSizePr) throws SQLException {
    this.bindingSet = bindingSetPr;
    this.defaultConnection = defaultConnectionPr;
    this.columns = columnsPr;
    this.columnTypes = columnTypesPr;
    this.isKeyColumn = new boolean[columnsPr.length];
    this.maxBatchSize = maxBatchSizePr;
    for (int i = 0; i < columnsPr.length; ++i) {
      isKeyColumn[i] = keyColumnNames.contains(columnsPr[i].getId());
    }
    ensureAllKeysAvailable(bindingSetPr, keyColumnNames);
  }

  public void updateColumnsAndTypes(BindingItem[] columnsPr, Integer[] columnTypesPr) {
    this.columns = columnsPr;
    this.columnTypes = columnTypesPr;
  }

  /**
   * ensures that all key items of a bindingSet are contained in keyColumnNames 
   * @param bindingSet
   * @param keyColumnNames
   * @throws IllegalArgumentException if keyColumnNames does not contain all keys from bindingSet
   */
  private void ensureAllKeysAvailable(BindingSet bindingSet, Collection<String> keyColumnNames) {
    if(
      ! new HashSet<String>(keyColumnNames).containsAll(
        Arrays.stream(bindingSet.getKeyBindingItems()).map(bi->bi.getId()).collect(Collectors.toSet())
      )
    ) {
      throw new IllegalArgumentException(String.format("Constraint violation: Not all key-items provided for binding-set '%s'.", bindingSet.getName()));
    }
  }

  /**
   * creates and returns UPDATE SQL or String with length = 0, if the request doesn't have any key columns
   *
   * Method getUpdateStatementSQL
   *
   * @return
   */
  private String getUpdateStatementSQL(boolean exceptKeyCols) {
    StringBuilder builder = new StringBuilder();
    builder.append("UPDATE ");
    builder.append(bindingSet.getTableReference());
    builder.append(" SET ");
    for (int c = 0; c < columns.length; c++) {
      if (exceptKeyCols && isKeyColumn[c])
        continue;

      BindingItem column = columns[c];

      builder.append(column.getColumnExpression());
      if(column.isDefinedJDBCDataType() && column.getJDBCDataType() == Types.OTHER){
        if( "GEOMETRY".equalsIgnoreCase(column.getCustomAttributesMap().get("type-name")) ) {
          final Map<String, String[]> fctMapping = DatabaseCompatibility.getInstance().getSpatialFktMapping(bindingSet.getJdbcResourceName());
          builder.append("=").append(fctMapping.get("GeoFromWkt")[0]).append("?").append(fctMapping.get("GeoFromWkt")[2]).append(", ");
        } else {
          builder.append("=(?)::" + getCustomDatabaseType(column) + ",");
        }
      } else {
        builder.append("=?,");
      }
    }
    builder.setLength(builder.length()-1);  //remove last comma

    String sep = "";
    StringBuilder wherePart = new StringBuilder();
    for (int i = 0; i < columns.length; ++i) {
      if (isKeyColumn[i]) {
        // we generate statement for each where part like:
        // ((cKey=? and 1=?) or (cKey is null and 1=? ))
        // and set values:
        // setParam(1, value != null ? value : XX) // XX - any NOT NULL value.
        // setParam(2, value != null ? 1 : 0)
        // setParam(3, value != null ? 0 : 1)
        wherePart.append(sep);
        wherePart.append("((");
        BindingItem bi = columns[i];
        wherePart.append(bi.getColumnExpression());
        if(bi.isDefinedJDBCDataType() && bi.getJDBCDataType() == Types.OTHER){
          if( "GEOMETRY".equalsIgnoreCase(bi.getCustomAttributesMap().get("type-name")) ) {
            final Map<String, String[]> fctMapping = DatabaseCompatibility.getInstance().getSpatialFktMapping(bindingSet.getJdbcResourceName());
            builder.append("=").append(fctMapping.get("GeoFromWkt")[0]).append("?").append(fctMapping.get("GeoFromWkt")[2]);
          } else {
            wherePart.append("=(?)::" + getCustomDatabaseType(bi));
          }
        } else {
          wherePart.append("=?");
        }
        wherePart.append(" AND 1=?) OR (");
        wherePart.append(bi.getColumnExpression());
        wherePart.append(" IS NULL AND 1=?))");
        sep = " AND ";
      }
    }
    if (wherePart.length() > 0) {
      builder.append(" WHERE ").append(wherePart);
    }

    return builder.toString();
  }

  /**
   *
   * Method getInsertStatementSQL
   *
   * @return
   */
  private String getInsertStatementSQL() {
    StringBuilder builder = new StringBuilder();
    builder.append("INSERT INTO ");
    builder.append(bindingSet.getTableReference());
    builder.append(" (");
    String sep = "";
    for (BindingItem column : columns) {
      builder.append(sep);
      builder.append(column.getColumnExpression());
      sep = ", ";
    }

    builder.append(") VALUES (");
    for (int i = 0; i < columns.length; ++i) {
      if (i > 0)
        builder.append(", ");
      BindingItem bItem = columns[i];
      if(bItem.isDefinedJDBCDataType() && bItem.getJDBCDataType() == Types.OTHER) {
        if( "GEOMETRY".equalsIgnoreCase(bItem.getCustomAttributesMap().get("type-name")) ) {
          final Map<String, String[]> fctMapping = DatabaseCompatibility.getInstance().getSpatialFktMapping(bindingSet.getJdbcResourceName());
          builder.append(fctMapping.get("GeoFromWkt")[0]).append(" ? ").append(fctMapping.get("GeoFromWkt")[2]);
        } else {
          builder.append("(?)::" + getCustomDatabaseType(bItem));
        }
      } else {
        builder.append("?");
      }
    }

    builder.append(")");
    return builder.toString();
  }

  /**
   * 
   * @param bItem
   * @return custom type defined as cust:type-name or throws exception if empty/null
   */
  private String getCustomDatabaseType(BindingItem bItem) {
    String type = bItem.getCustomAttributesMap().get("type-name");
    if (type == null || type.trim().isEmpty()) {
      throw new RuntimeException("Custom database type expected on bindingItem " + bItem.getId() + " at @cust:type-name but was not defined");
    }
    return type;
  }

  /**
   * creates and returns INSERT SQL statement or String with length = 0, if the request doesn't have any key columns
   *
   * Method getDeleteStatementSQL
   *
   * @return
   */
  private String getDeleteStatementSQL() {
    StringBuilder builder = new StringBuilder();
    builder.append("DELETE FROM ");
    builder.append(bindingSet.getTableReference());
    String sep = "";
    StringBuilder wherePart = new StringBuilder();
    for (int i = 0; i < columns.length; ++i) {
      if (isKeyColumn[i]) {
        // we generate statement for each where part like:
        // ((cKey=? and 1=?) or (cKey is null and 1=? ))
        // and set values:
        // setParam(1, value != null ? value : XX) // XX - any NOT NULL value.
        // setParam(2, value != null ? 1 : 0)
        // setParam(3, value != null ? 0 : 1)
        wherePart.append(sep);
        wherePart.append("((");
        BindingItem bi = columns[i];
        wherePart.append(bi.getColumnExpression());

        if(bi.isDefinedJDBCDataType() && bi.getJDBCDataType() == Types.OTHER){
          wherePart.append("=(?)::" + getCustomDatabaseType(bi));
        } else {
          wherePart.append("=?");
        }

        wherePart.append(" AND 1=?) OR (");
        wherePart.append(bi.getColumnExpression());
        wherePart.append(" IS NULL AND 1=?))");
        sep = " AND ";
      }
    }

    if (wherePart.length() > 0) {
      builder.append(" WHERE ").append(wherePart);
    }

    return builder.toString();
  }

  /**
   * set values in given over prepared statement by means of parameter exceptKeyCols the setting of key columns values can be avoided, the feature is useful for update statement
   *
   * @param stm
   * @param values
   * @param offset
   * @param onlyKeys
   * @param exceptKeyCols - if the values of key columns mustn't be set
   * @throws Exception
   */
  private void setValues(PreparedStatement stm, String[] values, int offset, boolean onlyKeys, boolean exceptKeyCols) throws Exception {
    int paramNo = offset;
    int i = 0;
    try {
      for (; i < columns.length; ++i) {

        if (!onlyKeys && exceptKeyCols && isKeyColumn[i]) {
          continue;
        }

        if (onlyKeys && !isKeyColumn[i])
          continue;

        ++paramNo;

        String value = values[i];
        boolean isNull = (value == null || value.length() == 0) ? true : false;

        switch (columnTypes[i]) {
          case Types.DATE:
            if (isNull)
              stm.setNull(paramNo, Types.DATE);
            else
              stm.setDate(paramNo, new Date(dateParser.parse(value).getTime()));
            break;
          case Types.TIMESTAMP:
            if (isNull)
              stm.setNull(paramNo, Types.TIMESTAMP);
            else
              stm.setTimestamp(paramNo, new Timestamp(timestampParser.parse(value.replace('T', ' ')).getTime()));
            break;
          case Types.INTEGER:
          case Types.BIGINT:
          case Types.TINYINT: // // SE: 09.07.2009 fix teraData bug
            if (isNull)
              stm.setNull(paramNo, Types.INTEGER);
            else
              stm.setInt(paramNo, Integer.valueOf(value));
            break;
          case Types.SMALLINT:
            if (isNull)
              stm.setNull(paramNo, Types.SMALLINT);
            else
              stm.setShort(paramNo, Short.valueOf(value));
            break;
          case Types.DOUBLE:
            if (isNull)
              stm.setNull(paramNo, Types.DOUBLE);
            else
              stm.setDouble(paramNo, Double.valueOf(value));
            break;
          case Types.FLOAT:
            if (isNull)
              stm.setNull(paramNo, Types.FLOAT);
            else
              stm.setFloat(paramNo, Float.valueOf(value));
            break;
          case Types.DECIMAL:
          case Types.NUMERIC:
          case Types.REAL:
            if (isNull)
              stm.setNull(paramNo, Types.DECIMAL);
            else
              stm.setBigDecimal(paramNo, new BigDecimal(value));
            break;
          case Types.BLOB:
            if (isNull)
              stm.setNull(paramNo, Types.BLOB);
            else {
              byte decodeBytes[] = Base64.decode(value.getBytes(StandardCharsets.UTF_8));
              stm.setBinaryStream(paramNo, new ByteArrayInputStream(decodeBytes));
            }
            break;
          case Types.CLOB:
            if (isNull)
              stm.setNull(paramNo, Types.CLOB);
            else {
              Reader reader = new InputStreamReader(new ByteArrayInputStream(value.getBytes(StandardCharsets.UTF_8)), StandardCharsets.UTF_8);
              stm.setCharacterStream(paramNo, reader, value.length() /* number of characters, not bytes length */);  // TERADATA only supports the 3 parameters method of setCharacterStream
              reader.close();
            }
            break;
          case Types.SQLXML:
            if (isNull)
              // setNull() does not work here
              stm.setObject(paramNo, null);
            else {
              SQLXML data = stm.getConnection().createSQLXML();
              data.setString(value);
              stm.setSQLXML(paramNo, data);
              data.free();
            }
            break;
          default:
            if (isNull)
              stm.setNull(paramNo, Types.VARCHAR);
            else
              stm.setString(paramNo, value);
            break;
        }
      }
    }
    catch (Exception e) {
      throw new Exception("failed to set column nr " + (i + 1) + "\nvalue: " + values[i], e);
    }
  }
  /**
   * set values in given over prepared statement by means of parameter exceptKeyCols the setting of key columns values can be avoided, the feature is useful for update statement
   *
   * @param stm
   * @param values
   * @param offset
   * @param onlyKeys
   * @param exceptKeyCols - if the values of key columns mustn't be set
   * @throws Exception
   */
  private void setValuesWherePart(PreparedStatement stm, String[] values, int offset, boolean onlyKeys, boolean exceptKeyCols) throws Exception {
    int paramNo = offset;
    int paramCounter = 1;
    int i = 0;
    try {
      for (; i < columns.length; ++i) {

        if (!onlyKeys && exceptKeyCols && isKeyColumn[i]) {
          continue;
        }

        if (onlyKeys && !isKeyColumn[i])
          continue;

        paramNo = paramCounter * 3 + offset - 2;
        paramCounter++;

        String value = values[i];
        boolean isNull = (value == null || value.length() == 0) ? true : false;

        switch (columnTypes[i]) {
          case Types.DATE:
            if (isNull) {
              stm.setDate(paramNo, new Date(1));
            } else {
              stm.setDate(paramNo, new Date(dateParser.parse(value).getTime()));
            }
            setExParam(stm, paramNo, isNull);
            break;
          case Types.TIMESTAMP:
            if (isNull) {
              stm.setTimestamp(paramNo, new Timestamp(1));
            } else {
              stm.setTimestamp(paramNo, new Timestamp(timestampParser.parse(value.replace('T', ' ')).getTime()));
            }
            setExParam(stm, paramNo, isNull);
            break;
          case Types.INTEGER:
          case Types.BIGINT:
          case Types.TINYINT: // // SE: 09.07.2009 fix teraData bug
            if (isNull) {
              stm.setInt(paramNo, 1);
            } else {
              stm.setInt(paramNo, Integer.valueOf(value));
            }
            setExParam(stm, paramNo, isNull);
            break;
          case Types.SMALLINT:
            if (isNull) {
              stm.setShort(paramNo, (short)1);
            } else {
              stm.setShort(paramNo, Short.valueOf(value));
            }
            setExParam(stm, paramNo, isNull);
            break;
          case Types.DOUBLE:
            if (isNull) {
              stm.setDouble(paramNo, 1);
            } else {
              stm.setDouble(paramNo, Double.valueOf(value));
            }
            setExParam(stm, paramNo, isNull);
            break;
          case Types.FLOAT:
            if (isNull) {
              stm.setFloat(paramNo, 1);
            } else {
              stm.setFloat(paramNo, Float.valueOf(value));
            }
            setExParam(stm, paramNo, isNull);
            break;
          case Types.NUMERIC:
          case Types.DECIMAL:
          case Types.REAL:
            if (isNull) {
              stm.setBigDecimal(paramNo, BIG_DECIMAL_ONE);
            } else {
              stm.setBigDecimal(paramNo, new BigDecimal(value));
            }
            setExParam(stm, paramNo, isNull);
            break;
          default:
            if (isNull) {
              stm.setString(paramNo, "1");
            } else {
              stm.setString(paramNo, value);
            }
            setExParam(stm, paramNo, isNull);
            break;
        }
      }
    } catch (Exception e) {
      throw new Exception("failed to set column nr " + (i + 1) + "\nvalue: " + values[i], e);
    }
  }


  /**Set parametrs for WHERE part (WHERE (cKey=? AND 1=?) or (1=? AND cKey IS NULL))
   * @param stm
   * @param paramNo
   * @param isNull true -  WHERE ((cKey=... AND 1=0) or (1=1 AND cKey IS NULL)) false WHERE ((cKey=... AND 1=1) or (1=0 AND cKey IS NULL))
   * @throws SQLException
   */
  private void setExParam(PreparedStatement stm,int paramNo,boolean isNull) throws  SQLException{
    if (isNull) {
      stm.setInt(paramNo+1,0);
      stm.setInt(paramNo+2,1);
    } else {
      stm.setInt(paramNo+1,1);
      stm.setInt(paramNo+2,0);
    }
  }

  /**
   * builds update SQL statement and adds/executes it, computes auto detection of key columns, if key columns must be updated. Intern calls the method updateRow(String[] columnValues, String[] updateValues, boolean exceptKeyCols) see it for more information.
   *
   * @param originalColumnValues are part of the WHERE condition
   * @param updateValues are the new values
   *
   * @throws Exception
   */
  void updateRow(String[] originalColumnValues, String[] updateValues) throws Exception {
    boolean exceptKeyCols = false;
    for (int i = 0; i < columns.length; ++i) {
      if (isKeyColumn[i]) {
        if (originalColumnValues[i] == null && updateValues[i] == null)
          exceptKeyCols = true;
        else if ((originalColumnValues[i] != null && updateValues[i] != null) && originalColumnValues[i].equals(updateValues[i]))
          exceptKeyCols = true;
        else{
            exceptKeyCols = false;
            break;
        }
      }
    }
    updateRow(originalColumnValues, updateValues, exceptKeyCols);
  }

  /**
   * adds/executes update statement current versions doesn't support the webRowSet without key-columns, which could be defined in bindingSet.
   *
   * doesn't support update statement without WHERE part
   *
   * @param originalColumnValues
   *          - must be related to exceptKeyCols, these values are going to be the WHERE part
   * @param updateValues
   *          - must be related to exceptKeyCols, these values are going to be SET
   *
   * @throws Exception
   *           - if no key columns are defined - KeyColumnException
   */
  private void updateRow(String[] originalColumnValues, String[] updateValues, boolean exceptKeyCols) throws Exception {
    if(log.isTraceEnabled()){
      log.trace("updateRow (with keyColUpdate:" + String.valueOf(exceptKeyCols) + ") columnValues: " + Arrays.asList(originalColumnValues) + " updateValues: " + Arrays.asList(updateValues));
    }
    try {
      PreparedStatement currentStatement = (exceptKeyCols ? updateStatementExceptKeyCols : updateStatement);
      if (exceptKeyCols)
        log.trace("UPDATE is on NONKEYCOLS");
      if (currentStatement == null) {
        String sql = getUpdateStatementSQL(exceptKeyCols);
        if (!sql.contains("WHERE"))// no key columns - no work
          throw new KeyColumnsNotDefinedException(sql);

        currentStatement = defaultConnection.prepareStatement(sql);
        updateBatchSize = 0;
        if (exceptKeyCols)
          updateStatementExceptKeyCols = currentStatement;
        else
          updateStatement = currentStatement;
      }

      currentStatement.clearParameters();
      // set new values
      setValues(currentStatement, updateValues, 0, false, exceptKeyCols);

      int offset = originalColumnValues.length;
      if (exceptKeyCols) {// because we have ignored key columns
        offset = 0;
        for (int col = 0; col < originalColumnValues.length; col++) {
          if (!isKeyColumn[col])
            offset++;
        }
      }
      // set values in where part
      setValuesWherePart(currentStatement, originalColumnValues, offset, true, exceptKeyCols);
      if (maxBatchSize <= 1) {
        int rowsAffected = currentStatement.executeUpdate();
        if(log.isTraceEnabled()){
          log.trace("UPDATE EXECUTED, "+rowsAffected+" rows affected");
        }
      }
      else {
        currentStatement.addBatch();
        log.trace("UPDATE BATCHED");
        if (++updateBatchSize >= maxBatchSize) {
          currentStatement.executeBatch();
          currentStatement.clearBatch();
          updateBatchSize = 0;
          log.trace("UPDATE BATCH EXECUTED");
        }
      }
    }
    catch (SQLException e) {
      throw new SQLDetailException(getErrorMessage(getUpdateStatementSQL(exceptKeyCols), updateValues), e);
    }
  }

  /**
   * @param columnValues
   * @throws Exception
   */
  void insertRow(String[] columnValues) throws Exception {
    // log.trace("insertRow columnValues: " + Arrays.asList(columnValues));
    try {
      if (insertStatement == null) {
        String sql = getInsertStatementSQL();
        insertStatement = defaultConnection.prepareStatement(sql);
        insertBatchSize = 0;
      }

      insertStatement.clearParameters();
      setValues(insertStatement, columnValues, 0, false, false);

      if (maxBatchSize <= 1) {
        int rowsAffected = insertStatement.executeUpdate();
        log.trace("INSERT EXECUTED, "+rowsAffected+" rows inserted.");
      }
      else {
        insertStatement.addBatch();
        log.trace("INSERT BATCHED");
        if (++insertBatchSize >= maxBatchSize) {
          insertStatement.executeBatch();
          insertStatement.clearBatch();
          insertBatchSize = 0;
          log.trace("INSERT BATCH EXECUTED");
        }
      }
    }
    catch (SQLException e) {
      throw new SQLDetailException(getErrorMessage(getInsertStatementSQL(), columnValues), e);
    }
  }

  /**
   * @param columnValues to delete (WHERE part)
   * @throws Exception
   */
  void deleteRow(String[] columnValues) throws Exception {
    // log.trace("deleteRow columnValues: " + Arrays.asList(columnValues));
    try {
      if (deleteStatement == null) {
        String sql = getDeleteStatementSQL();
        if (!sql.contains("WHERE"))// no key columns - no work
          throw new KeyColumnsNotDefinedException(sql);

        deleteStatement = defaultConnection.prepareStatement(sql);
        deleteBatchSize = 0;
      }

      deleteStatement.clearParameters();
      setValuesWherePart(deleteStatement, columnValues, 0, true, false);

      if (maxBatchSize <= 1) {
        deleteStatement.executeUpdate();
      }
      else {
        deleteStatement.addBatch();
        if (++deleteBatchSize >= maxBatchSize) {
          deleteStatement.executeBatch();
          deleteStatement.clearBatch();
          deleteBatchSize = 0;
        }
      }
    }
    catch (SQLException e) {
      throw new SQLDetailException(getErrorMessage(getDeleteStatementSQL(), columnValues), e);
    }
  }

  /**
   * @throws SQLException
   */
  public void finished() throws SQLException {
    try {
      if (maxBatchSize > 1) {
        if (deleteStatement != null && deleteBatchSize > 0) {
          log.trace("DELETE BATCH EXECUTE...#" + deleteBatchSize);
          deleteStatement.executeBatch();
          log.trace("...DELETE BATCH EXECUTED");
        }
        if (insertStatement != null && insertBatchSize > 0) {
          log.trace("INSERT BATCH EXECUTE...#" + insertBatchSize);
          insertStatement.executeBatch();
          log.trace("...INSERT BATCH EXECUTED");
        }
        if (updateStatement != null && updateBatchSize > 0) {
          log.trace("UPDATE BATCH EXECUTE...#" + updateBatchSize);
          updateStatement.executeBatch();
          log.trace("...UPDATE BATCH EXECUTED");
        }
        if (updateStatementExceptKeyCols != null && updateBatchSize > 0) {
          log.trace("UPDATE NONKEYCOLS BATCH EXECUTE... #" + updateBatchSize);
          updateStatementExceptKeyCols.executeBatch();
          log.trace("...UPDATE NONKEYCOLS BATCH EXECUTED");
        }
      }
    }
    finally {
      Closer.closeAllSQLObjects(deleteStatement, insertStatement, updateStatement, updateStatementExceptKeyCols);
      deleteStatement = null;
      updateStatement = null;
      insertStatement = null;
      updateStatementExceptKeyCols = null;
    }
  }

  /**
   *
   * Method getErrorMessage returns error message
   *
   * @param statement
   * @param values
   * @return
   */
  private String getErrorMessage(String statement, Object[] values) {
    StringBuilder mes = new StringBuilder();
    mes.append("Cannot execute statement");
    mes.append("\n").append(statement);
    mes.append("\n columns: ").append(Arrays.toString(columns));
    mes.append("\n values: ").append(Arrays.toString(values));
    mes.append("\n column types: ").append(Arrays.toString(columnTypes));

    return mes.toString();
  }
}
