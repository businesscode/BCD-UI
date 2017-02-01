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

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import javax.xml.xpath.XPathExpressionException;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import de.businesscode.bcdui.binding.exc.BindingNotFoundException;

/**
 * Parses a f:Filter expression and returns the SQL Where expression
 * Initially taken from WrsSqlGenerator. For older change history, see there
 */
public class WrqFilter2Sql
{

  private final Element filterElement;
  private final WrqInfo wrqInfo;

  public WrqFilter2Sql(WrqInfo wrqInfo) throws XPathExpressionException
  {
    this.filterElement = wrqInfo.getFilterNode();
    this.wrqInfo       = wrqInfo;
  }

  public String getAsSql(Collection<Element> elementList) throws BindingNotFoundException
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
  private String generateWhereClause(Element element, String connective, boolean needsBracket, Collection<Element> elementList) throws BindingNotFoundException
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
        String nodeName = child.getNodeName().substring(child.getNodeName().indexOf(":") + 1); // name without schema
        String subClause = null;
        String newConnective = connectiveMapping.get(nodeName.toLowerCase());
        if (newConnective == null) {
          subClause = generateSingleColumnExpression(wrqInfo, child, elementList, element.getOwnerDocument());
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
  private String generateBetweenExpression(Element itemFrom, Element itemTo, Collection<Element> elementList) throws BindingNotFoundException {
    WrqBindingItem bindingItem = wrqInfo.getAllBRefs().get(itemFrom.getAttribute("bRef"));
    elementList.add(itemFrom);
    elementList.add(itemTo);
    return bindingItem.getQColumnExpression() + " BETWEEN ? AND ?";
  }

  /**
   * Helper for WHERE clause generation
   * @param wrqInfo
   * @param item
   * @param elementList
   * @param ownerDocument
   * @return
   * @throws BindingNotFoundException
   */
  static protected String generateSingleColumnExpression(WrqInfo wrqInfo, Element item, Collection<Element> elementList, Document ownerDocument)
      throws BindingNotFoundException
  {
    WrqBindingItem bindingItem = wrqInfo.getAllBRefs().get(item.getAttribute("bRef"));
    String op = item.getAttribute("op");
    String operator = "=";
    if (op != null) {
      operator = operatorMapping.get(op.trim().toLowerCase());
      if (operator == null)
        operator = "=";
    }
    if ((!item.hasAttribute("value") || "".equals(item.getAttribute("value"))) && "=".equals(operator)) {
      return bindingItem.getQColumnExpression() + " IS NULL";
    }
    if ((!item.hasAttribute("value") || "".equals(item.getAttribute("value"))) && "<>".equals(operator)) {
      return bindingItem.getQColumnExpression() + " IS NOT NULL";
    }

    // Take care for ignore case
    boolean ignoreCase = "true".equals(item.getAttribute("ic"));
    boolean isLike = "LIKE".equals(operator);
    String colExprPostfix = "";

    // In some cases we need to modify the incoming value
    Element valueElement;
    if( ignoreCase || isLike ) {
      valueElement = ownerDocument.createElement("ChangedValueElement");
      valueElement.setAttribute("value", item.getAttribute("value"));
    } else
      valueElement = item;

    // Take care for translation in to lower case for database and statement values
    String colExpr = null;
    if( ignoreCase ) {
      valueElement.setAttribute("value", valueElement.getAttribute("value").toLowerCase() );
      colExpr = "lower("+bindingItem.getQColumnExpression()+")";
    } else {
      colExpr = bindingItem.getQColumnExpression();
    }

    // In operator does not support ? syntax
    if( "IN".equals(operator) ) {
      String[] values = valueElement.getAttribute("value").split(",");
      StringBuffer qm = new StringBuffer("(");
      for( int i = 0; i<values.length; i++ ) {
        qm.append( i<values.length-1 ? "?," : "?");
        Element e = ownerDocument.createElement("InElement");
        e.setAttribute("bRef",  bindingItem.getId());
        e.setAttribute("value", ignoreCase ? values[i].toLowerCase() : values[i]);
        elementList.add(e);
      }
      return colExpr + " IN " + qm.toString() + ")";
    }

    // Our like operator has '*' as wild card, translate it here
    else if("LIKE".equals(operator) ) {
      String value = valueElement.getAttribute("value");
      value = value.replace("%", "\\%");
      value = value.replace("*", "%");
      valueElement.setAttribute("value", value );
      colExprPostfix = " ESCAPE '\\'";
    }

    // Support of BITAND operation -> BITAND( col, value) > 0
    else if ("BITAND".equals(operator)){
      String value = valueElement.getAttribute("value");
      Element e = ownerDocument.createElement("BitAndValue");
      e.setAttribute("value", value );
      elementList.add(e);
      return operator+"(" + colExpr + ",? ) > 0 ";
    }

    // Add the element containing the comparison value for usage after the prepare and return the sql text fragment
    elementList.add(valueElement);
    return colExpr + " " + operator + " ?" + colExprPostfix;
  }

  // The following mappings help preventing SQL injection
  private static final Map<String, String> connectiveMapping;
  private static final Map<String, String> operatorMapping;
  static {
    operatorMapping = new HashMap<String, String>();
    operatorMapping.put(">", ">");
    operatorMapping.put(">=", ">=");
    operatorMapping.put("<", "<");
    operatorMapping.put("<=", "<=");
    operatorMapping.put("<>", "<>");
    operatorMapping.put("!=", "<>");
    operatorMapping.put("like", "LIKE");
    operatorMapping.put("in", "IN");
    operatorMapping.put("bitand", "BITAND");
    connectiveMapping = new HashMap<String, String>();
    connectiveMapping.put("and", "AND");
    connectiveMapping.put("or", "OR");
  }
}
