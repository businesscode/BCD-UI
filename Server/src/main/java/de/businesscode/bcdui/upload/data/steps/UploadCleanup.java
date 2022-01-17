/*
  Copyright 2010-2017 BusinessCode GmbH, Germany
  All rights reserved.
  For terms of license, please contact BusinessCode GmbH, Germany
*/
package de.businesscode.bcdui.upload.data.steps;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.Calendar;

import de.businesscode.bcdui.upload.data.UploadControl;
import de.businesscode.bcdui.upload.data.UploadControl.ReturnCode;
import de.businesscode.bcdui.upload.data.UploadException;
import de.businesscode.sqlengine.SQLEngine;
import de.businesscode.util.Utils;
import de.businesscode.util.jdbc.Closer;

public class UploadCleanup implements IUploadStep {

  public static final String STEP_ID = "BCD_UPLOAD_CLEANUP";
  public static final int NUMBER_OF_DAYS = 8;

  protected final UploadControl uc;
  protected final String userId;

  /**
   * Constructor
   * @param uc
   * @param userId
   */
  public UploadCleanup(UploadControl uc, String userId) {
    this.userId = userId;
    this.uc = uc;
  }

  /**
   * remove outdated data from the 4 upload tables
   * @throws Exception
   */
  @Override
  public void process() throws UploadException, SQLException {
    Connection con = UploadControl.getManagedUploadConnection(STEP_ID);
    PreparedStatement psControl = null;
    PreparedStatement psControlStep = null;
    PreparedStatement psRowCol = null;
    PreparedStatement psValidation = null;

    try {
      Calendar calendar = Utils.getCalendar();
      calendar.add(Calendar.DAY_OF_MONTH, -1 * NUMBER_OF_DAYS);
      java.sql.Date limit = new java.sql.Date(calendar.getTimeInMillis());

      StringBuilder sqlValidation = new StringBuilder();
      sqlValidation.append("#set( $k = $bindings.bcd_dataupload_validation ) ");
      sqlValidation.append("#set( $c = $bindings.bcd_dataupload_control ) ");
      sqlValidation.append("DELETE FROM $k WHERE $k.uploadId IN ( SELECT $c.uploadId FROM $c WHERE $c.ts < ?)");
      SQLEngine sqlEngineValidation = new SQLEngine();
      psValidation = con.prepareStatement(sqlEngineValidation.transform(sqlValidation.toString()));
      psValidation.setDate(1, limit);
      int validationRows = psValidation.executeUpdate();
     
      StringBuilder sqlRowCol = new StringBuilder();
      sqlRowCol.append("#set( $k = $bindings.bcd_dataupload_rowcol ) ");
      sqlRowCol.append("#set( $c = $bindings.bcd_dataupload_control ) ");
      sqlRowCol.append("DELETE FROM $k WHERE $k.uploadId IN ( SELECT $c.uploadId FROM $c WHERE $c.ts < ?)");
      SQLEngine sqlEngineRowCol = new SQLEngine();
      psRowCol = con.prepareStatement(sqlEngineRowCol.transform(sqlRowCol.toString()));
      psRowCol.setDate(1, limit);
      int rowcolRows = psRowCol.executeUpdate();

      StringBuilder sqlControlStep = new StringBuilder();
      sqlControlStep.append("#set( $k = $bindings.bcd_dataupload_controlstep ) ");
      sqlControlStep.append("DELETE FROM $k WHERE $k.ts < ?");
      SQLEngine sqlEngineControlStep = new SQLEngine();
      psControlStep = con.prepareStatement(sqlEngineControlStep.transform(sqlControlStep.toString()));
      psControlStep.setDate(1, limit);
      int controlstepRows = psControlStep.executeUpdate();

      StringBuilder sqlControl = new StringBuilder();
      sqlControl.append("#set( $k = $bindings.bcd_dataupload_control ) ");
      sqlControl.append("DELETE FROM $k WHERE $k.ts < ?");
      SQLEngine sqlEngineControl = new SQLEngine();
      psControl = con.prepareStatement(sqlEngineControl.transform(sqlControl.toString()));
      psControl.setDate(1, limit);
      int controlRows = psControl.executeUpdate();

      uc.addStepResult(STEP_ID, ReturnCode.OK, new JsonLiteral().set("controlRows", controlRows).set("controlstepRows", controlstepRows).set("rowcolRows", rowcolRows).set("validationRows", validationRows).toJSONString());

    } catch(SQLException ex) {
      throw new UploadException(STEP_ID, UploadException.Reason.SQL_IO_EXCEPTION, ex);
    } finally {
      Closer.closeAllSQLObjects(psControl, psControlStep, psRowCol, psValidation);
    }
  }

}