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

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.Reader;
import java.util.Stack;
import java.util.stream.Collectors;
import javax.servlet.http.HttpServletRequest;
import javax.xml.namespace.QName;
import javax.xml.stream.XMLEventReader;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.events.Attribute;
import javax.xml.stream.events.StartElement;
import javax.xml.stream.events.XMLEvent;

import de.businesscode.util.xml.SecureXmlFactory;
import org.apache.commons.io.FileUtils;
import org.apache.log4j.Logger;
import org.apache.poi.EncryptedDocumentException;
import org.apache.poi.POIXMLProperties;
import org.apache.poi.hssf.util.HSSFColor;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbookType;
import de.businesscode.bcdui.web.wrs.WrsAccessLogEvent;
import de.businesscode.bcdui.wrs.IRequestOptions;

/**
 * Wrs to Excel (.xlsx) data exporter: exports data from Wrs into sheet(s) of target excel template, uses efficient streaming API when interfacing with input
 * document and output. Due to streaming API the input Wrs document must strictly adhere to Wrs schema.
 * BUI-537
 *
 */
public class Wrs2Excel {

  private boolean usingTemplate = false;
  
  /**
   * resolves template file via templateName abstraction, usually implemented by container component, i.e. servlet and returns the input-stream to the template
   */
  @FunctionalInterface
  public static interface TemplateResolver {
    InputStream getInputStream(String templateName) throws IOException;
  }

  /**
   * consumes the WrsContainer document and operates on API of {@link Wrs2Excel} instance
   */
  private class WrsContainerParser {
    private Stack<String> pathStack = new Stack<>(); // for path tracking
    private Logger log = Logger.getLogger(Wrs2Excel.class.getName().concat(".WrsContainerParser"));
    private final Logger virtLoggerAccess = Logger.getLogger("de.businesscode.bcdui.logging.virtlogger.access");
    private final OutputStream excelOutputStream;
    private final IRequestOptions options;
    private XMLEvent event;
    private XMLEventReader eventReader;
    private HttpServletRequest request;

    WrsContainerParser(OutputStream excelOutputStream, IRequestOptions options, XMLEventReader eventReader, HttpServletRequest req) {
      this.excelOutputStream = excelOutputStream;
      this.options = options;
      this.eventReader = eventReader;
      this.request = req;
    }

    /**
     * Parses the incoming definition.
     * Can be 
     * a) A WrsContainer, having Wrs data children
     * b) A single WrsRequest or Wrs document
     * @param eventReader
     * @throws XMLStreamException
     * @throws ExcelWriterException
     * @throws IOException
     */
    protected void process() throws XMLStreamException, ExcelWriterException, IOException 
    {
      boolean maxRowsExceeded = false;

      while (eventReader.hasNext()) {
        event = eventReader.nextEvent();

        /*
         * WrsContainer[@excelTemplateName]/Wrs/Header/Wrs2Excel
         * WrsContainer[@excelTemplateName]/Wrq
         * Wrs
         * Wrq
         */
        if (event.isStartElement()) {
          push(event);
          StartElement element = event.asStartElement();

          // There are three allowed top-level elements
          // We open an Excel file, template or dummy, depending on WrsContainer/@excelTemplateName
          if ("WrsContainer".equals(getPath()) || "WrsRequest".equals(getPath()) || "Wrs".equals(getPath())) {
            log.trace("process WrsContainer");
            // container, initialize Workbook
            openWorkbook( attr(element, "excelTemplateName") );
          }

          // Client did send a wrq:WrsRequest (on top or second level, may be within a WrsContainer or root element)
          // We only react on Select to allow Wrs2Excel to be evaluated in the outer loop
          // Here we read the wrq:Select, turn it in a full wrq:WrsRequest Document and hand it over to a Wrq2Sql 
          // and we run a db query, currently, they are all synchronously executed
          if( "WrsRequest".equals(getPath()) || "WrsContainer/WrsRequest".equals(getPath()) ) {
            Wrq2ExcelSheetDataWriter writer = new Wrq2ExcelSheetDataWriter( options, workbook, event, eventReader, pathStack, usingTemplate);
            maxRowsExceeded |= writer.process();

            // log wrs-access
            WrsAccessLogEvent logEvent = new WrsAccessLogEvent(WrsAccessLogEvent.ACCESS_TYPE_XLS, request, options, writer.getGenerator(), writer.getLoader(), writer);
            virtLoggerAccess.info(logEvent); // was level DEBUG
          }

          // Client did send a Wrs with data
          if ("WrsContainer/Wrs".equals(getPath()) || "Wrs".equals(getPath()) ) {
            maxRowsExceeded |= new Wrs2ExcelSheetDataWriter( options, workbook, event, eventReader, pathStack, usingTemplate ).process();
          }

        }
        // End of input (close Workbook + file)
        else if (event.isEndElement()) {
          pop();
        }
      }

      // If max rows are exceeded for any sheet, we add an additional sheet with a message right to the active sheet
      if( maxRowsExceeded ) {
        final String sheetName = "Row limit exceeded";
        Sheet sheet = workbook.createSheet(sheetName);
        int active = workbook.getActiveSheetIndex();
        workbook.setSheetOrder(sheetName, active+1);
        if( sheet instanceof XSSFSheet ) {
          XSSFSheet xssfSheet = (XSSFSheet)sheet;
          xssfSheet.setTabColor( new HSSFColor.RED().getIndex() );
        }
        Row row = sheet.createRow(0); 
        Cell cell = row.createCell(0);
        cell.setCellValue("Not all rows were exported due to the configured row limit of "+options.getMaxRows()+".");
      }
      
      writeWorkbook(excelOutputStream);
    }

