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

import org.apache.commons.lang.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * special filter to handle CORS, allows credentials to be sent, allows to be loaded from any origin and allow any http header and method.
 */
public class CorsFilter implements Filter {
  private static Logger logger = LogManager.getLogger();

  @Override
  public void init(FilterConfig filterConfig) throws ServletException {

  }

  @Override
  public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
    var httpRequest = (HttpServletRequest) request;
    var httpResponse = (HttpServletResponse) response;

    var clientOrigin = constructOrigin(httpRequest);

    logger.trace("client origin: {}", clientOrigin);

    // set specific Origin (=requester), wildcard does not work since we allow credentials
    httpResponse.setHeader("Access-Control-Allow-Origin", clientOrigin);
    // allow credentials to send cookies
    httpResponse.setHeader("Access-Control-Allow-Credentials", "true");
    // allow these headers to be accessed via JS
    httpResponse.setHeader("Access-Control-Expose-Headers", "x-bcd.location,x-bcd.pagehash,x-bcd.requesthash");

    // handle the preflight
    if (httpRequest.getHeader("Origin") != null && httpRequest.getHeader("Access-Control-Request-Method") != null && StringUtils.equalsIgnoreCase("OPTIONS", httpRequest.getMethod())) {
      httpResponse.setHeader("Access-Control-Allow-Methods", httpRequest.getHeader("Access-Control-Request-Method"));
      httpResponse.setHeader("Access-Control-Allow-Headers", httpRequest.getHeader("Access-Control-Request-Headers"));
    }

    chain.doFilter(request, response);
  }

  private String constructOrigin(HttpServletRequest httpRequest) {
    var clientOriginHeader = httpRequest.getHeader("Origin");
    return clientOriginHeader != null ? clientOriginHeader : String.format("%s://%s", httpRequest.getScheme(), httpRequest.getHeader("Host"));
  }

  @Override
  public void destroy() {

  }
}
