package de.businesscode.bcdui.upload.data.steps;

import java.io.IOException;
import java.sql.SQLException;
import java.sql.Types;

import org.apache.commons.dbutils.QueryRunner;

import de.businesscode.bcdui.binding.BindingUtils;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.upload.data.UploadControl;
import de.businesscode.bcdui.upload.data.UploadException;
import de.businesscode.sqlengine.SQLEngine;

/**
 * Trims and NULL-ifies columns in rowcol table which are of type NUMERIC, DATE or TIMESTAMP according to mapping information.
 *
 */
public class UploadNormalization implements IUploadStep {
  private static final String STEP_ID = "BCD_UPLOAD_NORMALIZATION";
  private UploadControl uc;
  private final String skipHeaderClause;

  public UploadNormalization(UploadControl uc, String userId) {
    this.uc = uc;
    this.skipHeaderClause = (uc.hasHeaderRow() != null && uc.hasHeaderRow()) ? " AND $rowCol.rowNumber- > 1 " : "";
  }

  @Override
  public void process() throws UploadException, SQLException, IOException {
    StringBuilder sb = new StringBuilder();
    // build update operation for col-pos
    for (int i = 0, imax = uc.getImportColumnCount(); i < imax; i++) {
      int jdbcType = getSqlType(uc.getMappingBindingItemAttribute(i, Bindings.jdbcDataTypeNameAttribute));
      if (jdbcType != Types.VARCHAR && (jdbcType == Types.DATE || jdbcType == Types.TIMESTAMP || BindingUtils.isNumeric(jdbcType))) {
        String colRef = "$rowCol.col_" + (i + 1) + "-";
        sb.append(colRef).append(String.format(" = CASE WHEN LENGTH(TRIM( %1$s )) = 0 THEN NULL ELSE TRIM( %1$s ) END ", colRef));
        sb.append(",");
      }
    }
    int rowsUpdated = 0;
    if (sb.length() > 0) { // if some columns to process
      sb.setLength(sb.length() - 1); // trim last comma

      // run update; dont use aliases due to PostgreSQL
      rowsUpdated = new QueryRunner(true).update(UploadControl.getManagedUploadConnection(STEP_ID),
          new SQLEngine().transform(
              "#set ($rowCol = $bindings.bcd_dataupload_rowcol) UPDATE $rowCol.plainTableName SET " + sb.toString() + " WHERE $rowCol.uploadId- = ? " + this.skipHeaderClause),
          uc.getUploadId());
    }
    uc.addStepResult(STEP_ID, UploadControl.ReturnCode.OK, new JsonLiteral().set("rowsNormalized", rowsUpdated).toJSONString());
  }

  /**
   * @param typeName
   * @return recognized type or VARCHAR
   */
  private int getSqlType(String typeName) {
    if (typeName == null || typeName.isEmpty()) {
      return Types.VARCHAR;
    }
    try {
      return Types.class.getField(typeName.toUpperCase()).getInt(null);
    } catch (NoSuchFieldException | IllegalAccessException ex) {
      return Types.VARCHAR;
    }
  }
}
