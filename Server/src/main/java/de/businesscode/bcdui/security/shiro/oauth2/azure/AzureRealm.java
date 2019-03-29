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
package de.businesscode.bcdui.security.shiro.oauth2.azure;

import de.businesscode.bcdui.security.shiro.oauth2.OAuthRealm;

/**
 * Apply Azure configuration
 */
public class AzureRealm extends OAuthRealm {
  @Override
  public String getPrincipalPropertyName() {
    final String configured = super.getPrincipalPropertyName();
    return configured == null ? "userPrincipalName" : configured;
  }

  @Override
  public String getApiEndpoint() {
    final String configured = super.getApiEndpoint();
    return configured == null ? "https://graph.microsoft.com/v1.0/me/" : configured;
  }
}
