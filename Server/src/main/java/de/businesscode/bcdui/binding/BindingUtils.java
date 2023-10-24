/*
  Copyright 2010-2023 BusinessCode GmbH, Germany

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
package de.businesscode.bcdui.binding;

import java.lang.reflect.Field;
import java.sql.Types;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;

import de.businesscode.util.jdbc.DatabaseCompatibility;

public class BindingUtils 
{
  static final Map<Integer, String> jdbcDataTypeCodeToStringMapping;

  // In WRS we want to have the text representation of the types
  static {
    jdbcDataTypeCodeToStringMapping = new HashMap<Integer, String>();
    try {
      for (Field field : Types.class.getFields()) {
        if (field.getType().isPrimitive()) {
          String typeName = field.getType().getName();
          if ("int".equals(typeName))
              jdbcDataTypeCodeToStringMapping.put(field.getInt(Types.class), field.getName());
        }
      }
    }
    catch (Exception ex) {
      ex.printStackTrace();
    }
  }

  /** 
   * Used to identify column reference parts in a SQL Column expressions to allow for for example prepending table alias
   * Each post 0,2,4,6 will be a non-column-expression, 1,3,5 will be a column expression
   * Sample: CASE WHEN col=1 then 'ONE' else SUM(col2) END -&gt; "CASE WHEN ","col","=1 then 'ONE' else SUM(","col2",") END"
   * If the expression does not start with a column reference, the list will start with a "": col1+col2+3 -&gt; "","col1","+","col2","+2"
   * cCEBase is the columnExpression which was split into cCE to allows caching the split even though our column expression is read/write
   */
  public static List<String> splitColumnExpression( String colExpr, boolean columnQuoting, BindingSet bs )
  {
    List<String> cCE = new LinkedList<String>();

    // If we have an SQL expression, we need to inject the alias more carefully
    if (! columnQuoting && !SimpleBindingItem.pureColumnNamePattern.matcher(colExpr).matches() )
    {
      Matcher m = SimpleBindingItem.wordPattern.matcher(colExpr);
      Set<String> reservedDBWords = DatabaseCompatibility.getInstance().getReservedDBWords( bs.getJdbcResourceName() );
      StringBuffer sb = new StringBuffer();
      int endLastColumnName = 0;
      while (m.find()) {
        if( ! reservedDBWords.contains(m.group().toUpperCase()) && ! m.group().startsWith("'") ) {
          sb.append( colExpr.substring(endLastColumnName, m.start()) );
          endLastColumnName = m.end();
          cCE.add( sb.toString() );
          cCE.add( m.group() );
          sb = new StringBuffer();
        }
      }
      sb.append( colExpr.substring(endLastColumnName, colExpr.length()) );
      cCE.add( sb.toString() );
    }
    else {
      cCE.add("");
      cCE.add( colExpr );
      cCE.add("");
    }
    return cCE;
  }
  
  /**
   * Use output of splitColumnExpression to prepend table alias to column expressions
   * Column expressions prefixed with SimpleBindingItem.BCD_NO_TABLE_ALIAS by the user are excluded from this
   * the user has to assure that this is only used in an unambiguous statement when using this in a join.
   * This is the case for example if the column refers to another table than the one assigned to this BindingSet
   * or for mySequence.nextval expressions (this, referring to a global name, needs to be prefixed with BCD_NO_TABLE_ALIAS.)
   */
  public static String addTableAlias( List<String> sCE, String tableAlias ) 
  {
    // Only strings on odd positions represent a column expression
    StringBuffer res = new StringBuffer();
    for(int i=0; i<sCE.size(); i++ ) {
      if( i % 2 == 0 )
        res.append( sCE.get(i) );
      else if( sCE.get(i).startsWith(SimpleBindingItem.BCD_NO_TABLE_ALIAS) )
        res.append( sCE.get(i).substring(SimpleBindingItem.BCD_NO_TABLE_ALIAS.length()) );
      else
        res.append( tableAlias+"."+sCE.get(i) );
    }
    return res.toString();
  }

  /**
   * Convenience method 
   * @param sCE
   * @param columnQuoting
   * @param tableAlias
   * @return
   */
  public static String addTableAlias( String sCE, boolean columnQuoting, String tableAlias, BindingSet bs ) 
  {
    List<String> colExpr = splitColumnExpression(sCE, columnQuoting, bs);
    return addTableAlias(colExpr, tableAlias);
  }


  /**
   * @return true typeName represents a numeric type
   */
  public static boolean isNumeric(String typeName) {
    try {
      return isNumeric(Types.class.getField(typeName).getInt(null));
    } catch ( NoSuchFieldException | IllegalAccessException ex ) {
      return false;
    }
  }

  /**
   * @return true if jdbcType represents a numeric type
   */
  public static boolean isNumeric(int jdbcType) {
    return ( jdbcType == Types.INTEGER || jdbcType == Types.NUMERIC || jdbcType == Types.DECIMAL || jdbcType == Types.DOUBLE || jdbcType == Types.FLOAT
            || jdbcType == Types.BIGINT  || jdbcType == Types.BIT  || jdbcType == Types.REAL || jdbcType == Types.SMALLINT || jdbcType == Types.TINYINT );
  }
}
