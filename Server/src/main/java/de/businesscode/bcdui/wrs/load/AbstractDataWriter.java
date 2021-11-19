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

import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

import org.w3c.dom.Document;
import org.w3c.dom.Element;

import de.businesscode.bcdui.wrs.IRequestOptions;

/**
 * An abstract writer-implementation - contains helper getters for all writer parameters
 */
public abstract class AbstractDataWriter implements IDataWriter {

  private IRequestOptions options;
  private ISqlGenerator generator;
  private ResultSet resultSet;
  private ResultSetMetaData resultSetMetaData;
  private Map<Integer, Boolean> escapeXmlColumns;
  private long duration;
  protected int rowCounter;
  private int columnsCount;

  /**
   * AbstractDataWriter
   */
  public AbstractDataWriter() {
    escapeXmlColumns = new HashMap<Integer, Boolean>();
  }

  /**
   * replace the write method from interface
   *
   * @throws Exception
   */
  protected abstract void write() throws Exception;

  /**
   * @see de.businesscode.bcdui.wrs.load.IDataWriter#write(de.businesscode.bcdui.wrs.IRequestOptions, de.businesscode.bcdui.wrs.load.ISqlGenerator, java.sql.ResultSet, long)
   */
  @Override
  public final void write(IRequestOptions options, ISqlGenerator generator, ResultSet resultSet, long duration) throws Exception {
    setOptions(options);
    setGenerator(generator);
    setResultSet(resultSet);
    setDuration(duration);
    //
    if (getResultSetMetaData() != null) {
      try {
        setColumnsCount(getResultSetMetaData().getColumnCount());
      }
      catch (SQLException ignore) {
      }
    }
    //
    write();
  }

  // ==================================================================================================================================

  /**
   * @param options
   *          the options to set
   */
  private void setOptions(IRequestOptions options) {
    this.options = options;
  }

  /**
   * @param generator
   *          the generator to set
   */
  private void setGenerator(ISqlGenerator generator) {
    this.generator = generator;
  }

  /**
   * @param resultSet
   *          the resultSet to set
   */
  private void setResultSet(ResultSet resultSet) {
    this.resultSet = resultSet;
  }

  /**
   * @param duration
   *          the duration to set
   */
  private void setDuration(long duration) {
    this.duration = duration;
  }

  /**
   * @return the options
   */
  protected final IRequestOptions getOptions() {
    return options;
  }

  /**
   * @return the generator
   */
  protected final ISqlGenerator getGenerator() {
    return generator;
  }

  /**
   * @return the resultSet
   */
  protected final ResultSet getResultSet() {
    return resultSet;
  }

  /**
   * @return the execution duration
   */
  protected final long getDuration() {
    return duration;
  }

  /**
   * Number of rows written
   */
  public int getRowCount() {
    return rowCounter;
  }

  /**
   * @see de.businesscode.bcdui.wrs.load.IDataWriter#getColumnsCount()
   */
  @Override
  public final int getColumnsCount() {
    return columnsCount;
  }

  /**
   * @param columnsCount the columnsCount to set
   */
  private void setColumnsCount(int columnsCount) {
    this.columnsCount = columnsCount;
  }

  /**
   * @return the resultSetMetaData
   */
  protected final ResultSetMetaData getResultSetMetaData() {
    if (resultSetMetaData == null && getResultSet() != null) {
      try {
        resultSetMetaData = getResultSet().getMetaData();
      }
      catch (SQLException e) {
        throw new RuntimeException("Unable to get resultSet metadata.", e);
      }
    }
    return resultSetMetaData;
  }

   /**
   * isXMLType
   * @param colNo
   * @return true if colNo should be XML escaped
   */
  protected boolean isEscapeXMLType(int colNo) {
    return Boolean.TRUE.equals(escapeXmlColumns.get(colNo));
  }

  /**
   * setXMLType
   * @param colNo
   * @param isXMLType
   */
  protected void setEscapeXMLType(int colNo, boolean isXMLType) {
    escapeXmlColumns.put(colNo, isXMLType);
  }

  /**
   * getRequestDocRoot
   *
   * @return the request-doc root
   */
  protected final Element getRequestDocRoot() {
    if (getOptions() != null) {
      Document requestDoc = getOptions().getRequestDoc();
      if (requestDoc != null) {
        return requestDoc.getDocumentElement();
      }
    }
    return null;
  }

}
