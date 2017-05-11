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
package de.businesscode.bcdui.binding;

import java.io.IOException;
import java.io.StringReader;
import java.sql.Types;
import java.util.HashMap;
import java.util.Map;

import javax.xml.parsers.ParserConfigurationException;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamWriter;

import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;

import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.Utils;
import de.businesscode.util.xml.SecureXmlFactory;

/**
 * The BindingItem class represents a mapping from a logical name to a <br>
 * database column. These classes are contained inside BindingSets and <br>
 * constructed by the Bindings class from static XML files. <br>
 *
 * @see Bindings
 * @see BindingSet
 */
public class BindingItem extends SimpleBindingItem {

  private boolean isKey;
  private String references;
  private String displayFormat;
  private String caption;
  private Integer jdbcDataType = null;
  private Integer jdbcColumnDisplaySize = null;
  private Integer jdbcColumnScale = null;
  private Boolean jdbcSigned = null;
  private Integer jdbcNullable = null;
  private Boolean isReadOnly = null;
  private Boolean isEscapeXML = null;
  private String  aggr = null; // Optional default aggr from BindingSet's xml, used when none is given in Wrq
  final private Map<String,String> customAttributesMap;

  /**
   * Copy constructor.
   */
  public BindingItem(BindingItem src) {
    super(src);
    this.jdbcDataType = src.jdbcDataType;
    this.isKey = src.isKey;
    this.columnExpression = src.columnExpression;
    this.references = src.references;
    this.displayFormat = src.displayFormat;
    this.caption = src.caption;
    this.jdbcColumnDisplaySize = src.jdbcColumnDisplaySize;
    this.jdbcColumnScale = src.jdbcColumnScale;
    this.jdbcSigned = src.jdbcSigned;
    this.jdbcNullable = src.jdbcNullable;
    this.aggr = src.aggr;
    this.customAttributesMap = new HashMap<>(src.customAttributesMap);
    setEscapeXML(src.isEscapeXML);
    setReadOnly(src.isReadOnly);
  }

  /**
   * Constructs a BindingItem. <br>
   * @param pName The name of the BindingItem. <br>
   * @param pBindingSet The BindingSet. <br>
   * in the SQL code generated from the BindingItem. <br>
   * @param pColumnExpression A list of database columns for the BindingItems. <br>
   * Since multi-bindings are no longer supported this list should contain exactly one item. <br>
   * @param pColumnQuoting True, if the columnExpression should be in quotes or not. <br>
   * For some reserved keyword of the database it is necessary to place the <br>
   * column name in quotes. <br>
   */
  public BindingItem(String pName, String pColumnExpression, boolean pColumnQuoting, BindingSet pBindingSet) {

    super(pBindingSet, pName, pColumnExpression, pColumnQuoting);

    this.customAttributesMap = new HashMap<>();
  }

  /**
   * @return the customAttributesMap
   */
  public Map<String, String> getCustomAttributesMap() {
    return customAttributesMap;
  }

  /**
   * A useful method for debugging.
   *
   * @return A list of column expressions.
   */
  @Override
  public String toString() {
    StringBuilder result = new StringBuilder();
    result.append('[').append(columnExpression).append(']');
    return result.toString();
  }

  /**
   * Gets the column expression for a BindingItem. In many cases this is just
   * a database column name, but it can be a simple SQL expression as well.
   * @return The SQL code - often just a column name - assigned to the
   * BindingItem.
   */
  public String getColumnExpression() {
    return columnExpression;
  }

  /**
   * The basic type of the database column which can be String or Number.
   *
   * @return The abstract column type of the database column.
   */
  public Integer getJDBCDataType() {
    return jdbcDataType != null ? jdbcDataType : Types.VARCHAR;
  }
  public boolean isDefinedJDBCDataType() {
    return jdbcDataType != null;
  }

  public boolean isNumeric() {
    return jdbcDataType != null 
           && ( jdbcDataType == Types.BIGINT  || jdbcDataType == Types.BIT     || jdbcDataType == Types.DECIMAL || jdbcDataType == Types.DOUBLE   || jdbcDataType == Types.FLOAT
                || jdbcDataType == Types.INTEGER || jdbcDataType == Types.NUMERIC || jdbcDataType == Types.REAL    || jdbcDataType == Types.SMALLINT || jdbcDataType == Types.TINYINT) ;
  }
  
  /**
   * The basic type of the database column which can be String or Number.
   */
  public void setJDBCDataType( Integer jdbcDataType ) {
    this.jdbcDataType = jdbcDataType;
  }

