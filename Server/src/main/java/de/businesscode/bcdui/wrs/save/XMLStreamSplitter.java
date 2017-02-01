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

import java.io.StringReader;
import java.io.StringWriter;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;

import javax.xml.namespace.QName;
import javax.xml.stream.XMLEventFactory;
import javax.xml.stream.XMLEventReader;
import javax.xml.stream.XMLEventWriter;
import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLOutputFactory;
import javax.xml.stream.events.XMLEvent;

public class XMLStreamSplitter {


  private XMLEventReader metaDataReader = null;
  private XMLEventReader dataReader = null;

  public void split(XMLEventReader reader) throws Exception {
    StringWriter stringWriter = new StringWriter();
    XMLEventWriter writer = XMLOutputFactory.newInstance().createXMLEventWriter(stringWriter);
    int level = 0;

    XMLEvent startDocumentEvent = null;
    XMLEvent rootElementEvent = null;
    while (reader.hasNext()) {
      XMLEvent evt = reader.peek();
      if (evt.isStartDocument()) {
        startDocumentEvent = evt;
      }
      if (evt.isStartElement()) {
        QName elementName = evt.asStartElement().getName();
        if (level <= 1 && "Wrs".equals(elementName.getLocalPart())) break;
        if (level == 0) rootElementEvent = evt;
        ++level;
      } else if (evt.isEndElement()) {
        --level;
      }
      reader.nextEvent();
      writer.add(evt);
    }
    XMLEventFactory factory = XMLEventFactory.newInstance();
    if (rootElementEvent == null) {
      writer.add(factory.createStartElement(new QName("Empty"), null, null));
      writer.add(factory.createEndElement(new QName("Empty"), null));
    } else {
      writer.add(factory.createEndElement(rootElementEvent.asStartElement().getName(), null));
    }
    writer.add(factory.createEndDocument());
    writer.flush();

    metaDataReader = XMLInputFactory.newInstance().createXMLEventReader(new StringReader(stringWriter.getBuffer().toString()));

    dataReader = createPartialXMLEventReader(reader, startDocumentEvent, rootElementEvent);
  }

  public XMLEventReader getMetaDataReader() {
    return metaDataReader;
  }

  public XMLEventReader getDataReader() {
    return dataReader;
  }

  private XMLEventReader createPartialXMLEventReader(final XMLEventReader source, final XMLEvent startDocumentEvent, final XMLEvent rootElementEvent) throws Exception {
    return (XMLEventReader) Proxy.newProxyInstance(XMLEventReader.class.getClassLoader(),
        new Class[] { XMLEventReader.class },
        new InvocationHandler() {
          private boolean atStartDocument = true;
          private boolean atFirstEvent = true;
          @Override
          public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
            if (method.getName().startsWith("next") || method.getName().equals("peek")) {
              if (atStartDocument) {
                if (method.getName().startsWith("next")) {
                  atStartDocument = false;
                }
                return startDocumentEvent;
              } else if (atFirstEvent) {
                if (method.getName().startsWith("next")) {
                  atFirstEvent = false;
                }
                if (rootElementEvent != null) {
                  return rootElementEvent;
                }
              }
            }
            Object obj = method.invoke(source, args);
            return obj;
          }
        }
    );
  }
}
