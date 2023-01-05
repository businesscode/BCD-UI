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
package de.businesscode.util.jdbc;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.Reader;
import java.lang.reflect.InvocationTargetException;
import java.sql.Blob;
import java.sql.Clob;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Types;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import org.apache.commons.io.IOUtils;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;

import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.Bindings;
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
  static private final Logger log = LogManager.getLogger(DatabaseCompatibility.class);
  private static DatabaseCompatibility singleton = null;

  // Set of database-specific reserved words, which are often used in column expressions and usually not referring to a column
  // Used for knowing, where to add table prefixes in SQL
  // If you miss a word here and a non-column name gets a table prefix in your statement, 
  // Instead of extending the list, you may also prepend "bcdNoTableAlias." to it to hint SQL generator
  protected final Set<String> sqlKeyWordsOracle;
  protected final Set<String> sqlKeyWordsMysql;
  protected final Set<String> sqlKeyWordsPostgres;
  protected final Set<String> sqlKeyWordsSqlServer;
  protected final Set<String> sqlKeyWordsGeneric;
  protected final Map<String, String> databaseProduct = new HashMap<String, String>();

  protected final Map<String, String[]> sqlServerCalcFktMapping;
  protected final Map<String, String[]> oracleCalcFktMapping;
  protected final Map<String, String[]> mysqlCalcFktMapping;
  protected final Map<String, String[]> redshiftCalcFktMapping;

  protected final Map<String, String> aggregationMappingGeneric;
  protected final Map<String, String> aggregationMappingMySql;

  protected final Map<String, String[]> spatialFktMapping;
  protected final Map<String, String[]> oracleSpatialFktMapping;
  protected final Map<String, String[]> sqlServerSpatialFktMapping;

  protected final Map<String, String> sqlSetOperators;

  // When casting to VARCHAR, we use this size, should be long enough and not hurt on the other side
  private int LENGTH_FOR_CAST_TO_VARCHAR = 1024;

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
        DatabaseCompatibility.singleton = clazz.getDeclaredConstructor().newInstance();
      } catch (InstantiationException | InvocationTargetException | NoSuchMethodException | IllegalAccessException e) {
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
   * @param jdbcResourceName
   * @return Set of key words for the database belonging to the BindingSets connection
   */
  public Set<String>getReservedDBWords(String jdbcResourceName)
  {
    try {
      String product = getDatabaseProductNameLC(jdbcResourceName);
      if( product.contains("oracle") )
        return sqlKeyWordsOracle;
      else if( product.contains("mysql") )
        return sqlKeyWordsMysql;
      else if( product.contains("microsoft sql server") )
        return sqlKeyWordsSqlServer;
      else if( product.contains("postgresql") )
        return sqlKeyWordsPostgres;
    } catch (Exception e) {
      log.error(e, e);
    }
    return sqlKeyWordsGeneric;
  }

  /**
   * If the database used for the selected BindingSet needs an extra column list for with clauses
   * @param jdbcResourceName
   * @return
   */
  public boolean dbNeedsColumnListForRecursiveWithClause(String jdbcResourceName)
  {
    String product = getDatabaseProductNameLC(jdbcResourceName);
    return product.contains("oracle") || product.contains("redshift") || product.contains("h2");
  }

  /**
   * Some databases need WITH RECURSIVE for recursive queries, some do not understand it
   * @param jdbcResourceName
   * @return
   */
  public boolean dbNeedsRecursiveInWithClause(String jdbcResourceName) {
    String product = getDatabaseProductNameLC(jdbcResourceName);
    return ! (product.contains("oracle") || product.contains("microsoft sql server"));
  }

  /**
   * Are we allowed to use GROUPING SETs and GROUPING()?
   * @param jdbcResourceName
   * @return
   */
  public boolean dbSupportsGroupingSets(String jdbcResourceName) {
    String product = getDatabaseProductNameLC(jdbcResourceName);
    return product.contains("oracle") || product.contains("microsoft sql server") || product.contains("postgresql");
  }

  /**
   * Returns true if the database of resultingBindingSet supports GROUPING SETS
   * @param jdbcResourceName
   * @return
   */
  public String dbLikeEscapeBackslash(String jdbcResourceName) {
    String product = getDatabaseProductNameLC(jdbcResourceName);
    return product.contains("redshift") ? "" : " ESCAPE '\\'";
  }

  /**
   * @param jdbcResourceName
   * @return
   */
  public boolean dbNeedsVarcharCastForConcatInTopN(String jdbcResourceName) {
    return false;
  }

  /**
   * Oracle sorts nulls first in desc (order by and rank order by), tera and sqlserver do this vice versa
   * Sadly, of these, only oracle allows NULLS FIRST/LAST in ORDER BY
   * @param jdbcResourceName
   * @return How often bound variables of the item used for ordering are used in the created expression
   */
  public int dbOrderByNullsLast( String jdbcResourceName, String colExpr, boolean isDesc, StringBuffer sql ) 
  {
    String product = getDatabaseProductNameLC(jdbcResourceName);
    if( product.contains("oracle") || product.contains("redshift") ) {
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

  /**
   * Wraps the expression so that the result is of type VARCHAR or CHAR
   * @param jdbcResourceName Used to derive database specific syntax
   * @param origJdbcDataType Used to skip wrapping if already CHAR/VARCHAR and keep format YYYY-MMM-DDD for type date
   * @param expr             Expression to be wrapped
   * @return                 Wrapped SQL expression
   */
  public String castToVarchar(String jdbcResourceName, int origJdbcDataType, String expr)
  {
    String product = getDatabaseProductNameLC(jdbcResourceName);
    if( origJdbcDataType == Types.CHAR || origJdbcDataType == Types.VARCHAR )
      return expr;
    // Conversion via CAST is ok for all types for all databases when ansi date is set as default.
    // But BCD-UI treats DATE as date-only (without time). Usually this is handled when reading the result-set for data-type DATE.
    // Since for VDM we switch to type VARCHAR, it would not happen and thus we make sure here, that DATE is ANSI-Date but without time
    else if( origJdbcDataType == Types.DATE ) {
      if( product.contains("microsoft sql server") )
        return "FORMAT("+expr+",'yyyy-mm-dd')";
      else if( product.contains("mysql") )
        return "DATE_FORMAT("+expr+",'%Y-%m-%d')";
      else
        return "TO_CHAR("+expr+",'yyyy-mm-dd')";
    }
    else if( product.contains("oracle") )
      return "CAST (" + expr + " AS VARCHAR2("+ LENGTH_FOR_CAST_TO_VARCHAR +"))";
    else if( product.contains("mysql") )
      return "CAST (" + expr + " AS CHAR("+ LENGTH_FOR_CAST_TO_VARCHAR +"))";
    else
      return "CAST (" + expr + " AS VARCHAR("+ LENGTH_FOR_CAST_TO_VARCHAR +"))";
  }

  
  public Map<String, String[]> getDefaultCalcFktMapping()
  {
    return oracleCalcFktMapping;
  }

  public Map<String, String[]> getCalcFktMapping( String jdbcResourceName ) 
  {
    String product = getDatabaseProductNameLC(jdbcResourceName);
    if( product.contains("microsoft sql server") )
      return sqlServerCalcFktMapping;
    if( product.contains("mysql") )
      return mysqlCalcFktMapping;
    if( product.contains("redshift") )
      return redshiftCalcFktMapping;
    return oracleCalcFktMapping;    
  }

  /**
   * For the simple @aggr shortcut this is the mapping to the corresponding SQL expression
   */
  public Map<String, String> getAggrFktMapping( String jdbcResourceName ) 
  {
    String product = getDatabaseProductNameLC(jdbcResourceName);
    if( product.contains("mysql") )
      return aggregationMappingMySql;    
    return aggregationMappingGeneric;
  }

  /**
   * Standard SQL Set Operators
   */
  public Map<String, String> getSetOperators()
  {
    return sqlSetOperators;
  }
  
  /**
   * Geo spatial operators differ significantly from database to database
   */
  public Map<String, String[]> getSpatialFktMapping(String jdbcResourceName)
  {
    String product = getDatabaseProductNameLC(jdbcResourceName);
    if( product.contains("oracle") )
      return oracleSpatialFktMapping;
    else if( product.contains("microsoft sql server") )
      return sqlServerSpatialFktMapping;
    return spatialFktMapping;
  }

  
  /**
   * Does not do much checking, but as all BindingSets are tested on start, the risk is low
   * @param jdbcResourceName
   * @return
   */
  public String getDatabaseProductNameLC(String jdbcResourceName)
  {
    if (databaseProduct.containsKey(jdbcResourceName)) {
      return databaseProduct.get(jdbcResourceName);     
    }
  
    Connection con = null;
    // we either use managed or unmanaged connection depended on the scope of execution
    boolean isManagedConnection = RequestLifeCycleFilter.isThreadBoundToHttpRequest();
    try {
      // Let's get the connection (will not be a new one but the used one, because each request gets always the same for one jdbcResourceName)
      /*
       * access BareConfiguration, since Configuration initialization has dependency on database (cycle)
       */
      con = isManagedConnection ? BareConfiguration.getInstance().getManagedConnection(jdbcResourceName) :
        BareConfiguration.getInstance().getUnmanagedConnection(jdbcResourceName);

      String databaseProductName = con.getMetaData().getDatabaseProductName().toLowerCase();
      // AWS Redshift returns PostgreSQL as product name, but we want to distinguish them
      if( con.getMetaData().getURL().toLowerCase().contains("redshift") ) databaseProductName = "redshift";
      if( con.getMetaData().getURL().toLowerCase().contains("snowflake") ) databaseProductName = "teradata";
      databaseProduct.put(jdbcResourceName, databaseProductName);
      return databaseProductName;
    } catch (Exception e) {
      log.error("Database product for jdbcResourceName '"+jdbcResourceName+"' could not be determined.", e);
    } finally {
      if(!isManagedConnection)
        Closer.closeAllSQLObjects(con);
    }
    return null;
  }
  
  /**
   * returns the clob column data as a string
   * @param bindingSetName the name of the currently used binding set
   * @param rs the current result set
   * @param column the index of the columns within the result set
   * @return clob data as a string
   */
  public String getClob(String bindingSetName, ResultSet rs, int column) throws Exception {
    InputStream iStr = getClobInputStream(bindingSetName, rs, column);
    return iStr != null ? IOUtils.toString(iStr, "UTF-8") : null;
  }

  /**
   * returns the blob column data as a byte array
   * @param bindingSetName the name of the currently used binding set
   * @param rs the current result set
   * @param column the index of the columns within the result set
   * @return byte array with data
   */
  public byte[] getBlob(String bindingSetName, ResultSet rs, int column) throws Exception {
    InputStream iStr = getBlobInputStream(bindingSetName, rs, column);
    return iStr != null ? IOUtils.toByteArray(iStr) : null;
  }

  /**
   * returns the clob column data as an inputstream
   * @param bindingSetName the name of the currently used binding set
   * @param rs the current result set
   * @param column the index of the columns within the result set
   * @return clob data as an inputstream
   */
  public InputStream getClobInputStream(String bindingSetName, ResultSet rs, int column) throws Exception {
    BindingSet bs  = Bindings.getInstance().get(bindingSetName, new ArrayList<String>());
    String content = null;
    InputStream iStr = null;
    Clob clob = null;
    Reader cContentReader = null;
    // postgresql would fail when using getClob, so we use getString instead to access the TEXT column
    if ("postgresql".equals(getDatabaseProductNameLC(bs.getJdbcResourceName()))) {
      content = rs.getString(column);
      if (content != null)
        iStr = new ByteArrayInputStream(content.getBytes("UTF-8"));
    }
    else {
      clob = rs.getClob(column);
    }
    if (clob != null) {
      cContentReader = clob.getCharacterStream();
      if (cContentReader != null) {
        content = IOUtils.toString(cContentReader);
        iStr = new ByteArrayInputStream(content.getBytes("UTF-8"));
        cContentReader.close();
      }
    }
    return iStr;
  }
  
  /**
   * returns the blob column data as an inputstream
   * @param bindingSetName the name of the currently used binding set
   * @param rs the current result set
   * @param column the index of the columns within the result set
   * @return blob data as an inputstream
   */
  public InputStream getBlobInputStream(String bindingSetName, ResultSet rs, int column) throws Exception {
    BindingSet bs  = Bindings.getInstance().get(bindingSetName, new ArrayList<String>());
    InputStream iStr = null;
    // postgresql would fail when using getBlob, so we use getBytes instead to access the binary column
    if ("postgresql".equals(getDatabaseProductNameLC(bs.getJdbcResourceName()))) {
      iStr = new ByteArrayInputStream(rs.getBytes(column));
    }
    else {
      Blob blob = rs.getBlob(column);
      if (blob != null)
        iStr = new ByteArrayInputStream(IOUtils.toByteArray(blob.getBinaryStream()));
    }
    return iStr;
  }
  
  /**
   * Retrieve a singleton via getInstance() to make your SQl database type dependent
   */
  protected DatabaseCompatibility()
  {
    //---------------------------------------
    // Allowed calc expressions in sql
    Map<String, String[]> calcFktMapping;
    // isArithmetic (i.e. it requires numeric input), openingExpression, operandSeparator, closingExpression, inner aggregation or an analyt. fct
    calcFktMapping = new HashMap<String,String[]>();
    calcFktMapping.put("Calc",          new String[]{"Y",  "",     "+",   "", "Y"}); // We default to + if Calc has multiple children

    // Single argument (i.e. children) aggregators
    calcFktMapping.put("Sum",           new String[]{"Y",  "SUM(",          "",  ")", "I"});
    calcFktMapping.put("Max",           new String[]{"N",  "MAX(",          "",  ")", "I"});
    calcFktMapping.put("Min",           new String[]{"N",  "MIN(",          "",  ")", "I"});
    calcFktMapping.put("Avg",           new String[]{"Y",  "AVG(",          "",  ")", "I"});
    calcFktMapping.put("Count",         new String[]{"N",  "COUNT(",        "",  ")", "I"});
    calcFktMapping.put("CountDistinct", new String[]{"N",  "COUNT(DISTINCT(", "",  "))", "I"});
    calcFktMapping.put("Distinct",      new String[]{"N",  "DISTINCT(",     "",  ")", "I"});
    calcFktMapping.put("Grouping",      new String[]{"N",  "GROUPING(",     "",  ")", "I"});

    // Single argument (i.e. child) modifier
    calcFktMapping.put("None",          new String[]{"N",  "",              "",  "",  "N"});
    calcFktMapping.put("MakeNull",      new String[]{"N",  "CASE WHEN 1=1 THEN NULL ELSE ", "",  " END",  "N"});
    calcFktMapping.put("CastAsVarchar", new String[]{"N",  "CAST(", "",  " AS VARCHAR(1024))",  "N"});
    calcFktMapping.put("CastAsNumeric", new String[]{"N",  "CAST(", "",  " AS DECIMAL)",  "N"});
    calcFktMapping.put("CastAsInteger", new String[]{"N",  "CAST(", "",  " AS INTEGER)",  "N"});
    calcFktMapping.put("CastAsBRef",    new String[]{"N",  "", "",  "",  "N"});  // This comes with a @bRef attribute and is handled explicitly in WrsCalc2Sql
    calcFktMapping.put("Niz",           new String[]{"Y",  "NULLIF(",       "",  ",0)", "N"});

    // Two arguments (i.e. children) operators
    calcFktMapping.put("Mod",           new String[]{"Y",  "MOD(",  ",",  ")", "N"});
    // Boolean ops
    calcFktMapping.put("Eq",            new String[]{"N",  "", "=",  "", "N"});
    calcFktMapping.put("NEq",           new String[]{"N",  "", "<>", "", "N"});
    calcFktMapping.put("Gt",            new String[]{"N",  "", ">",  "", "N"});
    calcFktMapping.put("GtE",           new String[]{"N",  "", ">=", "", "N"});
    calcFktMapping.put("Lt",            new String[]{"N",  "", "<",  "", "N"});
    calcFktMapping.put("LtE",           new String[]{"N",  "", "<=", "", "N"});

    // Multi arguments (i.e. children) operators
    calcFktMapping.put("Add",           new String[]{"Y",  "(",     "+",  ")", "N"});
    calcFktMapping.put("Sub",           new String[]{"Y",  "(",     "-",  ")", "N"});
    calcFktMapping.put("Mul",           new String[]{"Y",  "(",     "*",  ")", "N"});
    calcFktMapping.put("Div",           new String[]{"Y",  "(",     "/ NULLIF(",  ",0) )", "N"});
    calcFktMapping.put("Concat",        new String[]{"N",  "(",     "||", ")", "N"});

    // With special handling in SQL generator
    calcFktMapping.put("Case",          new String[]{"N",  "CASE ",   "",       " END ",  "N"});
    calcFktMapping.put("When",          new String[]{"N",  " WHEN ",  "THEN ",  "",       "N"});
    calcFktMapping.put("Else",          new String[]{"N",  " ELSE ",  "",       "",       "N"});

    // Analytical functions, optional module implemented in BCD-UI Enterprise Edition
    // No argument
    calcFktMapping.put("RowNumberOver",   new String[]{"N", "ROW_NUMBER(",    "",   ")", "O"});
    calcFktMapping.put("RankOver",        new String[]{"N", "RANK(",          "",   ")", "O"});
    calcFktMapping.put("DenseRankOver",   new String[]{"N", "DENSE_RANK(",    "",   ")", "O"});
    calcFktMapping.put("CumeDistOver",    new String[]{"N", "CUME_DIST(",     "",   ")", "O"});
    // With argument
    calcFktMapping.put("CountOver",       new String[]{"N", "COUNT(",         "",   ")", "O"});
    calcFktMapping.put("SumOver",         new String[]{"Y", "SUM(",           "",   ")", "O"});
    calcFktMapping.put("LagOver",         new String[]{"N", "LAG(",           "",   ")", "O"});
    calcFktMapping.put("LeadOver",        new String[]{"N", "LEAD(",          "",   ")", "O"});
    calcFktMapping.put("FirstValueOver",  new String[]{"N", "FIRST_VALUE(",   "",   ")", "O"});
    calcFktMapping.put("LastValueOver",   new String[]{"N", "LAST_VALUE(",    "",   ")", "O"});
    calcFktMapping.put("MinOver",         new String[]{"N", "MIN(",           "",   ")", "O"});
    calcFktMapping.put("MaxOver",         new String[]{"N", "MAX(",           "",   ")", "O"});
    // Specification
    calcFktMapping.put("PartitionBy",     new String[]{"N", "PARTITION BY ",  ",",  "",  "N"});
    calcFktMapping.put("OrderBy",         new String[]{"N", "ORDER BY ",      ",",  "",  "N"});
    calcFktMapping.put("Asc",             new String[]{"N", "",               "",   "ASC ",             "N"});
    calcFktMapping.put("AscNf",           new String[]{"N", "",               "",   "ASC NULLS FIRST ", "N"});
    calcFktMapping.put("AscNl",           new String[]{"N", "",               "",   "ASC ",             "N"}); // LAST is default for Asc Ora, PG, RS
    calcFktMapping.put("Desc",            new String[]{"N", "",               "",   "DESC ",            "N"});
    calcFktMapping.put("DescNf",          new String[]{"N", "",               "",   "DESC ",            "N"}); // FIRST is default for Desc  Ora, PG, RS
    calcFktMapping.put("DescNl",          new String[]{"N", "",               "",   "DESC NULLS LAST ", "N"});

    // Calc functions are just _almost_ the same for all db dialects, here we overwrite the exceptions
    oracleCalcFktMapping = calcFktMapping;
    sqlServerCalcFktMapping = new HashMap<String, String[]>(calcFktMapping);
    // Using '+' for MSSQL for concat does not autocast: VARCHAR + INTEGER fails. Concat does cast, same as || does for oracle.
    // On the other hand, concat for oracle does not support >2 arguments, so Concat is handled db specific
    sqlServerCalcFktMapping.put("Concat", new String[]{"N", "CONCAT(",  ",", ")",                   "N"});
    sqlServerCalcFktMapping.put("Mod",    new String[]{"Y", "",         "%",  "",                   "N"});
    sqlServerCalcFktMapping.put("AscNf",  new String[]{"N", "",         "",   "ASC ",               "N"}); // FIRST is default for Asc TSQL
    sqlServerCalcFktMapping.put("AscNl",  new String[]{"N", "",         "",   "ASC NULLS LAST ",    "N"}); // TODO fails
    sqlServerCalcFktMapping.put("DescNf", new String[]{"N", "",         "",   "DESC NULLS FIRST ",  "N"}); // TODO fails
    sqlServerCalcFktMapping.put("DescNl", new String[]{"N", "",         "",   "DESC ",              "N"}); // LAST is default for Asc TSQL
    
    // MySql
    mysqlCalcFktMapping = new HashMap<String, String[]>(calcFktMapping);
    mysqlCalcFktMapping.put("Grouping",   new String[]{"N", "ISNULL(",      "",               ")",                  "I"});
    mysqlCalcFktMapping.put("Concat",     new String[]{"N", "CONCAT(CAST(", "AS CHAR),CAST(", "AS CHAR))",          "N"});
    mysqlCalcFktMapping.put("CastAsVarchar", new String[]{"N", "CAST(",     "",               "AS CHAR)",           "I"});
    mysqlCalcFktMapping.put("AscNf",      new String[]{"N", "",             "",               "ASC ",               "N"}); // FIRST is default for Asc MySql
    mysqlCalcFktMapping.put("AscNl",      new String[]{"N", "",             "",               "ASC NULLS LAST ",    "N"}); // TODO fails
    mysqlCalcFktMapping.put("DescNf",     new String[]{"N", "",             "",               "DESC NULLS FIRST ",  "N"}); // TODO fails
    mysqlCalcFktMapping.put("DescNl",     new String[]{"N", "",             "",               "DESC ",              "N"}); // LAST is default for Asc MySql

    // Redshift
    redshiftCalcFktMapping = new HashMap<String, String[]>(calcFktMapping);
    redshiftCalcFktMapping.put("Grouping",   new String[]{"N", "ISNULL(", "", ")", "I"});
    redshiftCalcFktMapping.put("Concat",     new String[]{"N",  "(",     " || ", ")", "N"}); // Redshift needs spaces for ||?|| 
    
    //---------------------------------------
    // For the simple @aggr shortcut this is the mapping to the corresponding SQL expression
    aggregationMappingGeneric = new HashMap<String, String>();
    aggregationMappingGeneric.put("sum",       "SUM");
    aggregationMappingGeneric.put("max",       "MAX");
    aggregationMappingGeneric.put("min",       "MIN");
    aggregationMappingGeneric.put("avg",       "AVG");
    aggregationMappingGeneric.put("count",     "COUNT");
    aggregationMappingGeneric.put("grouping",  "GROUPING");
    aggregationMappingGeneric.put("none",      ""); // Can be used if the column expression already has an aggregator defined
    
    aggregationMappingMySql = new HashMap<String, String>(aggregationMappingGeneric);
    aggregationMappingMySql.put("grouping",  "ISNULL");


    //---------------------------------------
    // Set operators
    sqlSetOperators = new HashMap<String,String>();
    sqlSetOperators.put("Union",        "UNION");
    sqlSetOperators.put("UnionAll",     "UNION ALL");
    sqlSetOperators.put("Except",       "EXCEPT");
    sqlSetOperators.put("ExceptAll",    "EXCEPT ALL");
    sqlSetOperators.put("Intersect",    "INTERSECT");
    sqlSetOperators.put("IntersectAll", "INTERSECT ALL");

    //---------------------------------------
    // Spatial operators
    spatialFktMapping = new HashMap<String,String[]>();

    // Open Geospatial Consortium Inc.
    spatialFktMapping.put("GeoFromWkt", new String[]{"ST_WktToSQL(", "", ")"});
    spatialFktMapping.put("GeoFromWktMakeValid", new String[]{"ST_MakeValid(ST_WktToSQL(", "", "))"});
    spatialFktMapping.put("SpatContains", new String[]{"ST_Contains(",     ",",  ") = 1"});
    spatialFktMapping.put("SpatContained", new String[]{"ST_Contains(",     ",",  ") = 1"});
    spatialFktMapping.put("SpatIntersects", new String[]{"ST_Intersects(",     ",",  ") = 1"});

    // Database specific
    oracleSpatialFktMapping = new HashMap<String, String[]>(spatialFktMapping);
    oracleSpatialFktMapping.put("GeoFromWkt", new String[]{"SDO_UTIL.FROM_WKTGEOMETRY(",  "",  ")"});
    oracleSpatialFktMapping.put("GeoFromWktMakeValid", new String[]{"SDO_UTIL.RECTIFY_GEOMETRY(SDO_UTIL.FROM_WKTGEOMETRY(", "", "))"});
    oracleSpatialFktMapping.put("SpatContains", new String[]{"SDO_CONTAINS(",     ",",  ") = 1"});
    oracleSpatialFktMapping.put("SpatContained", new String[]{"SDO_CONTAINS(",     ",",  ") = 1"});
    oracleSpatialFktMapping.put("SpatIntersects", new String[]{"SDO_INTERSECTION(",     ",",  ") = 1"});

    // Type EPSG. =WGS84, this is the most common coordinate reference system, also used for GPS.    
    // We use it for parsing WKT. Mandatory only for SQL-Server. As long as this is hard-coded here. the bRef's value must also be EPSG4326 for operators to work
    // We use geography:: and not geometry:: because we assume working with geo-spatial data here, not with a plain Euclidean space.
    final String DEFAULT_SRID = "4326";
    sqlServerSpatialFktMapping = new HashMap<String, String[]>(spatialFktMapping);
    sqlServerSpatialFktMapping.put("GeoFromWkt", new String[]{"geography::STGeomFromText(", "", ", "+DEFAULT_SRID+")"});
    sqlServerSpatialFktMapping.put("GeoFromWktMakeValid", new String[]{"geography::STGeomFromText(", "",  ", "+DEFAULT_SRID+").MakeValid()"});
    sqlServerSpatialFktMapping.put("SpatContains", new String[]{"",  ".STContains(", ") = 1"});
    sqlServerSpatialFktMapping.put("SpatContained", new String[]{"",  ".STContains(", ") = 1"});
    sqlServerSpatialFktMapping.put("SpatIntersects", new String[]{"",  ".STIntersects(", ") = 1"});

    //---------------------------------------
    // SQL keywords, common for all databases
    sqlKeyWordsGeneric = new HashSet<String>(
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
            "MOD", "MONTHS_BETWEEN",
            "NANVL", "NCHARTOROWID", "NCHR", "NEW_TIME", "NEXT_DAY", "NHEXTORAW", "NLS_CHARSET_DECL_LEN", "NLS_CHARSET_ID", "NLS_CHARSET_NAME", "NLS_INITCAP", "NLS_LOWER", "NLSSORT", "NLS_UPPER", "NULLFN", "NULLIF", "NUMTODSINTERVAL", "NUMTOYMINTERVAL", "NVL",
            "POWER",
            "RAWTOHEX", "RAWTONHEX", "REF", "REGEXP_INSTR", "REGEXP_LIKE", "REGEXP_REPLACE", "REGEXP_SUBSTR", "REMAINDER", "REPLACE", "ROLLBACK_NR", "ROLLBACK_SV", "ROLLUP", "ROUND", "ROWID ", "ROWIDTOCHAR", "ROWIDTONCHAR", "ROWLABEL", "ROWNUM", "RPAD", "RTRIM",
            "SAVEPOINT", "SESSIONTIMEZONE", "SET", "SET_TRANSACTION_USE", "SIGN", "SIN", "SINH", "SOUNDEX", "STRING_AGG", "SQLCODE", "SQLERRM", "SQRT", "SUBSTR", "SUBSTRB", "SUBSTRC", "SUBSTR2", "SUBSTR4", "SUBSTRING",
            "SYS_AT_TIME_ZONE", "SYS_CONTEXT", "SYSDATE", "SYS_EXTRACT_UTC", "SYS_GUID", "SYS_LITERALTODATE", "SYS_LITERALTODSINTERVAL", "SYS_LITERALTOTIME", "SYS_LITERALTOTIMESTAMP", "SYS_LITERALTOTZTIME", "SYS_LITERALTOTZTIMESTAMP", "SYS_LITERALTOYMINTERVAL", "SYS$LOB_REPLICATION", "SYSTIMESTAMP",
            "TAN", "TANH", "TO_ANYLOB", "TO_BINARY_DOUBLE", "TO_BINARY_FLOAT", "TO_BLOB", "TO_CHAR", "TO_CLOB", "TO_DATE", "TO_DSINTERVAL", "TO_LABEL", "TO_MULTI_BYTE", "TO_NCHAR", "TO_NCLOB", "TO_NUMBER", "TO_RAW", "TO_SINGLE_BYTE", "TO_TIME", "TO_TIMESTAMP", "TO_TIMESTAMP_TZ", "TO_TIME_TZ", "TO_YMINTERVAL", "TRANSLATE", "TRIM", "TRUNC", "TZ_OFFSET",
            "UID", "UNISTR", "UPPER", "UROWID", "USER", "USERENV",
            "VALUE", "VSIZE",
            "XOR",
            // Aggregation functions
            "AVG", "CORR", "COVAR_POP", "COVAR_SAMP", "COUNT", "CURRENT", "CUME_DIST", "DENSE_RANK", "LAG", "FIRST_VALUE", "LAST_VALUE", "LEAD", "MAX", "MIN", "NTILE", "PERCENT_RANK", "RATIO_TO_REPORT",
            "REGR_SLOPE", "REGR_INTERCEPT", "REGR_COUNT", "REGR_R2", "REGR_AVGX", "REGR_AVGY", "REGR_SXX", "REGR_SYY", "REGR_SXY",
            "RANK", "ROW", "ROWS", "ROW_NUMBER", "STDDEV", "STDDEV_POP", "STDDEV_SAMP", "SUM", "VAR_POP", "VAR_SAMP", "VARIANCE",
            "OVER", "ORDER", "PARTITION", "BY", "RANGE", "UNBOUNDED", "PRECEDING", "FOLLOWING", "ASC", "DESC", "NULLS", "FIRST", "LAST",
            // CAST and data types
            "CAST", "MULTISET", "AS", "DECODE",
            "DAY", "DATE", "TIMESTAMP", "INTERVAL", "WITH", "LOCAL", "AT", "TIME", "ZONE", "YEAR", "ISOYEAR", "QUARTER", "MONTH", "WEEK", "TO", "HOUR", "MINUTE", "SECOND",
            "FLOAT", "REAL", "DECIMAL", "NUMERIC",
            "EXTRACT", "FROM",
            "CHAR", "CHARACTER", "NVARCHAR2", "NCHAR", "VARCHAR2", "VARCHAR",
            "NUMBER", "LONG", "INTEGER", "SMALLINT", "INT",
            "CLOB", "NCLOB", "BLOB", "BFILE",
            "BINARY_FLOAT", "BINARY_DOUBLE",
            "RAW", "RAW", "ROWID", "UROWID",
            // CASE and conditions
            "CASE", "WHEN", "THEN", "ELSE", "END",
            "NOT", "AND", "OR", "IS", "NULL", "BETWEEN", "IN", "LIKE", "ESCAPE",
            // Spatial functions according to OGC
            "ST_CONTAINS", "ST_INTERSECTS", "ST_ASTEXT",
            // Other
            "DISTINCT", "COUNT"
          }
        )
      );

    // Oracle specific
    sqlKeyWordsOracle = new HashSet<String>(sqlKeyWordsGeneric);
    sqlKeyWordsOracle.addAll(
        Arrays.asList( new String[]
          {
            // Build-in functions
            "SDO_CONTAINS", "SDO_UTIL", "FROM_WKTGEOMETRY"
          }
        )
      );


    // SQL Server specific
    sqlKeyWordsSqlServer = new HashSet<String>(sqlKeyWordsGeneric);
    sqlKeyWordsSqlServer.addAll(
        Arrays.asList( new String[]
          {
            "DATEADD", "DATEPART", "DATENAME", "DATEDIFF", "DATETIME", "DATETIME2", "FORMAT", "TZOFFSET", "ISO_WEEK", "GETUTCDATE",
            "ISO_WEEK", "DAYOFYEAR", "WEEKDAY", "MILLISECOND", "MICROSECOND", "NANOSECOND",
            "FRACTIONS", "PRECISION", "TIMEFROMPARTS", "DATEFROMPARTS",
            "DIFFERENCE", "LEFT", "LEN", "PATINDEX", "QUOTENAME", "REPLICATE", "REVERSE", "RIGHT", "SPACE", "STRING_SPLIT",
            "GEOMETRY", "GEOGRAPHY", "POINT", "STGEOMFROMTEXT", "STCONTAINS", "STINTERSECTS", "ENVELOPEAGGREGATE", "TOSTRING", "CURVETOLINEWITHTOLERANCE"
          }
        )
      );


    // MySql specific
    sqlKeyWordsMysql = new HashSet<String>(sqlKeyWordsGeneric);
    sqlKeyWordsMysql.addAll(
        Arrays.asList( new String[]
          {
            "YEARWEEK", "WEEKOFYEAR", "DATE_FORMAT", "STR_TO_DATE", "NOW"
          }
        )
      );

    // PostgreSQL specific
    sqlKeyWordsPostgres = new HashSet<String>(sqlKeyWordsGeneric);
    sqlKeyWordsPostgres.addAll(
        Arrays.asList( new String[]
          {
            "NOW", "TIMESTAMPTZ", "UUID", "TIME", "ZONE"
          }
        )
    );
  }
}

