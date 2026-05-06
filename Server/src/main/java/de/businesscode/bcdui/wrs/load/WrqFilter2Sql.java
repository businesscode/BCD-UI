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

import java.sql.Types;
import java.util.*;

import javax.xml.xpath.XPathExpressionException;

import de.businesscode.bcdui.binding.BindingUtils;
import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.jdbc.DatabaseCompatibility;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import de.businesscode.bcdui.binding.exc.BindingNotFoundException;
import de.businesscode.bcdui.binding.write.CustomJdbcTypeSupport;

/**
 * Parses a f:Filter expression and returns the SQL Where expression
 * For older change history, see WrsSqlGenerator
 */
public class WrqFilter2Sql
{
  private final WrqInfo wrqInfo;
  private final Element filterElement; // f:Filter or wrq:Having
  private final boolean useAggr;       // true for having, using aggregated expressions
  private final Map<String,WrqBindingItem> allBindingItems; // All BindingItems in scope, including outer scope

  public WrqFilter2Sql(WrqInfo wrqInfo, Element root, boolean useAggr) throws XPathExpressionException
  {
    this.filterElement = root;
    this.wrqInfo       = wrqInfo;
    this.useAggr       = useAggr;
    this.allBindingItems = wrqInfo.getAllBRefs();
    this.allBindingItems.putAll( wrqInfo.getAllOuterContextBRefs() );
  }

  public String getAsSql(List<Element> elementList) throws Exception
  {
    return generateWhereClause(filterElement, " AND ", false, elementList);
  }

  /**
   * Generate a SQL WHERE clause from the Filter element
   * @param element     Filter root element
   * @param connective  AND or OR
   * @param needsBracket
   * @param elementList collection of actual values to be bound
   * @return
   * @throws BindingNotFoundException
   */
  private String generateWhereClause(Element element, String connective, boolean needsBracket, List<Element> elementList) throws Exception
  {
    if( element==null || element.getChildNodes().getLength()==0 )
      return "";

    NodeList childElements = element.getChildNodes();
    StringBuilder result = new StringBuilder();
    int clauseCount = 0;

    /*
     * Determine if there are any ">= and <=" constraints.
     */
    Map<String, Element[]> betweenClauses = new HashMap<String, Element[]>();
    Set<Element> elementsForBetweenClauses = new HashSet<Element>();
    if (connective.equals("AND")) {
      for (int i = 0; i < childElements.getLength(); ++i) {
        if (childElements.item(i).getNodeType() == Node.ELEMENT_NODE) {
          Element child = (Element) childElements.item(i);
          String bRef = child.getAttribute("bRef");
          String op = child.getAttribute("op");
          if (bRef != null & bRef.length() > 0 && ("<=".equals(op) || ">=".equals(op))) {
            String value = child.getAttribute("value");
            Element[] betweenParameters = betweenClauses.get(bRef);
            if (betweenParameters == null) {
              betweenParameters = new Element[2];
              betweenClauses.put(bRef, betweenParameters);
            }
            if ("<=".equals(op)) {
              betweenParameters[1] = betweenParameters[1] == null || betweenParameters[1].getAttribute("value").compareTo(value) > 0 ? child : betweenParameters[1];
            }
            else {
              betweenParameters[0] = betweenParameters[0] == null || betweenParameters[0].getAttribute("value").compareTo(value) < 0 ? child : betweenParameters[0];
            }
          }
        }
      }
      for (Map.Entry<String, Element[]> betweenClause : betweenClauses.entrySet()) {
        if (betweenClause.getValue()[0] != null && betweenClause.getValue()[1] != null) {
          if (++clauseCount > 1)
            result.append(" " + connective + " ");
          result.append(generateBetweenExpression(betweenClause.getValue()[0], betweenClause.getValue()[1], elementList));
          elementsForBetweenClauses.add(betweenClause.getValue()[0]);
          elementsForBetweenClauses.add(betweenClause.getValue()[1]);
        }
      }
    }

    /*
     * Generate the SQL clause from the expression elements.
     */
    for (int i = 0; i < childElements.getLength(); ++i) {
      if (childElements.item(i).getNodeType() == Node.ELEMENT_NODE) {
        Element child = (Element) childElements.item(i);
        if (elementsForBetweenClauses.contains(child))
          continue;
        String subClause = null;
        String newConnective = connectiveMapping.get(child.getLocalName().toLowerCase());
        if (newConnective == null) {
          subClause = generateSingleColumnExpression(wrqInfo, child, elementList, element.getOwnerDocument(), useAggr);
        }
        else {
          subClause = generateWhereClause(child, newConnective, !connective.equalsIgnoreCase(newConnective), elementList);
        }
        if (!subClause.isEmpty()) {
          if (++clauseCount > 1)
            result.append(" " + connective + " ");
          result.append(subClause);
        }
      }
    }

    if (needsBracket && result.length()!=0 ) {
      return "(" + result + ")";
    }
    return result.toString();
  }

