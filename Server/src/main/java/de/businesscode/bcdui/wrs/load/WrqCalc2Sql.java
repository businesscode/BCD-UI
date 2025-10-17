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
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingNotFoundException;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.toolbox.Configuration.OPT_CLASSES;
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

  /**
   * Helper to handle the EnterpriseEdition version of us
   * @param wrqInfo
   * @return
   */
  static WrqCalc2Sql getInstance(WrqInfo wrqInfo) {
    return Configuration.getClassInstance( Configuration.getClassoption(OPT_CLASSES.WRQCALC2SQL),
        new Class<?>[]{WrqInfo.class},
        wrqInfo);
  }

  /**
   * Turns a wrq:Calc element into an SQL string
   * @param wrqInfo
   */
  public WrqCalc2Sql( WrqInfo wrqInfo )
  {
    this.wrqInfo = wrqInfo;
    calcFktMapping = DatabaseCompatibility.getInstance().getCalcFktMapping(wrqInfo.getJdbcResourceName());
    aggregationMapping = DatabaseCompatibility.getInstance().getAggrFktMapping(wrqInfo.getJdbcResourceName());
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
  protected String getWrqCalcAsSql( Element calc, List<Element> boundVariables, boolean enforceAggr, int dataType, List<String> wrqTableAlias ) throws Exception
  {
    StringBuffer sql = new StringBuffer();
    boolean isNumeric = Types.VARCHAR != dataType && Types.DATE != dataType && Types.CHAR != dataType && Types.TIMESTAMP != dataType;
    getWrqCalcAsSqlRecursion(calc, sql, isNumeric, boundVariables, false, containsAggr(calc)||enforceAggr, wrqTableAlias );
    return sql.toString();
  }

  /**
   * Recourses into a wrq:Calc expression and builds a string list as described @see
   * @param e
   * @param sql
   * @param doCastToDecimal
   * @param boundVariables
   * @param isWithinAggr
   * @param needsAggr
   * @return
   * @throws Exception
   */
  private StringBuffer getWrqCalcAsSqlRecursion(Element e, StringBuffer sql, boolean doCastToDecimal, List<Element> boundVariables, boolean isWithinAggr, boolean needsAggr, List<String> wrqTableAliases) 
      throws Exception
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
          Element separatorDummy = e.getOwnerDocument().createElement("CalcValueDummy");
          separatorDummy.setAttribute("value",e.getAttribute("separator"));
          boundVariables.add(separatorDummy);
        } else // otherwise it can be the binary operator or a comma
          sql.append(calcFktMapping.get(e.getLocalName())[2]);
      }

      // We are an inner aggregation (not a analyt. fct), so our children can only be unaggregated parts
      if( "I".equals(calcFktMapping.get(e.getLocalName())[4]) && (calcFktMapping.get(child.getLocalName())!=null && ! "I".equals(calcFktMapping.get(child.getLocalName())[4]) ) ) {
        getWrqCalcAsSqlRecursion(child, sql, doCastToDecimal, boundVariables, ! "N".equals(calcFktMapping.get(child.getLocalName())[4]) || isWithinAggr, needsAggr, wrqTableAliases );
      }

      // We found another calc, recurse into it
      else if( calcFktMapping.get(child.getLocalName())!=null ) {
        sql = getWrqCalcAsSqlRecursion(child, sql, doCastToDecimal, boundVariables, ! "N".equals(calcFktMapping.get(child.getLocalName())[4]) || isWithinAggr, needsAggr, wrqTableAliases );
      }

      // We found a reference to a column
      else if("ValueRef".equals(child.getLocalName()))
      {
        String bRef = child.getAttribute("idRef");
        String wrqAlias = bRef.indexOf(".")!=-1 ? bRef.split("\\.")[0] : "";
        wrqTableAliases.add(wrqAlias);

        BindingItem bi = wrqInfo.getNoMetaDataBindingItem(bRef);
        if( bi== null ) throw new BindingNotFoundException("BindingItem of ValueRef with idRef='"+bRef+"' not found");
        String aggr = null;
        if( ! isWithinAggr && needsAggr ) { // We need to use the "local" aggr
          aggr = aggregationMapping.containsKey(child.getAttribute("aggr")) ? child.getAttribute("aggr") :  wrqInfo.getDefaultAggr(bi);
          sql.append( aggregationMapping.get(aggr) );
          if ("count".equals(aggr))
            doCastToDecimal = false;
        }
        sql.append("(");

        if( doCastToDecimal && ! "N".equals(calcFktMapping.get(e.getLocalName())[0]) ) {
          sql.append(" CAST((").append(bi.getColumnExpression()).append(") AS DECIMAL(38,19))");
          doCastToDecimal = false;
        } else {
          sql.append(bi.getColumnExpression());
        }
        sql.append( ")" );
      }

      // We found a const expression
      // These const values become host vars bound to a ? to prevent injection and may beed numerical casting
      else if("Value".equals(child.getLocalName()))
      {

        // Maybe precision (and scale) are given as attributes @p and or @s
        Integer p = null, s = null;
        boolean isNumeric = false;
        // p must be >= 1 and <= 30 according to SQL
        if( ! child.getAttribute("p").isEmpty() ) {
          p = Integer.parseInt(child.getAttribute("p"));
          if( p < 1 || p > 38 ) p = null;
        }
        if( ! child.getAttribute("s").isEmpty() ) {
          // s must be not larger than p (negative is allowed in new SQL rounding on the left side of the column)
          // If we have @s given but no @p, we default for convenience to DECIMAL's default p, i.e. 18
          s = Integer.parseInt(child.getAttribute("s"));
          if( p == null ) p = 18;
          if( s < -p || s > p ) s = p;
        }

        // @p and or @s given?
        if( p != null ) {
          sql.append(" CAST(").append(" ? ").append(" AS DECIMAL(").append(p);
          if( s != null ) sql.append(",").append(s);
          sql.append("))");
          isNumeric = true;
        }
        // Or we may know from context that a cast to DECIMAL is necessary
        else if( doCastToDecimal && ! "N".equals(calcFktMapping.get(e.getLocalName())[0]) ) {
          sql.append(" CAST(").append(" ? ").append(" AS DECIMAL(38,19))");
          doCastToDecimal = false; // only the first op needs a cast
        }
        // All other go as VARCHAR
        else {
          sql.append(" ? ");
        }

        Element calcValueDummy = e.getOwnerDocument().createElement("CalcValueDummy");
        boolean isNull = child.getElementsByTagNameNS(StandardNamespaceContext.WRS_NAMESPACE, "null").getLength() > 0;
        if( ! isNull ) {
          calcValueDummy.setAttribute("value",child.getTextContent());
        }
        calcValueDummy.setAttribute("isInAggr",Boolean.toString(isWithinAggr)); // TODO may not be needed anymore because top-n will never use complex col expr in base table anymore
        // Let's treat us numeric if we are in a numeric expression. This is important, because at least division needs a clean number for NULLIF
        // calcFktMapping[0]=='Y', except for Calc, where it applies only if there are multiple calc:Value children and calc:Add is implicitly applied
        if( "Calc".equals(e.getLocalName()) ) {
          String jdbcAttr = e.getAttribute(Bindings.jdbcDataTypeNameAttribute);
          if( ! jdbcAttr.isEmpty() ) {
            if( Types.class.getField(e.getAttribute(Bindings.jdbcDataTypeNameAttribute)) != null ) {
              calcValueDummy.setAttribute(Bindings.jdbcDataTypeNameAttribute,jdbcAttr);
            }
          } else if( e.getElementsByTagName("*").getLength() > 1 )
            calcValueDummy.setAttribute(Bindings.jdbcDataTypeNameAttribute,"NUMERIC");
        } else {
          if( isNumeric || "Y".equals(calcFktMapping.get(e.getLocalName())[0]) )
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

  /**
   * Append DatabaseCompatibility operatorInfo[1]
   * @param e
   * @param sql
   * @throws BindingNotFoundException
   */
  protected void openOperator(Element e, StringBuffer sql) throws BindingNotFoundException
  {
    // CastAsBRef depends on an attribute @bRef and this needs special handling here
    String funcName = e.getLocalName();
    if( "CastAsBRef".equals(funcName) ) funcName = "CastAsNumeric"; // CastAsNumeric and CastAsVarchar have the same opening

    String[] calcFunc = calcFktMapping.get(funcName);

    sql.append( calcFunc[1] );
  }

  /**
   * Append DatabaseCompatibility operatorInfo[3]
   * @param e
   * @param sql
   * @throws BindingNotFoundException
   */
  protected void closeOperator(Element e, StringBuffer sql) throws BindingNotFoundException
  {
    // CastAsBRef depends on an attribute @bRef and this needs special handling here
    String funcName = e.getLocalName();
    if( "CastAsBRef".equals(funcName) ) {
      String bRef = e.getAttribute("bRef");
      boolean isNUmeric = wrqInfo.getResultingBindingSet().get(bRef).isNumeric();
      funcName = isNUmeric ? "CastAsNumeric" : "CastAsVarchar";
    }
    String[] calcFunc = calcFktMapping.get(funcName);

    sql.append( calcFunc[3] );
  }
}