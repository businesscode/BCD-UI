/*
  Copyright 2010-2022 BusinessCode GmbH, Germany

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
package de.businesscode.bcdui.binding.write;

import java.util.Collection;
import java.util.LinkedList;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import de.businesscode.bcdui.binding.subjectFilter.Connective;
import de.businesscode.bcdui.binding.subjectFilter.SubjectFilter;
import de.businesscode.bcdui.binding.subjectFilter.SubjectFilterNode;
import de.businesscode.bcdui.subjectsettings.SecurityException;
import de.businesscode.bcdui.subjectsettings.SecurityHelper;
import de.businesscode.bcdui.subjectsettings.SubjectSettings;
import de.businesscode.bcdui.subjectsettings.config.SubjectFilterType;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.subject.Subject;

import de.businesscode.bcdui.binding.BindingItem;

/**
 * Enforce SubjectFilters on write
 * This callback is registered if SubjectFilters are declared for a BindingSet
 * It applies its ruled for writing
 * It does currently not support nested filter expressions (only flat AND or OR) and only '=' for comparison
 */
public class SubjectFilterOnWriteCallback extends WriteProcessingCallback {

  protected List<EnforcedBi> enforcedBis = new LinkedList<>();
  protected Subject subject = SecurityUtils.getSubject();
  protected List<BindingItem> columns;
  protected boolean conIsAnd;

  /**
   * Evaluate the SubjectFilter defined and translate it into the enforced BindingItems
   * @param con
   */
  public SubjectFilterOnWriteCallback(Connective con ) {

    conIsAnd = con.getSymbol().equals(Connective.SYMBOL.AND);

    for(SubjectFilterNode sfn: con.getElements() ) {
      // We do not support nested structure yet, other than trivial AND
      if( sfn instanceof Connective )
        throw new SecurityException("Invalid setup for BindingSet " + bindingSet.getName() + ": No nested expressions of SubjectFilters allowed for writing");

      SubjectFilter sf = (SubjectFilter)sfn;
      SubjectFilterType sft = SubjectSettings.getInstance().getSubjectFilterTypeByName( sf.getType() );
      if( ! sft.getOp().equals("=") && ! sft.getOp().equals("like") )
        throw new SecurityException("Invalid setup for BindingSet " + bindingSet.getName() + ": Only '=' and 'like' allowed for SubjectSettings");

      // apply write subject settings checks when subject filter type mode isn't (R)ead-only
      if (! "R".equalsIgnoreCase(sft.getMode()))
        enforcedBis.add( new EnforcedBi( sft.getBindingItems().getC().getBRef(), sft.getName() ) );
    }
  }

  /**
   * Make sure the Wrq contains all enforcedBis 
   * @throws Exception 
   */
  @Override
  public void endHeader(List<BindingItem> columns, List<Integer> columnTypes, Collection<String> keyColumnNames) throws Exception {

    this.columns = columns;

    // Let's see whether we find the enforcedBis in the wrq and where
    for( EnforcedBi eBi: enforcedBis ) {
      int idx = indexOf(columns, eBi.biId);
      // If missing, add it
      if( idx == -1 ) {
        if( bindingSet.hasItem(eBi.biId) ) {
          BindingItem bi = bindingSet.get(eBi.biId);
          columns.add(bi);
          columnTypes.add(bi.getJDBCDataType());
          if( bi.isKey() )
            keyColumnNames.add(eBi.biId);
        }
        // If the BindingSet doesn't have it, we have a wrong setup. Enforced BindingItems need to be there
        else
          throw new SecurityException("Invalid setup for BindingSet " + bindingSet.getName() + " missing enforced " + eBi);
      }

      // Get permissions
      eBi.permissions = SecurityHelper.getPermissions(subject, eBi.permissionType);
    }
  }


  /**
   * Each row must have an allowed value for each enforcedBis set
   */
  @Override
  public void endDataRow(ROW_TYPE rowType, List<String> cValues, List<String> oValues) throws Exception {

    // Make sure we have room for all added values
    while( columns.size() > cValues.size() ) {
      cValues.add(null);
      oValues.add(null);
    }

    boolean foundMatch = false;
    boolean foundMissMatch = false;

    // Make sure each value of enforcedBis is allowed
    for( EnforcedBi eBi: enforcedBis ) {

      String value = cValues.get(eBi.getIdx());

      // We have no value, set it
      SubjectFilterType st = SubjectSettings.getInstance().getSubjectFilterTypeByName(eBi.permissionType);
      if ((value == null || value.isEmpty()) && (st != null && ! st.isIsNullAllowsAccess())) {
        if( eBi.permissions.size() == 1 && ! eBi.permissions.contains("*") ) {
          cValues.set(eBi.getIdx(), eBi.permissions.iterator().next() );
          foundMatch = true; // we have a match, because we just set a value to an allowed value
        }
        else
          throw new SecurityException("Ambiguous value for enforced " + eBi.biId );
      }
      // we have no value but we allow it since the SubjectFilterType got IsNullAllowsAccess
      else if ((value == null || value.isEmpty()) && (st != null && st.isIsNullAllowsAccess())) {
        foundMatch = true;
      }
      // check if we match permissions by "like"  
      else if (st != null && st.getOp().equals("like")) {
        boolean likeMatch = false;
        for (String perm : eBi.permissions) {
          Pattern pattern = Pattern.compile(perm.replace("*", ".+"), Pattern.CASE_INSENSITIVE);
          Matcher matcher = pattern.matcher(value);
          likeMatch |= matcher.find();
          if (likeMatch)
            break;
        }
        if (! likeMatch && ! eBi.permissions.contains("*"))
          foundMissMatch = true;
        else
          foundMatch = true;
      }
      // default check if value is permitted
      else if( ! eBi.permissions.contains(value) && ! eBi.permissions.contains("*"))
        foundMissMatch = true;
      else
        foundMatch = true;

      if (foundMissMatch && conIsAnd)
        break;
    }

    // We need either at least one match (in case of OR) or all must match
    if( !enforcedBis.isEmpty() && (! foundMatch || (conIsAnd && foundMissMatch)) )
      throw new SecurityException("Invalid values for enforced bindingItems");
  }
  
  /**
   * Information about as single enforced BindingItem
   */
  class EnforcedBi {
    EnforcedBi(String biId, String permissionType) {
      this.biId = biId;
      this.permissionType = permissionType;
    }

    String biId;
    String permissionType;
    Set<String> permissions;
    int getIdx() {
      return indexOf(columns, biId);
    }
    
  }
}
