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

package de.businesscode.bcdui.web.clientLogging;

import java.io.IOException;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import javax.xml.stream.XMLOutputFactory;
import javax.xml.stream.XMLStreamWriter;

import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;
import de.businesscode.bcdui.toolbox.ServletUtils;
import de.businesscode.bcdui.web.errorLogging.ErrorLogEvent;


/**
 * logrecord receiver servlet which parses the request and propagates
 * the logrecord message to the {@link FrontendLogRecordPublisher} and also
 * consumes the {@link SingletonStringQueue} which is populated by the {@link FrontendQueueAppender}
 *
 */
public class FrontendLogTransceiver extends HttpServlet {
  private final Logger virtLoggerError = LogManager.getLogger("de.businesscode.bcdui.logging.virtlogger.error");
  private static final long serialVersionUID = 1L;
  private FrontendLogRecordPublisher proc = new FrontendLogRecordPublisher();
  private static final String XMLCONSTANTS_NAMESPACES_LOG4J = "log4j";

  /*
   * @see jakarta.servlet.http.HttpServlet#doGet(jakarta.servlet.http.HttpServletRequest, jakarta.servlet.http.HttpServletResponse)
   */
  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {

    resp.setHeader("Cache-Control", "no-cache");
    resp.setHeader("Pragma", "no-cache");
    resp.setDateHeader("Expires", -1);

    String sessionId = ServletUtils.getInstance().getSessionId(req);
    XMLStreamWriter out = null;
    try {
      out = XMLOutputFactory.newInstance().createXMLStreamWriter(resp.getWriter());
      out.writeStartDocument();
      out.writeStartElement("Data");
      out.writeNamespace(XMLCONSTANTS_NAMESPACES_LOG4J, XMLCONSTANTS_NAMESPACES_LOG4J);
      if(sessionId != null){
        SingletonStringQueue.getInstance(sessionId).flush(out);
      }
      out.writeEndElement();
      out.writeEndDocument();
    }
    catch (Exception e) {
      virtLoggerError.warn("failed to write xml", e);
    }
    finally {
      try { if (out !=null) out.close(); } catch (Exception ex) { virtLoggerError.warn("failed to close writer", ex); }
    }
  }

  /*
   * @see jakarta.servlet.http.HttpServlet#doPost(jakarta.servlet.http.HttpServletRequest, jakarta.servlet.http.HttpServletResponse)
   */
  @Override
  protected void doPost(final HttpServletRequest req, HttpServletResponse resp) {
    virtLoggerError.info(new ErrorLogEvent("Client Exception", req, req.getParameter("data"))); // was level ERROR
    proc.propagate(new FrontendLogRecordPublisher.LogRecord(req.getParameter("data"), req.getHeader("Referer"), "ERROR"));
  }
}
