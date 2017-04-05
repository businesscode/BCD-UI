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

import java.io.IOException;
import java.io.Writer;
import java.lang.reflect.InvocationTargetException;
import java.net.SocketException;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.xml.stream.FactoryConfigurationError;
import javax.xml.stream.XMLEventReader;
import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamException;

import org.apache.log4j.Logger;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.UnavailableSecurityManagerException;

import de.businesscode.bcdui.subjectsettings.SecurityHelper;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.toolbox.ServletUtils;
import de.businesscode.bcdui.web.errorLogging.ErrorLogEvent;
import de.businesscode.bcdui.wrs.IRequestOptions;
import de.businesscode.bcdui.wrs.load.DataLoader;
import de.businesscode.bcdui.wrs.load.IDataWriter;
import de.businesscode.bcdui.wrs.load.ISqlGenerator;
import de.businesscode.bcdui.wrs.load.WrsDataWriter;
import de.businesscode.bcdui.wrs.save.DataSaver;


/**
 * Servlet for calling Wrs delivering services
 */
public class WrsServlet extends HttpServlet {

  private static final long serialVersionUID = 4633486737694422868L;
  private final Logger log = Logger.getLogger(getClass());
  private final Map< String, Class<? extends ISqlGenerator> > services = new HashMap< String, Class<? extends ISqlGenerator> >();

  public int maxRows = 4000;
  /**
   * stores last modified stamps on resources
   */
  private final static Map<String,Long> lastModifiedResourceMap = Collections.synchronizedMap(new HashMap<String, Long>());

  /**
   *
   * @return the IMMUTABLE map containing lastModified resources with their timestamps
   */
  public static Map<String, Long> getLastModifiedResourceMap() {
    return Collections.unmodifiableMap(lastModifiedResourceMap);
  }

  /**
   * convenience method to check if given resource has been modified
   *
   * @param resourceUri
   * @param lastReadDate if this parameter is NULL the method returns TRUE as is assumes the resource has never been read
   * @return true if the given resource has been modified
   */
  public static boolean wasResourceModified(String resourceUri, Date lastReadDate) {
    return wasResourceModified(resourceUri, (Long)(lastReadDate != null ? lastReadDate.getTime() : null));
  }

  /**
   * convenience method
   * @param resourceUri
   * @param lastReadStamp if this parameter is NULL the method returns TRUE as is assumes the resource has never been read
   * @return true if the given resource has been modified
   */
  public static boolean wasResourceModified(String resourceUri, Long lastReadStamp) {
    Long lm = lastModifiedResourceMap.get(resourceUri);
    return lm != null && (lastReadStamp == null || lm>lastReadStamp);
  }

  /**
   * WrsServlet
   */
  public WrsServlet() {
  }

  /**
   * @see javax.servlet.GenericServlet#init(javax.servlet.ServletConfig)
   */
  @Override
  public void init(ServletConfig config) throws ServletException {
    super.init(config);
    if (config.getInitParameter("MaxRows") != null)
      try { maxRows = Integer.parseInt(config.getInitParameter("MaxRows")); } catch(Exception e) {}

    // Standard Wrs Servlet: empty serviceName in request
    services.put("", (Class<? extends ISqlGenerator>)Configuration.getClassoption(Configuration.OPT_CLASSES.WRQ2SQL));
    
    // Beside the standard Wrs servlet, we allow ISQLGenerators to be called by serviceName
    // initParameter "UserServices" has the form: "svcName1:svcClass1 svcName2:svcClass2"
    final String servicesString = config.getInitParameter("UserServices");
    if( servicesString != null ) 
    {
      String[] serviceDefs = servicesString.split("(\\s+|\\s*:\\s*)");
      for( int s=0; s<serviceDefs.length; s+=2 ) {
        try {
          services.put(serviceDefs[s], Class.forName(serviceDefs[s+1]).asSubclass(ISqlGenerator.class) );
        } catch (Exception e) {
          log.error("BCD-UI: Wrong defintion of Wrs Service '"+serviceDefs[s]+"' for "+this.getClass().getName());
        }
      }
    }
  }

