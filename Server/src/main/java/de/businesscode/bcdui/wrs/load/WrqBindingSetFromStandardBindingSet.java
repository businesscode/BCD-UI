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


import java.lang.reflect.InvocationHandler;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.HashSet;
import java.util.Set;

import de.businesscode.bcdui.binding.StandardBindingSet;

/**
 * Wrapper for a StandardBindingSet in the current query, mainly adds the sql table alias
 * Implements WrqBindingSet
 */
public class WrqBindingSetFromStandardBindingSet implements InvocationHandler {

  private static final long serialVersionUID = -1997230422644708377L;
  private final StandardBindingSet underlyingBindingSet;
  protected String sqlAlias;
  protected Set<StandardBindingSet> resolvedBindingSets = new HashSet<>();
  protected final SqlFromSubSelect currentSelect;

  /**
   * Proxy factory
   * @param currentSelect
   * @param standardBindingSet
   * @return
   * @throws Exception 
   */
  public static WrqBindingSet create(SqlFromSubSelect currentSelect, StandardBindingSet standardBindingSet) {
    WrqBindingSet bs = (WrqBindingSet)Proxy.newProxyInstance(
        WrqBindingSet.class.getClassLoader(),
        new Class[] { WrqBindingSet.class },
        new WrqBindingSetFromStandardBindingSet(currentSelect, standardBindingSet));
    return bs;
  }
  
  /**
   * Constructor
   * @param currentSelect
   * @throws Exception
   */
  private WrqBindingSetFromStandardBindingSet(SqlFromSubSelect currentSelect, StandardBindingSet standardBindingSet) {
    
    this.currentSelect = currentSelect;
    underlyingBindingSet = standardBindingSet;
    resolvedBindingSets.add( standardBindingSet );
    sqlAlias = currentSelect.getNextTableSqlAlias();
  }

  @Override
  public Object invoke(Object obj, Method method, Object[] args)
      throws Throwable
  {
    try {

      // Overwritten methods to implement WrqBindingSet on top of BindingSet
      if( "getSqlAlias".equals( method.getName() ) ) {
        return sqlAlias;
      }

      else if( "getSubjectFilterExpression".equals( method.getName() ) ) {
        return underlyingBindingSet.getSubjectFilterExpression(currentSelect.getWrqInfo(), currentSelect.getSelectElem().getAttribute("alias"), sqlAlias);
      }

      else if( "getResolvedBindingSets".equals( method.getName() ) ) {
        return resolvedBindingSets;
      }
      
      // Default action for the rest
      else
        return method.invoke(underlyingBindingSet, args);

    } catch ( InvocationTargetException e ) {
      throw e.getCause();
    }

  }

}
