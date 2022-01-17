/*
  Copyright 2010-2017 BusinessCode GmbH, Germany
  All rights reserved.
  For terms of license, please contact BusinessCode GmbH, Germany
*/
package de.businesscode.bcdui.upload.data;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.util.UUID;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.TransformerException;

import org.apache.commons.io.IOUtils;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.sqlengine.SQLEngine;
import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.Utils;
import de.businesscode.util.jdbc.Closer;
import de.businesscode.util.xml.SecureXmlFactory;

/**
 * Used for accessing bcd_dataupload_control table
 */
public class UploadControl implements AutoCloseable
{
  // Binding Item as a child of BindingSet
  private static final String ELEMENT_NAME_BI = "C";

  public static String STEP_ID = "BCD_UPLOAD_INITIAL";

  /**
   * Possible return codes for steps
   */
  public enum ReturnCode {
    OK(0), INFO(2), WARN(4), ERROR(8), ABORT(16);

    private final int value;
    ReturnCode(final int newValue) { value = newValue; }
    public int getValue() { return value; }
  }

  /**
   * Constructor inserting an initial entry in bcd_dataupload_control
   * @param userId
   * @param sourceName
   * @param fileContent
   * @throws Exception
   */
  public UploadControl(String userId, String sourceName, String targetBs, InputStream fileContent) throws UploadException {
    this.userId = userId;
    if( sourceName.indexOf("\\") != -1 )
      sourceName = sourceName.substring(sourceName.lastIndexOf("\\") + 1 );
    if( sourceName.indexOf("/") != -1 )
      sourceName = sourceName.substring(sourceName.lastIndexOf("/") + 1 );
    this.sourceName = sourceName;
    // TODO make a difference between upload-reference(string,external) and uploadId (int, internal)?
    this.uploadId = Integer.toUnsignedString(UUID.randomUUID().hashCode());
    this.targetBs = targetBs;
    steps = new UploadControlSteps(uploadId);

    PreparedStatement stmt = null;
    FileInputStream fis = null;
    FileOutputStream fos = null;
    File tempFile = null;
    // TODO use db time?
    final Timestamp ts = new Timestamp(new java.util.Date().getTime());

    // This does manage the request as a transaction.
    SQLEngine sqlEngine = new SQLEngine();
    String transSql = sqlEngine.transform(insertSql);
    Connection con = getManagedUploadConnection(STEP_ID);
    try {
      DocumentBuilderFactory dbf = SecureXmlFactory.newDocumentBuilderFactory();
      dbf.setNamespaceAware(true);
      DocumentBuilder db = dbf.newDocumentBuilder();
      mapping = db.newDocument();
      Element bs = mapping.createElementNS(StandardNamespaceContext.BINDINGS_NAMESPACE, "BindingSet");
      mapping.appendChild(bs);

      // Create bcd_dataupload_control entry
      stmt = con.prepareStatement(transSql);
      int i = 1;
      stmt.setString(i++, uploadId.toString());
      stmt.setTimestamp(i++, ts);
      stmt.setString(i++, userId);
      stmt.setString(i++, sourceName);
      stmt.setString(i++, targetBs);

      // We need the full content here for length detection. To limit memory usage, we use a file
      tempFile = File.createTempFile("bcd-uploadfile-", "");
      fos = new FileOutputStream(tempFile);
      IOUtils.copy(fileContent, fos);

      // Stream the (converted) CSV to database
      fis = new FileInputStream(tempFile);
      stmt.setBinaryStream(i++, fis, tempFile.length());
      stmt.execute();

      // Create bcd_dataupload_controlstep entry
      UploadControlSteps steps = new UploadControlSteps(uploadId);
      UploadControlSteps.Step step = new UploadControlSteps.Step(STEP_ID, userId);
      steps.appendStep(step);

    } catch( SQLException | IOException | ParserConfigurationException ex ) {
      throw new UploadException(STEP_ID, UploadException.Reason.FAILED_CREATE_UPLOAD_CONTROL, ex);
    } finally {
      try {
        if (tempFile != null) { tempFile.delete(); }
        if (fis != null) { fis.close(); }
        if (fos != null) { fos.close(); }
      } catch (Exception e) {
        log.info("Exception while closing resources in file upload", e);
      }
      Closer.closeAllSQLObjects(stmt);
    }
  }

