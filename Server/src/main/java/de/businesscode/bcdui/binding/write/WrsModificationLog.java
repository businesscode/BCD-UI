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
package de.businesscode.bcdui.binding.write;

import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Set;

/**
 * preserves the update information on a record, handles following items:
 * <dl>
 *  <dt>bcdUpdateStamp</dt>
 *  <dd>writes current stamp on wrs:M and wrs:I</dd>
 *  <dt>bcdUpdateBy</dt>
 *  <dd>stores the username (principal), follows same logic as bcdUpdateStamp</dd>
 *  <dt>bcdCreateStamp</dt>
 *  <dd>writes current stamp on wrs:I, ignores update on wrs:M</dd>
 *  <dt>bcdCreateBy</dt>
 *  <dd>stores the username (principal), follows same logic as bcdCreateBy</dd>
 * </dl>
 * in case none of binding-items above are found in the given binding-set an exception is thrown.
 *
 * This callback ensures that the items are always written: the binding-items
 * are either appended to WRS in case they are missing or the values are set by
 * server as appropriate. The values are always set by server, WRS payload is
 * ignored for these binding items.
 *
 */
public class WrsModificationLog extends WrsModificationCallback {
  /**
   * set up our custom parameters according to binding-set availability
   */
  @Override
  public void initialize() {
    super.initialize();

    final Set<BindingItemConfig> referenceList = new HashSet<BindingItemConfig>();
    referenceList.add(new BindingItemConfig("bcdUpdateStamp", "${bcdBean.currentTimestampUtc}", BindingItemConfig.CONFIG_IGNORE.never, false));
    referenceList.add(new BindingItemConfig("bcdUpdateBy", "${bcdBean.userLogin}", BindingItemConfig.CONFIG_IGNORE.never, false));
    referenceList.add(new BindingItemConfig("bcdUpdateById", "${bcdBean.userId}", BindingItemConfig.CONFIG_IGNORE.never, false));
    referenceList.add(new BindingItemConfig("bcdCreateStamp", "${bcdBean.currentTimestampUtc}", BindingItemConfig.CONFIG_IGNORE.update, false));
    referenceList.add(new BindingItemConfig("bcdCreateBy", "${bcdBean.userLogin}", BindingItemConfig.CONFIG_IGNORE.update, false));
    referenceList.add(new BindingItemConfig("bcdCreateById", "${bcdBean.userId}", BindingItemConfig.CONFIG_IGNORE.update, false));

    /*
     * build the target list we want to provide data for, depended on binding definition, throw
     * exception if none binding-item found in the binding-set
     */
    final List<BindingItemConfig> filteredList = new LinkedList<BindingItemConfig>();
    for(BindingItemConfig bic : referenceList){
      if(bindingSet.hasItem(bic.bindingItemId)){
        filteredList.add(bic);
      }
    }

    if(filteredList.size() == 0){
      throw new RuntimeException(getClass().getName() + " registed for WriteProcessing, hence binding-set '"+bindingSet.getName()+"' is expected to have at least one of following binding-items: " + referenceList.toString());
    }

    /*
     * and now merge the filtered list to configuration params
     */
    getBindingItemConfig().addAll(filteredList);
  }
}
