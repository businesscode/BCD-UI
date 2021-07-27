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

package de.businesscode.bcdui.web.clientLogging;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.Charset;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.xml.sax.Attributes;
import org.xml.sax.SAXException;
import org.xml.sax.helpers.DefaultHandler;

import de.businesscode.bcdui.logging.VirtLogger;
import de.businesscode.bcdui.toolbox.ServletUtils;
import de.businesscode.bcdui.web.errorLogging.ErrorLogEvent;
import de.businesscode.util.xml.SecureXmlFactory;


/**
 * logrecord receiver servlet which parses the request and propagates
 * the logrecord message to the {@link FrontendLogRecordPublisher} and also
 * consumes the {@link SingletonStringQueue} which is populated by the {@link FrontendQueueAppender}
 *
 */
public class FrontendLogTransceiver extends HttpServlet {
  private final Logger log = LogManager.getLogger();
  private final Logger virtLoggerError = LogManager.getLogger(VirtLogger.ERROR);
  private static final long serialVersionUID = 1L;
  private FrontendLogRecordPublisher proc = new FrontendLogRecordPublisher();

  /*
   * @see javax.servlet.http.HttpServlet#doGet(javax.servlet.http.HttpServletRequest, javax.servlet.http.HttpServletResponse)
   */
  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp)
      throws ServletException, IOException {
    resp.setHeader("Expires", "-1");

    String sessionId = ServletUtils.getInstance().getSessionId(req);
    Writer out = resp.getWriter();
    out.append("<?xml version=\"1.0\"?><Data xmlns:log4j=\"log4j\">");
    if(sessionId != null){
      SingletonStringQueue.getInstance(sessionId).flush(out);
    }
    out.append("</Data>");
  }

  /*
   * @see javax.servlet.http.HttpServlet#doPost(javax.servlet.http.HttpServletRequest, javax.servlet.http.HttpServletResponse)
   */
  @Override
  protected void doPost(final HttpServletRequest req, HttpServletResponse resp)
      throws ServletException, IOException {
    try {
      ByteArrayOutputStream bos = new ByteArrayOutputStream();
      Writer sw = new OutputStreamWriter(bos,  Charset.forName("UTF-8"));// set fix UTF, thus otherwise could not work with XML doc as parameter
      sw.write("<?xml version=\"1.0\"?>"); sw.write(req.getParameter("data"));sw.flush();
      // do not remove the regular logger call, as the virtlogger does not pass the event to its parent logger!
      log.error(new ErrorLogEvent("Client Exception", req, req.getParameter("data")));
      virtLoggerError.info(new ErrorLogEvent("Client Exception", req, req.getParameter("data")));

      SecureXmlFactory.newSaxParserFactory().newSAXParser().parse(new ByteArrayInputStream(bos.toByteArray()), new DefaultHandler(){
        private String level;
        private StringBuilder messageBuilder = new StringBuilder();
        private boolean insideMessage=false;
        /*
         * @see org.xml.sax.helpers.DefaultHandler#startElement(java.lang.String, java.lang.String, java.lang.String, org.xml.sax.Attributes)
         */
        @Override
        public void startElement(String uri, String localName, String qName,
            Attributes atts) throws SAXException {
          localName = qName.substring(qName.indexOf(':')+1);
          if("event".equals(localName)){
            level = atts.getValue("level");
          } else if ("message".equals(localName)){
            insideMessage = true;
          }

          super.startElement(uri, localName, qName, atts);
        }

        /*
         * @see org.xml.sax.helpers.DefaultHandler#characters(char[], int, int)
         */
        @Override
        public void characters(char[] ch, int start, int length)
            throws SAXException {
          if(insideMessage){
            messageBuilder.append(ch,start,length);
          }
        }

        /*
         * @see org.xml.sax.helpers.DefaultHandler#endElement(java.lang.String, java.lang.String, java.lang.String)
         */
        @Override
        public void endElement(String uri, String localName, String qName)
            throws SAXException {
          localName = qName.substring(qName.indexOf(':')+1);
          if("message".equals(localName)) {
            insideMessage = false;
          } else if ("event".endsWith(localName)){
            proc.propagate(new FrontendLogRecordPublisher.LogRecord(messageBuilder.toString(), req.getHeader("Referer"), level));
            messageBuilder.setLength(0);
          }
          super.endElement(uri, localName, qName);
        }
      });
    }catch(Exception e){
      throw new ServletException(e);
    }
  }
}
