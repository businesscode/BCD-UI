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

import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import java.util.Set;

import javax.xml.xpath.XPathExpressionException;

import org.w3c.dom.Element;

import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.BindingSet.SECURITY_OPS;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.toolbox.Configuration.OPT_CLASSES;
import de.businesscode.bcdui.wrs.IRequestOptions;
import de.businesscode.util.jdbc.DatabaseCompatibility;

/**
 * Takes a Wrq and generates SQL from it together with the bound variables, ready to be executed
 * One instance of this class only handles one Wrq
 * TODO Features
 *  Fix issue with dummy- bRef for wrq:C[wrq:Calc]
 *  Allow Pagination and TOP-N at the same time
 *  Allow wrq:Calc in order-by, grouping
 *  Allow @aggr=none and not wrq:Calc in top-n (for UDF), fails now because cannot be separated into non-aggr and aggr part
 */
public class Wrq2Sql implements ISqlGenerator
{
  protected final IRequestOptions options;              // Everything about the request
  protected final WrqInfo wrqInfo;                      // Encapsulating knowledge about the Wrq itself
  protected final WrsPagination pagination;             // Server side pagination
  protected final BindingSet resultingBindingSet;       // Actually chosen BindingSet
  private final Class<?> sqlConditionGeneratorClass;    // optional implementation class of generator, may be null

  // Result of our work. The SQL statement as string plus the bound values for the prepared statement
  private SQLStatementWithParams selectStatement;

  private WrqGroupBy2Sql wrqGroupBy2Sql = null;

  /**
   * We are initialized for each Wrq request
   * @param options
   * @throws Exception
   */
  public Wrq2Sql(IRequestOptions options)
      throws Exception
  {
    super();
    this.options = options;
    wrqInfo = new WrqInfo( options.getRequestDoc(), options.getBindings() );

    if( wrqInfo.isEmpty() ) {
      resultingBindingSet = null;
      pagination = null;
      sqlConditionGeneratorClass = null;
      return;
    }

    // Determine effective BindingSet
    // No bRef requested at all
    if( wrqInfo.getAllRawBRefs().isEmpty() ) {
      // It is ok here to use the binding-group-unaware get(), because we do not have a list of requested binding items in this case
      resultingBindingSet = options.getBindings().get(wrqInfo.getBindingSetId());
      if( !resultingBindingSet.isAllowSelectAllColumns() )
        throw new RuntimeException("The BindingSet " + wrqInfo.getBindingSetId() +" requires list of bindings items in Select clause");
    }
    // Somewhere in the request are bRefs mentioned
    else {
      resultingBindingSet = options.getBindings().get(wrqInfo.getBindingSetId(),  wrqInfo.getAllRawBRefs());
    }

    resultingBindingSet.assurePermitted(SECURITY_OPS.read);
    sqlConditionGeneratorClass = Configuration.getClassoption(OPT_CLASSES.SUBJECTSETTINGS2SQL);
    pagination      = new WrsPagination( wrqInfo, resultingBindingSet );
  }


  /**
   * @see de.businesscode.bcdui.wrs.load.ISqlGenerator#getSelectStatement()
   */
  public SQLStatementWithParams getSelectStatement()
  {
    if (selectStatement == null && ! wrqInfo.isEmpty() ) { // No requestDocRoot indicates empty request -> return null
      try {
        if( pagination.isAvailable() )
          selectStatement = pagination.generateStatementWithPagination( this );
        else
          selectStatement = generateStatement();
      }
      catch (Exception e) {
        throw new RuntimeException("Unable to generate select statement.", e);
      }
    }
    return selectStatement;
  }


  /**
   *
   * @return
   * @throws Exception
   */
  protected SQLStatementWithParams generateStatement() throws Exception
  {
    StringBuffer sql = new StringBuffer();
    final List<Element> boundVariables = new LinkedList<Element>(); // All the host variables in correct order (same as ? in generated statement), may be from wrq:Calc or f:Filter

    sql.append( generateSelectClause( boundVariables ) );
    sql.append( generateFromClause() );
    sql.append( generateWhereClause( boundVariables ) );
    sql.append( generateGroupingClause(boundVariables) );
    sql.append( generateHavingClause(boundVariables) );
    // If the database does not allow ORDER BY together with ROLLUP and so on, we silently skip it.
    // This only affects MySql, far from perfect but needs to be enough for know
    if( !wrqGroupBy2Sql.hasTotals() || !DatabaseCompatibility.getInstance().dbOnlyKnowsWithRollup(resultingBindingSet) )
      sql.append( generateOrderClause(boundVariables) );

    return new SQLStatementWithParams(sql.toString(), boundVariables, resultingBindingSet);
  }


