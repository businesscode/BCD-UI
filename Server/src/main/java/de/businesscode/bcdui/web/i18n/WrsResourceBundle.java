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
import java.io.InputStream;
import java.util.Collections;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

import javax.xml.parsers.ParserConfigurationException;
import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpressionException;
import javax.xml.xpath.XPathFactory;

import org.apache.log4j.Logger;
import org.w3c.dom.Document;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.xml.SecureXmlFactory;

/**
 * Resource bundle loading from a Wrs XML, i.e. messages.xml
 */
class WrsResourceBundle extends MapResourceBundle {
  private final static Logger logger = Logger.getLogger(WrsResourceBundle.class);

  WrsResourceBundle(InputStream is, Locale locale) {
    super(locale, parse(is, locale));
  }

  /**
   * parses Wrs document filtering given locale
   * 
   * @param is
   * @param locale
   * @return
   */
  private static Map<String, String> parse(InputStream is, Locale locale) {
    logger.debug("parse for locale: " + locale);
    Map<String, String> keyMap = new HashMap<>();
    try {
      Document doc = SecureXmlFactory.enableNamespaceAware(SecureXmlFactory.newDocumentBuilderFactory()).newDocumentBuilder().parse(is);

      // select only those /*/wrs:Data/wrs:* having lang set to locale provided
      XPath keyRowsXPath = XPathFactory.newInstance().newXPath();
      keyRowsXPath.setNamespaceContext(StandardNamespaceContext.getInstance());
      NodeList keyRows = (NodeList) keyRowsXPath.compile("/*/wrs:Data/wrs:*[wrs:C[3] = '" + locale.getLanguage() + "']").evaluate(doc, XPathConstants.NODESET);
      for (int i = 0, imax = keyRows.getLength(); i < imax; i++) {
        NodeList wrsCNodes = keyRows.item(i).getChildNodes();
        keyMap.put(wrsCNodes.item(0).getTextContent(), wrsCNodes.item(1).getTextContent());
      }
      logger.debug(keyRows.getLength() + " keys loaded");
    } catch (SAXException | IOException | ParserConfigurationException | XPathExpressionException e) {
      throw new RuntimeException("xml parsing failed", e);
    }
    return Collections.unmodifiableMap(keyMap);
  }
}
