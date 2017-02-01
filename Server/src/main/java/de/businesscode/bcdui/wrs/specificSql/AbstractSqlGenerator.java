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
package de.businesscode.bcdui.wrs.specificSql;

import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;

import org.w3c.dom.Element;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.exc.BindingNotFoundException;
import de.businesscode.bcdui.wrs.load.BindingItemWithMetaData;
import de.businesscode.bcdui.wrs.load.ISqlGenerator;
import de.businesscode.bcdui.wrs.load.SQLStatementWithParams;
import de.businesscode.bcdui.wrs.load.WrsBindingItem;
import de.businesscode.sqlengine.SQLEngine;

/**
 * Convenience class for building custom ISqlGenerators
 */
abstract public class AbstractSqlGenerator implements ISqlGenerator
{
  protected String convertedSql;
  protected String requestedBindingSetName;
  protected List<WrsBindingItem> selectedBindingItems = new LinkedList<WrsBindingItem>();
  protected BindingSet resultingBindingSet;
  protected SQLStatementWithParams selectStatementWithParams;
  protected List<Element> parameters;

  /**
   * Convenience method, taking an sql in BCD-UI BindingItem notation and deriving as much information from it as needed for ISqlGenerator
   * @param sql
   * @throws BindingNotFoundException
   */
  protected void setBcduiSql( String sql, List<Element> parameters ) throws BindingNotFoundException 
  {
    SQLEngine sqlE = new SQLEngine();
    this.parameters = parameters;
    convertedSql   = sqlE.transform( sql );
    requestedBindingSetName = sqlE.getRequestedBindingSetName();

    // Derive information needed for ISqlGenerator getter
    // Per default, each BindingItem mentioned in the sql is assumed to be selected
    int colNr = 1;
    Iterator<BindingItem> usedBindigItemsInOrderIt = sqlE.getSelectedBindigItemsInOrder().iterator();
    while( usedBindigItemsInOrderIt.hasNext() ) {
      BindingItemWithMetaData bi = new BindingItemWithMetaData( usedBindigItemsInOrderIt.next(), null, null);
      bi.setColumnNumber(colNr++);
      selectedBindingItems.add( bi );
    }
    resultingBindingSet = sqlE.getResultingBindingSets().iterator().next();
    selectStatementWithParams = new SQLStatementWithParams( convertedSql, parameters, resultingBindingSet);
  }
  
  @Override
  public String getDbSourceName() {
    return resultingBindingSet.getDbSourceName();
  }

  @Override
  public String getSelectedBindingSetName() {
    return resultingBindingSet.getName();
  }

  @Override
  public BindingSet getSelectedBindingSet() {
    return resultingBindingSet;
  }

  @Override
  public List<WrsBindingItem> getSelectedBindingItems() throws Exception {
    return selectedBindingItems;
  }

  @Override
  public int getStartRow() {
    return 0;
  }

  @Override
  public int getMaxRows() {
    return 2048;
  }

  @Override
  public SQLStatementWithParams getSelectStatement() {
    return selectStatementWithParams;
  }

  @Override
  public String getRequestedBindingSetName() {
    return requestedBindingSetName;
  }
  
  @Override
  public boolean isEmpty() {
    return false;
  }

}
