/*
  Copyright 2010-2017 BusinessCode GmbH, Germany

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
package de.businesscode.bcdui.wrs.export;

import java.sql.Types;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Stack;
import java.util.Vector;
import java.util.stream.Collectors;
import javax.xml.namespace.QName;
import javax.xml.stream.events.Attribute;
import javax.xml.stream.events.StartElement;
import javax.xml.stream.events.XMLEvent;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.poi.hssf.util.HSSFColor;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.AreaReference;
import org.apache.poi.ss.util.CellReference;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFTable;
import org.openxmlformats.schemas.spreadsheetml.x2006.main.CTTable;

/**
 * Base class for writing a Wrs or a WrsRequest to an Excel sheet
 *
 */
abstract public class AbstractExcelSheetDataWriter
{
  // Provided by caller
  protected final Workbook workbook;
  protected final Stack<String> pathStack;
  protected final boolean usingTemplate;

  // May be set by optional rnd:Wrs2Excel
  protected static final String defaultSheetName = "Exported Data";
  protected String sheetName;
  protected int startRowIdx = 0, startColIdx = 0;

  protected int currentColIdx = 0, currentRowIdx = 0;
  protected Sheet sheet = null;
  protected List<Map<String, String>> wrsHeaderCols = new LinkedList<Map<String, String>>();
  protected Vector<Integer> colTypes = new Vector<>();

  private final CellStyle cellStyleDate, cellStyleTimestamp, cellStyleHeader;

  // Some constants
  protected Logger log = LogManager.getLogger(Wrs2Excel.class.getName());
  private final SimpleDateFormat SDF_TIMESTAMP = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss"); // Not threadsafe
  private final SimpleDateFormat SDF_YYYYMMDD = new SimpleDateFormat("yyyy-MM-dd");

  public AbstractExcelSheetDataWriter( Workbook workbook, Stack<String> pathStack, boolean includeHeader ) 
  {
    this.workbook = workbook;
    this.pathStack = pathStack;
    this.usingTemplate = includeHeader;
    sheetName = defaultSheetName;
    cellStyleHeader = workbook.createCellStyle();
    cellStyleHeader.setFillForegroundColor( new HSSFColor.GREY_25_PERCENT().getIndex() );
    cellStyleHeader.setFillPattern(CellStyle.SOLID_FOREGROUND);
    Font headerFont = workbook.createFont();
    headerFont.setBold(true);
    cellStyleHeader.setFont(headerFont);
    cellStyleDate = workbook.createCellStyle();
    cellStyleDate.setDataFormat( workbook.getCreationHelper().createDataFormat().getFormat("yyyy-mm-dd") );
    cellStyleTimestamp = workbook.createCellStyle();
    cellStyleTimestamp.setDataFormat( workbook.getCreationHelper().createDataFormat().getFormat("yyyy-mm-dd hh:mm:ss") );
  }
  
  /**
   * To be called after it is guaranteed that rnd:Wrs2Excel, if given, is already read
   * 
   * @param sheetName
   * @throws ExcelWriterException 
   */
  protected void openSheet() throws ExcelWriterException {
    log.trace("opening sheet: '" + sheetName + "'");
    // Especially useful, if we have no template but just created an empty sheet
    if( workbook.getNumberOfSheets() == 0 || workbook.getSheet(sheetName) == null )
      workbook.createSheet(sheetName);
    sheet = workbook.getSheet(sheetName);
    sheet.setForceFormulaRecalculation(true);
    resetRowColCursor();
  }

  /**
   * @return existing or created Cell at row / col
   * @throws ExcelWriterException 
   */
  protected Cell getCellAt( int row, int col ) {
    Row currentRow = sheet.getRow(row);
    if (currentRow == null) {
      currentRow = sheet.createRow(row);
    }

    Cell cell = currentRow.getCell(col);
    if (cell == null) {
      cell = currentRow.createCell(col);
    }
    return cell;
  }
  
  /**
   * @return existing or created Cell at cursor
   * @throws ExcelWriterException 
   */
  protected Cell getCellAtCursor() throws ExcelWriterException {

    return getCellAt(currentRowIdx, currentColIdx);
  }


