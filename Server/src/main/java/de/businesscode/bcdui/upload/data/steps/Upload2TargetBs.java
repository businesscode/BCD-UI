/*
  Copyright 2010-2017 BusinessCode GmbH, Germany
  All rights reserved.
  For terms of license, please contact BusinessCode GmbH, Germany
*/
package de.businesscode.bcdui.upload.data.steps;

import java.io.IOException;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.LinkedList;
import java.util.List;

import org.apache.commons.dbutils.QueryRunner;

import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.upload.data.UploadControl;
import de.businesscode.bcdui.upload.data.UploadControl.ReturnCode;
import de.businesscode.bcdui.upload.data.UploadException;
import de.businesscode.sqlengine.SQLEngine;

/**
 * This class is responsible for transferring data from bcdui_upload_rowcol into the target BindingSet
 * It relies on correct format of the data in bcdui_upload_rowcol. Rows having entries in bcd_dataupload_validation are skipped.
 */
public class Upload2TargetBs implements IUploadStep {
  private static String STEP_ID = "BCD_UPLOAD_2TARGETBS";

  private final String uploadId;
  private final String userId;
  private final UploadControl uc;
  private final String stepId;

  /**
   * Constructor
   * @param uc
   * @param userId
   * @param stepId
   */
  public Upload2TargetBs(UploadControl uc, String userId, String stepId) {
    this.uc = uc;
    this.uploadId = uc.getUploadId();
    this.userId = userId;
    this.stepId = stepId;
  }
  /**
   * Constructor
   * @param uc
   * @param userId
   */
  public Upload2TargetBs(UploadControl uc, String userId) {
    this(uc, userId, STEP_ID);
  }

  /**
   * Go
   * @throws Exception
   */
  @Override
  public void process() throws SQLException, IOException, UploadException {
    Connection con = UploadControl.getManagedUploadConnection(this.stepId);

    // Stop, if we do not know the target BndingSet
    // TODO Message i18n
    if(uc.getTargetBs() == null ) {
      uc.addStepResult(this.stepId, ReturnCode.ERROR, new JsonLiteral().set("error", "Missing target BindingSet").toJSONString());
    }

    // Create insert into statement for target BindingSet
    StringBuilder insSqlBuff = new StringBuilder();
    StringBuilder insListBuff = new StringBuilder();
    StringBuilder fromListBuff = new StringBuilder();
    insSqlBuff.append("#set( $target = $bindings.").append(uc.getTargetBs()).append(" )");
    insSqlBuff.append("#set( $rowCol = $bindings.bcd_dataupload_rowcol").append(" )");
    insSqlBuff.append("#set( $val = $bindings.bcd_dataupload_validation").append(" )");
    String sep = "";
    // Don't use aliases in INSERT INTO statement due to PostgreSQL, that is why we append '-'
    // Also, PostgreSQL requires explicit casting from VARCHAR in rolcol to type in target table
    for(int b = 0; b < uc.getImportColumnCount(); b++ ) {
      String targetBi = uc.getMappingBindingItemAttribute(b, "id");
      if(targetBi != null && ! targetBi.isEmpty()) {
        insListBuff.append(sep).append("$target.").append(targetBi).append("-");
        fromListBuff.append(sep);
        fromListBuff.append("CAST( ");
        fromListBuff.append("$rowCol.col_").append(b+1);
        fromListBuff.append(" AS " + getDowncastType(b)).append(" )"); // CAST (.. AS)
        sep = ", ";
      }
    }

    List<Object> params = new LinkedList<>();
    extend(insListBuff, fromListBuff, params);

    insSqlBuff.append("  INSERT INTO $target.plainTableName ( ").append(insListBuff.toString()).append(" ) ");
    insSqlBuff.append("  SELECT ").append(fromListBuff).append(" FROM $rowCol ");
    insSqlBuff.append("    WHERE $rowCol.uploadId = ?  ");
    if( uc.hasHeaderRow() != null && uc.hasHeaderRow() )
      insSqlBuff.append("    AND $rowCol.rowNumber > (select min(a.$rowCol.rowNumber_) from $rowCol.plainTableName as a WHERE a.$rowCol.uploadId_ = $rowCol.uploadId) ");
    insSqlBuff.append(" AND $rowCol.rowNumber NOT IN ( SELECT $val.rowNumber FROM $val WHERE $val.uploadId = $rowCol.uploadId AND $val.severity >= ").append(UploadBindingItemValidate.Severity.ERROR.getValue()).append(" )");
    String insSql = new SQLEngine().transform(insSqlBuff.toString());

    params.add(uploadId);

    final int inserted =  new QueryRunner(true).update(con, insSql, params.toArray());

    // Write back the step
    int rowCount = uc.getImportRowCount();
    ReturnCode rc = rowCount == 0 || inserted < rowCount ? ReturnCode.INFO : ReturnCode.OK;
    uc.addStepResult(this.stepId, rc, new JsonLiteral().set("insertedRows", inserted).set("rowCount", rowCount).toJSONString());
  }

  /**
   * determines target type to cast on database for given bindingitem
   *
   * @param bindingItemIndex - the binding item index to determine the typename for
   * @return the target type on database, the default implememtation returns type-name from binding-item, i.e. 'VARCHAR'
   */
  protected String getDowncastType(int bindingItemIndex) {
    return uc.getMappingBindingItemAttribute(bindingItemIndex, Bindings.jdbcDataTypeNameAttribute);
  }

  /**
   * override this method to extend the INSERT / FROM lists, i.e. to inject custom data when writing to target table,
   * the list is VTL syntax, scoped bindingsets: $target = target, $rowCol = bcd_dataupload_rowcol, $val = bcd_dataupload_validation
   *
   * @param insList - must not contain aliases
   * @param fromList - may contain params placeholders
   * @param params - adjacent to fromList; must not remove params from list or change order.
   */
  protected void extend(StringBuilder insList, StringBuilder fromList, List<Object> params) {
  }
}
