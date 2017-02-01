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
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.jdbc.DatabaseCompatibility;

/**
 * Parses a Wrq and outputs SQL
 */
public class WrqCalc2Sql
{
  protected WrqInfo wrqInfo;
  protected Element calc;
  protected List<Element> boundVariables;
  protected final Map<String, String[]> calcFktMapping;
  protected final Map<String, String> aggregationMapping;

  public WrqCalc2Sql( WrqInfo wrqInfo )
  {
    this.wrqInfo = wrqInfo;
    calcFktMapping = DatabaseCompatibility.getInstance().getCalcFktMapping(wrqInfo.getResultingBindingSet());
    aggregationMapping = DatabaseCompatibility.getInstance().getAggrFktMapping(wrqInfo.getResultingBindingSet());
  }

  /**
   * Returns a list of strings representing parts of SQL
   * All uneven pos (including first) belong to the aggregation level an all even pos give one un-aggregated sql calc
   * Sample 1:  SUM(t38.f_k01)+AVG(t38.f_k01*3)
   *            |1 |     2   |  3  |    4     | 5
   * Sample 2:  SUM(SUM(t38.f_k01*t38.f_k01)) OVER (PARTITION BY orig_ctr)
   *            |  1    |      2           |        3           |  4     |
   * @throws Exception
   */
  protected String getWrqCalcAsSql( Element calc, List<Element> boundVariables, boolean enforceAggr, int dataType ) throws Exception
  {
    StringBuffer sql = new StringBuffer();
    boolean isNumeric = Types.VARCHAR != dataType && Types.DATE != dataType && Types.CHAR != dataType && Types.TIMESTAMP != dataType;
    getWrqCalcAsSqlRecursion(calc, sql, isNumeric, boundVariables, false, containsAggr(calc)||enforceAggr );
    return sql.toString();
  }

