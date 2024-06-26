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
package de.businesscode.bcdui.web.wrs;

import java.util.Set;

import jakarta.servlet.ServletConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;

import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;
import org.apache.shiro.SecurityUtils;

import de.businesscode.bcdui.subjectsettings.SecurityHelper;

/**
 * Servlet providing the base class for ExcelExportServlet, SylkServlet and CsvServlet.
 * For now, the class handles the maxRowsDefault parameter that's common to all these servlets.
 * It provides method getMaxRows that can be overwritten for a custom logic on the export rows limit.
 */

public class ExportServlet extends HttpServlet {

  private static final long serialVersionUID = 1L;
  private Logger log = LogManager.getLogger(getClass());
  protected int maxRowsDefault = 30000; // Default

  @Override
  public void init(ServletConfig config) throws ServletException {
    super.init(config);
    try {
      maxRowsDefault = Integer.parseInt(config.getInitParameter("MaxRows"));
    } catch(Exception e) {
      if( config.getInitParameter("MaxRows") != null ) {
        log.warn("Servlet init parameter 'MaxRows' for "+getServletName()+" could not be parsed");
      }
    }
    String source = this.getClass().getName().substring(1 + this.getClass().getName().lastIndexOf("."));
    log.info(source + " using "+maxRowsDefault+" for export MaxRows, unless overwritten on user level.");
  }

  /**
   * Returns the maxRows value from subject setting bcdExport:maxRows
   * @param defValue fallback default value
   * @return either the given default value or the value coming from subjectSettings (if it's a valid integer)
   */
  public int getMaxRows( HttpServletRequest request, int defValue) {
    int maxRows = defValue;
    try {
      if (SecurityUtils.getSubject() != null && SecurityUtils.getSubject().isAuthenticated()) {
        Set<String> perms = SecurityHelper.getPermissions(SecurityUtils.getSubject(), getMaxRowsUserPermissionType());
        maxRows = perms.iterator().hasNext() ? Integer.parseInt(perms.iterator().next()) : defValue;
      }
    } catch (Exception e) {
      // ignore and return defValue
    }
    return maxRows;
  }

  protected String getMaxRowsUserPermissionType() {
    return "bcdExport:maxRows";
  }

}
