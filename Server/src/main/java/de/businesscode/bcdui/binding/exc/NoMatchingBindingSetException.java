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
package de.businesscode.bcdui.binding.exc;

import java.util.Collection;

/**
 * An exception thrown by the method Bindings.get(String, Collection) if the
 * specified BindingSet does not contain all of the BindingItems or if the
 * BindingSetGroup does not provide any BindingSet containing all BindingItems.
 * @see de.businesscode.bcdui.binding.Bindings#get(String, Collection)
 */
public class NoMatchingBindingSetException extends BindingException {
  private static final long serialVersionUID = 8818966710931202127L;
  public NoMatchingBindingSetException(String bindingSetName, Collection<String> items, int size) {
    super("The "+(size==1?"BindingSet":"BindingGroup")+": "+bindingSetName+" does not contain all required ("+items.size()+") binding items");
  }
}