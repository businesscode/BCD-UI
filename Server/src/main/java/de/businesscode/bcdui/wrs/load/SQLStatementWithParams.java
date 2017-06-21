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

import java.util.ArrayList;
import java.util.List;

import org.w3c.dom.Element;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingNotFoundException;

public class SQLStatementWithParams {

  private String statement;
  private List<Element> filterItems;
  private List<String> filterValues;
  private List<BindingItem> filterBindingItems;

  public SQLStatementWithParams(String statement, List<Element> filterItems, BindingSet bindingSet) throws BindingNotFoundException {
    super();
    this.statement = statement;
    this.filterItems = filterItems;
    this.filterValues = new ArrayList<String>();
    this.filterBindingItems = new ArrayList<BindingItem>();
    for (Element e : filterItems) {
      filterValues.add(e.getAttribute("value"));
      if( !e.getAttribute("bRef").isEmpty() )
        filterBindingItems.add(bindingSet.get(e.getAttribute("bRef")));
      // If we want to enforce a numeric type (needed for example for NULLIF(v,0)), we need to create a dummy BinsingItem here as a carrier for the data type
      else if( "NUMERIC".equals(e.getAttribute(Bindings.jdbcDataTypeNameAttribute)) ) {
        BindingItem dummyBi = new BindingItem(null, "null", false, bindingSet);
        try {
          dummyBi.setJDBCDataTypeName("NUMERIC");
        } catch(Exception exc) { // We know, it does exist, because its value is hard-coded here
        }
        filterBindingItems.add(dummyBi);
      } else
        filterBindingItems.add(null);
    }
  }

  public String getStatement() {
    return statement;
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
}