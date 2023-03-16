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
import java.util.Collections;
import java.util.List;

public class WriteProcessing {
  private final List<PreProcessStylesheet> stylesheets = new ArrayList<PreProcessStylesheet>();
  private final List<WriteProcessingCallbackFactory> callbacks = new ArrayList<WriteProcessingCallbackFactory>();

  private final List<PreProcessStylesheet> stylesheetsRO = Collections.unmodifiableList(stylesheets);
  private final List<WriteProcessingCallbackFactory> callbacksRO = Collections.unmodifiableList(callbacks);

  /**
   * WriteProcessing
   */
  public WriteProcessing() {
    super();
  }

  /**
   * @return the READ ONLY stylesheets list
   */
  public final List<PreProcessStylesheet> getStylesheetsRO() {
    return stylesheetsRO;
  }

  /**
   *
   * @return READ ONLY callbacks list
   */
  public List<WriteProcessingCallbackFactory> getCallbacksRO() {
    return callbacksRO;
  }

  public boolean hasCallbacks() {
    return callbacksRO.size()>0;
  }

  // ======================================================================================================================

  public void addPreProcessStylesheet(PreProcessStylesheet stylesheet) {
    this.stylesheets.add(stylesheet);
  }

  public void addWriteProcessingCallbackFactory(WriteProcessingCallbackFactory callbackFactory) {
    this.callbacks.add(callbackFactory);
  }
}
