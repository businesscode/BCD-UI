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

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import jakarta.servlet.jsp.JspContext;
import jakarta.servlet.jsp.PageContext;
import jakarta.servlet.jsp.tagext.SimpleTagSupport;

/**
 * Prints the id if not empty and a unique new id otherwise
 * Registers an id generator and creates page-unique ids by incrementing a counter, there is one counter per prefix
 * The created ids follow the pattern &lt;prefix&gt;_&lt;runningNumber&gt;
 */

public class UniqueIdTag extends SimpleTagSupport {
  private static final long serialVersionUID = 1L;

  private String id;
  private String prefix;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getPrefix() {
    return prefix;
  }

  public void setPrefix(String prefix) {
    this.prefix = prefix;
  }

  public static String generateId(JspContext context, String prefix) {
    @SuppressWarnings("unchecked")
    Map<String, Integer> idGeneratorMap = (Map<String, Integer>) context.getAttribute("bcdui_IdGeneratorMap", PageContext.REQUEST_SCOPE);
    if (idGeneratorMap == null) {
      idGeneratorMap = new HashMap<String, Integer>();
      context.setAttribute("bcdui_IdGeneratorMap", idGeneratorMap, PageContext.REQUEST_SCOPE);
    }
    Integer runningNumber = idGeneratorMap.get(prefix);
    if (runningNumber == null) {
      idGeneratorMap.put(prefix, 1);
      return "bcdSId_" + prefix + "0";
    }
    idGeneratorMap.put(prefix, runningNumber + 1);
    return "bcdSId_" + prefix + runningNumber;
  }

  public void doTag() throws IOException {
    JspContext context = getJspContext();
    if (id == null || id.length() == 0) {
      id = generateId(context, prefix == null ? "" : prefix);
    }
    context.getOut().print(id);
  }
}
