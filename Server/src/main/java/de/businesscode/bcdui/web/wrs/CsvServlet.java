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

import java.io.IOException;
import java.io.PrintWriter;
import java.io.Writer;
import java.net.SocketException;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;

import de.businesscode.bcdui.toolbox.ServletUtils;
import de.businesscode.bcdui.web.errorLogging.ErrorLogEvent;
import de.businesscode.bcdui.wrs.IRequestOptions;
import de.businesscode.bcdui.wrs.export.CsvDataWriter;
import de.businesscode.bcdui.wrs.load.DataLoader;
import de.businesscode.bcdui.wrs.load.IDataWriter;
import de.businesscode.bcdui.wrs.load.ISqlGenerator;
import de.businesscode.bcdui.wrs.load.Wrq2Sql;

public class CsvServlet extends ExportServlet {

  private static final long serialVersionUID = 4633486737694422869L;
  //
  private final Logger log = Logger.getLogger(getClass());
  private final Logger virtLoggerError = Logger.getLogger("de.businesscode.bcdui.logging.virtlogger.error");
  private final Logger virtLoggerAccess = Logger.getLogger("de.businesscode.bcdui.logging.virtlogger.access");

  /**
   * CsvServlet
   */
  public CsvServlet() {
  }

  /**
   * @see javax.servlet.http.HttpServlet#doGet(javax.servlet.http.HttpServletRequest, javax.servlet.http.HttpServletResponse)
   */
  @Override
  protected void doGet(HttpServletRequest request, final HttpServletResponse response) throws ServletException, IOException {

    int maxRows = getMaxRows(request, maxRowsDefault);

    if (log.isTraceEnabled()) {
      log.trace(String.format("processing url: %s", ServletUtils.getInstance().reconstructURL(request)));
    }
    //
    // response.setContentType(isExcelExport ? "application/vnd.ms-excel" : "text/plain");
    response.setContentType("text/csv");
    response.setCharacterEncoding("UTF-8");
    //
    IDataWriter dataWriter = null;
    try {
      IRequestOptions options = new HttpRequestOptions(getServletContext(), request,maxRows);
      ISqlGenerator generator = new Wrq2Sql(options);
      dataWriter = new CsvDataWriter() {
        @Override
        protected Writer getLazyStream() throws Exception {
          PrintWriter writer = response.getWriter(); // called lazy by start writing
          writer.print('\ufeff'); // BOM makes Excel (2016) understand that we are UTF-8
          return writer;
        }
      };
      //
      DataLoader loader = new DataLoader(options, generator, dataWriter);
      loader.run();
      //
      // log wrs-access
      WrsAccessLogEvent logEvent = new WrsAccessLogEvent(WrsAccessLogEvent.ACCESS_TYPE_CVS, request, options, generator, loader, dataWriter);
      virtLoggerAccess.info(logEvent); // was level DEBUG
    }
    catch (SocketException e) {
      // no need to log Exception 'Connection reset by peer: socket write error'
      if (e.getMessage().indexOf("Connection reset by peer") < 0) {
        // TODO : should this be thrown as a ServletException instead?
        virtLoggerError.info(new ErrorLogEvent("Exception while processing the CSV-request.", request), e);
      }
    }
    catch (Exception e) {
      throw new ServletException("Exception while processing the CSV-request.", e);
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
