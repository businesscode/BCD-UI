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

import de.businesscode.bcdui.binding.StandardBindingSet;

import java.util.List;
import java.util.Map;
import java.util.Set;


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
   * getRequestedBindingSetNames
   * the requested bindingSet or bindingGroup names from the request document in the form Map.Entry<BsName,bsAlias>
   * This because neither the BindingSet nor the alias need to be unique really
   *
   * @return 
   */
  Set<Map.Entry<String,String>> getRequestedBindingSetNames();

  /**
   * @return the really selected BindingSets
   */
  Set<StandardBindingSet> getResolvedBindingSets();

  /**
   * @return The list of binding items in the select clause in their order.
   */
  List<WrsBindingItem> getSelectedBindingItems() throws Exception;

  /**
   * getMaxRows
   *
   * @return the max rows from the request document and server side settings, -1 if no limit
   */
  int getMaxRows();

  /**
   * getQueryMaxRows
   *
   * @return max rows purely driven by the query, ignoring other limits
   */
  int getClientProvidedMaxRows();

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
