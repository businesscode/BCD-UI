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
package de.businesscode.bcdui.wrs.save;



import javax.xml.stream.EventFilter;
import javax.xml.stream.XMLEventFactory;
import javax.xml.stream.XMLEventReader;
import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.events.EndElement;
import javax.xml.stream.events.StartElement;
import javax.xml.stream.events.XMLEvent;
import javax.xml.stream.util.XMLEventConsumer;

import de.businesscode.util.xml.SecureXmlFactory;
import org.apache.log4j.Logger;

import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.wrs.IRequestOptions;
import de.businesscode.bcdui.wrs.save.event.ISaveEventListener;
import de.businesscode.bcdui.wrs.save.event.SaveEvent;
import de.businesscode.bcdui.wrs.save.event.SaveEventState;

public class DataSaver {


  private Bindings bindings = null;
  private XMLEventReader dataReader = null;
  private int maxSqlBatchSize = 0;
  private Logger logger = null;
  private ISaveEventListener listener;
  private IRequestOptions options;


  public void init(IRequestOptions optionsPr, XMLEventReader reader, Logger loggerPr) throws Exception {
    bindings = optionsPr.getBindings();
    XMLStreamSplitter splitter = new XMLStreamSplitter();
    splitter.split(reader);
    dataReader = splitter.getDataReader();
    options = optionsPr;
    this.logger = loggerPr;
  }



  public void run() throws Exception {

    EventFilter eventFilter = new EventFilter() {
      private boolean isIgnore=false;
      private String elementName;
      int currentPos = -1;
      boolean process = true;
      private String ignoreTags[] = {"References", "ValidationResult", "RequestDocument"};

      @Override
      public boolean accept(XMLEvent event) {
        int pos = event.getLocation().getCharacterOffset();
        if( pos == currentPos)
          return process;

        currentPos = pos;

        if (event.isStartElement()) {
          StartElement evt = event.asStartElement();
          elementName = evt.getName().getLocalPart();
          for (int i = 0; i < ignoreTags.length; i++) {
            if(elementName.equals(ignoreTags[i])){
              isIgnore = true;
              process=false;
            }
            else if(isIgnore)
              process = false;
          }
        }
        else if(event.isEndElement()){
          EndElement endEl = event.asEndElement();
          elementName = endEl.getName().getLocalPart();
          for (int i = 0; i < ignoreTags.length; i++) {
            if(elementName.equals(ignoreTags[i])){
              isIgnore = false;
              process = true;
            }
          }
        }
        return process;
      }
    };

    dataReader = SecureXmlFactory.newXMLInputFactory().createFilteredReader(dataReader, eventFilter);
    XMLEventReader input = dataReader;
    fireEvent(SaveEventState.BeforeTransformation);

    fireEvent(SaveEventState.AfterTransformation);

    XMLEventConsumer xmlToDataBaseHandler = new XMLToDataBase(bindings, options , maxSqlBatchSize, logger, listener, options.isDebugMode());
    try {
      while (input.hasNext()) {
        XMLEvent nextEvent = input.nextEvent();
        xmlToDataBaseHandler.add(nextEvent);
      }
    } catch (Exception ex) {
      fireEvent(SaveEventState.Rollback);
      throw ex;
    }
  }

  private void fireEvent(SaveEventState eventState){
    if(listener != null){
      listener.actionPerformed(new SaveEvent(null, eventState));
    }
  }

}