  /**
   * For reading and updating entries in bcd_dataupload_control
   * BLOB and uploadId are not updated
   * @param uploadId
   * @throws Exception
   */
  public UploadControl(String uploadId) throws UploadException {

    setUploadId(uploadId); // also sets changed flag!
    steps = new UploadControlSteps(uploadId);
    steps.refreshStep();

    SQLEngine sqlEngine = new SQLEngine();
    String transSql = sqlEngine.transform(selectSql);
    Connection con = getManagedUploadConnection(STEP_ID);
    PreparedStatement ps = null;
    ResultSet rs = null;

    try {
      // Create bcd_dataupload_control entry
      ps = con.prepareStatement(transSql);
      int i = 1;
      ps.setString(i++, uploadId);
      rs  = ps.executeQuery();
      if(rs.next()) {

        sourceName = rs.getString(sqlEngine.getIndex("sourceName"));
        userId = rs.getString(sqlEngine.getIndex("userId"));
        userComment = rs.getString(sqlEngine.getIndex("userComment"));
        importColumnCount = rs.getInt(sqlEngine.getIndex("columnCount"));
        importRowCount = rs.getInt(sqlEngine.getIndex("rowCount"));

        final String decimalSeparatorDb = rs.getString(sqlEngine.getIndex("decimalSeparator"));
        decimalSeparator = decimalSeparatorDb != null && !decimalSeparatorDb.isEmpty() ? decimalSeparatorDb.charAt(0): null;
        final String hasHeaderRowDb = rs.getString(sqlEngine.getIndex("hasHeaderRow"));
        hasHeaderRow = hasHeaderRowDb != null ? "1".equals(hasHeaderRowDb) : null;
        dateFormat = rs.getString(sqlEngine.getIndex("dateFormat"));

        final String delimiterDb = rs.getString(sqlEngine.getIndex("delimiter"));
        delimiter = delimiterDb != null && !delimiterDb.isEmpty() ? delimiterDb.charAt(0) : null;
        columnStartings = rs.getString(sqlEngine.getIndex("columnStartings"));
        encoding = rs.getString(sqlEngine.getIndex("encoding"));
        final String quoteCharDb = rs.getString(sqlEngine.getIndex("quoteChar"));
        quoteChar = quoteCharDb != null && !quoteCharDb.isEmpty() ? quoteCharDb.charAt(0): null;

        sheetName = rs.getString(sqlEngine.getIndex("sheetName"));

        targetBs = rs.getString(sqlEngine.getIndex("targetBs"));
        String mappingStr = rs.getString(sqlEngine.getIndex("mapping"));
        DocumentBuilderFactory dbf = SecureXmlFactory.newDocumentBuilderFactory();
        dbf.setNamespaceAware(true);
        DocumentBuilder db = dbf.newDocumentBuilder();
        if(mappingStr != null ) {
          mapping = db.parse(IOUtils.toInputStream(mappingStr, StandardCharsets.UTF_8));
        } else {
          mapping = db.newDocument();
          Element bs = mapping.createElementNS(StandardNamespaceContext.BINDINGS_NAMESPACE, "BindingSet");
          mapping.appendChild(bs);
        }

      } else {
        throw new UploadException(STEP_ID, UploadException.Reason.FAILED_UPLOAD_WRONG_UPLOAD_ID);
      }
    } catch( SQLException | ParserConfigurationException | SAXException | IOException ex ) {
      throw new UploadException(STEP_ID, UploadException.Reason.FAILED_LOAD_UPLOAD_CONTROL, ex);
    } finally {
      Closer.closeAllSQLObjects(rs, ps);
    }
  }

