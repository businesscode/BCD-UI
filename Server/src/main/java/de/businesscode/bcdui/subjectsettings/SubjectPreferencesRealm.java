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
import org.apache.shiro.session.Session;
import org.apache.shiro.subject.PrincipalCollection;
import org.apache.shiro.subject.SimplePrincipalCollection;
import org.apache.shiro.subject.Subject;
import org.apache.shiro.subject.support.DefaultSubjectContext;

import de.businesscode.bcdui.subjectsettings.config.SubjectSettingsConfig.UserSettingsDefaults;
import de.businesscode.bcdui.subjectsettings.config.SubjectSettingsConfig.UserSettingsDefaults.Default;
import de.businesscode.bcdui.web.servlets.SubjectPreferences;


public class SubjectPreferencesRealm extends org.apache.shiro.realm.AuthorizingRealm {

  public static final String PERMISSION_MAP_TOKEN = "bcdPermissionMapToken";
  public static final String PERMISSION_MAP_SESSION_ATTRIBUTE = "bcdPermMap";

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

    // SubjectPreferences permission
    HashMap<String, ArrayList<String>> permissionMap = new HashMap<>(getPermissionMap());

    // add all permissions from map
    permissionMap.forEach((key, values) -> {
      for (String value : values)
        permissions.add(key + ":" + value);
    });

    SimpleAuthorizationInfo authorizationInfo = new SimpleAuthorizationInfo();
    authorizationInfo.setStringPermissions(permissions);
    return authorizationInfo;
  }

  // returns the permission map in any case
  // if it's not yet created, it is created and the permissions are refreshed as
  // an initial default-injecting process 
  public Map<String, ArrayList<String>> getPermissionMap() {
    Subject subject = SecurityUtils.getSubject();
    Session session = subject.getSession(false);
    if (session == null)
      session = subject.getSession();

    HashMap<String, ArrayList<String>> permissionMap = null;
    boolean doRefresh = false;

    /// map does not exist yet, add an empty one
    if (session.getAttribute(PERMISSION_MAP_SESSION_ATTRIBUTE) == null) {
      permissionMap = new HashMap<>();

      // defaults from (static) default values, simply loop over defaultValues from SubjectPreferences
      for (Map.Entry<String,ArrayList<String>> entry : SubjectPreferences.defaultValues.entrySet()) {
        String key = entry.getKey();
        ArrayList<String> defaults = entry.getValue();
        if (! permissionMap.containsKey(key)) {
          ArrayList<String> values = new ArrayList<>();
          for (String defaultValue : defaults) {
            values.add(defaultValue);
          }
          permissionMap.put(key, values);
          doRefresh = true;
        }
      }
    }
    else
      permissionMap = new HashMap<>((HashMap<String, ArrayList<String>>)session.getAttribute(PERMISSION_MAP_SESSION_ATTRIBUTE));

    if (doRefresh) {
      session.setAttribute(PERMISSION_MAP_SESSION_ATTRIBUTE, permissionMap);
      refreshPermissions(session);
    }
    return permissionMap;
  }

  // sets the provided map as new permission map and refreshes permissions
  public void setPermissionMap(Map<String, ArrayList<String>> permissionMap) {
    Subject subject = SecurityUtils.getSubject();
    Session session = subject.getSession(false);
    if (session == null)
      session = subject.getSession();

    session.setAttribute(PERMISSION_MAP_SESSION_ATTRIBUTE, permissionMap);
    refreshPermissions(session);
  }

  public void refreshPermissions(Session session) {

    // in case we're not yet logged in, use a guest principal, otherwise
    // doGetAuthorizationInfo won't get triggered at all
    if (session.getAttribute(DefaultSubjectContext.PRINCIPALS_SESSION_KEY) == null)
      session.setAttribute(DefaultSubjectContext.PRINCIPALS_SESSION_KEY, new SimplePrincipalCollection("bcd-guest", "bcd-guest"));          

    // clear cache and send dummy isPermitted so that doGetAuthorizationInfo is actually called
    this.clearCache(SecurityUtils.getSubject().getPrincipals());
    SecurityUtils.getSubject().isPermitted(PERMISSION_MAP_TOKEN);
  }

  @Override
  protected AuthenticationInfo doGetAuthenticationInfo(AuthenticationToken arg0) throws AuthenticationException {
    // TODO Auto-generated method stub
    return null;
  }

}