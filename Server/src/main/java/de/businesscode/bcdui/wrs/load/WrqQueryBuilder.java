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

import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.StandardBindingSet;
import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.BindingSet.SECURITY_OPS;
import de.businesscode.bcdui.subjectsettings.SecurityException;
import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.XPathUtils;
import de.businesscode.util.jdbc.DatabaseCompatibility;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.Map;
import java.util.Set;

import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpression;

/**
 * Takes a full Wrq query, formally a "select-statement" and generates SQL from it
 * [WITH]* SELECT [UNION SELECT]* [ORDER BY]
 *
 * Children can be recursive full-selects or a sub-selects or it is an empty (no select at all) or a meta-data request (endRow==0 )
 * One instance of this class only handles one Wrq
 * 
 * NOTE: We do not check the rights, use assurePermittedOnAllResolvedBindingSets() for verifying this
 */
public class WrqQueryBuilder
{
  protected final Wrq2Sql wrq2Sql;
  protected final Bindings bindings;                                                      // We are not using Bindings.getInstance() to allow running in a batch program
  protected final Element wrqElem;                                                        // Parent wrq:WrsRequest element of our query
  protected LinkedList<WrsBindingItem> selectedBindingItems;                              // BindingItems used in select clause
  protected int aliasCounter = 1;                                                         // To create (query-) unique sql table alias
  protected Map<String,WrqBindingSet> wrqBindingSetForWrqAlias = new HashMap<>();         // Registry to associate BindingSets with user provided table expression alias
  protected final Map<String,Object> queryGlobalStorage = new HashMap<>();                // Store query-wide values
  protected Set<StandardBindingSet> resolvedBindingSets = new HashSet<>();                // Real BindingSets used in this query
  protected String jdbcResourceName;

  // Result of our work. The SQL statement as string plus the bound values for the prepared statement
  private SQLStatementWithParams selectStatement;

  /**
   * We are initialized a single wrq:WrqRequest.
   */
  public WrqQueryBuilder(Wrq2Sql wrq2Sql, Bindings bindings, Element wrqElem)
      throws Exception
  {
    super();
    this.wrq2Sql = wrq2Sql;
    this.bindings = bindings;
    this.wrqElem = wrqElem;
  }


