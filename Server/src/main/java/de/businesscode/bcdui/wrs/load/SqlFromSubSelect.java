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

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.StandardBindingSet;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.binding.exc.BindingNotFoundException;
import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.XPathUtils;
import de.businesscode.util.jdbc.DatabaseCompatibility;
import de.businesscode.util.xml.SecureXmlFactory;

import org.apache.commons.io.IOUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.subject.Subject;
import org.apache.shiro.web.util.WebUtils;
import org.w3c.dom.Element;

import javax.xml.transform.Transformer;
import javax.xml.transform.dom.DOMResult;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamSource;
import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpression;
import javax.xml.xpath.XPathExpressionException;

import java.io.StringReader;
import java.util.*;

/**
 * Takes a single wrq:Select (formally a "sub-select") and turns it into a SQLStatementWithParams
 */
public class SqlFromSubSelect
{
  protected final Element selectElem;
  protected final WrqQueryBuilder wrqQueryBuilder;
  protected final SqlFromSubSelect parent;
  protected final WrqInfo wrqInfo;
  protected int rowStart = 0;
  protected int rowEnd   = -1;                          // -1 means unlimited
  protected Set<StandardBindingSet> resolvedBindingSets = new HashSet<>();
  protected WrqBindingSetFromDerivedTable representingBindingSet = null;
  protected Map<String,WrqBindingSet> bindingSetForWrqAlias = new HashMap<>(); // Registry to associate BindingSets with user provided table expression alias
  protected int aliasCounter = 1;                                              // To create (query-) unique sql table alias

  // Stylesheet for rowStart rowEnd conversion
  protected static String wrqTransformRowLimitXsltStatic;
  static {
    try {
      wrqTransformRowLimitXsltStatic = IOUtils.toString(Wrq2Sql.class.getResourceAsStream("wrqTransformSelectRowLimit.xslt"), "UTF-8");
    } catch (Throwable e) {
      LogManager.getLogger(Wrq2Sql.class).fatal("wrqTransformSelectRowLimit.xslt not found");
    }
  }

  
  // Result of our work. The SQL statement as string plus the bound values for the prepared statement
  protected SQLStatementWithParams selectStatement;

  /**
   * We are initialized for a full-select (SELECTSs connected with SET operators).
   * @param wrqQueryBuilder
   * @param selectElem
   * @throws Exception
   */
  public SqlFromSubSelect(WrqQueryBuilder wrqQueryBuilder, SqlFromSubSelect parent, Element selectElem)
      throws Exception
  {
    super();

    this.selectElem = selectElem;
    this.wrqQueryBuilder = wrqQueryBuilder;
    this.parent = parent;

    // Let's detect start end end, because we have some extra activity depending on it. rowEnd -1 means unlimited
    String rowStartAttrStr = selectElem.getAttribute("rowStart");
    if( ! rowStartAttrStr.isEmpty() ) rowStart = Integer.parseInt(rowStartAttrStr);
    String rowEndAttrStr = selectElem.getAttribute("rowEnd");
    rowEnd = wrqQueryBuilder.getMaxRows() + (rowStart > 1 ? rowStart - 1 : 0);
    if( ! rowEndAttrStr.isEmpty() ) {
      int rowEndAttr = Integer.parseInt(rowEndAttrStr) + rowStart;
      if( rowEndAttr >= 0 && rowEnd >= 0 ) rowEnd = Math.min(rowEnd, Integer.parseInt(rowEndAttrStr) );
      if( rowEndAttr >= 0 && rowEnd < 0 ) rowEnd = Integer.parseInt(rowEndAttrStr);
    }

    // SELECTs which go to a non-virtual BindingSet support rowStart > 1
    // Currently only for top-level selects from BindingSet
    if( rowStart > 1 && (rowEnd == -1 || rowEnd >= rowStart) ) {
      XPath xp = XPathUtils.newXPathFactory().newXPath();
      StandardNamespaceContext nsContext = StandardNamespaceContext.getInstance();
      xp.setNamespaceContext(nsContext);
      XPathExpression bindingSetXpathExpr = xp.compile("./wrq:From/wrq:BindingSet/text()");
      String bindingSetName = (String)bindingSetXpathExpr.evaluate(selectElem, XPathConstants.STRING);
      if( ! bindingSetName.isEmpty() ) {
        StringBuilder bis = new StringBuilder();
        StringBuilder keyBis = new StringBuilder();

        StandardBindingSet resultingBindingSet = (StandardBindingSet) wrqQueryBuilder.getBindings().get(bindingSetName, Collections.emptyList());
        for( BindingItem bi: resultingBindingSet.getBindingItems() ) {
          bis.append(bi.getId()+" ");
          if(bi.isKey()) keyBis.append(bi.getId()+" ");
        }
        DOMSource source = new DOMSource(selectElem);
        StreamSource styleSource = new StreamSource( new StringReader(wrqTransformRowLimitXsltStatic) );
        Transformer transformer = SecureXmlFactory.newTransformerFactory().newTransformer(styleSource);
        transformer.setParameter("allBindingItems", bis.toString());
        transformer.setParameter("allKeyBindingItems", keyBis.toString());
        DOMResult result = new DOMResult();
        transformer.transform(source, result);

        selectElem = (Element)result.getNode().getFirstChild();
      }
    }
    
    wrqInfo = new WrqInfo( this, selectElem );

    // Complete initialization
    createSelectStatement();
  }


