/*
  Copyright 2010-2022 BusinessCode GmbH, Germany

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

import java.io.StringReader;
import java.io.Writer;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.math.BigDecimal;
import java.sql.Date;
import java.sql.SQLXML;
import java.sql.Timestamp;
import java.sql.Types;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Base64;
import java.util.Map.Entry;
import java.util.stream.Collectors;
import java.time.Instant;

import javax.xml.stream.XMLOutputFactory;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamWriter;
import javax.xml.transform.Transformer;
import javax.xml.transform.stax.StAXResult;
import javax.xml.transform.stream.StreamSource;

import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.Utils;
import de.businesscode.util.jdbc.DatabaseCompatibility;
import de.businesscode.util.xml.SecureXmlFactory;

/**
 * The default implementation of the IDataWriter - write wrs-xml-format using xml-stream <br>
 * Write an empty document if the resultSet is null. <br>
 * Supports also the short refDataFormat.
 */
public class WrsDataWriter extends AbstractDataWriter implements IDataWriter {
  //
  public static final String WRS_XML_NAMESPACE = "http://www.businesscode.de/schema/bcdui/wrs-1.0.0";
  //
  private XMLStreamWriter writer;
  //
  private boolean maxRowsExceed = false;
  private boolean errorDuringQuery = false;
  private final DateFormat xmlTimeStampFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
  private final DateFormat xmlDateFormat = new SimpleDateFormat("yyyy-MM-dd");
  private final Transformer transformer;
  {
    try {
      this.transformer = SecureXmlFactory.newTransformerFactory().newTransformer();
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }


  /**
   * WrsDataWriter.
   *
   * Create the writer without parameters - caller should overwrite the method getStream().
   */
  public WrsDataWriter() {
    super();
  }

  /**
   * WrsDataWriter
   *
   * @param writer
   */
  public WrsDataWriter(XMLStreamWriter writer) {
    super();
    this.writer = writer;
  }

  /**
   * @return the writer
   */
  protected final XMLStreamWriter getWriter() {
    if (writer == null) {
      // create lazy from getStream()
      try {
        Writer stream = getLazyStream();
        if (stream != null) {
          this.writer = XMLOutputFactory.newInstance().createXMLStreamWriter(stream);
        }
        else {
          throw new IllegalStateException("Please use the constructor with parameter XMLStreamWriter or overwrite method getStream() to create lazy output.");
        }
      }
      catch (Exception e) {
        throw new RuntimeException("Unable to create XMLStreamWriter.", e);
      }
    }
    return writer;
  }

  /**
   * @return the output writer. <br>
   *         The clients can overwrite this method like: return response.getWriter(). <br>
   *         This method called only once by lazy creation of the xml-writer (if it was not sets from constructor parameters.<br>
   */
  protected Writer getLazyStream() throws Exception {
    return null;
  }

  /**
   * @see de.businesscode.bcdui.wrs.load.IDataWriter#close()
   */
  @Override
  public void close() throws Exception {
    // don't use lazy getter here!!
    if (this.writer != null) {
      this.writer.close();
    }
  }

  /**
   * @return the maxRowsExceed
   */
  private final boolean isMaxRowsExceed() {
    return maxRowsExceed;
  }

  /**
   * @param maxRowsExceed
   *          the maxRowsExceed to set
   */
  private final void setMaxRowsExceed(boolean maxRowsExceed) {
    this.maxRowsExceed = maxRowsExceed;
  }

  private final boolean isErrorDuringQuery() {
    return errorDuringQuery;
  }
  private final void setErrorDuringQuery(boolean errorDuringQuery) {
    this.errorDuringQuery = errorDuringQuery;
  }
  // ================================================================================================

  /**
   * @see de.businesscode.bcdui.wrs.load.AbstractDataWriter#write()
   */
  @Override
  protected void write() throws Exception {
    getWriter().writeStartDocument();
    //
    if (getResultSet() != null) {
      writeWrs();
    }
    else {
      writeEmptyDocument();
    }
    //
    getWriter().writeEndDocument();
  }

  // ================================================================================================

  /**
   * Write empty document if no data was requested
   *
   * @throws XMLStreamException
   */
  protected void writeEmptyDocument() throws Exception {
    getWriter().writeEmptyElement("Empty");
  }

  // /**
  // * Writes data with RefData format,<br>
  // * which is the first column is considered a caption and the second its value.<br>
  // * Rows are written as Item elements, and caption and value its attributes.
  // *
  // * @throws Exception
  // */
  // protected void writeRefDataFormat() throws Exception {
  // final int colCount = getResultSet().getMetaData().getColumnCount();
  // //
  // getWriter().writeStartElement("RefData");
  // //
  // while (getResultSet().next()) {
  // getWriter().writeStartElement("Item");
  // getWriter().writeAttribute("caption", getResultSet().getString(colCount == 1 ? 1 : 2));
  // getWriter().writeAttribute("value", getResultSet().getString(1));
  // getWriter().writeEndElement(); // Item
  // }
  // //
  // getWriter().writeEndElement(); // RefData
  // }

  // ================================================================================================

  /**
   * writeWrs
   */
  protected void writeWrs() throws Exception {
    getWriter().writeStartElement("Wrs");
    // Write milliseconds since 1.1.1970 UTC
    getWriter().writeAttribute("ts", Long.toUnsignedString(Instant.now().toEpochMilli()));
    getWriter().writeDefaultNamespace(WRS_XML_NAMESPACE);
    
    {
      boolean hasCustomItems = getGenerator().getResolvedBindingSets().stream().anyMatch(bs->bs.hasCustomItem());
      if(hasCustomItems){
        getWriter().setPrefix(StandardNamespaceContext.CUST_PREFIX, StandardNamespaceContext.CUST_NAMESPACE);
        getWriter().writeNamespace(StandardNamespaceContext.CUST_PREFIX, StandardNamespaceContext.CUST_NAMESPACE);
      }
    }

    //
    // request document
    writeWrsRequest();

    //
    // header
    writeWrsHeader();
    //
    // data
    writeWrsData();
    //
    // marker MaxRowsExceeded or write error marker
    if (isErrorDuringQuery()) {
      writeWrsErrorDuringQuery();
    }
    // In case there are more rows than are delivered and requested
    else if (isMaxRowsExceed() && getGenerator().getClientProvidedMaxRows() > getGenerator().getMaxRows()) {
      writeWrsMaxRowsExceeded(getGenerator().getMaxRows());
    }
    //
    getWriter().writeEndElement(); // Wrs
  }

  /**
   * writeWrsHeader
   */
  private void writeWrsHeader() throws Exception {
    getWriter().writeStartElement("Header");
    //
//    writeWrsHeaderMetaData();

    for( Entry<String, String> reqBs: getGenerator().getRequestedBindingSetNames() ) {
      getWriter().writeStartElement("BindingSet");
      if( !reqBs.getValue().isBlank() ) getWriter().writeAttribute("alias", reqBs.getValue());
      getWriter().writeCharacters(reqBs.getKey());
      getWriter().writeEndElement(); // BindingSet
    }

    /*
    getWriter().writeStartElement("KeySet");
    getWriter().writeEndElement(); //KeySet
    */

    writeWrsHeaderColumns();
    if (getOptions().isDebugMode()) {
      writeWrsHeaderDebug();
    }
    //
    getWriter().writeEndElement(); // Header
  }

  protected void writeWrsRequest() throws Exception {
    getWriter().writeStartElement("RequestDocument");
    Utils.injectDOMContentInXMLStreamWriter(getWriter(), getOptions().getRequestDoc().getDocumentElement());
    getWriter().writeEndElement();
  }

  /**
   * writeWrsHeaderMetaData
   *
   * @throws Exception
   */
  /*
  protected void writeWrsHeaderMetaData() throws Exception {
    getWriter().writeStartElement("MetaData");
    //
    getWriter().writeStartElement("BindingSet");
    getWriter().writeCharacters(getGenerator().getRequestedBindingSetName());
    getWriter().writeEndElement(); // BindingSet
    //
    getWriter().writeEndElement(); // MetaData
  }
*/
  /**
   * writeWrsHeaderColumns
   *
   * @throws Exception
   */
  protected void writeWrsHeaderColumns() throws Exception {
    XMLStreamWriter curWriter = getWriter();
    curWriter.writeStartElement("Columns");
    int colPos = 0; // The wrs:C/@pos, they can differ from bindingItem.getColumnNumber() due to wrs:C/wrs:A and repeated values

    for (WrsBindingItem bindingItem : getGenerator().getSelectedBindingItems()) {
      curWriter.writeStartElement("C");
      colPos++;
      curWriter.writeAttribute("pos", String.valueOf(colPos));
      setEscapeXMLType(bindingItem.getColumnNumber(), bindingItem.isEscapeXML());
      bindingItem.toXML(curWriter, false);

      // Part of the statement can be columns, which were requested as wrs:C/wrs:A elements
      // They have the same attributes as wrs:C plus an addition @name attribute which indicates their name within the actual data
      if( bindingItem.hasWrsAAttributes() ) {
        for (WrsBindingItem attribute : bindingItem.getWrsAAttributes()) {
          writer.writeStartElement("A");
          attribute.toXML(writer, false);
          writer.writeEndElement();
        }
      }  // wrs:A

      curWriter.writeEndElement(); // wrs:C
    }
    curWriter.writeEndElement(); // wrs:Columns
  }

  /**
   * writeWrsHeaderDebug
   *
   * @throws Exception
   */
  protected void writeWrsHeaderDebug() throws Exception {
    getWriter().writeStartElement("Debug");
    //
    getWriter().writeStartElement("SQL");
    getWriter().writeStartElement("Statement");
    getWriter().writeCharacters(getGenerator().getSelectStatement().getStatement());
    getWriter().writeEndElement(); // Statement
    getWriter().writeStartElement("Params");
    for (String value : getGenerator().getSelectStatement().getFilterValues()) {
      getWriter().writeStartElement("Param");
      getWriter().writeCharacters(value);
      getWriter().writeEndElement(); // Param
    }
    getWriter().writeEndElement(); // Params
    getWriter().writeEndElement(); // SQL

    getWriter().writeStartElement("ExecTime");
    getWriter().writeCharacters("" + getDuration());
    getWriter().writeEndElement(); // ExecTime
    //
    getWriter().writeStartElement("SelectedBindingSets");
    getWriter().writeCharacters(String.join(",", getGenerator().getResolvedBindingSets().stream().map(bs->bs.getName()).collect(Collectors.toSet())));
    getWriter().writeEndElement(); // SelectedBindingSet
    //
    getWriter().writeStartElement("Url");
    // getWriter().writeCharacters(getOptions().getRequestUrl());
    getWriter().writeEndElement(); // Url
    //
    getWriter().writeEndElement(); // Debug
  }

  /**
   * writeWrsData
   */
  protected void writeWrsData() throws Exception {
    getWriter().writeStartElement("Data");
    //
    setMaxRowsExceed(false);
    setErrorDuringQuery(false);
    int maxRows = getGenerator().getMaxRows();
    int rowNum = 0;
    //
    while (!isErrorDuringQuery() && getResultSet().next()) {
      rowNum++;
      // Do not send more rows than are allowed and requested
      if (maxRows > 0 && rowNum > maxRows) {
        setMaxRowsExceed(true);
        break;
      }
      //
      writeWrsDataRow(rowNum);
    }
    //
    getWriter().writeEndElement(); // Data
    this.rowCounter = rowNum;
  }

  /**
   * writeWrsDataRow
   *
   * @param rowNum
   */
  protected void writeWrsDataRow(int rowNum) throws Exception {
    getWriter().writeStartElement("R");
    writeWrsDataRowAttributes(rowNum);
    //
    int c = 0;
    for (WrsBindingItem item : getGenerator().getSelectedBindingItems()) {
      writeWrsDataRowColumn(item);
      c++;
      if (isErrorDuringQuery()) {
        // write missing C elements in case of an error
        int missingCs = getGenerator().getSelectedBindingItems().size() - c;
        for (int i = 0; i < missingCs; i++) {
          getWriter().writeStartElement("C");
          getWriter().writeEndElement(); // C
        }
        break;
      }
    }
    //
    // TODO Impl write embedded rows. Later
    //
    getWriter().writeEndElement(); // R
  }

  /**
   * writeWrsDataRowAttributes
   *
   * @param rowNum
   * @throws Exception
   */
  protected void writeWrsDataRowAttributes(int rowNum) throws Exception {
    // write id
    String rowId = "R" + rowNum;
    getWriter().writeAttribute("id", rowId);
  }

  /**
   * writeWrsDataRowColumn
   *
   * @param item
   *          - binding item
   * @throws Exception
   */
  protected void writeWrsDataRowColumn(WrsBindingItem item) throws Exception {
    getWriter().writeStartElement("C");
    try {
      writeWrsDataRowColumnAttributes(item);
      writeWrsDataRowColumnValue(item.getJDBCDataType(), item.getColumnNumber());
    }
    catch (Exception e){
      setErrorDuringQuery(true);
    }
    getWriter().writeEndElement(); // C
  }

  /**
   * writeWrsDataRowColumnValue
   *
   * @param jdbcColumnType
   * @param colNum
   *          - starts with 1 (JDBC compliant)
   * @throws Exception
   */
  protected void writeWrsDataRowColumnValue(int jdbcColumnType, int colNum) throws Exception {
    switch (jdbcColumnType) {
      case Types.TIMESTAMP: {
        Timestamp data = getResultSet().getTimestamp(colNum);
        if (data == null || getResultSet().wasNull()) {
          getWriter().writeEmptyElement("null");
        }
        else {
          getWriter().writeCharacters(xmlTimeStampFormat.format(data));
        }
        break;
      }
      case Types.DATE: {
        Date data = getResultSet().getDate(colNum);
        if (data == null || getResultSet().wasNull()) {
          getWriter().writeEmptyElement("null");
        }
        else {
          getWriter().writeCharacters(xmlDateFormat.format(data));
        }
        break;
      }
      case Types.FLOAT:
      case Types.DOUBLE:
      case Types.DECIMAL:
      case Types.INTEGER: // This assures, that an avg() on an integer column is returned correctly
      case Types.NUMERIC: {
        BigDecimal data = getResultSet().getBigDecimal(colNum);
        if (data == null || getResultSet().wasNull()) {
          getWriter().writeEmptyElement("null");
        }
        else {
          getWriter().writeCharacters(data.toPlainString());
        }
        break;
      }
      case Types.BLOB: {
        BindingSet bs = getGenerator().getResolvedBindingSets().iterator().next(); // We only need this for DatabaseCompatibility, so any does
        byte[] data = DatabaseCompatibility.getInstance().getBlob(bs.getName(), getResultSet(), colNum);
        if (data == null || data.length == 0 || getResultSet().wasNull()){
          getWriter().writeEmptyElement("null");
        }else{
          String b64 = Base64.getEncoder().encodeToString(data);
          getWriter().writeCharacters(b64);
        }
        break;
      }
      case Types.CLOB: {
        BindingSet bs = getGenerator().getResolvedBindingSets().iterator().next();
        String data = DatabaseCompatibility.getInstance().getClob(bs.getName(), getResultSet(), colNum);
        if (data == null || getResultSet().wasNull()) {
          getWriter().writeEmptyElement("null");
        }
        else if (isEscapeXMLType(colNum)){
          getWriter().writeCharacters(data);
        }
        else{
          transformer.transform(new StreamSource(new StringReader(data)), new StAXResult(createXMLStreamWriterWrapper(getWriter())));
        }
        break;
      }
      case Types.SQLXML: {
        SQLXML data = getResultSet().getSQLXML(colNum);
        if ( data == null || getResultSet().wasNull()){
          getWriter().writeEmptyElement("null");
        }else if (isEscapeXMLType(colNum)){
          getWriter().writeCharacters(data.getString());
        }else{
          transformer.transform(data.getSource(StreamSource.class), new StAXResult(createXMLStreamWriterWrapper(getWriter())));
        }
        break;
      }
      default: {
        String data = getResultSet().getString(colNum);
        if (data == null || getResultSet().wasNull()) {
          getWriter().writeEmptyElement("null");
        } else if (isEscapeXMLType(colNum) ) {
          getWriter().writeCharacters(data);
        } else {
          transformer.transform(
              new StreamSource(new StringReader(data)), new StAXResult(createXMLStreamWriterWrapper(getWriter())));
        }
        break;
      }
    }
  }

  /**
   * Writes the attributes corresponding to wrs:A sub-nodes of a wrs:C
   * Attributes are not written if their value was null
   *
   * @param item
   * @throws Exception
   */
  protected void writeWrsDataRowColumnAttributes(WrsBindingItem item) throws Exception {
    if (item.hasWrsAAttributes()) {
      for (WrsBindingItem attribute : item.getWrsAAttributes()) {
        String name = attribute.getWrsAName();
        int colNum = attribute.getColumnNumber();
        int columnType = getResultSetMetaData().getColumnType(colNum);
        switch (columnType) {
          case Types.TIMESTAMP:
            Timestamp t = getResultSet().getTimestamp(colNum);
            if( t != null && !getResultSet().wasNull() )
              getWriter().writeAttribute(name, xmlTimeStampFormat.format(t));
            break;
          case Types.DATE:
            Date d = getResultSet().getDate(colNum);
            if( d != null && !getResultSet().wasNull() )
              getWriter().writeAttribute(name, xmlDateFormat.format(d));
            break;
          case Types.INTEGER:
          case Types.DECIMAL:
          case Types.NUMERIC:
            BigDecimal n = getResultSet().getBigDecimal(colNum);
            if( n != null && !getResultSet().wasNull() )
              getWriter().writeAttribute(name, n.toPlainString());
            break;
          default:
            String data = getResultSet().getString(colNum);
            if (data != null && !getResultSet().wasNull()) {
              getWriter().writeAttribute(name, data);
            }
            break;
        }
      }
    }
  }
  
  protected void writeWrsErrorDuringQuery() throws XMLStreamException {
    getWriter().writeStartElement("Footer");
    getWriter().writeStartElement("ErrorDuringQuery");
    getWriter().writeCharacters("true");
    getWriter().writeEndElement(); // ErrorDuringQuery
    getWriter().writeEndElement(); // Footer
  }

  /**
   * writeWrsMaxRowsExceeded
   *
   * @param maxRows
   * @throws XMLStreamException
   */
  protected void writeWrsMaxRowsExceeded(int maxRows) throws XMLStreamException {
    getWriter().writeStartElement("Footer");
    getWriter().writeStartElement("MaxRowsExceeded");
    getWriter().writeAttribute("maxRows", "" + maxRows);
    getWriter().writeCharacters("true");
    getWriter().writeEndElement(); // max-rows-exceed
    getWriter().writeEndElement(); // Footer
  }

  private XMLStreamWriter createXMLStreamWriterWrapper(final XMLStreamWriter writer) {
    return (XMLStreamWriter) Proxy.newProxyInstance(
        getClass().getClassLoader(),
        new Class<?>[] { XMLStreamWriter.class },
        new InvocationHandler() {

      @Override
      public Object invoke(Object ignored, Method method, Object[] args) throws Throwable {
        if (method.getName().endsWith("StartDocument") ||
            method.getName().endsWith("EndDocument"))
          return null;
        return method.invoke(writer, args);
      }
    });
  }
}