  /**
   * Tests if the BindingItem is marked as a key column in the BindingSet.
   *
   * @return True if this BindingItem is a key item.
   */
  public boolean isKey() {
    return this.isKey;
  }

  public void setKey(boolean isKey) {
    this.isKey = isKey;
  }

  public void setJDBCDataTypeName(String jdbcDataTypeName) throws IllegalArgumentException, SecurityException, IllegalAccessException, NoSuchFieldException {
    if (jdbcDataTypeName == null)
      return;
    this.jdbcDataType = Types.class.getField(jdbcDataTypeName).getInt(null);
  }

  /**
   * Gets the name of the JDBC data type.
   * @return A string corresponding to the constant name of the JDBC data
   * type. The names are listed in java.sql.Types.
   * @see java.sql.Types
   */
  public String getJDBCDataTypeName() {
    return BindingUtils.jdbcDataTypeCodeToStringMapping.get(getJDBCDataType());
  }

  public void setJDBCColumnDisplaySize(Integer jdbcColumnDisplaySize) {
    this.jdbcColumnDisplaySize = jdbcColumnDisplaySize;
  }

  /**
   * Retrieves the number of characters for this column.
   * @return The size of the column as number of characters. It
   * can be NULL if this value is not set in the BindingSet.
   * @see java.sql.ResultSetMetaData#getColumnDisplaySize(int)
   */
  public Integer getJDBCColumnDisplaySize() {
    return jdbcColumnDisplaySize;
  }

  public void setJDBCColumnScale(Integer jdbcColumnScale) {
    this.jdbcColumnScale = jdbcColumnScale;
  }

  /**
   * Gets the number of decimal places if this is a numeric column.
   * An integer number has 0 decimal places.
   * @return The number of positions after the decimal point. This
   * can be NULL if the value has not been specified.
   * @see java.sql.ResultSetMetaData#getScale(int)
   */
  public Integer getJDBCColumnScale() {
    return jdbcColumnScale;
  }


  public void setJDBCSigned(Boolean jdbcSigned) {
    this.jdbcSigned = jdbcSigned;
  }

  /**
   * Indicates whether the column allows negative numbers or not.
   * @return True if negative numbers are allowed. The result can
   * be NULL if this property has not been set.
   * @see java.sql.ResultSetMetaData#isSigned(int)
   */
  public Boolean getJDBCSigned() {
    return jdbcSigned;
  }

  /**
   * Default aggregator, when none is given in the Wrq
   * @return
   */
  public String getAggr() {
    return aggr;
  }
  public void setAggr(String aggr) {
    this.aggr = aggr;
  }

  /**
   * Determines if the column can take a NULL value or not.
   * @see java.sql.ResultSetMetaData#isNullable(int)
   */
  public void setJDBCNullable(Integer jdbcNullable) {
    this.jdbcNullable = jdbcNullable;
  }
  public Integer getJDBCNullable() {
    return jdbcNullable;
  }

  /**
   * Retrieves the content of the References element as a w3c.Node or NULL if
   * there is no References element.
   * @return The References element or NULL if there is no such element.
   */
  public Node getReferencesAsNode() throws ParserConfigurationException, SAXException, IOException {
    Node node = null;
    if (this.references != null && this.references.length() > 0) {
      node = stringToDomNode(this.references);
    }
    return node;
  }

  /**
   * Gets the References element as serialized XML element.
   *
   * @return The References element in a string form.
   */
  public String getReferences() {
    return references;
  }

  public void setReferences(String references) {
    this.references = references;
  }

  /**
   * Gets the display format of the column as XML Schema data type.
   *
   * @return The XML schema data type of the column.
   * @deprecated This method should no longer be used. Instead the
   * method {@link #getJDBCDataType()} can be called.
   */
  public String getDisplayFormat() {
    return displayFormat;
  }

  /**
   * Gets the display format as an XML element.
   *
   * @return The XML element of the DisplayFormat node.
   * @deprecated Use the method {@link #getJDBCDataType()} instead.
   */
  public Node getDisplayFormatAsNode() throws SAXException, IOException, ParserConfigurationException {
    Node node = null;
    if (this.displayFormat != null && this.displayFormat.length() > 0) {
      node = stringToDomNode(this.displayFormat);
    }
    return node;
  }

  public void setDisplayFormat(String displayFormat) {
    this.displayFormat = displayFormat;
  }

