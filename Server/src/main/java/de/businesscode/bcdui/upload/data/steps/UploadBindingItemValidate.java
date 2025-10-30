/*
  Copyright 2010-2017 BusinessCode GmbH, Germany
  All rights reserved.
  For terms of license, please contact BusinessCode GmbH, Germany
*/
package de.businesscode.bcdui.upload.data.steps;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Types;
import java.util.LinkedList;
import java.util.List;

import de.businesscode.bcdui.binding.BindingUtils;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.upload.data.UploadControl;
import de.businesscode.bcdui.upload.data.UploadException;
import de.businesscode.sqlengine.SQLEngine;

/**
 * This class applies all validations which are possible based on the assigned BindingSet i.e. entries in mapping
 * Validation issues are written to bcd_dataupload_validation
 */
public class UploadBindingItemValidate implements IUploadStep {

  public static String STEP_ID = "BCD_UPLOAD_BINDINGITEMVALIDATE";

  public static enum Severity {
    OK(0), INFO(2), WARNING(4), ERROR(8), SEVERE(16);
    private final int value;
    Severity(int value) { this.value = value; }
    public int getValue() { return this.value; }
  }
  public static enum Check {
    IS_INTEGER("bcd_is_integer(", ") = ", "bcd_validate_noInteger", "Not an integer number"),
    IS_NUMBER("bcd_is_number(", ") = ", "bcd_validate_noNumber", "Not a number"),
    IS_DATE("bcd_is_date(", ") = ", "bcd_validate_noDate", "Not a date"),
    IS_TIMESTAMP("bcd_is_timestamp(", ") = ", "bcd_validate_noTimestamp", "Not a timestamp"),
    NOT_NULL("CASE WHEN ", " IS NULL THEN 1 ELSE 0 END = ", "bcd_validate_null", "Value is empty"),
    MAX_LENGTH("LENGTH(", ") > ", "bcd_validate_tooLong", "Value too long"),
    IS_UNIQUE("SUM(1) OVER ( PARTITION BY ", " ) ", "bcd_validate_notUnique", "Value not unique"),
    UNKOWN_TYPE("(", ") IS NULL OR 1=", "bcd_validate_typeNotSupported", "Unsupported Binding-Item type");
    private final String pre, post, message,descr;
    Check(String pre, String post, String message, String descr) {
      this.pre = pre;
      this.post = post;
      this.message = message;
      this.descr = descr;
    }
    public String getFct(String col) { return pre+col+post; }
    public String getFct(String col, int comp) { return pre+col+post+comp; }
    public String getMsg() { return message; }
    public String getDescr() { return descr; }
  }


  protected int errorCount = 0;
  protected final String skipHeader;
  protected final UploadControl uc;
  protected final Connection con;
  protected final String uploadId;
  protected final int colCount;
  protected final String userId;

  /**
   * Constructor
   * @param uploadControl
   * @param userId
   * @throws Exception
   */
  public UploadBindingItemValidate(UploadControl uploadControl, String userId) throws UploadException {
    this.uc = uploadControl;
    this.userId = userId;
    this.uploadId = uc.getUploadId();
    this.colCount = uc.getImportColumnCount();
    this.skipHeader = (uc.hasHeaderRow() != null && uc.hasHeaderRow()) ? " AND $rowCol.rowNumber > (SELECT min(a.$rowCol.rowNumber_) FROM $rowCol.plainTableName a WHERE a.$rowCol.uploadId_ = $rowCol.uploadId) " : "";
    con = UploadControl.getManagedUploadConnection(STEP_ID);
  }

