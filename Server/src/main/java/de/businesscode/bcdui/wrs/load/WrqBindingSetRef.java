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


import java.lang.reflect.InvocationHandler;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.util.HashSet;
import java.util.Set;

import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.StandardBindingSet;

/**
 * Wrapper for BindingSets that can be referenced more than one in a query, mainly adds the sql table alias for the current occurrence
 * This can be a StandardBindingSet and a CTE
 * Implements WrqBindingSet
 */
public class WrqBindingSetRef implements InvocationHandler {

  private final BindingSet underlyingBindingSet;
  protected String sqlAlias;
  protected Set<StandardBindingSet> resolvedBindingSets = new HashSet<>();
  protected final SqlFromSubSelect currentSelect;

  /**
   * Proxy factory
   * @param currentSelect
   * @param underlyingBindingSet
   * @return
   * @throws Exception 
   */
  public static WrqBindingSet create(SqlFromSubSelect currentSelect, BindingSet underlyingBindingSet) {
    WrqBindingSet bs = (WrqBindingSet)Proxy.newProxyInstance(
        WrqBindingSet.class.getClassLoader(),
        new Class[] { WrqBindingSet.class },
        new WrqBindingSetRef(currentSelect, underlyingBindingSet));
    return bs;
  }
  
  /**
   * Constructor
   * @param currentSelect
   * @throws Exception
   */
  private WrqBindingSetRef(SqlFromSubSelect currentSelect, BindingSet underlyingBindingSet) {
    
    this.currentSelect = currentSelect;
    this.underlyingBindingSet = underlyingBindingSet;
    resolvedBindingSets.addAll( underlyingBindingSet.getResolvedBindingSets() );
    sqlAlias = currentSelect.getNextTableSqlAlias();
  }
  
  /**
   * Pass calls to our underlying BindignSet
   */
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
        if( underlyingBindingSet instanceof StandardBindingSet ) {
          return ((StandardBindingSet)underlyingBindingSet).getSubjectFilterExpression(currentSelect.getWrqInfo(), currentSelect.getSelectElem().getAttribute("alias"), sqlAlias);
        } else if (underlyingBindingSet instanceof WrqBindingSet) {
          return ((WrqBindingSet)underlyingBindingSet).getSubjectFilterExpression(currentSelect.getWrqInfo());
        } else {
          throw new InvocationTargetException( new Exception("Unknown type of BindingSet " + underlyingBindingSet.getName() ) );
        }
      }

      else if( "getResolvedBindingSets".equals( method.getName() ) ) {
        return resolvedBindingSets;
      }
      
      // Default action for the rest
      else {
        return method.invoke(underlyingBindingSet, args);
      }

    } catch ( InvocationTargetException e ) {
      // Provide the original error
      throw e.getCause();
    }

  }

}
