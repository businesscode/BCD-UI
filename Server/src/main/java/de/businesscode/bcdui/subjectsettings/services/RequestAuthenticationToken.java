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

import java.util.Map;

import de.businesscode.bcdui.logging.LoginSqlLogger;
import de.businesscode.bcdui.subjectsettings.ExternalAuthenticationToken;

/**
 * Carries the raw, not-yet-verified assertion (the shared client secret plus the asserted on-behalf
 * idType/id, and any additional project-specific attributes) - verifying the secret and resolving the
 * identity to a BCD-UI user id is {@link OnBehalfIdentityRealm}'s job (via {@code subject.login(token)}),
 */
public class RequestAuthenticationToken extends ExternalAuthenticationToken {
  private static final long serialVersionUID = 1L;

  private final String secret;
  private final String idType;
  private final String onBehalfId;
  private final Map<String, String> addInfo;

  // Shiro's multi-realm authentication (ModularRealmAuthenticator + the default
  // AtLeastOneSuccessfulStrategy) discards whatever exception a realm actually throws once the
  // aggregate AuthenticationInfo ends up empty, replacing it with a generic, uninformative one built
  // only from the token's class name - see AbstractAuthenticationStrategy#afterAttempt/afterAllAttempts.
  // OnBehalfIdentityRealm stashes the real reason here, on this same token instance, right before
  // throwing, so RequestAuthenticationFilter can still log a precise bcd_log_login result despite that.
  private LoginSqlLogger.LOGIN_RESULTS failureReason;

  public RequestAuthenticationToken(String secret, String idType, String onBehalfId, Map<String, String> addInfo) {
    this.secret = secret;
    this.idType = idType;
    this.onBehalfId = onBehalfId;
    this.addInfo = addInfo;
  }

  public String getSecret() {
    return secret;
  }

  public String getIdType() {
    return idType;
  }

  public String getOnBehalfId() {
    return onBehalfId;
  }

  public Map<String, String> getAddInfo() {
    return addInfo;
  }

  void setFailureReason(LoginSqlLogger.LOGIN_RESULTS reason) {
    this.failureReason = reason;
  }

  public LoginSqlLogger.LOGIN_RESULTS getFailureReason() {
    return failureReason;
  }
}