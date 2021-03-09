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

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.StringReader;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;

import de.businesscode.bcdui.logging.PageSqlLogger;
import de.businesscode.bcdui.web.errorLogging.ErrorLogEvent;
import de.businesscode.bcdui.web.servlets.StaticResourceServlet;
import de.businesscode.bcdui.web.servlets.StaticResourceServlet.Resource;
import de.businesscode.bcdui.wrs.export.Wrs2Excel;
import de.businesscode.util.Utils;

/**
 * Servlet utilizing POI class to create xslx files
 * Note that Sylk and Cvs exports are much more efficient than this, i.e. less bandwidth consuming, faster and less memory consuming since they are streaming and a leaner format
 * Use this only, when needed, for example because you fill an Excel template or because you need UTF-8 chars. UTF-8 chars cannot be handled by csv or sylk.
 * The incoming request can be
 * a) A WrsContainer, having a combination of WrsRequest and Wrs data children
 * b) A single WrsRequest or Wrs document
 * in both cases, WrsRequest are executed on server side
 * It is possible to define an Excel file ('template') in templateLocationInWar or templateLocationInVfs and sheet name as target into which to fill the data in
 */
public class ExcelExportServlet extends ExportServlet {
  private static final String templateLocationInWar = "/excelExportTemplates";
  private static final String templateLocationInVfs = "/bcdui/vfs/excelExportTemplates";
  private static final long serialVersionUID = 1L;
  private Logger log = Logger.getLogger(getClass());
  private final Logger virtLoggerPage = Logger.getLogger("de.businesscode.bcdui.logging.virtlogger.page");
  private final Set<String> templateContainers = new HashSet<>();
  private static AtomicInteger concurrent = new AtomicInteger(0);
  private static final int MAX_MEMORY_GB = 8;

  @Override
  public void init(ServletConfig config) throws ServletException {
    super.init(config);

    templateContainers.clear();
    templateContainers.add(templateLocationInWar);
    templateContainers.add(templateLocationInVfs);
    log.trace("Template Containers: " + templateContainers);
  }

  protected String getMaxRowsUserPermissionType() {
    return "bcdExport:maxRowsExcelExport";
  }

  @Override
  protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {

    int maxRows = getMaxRows(req, maxRowsDefault);

    log.trace("exporting Wrs at " + req.getRequestURL().toString());

    // Poi is memory intensive. Exporting 30k rows with 32 columns consumes about 1 GB (POI 3.14)
    if( concurrent.get() >= (30000.0 / maxRows)*MAX_MEMORY_GB  ) {
      resp.getWriter().println("<script>alert('Please note:\\nThe system limits the number of concurrent exports.\\nThis limit is currently reached.\\n\\nPlease request your export again later.');setTimeout(function(){window.history.back()}, 10);</script>");
      resp.setStatus( 509 );
      log.warn("Request to export Excel via POI was rejected due to exceeded limit.");
      return;
    }
    concurrent.incrementAndGet();
    
    String data = req.getParameter("data");
    if (data == null || data.isEmpty()) {
      throw new ServletException("No 'data' supplied or data exceeds server's POST limit (Tomcat: server.xml, Connector/@maxPostSize).");
    }
    // write response header
    resp.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    if (req.getPathInfo() != null) {
      resp.addHeader("Content-Disposition", "attachment; filename=" + req.getPathInfo().substring(1));
    }
    // do export
    try {

      // log page
      if(PageSqlLogger.getInstance().isEnabled()) {
        String pageHash = req.getParameter("pageHash");
        String requestUrl = req.getRequestURL().toString();
        String reqQuery = req.getQueryString();
        requestUrl += (reqQuery != null ? "?" + reqQuery : "");
        if (requestUrl.length()> 4000)
          requestUrl = requestUrl.substring(0, 4000);
        final PageSqlLogger.LogRecord logRecord = new PageSqlLogger.LogRecord(Utils.getSessionId(req, false), requestUrl, pageHash);
        virtLoggerPage.info(logRecord); // was level DEBUG
      }

      new Wrs2Excel().setTemplateResolver(new TemplateResolver()).export(new StringReader(data), resp.getOutputStream(), new HttpRequestOptions(getServletContext(), req, maxRows), req );

    } catch (Exception e) {
      throw new ServletException("Exception while processing the Wrs2Excel request.", e); // was previously throwing e.getCause()
    } finally {
      concurrent.decrementAndGet();
    }
  }

  /**
   * For Excel detail export, resolves templateName against well-known locations:
   * <pre>
   * file:/WEB-INF/excelTemplates
   * vfs :/excelTemplates
   * </pre>
   * Limiting the locations to well known locations prevents reading random server files
   */
  private class TemplateResolver implements Wrs2Excel.TemplateResolver {
    private static final String WELL_KNOWN_CONTAINER = "/WEB-INF/bcdui/excelTemplates";

    /**
     * Get an InputStream for the Excel template with the provided name templateName
     * If templateName == null, then an empty Excel file is returned.
     */
    @Override
    public InputStream getInputStream(String templateName) throws IOException {
      if (templateName.contains("..")) {
        throw new RuntimeException("templateName must not contain '..' characters");
      }
      String templateFile = WELL_KNOWN_CONTAINER + "/" + templateName.replaceAll("^/+", ""); // remove heading separator
      log.trace("locating template file: " + templateFile +  "; requested template name: " + templateName);
      try {
        Resource res = StaticResourceServlet.StaticResourceProvider.getInstance().getResource(getServletContext(), templateFile);
        if (res.notFound()) {
          throw new IOException("Template file not found: " + templateName);
        }
        return new ByteArrayInputStream(res.getData());
      } catch (Exception e) {
        throw new IOException("Failed open template: " + templateName, e);
      }
    }
  }
}
