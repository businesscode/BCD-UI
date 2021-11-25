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

import java.util.Collection;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;

import javax.xml.xpath.XPath;

import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.StandardBindingSet;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.binding.exc.BindingNotFoundException;
import de.businesscode.bcdui.binding.rel.Relation;
import de.businesscode.bcdui.wrs.load.modifier.Modifier;
import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.XPathUtils;

/**
 * Represents a virtual BindingSet resulting from the children of wrq:From, i.e. a table reference
 * A table reference can be a plain table name or joined tables factors,
 * i.e. table names, derived table expressions or references to CTE
 * Mostly it deals with the handling of wrq:Join, but for consistency we also take care for cases without
 */
public class WrqBindingSetFromTableReference extends WrqBindingSetVirtual {

  protected final XPath xp = XPathUtils.newXPathFactory().newXPath();
  protected static final long serialVersionUID = -339592266521077317L;
  // StandardBindingSet may have SubjectSettings attached, that's why we collect them here
  // TreeMap is sorted, we get the SubjectFilters in the same order as the corresponding BindingSets for easier readability
  Map<String,StandardBindingSet> sbsWithSubjectFilters = new TreeMap<>(); 
  
  // To avoid SQL injection
  static protected final Map<String,String> joinTypes = Map.of("InnerJoin", "INNER JOIN", "FullOuterJoin", "FULL OUTER JOIN", "LeftOuterJoin", "LEFT OUTER JOIN", "RightOuterJoin", "RIGHT OUTER JOIN");
  static protected final Map<String,String> connectorsTypes = Map.of("", "=", "=", "=", ">", ">", ">=", ">=", "<", "<", "<=", "<=", "!=", "<>");

  /**
   * Constructor
   * @param fromChildNl   - Children of wrq:From
   * @param currentSelect - Context
   * @param allRawBRefs   - These bRefs we need at least. Important for BindingSetGroups
   * @param selectAll     - If true, we do not know all required BindingItems, probably we have an empty select list, just add all
   * @throws Exception
   */
  public WrqBindingSetFromTableReference(NodeList fromChildNl, SqlFromSubSelect currentSelect, Set<String> allRawBRefs, boolean selectAll) throws Exception {

    super(currentSelect);

    // We are a single select which has an alias for its representingBindingSet or a join
    // In both cases we do not need an sqlAlias
    name = sqlAlias = "";

    // Loop over the table factors
    StandardNamespaceContext nsContext = StandardNamespaceContext.getInstance();
    xp.setNamespaceContext(nsContext);
    for( int fc=0; fc<fromChildNl.getLength(); fc++ ) {
      Element fromChild = (Element)fromChildNl.item(fc);
      if(!StandardNamespaceContext.WRSREQUEST_NAMESPACE.equals(fromChild.getNamespaceURI())) continue;

      switch(fromChild.getLocalName()) {

        // A (Virtual)BindingSet
        case "Ref":
        case "BindingSet":
        case "Select": {
          addTableFactor(fromChild, sqlStatementWithParams, allRawBRefs, selectAll);
          break;
        }

        // Joins
        case "Join":
        case "InnerJoin":
        case "LeftOuterJoin":
        case "RightOuterJoin":
        case "FullOuterJoin": {
          // LEFT/RIGHT INNER/OUTER JOIN
          sqlStatementWithParams.append(" ").append( joinTypes.get(fromChild.getLocalName()) ).append(" ");

          // Take care for the table expression, it must be the first Element in the wrq:Join
          Node childNode = fromChild.getFirstChild();
          while( childNode.getNodeType() != Node.ELEMENT_NODE ) childNode = childNode.getNextSibling();
          addTableFactor((Element)childNode, sqlStatementWithParams, allRawBRefs, selectAll);

          // Join condition: wrq:On nested in wrq:And/Or
          sqlStatementWithParams.append(" ON ");
          boolean conditionFound = handleJoinCondition( followingWrqElem(childNode), "AND", true );
          if( !conditionFound ) sqlStatementWithParams.append(" 1=1 ");      
          sqlStatementWithParams.append("\n");
          
          break;
        }
      }

    }
  }

