/*
Copyright 2010-2022 BusinessCode GmbH, Germany

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
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.GZIPInputStream;
import java.util.zip.GZIPOutputStream;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.stream.XMLOutputFactory;
import javax.xml.stream.XMLStreamWriter;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.mgt.DefaultSecurityManager;
import org.apache.shiro.session.Session;
import org.apache.shiro.subject.Subject;
import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

import de.businesscode.bcdui.subjectsettings.SecurityHelper;
import de.businesscode.bcdui.subjectsettings.SubjectPreferencesRealm;
import de.businesscode.bcdui.wrs.load.WrsDataWriter;
import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.xml.SecureXmlFactory;

import org.apache.logging.log4j.LogManager;

/*
 * This servlet allows setting of SubjectPreferences which are actually shiro user permissions. The permissions and their
 * values which can be set are restricted. The xml file "/bcdui/conf/subjectPreferences.xml" holds information about such restrictions.
 * They can be either static ones or they can reference rights from bcd_sec_user_settings.
 * 
 * Calling this servlet via GET returns a WRS holding the currently available rights and
 * an indicator showing which one is active. 
 * 
 * Calling this servlet via POST allows modifying the permission rights map via WRS:I/D/M
 * 
 */
public class SubjectPreferences extends HttpServlet {

  private static final long serialVersionUID = 1L;
  private final Logger log = LogManager.getLogger(getClass());

  public static final List<String> allowedRightTypes = new ArrayList<>();
  private static final HashMap<String, ArrayList<String>> allowedRightValues = new HashMap<>();
  private static final List<String> isMultiRightTypes = new ArrayList<>();
  private static final List<String> preventEmptyRightTypes = new ArrayList<>();

  private static final Map<String, ArrayList<String>> defaultRightValues = new HashMap<>();
  private static final Map<String, String> rightValueSources = new HashMap<>();
  
  private static final HashMap<String, String> cookieInfo = new HashMap<>();
  
  public static final String COOKIE_PERMISSION_MAP_SESSION_ATTRIBUTE = "bcdCookieMap";

  private static int cookieMaxAge = 60 * 60 * 24 * 365;
  
