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
package de.businesscode.bcdui.wrs.load;

import java.util.LinkedList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.apache.commons.lang.StringUtils;
import org.apache.log4j.Logger;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.subject.Subject;
import org.w3c.dom.Element;

import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.binding.exc.BindingNotFoundException;
import de.businesscode.bcdui.binding.subjectFilter.Connective;
import de.businesscode.bcdui.binding.subjectFilter.Connective.SYMBOL;
import de.businesscode.bcdui.binding.subjectFilter.SubjectFilter;
import de.businesscode.bcdui.binding.subjectFilter.SubjectFilterNode;
import de.businesscode.bcdui.subjectsettings.SecurityHelper;
import de.businesscode.bcdui.subjectsettings.SubjectSettings;
import de.businesscode.bcdui.subjectsettings.config.SubjectFilterType;

/**
 * Returns a where clause based on the SubjectFilters of the BindingSet and the current Subject's permissions Initially taken from WrsSqlGenerator. For change
 * history see there
 * 
 */
public class SubjectSettings2Sql implements SqlConditionGenerator {
  /**
   * number of permissions to be resolved inline rather that via subselect from user-rights-table
   */
  private static final int THRESHOLD_PERMS_COUNT_INLINE = 20;
  private final BindingSet bindingSet;
  private final WrqInfo wrqInfo;
  private final List<Element> boundVariables;
  private Logger logger = Logger.getLogger(getClass());
  // TODO: add depedency on isDebug? or introduce custom new flag
  private boolean applySqlOptimization = true;

  public SubjectSettings2Sql(BindingSet bindingSet, WrqInfo wrqInfo, List<Element> boundVariables) {
    this.bindingSet = bindingSet;
    this.wrqInfo = wrqInfo;
    this.boundVariables = boundVariables;
  }

  /**
   * Returns a where clause based on the SubjectFilters of the BindingSet and the current Subject's permissions
   * @return additional condition or empty string
   * @throws BindingException
   */
  @Override
  public String getCondition() throws BindingException {
    if (!bindingSet.hasSubjectFilters()) {
      return "";
    }

    final StringBuilder whereClause = new StringBuilder();

    StringBuilder loggingSb = logger.isTraceEnabled() ? new StringBuilder() : null;

    // Loop over the SubjectFilters of the BindingSet
    boolean hasAccess = build(whereClause, bindingSet.getSubjectFilters().getConnective(), boundVariables, SubjectSettings.getInstance(), SecurityUtils.getSubject(), loggingSb, 0);

    if (loggingSb != null) {
      logger.trace("(see next line)\n" + loggingSb);
    }

    // in case of no access, 1=0 is returned
    return hasAccess ? whereClause.toString() : " 1=0 ";
  }

  private void writeParams(List<String> psValues, List<Element> elementList) {
    psValues.forEach(p -> {
      Element e = wrqInfo.getOwnerDocument().createElement("SubjectSettings");
      e.setAttribute("value", p);
      elementList.add(e);
    });
  }

