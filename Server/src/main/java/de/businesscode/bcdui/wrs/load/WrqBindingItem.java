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
package de.businesscode.bcdui.wrs.load;

import java.sql.Types;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamWriter;

import org.apache.commons.lang.StringEscapeUtils;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.BindingItemFromRel;
import de.businesscode.bcdui.binding.BindingUtils;
import de.businesscode.bcdui.binding.exc.BindingNotFoundException;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.Utils;
import de.businesscode.util.jdbc.DatabaseCompatibility;

/**
 * Represents a BindingItem in a Wrq, it is it has knowledge of the underlying BindingItem and the current query
 * There can be multiple WrqBindingItem for a BindingItem(FromRel), to reflect different behaviora like aggr for example in select and in grouping clause
 */
public class WrqBindingItem implements WrsBindingItem
{
  private int columnNumber;
  private final boolean columnQuoting;
  private final Boolean isEscapeXml;
  private String plainColumnExpression;
  private String plainColumnExpressionWithVdm;
  private final List<Element> boundVariables = new LinkedList<Element>();

  protected final Map<String,Object> attributes = new HashMap<String,Object>(); // Request specific wrs:C/@ and wrs:A/@ attributes
  private final String alias;
  private final String aggr;
  private final String id;
  private final WrqInfo wrqInfo;
  private final int jdbcDataType;
  private final int origJdbcDataType; // Can differ, if the datatype had to be adjusted due to VDM
  // A bRef for which we do not want to be calculated if that one is on (sub)total level
  private String skipForTotals = "";
  // may be null, refers to original BindingItem
  private final BindingItem referenceBindingItem;
  private List<String> cCE = null; // Column expression split by column-reference
  private String cCEBase = null;

  private boolean orderByDescending;        // Only if part of ordering

  private final String wrsAName;            // Only for wrs:A
  private final WrqBindingItem parentWrsC;  // Only for wrs:A

  // The table alias during the current query has multiple parts, see getTableAlias()
  private String tableAliasOverwrite = null;
  private String tableAliasPostFix = "";

  
  private Collection<WrsBindingItem> wrsAAttributes = new HashSet<WrsBindingItem>(); // Only for wrs:C, these are child wrs:A elements, not regular DOM attributes

  /**
   * Used to derive a BindingItem from a wrs:C, it is combined with the info from the BindingSet but the WrsRequest provided info wins in case of conflict
   */
  protected WrqBindingItem(WrqInfo wrqInfo, Element elem, String alias, boolean enforceAggr) throws Exception
  {
    this(wrqInfo, elem, alias, enforceAggr, null);
  }

