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
package de.businesscode.bcdui.binding.exc;

import de.businesscode.bcdui.binding.BindingSet;

/**
 * This exception is thrown when a BindingItem with the specified name
 * cannot be found inside a specific BindingSet.
 * @see BindingSet#get(String)
 */
public class BindingNotFoundException extends BindingException {
  private static final long serialVersionUID = 1L;
  public BindingNotFoundException(BindingSet binding, String bindingItemName) {
    super("Binding item" + (bindingItemName.indexOf(",") > -1 ? "s" : "") +  " \"" + bindingItemName + "\" not found in binding set \"" + binding.getName() + "\".");
  }
  public BindingNotFoundException(String message) {
    super(message);
  }
}