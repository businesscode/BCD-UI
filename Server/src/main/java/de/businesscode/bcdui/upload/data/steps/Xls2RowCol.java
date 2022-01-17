package de.businesscode.bcdui.upload.data.steps;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;
import org.apache.poi.hssf.eventusermodel.EventWorkbookBuilder.SheetRecordCollectingListener;
import org.apache.poi.hssf.eventusermodel.FormatTrackingHSSFListener;
import org.apache.poi.hssf.eventusermodel.HSSFEventFactory;
import org.apache.poi.hssf.eventusermodel.HSSFListener;
import org.apache.poi.hssf.eventusermodel.HSSFRequest;
import org.apache.poi.hssf.eventusermodel.MissingRecordAwareHSSFListener;
import org.apache.poi.hssf.eventusermodel.dummyrecord.LastCellOfRowDummyRecord;
import org.apache.poi.hssf.eventusermodel.dummyrecord.MissingCellDummyRecord;
import org.apache.poi.hssf.model.HSSFFormulaParser;
import org.apache.poi.hssf.record.BOFRecord;
import org.apache.poi.hssf.record.BlankRecord;
import org.apache.poi.hssf.record.BoolErrRecord;
import org.apache.poi.hssf.record.BoundSheetRecord;
import org.apache.poi.hssf.record.FormulaRecord;
import org.apache.poi.hssf.record.LabelRecord;
import org.apache.poi.hssf.record.LabelSSTRecord;
import org.apache.poi.hssf.record.NoteRecord;
import org.apache.poi.hssf.record.NumberRecord;
import org.apache.poi.hssf.record.RKRecord;
import org.apache.poi.hssf.record.Record;
import org.apache.poi.hssf.record.SSTRecord;
import org.apache.poi.hssf.record.StringRecord;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.poifs.filesystem.POIFSFileSystem;

/**
 * originated from org.apache.poi.hssf.eventusermodel.examples.XLS2CSVmra class (
 * https://svn.apache.org/repos/asf/poi/trunk/src/examples/src/org/apache/poi/hssf/eventusermodel/examples/XLS2CSVmra.java ) and provide api for streamin
 * row/cell read. processing
 */
abstract class Xls2RowCol {
  private Logger logger = LogManager.getLogger(getClass());
  private int minColumns;
  private POIFSFileSystem fs;

  private int lastRowNumber;
  private int lastColumnNumber;

  /** Should we output the formula, or the value it has? */
  private boolean outputFormulaValues = true;

  /** For parsing Formulas */
  private SheetRecordCollectingListener workbookBuildingListener;
  private HSSFWorkbook stubWorkbook;

  // Records we pick up as we process
  private SSTRecord sstRecord;
  private FormatTrackingHSSFListener formatListener;

  /** So we known which sheet we're on */
  private int sheetIndex = -1;
  private BoundSheetRecord[] orderedBSRs;
  private List<BoundSheetRecord> boundSheetRecords = new ArrayList<>();
  private final String processSheetName;
  private int processSheetIdx = -1;

  // For handling formulas with string results
  private int nextRow;
  private int nextColumn;
  private boolean outputNextStringRecord;

  /**
   * Creates a new XLS parser.
   * 
   * @param fs
   *          The POIFSFileSystem to process
   * @param minColumns
   *          The minimum number of columns to output, or -1 for no minimum
   * @param sheetName
   *          to process or null which process the first one
   */
  public Xls2RowCol(POIFSFileSystem fs, int minColumns, String sheetName) {
    this.fs = fs;
    this.minColumns = minColumns;
    this.processSheetName = sheetName;
  }

  /**
   * Initiates the processing of the XLS file to CSV
   */
  public void process() throws IOException {
    RecordProcessor recordProcessor = new RecordProcessor();
    MissingRecordAwareHSSFListener listener = new MissingRecordAwareHSSFListener(recordProcessor);
    formatListener = new FormatTrackingHSSFListener(listener);

    HSSFEventFactory factory = new HSSFEventFactory();
    HSSFRequest request = new HSSFRequest();

    if (outputFormulaValues) {
      request.addListenerForAllRecords(formatListener);
    } else {
      workbookBuildingListener = new SheetRecordCollectingListener(formatListener);
      request.addListenerForAllRecords(workbookBuildingListener);
    }

    factory.processWorkbookEvents(request, fs);
  }

  abstract void startRow(int rowIdx);

  abstract void endRow(int rowIdx);

  abstract void nextCell(String value);

