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

import java.sql.Types;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamWriter;

import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.BindingUtils;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.Utils;
import de.businesscode.util.jdbc.DatabaseCompatibility;

public class WrqBindingItem implements WrsBindingItem
{
  private int columnNumber;
  private final boolean columnQuoting;
  private final Boolean isEscapeXml;
  private String plainColumnExpression;
  private final List<Element> boundVariables = new LinkedList<Element>();

  protected final Map<String,Object> attributes = new HashMap<String,Object>(); // Request specific wrs:C/@ and wrs:A/@ attributes
  private final String alias;
  private final String aggr;
  private final String id;
  private final WrqInfo wrqInfo;
  private final int jdbcDataType;
  private String tableAlias;
  // may be null, refers to original BindingItem
  private final BindingItem referenceBindingItem;
  private List<String> cCE = null; // Column expression split by column-reference
  private String cCEBase = null;

  private boolean orderByDescending;             // Only if part of ordering

  private final String wrsAName;            // Only for wrs:A
  private final WrqBindingItem parentWrsC;  // Only for wrs:A

  private Collection<WrsBindingItem> wrsAAttributes = new HashSet<WrsBindingItem>(); // Only for wrs:C, these are child wrs:A elements, not regular DOM attributes

  protected WrqBindingItem(WrqInfo wrqInfo, Element elem, String alias, boolean enforceAggr) throws Exception
  {
    this(wrqInfo, elem, alias, enforceAggr, null);
  }
  
  protected WrqBindingItem(WrqInfo wrqInfo, Element elem, String alias, boolean enforceAggr, WrqBindingItem parentWrqC) throws Exception
  {

    this.wrqInfo = wrqInfo;

    this.alias = alias;

    // We may have a calc:Calc
    NodeList calcNodes = elem.getElementsByTagNameNS(StandardNamespaceContext.WRSREQUEST_NAMESPACE,"Calc");
    if( calcNodes.getLength() > 0 && calcNodes.item(0).getParentNode() == elem ) {
      WrqCalc2Sql wrqCalc2Sql = Configuration.getClassInstance(Configuration.OPT_CLASSES.WRQCALC2SQL, new Class<?>[]{WrqInfo.class}, wrqInfo);
      Element calc = (Element)calcNodes.item(0);

      BindingItem bi = null;
      Element firstValueRef = (Element)elem.getElementsByTagNameNS(StandardNamespaceContext.WRSREQUEST_NAMESPACE,"ValueRef").item(0);
      if( firstValueRef!= null ) {
        bi = wrqInfo.getResultingBindingSet().get(firstValueRef.getAttribute("idRef"));
        this.referenceBindingItem = bi;
        this.tableAlias = bi.getTableAliasName();
      } else {        
        this.referenceBindingItem = null;
        this.tableAlias = null;
      }

      // Its allowed to define the type at the calc element
      for (String dataType :  new String[]{"type-name","scale","unit","signed"} ) {
        if( ! calc.getAttribute(dataType).isEmpty() )
          attributes.put(dataType, calc.getAttribute(dataType));
      }
      if( ! calc.getAttribute("type-name").isEmpty() )
        this.jdbcDataType = Types.class.getField(calc.getAttribute("type-name")).getInt(null);
      else if ( bi != null )
        this.jdbcDataType = bi.getJDBCDataType();
      else
        this.jdbcDataType = Types.VARCHAR;

      this.id = "bcd_virt_"+(wrqInfo.virtualBiCounter++);
      if( enforceAggr || WrqCalc2Sql.containsAggr(calc) || wrqInfo.getGroupingBRefs().isEmpty() ) // grouping by colexpr
        this.aggr = null;
      else
        this.aggr = getDefaultAggr(getJDBCDataType());
      columnQuoting = false;
      isEscapeXml = "false".equals(elem.getAttribute("escapeXml")) ? new Boolean(false) : new Boolean(true);

      this.plainColumnExpression = wrqCalc2Sql.getWrqCalcAsSql( calc, boundVariables, enforceAggr, getJDBCDataType() );

    }
    // Or refer to a bRef
    else {
      BindingItem bi = wrqInfo.getResultingBindingSet().get(elem.getAttribute("bRef"));
      this.referenceBindingItem = bi;
      this.plainColumnExpression = bi.getColumnExpression();
      this.aggr = determineAggr(elem);
      // TODO imported bindingitems have the getId() of the source BindingSet (not matching our bRef). Any import-prefix or renaming is ignored. We use bRef here, because it reflects this properly.
      this.id = elem.getAttribute("id").isEmpty() ? elem.getAttribute("bRef").isEmpty() ? bi.getId() : elem.getAttribute("bRef") : elem.getAttribute("id");
      this.tableAlias = bi.getTableAliasName(); // what in case of wrq:Calc

      attributes.putAll(bi.getAttributes());
      jdbcDataType = bi.getJDBCDataType();
      columnQuoting = bi.isColumnQuoting();
      isEscapeXml = elem.getAttribute("escapeXml").isEmpty() ? bi.isEscapeXML() : new Boolean(elem.getAttribute("escapeXml"));
    }


    if( "A".equals(elem.getLocalName()) ) {
      this.wrsAName = elem.getAttribute("name");
      // Now let's attach this wrs:A attr to its parent wrs:C
      if ( parentWrqC == null )
        throw new Exception("Wrong request - found an wrs:A element which isn't under wrs:C element.");
      this.parentWrsC = parentWrqC;
      parentWrqC.addWrsAAttribute(this); // We are in document order, so we know our parent wrs:C exists already
    }
    else {
      this.wrsAName   = null;
      this.parentWrsC = null;
      String wrsId = elem.getAttribute("id").isEmpty() ?  elem.getAttribute("bRef") : elem.getAttribute("id");
      attributes.put("id", wrsId );
      if( elem.getAttribute("dimId").isEmpty() && elem.getAttribute("valueId").isEmpty() ) {
        if( wrqInfo.getGroupingBRefs().contains(wrsId) )
          attributes.put("dimId", wrsId );
        else
          attributes.put("valueId", wrsId );
      }
    }

    // As part of wrs:C and wrs:A elements in the select list allow the user to provide additional attributes
    // (here we are talking about plain attributes, not wrs:A),  which are included in the answer
    // and do even overwrite attributes derived from the BindingSet
    NamedNodeMap attrs = elem.getAttributes();
    for( int a = 0; a<attrs.getLength(); a++ ) {
      Node attr = attrs.item(a);
      attributes.put(attr.getNodeName(), attr.getNodeValue());
    }
  }

