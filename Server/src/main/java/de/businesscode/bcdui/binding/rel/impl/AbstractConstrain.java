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

import java.util.ArrayList;
import java.util.regex.Pattern;

import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.binding.exc.BindingNotFoundException;

public abstract class AbstractConstrain {

  public interface Type {
    public String getName();
    public String toString();
  }

  private Type type;

  private ArrayList<AbstractColumn> bindingItemRefs;
  private ArrayList<AbstractConstrain> childConstraints;
  private boolean negate = false;
  private String statement;

  public static String OPER_REPL = "$OPER_REPL";
  public static Pattern REGEXP_OPER_REPL = Pattern.compile("\\$OPER_REPL");

  /**
   * AbstractConstrain
   */
  public AbstractConstrain() {
  }

  /**
   * getStatement
   *
   * @return
   */
  protected String getStatement() {
    return statement;
  }

  /**
   * setStatement
   *
   * @param constraintStatement
   */
  protected void setStatement(String constraintStatement) {
    this.statement = constraintStatement;
  }

  /**
   * getChildConstraints
   *
   * @return
   */
  public ArrayList<AbstractConstrain> getChildConstraints() {
    return childConstraints;
  }

  /**
   * getType
   *
   * @return
   */
  public Type getType() {
    return type;
  }

  /**
   * setType
   *
   * @param ptype
   */
  public void setType(Type ptype) {
    this.type = ptype;
  }

  /**
   *
   * Method getName gets name of type
   *
   * @return
   */
  public String getName() {
    return getType().getName();
  }

  /**
   * addColumn
   *
   * @param pColumn
   */
  public void addColumn(AbstractColumn pColumn) {
    if (this.bindingItemRefs == null)
      this.bindingItemRefs = new ArrayList<AbstractColumn>();

    this.bindingItemRefs.add(pColumn);
  }

  /**
   * getColumns
   *
   * @return
   */
  public ArrayList<AbstractColumn> getColumns() {
    return this.bindingItemRefs;
  }

  /**
   * @see java.lang.Object#toString()
   */
  public String toString() {
    StringBuilder str = new StringBuilder("<").append(getType()).append(" negate='").append(isNegate()).append("'").append(">");

    if (getColumns() != null && getColumns().size() > 0)
      for (int i = 0; i < getColumns().size(); i++) {
        str.append(getColumns().get(i).toString());
        if (i > 0)
          str.append("\n");
      }

    if (mayContainChildConstraint()) {
      if (getChildConstraints() != null && getChildConstraints().size() > 0)
        for (int i = 0; i < getChildConstraints().size(); i++) {
          str.append(getChildConstraints().get(i).toString());
        }
    }
    str.append("</").append(getType()).append(">");
    return str.toString();
  }

  /**
   * addChildConstraint
   *
   * @param pConstraint
   * @throws BindingException
   */
  public void addChildConstraint(AbstractConstrain pConstraint) throws BindingException {
    if (mayContainChildConstraint()) {
      if (this.childConstraints == null)
        this.childConstraints = new ArrayList<AbstractConstrain>();
      this.childConstraints.add(pConstraint);
    }
    else
      throw new BindingException("the constrain " + getName() + " may not contain any child constrain");
  }

  /**
   * setNegate
   *
   * @param pNot
   */
  public void setNegate(boolean pNot) {
    negate = pNot;
  }

  /**
   * isNegate
   *
   * @return
   */
  public boolean isNegate() {
    return negate;
  }

  /**
   * returns size of columns
   *
   * @return
   */
  public int getNumParts() {
    return getColumns().size();
  }

  /**
   * builds and returns full SQL statement of the constraint
   *
   * Method getConstrainedStatement
   *
   * @return
   * @throws BindingNotFoundException
   * @throws BindingException
   */
  public abstract String getConstrainedStatement( String prepareCaseExpressionForAlias) throws BindingException;

  /**
   * if the constraint may contain child constraint
   */
  public abstract boolean mayContainChildConstraint();

}
