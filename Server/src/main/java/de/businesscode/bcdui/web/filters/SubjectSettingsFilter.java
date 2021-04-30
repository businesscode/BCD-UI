/*
  Copyright 2010-2018 BusinessCode GmbH, Germany

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
import java.util.Arrays;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletResponse;

import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.session.Session;

import de.businesscode.bcdui.subjectsettings.SubjectSettings;
import de.businesscode.bcdui.subjectsettings.config.SubjectFilterType;

/**
 * This filter allows setting subject filter via HTTP calls, it is allowed to set value only for filter type defined as insecure, otherwise a HTTP-403 is
 * returned.
 */
public class SubjectSettingsFilter implements Filter {
  private Logger logger = LogManager.getLogger(getClass());
  public static final String PARAM_NAME_FILTER_NAME = "bcdSFN";
  public static final String PARAM_NAME_FILTER_VALUE = "bcdSFV";

  private SubjectSettings subjectSettings;

  @Override
  public void init(FilterConfig filterConfig) throws ServletException {
    this.subjectSettings = SubjectSettings.getInstance();
  }

  @Override
  public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
    final String[] filterNames = request.getParameterValues(PARAM_NAME_FILTER_NAME);
    final String[] filterValues = request.getParameterValues(PARAM_NAME_FILTER_VALUE);
    if (filterNames != null && filterNames.length > 0) {
      try {
        setFilterValue(filterNames, filterValues);
      } catch (de.businesscode.bcdui.subjectsettings.SecurityException e) {
        logger.warn("failed to set filter from client", e);
        ((HttpServletResponse) response).sendError(403);
        return;
      }
    }
    chain.doFilter(request, response);
  }

  /**
   * sets values of a given filters
   * 
   * @param filterNames
   * @param filterValues
   * @throws de.businesscode.bcdui.subjectsettings.SecurityException
   */
  private void setFilterValue(String[] filterNames, String[] filterValues) throws de.businesscode.bcdui.subjectsettings.SecurityException {
    // retrieve types and precheck
    final SubjectFilterType[] filterTypes = Arrays.stream(filterNames).map((filterName) -> {
      SubjectFilterType filterType = subjectSettings.getSubjectFilterTypeByName(filterName);

      if (filterType == null) {
        throw new de.businesscode.bcdui.subjectsettings.SecurityException("filterName not found: " + filterName);
      }

      if (!filterType.isIsClientControlled()) {
        throw new de.businesscode.bcdui.subjectsettings.SecurityException("filterType is not marked as 'isClientControlled': " + filterName);
      }

      return filterType;
    }).toArray(size -> new SubjectFilterType[size]);

    final Session session = SecurityUtils.getSubject().getSession(true);
    // set values associatively
    for (int i = 0, imax = filterTypes.length; i < imax; i++) {
      subjectSettings.setFilterTypeValue(session, filterTypes[i], filterValues[i]);
    }
  }

  @Override
  public void destroy() {

  }
}
