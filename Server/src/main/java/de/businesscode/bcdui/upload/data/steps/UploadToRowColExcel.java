/*
  Copyright 2010-2017 BusinessCode GmbH, Germany
  All rights reserved.
  For terms of license, please contact BusinessCode GmbH, Germany
*/
package de.businesscode.bcdui.upload.data.steps;

import java.io.IOException;
import java.io.InputStream;
import java.sql.SQLException;
import java.util.Locale;

import javax.xml.parsers.ParserConfigurationException;

import org.apache.poi.openxml4j.exceptions.OpenXML4JException;
import org.apache.poi.openxml4j.opc.OPCPackage;
import org.apache.poi.poifs.filesystem.POIFSFileSystem;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.util.CellAddress;
import org.apache.poi.ss.util.CellReference;
import org.apache.poi.util.XMLHelper;
import org.apache.poi.ooxml.util.SAXHelper;
import org.apache.poi.xssf.eventusermodel.ReadOnlySharedStringsTable;
import org.apache.poi.xssf.eventusermodel.XSSFReader;
import org.apache.poi.xssf.eventusermodel.XSSFSheetXMLHandler;
import org.apache.poi.xssf.eventusermodel.XSSFSheetXMLHandler.SheetContentsHandler;
import org.apache.poi.xssf.model.StylesTable;
import org.apache.poi.xssf.usermodel.XSSFComment;
import org.xml.sax.ContentHandler;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;
import org.xml.sax.XMLReader;

import de.businesscode.bcdui.upload.data.UploadControl;

/**
 * Responsible to read an Excel xlsx file from a BLOB and write it row and cell to bcd_dataupload_rowcol
 */
public class UploadToRowColExcel implements IUploadToRowColParser, SheetContentsHandler {

  public static final String DATE_FORMAT        = "yyyy-MM-dd";
  public static final char EXCEL_CSV_DELIMITER  = ';';
  public static final Locale DATA_FORMAT_LOCALE = Locale.ENGLISH;

  private int currentRow = -1;
  private int currentCol = -1;
  private String startCell = null;
  private String endCell = null;

  protected final UploadControl uc;
  protected final UploadToRowCol uploadToRowCol;

  /**
   * Constructor
   * @param uc
   * @param uploadToRowCol
   * @throws Exception
   */
  public UploadToRowColExcel(UploadControl uc, UploadToRowCol uploadToRowCol) throws Exception {
    this.uc = uc;
    this.uploadToRowCol = uploadToRowCol;
    uc.setDelimiter(EXCEL_CSV_DELIMITER);
  }

  /**
   * Open the file with the given uploadId, split it into rows and cells and write it to bcd_dataupload_staging
   */
  public void process() throws Exception {
    try {
      if (uc.getSourceName().toLowerCase().endsWith(".xlsx")) { // XSSF
        try (OPCPackage p = OPCPackage.open(uc.getFileBlobIs())) {
          process(p);
        }
      } else { // HSSF
        try (InputStream is = uc.getFileBlobIs()) {
          // create a new org.apache.poi.poifs.filesystem.Filesystem
          try (POIFSFileSystem poifs = new POIFSFileSystem(is)) {
            process(poifs);
          }
        }
      }
    } finally {
      uc.setDateFormat(DATE_FORMAT);
      uc.setSheetRange(startCell + ":" + endCell);
      uploadToRowCol.endFile();
    }
  }


  /**
   * Excel file does not include empty rows but they are detected by their row number
   * @param number
   * @throws Exception
   */
  private void outputMissingRows(int number) throws Exception {
    for (int i=0; i<number; i++) {
      uploadToRowCol.startLine();
      uploadToRowCol.endLine();
    }
  }

  /**
   * New Row
   */
  @Override
  public void startRow(int rowNum) throws RuntimeException {
    try {
      // If there were gaps, output the missing rows
      outputMissingRows(rowNum-currentRow-1);
      // Prepare for this row
      currentRow = rowNum;
      currentCol = -1;
      uploadToRowCol.startLine();
    } catch (Exception e) {
      // SheetContentsHandler does only allow RuntimeException
      throw new RuntimeException(e);
    }
  }

  /**
   * Callback for row finish
   */
  @Override
  public void endRow(int rowNum) throws RuntimeException {
    try {
      uploadToRowCol.endLine();
    } catch (Exception e) {
      // SheetContentsHandler does only allow RuntimeException
      throw new RuntimeException(e);
    }
  }

