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

import org.apache.commons.lang3.StringUtils;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;

/**
 * decorator for apache shiro filter to bypass preflight cors requests, use this one instead of org.apache.shiro.web.servlet.ShiroFilter in your web.xml if you want enable CORS in your site
 */
public class ShiroFilter implements Filter {
  private org.apache.shiro.web.servlet.ShiroFilter shiroFilter = new org.apache.shiro.web.servlet.ShiroFilter();

  @Override
  public void init(FilterConfig filterConfig) throws ServletException {
    shiroFilter.init(filterConfig);
  }

  @Override
  public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
    var httpRequest = (HttpServletRequest) request;

    if (httpRequest.getHeader("Origin") != null && httpRequest.getHeader("Access-Control-Request-Method") != null && StringUtils.equalsIgnoreCase("OPTIONS", ((HttpServletRequest) request).getMethod())) {
      chain.doFilter(request, response);
    } else {
      shiroFilter.doFilter(request, response, chain);
    }
  }

  @Override
  public void destroy() {
    shiroFilter.destroy();
  }
}
