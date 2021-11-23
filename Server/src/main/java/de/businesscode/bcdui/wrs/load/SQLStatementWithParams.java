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

import java.util.LinkedList;
import java.util.List;

import org.w3c.dom.Element;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingNotFoundException;

/**
 * Represents part of an SQL string and the values for bound variables
 */
public class SQLStatementWithParams {

  private StringBuilder statement = new StringBuilder();
  private List<Element> filterItems = new LinkedList<Element>();
  private List<String> filterValues = new LinkedList<String>();
  private List<BindingItem> filterBindingItems = new LinkedList<BindingItem>();

  public SQLStatementWithParams() {
    super();
  }

  public SQLStatementWithParams(String statement) {
    super();
    this.statement.append(statement);
  }
   
  public SQLStatementWithParams(String statement, List<Element> filterItems, BindingSet currBindingSet) throws BindingNotFoundException {
    super();
    append(statement, filterItems, currBindingSet);
  }

  public SQLStatementWithParams append(SQLStatementWithParams moreStatement) throws BindingNotFoundException 
  {
    if( moreStatement == null ) return this;

    statement.append(moreStatement.getStatement());
    filterItems.addAll(moreStatement.getFilterItems());
    filterValues.addAll(moreStatement.getFilterValues());
    filterBindingItems.addAll(moreStatement.getFilterBindingItems());
    return this;
  }
  
  public SQLStatementWithParams append(String currStatement)
  {
    statement.append(currStatement);
    return this;
  }

  public SQLStatementWithParams append(String currStatement, List<Element> currFilterItems, BindingSet currBindingSet) throws BindingNotFoundException 
  {  
    statement.append(currStatement);
    filterItems.addAll(currFilterItems);
    
    for (Element e : currFilterItems) {
      filterValues.add(e.getAttribute("value"));
      if( !e.getAttribute("bRef").isEmpty() )
        filterBindingItems.add(currBindingSet.get(e.getAttribute("bRef")));
      // If we want to enforce a numeric type (needed for example for NULLIF(v,0)), we need to create a dummy BindingItem here as a carrier for the data type
      else if( "NUMERIC".equals(e.getAttribute(Bindings.jdbcDataTypeNameAttribute)) ) {
        BindingItem dummyBi = new BindingItem(null, "null", false, currBindingSet);
        try {
          dummyBi.setJDBCDataTypeName("NUMERIC");
        } catch(Exception exc) { /* We know, it does exist, because its value is hard-coded here */ }
        filterBindingItems.add(dummyBi);
      } else
        filterBindingItems.add(null);
    }
    return this;
  }

  public String getStatement() {
    return statement.toString();
  }

  public List<Element> getFilterItems() {
    return filterItems;
  }

  public List<String> getFilterValues() {
    return filterValues;
  }

  public List<BindingItem> getFilterBindingItems() {
    return filterBindingItems;
  }

  /**
   * Provides the statement with values filled in instead of showing '?' for bound variables
   * @return
   */
  public String getStatementWithParams() {
    if( filterValues.size() == 0 )
      return getStatement();
    StringBuffer stmt = new StringBuffer();
    // We assume here, that all ? are bind variable place holders
    String[] parts = getStatement().split("\\?");
    int i = 0;
    for( ; i<parts.length && i<filterValues.size(); i++ ) {
      if (filterBindingItems.get(i)!=null && filterBindingItems.get(i).isNumeric())
        stmt.append(parts[i]).append(filterValues.get(i));
      else
        stmt.append(parts[i]).append("'").append(filterValues.get(i)).append("'");
    }
    // This is usually just the part after the last ?
    for( ; i<parts.length; i++ )
      stmt.append(parts[i]).append(" ");
    return stmt.toString();
  }
  
  @Override
  public String toString() {
    return getStatementWithParams();
  }
}