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

/**
 * Resolves an arbitrary identifying attribute (already established to come from a trusted client - see
 * {@link RequestAuthenticationFilter}) to a BCD-UI technical user id.
 * For example can translate phone numbers to user ids
 */
public interface UserIdResolver {

  /**
   * @return the BCD-UI technical user id, or null if no matching user was found
   */
  String resolveUserId(String idType, String idValue, Map<String, String> addInfo);
}