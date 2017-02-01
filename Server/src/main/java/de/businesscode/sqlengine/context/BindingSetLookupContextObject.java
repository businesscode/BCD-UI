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
package de.businesscode.sqlengine.context;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * This is the velocity context object, that represents the a binding set/group in phase 1 (@see {@link de.businesscode.sqlengine.SQLEngine})
 * It collects the referenced BindingItems for this BindingSet name to later in phase 2 (@see {@link de.businesscode.sqlengine.SQLEngine}) find the right BindingSet
 */
public class BindingSetLookupContextObject
{
  private final String name;
  private final Set<String> usedItems = new HashSet<String>();

  /**
   * @param name
   */
  public BindingSetLookupContextObject(String name) {
    super();
    this.name = name;
  }

  /**
   * @return the name
   */
  public String getName() {
    return name;
  }

  /**
   * getTableName
   *
   * @return the table name
   */
  public String getTableName() {
    return null;
  }
  /**
   * getPlainTableName
   *
   * @return the table name
   */
  public String getPlainTableName() {
    return null;
  }

  /**
   * Getter for Velocity
   */
  public Object get(String key) {
    if (key.endsWith("-")){
      key = key.substring(0, key.length()-1);
    }
    usedItems.add(key);
    return null;
  }

  /**
   * @return the referenced binding Items
   */
  public Set<String> getUsedItems() {
    return Collections.unmodifiableSet(usedItems);
  }

}
