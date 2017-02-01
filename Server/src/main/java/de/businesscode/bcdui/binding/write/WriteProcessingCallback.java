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
import java.util.List;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.wrs.save.ServerSideValueBean;

abstract public class WriteProcessingCallback {
  private ServerSideValueBean valueBean;
  private WriteProcessingCallbackParams params;
  protected BindingSet bindingSet;

  public static enum ROW_TYPE {
    M,I,D
  }

  public WriteProcessingCallback() {
    super();
  }

  /**
   * set binding-set this instance operates on
   * @param bindingSet
   */
  public void setBindingSet(BindingSet bindingSet){
    this.bindingSet = bindingSet;
  }

  public void setParams(WriteProcessingCallbackParams params) {
    this.params = params;
  }

  /**
   * sets the valuebean
   * @param valueBean
   */
  public void setValueBean(ServerSideValueBean valueBean) {
    this.valueBean = valueBean;
  }

  protected WriteProcessingCallbackParams getParams() {
    return params;
  }

  /**
   * perform initialization, read params, etc prior to call {@link #endHeader(List, List, Collection)} or {@link #endDataRow(ROW_TYPE, List, List)},
   * at this point any other configurations members are already set
   *
   */
  public void initialize(){
  }

  /**
   * @return the value bean for server values, is optional and may be null
   */
  protected ServerSideValueBean getValueBean() {
    return valueBean;
  }

  /**
   * is called once WRS header has been read, the implementation may modify either data provided,
   * at this point the serverSideValueBean and bindingSet are already initialized
   *
   * @param columns
   * @param columnTypes
   * @param keyColumnNames
   */
  public void endHeader(List<BindingItem> columns, List<Integer> columnTypes, Collection<String> keyColumnNames){

  }

  /**
   * is called once WRS row has been read, the implementation may modify data provided,
   * at this point the serverSideValueBean and bindingSet are already initialized
   *
   * @param rowType depending on the rowtype cValues and oValues change semantics, i.e: wrs:C in wrs:I vs wrs:C in wrs:M
   * @param cValues list of values of wrs:C columns
   * @param oValues list of values of wrs:O columns
   */
  public void endDataRow(ROW_TYPE rowType, List<String> cValues, List<String> oValues){

  }
}
