/*
  Copyright 2010-2023 BusinessCode GmbH, Germany

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

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.StringTokenizer;
import java.util.TimeZone;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import de.businesscode.bcdui.web.i18n.I18nDbResources;



public class ExcelSylkTemplate  {

    protected String header = "";
    // ;P is followed by producing program.
    // ;N means cells are protected by default (and unlocked by an ';N' in C records)
    // ;E : formulas support external links; only here cause XL does
    // (Excel writes 'ID;PWXL;N;E')
    protected String  idRecord = "ID;PZZZ;N;E";
    // default format (from my XL). description see RTD 'F' description at bottom
    protected String defaultFormat = ";P0;DG0G10;M255";
    // general options (from my XL). ???
    protected String generalOptions = ";L;D;V0;K47;G100 0.001";
    // first line format, uses references (P1, M1) to format declared in header
    // construction; is set to bold (D); see RTD 'F' description at bottom
    protected String columnNameFormat = ";P1;FG0G;SDM1";
    protected String addInfoFormat    = ";P1;FG0G;SDM3";
    // hold the format phrases
    protected String[] colFormats;
    // date values need to be translated
    protected boolean[] isTranslated;
    protected boolean[] getsQuotes;
    private String[] colNames;
    private int nrRows = -1;
    private int nrCols = -1;
    //we do not mess with this yet.
    private final int nrFirstRow = 1;
    private final int nrFirstCol = 1;
    protected String httpHeader = null;

    private List<ColumnMappingEx> logicalColumnNamesEx = null;

    // the hash with url string captions
    private HashMap<String, String> httpHeadersMap=null;

    private static final String defDecimals = "4";

    private String applicationURL = null;
    private String addInfo = null;

    private I18nDbResources i18nDbResources = null;

    private Logger logger;

    /**
     * Creates an Excel exported instance and exports all rows that occur in the
     * metaData.
     * <br>
     * <b>Important: Do not set rowCountIfKnown to a wrong value, because otherwise
     * you will get an error message "Error in row 17".</b>
     * <br>
     * @param metaData The meta data the column names will be taken from.
     * @param rowCountIfKnown Set this to 0 if you do not know the exact number of
     * rows the result set will contain. Otherwise set the row count here.
     */
    public ExcelSylkTemplate( ResultSetMetaData metaData, int rowCountIfKnown)
    throws SQLException
    {
      this(metaData, rowCountIfKnown, null, null);
    }

    /**
     * Creates an Excel exported instance.
     * <br>
     * <b>Important: Do not set rowCountIfKnown to a wrong value, because otherwise
     * you will get an error message "Error in row 17".</b>
     * <br>
     * @param metaData The meta data the column names will be taken from.
     * @param rowCountIfKnown Set this to 0 if you do not know the exact number of
     * rows the result set will contain. Otherwise set the row count here.
     * @param orderedLogicalColumnNames The list of column captions and database
     * column names to be exported in exactly the list order. This can be null if
     * the exported columns should be taken from the result set meta data.
     */
    public ExcelSylkTemplate( ResultSetMetaData metaData, int rowCountIfKnown,List<ColumnMapping> orderedLogicalColumnNames)
    throws SQLException
    {
      this(metaData, rowCountIfKnown, orderedLogicalColumnNames, null);
    }


    public ExcelSylkTemplate( ResultSetMetaData metaData, int rowCountIfKnown ,I18nDbResources i18nDbResources)
    throws SQLException
    {
      this(metaData, rowCountIfKnown, null, i18nDbResources);
    }

    private int getFirstRow() {
      return getAddInfo() != null && ! getAddInfo().trim().isEmpty() ? nrFirstRow + 2 : nrFirstRow;
    }


    public ExcelSylkTemplate( ResultSetMetaData metaData, int rowCountIfKnown, List<ColumnMapping> orderedLogicalColumnNames , I18nDbResources i18nDbResources)throws SQLException{
      this.i18nDbResources = i18nDbResources;
      this.logger = LogManager.getLogger(getClass());
        // set row and col count. has to be done before header construction
        if (rowCountIfKnown > 0) { nrRows = rowCountIfKnown; }

        // Read the column names according to the orderedLogicalColumnNames list
        logicalColumnNamesEx =
          createExtendedMapping(metaData, orderedLogicalColumnNames);

        nrCols = logicalColumnNamesEx.size();

        // set column formats. has to be done before getting of declarations
        readColFormats(metaData, logicalColumnNamesEx);

        // fill colNames[]
        escapeColNamesForSylk(logicalColumnNamesEx);

        //get the header definitions
        header = getStandardHeader();

        // append the column formats
        header = header + getColFormatDeclarations();
    }


    /**
     * write a the table with the 'standard' (see getStandardHeader() ) configuration
     * @param output stream to write on
     * @param resultSet the result set to write
     * @param nrRowsToFlush no. of resultset/excel rows after which stream is flushed
     */

    public int writeStandardTable
    (PrintWriter output, ResultSet resultSet, int nrRowsToFlush)
    throws IOException, SQLException
    {
        writeHeader(output);
        writeAddInfo(output);
        writeColNamesRow(output);
        int rowCount = writeRowsWoFormat(output, resultSet, getFirstRow() + 1, nrRowsToFlush);
        writeEndRecord(output);
        return rowCount;
    }


    /*
     * write the header to output
     */
    protected void writeHeader(PrintWriter output) throws IOException {
        output.write(header);
    }

    protected void writeEndRecord(PrintWriter output) throws IOException{
        output.write("\nE");
    }

    /*
     * write the the Excel row with the column names
     * see header construction, and RTD 'F' description at bottom
     */
    protected void writeColNamesRow(PrintWriter output) throws IOException {
        StringBuffer buffer = new StringBuffer();
        for (int i=1; i<=nrCols;++i){
            // append format record
            buffer.append("\nF" + columnNameFormat + (i==1?(";Y" + getFirstRow()):"") + ";X" + i );
            // append content record
            buffer.append("\nC" + ";K\"" + colNames[i] + "\"");
        }
        output.write(buffer.toString());
    }

    /*
     * write additional information if available
     */
    protected void writeAddInfo(PrintWriter output) throws IOException {
      StringBuffer buffer = new StringBuffer();
      String addInfo = getAddInfo();
      int maxSize = 250;
      if (addInfo != null && ! addInfo.trim().isEmpty()) {
        int len = 0;
        String part = addInfo.substring(len, len + maxSize > addInfo.length() ? addInfo.length() : len + maxSize);
        int col = nrFirstCol;
        while (! part.isEmpty()) {
          buffer.append("\nF" + addInfoFormat + ";Y" + nrFirstRow + ";X" + col++);
          buffer.append("\nC" + ";K\"" + part + "\"");
          len = len + maxSize;
          part = len > addInfo.length() ? "" : addInfo.substring(len, len + maxSize > addInfo.length() ? addInfo.length() : len + maxSize);
        }
        buffer.append("\nF" + addInfoFormat + ";Y" + (nrFirstRow + 1) + ";X" + nrFirstCol);
        buffer.append("\nC" + ";K\"\"");
      }
      output.write(buffer.toString());
    }

   /*
    * set the default url string capiton
    *  for the exel export
    *
    * */

    public String getHttpHeader() {
     return httpHeader;
    }

    public void setHttpHeader(String httpHeader) {
      this.httpHeader = httpHeader;
    }

