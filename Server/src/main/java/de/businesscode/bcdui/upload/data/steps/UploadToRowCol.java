/*
  Copyright 2010-2021 BusinessCode GmbH, Germany
  All rights reserved.
  For terms of license, please contact BusinessCode GmbH, Germany
*/
package de.businesscode.bcdui.upload.data.steps;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.StandardBindingSet;
import de.businesscode.bcdui.upload.data.UploadControl;
import de.businesscode.bcdui.upload.data.UploadException;
import de.businesscode.sqlengine.SQLEngine;
import de.businesscode.util.jdbc.Closer;


/**
 * Base class for inserting a file available as BLOB column- and cell wise to bcd_dataupload_rowcol
 */
public class UploadToRowCol implements IUploadStep, IUploadToRowColCallback
{
  public static String STEP_ID = "BCD_UPLOAD_TOROWCOL";

  public static final int NON_DATA_COLUMNS = 2; // uploadId and rowNumber

  protected final UploadControl uc;
  protected final String uploadId;
  protected final String userId;

  private final int BATCH_SIZE = 500;
  private boolean isExecuted = false;
  private int rowNumber = 1;
  private PreparedStatement insertPs = null; 
  private int targetCols = 0;
  private final List<String> rowData = new ArrayList<>();
  private final IUploadToRowColParser uploadToRowColImpl;

  /**
   * Open the file with the given uploaId, split it into columns and write it to bcd_dataupload_staging
   * We remove any previous data for uploadId from bcd_dataupload_rowcol
   * @param uc UploadControl
   */
  public UploadToRowCol(UploadControl uc, String userId) throws Exception {
    
    this.uploadId = uc.getUploadId();
    this.userId = userId;
    this.uc = uc;

    // Are we going for Excel or CSV parsing?
    String fileName = uc.getSourceName();
    if( fileName.toLowerCase().endsWith(".xlsx") || fileName.toLowerCase().endsWith(".xls") ) {
      uploadToRowColImpl = new UploadToRowColExcel(uc, this);
    } else {
      uploadToRowColImpl = new UploadToRowColCsv(uc, this);
    }
  }

  /**
   * Parse the file in blob an load it cell-wise to bcd_dataupload_rowcol
   * @throws Exception
   */
  @Override
  public void process() throws UploadException, SQLException {
    Connection con = UploadControl.getManagedUploadConnection(STEP_ID);

    // First delete all rows from rowcol table from previous attempts
    try(PreparedStatement deletePs = con.prepareStatement(new SQLEngine().transform(deleteRowColSql)); ) {
      deletePs.setString(1, uploadId);
      deletePs.executeUpdate();
    }

    // Parse the input and fill bcd_dataupload_rowcol
    try {
      uploadToRowColImpl.process();
    } catch(Exception ex) {
      throw new UploadException(STEP_ID, UploadException.Reason.FAILED_FILL_ROWCOL, ex);
    }

    // Update upload control
    uc.setImportColumnCount(targetCols - NON_DATA_COLUMNS);
    uc.setImportRowCount(rowNumber - 1);

    // Add add a step
    uc.addStepResult(STEP_ID, UploadControl.ReturnCode.OK, new JsonLiteral().set("rows", rowNumber-1).set("columns", targetCols).toJSONString());
  }

  /**
   * Expects consecutive cells, null is allowed for value
   * @param value
   * @throws SQLException
   */
  @Override
  public void nextCell(String value) throws SQLException {
    rowData.add(value);
  }

  /**
   * Starts a new line
   * @throws SQLException
   */
  @Override
  public void startLine() throws SQLException {
    rowData.clear();
  }

