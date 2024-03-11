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
package de.businesscode.bcdui.web.filters;

import java.io.IOException;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.w3c.dom.Document;

import de.businesscode.bcdui.web.servlets.ZipLet;

public class UnZipFilter implements Filter {
  private static final Logger log = LogManager.getLogger(UnZipFilter.class);

  /**
   *
   */
  public UnZipFilter() {
  }

  /**
   * @see jakarta.servlet.Filter#init(jakarta.servlet.FilterConfig)
   */
  @Override
  public void init(FilterConfig filterConfig) throws ServletException {
  }

  /**
   * @see jakarta.servlet.Filter#doFilter(jakarta.servlet.ServletRequest, jakarta.servlet.ServletResponse, jakarta.servlet.FilterChain)
   */
  @Override
  public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
    if (request.getAttribute("guiStatusDoc") == null) {
      String guiStatusGZ = request.getParameter("guiStatusGZ");
      if (guiStatusGZ != null) {
        try {
          Document doc = ZipLet.decodeAndDecompressToXML(guiStatusGZ, (HttpServletRequest) request);
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
   * @see jakarta.servlet.Filter#destroy()
   */
  @Override
  public void destroy() {
  }

}