  /**
   * Handles a "select-statement", i.e. a complete select
   * @throws Exception 
   * @see de.businesscode.bcdui.wrs.load.ISqlGenerator#getSelectStatement()
   */
  protected void createSelectStatement() throws Exception
  {
    selectStatement = new SQLStatementWithParams();

    // Generate the SQL and collect all host variables needed to execute it later
    generateSelectClause( wrqInfo, selectStatement );
    generateFromClause( wrqInfo, selectStatement );
    generateWhereClause( wrqInfo, selectStatement );
    generateGroupingClause( wrqInfo, selectStatement );
    generateHavingClause( wrqInfo, selectStatement );
    generateOrderClause( wrqInfo, selectStatement );
  }


  /**
   * Generates 'SELECT' plus the select list
   * @throws BindingNotFoundException
   */
  protected void generateSelectClause( WrqInfo wrqInfo, SQLStatementWithParams sqlStatement ) throws BindingNotFoundException
  {
    StringBuilder sql = new StringBuilder();
    List<Element> boundVariables = new LinkedList<Element>();

    sql.append("SELECT ");
    Iterator<String> it = wrqInfo.getFullSelectListBRefs().iterator();
    String concat="";
    while( it.hasNext() )
    {
      WrqBindingItem bi = wrqInfo.getAllBRefAggrs().get(it.next());
      sql.append(concat);
      // We may want to not calculate this value if another bRef part of Grouping Set is on (sub)total level
      // Typical case is the caption. It could be part of the Grouping Set itself but this keeps the query simpler, see scorecard
      if( wrqInfo.reqHasGroupingFunction() && wrqInfo.getGroupingBRefs().contains(bi.getSkipForTotals()) ) {
        String[] grpFM = DatabaseCompatibility.getInstance().getCalcFktMapping(wrqQueryBuilder.getJdbcResourceName()).get("Grouping");
        WrqBindingItem sftBi = wrqInfo.getAllBRefs().get(bi.getSkipForTotals());
        sql.append("CASE WHEN ").append(grpFM[1]).append(sftBi.getQColumnExpression()).append(grpFM[3]).append(" = 0 THEN ");
        sql.append(bi.getQColumnExpressionWithAggr()).append(" END ");
      } else {
        sql.append(bi.getQColumnExpressionWithAggr()).append(" ");
      }
      sql.append( bi.getAlias() );
      concat = ", ";
      boundVariables.addAll( bi.getBoundVariables() );
    }
    sqlStatement.append(sql.toString(), boundVariables, wrqInfo.getResultingBindingSet());
  }