  @Override
  public void init(ServletConfig config) throws ServletException {
    super.init(config);
    
    try {
      cookieMaxAge = Integer.parseInt(config.getInitParameter("cookieMaxAge"));
    } catch(Exception e) {
      if( config.getInitParameter("cookieMaxAge") != null ) {
        log.warn("Parameter 'cookieMaxAge' for "+getServletName()+" could not be parsed");
      }
    }
    log.info("Using "+cookieMaxAge+" seconds for cookieMaxAge");
    
    DocumentBuilderFactory documentBuilderFactory = SecureXmlFactory.newDocumentBuilderFactory();
    documentBuilderFactory.setXIncludeAware(true);

    // read and parse the configuration
    
    InputStream is = getServletContext().getResourceAsStream("/bcdui/conf/subjectPreferences.xml");

    if (is != null) {
      try {
        Document doc = documentBuilderFactory.newDocumentBuilder().parse(is);
        is.close();
        
        if (doc != null) {

          // get cookie information, cookie name and path on root level
          String cookieName = doc.getDocumentElement().getAttribute("cookieName");
          String cookiePath = doc.getDocumentElement().getAttribute("cookiePath");
          if (cookiePath.isEmpty())
            cookiePath = "/bcdui";

          if (!cookieName.isEmpty()) {
           cookieInfo.put("name", cookieName);
           cookieInfo.put("path", cookiePath);
          }

          // parse Settings
          NodeList settings = doc.getElementsByTagNameNS(StandardNamespaceContext.SECURITY_NAMESPACE, "Setting");
          for (int n = 0; n < settings.getLength(); n++) {
            Node node = settings.item(n);
            
            // collect listed Setting elements as allowedAttributes
            String rightType = ((Element)(node)).getAttribute("name");
            if (!rightType.isEmpty()) {
              allowedRightTypes.add(rightType);
            }

            NodeList values = ((Element)node).getElementsByTagNameNS(StandardNamespaceContext.SECURITY_NAMESPACE, "Value");
            NodeList sources = ((Element)node).getElementsByTagNameNS(StandardNamespaceContext.SECURITY_NAMESPACE, "SourceSetting");

            ArrayList<String> foundDefaultValues = new ArrayList<>();

            // we have a SourceSetting, so remember the source, self referencing is not allowed
            if (sources.getLength() > 0) {

              Element sourceSetting = (Element)sources.item(0);

              String subjectSetting = sourceSetting.getAttribute("ref");
              if (! subjectSetting.isEmpty() && !rightType.equals(subjectSetting)) {
                rightValueSources.put(rightType, subjectSetting);

                // look for multi setting
                if ("true".equals(sourceSetting.getAttribute("isMulti")))
                  isMultiRightTypes.add(rightType);

                // remember if the setting has a preventEmpty setting
                if ("true".equals((sourceSetting).getAttribute("preventEmpty")))
                  preventEmptyRightTypes.add(rightType);

                // remember defaults values when given as comma separated defaults attribute
                String defaults = sourceSetting.getAttribute("defaults");
                if (!defaults.isEmpty()) {
                  String []def = defaults.split(",");
                  for (String d :def) {
                    if (!d.trim().isEmpty())
                      foundDefaultValues.add(d.trim());
                  }

                  // multi defaults are only possible if the subjectPreference is a multi-allowed one
                  if (! foundDefaultValues.isEmpty())
                    defaultRightValues.put(rightType, (isMultiRightTypes.contains(rightType) ? foundDefaultValues : new ArrayList<>(foundDefaultValues.subList(0, 1))));
                }
              }
            }

            // or we have a list of allowed values, so take them as allowed values
            else if (values.getLength() > 0) {

              // look for multi setting (on parent Values node)
              NodeList outerValues = ((Element)node).getElementsByTagNameNS(StandardNamespaceContext.SECURITY_NAMESPACE, "Values");
              if (outerValues.getLength() > 0) {
                // remember if the setting allows multi set options
                if ("true".equals(((Element)outerValues.item(0)).getAttribute("isMulti")))
                  isMultiRightTypes.add(rightType);
                // remember if the setting has a preventEmpty setting
                if ("true".equals(((Element)outerValues.item(0)).getAttribute("preventEmpty")))
                  preventEmptyRightTypes.add(rightType);
              }

              // read allowed values and possibly marked default ones
              ArrayList<String> foundValues = new ArrayList<>();
              for (int v = 0; v < values.getLength(); v++) {
                Node vNode = values.item(v);
                if ("Value".equals(vNode.getLocalName()) && StandardNamespaceContext.SECURITY_NAMESPACE.equals(vNode.getNamespaceURI())) {
                  String value = vNode.getTextContent();
                  
                  // remember if value is the default one
                  if ("true".equals(((Element)vNode).getAttribute("default")))
                    foundDefaultValues.add(value);
                  if (value != null && ! value.isEmpty())
                    foundValues.add(value);
                }
              }
              if (! foundValues.isEmpty()) {
                allowedRightValues.put(rightType, foundValues);

                //multi defaults are only possible if the subjectPreference is a multi-allowed one
                if (! foundDefaultValues.isEmpty())
                  defaultRightValues.put(rightType, (isMultiRightTypes.contains(rightType) ? foundDefaultValues : new ArrayList<>(foundDefaultValues.subList(0, 1))));
              }
            }
          }
        }
      }
      catch (SAXException | IOException | ParserConfigurationException e) {
        log.error("can't parse subjectPreferences.xml", e);
      }
    }
  }
  
  // return indicator if a given right name is part of subjectPreferences
  public static boolean isAllowedAttribute(String name) {
    return allowedRightTypes.contains(name);
  }

