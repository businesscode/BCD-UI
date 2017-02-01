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
package de.businesscode.bcdui.binding.rel;

import de.businesscode.bcdui.binding.rel.impl.AbstractColumn;

/**
 * Value is just a String value to set, sample in a COALESCE SQL function
 */
public class Value extends AbstractColumn {

  /**
   * Value
   *
   * @param pColumnName
   * @param pTableName
   * @param pCustomData
   */
  protected Value(String pColumnName, String pTableName, String pCustomData) {
    super(pColumnName, pTableName);
    setObjectName("Value");
    setCustomData(pCustomData);
  }

  /**
   * @see de.businesscode.bcdui.binding.rel.Column#isVirtual()
   */
  @Override
  public boolean isVirtual() {
    return true;
  }
}
