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
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.Map;

import de.businesscode.bcdui.binding.BindingItem;

/**
 * This class represents a BindingItem in a concrete statement
 * It adds for example alias, aggregation and the column number
 */
public class BindingItemWithMetaData extends BindingItem implements WrsBindingItem {
  private final String aggregationFunction;
  private BindingItemWithMetaData parentWrsC;          // Only for wrs:A
  private Collection<BindingItemAttribute> wrsAAttributes; // Only for wrs:C, these are child wrs:A elements, not regular DOM attributes
  private int columnNumber;
  private String alias;
  private Map<String,String> userAttributes;           // Request specific wrs:C/@ and wrs:A/@ attributes

  boolean isOrderByDescending = false; // Only for elements from Order by clause

  public BindingItemWithMetaData getParentWrsC() {
    return parentWrsC;
  }

  public void setParentWrsC(BindingItemWithMetaData parentWrsC) {
    this.parentWrsC = parentWrsC;
  }

  public boolean isOrderByDescending() {
    return isOrderByDescending;
  }

  public void setOrderByDescending(boolean isOrderByDescending) {
    this.isOrderByDescending = isOrderByDescending;
  }

  public String getAlias() {
    return alias;
  }

  public void setAlias(String alias) {
    this.alias = alias;
  }

  public BindingItemWithMetaData(BindingItem bindingItem, String aggregationFunction, String alias) {
    super(bindingItem);
    this.aggregationFunction = aggregationFunction;
    this.alias = alias;
  }


  // We can also provide additional attributes belonging to the request, not being derived from the BindingSet
  public BindingItemWithMetaData(BindingItem bindingItem, String aggregationFunction, String alias, Map<String,String> userAttributes) {
    super(bindingItem);
    this.alias = alias;
    this.userAttributes = userAttributes;

    if( bindingItem instanceof VirtualBindingItem ) {
      this.aggregationFunction = bindingItem.getAggr();
    } else
      this.aggregationFunction = aggregationFunction;
  }

  public String getAggregationFunction() {
    return aggregationFunction;
  }

  /**
   * @param wrsAAttributes Collection of new binding item's attributes.
   */
  public void setWrsAAttributes(Collection<BindingItemAttribute> wrsAAttributes) {
    this.wrsAAttributes = wrsAAttributes;
  }

  /**
   * @return Has binding item attributes?
   */
  public boolean hasWrsAAttributes() {
    return wrsAAttributes != null && wrsAAttributes.size() > 0;
  }

  /**
   * @return A copy of the Collection of binding item's attributes wrs:A
   */
  public Collection<WrsBindingItem> getWrsAAttributes() {
    Collection<WrsBindingItem> res = new LinkedList<WrsBindingItem>();
    for(Iterator<BindingItemAttribute>it = wrsAAttributes.iterator(); it.hasNext(); )
      res.add(it.next());
    return Collections.unmodifiableCollection(res); // Only a copy, here we prevent the caller from thinking he can add stuff to us
  }

  /**
   * Adds an wrs:A attributes
   */
  public void addWrsAAttribute(BindingItemAttribute wrsAAttribute) {
    if( ! hasWrsAAttributes() )
      wrsAAttributes = new HashSet<BindingItemAttribute>();
    wrsAAttributes.add(wrsAAttribute);
  }

  /**
   * @return The binding item's column number in SQL select statement.
   */
  public int getColumnNumber() {
    return columnNumber;
  }

  /**
   * @param columnNumber The new binding item's column number in SQL select statement.
   */
  public void setColumnNumber(int columnNumber) {
    this.columnNumber = columnNumber;
  }

  public String getQColumnExpression(String aliasWithTableAlias) {
    if(aliasWithTableAlias!=null)
      return aliasWithTableAlias+"."+alias;
    else
      return getQColumnExpression();
  }

  public String getQColumnExpressionWithAggr(String aliasWithTableAlias) {
    return getQColumnExpressionWithAggr(aliasWithTableAlias, null);
  }
  public String getQColumnExpressionWithAggr(String aliasWithTableAlias, String overwriteAggr) {
    // Usually we just surround our alias with the aggregate function
    // Exception is the grouping function, which is always based on the parent wrs:C
    if( parentWrsC==null || !"GROUPING".equals(aggregationFunction) ) {
      if( overwriteAggr!=null )
        return overwriteAggr+"("+getQColumnExpression(aliasWithTableAlias)+")";
      else if( getAggregationFunction()==null )
        return getQColumnExpression(aliasWithTableAlias);
      else
        return getAggregationFunction()+"("+getQColumnExpression(aliasWithTableAlias)+")";
    } else {
      if( getAggregationFunction()==null )
        return parentWrsC.getQColumnExpression(aliasWithTableAlias);
      else
        return getAggregationFunction()+"("+parentWrsC.getQColumnExpression(aliasWithTableAlias)+")";
    }
  }

  /**
   * Additional attributes at (plain attributes, not wrs:A) are returned here
   * Note that they can overwrite default attributes of the BindingItem, which were derived from the BindingSet and the database
   */
  public Map<String,Object> getAttributes()
  {
    Map<String,Object> attrs = super.getAttributes();

    if( userAttributes==null ) {
      return attrs;
    } else {
      Map<String, Object> mergedAttrsMap = new HashMap<String, Object>(attrs);
      mergedAttrsMap.putAll(userAttributes);
      return mergedAttrsMap;
    }
  }

  /**
   * Adds regular @ attribute
   */
  public void addAttribute(String name, String value) {
    if( userAttributes==null )
      userAttributes = new HashMap<String,String>();
    userAttributes.put(name,value);
  }

  @Override
  public String getWrsAName() {
    return null;
  }
}
