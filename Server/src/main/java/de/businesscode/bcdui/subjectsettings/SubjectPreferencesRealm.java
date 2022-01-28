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
package de.businesscode.bcdui.subjectsettings;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authc.AuthenticationException;
import org.apache.shiro.authc.AuthenticationInfo;
import org.apache.shiro.authc.AuthenticationToken;
import org.apache.shiro.authz.AuthorizationInfo;
import org.apache.shiro.authz.SimpleAuthorizationInfo;
import org.apache.shiro.subject.PrincipalCollection;

import de.businesscode.bcdui.subjectsettings.config.SubjectSettingsConfig.UserSettingsDefaults;
import de.businesscode.bcdui.subjectsettings.config.SubjectSettingsConfig.UserSettingsDefaults.Default;
import de.businesscode.bcdui.web.servlets.SubjectPreferences;


public class SubjectPreferencesRealm extends org.apache.shiro.realm.AuthorizingRealm {

  @Override
  protected AuthorizationInfo doGetAuthorizationInfo(PrincipalCollection arg0) {

    SubjectSettings subjectSettings = SubjectSettings.getInstance();
    Set<String> permissions = new HashSet<>();

    // add all subjectSettings UserSettingsDefaults permissions
    UserSettingsDefaults userDefaults = subjectSettings.getUserSettingsDefaults();
    if (userDefaults != null) {
      List<Default> defaults = userDefaults.getDefault();
      if (defaults != null) {
        for (Default def : defaults) {
          String type = def.getType();
          String value = def.getValue();
          if (type != null && ! type.isBlank()) {
            permissions.add(type + ":" + value);
          }
        }
      }
    }

    // userSelectedSubjectSettings permission
    HashMap<String, ArrayList<String>> permissionMap = (HashMap<String, ArrayList<String>>)getPermissionMap();

    // no entries yet, set default values
    if (permissionMap.isEmpty()) {

      // we add one dummy permission so that a re-entry (e.g. via SecurityHelper.getPermissions) is ignored
      ArrayList<String> dummy = new ArrayList<>();
      dummy.add("bcdDummy");
      permissionMap.put("bcdDummy", dummy);

      // defaults from (static) default values, simply loop over defaultValues from UserSelectedSubjectSettings
      SubjectPreferences.defaultValues.forEach((key, value) -> {
        ArrayList<String> values = new ArrayList<>();
        values.add(value);
        permissionMap.put(key, values);
      });

      // defaults from user permissions, get permissions for value, sort, take first as default
      SubjectPreferences.valueSources.forEach((key, value) -> {
        List<String> sortedPerm = new ArrayList<>(SecurityHelper.getPermissions(SecurityUtils.getSubject(), value));
        sortedPerm.sort(String::compareToIgnoreCase);
        if (! sortedPerm.isEmpty()) {
          ArrayList<String> values = new ArrayList<>();
          values.add(sortedPerm.get(0));
          permissionMap.put(key, values);
        }
      });
    }

    // add all permissions from map
    permissionMap.forEach((key, values) -> {
      for (String value : values)
        permissions.add(key + ":" + value);
    });

    SimpleAuthorizationInfo authorizationInfo = new SimpleAuthorizationInfo();
    authorizationInfo.setStringPermissions(permissions);
    return authorizationInfo;
  }

  public Map<String, ArrayList<String>> getPermissionMap() {
    HashMap<String, ArrayList<String>> permissionMap = (HashMap<String, ArrayList<String>>)SecurityUtils.getSubject().getSession().getAttribute("bcdPermMap");
    /// map does not exist yet, add an empty one
    if (permissionMap == null) {
      permissionMap = new HashMap<>();
      SecurityUtils.getSubject().getSession().setAttribute("bcdPermMap", permissionMap);
    }
    return permissionMap;
  }

  public void activatePermissions(PrincipalCollection principals, Map<String, ArrayList<String>> permissionMap) {
    SecurityUtils.getSubject().getSession().setAttribute("bcdPermMap", permissionMap);

    // clear cache and send dummy isPermitted so that doGetAuthorizationInfo is actually called
    this.clearCache(principals);
    SecurityUtils.getSubject().isPermitted("bcdDummy:bcdDummy");
  }

  @Override
  protected AuthenticationInfo doGetAuthenticationInfo(AuthenticationToken arg0) throws AuthenticationException {
    // TODO Auto-generated method stub
    return null;
  }

}