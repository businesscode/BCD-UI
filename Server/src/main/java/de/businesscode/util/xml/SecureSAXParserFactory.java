package de.businesscode.util.xml;

import javax.xml.parsers.ParserConfigurationException;
import javax.xml.parsers.SAXParserFactory;

import org.xml.sax.SAXNotRecognizedException;
import org.xml.sax.SAXNotSupportedException;

/**
 * Factory for {@link SAXParserFactory} preventing XXE attacks, according to
 * <a href="https://www.owasp.org/index.php/XML_External_Entity_(XXE)_Prevention_Cheat_Sheet#Java">OWASP Cheat Sheet</a>
 */
public abstract class SecureSAXParserFactory {
  /**
   * @return SAXParserFactory with following options set
   *         <ul>
   *         <li>XInclude: disabled</li>
   *         <li>Validation: disabled</li>
   *         <li>DTD: disabled</li>
   *         <li>External Entities (general+params): disabled</li>
   *         </ul>
   */
  public static SAXParserFactory newInstance() {
    SAXParserFactory factory = SAXParserFactory.newInstance();

    try {
      factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
    } catch (SAXNotRecognizedException | SAXNotSupportedException | ParserConfigurationException e) {
    }
    try {
      factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
    } catch (SAXNotRecognizedException | SAXNotSupportedException | ParserConfigurationException e) {
    }
    try {
      factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
    } catch (SAXNotRecognizedException | SAXNotSupportedException | ParserConfigurationException e) {
    }

    factory.setXIncludeAware(false);
    factory.setValidating(false);

    return factory;
  }
}
