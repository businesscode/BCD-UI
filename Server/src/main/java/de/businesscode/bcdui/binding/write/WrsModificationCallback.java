/*
  Copyright 2010-2023 BusinessCode GmbH, Germany

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
package de.businesscode.bcdui.binding.write;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.exc.BindingNotFoundException;
import de.businesscode.bcdui.el.ELEnvironment;

/**
 * preserves the update information on a record, takes following configuration parameters:
 * the default values are marked with asterix (*), all parameters which have no default values are required.
 * <dl>
 *  <dt>bindingItemId</dt>
 *  <dd>
 *    the binding item id this parameter is defined for
 *  </dd>
 *  <dt>expression</dt>
 *  <dd>
 *    the EL expression to be evaluated on the server, or constant string, allowing directives: ${} the bean in scope is named 'bcdBean'
 *  </dd>
 *  <dt>ignore</dt>
 *  <dd>
 *    <b>never*</b>: never ignores processing<br>
 *    <b>update</b>: processing ignored on wrs:M<br>
 *  </dd>
 *  <dt>isCoalesce</dt>
 *  <dd>
 *    <b>true*</b>: the value written to database is evaluated from given expression on the server in following cases: either wrs:C for this bindingItemId is wrs:null OR this bindingItemId is entirely missing in processing WRS<br>
 *    <b>false</b>: always writes value from expression evaluated on the server, no matter whether it been sent along with WRS or not<br>
 *  </dd>
 * </dl>
 */
public class WrsModificationCallback extends WriteProcessingCallback {
  protected final  Logger log = LogManager.getLogger(getClass());

  private Set<BindingItemConfig> bindingItemConfig;
  protected List<BindingItem> columns;
  protected List<BindingItem> columnsOrig;
  protected List<Integer> columnTypes;
  /*
   * the index map of already available binding-items in WRS
   */
  protected final HashMap<String, BindingItemConfig> bindingItemIdMap = new HashMap<>();

  public HashSet<String> getIgnoreUpdateBRefs() {
    HashSet<String> skipped = new HashSet<>();
    for (BindingItemConfig b  : bindingItemIdMap.values()) {
      if (b.ignore == BindingItemConfig.CONFIG_IGNORE.update)
        skipped.add(b.bindingItemId);
    }
    return skipped;
  }

  /**
   *
   * @param list
   * @param bindingId
   * @return index of the bindingitem with given id or -1 if no such item found
   */
  private int getBindingItemIdx(List<BindingItem> list, String bindingId){
    int idxCnt=0;
    for(BindingItem bi : list){
      if (bindingId.equals(bi.getId())){
        return idxCnt;
      }
      ++idxCnt;
    }
    return -1;
  }

  /**
   * either locates the given bindingid in columns-list and add its index to bindingItemIdxMap or
   * attaches the binding-item from bindingSet to columns-list and columnTypes-list and to appendedItems
   *
   * @param bindingSet
   * @param columns
   * @param columnTypes
   * @param bindingId
   */
  private void initializeBindingItemWrs(BindingSet bindingSet, List<BindingItem> columns, List<Integer> columnTypes, BindingItemConfig itemConfig){
    int idx = getBindingItemIdx(columns, itemConfig.bindingItemId);
    // item not found in WRS - append it internally and to WRS and to the map via index
    if(idx < 0){
      if(log.isTraceEnabled()){
        log.trace("binding item to append: " + itemConfig.bindingItemId);
      }
      try {
        BindingItem bItem = bindingSet.get(itemConfig.bindingItemId);
        columns.add(bItem);
        columnTypes.add(bItem.getJDBCDataType());
        bindingItemIdMap.put(bItem.getId(), itemConfig);
      } catch (BindingNotFoundException e) {
        throw new RuntimeException("missing binding item '"+itemConfig.bindingItemId+"'",e);
      }
    }else{
      // item located in WRS - map it via index
      bindingItemIdMap.put(itemConfig.bindingItemId, itemConfig);
      if(log.isTraceEnabled()){
        log.trace("found binding item to map " + itemConfig.bindingItemId + " at index " + idx);
      }
    }
  }

  @Override
  public void endHeader(List<BindingItem> columns, List<Integer> columnTypes, Collection<String> keyColumnNames) {
    bindingItemIdMap.clear();
    this.columns = columns;
    this.columnTypes = columnTypes;

    /*
     * initialize binding items from given WRS according to bindingItem parameters
     */
    for(BindingItemConfig itemConfig : bindingItemConfig){
      initializeBindingItemWrs(bindingSet, columns, columnTypes, itemConfig);
    }

    // keep original columns so we can reuse it row by row
    this.columnsOrig = new ArrayList<>();
    for (BindingItem b : this.columns)
      this.columnsOrig.add(b);
  }

