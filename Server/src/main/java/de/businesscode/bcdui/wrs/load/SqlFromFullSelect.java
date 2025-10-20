/*
  Copyright 2010-2025 BusinessCode GmbH, Germany

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

import de.businesscode.bcdui.binding.StandardBindingSet;
import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.XPathUtils;
import de.businesscode.util.jdbc.DatabaseCompatibility;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpression;

import java.util.HashSet;
import java.util.LinkedList;
import java.util.Map;
import java.util.Set;
import java.util.stream.IntStream;

/**
 * Mainly handles SET operators like UNION and calls SqlFromSubSelect for each select.
 * Takes the parent node of SELECTs, containing a single Select or Joined Selects, (formally a "full-select") in Wrq format
 * and generates SQL from it together with the bound variables, ready to be executed
 */
public class SqlFromFullSelect
{
  protected final Element fullSelectParentElem;
  protected final WrqQueryBuilder wrqQueryBuilder;
  protected LinkedList<WrsBindingItem> selectedBindingItems;
  protected WrqBindingSet representingBindingSet;
  protected Set<StandardBindingSet> resolvedBindingSets = new HashSet<>();
  protected final SqlFromSubSelect parent;

  // Result of our work. The SQL statement as string plus the bound values for the prepared statement
  private SQLStatementWithParams selectStatement;

  /**
   * We are initialized for a full-select (SELECTs connected with SET operators).
   * @param fullSelectParent
   * @param wrqQueryBuilder
   * @throws Exception
   */
  public SqlFromFullSelect(WrqQueryBuilder wrqQueryBuilder, SqlFromSubSelect parent, Element fullSelectParent)
      throws Exception
  {
    super();
    
    this.fullSelectParentElem = fullSelectParent;
    this.wrqQueryBuilder = wrqQueryBuilder;
    this.parent = parent;

    createSelectStatement();
  }


  /**
   * Handles a "full-select", i.e., SELECT [ UNION SELECT ]* [ ORDER BY ]
   * @throws Exception 
   */
  protected SQLStatementWithParams createSelectStatement() throws Exception {
    
    // Loop over the SELECTs and the SET connectors
    selectStatement = new SQLStatementWithParams();
    Map<String,String> setOps = DatabaseCompatibility.getInstance().getSetOperators();

    // In case we have SET operators, we put the SELECTs into () because some databases have syntax issues otherwise in some cases like pagination
    NodeList cEs = fullSelectParentElem.getChildNodes();
    boolean hasSetOps = IntStream.range(0, cEs.getLength()).anyMatch( e -> setOps.containsKey(cEs.item(e).getLocalName()) );

    // Walk over SELECT UNION SELECT...
    for( Node childElement = fullSelectParentElem.getFirstChild(); childElement != null; childElement = childElement.getNextSibling() ) 
    {
      // We only react on elements of the right namespace
      if( childElement.getNodeType() != Node.ELEMENT_NODE || ! StandardNamespaceContext.WRSREQUEST_NAMESPACE.equals( childElement.getNamespaceURI() ) ) {
        continue;
      }

      // Can be a SET operator like wrq:Union
      String setOp = setOps.get(childElement.getLocalName());
      if( setOp != null ) {
        selectStatement.append(" "+setOp+" ");
      } 

      // Can be a wrq:Select
      else if( "Select".equals( childElement.getLocalName()) ) {
        SqlFromSubSelect sqlFromSubSelect = SqlFromSubSelect.getInstance(wrqQueryBuilder, parent, (Element)childElement);
        resolvedBindingSets.addAll( sqlFromSubSelect.getResolvedBindingSets() );
        if( hasSetOps ) selectStatement.append(" ( ");
        selectStatement.append( sqlFromSubSelect.getSelectStatement() );
        if( hasSetOps ) selectStatement.append(" ) ");
        // In the case of unions, the first SELECT does define which BindingItems are representing the full select
        if( selectedBindingItems == null ) selectedBindingItems = sqlFromSubSelect.getSelectedBindingItems();
        if( representingBindingSet == null ) representingBindingSet = sqlFromSubSelect.getRepresentingBindingSet();
      }

      // Can be the final wrq:Ordering, applied at the end of select with SET operators, not on an individual selects
      else if( "Ordering".equals( childElement.getLocalName()) ) {
        XPath xp = XPathUtils.newXPath();
        XPathExpression orderingCXpathExpr = xp.compile("wrq:C");
        NodeList wrqCs = (NodeList)orderingCXpathExpr.evaluate(childElement, XPathConstants.NODESET);
        String concat = " ORDER BY ";
        for(int i = 0; i < wrqCs.getLength(); i++ ) {
          Element wrqC = (Element)wrqCs.item(i);
          selectStatement.append( concat + "v"+Integer.parseInt(wrqC.getAttribute("pos")) ); // Parse int to avoid injection
          if("desc".equals(wrqC.getAttribute("order"))) selectStatement.append(" desc"); // Avoid injection
          concat = ", ";
        }
      }

    } // Loop over all parts of the full-select

    return selectStatement;
  }

  public SQLStatementWithParams getSelectStatement() {
    return selectStatement;
  }

  public LinkedList<WrsBindingItem> getSelectedBindingItems() {
    return selectedBindingItems;
  }

  public WrqBindingSet getRepresentingBindingSet() {
    return representingBindingSet;
  }


  public Set<StandardBindingSet> getResolvedBindingSets() {
    return resolvedBindingSets;
  }

}