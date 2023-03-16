/*
  Copyright 2010-2023 BusinessCode GmbH, Germany
  All rights reserved.
  For terms of license, please contact BusinessCode GmbH, Germany
*/
package de.businesscode.bcdui.upload.data.steps;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.UnsupportedEncodingException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.regex.Pattern;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVRecord;
import org.apache.commons.io.input.BOMInputStream;
import org.apache.commons.lang.StringUtils;

import de.businesscode.bcdui.upload.data.UploadControl;

/**
 * Responsible to insert a CSV file available as BLOB column-wise to staging
 * Detects file encoding (ISO-8859-1, UTF-8 and UTF-16), row and cell boundaries, i.e. cell delimiter and quoteChar
 * Does not convert number or date format, does not detect header
 */
public class UploadToRowColCsv implements IUploadToRowColParser
{
  private final IUploadToRowColCallback uploadToRowCol;
  protected final UploadControl uc;
  protected static final char NO_QUOTE_CHAR = 0;

  /**
   * Constructor
   * @param uc
   * @param uploadToRowCol
   */
  public UploadToRowColCsv(UploadControl uc, IUploadToRowColCallback uploadToRowCol) {
    this.uploadToRowCol = uploadToRowCol;
    this.uc = uc;
  }

  private int max(Integer... vals) {
      return Collections.max(Arrays.asList(vals));
  }
  
  /**
   * Open the file with the given uploadId, split it into rows and cells and write it to bcd_dataupload_staging
   */
  public void process() throws Exception {

    // Need to be closed later, all other streams are closed by CSVReader
    BOMInputStream bomis = null;
    
    final int numTestLines = 10;
    final int numTestLinesLength = 5000;
    
    InputStreamReader isr = null;
    try {
      //----------------------------------
      // Detect encoding
      // Wrapping with a BOMInputStream cause a "zero bytes found exception, that's why we use the reset() workaround here"
      bomis = new BOMInputStream(uc.getFileBlobIs());
      // Mark, because we need to reset later, after we detected the format from the first lines before we start data parsing
      bomis.mark(numTestLinesLength * numTestLinesLength);
      String encoding = bomis.hasBOM() ? bomis.getBOMCharsetName() : StandardCharsets.ISO_8859_1.name();
      uc.setEncoding(encoding);

      //----------------------------------
      // Detect delimiter and quoteChar, read some sample lines
      ArrayList<String> recSepLines = new ArrayList<>();
      try (BufferedReader recSepIsr = new BufferedReader(new InputStreamReader(bomis, encoding))) {
        String line;
        int testLinesLength = 0;
        while((line = recSepIsr.readLine()) != null) {
          testLinesLength += line.length();
          recSepLines.add(line);
          if(recSepLines.size() == numTestLines)
            break;
          // Stop reading if next row may destroy our reset() capability
          if((testLinesLength / recSepLines.size()) * numTestLines > (numTestLines + 0.5) * numTestLinesLength)
            break;
        }
      }catch (UnsupportedEncodingException e) {/* ignore */}

      // 1. Empty file -> nothing to do
      if(recSepLines.size() == 0)
        return;

      // 2. Detect the delimiter. Are there more ;, , or tabs in the first line? That one will be the winner.
      char delimiter;
      if( uc.getDelimiter() != null ) {
        delimiter = uc.getDelimiter();
      } else {
        String firstLine = recSepLines.get(0);
        final int numSemi = firstLine.split(";").length;
        final int numColo = firstLine.split(",").length;
        final int numTab  = firstLine.split("\t").length;
        final int numPipe = firstLine.split(Pattern.quote("|")).length;
        final int max_ocurrence = max(numSemi,numColo,numTab,numPipe);
        
        delimiter = ';';  
        if (max_ocurrence  == numColo)
          delimiter = ',';
        if (max_ocurrence  == numTab )
          delimiter = '\t';
        if (max_ocurrence  == numPipe )
          delimiter = '|';
        
        uc.setDelimiter(delimiter);
      }

      // 3.Detect " as quoteChar. If there is an even number of " in each testLine, we think it is a quote char
      // Note, will also treat " as quoteChar, if it does not occur
      // TODO Add support for escape char
      char quoteChar;
      if(uc.getQuoteChar() != null) {
        quoteChar = uc.getQuoteChar();
      } else {
        quoteChar = '\"';
        for (String quoteLine : recSepLines) {
          if (StringUtils.countMatches(quoteLine, "\"") % 2 != 0) {
            quoteChar = NO_QUOTE_CHAR ;
            break;
          }
        }
        uc.setQuoteChar(quoteChar);
      }

      // Read the data with the now known delimiter and quoteChar
      // Apply encoding
      bomis.reset();
      isr = new InputStreamReader(bomis, encoding);
      CSVFormat format = CSVFormat.DEFAULT;
      format = format.withDelimiter(delimiter);
      if(quoteChar != NO_QUOTE_CHAR )
        format = format.withQuote(quoteChar);
      Iterable<CSVRecord> records = format.parse(isr);

      // Row by row, cell by cell
      for(CSVRecord record: records) {

        uploadToRowCol.startLine();
        for(int c = 0 ; c < record.size(); c++) {
          String value = record.get(c);
          // common-csv does not determine null and emtpy values as of: "",,"",42 { "","","",42 } but we want to have { "",null,"",42 }; as such we currently just treat empty string as nulls (as oracle would anyway do with varchar2 loaded into db)
          uploadToRowCol.nextCell(value != null && value.isEmpty() ? null : value);
        }
        uploadToRowCol.endLine();

      }
    } finally {
      if (isr != null) { isr.close(); }
      if( bomis != null) { bomis.close(); }

      // This does close the BLOB stream
      uploadToRowCol.endFile();
    }  
  }
}
