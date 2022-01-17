/*
  Copyright 2010-2017 BusinessCode GmbH, Germany
  All rights reserved.
  For terms of license, please contact BusinessCode GmbH, Germany
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
