/*
  Copyright 2026-2026 BusinessCode GmbH, Germany

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
package de.businesscode.bcdui.subjectsettings.services;

import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

import de.businesscode.bcdui.subjectsettings.PrimaryPrincipal;
import org.apache.shiro.authc.AuthenticationException;
import org.apache.shiro.authc.AuthenticationInfo;
import org.apache.shiro.authc.AuthenticationToken;
import org.apache.shiro.authc.IncorrectCredentialsException;
import org.apache.shiro.authc.SimpleAuthenticationInfo;
import org.apache.shiro.authc.UnknownAccountException;
import org.apache.shiro.realm.AuthenticatingRealm;
import org.apache.shiro.subject.SimplePrincipalCollection;

import de.businesscode.bcdui.logging.LoginSqlLogger;

/**
 * Verifies a trusted backend caller's on-behalf-of identity assertion (see
 * {@link RequestAuthenticationFilter}/{@link RequestAuthenticationToken}): a shared secret establishes
 * that the caller is a trusted client at all, then the asserted idType/onBehalfId is resolved to a
 * BCD-UI technical user id.
 *
 * Currently there is only a global set of secrets - if per-client secrets are ever needed, the token/caller
 * could later carry a client id and this realm could map it to its own secret, without changing anything
 * about how it is wired up.
 *
 * Pure shiro.ini configuration, register once and add to the realm chain:
 * <pre>
 * bcdOnBehalfIdentityRealm = de.businesscode.bcdui.subjectsettings.services.OnBehalfIdentityRealm
 * bcdOnBehalfIdentityRealm.trustedClientsSecrets = ##shared-secret-1##, ##shared-secret-n##
 * # Optional, defaults to DefaultUserIdResolver:
 * # bcdOnBehalfIdentity.userIdResolverClass = com.project.MyUserIdResolver
 * securityManager.realms = ..., $bcdOnBehalfIdentityRealm
 * </pre>
 */
public class OnBehalfIdentityRealm extends AuthenticatingRealm {

  private Set<String> trustedClientsSecrets = Collections.emptySet();
  private UserIdResolver userIdResolver = new DefaultUserIdResolver();

  /** Set from shiro.ini: comma-separated shared secrets, any of which a trusted client may present. */
  public void setTrustedClientsSecrets(String trustedClientsSecrets) {
    this.trustedClientsSecrets = Arrays.stream(trustedClientsSecrets.split(","))
        .map(String::trim)
        .filter(s -> !s.isEmpty())
        .collect(Collectors.toCollection(LinkedHashSet::new));
  }

  /** Set from shiro.ini: overwrite if the default BindingItem-based lookup of DefaultUserIdResolver
   * does not fit the project.
   */
  public void setUserIdResolverClass(String className) {
    try {
      userIdResolver = (UserIdResolver) Class.forName(className).getDeclaredConstructor().newInstance();
    } catch (ReflectiveOperationException e) {
      throw new IllegalArgumentException("Could not instantiate userIdResolverClass '" + className + "'", e);
    }
  }

  @Override
  public boolean supports(AuthenticationToken token) {
    return token instanceof RequestAuthenticationToken;
  }

  /**
   * Verification already happened in doGetAuthenticationInfo below - there is nothing left for Shiro's
   * generic CredentialsMatcher to meaningfully compare here (same pattern as JdbcRealm uses for other
   * externally-verified tokens).
   */
  @Override
  protected void assertCredentialsMatch(AuthenticationToken token, AuthenticationInfo info) throws AuthenticationException {
    // no-op
  }

  /**
   * Take the AuthenticationToken and turns it into an actual Principial if the AuthenticationToken is valid.
   * It is valid, if the client knows one of our trustedClientsSecrets and userIdResolver can find a userId
   * @param authToken the authentication token containing the user's principal and credentials.
   * @return
   * @throws AuthenticationException
   */
  @Override
  protected AuthenticationInfo doGetAuthenticationInfo(AuthenticationToken authToken) throws AuthenticationException {
    RequestAuthenticationToken token = (RequestAuthenticationToken) authToken;

    if (!trustedClientsSecrets.contains(token.getSecret())) {
      token.setFailureReason(LoginSqlLogger.LOGIN_RESULTS.CREDS_WRONG);
      throw new IncorrectCredentialsException("Untrusted client secret");
    }

    String userId = userIdResolver.resolveUserId(token.getIdType(), token.getOnBehalfId(), token.getAddInfo());
    if (userId == null) {
      token.setFailureReason(LoginSqlLogger.LOGIN_RESULTS.ACC_UNKNOWN);
      throw new UnknownAccountException("No user found for idType '" + token.getIdType() + "', onBehalfId '" + token.getOnBehalfId() + "'");
    }

    SimplePrincipalCollection pc = new SimplePrincipalCollection();
    pc.add(new PrimaryPrincipal(userId), getName());
    return new SimpleAuthenticationInfo(pc, null);
  }
}