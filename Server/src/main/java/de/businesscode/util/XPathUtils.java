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
package de.businesscode.util;

import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathFactory;
import javax.xml.xpath.XPathFactoryConfigurationException;

public class XPathUtils {
  /**
   * @return builtin java implementation XPathFactory: com.sun.org.apache.xpath.internal.jaxp.XPathFactoryImpl
   * @throws RuntimeException
   */
  public static XPathFactory newXPathFactory() {
    try {
      return XPathFactory.newInstance(XPathFactory.DEFAULT_OBJECT_MODEL_URI, "com.sun.org.apache.xpath.internal.jaxp.XPathFactoryImpl",
        XPathUtils.class.getClassLoader());
    } catch (XPathFactoryConfigurationException e) {
      throw new RuntimeException(e);
    }
  }

  /**
   * @return new {@link XPath} with {@link StandardNamespaceContext} assigned
   */
  public static XPath newXPath(){
    XPath xp = newXPathFactory().newXPath();
    StandardNamespaceContext nsContext = StandardNamespaceContext.getInstance();
    xp.setNamespaceContext(nsContext);
    return xp;
  }
}
