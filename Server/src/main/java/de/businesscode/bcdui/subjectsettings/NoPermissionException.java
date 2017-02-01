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
package de.businesscode.bcdui.subjectsettings;

import de.businesscode.bcdui.subjectsettings.config.Security;

/**
 * exception related with {@link Security} context and thrown if a permission is missing for context execution
 *
 */
public class NoPermissionException extends SecurityException {
  private Security security;
  private String operationAttempt;
  private String missingPermission;
  /**
   *
   * @param security applied
   * @param operationAttempt being checked for permission
   * @param missingPermission which leads to this exception, space separated
   */
  public NoPermissionException(Security security, String operationAttempt, String missingPermission) {
    super((String)null);
    this.security = security;
    this.operationAttempt = operationAttempt;
    this.missingPermission = missingPermission;
  }
  @Override
  public String getMessage() {
    return "Missing permission: " + this.missingPermission + " in operation " + this.operationAttempt;
  }
}
