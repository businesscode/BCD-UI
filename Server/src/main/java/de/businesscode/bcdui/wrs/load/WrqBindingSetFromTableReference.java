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

import java.util.*;
import java.util.stream.Collectors;

import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpression;

import de.businesscode.util.jdbc.DatabaseCompatibility;

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
 * This class allows using the result of JOINed table references (BindingSets, sub-selects in joins) like a BindingSet
 * Represents a virtual BindingSet resulting from the children of wrq:From, i.e., is a table reference
 * A table reference can be a plain table name or joined tables factors,
 * i.e. table names, derived table expressions or references to CTE
 * Mostly it deals with the handling of wrq:Join, but for consistency it also takes care of cases without
 */
public class WrqBindingSetFromTableReference extends WrqBindingSetVirtual {

  protected static final long serialVersionUID = -339592266521077317L;

  protected Map<String, BindingItem> importedBindingItems = new LinkedHashMap<String, BindingItem>(new HashMap<String, BindingItem>());
  protected boolean isAllowSelectAllColumns = true; 

  // StandardBindingSet may have SubjectSettings attached, that's why we collect them here
  // TreeMap is sorted, we get the SubjectFilters in the same order as the corresponding BindingSets for easier readability
  Map<String,StandardBindingSet> sbsWithSubjectFilters = new TreeMap<>();

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

    // We are a single Select, which has an alias for its representingBindingSet or a join
    // In both cases we do not need an sqlAlias
    name = sqlAlias = "";

    // allRawBRefs contains all bRefs referenced from the Select to which we belong to
    // But there can be external references in joins and sub-selects, which we add here
    // It may be that a bRef is only used ever in the join. In that case if it comes from a Relation it would be missing
    // when getting the table reference from the StandardBindingSet below. So we add all bRefs from the ON clause here
    Set<String> allRawBRefsExtended = new HashSet<>();
    NodeList onNl = ((Element)fromChildNl.item(0).getParentNode()).getElementsByTagNameNS(StandardNamespaceContext.WRSREQUEST_NAMESPACE, "On");
    for( int on=0; on<onNl.getLength(); on++ ) {
      Element onElem = (Element)onNl.item(on);
      allRawBRefsExtended.add( onElem.getAttribute("left") );
      allRawBRefsExtended.add( onElem.getAttribute("right") );
    }

    // Also, we may have BindingItems being referenced from correlated sub-selects and we need to make them available
    // We look for f:Expression/@bRefs where the BindingSet/CteRef does not have the same alias as we, because they then win,
    // and then below filter that the bRefs have the same alias as we do
    String ourAlias = currentSelect.getSelectElem().getAttribute("alias");
    String cnd = ourAlias.isEmpty() ? "@alias" : "not(@alias='"+ourAlias+"')";
    String xPath = ".//f:Expression[ancestor::wrq:Select[1]/wrq:From/*["+cnd+"]]/@*[local-name()='bRef' or local-name()='bRef2'] | .//f:Expression[ancestor::wrq:Select[1]/wrq:From/*["+cnd+"]]//wrq:ValueRef//@idRef";
    XPathExpression corrSubSelBrefsXpath = XPathUtils.newXPath().compile(xPath);
    NodeList correlatedSubSelNl = (NodeList)corrSubSelBrefsXpath.evaluate(currentSelect.getSelectElem(), XPathConstants.NODESET);
    for( int cs=0; cs < correlatedSubSelNl.getLength(); cs++ ) {
      String v = correlatedSubSelNl.item(cs).getNodeValue();
      String wrqTableAlias = v.contains(".") ? v.split("\\.")[0] : "";
      if( wrqTableAlias.equals(ourAlias) ) allRawBRefsExtended.add( v );
    }
    
    allRawBRefsExtended.addAll(allRawBRefs);

