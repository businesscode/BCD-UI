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
package de.businesscode.bcdui.web.wrs;

import de.businesscode.bcdui.toolbox.ServletUtils;
import de.businesscode.bcdui.wrs.IRequestOptions;
import de.businesscode.bcdui.wrs.load.ISqlGenerator;
import de.businesscode.bcdui.wrs.load.Wrq2Sql;
import de.businesscode.util.StandardNamespaceContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import java.io.IOException;

/**
  Returns the generated SQL statement for a Wrq.
  Note, this is a security risk, limit the usage to internal applications
 */
public class Wrq2SqlServlet extends HttpServlet {

  private static final long serialVersionUID = -1447179893615429245L;
  private final Logger log = LogManager.getLogger(getClass());
  // Default name of the permission in web.xml needed to access us as we expose implementation information here
  public static final String DEFAULT_PERMISSION = "bcdAdmin:ImplementationDetails";

  /**
   * @see HttpServlet#doGet(HttpServletRequest, HttpServletResponse)
   */
  @Override
  protected void doGet(HttpServletRequest request, final HttpServletResponse response) throws ServletException, IOException {

    if (log.isTraceEnabled())
      log.trace(String.format("processing url: %s", ServletUtils.getInstance().reconstructURL(request)));

    response.setContentType("text/xml");
    response.setCharacterEncoding("UTF-8");

    try {
      IRequestOptions options = new HttpRequestOptions(getServletContext(), request, -1);
      ISqlGenerator generator = new Wrq2Sql(options);
      response.getWriter()
        .append("<Wrs xmlns='"+StandardNamespaceContext.WRS_NAMESPACE+"'><Header><Sql><![CDATA[")
        .append(generator.getSelectStatement().getStatementWithParams())
        .append("]]></Sql></Header></Wrs>");
    }
    catch (Exception e) {
      throw new ServletException("Exception while processing the request.", e);
    }

    if (log.isTraceEnabled()) {
      log.trace("processed.");
    }
  }

}
