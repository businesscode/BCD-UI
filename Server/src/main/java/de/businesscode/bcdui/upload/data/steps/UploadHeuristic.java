/*
  Copyright 2010-2021 BusinessCode GmbH, Germany
  All rights reserved.
  For terms of license, please contact BusinessCode GmbH, Germany
*/
package de.businesscode.bcdui.upload.data.steps;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.LinkedList;
import java.util.List;

import de.businesscode.bcdui.binding.StandardBindingSet;
import org.apache.commons.lang3.math.NumberUtils;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.upload.data.UploadControl;
import de.businesscode.bcdui.upload.data.UploadControl.ReturnCode;
import de.businesscode.bcdui.upload.data.UploadException;
import de.businesscode.sqlengine.SQLEngine;
import de.businesscode.util.jdbc.Closer;

/**
 * This class tries to guess the data content semantics in bcd_dataupload_rowcol and updates bcd_dataupload_control
 * 1. Does the data have a header
 * 2. What data types do the columns have
 * 3. Which columns are dimensions and which metrics
 * 4. In what format are numbers given
 * 5. How would the data match against allowed BindingSets or a given BindingSet, 
 * we choose the BindingSet where most number of columns match and were all mandatory columns could be matched
 */
public class UploadHeuristic implements IUploadStep {

  public static String STEP_ID = "BCD_UPLOAD_HEURISTIC";

  public static final float DIST_THRESHOLD = 0.2f;
  public static final float ISNUM_THRESHOLD = 0.9f;
  public static final String PARAM_TARGETBS_SEPARATOR = ",";
  protected final UploadControl uc;
  protected final String uploadId;
  protected final String userId;
  protected final List<String> allowedTargetBs;

  /**
   * Constructor
   * @param uc
   * @param userId
   * @throws Exception
   */
  public UploadHeuristic(UploadControl uc, String userId) throws Exception {

    allowedTargetBs = new LinkedList<>();
    String targetBindingSets = uc.getTargetBs();
    if(targetBindingSets != null)
      allowedTargetBs.addAll(Arrays.asList(targetBindingSets.split(PARAM_TARGETBS_SEPARATOR)));
    allowedTargetBs.replaceAll(String::trim);

    this.userId = userId;
    this.uc = uc;
    this.uploadId = uc.getUploadId();
  }