  /**
   * Update all values (except BLOB and uploadId) into bcd_dataupload_control
   */
  public void close() throws UploadException {
    
    if(! changed)
      return;
    

    SQLEngine sqlEngine = new SQLEngine();
    String transSql = sqlEngine.transform(updateSql);
    Connection con = getManagedUploadConnection(STEP_ID);

    try ( PreparedStatement ps = con.prepareStatement(transSql) ) {
      if(fileBlobIs != null)
        fileBlobIs.close();

      psSetOrNull(ps, sqlEngine.getIndex("sourceName"), sourceName);
      psSetOrNull(ps, sqlEngine.getIndex("userId"), userId);
      psSetOrNull(ps, sqlEngine.getIndex("userComment"), userComment);
      psSetOrNull(ps, sqlEngine.getIndex("columnCount"), importColumnCount);
      psSetOrNull(ps, sqlEngine.getIndex("rowCount"), importRowCount);

      psSetOrNull(ps, sqlEngine.getIndex("hasHeaderRow"), hasHeaderRow);
      psSetOrNull(ps, sqlEngine.getIndex("decimalSeparator"), decimalSeparator);
      psSetOrNull(ps, sqlEngine.getIndex("dateFormat"), dateFormat);

      psSetOrNull(ps, sqlEngine.getIndex("delimiter"), delimiter);
      psSetOrNull(ps, sqlEngine.getIndex("columnStartings"), columnStartings);
      psSetOrNull(ps, sqlEngine.getIndex("encoding"), encoding);
      psSetOrNull(ps, sqlEngine.getIndex("quoteChar"), quoteChar);

      psSetOrNull(ps, sqlEngine.getIndex("sheetName"), sheetName);
      psSetOrNull(ps, sqlEngine.getIndex("sheetRange"), sheetRange);

      psSetOrNull(ps, sqlEngine.getIndex("targetBs"), targetBs);
      psSetOrNull(ps, sqlEngine.getIndex("mapping"), Utils.serializeElement(mapping));

      // WHERE
      psSetOrNull(ps, sqlEngine.getIndex("uploadId"), uploadId);

      ps.executeUpdate();
    } catch (SQLException | TransformerException | IOException ex ) {
      throw new UploadException(STEP_ID, UploadException.Reason.FAILED_WRITE_UPLOAD_CONTROL, ex);
    } finally {
      steps.save();
    }
    
  }

  public String getMappingBindingItemAttribute(int idx, String name) {
    Element bs = (Element)mapping.getFirstChild();
    return ((Element)bs.getElementsByTagNameNS(StandardNamespaceContext.BINDINGS_NAMESPACE, ELEMENT_NAME_BI).item(idx)).getAttribute(name);
  }

  public void setMappingBindingItemAttribute(int idx, String name, String value) {
    Element bs = (Element)mapping.getFirstChild();
    ((Element)bs.getElementsByTagNameNS(StandardNamespaceContext.BINDINGS_NAMESPACE, ELEMENT_NAME_BI).item(idx)).setAttribute(name, value);
    changed = true;
  }

  /**
   * retrieve the position of mapped binding item
   * @param id
   * @return position (not index); 1-based of the mapping binding item
   */
  public int getMappingBindingItemPos(String id) {
    Node el = getMappingBindingItem(id);
    if(el==null) {
      return -1;
    }
    int sibs=0;
    while(el != null) {
      ++sibs;
      el = el.getPreviousSibling();
    }
    return sibs;
  }

  /**
   * looksup binding item by id
   * @param id
   * @return
   */
  private Element getMappingBindingItem(String id) {
    NodeList allEl = ((Element)mapping.getFirstChild()).getElementsByTagNameNS(StandardNamespaceContext.BINDINGS_NAMESPACE, ELEMENT_NAME_BI);
    for(int i=0,imax=allEl.getLength();i<imax;i++) {
      Element el = (Element)allEl.item(i);
      if(id.equals((el).getAttribute("id"))) {
        return el;
      }
    }
    return null;
  }

  private void psSetOrNull(PreparedStatement ps, int idx, String value) throws SQLException {
    if(value == null)
      ps.setNull(idx, Types.VARCHAR);
    else
      ps.setString(idx, value);
  }
  private void psSetOrNull(PreparedStatement ps, int idx, Character value) throws SQLException {
    if(value == null)
      ps.setNull(idx, Types.VARCHAR);
    else
      ps.setString(idx, value.toString());
  }
  private void psSetOrNull(PreparedStatement ps, int idx, Boolean value) throws SQLException {
    if(value == null)
      ps.setNull(idx, Types.VARCHAR);
    else
      ps.setString(idx, value ? "1" : "0" );
  }
  private void psSetOrNull(PreparedStatement ps, int idx, Integer value) throws SQLException {
    if(value == null)
      ps.setNull(idx, Types.INTEGER);
    else
      ps.setInt(idx, value);
  }