  /**
   * Generates 'SELECT ' plus the select list
   * @return
   */
  protected StringBuffer generateSelectClause( List<Element> boundVariables )
  {
    StringBuffer sql = new StringBuffer();
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
        String[] grpFM = DatabaseCompatibility.getInstance().getCalcFktMapping(wrqInfo.getResultingBindingSet()).get("Grouping");
        WrqBindingItem sftBi = wrqInfo.getAllBRefs().get(bi.getSkipForTotals());
        sql.append("CASE WHEN ").append(grpFM[1]).append(sftBi.getQColumnExpression()).append(grpFM[3]).append(" = 0 THEN ");
        sql.append(bi.getQColumnExpressionWithAggr()).append(" END ");
      } else
        sql.append(bi.getQColumnExpressionWithAggr()).append(" ");
      sql.append( bi.getAlias() );
      concat = ", ";
      boundVariables.addAll( bi.getBoundVariables() );
    }
    return sql;
  }


  /**
   * Generates 'FROM' and the tables with their join expression
   */
  protected StringBuffer generateFromClause() throws BindingException
  {
    StringBuffer sql = new StringBuffer();
    sql.append(" FROM ");
    Set<String> enrichedBRefs = new HashSet<String>(wrqInfo.getAllRawBRefs());

    // There may be some bRefs mentioned in the selected BindingSet, which we need here
    // the determination of that BindingSet is independent of this, because they come from that BindingSet
    // By adding them here we make sure any potentially needed join containing these is part of the access
    // add possible missing subject filter bRef to add missing joins
    // can only be done here since subject filter bRefs are only known after binding parsing
    // If the user has any-right "*" for a SubjectFilter, we do not need any join
    // only effective, if sqlConditionGeneratorClass is available
    if (sqlConditionGeneratorClass != null && resultingBindingSet.hasSubjectFilters()) {
      resultingBindingSet.getSubjectFilters().enrichBindingItems(enrichedBRefs);
    }

    sql.append(resultingBindingSet.getTableName(enrichedBRefs));
    return sql;
  }


  /**
   * Generates 'WHERE ' plus the filter
   * @return
   * @throws XPathExpressionException
   * @throws BindingException
   */
  protected StringBuffer generateWhereClause( List<Element> boundVariables ) throws XPathExpressionException, BindingException
  {
    StringBuffer sql = new StringBuffer();

    if( pagination.isMetaDataRequest() ) {
      sql.append(" WHERE 1=0 ");
      return sql;
    }

    WrqFilter2Sql wrqFilter2Sql = new WrqFilter2Sql(wrqInfo, wrqInfo.getFilterNode(), false);
    String filterClause = wrqFilter2Sql.getAsSql( boundVariables );
    String subjectSettingsClause = "";

    // Now we determine the where-clause part driven by the SubjectSettings
    if(sqlConditionGeneratorClass != null && resultingBindingSet.hasSubjectFilters()){
      SqlConditionGenerator sqlConditionGen = Configuration.getClassInstance(sqlConditionGeneratorClass, new Class<?>[]{BindingSet.class, WrqInfo.class, List.class}, resultingBindingSet, wrqInfo, boundVariables);
      subjectSettingsClause = sqlConditionGen.getCondition();
      if (subjectSettingsClause == null){
        subjectSettingsClause = "";
      }
    }

    // Now combine the two restrictions (Filter and SubjectSettings) into one WHERE clause
    if( ! filterClause.isEmpty() || ! subjectSettingsClause.isEmpty() )
      sql.append(" WHERE ");
    if( ! filterClause.isEmpty() )
      sql.append("( "+filterClause+" )");
    if( ! filterClause.isEmpty() && ! subjectSettingsClause.isEmpty() )
      sql.append(" AND ");
    if( ! subjectSettingsClause.isEmpty() )
      sql.append("( "+subjectSettingsClause+" )");

    return sql;
  }


  /**
   * Generates Grouping clause
   * @return
   * @throws Exception
   */
  protected StringBuffer generateGroupingClause(List<Element> boundVariables) throws Exception
  {
    wrqGroupBy2Sql = new WrqGroupBy2Sql( wrqInfo );
    return wrqGroupBy2Sql.generateGroupingClause(boundVariables);
  }

  /**
   * Generates Having SQL clause
   * @param boundVariables
   * @return
   * @throws XPathExpressionException
   * @throws BindingException
   */
  protected StringBuffer generateHavingClause( List<Element> boundVariables ) throws XPathExpressionException, BindingException
  {
    StringBuffer sql = new StringBuffer();
    WrqFilter2Sql wrqFilter2Sql = new WrqFilter2Sql(wrqInfo, wrqInfo.getHavingNode(), true);
    String filterClause = wrqFilter2Sql.getAsSql( boundVariables );
    if( !filterClause.isEmpty() )
      sql.append(" HAVING ").append( filterClause );
    return sql;
  }

  /**
   * Generates Order-By clause
   * @return
   */
  protected StringBuffer generateOrderClause(List<Element> boundVariables)
  {
    StringBuffer sql = new StringBuffer();

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

      int bind = dbCompat.dbOrderByNullsLast(resultingBindingSet, item.getQColumnExpressionWithAggr(), item.isOrderByDescending(), sql );
      for( ; bind > 0; bind-- )
        boundVariables.addAll( item.getBoundVariables() );
    }

    return sql;
  }

  /*
   * ISqlGenerator interface trivial functions
   */
  @Override
  public String getDbSourceName() {
    return resultingBindingSet.getDbSourceName();
  }
  @Override
  public String getRequestedBindingSetName() {
    return wrqInfo.getRequestedBindingSetName();
  }
  @Override
  public String getSelectedBindingSetName() {
    return resultingBindingSet==null ? "[Empty]" : resultingBindingSet.getName();
  }
  @Override
  public LinkedList<WrsBindingItem> getSelectedBindingItems()
      throws Exception
  {
    return wrqInfo.getWrsCOnlySelectListBRefs();
  }
  @Override
  public int getStartRow() {
    return wrqInfo.getStartRow();
  }
  @Override
  public int getMaxRows()
  {
    if(pagination.getEnd() > 0 &&  options.getMaxRows() > 0 )
      return Math.min(pagination.getEnd(), options.getMaxRows()); // Use the lower limit
    else
      return Math.max(pagination.getEnd(), options.getMaxRows()); // Only one is given
  }
  @Override
  public boolean isEmpty() {
    return (getSelectStatement() == null);
  }

  @Override
  public BindingSet getSelectedBindingSet() {
    return resultingBindingSet;
  }

}