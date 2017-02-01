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
package de.businesscode.bcdui.wrs.load.modifier;

import javax.xml.parsers.ParserConfigurationException;

import org.w3c.dom.Element;

/**
 * A class implementing Modifier may be used to move a WrsRequest by adding a bnd:Modifiers block to a BindingSet xml definition
 */
public interface Modifier {

  // Take the WrsRequest document as send by the client and return a f:Filter element (an extra Document), which is then used to create the SQL instead
  Element process( Element wrq ) throws ParserConfigurationException;
 
}