  /**
   * Returns a managed connection to the database where bcd_dataupload_control is located
   * TODO allow to provide a BS name to find the right dbSourcename
   * @return
   * @throws Exception
   */
  public static Connection getManagedUploadConnection(String stepId) throws UploadException {
    try {
      BindingSet bs = Bindings.getInstance().get("bcd_dataupload_control", null);
      Connection con = Configuration.getInstance().getManagedConnection(bs.getJdbcResourceName());
      return con;
    } catch (  Exception ex ) {
      throw new UploadException(stepId, UploadException.Reason.NO_DB_CONNECTION, ex);
    }
  }

  /**
   * insert a step result with extra JSON data
   *
   * @param stepId
   * @param rc
   * @param jsonData - a string in JSON notation
   * @throws UploadException
   */
  public void addStepResult(String stepId, UploadControl.ReturnCode rc, String jsonData) throws UploadException {
    UploadControlSteps.Step step = new UploadControlSteps.Step(stepId, userId, rc, jsonData);
    steps.appendStep(step);
  }

  /**
   * insert a step result with no custom data
   *
   * @param stepId
   * @param rc
   * @throws UploadException
   */
  public void addStepResult(String stepId, UploadControl.ReturnCode rc) throws UploadException {
    addStepResult(stepId, rc, null);
  }

  public String getUploadId() {
    return uploadId;
  }

  public void setUploadId(String uploadId) {
    this.uploadId = uploadId;
    changed = true;
  }

  public String getSourceName() {
    return sourceName;
  }

  public void setSourceName(String sourceName) {
    this.sourceName = sourceName;
    changed = true;
  }

  public String getUserId() {
    return userId;
  }

  public void setUserId(String userId) {
    this.userId = userId;
    changed = true;
  }

  public String getUserComment() {
    return userComment;
  }

  public void setUser_comment(String userComment) {
    this.userComment = userComment;
    changed = true;
  }

  public InputStream getFileBlobIs() throws Exception {
    if( fileBlobIs != null )
      return fileBlobIs;

    String sql = new SQLEngine().transform(selectBlobSql);
    PreparedStatement ps = null;
    ResultSet rs = null;
    try{
      ps = getManagedUploadConnection(STEP_ID).prepareStatement(sql);
      ps.setString(1, uploadId);
      rs = ps.executeQuery();
      if(rs.next()) {
        fileBlobIs = rs.getBinaryStream(1);
      }
    } finally {
      Closer.closeAllSQLObjects(rs, ps);
    }
    return fileBlobIs;
  }

  public void setFileBlobIs(InputStream fileBlobIs) {
    this.fileBlobIs = fileBlobIs;
    changed = true;
  }

  public Character getDelimiter() {
    return delimiter;
  }

  public void setDelimiter(Character delimiter) {
    this.delimiter = delimiter;
    changed = true;
  }

  public String getEncoding() {
    return encoding;
  }

  public void setEncoding(String encoding) {
    this.encoding = encoding;
    changed = true;
  }

  public Character getQuoteChar() {
    return quoteChar;
  }

  public void setQuoteChar(Character quoteChar) {
    this.quoteChar = quoteChar;
    changed = true;
  }

  public Character getDecimalSeparator() {
    return decimalSeparator;
  }

  public void setDecimalSeparator(Character decimalSeparator) {
    this.decimalSeparator = decimalSeparator;
    changed = true;
  }

  public Boolean hasHeaderRow() {
    return hasHeaderRow;
  }

  public void setHasHeaderRow(Boolean hasHeaderRow) {
    this.hasHeaderRow = hasHeaderRow;
    changed = true;
  }

  public String getDateFormat() {
    return dateFormat;
  }

  public void setDateFormat(String dateFormat) {
    this.dateFormat = dateFormat;
    changed = true;
  }

  public String getColumnStartings() {
    return columnStartings;
  }

  public void setColumnStartings(String columnStartings) {
    this.columnStartings = columnStartings;
    changed = true;
  }

  public int getImportColumnCount() {
    return importColumnCount;
  }

