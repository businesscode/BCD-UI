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
package de.businesscode.sqlengine.context;

import java.util.LinkedList;
import java.util.List;
import java.util.Set;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.StandardBindingSet;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.binding.exc.BindingNotFoundException;

/**
 * This is the velocity context object, that represents a concrete BindingSet in phase 2 (@see {@link de.businesscode.sqlengine.SQLEngine})
 * From its constructor parameters it already knows, which binding items will be requested from it and this allows it to determine the right concrete BindingSet for its name
 * Also it keeps track of all requested BindingItems to find the right BindingSet for the BindingSet name
 * and to provide the caller with information about used BindingItems
 */
public class BindingSetContextObject 
{
  private final Bindings bindings;
  private final String requestedName;
  private final Set<String> requestedItems;
  //
  private BindingSet bindingSet;
  private String tableName;
  private String tableAlias;
  private String plainTableName;

  // All BindingItems listed before the table name
  private final List<BindingItem> selectedBindingItemsInOrder = new LinkedList<BindingItem>();

  // all BindingItems in their order
  private final List<BindingItem> allBindingItemsInOrder = new LinkedList<BindingItem>();

  /**
   * @param bindings       Global BCD-UI Bindings singleton
   * @param requestedName  Its logical name
   * @param requestedItems All binding item names it will be asked for
   */
  public BindingSetContextObject(Bindings bindings, String requestedName, Set<String> requestedItems, String tableAlias) {
    super();
    this.bindings = bindings;
    this.requestedName = requestedName;
    this.requestedItems = requestedItems;
    this.tableAlias = tableAlias;
  }

  /**
   * @return the bindingSet
   */
  public StandardBindingSet getBindingSet() {
    if (bindingSet == null) {
      try {
        bindingSet = bindings.get(requestedName, requestedItems);
      }
      catch (BindingException e) {
        throw new RuntimeException("Unable to find the binding set.", e);
      }
    }
    return (StandardBindingSet)bindingSet;
  }

  /**
   * getTableName
   *
   * @return the table name
   */
  public String getTableName() {
    if (tableName == null) {
      try {
        tableName = getBindingSet().getTableReference(requestedItems, tableAlias);
      }
      catch (Exception e) {
        throw new RuntimeException("Unable to get the table name.", e);
      }
    }
    return tableName;
  }

  /**
   * This is useful for insert/update statements and self joining selects
   * @return the table name without alias name.
   */
  public String getPlainTableName() {
    if (plainTableName == null) {
      try {
          plainTableName =  getBindingSet().getTableReference();
      }
      catch (Exception e) {
        throw new RuntimeException("Unable to get the table name.", e);
      }
    }
    return plainTableName;
  }

  /**
   * getter for Velocity
   * @return The BindingItem of this BindingSet for the requested binding item name
   */
  public Object get(String key) {
    try {
      final boolean requestedUnqualified = key.endsWith("-");
      if (requestedUnqualified){
        key = key.substring(0, key.length()-1);
      }
      BindingItem bindingItem = getBindingSet().get(key);

      // Simple heuristic: all BindingItems requested before the table name are likely the selected ones
      // Avoids BindingItems being part of group by or order by clauses for example to be identified as selected
      if( tableName == null && plainTableName == null )
        selectedBindingItemsInOrder.add(bindingItem);
      allBindingItemsInOrder.add(bindingItem);

      return requestedUnqualified ? bindingItem.getColumnExpression() : bindingItem.getQColumnExpression(tableAlias);
    }
    catch (BindingNotFoundException e) {
      throw new RuntimeException("Unable to find the binding item", e);
    }
  }


  /**
   * This is useful for insert/update statements and self joining selects
   * @return just the column name of the BindingItem for a given binding item name
   */
  public Object getPlain( String key) {
    try {
      BindingItem bindingItem = getBindingSet().get(key);
      return bindingItem.getColumnExpression();
    }
    catch (BindingNotFoundException e) {
      throw new RuntimeException("Unable to find the binding item", e);
    }
  }

  /**
   * @see java.lang.Object#toString()
   */
  @Override
  public String toString() {
    return getTableName();
  }


  /**
   * Getter for BindingItems which are part of the select clause, i.e. they are mentioned before the table name,
   * useful for a caller of SQLEngine to get info about the query structure
   */
  public List<BindingItem> getSelectedBindingItemsInOrder() {
    return selectedBindingItemsInOrder;
  }

  /**
   * Getter for BindingItems mentioned somewhere,
   * useful for a caller of SQLEngine to get info about the query structure
   */
  public List<BindingItem> getAllBindingItemsInOrder() {
    return allBindingItemsInOrder;
  }
}
