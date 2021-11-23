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
package de.businesscode.bcdui.binding.rel.impl;

import java.util.Collections;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.BindingItemFromRel;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingException;

/**
 * The class represents boolean SQL constraints, like IS NULL or IS NOT NULL
 *
 */
public class BooleanConstraintImpl extends AbstractConstrain {

  public static class BooleanConstraint implements AbstractConstrain.Type {
    public static final Type EQ = new BooleanConstraintImpl.BooleanConstraint("IsEqual");
    /**
     * A boolean constraint matching the "not equal" condition.
     */
    public static final Type NEQ = new BooleanConstraintImpl.BooleanConstraint("IsNotEqual");

    /**
     * A boolean constraint matching the "IS NULL" condition.
     */
    public static final Type ISNULL = new BooleanConstraintImpl.BooleanConstraint("IsNull");

    public static final Type ISNOTNULL = new BooleanConstraintImpl.BooleanConstraint("IsNotNull");

     /**
     * A boolean constraint matching the "lower than" condition.
     */
     public static final Type LT = new BooleanConstraintImpl.BooleanConstraint(
     "LT");

     /**
     * A boolean constraint matching the "greater than" condition.
     */
     public static final Type GT = new BooleanConstraintImpl.BooleanConstraint(
     "GT");

     /**
     * A boolean constraint matching the "lower or equal" condition.
     */
     public static final Type LE = new BooleanConstraintImpl.BooleanConstraint(
     "LE");
     /**
     * A boolean constraint matching the "greater or equal" condition.
     */
     public static final Type GE = new BooleanConstraintImpl.BooleanConstraint(
     "GE");
    // /**
    // * A boolean constraint matching the "LIKE" condition.
    // */
    // public static final Type LIKE = new BooleanConstraintImpl.BooleanConstraint(
    // "LIKE");
    // /**
    // * A boolean constraint matching the "IN" condition.
    // */
    // public static final Type IN = new BooleanConstraintImpl.BooleanConstraint(
    // "IN");
    // /**
    // * A boolean constraint matching the "EXISTS" condition.
    // */
    // public static final Type EXISTS = new BooleanConstraintImpl.BooleanConstraint(
    // "EXISTS");
    // /**
    // * A boolean constraint matching the "BETWEEN" condition.
    // */
    // public static final Type BETWEEN = new BooleanConstraintImpl.BooleanConstraint(
    // "BETWEEN");

    private String typeName;

    /**
     *
     * Constructor
     *
     * @param pType
     */
    public BooleanConstraint(String pType) {
      typeName = pType;
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
   * BooleanConstraintImpl
   *
   * @param pType
   * @param negate
   */
  public BooleanConstraintImpl(Type pType, boolean negate) {
    if (pType == null) {
      throw new NullPointerException("The type must not be null.");
    }
    setType(pType);
    setNegate(negate);
  }

  /**
   * translates type to SQL string
   *
   * Method getOperator
   *
   * @return
   */
  protected String getOperator() throws BindingException {
    String op = null;
    if (getType() == BooleanConstraint.EQ) {
      if (isNegate())
        op = " <> ";
      else
        op = " = ";
    }
    else if( getType() == BooleanConstraint.LT){
      if(isNegate()) op = " > ";
      else op = " < ";
    }
    else if( getType() == BooleanConstraint.LE){
      if(isNegate()) op = " >= ";
      else op = " <= ";
    }
    else if( getType() == BooleanConstraint.GT){
      if(isNegate()) op = " < ";
      else op = " > ";
    }
    else if( getType() == BooleanConstraint.GE){
      if(isNegate()) op = " <= ";
      else op = " >= ";
    }
    else if (getType() == BooleanConstraint.NEQ)
      op = " <> ";
    else if (getType() == BooleanConstraint.ISNULL) {
      if (isNegate())
        op = " IS NOT NULL ";
      else
        op = " IS NULL ";
    }
    else if (getType() == BooleanConstraint.ISNOTNULL)
      op = " IS NOT NULL ";

    else
      throw new BindingException("Invalid type of Relation constraint: "+getName());

    return op;
  }

  /**
   * @see de.businesscode.bcdui.binding.rel.impl.AbstractConstrain#getConstrainedStatement(String,String,String)
   */
  @Override
  public String getConstrainedStatement(String mainTableAlias, boolean isForJoinToCaseWhen) throws BindingException {

    if (getStatement() == null) {
      StringBuilder str = new StringBuilder();

      // A small check for a common case error: we have a relation where both parts are identical
      // Happens for example if a join condition does use twice the same binding item id and does not specify which is left and right, so we would say t1.col = t1.col here
      if( getColumns().size()==2 && getColumns().get(0).getQColumnExpression("tx").equals(getColumns().get(1).getQColumnExpression("tx")) )
        throw new BindingException( "Ambiguous usage of bindingItem '"+getColumns().get(1).getId() + 
            "'. You probably have to define left and right in a relation condition of the bindingSet '"+getColumns().get(1).getBindingSet().getName()+"'");

      for (int i = 0; i < getColumns().size(); i++) {
        boolean isNumeric = Bindings.getInstance().get( getColumns().get( i).getBindingSet().getName(), Collections.emptyList()).get( getColumns().get( i).getId()).isNumeric();

        // This takes care for the join-to-case, i.e. CaseWhenFromReal, statement handling
        if( isForJoinToCaseWhen ) {
          if( getColumns().get(i) instanceof BindingItemFromRel ) {
            BindingItem biRef = getColumns().get(i);
            if ( isNumeric ) {
              str.append( "' || " + biRef.getColumnExpression() + " || '");
            } else {
              str.append( "''' || " + biRef.getColumnExpression() + " || '''");
            }
          } else {
            str.append( getColumns().get( i).getColumnExpression() );
          }
        }
        
        // Standard join case
        else {
          str.append( getColumns().get( i).getQColumnExpression(mainTableAlias) );
        }

        if ((str.length() > 0 && i < getColumns().size() - 1) || getColumns().size() == 1)
          str.append(AbstractConstrain.OPER_REPL);

      }

      setStatement(str.toString().replaceAll(AbstractConstrain.REGEXP_OPER_REPL.pattern(), getOperator()));
    }

    // We prepare the statement for efficiency above, but we need to fill in the mainTableAlias per query
    return getStatement().replaceAll(AbstractConstrain.MAINTABLE_SQLALIAS_PATTERN.pattern(), mainTableAlias);
  }

  /**
   *
   * Method getMinimumParts
   *
   * @return
   */
  public int getMinimumParts() {
    return 1;
  }

  /**
   * @see de.businesscode.bcdui.binding.rel.impl.AbstractConstrain#mayContainChildConstraint()
   */
  @Override
  public boolean mayContainChildConstraint() {
    return false;
  }

}
