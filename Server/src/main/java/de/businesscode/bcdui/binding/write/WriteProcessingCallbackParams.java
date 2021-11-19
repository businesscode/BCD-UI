/*
  Copyright 2010-2021 BusinessCode GmbH, Germany

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
package de.businesscode.bcdui.binding.write;

import static de.businesscode.util.StandardNamespaceContext.BINDINGS_NAMESPACE;

import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpressionException;

import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.XPathUtils;

/**
 * callback params class scaffolding arbitrary parameters supplied to callback and
 * providing access API,
 *
 * The parameters sample:
 *{@code
 * <ul>
 *  <li><Param name="foo" x="a" y="b"/></li>
 *  <li><Param name="foo" z="x" d="y"/></li>
 *  <li><Param name="bindingItem" id="bcdUpdateBy" value="expression" isCoalesce="true"/></li>
 *  <li><Param name="bindingItem" id="bcdUpdateStamp" value="expression" isCoalesce="false"/></li>
 * </ul>
 *}
 * the parameter api is a list of parameter-maps in the order they are defined. The parameters however, are
 * not ordered. The definition above would result in a list of maps:
 *
 *  1st map: name=foo, x=a, y=b
 *  2nd map: name=foo, z=x, d=y
 *  3rd map: name=bindingItem, id=bcdUpdateBy, value=expression, isCoalesce=true
 *
 *  etc.
 *
 *  This class may be extended with convenience API for parameter retrieval, i.e. by param/name
 */
public class WriteProcessingCallbackParams {
  private final List<Map<String, String>> paramList = new LinkedList<Map<String,String>>();

  /**
   * convenience factory method which parses the Callback node as defined by bindings.xsd
   * @param callbackNode
   * @return
   * @throws XPathExpressionException
   */
  public static WriteProcessingCallbackParams parse(Node callbackNode) throws XPathExpressionException{
    final Logger log = LogManager.getLogger(WriteProcessingCallbackParams.class);
    final WriteProcessingCallbackParams instance = new WriteProcessingCallbackParams();

    final StandardNamespaceContext nsCtx = StandardNamespaceContext.getInstance();
    final XPath xPath = XPathUtils.newXPathFactory().newXPath();
    xPath.setNamespaceContext(nsCtx);
    final String xPathNS = nsCtx.getXMLPrefix(BINDINGS_NAMESPACE);

    // read params
    NodeList params = (NodeList) xPath.evaluate(xPathNS + "Param", callbackNode, XPathConstants.NODESET);
    for (int p = 0; p < params.getLength(); p++) {
      Element paramEl = (Element) params.item(p);

      // iterate for all atts
      Map<String, String> paramMap = new HashMap<String, String>();
      NamedNodeMap attsMap = paramEl.getAttributes();
      for(int i=0,s=attsMap.getLength(); i<s; i++){
        final Node paramNode = attsMap.item(i);
        final String paramName = paramNode.getNodeName();
        // skip name
        paramMap.put(paramName, paramNode.getTextContent());
      }

      if(paramMap.size()>0){
        instance.paramList.add(paramMap);
      }
    }

    if(log.isTraceEnabled()){
      log.trace("params defined: " + instance.paramList.size());
      for(Map<String,String> pars : instance.paramList){
        log.trace("param map : " + pars.toString());
      }
    }

    return instance;
  }

  protected WriteProcessingCallbackParams(){
    super();
  }

  public List<Map<String, String>> getParamList() {
    return paramList;
  }

  /**
   * retrieves map value with defaultValue
   *
   * @param map
   * @param key
   * @param defaultValue
   *
   * @return
   */
  public <T> T getValue(Map<String, T> map, String key, T defaultValue){
    return map.containsKey(key) ? (T)map.get(key) : defaultValue;
  }
}
