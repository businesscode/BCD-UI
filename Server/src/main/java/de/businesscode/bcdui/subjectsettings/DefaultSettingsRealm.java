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
package de.businesscode.bcdui.subjectsettings;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.apache.shiro.authc.AuthenticationException;
import org.apache.shiro.authc.AuthenticationInfo;
import org.apache.shiro.authc.AuthenticationToken;
import org.apache.shiro.authz.AuthorizationInfo;
import org.apache.shiro.authz.SimpleAuthorizationInfo;
import org.apache.shiro.subject.PrincipalCollection;

import de.businesscode.bcdui.subjectsettings.config.SubjectSettingsConfig.UserSettingsDefaults;
import de.businesscode.bcdui.subjectsettings.config.SubjectSettingsConfig.UserSettingsDefaults.Default;


public class DefaultSettingsRealm extends org.apache.shiro.realm.AuthorizingRealm {

  @Override
  protected AuthorizationInfo doGetAuthorizationInfo(PrincipalCollection arg0) {

    SubjectSettings subjectSettings = SubjectSettings.getInstance();
    Set<String> permissions=new HashSet<>();

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
    SimpleAuthorizationInfo authorizationInfo = new SimpleAuthorizationInfo();
    authorizationInfo.setStringPermissions(permissions);

    return authorizationInfo;
  }

  @Override
  protected AuthenticationInfo doGetAuthenticationInfo(AuthenticationToken arg0) throws AuthenticationException {
    // TODO Auto-generated method stub
    return null;
  }

}