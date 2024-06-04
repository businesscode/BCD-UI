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
import java.util.LinkedHashSet;
import java.util.LinkedList;
import java.util.Map;

import jakarta.servlet.jsp.JspException;
import jakarta.servlet.jsp.PageContext;
import jakarta.servlet.jsp.tagext.TagSupport;

/**
 * This class allows adding a string value to the collection in the parent's paramBag belonging to the key
 */
public class AddToParamBagTag extends TagSupport {
  private static final long serialVersionUID = 1L;
  private String key = null;
  private String value = null;

  public String getValue() {
    return value;
  }

  public void setValue(String value) {
    this.value = value;
  }

  public String getKey() {
    return key;
  }

  public void setKey(String key) {
    this.key = key;
  }

  /**
   * Find the entry with the key in the parent's paramBag and add our value to the collection behind that key
   */
  public int doStartTag() throws JspException {
    try {
      if (key != null && key.trim().length() > 0 && value != null && value.trim().length() > 0) {
        LinkedList<Map<String,Collection<String>>> parameterContainers = (LinkedList<Map<String,Collection<String>>>) pageContext.getAttribute("paramBags", PageContext.REQUEST_SCOPE);
        if (parameterContainers != null && !parameterContainers.isEmpty()) {
          Map<String,Collection<String>> map = parameterContainers.peekLast();
          Collection<String> data = map.get(key);
          if (data == null) {
            data = new LinkedHashSet<String>();
            map.put(key, data);
          }
          data.add(value.trim());
        }
      }
    } catch (Exception e) {
      throw new JspException(e);
    }
    return EVAL_BODY_INCLUDE;
  }
}
