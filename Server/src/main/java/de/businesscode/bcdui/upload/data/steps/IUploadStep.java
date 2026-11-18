/*
  Copyright 2010-2026 BusinessCode GmbH, Germany

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
package de.businesscode.bcdui.upload.data.steps;

import de.businesscode.bcdui.upload.data.UploadException;

import java.io.IOException;
import java.sql.SQLException;
import java.util.Map;

/**
 * Steps to be able to be added to UploadServlet as init param, format see there
 * Need a Constructor getting (UploadControl uc, String userId)
 * If writing, call UploadControl#addStepResult() at the end of process()
 */
public interface IUploadStep {

  default public void setParams(Map<String, String[]> params) {
    // Nothing per default
  }

  /*
   */
  public void process() throws UploadException, SQLException, IOException;

}
