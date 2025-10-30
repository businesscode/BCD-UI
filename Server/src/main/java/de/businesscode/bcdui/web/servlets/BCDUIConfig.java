/*
  Copyright 2010-2025 BusinessCode GmbH, Germany

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

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Properties;
import java.util.stream.Collectors;

import jakarta.servlet.ServletConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import org.apache.commons.codec.digest.DigestUtils;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang.StringEscapeUtils;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.UnavailableSecurityManagerException;
import org.apache.shiro.session.Session;
import org.apache.shiro.subject.Subject;

import de.businesscode.bcdui.logging.PageSqlLogger;
import de.businesscode.bcdui.subjectsettings.SecurityHelper;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.toolbox.ServletUtils;
import de.businesscode.bcdui.web.accessLogging.RequestHashGenerator;
import de.businesscode.bcdui.web.i18n.I18n;
import de.businesscode.bcdui.web.taglib.webpage.Functions;
import de.businesscode.util.StandardNamespaceContext;

public class BCDUIConfig extends HttpServlet {

  private static final long serialVersionUID = 1L;
  private static final String clientConfigFilePath="/WEB-INF/clientLog.properties";
  private Logger log = LogManager.getLogger(this.getClass());
  private final Logger virtLoggerPage = LogManager.getLogger("de.businesscode.bcdui.logging.virtlogger.page");
  

  private String configJson;

  public final static String LIB_ROOT_FOLDER_NAME="bcdui";

  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    response.setContentType(getServletContext().getMimeType(".js"));

    URL realPath = getServletContext().getResource(clientConfigFilePath);
    Properties properties = new Properties();
    if( realPath != null && realPath.getPath() != null ) {
      File propFile = new File(realPath.getPath());
      if (propFile.canRead())
        try (FileInputStream fis = new FileInputStream(propFile)) { properties.load(fis); }
        catch (Exception e) { log.error( "can't load properties file", e); }
    }

    boolean isDebug = ServletUtils.getInstance().isFeDebug(request);

    Boolean environmentValue = Boolean.FALSE;
    try {environmentValue = (Boolean)Configuration.getInstance().getConfigurationParameter("bcdui/serverHasRequestUrlLimit");}catch(Exception e) {}

    boolean isModule = "module".equalsIgnoreCase(request.getParameter("mode"));

    PrintWriter writer = new PrintWriter(response.getWriter());
    writer.println("var bcdui = bcdui || {};");
    if (isModule)
      writer.println("window.bcdui = bcdui; export default bcdui;");
    writer.println("bcdui.core = bcdui.core || {};");
    writer.println("bcdui.config = {");
    writeClientParams(writer);
    writer.println("    contextPath: \"" + getServletContext().getContextPath() + "\"");

    // write version info
    writer.println("  , ceVersion: \"" + getVersion("BCD-UI") + "\"");
    writer.println("  , eeVersion: \"" + getVersion("BCD-UI-EE") + "\"");
    writer.println("  , deVersion: \"" + getVersion("BCD-UI-DE") + "\"");

    // IIS has a limit also for http request URLs, i.e. data requests
    writer.println("  , serverHasRequestUrlLimit: " + environmentValue.toString());

    // write authenticate information
    try {
      final Subject subject = SecurityUtils.getSubject();

      // add possibly existing subjectPreferences Cookie to shiro session
      Session shiroSession = subject != null ? subject.getSession(false) : null;
      if (shiroSession != null && shiroSession.getAttribute(SubjectPreferences.COOKIE_PERMISSION_MAP_SESSION_ATTRIBUTE) == null) {
        Map<String, ArrayList<String>> cookieMap = new HashMap<>(SubjectPreferences.getCookieMap(request));
        if (! cookieMap.isEmpty())
          shiroSession.setAttribute(SubjectPreferences.COOKIE_PERMISSION_MAP_SESSION_ATTRIBUTE, cookieMap);
      }

      if(subject.isAuthenticated() ) {
        String userLogin = SecurityHelper.getUserLogin(subject);
        userLogin = (userLogin == null) ? "null" : "'" + StringEscapeUtils.escapeJavaScript(userLogin) + "'";
        String userId = SecurityHelper.getUserId(subject);
        String userName = SecurityHelper.getUserName(subject);
        String userEmail = SecurityHelper.getUserEmail(subject);
        userId = (userId == null) ? "null" : "'" + StringEscapeUtils.escapeJavaScript(userId) + "'";
        userName = (userName == null) ? "null" : "'" + StringEscapeUtils.escapeJavaScript(userName) + "'";
        userEmail = (userEmail == null) ? "null" : "'" + StringEscapeUtils.escapeJavaScript(userEmail) + "'";
        writer.println("  , isAuthenticated: true");
        writer.println("  , userName: " + userName ); // js null or js string with name; backwards compatible (in future may be removed; is to be replaced by .userLogin)
        writer.println("  , userLogin: " + userLogin ); // js null or js string with user login;
        writer.println("  , userId: " + userId ); // js null or js string with user id;
        writer.println("  , userEmail: " + userEmail ); // js null or js string with user email;

        // write userRoles
        writer.println("  , userRoles : {");

        // 'getRoles' triggers SubjectPreferences realm, too to get current settings
        writer.print(SecurityHelper.getRoles(subject).stream().map(s->{
          return "\"" + StringEscapeUtils.escapeJavaScript(s) + "\" : 1";  // define property as true to enable lookup w/o .hasOwnProperty()
        }).collect(Collectors.joining(",")));
        writer.println("  }");
      }

      // write bcdClient security settings as bcdui.config.clientRights object values
      writer.println("  , clientRights: {");

      ArrayList<String> sortedPerms = new ArrayList<>(subject.isAuthenticated() ? new HashSet<>(SecurityHelper.getPermissions(subject, "bcdClient")) : new HashSet<>());
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
    catch (UnavailableSecurityManagerException e) { // don't use shiro at all?
      writer.println("  , isAuthenticated: false");
      writer.println("  , userName: null");
      writer.println("  , clientRights:{}");
    }

    writer.println("  , sessionHash: \"" + ( getSessionHash(request) ) + "\"");
    writer.println("  , i18n: { \"langSubjectFilterName\":\"" + I18n.SUBJECT_FILTER_TYPE + "\", \"lang\" : \"" + getLang(request) + "\"}");
    writer.println("  , debug: " + isDebug);
    writer.println("  , isDebug: " + isDebug);
    writer.println("  , libPath: \"" + getServletContext().getContextPath() + "/"+LIB_ROOT_FOLDER_NAME+"/\"");
    writer.println("  , jsLibPath: \"" + getServletContext().getContextPath() + "/"+LIB_ROOT_FOLDER_NAME+"/js/\"");
    if(! properties.isEmpty()){
      if(properties.getProperty("LEVEL") != null)
        writer.println("  , clientLogLevel: \"" + properties.getProperty("LEVEL").trim()+"\"");
      if(properties.getProperty("appender") != null)
        writer.println("  , clientLogAppenderJSClassName: \"" + properties.getProperty("appender").trim()+"\"");
    }
    
    // generate unique pageHash
    String pageHash = RequestHashGenerator.generatePageHash(request);
    writer.println("  , frame: { pageHash: \"" + pageHash + "\" }");

    // App-wide config from /bcdui/conf/configuration.json
    if( configJson!=null && !configJson.isEmpty() )
      writer.println("  , settings: " + configJson );

    writer.println("};");
    writer.println("");

    writer.println("bcdui.core.xmlConstants = {");
    writer.println(StandardNamespaceContext.getInstance().getAsJs());
    writer.println("};");

    if(!isModule && ! "true".equals( request.getParameter("bcduiConfigOnly") ) )
      writer.println("document.write(\"<script type='text/javascript' src='" + request.getContextPath() + response.encodeURL("/bcdui/js/bcduiLoader.js") + "'></script>\");");

    String sessionId = (request != null && request.getSession(false) != null ? request.getSession(false).getId() : "");
    if( log.isDebugEnabled() )
      log.debug("PageHash "+pageHash+" for "+request.getHeader("Referer")+", "+sessionId);

    writer.println("bcdui.logging = bcdui.logging || new Object();");
    writer.println("bcdui.logging.console = 'Start '+new Date()+'\\n';");
    writer.println("bcdui.logging.pageStartTs = new Date().getTime();");

    writer.println("bcdui.browserCompatibility = (function(){");
    writer.println("var ua = navigator.userAgent;");
    writer.println("var isOpera = Object.prototype.toString.call(window.opera) == '[object Opera]';");
    writer.println("var isInternetExplorer = (!!window.attachEvent && !isOpera) || ua.indexOf('Trident') != -1;");
    writer.println("var tridentVersion = null;");
    writer.println("var msIEversion = null;");
    writer.println("var tridentArray = navigator.userAgent.match(/Trident\\/[0-9.]+/g);");
    writer.println("var msIEArray = navigator.userAgent.match(/MSIE [0-9.]+/g);");
    writer.println("if (tridentArray != null && tridentArray.length > 0)");
    writer.println("tridentVersion = 4 + parseFloat(tridentArray[0].replace(/Trident\\//g, ''));");
    writer.println("if (msIEArray != null && msIEArray.length > 0)");
    writer.println("msIEversion = parseFloat(msIEArray[0].replace(/MSIE/g, ''));");
    writer.println("return {");
    writer.println("isIE:             isInternetExplorer,");
    writer.println("isMsEdge:         ua.indexOf(' Edge/') !== -1,");
    writer.println("isChromiumEdge:   ua.indexOf(' Edg/')  !== -1,");
    writer.println("isOpera:          isOpera,");
    writer.println("isWebKit:         ua.indexOf('AppleWebKit/') > -1 && ua.indexOf(' Edge/') === -1,");
    writer.println("isGecko:          ua.indexOf('Gecko') > -1 && ua.indexOf('KHTML') === -1 && ua.indexOf('Trident') === -1,");
    writer.println("isMobileSafari:   /Apple.*Mobile/.test(ua),");
    writer.println("isIE8:            isInternetExplorer && parseInt(navigator.userAgent.substring(navigator.userAgent.indexOf('MSIE')+5))== 8,");
    writer.println("ieVersion:        msIEversion != null && msIEversion < tridentVersion ? msIEversion : tridentVersion");
    writer.println("}");
    writer.println("})();");

    // log page
    if(PageSqlLogger.getInstance().isEnabled()) {
      final PageSqlLogger.LogRecord logRecord = new PageSqlLogger.LogRecord(sessionId, request.getHeader("Referer"), pageHash);
      virtLoggerPage.info(logRecord); // was level DEBUG
    }
  }

  /**
   * @param request
   * @return a language currently active, is never null.
   */
  private String getLang(HttpServletRequest request) {
    return I18n.getUserLocale(request).getLanguage();
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
    // If present, load app-wide configuration
    InputStream confIs = getServletContext().getResourceAsStream("/bcdui/conf/settings.json");
    if( confIs != null ) {
      try {
        configJson = IOUtils.toString(confIs, "UTF-8");
        confIs.close();
      } catch (IOException e) {
        throw new ServletException(e);
      }
    }
  }

  private static String getVersion(String moduleName) {
    try {
      Enumeration<URL> resources = Thread.currentThread().getContextClassLoader().getResources("META-INF/gitInformation/" + moduleName + "_info.txt");
      if (resources.hasMoreElements()) {
        try (BufferedReader br = new BufferedReader(new InputStreamReader(resources.nextElement().openStream()))) {
          String commitHash = "";
          String branchName = "";
          String versionName = "";
          final String branch = "Branch:";
          final String commit = "Commit:";
          final String version = "Version:";
          String line =  br.readLine();
          while (line != null) {
            if (line.contains(branch))
              branchName = line.substring(branch.length() + line.indexOf(branch)).trim();
            if (line.contains(commit))
              commitHash = line.substring(commit.length() + line.indexOf(commit)).trim();
            if (line.contains(version))
              versionName = line.substring(version.length() + line.indexOf(version)).trim();
            line =  br.readLine(); 
          }
          return versionName + " " + branchName + " [" + commitHash + "]";
        }
        catch (Exception e) { /* ignore */ }
      }
    }
    catch (Exception e) { /* ignore */ }
    return "";
  }
}
