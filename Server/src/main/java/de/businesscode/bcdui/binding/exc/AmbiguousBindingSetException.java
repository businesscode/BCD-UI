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

/**
 * This exception is thrown when the method Bindings.get(String)
 * is called for a BindingSetGroup, because without the set of BindingItems
 * to be selected the Bindings class cannot determine which BindingSet
 * contained in the BindingSetGroup should be returned. Therefore the
 * method Bindings.get(String, Collection) should be preferred.
 *
 * @see de.businesscode.bcdui.binding.Bindings#get(String)
 * @see de.businesscode.bcdui.binding.Bindings#get(String, Collection)
 */
public class AmbiguousBindingSetException extends BindingException {
  public AmbiguousBindingSetException(String bindingSetName, int size) {
    super("The binding set group \"" + bindingSetName + "\" consists of " + size + " binding sets so you need to select one of it with an appropriate method.");
  }
}