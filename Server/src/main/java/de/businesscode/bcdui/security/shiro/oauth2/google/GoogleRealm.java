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

import org.apache.commons.lang.StringUtils;

import de.businesscode.bcdui.security.shiro.oauth2.OAuthRealm;

/**
 * Apply Google userinfo API configuration
 */
public class GoogleRealm extends OAuthRealm {
  @Override
  public String getPrincipalPropertyName() {
    final String configured = super.getPrincipalPropertyName();
    return configured == null ? "email" : configured;
  }

  @Override
  public String getApiEndpoint() {
    final String configured = super.getApiEndpoint();
    return configured == null ? "https://www.googleapis.com/oauth2/v3/userinfo" : configured;
  }

  @Override
  public String getTokenEndpoint() {
    return StringUtils.defaultString(super.getApiEndpoint(), "https://www.googleapis.com/oauth2/v4/token");
  }
}
