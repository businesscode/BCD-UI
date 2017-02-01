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

import java.util.ArrayList;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.exc.BindingException;

/**
 * Imports or DefaultImports node
 */
public class Imports {

  private String prefix;
  private boolean isDefautImport = false;
  private ArrayList<ImportItem> importItems;
  private String columnsStatement;
  private Relation relation;

  /**
   * Imports
   */
  public Imports() {
  }

  /**
   * Imports
   *
   * @param pRelation
   */
  public Imports(Relation pRelation) {
    relation = pRelation;
  }

  /**
   * getRelation
   *
   * @return
   */
  public Relation getRelation() {
    return relation;
  }

  /**
   * getPrefix
   *
   * @return
   */
  public String getPrefix() {
    return prefix;
  }

  /**
   * setPrefix
   *
   * @param p_prefix
   */
  public void setPrefix(String p_prefix) {
    this.prefix = p_prefix;
  }

  /**
   * isDefautImport
   *
   * @return
   */
  public boolean isDefautImport() {
    return isDefautImport;
  }

  /**
   * setDefautImport
   *
   * @param p_isDefautImport
   */
  public void setDefautImport(boolean p_isDefautImport) {
    this.isDefautImport = p_isDefautImport;
  }

  /**
   * is lazy load of items, because of Bindings parsing.
   *
   * Method getImportItems
   *
   * @return
   * @throws BindingException
   */
  public ArrayList<ImportItem> getImportItems() throws BindingException {
    if (isDefautImport() && importItems == null) {
      importItems = new ArrayList<ImportItem>();
      BindingSet bs = getRelation().getSourceBindingSet();
      for (String bIkey : bs.getBindingItemNames()) {
        String name = (prefix != null) ? getPrefix() + bIkey : bIkey;
        ImportItem iItem = new ImportItem(name, bs.getTableName());
        BindingItemRef bItemRef = new BindingItemRef(bIkey, bs.getTableName(), getRelation());

        bItemRef.setRelatedBindingItem(bs.get(bIkey));

        iItem.addChildColumnItem(bItemRef);
        importItems.add(iItem);
      }
    }
    return importItems;
  }

  /**
   * addImportItem
   *
   * @param pimportItem
   */
  public void addImportItem(ImportItem pimportItem) {
    if (this.importItems == null)
      this.importItems = new ArrayList<ImportItem>();

    this.importItems.add(pimportItem);
  }

  /**
   *
   * Method containsItem - true - if and only if the Imports contains the requested item name
   *
   * @param pName
   *          - item name
   * @return
   * @throws BindingException
   */
  public boolean containsItem(String pName) throws BindingException {
    for (int i = 0; i < getImportItems().size(); i++) {
      if (getImportItems().get(i).getName().equals(pName))
        return true;
    }
    return false;
  }

  /**
   * getImportItemByName
   *
   * @param pName
   * @return
   * @throws BindingException
   */
  public ImportItem getImportItemByName(String pName) throws BindingException {
    for (int i = 0; i < getImportItems().size(); i++) {
      if (getImportItems().get(i).getName().equals(pName))
        return getImportItems().get(i);
    }

    return null;
  }

  /**
   * Method returns comma separated columns, that this relation can select
   *
   * @return
   * @throws BindingException
   */
  public String getColumnsStatement() throws BindingException {
    if (columnsStatement != null)
      return columnsStatement;

    StringBuilder str = new StringBuilder();
    if (str.length() < 1) {
      if (!isDefautImport()) {
        for (int i = 0; i < getImportItems().size(); i++) {
          if (str.length() > 0)
            str.append("\n , ");
          str.append(getImportItems().get(i).getQColumnExpression());
        }
      }
      else {
        BindingSet bs = getRelation().getSourceBindingSet();
        for (BindingItem bindingItem : bs.getBindingItems()) {
          if (str.length() > 0)
            str.append("\n , ");

          str.append(bs.getTableName()).append(".").append(bindingItem.getColumnExpression());
        }
      }
    }

    columnsStatement = str.toString();
    return columnsStatement;
  }

  /**
   * @see java.lang.Object#toString()
   */
  public String toString() {
    String nodeName = (isDefautImport ? "DefaultImports" : "Imports");
    StringBuilder str = new StringBuilder("<").append(nodeName);
    if (getPrefix() != null)
      str.append(" prefix='").append(getPrefix()).append("'");

    str.append(">");

    try {
      for (int i = 0; i < getImportItems().size(); i++) {
        str.append(getImportItems().get(i).toString());
      }
    }
    catch (BindingException e) {
      e.printStackTrace();
    }
    str.append("</").append(nodeName).append(">");
    return str.toString();
  }
}
