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
package de.businesscode.bcdui.binding.write;

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.apache.log4j.Logger;

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
 *    <b>false</b>: always writes value from expression evaluated on the server, even though it has not been sent along with WRS<br>
 *  </dd>
 * </dl>
 */
public class WrsModificationCallback extends WriteProcessingCallback {
  protected final  Logger log = Logger.getLogger(getClass());

  private Set<BindingItemConfig> bindingItemConfig;

  /*
   * this set contains ordered binding-items which are missing in original WRS and are appended
   */
  protected final List<BindingItemConfig> itemsToAppend = new LinkedList<BindingItemConfig>();
  /*
   * the index map of already available binding-items in WRS
   */
  protected final HashMap<Integer, BindingItemConfig> bindingItemIdxMap = new HashMap<Integer, BindingItemConfig>();

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
    // item not found in WRS - append it internally and to WRS
    if(idx < 0){
      if(log.isTraceEnabled()){
        log.trace("binding item to append: " + itemConfig.bindingItemId);
      }
      try {
        BindingItem bItem = bindingSet.get(itemConfig.bindingItemId);

        columns.add(bItem);
        columnTypes.add(bItem.getJDBCDataType());

        itemsToAppend.add(itemConfig);

      } catch (BindingNotFoundException e) {
        throw new RuntimeException("missing binding item '"+itemConfig.bindingItemId+"'",e);
      }
    }else{
      // item located in WRS - map it via index
      bindingItemIdxMap.put(idx, itemConfig);
      if(log.isTraceEnabled()){
        log.trace("found binding item to map " + itemConfig.bindingItemId + " at index " + idx);
      }
    }
  }

  @Override
  public void endHeader(List<BindingItem> columns, List<Integer> columnTypes, Collection<String> keyColumnNames) {
    itemsToAppend.clear();
    bindingItemIdxMap.clear();

    /*
     * initialize binding items from given WRS according to bindingItem parameters
     */
    for(BindingItemConfig itemConfig : bindingItemConfig){
      initializeBindingItemWrs(bindingSet, columns, columnTypes, itemConfig);
    }

    if(log.isTraceEnabled()){
      log.trace("items to append: " + itemsToAppend.toString());
      log.trace("items mapped in WRS: " + bindingItemIdxMap.toString());
    }
  }

  /**
   * ignores wrs:D
   *
   * if binding items are not located in WRS we augment it
   */
  @Override
  public void endDataRow(ROW_TYPE rowType, List<String> cColumns, List<String> oColumns) {
    if(rowType == ROW_TYPE.D){
      return;
    }

    // overwrite values according to header, for already existing items
    for(int colIdxCnt=0, len=cColumns.size(); colIdxCnt < len; colIdxCnt++){
      BindingItemConfig item = bindingItemIdxMap.get(colIdxCnt);
      if(item == null)continue;

      if (item.ignore == BindingItemConfig.CONFIG_IGNORE.update && rowType == ROW_TYPE.M){
        // skip update
        if(log.isTraceEnabled()){
          log.trace("skip item value to update: " + item.bindingItemId + " because of ignore=" + item.ignore.name() + " and row type = " + rowType.name());
        }

        // TODO in this case
        // we rather should remove the columns entirely from update instruction, but WRS implementation does not support this currently
        continue;
      }

      if(item.isCoalesce == false || cColumns.get(colIdxCnt) == null){
        cColumns.set(colIdxCnt, evalValue(item));
      }
    }


    // append values according to order defined in header for non existing items
    // wrs:I|wrs:M handled same way
    for(BindingItemConfig item : itemsToAppend){
      if (item.ignore == BindingItemConfig.CONFIG_IGNORE.update && rowType == ROW_TYPE.M){
        // skip update
        if(log.isTraceEnabled()){
          log.trace("skip item to append: " + item.bindingItemId + " because of ignore=" + item.ignore.name() + " and row type = " + rowType.name());
        }
        continue;
      }
      final String value = evalValue(item);
      // append wrs:C only, but wrs:O required to be same length
      cColumns.add(value);
      oColumns.add(null);
    }
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
  Logger log = Logger.getLogger(getClass());
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