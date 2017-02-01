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
package de.businesscode.bcdui.web.servlets;

import java.io.IOException;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;

/**
 * Servlet to manage http-session attributes.
 *
 * Client can call the GET on servlet with parameters: name=&lt;attribute name&gt;&amp;value=&lt;attribute value&gt; and the servlet sets the session attribute.
 *
 * The comma separated list of allowed attributes should be configured in the init param ALLOWED_ATTRIBUTES.
 *
 */
public class SessionAttributesManager extends HttpServlet {
  private final Logger log = Logger.getLogger(getClass());
  //
  private String allowedAttributes; // comma separated list of allowed names

  /**
   * @see javax.servlet.GenericServlet#init(javax.servlet.ServletConfig)
   */
  @Override
  public void init(ServletConfig config) throws ServletException {
    super.init(config);
    //
    this.allowedAttributes = config.getInitParameter("ALLOWED_ATTRIBUTES");
    if (this.allowedAttributes != null) {
      log.debug("Configured with init parameter: " + this.allowedAttributes);
    }
    else {
      log.warn("Missing init parameter ALLOWED_ATTRIBUTES");
      this.allowedAttributes = "";
    }
  }

  /**
   * @see javax.servlet.http.HttpServlet#doGet(javax.servlet.http.HttpServletRequest, javax.servlet.http.HttpServletResponse)
   */
  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Pragma", "no-cache");
    response.setDateHeader("Expires", -1);
    //
    String name = request.getParameter("name");
    String value = request.getParameter("value");
    //
    if (name != null && name.length() > 0) {
      if (this.allowedAttributes.contains(name)) {
        request.getSession().setAttribute(name, value);
        //
        String message = "The attribute '" + name + "' was set to value '" + value + "'";
        log.debug(message);
        response.getWriter().append(message);
      }
      else {
        String message = "The attribute name '" + name + "' is not allowed by the configuration. Please set the init param ALLOWED_ATTRIBUTES in your web.xml";
        log.debug(message);
        response.getWriter().append(message);
      }
    }
    else {
      String message = "The parameter 'name' is empty";
      log.debug(message);
      response.getWriter().append(message);
    }
  }

}