  /**
   * ignores wrs:D
   *
   * if binding items are not located in WRS we augment it
   */
  @Override
  public void endDataRow(ROW_TYPE rowType, List<String> cValues, List<String> oValues) {
    
    // we might skip columns/types below, so rebuild such lists completely
    this.columns.clear();
    this.columnTypes.clear();

    // ensure completeness of C/O for all columns
    while (this.columnsOrig.size() > cValues.size()) {
      cValues.add(null);
      if (rowType == ROW_TYPE.M)
        oValues.add(null);
    }

    // overwrite server sided values
    List<String> newOValues = new ArrayList<>();
    List<String> newCValues = new ArrayList<>();
    for (int i = 0; i < this.columnsOrig.size(); i++) {
      BindingItem b = this.columnsOrig.get(i);
      BindingItemConfig item = this.bindingItemIdMap.get(this.columnsOrig.get(i).getId());

      // ignore column found (e.g. createBy in wrs:M)
      boolean skipColumn  = (rowType == ROW_TYPE.M && this.bindingItemIdMap.get(b.getId()) != null && this.bindingItemIdMap.get(b.getId()).ignore == BindingItemConfig.CONFIG_IGNORE.update);

      // set server sided value if needed and only take over column if it isn't skipped
      if (! skipColumn) {
        if (item != null && (!item.isCoalesce || cValues.get(i) == null))
          cValues.set(i, evalValue(item));

        this.columns.add(b);
        this.columnTypes.add(b.getJDBCDataType());

        newCValues.add(cValues.get(i));
        if (rowType == ROW_TYPE.M)
          newOValues.add(oValues.get(i));
      }
    }

    // takeover values
    cValues.clear(); for (String s : newCValues) cValues.add(s);
    oValues.clear(); for (String s : newOValues) oValues.add(s);
  }

  /**
   * evaluates the value of given item
   *
   * @param item
   * @return either a constant or evaluated expression
   */
  protected String evalValue(BindingItemConfig item) {
    return ELEnvironment.evaluateExpression(item.expression, getValueBean(), "bcdBean");
  }

  @Override
  public void initialize() {
    super.initialize();
    this.bindingItemConfig = BindingItemConfig.fromConfiguration(getParams());
  }

  /**
   *
   * @return the list of binding item config items
   */
  protected Set<BindingItemConfig> getBindingItemConfig() {
    return bindingItemConfig;
  }
}

/**
 * param configuration bean according to doc, is unique on bindingItemId
 *
 */
final class BindingItemConfig {
  Logger log = LogManager.getLogger(getClass());
  public static enum CONFIG_IGNORE {
    never, update
  }
  final String bindingItemId;
  final String expression;
  final CONFIG_IGNORE ignore;
  final boolean isCoalesce;

  public static Set<BindingItemConfig> fromConfiguration(WriteProcessingCallbackParams params){
    final Set<BindingItemConfig> configList = new HashSet<BindingItemConfig>();

    for(Map<String,String> paramMap : params.getParamList()){
      configList.add(
          new BindingItemConfig(
              params.getValue(paramMap, "bindingItemId", (String)null),
              params.getValue(paramMap, "expression", (String)null),
              CONFIG_IGNORE.valueOf(params.getValue(paramMap, "ignore", CONFIG_IGNORE.never.name())),
              Boolean.valueOf(params.getValue(paramMap, "isCoalesce", Boolean.TRUE.toString()))
          )
      );
    }

    return configList;
  }

  public BindingItemConfig(String bindingItemId, String expression, CONFIG_IGNORE ignore, boolean isCoalesce) {
    super();
    this.bindingItemId = bindingItemId;
    if(this.bindingItemId == null){
      throw new RuntimeException("no binding item id supplied");
    }
    this.expression = expression;
    if(this.expression == null){
      throw new RuntimeException("no expression supplied");
    }
    this.ignore = ignore;
    this.isCoalesce = isCoalesce;

    if(log.isTraceEnabled()){
      log.trace("initialize parameter: " + toString());
    }
  }
  
  @Override
  public int hashCode() {
    return bindingItemId.hashCode();
  }

  @Override
  public boolean equals(Object obj) {
    return bindingItemId.equals(obj);
  }

  @Override
  public String toString() {
    return String.format("bindingItemId=%s; expression=%s; ignore=%s; isCoalesce:%s;", bindingItemId, expression, ignore.name(), Boolean.toString(isCoalesce));
  }
}