  /**
   * Used for creating an artificial wrs:A attribute
   * @param wrqInfo
   * @param wrsAName
   * @param aggr
   * @param alias
   * @param parentC
   * @param columnExpression
   */
  protected WrqBindingItem(WrqInfo wrqInfo, String wrsAName, String aggr, String alias, WrqBindingItem parentC, String columnExpression)
  {
    this.referenceBindingItem = null;
    this.wrqInfo = wrqInfo;
    this.id = "bcd_virt_"+(wrqInfo.virtualBiCounter++);
    this.aggr = aggr;
    this.alias = alias;
    this.wrsAName = wrsAName;
    attributes.put("id", this.id);
    attributes.put("name", wrsAName);
    wrqInfo.getAllBRefAggrs().get(parentC.getId()).addWrsAAttribute(this); // We are in document order, so we know our parent wrs:C exists already
    this.parentWrsC = parentC;
    this.plainColumnExpression = columnExpression;
    this.jdbcDataType = Types.VARCHAR;
    this.tableAlias = parentC.getTableAlias();
    this.columnQuoting = false;
    isEscapeXml = new Boolean(true);
  }

  protected WrqBindingItem(WrqInfo wrqInfo, BindingItem bi, String alias, boolean enforceAggr)
  {
    this.referenceBindingItem = bi;
    this.wrqInfo = wrqInfo;
    this.id = bi.getId();
    this.aggr = enforceAggr ? getDefaultAggr(bi.getJDBCDataType()) : null;
    this.alias = alias;
    this.wrsAName = null;
    this.parentWrsC = null;
    this.plainColumnExpression = bi.getColumnExpression();
    this.tableAlias = bi.getTableAliasName();

    attributes.putAll(bi.getAttributes());
    jdbcDataType = bi.getJDBCDataType();
    columnQuoting = bi.isColumnQuoting();
    isEscapeXml = bi.isEscapeXML();
  }


  private String determineAggr(Element e) throws Exception {
    String bRef = e.hasAttribute("bRef") ? e.getAttribute("bRef") : e.getAttribute("idRef");
    String aggr = aggregationMapping.get(e.getAttribute("aggr").toLowerCase());
    // There is a grouping but we are not part of it
    if( aggr==null && !wrqInfo.getGroupingBRefs().isEmpty() && !wrqInfo.getGroupingBRefs().contains(bRef) ) {
      BindingItem bi = wrqInfo.getResultingBindingSet().get(bRef);
      aggr = bi.getAggr()!=null ? aggregationMapping.get(bi.getAggr()) : getDefaultAggr(bi.getJDBCDataType());
    }
    return aggr;
  }

  /**
   * Usually, the aggregation is defined in the Wrq Element e for the column.
   * There are two cases where not: is not given (select all, no select list), or the attribute is simply not set.
   * Then we have this mechanism for default-aggregator
   * 1) Wrq/Columns/C/@aggr
   * 2) BindingSet/BindingItem/@aggr
   * 3) MAX() or SUM() depending on the BindingItems data type
   * @param dataType
   * @return
   */
  static protected String getDefaultAggr( int dataType )
  {
    return Types.VARCHAR == dataType || Types.DATE == dataType || Types.CHAR == dataType || Types.TIMESTAMP == dataType ?  "max" : "sum";
  }


  public String getAlias() {
    return alias;
  }


  @Override
  public int getColumnNumber() {
    return columnNumber;
  }
  public void setColumnNumber( int columnNumber ) {
    this.columnNumber = columnNumber;
  }

