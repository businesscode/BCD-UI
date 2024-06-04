/*
  Copyright 2010-2024 BusinessCode GmbH, Germany

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
package de.businesscode.bcdui.web.taglib.webpage;

import java.util.Collection;
import java.util.LinkedList;
import java.util.Map;

import jakarta.servlet.jsp.JspContext;
import jakarta.servlet.jsp.JspException;
import jakarta.servlet.jsp.PageContext;
import jakarta.servlet.jsp.tagext.SimpleTagSupport;

/**
 * This class supports special handling of the "parameters" collection and of "param_"xx dataProviders in the paramBag
 * Standard collections in the paramBag are just (key,Collection&lt;String&gt;) pairs but for the
 * 1) "parameters" collection, each string has a well-known sub-structure name:value
 * This calls converts this structure into a json-like js argument, allowing to use it as an argument map in js
 * 2) dataProviders, they are added via (param_&lt;dpKey&gt;,dpName) pairs to the paramBag
 */

public class ExtractJSParamsFromParamBagTag extends SimpleTagSupport {
  private static final long serialVersionUID = 1L;

  public void doTag() throws JspException {
    try {
      JspContext context = getJspContext();
      LinkedList<Map<String, Collection<String>>> parameterContainers = (LinkedList<Map<String, Collection<String>>>) context.getAttribute("paramBags", PageContext.REQUEST_SCOPE);
      StringBuilder result = new StringBuilder();
      if (parameterContainers != null && !parameterContainers.isEmpty()) {
        Map<String, Collection<String>> map = parameterContainers.peekLast();

        // Handling of the parameter strings .. "paramName1: paramValue1," ...
        if (map != null) {
          Collection<String> stringParameters = map.get("parameters");
          if (stringParameters != null) {
            for (String paramDef : stringParameters) {
              int pos = paramDef.indexOf(':');
              if (result.length() > 0) result.append(", ");
              result.append(paramDef.substring(0, pos) + ": ");
              result.append(Functions.quoteJSString(paramDef.substring(pos + 1)));
            }
          }

          // Special handling for data providers, they are added with "param_" prefix and not in the "parameters" value
          // creates ... "dpkey1: { refId: dpName1 }," ...
          for (Map.Entry<String, Collection<String>> entry : map.entrySet()) {
            String key = entry.getKey();
            Collection<String> valueCollection = entry.getValue();
            if (key.startsWith("param_") && valueCollection != null && !valueCollection.isEmpty()) {
              String value = valueCollection.iterator().next().trim();
              if (value.length() > 0) {
                if (result.length() > 0) result.append(", ");
                result.append(key.substring(6) + ": { refId: ");
                result.append(Functions.quoteJSString(value));
                result.append("}");
              }
            }
          }
        }
      }
      context.getOut().print("{ " + result + " }");
    } catch (Exception e) {
      throw new JspException(e);
    }
  }
}
