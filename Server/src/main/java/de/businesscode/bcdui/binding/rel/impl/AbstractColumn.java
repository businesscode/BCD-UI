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
package de.businesscode.bcdui.binding.rel.impl;

import java.util.ArrayList;

import de.businesscode.bcdui.binding.BindingAliasMap;
import de.businesscode.bcdui.binding.exc.BindingNotFoundException;
import de.businesscode.bcdui.binding.rel.Column;

public abstract class AbstractColumn implements Column {
  private final String name;
  private final String tableName;
  private final String bindingSetName;
  private String customData;
  private String objName;
  private ArrayList<AbstractColumn> childColumnItems;

  /**
   * AbstractColumn
   *
   * @param pColumnName
   * @param pTableName
   */
  protected AbstractColumn(String pColumnName, String pTableName) {
    if (pColumnName == null) {
      throw new NullPointerException("The column name must not be null.");
    }
    name = pColumnName;
    tableName = BindingAliasMap.getAliasName(pTableName);
    bindingSetName = pTableName;
  }

  @Override
  /**
   * returns column name
   */
  public String getName() throws BindingNotFoundException {
    return name;
  }

  @Override
  /**
   * returns table name
   */
  public String getTable() {
    return tableName;
  }
  public String getBindingSetName() {
    return bindingSetName;
  }

  @Override
  /**
   * returns full qualified column name, i.e. table name + "." + column name
   */
  public String getQColumnExpression() throws BindingNotFoundException {
    return (getTable() + "." + getName());
  }

  /**
   * @see de.businesscode.bcdui.binding.rel.Column#getCustomData()
   */
  public String getCustomData() {
    return customData;
  }

  /**
   * @see de.businesscode.bcdui.binding.rel.Column#setCustomData(java.lang.String)
   */
public void setCustomData(String pCustomData) {
    customData = pCustomData;
  }

  /**
   * getObjectName
   *
   * @return
   */
  public Object getObjectName() {
    return objName;
  }

  /**
   * setObjectName
   *
   * @param pObjectName
   */
  public void setObjectName(String pObjectName) {
    objName = pObjectName;
  }

  /**
   * getChildColumnItem
   *
   * @return
   */
  public ArrayList<AbstractColumn> getChildColumnItem() {
    return childColumnItems;
  }

  /**
   * setChildColumnItem
   *
   * @param pChildColumnItem
   */
  public void setChildColumnItem(ArrayList<AbstractColumn> pChildColumnItem) {
    this.childColumnItems = pChildColumnItem;
  }

  /**
   * addChildColumnItem
   *
   * @param pChildColumnItem
   */
  public void addChildColumnItem(AbstractColumn pChildColumnItem) {
    if (this.childColumnItems == null)
      this.childColumnItems = new ArrayList<AbstractColumn>();
    this.childColumnItems.add(pChildColumnItem);
  }

  /**
   * @see java.lang.Object#toString()
   */
public String toString() {
    StringBuilder str = new StringBuilder("<").append(getObjectName());
    try {
      if (getName() != null)
        str.append(" name='").append(getName()).append("'");
    }
    catch (BindingNotFoundException e) {
      e.printStackTrace();
    }
    if (getTable() != null)
      str.append(" tableName='").append(getTable()).append("'");
    str.append(">");
    if (getCustomData() != null)
      str.append(getCustomData());

    if (getChildColumnItem() != null)
      str.append(getChildColumnItem().toString());

    str.append("</").append(getObjectName()).append(">");
    return str.toString();
  }

}
