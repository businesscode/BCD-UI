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
package de.businesscode.util.jdbc;

import java.sql.Connection;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import org.apache.log4j.Logger;

import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.toolbox.config.BareConfiguration;
import de.businesscode.bcdui.web.filters.RequestLifeCycleFilter;

/**
 * This class encapsulates Database specific behavior and settings
 *
 */
public class DatabaseCompatibility
{
  static private final Logger log = Logger.getLogger(DatabaseCompatibility.class);
  private static DatabaseCompatibility singleton = null;

  // Set of database-specific reserved words, which are often used in column expressions and usually not referring to a column
  // Used for knowing, where to add table prefixes in SQL
  // If you miss a word here and a non-column name gets a table prefix in your statement, 
  // Instead of extending the list, you may also prepend "bcdNoTableAlias." to it to hint SQL generator
  protected final Set<String> sqlKeyWordsOracle;
  protected final Set<String> sqlKeyWordsMysql;
  protected final Set<String> sqlKeyWordsSqlServer;
  protected final Set<String> sqlKeyWordsGeneric;
  protected final Map<String, String> databaseProduct = new HashMap<String, String>();

  protected final Map<String, String[]> sqlServerCalcFktMapping;
  protected final Map<String, String[]> oracleCalcFktMapping;
  protected final Map<String, String[]> mysqlCalcFktMapping;

  protected final Map<String, String> aggregationMappingGeneric;
  protected final Map<String, String> aggregationMappingMySql;

  /**
   * 
   * @return
   * @throws BindingException
   */
  public static synchronized DatabaseCompatibility getInstance() throws RuntimeException
  {
    if( DatabaseCompatibility.singleton == null ) {
      Class<? extends DatabaseCompatibility> clazz = (Class<? extends DatabaseCompatibility>) Configuration.getClassoption(Configuration.OPT_CLASSES.DATABASECOMPATIBILITY);
      try {
        DatabaseCompatibility.singleton = clazz.newInstance();
      } catch (InstantiationException | IllegalAccessException e) {
        throw new RuntimeException("No class found for DatabseCompatibility", e);
      }
    }
    return DatabaseCompatibility.singleton;
  }

  
  /**
   * clear caches
   */
  public static void clear(){
    DatabaseCompatibility.singleton = null;
  }

  /**
   *
   * @param bs 
   * @return Set of key words for the database belonging to the BindingSets connection
   */
  public Set<String>getReservedDBWords(BindingSet bs)
  {
    try {
      String product = getDatabaseProductNameLC(bs);
      if( product.contains("oracle") )
        return sqlKeyWordsOracle;
      else if( product.contains("mysql") )
        return sqlKeyWordsMysql;
      else if( product.contains("microsoft sql server") )
        return sqlKeyWordsSqlServer;
    } catch (Exception e) {
      log.error(e, e);
    }
    return sqlKeyWordsGeneric;
  }

  /**
   * If the database used for the selected BindingSet needs an extra column list for with clauses
   * @param bs
   * @return
   */
  public boolean dbNeedsColumnListInWithClause(BindingSet bs)
  {
    return false;
  }
  /**
   * Some data bases only allow for a single select clause
   * @param bs
   * @return
   */
  public boolean dbAllowsMultiWithClauses(BindingSet bs)
  {
    return true;
  }

  /**
   * MySql does not support ANSI GROUPING SETS and ROLLUP but only a custom WITH ROLLUP without a column list
   * @param resultingBindingSet
   * @return
   */
  public boolean dbOnlyKnowsWithRollup(BindingSet resultingBindingSet) 
  {
    String product = getDatabaseProductNameLC(resultingBindingSet);
    return product.contains("mysql");
  }

  /**
   * @param resultingBindingSet
   * @return
   */
  public boolean dbNeedsVarcharCastForConcatInTopN( BindingSet resultingBindingSet) {
    return false;
  }

