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
package de.businesscode.bcdui.binding.rel;

import de.businesscode.bcdui.binding.BindingAliasMap;
import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.binding.exc.BindingNotFoundException;
import de.businesscode.bcdui.binding.rel.impl.AbstractColumn;

/**
 * The class represents a reference to a binding item
 */
public class BindingItemRef extends AbstractColumn {

  private BindingSet bindingSet;
  private BindingItem relatedBindingItem;
  private final Relation relation;

  /**
   * BindingItemRef
   *
   * @param pBindingItemName
   * @param pTableName
   * @param pRelation
   */
  protected BindingItemRef(String pBindingItemName, String pTableName, Relation pRelation) {
    super(pBindingItemName, pTableName);
    setObjectName("bRef");
    relation = pRelation;
  }

  /**
   * is lazy load
   *
   * Method getBindingSet
   *
   * @return
   * @throws BindingNotFoundException
   */
  public BindingSet getBindingSet() throws BindingNotFoundException {
    if (bindingSet == null)
      try {
        setBindingSet(Bindings.getInstance().get(getBindingSetName()));
      }
      catch (BindingException e) {
        throw new BindingNotFoundException(getBindingSetName());
      }
    return bindingSet;
  }

  /**
   *
   * Method setBindingSet
   *
   * @param pbindingSet
   */
  public void setBindingSet(BindingSet pbindingSet) {
    this.bindingSet = pbindingSet;
  }

  /**
   * related Item - lazy load
   *
   * @return
   * @throws BindingNotFoundException
   */
  public BindingItem getRelatedBindingItem() throws BindingNotFoundException {
    if (relatedBindingItem == null) {// try to find it
      setRelatedBindingItem(getBindingSet().get(getName()));
    }
    return relatedBindingItem;
  }

  /**
   * setRelatedBindingItem
   *
   * @param p_relatedBindingItem
   */
  public void setRelatedBindingItem(BindingItem p_relatedBindingItem) {
    this.relatedBindingItem = p_relatedBindingItem;
  }

  /**
   * @see de.businesscode.bcdui.binding.rel.Column#isVirtual()
   */
  @Override
  public boolean isVirtual() {
    return false;
  }

  /**
   * @see de.businesscode.bcdui.binding.rel.impl.AbstractColumn#getQColumnExpression()
   */
  @Override
  public String getQColumnExpression() throws BindingNotFoundException {
    if (getRelatedBindingItem() == null) {
      setRelatedBindingItem(getBindingSet().get(getName()));
    }

    // if item belongs to the same bindingSet as relation
    BindingItem bi = getRelatedBindingItem();
    if (relation.getRightBindingSetName().equals(getBindingSet().getName()))
      return bi.calcQColumnExpression( BindingAliasMap.getAliasName(relation.getId()) );
    else
      return bi.calcQColumnExpression( getBindingSet().getAliasName() );
  }

}