  /**
   * Helper for WHERE clause generation
   * @param itemFrom
   * @param itemTo
   * @param elementList
   * @return
   * @throws BindingNotFoundException
   */
  private String generateBetweenExpression(Element itemFrom, Element itemTo, List<Element> elementList) throws BindingNotFoundException {
    WrqBindingItem bindingItem = allBindingItems.get(itemFrom.getAttribute("bRef"));
    elementList.add(itemFrom);
    elementList.add(itemTo);
    return bindingItem.getQColumnExpression(false) + " BETWEEN ? AND ?";
  }

  /**
   * Helper for WHERE clause generation
   * ignoreCase is only allowed for dimensions and non-numeric types
   * TODO If a non-dim bindingItem is used multiple times with different aggr in the select list, the aggr of the last one wins
   * This limitation could be removed by allowing to overwrite the aggr at the having-filter expression, for example
   * @param wrqInfo
   * @param item
   * @param boundVariables
   * @param ownerDocument
   * @param useAggr
   * @return
   * @throws Exception
   */
  protected String generateSingleColumnExpression(WrqInfo wrqInfo, Element item, List<Element> boundVariables, Document ownerDocument, boolean useAggr)
      throws Exception
  {
    String bRef = item.getAttribute("bRef");
    Element calcElement = (Element)item.getElementsByTagNameNS(StandardNamespaceContext.WRSREQUEST_NAMESPACE, "Calc").item(0);

    // Only wrq:Calc or @bRef @op wrq:Calc
    String calcSql = null;
    if( calcElement != null ) {
      WrqCalc2Sql calc = WrqCalc2Sql.getInstance(wrqInfo);
      List<String> wrqTableAlias = new LinkedList<>();
      calcSql = " ( " + calc.getWrqCalcAsSql(calcElement, boundVariables, false, Types.VARCHAR, wrqTableAlias) + " ) ";
      List<String> sCE = BindingUtils.splitColumnExpression(calcSql, false, wrqInfo.getResultingBindingSet());
      List<String> sqlTableAlias = new LinkedList<>();
      for( String qA: wrqTableAlias ) sqlTableAlias.add( wrqInfo.getCurrentSelect().resolveBindingSetFromScope(qA).getSqlAlias() );
      String expr = BindingUtils.addTableAlias(sCE, sqlTableAlias);

      // Only wrq:Calc
      if( bRef.isEmpty() ) return calcSql;
    }

    // We have a @bRef
    // If the binding item appears twice, we don't know which one to use and here we get the last one returned
    // This does impact the aggr being used below
    // Take care for binding items which where replaced by virtual binding item by giving them a wrc:Calc in the select clause
    if( wrqInfo.getVirtualBRefs().containsKey(bRef) ) // TODO also in grouping set
      bRef = wrqInfo.getVirtualBRefs().get(bRef);
    WrqBindingItem bindingItem = allBindingItems.get(bRef);
    boundVariables.addAll( bindingItem.getBoundVariables() );

    // Default op is '='
    String op = item.getAttribute("op");
    String operator = "=";
    if (op != null) {
      operator = operatorMapping.get(op.trim().toLowerCase());
      if (operator == null)
        operator = "=";
    }

    boolean ignoreCase = "true".equals(item.getAttribute("ic")) && !bindingItem.isNumeric();
    boolean isLike = "LIKE".equals(operator) || "NOT LIKE".equals(operator);
    String colExprPostfix = "";

    //-----------------------------
    // @bRef2 or wrq:Calc, i.e. no @value
        
    // @bRef @op bRef2
    if( item.hasAttribute("bRef2") ) {
      String bRef2 = item.getAttribute("bRef2");
      WrqBindingItem bindingItem2 = allBindingItems.get(bRef2);
      boundVariables.addAll(bindingItem2.getBoundVariables());

      String itemExpr = bindingItem.getQColumnExpression();
      if(ignoreCase) itemExpr = "lower(" + itemExpr + ")";
      String item2Expr = bindingItem2.getQColumnExpression();
      if(ignoreCase) item2Expr = "lower(" + item2Expr + ")";
      return itemExpr + " " + operator + " " + item2Expr;
    }
    // @bRef @op wrq:Calc
    else if( calcSql != null ) {
      String itemExpr = bindingItem.getQColumnExpression();
      if(ignoreCase) itemExpr = "lower(" + itemExpr + ")";
      if(ignoreCase) calcSql = "lower(" + calcSql + ")";
      return itemExpr + " " + operator + " " + calcSql + " ";
    }
    
    //-----------------------------
    // @value (No @bRef2, no wrq:Calc)

    // No @value -> IS (NOT) NULL
    if( !item.hasAttribute("value") || "".equals(item.getAttribute("value")) ) {
      String nnOp = "=".equals(operator) ? "IS NULL" : "IS NOT NULL";
      return bindingItem.getQColumnExpression(false) + " " + nnOp;
    }

    // In some cases we need to modify the incoming value
    Element valueElement;
    if( ignoreCase || isLike ) {
      valueElement = ownerDocument.createElement("ChangedValueElement");
      valueElement.setAttribute("value", item.getAttribute("value"));
    } else
      valueElement = item;

    // @bRef @op @value
    String colExpr = null;
    if( ignoreCase ) {
      valueElement.setAttribute("value", valueElement.getAttribute("value").toLowerCase() );
      colExpr = "lower("+bindingItem.getQColumnExpression(false)+")";
    } else if( useAggr && ! "none".equals(bindingItem.getAttribute("aggr")) ) {
      // If we do having for example, we are required to work on aggregated level for non-dims
      colExpr = bindingItem.getQColumnExpressionWithAggr(! wrqInfo.getGroupingBRefs().contains(bindingItem.getId()));
    } else {
      colExpr = bindingItem.getQColumnExpression(false);
    }

    // IN operator needs a list of ?
    if( "IN".equals(operator) || "NOT IN".equals(operator) ) {
      String[] values = valueElement.getAttribute("value").split(",");
      StringBuffer qm = new StringBuffer("(");
      String pqm = CustomJdbcTypeSupport.wrapTypeCast(bindingItem, "?");
      for( int i = 0; i<values.length; i++ ) {
        qm.append( i<values.length-1 ? (pqm + ",") : pqm);
        Element e = ownerDocument.createElement("InElement");
        e.setAttribute("bRef",  bindingItem.getId());
        e.setAttribute("value", ignoreCase ? values[i].toLowerCase() : values[i]);
        boundVariables.add(e);
      }
      return colExpr + " "+operator+" " + qm.toString() + ")";
    }

    // Our like operator has '*' as wild card, translate it here
    else if(isLike) {
      String value = valueElement.getAttribute("value");
      value = value.replace("\\", "\\\\");
      value = value.replace("_", "\\_");
      value = value.replace("%", "\\%");
      value = value.replace("*", "%");
      valueElement.setAttribute("value", value );
      colExprPostfix = DatabaseCompatibility.getInstance().dbLikeEscapeBackslash(wrqInfo.getJdbcResourceName());
    }

    // Support of BITAND operation -> BITAND( col, value) > 0
    else if ("BITAND".equals(operator)){
      String value = valueElement.getAttribute("value");
      Element e = ownerDocument.createElement("BitAndValue");
      e.setAttribute("value", value );
      boundVariables.add(e);
      return operator+"(" + colExpr + ",? ) > 0 ";
    }

    // Spatial operators. parameter is expected as WKT.
    // Implementation differences are handled by DatabaseCompatibility
    else if ("SpatContains".equals(operator) || "SpatContained".equals(operator) || "SpatIntersects".equals(operator)) {
      final Map<String, String[]> fctMapping = DatabaseCompatibility.getInstance().getSpatialFktMapping(wrqInfo.getJdbcResourceName());
      StringBuffer param = new StringBuffer().append(fctMapping.get("GeoFromWkt")[0]).append(" ? ").append(fctMapping.get("GeoFromWkt")[2]);
      StringBuffer sql = new StringBuffer();
      sql.append(fctMapping.get(operator)[0])
          // Contains means, bRef value contains param, Contained means, bRef is contained in param value
         .append("SpatContained".equals(operator) ? param : colExpr  )
         .append(fctMapping.get(operator)[1])
         .append("SpatContained".equals(operator) ? colExpr : param )
         .append(fctMapping.get(operator)[2]);
      boundVariables.add(valueElement);
      return sql.toString();
    }

    // Add the element containing the comparison value for usage after the prepare and return the sql text fragment
    boundVariables.add(valueElement);
    return colExpr + " " + operator + " " + CustomJdbcTypeSupport.wrapTypeCast(bindingItem, " ?") + colExprPostfix;
  }

  // The following mappings help preventing SQL injection
  private static final Map<String, String> connectiveMapping;
  private static final Map<String, String> operatorMapping;
  static {
    operatorMapping = new HashMap<String, String>();
    operatorMapping.put("=", "=");
    operatorMapping.put(">", ">");
    operatorMapping.put(">=", ">=");
    operatorMapping.put("<", "<");
    operatorMapping.put("<=", "<=");
    operatorMapping.put("<>", "<>");
    operatorMapping.put("!=", "<>");
    operatorMapping.put("like", "LIKE");
    operatorMapping.put("notlike", "NOT LIKE");
    operatorMapping.put("in", "IN");
    operatorMapping.put("notin", "NOT IN");
    operatorMapping.put("bitand", "BITAND");
    operatorMapping.put("spatcontains", "SpatContains");
    operatorMapping.put("spatcontained", "SpatContained");
    operatorMapping.put("spatintersects", "SpatIntersects");
    connectiveMapping = new HashMap<String, String>();
    connectiveMapping.put("and", "AND");
    connectiveMapping.put("or", "OR");
  }
  
  public static String getOperatorMapping(String op) {
    return operatorMapping.get(op);
  }
  
}