  /**
   * Oracle sorts nulls first in desc (order by and rank order by), tera and sqlserver do this vice versa
   * Sadly, of these, only oracle allows NULLS FIRST/LAST in ORDER BY
   * @param resultingBindingSet
   * @return How often bound variables of the item used for ordering are used in the created expression
   */
  public int dbOrderByNullsLast( BindingSet resultingBindingSet, String colExpr, boolean isDesc, StringBuffer sql ) 
  {
    if( getDatabaseProductNameLC(resultingBindingSet).contains("oracle") ) {
      if( isDesc ) {
        sql.append( colExpr + " DESC NULLS LAST " );
      } else {
        sql.append( colExpr + " ASC " );        
      }
      return 1;
    } else {
      if( isDesc ) {
        sql.append( colExpr + " DESC " );
        return 1;
      } else {
        sql.append( "CASE WHEN "+ colExpr +" IS NULL THEN 0 ELSE 1 END DESC ,"+ colExpr + " ASC " );        
        return 2;
      }
    }
  }

  
  public Map<String, String[]> getDefaultCalcFktMapping()
  {
    return oracleCalcFktMapping;
  }

  public Map<String, String[]> getCalcFktMapping( BindingSet resultingBindingSet) 
  {
    String product = getDatabaseProductNameLC(resultingBindingSet);
    if( product.contains("microsoft sql server") )
      return sqlServerCalcFktMapping;
    if( product.contains("mysql") )
      return mysqlCalcFktMapping;
    return oracleCalcFktMapping;    
  }

  /**
   * For the simple @aggr shortcut this is the mapping to the corresponding SQL expression
   */
  public Map<String, String> getAggrFktMapping( BindingSet resultingBindingSet) 
  {
    String product = getDatabaseProductNameLC(resultingBindingSet);
    if( product.contains("mysql") )
      return aggregationMappingMySql;    
    return aggregationMappingGeneric;
  }

  /**
   * Does not do much checking, but as all BindingSets are tested on start, the risk is low
   * @param bs
   * @return
   */
  public String getDatabaseProductNameLC(BindingSet bs)
  {
    String dbSource = bs.getDbSourceName() == null ? "(default connection)" : bs.getDbSourceName();
    if (databaseProduct.containsKey(dbSource)) {
        return databaseProduct.get(dbSource);     
    }
    
    Connection con = null;
    // we either use managed or unmanaged connection depended on the scope of execution
    boolean isManagedConnection = RequestLifeCycleFilter.isThreadBoundToHttpRequest();
    try {
      // Let's get the connection (will not be a new one but the used one, because each request gets always the same for one dbSourceName)
      /*
       * access BareConfiguration, since Configuration initialization has dependency on database (cycle)
       */
      con = isManagedConnection ? BareConfiguration.getInstance().getManagedConnection(bs.getDbSourceName()) :
        BareConfiguration.getInstance().getUnmanagedConnection(bs.getDbSourceName());

      String databaseProductName = con.getMetaData().getDatabaseProductName().toLowerCase();
      databaseProduct.put(dbSource, databaseProductName);
      return databaseProductName;
    } catch (Exception e) {
      log.error("BindingSet '"+bs.getName()+"' :"+e, e);
    } finally {
      if(!isManagedConnection)
        Closer.closeAllSQLObjects(con);
    }
    return null;
  }

