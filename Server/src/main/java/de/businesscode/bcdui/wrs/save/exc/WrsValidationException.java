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
package de.businesscode.bcdui.wrs.save.exc;

import de.businesscode.bcdui.wrs.save.DataSaver;
import de.businesscode.bcdui.wrs.validation.WrsValidationResult;
import de.businesscode.util.SOAPFaultMessage;

/**
 * validation exception that may be thrown by {@link DataSaver} or another class of WRS components
 * during web row set validation. This exception has a special handling in {@link SOAPFaultMessage}
 * which serializes the contained {@link WrsValidationResult} into a soap fault envelope so it can
 * be handled on the client
 *
 */
public class WrsValidationException extends Exception {
  private static final long serialVersionUID = 1L;
  private final WrsValidationResult validationResult;
  public WrsValidationException(WrsValidationResult result) {
    super("WebRowSet Validation Exception");
    this.validationResult = result;
  }

  public WrsValidationResult getValidationResult() {
    return validationResult;
  }
}
