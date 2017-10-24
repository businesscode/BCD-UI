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
package de.businesscode.bcdui.web.filters;

import java.io.IOException;
import org.apache.log4j.Logger;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;

import org.w3c.dom.Document;

import de.businesscode.bcdui.web.servlets.ZipLet;

public class UnZipFilter implements Filter {
  private ServletContext servletContext;
  private static final Logger log = Logger.getLogger(UnZipFilter.class);

  /**
   *
   */
  public UnZipFilter() {
  }

  /**
   * @see javax.servlet.Filter#init(javax.servlet.FilterConfig)
   */
  @Override
  public void init(FilterConfig filterConfig) throws ServletException {
    this.servletContext = filterConfig.getServletContext();
  }

  /**
   * @return the servletContext
   */
  private ServletContext getServletContext() {
    return servletContext;
  }

  /**
   * @see javax.servlet.Filter#doFilter(javax.servlet.ServletRequest, javax.servlet.ServletResponse, javax.servlet.FilterChain)
   */
  @Override
  public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
    if (request.getAttribute("guiStatusDoc") == null) {
      String guiStatusGZ = request.getParameter("guiStatusGZ");
      if (guiStatusGZ != null) {
        try {
          Document doc = ZipLet.decodeAndDecompressToXMLWithXInclude(guiStatusGZ, getServletContext(), (HttpServletRequest) request);
          request.setAttribute("guiStatusDoc", doc);
        }
        catch (Exception e) {
          log.warn("Cannot unzip the GuiStatus.", e);
        }
      }
    }
    //
    chain.doFilter(request, response);
  }

  /**
   * @see javax.servlet.Filter#destroy()
   */
  @Override
  public void destroy() {
  }

}