/*
     * give the content record depending on col no.
     * no ';' in values
     * ??? what is with non asci values?
     * date col values have to be translated specially
     *
     * insert a hyperlink if the content starts with "http://" or "https://"
     */
    protected String getContentRecord( final String content, int colNr, String extraData) {
        String record = new String();
        String quote = getsQuotes[colNr] ? "\"" :  "";
        String recordStart = new String("\nC;X"+colNr+";K");
        if (null == content || content.trim().length() == 0 ) {
          if (colNr == 1) {
            record = "\nC;X1;K\"\"";
          } else {
            record = "";
          }
        } else if (isTranslated[colNr]) {
            try {
                record = recordStart + getDaysSince1900(content);
            } catch( ParseException pe) {
                // 1 corresponds 1900-01-01
                record=recordStart+"1";
            }
        } else if (extraData != null && ! extraData.isEmpty()) {

          String url = extraData;
          if (url.startsWith("/")) {
            if (getApplicationURL().endsWith("/"))
              url = getApplicationURL() + url.substring(1);
            else
              url = getApplicationURL() + url;
          }
          String linkText = content.replace(";",";;");
          record = recordStart + "\""+ linkText +  "\";EHYPERLINK(\"" + url.replace(";",";;") + "\",\""+ linkText +"\")";

        } else if(content.startsWith("http://") || content.startsWith("https://")) {
          String linkText = content.replace(";",";;");
          if(httpHeader==null && httpHeadersMap == null)
          {
            record = recordStart + "\""+ linkText +  "\";EHYPERLINK(\"" + content.replace(";",";;") + "\",\""+ linkText +"\")";
          }
          else if(httpHeadersMap != null)// set desired url strings
          {
            String colContent = httpHeadersMap.get(colNames[colNr]);
            if( colContent != null && colNames.length > 0 ){
              record = recordStart + "\"" + colContent + "\";EHYPERLINK(\"" + content.replace(";",";;") + "\",\"" + colContent +"\")";
            }
            else
              record = recordStart + "\" Event history \";EHYPERLINK(\"" + content.replace(";",";;") + "\",\" Event history\")";
          }
          else{
            record = recordStart + "\" Event history \";EHYPERLINK(\"" + content.replace(";",";;") + "\",\" Event history\")";
          }

        }
        else if( getHttpHeadersMap() != null && getHttpHeadersMap().containsValue(this.colNames[colNr]) && getApplicationURL() != null){
          StringBuffer url = new StringBuffer(getApplicationURL());
          // avoid duplicate //
          if(getApplicationURL().endsWith("/") && content.startsWith("/"))
            url.append( content.substring(1, content.length()));
          else
            url.append( content);

          record = recordStart + "\"" + this.colNames[colNr] + "\";EHYPERLINK(\"" + url.toString().replace(";",";;") + "\",\"" + this.colNames[colNr] +"\")";
        }
        else {
            record = recordStart + quote + content.replace(";",";;") + quote;
        }

      return record;
    }

    /*
     * give the number that Excel stores dates in
     * i.e. days since 1900-01-01 in excel calculation
     * getTime() gives milliseconds since 1970-01-01 00:00:00
     */
    public static String getDaysSince1900(String dateString) throws ParseException {
//      dateString = "1978-07-21"; //just a date for testing
      SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");
      SimpleDateFormat timestampFormat = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
      dateFormat.setTimeZone( TimeZone.getTimeZone("GMT") );
      timestampFormat.setTimeZone( TimeZone.getTimeZone("GMT") );

        final long ref = timestampFormat.parse("1899-12-30 00:00:00").getTime();
        if ( null == dateString ) { return null; }
        Date date = null;
        if ( dateString.length() > 10 ){
            date = timestampFormat.parse(dateString);
            return Double.valueOf( (date.getTime() - ref)/1000.0/3600/24 ).toString();
        } else {
            date = dateFormat.parse(dateString);
            return Long.valueOf( (date.getTime() - ref)/(1000*3600*24)).toString();
        }
    }

    /*
     * creates the array of format strings dependent on metadata col type
     * see RTD 'F' description below
     * creates the array of flags for the (Date-) columntypes that have to be translated
     */
    protected void readColFormats(ResultSetMetaData metaData, List<ColumnMappingEx> orderedLogicalColumnNames) throws SQLException {
        colFormats = new String[nrCols+1];
        getsQuotes = new boolean[nrCols+1];
        isTranslated = new boolean[nrCols+1];

        for (int i=1; i<=nrCols; ++i) {
            switch (metaData.getColumnType(orderedLogicalColumnNames.get(i-1).getDbColumnNo())) {
                case java.sql.Types.DECIMAL:
                case java.sql.Types.DOUBLE:
                case java.sql.Types.FLOAT:
                case java.sql.Types.REAL:
                    // fixed 4 decimals, standard aligned; see docu and header constr.
                    colFormats[i]  = ";P" + mapDecimalFormating(orderedLogicalColumnNames.get(i-1).getDecimals());
                    getsQuotes[i] = false;
                    isTranslated[i] = false;
                    break;
                case java.sql.Types.NUMERIC:
                    if (metaData.getScale(orderedLogicalColumnNames.get(i-1).getDbColumnNo()) == 0) {
                      colFormats[i] = ";P2";
                      getsQuotes[i] = false;
                      isTranslated[i] = false;
                    } else {
                      colFormats[i]  = ";P" + mapDecimalFormating(orderedLogicalColumnNames.get(i-1).getDecimals());
                      getsQuotes[i] = false;
                      isTranslated[i] = false;
                    }
                    break;
                case java.sql.Types.INTEGER:
                case java.sql.Types.BIGINT:
                case java.sql.Types.TINYINT:
                case java.sql.Types.SMALLINT:
                    //  no decimals , standard aligned; see docu and header constr.
                    colFormats[i] = ";P2";
                    getsQuotes[i] = false;
                    isTranslated[i] = false;
                    break;
                case java.sql.Types.DATE:
                    // yyyy-mm-dd, see docu and header constr
                    colFormats[i] = ";P9;FG0G";
                    getsQuotes[i] = false;
                    isTranslated[i] = true;
                    break;
                case java.sql.Types.TIMESTAMP:
                    // yyyy-mm-dd hh:mm:ss, see docu and header constr
                    colFormats[i] = ";P10;FG0G";
                    getsQuotes[i] = false;
                    isTranslated[i] = true;
                    break;
                case java.sql.Types.BOOLEAN:
                default:
                    colFormats[i] = "";
                    getsQuotes[i] = true;
                    isTranslated[i] = false;
            }
          // in case we got a hyperlink, add styling link to our added hyperlink font/color/style
          colFormats[i] += orderedLogicalColumnNames.get(i-1).getWrsAColumn() != -1 ? ";SDM2" : "";
        }
    }

    /**
     * returns number of P format, that is defined in header
     */
    private int mapDecimalFormating(String decimals){
      return 2 + Integer.parseInt(decimals);
    }


    /*
     * read the column titles from meta data
     */
    protected void escapeColNamesForSylk(List<ColumnMappingEx> orderedLogicalColumnNames) {
        colNames = new String[nrCols+1];
        String name = null;
        for (int i=1; i<=nrCols;++i){
            name = orderedLogicalColumnNames.get(i-1).getCaption();
            colNames[i] = name.replaceAll(";",";;");
        }
    }

    /*
     * this 'standard' header may be to some extent build to
     * the needs of opms shp details export but should be generally ok:
     * only two fonts, 3 date formts
     */
    protected String getStandardHeader() {
        StringBuffer h = new StringBuffer();

        // the leading id
        h.append(idRecord);

        // the product list
        // Excel uses lot more.
        // referenced by relative number ( Pn as given in comments )later :
        // !!!!ONLY APPEND!!!!
        h.append("\nP;PGeneral");                    // P0  - ?, XL uses that
        h.append("\nP;P@");                          // P1  - text
        h.append("\nP;P0");                          // P2  - 0 decimals / integer
        h.append("\nP;P#0.0");                       // P3  - 1
        h.append("\nP;P#0.00");                      // P4  - 2
        h.append("\nP;P#0.000");                     // P5  - 3
        h.append("\nP;P#0.0000");                    // P6  - 4
        h.append("\nP;P#0.00000");                   // P7  - 5
        h.append("\nP;P#0.000000");                  // P8  - 6 decimals

        if(this.i18nDbResources!=null && this.i18nDbResources.containsKey(I18nDbResources.BCDUI_DATE_PATTERN) && this.i18nDbResources.containsKey(I18nDbResources.BCDUI_DATE_SEPARATOR)){
          String i18nDatePattern = this.i18nDbResources.getString(I18nDbResources.BCDUI_DATE_PATTERN);
          String i18nDateSeparator = this.i18nDbResources.getString(I18nDbResources.BCDUI_DATE_SEPARATOR);
          StringTokenizer split = new StringTokenizer(i18nDatePattern, i18nDateSeparator);
          StringBuffer datePattern = new StringBuffer();
          try{
            datePattern.append("\nP;P"+split.nextToken() + "\\");             // P9  - iso date
            datePattern.append(i18nDateSeparator);             // P9  - iso date
            datePattern.append(split.nextToken() + "\\");             // P9  - iso date
            datePattern.append(i18nDateSeparator);             // P9  - iso date
            datePattern.append(split.nextToken());
            h.append(datePattern.toString());
            h.append(datePattern.toString() + "  hh:mm:ss");
          }
          catch(NoSuchElementException e){
            this.logger.error("Date Pattern:\"" + i18nDatePattern + "\" or date separator:\""+i18nDateSeparator+"\" is not correct!");
          }
        }
        else{
          addStandardDateHeader(h);
        }

        // the font list
        // Excel uses more and additionally uses ;F - fonts : 'P;FArial;M200' ???
        // ;EArial is the font (what, if not installed?). ;M200 = 10pt, M160=8pt ...
        // ;SB = bold
        // referenced by relative number ( Mn as given in comments )later (with 'S' RTD):
        // !!!!ONLY APPEND!!!!
        h.append("\nP;EArial;M200");          // M0
        h.append("\nP;EArial;M200;SB");       // M1 bold
        h.append("\nP;EArial;M200;SU;L13");   // M2 hyperlink blue/underline
        h.append("\nP;EArial;M200;SIB;L5");   // M3 addInfo

        // default format. see class fields
        h.append("\nF" + defaultFormat);

        // append the sheet bounds if known. recommended before ;C (data) and ;F (format) RTDs
        if ( nrRows > 0 && nrCols > 0) {
            h.append("\nB" +
                ";Y" + nrRows + ";X" + nrCols +
                // printed area left uper and right bottom corner, 0-based
                ";D" + (getFirstRow()-1) +" " + (nrFirstCol-1) + " " + (nrRows-1) + " " + (nrCols -1)
            );
        }

        // general options. see class fields
        h.append("\nO" + generalOptions);

        // column widths (not used here)
        // h.append("\nF"+";W"+fromCol+" "+toCol+" "+columnWidth);

        // row hights
        //h.append("\nF;M255;R1");               // normal hight for row1

        return h.toString();
    }


  private void addStandardDateHeader(StringBuffer h) {
    h.append("\nP;Pyyyy\\-mm\\-dd");        // P9  - iso date
    h.append("\nP;Pyyyy\\-mm\\-dd\\ hh:mm:ss");  // P10 - iso timestamp
    h.append("\nP;Pdd/mm/yyyy");                 // P11 - may change with locale ('01.02.2003')
  }

    /*
     * give the declarations of general column formats
     */
    protected String getColFormatDeclarations () {
        StringBuffer sb = new StringBuffer();
        for (int i=1; i<=nrCols; ++i) {
            if ( ! (colFormats[i].length() == 0) ) {
                sb.append("\nF;C"+i+colFormats[i]);
            }
        }
        return sb.toString();
    }

    /**
     * Replaces all control characters in the specified string except for the
     * first character (this is the initial CR).
     * @param bytes The string to be processed as bytes array.
     * @return The modified bytes array.
     */
    private String replaceControlCharacters(String content) {
      if( content.length() == 0 )
        return content;
      String result = content.substring(0,1);
      if( content.length() == 1 )
        return result;
      result += content.substring(1).replaceAll("[\u0000-\u001f]", " ");
      return result;
    }

    /*
     * write the table body without specifying formats
     * (assuming general and column/row defaults have been accordingly set)
     */
    protected int writeRowsWoFormat
    (PrintWriter output, ResultSet resultSet, int startRow, int nrRowsToFlush )
    throws IOException, SQLException
    {
        int rowCount = 0;
        while ( resultSet.next() ) {
            for (int j=1; j<=nrCols; ++j){
              int extraDataIndex = logicalColumnNamesEx.get(j-1).getWrsAColumn();
              String extraData = extraDataIndex != -1 ? resultSet.getString(logicalColumnNamesEx.get(j-1).getWrsAColumn()) : "";
                // insert row FTD if first col;
                String columnData =
                  resultSet.getString(logicalColumnNamesEx.get(j-1).getDbColumnNo());
                if (columnData != null && columnData.length() > 255) {
                  columnData = columnData.substring(0, 252) + "...";
                }
                output.write(replaceControlCharacters((
                        getContentRecord(columnData, j, extraData) +
                        (j==1 ? (";Y" + (startRow + rowCount)) : "")
                )));
            }
            if ( ++rowCount % nrRowsToFlush == 0) { output.flush(); }
        }
        return rowCount;
    }

    /**
     * Creates the list of columns to be exported. If the column list is null the whole metaData
     * will be taken for the export. Therefore the result is guaranteed not be be null.
     * @param metaData The meta data object for the result set to be exported.
     * @param orderedLogicalColumnNames An optional argument specifying the order and column to
     * be exported.
     * @return The extended list of columns to be exported. It is extended by the column number
     * in the result set for each exported column.
     */
    private List<ColumnMappingEx> createExtendedMapping(ResultSetMetaData metaData, List<ColumnMapping> orderedLogicalColumnNames) throws SQLException {
      List<ColumnMappingEx> result = new ArrayList<ColumnMappingEx>();
      int count = metaData.getColumnCount();

      if (orderedLogicalColumnNames == null) {
        for (int i = 1; i <= count; ++i) {
          String name = metaData.getColumnName(i);
          String label = metaData.getColumnLabel(i);
          if (label == null) label = name;
          result.add(new ColumnMappingEx(label, name, i));
        }
      } else {
        Map<String, Integer> columnNoMapping = new HashMap<String, Integer>();

        for (int i = 1; i <= count; ++i) {
          columnNoMapping.put(metaData.getColumnName(i).toUpperCase(), i);
        }

        for (ColumnMapping mapping : orderedLogicalColumnNames) {
          Integer colNo = columnNoMapping.get(mapping.getDbName().toUpperCase());
          if (colNo != null) {
            result.add(new ColumnMappingEx(mapping, colNo, mapping.getWrsAColumn()));
          }
        }
      }

      return result;
    }

    /**
     * This class encapsulates a pair of a column caption and the respective
     * data column name. Use this class to specify the columns to be exported
     * and the order in which they should appear.
     */
    public static class ColumnMapping {
      private String caption = null;
      private String dbName = null;
      private String decimals = null;
      private int wrsAColumn = -1;

      /**
       * Create a column mapping item.
       * @param columnCaption The caption of the column which may contain
       * whitespaces etc.
       * @param dbColumnName The name of the column in the result set.
       */
      public ColumnMapping(String columnCaption, String dbColumnName) {
        this(columnCaption, dbColumnName, defDecimals);
      }

      public ColumnMapping(String columnCaption, String dbColumnName, String decimals, int wrsAColumn) {
        this(columnCaption, dbColumnName, decimals);
        this.wrsAColumn = wrsAColumn;
      }

      public ColumnMapping(String columnCaption, String dbColumnName, String decimals) {
        caption = columnCaption;
        dbName = dbColumnName;
        this.decimals = decimals;

        if( this.decimals == null || this.decimals.equals(""))
          this.decimals = defDecimals;
      }

      public String getCaption() {
        return caption;
      }

      public String getDbName() {
        return dbName;
      }

      @Override
      public String toString() {
        return "<" + caption + ", " + dbName + ">";
      }

      public String getDecimals(){
        return decimals.trim();
      }

      public int getWrsAColumn(){
        return wrsAColumn;
      }
    }

    /**
     * This is an internal-use extension of the ColumnMapping which is
     * extended by the position of the column in the result set.
     *
     */
    private static class ColumnMappingEx extends ColumnMapping {
      private int dbColumnNo = 0;

      public ColumnMappingEx(ColumnMapping mapping, int dbColumnNo, int wrsAColumn) {
        super(mapping.getCaption(), mapping.getDbName(), mapping.getDecimals(), wrsAColumn);
        this.dbColumnNo = dbColumnNo;
      }

      public ColumnMappingEx(String columnCaption, String dbColumnName, int dbColumnNo) {
        super(columnCaption, dbColumnName);
        this.dbColumnNo = dbColumnNo;
      }

      public ColumnMappingEx(ColumnMapping mapping, int dbColumnNo) {
        super(mapping.getCaption(), mapping.getDbName(), mapping.getDecimals());
        this.dbColumnNo = dbColumnNo;
      }

      public int getDbColumnNo() {
        return dbColumnNo;
      }

      @Override
      public String toString() {
        return "<" + getCaption() + ", " + getDbName() + ", " + dbColumnNo + ">";
      }
    }

    /**
     *
     * write the error message into the actual excel file
     * contenttype from servlet must be "application/vnd.ms-excel"
     *
     * @param output  - where write
     * @param message - string to write
     * @throws IOException
     */
    public static void writeErrorMessage(PrintWriter output, String message) throws IOException{
      output.write(message);
    }

    /**
     * get hash with wishContents of column with links
     * @return Returns the httpHeadersMap.
     */
    public HashMap<String, String> getHttpHeadersMap() {
      return httpHeadersMap;
    }

    /**
     *  set the hash with url string captions
     *  for the exel export
     *
     * @param headersMap The httpHeadersMap to set.
     */
    public void setHttpHeadersMap(HashMap<String, String> headersMap) {
      this.httpHeadersMap = headersMap;
    }

    public String getApplicationURL() {
      return applicationURL;
    }
    public String getAddInfo() {
      return addInfo;
    }

    /**
     * @param applicationURL - like "http://localhost:8080/opms"
     */
    public void setApplicationURL(String applicationURL) {
      this.applicationURL = applicationURL;
    }
    public void setAddInfo(String addInfo) {
      this.addInfo = addInfo;
    }