  public void setImportColumnCount(int columnCount) {
    this.importColumnCount = columnCount;
    // If we have not created matching BindingSet/BindingItems in mapping yet, we do it now
    Element bs = (Element)mapping.getFirstChild();
    if(bs.getChildNodes().getLength() != columnCount) {
      for(int b = 0; b < columnCount; b++ ) {
        Element bi = mapping.createElementNS(StandardNamespaceContext.BINDINGS_NAMESPACE, ELEMENT_NAME_BI);
        bs.appendChild(bi);
      }
    }
    changed = true;
  }
  
  public int getImportRowCount() {
    return importRowCount;
  }
  
  public void setImportRowCount(int rowCount) {
    this.importRowCount = rowCount;
    changed = true;
  }

  public String getTargetBs() {
    return targetBs;
  }

  public void setTargetBs(String targetBs) {
    this.targetBs = targetBs;
    changed = true;
  }

  public String getSheetName() {
    return sheetName;
  }

  public void setSheetName(String sheetName) {
    this.sheetName = sheetName;
    changed = true;
  }

  public String getSheetRange() {
    return sheetRange;
  }

  public void setSheetRange(String sheetRange) {
    this.sheetRange = sheetRange;
    changed = true;
  }


  private static final Logger log = LogManager.getLogger(UploadServlet.class);

  // Immediately known
  private String uploadId;
  private String sourceName;
  private String userId;
  private String userComment;
  private InputStream fileBlobIs = null;

  // Known after step into bcd_dataupload_rowcol
  private int importColumnCount;
  private int importRowCount;

  // Date format
  private Boolean hasHeaderRow;
  private Character decimalSeparator;
  private String dateFormat;

  // Only important for CSV
  private Character delimiter;
  private String columnStartings;
  private String encoding;
  private Character quoteChar;
  
  // Only important for Spreadsheets
  private String sheetName;
  private String sheetRange;

  // Target BindingSet
  private String targetBs;
  private Document mapping;

  private boolean changed = false;
  final UploadControlSteps steps;
  Boolean resStreamOpenIsCData = null;

  // Statement for initial inserting the uploaded file as BLOP; PostgreSQL does not like alias in INSERTs, so dont use them
  private static final String insertSql =
      "#set( $uc = $bindings.bcd_dataupload_control ) "+
      " INSERT INTO $uc.plainTableName" +
      "  ( $uc.uploadId-, $uc.ts-, $uc.userId-, $uc.sourceName-, $uc.targetBs-, $uc.fileBlob- ) " +
      "  VALUES (?, ?, ?, ?, ?, ?) ";

  private static final String selectSql =
      "#set( $uc = $bindings.bcd_dataupload_control ) "+
      " SELECT $uc.uploadId, $uc.sourceName, $uc.userId, $uc.userComment, $uc.rowCount, $uc.columnCount," +
      "  $uc.hasHeaderRow, $uc.decimalSeparator, $uc.dateFormat, " +
      "  $uc.delimiter, $uc.columnStartings, $uc.encoding, $uc.quoteChar, " +
      "  $uc.sheetName, $uc.sheetRange, " +
      "  $uc.targetBs, $uc.mapping, " +
      "  $uc.fileBlob " +
      "  FROM $uc " +
      "  WHERE $uc.uploadId = ? ";

  private static final String selectBlobSql =
      "#set( $uc = $bindings.bcd_dataupload_control ) "+
      " SELECT $uc.fileBlob " +
      "  FROM $uc " +
      "  WHERE $uc.uploadId = ? ";

  // dont use aliases due to PostgreSQL
  private static final String updateSql =
      "#set( $uc = $bindings.bcd_dataupload_control ) "+
      " UPDATE $uc.plainTableName" +
      "  SET $uc.sourceName- = ?, $uc.userId- = ?, $uc.userComment- = ?, $uc.rowCount- = ?, $uc.columnCount- = ?," +
      "  $uc.hasHeaderRow- = ?, $uc.decimalSeparator- = ?, $uc.dateFormat- = ?, " +
      "  $uc.delimiter- = ?, $uc.columnStartings- = ?, $uc.encoding- = ?, $uc.quoteChar- = ?, " +
      "  $uc.sheetName- = ?, $uc.sheetRange- = ?, " +
      "  $uc.targetBs- = ?, $uc.mapping- = ? " +
      "  WHERE $uc.uploadId- = ? ";

}