  private boolean build(StringBuilder connectiveSb, Connective connective, List<Element> boundVariables, SubjectSettings settings, Subject subject,
      StringBuilder loggingSb, int level) throws BindingNotFoundException, BindingException {
    String padding = loggingSb != null ? StringUtils.leftPad("", level * 4) : null;

    List<String> nestedPsValues = new LinkedList<>();
    List<Element> nestedElementList = new LinkedList<>();

    StringBuilder innerSb = new StringBuilder();

    if (loggingSb != null)
      loggingSb.append(padding).append("build [ ").append(connective.getSymbol()).append("\n");

    for (SubjectFilterNode sfNode : connective.getElements()) {
      if (sfNode instanceof SubjectFilter) { // SubjectFilter
        if (loggingSb != null)
          loggingSb.append(padding).append("| resolve filter: ").append(((SubjectFilter) sfNode).getType()).append("\n");
        if (!resolveSubjectFilter(nestedElementList, settings, subject, innerSb, (SubjectFilter) sfNode, connective, nestedPsValues)) {
          // in case one filter failed to resolve due to not available permissions, we stop
          return false;
        }
      } else { // Connective (recursion)
        if (loggingSb != null)
          loggingSb.append(padding).append("| resolve Connective").append("\n");
        // use new builder for scoping so undelying logic detects when to omit leading AND/OR symbols also
        // the scope might be empty i.e. due to * permit
        StringBuilder scopeSb = new StringBuilder();
        if (!build(scopeSb, (Connective) sfNode, nestedElementList, settings, subject, loggingSb, level + 1)) {
          return false;
        } else if (scopeSb.length() > 0) {
          // drop inner supportive operands
          // @formatter:off
          String scopeSbString = scopeSb.toString().trim();
          if(
              !(connective.getSymbol() == SYMBOL.OR  && scopeSbString.equals("1=0")) &&
              !(connective.getSymbol() == SYMBOL.AND && scopeSbString.equals("1=1"))
            ){
            // add symbol only in case we have already something on left hand side
            if (innerSb.length() > 0) {
              innerSb.append(" ").append(connective.getSymbol()).append(" ");
            }
            innerSb.append(scopeSb);
          }else{
            if(loggingSb != null)
              loggingSb.append(padding).append("- skip Connective due to [").append(connective.getSymbol()).append(" ").append(scopeSbString).append("]").append("\n");
          }
          // @formatter:on
        }
      }
    }

    // build AND|OR (<inner>)
    if (connectiveSb.length() > 0) {
      connectiveSb.append(" ").append(connective.getSymbol()).append(" ");
    }

    if (innerSb.length() == 0) {
      /* @formatter:off
       * neutrals:
       * OR   (empty) means was OR  ( 1=0 ) hence rewrite to OR  1=0
       * AND  (empty) means was AND ( 1=1 ) hence rewrite to AND 1=1
       * @formatter:on
       */
      if (connective.getSymbol() == Connective.SYMBOL.AND) {
        connectiveSb.append("1=1");
      } else if (connective.getSymbol() == Connective.SYMBOL.OR) {
        connectiveSb.append("1=0");
      } else
        throw new RuntimeException("unsupported symbol here: " + connective.getSymbol());
    } else {
      boolean isOptimized = false;

      if (applySqlOptimization) {
        // optimization of inner statements
        String innerSbStr = innerSb.toString();
        if (connective.getSymbol() == Connective.SYMBOL.OR && innerSbStr.matches("(.*OR 1=1.*)|(.*1=1 OR.*)")) {
          isOptimized = true;
          connectiveSb.append(" 1=1 ");

          if (loggingSb != null)
            loggingSb.append(padding).append("| (trulify inner OR)").append("\n");

        } else if (connective.getSymbol() == Connective.SYMBOL.AND && innerSbStr.matches("(.*AND 1=0.*)|(.*1=0 AND.*)")) {
          isOptimized = true;
          connectiveSb.append(" 1=0 ");

          if (loggingSb != null)
            loggingSb.append(padding).append("| (falsify inner AND)").append("\n");

        }
      }

      if (!isOptimized) {
        // persist parameters for prepared-statement
        writeParams(nestedPsValues, nestedElementList);
        boundVariables.addAll(nestedElementList);
        // in case we have canonical 1=0, 1=1 dont wrap then into parenthesis, this will ensure SQL optimization will to its job
        if ("|1=1|1=0|".contains(innerSb)) {
          connectiveSb.append(innerSb);
        } else {
          connectiveSb.append("(").append(innerSb).append(")");
        }
      }
    }

    if (loggingSb != null)
      loggingSb.append(padding).append(connective.getSymbol()).append("]").append("\n");

    return true;
  }