  /**
   * gets DocumentElement from new Document
   *
   *
   * @param nodeAsString
   * @return
   * @throws SAXException
   * @throws IOException
   * @throws ParserConfigurationException
   */
  private Node stringToDomNode(String nodeAsString) throws SAXException, IOException, ParserConfigurationException {
    StringReader strReader = new StringReader(nodeAsString);
    InputSource inSrc = new InputSource(strReader);
    Document doc = SecureXmlFactory.newDocumentBuilderFactory().newDocumentBuilder().parse(inSrc);
    return doc.getDocumentElement();
  }

  /**
   * Gets value of caption attribute or empty string.
   *
   * @return The database column caption.
   * @see java.sql.ResultSetMetaData#getColumnLabel(int)
   */
  public String getCaption() {
    if (this.caption == null)
      this.caption = "";
    return this.caption;
  }

  /**
   * Sets value of caption attribute.
   *
   * @param caption
   *          The new caption of the column.
   */
  public void setCaption(String caption) {
    this.caption = caption;
  }

  /**
   * gets if the BindingItem is read only
   */
  public Boolean isReadOnly() {
    return isReadOnly != null ? isReadOnly : false;
  }

  /**
   * sets if the BindingItem is read only
   * @param isReadOnly
   */
  public void setReadOnly(Boolean isReadOnly) {
    this.isReadOnly = (isReadOnly!=null ? isReadOnly : new Boolean(false));
  }


  /**
   * gets if the content is writen as escaped xml
   */
  public Boolean isEscapeXML(){
    return this.isEscapeXML;
  }

  /**
   * sets if the BindingItem is read only
   */
   public void setEscapeXML(Boolean isEscapeXML){
     this.isEscapeXML =  ( isEscapeXML !=null ? isEscapeXML : new Boolean(true));
   }


  /**
   * Prints an XML representation of the BindingItem.
   *
   * @param writer
   *          The writer instance to print the data to.
   */
  @Override
  public void toXML(XMLStreamWriter writer, boolean withColumnExpression) throws XMLStreamException
  {
    Map<String,Object> attrs = getAttributes();

    for (String attrName : attrs.keySet())
      writer.writeAttribute(attrName, attrs.get(attrName).toString());
    
    Map<String, String> customAtts = getCustomAttributesMap();
    for (String attrName : customAtts.keySet()){
      writer.writeAttribute(StandardNamespaceContext.CUST_NAMESPACE, attrName, customAtts.get(attrName));
    }

    if (withColumnExpression) {// thus WRS response does not write this element
      writer.writeStartElement("Column");
      writer.writeCharacters(getColumnExpression());
      writer.writeEndElement(); // Column
    }
    try {
      Node referencesAsNode = getReferencesAsNode();
      if (referencesAsNode != null) {
        Utils.injectDOMContentInXMLStreamWriter(writer, referencesAsNode);
      }
    }
    catch (Exception e) {
      throw new RuntimeException("Unexpected exception", e);
    }
  }

  /*
   * Get the wrs:C/@ and wrs:A/@ attributes as defined by the BindingSet (and defaulted by the database)
   * BindingItemWithMetaData may overwrite some with request-specific values
   */
  public Map<String,Object> getAttributes() {
    Map<String,Object> attrs = new HashMap<String, Object>();
    attrs.put("id", getId());
    attrs.put("caption", getCaption() != null && getCaption().length() > 0 ? getCaption() : getId());
    if (this.isKey())
      attrs.put(Bindings.keyAttributeName, "true");
    if (this.isReadOnly())
      attrs.put(Bindings.readOnlyAttributeName, "true");
    attrs.put(Bindings.jdbcDataTypeNameAttribute, BindingUtils.jdbcDataTypeCodeToStringMapping.get(getJDBCDataType()) );
    if( getJDBCColumnDisplaySize()!=null )
      attrs.put(Bindings.jdbcColumnDisplaySizeAttribute, getJDBCColumnDisplaySize().toString());

    if( isNumeric() ) {
      if( getJDBCColumnScale()!=null )
        attrs.put(Bindings.jdbcColumnScaleAttribute, getJDBCColumnScale());
      if( getJDBCSigned()!=null )
        attrs.put(Bindings.jdbcSignedAttribute, getJDBCSigned());
    }
    if( getJDBCNullable()!=null )
      attrs.put(Bindings.jdbcNullableAttribute, getJDBCNullable());

    return attrs;
  }

}