  /**
   * Go
   * @throws Exception
   */
  @Override
  public void process() throws UploadException, SQLException {
    final int importColumnCount = uc.getImportColumnCount();
    Connection con = UploadControl.getManagedUploadConnection(STEP_ID);
    ResultSet frRs = null, cdRs = null;
    PreparedStatement frPs = null, cdPs = null;
    boolean hasHeaderRow = false;
    try {
      // Header row?
      // If the last cell in the first row is not numeric, we assume a header row
      // TODO Detect header row also, if first row has nonNumeric but second has
      SQLEngine frSqlEngine = new SQLEngine();
      String transFrSelectSql = frSqlEngine.transform(getSelectFirstRowSql(importColumnCount));
      frPs = con.prepareStatement(transFrSelectSql);
      frPs.setString(1, uploadId);
      frPs.setString(2, uploadId);
      frRs = frPs.executeQuery();
      if(frRs.next()) {
        String lastCellFirstRow = frRs.getString(frSqlEngine.getIndex("col_"+importColumnCount));
        if( ! NumberUtils.isNumber(lastCellFirstRow) ) {
          hasHeaderRow = true;

          // Set the columns header caption in mapping, unless its already given
          for(int bi = 0; bi < importColumnCount; bi++) {
            if( uc.getMappingBindingItemAttribute(bi, "caption") != null )
              uc.setMappingBindingItemAttribute(bi, "caption", frRs.getString(frSqlEngine.getIndex("col_"+(bi+1))));
          }
        }
      }
      uc.setHasHeaderRow(hasHeaderRow);
    } finally {
      Closer.closeAllSQLObjects(frRs, frPs);
    }

    try {
      // Data distinctness and isDim in mapping
      // If it is already given, we will not touch it though
      boolean dimIsAlreadySet = false;
      for(int b = 0; ! dimIsAlreadySet && b < importColumnCount; b++) {
        dimIsAlreadySet = uc.getMappingBindingItemAttribute(b, "isDim") != null
                          || uc.getMappingBindingItemAttribute(b, "dimId") != null;
      }
      SQLEngine cdSqlEngine = new SQLEngine();
      String transCdSelectSql = cdSqlEngine.transform(getSelectCntDistinctSql(importColumnCount));
      cdPs = con.prepareStatement(transCdSelectSql);
      cdPs.setString(1, uploadId);
      cdRs = cdPs.executeQuery();
      if(cdRs.next()) {
        // Update the columns header caption in mapping
        int rowsCnt = cdRs.getInt(1);
        for(int bi = 0; bi < importColumnCount; bi++) {
          int cntDist = cdRs.getInt(cdSqlEngine.getIndex("col_"+(bi+1)));
          float distRat = (float)cntDist / rowsCnt;
          int cntNonNumeric = cdRs.getInt(cdSqlEngine.getIndex("col_"+(bi+1)) + 2);
          float isNumRat = 1f - (float)cntNonNumeric / rowsCnt;
          uc.setMappingBindingItemAttribute(bi, "distinctRatio", Float.toString(distRat));
          uc.setMappingBindingItemAttribute(bi, "isNumRatio", Float.toString(isNumRat));
          // Treat this an all preceding columns as dim, unless that is already set
          if( bi < importColumnCount - 1
              && (distRat < DIST_THRESHOLD || isNumRat < ISNUM_THRESHOLD)
              && ! dimIsAlreadySet ) {
            for(int revBi = bi + 1; revBi >= 0; revBi--)
              uc.setMappingBindingItemAttribute(revBi, "isDim", "true");
          }
        }
      }

      // Try to map to a target BindingSet, if one is given
      // Otherwise we may have a list, which we try to match
      String bestMatchId = null;
      int bestMatchCnt = 0;
      for(String targetBsId: allowedTargetBs) {
        int matches = 0;
        StandardBindingSet targetBs = Bindings.getInstance().get(targetBsId, null);

        // Try matching column by column. If we fail to match a not-null column, we drop the BindingSet
        for(BindingItem bi: targetBs.getBindingItems()) {
          boolean biFound = false;
          for(int b = 0; b < importColumnCount; b++) {
            String normId = bi.getId().toLowerCase().replace("_","");
            String normCaption = bi.getCaption().toLowerCase().replace("_","").replace(" ","");
            String normImportCaption = uc.getMappingBindingItemAttribute(b, "caption").toLowerCase().replace("_","").replace(" ","");
            if(normId.equals(normImportCaption) || normCaption.equals(normImportCaption)) {
              biFound = true;
              break; // Next BindingItem
            }
          }
          // No match for current mandatory BindingItem, don't continue testing the current BindingSet
          if(biFound)
            matches++;
          else if(bi.isKey() || bi.getJDBCNullable() != null && bi.getJDBCNullable() != 1)
            break; // Next BindingItemSet
        }
        // For this BindingSet we found more matching BindingItems than before and also all mandatory fields could be matched -> be assumption so far
        if(matches > bestMatchCnt) {
          bestMatchCnt = matches;
          bestMatchId = targetBsId;
        }
      }
      uc.setTargetBs(bestMatchId);

      // Take over the knowledge about the columns from identified targetBs
      if(uc.getTargetBs() != null && uc.getTargetBs().split(" ").length == 1) {
        StandardBindingSet targetBs = Bindings.getInstance().get(uc.getTargetBs(), null);
        int foundMappings = 0;
        for(int b = 0; b < importColumnCount; b++) {
          for(BindingItem bi: targetBs.getBindingItems()) {
            String id = bi.getId();
            String normId = id.toLowerCase().replace("_","");
            String normCaption = bi.getCaption().toLowerCase().replace("_","").replace(" ","");
            String normImportCaption = uc.getMappingBindingItemAttribute(b, "caption").toLowerCase().replace("_","").replace(" ","");
            if(normId.equals(normImportCaption) || (! normCaption.isEmpty() && normCaption.equals(normImportCaption))) {
              uc.setMappingBindingItemAttribute(b, "id", id);
              uc.setMappingBindingItemAttribute(b, "caption", bi.getCaption());
              uc.setMappingBindingItemAttribute(b, Bindings.jdbcDataTypeNameAttribute, bi.getJDBCDataTypeName());
              uc.setMappingBindingItemAttribute(b, Bindings.keyAttributeName, bi.isKey() ? "1" : "0");
              uc.setMappingBindingItemAttribute(b, Bindings.jdbcNullableAttribute, bi.getJDBCNullable().toString());
              uc.setMappingBindingItemAttribute(b, Bindings.jdbcColumnDisplaySizeAttribute, bi.getJDBCColumnDisplaySize().toString());
              foundMappings++;
            }
          }
        }
        // no mappings found? Simply take over columns 1 ... n
        if (foundMappings == 0) {
          if (importColumnCount <= targetBs.getBindingItems().size() ) {
            int b = 0;
            for(BindingItem bi: targetBs.getBindingItems()) {
              if (b < importColumnCount) {
                String id = bi.getId();
                uc.setMappingBindingItemAttribute(b, "id", id);
                uc.setMappingBindingItemAttribute(b, "caption", bi.getCaption());
                uc.setMappingBindingItemAttribute(b, Bindings.jdbcDataTypeNameAttribute, bi.getJDBCDataTypeName());
                uc.setMappingBindingItemAttribute(b, Bindings.keyAttributeName, bi.isKey() ? "1" : "0");
                uc.setMappingBindingItemAttribute(b, Bindings.jdbcNullableAttribute, bi.getJDBCNullable().toString());
                uc.setMappingBindingItemAttribute(b, Bindings.jdbcColumnDisplaySizeAttribute, bi.getJDBCColumnDisplaySize().toString());
              }
              b++;
            }
          }
          else {
            throw new UploadException(STEP_ID, UploadException.Reason.MAPPING_FAILED); 
          }
        }
      }

      // Response
      uc.addStepResult(STEP_ID, ReturnCode.OK, new JsonLiteral().set("targetBs", bestMatchId).set("columnCount", bestMatchCnt).toJSONString());
    } catch(BindingException ex) {
      throw new UploadException(STEP_ID, UploadException.Reason.BINDINGSET_NOT_FOUND, ex);
    } finally {
      Closer.closeAllSQLObjects(cdRs, cdPs);
    }
    
  }