    /**
     * reads attribute
     * 
     * @param element
     * @param attrName
     * @return empty string or attribute value
     */
    private String attr(StartElement element, String attrName) {
      Attribute attr = element.getAttributeByName(new QName("", attrName));
      return attr == null ? "" : attr.getValue();
    }

    private String getPath() {
      return pathStack.stream().collect(Collectors.joining("/"));
    }

    private void pop() {
      pathStack.pop();
    }

    private XMLEvent push(XMLEvent event) {
      pathStack.push(event.asStartElement().getName().getLocalPart());
      return event;
    }
  }

  private final Logger log = Logger.getLogger(getClass());
  private TemplateResolver templateResolver;
  private Workbook workbook;

  /**
   * exports data from wrsInputStream into new Excel file created from the excel target template and writes into excelOutputStream via streaming API
   * 
   * @param wrsReader
   *          - to read from; contains wrs:WrsContainer with Wrs document(s) containing renderer:Wrs2Excel information header
   * @param excelOutputStream
   *          - to write into (binary content, .xlsx)
   * @throws ExcelWriterException
   *           - in case anything goes rong
   */
  public void export(Reader wrsReader, OutputStream excelOutputStream, IRequestOptions options, HttpServletRequest req) throws Exception {
    log.trace("exporting Wrs");
    try {
      XMLEventReader reader = SecureXmlFactory.newXMLInputFactory().createXMLEventReader(wrsReader);
      // externalize verbose parsing
      try {
        new WrsContainerParser(excelOutputStream, options, reader, req).process();
      } finally {
        try {
          reader.close();
        } catch (Exception e) {
          log.warn("Failed closing XMLEventReader", e);
        }
        try {
          closeWorkbook();
        } catch (Exception e) {
          log.warn("Failed closing Workbook", e);
        }
      }
    } catch (Exception e) {
      throw new Exception("Excel export failed.", e);
    }
  }

  /**
   * sets template resolver to resolve templates by name
   * 
   * @param templateResolver
   */
  public Wrs2Excel setTemplateResolver(TemplateResolver templateResolver) {
    this.templateResolver = templateResolver;
    return this;
  }

  /**
   * closes workbook
   * @throws ExcelWriterException 
   */
  protected void closeWorkbook() throws ExcelWriterException {
    if (workbook == null) {
      throw new ExcelWriterException("No workbook opened.");
    }
    try {
      workbook.close();
    } catch (IOException e) {
      log.warn("failed to close workbook", e);
    }
    workbook = null;
  }


  /**
   * opens excel template by name, to be resolved by template-resolver, the template resolver must be previously set via
   * {@link #setTemplateResolver(TemplateResolver)}
   * 
   * @param excelTemplateName name of an Excel template on a well-known location or null to start with an empty sheet
   * @throws ExcelWriterException 
   */
  protected final void openWorkbook(String excelTemplateName) throws ExcelWriterException {
    if (workbook != null) {
      throw new ExcelWriterException("Another Workbook is still open.");
    }
    try {
      // needs abstract file abstraction, let Java manage the filename
      File tempFile = File.createTempFile("wrs2excel", ".xlsx");
      tempFile.deleteOnExit();
      // create shadow file

      // We may have a template, which we copy or just create a new, blank file
      if( excelTemplateName != null && !excelTemplateName.isEmpty() ) {
        usingTemplate = true;
        InputStream excelTemplateInputStream = templateResolver.getInputStream(excelTemplateName);
        FileUtils.copyInputStreamToFile(excelTemplateInputStream, tempFile);
        excelTemplateInputStream.close();
      } else {
        Workbook wb = new XSSFWorkbook(XSSFWorkbookType.XLSX);
        wb.write(new FileOutputStream(tempFile));
        wb.close();
      }

      // open workbook
      log.trace("opening workbook");
      workbook = WorkbookFactory.create(new FileInputStream(tempFile));
    } catch (EncryptedDocumentException | InvalidFormatException | IOException e) {
      throw new ExcelWriterException("failed to open workbook", e);
    }
    this.workbook.setForceFormulaRecalculation(true);
    if( workbook instanceof XSSFWorkbook ) {
      POIXMLProperties xmlProps = ((XSSFWorkbook)workbook).getProperties();    
      POIXMLProperties.CoreProperties coreProps =  xmlProps.getCoreProperties();
      coreProps.setCreator("BCD-UI");
    }
  }


  /**
   * saves the workbook to given outputStream
   * 
   * @param excelOutputStream
   * @throws ExcelWriterException 
   */
  protected void writeWorkbook(OutputStream excelOutputStream) throws ExcelWriterException {
    log.trace("writing workbook to stream");
    try {
      workbook.write(excelOutputStream);
    } catch (IOException e) {
      throw new ExcelWriterException("Failed to write workbook to stream", e);
    }
  }
}
