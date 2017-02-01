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
package de.businesscode.bcdui.binding.rel.impl;

import de.businesscode.bcdui.binding.exc.BindingException;

/**
 * The class represents combined SQL constraints, like AND OR
 */
public class CombinedConstraintImpl extends AbstractConstrain {

  /**
   * Default implementation of
   */
  public static class CombinedConstraint implements Type {
    /**
     * Specifies, that boolean constraints are combined with as boolean <code>AND</code>.
     */
    public final static Type AND = new CombinedConstraintImpl.CombinedConstraint("And");

    public final static Type ANDNOT = new CombinedConstraintImpl.CombinedConstraint("AndNot");
    /**
     * Specifies, that boolean constraints are combined with a boolean <code>OR</code>.
     */
    public final static Type OR = new CombinedConstraintImpl.CombinedConstraint("Or");
    public final static Type ORNOT = new CombinedConstraintImpl.CombinedConstraint("OrNot");

    /**
     * Creates a new instance with the given name.
     */
    private String typeName;

    public CombinedConstraint(String pName) {
      typeName = pName;
    }

    @Override
    public String getName() {
      return typeName;
    }

    @Override
    public String toString() {
      return getName();
    }
  }

  /**
   * CombinedConstraintImpl
   *
   * @param pType
   * @param negate
   */
  public CombinedConstraintImpl(Type pType, boolean negate) {
    setType(pType);
    setNegate(negate);
  }

  /**
   * @see de.businesscode.bcdui.binding.rel.impl.AbstractConstrain#getConstrainedStatement(String)
   */
  @Override
  public String getConstrainedStatement( String prepareCaseExpressionForAlias) throws BindingException {
    if (getStatement() == null) {
      StringBuilder str = new StringBuilder();

      if (getChildConstraints() != null && getChildConstraints().size() > 0) {
        for (int i = 0; i < getChildConstraints().size(); i++) {
          String child = getChildConstraints().get( i).getConstrainedStatement( prepareCaseExpressionForAlias);
          if (child != null && child.length() > 0) {
            if (str.length() > 0 && i <= getChildConstraints().size() - 1)
              str.append("\n").append(AbstractConstrain.OPER_REPL);

            str.append(" ( ");
            str.append(child);
            str.append(" ) ");
          }
        }
      }
      setStatement(str.toString().replaceAll(AbstractConstrain.REGEXP_OPER_REPL.pattern(), getOperator()));
    }

    return getStatement();
  }

  /**
   * translates type to SQL string
   */
  private String getOperator() {
    String op = null;
    if (getType() == CombinedConstraint.AND)
      op = " AND ";
    else if (getType() == CombinedConstraint.OR)
      op = " OR ";
    else if (getType() == CombinedConstraint.ORNOT)
      op = " OR NOT ";
    else if (getType() == CombinedConstraint.ANDNOT)
      op = " AND NOT ";

    return op;
  }

  /**
   * @see de.businesscode.bcdui.binding.rel.impl.AbstractConstrain#mayContainChildConstraint()
   */
  @Override
  public boolean mayContainChildConstraint() {
    return true;
  }

}