  /**
   * Used to derive a BindingItem from a wrs:C/wrs:A, it is combined with the info from the BindingSet but the WrsRequest provided info wins in case of conflict
   * If parentWrqC is not null, then this is a wrs:A
   * @param wrqInfo
   * @param elem
   * @param alias
   * @param enforceAggr
   * @param parentWrqC
   * @throws Exception
   */
  protected WrqBindingItem(WrqInfo wrqInfo, Element elem, String alias, boolean enforceAggr, WrqBindingItem parentWrqC) throws Exception
  {

    this.wrqInfo = wrqInfo;

    this.alias = alias;

    // We may have a wrq:Calc
    NodeList calcNodes = elem.getElementsByTagNameNS(StandardNamespaceContext.WRSREQUEST_NAMESPACE,"Calc");
    if( calcNodes.getLength() > 0 && calcNodes.item(0).getParentNode() == elem ) {
      WrqCalc2Sql wrqCalc2Sql = Configuration.getClassInstance(Configuration.OPT_CLASSES.WRQCALC2SQL, new Class<?>[]{WrqInfo.class}, wrqInfo);
      Element calc = (Element)calcNodes.item(0);

      BindingItem bi = null;
      Element firstValueRef = (Element)elem.getElementsByTagNameNS(StandardNamespaceContext.WRSREQUEST_NAMESPACE,"ValueRef").item(0);
      if( firstValueRef!= null ) {
        bi = wrqInfo.getResultingBindingSet().get(firstValueRef.getAttribute("idRef"));
        if( bi instanceof BindingItemFromRel ) tableAliasPostFix = ((BindingItemFromRel)bi).getTableAlias("");
        this.referenceBindingItem = bi;
      } else {        
        this.referenceBindingItem = null;
      }

      // Its allowed to define the type at the calc element
      for (String dataType :  new String[]{"type-name","scale","unit","signed"} ) {
        if( ! calc.getAttribute(dataType).isEmpty() )
          attributes.put(dataType, calc.getAttribute(dataType));
      }
      final int dt;
      if( ! calc.getAttribute("type-name").isEmpty() )
        dt = Types.class.getField(calc.getAttribute("type-name")).getInt(null);
      else if ( bi != null )
        dt = bi.getJDBCDataType();
      else
        dt = Types.VARCHAR;
      // Because the value for a vdm is string, we need to adjust the column type, otherwise then and else mismatch
      if( wrqInfo.getVdm( getId() ) != null ) {
        origJdbcDataType = dt;
        jdbcDataType = Types.VARCHAR;
      } else
        origJdbcDataType = jdbcDataType = dt;

      this.id = "bcd_virt_"+(wrqInfo.virtualBiCounter++);
      if( enforceAggr || WrqCalc2Sql.containsAggr(calc) || !wrqInfo.reqHasGroupBy() ) // grouping by colexpr
        this.aggr = null;
      else
        this.aggr = getDefaultAggr(getJDBCDataType());
      columnQuoting = false;
      isEscapeXml = "false".equals(elem.getAttribute("escapeXml")) ? false : true;

      setColumnExpression( wrqCalc2Sql.getWrqCalcAsSql( calc, boundVariables, enforceAggr, getJDBCDataType() ) );
    }
    // Or refer to a bRef
    else {
      BindingItem bi = wrqInfo.getResultingBindingSet().get(elem.getAttribute("bRef"));
      this.referenceBindingItem = bi;
      this.aggr = determineAggr(elem);
      // TODO imported BindingItems have the getId() of the source BindingSet (not matching our bRef). Any import-prefix or renaming is ignored. We use bRef here, because it reflects this properly.
      this.id = elem.getAttribute("id").isEmpty() ? elem.getAttribute("bRef").isEmpty() ? bi.getId() : elem.getAttribute("bRef") : elem.getAttribute("id");
      if( bi instanceof BindingItemFromRel ) tableAliasPostFix = ((BindingItemFromRel)bi).getTableAlias("");
      if( bi==null ) 
        throw new NullPointerException("BindingItem '"+elem.getAttribute("bRef")+"' not found at BindingSet '"+wrqInfo.getResultingBindingSet().getName()+"'");

      // take over all bcdui standard binding attributes for this binding item
      attributes.putAll(bi.getAttributes());
      // User-provided VDM values are strings
      origJdbcDataType = bi.getJDBCDataType();
      jdbcDataType = wrqInfo.getVdm( getId() ) != null ? Types.VARCHAR : origJdbcDataType;
      columnQuoting = bi.isColumnQuoting();
      isEscapeXml = elem.getAttribute("escapeXml").isEmpty() ? bi.isEscapeXML() : Boolean.valueOf(elem.getAttribute("escapeXml"));
      setColumnExpression( bi.getColumnExpression() );
    }

    if( "A".equals(elem.getLocalName()) ) {
      this.wrsAName = elem.getAttribute("name");
      // Now let's attach this wrs:A attr to its parent wrs:C
      if ( parentWrqC == null )
        throw new Exception("Wrong request - found an wrs:A element which isn't under wrs:C element.");
      this.parentWrsC = parentWrqC;
      parentWrqC.addWrsAAttribute(this); // We are in document order, so we know our parent wrs:C exists already
      skipForTotals = elem.getAttribute("skipForTotals");
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

    // As part of wrq:C and wrq:A elements in the select list allow the user to provide additional attributes
    // (here we are talking about plain attributes, not wrq:A),  which are included in the answer
    // and do even overwrite attributes derived from the BindingSet with wrq custom attributes
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
    this.jdbcDataType = origJdbcDataType = Types.VARCHAR;
    this.columnQuoting = parentC.columnQuoting;
    isEscapeXml = true;
    setColumnExpression( columnExpression );
    this.tableAliasOverwrite = parentC.tableAliasOverwrite;
    this.tableAliasPostFix = parentC.tableAliasPostFix;
  }

  /**
   * Used for creating a BindingItem from the info of a BindingSet
   * @param wrqInfo
   * @param bi
   * @param alias
   * @param enforceAggr
   */
  protected WrqBindingItem(WrqInfo wrqInfo, String id, BindingItem bi, String alias, boolean enforceAggr)
  {
    this.referenceBindingItem = bi;
    this.wrqInfo = wrqInfo;
    this.id = id;
    this.aggr = enforceAggr ? getDefaultAggr(bi.getJDBCDataType()) : null;
    this.alias = alias;
    this.wrsAName = null;
    this.parentWrsC = null;

    attributes.putAll(bi.getAttributes());
    // User-provided VDM values are strings
    origJdbcDataType = bi.getJDBCDataType();
    jdbcDataType = wrqInfo.getVdm( getId() ) != null ? Types.VARCHAR : origJdbcDataType;
    columnQuoting = bi.isColumnQuoting();
    isEscapeXml = bi.isEscapeXML();
    setColumnExpression( bi.getColumnExpression() );
    
    if( bi instanceof BindingItemFromRel ) {
      tableAliasPostFix = ((BindingItemFromRel) bi).getTableAlias("");
    }
  }


  private String determineAggr(Element e) throws Exception {
    String bRef = e.hasAttribute("bRef") ? e.getAttribute("bRef") : e.getAttribute("idRef");
    String aggr = aggregationMapping.get(e.getAttribute("aggr").toLowerCase());
    // There is a grouping but we are not part of it
    if( aggr==null && wrqInfo.reqHasGroupBy() && !wrqInfo.getGroupingBRefs().contains(bRef) ) {
      BindingItem bi = wrqInfo.getResultingBindingSet().get(bRef);
      if(bi==null) throw new BindingNotFoundException("BindingItem "+bRef+" not found at BindingSet '"+wrqInfo.getResultingBindingSet().getName()+"'");
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

    for (String attrName : attrs.keySet()) {
      // since we write common wrs elements like Column in standard namespace (see WrsDataWriter), we skip default namespaces which came with the wrq 
      if (!("xmlns".equals(attrName)))
        writer.writeAttribute(attrName, attrs.get(attrName).toString());
    }

    if(referenceBindingItem != null){
      Map<String, String> customAtts = referenceBindingItem.getCustomAttributesMap();
      for (String attrName : customAtts.keySet()){
        writer.writeAttribute(StandardNamespaceContext.CUST_NAMESPACE, attrName, customAtts.get(attrName));
      }
    }

    if (withColumnExpression) {// thus WRS response does not write this element
      writer.writeStartElement("Column");
      writer.writeCharacters(getColumnExpression(false));
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

  /**
   * Used to identify column reference parts in a SQL Column expressions to allow for prepending table alias {@see BindingUtils.splitColumnExpression}
   * @return
   */
  public List<String> getSplitColumnExpression() {
    return getSplitColumnExpression(true);
  }

  /**
   * Used to identify column reference parts in a SQL Column expressions to allow for prepending table alias {@see BindingUtils.splitColumnExpression}
   * @param applyVdm If false, virtual dimension member caused case-when are ignored here
   * @return
   */
  public List<String> getSplitColumnExpression(boolean applyVdm)
  {
    if( ! getColumnExpression(applyVdm).equals( cCEBase ) || cCE == null ) {
      cCEBase = getColumnExpression(applyVdm);
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

  /**
   * Returns the column expression with table alias and with aggregation applied, if any is set
   * @return
   */
  public String getQColumnExpressionWithAggr() throws BindingNotFoundException {
    return getQColumnExpressionWithAggr(false);
  }

  /**
   * Returns the column expression with table alias and with aggregation applied, if any is set or if enforceAggr=true
   * @return
   */
  public String getQColumnExpressionWithAggr( boolean enforceAggr ) throws BindingNotFoundException {
    if( aggr!=null && !aggr.isEmpty() )
      return DatabaseCompatibility.getInstance().getAggrFktMapping(wrqInfo.getJdbcResourceName()).get(aggr.toLowerCase())+"("+getQColumnExpression()+")";
    else if( enforceAggr )
      return getDefaultAggr(getJDBCDataType())+"("+getColumnExpression()+")";
    else
      return getQColumnExpression();
  }

  /**
   * Returns the column expression with aggregation applied, if any is set
   * @return
   */
  public String getColumnExpressionWithAggr() {
    return getColumnExpressionWithAggr(false);
  }

  /**
   * Returns the column expression with aggregation applied, if any is set or if enforceAggr=true
   * @return
   */
  public String getColumnExpressionWithAggr( boolean enforceAggr ) {
    if( aggr!=null && !aggr.isEmpty() )
      return DatabaseCompatibility.getInstance().getAggrFktMapping(wrqInfo.getJdbcResourceName()).get(aggr.toLowerCase())+"("+getColumnExpression()+")";
    else if( enforceAggr )
      return getDefaultAggr(getJDBCDataType())+"("+getColumnExpression()+")";
    else
      return getColumnExpression();
  }

  // True, if a column expression has at least one column reference, false, if the expression is a complete constant
  // Allows for example to eliminate complete-constant expressions from group-by as they are not allowed in SQLServer
  public boolean hasAColumnReference()
  {
    List<String> sCE = getSplitColumnExpression(true);
    return sCE.size() > 1;
  }

  /**
   * Return the column expression with the table alias
   * @return
   */
  public String getQColumnExpression() throws BindingNotFoundException
  {
    return getQColumnExpression( true );
  }
  /**
   * Return the column expression with the table alias
   * @param applyVdm If false, virtual dimension members are ignored here
   * @return
   */
  public String getQColumnExpression( boolean applyVdm ) throws BindingNotFoundException
  {
    List<String> sCE = getSplitColumnExpression(applyVdm);
    return BindingUtils.addTableAlias(sCE, getTableAlias());
  }

  /**
   * Return the physical DB column expression including virtual dimension member caused adjustments
   * @return
   */
  public String getColumnExpression() {
    return getColumnExpression(true);
  }

  /**
   * Allows to retrieve he column expression ignoring virtual dimension members, for example when creating the where clause
   * @param applyVdm
   * @return
   */
  private String getColumnExpression(boolean applyVdm) {
    if( applyVdm )
      return plainColumnExpressionWithVdm != null ? plainColumnExpressionWithVdm : parentWrsC.getColumnExpression();
    else
      return plainColumnExpression != null ? plainColumnExpression : parentWrsC.getColumnExpression();
  }

  /**
   * Derive the column expression<
   * Note that for VDM, this relies on plainColumnExpression and jdbcDataType being set already to this.
   * @param cE
   */
  public void setColumnExpression(String cE) {
    plainColumnExpression = cE;
    evaluateVdms();
  }

  /**
   * We may need to wrap our column expression in a case-when chain to apply virtual dimension member vdm
   * SQL Injection. Sadly, we cannot use bind variables ('?') here because database engines do not recognize such case-when statements as same, even of the
   * bound values are. This leads to "not a group by expression", even if the same case-when is used in group by and a select list.
   * So we need to literally embed the values here as an exception to BCD-UI. We escape all ' from them to make sure, all content is treated as string.
   * Other cases like _ or %, which can be used for injection in LIKE contexts do not affect us here because we know hard-coded we are in an IN clause
   */
  private void evaluateVdms()
  {
    StringBuffer pCEWithVdm = new StringBuffer();
    String elseValue = null;
    String q = isNumeric() ? "" : "'";
    boolean isNumeric = isNumeric();

    // Do we have VDM value mappings for this bRef?
    if( wrqInfo.getVdm( getId() ) != null ) {
      Map<String,Set<String>> mappings = wrqInfo.getVdm( getId() );
      pCEWithVdm.append(" CASE ");

      // 1a. Make a WHEN THEN part for each mapping
      for( String to: mappings.keySet() ) {
        if( mappings.get( to ) == null ) {
          elseValue = to;
          continue;
        }
        // List the values we map from to 'to' in an IN clause
        pCEWithVdm.append(" WHEN ").append( plainColumnExpression ).append(" IN (");
        String sep = "";
        for( String from: mappings.get( to ) ) {
          // Prevent SQL injection
          if( isNumeric )
            from = Double.toString(Double.parseDouble(from));
          else
            from = StringEscapeUtils.escapeSql( from );
          pCEWithVdm.append(sep).append(q).append(from).append(q);
          sep = ",";
        }
        pCEWithVdm.append(") THEN ");
        // Prevent SQL injection
        if( isNumeric )
          to = Double.toString(Double.parseDouble(to));
        else
          to = StringEscapeUtils.escapeSql( to );
        pCEWithVdm.append(q).append(to).append(q);
      }

      // 1b) This is the ELSE case, i.e. all unmapped values or the explicit value for 'other'.
      // Workaround:
      // Oracle (only) showed a strange behaviour (tested v11.2, v12.1) for DATE columns leading to ORA-00932
      // "inconsistent datatypes: expected CHAR got DATE" if we would actually use ELSE here.
      // That's why as a workaround, we add the test for NOT NULL. Test case for Oracle:
      //      select
      //        --  CASE WHEN num_rows > 1000 THEN 'big' ELSE TO_CHAR(num_rows) END,
      //        CASE WHEN last_analyzed in ('2016-05-06') THEN 'isMay6' ELSE TO_CHAR(last_analyzed) END,
      //        CACHE,
      //        count(*)
      //      from user_tables
      //      group by grouping sets (
      //        (),
      //        --   ( CASE WHEN num_rows > 1000 THEN 'big' ELSE TO_CHAR(num_rows) END ),
      //        --   ( CASE WHEN num_rows > 1000 THEN 'big' ELSE TO_CHAR(num_rows) END, CACHE )
      //        ( CASE WHEN last_analyzed in ('2016-05-06') THEN 'isMay6' ELSE TO_CHAR(last_analyzed) END ),
      //        ( CASE WHEN last_analyzed in ('2016-05-06') THEN 'isMay6' ELSE TO_CHAR(last_analyzed) END, CACHE )
      //  );
      // fails but work with the number field num_rows, or when skipping the grand total or when removing the 'cache' level.
      pCEWithVdm.append(" WHEN ").append( plainColumnExpression ).append(" IS NOT NULL THEN ");
      // Else are either the original values or the @to with an empty @from value, serving as value for the rest
      if( elseValue != null ) {
        // Prevent SQL injection
        if( isNumeric )
          elseValue = Double.toString(Double.parseDouble(elseValue));
        else
          elseValue = StringEscapeUtils.escapeSql( elseValue );
        pCEWithVdm.append(q).append(elseValue).append(q);
      } else {
        // Because in CASE THEN and ELSE data types have to match, we cast the column to string if needed
        pCEWithVdm.append(DatabaseCompatibility.getInstance().castToVarchar(wrqInfo.getJdbcResourceName(), origJdbcDataType, plainColumnExpression));
      }
      pCEWithVdm.append(" END ");

      // 2. Special and strange case: there is only the else value, we just print the value, no case-when chain
      if( elseValue!=null && mappings.keySet().size() == 1 ) {
        // Prevent SQL injection
        if( isNumeric )
          elseValue = Double.toString(Double.parseDouble(elseValue));
        else
          elseValue = StringEscapeUtils.escapeSql( elseValue );
        plainColumnExpressionWithVdm = q+elseValue+q;
      } else
        plainColumnExpressionWithVdm = pCEWithVdm.toString();
    }

    // No VDMs found
    else
      plainColumnExpressionWithVdm = plainColumnExpression;
  }

  /**
   * Usually the table alias is derived from the wrq-table alias with which this bindingItem is referenced
   * b.country will be taken from the table that is associated with the wrq table alias "b"
   * This value is created during each query. But here are two special cases:
   * tableAliasOverwrite allows to completely ignore this and fix out table alias by using setTableAliasOverwrite(). This is used for CTE fo example
   * tableAliasPostFix will be not empty in case the BindingItem comes from a Relation as it mist be the Relation-joined (as opposed to Wrq-joined) table
   * @return
   * @throws BindingNotFoundException
   */
  public String getTableAlias() throws BindingNotFoundException {
    if( tableAliasOverwrite!= null ) return tableAliasOverwrite;
    String wrqAlias = id.indexOf(".")!=-1 ? id.split("\\.")[0] : "";
    return wrqInfo.getCurrentSelect().getBindingSetForWrqAlias(wrqAlias).getSqlAlias() + tableAliasPostFix;
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

  public String getSkipForTotals() {
    return skipForTotals;
  }

  /**
   * @return a {@link BindingItem} this item is referencing, maybe null in case this is a virtual item
   */
  public BindingItem getReferenceBindingItem() {
    return referenceBindingItem;
  }

  /**
   * @return true if the BindingItem represents a numeric value
   */
  public boolean isNumeric() {
    return BindingUtils.isNumeric(jdbcDataType);
  }

  public Object getAttribute(String name) {
    return attributes.get(name);
  }

  public void setTableAliasOverwrite(String tableAlias) {
    tableAliasOverwrite = tableAlias;
  }

}
