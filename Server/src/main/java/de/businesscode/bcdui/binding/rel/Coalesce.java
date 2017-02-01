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

public class Coalesce extends AbstractColumn{

  private String aliasColumnName;

  /**
   *
   * Constructor
   * @param pColumnName
   * @param pTableName
   */
  protected Coalesce(String pColumnName, String pTableName) {
    super(pColumnName, pTableName);
    setObjectName("Coalesce");
    setAliasColumnName(pColumnName);
  }


  public String getAliasColumnName() {
    return aliasColumnName;
  }


  public void setAliasColumnName(String aliasColumnName) {
    this.aliasColumnName = aliasColumnName;
  }


  @Override
  /**
   * coalesce is a virtual column
   */
  public boolean isVirtual() {return true;}

  @Override
  public String getQColumnExpression() throws BindingNotFoundException {
    StringBuilder str = new StringBuilder();
    str.append(" COALESCE( ");
    for (int i = 0; i < getChildColumnItem().size(); i++) {
      if( i > 0)
        str.append(",");

      if( ! (getChildColumnItem().get(i) instanceof Value))
        str.append( getChildColumnItem().get(i).getQColumnExpression());
      else if(getChildColumnItem().get(i) instanceof Value)
        str.append("'").append( getChildColumnItem().get(i).getCustomData().replaceAll("'", "''")).append("'");
    }

    str.append(" )");

    return str.toString();
  }

  @Override
  public String getName() throws BindingNotFoundException {
    return getQColumnExpression();
  }

}