  // gets a list of current permissions for a given permission name
  // don't mix this with SecurityHelper's getPermission. This function looks up
  // the subjectPreferences map by given key name
  public static List<String> getPermissionList(String rightType) {
    return SubjectPreferences.getPermissionList(rightType, false);
  }
    // same as above but if getSubList is true, you can ask for subkeys.
  // e.g. "bcdClient:", true and bcdClient:example1:value1 is available, it returns example1:value1
  public static List<String> getPermissionList(String rightType, boolean getSubList) {

    final ArrayList<String> values = new ArrayList<>();

    // get current permission map from UserSelectedSubjectSettingsRealm
    // modify it and set it again. Trigger isPermitted() to get permissions active

    SubjectPreferencesRealm realm = getSubjectPreferencesRealm();
    if (realm != null) {
      HashMap<String, ArrayList<String>> permMap = new HashMap<>(realm.getPermissionMap());

      if (getSubList) {
        for (Map.Entry<String,ArrayList<String>> entry : permMap.entrySet()) {
          String key = entry.getKey();
          if (key.startsWith(rightType)) {
            ArrayList<String> vs =  permMap.get(key);
            String sub = key.substring(rightType.length());
            if (vs != null)
              vs.forEach(s -> values.add(sub + ":" + s));
          }
        }
      }
      else {
        ArrayList<String> vs =  permMap.get(rightType);
        if (vs != null)
          vs.forEach(s -> values.add(s));
      }
    }

    return values;
  }

  // get the subjectPreferencesRealm
  private static SubjectPreferencesRealm getSubjectPreferencesRealm() {

    DefaultSecurityManager securityManager = null;
    try { securityManager = ((DefaultSecurityManager) SecurityUtils.getSecurityManager()); }
    catch (Exception e) {
      /* no security manager available */
      return null;
    }

    ArrayList<SubjectPreferencesRealm> realms = new ArrayList<>();
    securityManager.getRealms().stream().filter(r -> r instanceof SubjectPreferencesRealm).forEach(r -> realms.add((SubjectPreferencesRealm)r));
    return realms.isEmpty() ? null : realms.get(0);
  }

  // sets (and activates) a single permission value
  public static void setPermission(String rightType, String rightValue) {
    ArrayList<String> rightValues = new ArrayList<>();
    rightValues.add(rightValue);
    SubjectPreferences.setPermission(rightType, rightValues);
  }

  // get realm's permission map
  public static Map<String, ArrayList<String>> getPermissionMap() {
    SubjectPreferencesRealm realm = getSubjectPreferencesRealm();
    return (realm != null) ? new HashMap<>(realm.getPermissionMap()) : new HashMap<>();
  }

  // sets realm's permission map
  public static void setPermissionMap(Map<String, ArrayList<String>> permMap) {
    SubjectPreferencesRealm realm = getSubjectPreferencesRealm();
    if (realm != null)
      realm.setPermissionMap(permMap);
  }
  
  // sets (and activates) a single permission value list
  public static void setPermission(String rightType, List<String> rightValues) {
    SubjectPreferencesRealm realm = getSubjectPreferencesRealm();
    if (realm != null) {
      HashMap<String, ArrayList<String>> permMap = new HashMap<>(realm.getPermissionMap());
      permMap.put(rightType, (ArrayList<String>)rightValues);
      realm.setPermissionMap(permMap);
    }
  }
  