  /**
   *
   * @throws Exception
   */
  @Override
  public void process() throws UploadException, SQLException {
    List<Integer> keyCols = new LinkedList<>();

    for(int colNum = 1; colNum <= colCount; colNum++) {

      // Default is VARCHAR
      int type = Types.VARCHAR;
      String typeName = uc.getMappingBindingItemAttribute(colNum - 1, Bindings.jdbcDataTypeNameAttribute);
      try {
        type = Types.class.getField(typeName).getInt(null);
      } catch(NoSuchFieldException | IllegalAccessException ex) {
        // Keep default
      }

      // JDBC data types
      // Integer
      if(type == Types.INTEGER) {
        errorCount += applyCheck(colNum, Check.IS_INTEGER, 0);
      }
      // Other numbers
      else if( BindingUtils.isNumeric(type) ) {
        errorCount += applyCheck(colNum, Check.IS_NUMBER, 0);
      }
      // Date
      else if(type == Types.DATE) {
        errorCount += applyCheck(colNum, Check.IS_DATE, 0);
      }
      // Date-Time
      else if(type == Types.TIMESTAMP) {
        errorCount += applyCheck(colNum, Check.IS_TIMESTAMP, 0);
      }
      // Unkown Type ( ignore CHAR types )
      else if(type != Types.VARCHAR && type != Types.CHAR) {
        errorCount += applyCheck(colNum, Check.UNKOWN_TYPE, 1);
        break;
      }

      // JDBC Display size
      String displaySizeString = uc.getMappingBindingItemAttribute(colNum - 1, Bindings.jdbcColumnDisplaySizeAttribute);
      try {
        int displaySize = Integer.parseInt(displaySizeString);
        errorCount += applyCheck(colNum, Check.MAX_LENGTH, displaySize);
      } catch (Exception e) {
        // No check possible
      }

       // Not null
      String nullableString = uc.getMappingBindingItemAttribute(colNum - 1, Bindings.jdbcNullableAttribute);
      try {
        boolean nullable = Integer.parseInt(nullableString) > 0;
        if(!nullable)
          errorCount += applyCheck(colNum, Check.NOT_NULL, 1);
      } catch (Exception e) {
        // No check possible
      }

      // Is key for uniqueness check below
      String isKeyString = uc.getMappingBindingItemAttribute(colNum - 1, Bindings.keyAttributeName);
      try {
        boolean isKey = Integer.parseInt(isKeyString) > 0;
        if(isKey)
          keyCols.add(colNum);
      } catch (Exception e) {
        // No check possible
      }
    }

    // Uniqueness check over all key columns
    if(keyCols.size() > 0) {
      Check check = Check.IS_UNIQUE;
      String firstkeyCol = keyCols.get(0).toString();
      StringBuilder allKeyColsSb = new StringBuilder();
      for(Integer kc: keyCols)
        allKeyColsSb.append(", $rowCol.col_"+kc);
      String allKeyCols = allKeyColsSb.substring(1);
      StringBuilder checkSQL = new StringBuilder();
      checkSQL.append("#set( $rowCol = $bindings.bcd_dataupload_rowcol ) ");
      checkSQL.append("#set( $val = $bindings.bcd_dataupload_validation) ");
      checkSQL.append("  INSERT INTO $val.plainTableName ( $val.uploadId_ , $val.rowNumber_, $val.colNumber_, $val.severity_, $val.message_, $val.descr_ ) "); // no aliases in INSERTs due to PostgreSQL
      checkSQL.append("  SELECT ui, rn, cn, sv, ms, descr FROM ( ");
      checkSQL.append("  SELECT $rowCol.uploadId as ui, $rowCol.rowNumber as rn, ");
      checkSQL.append(firstkeyCol).append(" as cn, ").append(Severity.ERROR.getValue()).append(" as sv , '").append(check.getMsg()).append("' as ms, '").append(check.getDescr()).append("' as descr, ");
      checkSQL.append(check.getFct(allKeyCols)).append(" as cnt ");
      checkSQL.append("  FROM $rowCol WHERE ").append(" $rowCol.uploadId = ?");
      checkSQL.append(skipHeader);
      checkSQL.append(") WHERE cnt > 1");
      String sql = new SQLEngine().transform(checkSQL.toString());
      try (PreparedStatement testPs = con.prepareStatement(sql) ) {
        testPs.setString(1, uploadId);
        errorCount += testPs.executeUpdate();
      }
    }

    // Write back the step
    UploadControl.ReturnCode stepRc = errorCount > 0 ? UploadControl.ReturnCode.WARN : UploadControl.ReturnCode.OK;
    uc.addStepResult(STEP_ID, stepRc, new JsonLiteral().set("errorCount", errorCount).toJSONString());
  }

  protected int applyCheck(int colNum, Check check, int comp) throws SQLException {
    int errors;
    StringBuilder checkSQL = new StringBuilder();
    checkSQL.append("#set( $rowCol = $bindings.bcd_dataupload_rowcol ) ");
    checkSQL.append("#set( $val = $bindings.bcd_dataupload_validation) ");
    checkSQL.append("  INSERT INTO $val.plainTableName ( $val.uploadId_ , $val.rowNumber_, $val.colNumber_, $val.severity_, $val.message_, $val.descr_ ) "); // no aliases in INSERTs due to PostgreSQL
    checkSQL.append("  SELECT $rowCol.uploadId, $rowCol.rowNumber, ");
    checkSQL.append(colNum).append(", ").append(Severity.ERROR.getValue()).append(", '").append(check.getMsg()).append("', '").append(check.getDescr()).append("'");
    checkSQL.append("  FROM $rowCol WHERE ").append(check.getFct("$rowCol.col_"+colNum, comp)).append(" AND $rowCol.uploadId = ?");
    checkSQL.append(skipHeader);
    String sql = new SQLEngine().transform(checkSQL.toString());
    try (PreparedStatement testPs = con.prepareStatement(sql) ) {
      testPs.setString(1, uploadId);
      errors = testPs.executeUpdate();
    }
    return errors;
  }
}
