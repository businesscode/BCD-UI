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
package de.businesscode.bcdui.web.wrs;

import static de.businesscode.bcdui.wrs.load.WrsDataWriter.WRS_XML_NAMESPACE;

import java.io.IOException;
import java.io.OutputStream;
import java.util.Locale;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.xml.namespace.QName;
import javax.xml.soap.Detail;
import javax.xml.soap.MessageFactory;
import javax.xml.soap.SOAPBody;
import javax.xml.soap.SOAPConstants;
import javax.xml.soap.SOAPElement;
import javax.xml.soap.SOAPException;
import javax.xml.soap.SOAPFault;
import javax.xml.soap.SOAPMessage;
import javax.xml.stream.XMLOutputFactory;
import javax.xml.stream.XMLStreamWriter;
import javax.xml.transform.dom.DOMResult;

import org.apache.log4j.Logger;
import org.w3c.dom.Document;

import de.businesscode.bcdui.toolbox.ServletUtils;
import de.businesscode.bcdui.wrs.save.SQLDetailException;
import de.businesscode.bcdui.wrs.save.exc.WrsValidationException;


public class SOAPFaultMessage {
  private SOAPMessage message;
  private Logger logger = Logger.getLogger(getClass());

  /**
   * Convenience method to write a SOAP massage response. The responseOutputStream must not be opened yet.
   * It captures all Exceptions happening during that and writes them to log
   * @param resp
   * @param requestDocument
   * @param requestURL
   * @param message
   * @return true if exception was thrown, false if a SOAPFault could not be produced an an error log was created instead
   */
  static public boolean writeSOAPFaultToHTTPResponse(HttpServletResponse resp, Document requestDocument, String requestURL, String message)
  {
    try {
      resp.setContentType("text/xml");
      return writeSOAPFault(resp.getOutputStream(), requestDocument, requestURL, new Exception(message));
    } catch( IOException e ) {
      Logger.getLogger(SOAPFaultMessage.class).error(e+" for "+requestURL);
      return false;
    }
  }


  /**
   * Convenience method to write a SOAP massage response. The responseOutputStream must not be opened yet.
   * It captures all Exceptions happening during that and writes them to log
   * @param resp
   * @param requestDocument
   * @param requestURL
   * @param faultException
   * @return true if exception was thrown, false if a SOAPFault could not be produced an an error log was created instead
   */
  static public boolean writeSOAPFaultToHTTPResponse(HttpServletResponse resp, Document requestDocument, String requestURL, Throwable faultException)
  {
    try {
      resp.setContentType("text/xml");
      return writeSOAPFault(resp.getOutputStream(), requestDocument, requestURL, faultException);
    } catch( Exception e ) {
      Logger.getLogger(SOAPFaultMessage.class).error(e+" causer "+faultException+" for "+requestURL);
      return false;
    }
  }

  /**
   * Convenience method to write a SOAP massage response. The responseOutputStream must not be opened yet.
   * It captures all Exceptions happening during that and writes them to log
   * @param request
   * @param response
   * @param faultException
   * @return true if exception was thrown, false if a SOAPFault could not be produced an an error log was created instead
   */
  static public boolean writeSOAPFaultToHTTPResponse(HttpServletRequest request, HttpServletResponse response, Exception faultException) {
    Document requestDocument = (Document) request.getAttribute("guiStatusDoc");
    String requestURL = ServletUtils.getInstance().reconstructURL(request);
    //
    return writeSOAPFaultToHTTPResponse(response, requestDocument, requestURL, faultException);
  }

  /**
   * Convenience method to write a SOAP massage into a stream. It captures all Exceptions happening during that and writes them to log
   * @param os
   * @param requestDocument
   * @param requestURL
   * @param faultException
   * @return true if exception was thrown, false if a SOAPFault could not be produced an an error log was created instead
   */
  static public boolean writeSOAPFault(OutputStream os, Document requestDocument, String requestURL, Throwable faultException) {
    try {
      SOAPFaultMessage sFM = new SOAPFaultMessage(requestDocument, requestURL, faultException);
      sFM.writeTo(os);
    } catch( Exception e ) {
      Logger.getLogger(SOAPFaultMessage.class).error(faultException,faultException);
      return false;
    }
    return true;
  }

