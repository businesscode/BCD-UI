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


public interface Column {

  /** <p>Returns the columns table.</p>
   */
  public String getTable();

  /** <p>Returns the columns name.</p>
   */
  public String getName() throws BindingNotFoundException;

  /**
   * <p>Returns the columns fully qualified name, which is
   * <code>getTable() + "." + getName()</code>.</p>
   */
  public String getQColumnExpression()throws Throwable;

  /**
   * <p>Allows the user to attach application specific data to the column.</p>
   */
  public void setCustomData(String pData);

  /**
   * <p>Allows the user to retrieve application specific data, which has
   * previously been attached to the column.</p>
   */
  public String getCustomData();

  /**
   * <p>Returns whether this column is a true column or a virtual column.</p>
   */
  public boolean isVirtual();
}