  /**
   * moves cursor to next column
   * @throws ExcelWriterException 
   */
  protected void moveToNextColumn() throws ExcelWriterException {
    if (sheet == null) {
      throw new ExcelWriterException("No sheet opened.");
    }
    ++currentColIdx;
  }

  /**
   * moves cursor to next row and resets column cursor via #{@link #resetColCursor()}, no new row or column is inserted into excel sheet at this operation, till
   * {@link de.businesscode.bcdui.wrs.export.Wrs2Excel.WrsContainerParser#writeCell(String, Map)}
   * @throws ExcelWriterException 
   */
  protected void moveToNextLine() throws ExcelWriterException {
    moveToNextRow();
    resetColCursor();
  }

  /**
   * moves cursor to next row
   * @throws ExcelWriterException 
   */
  private void moveToNextRow() throws ExcelWriterException {
    if (sheet == null) {
      throw new ExcelWriterException("No sheet opened.");
    }
    ++currentRowIdx;
  }


  /**
   * reset column cursor to {@link #setStartColIdx(int)} , such as {@link de.businesscode.bcdui.wrs.export.Wrs2Excel.WrsContainerParser#writeCell(String, Map)} would start writing with a first column
   */
  protected void resetColCursor() {
    currentColIdx = startColIdx;
  }

  /**
   * {@link #resetColCursor()}, {@link #resetRowCursor()}
   */
  protected void resetRowColCursor() {
    resetRowCursor();
    resetColCursor();
  }

  /**
   * resets offset indexes for row, col and resets cursors
   */
  protected void resetRowColStartIdx() {
    setStartRowIdx(0);
    setStartColIdx(0);
  }

  /**
   * reset row cursor to {@link #setStartRowIdx(int)} , such as {@link #moveToNextRow()} would start with a first row
   */
  protected void resetRowCursor() {
    currentRowIdx = startRowIdx;
  }

  /**
   * set column start index and reset column cursor to it via {@link #resetColCursor()}
   * 
   * @param startColIdx
   */
  protected void setStartColIdx(int startColIdx) {
    this.startColIdx = startColIdx;
    resetColCursor();
  }

  /**
   * set row start index and reset row cursor to it via {@link #resetRowCursor()}
   * 
   * @param startRowIdx
   */
  protected void setStartRowIdx(int startRowIdx) {
    this.startRowIdx = startRowIdx;
    resetRowCursor();
  }

  protected void writeHeaderCell(String cellValue) throws ExcelWriterException {
    Cell cell = getCellAtCursor();
    cell.setCellStyle( cellStyleHeader );
    cell.setCellValue( cellValue );
  }
  
  
  /**
   * write cell at current cursor applying cell type from given property-map containing attributes from wrs:Header/wrs:Columns/wrs:C
   * 
   * @param cellValue
   * @throws ExcelWriterException 
   */
  protected void writeCell(String cellValue) throws ExcelWriterException {

    // null value handling
    if (cellValue == null || cellValue.isEmpty()) {
      return;
    }
    
    Cell cell = getCellAtCursor();

    // BOOL, DATE, DOUBLE, STR
    Integer colType = colTypes.get(currentColIdx - startColIdx);

    switch ( colType ) {
    case Types.DATE:
    case Types.TIMESTAMP:
      final SimpleDateFormat formatter;
      final CellStyle cellStyle;
      if ( Types.DATE == colType ) {
        formatter = SDF_YYYYMMDD;
        cellStyle = cellStyleDate;
      } else {
        // TIMESTAMP
        formatter = SDF_TIMESTAMP;
        cellStyle = cellStyleTimestamp;
      }
      cell.setCellStyle(cellStyle);
      try {
        cell.setCellValue(formatter.parse(cellValue));
      } catch (ParseException e) {
        throw new ExcelWriterException("Failed to parse to java.util.Date '" + cellValue + "'.", e);
      }
      break;
    case Types.BOOLEAN:
      cell.setCellValue(Boolean.valueOf(cellValue));
      break;
    case Types.VARCHAR:
    case Types.NVARCHAR:
    case Types.LONGVARCHAR:
    case Types.LONGVARBINARY:
    case Types.LONGNVARCHAR:
    case Types.CHAR:
    case Types.NCHAR:
    case Types.CLOB:
    case Types.NCLOB:
    case Types.SQLXML:
      cell.setCellValue(cellValue);
      break;
    case Types.NUMERIC:
    case Types.DECIMAL:
    case Types.DOUBLE:
    case Types.FLOAT:
    case Types.INTEGER:
    case Types.REAL:
    case Types.SMALLINT:
    case Types.TINYINT:
    case Types.BIT:
      cell.setCellValue(Double.valueOf(cellValue));
      break;
    default:
      cell.setCellValue(cellValue);
    }
  }