  @Override
  protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {

    // either name/value parameter pair to set (replace any of the preferences matching the name)
    String rightTypeParam = req.getParameter("name");
    String rightValueParam = req.getParameter("value");
    rightTypeParam = rightTypeParam != null ? rightTypeParam : "";
    rightValueParam = rightValueParam != null ? rightValueParam : "";

    if (! rightTypeParam.isEmpty()) {
      // check if the name is allowed
      if (allowedRightTypes.contains(rightTypeParam)) {

        ArrayList<String> rightValues = new ArrayList<>();

        // multi values are separated by comma
        for (String v : rightValueParam.split(",")) {
  
          if (testValue(rightTypeParam, v))
            rightValues.add(v.trim());
          else {
            resp.setStatus(403);
            return;
          }

          // for not multi sets, we exit here
          if (! isMultiRightTypes.contains(rightTypeParam))
            break;
        }
        // we have some permissions, so set them
        if (! rightValues.isEmpty()) {
          SubjectPreferences.setPermission(rightTypeParam, rightValues);

          // update cookie
          SubjectPreferences.setCookieMap(req, resp);
        }
      }
      else
        resp.setStatus(403);
      return;
    }

    boolean ok = true;

    // or a WRS with WRS:I/M/D rows
    DocumentBuilderFactory documentBuilderFactory = SecureXmlFactory.newDocumentBuilderFactory();
    documentBuilderFactory.setXIncludeAware(true);

    InputStream is = req.getInputStream();
    boolean refreshList = false;

    HashMap<String, ArrayList<String>> permissionMap = new HashMap<>(SubjectPreferences.getPermissionMap());
    
    // update permissionMap based on wrs:I/D/R rows in the posted wrs

    if (is != null) {
      try {
        Document doc = documentBuilderFactory.newDocumentBuilder().parse(is);
        is.close();
        
        if (doc != null) {
          
          // get wrs header and look for well known columns right_type and right_value
          NodeList header = doc.getElementsByTagNameNS(StandardNamespaceContext.WRS_NAMESPACE, "Header");
          if (header.getLength() > 0) {
            NodeList headerColumns = ((Element)header.item(0)).getElementsByTagNameNS(StandardNamespaceContext.WRS_NAMESPACE, "C");

            // determine column indexes of right_type and right_value columns
            HashMap<String, String> columns = new HashMap<>();
            for (int i = 0; i < headerColumns.getLength(); i++)
              columns.put(((Element)headerColumns.item(i)).getAttribute("id"), ((Element)headerColumns.item(i)).getAttribute("pos")); 
            int rightTypeIdx = -1;
            int rightValueIdx = -1;
            try {
              rightTypeIdx = Integer.parseInt(columns.get("right_type")) - 1;
              rightValueIdx = Integer.parseInt(columns.get("right_value")) - 1;
            }catch (NumberFormatException e) {/* ignore */ }

            // not found well known columns, end here
            if (rightTypeIdx == -1 || rightValueIdx == -1)
              return;

            ArrayList<String> possiblyEmptyRights = new ArrayList<>();

            // remove wrs:D from permission map
            NodeList removedEntries = doc.getElementsByTagNameNS(StandardNamespaceContext.WRS_NAMESPACE, "D");
            for (int i = 0;  i < removedEntries.getLength(); i++) {
              NodeList cNodes = ((Element)removedEntries.item(i)).getElementsByTagNameNS(StandardNamespaceContext.WRS_NAMESPACE, "C");
              String rightType = (rightTypeIdx <  cNodes.getLength()) ? cNodes.item(rightTypeIdx).getTextContent() : "";
              String rightValue = (rightValueIdx <  cNodes.getLength()) ? cNodes.item(rightValueIdx).getTextContent() : ""; 

              if (! rightType.isEmpty() && ! rightValue.isEmpty()) {
                ArrayList<String> rightValues = permissionMap.get(rightType);
                if (rightValues != null && rightValues.contains(rightValue)) {
                  rightValues.remove(rightValue);
                  possiblyEmptyRights.add(rightType);
                  permissionMap.put(rightType, rightValues);
                  refreshList = true;
                }
                else
                  ok = false;
              }
            }

            // update wrs:M in permission map (if allowed and old right_type is new right_type)
            NodeList modifiedEntries = doc.getElementsByTagNameNS(StandardNamespaceContext.WRS_NAMESPACE, "M");
            for (int i = 0;  i < modifiedEntries.getLength(); i++) {
              NodeList cNodes = ((Element)modifiedEntries.item(i)).getElementsByTagNameNS(StandardNamespaceContext.WRS_NAMESPACE, "C");
              NodeList oNodes      = ((Element)modifiedEntries.item(i)).getElementsByTagNameNS(StandardNamespaceContext.WRS_NAMESPACE, "O");
              String rightType     = (rightTypeIdx  < cNodes.getLength()) ? cNodes.item(rightTypeIdx).getTextContent()  : "";
              String rightValue    = (rightValueIdx < cNodes.getLength()) ? cNodes.item(rightValueIdx).getTextContent() : ""; 
              String oldRightType  = (rightTypeIdx  < oNodes.getLength()) ? oNodes.item(rightTypeIdx).getTextContent()  : "";
              String oldValueValue = (rightValueIdx < oNodes.getLength()) ? oNodes.item(rightValueIdx).getTextContent() : ""; 
              if (! rightType.isEmpty() && ! rightValue.isEmpty() && ! oldRightType.isEmpty() && ! oldValueValue.isEmpty() && oldRightType.equals(rightType)) {
                ArrayList<String> rightValues = permissionMap.get(rightType);
                // update old value to new value (if allowed) and old value exists and new one does not exist
                if (rightValues != null && ! rightValues.contains(rightValue) && rightValues.contains(oldValueValue) && testValue(rightType, rightValue)) {
                  rightValues.remove(oldValueValue);
                  rightValues.add(rightValue);
                  possiblyEmptyRights.add(oldRightType);
                  permissionMap.put(rightType, rightValues);
                  refreshList = true;
                }
                else
                  ok = false;              }
            }

            // insert wrs:I into permission map (if allowed)
            NodeList insertedEntries = doc.getElementsByTagNameNS(StandardNamespaceContext.WRS_NAMESPACE, "I");
            for (int i = 0;  i < insertedEntries.getLength(); i++) {
              NodeList cNodes = ((Element)insertedEntries.item(i)).getElementsByTagNameNS(StandardNamespaceContext.WRS_NAMESPACE, "C");
              String rightType = (rightTypeIdx <  cNodes.getLength()) ? cNodes.item(rightTypeIdx).getTextContent() : "";
              String rightValue = (rightValueIdx <  cNodes.getLength()) ? cNodes.item(rightValueIdx).getTextContent() : ""; 
              if (! rightType.isEmpty() && ! rightValue.isEmpty()) {
                ArrayList<String> rightValues = permissionMap.get(rightType);
                rightValues = rightValues != null ? rightValues : new ArrayList<>();
                // add new value if allowed
                // add a new entry only if multi is allowed or it's the one and only entry
                if (! rightValues.contains(rightValue) && testValue(rightType, rightValue) && (isMultiRightTypes.contains(rightType) || (rightValues.isEmpty() && ! isMultiRightTypes.contains(rightType)))) {
                  rightValues.add(rightValue);
                  permissionMap.put(rightType, rightValues);
                  refreshList = true;
                }
                else
                  ok = false;
              }
            }

            // check possible empty rights
            // in case the last entry was removed (after wrs:D / wrs:M) add the default one(s) (but only if preventEmpty is not set)
            // refreshList = true due to wrs:M / wrs:D already
            for (String emptyRightType : possiblyEmptyRights) {
              ArrayList<String> rightValues = permissionMap.get(emptyRightType);
              if (rightValues.isEmpty() && preventEmptyRightTypes.contains(emptyRightType)) {
                rightValues = new ArrayList<>(SubjectPreferences.getDefaultValues(emptyRightType, true));
                permissionMap.put(emptyRightType, rightValues);
              }
            }
          }
        }
      }
      catch (SAXException | IOException | ParserConfigurationException e) {
        log.error("can't parse posted subjectPreferences data", e);
      }
    }

    if (!ok) {
      resp.setStatus(403);
      return;
    }
  
    if (refreshList) {
      SubjectPreferences.setPermissionMap(permissionMap);

      // update cookie
      SubjectPreferences.setCookieMap(req, resp);
    }
  }
  
