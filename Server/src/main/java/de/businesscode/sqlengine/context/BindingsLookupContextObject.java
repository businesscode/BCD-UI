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
package de.businesscode.sqlengine.context;

import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import de.businesscode.sqlengine.SQLEngine;

/**
 * This is the velocity context object, allowing velocity to lookup a BindingSet (more precisely a BindingSetLookupContextObject) by name
 * This is used in phase 2 (@see {@link SQLEngine}), when the concrete BindingSet is already known
 * Later the user can also ask for all BindingSets we were asked for
 */
public class BindingsLookupContextObject
{
	private final Map<String, BindingSetLookupContextObject> usedBindings = new HashMap<String, BindingSetLookupContextObject>();

	/**
	 * 
	 */
	public BindingsLookupContextObject() {
	}

	/**
	 * Getter for Velocity
	 * 
	 * @param key
	 * @return the BindingSet representation
	 */
	public Object get(String key) {
		BindingSetLookupContextObject bindingSet = usedBindings.get(key);
		if (bindingSet == null) {
			bindingSet = new BindingSetLookupContextObject(key);
			usedBindings.put(key, bindingSet);
		}
		return bindingSet;
	}

	/**
	 * getUsedBindingsNames
	 * 
	 * @return the referenced BindingSets
	 */
	public Set<String> getUsedBindingsNames() {
		return Collections.unmodifiableSet(usedBindings.keySet());
	}

	/**
	 * getUsedBindings
	 * 
	 * @return the referenced BindingSets
	 */
	public Collection<BindingSetLookupContextObject> getUsedBindings() {
		return Collections.unmodifiableCollection(usedBindings.values());
	}

}