  /**
   * Handles a "select-statement", i.e. a complete select (with-clause is currently not supported)
   * @see ISqlGenerator#getSelectStatement()
   */
  public SQLStatementWithParams getSelectStatement() {
    
    // If we created the SQLStatementWithParams already, just return it
    if( selectStatement != null ) return selectStatement;
    
    //-----------------------------------------------------------
    // If request is empty -> nothing to do
    if( wrqElem == null || wrqElem.getFirstChild() == null ) return null;

    SQLStatementWithParams stmtWP = new SQLStatementWithParams();

    //-----------------------------------------------------------
    // Handle the CTEs
    // TODO Cte must be children of With
    NodeList withClauseNodes = wrqElem.getElementsByTagNameNS(StandardNamespaceContext.WRSREQUEST_NAMESPACE, "Cte");
    try {
      // We need the database source to clarify which database dialect to apply
      // We just take the one from the first non-virtual BindingSet we find
      Element firstBindingSet = (Element)wrqElem.getElementsByTagNameNS(StandardNamespaceContext.WRSREQUEST_NAMESPACE, "BindingSet").item(0);
      BindingSet firstSbs = bindings.get(firstBindingSet.getTextContent().trim(), Collections.emptySet());
      jdbcResourceName = firstSbs.getJdbcResourceName();

      // WITH or WITH RECURSIVE depending on whether we have a self-referencing CTE for some database
      String connect = "WITH ";
      Element withNode = (Element)wrqElem.getElementsByTagNameNS(StandardNamespaceContext.WRSREQUEST_NAMESPACE, "With").item(0);
      XPath xp = XPathUtils.newXPathFactory().newXPath();
      StandardNamespaceContext nsContext = StandardNamespaceContext.getInstance();
      xp.setNamespaceContext(nsContext);
      XPathExpression bindingSetXpathExpr = xp.compile("./wrq:Cte[@alias=.//wrq:CteRef/text()]");
      boolean isRecursive = withNode != null && ((NodeList)bindingSetXpathExpr.evaluate(withNode, XPathConstants.NODESET)).getLength() > 0;
      DatabaseCompatibility dbCompat = DatabaseCompatibility.getInstance();
      if( isRecursive && dbCompat.dbNeedsRecursiveInWithClause(jdbcResourceName) ) connect += "RECURSIVE ";

      // Loop over CTEs
      for( int cte=0; cte<withClauseNodes.getLength(); cte++ ) {
        StringBuilder sql = new StringBuilder();
        sql.append(connect);
        connect = ", ";

        // Write SQL
        Element cteElem = (Element)withClauseNodes.item(cte);
        SqlFromFullSelect sqlFomFullSelect = new SqlFromFullSelect( this, null, cteElem );
        resolvedBindingSets.addAll(sqlFomFullSelect.getResolvedBindingSets());
        SQLStatementWithParams stmtWp = sqlFomFullSelect.getSelectStatement();
        
        // Alias of CTE
        sql.append( sqlFomFullSelect.getRepresentingBindingSet().getSqlAlias() );
        
        // List columns may be necessary like "WITH RECURSIVE cte1(v1, v2, v3) AS" depending on database
        if( isRecursive && dbCompat.dbNeedsColumnListForRecursiveWithClause(jdbcResourceName) ) {
          String vConnect = "(";
          for( int v=1; v<=sqlFomFullSelect.getSelectedBindingItems().size(); v++ ) {
            sql.append(vConnect).append("v"+v);
            vConnect = ", ";
          }
          sql.append(")");
        }

        // The select itself
        sql.append(" AS ( ");
        sql.append( stmtWp.getStatement() );
        sql.append(" ) ");

        // Append this whole CTE
        stmtWP.append( sql.toString(), stmtWp.getFilterItems(), sqlFomFullSelect.getRepresentingBindingSet() );

        // Register a virtual BindingSet for this CTE for our alias
        WrqBindingSet ssBs = sqlFomFullSelect.getRepresentingBindingSet();
        wrqBindingSetForWrqAlias.put(cteElem.getAttribute("alias"), ssBs);
      }
    } catch (Exception e) {
      throw new RuntimeException(e);
    }

    //-----------------------------------------------------------
    // Now take care for the Full-SELECT after the CTEs
    try {
      SqlFromFullSelect sqlFomFullSelect = new SqlFromFullSelect( this, null, wrqElem );
      resolvedBindingSets.addAll(sqlFomFullSelect.getResolvedBindingSets());
      stmtWP.append( sqlFomFullSelect.getSelectStatement() );
      selectStatement = stmtWP; // TODO gs2u
      selectedBindingItems = sqlFomFullSelect.getSelectedBindingItems();
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
    
    return selectStatement;
  }

  /**
   * All BindingItems ever used in our query. 
   * Needed in cases when the selected BindingSet depends on it, which is in only the case for a single plain SELECT.
   * @return
   * @throws Exception
   */
  public LinkedList<WrsBindingItem> getSelectedBindingItems() throws Exception
  {
    return selectedBindingItems;
  }
    
  /**
   * Get the BindingSet for a user provided table expression alias
   * @param wrqAlias
   * @return
   */
  public WrqBindingSet getCteBindingSetForWrqAlias(String wrqAlias) {
    return wrqBindingSetForWrqAlias.get(wrqAlias);
  }

  /**
   * Set the BindingSet for a user provided table expression alias
   * @param wrqAlias
   * @param bindingSet
   */
  public void addCteBindingSetForWrqAlias(String wrqAlias, WrqBindingSet bindingSet) {
    wrqBindingSetForWrqAlias.put(wrqAlias, bindingSet);
    if( wrqAlias != null && wrqAlias.isEmpty() ) wrqBindingSetForWrqAlias.put(null, bindingSet);
  }
  
  /**
   * Set the BindingSet for a user provided table expression alias
   * @param wrqAlias
   */
  public boolean hasCteBindingSetForWrqAlias(String wrqAlias) {
    return wrqBindingSetForWrqAlias.containsKey(wrqAlias);
  }

  /**
   * Helps us use it in batch environments when not using Bindings.getInstance()
   * @return
   */
  public Bindings getBindings() {
    return bindings;
  }
  
  public int getMaxRows() {
    return wrq2Sql.getMaxRows();
  }

  /**
   * The predefined BindingStets from WEB-INF/bindings we determined for this query, including BindingGroup resolution
   * @return
   */
  public Set<StandardBindingSet> getResolvedBindingSets() {
    return resolvedBindingSets;
  }
  
  /**
   * Allows storing a query-wide value
   * @param key
   * @return
   */
  public Object getFromQueryGlobalStorage( String key ) {
    return queryGlobalStorage.get(key);
  }

  /**
   * Allows storing a query-wide value
   * @param key
   * @return
   */
  public Object addToQueryGlobalStorage( String key, Object value ) {
    return queryGlobalStorage.put(key, value);
  }

  /**
   * Make sure that all BindingSets we touch are allowed to be used for the current Principal for the operation
   * @param operation
   * @throws SecurityException
   */
  public void assurePermittedOnAllResolvedBindingSets(SECURITY_OPS operation) throws SecurityException {
    getSelectStatement(); // Make sure we know our implementing BindingSets for the loop
    for( StandardBindingSet bs: resolvedBindingSets ) bs.assurePermitted(operation);
  }

  /**
   * Produce a new unique sql table alias for the current select scope
   * @return
   */
  public String getNextCteTableSqlAlias() {
    return "cte"+(aliasCounter++);
  }

  /**
   * The database source name our query goes to
   * @return
   */
  public String getJdbcResourceName() {
    return jdbcResourceName;
  }
  
}