  /**
   * resolves subject filter to a value
   * 
   * @param elementList
   * @param settings
   * @param subject
   * @param session
   * @param sqlClause
   * @param sf
   * @param connective
   * @param preparedStatementParams
   * @return false in case user has no access to the binding-set at all, true otherwise
   * @throws BindingNotFoundException
   * @throws BindingException
   */
  private boolean resolveSubjectFilter(List<Element> elementList, SubjectSettings settings, Subject subject, final StringBuilder sqlClause, SubjectFilter sf,
      Connective connective, List<String> preparedStatementParams) throws BindingNotFoundException, BindingException {
    SubjectFilterType ft = settings.getSubjectFilterTypeByName(sf.getType());
    String bRef = ft.getBindingItems().getC().getBRef();

    // Either this is attached as an attribute to our session
    final String sessionFilterValue = settings.getFilterTypeValue(subject.getSession(false), ft);

    if (sessionFilterValue != null) {
      resolveWithValue(elementList, sqlClause, ft, bRef, sessionFilterValue, connective);
      return true;
    } else if (SubjectSettings.rightsInDbAvailable()) {
      resolveByUserRightsTable(sqlClause, subject, ft, bRef, connective, preparedStatementParams, settings.getFilterType(ft));
      return true;
    } else {
      // Otherwise the user has no rights at all
      return false;
    }
  }

  private void resolveByUserRightsTable(StringBuilder subjectSettingsClause, Subject subject, SubjectFilterType ft, String bRef, Connective connective,
      List<String> preparedStatementParams, String filterType) throws BindingException, BindingNotFoundException {
    if (subject.isPermitted(filterType + ":*")) {
      // If the subjects has all rights for this SubjectFilterType
      writeCanonicalConnective(subjectSettingsClause, connective, true);
      return;
    }

    Set<String> permissions = SecurityHelper.getPermissions(subject, filterType);
    if (permissions.isEmpty() && !ft.isIsNullAllowsAccess()) { // no permissions means we're done, unless filterType was instructed to ignoreNullValue
      writeCanonicalConnective(subjectSettingsClause, connective, false);
      return;
    }

    // Create subselect from subject settings for where clause
    if (subjectSettingsClause.length() > 0) {
      subjectSettingsClause.append(" " + connective.getSymbol() + " ");
    }

    generateCondition(subjectSettingsClause, subject, ft, preparedStatementParams, filterType, permissions, bindingSet.get(bRef).getQColumnExpression());
  }

  /**
   * generates single condition like "col in ('a','b','c')"
   *
   * @param subjectSettingsClause - to generate condition into
   * @param subject - current subject
   * @param ft - filter type to generate condition from
   * @param preparedStatementParams - the parameter list
   * @param filterType - filter type name
   * @param permissions - permissions granted by subject
   * @param columnExpression - the column expression to participate in condition
   */
  protected void generateCondition(StringBuilder subjectSettingsClause, Subject subject, SubjectFilterType ft, List<String> preparedStatementParams, String filterType,
      Set<String> permissions, String columnExpression) {
    if(permissions.isEmpty() && ft.isIsNullAllowsAccess()) {
      // no permission, yet select null-values
      subjectSettingsClause.append(columnExpression).append(" IS NULL");
    }else {
      if(ft.isIsNullAllowsAccess()) {
        columnExpression = "$col$ IS NULL OR $col$".replace("$col$", columnExpression);
      }
      subjectSettingsClause.append("(");
      if (permissions.size() <= THRESHOLD_PERMS_COUNT_INLINE) {
        // resolve inline
        subjectSettingsClause.append(columnExpression + " in (");
        // replace possible ' by space and wrap into ' and enumerate
        subjectSettingsClause.append(permissions.stream().map(p -> "'" + p.replace('\'', ' ') + "'").collect(Collectors.joining(",")));
        subjectSettingsClause.append(")");
      } else {
        // resolve via subselect
        BindingSetUserRights bsUr = BindingSetUserRights.Holder.instance;
        subjectSettingsClause.append(columnExpression + " in (SELECT " + bsUr.rightvalue + " FROM " + bsUr.table + " WHERE " + bsUr.userid + "=?" + " AND " + bsUr.righttype + "=?)");
        // Now lets create dummy "filter" elements holding the values bound to the prep-stmt by the caller
        preparedStatementParams.add(subject.getPrincipal().toString());
        preparedStatementParams.add(filterType);
      }
      subjectSettingsClause.append(")");
    }
  }

