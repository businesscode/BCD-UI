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

import de.businesscode.bcdui.binding.exc.BindingException;

/**
 * the interface for condition generator in SQL clause. Such a generator may deal with different aspects of restricting an SQL result.
 */
@FunctionalInterface
public interface SqlConditionGenerator {
  /**
   * generates a condition which may be connected with other conditions in order to restrict/extend set of data. The callee controls how conditions from
   * multiple generators are connected. The condition genereated here is self-contained is does not make assumptions on any other possible conditions. The
   * condition follows the valid SQL syntax.
   * 
   * @return NULL in case of no condition or non-empty String, such as '1=1' or '(0=0)' or more complex, like '(a=b or c is null)'
   * @throws BindingException
   */
  String getCondition() throws BindingException;
}