  /**
   * Evaluate optional information provided as a wrs:Wrs2ExcelInfo
   * @param element
   */
  protected void wrs2ExcelInfo( StartElement element ) {
    log.trace("collecting Wrs2Excel info");
    String providedSheetName = attr(element, "sheetName");
    if( !providedSheetName.isEmpty() )
      sheetName = providedSheetName;
    // optional: startRowIdx, startColIdx
    String v = attr(element, "startRowIdx");
    if (!v.isEmpty()) {
       setStartRowIdx( Integer.valueOf(v) );
    }
    v = attr(element, "startColIdx");
    if (!v.isEmpty()) {
      setStartColIdx( Integer.valueOf(v) );
    }
  }

  /**
   * reads attribute
   * 
   * @param element
   * @param attrName
   * @return empty string or attribute value
   */
  protected String attr(StartElement element, String attrName) {
    Attribute attr = element.getAttributeByName(new QName("", attrName));
    return attr == null ? "" : attr.getValue();
  }


  protected String getPath() {
    return pathStack.stream().collect(Collectors.joining("/"));
  }

  /**
   * call on every new event
   * 
   * @param event
   */
  protected XMLEvent track(XMLEvent event) {
    switch (event.getEventType()) {
    case XMLEvent.START_ELEMENT:
      pathStack.push(event.asStartElement().getName().getLocalPart());
      break;
    case XMLEvent.END_ELEMENT:
      pathStack.pop();
      break;
    }
    return event;
  }

  /**
   * Tasks to be done after the data is inserted
   */
  protected void cleanup() {
    XSSFSheet xssfSheet = (XSSFSheet) sheet;
    List<XSSFTable> tables = xssfSheet.getTables();
    if (tables == null || tables.size() != 1)
      return;
    for( XSSFTable table: tables ) {
      CellReference start = table.getStartCellReference();
      CellReference end = table.getEndCellReference();
      
      if( start.getRow() <= startRowIdx && start.getCol() <= startColIdx && end.getRow() >= startRowIdx && end.getCol() >= startColIdx ) {
        alignTableRange(table);
        break;
      }
    }
  }
  
  /**
   * aligns Table range in accordance to sheet range, in case Table is at A1
   * TODO instead of applying this (only) to the first table on each sheet, AbstractExcelSheetDataWriter should handle that
   * if it exports into the top-left of a table
   * 
   * @param table
   */
  private void alignTableRange(XSSFTable table) {
    CellReference cellRef = table.getStartCellReference();
    if (cellRef.getCol() == cellRef.getRow() && cellRef.getRow() == 0) {
      XSSFSheet sheet = table.getXSSFSheet();
      // get sheets last row+col, the last col is derived from assumed header
      String areaReference = new AreaReference(new CellReference(0, 0), new CellReference(sheet.getLastRowNum(), sheet.getRow(0).getLastCellNum() - 1)).formatAsString();
      log.trace("found table in sheet '" + sheet.getSheetName() + "', align its range to " + areaReference);
      sheet.getCTWorksheet().getDimension().setRef(areaReference);
      CTTable ctTable = table.getCTTable();
      ctTable.setRef(areaReference);
      if (ctTable.getAutoFilter() != null) {
        // also adjust range of autofilter, if enabled
        ctTable.getAutoFilter().setRef(areaReference);
      }
    }
  }

}
