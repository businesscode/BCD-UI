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
package de.businesscode.bcdui.upload.data;

public class UploadException extends Exception {

  private static final long serialVersionUID = -2060948046646342607L;

  public enum Reason {
    NO_DB_CONNECTION,
    HEURISTIC_FAILED,
    MAPPING_FAILED,
    FAILED_CREATE_UPLOAD_CONTROL,
    FAILED_READ_STEP_HISTORY,
    FAILED_LOAD_UPLOAD_CONTROL,
    FAILED_WRITE_UPLOAD_CONTROL,
    FAILED_SAVE_STEP,
    FAILED_FILL_ROWCOL,
    SQL_IO_EXCEPTION,
    BINDINGSET_NOT_FOUND,
    FAILED_INSTANTIATE_STEP,
    TOO_MANY_COLUMNS,
    FAILED_UPLOAD_WRONG_UPLOAD_ID
  }

  protected String stepId;
  protected Reason reason;
  protected Exception root = null;

  public UploadException(String stepId, Reason reason ) {
    super("Upload failure for "+stepId+": "+reason.name() );
    this.stepId = stepId;
    this.reason = reason;
  }

  public UploadException(String stepId, Reason reason, Exception root ) {
    super("Upload failure for "+stepId+": "+reason.name(), root);
    this.stepId = stepId;
    this.reason = reason;
    this.root = root;
  }

}
