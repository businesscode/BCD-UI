/*
  Copyright 2010-2019 BusinessCode GmbH, Germany

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

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;

import org.apache.log4j.Logger;
import org.apache.shiro.SecurityUtils;

import de.businesscode.bcdui.subjectsettings.SecurityHelper;

/**
 * Servlet providing the base class for ExcelExportServlet, SylkServlet and CsvServlet.
 * For now, the class handles the maxRowsDefault parameter that's common to all these servlets.
 * It provides method getMaxRows that can be overwritten for a custom logic on the export rows limit.
 */

public class ExportServlet extends HttpServlet {

  private static final long serialVersionUID = 1L;
  private Logger log = Logger.getLogger(getClass());
  protected int maxRowsDefault = 30000; // Default

  @Override
  public void init(ServletConfig config) throws ServletException {
    super.init(config);
    try {
      maxRowsDefault = Integer.parseInt(config.getInitParameter("MaxRows"));
    } catch(Exception e) {
      log.info("For "+getServletName()+" init parameter MaxRows not found, using default.");
    }
  }

  /**
   * Returns the maxRows value from subject setting bcdExport:maxRows
   * @param defValue fallback default value
   * @return either the given default value or the value coming from subjectSettings (if it's a valid integer)
   */
  public int getMaxRows(int defValue) {
    int maxRows = defValue;
    try {
      if (SecurityUtils.getSubject() != null && SecurityUtils.getSubject().isAuthenticated()) {
        Set<String> perms = SecurityHelper.getPermissions(SecurityUtils.getSubject(), "bcdExport:maxRows");
        maxRows = perms.iterator().hasNext() ? Integer.parseInt(perms.iterator().next()) : defValue;
      }
    } catch (Exception e) {
      // ignore and return defValue
    }
    return maxRows;
  }
}