/*
 * Sylk documentation
 */

/*
 * Be careful: ;X ;Y ;F entries take effect on following entries if left empty
 */

/*
 * RTD 'F':
 * format RTD (record type descriptor) is 'F'. example 'F;P30;FG0G;SDSM8;X6'
 * followed by FTDs (format type descriptors)
 *   ';D', ';R', ';C', ';F' : default, whole row, whole col, single cell resp. usage:
 * ;F[number format:DCEFIG$*%] [#digits] [alignment:DCGLR-X]  ,meaning
 *   format: default, currency, exponent, fixed,integer, general, dollar, graph, percent
 *   alignment: default, center, standard(text left, nums right), left, right, ignore, fill
 * ;D[nf] [#d] [alignment] [col width] like above, 4th value: default column width (usually 11);
 *   of course num format and alignment D, 'default' is not allowed
 * ;R[row num]
 * ;C[col num]
 * formats used:
 * ;P[index] Excel format 'pictures' like defined with RTD 'P' at begin of file,
 *   index is 0-based. confer the header construction
 * ;M[row hight]  row hight, used esp. with ';R' (usually 255)
 * ;W[fromCol] [toCol] [colWidth]  col width, you can have several 'F;Wn m p', (usually 11)
 * ;S[IDTLBR][Mn] style: italic, bold, gridlines top,left,bottom,right
 *   the Mn seem to refer to the font pictures defined with RTD 'P', confer header construction
 * other FTDs used with RTD 'F':
 *   ;E show formulas(sheet wide). ;K show commas(sheet wide).
 *   ;N[fontid] [size] font to use(sheet wide). ;H do not show header (sheet wide). ;G do not show default gridlines
 */

}