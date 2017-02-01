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
package de.businesscode.bcdui.wrs.load;

import java.util.Map;

import de.businesscode.bcdui.binding.BindingItem;

/**
 * This class is container of one attribute of binding item. It serves as a marker
 * In WRS-request the Attribute element presents as
 * {@code
 * <Columns>
 * ...
 *     <C bRef="column1">
 *         <A name="caption" bRef="column2"/>
 *     </C>
 * ...
 * </Columns>
 * }
 * See WRS-request XSD for more information about Columns and Attributes rules.
 */
public class BindingItemAttribute extends BindingItemWithMetaData {

  /**
   * Constructor.
   * @param attrName Attribute's name ("name" attribute in Attribute element).
   * @param bindingItem Attribute's binding item ("bRef" attribute in Attribute element).
   */
  public BindingItemAttribute(String attrName, BindingItem bindingItem, String aggregationFunction, String alias) {
    super(bindingItem, aggregationFunction, alias);
    addAttribute("name", attrName);
  }

  public BindingItemAttribute(String attrName, BindingItem bindingItem, String aggregationFunction, String alias, Map<String,String> userAttributes) {
    super(bindingItem, aggregationFunction, alias, userAttributes);
    addAttribute("name", attrName);
  }

  public String getWrsAName() {
    return (String)getAttributes().get("name");
  }
}
