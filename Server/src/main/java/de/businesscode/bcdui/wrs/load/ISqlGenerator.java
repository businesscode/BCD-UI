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

import java.util.List;

import de.businesscode.bcdui.binding.BindingSet;

/**
 * The generator parses the request document, builds select statement and extracts other information from the input-options
 */
public interface ISqlGenerator {

  public static final String BCD_WKATTRIBUTE_GROUPING = "bcdGr";
  public static final String BCD_WKATTRIBUTE_OTHER = "bcdOt";

  /**
   * getDbSourceName
   *
   * @return the database name configured for this request or null for default
   */
  String getDbSourceName();

  /**
   * getRequestedBindingSetName
   *
   * @return the requested bindingSet or bindingGroup name from the request document
   */
  String getRequestedBindingSetName();

  /**
   * getSelectedBindingSetName
   *
   * @return the really selected BindingSet name
   */
  String getSelectedBindingSetName();
  
  /**
   * 
   * @return the really selected BindingSet or null
   */
  BindingSet getSelectedBindingSet();

  /**
   * @return The list of binding items in the select clause.
   */
  List<WrsBindingItem> getSelectedBindingItems() throws Exception;

  /**
   * getStartRow
   *
   * @return the start row from the request document
   */
  int getStartRow();

  /**
   * getMaxRows
   *
   * @return the max rows from the request document, -1 if no limit
   */
  int getMaxRows();

  /**
   * @return the selectStatement
   */
  SQLStatementWithParams getSelectStatement();

  /**
   * isEmpty
   *
   * @return true if no query was specified from the request
   */
  boolean isEmpty();

}
