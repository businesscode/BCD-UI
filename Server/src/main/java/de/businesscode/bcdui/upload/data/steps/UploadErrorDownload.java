/*
  Copyright 2010-2017 BusinessCode GmbH, Germany
  All rights reserved.
  For terms of license, please contact BusinessCode GmbH, Germany
*/
package de.businesscode.bcdui.upload.data.steps;

import java.io.IOException;
import java.io.Writer;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;

import de.businesscode.bcdui.upload.data.UploadControl;
import de.businesscode.bcdui.upload.data.UploadException;
import de.businesscode.sqlengine.SQLEngine;
import de.businesscode.util.jdbc.Closer;

/**
 * Retrieves the rows with errors together with their errors as CSV
 * It prepends the header
 */
public class UploadErrorDownload {

  public static String STEP_ID = "BCD_UPLOAD_ERRORDOWNLOAD";
  
  private static final char BYTE_ORDER_MARK = (char) 0xfeff; // For excel to open as UFT-8
  protected final UploadControl uc;
  protected final Writer writer;
  
  public UploadErrorDownload(final UploadControl uc, Writer writer) {
    this.uc = uc;
    this.writer = writer;
  }
  
  public void process() throws UploadException, SQLException, IOException {
    final Connection con = UploadControl.getManagedUploadConnection(STEP_ID);
    final int colCnt = uc.getImportColumnCount();
    CSVFormat csvFormat = CSVFormat.DEFAULT.withDelimiter(uc.getDelimiter() != null ? uc.getDelimiter() : ',');
    String uploadId = uc.getUploadId();
    
    PreparedStatement errPs = null, rowsPs = null;
    ResultSet errRs = null, rowsRs = null;

    try(CSVPrinter csvPrinter = new CSVPrinter(writer, csvFormat)) {
      writer.write(BYTE_ORDER_MARK);
      String transSelectRowSql = new SQLEngine().transform(getFailedRowsSql(uc.getImportColumnCount()));
      rowsPs = con.prepareStatement(transSelectRowSql);
      rowsPs.setString(1, uploadId);
      rowsRs = rowsPs.executeQuery();

      String transSelectErrorsSql = new SQLEngine().transform(selectErrorsSql);
      errPs = con.prepareStatement(transSelectErrorsSql);
      errPs.setString(1, uploadId);
      errRs = errPs.executeQuery();
      errRs.next();

      while(rowsRs.next()) {

        int rowNumber = rowsRs.getInt(1);
        // Data columns
        for(int c = UploadToRowCol.NON_DATA_COLUMNS; c <= colCnt + 1; c++) {
          csvPrinter.print(cleanFormula(rowsRs.getString(c)));
        }
        // Error columns.
        if(rowNumber == 1 && uc.hasHeaderRow()) {
          csvPrinter.print("");
          csvPrinter.print("Err-Col. (1)");
          csvPrinter.print("Err-Msg. (1)");
          csvPrinter.print("Err-Col. (2)");
          csvPrinter.print("Err-Msg. (2)");
          csvPrinter.print("Err-Col. (3)");
          csvPrinter.print("Err-Msg. (3)");
        } else {
          csvPrinter.print("");
          do {
            int colPos = errRs.getInt(2) - 1;
            String colCaption = uc.getMappingBindingItemAttribute(colPos, "caption");
            csvPrinter.print(colCaption.isEmpty() ? uc.getMappingBindingItemAttribute(colPos, "id") : colCaption);
            csvPrinter.print(cleanFormula(errRs.getString(4)));
          } while( errRs.next() && errRs.getInt(1) <= rowNumber);
        }
        csvPrinter.println();
      }
      csvPrinter.flush();

    } finally {
      Closer.closeAllSQLObjects( errRs, errPs, rowsRs, rowsPs);
    }
  }

  private String cleanFormula(String s) {
    if (s == null)
      return null;

    String m = s.trim();
    if ((m.startsWith("+") || m.startsWith("-")) && ! m.matches("^[0-9\\+\\-\\s\\.\\,%€\\$°e]*$"))
        return m.substring(1);
    if (m.startsWith("@") || m.startsWith("="))
        return m.substring(1);

    return m;
  }

  protected final String selectErrorsSql =
    "#set( $val = $bindings.bcd_dataupload_validation ) " +
    " SELECT $val.rowNumber, $val.colNumber, $val.severity, COALESCE($val.descr, $val.message)" +
    "  FROM $val " +
    "  WHERE $val.uploadId = ? " +
    "  ORDER BY $val.rowNumber ASC, $val.severity DESC";

  private String getFailedRowsSql(final int numCataCols) {
    StringBuilder sql = new StringBuilder();
    sql.append("#set( $uc = $bindings.bcd_dataupload_control ) ");
    sql.append("#set( $rowCol = $bindings.bcd_dataupload_rowcol ) ");
    sql.append("#set( $val = $bindings.bcd_dataupload_validation ) ");
    sql.append(" SELECT $rowCol.rowNumber ");
    for(int c = 1; c <= numCataCols; c++ )
      sql.append(", ").append("$rowCol.col_").append(c);
    sql.append(" FROM $rowCol");
    sql.append(" WHERE $rowCol.uploadId = ? AND ");
    sql.append("   ( $rowCol.rowNumber IN (SELECT $val.rowNumber FROM $val WHERE $val.uploadId = $rowCol.uploadId) ");
    sql.append("     OR ( $rowCol.rowNumber = 1 AND (SELECT COUNT(*) FROM $uc WHERE ($uc.hasHeaderRow = '1' AND $uc.uploadId = $rowCol.uploadId) ) = 1 ) ) ");
    sql.append(" ORDER BY $rowCol.rowNumber");
    return sql.toString();
  }
}
