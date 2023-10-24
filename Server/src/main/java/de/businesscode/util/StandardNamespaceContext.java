/*
  Copyright 2010-2022 BusinessCode GmbH, Germany

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

import java.util.Collections;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.SortedMap;
import java.util.TreeMap;

import javax.xml.namespace.NamespaceContext;

/**
 * Singleton to hold all well-known BCD-UI namespaces and their prefixes
 * The prefixes must be used in client js code because they are made known to the browser's parser
 */
public class StandardNamespaceContext implements NamespaceContext {

  private static StandardNamespaceContext singelton = null;

  private SortedMap<String, String> mapping;
  private Map<String, String> reverseMapping;
  private String json; // Namespace js map for usage by the client

  // Add any namespace declared here to he "mapping" below
  // Also, please note that any namespace must also me declared in multiOptionsModelWrapper.xslt
  // as it does copy user given XPath expressions as literals into its output xslt
  public static final String BCDXML_PREFIX          = "bcdxml";
  public static final String BCDXML_NAMESPACE       = "http://www.businesscode.de/schema/bcdui/bcdxml-1.0.0";
  public static final String BCDXSLGEN_PREFIX       = "generator";
  public static final String BCDXSLGEN_NAMESPACE    = "urn(bcd-xsltGenerator)";
  public static final String BINDINGS_PREFIX        = "b";
  public static final String BINDINGS_NAMESPACE     = "http://www.businesscode.de/schema/bcdui/bindings-1.0.0";
  public static final String CALC_PREFIX            = "calc";
  public static final String CALC_NAMESPACE         = "http://www.businesscode.de/schema/bcdui/calc-1.0.0";
  public static final String CHAIN_PREFIX           = "chain";
  public static final String CHAIN_NAMESPACE        = "http://www.businesscode.de/schema/bcdui/chain-1.0.0";
  public static final String CHART_PREFIX           = "chart";
  public static final String CHART_NAMESPACE        = "http://www.businesscode.de/schema/bcdui/charts-1.0.0";
  public static final String CUBE_PREFIX            = "cube";
  public static final String CUBE_NAMESPACE         = "http://www.businesscode.de/schema/bcdui/cube-2.0.0";
  public static final String GRID_PREFIX            = "grid";
  public static final String GRID_NAMESPACE         = "http://www.businesscode.de/schema/bcdui/grid-1.0.0";
  public static final String FAR_PREFIX             = "far";
  public static final String FAR_NAMESPACE          = "http://www.businesscode.de/schema/bcdui/far-1.0.0";
  public static final String CUST_PREFIX            = "cust";
  public static final String CUST_NAMESPACE         = "http://www.businesscode.de/schema/bcdui/customization-1.0.0";
  public static final String CSV_PREFIX             = "csv";
  public static final String CSV_NAMESPACE          = "http://www.businesscode.de/schema/bcdui/csv-1.0.0";
  public static final String CONFIG_PREFIX          = "cnf";
  public static final String CONFIG_NAMESPACE       = "http://www.businesscode.de/schema/bcdui/config-1.0.0";
  public static final String CTX_PREFIX             = "ctx";
  public static final String CTX_NAMESPACE          = "http://www.businesscode.de/schema/bcdui/contextMenu-1.0.0";
  public static final String DM_PREFIX              = "dm";
  public static final String DM_NAMESPACE           = "http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0";
  public static final String EXSLT_PREFIX           = "exslt";
  public static final String EXSLT_NAMESPACE        = "http://exslt.org/common";
  public static final String EXSLTDATE_PREFIX       = "date";
  public static final String EXSLTDATE_NAMESPACE    = "http://exslt.org/dates-and-times";
  public static final String FILTER_PREFIX          = "f";
  public static final String FILTER_NAMESPACE       = "http://www.businesscode.de/schema/bcdui/filter-1.0.0";
  public static final String GML_PREFIX             = "gml";
  public static final String GML_NAMESPACE          = "http://www.opengis.net/gml";
  public static final String GUISTATUS_PREFIX       = "guiStatus";
  public static final String GUISTATUS_NAMESPACE    = "http://www.businesscode.de/schema/bcdui/guiStatus-1.0.0";
  public static final String HTML_PREFIX            = "html";
  public static final String HTML_NAMESPACE         = "http://www.w3.org/1999/xhtml";
  public static final String MENU_PREFIX            = "menu";
  public static final String MENU_NAMESPACE         = "http://www.businesscode.de/schema/bcdui/menu-1.0.0";
  public static final String MSXSL_PREFIX           = "msxsl";
  public static final String MSXSL_NAMESPACE        = "urn:schemas-microsoft-com:xslt";
  public static final String RENDERER_PREFIX        = "rnd";
  public static final String RENDERER_NAMESPACE     = "http://www.businesscode.de/schema/bcdui/renderer-1.0.0";
  public static final String SCHEDULER_PREFIX       = "sched";
  public static final String SCHEDULER_NAMESPACE    = "http://www.businesscode.de/schema/bcdui/sched-1.0.0";
  public static final String SCORECARD_PREFIX       = "scc";
  public static final String SCORECARD_NAMESPACE    = "http://www.businesscode.de/schema/bcdui/scorecard-1.0.0";
  public static final String SECURITY_PREFIX        = "sec";
  public static final String SECURITY_NAMESPACE     = "http://www.businesscode.de/schema/bcdui/subjectsettings-1.0.0";
  public static final String SOAPENV_PREFIX         = "env";
  public static final String SOAPENV_NAMESPACE      = "http://www.w3.org/2003/05/soap-envelope";
  public static final String TEXTNAV_PREFIX         = "txtnav";
  public static final String TEXTNAV_NAMESPACE      = "http://www.businesscode.de/schema/bcdui/textnavigation-1.0.0";
  public static final String TREE_PREFIX            = "tree";
  public static final String TREE_NAMESPACE         = "http://www.businesscode.de/schema/bcdui/tree-1.0.0";
  public static final String WRS_PREFIX             = "wrs";
  public static final String WRS_NAMESPACE          = "http://www.businesscode.de/schema/bcdui/wrs-1.0.0";
  public static final String WRSREQUEST_PREFIX      = "wrq";
  public static final String WRSREQUEST_NAMESPACE   = "http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0";
  public static final String XAPI_PREFIX            = "xapi";
  public static final String XAPI_NAMESPACE         = "http://www.businesscode.de/schema/bcdui/xmlapi-1.0.0";
  public static final String XSL_PREFIX             = "xsl";
  public static final String XSL_NAMESPACE          = "http://www.w3.org/1999/XSL/Transform";
  public static final String XI_PREFIX              = "xi";
  public static final String XI_NAMESPACE           = "http://www.w3.org/2001/XInclude";
  public static final String XSLTFORMULAR_PREFIX    = "fmla";
  public static final String XSLTFORMULAR_NAMESPACE = "http://www.businesscode.de/schema/bcdui/xsltFormulas-1.0.0";
  public static final String XSLTPARAMS_PREFIX      = "xp";
  public static final String XSLTPARAMS_NAMESPACE   = "http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0";
  /**
   * Constructor for singelton
   */
  protected StandardNamespaceContext() {
    mapping = new TreeMap<String, String>();
    mapping.put(BCDXML_PREFIX,       BCDXML_NAMESPACE);
    mapping.put(BCDXSLGEN_PREFIX,    BCDXSLGEN_NAMESPACE);
    mapping.put(BINDINGS_PREFIX,     BINDINGS_NAMESPACE);
    mapping.put(CALC_PREFIX,         CALC_NAMESPACE);
    mapping.put(CHAIN_PREFIX,        CHAIN_NAMESPACE);
    mapping.put(CHART_PREFIX,        CHART_NAMESPACE);
    mapping.put(CONFIG_PREFIX,       CONFIG_NAMESPACE);
    mapping.put(CSV_PREFIX,          CSV_NAMESPACE);
    mapping.put(CTX_PREFIX,          CTX_NAMESPACE);
    mapping.put(CUBE_PREFIX,         CUBE_NAMESPACE);
    mapping.put(GRID_PREFIX,         GRID_NAMESPACE);
    mapping.put(CUST_PREFIX,         CUST_NAMESPACE);
    mapping.put(DM_PREFIX,           DM_NAMESPACE);
    mapping.put(EXSLT_PREFIX,        EXSLT_NAMESPACE);
    mapping.put(EXSLTDATE_PREFIX,    EXSLTDATE_NAMESPACE);
    mapping.put(FAR_PREFIX,          FAR_NAMESPACE);
    mapping.put(FILTER_PREFIX,       FILTER_NAMESPACE);
    mapping.put(GML_PREFIX,          GML_NAMESPACE);
    mapping.put(GUISTATUS_PREFIX,    GUISTATUS_NAMESPACE);
    mapping.put(HTML_PREFIX,         HTML_NAMESPACE);
    mapping.put(MENU_PREFIX,         MENU_NAMESPACE);
    mapping.put(MSXSL_PREFIX,        MSXSL_NAMESPACE);
    mapping.put(RENDERER_PREFIX,     RENDERER_NAMESPACE);
    mapping.put(SCHEDULER_PREFIX,    SCHEDULER_NAMESPACE);
    mapping.put(SCORECARD_PREFIX,    SCORECARD_NAMESPACE);
    mapping.put(SECURITY_PREFIX,     SECURITY_NAMESPACE);
    mapping.put(SOAPENV_PREFIX,      SOAPENV_NAMESPACE);
    mapping.put(TEXTNAV_PREFIX,      TEXTNAV_NAMESPACE);
    mapping.put(TREE_PREFIX,         TREE_NAMESPACE);
    mapping.put(WRSREQUEST_PREFIX,   WRSREQUEST_NAMESPACE);
    mapping.put(WRS_PREFIX,          WRS_NAMESPACE);
    mapping.put(XAPI_PREFIX,         XAPI_NAMESPACE);
    mapping.put(XSL_PREFIX,          XSL_NAMESPACE);
    mapping.put(XI_PREFIX,           XI_NAMESPACE);
    mapping.put(XSLTFORMULAR_PREFIX, XSLTFORMULAR_NAMESPACE);
    mapping.put(XSLTPARAMS_PREFIX,   XSLTPARAMS_NAMESPACE);

    //
    reverseMapping = new HashMap<String, String>();
    for (Iterator<String> iterator = mapping.keySet().iterator(); iterator.hasNext();) {
      String prefix = iterator.next();
      reverseMapping.put(mapping.get(prefix), prefix);
    }

    // Create a namespace js map for usage by the client
    StringBuffer jsonB = new StringBuffer();
    jsonB.append("  namespaces: {\n");
    for (Iterator<String> iterator = mapping.keySet().iterator(); iterator.hasNext();) {
      String prefix = iterator.next();
      String p = String.format("%1$-12s", prefix+":");
      jsonB.append("    ").append(p).append("\"").append(mapping.get(prefix)).append("\"");
      if( iterator.hasNext() )
        jsonB.append(",");
      jsonB.append("\n");
    }
    jsonB.append("    }");

    json = jsonB.toString();
  }