  /**
   * Recurses into a wrq:Calc expression and builds a string list as described @see {@link WrqCalc2Sql#getWrqCalcAsSql(WrqInfo, Element, List)}
   * @param wrqInfo
   * @param e
   * @param sqlList
   * @param doCastToDecimal
   * @param sql
   * @param boundVariables
   * @param isWithinAggr
   * @return
   * @throws Exception
   */
  private StringBuffer getWrqCalcAsSqlRecursion(Element e, StringBuffer sql, boolean doCastToDecimal, List<Element> boundVariables, boolean isWithinAggr, boolean needsAggr) throws Exception
  {
    openOperator(e, sql);

    // Loop over the current operator's children
    NodeList cNl = e.getChildNodes();
    boolean writeSep = false;
    for(int i=0; i<cNl.getLength();i++)
    {
      if(Node.ELEMENT_NODE!=cNl.item(i).getNodeType())
        continue;
      Element child = (Element)cNl.item(i);

      if( writeSep ) {
        // Custom separator for concat
        if( "Concat".equals(e.getLocalName()) && ! e.getAttribute("separator").isEmpty() ) {
          String stringConcat = calcFktMapping.get("Concat")[2];
          sql.append(stringConcat+"?"+stringConcat); // User defined separators become host vars to prevent sql injection
          Element seperatorDummy = e.getOwnerDocument().createElement("CalcValueDummy");
          seperatorDummy.setAttribute("value",e.getAttribute("separator"));
          boundVariables.add(seperatorDummy);
        } else // otherwise it can be the binary operator or a comma
          sql.append(calcFktMapping.get(e.getLocalName())[2]);
      }

      // We are an inner aggregation (not a analyt. fct), so our children can only be unaggregated parts
      if( "I".equals(calcFktMapping.get(e.getLocalName())[4]) && (calcFktMapping.get(child.getLocalName())!=null && ! "I".equals(calcFktMapping.get(child.getLocalName())[4]) ) ) {
        getWrqCalcAsSqlRecursion(child, sql, doCastToDecimal, boundVariables, ! "N".equals(calcFktMapping.get(child.getLocalName())[4]) || isWithinAggr, needsAggr );
      }

      // We found another calc, recurse into it
      else if( calcFktMapping.get(child.getLocalName())!=null ) {
        sql = getWrqCalcAsSqlRecursion(child, sql, doCastToDecimal, boundVariables, ! "N".equals(calcFktMapping.get(child.getLocalName())[4]) || isWithinAggr, needsAggr );
      }

      // We found a reference to a column
      else if("ValueRef".equals(child.getLocalName()))
      {
        String bRef = child.getAttribute("idRef");
        BindingItem bi = wrqInfo.getNoMetaDataBindingItem(bRef);
        String aggr = null;
        if( ! isWithinAggr && needsAggr ) { // We need to use the "local" aggr
          aggr = child.getAttribute("aggr").isEmpty() ? wrqInfo.getDefaultAggr(bi) : aggregationMapping.get(child.getAttribute("aggr"));
          sql.append(aggr).append("(");
        }

        if( doCastToDecimal && ! "N".equals(calcFktMapping.get(e.getLocalName())[0]) )
          sql.append(" CAST(");
        sql.append("("+bi.getColumnExpression()+")"); // Just for cases where colExpr is nontrivial ()
        if( doCastToDecimal && ! "N".equals(calcFktMapping.get(e.getLocalName())[0]) ) {
          sql.append(" AS DECIMAL(38,19))");
          doCastToDecimal = false;
        }

        // Close local unaggregated level
        if( aggr != null ) // Close local aggr
          sql.append( ")" );
      }

      // We found a const expression
      else if("Value".equals(child.getLocalName()))
      {
        if( doCastToDecimal && ! "N".equals(calcFktMapping.get(e.getLocalName())[0]) )
          sql.append(" CAST(");
        sql.append(" ? "); // Const values become host vars bound to a ? to prevent injection
        if( doCastToDecimal && ! "N".equals(calcFktMapping.get(e.getLocalName())[0]) ) {
            sql.append(" AS DECIMAL(38,19))");
          doCastToDecimal = false; // only the first op needs a cast
        }
        Element calcValueDummy = e.getOwnerDocument().createElement("CalcValueDummy");
        calcValueDummy.setAttribute("value",child.getTextContent());
        calcValueDummy.setAttribute("isInAggr",Boolean.toString(isWithinAggr)); // TODO may not be needed anymore because top-n will never use complex col expr in base table anymore
        // Let's treat us numeric if w are in a numeric expression. This is important, because at least division needs a clean number for NULLIF
        // calcFktMapping[0]=='Y', except for Calc, where it applies only if there are multiple calc:Value children and calc:Add is implicitly applied
        if( "Calc".equals(e.getLocalName()) ) {
          if( e.getElementsByTagName("*").getLength() > 1 )
            calcValueDummy.setAttribute(Bindings.jdbcDataTypeNameAttribute,"NUMERIC");
        } else {
          if( "Y".equals(calcFktMapping.get(e.getLocalName())[0]) )
            calcValueDummy.setAttribute(Bindings.jdbcDataTypeNameAttribute,"NUMERIC");
        }
        boundVariables.add(calcValueDummy);
      } else
        throw new Exception("Invalid element in calc :'"+child.getLocalName()+"'");

      writeSep = true; // from now on write colon of binary math operator
    }

    closeOperator(e, sql);
    return sql;
  }

  // Checks whether a wrq:Calc subtree contains any aggregation
  static protected boolean containsAggr( Element calc )
  {
    Map<String, String[]> mapping = DatabaseCompatibility.getInstance().getDefaultCalcFktMapping();   
    for(Iterator<String> it = mapping.keySet().iterator(); it.hasNext(); ) {
      String calcFkt = it.next();
      if( !"N".equals(mapping.get(calcFkt)[4]) && calc.getElementsByTagNameNS(StandardNamespaceContext.WRSREQUEST_NAMESPACE, calcFkt).getLength() >0 )
        return true;
    }
    return false;
  }

  protected void openOperator(Element e, StringBuffer sql)
  {
    sql.append(calcFktMapping.get(e.getLocalName())[1]);
  }

  protected void closeOperator(Element e, StringBuffer sql)
  {
    sql.append(calcFktMapping.get(e.getLocalName())[3]);
  }
}