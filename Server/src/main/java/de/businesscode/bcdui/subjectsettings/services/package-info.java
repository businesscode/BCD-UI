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

/**
 * Authenticates a trusted backend caller acting on behalf of a BCD-UI user for a single request, with no
 * browser session involved (e.g. a bot acting for a user, or an AI agent's MCP endpoint).
 * <p>
 * The two concerns are deliberately kept orthogonal:
 * <ul>
 *   <li>{@link de.businesscode.bcdui.subjectsettings.services.RequestSession} scopes the login limited
 *       to just the current request.</li>
 *   <li>{@link de.businesscode.bcdui.subjectsettings.services.OnBehalfIdentityRealm} decides who the
 *       caller may act as - a shared secret establishes client trust, then the asserted on-behalf
 *       identity is resolved to a BCD-UI user id.</li>
 * </ul>
 * <p>
 * The pieces:
 * <ul>
 *   <li>{@link de.businesscode.bcdui.subjectsettings.services.RequestAuthenticationFilter} - reads the
 *       request headers (client secret, asserted on-behalf idType/id) and reports the outcome as an HTTP
 *       status; Delegates the verification to the Realm.</li>
 *   <li>{@link de.businesscode.bcdui.subjectsettings.services.RequestAuthenticationToken} - the raw,
 *       not-yet-verified assertion built from those headers, passed to {@code subject.login(token)}.</li>
 *   <li>{@link de.businesscode.bcdui.subjectsettings.services.OnBehalfIdentityRealm} - the Shiro Realm
 *       that verifies the shared secret and resolves the asserted identity to a BCD-UI user id.</li>
 *   <li>{@link de.businesscode.bcdui.subjectsettings.services.UserIdResolver} and
 *       {@link de.businesscode.bcdui.subjectsettings.services.DefaultUserIdResolver} - pluggable
 *       resolution of the asserted identifying attribute to a technical user id.</li>
 *   <li>{@link de.businesscode.bcdui.subjectsettings.services.RequestSession} - binds the resulting
 *       Subject to the current thread and, on close(), destroys any session created along the way.</li>
 * </ul>
 * See {@link de.businesscode.bcdui.subjectsettings.services.RequestAuthenticationFilter}'s class javadoc
 * for the shiro.ini configuration.
 */
package de.businesscode.bcdui.subjectsettings.services;