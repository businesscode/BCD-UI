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
package de.businesscode.bcdui.binding;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

import org.apache.shiro.SecurityUtils;
import org.apache.shiro.web.util.WebUtils;
import org.w3c.dom.Element;

import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.binding.exc.BindingNotFoundException;
import de.businesscode.bcdui.binding.exc.SecurityMissingForBindingException;
import de.businesscode.bcdui.binding.rel.Relation;
import de.businesscode.bcdui.binding.subjectFilter.SubjectFilters;
import de.businesscode.bcdui.binding.write.WriteProcessing;
import de.businesscode.bcdui.subjectsettings.SecurityException;
import de.businesscode.bcdui.subjectsettings.SecurityHelper;
import de.businesscode.bcdui.subjectsettings.SubjectSettings;
import de.businesscode.bcdui.subjectsettings.config.Security;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.toolbox.Configuration.OPT_CLASSES;
import de.businesscode.bcdui.toolbox.config.BareConfiguration;
import de.businesscode.bcdui.wrs.load.SQLStatementWithParams;
import de.businesscode.bcdui.wrs.load.SqlConditionGenerator;
import de.businesscode.bcdui.wrs.load.WrqInfo;
import de.businesscode.bcdui.wrs.load.modifier.Modifier;

/**
 * A BindingSet is a mapping from names to BindingItems. It is read from 
 * a static XML file by the Bindings class usually from WEB-INF/bindings
 * That file must satisfy the Schema bindings.xsd.
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
  private final WriteProcessing writeProcessing;
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
    writeProcessing = new WriteProcessing();
  }

  public StandardBindingSet(StandardBindingSet bs) {
    name = bs.name;
    tableName = bs.tableName;
    dbSourceName = bs.dbSourceName;
    allowSelectAllColumns = bs.allowSelectAllColumns;
    bindingItems = bs.bindingItems;
    subjectFilters = bs.subjectFilters;
    relations.addAll(bs.relations);
    writeProcessing = bs.writeProcessing;
    security = bs.security;
    hasCustomItem = bs.hasCustomItem;
    wrqModifiers.addAll(bs.wrqModifiers);
  }

  /**
   * @see de.businesscode.bcdui.binding.BindingSet#getName()
   */
  public String getName() {
    return name;
  }

  /**
   * @see de.businesscode.bcdui.binding.BindingSet#getTableReference()
   */
  public String getTableReference(String tableAlias) {
    return tableName + " " + tableAlias;
  }

  /**
   * @see de.businesscode.bcdui.binding.BindingSet#getTableReference()
   */
  public String getTableReference(Collection<String> reqBRefs, String tableAlias) throws BindingException {
    StringBuilder res = new StringBuilder();
    StringBuilder relationParts = null;
    boolean hasJoin = false;
    if (reqBRefs != null) {// compute all requested relations & build table name with all joins
      relationParts = new StringBuilder();
      HashMap<String, Relation> requestedRelations = new HashMap<String, Relation>();

      // Loop is only needed if there are bRefs in reqBRefs which are not part of our main bindingItems
      for (int i = 0; !bindingItems.keySet().containsAll(reqBRefs) && i < getRelations().size(); i++) {

        // For each BindingItem which is not in the main BindingSet, we need to find a relation
        // Note that the BindingItem in the main BindingSet always wins, if it also would occur in a relation to prevent unnecessary joins
        // There is no sophisticated algorithm yet to optimize the subset of relations chosen
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

          relationParts.append(curRelation.getRelationStatement(tableAlias));// with JOIN clause

          if (relationParts.length() > 0) {
            relationParts.append("\n");
            hasJoin = true;
          }

        }
      }
    }

    res.append(getTableReference(tableAlias));
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
   * Generate the part of the where clause that is reflecting the bnd:BindingSet/bnd:SubjectSettings/bnd:SubjectFilters
   * @param wrqInfo
   * @param tableAlias
   * @return
   * @throws BindingException
   */
  public SQLStatementWithParams getSubjectFilterExpression(WrqInfo wrqInfo, String wrqAlias, String sqlAlias) throws BindingException {
    final SQLStatementWithParams stmt = new SQLStatementWithParams();
    List<Element> boundVariables = new LinkedList<Element>();

    final Class<?> sqlConditionGeneratorClass = Configuration.getClassoption(OPT_CLASSES.SUBJECTSETTINGS2SQL);
    if( hasSubjectFilters() && sqlConditionGeneratorClass != null ) {
      
      if( !WebUtils.isHttp(SecurityUtils.getSubject()) ) {
        System.out.println("Unsave access"); // TODO);
      } else {
        SqlConditionGenerator sqlConditionGen = Configuration.getClassInstance(sqlConditionGeneratorClass, 
              new Class<?>[]{BindingSet.class, WrqInfo.class, List.class, String.class, String.class},
            this, wrqInfo, boundVariables, wrqAlias, sqlAlias);
        String subjectSettingsClause = sqlConditionGen.getCondition();
        stmt.append(subjectSettingsClause, boundVariables, this);
      }
    }
    return stmt;
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
   * @see de.businesscode.bcdui.binding.BindingSet#getJdbcResourceName()
   */
  public String getJdbcResourceName() {
    if(dbSourceName == null) {
      dbSourceName = BareConfiguration.getInstance().getConfigurationParameter(Configuration.DEFAULT_DB_CONTEXT_ID).toString();
    }
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
    final BindingItem bi = getItem(key.split("\\.")[key.split("\\.").length-1]);
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
   * @param id
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
   * @param pRelation
   * @param itemName
   * @return null if not found
   */
  public BindingItem getBindingItemFromRelation(Relation pRelation, String itemName) throws BindingException {
    
    return pRelation.getImportItemByName(itemName);
    
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
    wrqModifiers.add(Class.forName(className).asSubclass(Modifier.class));
  }
  
  @Override
  public List<Class<? extends Modifier>> getWrqModifiers() {
    return wrqModifiers;
  }

  @Override
  public void assurePermissionDefined(SECURITY_OPS operation) throws SecurityMissingForBindingException {
    if(
        SubjectSettings.getInstance().isWasConfigured() &&
        (
            getSecurity()==null ||
            !SecurityHelper.hasOperation(getSecurity(), operation.name())
        )
      ){
      throw new SecurityMissingForBindingException(this, operation.name());
    }
  }

  @Override
  public void assurePermitted(SECURITY_OPS operation) throws SecurityException {
    if(getSecurity()!=null){
      SecurityHelper.checkSecurity(getSecurity(), operation.name(), false);
    }
  }

  @Override
  public String getTableReference() {
    return tableName;
  }
  
  @Override
  public SQLStatementWithParams getSQLStatementWithParams() {
    SQLStatementWithParams sqlStatementWithParams = new SQLStatementWithParams(tableName);
    return sqlStatementWithParams;
  }

}