  private class RecordProcessor implements HSSFListener {
    /**
     * Main HSSFListener method, processes events, and outputs the CSV as the file is processed.
     */
    @Override
    public void processRecord(Record record) {
      if (processSheetIdx > -1 && sheetIndex != processSheetIdx) {
        return; // skip sheet
      }
      int thisRow = -1;
      int thisColumn = -1;
      String thisStr = null;

      switch (record.getSid()) {
      case BoundSheetRecord.sid:
        boundSheetRecords.add((BoundSheetRecord) record);
        break;
      case BOFRecord.sid:
        BOFRecord br = (BOFRecord) record;
        if (br.getType() == BOFRecord.TYPE_WORKSHEET) {
          // Create sub workbook if required
          if (workbookBuildingListener != null && stubWorkbook == null) {
            stubWorkbook = workbookBuildingListener.getStubHSSFWorkbook();
          }

          // Output the worksheet name
          // Works by ordering the BSRs by the location of
          //  their BOFRecords, and then knowing that we
          //  process BOFRecords in byte offset order
          sheetIndex++;
          if (orderedBSRs == null) {
            orderedBSRs = BoundSheetRecord.orderByBofPosition(boundSheetRecords);
          }
          String sheetName = orderedBSRs[sheetIndex].getSheetname();
          if (processSheetName == null || processSheetName.equals(sheetName)) { // set processSheetIdx either to 0 (default, if no processSheetName supplied) or if sheet name matches
            processSheetIdx = sheetIndex;
            logger.trace("located sheet '" + processSheetName + "' at index " + processSheetIdx);
          }
        }
        break;

      case SSTRecord.sid:
        sstRecord = (SSTRecord) record;
        break;

      case BlankRecord.sid:
        BlankRecord brec = (BlankRecord) record;

        thisRow = brec.getRow();
        thisColumn = brec.getColumn();
        thisStr = "";
        break;
      case BoolErrRecord.sid:
        BoolErrRecord berec = (BoolErrRecord) record;

        thisRow = berec.getRow();
        thisColumn = berec.getColumn();
        thisStr = "";
        break;

      case FormulaRecord.sid:
        FormulaRecord frec = (FormulaRecord) record;

        thisRow = frec.getRow();
        thisColumn = frec.getColumn();

        if (outputFormulaValues) {
          if (Double.isNaN(frec.getValue())) {
            // Formula result is a string
            // This is stored in the next record
            outputNextStringRecord = true;
            nextRow = frec.getRow();
            nextColumn = frec.getColumn();
          } else {
            thisStr = formatListener.formatNumberDateCell(frec);
          }
        } else {
          thisStr = HSSFFormulaParser.toFormulaString(stubWorkbook, frec.getParsedExpression());
        }
        break;
      case StringRecord.sid:
        if (outputNextStringRecord) {
          // String for formula
          StringRecord srec = (StringRecord) record;
          thisStr = srec.getString();
          thisRow = nextRow;
          thisColumn = nextColumn;
          outputNextStringRecord = false;
        }
        break;

      case LabelRecord.sid:
        LabelRecord lrec = (LabelRecord) record;

        thisRow = lrec.getRow();
        thisColumn = lrec.getColumn();
        thisStr = lrec.getValue();
        break;
      case LabelSSTRecord.sid:
        LabelSSTRecord lsrec = (LabelSSTRecord) record;

        thisRow = lsrec.getRow();
        thisColumn = lsrec.getColumn();
        if (sstRecord == null) {
          throw new RuntimeException("No SST Record, can't identify string");
        } else {
          thisStr = sstRecord.getString(lsrec.getSSTIndex()).toString();
        }
        break;
      case NoteRecord.sid:
        if (true)
          throw new RuntimeException("not implemented");
        //        NoteRecord nrec = (NoteRecord) record;
        //
        //        thisRow = nrec.getRow();
        //        thisColumn = nrec.getColumn();
        // // TODO: Find object to match nrec.getShapeId()
        //thisStr = '"' + "(TODO)" + '"';
        //        break;
      case NumberRecord.sid:
        NumberRecord numrec = (NumberRecord) record;

        thisRow = numrec.getRow();
        thisColumn = numrec.getColumn();

        // Format
        thisStr = formatListener.formatNumberDateCell(numrec);
        break;
      case RKRecord.sid:
        if (true)
          throw new RuntimeException("not implemented");
        //        RKRecord rkrec = (RKRecord) record;
        //
        //        thisRow = rkrec.getRow();
        //        thisColumn = rkrec.getColumn();
        //        //thisStr = '"' + "(TODO)" + '"';
      default:
        break;
      }

      // Handle new row
      if (thisRow != -1 && thisRow != lastRowNumber) {
        lastColumnNumber = -1;
        startRow(lastRowNumber);
      }

      // Handle missing column
      if (record instanceof MissingCellDummyRecord) {
        MissingCellDummyRecord mc = (MissingCellDummyRecord) record;
        thisRow = mc.getRow();
        thisColumn = mc.getColumn();
        thisStr = "";
      }

      // If we got something to print out, do so
      if (thisStr != null) {
        nextCell(thisStr.isEmpty() ? null : thisStr); // write NULLs for empty strings (not handled before)
      }

      // Update column and row count
      if (thisRow > -1)
        lastRowNumber = thisRow;
      if (thisColumn > -1)
        lastColumnNumber = thisColumn;

      // Handle end of row
      if (record instanceof LastCellOfRowDummyRecord) {
        // Print out any missing commas if needed
        if (minColumns > 0) {
          // Columns are 0 based
          if (lastColumnNumber == -1) {
            lastColumnNumber = 0;
          }
          for (int i = lastColumnNumber; i < (minColumns); i++) {
            nextCell(null);
          }
        }

        // We're onto a new row
        lastColumnNumber = -1;

        // End the row
        endRow(lastRowNumber);
      }
    }
  }
}