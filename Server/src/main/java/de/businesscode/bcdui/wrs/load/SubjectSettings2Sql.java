/*
  Copyright 2010-2023 BusinessCode GmbH, Germany

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

import java.util.Arrays;
import java.util.LinkedList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.apache.commons.lang.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.subject.Subject;
import org.w3c.dom.Element;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.binding.exc.BindingNotFoundException;
import de.businesscode.bcdui.binding.subjectFilter.Connective;
import de.businesscode.bcdui.binding.subjectFilter.Connective.SYMBOL;
import de.businesscode.bcdui.binding.subjectFilter.SubjectFilter;
import de.businesscode.bcdui.binding.subjectFilter.SubjectFilterNode;
import de.businesscode.bcdui.binding.write.CustomJdbcTypeSupport;
import de.businesscode.bcdui.subjectsettings.SecurityHelper;
import de.businesscode.bcdui.subjectsettings.SubjectSettings;
import de.businesscode.bcdui.subjectsettings.config.SubjectFilterType;
import de.businesscode.bcdui.web.servlets.SubjectPreferences;

/**
 * Returns a where clause based on the SubjectFilters of the BindingSet and the current Subject's permissions Initially taken from WrsSqlGenerator. For change
 * history see there
 * We are instantiated per SQL generation for a SubjectFilters
 */
public class SubjectSettings2Sql implements SqlConditionGenerator {
  /**
   * number of permissions to be resolved inline rather that via subselect from user-rights-table
   */
  private static final int THRESHOLD_PERMS_COUNT_INLINE = 20;
  private final BindingSet bindingSet;
  private final WrqInfo wrqInfo;
  private final String wrqAlias;
  private final String sqlAlias;
  private final List<Element> boundVariables;
  private Logger logger = LogManager.getLogger(getClass());
  // TODO: add dependency on isDebug? or introduce custom new flag
  private boolean applySqlOptimization = true;

