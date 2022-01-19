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
package org.apache.shiro.realm;

import org.apache.shiro.subject.PrincipalCollection;

/**
 * Helper in Shiro's package to access protected parts of Shiro's API
 */
public class BcdShiroHelper {
  
  /**
   * Allow to retrieve the permissions from a Shiro principal for a Realm
   * We want to get all permissions for example for in - clauses in SQL but Shiro API thinks in terms of
   * 'am I allowed to do this' and we want 'what are the things I am allowed'
   * Shiro's AuthorizingRealm.getAuthorizationInfo() is therefore protected and we have this class in the same package
   * to still cleanly call it
   */
  public static Object getAuthorizationInfo(AuthorizingRealm realm, PrincipalCollection pc) {
    return realm.getAuthorizationInfo(pc);
  }
}
