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

import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;

import org.apache.log4j.Logger;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.BindingSet;

/**
 * Holds information about server-side pagination of a request
 * Initially taken from WrsSqlGenerator. For older change history see there
 */
public class WrsPagination
{
  private final Logger log = Logger.getLogger(getClass());
  private boolean available = false;
  private int start = -1;
  private int end = -1;
  private final WrqInfo wrqInfo;

  /**
   * Constructor
   */
  public WrsPagination() {
    super();
    this.wrqInfo = null;
  }

  /**
   * Constructor: Read pagination from a XML Wrq
   */
  public WrsPagination( WrqInfo wrqInfo, BindingSet resultingBindingSet )
  {
    super();

    this.wrqInfo = wrqInfo;

    NodeList selects = wrqInfo.getSelectNodes();
    String start = "", end = "";
    if( selects.getLength()>0 ) {
      start = ((Element)selects.item(0)).getAttribute("rowStart");
      end   = ((Element)selects.item(0)).getAttribute("rowEnd");
    }
    // in case of maxRows usages we want to set endRows
    if (!end.isEmpty())
    {
      try{
        int endInt = Integer.valueOf(end);
        setEnd(endInt);
      } catch(NumberFormatException e){
      // set the pagination so that a metadata request is made in case
      // of invalid attributes
      setStart(0);
      setEnd(-1);
      }
    }

    int startInt = 0;
    try { if(!start.isEmpty()) startInt = Integer.valueOf(start); } catch (NumberFormatException e){}

    if(startInt != 0){
      if(resultingBindingSet.hasKeyBindingItems()){
        try{
          if(startInt < 0  || getEnd() < 0 ){
            throw new IllegalArgumentException();
          }
          setAvailable(true);
          setStart(startInt);
        }
        catch(NumberFormatException e){
          // set the pagination so that a metadata request is made in case
          // of invalid attributes
          setStart(0);
          setEnd(-1);
        }
        catch(IllegalArgumentException e){
          // set the pagination so that a metadata request is made in case
          // of invalid attributes
          setStart(0);
          setEnd(-1);
        }
      }
      else{
        log.warn("Pagination is only supported for BindingSets with key columns. Used '"+resultingBindingSet.getName()+"'");
      }
    }
  }


  /**
   * @return the available
   */
  public boolean isAvailable() {
    return available && ! isMetaDataRequest(); 
  }

  /**
   * @param available the available to set
   */
  public void setAvailable(boolean available) {
    this.available = available;
  }

  /**
   * @return the start
   */
  public int getStart() {
    return start;
  }

  /**
   * @param start the start to set
   */
  public void setStart(int start) {
    this.start = start;
  }

  /**
   * @return the end
   */
  public int getEnd() {
    return end;
  }

  /**
   * @param end the end to set
   */
  public void setEnd(int end) {
    this.end = end;
  }

  @Override
  public String toString() {
    return "Pagination available: " + isAvailable() + " start: " + getStart() + "  end:" + getEnd();
  }

  public boolean isMetaDataRequest() {
    return getEnd() == 0 || getEnd() < getStart();
  }

  /**
   * Wraps the statement with a paginating select
   * @param wrq2Sql
   * @return
   * @throws Exception
   */
  protected SQLStatementWithParams generateStatementWithPagination( Wrq2Sql wrq2Sql ) throws Exception
  {
    StringBuffer sql = new StringBuffer();
    final List<Element> boundVariables = new LinkedList<Element>(); // All the host variables in correct order (same as ? in generated statement), may be from wrq:Calc or f:Filter

    // The outer select, allowing us to filter on ROW_NUMBER() from the inner select
    sql.append("SELECT * FROM (");

    sql.append( wrq2Sql.generateSelectClause( boundVariables ) );

    sql.append(", ROW_NUMBER() OVER( ");

    String orderBy = wrq2Sql.generateOrderClause( boundVariables ).toString();

    if( ! orderBy.isEmpty() )
      sql.append(orderBy);
    else {
      String s = "";
      sql.append("ORDER BY ");
      Iterator<BindingItem> it = wrq2Sql.resultingBindingSet.getBindingItems().iterator();
      while( it.hasNext() ) {
        BindingItem bi = it.next();
        if( bi.isKey() ) {
          sql.append( s );
          sql.append( bi.getColumnExpression() );
          s = ", ";
        }
      }
    }

    sql.append(") bcdPagination");  // end of ROW_NUMBER()

    sql.append( wrq2Sql.generateFromClause() );
    sql.append( wrq2Sql.generateWhereClause( boundVariables ) );
    sql.append( wrq2Sql.generateGroupingClause( boundVariables) );
    sql.append( wrq2Sql.generateHavingClause (boundVariables) );


    sql.append(") bcdBase "); // Tera needs this, Oracle accepts it
    sql.append(" WHERE bcdPagination>="+getStart()+" AND bcdPagination<="+getEnd());

    for(Iterator<String> it = wrqInfo.getOrderingBRefs().iterator(); it.hasNext();  ) {
      WrqBindingItem bi = wrqInfo.getAllBRefAggrs().get(it.next());
      bi.setColumnExpression(bi.getAlias());
      bi.setTableAlias("bcdBase");
    }
    sql.append( wrq2Sql.generateOrderClause( boundVariables ) );

    return new SQLStatementWithParams(sql.toString(), boundVariables, wrq2Sql.resultingBindingSet);
  }

}
