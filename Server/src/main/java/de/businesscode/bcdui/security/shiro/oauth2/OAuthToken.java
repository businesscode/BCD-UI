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
package de.businesscode.bcdui.security.shiro.oauth2;

import org.apache.shiro.authc.AuthenticationToken;

/**
 * OAuth authentication token which is supported by {@link OAuthRealm} instances. This token carries information about authorization code which is required by a
 * realm to create access tokens to query the resource server.
 */
public class OAuthToken implements AuthenticationToken {
  private static final long serialVersionUID = 1L;

  private final String authCode;
  private final String clientId;
  private final String redirectUrl;
  private Object principal;
  private final OAuthAuthenticatingFilter authenticator;

  public String getClientId() {
    return clientId;
  }

  public String getRedirectUrl() {
    return redirectUrl;
  }

  /**
   * 
   * @param authenticator
   * @return true if this token has been created by given authenticator instance
   */
  public boolean isCreatedBy(OAuthAuthenticatingFilter authenticator) {
    return this.authenticator == authenticator;
  }

  public OAuthToken(OAuthAuthenticatingFilter authenticator, String clientId, String redirectUrl, String authCode) {
    this.authenticator = authenticator;
    this.clientId = clientId;
    this.authCode = authCode;
    this.redirectUrl = redirectUrl;
  }

  public String getAuthCode() {
    return authCode;
  }

  public void setPrincipal(Object principal) {
    this.principal = principal;
  }

  @Override
  public Object getCredentials() {
    return getAuthCode();
  }

  @Override
  public Object getPrincipal() {
    return principal;
  }

  @Override
  public String toString() {
    return String.format("[AuthToken: principal '%s', clientId: '%s', authCode '%s', redirectUrl: '%s']", principal, clientId, authCode, redirectUrl);
  }

}