  /**
   * Callback for a detected cell
   * Skipped cells will be added, 
   */
  @Override
  public void cell(String cellReference, String formattedValue, XSSFComment comment) throws RuntimeException {

    // Gracefully handle missing CellRef here in a similar way as XSSFCell does
    if(cellReference == null) {
      cellReference = new CellAddress(currentRow, currentCol).formatAsString();
    }
    // TODO Set startCell and endCell correct even if first/last cell is not filled
    if(startCell == null ) {
      startCell = cellReference;
    }
    endCell = cellReference;

    // Did we miss any cells?
    int thisCol = (new CellReference(cellReference)).getCol();
    int missedCols = thisCol - currentCol - 1;
    try {
      for (int i=0; i<missedCols; i++) {
        uploadToRowCol.nextCell(null);
      }
      currentCol = thisCol;
      uploadToRowCol.nextCell(formattedValue);
    } catch (SQLException e) {
      // We can only throw a RuntimeException here because SheetContentsHandler does not allow full Exceptions
      throw new RuntimeException(e);
    }
  }

  @Override
  public void headerFooter(String text, boolean isHeader, String tagName) {
  }

  /**
   * processes XLS Workbook
   * 
   * @param poifs
   * @throws IOException
   */
  private void process(POIFSFileSystem poifs) throws IOException {
    new Xls2RowCol(poifs, -1, uc.getSheetName()) {
      @Override
      void endRow(int rowIdx) {
        UploadToRowColExcel.this.endRow(rowIdx);
      }

      @Override
      void startRow(int rowIdx) {
        UploadToRowColExcel.this.startRow(rowIdx);
      }

      @Override
      void nextCell(String value) {
        try {
          uploadToRowCol.nextCell(value);
        } catch (SQLException e) {
          throw new RuntimeException(e);
        }
      }

    }.process();
  }

  /**
   * Processes whole workbook, currently only the first sheet is read
   * @param xlsxPackage
   * @throws IOException
   * @throws OpenXML4JException
   * @throws SAXException
   */
  public void process(OPCPackage xlsxPackage) throws IOException, OpenXML4JException, SAXException, ParserConfigurationException {
    ReadOnlySharedStringsTable strings = new ReadOnlySharedStringsTable(xlsxPackage);
    XSSFReader xssfReader = new XSSFReader(xlsxPackage);
    StylesTable styles = xssfReader.getStylesTable();
    XSSFReader.SheetIterator iter = (XSSFReader.SheetIterator) xssfReader.getSheetsData();
    while (iter.hasNext()) {
      // TODO allow to set a sheet per user
      InputStream stream = iter.next();

      // If a sheet name is given just import that one
      if(uc.getSheetName() != null) {
        if(uc.getSheetName().equals(iter.getSheetName())) {
          processSheet(styles, strings, this, stream);
          stream.close();
          break;
        }
      }
      // Otherwise the very first one
      // TODO select sheet with most data instead of the first one
      else {
        uc.setSheetName(iter.getSheetName());
        processSheet(styles, strings, this, stream);
        stream.close();
        break;
      }
    }
  }

  /**
   * Process a single sheet. Currently all data of the sheet is read
   * TODO handle merged cells
   * @param styles
   * @param strings
   * @param sheetHandler
   * @param sheetInputStream
   * @throws IOException
   * @throws SAXException
   */
  public void processSheet( StylesTable styles, ReadOnlySharedStringsTable strings, SheetContentsHandler sheetHandler, InputStream sheetInputStream) 
      throws IOException, SAXException, ParserConfigurationException {
    
    /**
     * We convert all Excel dates into ISO format and output data in english format
     */
    DataFormatter formatter = new DataFormatter(Locale.ENGLISH) {
      /**
       * Our data formatter does always write DATE_FORMAT
       * TODO Date+Time information
       */
      @Override
      public String formatRawCellContents(double value, int formatIndex, String formatString, boolean use1904Windowing) {
        if( DateUtil.isADateFormat(formatIndex,formatString) )
          formatString = DATE_FORMAT;
        return super.formatRawCellContents(value, formatIndex, formatString, use1904Windowing);
      }
    };

    /**
     * Parse the file and output with the help of sheetHandler (which is this)
     */
    InputSource sheetSource = new InputSource(sheetInputStream);
    XMLReader sheetParser = XMLHelper.newXMLReader(); 
    ContentHandler handler = new XSSFSheetXMLHandler( styles, null, strings, sheetHandler, formatter, false);
    sheetParser.setContentHandler(handler);
    sheetParser.parse(sheetSource);
  }
}