  /**
   * Generates 'FROM' and the tables with their join expression
   */
  protected void generateFromClause( WrqInfo wrqInfo, SQLStatementWithParams sqlStatement ) throws BindingException
  {
    sqlStatement.append(" FROM ");
    WrqBindingSet bs = wrqInfo.getResultingBindingSet();
    resolvedBindingSets.addAll(bs.getResolvedBindingSets());
    sqlStatement.append(wrqInfo.getSQLSelectWithParams()); 
  }


  /**
   * Generates 'WHERE ' plus the filter
   * @throws XPathExpressionException
   * @throws BindingException
   */
  protected void generateWhereClause( WrqInfo wrqInfo, SQLStatementWithParams sqlStatement ) throws Exception
  {
    StringBuilder sql = new StringBuilder();
    List<Element> boundVariables = new LinkedList<Element>();

    // Can be a meta-data request
    if( (rowEnd > 0 && rowStart > rowEnd) || rowEnd == 0 ) {
      sql.append(" WHERE 1=0 ");
      sqlStatement.append(sql.toString());
      return;
    }

    WrqFilter2Sql wrqFilter2Sql = new WrqFilter2Sql(wrqInfo, wrqInfo.getFilterNode(), false);
    String filterClause = wrqFilter2Sql.getAsSql( boundVariables );

    // Take care for row level security
    String subjectSettingsClause = "";
    Subject subject = null;
    try { subject = SecurityUtils.getSubject(); } catch (Exception e) {/* no shiro at all */}
    if( subject != null && WebUtils.isHttp(SecurityUtils.getSubject()) ) {
      SQLStatementWithParams subjectSettingsStmt = wrqInfo.getResultingBindingSet().getSubjectFilterExpression(wrqInfo);
      subjectSettingsClause = subjectSettingsStmt.getStatement();
      boundVariables.addAll(subjectSettingsStmt.getFilterItems());
    } else {
      System.out.println("Unsafe access"); // TODO);
    }

    // Now combine the two restrictions (Filter and SubjectSettings) into one WHERE clause
    if( ! filterClause.isEmpty() || ! subjectSettingsClause.isEmpty() )
      sql.append(" WHERE ");
    if( ! filterClause.isEmpty() )
      sql.append("( "+filterClause+" )");
    if( ! filterClause.isEmpty() && ! subjectSettingsClause.isEmpty() )
      sql.append(" AND ");
    if( ! subjectSettingsClause.isEmpty() )
      sql.append(" ( "+subjectSettingsClause+" )");

    sqlStatement.append(sql.toString(), boundVariables, wrqInfo.getResultingBindingSet());
  }


  /**
   * Generates Grouping clause
   * @throws Exception
   */
  protected void generateGroupingClause( WrqInfo wrqInfo, SQLStatementWithParams sqlStatement ) throws Exception
  {
    List<Element> boundVariables = new LinkedList<Element>();
    
    StringBuffer sql = wrqInfo.getWrqGroupBy2Sql().generateGroupingClause(boundVariables);

    sqlStatement.append(sql.toString(), boundVariables, wrqInfo.getResultingBindingSet());
    
  }

  /**
   * Generates Having SQL clause
   * @param wrqInfo
   * @param sqlStatement
   * @throws XPathExpressionException
   * @throws BindingException
   */
  protected void generateHavingClause( WrqInfo wrqInfo, SQLStatementWithParams sqlStatement ) throws XPathExpressionException, BindingException
  {
    StringBuilder sql = new StringBuilder();
    List<Element> boundVariables = new LinkedList<Element>();

    WrqFilter2Sql wrqFilter2Sql = new WrqFilter2Sql(wrqInfo, wrqInfo.getHavingNode(), true);
    String filterClause = wrqFilter2Sql.getAsSql( boundVariables );
    if( !filterClause.isEmpty() )
      sql.append(" HAVING ").append( filterClause );

    sqlStatement.append(sql.toString(), boundVariables, wrqInfo.getResultingBindingSet());  }

