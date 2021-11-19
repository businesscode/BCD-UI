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
package de.businesscode.bcdui.binding.write;


/**
 * the {@link WriteProcessingCallback} are non thread-safe and each WRS processing will obtain new own intsance of a callback, however the callback
 * parameters supplied from binding-set definition are immutable so the factory will be configured already at binding bootstrapping while an instance
 * of a callback will be provided when requested via createIntance()
 *
 */
public class WriteProcessingCallbackFactory {
  private final Class<? extends WriteProcessingCallback> callbackClass;
  private WriteProcessingCallbackParams params;

  /**
   *
   * @param className which is loaded during construction of this factory, however, instance creation is deferred until required
   * @throws ClassNotFoundException in case no such class found
   */
  @SuppressWarnings("unchecked")
  public WriteProcessingCallbackFactory(String className) throws ClassNotFoundException {
    this.callbackClass = (Class<? extends WriteProcessingCallback>)Class.forName(className);
  }

  public void setParams(WriteProcessingCallbackParams params) {
    this.params = params;
  }

  /**
   *
   * @return new instance of a configured callback
   */
  public WriteProcessingCallback createInstance(){
    WriteProcessingCallback instance;
    try {
      instance = callbackClass.getDeclaredConstructor().newInstance();
      instance.setParams(params);
    } catch(Exception e){
      throw new RuntimeException("failed to create instance of " + callbackClass.getName(), e);
    }
    return instance;
  }
}
