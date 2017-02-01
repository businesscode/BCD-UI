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

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.binding.exc.BindingNotFoundException;
import de.businesscode.bcdui.binding.rel.BindingItemRef;
import de.businesscode.bcdui.binding.rel.Coalesce;
import de.businesscode.bcdui.binding.rel.ImportItem;
import de.businesscode.bcdui.binding.rel.Relation;
import de.businesscode.bcdui.binding.rel.impl.AbstractColumn;
import de.businesscode.bcdui.binding.subjectFilter.SubjectFilters;
import de.businesscode.bcdui.binding.write.WriteProcessing;
import de.businesscode.bcdui.subjectsettings.config.Security;
import de.businesscode.bcdui.wrs.load.modifier.Modifier;

/**
 * A BindingSet is a mapping from names to BindingItems. It is read from <br>
 * a static XML file by the Bindings class. This file must satisfy the <br>
 * Schema bindings.xsd. <br>
 * @see Bindings
 */
public class StandardBindingSet implements BindingSet {
  private static final long serialVersionUID = -1328342474863553352L;

  private String name;
  private String tableName;
  private String dbSourceName;
  private boolean allowSelectAllColumns;
  private Map<String, BindingItem> bindingItems = new LinkedHashMap<String, BindingItem>(new HashMap<String, BindingItem>());
  private SubjectFilters subjectFilters;
  private final ArrayList<Relation> relations = new ArrayList<Relation>();
  private final WriteProcessing writeProcessing = new WriteProcessing();
  private Security security = null;
  private boolean hasCustomItem = false;
  private List<Class<? extends Modifier>> wrqModifiers = new ArrayList<>();
  /**
   * StandardBindingSet
   *
   * @param name
   */
  public StandardBindingSet(String name) {
    this.name = name;
    // create a unique alias name for this binding set
    BindingAliasMap.getAliasName(this.name);
  }

  /**
   * @see de.businesscode.bcdui.binding.BindingSet#getName()
   */
  public String getName() {
    return name;
  }

  /**
   * @see de.businesscode.bcdui.binding.BindingSet#getTableName()
   */
  public String getTableName() {
    return tableName;
  }

  /**
   * @see de.businesscode.bcdui.binding.BindingSet#getTableName()
   */
  public String getTableName(Collection<String> reqBRefs) throws BindingException {
    StringBuilder res = new StringBuilder();
    StringBuilder relationParts = null;
    boolean hasJoin = false;
    if (reqBRefs != null) {// compute all requested relations & build table name with all joins
      relationParts = new StringBuilder();
      HashMap<String, Relation> requestedRelations = new HashMap<String, Relation>();

      for (int i = 0; !bindingItems.keySet().containsAll(reqBRefs) && i < getRelations().size(); i++) {

        // For each BindingItem which is not in the main BindingSet, we need to find a relation
        // Note that the BindingItem in the main BindingSet always wins, if it also would occur in a relation to prevent unnecessary joins
        // There is no sophisticated algorithm yet to optimize the subset of relations choosen
        Relation rel = getRelations().get(i);
        for (String bRef : reqBRefs) {
          if( ! bindingItems.containsKey(bRef) && rel.importsContainItem(bRef) ) {
            requestedRelations.put(rel.getId(), rel);
          }
        }
      }

      if (requestedRelations.size() > 0) {
        for (Map.Entry<String, Relation> entry : requestedRelations.entrySet()) {
          Relation curRelation = entry.getValue();

          relationParts.append(curRelation.getRelationStatement());// with JOIN clause

          if (relationParts.length() > 0) {
            relationParts.append("\n");
            hasJoin = true;
          }

        }
      }
    }

    res.append(getTableName()).append(" ").append(getAliasName());
    if (hasJoin) {
      res.append("\n");
      res.append(relationParts);
    }

    return res.toString();
  }

  /**
   * setTableName
   *
   * @param tableName
   */
  public void setTableName(String tableName) {
    this.tableName = tableName;
  }

  /**
   * sets the {@link SubjectFilters}
   * @param subjectFilters
   */
  public void setSubjectFilters(SubjectFilters subjectFilters) {
    this.subjectFilters = subjectFilters;
  }

  /**
   * putItem
   *
   * @param item
   */
  public void putItem(BindingItem item) {
    bindingItems.put(item.getId(), item);
  }

  /**
   * @see de.businesscode.bcdui.binding.BindingSet#hasSubjectFilters()
   */
  public boolean hasSubjectFilters() {
    return subjectFilters != null;
  }

  @Override
  public SubjectFilters getSubjectFilters() {
    return this.subjectFilters;
  }

  /**
   * @see de.businesscode.bcdui.binding.BindingSet#getDbSourceName()
   */
  public String getDbSourceName() {
    return dbSourceName;
  }

  /**
   * setDbSourceName
   *
   * @param dbSourceName
   */
  public void setDbSourceName(String dbSourceName) {
    if (dbSourceName != null && dbSourceName.length() > 0)
      this.dbSourceName = dbSourceName;
  }

  /**
   * @see de.businesscode.bcdui.binding.BindingSet#isAllowSelectAllColumns()
   */
  public boolean isAllowSelectAllColumns() {
    return allowSelectAllColumns;
  }

