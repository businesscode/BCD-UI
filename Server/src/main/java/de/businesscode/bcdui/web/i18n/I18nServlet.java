/*
  Copyright 2010-2018 BusinessCode GmbH, Germany

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
package de.businesscode.bcdui.web.i18n;

import java.io.IOException;
import java.util.Enumeration;
import java.util.ResourceBundle;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.xml.stream.XMLOutputFactory;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamWriter;

import org.apache.log4j.Logger;

/**
 * Provides i18n catalog XML for bcdui.i18n.I18nCatalog class, the keys are normalized and serialized as element names as expected by catalog implementation.
 */
public class I18nServlet extends HttpServlet {
  private static final long serialVersionUID = 1L;
  private Logger logger = Logger.getLogger(getClass());

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    logger.debug("i18n catalog request");
    try {
      response.setContentType("text/xml");
      response.setCharacterEncoding("UTF-8");
      resourcesToCatalog(I18n.getUserBundle(request), response);
    } catch (XMLStreamException e) {
      throw new IOException("Failed to write bundle", e);
    }
  }

  private void resourcesToCatalog(ResourceBundle bundle, HttpServletResponse response) throws XMLStreamException, IOException {
    XMLOutputFactory xf = XMLOutputFactory.newInstance();
    XMLStreamWriter xw = xf.createXMLStreamWriter(response.getWriter());

    xw.writeStartDocument("utf-8", "1.0");
    xw.writeStartElement("Catalog");
    xw.writeAttribute("isKeyNormalized", "true");
    xw.writeAttribute("lang", bundle.getLocale().getLanguage());

    Enumeration<String> keys = bundle.getKeys();
    while (keys.hasMoreElements()) {
      String key = keys.nextElement();

      // convert to element name
      xw.writeStartElement(normalizeKey(key));

      // contents
      xw.writeCharacters(bundle.getString(key));

      xw.writeEndElement();
    }

    xw.writeEndElement();
    xw.writeEndDocument();

    xw.flush();
    xw.close();
  }

  /**
   * normalize the key as expected by client
   * 
   * @param key
   * @return
   */
  private String normalizeKey(String key) {
    return key.replaceAll("[^a-zA-Z_0-9-]", "");
  }
}