  /**
   * @see javax.servlet.http.HttpServlet#doGet(javax.servlet.http.HttpServletRequest, javax.servlet.http.HttpServletResponse)
   */
  @Override
  protected void doGet(HttpServletRequest request, final HttpServletResponse response) throws ServletException, IOException {
	  int maxRows = this.maxRows;
    try {
      if (SecurityUtils.getSubject() != null && SecurityUtils.getSubject().isAuthenticated()) {
        Set<String> perms = SecurityHelper.getPermissions(SecurityUtils.getSubject(), "bcdWrs:maxRows");
        try { if (perms.iterator().hasNext()) maxRows = Integer.parseInt(perms.iterator().next()); } catch (Exception e) {}
      }
    }
    catch (UnavailableSecurityManagerException e) {}

    if (log.isTraceEnabled()) {
      log.trace(String.format("processing url: %s", ServletUtils.getInstance().reconstructURL(request)));
    }
    //
    response.setContentType("text/xml");
    response.setCharacterEncoding("UTF-8");
    //
    IDataWriter dataWriter = null;
    try {
      IRequestOptions options = new HttpRequestOptions(getServletContext(), request, maxRows);

      // We dynamically derive the ISqlGenerator from the serviceName attribute, empty means default
      final String serviceName = options.getRequestDoc() == null || options.getRequestDoc().getDocumentElement() == null ? "" : options.getRequestDoc().getDocumentElement().getAttribute("serviceName");
      ISqlGenerator generator = Configuration.getClassInstance(services.get(serviceName), new Class[]{IRequestOptions.class}, options);

      dataWriter = createDataWriter(request, response, options);
      DataLoader loader = new DataLoader(options, generator, dataWriter);
      loader.run();
      //
      // log wrs-access
      WrsAccessLogEvent logEvent = new WrsAccessLogEvent(WrsAccessLogEvent.ACCESS_TYPE_WRS, request, options, generator, loader, dataWriter);
      log.trace(logEvent);
    }
    catch (SocketException e) {
      // no need to log Exception 'Connection reset by peer: socket write error'
      if (e.getMessage().indexOf("Connection reset by peer") < 0){
        log.error(new ErrorLogEvent("SocketException while processing the WRS-request.", request), e);
        SOAPFaultMessage.writeSOAPFaultToHTTPResponse(request, response, e);
        throw new ServletException(e);  // Trigger rollback
      }
    }
    catch (InvocationTargetException e) {
      if( e.getCause() instanceof Exception) {
        log.error(new ErrorLogEvent("InvocationTargetException while processing the WRS-request.", request), e);
        SOAPFaultMessage.writeSOAPFaultToHTTPResponse(request, response, (Exception)e.getCause());
      }
      throw new ServletException(e.getTargetException());  // Trigger rollback
    }
    catch (Exception e) {
      log.error(new ErrorLogEvent("Exception while processing the WRS-request.", request), e);
      SOAPFaultMessage.writeSOAPFaultToHTTPResponse(request, response, e);
      throw new ServletException(e); // Trigger rollback
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

  /**
   * create data writer
   *
   * @param request
   * @param response
   * @param options
   * @return
   */
  protected IDataWriter createDataWriter(HttpServletRequest request, final HttpServletResponse response, IRequestOptions options) {
    return new WrsDataWriter() {
      @Override
      protected Writer getLazyStream() throws Exception {
        return response.getWriter(); // called lazy by start writing
      }
    };
  }

  /**
   * @see javax.servlet.http.HttpServlet#doPost(javax.servlet.http.HttpServletRequest, javax.servlet.http.HttpServletResponse)
   */
  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
	  int maxRows = this.maxRows;
    try {
      if (SecurityUtils.getSubject() != null && SecurityUtils.getSubject().isAuthenticated()) {
        Set<String> perms = SecurityHelper.getPermissions(SecurityUtils.getSubject(), "bcdWrs:maxRows");
        try { if (perms.iterator().hasNext()) maxRows = Integer.parseInt(perms.iterator().next()); } catch (Exception e) {}
      }
    }
    catch (UnavailableSecurityManagerException e) {}

    if (log.isTraceEnabled()) {
      log.trace(String.format("WRS post url: %s", ServletUtils.getInstance().reconstructURL(request)));
    }
    IRequestOptions options = new HttpRequestOptions(getServletContext(), request,maxRows);
    XMLEventReader reader;
    try {
      log.trace("try to write data in Database");
      XMLInputFactory inputFactory = XMLInputFactory.newInstance();
      inputFactory.setProperty(XMLInputFactory.IS_COALESCING, true);
      reader = inputFactory.createXMLEventReader(request.getInputStream());
      DataSaver dataSaver = new DataSaver();
      dataSaver.init(options, reader, log);
      dataSaver.run();
      log.trace("after saving");
      if(request.getPathInfo()!= null){
        tagUpdate(request.getPathInfo());
      }
    }
    catch (XMLStreamException e) {
      SOAPFaultMessage.writeSOAPFaultToHTTPResponse(request, response, e);
      throw new ServletException(e);  // Re-throw to trigger rollback and logging
    }
    catch (FactoryConfigurationError e) {
      SOAPFaultMessage.writeSOAPFaultToHTTPResponse(request, response, new Exception(e));
      throw new ServletException(e);
    }
    catch (Exception e) {
      SOAPFaultMessage.writeSOAPFaultToHTTPResponse(request, response, e);
      throw new ServletException(e);
    }
  }

  /**
   * tags a resource (which is set by pathInfo) with current millis,
   * which is considered as a lastModified tag on that resource
   *
   * @param resourceUri
   */
  protected void tagUpdate(String resourceUri) {
    if(log.isDebugEnabled())
      log.debug("set update stamp for resourceUri: " + resourceUri);
    lastModifiedResourceMap.put(resourceUri, System.currentTimeMillis());
  }
}