  /**
   * Recursively handle join conditions
   * @param elem
   * @param connect
   * @param isFirst
   * @return
   * @throws BindingNotFoundException
   */
  protected boolean handleJoinCondition(Element elem, String connect, boolean isFirst) throws BindingNotFoundException {
    
    if( elem==null ) return false;
    
    boolean conditionFound = false;
    switch(elem.getLocalName()) {
    
      case "Or":
      case "And": {
        String newConnect = "Or".equals(elem.getLocalName()) ? "OR" : "AND";
        // We allow empty wrs:And/Or elements for convenience
        if( elem.getElementsByTagNameNS(StandardNamespaceContext.WRSREQUEST_NAMESPACE, "On").getLength() > 0 ) {
          if( !isFirst ) sqlStatementWithParams.append(" ").append(connect).append(" ");
          // Handle children
          conditionFound |= handleJoinCondition( firstWrqChildElem(elem), newConnect, true );
        }
        // Handle following siblings
        conditionFound |= handleJoinCondition( followingWrqElem(elem), connect, isFirst && !conditionFound);
        break;
      }

      case "On": {
        if( isFirst ) sqlStatementWithParams.append(" ( ");
        else sqlStatementWithParams.append(" ").append(connect).append(" ");

        // Condition
        String leftRel = elem.getAttribute("left").split("\\.")[0];
        String leftBiId = elem.getAttribute("left").split("\\.")[1];
        BindingItem leftBi = currentSelect.getBindingSetForWrqAlias(leftRel).get(leftBiId);
        String leftTableAlias = currentSelect.getBindingSetForWrqAlias(leftRel).getSqlAlias();
        sqlStatementWithParams.append(leftBi.getQColumnExpression(leftTableAlias));

        String operator = connectorsTypes.get(elem.getAttribute("op")); 
        sqlStatementWithParams.append(" ").append(operator).append(" ");

        String rightRel = elem.getAttribute("right").split("\\.")[0];
        String rightBi = elem.getAttribute("right").split("\\.")[1];
        String rightTableAlias = currentSelect.getBindingSetForWrqAlias(rightRel).getSqlAlias();
        sqlStatementWithParams.append(rightTableAlias).append(".").append(rightBi);
        
        // Handle following siblings
        handleJoinCondition( followingWrqElem(elem), connect, false );
        if( isFirst ) sqlStatementWithParams.append(" ) ");
        
        conditionFound = true;
        break;
      }
    }

    return conditionFound;
  }
  
  /**
   * Find first wrq:* child
   * @param elem
   * @return
   */
  protected Element firstWrqChildElem( Node elem ) {
    Node fc = elem.getFirstChild();
    while( fc!=null && (fc.getNodeType()!=Node.ELEMENT_NODE || !StandardNamespaceContext.WRSREQUEST_NAMESPACE.equals(fc.getNamespaceURI())) ) fc = fc.getNextSibling();
    return (Element)fc;
  }
  /**
   * Find next wrq:* sibling
   * @param elem
   * @return
   */
  protected Element followingWrqElem( Node elem ) {
    Node ns = elem.getNextSibling();
    while( ns!=null && (ns.getNodeType()!=Node.ELEMENT_NODE || !StandardNamespaceContext.WRSREQUEST_NAMESPACE.equals(ns.getNamespaceURI())) ) ns = ns.getNextSibling();
    return (Element)ns;
  }
  
  
  /**
   * Adds the BindingItems for a table factor to the virtual one we are creating
   * @param teElem
   * @param sqlStatementWithParams
   * @param allRawBRefs
   * @param selectAll
   * @throws Exception
   */
  protected void addTableFactor(Element teElem, SQLStatementWithParams sqlStatementWithParams, Set<String> allRawBRefs, boolean selectAll) throws Exception {

    final String wrqAlias = teElem.getAttribute("alias"); // Alias of table factor in Wrq XML
    final Set<String> allRawBRefsWoAlias = allRawBRefs.stream().filter(bi -> bi.indexOf(".")==-1 || bi.startsWith(wrqAlias+".") ).map(bi -> bi.indexOf(".")==-1 ? bi : bi.split("\\.")[1]).collect(Collectors.toSet());
    final WrqBindingSet bs;

    //---------------------------------------------------------------------
    // We know 3 types of table expressions
    switch(teElem.getLocalName()) {
      case "BindingSet": {
        
        StandardBindingSet sbs = (StandardBindingSet)currentSelect.getWrqQueryBuilder().getBindings().get(teElem.getTextContent(), allRawBRefsWoAlias);
        
        if(sbs.hasSubjectFilters()) sbsWithSubjectFilters.put(wrqAlias, sbs);

        // We found a bnd:BindingSet bs based on the bRefs used in the query
        // Now, bnd:SubjectFilters attached to bs may now refer to additional bRefs, which we need to know 
        // because when the table expression for bs is generated, it may need to add joined tables (from bnd:Relations) holding the corresponding columns
        // SQL where clause generator may be overwritten by a custom class "de.businesscode.bcdui.wrs.load.SubjectSettings2Sql_Custom" for example for row level security
        if (sbs.hasSubjectFilters()) {
          sbs.getSubjectFilters().enrichBindingItems(allRawBRefsWoAlias);
        }

        bs = WrqBindingSetFromStandardBindingSet.create(currentSelect, sbs);
        
        currentSelect.addBindingSetForWrqAlias(wrqAlias, bs);
        sqlStatementWithParams.append(sbs.getTableReference(allRawBRefsWoAlias, bs.getSqlAlias())).append(" ");
        break;
      } 
      case "Select": {
        SqlFromFullSelect sqlFromFulSelect = new SqlFromFullSelect(currentSelect.getWrqQueryBuilder(), currentSelect, (Element)teElem.getParentNode());
        bs = sqlFromFulSelect.getRepresentingBindingSet();
        currentSelect.addBindingSetForWrqAlias(wrqAlias, bs);
        sqlStatementWithParams.append(" ( ").append(sqlFromFulSelect.getSelectStatement()).append(" ) ").append( bs.getSqlAlias() );
        break;
      }
      case "Ref": {
        bs = currentSelect.getWrqQueryBuilder().getCteBindingSetForWrqAlias(wrqAlias);
        sqlStatementWithParams.append( bs.getSqlAlias() );
        break;
      }
      
      // Type of table expression unknown, skip it
      default: return; 
    }

    resolvedBindingSets.addAll(bs.getResolvedBindingSets());
    wrqModifiers.addAll(bs.getWrqModifiers());

    collectBindingItems(allRawBRefsWoAlias, wrqAlias, selectAll, bs);
  }

