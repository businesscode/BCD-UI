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

import de.businesscode.bcdui.binding.exc.BindingNotFoundException;
import de.businesscode.bcdui.binding.rel.impl.AbstractColumn;

public class ImportItem extends AbstractColumn {

  private String caption;

  /**
   *
   * Constructor
   *
   * @param pTableName
   * @param pImportItemName
   */
  public ImportItem(String pImportItemName, String pTableName) {
    super(pImportItemName, pTableName);
    setObjectName("ImportItem");
  }

  /**
   * @see de.businesscode.bcdui.binding.rel.Column#isVirtual()
   */
  @Override
  public boolean isVirtual() {
    return false;
  }

  /**
   * @see de.businesscode.bcdui.binding.rel.impl.AbstractColumn#getQColumnExpression()
   */
  @Override
  public String getQColumnExpression() throws BindingNotFoundException {
    // we allow only one child item
    String qName = null;
    if (getChildColumnItem() != null)
      qName = getChildColumnItem().get(0).getQColumnExpression();

    return qName;
  }

  public String getCaption() {
    return caption;
  }

  public void setCaption(String caption) {
    this.caption = caption;
  }

}