    // Loop over the table factors
    for( int fc=0; fc<fromChildNl.getLength(); fc++ ) {
      Element fromChild = (Element)fromChildNl.item(fc);
      if(!StandardNamespaceContext.WRSREQUEST_NAMESPACE.equals(fromChild.getNamespaceURI())) continue;

      switch(fromChild.getLocalName()) {

        // A (Virtual)BindingSet
        case "CteRef":
        case "BindingSet":
        case "Select": {
          addTableFactor(fromChild, sqlStatementWithParams, allRawBRefsExtended, selectAll);
          break;
        }

        // Joins
        case "Join": case "InnerJoin": case "LeftOuterJoin": case "RightOuterJoin": case "FullOuterJoin": case "CrossJoin":
        case "InnerJoinLateral": case "LeftOuterJoinLateral": case "CrossJoinLateral" :
        case "CrossApply": case "OuterApply": {
          // LEFT/RIGHT INNER/OUTER JOIN including LATERAL/APPLY
          String joinOp = DatabaseCompatibility.getInstance().getJoinOperator(getJdbcResourceName(), fromChild.getLocalName());
          sqlStatementWithParams.append(" ").append( joinOp ).append(" ");

          // Take care of the table expression, it must be the first Element in the wrq:Join
          Node childNode = fromChild.getFirstChild();
          while( childNode.getNodeType() != Node.ELEMENT_NODE ) childNode = childNode.getNextSibling();
          addTableFactor((Element)childNode, sqlStatementWithParams, allRawBRefsExtended, selectAll);

          // Join condition: wrq:On nested in wrq:And/Or
          String joinCondition = handleJoinCondition( null, followingWrqElem(childNode), "AND" );
          if( ! joinCondition.isEmpty() ) {
            sqlStatementWithParams.append(" ON ").append(joinCondition);
          }

          break;
        }
      }

    }
  }

  /**
   * Recursively handle join conditions
   * @param joinStmt
   * @param elem
   * @param connect
   * @return
   * @throws BindingNotFoundException
   */
  protected String handleJoinCondition(SQLStatementWithParams joinStmt, Element elem, String connect) throws BindingNotFoundException {
    
    if( elem==null ) return "";
    
    if( joinStmt == null ) joinStmt = new SQLStatementWithParams();
    switch(elem.getLocalName()) {
    
      case "Or":
      case "And": {
        String newConnect = "Or".equals(elem.getLocalName()) ? "OR" : "AND";
        // We allow empty wrs:And/Or elements for convenience
        if( elem.getElementsByTagNameNS(StandardNamespaceContext.WRSREQUEST_NAMESPACE, "On").getLength() > 0 ) {
          if( !joinStmt.getStatement().isEmpty() ) joinStmt.append(" ").append(connect).append(" ");
          // Handle children
          handleJoinCondition(joinStmt, firstWrqChildElem(elem), newConnect );
        }
        // Handle following siblings
        handleJoinCondition(joinStmt, followingWrqElem(elem), connect);
        break;
      }

      case "On": {
        if( ! joinStmt.getStatement().isEmpty() ) joinStmt.append(" ").append(connect).append(" ");

        // Condition
        String left = elem.getAttribute("left");
        BindingItem leftBi = currentSelect.resolveBindingItemFromScope(left);
        String leftWrqTableAlias = left.contains(".") ? left.split("\\.")[0] : "";
        String leftSqlTableAlias = currentSelect.resolveBindingSetFromScope(leftWrqTableAlias).getSqlAlias();;
        joinStmt.append(leftBi.getQColumnExpression(leftSqlTableAlias));

        String operator = connectorsTypes.get(elem.getAttribute("op")); 
        joinStmt.append(" ").append(operator).append(" ");

        String right = elem.getAttribute("right");
        BindingItem rightBi = currentSelect.resolveBindingItemFromScope(right);
        String rightWrqTableAlias = right.contains(".") ? right.split("\\.")[0] : "";
        String rightSqlTableAlias = currentSelect.resolveBindingSetFromScope(rightWrqTableAlias).getSqlAlias();
        joinStmt.append(rightBi.getQColumnExpression(rightSqlTableAlias));
        
        // Handle following siblings
        handleJoinCondition(joinStmt, followingWrqElem(elem), connect);
        
        break;
      }
    }

    return joinStmt.toString();
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
    final Set<String> allRawBRefsWoAlias = allRawBRefs.stream()
        .filter( bRef -> bRef.contains(".") ? bRef.split("\\.")[0].equals(wrqAlias) : wrqAlias.isBlank() )
//        .filter( bRef -> ((bRef.indexOf(".")==-1 && wrqAlias.isEmpty())) || bRef.startsWith(wrqAlias+".") ) // Keep only bRef with our (potentially empty) wrqAlias
        .map( bRef -> bRef.indexOf(".")==-1 ? bRef : bRef.split("\\.")[1] )                                 // Remove the alias
        .collect(Collectors.toSet());
    final WrqBindingSet bs;

    //---------------------------------------------------------------------
    // We know 3 types of table expressions
    switch(teElem.getLocalName()) {
      case "BindingSet": {
        
        // Because of BindingGroups, we need a list of BindingItems we ask for.
        // Note: This prevents us from allowing to resolve 2 alias-free bRefs from different BindingSets, even if they are unique by name
        // Otherwise we would not know for which subset to as which of the two BindingSets
        StandardBindingSet sbs = currentSelect.getWrqQueryBuilder().getBindings().get(teElem.getTextContent(), allRawBRefsWoAlias);
        
        if(sbs.hasSubjectFilters()) sbsWithSubjectFilters.put(wrqAlias, sbs);
        
        isAllowSelectAllColumns &= sbs.isAllowSelectAllColumns();

        // We found a bnd:BindingSet bs based on the bRefs used in the query
        // Now, bnd:SubjectFilters attached to bs may now refer to additional bRefs, which we need to know 
        // because when the table expression for bs is generated, it may need to add joined tables (from bnd:Relations) holding the corresponding columns
        // SQL where clause generator may be overwritten by a custom class "de.businesscode.bcdui.wrs.load.SubjectSettings2Sql_Custom" for example for row level security
        if (sbs.hasSubjectFilters()) {
          sbs.getSubjectFilters().enrichBindingItems(allRawBRefsWoAlias);
        }

        bs = WrqBindingSetRef.create(currentSelect, sbs);
        
        currentSelect.addBindingSetForWrqAlias(wrqAlias, bs);
        sqlStatementWithParams.append(sbs.getTableReference(allRawBRefsWoAlias, bs.getSqlAlias())).append(" ");
        break;
      } 
      case "Select": {
        SqlFromSubSelect sqlFromSubSelect = new SqlFromSubSelect(currentSelect.getWrqQueryBuilder(), currentSelect, (Element)teElem);
        bs = sqlFromSubSelect.getRepresentingBindingSet();
        currentSelect.addBindingSetForWrqAlias(wrqAlias, bs);
        sqlStatementWithParams.append(" ( ").append(sqlFromSubSelect.getSelectStatement()).append(" ) ").append( bs.getSqlAlias() );
        break;
      }
      case "CteRef": {
        WrqBindingSet cteBs = currentSelect.getWrqQueryBuilder().getCteBindingSetForWrqAlias(teElem.getTextContent());
        bs = WrqBindingSetRef.create(currentSelect, cteBs);
        currentSelect.addBindingSetForWrqAlias(wrqAlias, bs);
        sqlStatementWithParams.append( cteBs.getSqlAlias() ).append(" ").append( bs.getSqlAlias() );
        break;
      }

      // Type of table expression unknown, skip it
      // TODO allow Set operators, i.e. FullSelects as parts of joins
      default: return; 
    }

    resolvedBindingSets.addAll(bs.getResolvedBindingSets());
    wrqModifiers.addAll(bs.getWrqModifiers());

    collectBindingItems(currentSelect, teElem, allRawBRefsWoAlias, wrqAlias, selectAll, bs);
  }

  /**
   * Collect all BindingItems requested from the underlying (maybe virtual) BindingSet
   * @param allRawBRefsWoRel
   * @param wrqAlias
   * @param selectAll
   * @param bs
   * @throws BindingException
   */
  protected void collectBindingItems(SqlFromSubSelect selectContext, Element teElem, Set<String> allRawBRefsWoRel, String wrqAlias, boolean selectAll, BindingSet bs) throws BindingException {
    
    // We either are looking for a specific list allRawBRefsWoRel or we want to select all being made available from the underlying (maybe virtual) BindingSet
    Collection<String> bRefsToRetrieve;
    if( selectAll ) {
      bRefsToRetrieve = new LinkedList<String>( bs.getBindingItemNames() );
      for(Relation rel: bs.getRelations() ) bRefsToRetrieve.addAll( rel.getAllImportItemNames() );
    } else {
      bRefsToRetrieve = allRawBRefsWoRel;
    }

    for( String bRef: bRefsToRetrieve ) {
      BindingItem bi = selectContext.resolveBindingSetFromScope(wrqAlias).get(bRef);
      if( bi == null ) {
        // Give some details in debug output about the location of the issue
        List<String> trace = new ArrayList<>();
        for( Node n = teElem; n != null && n instanceof Element; n = n.getParentNode() ) trace.add( 0, n.getNodeName() );
        throw new BindingException("BindingItem '"+bRef+"' not found for (virtual) BindingSet with wrq alias '"+wrqAlias+"' at "+String.join(" -> ", trace ));
      }
      if( bs.getBindingItemNames().contains(bi.getId()) )
        bindingItems.put(wrqAlias+"."+bRef, bi);
      else
        importedBindingItems.put(wrqAlias+"."+bRef, bi);
    }
  }

  /**
   * Per convention our bRefs have alias.bRef, where alias may be empty
   */
  @Override
  public BindingItem get(String key) throws BindingNotFoundException {
    String qKey = key.indexOf(".")==-1 ? "."+key : key;
    if( bindingItems.get(qKey)!=null ) return bindingItems.get(qKey); 
    else return importedBindingItems.get(qKey);
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
      String sqlTableAlias = currentSelect.resolveBindingSetFromScope(tableAlias).getSqlAlias();
      stmt.append(concat).append( sbs.getSubjectFilterExpression(wrqInfo, tableAlias, sqlTableAlias) );
      concat = " AND ";
    }

    return stmt;
  }

  @Override
  public boolean isAllowSelectAllColumns() {
    return isAllowSelectAllColumns;
  }


  @Override
  public String getJdbcResourceName() {
    return currentSelect.getWrqQueryBuilder().getJdbcResourceName();
  }

}
