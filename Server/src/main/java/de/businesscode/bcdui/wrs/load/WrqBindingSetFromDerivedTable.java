/*
  Copyright 2010-2025 BusinessCode GmbH, Germany

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

import java.util.Iterator;
import java.util.LinkedHashSet;

import de.businesscode.bcdui.binding.exc.BindingException;
import org.w3c.dom.Element;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.Bindings;

/**
 * Represents a virtual BindingSet resulting from a sub-select during the execution of a Wrq
 */
public class WrqBindingSetFromDerivedTable extends WrqBindingSetVirtual {

  private static final long serialVersionUID = -403151825012518457L;

  private final WrqBindingSet underlyingBindingSet;
  protected final WrqInfo wrqInfo;
 
  /**
   * Constructor
   * @param currentSelect
   * @throws Exception
   */
  public WrqBindingSetFromDerivedTable(SqlFromSubSelect currentSelect) throws Exception {
    
    super(currentSelect);
    
    this.wrqInfo = currentSelect.getWrqInfo();
    
    underlyingBindingSet = wrqInfo.getResultingBindingSet();
    resolvedBindingSets.addAll(underlyingBindingSet.getResolvedBindingSets());
    Element selectElem = wrqInfo.getSelectNode();

    // A common table expression?
    if( "Cte".equals( selectElem.getParentNode().getNodeName()) ) {
      String wrqAlias = ((Element)selectElem.getParentNode()).getAttribute("alias");
      sqlAlias = currentSelect.getWrqQueryBuilder().getNextCteTableSqlAlias();
      tableName = "";
      currentSelect.getWrqQueryBuilder().addCteBindingSetForWrqAlias( wrqAlias, this );
    } 
    // Or a sub-select
    else {
      // We need an alias unique within the parent of the current select. If that is a top one, we just set a dummy
      sqlAlias = currentSelect.getParent()!=null? currentSelect.getParent().getNextTableSqlAlias() : "top";
      tableName = " ( " + currentSelect.getSelectStatement().getStatement() + " ) ";
    }
    name = sqlAlias;

    // Collect BindingItems provided by the select (all those in the select expression)
    LinkedHashSet<String> fullSelectList = wrqInfo.getFullSelectListBRefs(); // Keep order
    Iterator<String> bRefIt = fullSelectList.iterator();
    int n = 0;
    while( bRefIt.hasNext() ) {
      String bRef = bRefIt.next();
      BindingItem bi = null;
      
      WrqBindingItem wrqBi = wrqInfo.getAllBRefAggrs().get(bRef);
      bRef = wrqBi.getId();
      
      // May be referencing one from the underlying BindingSet
      if( underlyingBindingSet.hasItem(bRef) ) {
        // We wrap this because we want to overwrite the column expression below
        bi = new BindingItem(underlyingBindingSet.get(bRef));
      } 
      // Or a virtual one, for example it is a wrs:C with a calc:Calc expression
      else {
        // We use the provided bRef
        // We allow to overwrite the bRef with the @alias attribute
        if( wrqBi.getAttribute("alias") != null ) bRef = wrqBi.getAttribute("alias").toString();
        else if( wrqBi.getAttribute("bRef") != null ) bRef = wrqBi.getAttribute("bRef").toString();
        bi = new BindingItem(bRef, "", false, this);
        bi.setJDBCDataType(wrqBi.getJDBCDataType());
        bi.setAggr(wrqBi.getAggr());
        String caption = wrqBi.getAttribute(Bindings.captionAttribute);
        if (caption != null)
          bi.getGeneralAttributesMap().put(Bindings.captionAttribute, caption);
        bi.setEscapeXML(wrqBi.isEscapeXML());
        if( !wrqBi.getJDBCColumnScale().isEmpty() ) bi.setJDBCColumnScale( Integer.parseInt(wrqBi.getJDBCColumnScale()) );
      }

      // Adjust the column expression and BindingSet to our level
      bi.setColumnExpression("v"+((++n)));
      bi.setBindingSet(this);
      if(bRef.contains(".")) bRef = bRef.split("\\.")[1];
      bindingItems.put(bRef, bi);

    };
  }

  /**
   * Pure virtual BindingSets do not have SubjectFilters
   */
  public SQLStatementWithParams getSubjectFilterExpression(WrqInfo wrqInfo)
      throws BindingException
  {
    return new SQLStatementWithParams();
  }

  @Override
  public String getJdbcResourceName() {
    return wrqInfo.getJdbcResourceName();
  }

}