  private void resolveWithValue(List<Element> elementList, StringBuilder subjectSettingsClause, SubjectFilterType ft, String bRef, final String sessionFilterValue,
      Connective connective) throws BindingNotFoundException {
    String value = sessionFilterValue.toString();

    if (value == null || value.isEmpty()) {
      throw new RuntimeException("value must not be empty or null");
    }

    // Compliant with shiro, '*' means no restriction
    if ("*".equals(value)) {
      writeCanonicalConnective(subjectSettingsClause, connective, true);
      return;
    }

    // Otherwise extend the where clause
    if (subjectSettingsClause.length() > 0) {
      subjectSettingsClause.append(" " + connective.getSymbol() + " ");
    }

    // in case of implicit value with isIsNullAllowsAccess, we need to construct x is null or x is value 
    if (ft.isIsNullAllowsAccess()) {
      subjectSettingsClause.append("($col$ IS NULL OR ".replace("$col$", bindingSet.get(bRef).getQColumnExpression()));
    }

    Element e = wrqInfo.getOwnerDocument().createElement("SubjectSettings");
    e.setAttribute("op", ft.getOp());
    e.setAttribute("bRef", bRef);
    e.setAttribute("value", value);
    // Make sure the bRef we are working on is known, even if it did not appear elsewhere so far
    if (!wrqInfo.getAllBRefs().containsKey(bRef)) {
      wrqInfo.getAllBRefs().put(bRef, new WrqBindingItem(wrqInfo, wrqInfo.getResultingBindingSet().get(bRef), "v" + (wrqInfo.aliasCounter++), false));
    }

    subjectSettingsClause.append(WrqFilter2Sql.generateSingleColumnExpression(wrqInfo, e, elementList, wrqInfo.getOwnerDocument(), false));

    // in case of implicit value with isIsNullAllowsAccess, we have an open bracket, so close it
    if (ft.isIsNullAllowsAccess()) {
      subjectSettingsClause.append(")");
    }
  }

  /**
   * creates canonical connective expressing if general permission is granted or explicitely revoked
   * <p>
   * in case a permission is granted then OR 1=1 is written, in case not then AND 1=0 is written; neutral OR 1=0, AND 1=1 are skipped if
   * {@link #applySqlOptimization} is enabled or written otherwise, too.
   * </p>
   * 
   * @param subjectSettingsClause
   * @param connective
   * @param isPermitted
   *          - is true in case a
   */
  private void writeCanonicalConnective(StringBuilder subjectSettingsClause, Connective connective, boolean isPermitted) {
    final Connective.SYMBOL compareSymbol = isPermitted ? Connective.SYMBOL.OR : Connective.SYMBOL.AND;
    final String compareBit = "1=" + (compareSymbol == Connective.SYMBOL.OR ? "1" : "0");
    if (!applySqlOptimization || connective.getSymbol() == compareSymbol) {
      if (subjectSettingsClause.length() > 0) {
        subjectSettingsClause.append(" ").append(connective.getSymbol().name()).append(" ");
      }
      subjectSettingsClause.append(compareBit);
    }
  }

  static class BindingSetUserRights {
    static class Holder {
      static BindingSetUserRights instance = new BindingSetUserRights();
    }

    String table, userid, righttype, rightvalue;

    public BindingSetUserRights() {
      BindingSet bsUr = null;
      List<String> c = new LinkedList<String>();
      c.add("user_id");

      try {
        bsUr = Bindings.getInstance().get("bcd_sec_user_settings", c);

        table = bsUr.getTableName();
        userid = bsUr.get("user_id").getColumnExpression();
        righttype = bsUr.get("right_type").getColumnExpression();
        rightvalue = bsUr.get("right_value").getColumnExpression();
      } catch (Exception e) {
        throw new RuntimeException("Failed reading 'bcd_sec_user_settings' binding-set", e);
      }
    }
  }

}
