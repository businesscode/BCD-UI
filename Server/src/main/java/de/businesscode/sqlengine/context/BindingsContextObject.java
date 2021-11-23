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
package de.businesscode.sqlengine.context;

import java.util.HashMap;
import java.util.Map;

import de.businesscode.bcdui.binding.Bindings;

/**
 * This is the velocity context object, that represents BCD-UI global Bindings singleton, $bindings
 * and serves as a lookup for BindingSets
 * It already known from its parameters in the constructor, which binding set name / binding item names combinations occur
 * and is used in phase 2 (@see {@link de.businesscode.sqlengine.SQLEngine})
 */
public class BindingsContextObject 
{
	private final Map<String, BindingSetContextObject> resolvedBindingSets = new HashMap<String, BindingSetContextObject>();

	/**
	 * @param bindings BCD global Bindings singleton
	 * @param bindingsLookup
	 */
	public BindingsContextObject(Bindings bindings, BindingsLookupContextObject bindingsLookup) {
		super();
		// Each table gets am individual alias
		int tableAliasCnt = 1;
		for (BindingSetLookupContextObject bindingSet : bindingsLookup.getUsedBindings()) {
			String requestedName = bindingSet.getName();
			BindingSetContextObject bs = new BindingSetContextObject(bindings, requestedName, bindingSet.getUsedItems(), "t_"+(tableAliasCnt++));
			this.resolvedBindingSets.put(requestedName, bs);
		}
	}

	/**
	 * Getter for Velocity
	 * 
	 * @param key
	 * @return the BindingSet representation
	 */
	public Object get(String key) {
		return resolvedBindingSets.get(key);
	}

	/**
	 * Getter for a map, key is requested BindingSet name, value is the actual BindingSet determined,
	 * useful for a caller of SQLEngine to get info about the query structure
	 * @return
	 */
  public Map<String, BindingSetContextObject> getUsedBindings() {
    return resolvedBindingSets;
  }

}
