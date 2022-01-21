/*
  Copyright 2010-2022 BusinessCode GmbH, Germany

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


import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.exc.BindingException;

/**
 * A BindingSet used during the execution of a Statement
 */
public interface WrqBindingSet extends BindingSet {

  /**
   * SQL alias of this BindingSet during this query
   * @return
   */
  String getSqlAlias();
  
  /**
   * SubjectFilterExpression
   * @return
   */
  SQLStatementWithParams getSubjectFilterExpression(WrqInfo wrqInfo) throws BindingException; 
    
}