  @Override
  public Boolean isEscapeXML() {
    return isEscapeXml;
  }

  @Override
  public void toXML(XMLStreamWriter writer, boolean withColumnExpression) throws XMLStreamException
  {
    Map<String,Object> attrs = attributes;

    for (String attrName : attrs.keySet())
      writer.writeAttribute(attrName, attrs.get(attrName).toString());
    
    if(referenceBindingItem != null){
      Map<String, String> customAtts = referenceBindingItem.getCustomAttributesMap();
      for (String attrName : customAtts.keySet()){
        writer.writeAttribute(StandardNamespaceContext.CUST_NAMESPACE, attrName, customAtts.get(attrName));
      }
    }

    if (withColumnExpression) {// thus WRS response does not write this element
      writer.writeStartElement("Column");
      writer.writeCharacters(getColumnExpression());
      writer.writeEndElement(); // Column
    }
    
    if(this.referenceBindingItem != null && this.referenceBindingItem.getReferences() != null){
      try {
        Node referencesAsNode = this.referenceBindingItem.getReferencesAsNode();
        if (referencesAsNode != null) {
          Utils.injectDOMContentInXMLStreamWriter(writer, referencesAsNode);
        }
      }
      catch (Exception e) {
        throw new RuntimeException("Unexpected exception", e);
      }
    }
  }

  @Override
  public boolean hasWrsAAttributes() {
    return wrsAAttributes.size()>0;
  }

  @Override
  public Collection<WrsBindingItem> getWrsAAttributes() {
    return wrsAAttributes;
  }

  public void addWrsAAttribute(WrqBindingItem wrsAttr) {
    wrsAAttributes.add(wrsAttr);
  }

  @Override
  public Integer getJDBCDataType() {
    return jdbcDataType;
  }

  public String getWrsAName()
  {
    return wrsAName;
  }
  public String getId()
  {
    return id;
  }
  public String getAggr()
  {
    return aggr;
  }

  public boolean isOrderByDescending() {
    return orderByDescending;
  }

  public void setOrderByDescending(boolean isDescending) {
    this.orderByDescending = isDescending;
  }

  // Used to identify column reference parts in a SQL Column expressions to allow for prepending table alias
  public List<String> getSplitColumnExpression()
  {
    if( ! getColumnExpression().equals( cCEBase ) || cCE == null ) {
      cCEBase = getColumnExpression();
      cCE = BindingUtils.splitColumnExpression(cCEBase, columnQuoting, wrqInfo.getResultingBindingSet());
    }
    return cCE;
  }

  // This is the logical aggregation coming from the @aggr attribute
  // It does not necessarily match the SQL expression (for example GROUPING vs. ISNULL for MySql)
  // It serves for preventing SQL injection via the aggr attribute
  // TODO: make this an enum, note it can be null, none and some actual aggregation
  private static final Map<String, String> aggregationMapping;
  static {
    aggregationMapping = new HashMap<String, String>();
    aggregationMapping.put("sum", "SUM");
    aggregationMapping.put("max", "MAX");
    aggregationMapping.put("min", "MIN");
    aggregationMapping.put("avg", "AVG");
    aggregationMapping.put("count", "COUNT");
    aggregationMapping.put("grouping", "GROUPING");
    aggregationMapping.put("none", ""); // Can be used if the column expression already has a aggregator defined
  }
  public String getQColumnExpressionWithAggr() {
    if( aggr!=null && !aggr.isEmpty() )
      return DatabaseCompatibility.getInstance().getAggrFktMapping(wrqInfo.getResultingBindingSet()).get(aggr.toLowerCase())+"("+getQColumnExpression()+")";
    else
      return getQColumnExpression();
  }

  // True, if a column expression has at least one column reference, false, if the expression is a complete constant
  // Allows for example to eliminate complete-constant expressions from group-by as they are not allowed in SQLServer
  public boolean hasAColumReference()
  {
    List<String> sCE = getSplitColumnExpression();
    return sCE.size() > 1;
  }

  public String getQColumnExpression() 
  {
    List<String> sCE = getSplitColumnExpression();
    return BindingUtils.addTableAlias(sCE, tableAlias);
  }
  public String getColumnExpression() {
    return plainColumnExpression != null ? plainColumnExpression : parentWrsC.getColumnExpression();
  }

  public void setColumnExpression(String cE) {
    plainColumnExpression = cE;
  }

  public String getTableAlias() {
    return tableAlias;
  }
  public void setTableAlias(String tableAlias) {
    this.tableAlias = tableAlias;
  }
  public WrqBindingItem getParentWrsC() {
    return parentWrsC;
  }

  @Override
  public String getCaption() {
    return "" + (attributes.get("caption") != null ? attributes.get("caption") : "");
  }

  @Override
  public String getJDBCColumnScale() {
    return "" + (attributes.get("scale") != null ? attributes.get("scale") : "");
  }

  public List<Element> getBoundVariables() {
    return boundVariables;
  }
}
