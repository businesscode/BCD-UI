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
import java.util.regex.Pattern;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;

/**
 * filter for identifying requests from MS Office applications like Word or Excel. 
 * no redirect to login page. 
 * otherwise the original request including query string gets lost.
 * 
 */

public class AvailabilityFilter implements Filter {
  public static final String cvsId = "$Id$";
  private final static Logger logger = Logger.getLogger(AvailabilityFilter.class);
  private final static Pattern USER_AGENTS_PATTERN = Pattern.compile( "([\\w\\W]*)(Word|Excel|PowerPoint|ms-office)([\\w\\W]*)");
  private final static Pattern EXCLUDE_USER_AGENTS_PATTERN = Pattern.compile( "([\\w\\W]*)Microsoft Outlook([\\w\\W]*)");

  @Override
  public void destroy() {}

  @Override
  public void doFilter(ServletRequest request, ServletResponse response,
      FilterChain chain) throws IOException, ServletException {
    try {
      HttpServletRequest httpRequest = (HttpServletRequest) request;
      HttpServletResponse httpResponse = (HttpServletResponse) response;

      String uri = httpRequest.getRequestURI().toLowerCase();
      int idx = uri.indexOf(";jsessionid=");
      if (idx != -1)
        uri = uri.substring(0, idx);
      if (!(uri.endsWith(".jsp")
          || uri.endsWith(".html")
          || uri.endsWith(".htm")
          || uri.endsWith("/")
          ) && httpRequest.getRequestedSessionId() != null && !httpRequest.isRequestedSessionIdValid()) {
        httpResponse.setStatus(401);
        return;
      }

      String navigator = httpRequest.getHeader("User-Agent");
      if ( USER_AGENTS_PATTERN.matcher(navigator).matches() && !EXCLUDE_USER_AGENTS_PATTERN.matcher(navigator).matches()) {
        logger.info( "Request from MS Office application blocked.");
        return;
      }
      else {
        chain.doFilter(request, response);
      }
    } catch (Throwable t) {
      logger.fatal("Availability filter failed", t);
      throw new ServletException("Unrecoverable server error occured. Please contact support.");
    }
  }

  @Override
  public void init(FilterConfig arg0) throws ServletException {}
}
