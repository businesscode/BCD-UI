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
package de.businesscode.util.xml;

import java.util.HashMap;
import java.util.Map;

import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.SAXParserFactory;
import javax.xml.stream.XMLInputFactory;

/**
 * Factory methods preventing XXE attacks, according to <a href="https://www.owasp.org/index.php/XML_External_Entity_(XXE)_Prevention_Cheat_Sheet#Java">OWASP
 * Cheat Sheet</a>
 */
public abstract class SecureXmlFactory {
  private static final Map<String, Boolean> GENERAL_FACTORY_FEATURES = new HashMap<String, Boolean>() {
    private static final long serialVersionUID = 1L;
    {
      put("http://apache.org/xml/features/disallow-doctype-decl", true);
      put("http://xml.org/sax/features/external-general-entities", false);
      put("http://xml.org/sax/features/external-parameter-entities", false);
      put("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
    }
  };

  /**
   * Create an XMLInputFactory which is save against injection attacks
   * If you need XInclude, enable it explicitly after retrieving this
   * @return
   */
  public static XMLInputFactory newXMLInputFactory() {
    final XMLInputFactory xif = XMLInputFactory.newInstance();
    xif.setProperty(XMLInputFactory.IS_REPLACING_ENTITY_REFERENCES, false);
    xif.setProperty(XMLInputFactory.IS_SUPPORTING_EXTERNAL_ENTITIES, false);
    xif.setProperty(XMLInputFactory.IS_VALIDATING, false);
    xif.setProperty(XMLInputFactory.SUPPORT_DTD, false);
    return xif;
  }

  /**
   * @return {@link DocumentBuilderFactory} with following options set
   *         <ul>
   *         <li>XInclude: disabled</li>
   *         <li>Validation: disabled</li>
   *         <li>DTD: disabled</li>
   *         <li>External Entities (general+params): disabled</li>
   *         <li>Ignoring comments: true</li>
   *         </ul>
   */
  public static DocumentBuilderFactory newDocumentBuilderFactory() {
    final DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();

    // apply general features
    GENERAL_FACTORY_FEATURES.forEach((feature, flag) -> {
      try {
        factory.setFeature(feature, flag);
      } catch (Exception e) {
      }
    });

    factory.setXIncludeAware(false);
    factory.setExpandEntityReferences(false);
    factory.setValidating(false);
    factory.setIgnoringComments(true);

    return factory;
  }

  /**
   * @return {@link SAXParserFactory} with following options set
   *         <ul>
   *         <li>XInclude: disabled</li>
   *         <li>Validation: disabled</li>
   *         <li>DTD: disabled</li>
   *         <li>External Entities (general+params): disabled</li>
   *         </ul>
   */
  public static SAXParserFactory newSaxParserFactory() {
    SAXParserFactory factory = SAXParserFactory.newInstance();

    // apply general features
    GENERAL_FACTORY_FEATURES.forEach((feature, flag) -> {
      try {
        factory.setFeature(feature, flag);
      } catch (Exception e) {
      }
    });

    factory.setXIncludeAware(false);
    factory.setValidating(false);

    return factory;
  }

  /**
   * fluent method to enable namespace awareness
   *
   * @param factory
   * @return
   */
  public static SAXParserFactory enableNamespaceAware(SAXParserFactory factory) {
    factory.setNamespaceAware(true);
    return factory;
  }

  /**
   * fluent method to enable namespace awareness
   *
   * @param factory
   * @return
   */
  public static DocumentBuilderFactory enableNamespaceAware(DocumentBuilderFactory factory) {
    factory.setNamespaceAware(true);
    return factory;
  }

}
