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
package de.businesscode.bcdui.binding;

import java.util.Arrays;
import java.util.regex.Pattern;

import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamWriter;

/**
 * Base class for BindingItems read from a BindingSet definition or calc:Calc of a Wrs
 * It becomes member of a (Wrs|Standard)BindingSet
 * See also WrqBindingItem for the analogy used during actual statement representing the output
 */
public class SimpleBindingItem {
  public  static final String BCD_NO_TABLE_ALIAS = "bcdNoTableAlias.";

  public static final Pattern wordPattern;
  public static final Pattern pureColumnNamePattern;
  private String id;
  protected String columnExpression;  // if columnQuoting == true, qColumnExpr and columnExpression do contain quotes already
  private boolean columnQuoting = false;
  protected String qColumnExpr;
  private BindingSet bindingSet;

  static {
    wordPattern           = Pattern.compile("([a-zA-Z_]+[0-9a-zA-Z_\\.]*|'.*?')");
    pureColumnNamePattern = Pattern.compile("^[a-zA-Z_]+[0-9a-zA-Z_]*$");
  }

  /**
   * Copy constructor.
   */
  public SimpleBindingItem(SimpleBindingItem src) {
    this.id = src.id;
    this.columnExpression = src.columnExpression;
    this.columnQuoting = src.columnQuoting;
    this.qColumnExpr = src.qColumnExpr;
    this.bindingSet = src.bindingSet;
  }


  /**
   * Prints an XML representation of the BindingItem.
   * @param writer The writer instance to print the data to.
   */
  public void toXML(XMLStreamWriter writer, boolean withColumnExpression) throws XMLStreamException {
    writer.writeStartElement("C");
    writer.writeAttribute("id", getId());
    if(withColumnExpression){
      writer.writeStartElement("Column");
      writer.writeCharacters(getColumnExpression());
      writer.writeEndElement(); // C
    }
    writer.writeEndElement(); // C
  }

  /**
   *
   * Constructor
   *
   * @param pBindingSet
   * @param id
   * @param pColumnExpression - true - if item is SQL expression
   * @param columnQuoting
   */
  public SimpleBindingItem(BindingSet pBindingSet, String id, String pColumnExpression, boolean columnQuoting) {
    this.bindingSet = pBindingSet;
    this.columnExpression = columnQuoting ? "\"" + pColumnExpression + "\"" : pColumnExpression; 
    this.columnQuoting = columnQuoting;
    setId(id);
    setColumnExpression(this.columnExpression);
  }

  /**
   * getBindingSet
   *
   * @return
   */
  public BindingSet getBindingSet() {
    return bindingSet;
  }

  /**
   * setBindingSet
   */
  public void setBindingSet(BindingSet bindingSet) {
    this.bindingSet = bindingSet;
  }


  /**
   * Helper to merge a table alias into a column expression, which can contain SQL functions etc
   *
   * Method calcQColumnExpression
   *
   */
  public String getQColumnExpression( String tableAlias )
  {
    if( tableAlias==null || tableAlias.isEmpty() ) return getColumnExpression();
    else return BindingUtils.addTableAlias(getColumnExpression(), columnQuoting, Arrays.asList(tableAlias), bindingSet);
  }

  /**
   * gets column expression
   */
  public String getColumnExpression() {
    return columnExpression;
  }

  /**
   * setColumnExpression
   *
   * @param columnExpressionPar
   */
  public void setColumnExpression(String columnExpressionPar) {
    this.columnExpression = columnExpressionPar;
  }

  /**
   * sets id of item
   */
  public void setId(String id) {
    this.id = id;
  }

  /**
   * gets id of item
   */
  public String getId() {
    return id;
  }

  public boolean isColumnQuoting() {
    return columnQuoting;
  }
}