  // test if a given attribute + value is currently allowed or not
  public static boolean testValue(String rightType, String rightValue) {
    // is the value in the allowed list of values
    boolean valueOk = allowedRightValues.get(rightType) != null && allowedRightValues.get(rightType).contains(rightValue.trim());

    if (! valueOk) {
      // if we're referencing a user permission for the allowed values, check if they are ok to use
      String source = rightValueSources.get(rightType);
      if (source != null && ! source.isEmpty()) {
        Subject subject = null;
        try { subject = SecurityUtils.getSubject(); } catch (Exception e) {/* no shiro */}
        if (subject != null)
          valueOk = subject.isPermitted(source + ":" + rightValue.trim());
      }
    }
    return valueOk;
  }
  
  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {

    // return a WRS XML document with all allowedAttributes which have value set

    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Pragma", "no-cache");
    response.setDateHeader("Expires", -1);

    Subject subject = null;
    try { subject = SecurityUtils.getSubject(); } catch (Exception e) {
      log.error("UserSelectedSubjectSettings requires Shiro", e);
      return;
    }

    XMLStreamWriter writer = null;
    try {
      writer = XMLOutputFactory.newInstance().createXMLStreamWriter(response.getWriter());
      writer.writeStartDocument();
      writer.writeStartElement("Wrs");
      writer.writeDefaultNamespace(WrsDataWriter.WRS_XML_NAMESPACE);

      writer.writeStartElement("Header");
      writer.writeStartElement("Columns");
      writer.writeStartElement("C");
      writer.writeAttribute("pos", "1");
      writer.writeAttribute("id", "right_type");
      writer.writeEndElement();
      writer.writeStartElement("C");
      writer.writeAttribute("pos", "2");
      writer.writeAttribute("id", "right_value");
      writer.writeEndElement();
      writer.writeStartElement("C");
      writer.writeAttribute("pos", "3");
      writer.writeAttribute("id", "right_active");
      writer.writeEndElement();
      writer.writeEndElement();

      writer.writeEndElement();

      writer.writeStartElement("Data");
      
      int id = 0;
      for (String rightType : allowedRightTypes) {

        ArrayList<String> rightValues = null;
        ArrayList<String> permissionList = new ArrayList<>(getPermissionList(rightType));
        rightValues = (subject.isAuthenticated() && rightValueSources.containsKey(rightType)) ? new ArrayList<>(SecurityHelper.getPermissions(SecurityUtils.getSubject(), rightValueSources.get(rightType))) : allowedRightValues.get(rightType);
          
        if (rightValues != null && ! rightValues.isEmpty()) {
          
          for (String rightValue : rightValues) {
            writer.writeStartElement("R");
            writer.writeAttribute("id", "R" + ++id);

            writer.writeStartElement("C");
            writer.writeCharacters(rightType);
            writer.writeEndElement();

            writer.writeStartElement("C");
            writer.writeCharacters(rightValue);
            writer.writeEndElement();
            
            writer.writeStartElement("C");
            writer.writeCharacters(permissionList.contains(rightValue) ? "1" : "0");
            writer.writeEndElement();

            writer.writeEndElement();
          }
        }
      }

      writer.writeEndElement();

      writer.writeEndDocument();
    }
    catch (Exception e) {
      log.warn("failed to write subject preferences information", e);
    }
    finally {
      try { if (writer !=null) writer.close(); } catch (Exception ex) { log.warn("failed to close writer", ex); }
    }
  }
  
