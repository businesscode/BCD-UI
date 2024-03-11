/*
  Copyright 2010-2024 BusinessCode GmbH, Germany

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

import java.security.Principal;

import jakarta.servlet.http.HttpServletRequest;

import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;

/**
 * utility class abstracting principal information from de.businesscode.bcdui.security.SpnegoValve
 */
public class SpnegoUtil {
  /**
   * MUST match de.businesscode.bcdui.security.SpnegoValve.AUTH_TYPE
   */
  private static final String AUTH_TYPE = "de.businesscode.bcdui.security.SpnegoValve/1.0";
  /**
   * MUST match de.businesscode.bcdui.security.SpnegoValve.TAINTED_PRINCIPAL_NAME
   */
  private static final String TAINTED_PRINCIPAL_NAME = "[\u26C4BCD-TAINTED-PRINCIPAL\u26C4]";

  private static Logger logger = LogManager.getLogger(SpnegoUtil.class);

  /**
   * retrieve principal's name, if available and if authenticated by BCD SPNEGO
   * 
   * @param request
   * @return the name of principial, if successfully authenticated via SPNEGO, null otherwise
   */
  public static String getPrincipalName(HttpServletRequest request) {
    Principal princ = request.getUserPrincipal();
    if (princ == null) {
      logger.trace("No Principal registered");
      return null;
    } else if (!AUTH_TYPE.equals(request.getAuthType())) {
      logger.trace("Not processed by BCD SPNEGO Authentication Valve, but " + request.getAuthType());
      return null;
    } else if (TAINTED_PRINCIPAL_NAME.equals(princ.getName())) {
      logger.trace("Failed authentication by BCD SPNEGO Authentication Valve.");
      return null;
    } else {
      return princ.getName();
    }
  }
}