  /**
   * Collect all BindingItems requested from the underlying (maybe virtual) BindingSet
   * @param allRawBRefsWoRel
   * @param wrqAlias
   * @param selectAll
   * @param bs
   * @throws BindingException
   */
  protected void collectBindingItems(Set<String> allRawBRefsWoRel, String wrqAlias, boolean selectAll, BindingSet bs) throws BindingException {
    
    // We either are looking for a specific list allRawBRefsWoRel or we want to select all being made available from the underlying (maybe virtual) BindingSet
    Collection<String> bRefsToRetrieve;
    if( selectAll ) {
      bRefsToRetrieve = new LinkedList<String>( bs.getBindingItemNames() );
      for(Relation rel: bs.getRelations() ) bRefsToRetrieve.addAll( rel.getAllImportItemNames() );
    } else {
      bRefsToRetrieve = allRawBRefsWoRel;
    }

    for( String bRef: bRefsToRetrieve ) {
      BindingItem bi = bs.get(bRef);
      if( bi== null ) 
        throw new BindingException("BindingItem '"+bRef+"' not found for (virtual) BindingSet '"+wrqAlias+"'");
      bindingItems.put(wrqAlias+"."+bRef, bi);
    }
  }

  /**
   * Per convention our bRefs have alias.bRef, where alias may be empty
   */
  @Override
  public BindingItem get(String key) throws BindingNotFoundException {
    if(key.indexOf(".")==-1) return bindingItems.get("."+key);
    else return bindingItems.get(key);
  }

  /**
   * All Modifiers attached to StandardBindingSets used by us
   */
  @Override
  public List<Class<? extends Modifier>> getWrqModifiers() {
    return wrqModifiers;
  }

  /**
   * Return SubjectFilters to be applied for our virtual BindingSet
   * It ANDs all SubjectFilters of StandardBindingSets appearing in our join
   */
  public SQLStatementWithParams getSubjectFilterExpression(WrqInfo wrqInfo ) throws BindingException {

    // Since we have SubjectFilters for multiple BindingSets, we need different tableAlias
    SQLStatementWithParams stmt = new SQLStatementWithParams();
    String concat = "";
    for( String tableAlias: sbsWithSubjectFilters.keySet() ) {
      StandardBindingSet sbs = sbsWithSubjectFilters.get(tableAlias);
      String sqlTableAlias = currentSelect.getBindingSetForWrqAlias(tableAlias).getSqlAlias();
      stmt.append(concat).append( sbs.getSubjectFilterExpression(wrqInfo, tableAlias, sqlTableAlias) );
      concat = " AND ";
    }

    return stmt;
  }


  @Override
  public String getJdbcResourceName() {
    return currentSelect.getWrqQueryBuilder().getJdbcResourceName();
  }

}