  // sets the current permissionMap as cookie
  private static void setCookieMap(HttpServletRequest request, HttpServletResponse response) {
    String name = cookieInfo.get("name");
    String path = cookieInfo.get("path");
    if (name == null)
      return;
    
    HashMap<String, ArrayList<String>> cookieMap = new HashMap<>(getPermissionMap());

    // transform settings in string key1\uE0FEvalue1,value2,...\uE0FFkey2....
    StringBuilder mapString=new StringBuilder();
    int k = 0;
    for (Map.Entry<String,ArrayList<String>> entry : cookieMap.entrySet()) {
      mapString.append((k++ > 0 ? "\uE0FF" : "") + entry.getKey()  + "\uE0FE");
      int v = 0;
      for (String value : entry.getValue())
        mapString.append((v++ > 0 ? "," : "") + value);
    }

    // encode it as gzip and set cookie
    try {
      ByteArrayOutputStream bos = new ByteArrayOutputStream();
      GZIPOutputStream zip = new GZIPOutputStream(bos);
      zip.write(mapString.toString().getBytes(StandardCharsets.UTF_8));
      zip.close();

      Cookie cookie = new Cookie(name, Base64.getEncoder().encodeToString(bos.toByteArray()));
      cookie.setPath(request.getContextPath() + path);
      cookie.setHttpOnly(true);
      cookie.setMaxAge(cookieMaxAge);
      response.addCookie(cookie);
    }
    catch (Exception e) {
      LogManager.getLogger().error("can't encode cookie", e);
    }
  }

