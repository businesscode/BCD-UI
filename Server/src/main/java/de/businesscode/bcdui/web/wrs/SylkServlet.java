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

import java.io.IOException;
import java.io.PrintWriter;
import java.net.SocketException;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;

import de.businesscode.bcdui.toolbox.ServletUtils;
import de.businesscode.bcdui.wrs.IRequestOptions;
import de.businesscode.bcdui.wrs.export.SylkDataWriter;
import de.businesscode.bcdui.wrs.load.DataLoader;
import de.businesscode.bcdui.wrs.load.ISqlGenerator;
import de.businesscode.bcdui.wrs.load.Wrq2Sql;


public class SylkServlet extends ExportServlet {

  private static final long serialVersionUID = 4633486737694422869L;
  //
  private final Logger log = LogManager.getLogger(getClass());
  private final Logger virtLoggerAccess = LogManager.getLogger("de.businesscode.bcdui.logging.virtlogger.access");

  /**
   * SylkServlet
   */
  public SylkServlet() {
  }

  /**
   * @see jakarta.servlet.http.HttpServlet#service(jakarta.servlet.http.HttpServletRequest, jakarta.servlet.http.HttpServletResponse)
   */
  @Override
  protected void service(HttpServletRequest request, final HttpServletResponse response) throws ServletException, IOException {

    int maxRows = getMaxRows(request, maxRowsDefault);

    if (log.isTraceEnabled()) {
      log.trace(String.format("processing url: %s", ServletUtils.getInstance().reconstructURL(request)));
    }
    /* depending on the browser we either return excel or plain text as mime type */
    if("".concat(request.getHeader("User-Agent")).contains("MSIE")) {
      // IE knows how to treat the extension .slk
      response.setContentType("text/plain");
    }else{
      response.setContentType("application/vnd.ms-excel");
    }

    /* if we've got a "filename" on pathinfo - we instruct the browser to handle it as a download */
    String pathInfo;
    if((pathInfo=request.getPathInfo()) != null){
      String fileName = pathInfo.substring(1).replaceAll("\\/", "");
      fileName = fileName.replaceAll("[^A-Za-z0-9_\\-\\.\\ ]", "_");
      response.setHeader("Content-Disposition", "attachment; filename=" + fileName);
    }
    SylkDataWriter dataWriter = null;
    try {
      IRequestOptions options = new HttpRequestOptions(getServletContext(), request,maxRows);
      ISqlGenerator generator = new Wrq2Sql(options);
      //
      dataWriter = new SylkDataWriter() {
        @Override
        protected PrintWriter getLazyStream() throws Exception {
          PrintWriter writer = response.getWriter();
          // Sadly, we cannot use BOM here as we do for csv to force Excel recognizing UTF, because at least Excel 2016 does then not recognize sylk
          return writer;
        }
      };
      dataWriter.setAddInf(options);
      //
      String appURL = request.getScheme() + "://" + request.getServerName() + ":" + request.getServerPort() + request.getContextPath() + "/";
      dataWriter.setApplicationURL(appURL);
      //
      DataLoader loader = new DataLoader(options, generator, dataWriter);
      loader.run();
      //
      // log wrs-access
      WrsAccessLogEvent logEvent = new WrsAccessLogEvent(WrsAccessLogEvent.ACCESS_TYPE_SYLK, request, options, generator, loader, dataWriter);
      virtLoggerAccess.info(logEvent); // was level DEBUG
    }
    catch (SocketException e) {
      // no need to log Exception 'Connection reset by peer: socket write error'
      if (e.getMessage().indexOf("Connection reset by peer") < 0)
        throw new ServletException("Exception while processing the SYLK-request.", e);
    }
    catch (Exception e) {
      throw new ServletException("Exception while processing the SYLK-request.", e);
    }
    finally {
      try {
        if (dataWriter != null)
          dataWriter.close();
      }
      catch (Exception ignore) {
      }
    }
    if (log.isTraceEnabled()) {
      log.trace("processed.");
    }
  }

}
