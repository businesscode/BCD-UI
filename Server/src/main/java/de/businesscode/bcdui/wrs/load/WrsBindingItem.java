/*
  Copyright 2010-2025 BusinessCode GmbH, Germany

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

import java.util.Collection;

import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamWriter;

/**
 * Represents a BindingItem in a concrete Wrq, includes information like overwritten attributes
 * See analogy SimpleBindingItem and its subclasses representing the input side, i.e. StandardBindingSet or clc:Calc
 */
public interface WrsBindingItem {

  int                         getColumnNumber();
  Boolean                     isEscapeXML();
  void                        toXML(XMLStreamWriter writer, boolean withColumnExpression) throws XMLStreamException;
  boolean                     hasWrsAAttributes();
  Collection<WrsBindingItem>  getWrsAAttributes();
  Integer                     getJDBCDataType();
  String                      getWrsAName();
  String                      getId();
  Object                      getJDBCColumnScale();
  String                      getAlias();
  String                      getAttribute(String attName);
  String                      getAttribute(String attName, String attDefault);
  boolean                     hasCustomItem();
}