  // reads the permissionMap cookie, transforms it back into map
  public static Map<String, ArrayList<String>> getCookieMap(HttpServletRequest request) {
    HashMap<String, ArrayList<String>> cookieMap = new HashMap<>();

    String name = cookieInfo.get("name");
    if (name != null) {
      Cookie[] cookies = request.getCookies();
      if (cookies != null) {
        for (Cookie cookie : cookies) {
          if (name.equals(cookie.getName())) {

            StringBuilder mapString = new StringBuilder();
            try {
              // decode cookie value
              if (cookie.getValue() != null) {
                GZIPInputStream gis = new GZIPInputStream(new ByteArrayInputStream(Base64.getDecoder().decode(cookie.getValue().getBytes(StandardCharsets.UTF_8))));
                BufferedReader bufReader = new BufferedReader(new InputStreamReader(gis, StandardCharsets.UTF_8));
                String s;
                while ((s = bufReader.readLine())!=null) {
                  mapString.append(s);
                }
              }
            }catch (Exception e) {
              LogManager.getLogger().error("can't decode cookie", e);
            }

            // split it up into map again
            String [] keysAndValues = mapString.toString().split("\uE0FF");
            for (String entry : keysAndValues) {
              String [] rightTypeValue = entry.split("\uE0FE");
              if (rightTypeValue.length == 2) {
                ArrayList<String> values = new ArrayList<>();
                values.addAll(Arrays.asList(rightTypeValue[1].split(",")));
                cookieMap.put(rightTypeValue[0], values);
              }
            }
          }
        }
      }
    }
    return cookieMap;
  }
  
  // returns default value(s) for a given subjectPreference
  // skipCookie = true will skip the look up in the possibly existing cookie
  // all values are tested if they are still allowed
  public static List<String> getDefaultValues(String rightType, boolean skipCookie) {
    ArrayList<String> defaultValues = new ArrayList<>();

    Subject subject = SecurityUtils.getSubject();

    if (!skipCookie) {

      // get default value from cookie
      Session session = subject.getSession(false);
      if (session == null)
        session = subject.getSession();

      // lookup cookieMap which is possibly added as session attribute 
      if (session.getAttribute(COOKIE_PERMISSION_MAP_SESSION_ATTRIBUTE) != null) {
        HashMap<String, ArrayList<String>> cookieMap = new HashMap<>((HashMap<String, ArrayList<String>>)session.getAttribute(COOKIE_PERMISSION_MAP_SESSION_ATTRIBUTE));
        ArrayList<String> values = cookieMap.get(rightType);
        if (values != null && ! values.isEmpty()) {
          for (String value : values) {
            if (SubjectPreferences.testValue(rightType, value))
              defaultValues.add(value);
          }
        }
      }
    }
    // get default from default map (in case no cookie defaults are given yet)
    if (defaultValues.isEmpty()) {
      ArrayList<String> values = SubjectPreferences.defaultRightValues.get(rightType);
      if (values != null && ! values.isEmpty()) {

        // for cnf:SourceSetting we might have bcdAllAllowed token for defaults, then
        // set all available values as defaults
        if (values.contains("#bcdAllAllowed#")) {
          String linkedPermission = SubjectPreferences.rightValueSources.get(rightType);
          values = (linkedPermission != null && subject.isAuthenticated()) ? new ArrayList<>(SecurityHelper.getPermissions(subject, linkedPermission)) : new ArrayList<>();
        }

        for (String value : values) {
          if (SubjectPreferences.testValue(rightType, value))
            defaultValues.add(value);
        }
      }
    }

    // limit to max 1 in case of the setting does not allow setting multiple values
    return (defaultValues.size() > 1 && ! SubjectPreferences.isMultiRightTypes.contains(rightType)) ? new ArrayList<>(defaultValues.subList(0, 1)) : defaultValues;
  }
}
