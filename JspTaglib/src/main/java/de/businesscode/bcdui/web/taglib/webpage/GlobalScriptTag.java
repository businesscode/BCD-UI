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
import java.util.Collection;
import java.util.HashSet;

import jakarta.servlet.jsp.JspException;
import jakarta.servlet.jsp.PageContext;
import jakarta.servlet.jsp.tagext.BodyContent;
import jakarta.servlet.jsp.tagext.BodyTagSupport;

public class GlobalScriptTag extends BodyTagSupport {

  private static final String GLOBAL_SCRIPT_TAG_NESTING_LEVEL = "GlobalScriptTagNestingLevel";
  private static final String GLOBAL_SCRIPT_TAG_LOADED_SCRIPTS = "GlobalScriptTagLoadedScripts";

  private static final long serialVersionUID = 1L;

  private String url = null;

  public int doStartTag() throws JspException {
    setGlobalScriptTagNestingLevel(getGlobalScriptTagNestingLevel() + 1);
    return EVAL_BODY_BUFFERED;
  }

  private int getGlobalScriptTagNestingLevel() {
    Object globalScriptTagNestingLevelStr = pageContext.getRequest().getAttribute(GLOBAL_SCRIPT_TAG_NESTING_LEVEL);
    if (globalScriptTagNestingLevelStr == null) return 0;
    return (Integer) globalScriptTagNestingLevelStr;
  }

  private void setGlobalScriptTagNestingLevel(int value) {
    pageContext.getRequest().setAttribute(GLOBAL_SCRIPT_TAG_NESTING_LEVEL, value);
  }

  private boolean isInsideScriptTag() {
    return getGlobalScriptTagNestingLevel() > 0;
  }

  public int doEndTag() throws JspException {
    setGlobalScriptTagNestingLevel(getGlobalScriptTagNestingLevel() - 1);
    try {
      BodyContent bodyContent = getBodyContent();
      if (url != null && url.trim().length() > 0) {
        if (addLoadedScript(url)) {
          pageContext.getOut().println("<script type=\"text/javascript\" src=\""+ getContextPath() + url + "\"> </script>");
        }
      } else
      if (bodyContent != null) {
        if (isInsideScriptTag()) {
          pageContext.getOut().println(bodyContent.getString());
        } else {
          pageContext.getOut().println("<script type=\"text/javascript\">" + bodyContent.getString() + "</script>");
        }
      }
    } catch (IOException e) {
      throw new JspException(e);
    }
    return EVAL_PAGE;
  }

  private String getContextPath() {
    return pageContext.getServletContext().getContextPath();
  }

  private boolean addLoadedScript(String url) {
    return getLoadedScripts().add(url);
  }

  @SuppressWarnings("unchecked")
  private Collection<String> getLoadedScripts() {
    Collection<String> loadedScripts = (Collection<String>) pageContext.getAttribute(GLOBAL_SCRIPT_TAG_LOADED_SCRIPTS, PageContext.REQUEST_SCOPE);
    if (loadedScripts == null) {
      loadedScripts = new HashSet<String>();
      pageContext.setAttribute(GLOBAL_SCRIPT_TAG_LOADED_SCRIPTS, loadedScripts, PageContext.REQUEST_SCOPE);
    }
    return loadedScripts;
  }

  public String getUrl() {
    return this.url;
  }

  public void setUrl(String url) {
    this.url = url;
  }
}