  public SubjectSettings2Sql(BindingSet bindingSet, WrqInfo wrqInfo, List<Element> boundVariables, String wrqAlias, String sqlAlias) throws BindingNotFoundException {
    this.bindingSet = bindingSet;
    this.wrqInfo = wrqInfo;
    this.boundVariables = boundVariables;
    this.wrqAlias = wrqAlias;
    this.sqlAlias = sqlAlias;
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

  /**
   * helper to create SubjectSettings element carrying value attribute from plain values which are used for prepared statement parameterization
   * @param bRef            - used for jdbc type determination
   * @param psValues        - list of allowed values
   * @param boundVariables  - virtual parameters
   */
  private void writeParams(String bRef, List<String> psValues, List<Element> boundVariables) {
    psValues.forEach(p -> {
      Element e = wrqInfo.getOwnerDocument().createElement("SubjectSettings");
      e.setAttribute("value", p);
      e.setAttribute("bRef", bRef);
      boundVariables.add(e);
    });
  }

  private boolean build(StringBuilder connectiveSb, Connective connective, List<Element> boundVariables, SubjectSettings settings, Subject subject,
      StringBuilder loggingSb, int level) throws BindingException {
    String padding = loggingSb != null ? StringUtils.leftPad("", level * 4) : null;

    final List<Element> nestedBoundVariables = new LinkedList<>();

    StringBuilder innerSb = new StringBuilder();

    if (loggingSb != null)
      loggingSb.append(padding).append("build [ ").append(connective.getSymbol()).append("\n");

    for (SubjectFilterNode sfNode : connective.getElements()) {
      if (sfNode instanceof SubjectFilter) { // SubjectFilter
        if (loggingSb != null)
          loggingSb.append(padding).append("| resolve filter: ").append(((SubjectFilter) sfNode).getType()).append("\n");
        if (!resolveSubjectFilter(nestedBoundVariables, settings, subject, innerSb, (SubjectFilter) sfNode, connective)) {
          // in case one filter failed to resolve due to not available permissions, we stop
          return false;
        }
      } else { // Connective (recursion)
        if (loggingSb != null)
          loggingSb.append(padding).append("| resolve Connective").append("\n");
        // use new builder for scoping so undelying logic detects when to omit leading AND/OR symbols also
        // the scope might be empty i.e. due to * permit
        StringBuilder scopeSb = new StringBuilder();
        if (!build(scopeSb, (Connective) sfNode, nestedBoundVariables, settings, subject, loggingSb, level + 1)) {
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
      } else {
        throw new RuntimeException("unsupported symbol here: " + connective.getSymbol());
      }
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
        boundVariables.addAll(nestedBoundVariables);
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
   * @param boundVariables
   * @param settings
   * @param subject
   * @param sqlClause
   * @param sf
   * @param connective
   * @return false in case user has no access to the binding-set at all, true otherwise
   * @throws BindingException
   */
  private boolean resolveSubjectFilter(List<Element> boundVariables, SubjectSettings settings, Subject subject, final StringBuilder sqlClause, SubjectFilter sf,
      Connective connective) throws BindingException {
    SubjectFilterType ft = settings.getSubjectFilterTypeByName(sf.getType());
    String bRef = ft.getBindingItems().getC().getBRef();

    // in case of a (W)rite-only-check filter type, we can skip resolving
    if ("W".equalsIgnoreCase(ft.getMode()))
      return true;

    if (SubjectSettings.rightsInDbAvailable()) {
      resolveByUserRightsTable(boundVariables, sqlClause, subject, ft, bRef, connective, settings.getFilterType(ft));
      return true;
    } else {
      // Otherwise the user has no rights at all
      return false;
    }
  }

  private void resolveByUserRightsTable(List<Element> boundVariables, StringBuilder subjectSettingsClause, Subject subject, SubjectFilterType ft, String bRef, Connective connective, String filterType) throws BindingException {
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
    generateCondition(subjectSettingsClause, subject, ft, boundVariables, filterType, permissions, bindingSet.get(bRef));
  }

  /**
   * generates single condition like "col in ('a','b','c')"
   *
   * @param subjectSettingsClause - to generate condition into
   * @param subject - current subject
   * @param ft - filter type to generate condition from
   * @param boundVariables
   * @param filterType - filter type name
   * @param permissions - permissions granted by subject
   * @param bi - the BindinItem on which the permission is to apply
   */
  protected void generateCondition(StringBuilder subjectSettingsClause, Subject subject, SubjectFilterType ft, List<Element> boundVariables, String filterType,
      Set<String> permissions, BindingItem bi)
  {
    String columnExpression = bi.getQColumnExpression(sqlAlias);
    if(permissions.isEmpty() && ft.isIsNullAllowsAccess()) {
      // no permission, yet select null-values
      subjectSettingsClause.append(columnExpression).append(" IS NULL");
    }else {
      if(ft.isIsNullAllowsAccess()) {
        columnExpression = "$col$ IS NULL OR $col$".replace("$col$", columnExpression);
      }
      subjectSettingsClause.append("(");

      // If only few distinct values are allowed, we do not join with bcd_sec_subjectsettings but set values directly in a prepared statement
      // for subjectPreferences (which never come from the DB), we also use in/or
      if (permissions.size() <= THRESHOLD_PERMS_COUNT_INLINE || SubjectPreferences.isAllowedAttribute(ft.getName())) {

        // One expression for all values for "IN" and a single "="
        if( ft.getOp().contains("in")
            || ( (ft.getOp()==null || ft.getOp().equals("=")) && permissions.size()>1) ) {
          subjectSettingsClause.append(columnExpression).append(" in (").append( permissions.stream().map(p2 -> CustomJdbcTypeSupport.wrapTypeCast(bi, "?")).collect(Collectors.joining(",")) ).append(")");
        }
        // List of OR-ed expressions
        else {
          String sqlOp = ft.getOp()==null ? "=" : WrqFilter2Sql.getOperatorMapping(ft.getOp());
          for( int pIdx=0; pIdx<permissions.size(); pIdx++) {
            if( pIdx > 0 ) subjectSettingsClause.append(" OR ");
            subjectSettingsClause.append(columnExpression).append(" ").append(sqlOp).append(CustomJdbcTypeSupport.wrapTypeCast(bi, "?"));
          }
        }

        // Append the parameters. Per convention in BCD-UI LIKE: operator * means SQL %
        List<String> perms = ft.getOp().equals("like") ?
            permissions.stream().map(p1 -> p1.replace('*', '%')).collect(Collectors.toList()) : permissions.stream().collect(Collectors.toList());
        writeParams(bi.getId(), perms, boundVariables);
      }

      // Resolve via subselect if we have many permission values
      else {
        BindingSetUserRights bsUr = BindingSetUserRights.Holder.instance;
        subjectSettingsClause.append("CAST((" + columnExpression + ") AS VARCHAR(128)) in (SELECT " + bsUr.rightValue.getColumnExpression() + " FROM " + bsUr.table + " WHERE " + bsUr.userid.getColumnExpression() + "=" + CustomJdbcTypeSupport.wrapTypeCast(bsUr.userid, "?") + " AND " + bsUr.rightType.getColumnExpression() + "=?)");
        // Now lets create dummy "filter" elements holding the values bound to the prep-stmt by the caller, bcd_sec_usersettings userid and righttype should be VARCHAR
        writeParams("bcdVirtBindingItemWithType.VARCHAR", Arrays.asList(subject.getPrincipal().toString(), filterType), boundVariables);
      }
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

  private static class BindingSetUserRights {
    private static class Holder {
      static BindingSetUserRights instance = new BindingSetUserRights();
    }

    String table;
    BindingItem userid, rightType, rightValue;

    public BindingSetUserRights() {
      BindingSet bsUr = null;
      List<String> c = new LinkedList<>();
      c.add("user_id");

      try {
        bsUr = Bindings.getInstance().get("bcd_sec_user_settings", c);

        table = bsUr.getTableReference();
        userid = bsUr.get("user_id");
        rightType = bsUr.get("right_type");
        rightValue = bsUr.get("right_value");
      } catch (Exception e) {
        throw new RuntimeException("Failed reading 'bcd_sec_user_settings' binding-set", e);
      }
    }
  }

}