  /**
   * SOAPFaultMessage
   *
   * @param requestDocument
   * @param requestURL
   * @param faultException
   */
  public SOAPFaultMessage(Document requestDocument, String requestURL, Throwable faultException) throws SOAPException {
    this.message = createMessage(requestDocument, requestURL, faultException);
  }

  /**
   * @return the message
   */
  public SOAPMessage getMessage() {
    return message;
  }

  /**
   * @param out
   * @throws SOAPException
   * @throws IOException
   * @see javax.xml.soap.SOAPMessage#writeTo(java.io.OutputStream)
   */
  public void writeTo(OutputStream out) throws SOAPException, IOException {
    getMessage().writeTo(out);
  }

  /**
   * @param requestDocument
   * @param requestURL
   * @param faultException
   * @return the newly created message
   * @throws SOAPException
   */
  private SOAPMessage createMessage(Document requestDocument, String requestURL, Throwable faultException) throws SOAPException {
    SOAPMessage message = MessageFactory.newInstance(SOAPConstants.SOAP_1_2_PROTOCOL).createMessage();
    SOAPBody body = message.getSOAPBody();
    //
    // write fault part
    SOAPFault fault = body.addFault();
    fault.setFaultCode(SOAPConstants.SOAP_SENDER_FAULT); // TODO analyze exception and send the right code. Later.
    fault.addFaultReasonText(faultException.getMessage(), Locale.ENGLISH);
    //
    // write body part
    Detail detailNode = fault.addDetail();
    detailNode.addNamespaceDeclaration("", WRS_XML_NAMESPACE);
    //
    if (faultException != null) {
      SOAPElement exceptionsNode = detailNode.addChildElement("Exception", "");
      writeExceptionAsSoapDetails(exceptionsNode, faultException);
    }
    if (requestDocument != null) {
      detailNode.appendChild(detailNode.getOwnerDocument().adoptNode(requestDocument.getDocumentElement()));
    }
    if (requestURL != null) {
      detailNode.addChildElement("Url", "").addTextNode(requestURL);
    }
    return message;
  }

  /**
   * Send the exception details. We send just root and cause exceptions without the full stack trace.
   *
   * @param rootElement
   * @param exception - may also be of type {@link WrsValidationException}, which is properly serialized and can be
   *        processed by client
   * @throws SOAPException
   */
  private void writeExceptionAsSoapDetails(SOAPElement rootElement, Throwable exception) throws SOAPException {
    if (exception != null) {
      SOAPElement element = rootElement.addChildElement("Cause", "");
      element.addAttribute(new QName("class"), exception.getClass().getName());
      if (exception.getMessage() != null && ! (exception instanceof SQLDetailException) ) {
        element.addTextNode(exception.getMessage());
      } else {
        logger.error(exception.getMessage());
      }
      if(exception instanceof WrsValidationException) {
        WrsValidationException wrsExc = (WrsValidationException)exception;
        XMLStreamWriter sw = null;
        try {
          sw = XMLOutputFactory.newInstance().createXMLStreamWriter(new DOMResult(rootElement));
          wrsExc.getValidationResult().serializeTo(sw);
          sw.flush();
        } catch (Exception e) {
          // we're in trouble
          logger.error("serialization of WrsValidationException failed", e);
          writeExceptionAsSoapDetails(rootElement, e);
        } finally {
          if(sw != null) {
            try {
              sw.close();
            } catch (Exception e) {
              logger.warn("failed to close stream writer to WrsValidationException serialization", e);
            }
          }
        }
      }
      //
      writeExceptionAsSoapDetails(rootElement, exception.getCause());
    }
  }
}