  /**
   * Ends a line, adds possible missing trailing cells
   * @throws Exception
   */
  @Override
  public void endLine() throws Exception {
    
    // If the statement is too short (does not hold enough data columns),
    // execute it so far and get a longer one
    getInsertStmt(rowData.size());

    // Set the values for the cells
    int cellIndex = 1;
    insertPs.setString(cellIndex++, uploadId);
    insertPs.setInt(cellIndex++, rowNumber);
    for( String value: rowData ) {
      if(value == null) {
        insertPs.setNull(cellIndex++, Types.VARCHAR);
      } else {
        insertPs.setString(cellIndex++, value);
      }
    }

    // Append possible missing trailing cells
    while(cellIndex <= targetCols) {
      insertPs.setNull(cellIndex++, Types.VARCHAR);
    }

    insertPs.addBatch();
    
    // Execute batch every BATCH_SIZE rows
    if (rowNumber % BATCH_SIZE == 0) {
      insertPs.executeBatch();
      isExecuted = true;
    } else
      isExecuted = false;

    // Prepare next row
    rowNumber++;
  }

  /**
   * Data fully parsed
   * @throws SQLException
   */
  @Override
  public void endFile() throws Exception  {

    // Write the last bulk set
    if (insertPs != null && ! isExecuted) {
      insertPs.executeBatch();
    }
    Closer.closeAllSQLObjects( insertPs );
  }

  /**
   * Get a PreparedStatement for the required number of data cells
   * If there is already one, make sure its data is written back, we assume there is always a line finished here
   * @param dataCols
   * @throws Exception
   */
  private void getInsertStmt(int dataCols) throws Exception {

    // Maybe the statement exists already and is working with enough columns
    if(insertPs != null && rowData.size() <= targetCols - NON_DATA_COLUMNS) {
      return;
    }

    // Otherwise close the current one (if any)
    if(insertPs != null) {
      insertPs.executeBatch();
      insertPs.close();
    }
    
    // Get a Statement with enough columns
    StandardBindingSet rowColBs = Bindings.getInstance().get("bcd_dataupload_rowcol", null);
    Collection<BindingItem> bItems = rowColBs.getBindingItems();
    StringBuilder insertStmtSb = new StringBuilder(insertRowColSqlFragment);
    StringBuilder insertStmtSbHv = new StringBuilder("(?, ?");
    targetCols = NON_DATA_COLUMNS;
    for(BindingItem bItem: bItems) {
      if( bItem.getId().startsWith("col_") ) {
        insertStmtSb.append(", ").append(bItem.getColumnExpression());
        insertStmtSbHv.append(", ?");
        targetCols++;
      }
      if(targetCols == dataCols + NON_DATA_COLUMNS)
        break;
    }

    // Does rowcol hold enough columns?
    if(targetCols < dataCols + NON_DATA_COLUMNS)
      throw new UploadException(STEP_ID, UploadException.Reason.TOO_MANY_COLUMNS);

    String insertStatement = insertStmtSb.append(") VALUES ").append(insertStmtSbHv.toString()).append(")").toString();
    Connection con = UploadControl.getManagedUploadConnection(STEP_ID);
    insertPs = con.prepareStatement(new SQLEngine().transform(insertStatement));
  }
  
  private static final String deleteRowColSql =
      "#set( $k = $bindings.bcd_dataupload_rowcol ) "+
      "DELETE FROM $k WHERE $k.uploadId = ? ";

  // dont use aliases for INSERTs ( PostgreSQL )
  private static final String insertRowColSqlFragment =
      "#set( $k = $bindings.bcd_dataupload_rowcol ) "+
      "INSERT INTO $k.plainTableName ($k.uploadId-, $k.rowNumber-";

}


/**
 * Parsing a file and writing it back into bcd_dataupload_rowcol, possibly with help of IUploadToRowColCallback
 */
interface IUploadToRowColParser {
  public void process() throws Exception;
}


/**
 * Writing cell by cell into bcd_dataupload_rowcol
 */
interface IUploadToRowColCallback {
  /**
   * Starts a new line
   * @throws SQLException
   */
  void startLine() throws SQLException;

  /**
   * Ends a line, adds possible missing trailing cells
   * @throws Exception
   */
  void endLine() throws Exception;

  /**
   * Data fully parsed
   * @throws SQLException
   */
  void endFile() throws Exception;

  /**
   * Expects consecutive cells, null is allowed for value
   * @param value
   * @throws SQLException
   */
  void nextCell(String value) throws SQLException;
}
