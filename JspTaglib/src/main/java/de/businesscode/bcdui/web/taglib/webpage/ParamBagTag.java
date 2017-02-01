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
package de.businesscode.bcdui.web.taglib.webpage;

import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.LinkedList;
import java.util.Map;

import javax.servlet.jsp.JspException;
import javax.servlet.jsp.PageContext;
import javax.servlet.jsp.tagext.BodyTagSupport;

/**
 * This class is used for exchanging named string values between tags
 * paramBags are organized like a stack, where each &lt;webpage:paramBag&gt;..&lt;/webpage:paramBag&gt; gives a frame on the stack
 * Each such frame is a Map&lt;String, Collection&lt;String&gt;&gt;
 * The paramBags "stack" is a java structure stored in the request scope variable "paramBags",
 * in addition a request scope variable "paramBag" contains the current frame
 * This allows an inner tag to access the parent's paramBag and publish named string collections to it and the parent to pick it up
 *
 * In addition this tag allows "forwarding" values assigned from a child to our paramBag to our parent' paramBag under a new name
 * For example &lt;b:chain&gt;&lt;b:model url="chain.xml"/&gt;&lt;/b:chain&gt;
 * b:chain does forwarding="dataProviders=&gt;chain"
 * The b:model will add itself as a "dataProviders" to b:chain, b:chain in turn will in effect forward
 * that "dataProviders" under the name "chain" to the paramBag of its parent, maybe a renderer
 */
public class ParamBagTag extends BodyTagSupport {
  private static final long serialVersionUID = 1L;
  private String forwarding = null;

  public int doStartTag() throws JspException {
    pushParamBag();
    return EVAL_BODY_INCLUDE;
  }

  public String getForwarding() {
    return forwarding;
  }

  public void setForwarding(String forwarding) {
    this.forwarding = forwarding;
  }

  /**
   * Start of the <webpage:paramBag> tag, add a new stack frame, consisting of a Map<String, Collection<String>>
   */
  private void pushParamBag() {
    LinkedList<Map<String, Collection<String>>> parameterContainers = (LinkedList<Map<String, Collection<String>>>) pageContext.getAttribute("paramBags", PageContext.REQUEST_SCOPE);
    if (parameterContainers == null) { // in case we are the outer most one, create the "stack"
      parameterContainers = new LinkedList<Map<String,Collection<String>>>();
      pageContext.setAttribute("paramBags", parameterContainers, PageContext.REQUEST_SCOPE);
    }

    Map<String, Collection<String>> paramBag = new HashMap<String, Collection<String>>();
    Map<String, Collection<String>> parent = parameterContainers.peekLast();
    if (forwarding != null && forwarding.length() > 0 && parent != null) {
      for (String item : forwarding.split(" ")) { // space separated list of forwards
        String[] values = item.trim().split("="); // each forward has a "from=>to" expression
        if (values.length < 2) continue;
        if (values[1].startsWith(">")) values[1] = values[1].substring(1);
        Collection<String> parentCollection = parent.get(values[1]);
        if (parentCollection == null) { // In case the key to forward to is new to the parent's bag
          parentCollection = new LinkedHashSet<String>();
          parent.put(values[1], parentCollection);
        }
        // now add the parent's collection to our paramBag under the "from" key
        // So any child of ours will - without noticing - add its content directly to our parent's paramBag when adding it to ours
        // i.e. we'll pass forward any assignment to our parent
        paramBag.put(values[0], parentCollection);
      }
    }

    parameterContainers.addLast(paramBag);
    pageContext.setAttribute("paramBag", paramBag, PageContext.REQUEST_SCOPE);
  }

  /**
   * End of the </webpage:paramBag> tag, removing the just (in pushParamBag) created element from the stack
   * and replace the pageContext variable "paramBag" with the new state
   */
  private void popParamBag() {
    LinkedList<Map<String,Collection<String>>> parameterContainers = (LinkedList<Map<String,Collection<String>>>) pageContext.getAttribute("paramBags", PageContext.REQUEST_SCOPE);
    pageContext.removeAttribute("paramBag", PageContext.REQUEST_SCOPE);
    if (parameterContainers != null) {
      parameterContainers.removeLast();
      if (!parameterContainers.isEmpty()) {
        pageContext.setAttribute("paramBag", parameterContainers.peekLast(), PageContext.REQUEST_SCOPE);
      }
    }
  }

  public int doEndTag() throws JspException {
    popParamBag();
    return EVAL_PAGE;
  }
}
