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
package de.businesscode.bcdui.web.servlets;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import org.apache.commons.codec.digest.DigestUtils;
import org.apache.commons.io.IOUtils;
import org.apache.log4j.Logger;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.UnavailableSecurityManagerException;

import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.logging.PageSqlLogger;
import de.businesscode.bcdui.subjectsettings.SecurityHelper;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.toolbox.ServletUtils;
import de.businesscode.bcdui.web.taglib.webpage.Functions;
import de.businesscode.util.StandardNamespaceContext;

public class BCDUIConfig extends HttpServlet {

  private static final long serialVersionUID = 1L;
  private static final String clientConfigFilePath="/WEB-INF/clientLog.properties";
  private Logger log = Logger.getLogger(this.getClass());

  private String messagesXml;
  private boolean isMessagesXmlStatic;
  private String configJson;

  public final static String LIB_ROOT_FOLDER_NAME="bcdui";

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    response.setContentType(getServletContext().getMimeType(".js"));

    String realPath = getServletContext().getRealPath(clientConfigFilePath);
    Properties properties = new Properties();
    File propFile = new File(realPath);
    if(propFile.canRead())
      properties.load(new FileInputStream(propFile));

    boolean isDebug = ServletUtils.getInstance().isFeDebug(request);
    String sessionId = (request != null && request.getSession(false) != null ? request.getSession(false).getId() : "");

    PrintWriter writer = new PrintWriter(response.getWriter());
    writer.println("var bcdui = bcdui || {};");
    writer.println("bcdui.core = bcdui.core || {};");
    writer.println("bcdui.config = {");
    writeClientParams(writer);
    writer.println("    contextPath: \"" + getServletContext().getContextPath() + "\"");
    // FIXME TODO drop sessionId from here and use sessionHash where appropriate.
    writer.println("  , sessionId: \"" + sessionId + "\"");

    // write authenticate information
    try {
      if( SecurityUtils.getSubject().isAuthenticated() ) {
        String userName = SecurityUtils.getSubject().getPrincipal() != null ? "\""+SecurityUtils.getSubject().getPrincipal()+"\"" : "null";
        writer.println("  , isAuthenticated: true");
        writer.println("  , userName: " + userName ); // js null or js string with name

        // write bcdClient security settings as bcdui.config.clientRights object values
        writer.println("  , clientRights: {");
        
        List<String> sortedPerms = new ArrayList<String>(SecurityHelper.getPermissions(SecurityUtils.getSubject(), "bcdClient"));
        Collections.sort(sortedPerms);

        if (! sortedPerms.isEmpty()) {
          boolean onceInner = true;
          boolean onceOuter = true;
          String lastRight = "";
          for (String s : sortedPerms) {
            int x = s.indexOf(":");
            String right = (x != -1 ? s.substring(0, x) : s).trim();
            String value = (x != -1 ? s.substring(x + 1) : "").trim();
            boolean isBoolean = "true".equalsIgnoreCase(value) || "false".equalsIgnoreCase(value);
            boolean isInteger = false;
            try { Integer.parseInt(value); isInteger = true; } catch (Exception e) {}
            if (! right.isEmpty()) {
              if (lastRight.isEmpty()) {
                writer.println((onceOuter ? "" : ",") + right + ": [");
                onceOuter = false;
              }
              else if (!lastRight.equals(right)) {
                writer.println("]");
                writer.println("," + right + ": [");
                onceInner = true;
              }
              writer.println((onceInner ? "" : ",") + (isInteger || isBoolean ? ( "" + value.toLowerCase() + "") : ( "\"" + value + "\"")));
              onceInner = false;
              lastRight = right;
            }
          }
          if (! onceOuter)
            writer.println("]");
        }
        writer.println("}");
      }
    }
    catch (UnavailableSecurityManagerException e) { // don't use shiro at all?
      writer.println("  , isAuthenticated: false");
      writer.println("  , userName: null");
      writer.println("  , clientRights:{}");
    }

