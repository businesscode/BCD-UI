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
package de.businesscode.bcdui.binding.exc;

import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.subjectsettings.SecurityException;

/**
 * this exception is thrown whenever operations related to binding security fails check due to missing
 * security configuration.
 *
 */
public class SecurityMissingForBindingException extends SecurityException {

  /**
   *
   * @param bs
   * @param operationAttempt
   */
  public SecurityMissingForBindingException(BindingSet bs, String operationAttempt) {
    super("Operation '" + operationAttempt + "' requires Security definition which was not defined. Please define Security for this operation for bindingset '"+bs.getName()+"'");
  }
}