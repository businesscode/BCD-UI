/*
  Copyright 2010-2017 BusinessCode GmbH, Germany
  All rights reserved.
  For terms of license, please contact BusinessCode GmbH, Germany
*/
package de.businesscode.bcdui.upload.data;

import java.io.IOException;
import java.io.Writer;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.Date;
import java.util.LinkedList;
import java.util.List;

import org.apache.commons.lang.StringEscapeUtils;

import de.businesscode.sqlengine.SQLEngine;
import de.businesscode.util.jdbc.Closer;

/**
 * Handles access to bcd_dataupload_control_step
 * i.e., provides a list of steps so far and can add new steps
 */
public class UploadControlSteps {

  private List<Step> steps = new LinkedList<>();
  private final String uploadId;
  private boolean changed = false;

  /**
   * Constructor, reads all steps from bcd_dataupload_controlstep
   * @param uploadId
   * @throws Exception
   */
  public UploadControlSteps(String uploadId) throws UploadException {
    this.uploadId = uploadId;
    
    SQLEngine sqlEngine = new SQLEngine();
    String transSql = sqlEngine.transform(selectStepSql);
    PreparedStatement ps = null;
    ResultSet rs = null;
    Connection con = UploadControl.getManagedUploadConnection(UploadControl.STEP_ID);
    try {
      ps = con.prepareStatement(transSql);
      ps.setString(1, uploadId);
      rs = ps.executeQuery();
      while( rs.next() ) {
        Step step = new Step( rs.getString(sqlEngine.getIndex("step")), rs.getTimestamp(sqlEngine.getIndex("ts")), rs.getString(sqlEngine.getIndex("userId")),
            rs.getInt(sqlEngine.getIndex("rc")), rs.getString(sqlEngine.getIndex("rcMessage")) );
        steps.add(step);
      }
    } catch(SQLException ex) {
      throw new UploadException(UploadControl.STEP_ID, UploadException.Reason.FAILED_READ_STEP_HISTORY, ex);
    } finally {
      Closer.closeAllSQLObjects(rs, ps);
    }
  }

  /**
   * Add a new step
   * @param step
   */
  public void appendStep(Step step) {
    steps.add(step);
    changed = true;
  }

  public void refreshStep() {
    changed = true;
  }

  /**
   * Write list of steps in for a a Wrs to writer
   * @param writer
   * @param uploadId
   * @throws Exception
   */
  public void writeStepsResponse(Writer writer, String uploadId) throws IOException {
    writer.append("<Wrs xmlns=\"http://www.businesscode.de/schema/bcdui/wrs-1.0.0\"><Header><Columns>");
    writer.append("<C id=\"uploadId\"/><C id=\"stepId\"/><C id=\"rc\"/><C id=\"message\"/>");
    writer.append("</Columns></Header><Data>");
    for(UploadControlSteps.Step step: steps) {
      writer.append("<R>");
      writer.append("<C>").append(uploadId).append("</C>");
      writer.append("<C>").append(step.step).append("</C>");
      writer.append("<C>").append(Integer.toString(step.rc)).append("</C>");
      writer.append("<C>");
      if(step.rcMessage != null)
        writer.append(StringEscapeUtils.escapeXml(step.rcMessage));
      writer.append("</C>");
      writer.append("</R>");
    }
    writer.append("</Data></Wrs>");
  }

  /**
   * Does a complete refresh of all steps for the upload
   * @throws Exception
   */
  public void save() throws UploadException {
    
    if(! changed)
      return;
    
    Connection con = UploadControl.getManagedUploadConnection(UploadControl.STEP_ID);

    // First delete all steps
    SQLEngine delSqlEngine = new SQLEngine();
    String delTransSql = delSqlEngine.transform(deleteStepSql);
    SQLEngine insSqlEngine = new SQLEngine();
    String insTransSql = insSqlEngine.transform(insertStepSql);

    try ( PreparedStatement delPs = con.prepareStatement(delTransSql);
          PreparedStatement insPs = con.prepareStatement(insTransSql) ) {

      delPs.setString(1, uploadId);
      delPs.executeUpdate();

      // Now reinsert them (updated and plus any new)
      for( Step step: steps ) {
        insPs.setString(insSqlEngine.getIndex("uploadId"), uploadId);
        insPs.setString(insSqlEngine.getIndex("step"), step.step);
        insPs.setTimestamp(insSqlEngine.getIndex("ts"), new Timestamp(step.ts.getTime()));
        insPs.setString(insSqlEngine.getIndex("userId"), step.userId);
        insPs.setInt(insSqlEngine.getIndex("rc"), step.rc);
        insPs.setString(insSqlEngine.getIndex("rcMessage"), step.rcMessage);
        insPs.addBatch();
      }
      insPs.executeBatch();
    } catch ( SQLException ex ) {
      throw new UploadException(UploadControl.STEP_ID, UploadException.Reason.FAILED_SAVE_STEP, ex);
    }
  }

  // Select all steps for the current uploadId
  private static final String selectStepSql =
      "#set( $k = $bindings.bcd_dataupload_controlstep ) "+
      " SELECT $k.ts, $k.userId, $k.step, $k.rc, $k.rcMessage " +
      "   FROM $k " +
      "   WHERE $k.uploadId = ?";

  // Statement for initial insert into step table; dont use aliases due to PostgreSQL
  private static final String insertStepSql =
      "#set( $k = $bindings.bcd_dataupload_controlstep ) "+
      " INSERT INTO $k.plainTableName " +
      "  ( $k.uploadId-, $k.ts-, $k.userId-, $k.step-, $k.rc-, $k.rcMessage- ) " +
      "  VALUES (?, ?, ?, ?, ?, ?) ";

  // Delete all steps for the current uploadId
  private static final String deleteStepSql =
      "#set( $k = $bindings.bcd_dataupload_controlstep ) "+
          " DELETE FROM $k WHERE $k.uploadId = ?";

  /**
   * Plain POJO representing an upload set with detail data
   */
  public static class Step {
    public final Date ts;
    public final String step;
    public final String userId;
    public final int rc;
    public final String rcMessage;

    public Step(String step, Date ts, String userId, int rc, String rcMessage) {
      super();
      this.step = step;
      this.ts = ts;
      this.userId = userId;
      this.rc = rc;
      this.rcMessage = rcMessage;
    }

    /**
     * 
     * @param step
     * @param userId
     * @param rc
     * @param jsonData - data providing extra information in JSON notation
     */
    public Step(String step, String userId, UploadControl.ReturnCode rc, String jsonData) {
      this(step, new Date(), userId, rc.getValue(), jsonData);
    }
    public Step(String step, String userId) {
      this(step, userId, UploadControl.ReturnCode.OK, "");
    }
  }
}
