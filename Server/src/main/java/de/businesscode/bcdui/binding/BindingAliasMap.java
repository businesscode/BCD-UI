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
package de.businesscode.bcdui.binding;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * This class is a static class that holds a hashmap which translates a binding set id
 * to an t123123 which can be used as table alias in sql statements.
 *
 */
public class BindingAliasMap {
  /**
  * this is a thread safe counter for the numeric part of the alias name
  */
  private static AtomicInteger bindingCounter = new AtomicInteger(0);

  /**
    * This is the thread safe HashMap
   */
  private static ConcurrentHashMap<String, String> aliasTable = new ConcurrentHashMap<String, String>();

  /**
   * clear caches
   */
  public static void clear(){
    aliasTable.clear();
  }

  /**
   *  this method returns the alias, if not available the alias is created.
   *  This method returns always the same alias until the jvm stopped.
   *
   * @param bindingName
   * @return the alias for the given binding Set.
   */
  public static String getAliasName(String bindingName) {
    String result = BindingAliasMap.aliasTable.get(bindingName);
    if( result==null ) {
      aliasTable.putIfAbsent(bindingName, "t" + bindingCounter.incrementAndGet());
      return BindingAliasMap.aliasTable.get(bindingName);
    } else
      return result;
  }
}
