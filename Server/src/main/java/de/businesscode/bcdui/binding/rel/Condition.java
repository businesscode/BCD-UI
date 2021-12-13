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
package de.businesscode.bcdui.binding.rel;

import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.binding.exc.BindingNotFoundException;
import de.businesscode.bcdui.binding.rel.impl.AbstractConstrain;

/**
 * The class represents a SQL condition, i.e. ON clause of an JOIN
 */
public class Condition {

  private AbstractConstrain constraint;
  private String conditionStatement;

  /**
   * Condition
   */
  public Condition() {
  }

  /**
   * getConstraint
   *
   * @return
   */
  public AbstractConstrain getConstraint() {
    return constraint;
  }

  /**
   * setConstraint
   *
   * @param p_constraint
   */
  public void setConstraint(AbstractConstrain p_constraint) {
    constraint = p_constraint;
  }

  /**
   * Method getConditionStatement
   *
   * @return
   * @throws BindingNotFoundException
   */
  public String getConditionStatement( String mainTableAlias, boolean isForJoinToCaseWhen ) throws BindingException {
    // Maybe it is overwritten with conditionStatement.
    if (conditionStatement == null) {
      return getConstraint().getConstrainedStatement( mainTableAlias, isForJoinToCaseWhen );
    }
    return conditionStatement;
  }

  /**
   * @see java.lang.Object#toString()
   */
  public String toString() {
    StringBuilder str = new StringBuilder("<Condition>");
    if (getConstraint() != null)
      str.append(getConstraint().toString());

    str.append("</Condition>");

    return str.toString();
  }
}
