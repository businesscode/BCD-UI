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
package de.businesscode.bcdui.binding;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Set;

import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.binding.exc.BindingNotFoundException;
import de.businesscode.bcdui.binding.exc.SecurityMissingForBindingException;
import de.businesscode.bcdui.binding.rel.Relation;
import de.businesscode.bcdui.binding.subjectFilter.SubjectFilters;
import de.businesscode.bcdui.binding.write.WriteProcessing;
import de.businesscode.bcdui.subjectsettings.SecurityException;
import de.businesscode.bcdui.subjectsettings.SecurityMissingException;
import de.businesscode.bcdui.subjectsettings.config.Security;
import de.businesscode.bcdui.wrs.load.SQLStatementWithParams;
import de.businesscode.bcdui.wrs.load.modifier.Modifier;
import de.businesscode.util.StandardNamespaceContext;

public interface BindingSet extends Cloneable, Serializable {

  public static String DEFAULT_DATABASE_SOURCENAME = "default";

  /**
   * security operations supported
   */
  static enum SECURITY_OPS {
    /**
     * any operation modifying data (C-UD) as defined by 'name' attribute of the Operation node in the configuration
     */
    write,
    /**
     * any read operation as defined by 'name' attribute of the Operation node in the configuration
     */
    read
  }

  /**
   * Gets the unique name of the BindingSet.
   * @return The unique BindingSet name.
   */
  public abstract String getName();

  /**
   * Returns a table reference. Can be a plain table name (with alias) or a join of tables
   * @return
   */
  String getTableReference();

  /**
   * Returns a table expression and if it is a complex one (subselect with where for example) it may come with variables to be bound as host variables
   * @return
   */
  SQLStatementWithParams getSQLStatementWithParams();

  /**
   * Tells if the binding set has subject filters.
   * @return True, if there is at least one SubjectFilter inside this BindingSet.
   */
  public abstract boolean hasSubjectFilters();

  /**
   * Gets the {@link SubjectFilters} definition for this BindingSet which may be null.
   * @return {@link SubjectFilters} for given BindingSet or null
   */
  public abstract SubjectFilters getSubjectFilters();

  /**
   * Gets the database name the table of the BindingSet is located in.
   * @return The dbSourceName attribute of the BindingSet.
   */
  public abstract String getJdbcResourceName();

  /**
   * isAllowSelectAllColumns
   * @return true if it is allowed to select all columns from this BindingSet.
   */
  public abstract boolean isAllowSelectAllColumns();

  /**
   * Gets a BindingItem by its unique name and throws an Exception if it is not present.
   * @param key The name of the BindingItem.
   * @return A BindingItem with the specified name.
   * @throws BindingNotFoundException If there is no BindingItem with the
   * denoted name.
   */
  public abstract BindingItem get(String key) throws BindingNotFoundException;

  /**
   * tells if this binding-set contains an item
   *
   * @param key
   * @return
   */
  public boolean hasItem(String key);
  
  /**
   * 
   * @return TRUE if contains at least one custom element from {@link StandardNamespaceContext#CUST_NAMESPACE}
   */
  public boolean hasCustomItem();

  /**
   * Get binding items by ids.
   * @see de.businesscode.bcdui.binding.Bindings#get(String)
   * @throws BindingNotFoundException
   */
  public abstract Collection<BindingItem> get(Collection<String> keys) throws BindingNotFoundException;

  /**
   * getBindingItemNames
   * @return names of all items defined in the bindingSet
   */
  Collection<String> getBindingItemNames();

  /**
   *
   * Method getBindingItemFromRelation
   * @param pRelation
   * @param itemName - requested binding item name
   *
   * @return BindingItem object or null if not found
   *
   * @throws BindingException
   */
  public abstract BindingItem getBindingItemFromRelation(Relation pRelation, String itemName) throws BindingException;

  /**
   * Tests if the BindingSet hat key BindingItems.
   * @return True, if there is a BindingItem which is declared as key item.
   */
  public abstract boolean hasKeyBindingItems();

  /**
   * Retrieves the list of key BindingItems for this binding set which
   * may contain no entries.
   * @return An array of the BindingItems with the isKey attribute set
   * to "true".
   */
  public abstract BindingItem[] getKeyBindingItems();

  /**
   * adds a new relation into ArrayList
   * @param p_relation
   */
  public abstract void addRelation(Relation p_relation);

  public abstract ArrayList<Relation> getRelations();

  public abstract WriteProcessing getWriteProcessing();

  /**
   * we check here if the application has set up the subjectSettings. In case it is
   * set up, the binding-set HAS TO define the Security context for given operation
   * otherwise we throw {@link SecurityMissingException}
   *
   * @param operation - to assure the permission is defined for
   * @throws SecurityMissingException - in case subjectSettings are enabled, yet no explicit permission is provided for this BindingSet.
   */
  public void assurePermissionDefined(SECURITY_OPS operation) throws SecurityMissingForBindingException;

  /**
   * check if given operation is permitted according to permissions set on subject in scope
   *
   * @param operation - to assure permission for
   * @throws SecurityException, if operation is not permitted
   */
  public void assurePermitted(BindingSet.SECURITY_OPS operation) throws SecurityException;

  /**
   *
   * @return security context to this binding, may be NULL if no security configured
   */
  public Security getSecurity();

  /**
   * A list of Wrq modifier classes to be applied on all requests for this BindingSet before generating the SQL
   * This is completely transparent to the caller, the answer Wrs does show the original WrsRequest
   * @return
   */
  List<Class<? extends Modifier>> getWrqModifiers();
  
  /**
   * All non-virtual BindingSets that were used at the end, BindingGroups are being resolved to the actually used BindingSets
   * @return
   */
  Set<StandardBindingSet> getResolvedBindingSets();
}
