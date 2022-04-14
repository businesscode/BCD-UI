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

import java.io.StringWriter;
import java.sql.ResultSet;
import java.util.HashMap;
import java.util.Map;
import java.util.Stack;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.stream.XMLEventReader;
import javax.xml.stream.XMLEventWriter;
import javax.xml.stream.XMLOutputFactory;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.events.StartElement;
import javax.xml.stream.events.XMLEvent;
import org.apache.commons.io.IOUtils;
import org.apache.poi.ss.usermodel.Workbook;
import org.w3c.dom.Document;
import de.businesscode.bcdui.wrs.IRequestOptions;
import de.businesscode.bcdui.wrs.load.DataLoader;
import de.businesscode.bcdui.wrs.load.IDataWriter;
import de.businesscode.bcdui.wrs.load.ISqlGenerator;
import de.businesscode.bcdui.wrs.load.Wrq2Sql;
import de.businesscode.bcdui.wrs.load.WrsBindingItem;
import de.businesscode.util.xml.SecureXmlFactory;

/**
 * Takes a wrq:WrsRequest an optional rnd:Wrs2Excel, executes it and writes the result into an Excel sheet via Poi Api
 * The caller is responsible to create the Workbook containing the Sheet
 */
public class Wrq2ExcelSheetDataWriter extends AbstractExcelSheetDataWriter implements IDataWriter
{
  
  private final DataLoader loader;
  private final ISqlGenerator generator;
  private int rowCount, colCount; // For IDataWriter
  private boolean maxRowsExceeded = false;
  public DataLoader getLoader() {return loader;}
  public ISqlGenerator getGenerator() {return generator;}

  /**
   * {@link AbstractExcelSheetDataWriter}
   * Handling a WrsRequest, we consume wrs:WrsRequest XMLEvent up to the closing tag
   * @param eventReader
   * @param event
   * @throws XMLStreamException
   * @throws ExcelWriterException
   */
  public Wrq2ExcelSheetDataWriter( IRequestOptions options, Workbook workbook, XMLEvent event, XMLEventReader eventReader, Stack<String> pathStack, boolean includeHeader ) 
      throws ExcelWriterException
  {
    super( workbook, pathStack, includeHeader );
    log.trace("Exporting a Wrq");

    // Turn the subtree into a DOM, so that we can hand it over to the DataLoader
    try {
      DocumentBuilderFactory factory = SecureXmlFactory.newDocumentBuilderFactory();
      DocumentBuilder builder = factory.newDocumentBuilder();
      StringWriter stringWriter = new StringWriter();

      // There is no guarantee, that the prefix definition is included in writer.add(event); for the root element, so we add it here explicitly
      stringWriter.write("<wrq:WrsRequest");
      stringWriter.write(" xmlns:wrq=\"http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0\" xmlns=\"http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0\"");
      stringWriter.write(" xmlns:rnd=\"http://www.businesscode.de/schema/bcdui/renderer-1.0.0\" xmlns:f=\"http://www.businesscode.de/schema/bcdui/filter-1.0.0\">");
      XMLEventWriter writer = XMLOutputFactory.newInstance().createXMLEventWriter( stringWriter );

      // Consume wrs:WrsRequest and children
      do {
        event = track( eventReader.nextEvent() );
        writer.add(event);
        if( event.isStartElement() ) {
          StartElement element = event.asStartElement();
          if( "Wrs2Excel".equals(element.getName().getLocalPart()) ) {
            wrs2ExcelInfo(element);
          }
        }
        // We can't write the closing tag with writer as it did not see the opening tag either
      } while( !(eventReader.peek().isEndElement() && "WrsRequest".equals(eventReader.peek().asEndElement().getName().getLocalPart()) ) );
      stringWriter.write("</wrq:WrsRequest>");

      openSheet();

      // Turn it into a DOM and execute it via Wrq2Sql, PoiSheetDataWriter and DataLoader
      String wrsRequestString = stringWriter.getBuffer().toString();
      Document doc = builder.parse(IOUtils.toInputStream(wrsRequestString,"UTF-8"));
      options.setRequestDoc( doc );
      generator = new Wrq2Sql(options);
      
      // We serve as the DataWriter
      loader = new DataLoader(options, generator, this);
    } catch (Exception e) {
      throw new ExcelWriterException("Detail export via Wrq could not be completed", e);
    }
  }
  
  /**
   * {@link AbstractExcelSheetDataWriter}
   * Execute Wrq and write result to sheet
   * @return maxRowsExceeded
   * @throws Exception
   */
  public boolean process() throws ExcelWriterException
  {
    try {
      loader.run();
    } catch (Exception e) {
      throw new ExcelWriterException("Detail export via Wrq could not be completed", e);
    }
    cleanup();
    return maxRowsExceeded;
  }


  /**
   * {@link IDataWriter}
   * Take the resultSet and put its content into the prepared sheet
   */
  @Override
  public void write(IRequestOptions options, ISqlGenerator generator, ResultSet resultSet, long duration) throws Exception 
  {
    // First lets evaluate the header information, especially the column types
    for( WrsBindingItem bi: generator.getSelectedBindingItems() ) {
      Map<String, String> props = new HashMap<String,String>();
      wrsHeaderCols.add( props );
      colTypes.add( bi.getJDBCDataType() );
    }

    // Currently we always add the header unless we write to a template
    // TODO make this controllable by rnd:Wrs2Excel
    if( !usingTemplate ) {
      for( WrsBindingItem bi: generator.getSelectedBindingItems() ) {
        writeHeaderCell( bi.getCaption() );
        moveToNextColumn();
      }
      moveToNextLine();
    }
    
    // Write cell by cell
    colCount = generator.getSelectedBindingItems().size();
    while ( resultSet.next() ) {
      for (WrsBindingItem item : generator.getSelectedBindingItems()) {
        String cellValue = resultSet.getString(item.getColumnNumber());
        writeCell(cellValue);
        moveToNextColumn();
      }
      moveToNextLine();

      rowCount++;
      if( rowCount >= options.getMaxRows() ) {
        maxRowsExceeded = true;
        break;
      }
    }
  }


  /**
   * {@link IDataWriter}
   * Number of rows written
   */
  public int getRowCount() {
    return rowCount;
  }

  /**
   * {@link IDataWriter}
   */
  public int getColumnsCount() {
    return colCount;
  }

  
  /**
   * {@link IDataWriter}
   * Close the target resource
   */
  @Override
  public void close() throws Exception {
    // No need to close a Poi Sheet, our caller will close the Workbook 
  }
}