  /**
   * @param allowSelectAllColumns the allowSelectAllColumns to set
   */
  public void setAllowSelectAllColumns(boolean allowSelectAllColumns) {
    this.allowSelectAllColumns = allowSelectAllColumns;
  }

  /**
   * @see de.businesscode.bcdui.binding.BindingSet#get(java.lang.String)
   */
  public BindingItem get(String key) throws BindingNotFoundException {
    final BindingItem bi = getItem(key);
    if(bi == null){
      throw new BindingNotFoundException(this, key);
    }
    return bi;
  }

  @Override
  public boolean hasItem(String id) {
    return getItem(id) != null;
  }

  /**
   * gets binding-item by id
   *
   * @param key
   * @return item or null
   */
  private BindingItem getItem(String id){
    BindingItem result = bindingItems.get(id);

    if (result == null && getRelations() != null && getRelations().size() > 0) {
      for (int i = 0; i < getRelations().size(); i++) {
        Relation curRel = getRelations().get(i);
        try {
          if (curRel.importsContainItem(id)) {
            result = getBindingItemFromRelation(curRel, id);
            break;
          }
        }
        catch (BindingException e) {
          e.printStackTrace();
        }
      }
    }
    return result;
  }

  /**
   * @see de.businesscode.bcdui.binding.BindingSet#get(java.util.Collection)
   */
  @Override
  public Collection<BindingItem> get(Collection<String> keys) throws BindingNotFoundException {
    Collection<BindingItem> result = new ArrayList<BindingItem>(keys.size());
    for (String key : keys) {
      result.add(get(key));
    }
    return result;
  }

  /**
   * @see de.businesscode.bcdui.binding.BindingSet#getBindingItemFromRelation(de.businesscode.bcdui.binding.rel.Relation, java.lang.String)
   */
  public BindingItem getBindingItemFromRelation(Relation pRelation, String itemName) throws BindingException {
    BindingItem bi = null;
    if (pRelation.importsContainItem(itemName)) {
      ImportItem iItem = pRelation.getImportItemByName(itemName);
      AbstractColumn child = iItem.getChildColumnItem().get(0);
      if (child instanceof BindingItemRef) {
        BindingItem biRef = ((BindingItemRef) child).getRelatedBindingItem();
        bi = new BindingItem(biRef);
        bi.setTableAliasName(BindingAliasMap.getAliasName(pRelation.getId()));
        bi.setQColumnExpression();
      }
      else if (child instanceof Coalesce) {
        Coalesce coal = (Coalesce) child;
        bi = new BindingItem(itemName, coal.getName(), false, this);

        bi.setCaption(coal.getAliasColumnName());
        bi.setTableAliasName(null);
      }
      if ( iItem.getCaption() != null && bi != null) {
        bi.setCaption( iItem.getCaption());
      }
    }
    return bi;
  }

  /**
   * @see de.businesscode.bcdui.binding.BindingSet#hasKeyBindingItems()
   */
  public boolean hasKeyBindingItems() {
    for (BindingItem bi : getBindingItems())
      if (bi.isKey())
        return true;
    return false;
  }

  /**
   * @see de.businesscode.bcdui.binding.BindingSet#getKeyBindingItems()
   */
  public BindingItem[] getKeyBindingItems() {
    ArrayList<BindingItem> keyItems = new ArrayList<BindingItem>();

    for (BindingItem item : getBindingItems()) {
      if (item.isKey())
        keyItems.add(item);
    }

    return keyItems.toArray(new BindingItem[keyItems.size()]);
  }

  /**
   * @see de.businesscode.bcdui.binding.BindingSet#addRelation(de.businesscode.bcdui.binding.rel.Relation)
   */
  public void addRelation(Relation p_relation) {
    relations.add(p_relation);
  }

  /**
   * @see de.businesscode.bcdui.binding.BindingSet#getRelations()
   */
  public ArrayList<Relation> getRelations() {
    return relations;
  }

  /**
   * @see de.businesscode.bcdui.binding.BindingSet#getBindingItems()
   */
  public Collection<BindingItem> getBindingItems() {
    return bindingItems.values();
  }

  /**
   * @see de.businesscode.bcdui.binding.BindingSet#getBindingItemNames()
   */
  @Override
  public Collection<String> getBindingItemNames() {
    return bindingItems.keySet();
  }

  /**
   * @see de.businesscode.bcdui.binding.BindingSet#getWriteProcessing()
   */
  @Override
  public WriteProcessing getWriteProcessing() {
    return writeProcessing;
  }

  public String getAliasName() {
    return  BindingAliasMap.getAliasName(this.name);
  }


  public void setSecurity(Security security){
    this.security = security;
  }

  @Override
  public Security getSecurity() {
    return this.security;
  }

  @Override
  public boolean hasCustomItem() {
    return this.hasCustomItem;
  }
  
  /**
   * @param hasCustomItem the hasCustomItem to set
   */
  public void setHasCustomItem(boolean hasCustomItem) {
    this.hasCustomItem = hasCustomItem;
  }
  
  public void addWrqModifier(String className) throws ClassNotFoundException {
    wrqModifiers.add((Class<? extends Modifier>)Class.forName(className));
  }
  
  @Override
  public List<Class<? extends Modifier>> getWrqModifiers() {
    return wrqModifiers;
  }
}
