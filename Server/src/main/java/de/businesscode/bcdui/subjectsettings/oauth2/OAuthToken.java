/*
  Copyright 2010-2025 BusinessCode GmbH, Germany

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
package de.businesscode.bcdui.subjectsettings.oauth2;

import org.apache.commons.lang.StringUtils;

import de.businesscode.bcdui.subjectsettings.ExternalAuthenticationToken;

/**
 * OAuth authentication token which is supported by {@link OAuthRealm} instances. This token carries information about authorization code which is required by a
 * realm to create access tokens to query the resource server.
 * If you want to do authorization with JdbcRealm, enable the following in web.xml:
 *    authcStrategy = org.apache.shiro.authc.pam.AtLeastOneSuccessfulStrategy
 *    securityManager.authenticator.authenticationStrategy = $authcStrategy
 *    securityManager.realms = $oauthcMyRealm, $realmBcdJdbc
 */
public class OAuthToken extends ExternalAuthenticationToken {
  private static final long serialVersionUID = 1L;

  // Code we received from authorize and send to token endpoint
  protected final String authCode;
  // To support PKCE flow
  protected final String codeVerifier;
  // This is how the auth server identifies us
  protected final String clientId;
  // Where to send the client after successful login
  protected final String redirectUri;
  // If we have multiple oAuth servers like MS and Google, we know from this which one should handle us
  protected final String authenticatorInstanceId;
  // To void replay attacks, this is sent in auth call and tested in token answer
  protected final String nonce;

  public String getClientId() {
    return clientId;
  }

  /**
   *
   * @param authenticator
   * @return true if this token has been created by given authenticator instance
   */
  public boolean isCreatedBy(OAuthAuthenticatingFilter authenticator) {
    return StringUtils.equals(this.authenticatorInstanceId, authenticator.getProviderInstanceId());
  }

  public OAuthToken(OAuthAuthenticatingFilter authenticator, String clientId, String redirectUri, String authCode, String codeVerifier, String nonce) {
    this.authenticatorInstanceId = authenticator.getProviderInstanceId();
    this.clientId = clientId;
    this.authCode = authCode;
    this.redirectUri = redirectUri;
    this.codeVerifier = codeVerifier;
    this.nonce = nonce;
  }

  public String getRedirectUri() {
    return redirectUri;
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
  
  public String getNonce() {
    return nonce;
  }

  @Override
  public String toString() {
    return String.format("[AuthToken: principal '%s', clientId: '%s', authCode '%s', redirectUri: '%s', codeVerifier '%s']", principal, clientId, authCode, redirectUri, codeVerifier);
  }

}
