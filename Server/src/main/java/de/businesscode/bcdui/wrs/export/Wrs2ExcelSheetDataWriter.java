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
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Stack;
import javax.xml.namespace.QName;
import javax.xml.stream.XMLEventReader;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.events.Attribute;
import javax.xml.stream.events.EndElement;
import javax.xml.stream.events.StartElement;
import javax.xml.stream.events.XMLEvent;

import org.apache.poi.ss.usermodel.Workbook;

import de.businesscode.bcdui.wrs.IRequestOptions;
import de.businesscode.util.StandardNamespaceContext;

/**
 * Takes a wrs:Wrs with an optional rnd:Wrs2Excel and writes it to an Excel sheet
 * The caller is responsible for handling the Excel Workbook
 */
class Wrs2ExcelSheetDataWriter extends AbstractExcelSheetDataWriter
{
  private final QName NS_WRS_COLUMNS = new QName(StandardNamespaceContext.WRS_NAMESPACE, "Columns");
  private final QName NS_WRS_DATA = new QName(StandardNamespaceContext.WRS_NAMESPACE, "Data");
  private final IRequestOptions options;
  private XMLEvent event;
  private final XMLEventReader eventReader;

  /**
   * {@link AbstractExcelSheetDataWriter}
   */
  Wrs2ExcelSheetDataWriter( IRequestOptions options, Workbook workbook, XMLEvent event, XMLEventReader eventReader, Stack<String> pathStack, boolean includeHeader )
  {
    super( workbook, pathStack, includeHeader );
    log.trace("Exporting a Wrs");
    this.event = event;
    this.eventReader = eventReader;
    this.options = options;
  }
  
  /**
   * {@link AbstractExcelSheetDataWriter}
   * Handling a client-sent Wrs, we consume wrs:Wrs and all its children nodes
   * @param eventReader
   * @param event
   * @return maxRowsExceeded
   * @throws XMLStreamException
   * @throws ExcelWriterException
   */
  protected boolean process() throws XMLStreamException, ExcelWriterException
  {
    StartElement element = event.asStartElement();
    String elementName = element.getName().getLocalPart();

    // Finish when we find the closing Wrs tag
    while( !( event.isEndElement() && ("WrsContainer".equals(getPath()) || "".equals(getPath()) ) ) ) 
    {
      if( event.isStartElement() ) {

        // Let's collection information about the columns of the current data set
        // We fill wrsHeaderCols and colTypes for later use
        if ("WrsContainer/Wrs/Header/Columns".equals(getPath()) || "Wrs/Header/Columns".equals(getPath()) ) 
        {
          log.trace("collecting wrs:Header/wrs:Columns info");
          // inner loop of wrs:Columns/wrs:C, collect atts
          while (true) {
            event = track( eventReader.nextEvent() );
            if (event.isEndElement() && NS_WRS_COLUMNS.equals(event.asEndElement().getName())) {
              break;
            } else if (event.isStartElement() && ( "WrsContainer/Wrs/Header/Columns/C".equals(getPath()) || "Wrs/Header/Columns/C".equals(getPath()) ) ) {
              StartElement el = event.asStartElement();

              Map<String, String> props = new HashMap<String,String>();
              wrsHeaderCols.add( props );

              for (Iterator<?> iter = el.getAttributes(); iter.hasNext();) {
                Attribute attr = (Attribute) iter.next();
                  props.put(attr.getName().getLocalPart(), attr.getValue());
              }
              try {
                colTypes.addElement( new Integer( Types.class.getField(props.get("type-name")).getInt(null) ) );
              } catch (Exception e) {
                colTypes.addElement( new Integer( Types.VARCHAR ) );
              }
            }
          }
        }

        // Capture optional details about the sheetName and the position to write to
        else if ("Wrs2Excel".equals(elementName)) {
          wrs2ExcelInfo(element);
        }
        
        // wrs:Data section
        else if( "WrsContainer/Wrs/Data".equals(getPath()) || "Wrs/Data".equals(getPath()) ) {
          log.trace("process Data");
          openSheet();

          // Currently we always add the header unless we write to a template
          // TODO make this controllable by rnd:Wrs2Excel
          if( !usingTemplate ) {
            for( Map<String,String>props: wrsHeaderCols ) {
              String colCaption = props.get("caption");
              if( colCaption == null )
                colCaption = props.get("id");
              if( colCaption == null )
                colCaption = props.get("bRef");
              if( colCaption == null )
                colCaption = "";
              writeHeaderCell( colCaption );
              moveToNextColumn();
            }
            moveToNextLine();
          }

          
          while (true) {
            event = track( eventReader.nextEvent() );
            
            // End of R or C
            if (event.isEndElement()) {
              EndElement endElement = event.asEndElement();
              if (NS_WRS_DATA.equals(endElement.getName())) {
                break;
              } else if ("R".equals(endElement.getName().getLocalPart())) {
                // wrs:R end move to next line
                moveToNextLine();
                if( currentRowIdx-startRowIdx > options.getMaxRows() )
                  return true;
              }
            } 
            
            // We found a R or C start
            else if (event.isStartElement()) {
              element = event.asStartElement();
              elementName = element.getName().getLocalPart();
  
              // wrs:C
              if ("C".equals(elementName)) {
                // consume, read content; may have complex body so loop here till end of C
                String cellValue = null;
                do {
                  event = track( eventReader.nextEvent() );
                  if (event.isCharacters()) {
                    if (cellValue == null)
                      cellValue = "";
                    cellValue += event.asCharacters().getData();
                  }
                } while (!(event.isEndElement() && "C".equals(elementName)));
                writeCell(cellValue);
                moveToNextColumn();
              }
            }
          }
        }
      }
      // Proceed with next tag
      event = track( eventReader.nextEvent() );
      if( event.isStartElement() ) {
        element = event.asStartElement();
        elementName = element.getName().getLocalPart();
      }
    }
    cleanup();
    return false;
  }
}
