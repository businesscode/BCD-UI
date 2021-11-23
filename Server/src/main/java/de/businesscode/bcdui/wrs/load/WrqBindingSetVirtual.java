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

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.StandardBindingSet;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.binding.exc.BindingNotFoundException;
import de.businesscode.bcdui.binding.exc.SecurityMissingForBindingException;
import de.businesscode.bcdui.binding.rel.Relation;
import de.businesscode.bcdui.binding.subjectFilter.SubjectFilters;
import de.businesscode.bcdui.binding.write.WriteProcessing;
import de.businesscode.bcdui.subjectsettings.SecurityException;
import de.businesscode.bcdui.subjectsettings.config.Security;
import de.businesscode.bcdui.wrs.load.modifier.Modifier;

/**
 * Represents a virtual BindingSet derived on runtime from parts of a Wrs
 */
public abstract class WrqBindingSetVirtual implements WrqBindingSet {

  private static final long serialVersionUID = 1439179612917565458L;
  protected String tableName;
  protected String name;
  protected String sqlAlias;
  protected Map<String, BindingItem> bindingItems = new LinkedHashMap<String, BindingItem>(new HashMap<String, BindingItem>());
  protected List<Class<? extends Modifier>> wrqModifiers = new ArrayList<>();
  protected Set<StandardBindingSet> resolvedBindingSets = new HashSet<>();
  protected final SQLStatementWithParams sqlStatementWithParams = new SQLStatementWithParams();

  protected final SqlFromSubSelect currentSelect;

  public WrqBindingSetVirtual(SqlFromSubSelect currentSelect) throws Exception {
    this.currentSelect = currentSelect;
  }
  
  public Set<StandardBindingSet> getResolvedBindingSets() {
    return resolvedBindingSets;
  }
  
  public String getSqlAlias() {
    return sqlAlias;
  }

  @Override
  public String getName() {
    return name;
  }

  @Override
  public boolean hasSubjectFilters() {
    return false;
  }

  @Override
  public SubjectFilters getSubjectFilters() {
    return null;
  }

  /**
   * @return All tables need to be on the same database, so here we return one from a random resolved BindingSet
   */
  @Override
  public String getDbSourceName() {
    return resolvedBindingSets.iterator().next().getDbSourceName();
  }

  @Override
  public boolean isAllowSelectAllColumns() {
    return true;
  }

  @Override
  public BindingItem get(String key) throws BindingNotFoundException {
    return bindingItems.get(key);
  }

  @Override
  public boolean hasItem(String key) {
    return bindingItems.get(key) != null;
  }

  @Override
  public boolean hasCustomItem() {
    return false;
  }

  @Override
  public Collection<BindingItem> get(Collection<String> keys) throws BindingNotFoundException {
    Collection<BindingItem> result = new ArrayList<BindingItem>(keys.size());
    for (String key : keys) {
      result.add(get(key));
    }
    return result;
  }

  @Override
  public Collection<BindingItem> getBindingItems() {
    return bindingItems.values();
  }

  @Override
  public Collection<String> getBindingItemNames() {
    return bindingItems.keySet();
  }

  @Override
  public BindingItem getBindingItemFromRelation(Relation pRelation, String itemName) throws BindingException {
    throw new BindingException("Virtual BindingSets do not have relations");
  }

  @Override
  public boolean hasKeyBindingItems() {
    return false;
  }

  @Override
  public BindingItem[] getKeyBindingItems() {
    return new BindingItem[0];
  }

  @Override
  public void addRelation(Relation p_relation) {
    throw new UnsupportedOperationException("Relations not supported for virtual BindingSets");
  }

  @Override
  public ArrayList<Relation> getRelations() {
    return new ArrayList<Relation>();
  }

  @Override
  public WriteProcessing getWriteProcessing() {
    return new WriteProcessing();
  }

  @Override
  public void assurePermissionDefined(SECURITY_OPS operation) throws SecurityMissingForBindingException {
    for( StandardBindingSet bs: resolvedBindingSets ) bs.assurePermissionDefined(operation);
  }

  @Override
  public void assurePermitted(SECURITY_OPS operation) throws SecurityException {
    for( StandardBindingSet bs: resolvedBindingSets ) bs.assurePermitted(operation);
  }

  @Override
  public Security getSecurity() {
    // This BindingSet does not add itself immediate Security
    return null;
  }

  @Override
  public List<Class<? extends Modifier>> getWrqModifiers() {
    return wrqModifiers;
  }

  @Override
  public String getTableReference() {
    return sqlStatementWithParams.getStatement();
  }
  
  @Override
  public SQLStatementWithParams getSQLStatementWithParams() {
    return sqlStatementWithParams;
  }

  /**
   * Return SubjectFilters to be applied for our virtual BindingSet
   */
  public abstract SQLStatementWithParams getSubjectFilterExpression(WrqInfo wrqInfo ) throws BindingException;

}