  /**
   * Generates Order-By clause
   * @throws BindingNotFoundException
   */
  protected void generateOrderClause( WrqInfo wrqInfo, SQLStatementWithParams sqlStatement ) throws BindingNotFoundException
  {
    StringBuffer sql = new StringBuffer();
    List<Element> boundVariables = new LinkedList<Element>();

    Iterator<String> it = wrqInfo.getOrderingBRefs().iterator();
    int i = 0;
    DatabaseCompatibility dbCompat = DatabaseCompatibility.getInstance();
    while( it.hasNext() ) {
      String bRef = it.next();
      WrqBindingItem item = wrqInfo.getAllBRefAggrs().get(bRef);

      if (++i == 1)
        sql.append(" ORDER BY ");
      else
        sql.append(", ");

      // To have the same position of NULL values (sort them to the end), add a database specific order by specification
      int bind = dbCompat.dbOrderByNullsLast(wrqQueryBuilder.getJdbcResourceName(), item.getQColumnExpressionWithAggr(), item.isOrderByDescending(), sql );
      for( ; bind > 0; bind-- )
        boundVariables.addAll( item.getBoundVariables() );
    }

    sqlStatement.append(sql.toString(), boundVariables, wrqInfo.getResultingBindingSet());
  }

  public List<Element> getBoundVariables() {
    return selectStatement.getFilterItems();
  }

  public LinkedList<WrsBindingItem> getSelectedBindingItems() {
    return wrqInfo.getWrsCOnlySelectListBRefs();
  }

  /**
   * A BindingSet representing us as if we where a bnd:BindingSet
   * @return
   * @throws Exception
   */
  public WrqBindingSet getRepresentingBindingSet() throws Exception {
    if( representingBindingSet == null ) {
      representingBindingSet = new WrqBindingSetFromDerivedTable(this);
    }
    return representingBindingSet;
  }
  
  public WrqInfo getWrqInfo() {
    return wrqInfo;
  }

  public Set<StandardBindingSet> getResolvedBindingSets() {
    return resolvedBindingSets;
  }

  public SQLStatementWithParams getSelectStatement() {
    return selectStatement;
  }

  /**
   * Get the BindingSet for a user provided table expression alias
   * @param wrqAlias
   * @return
   * @throws BindingNotFoundException 
   */
  public WrqBindingSet getBindingSetForWrqAlias(String wrqAlias) throws BindingNotFoundException {
    WrqBindingSet bs = bindingSetForWrqAlias.get(wrqAlias);
    if( bs==null ) bs = getWrqQueryBuilder().getCteBindingSetForWrqAlias(wrqAlias);
    if( bs==null ) throw new BindingNotFoundException("No BindingSet with alias '"+wrqAlias+"' found");
    return bs;
  }

  /**
   * Set the BindingSet for a user provided table expression alias
   * @param wrqAlias
   * @param bindingSet
   */
  public void addBindingSetForWrqAlias(String wrqAlias, WrqBindingSet bindingSet) {
    bindingSetForWrqAlias.put(wrqAlias, bindingSet);
    if( wrqAlias != null && wrqAlias.isEmpty() ) bindingSetForWrqAlias.put(null, bindingSet);
  }


  /**
   * Access to the current overall query
   * @return
   */
  public WrqQueryBuilder getWrqQueryBuilder() {
    return wrqQueryBuilder;
  }
  
  
  /**
   * Access to parent select, may be null
   * This is the namespace for table aliases
   * @return
   */
  public SqlFromSubSelect getParent() {
    return parent;
  }

  /**
   * Produce a new unique sql table alias for the current select scope
   * @return
   */
  public String getNextTableSqlAlias() {
    return "t"+(aliasCounter++);
  }


  public Element getSelectElem() {
    return selectElem;
  }

}