    writer.println("  , sessionHash: \"" + ( getSessionHash(request) ) + "\"");
    writer.println("  , debug: " + isDebug);
    writer.println("  , isDebug: " + isDebug);
    writer.println("  , libPath: \"" + getServletContext().getContextPath() + "/"+LIB_ROOT_FOLDER_NAME+"/\"");
    writer.println("  , jsLibPath: \"" + getServletContext().getContextPath() + "/"+LIB_ROOT_FOLDER_NAME+"/js/\"");
    writer.println("  , messagesXml: \"" + getServletContext().getContextPath() + messagesXml+ "\"");
    writer.println("  , isMessagesXmlStatic: " + Boolean.toString(isMessagesXmlStatic));
    if(! properties.isEmpty()){
      if(properties.getProperty("LEVEL") != null)
        writer.println("  , clientLogLevel: \"" + properties.getProperty("LEVEL").trim()+"\"");
      if(properties.getProperty("appender") != null)
        writer.println("  , clientLogAppenderJSClassName: \"" + properties.getProperty("appender").trim()+"\"");
    }
    
    // generate unique pageHash
    String pageHash = "" + new Date().getTime() + "" + Math.round(Math.random()*10000);
    writer.println("  , frame: { pageHash: \"" + pageHash + "\" }");

    // App-wide config from /bcdui/conf/configuration.json
    if( configJson!=null && !configJson.isEmpty() )
      writer.println("  , settings: " + configJson );

    writer.println("};");
    writer.println("");

    writer.println("bcdui.core.xmlConstants = {");
    writer.println(StandardNamespaceContext.getInstance().getAsJs());
    writer.println("};");

    if( ! "true".equals( request.getParameter("bcduiConfigOnly") ) )
      writer.println("document.write(\"<script type='text/javascript' src='" + getServletContext().getContextPath() + "/bcdui/js/bcduiLoader.js'></script>\");");

    if( log.isDebugEnabled() )
      log.debug("PageHash "+pageHash+" for "+request.getHeader("Referer")+", "+sessionId);
  
    // log page
    if(PageSqlLogger.getInstance().isEnabled()) {
      final PageSqlLogger.LogRecord logRecord = new PageSqlLogger.LogRecord(sessionId, request.getHeader("Referer"), pageHash);
      log.debug(logRecord);
    }
  }

  /**
   * returns session hash (SHA-1) because we want to tag session on the client,
   * the hashing algorithm may change at any time, no one should rely on it.
   *
   * @param request
   * @return hash or empty String
   */
  private synchronized String getSessionHash(HttpServletRequest request) {
    HttpSession session = request.getSession(false);
    if(session == null){
      return "";
    }
    // cache due to expensive generation
    String hash = (String)session.getAttribute("bcdSessionHash");

    if(hash == null) {
      hash = DigestUtils.sha1Hex( session.getId() );
      session.setAttribute("bcdSessionHash", hash);
    }

    return hash;
  }

  /*
   * write comma separated parameters for client
   */
  private void writeClientParams(PrintWriter writer) {
    final HashMap<String, Object> clientParams = Configuration.getInstance().getClientParameters();
    if(clientParams != null && clientParams.size()>0){
      StringBuilder sb = new StringBuilder();
      for(Map.Entry<String, Object> param : clientParams.entrySet()){
        sb.append(Functions.jsString(param.getKey())).append(" : ").append(Functions.jsString(param.getValue())).append(",").append(System.getProperty("line.separator"));
      }
      writer.append(sb.toString());
    }
  }

  @Override
  public void init(ServletConfig config) throws ServletException {
    super.init(config);
    // Let's see whether the default messages file was overwritten:
    InputStream is = getServletContext().getResourceAsStream("/bcdui/conf/messages.xml");
    messagesXml = ( is!=null ) ? "/bcdui/conf/messages.xml" : "/bcdui/js/i18n/messages.xml";

    try {
      if(is!=null)
        is.close();
    } catch (IOException e) {
      throw new ServletException(e);
    }

    // If present, load app-wide configuration
    InputStream confIs = getServletContext().getResourceAsStream("/bcdui/conf/settings.json");
    if( confIs != null ) {
      try {
        configJson = IOUtils.toString(confIs);
        confIs.close();
      } catch (IOException e) {
        throw new ServletException(e);
      }
    }

    try {
      isMessagesXmlStatic = ! Bindings.getInstance().hasBindingSet("bcd_i18n");
    } catch (BindingException e1) {
      // No issue, was just a test
    }
  }
}