  /**
   * Helper returning a SELET for reading the imported columns of the first row
   * @param numCataCols
   * @return
   */
  private String getSelectFirstRowSql(final int numCataCols) {
    StringBuilder sql = new StringBuilder();
    sql.append("#set( $k = $bindings.bcd_dataupload_rowcol ) ");
    sql.append(" SELECT ");
    String sep = "";
    for(int c = 1; c <= numCataCols; c++ ) {
      sql.append(sep);
      sql.append("$k.col_").append(c);
      sep = ", ";
    }
    sql.append(" FROM $k.getTableReference()");
    sql.append(" WHERE $k.uploadId = ?  AND $k.rowNumber = (select min($k.rowNumber) from $k.getTableReference() WHERE $k.uploadId = ?)");
    return sql.toString();
  }

  /**
   * Helper returning a SELET for reading the distinct values vs total values
   * @param numCataCols
   * @return
   */
  private String getSelectCntDistinctSql(final int numCataCols) {
    StringBuilder sql = new StringBuilder();
    sql.append("#set( $k = $bindings.bcd_dataupload_rowcol ) ");
    sql.append(" SELECT count(*) ");
    for(int c = 1; c <= numCataCols; c++ ) {
      sql.append(", count(distinct($k.col_").append(c).append("))");
      sql.append(", count(LENGTH(TRIM(TRANSLATE($k.col_").append(c).append(", ' +-.0123456789', ' '))) )");
    }
    sql.append(" FROM $k.getTableReference()");
    sql.append(" WHERE $k.uploadId = ?");
    return sql.toString();
  }
}
