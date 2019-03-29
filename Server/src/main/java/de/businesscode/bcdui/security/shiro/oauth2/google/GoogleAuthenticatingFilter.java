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
package de.businesscode.bcdui.security.shiro.oauth2.google;

import de.businesscode.bcdui.security.shiro.oauth2.OAuthAuthenticatingFilter;

/**
 * Google implementation to allow to {@link GoogleRealm} read the userPrincipalName
 */
public class GoogleAuthenticatingFilter extends OAuthAuthenticatingFilter {
  /**
   * if scope is not preconfigured then use the default one as expected by {@link GoogleRealm}
   */
  @Override
  public String getAuthScope() {
    final String configuredScope = super.getAuthScope();
    return configuredScope != null ? configuredScope : "email";
  }
}