  /**
   * Retrieve a singleton via getInstance() to make your SQl database type dependent
   */
  protected DatabaseCompatibility()
  {
    // Allowed calc expressions in sql
    Map<String, String[]> calcFktMapping;
    // isArithmetic, openingExpression, operandSeparator, closingExpression, inner aggregation or an analyt. fct
    calcFktMapping = new HashMap<String,String[]>();
    calcFktMapping.put("Calc",          new String[]{"Y",  "",     "+",   "", "Y"}); // We default to + if Calc has multiple children

    calcFktMapping.put("Sum",           new String[]{"N",  "SUM(",          "",  ")", "I"});
    calcFktMapping.put("Max",           new String[]{"N",  "MAX(",          "",  ")", "I"});
    calcFktMapping.put("Min",           new String[]{"N",  "MIN(",          "",  ")", "I"});
    calcFktMapping.put("Avg",           new String[]{"N",  "AVG(",          "",  ")", "I"});
    calcFktMapping.put("Count",         new String[]{"N",  "COUNT(",        "",  ")", "I"});
    calcFktMapping.put("CountDistinct", new String[]{"N",  "COUNT(DISTINCT(", "",  "))", "I"});
    calcFktMapping.put("Distinct",      new String[]{"N",  "DISTINCT(",     "",  ")", "I"});
    calcFktMapping.put("Grouping",      new String[]{"N",  "GROUPING(",     "",  ")", "I"});
    calcFktMapping.put("None",          new String[]{"N",  "",              "",  "",  "I"});

    calcFktMapping.put("Add",           new String[]{"Y",  "(",     "+",  ")", "N"});
    calcFktMapping.put("Sub",           new String[]{"Y",  "(",     "-",  ")", "N"});
    calcFktMapping.put("Mul",           new String[]{"Y",  "(",     "*",  ")", "N"});
    calcFktMapping.put("Div",           new String[]{"Y",  "(",     "/ NULLIF(",  ",0) )", "N"});
    calcFktMapping.put("Mod",           new String[]{"Y",  "MOD(",  ",",  ")", "N"});
    calcFktMapping.put("Concat",        new String[]{"N",  "(",     "||", ")", "N"});

    // Analytical functions optional module
    calcFktMapping.put("CountOver",     new String[]{"N", "COUNT(",         "",   ")", "O"});
    calcFktMapping.put("SumOver",       new String[]{"N", "SUM(",           "",   ")", "O"});
    calcFktMapping.put("LeadOver",      new String[]{"N", "LEAD(",          ",",  ")", "O"});
    calcFktMapping.put("PartitionBy",   new String[]{"N", " PARTITION BY ", ",",  "",  "I"});
    calcFktMapping.put("OrderBy",       new String[]{"N", " ORDER BY ",     ",",  "",  "O"});
    
    // Calc functions are just _almost_ the same for all db dialects
    oracleCalcFktMapping = calcFktMapping;
    sqlServerCalcFktMapping = new HashMap<String, String[]>(calcFktMapping);
    // Using '+' for MSSQL for concat does not autocast: VARCHAR + INTEGER fails. Concat does cast, same as || does for oracle.
    // On the other hand, concat for oracle does not support >2 agruments, so Concat is handled db specific
    sqlServerCalcFktMapping.put("Concat", new String[]{"N",  "CONCAT(",     ",", ")", "N"});

    // MySql does not support GROUPING function, which allows to distinguish for aggregates null values in dimension members from null values cause by higher aggregation
    // So both nulls will end up in one row and for MySQL we treat all such rows as a (sub)total rows
    mysqlCalcFktMapping = new HashMap<String, String[]>(calcFktMapping);
    mysqlCalcFktMapping.put("Grouping",   new String[]{"N",  "ISNULL(", "", ")", "I"});

    // For the simple @aggr shortcut this is the mapping to the corresponding SQL expression
    aggregationMappingGeneric = new HashMap<String, String>();
    aggregationMappingGeneric.put("sum",       "SUM");
    aggregationMappingGeneric.put("max",       "MAX");
    aggregationMappingGeneric.put("min",       "MIN");
    aggregationMappingGeneric.put("avg",       "AVG");
    aggregationMappingGeneric.put("count",     "COUNT");
    aggregationMappingGeneric.put("grouping",  "GROUPING");
    aggregationMappingGeneric.put("none",      ""); // Can be used if the column expression already has a aggregator defined
    
    aggregationMappingMySql = new HashMap<String, String>(aggregationMappingGeneric);
    aggregationMappingMySql.put("grouping",  "ISNULL");

    sqlKeyWordsOracle = new HashSet<String>(
        Arrays.asList( new String[]
          {
            // Build-in functions
            "ABS", "ACOS", "ADD_MONTHS", "ASCII", "ASCIISTR", "ASIN", "ATAN", "ATAN2",
            "BFILENAME", "BITAND",
            "CARDINALITY", "CEIL", "CHARTOROWID", "CHR", "COALESCE", "COMMIT", "COMMIT_CM", "COMPOSE", "CONCAT", "CONVERT", "COS", "COSH", "CUBE", "CURRENT_DATE", "CURRENT_TIME", "CURRENT_TIMESTAMP",
            "DBTIMEZONE", "DECODE", "DECOMPOSE", "DEREF", "DUMP",
            "EMPTY_BLOB", "EMPTY_CLOB", "EXISTS", "EXP",
            "FLOOR", "FROM_TZ",
            "GLB", "GREATEST", "GREATEST_LB", "GROUPING",
            "HEXTORAW",
            "INITCAP", "INSTR", "INSTRB", "INSTRC", "INSTR2", "INSTR4", "ISNCHAR",
            "LAST_DAY", "LEAST", "LEAST_UB", "LENGTH", "LENGTHB", "LENGTHC", "LENGTH2", "LENGTH4", "LEVEL", "LN", "LOCALTIME", "LOCALTIMESTAMP", "LOG", "LOWER", "LPAD", "LTRIM", "LUB",
            "MONTHS_BETWEEN",
            "NANVL", "NCHARTOROWID", "NCHR", "NEW_TIME", "NEXT_DAY", "NHEXTORAW", "NLS_CHARSET_DECL_LEN", "NLS_CHARSET_ID", "NLS_CHARSET_NAME", "NLS_INITCAP", "NLS_LOWER", "NLSSORT", "NLS_UPPER", "NULLFN", "NULLIF", "NUMTODSINTERVAL", "NUMTOYMINTERVAL", "NVL",
            "POWER",
            "RAWTOHEX", "RAWTONHEX", "REF", "REGEXP_INSTR", "REGEXP_LIKE", "REGEXP_REPLACE", "REGEXP_SUBSTR", "REMAINDER", "REPLACE", "ROLLBACK_NR", "ROLLBACK_SV", "ROLLUP", "ROUND", "ROWID ", "ROWIDTOCHAR", "ROWIDTONCHAR", "ROWLABEL", "ROWNUM", "RPAD", "RTRIM",
            "SAVEPOINT", "SESSIONTIMEZONE", "SET", "SET_TRANSACTION_USE", "SIGN", "SIN", "SINH", "SOUNDEX", "SQLCODE", "SQLERRM", "SQRT", "SUBSTR", "SUBSTRB", "SUBSTRC", "SUBSTR2", "SUBSTR4",
            "SYS_AT_TIME_ZONE", "SYS_CONTEXT", "SYSDATE", "SYS_EXTRACT_UTC", "SYS_GUID", "SYS_LITERALTODATE", "SYS_LITERALTODSINTERVAL", "SYS_LITERALTOTIME", "SYS_LITERALTOTIMESTAMP", "SYS_LITERALTOTZTIME", "SYS_LITERALTOTZTIMESTAMP", "SYS_LITERALTOYMINTERVAL", "SYS$LOB_REPLICATION", "SYSTIMESTAMP",
            "TAN", "TANH", "TO_ANYLOB", "TO_BINARY_DOUBLE", "TO_BINARY_FLOAT", "TO_BLOB", "TO_CHAR", "TO_CLOB", "TO_DATE", "TO_DSINTERVAL", "TO_LABEL", "TO_MULTI_BYTE", "TO_NCHAR", "TO_NCLOB", "TO_NUMBER", "TO_RAW", "TO_SINGLE_BYTE", "TO_TIME", "TO_TIMESTAMP", "TO_TIMESTAMP_TZ", "TO_TIME_TZ", "TO_YMINTERVAL", "TRANSLATE", "TRIM", "TRUNC", "TZ_OFFSET",
            "UID", "UNISTR", "UPPER", "UROWID ", "USER", "USERENV",
            "VALUE", "VSIZE",
            "XOR",
            // Aggregation functions
            "AVG", "CORR", "COVAR_POP", "COVAR_SAMP", "COUNT", "CUME_DIST", "DENSE_RANK", "LAG", "FIRST_VALUE", "LAST_VALUE ", "LEAD", "MAX", "MIN", "NTILE", "PERCENT_RANK", "RATIO_TO_REPORT",
            "REGR_SLOPE", "REGR_INTERCEPT", "REGR_COUNT", "REGR_R2", "REGR_AVGX", "REGR_AVGY", "REGR_SXX", "REGR_SYY", "REGR_SXY",
            "RANK", "ROW_NUMBER ", "STDDEV", "STDDEV_POP", "STDDEV_SAMP", "SUM", "VAR_POP", "VAR_SAMP", "VARIANCE",
            "OVER", "PARTITION", "BY", "RANGE", "UNBOUNDED", "PRECEDING", "FOLLOWING", "ASC", "DESC", "NULLS", "FIRST", "LAST",
            // CAST and data types
            "CAST", "MULTISET", "AS", "DECODE",
            "DAY", "DATE", "TIMESTAMP", "WITH", "LOCAL", "TIME", "ZONE", "YEAR", "MONTH", "WEEK", "TO", "HOUR", "MINUTE", "SECOND",
            "FLOAT", "REAL", "DECIMAL",
            "EXTRACT", "FROM",
            "CHAR", "CHARACTER", "NVARCHAR2", "NCHAR", "VARCHAR2", "VARCHAR",
            "NUMBER", "LONG", "INTEGER", "SMALLINT", "INT",
            "CLOB", "NCLOB", "BLOB", "BFILE",
            "BINARY_FLOAT", "BINARY_DOUBLE",
            "RAW", "RAW", "ROWID", "UROWID",
            // CASE and conditions
            "CASE", "WHEN", "THEN", "ELSE", "END",
            "NOT", "AND", "OR", "IS", "NULL", "BETWEEN", "IN", "LIKE", "ESCAPE",
            // Other
            "DISTINCT", "COUNT"
          }
        )
      );

    // SQL ANSI keywords beyond Oracle
    sqlKeyWordsGeneric = new HashSet<String>(
        Arrays.asList( new String[]
          {
            // Build-in functions
            "SUBSTRING"
          }
        )
      );

    // TODO See also DatabaseMetaData.getKeyWords()
    sqlKeyWordsGeneric.addAll(sqlKeyWordsOracle);

    sqlKeyWordsSqlServer = new HashSet<String>(sqlKeyWordsGeneric);
    sqlKeyWordsSqlServer.addAll(
        Arrays.asList( new String[]
          {
            "DATEADD", "DATEPART", "DATENAME", "DATEDIFF", "FORMAT", "TZOFFSET", "ISO_WEEK",
            "ISO_WEEK", "QUARTER", "DAYOFYEAR", "WEEKDAY", "MILLISECOND", "MICROSECOND", "NANOSECOND",
            "FRACTIONS", "PRECISION", "TIMEFROMPARTS", "DATEFROMPARTS"
          }
        )
      );

    sqlKeyWordsMysql = new HashSet<String>(sqlKeyWordsGeneric);
    sqlKeyWordsMysql.addAll(
        Arrays.asList( new String[]
          {
            "YEARWEEK", "WEEKOFYEAR", "DATE_FORMAT", "QUARTER", "STR_TO_DATE"
          }
        )
      );
  }

}