  /**
   * Provide the singelton
   * @return
   */
  public static synchronized StandardNamespaceContext getInstance() {
    if( singelton==null )
      singelton = new StandardNamespaceContext();
    return singelton;
  }

  /**
   * For usage by the client
   * @return A js map named "namespaces" containing prefix-namespace mappings
   */
  public String getAsJs()
  {
    return json;
  }


  @Override
  public String getNamespaceURI(String prefix) {
    return mapping.get(prefix);
  }

  @Override
  public String getPrefix(String namespaceURI) {
    return reverseMapping.get(namespaceURI);
  }

  /**
   * @return the mapping (unmodifiable)
   */
  public SortedMap<String, String> getMapping() {
    return Collections.unmodifiableSortedMap(this.mapping);
  }

  @SuppressWarnings("rawtypes")
  @Override
  public Iterator getPrefixes(String namespaceURI) {
    return mapping.keySet().iterator();
  }

  /**
   * getXMLPrefix
   * @param namespaceURI
   * @return the String "prefix:" or an empty String if not prefix for the given namespaceURI
   */
  public String getXMLPrefix(String namespaceURI) {
    String prefix = getPrefix(namespaceURI);
    if (prefix == null) {
      prefix = "";
    }
    if (prefix.length() > 0) {
      prefix = prefix + ":";
    }
    return prefix;
  }
}