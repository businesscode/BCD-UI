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

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
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

public class SubjectPreferences extends HttpServlet {

  private static final long serialVersionUID = 1L;
  private final Logger log = LogManager.getLogger(getClass());

  private static final ArrayList<String> allowedAttributes = new ArrayList<>();
  private static final HashMap<String, ArrayList<String>> allowedValues = new HashMap<>();
  private static final List<String> allowedMulti = new ArrayList<>();

  public static final Map<String, String> defaultValues = new HashMap<>();
  public static final Map<String, String> valueSources = new HashMap<>();

  @Override
  public void init(ServletConfig config) throws ServletException {
    super.init(config);
    
    DocumentBuilderFactory documentBuilderFactory = SecureXmlFactory.newDocumentBuilderFactory();
    documentBuilderFactory.setXIncludeAware(true);
    documentBuilderFactory.setNamespaceAware(true);
    
    // read and parse the configuration
    
    InputStream is = getServletContext().getResourceAsStream("/bcdui/conf/subjectPreferences.xml");

    if (is != null) {
      try {
        Document doc = documentBuilderFactory.newDocumentBuilder().parse(is);
        is.close();
        
        if (doc != null) {
          NodeList settings = doc.getElementsByTagNameNS(StandardNamespaceContext.CONFIG_NAMESPACE, "Setting");
          for (int n = 0; n < settings.getLength(); n++) {
            Node node = settings.item(n);

            
            // collect listed Setting elements as allowedAttributes
            String name = ((Element)(node)).getAttribute("name");
            if (name != null) {
              allowedAttributes.add(name);

              // remember if the setting allows multi set options
              if ("true".equals(((Element)(node)).getAttribute("multi")))
                allowedMulti.add(name);
            }

            NodeList values = ((Element)node).getElementsByTagNameNS(StandardNamespaceContext.CONFIG_NAMESPACE, "Value");
            NodeList sources = ((Element)node).getElementsByTagNameNS(StandardNamespaceContext.CONFIG_NAMESPACE, "SourceSetting");
            
            // we have a SourceSetting, so remember the source, self referencing is not allowed
            if (sources.getLength() > 0) {
              String subjectSetting = ((Element)sources.item(0)).getAttribute("name");
              if (subjectSetting != null && ! subjectSetting.isEmpty() && !name.equals(subjectSetting))
                valueSources.put(name, subjectSetting);
            }

            // or we have a list of allowed values, so take them as allowed values
            else if (values.getLength() > 0) {
              ArrayList<String> foundValues = new ArrayList<>();
              String defaultValue = null;
              for (int v = 0; v < values.getLength(); v++) {
                Node vNode = values.item(v);
                if ("Value".equals(vNode.getLocalName()) && StandardNamespaceContext.CONFIG_NAMESPACE.equals(vNode.getNamespaceURI())) {
                  String value = vNode.getTextContent();
                  
                  // remember if value is the default one
                  if ("true".equals(((Element)vNode).getAttribute("default")))
                    defaultValue = value;
                  if (value != null && ! value.isEmpty())
                    foundValues.add(value);
                }
              }
              if (! foundValues.isEmpty()) {
                // sort values alphabetically (cosmetics) and take the first one if no default is specified as default
                foundValues.sort(String::compareToIgnoreCase);
                allowedValues.put(name, foundValues);
                defaultValues.put(name, defaultValue != null && ! defaultValue.isEmpty() ? defaultValue : foundValues.get(0));
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

  // gets a list of current permissions for a given permission name
  // don't mix this with SecurityHelper's getPermission. This function looks up
  // the subjectPreferences map by given key name
  public static List<String> getPermissionList(String name) {
    return SubjectPreferences.getPermissionList(name, false);
  }
  // same as above but if getSubList is true, you can ask for subkeys.
  // e.g. "bcdClient:", true and bcdClient:example1:value1 is available, it returns example1:value1
  public static List<String> getPermissionList(String name, boolean getSubList) {

    final ArrayList<String> values = new ArrayList<>();

    // get current permission map from UserSelectedSubjectSettingsRealm
    // modify it and set it again. Trigger isPermitted() to get permissions active

    SubjectPreferencesRealm realm = getSubjectPreferencesRealm();
    if (realm != null) {
      HashMap<String, ArrayList<String>> permMap = new HashMap<>(realm.getPermissionMap());

      if (getSubList) {
        for (Map.Entry<String,ArrayList<String>> entry : permMap.entrySet()) {
          String key = entry.getKey();
          if (key.startsWith(name)) {
            ArrayList<String> vs =  permMap.get(key);
            String sub = key.substring(name.length());
            if (vs != null)
              vs.forEach((s) -> { values.add(sub + ":" + s); });
          }
        }
      }
      else {
        ArrayList<String> vs =  permMap.get(name);
        if (vs != null)
          vs.forEach((s) -> { values.add(s); });
      }
    };

    return values;
  }

  // get the subjectPreferencesRealm
  private static SubjectPreferencesRealm getSubjectPreferencesRealm() {
    ArrayList<SubjectPreferencesRealm> realms = new ArrayList<>();
    ((DefaultSecurityManager) SecurityUtils.getSecurityManager()).getRealms().stream().filter(r -> r instanceof SubjectPreferencesRealm).forEach(r -> {
      realms.add((SubjectPreferencesRealm)r);
    });
    return realms.isEmpty() ? null : realms.get(0);
  }

  // sets (and activates) a single permission value
  public static void setPermission(String name, String value) {
    ArrayList<String> values = new ArrayList<>();
    values.add(value);
    SubjectPreferences.setPermission(name, values);
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
  public static void setPermission(String name, List<String> values) {
    SubjectPreferencesRealm realm = getSubjectPreferencesRealm();
    if (realm != null) {
      HashMap<String, ArrayList<String>> permMap = new HashMap<>(realm.getPermissionMap());
      permMap.put(name, (ArrayList<String>)values);
      realm.setPermissionMap(permMap);
    }
  }
  
  @Override
  protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {

    DocumentBuilderFactory documentBuilderFactory = SecureXmlFactory.newDocumentBuilderFactory();
    documentBuilderFactory.setXIncludeAware(true);
    documentBuilderFactory.setNamespaceAware(true);

    InputStream is = req.getInputStream();
    boolean refreshList = false;

    HashMap<String, ArrayList<String>> permMap = new HashMap<>(SubjectPreferences.getPermissionMap());
    
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

            // determine column indexes
            HashMap<String, String> columns = new HashMap<>();
            for (int i = 0; i < headerColumns.getLength(); i++)
              columns.put(((Element)headerColumns.item(i)).getAttribute("id"), ((Element)headerColumns.item(i)).getAttribute("pos")); 
            int right_type_idx = -1;
            int right_value_idx = -1;
            try {
              right_type_idx = Integer.parseInt(columns.get("right_type")) - 1;
              right_value_idx = Integer.parseInt(columns.get("right_value")) - 1;
            }catch (NumberFormatException e) {/* ignore */ }

            // not found well known columns, end here
            if (right_type_idx == -1 || right_value_idx == -1)
              return;

            // remove wrs:D from permission map
            NodeList removedEntries = doc.getElementsByTagNameNS(StandardNamespaceContext.WRS_NAMESPACE, "D");
            for (int i = 0;  i < removedEntries.getLength(); i++) {
              NodeList values = ((Element)removedEntries.item(i)).getElementsByTagNameNS(StandardNamespaceContext.WRS_NAMESPACE, "C");
              String right = (right_type_idx <  values.getLength()) ? values.item(right_type_idx).getTextContent() : "";
              String value = (right_value_idx <  values.getLength()) ? values.item(right_value_idx).getTextContent() : ""; 

              if (! right.isEmpty() && ! value.isEmpty()) {
                ArrayList<String> curValues = permMap.get(right);
                if (curValues != null && curValues.contains(value)) {
                  curValues.remove(value);

                  // in case the last entry was removed add the default one
                  // (static values only since valueSources based ones get filled in automatically on realm's getPermissionMap) 
                  if (curValues.isEmpty()) {
                    String defaultValue = defaultValues.get(right);
                    if (defaultValue != null)
                      curValues.add(defaultValue);
                  }

                  permMap.put(right, curValues);
                  refreshList = true;
                }
              }
            }

            // update wrs:M in permission map (if allowed and old right_type is new right_type)
            NodeList modifiedEntries = doc.getElementsByTagNameNS(StandardNamespaceContext.WRS_NAMESPACE, "M");
            for (int i = 0;  i < modifiedEntries.getLength(); i++) {
              NodeList values = ((Element)modifiedEntries.item(i)).getElementsByTagNameNS(StandardNamespaceContext.WRS_NAMESPACE, "C");
              NodeList oldValues = ((Element)modifiedEntries.item(i)).getElementsByTagNameNS(StandardNamespaceContext.WRS_NAMESPACE, "O");
              String right = (right_type_idx <  values.getLength()) ? values.item(right_type_idx).getTextContent() : "";
              String value = (right_value_idx <  values.getLength()) ? values.item(right_value_idx).getTextContent() : ""; 
              String oldRight = (right_type_idx <  oldValues.getLength()) ? oldValues.item(right_type_idx).getTextContent() : "";
              String oldValue = (right_value_idx <  oldValues.getLength()) ? oldValues.item(right_value_idx).getTextContent() : ""; 
              if (! right.isEmpty() && ! value.isEmpty() && ! oldRight.isEmpty() && ! oldValue.isEmpty() && oldRight.equals(right)) {
                ArrayList<String> curValues = permMap.get(right);
                // update old value to new value (if allowed) and old value exists and new one does not exist
                if (curValues != null && ! curValues.contains(value) && curValues.contains(oldValue) && testValue(right, value)) {
                  curValues.remove(oldValue);
                  curValues.add(value);
                  permMap.put(right, curValues);
                  refreshList = true;
                }
              }
            }

            // insert wrs:I into permission map (if allowed)
            NodeList insertedEntries = doc.getElementsByTagNameNS(StandardNamespaceContext.WRS_NAMESPACE, "I");
            for (int i = 0;  i < insertedEntries.getLength(); i++) {
              NodeList values = ((Element)insertedEntries.item(i)).getElementsByTagNameNS(StandardNamespaceContext.WRS_NAMESPACE, "C");
              String right = (right_type_idx <  values.getLength()) ? values.item(right_type_idx).getTextContent() : "";
              String value = (right_value_idx <  values.getLength()) ? values.item(right_value_idx).getTextContent() : ""; 
              if (! right.isEmpty() && ! value.isEmpty()) {
                ArrayList<String> curValues = permMap.get(right);
                // add new value if allowed
                if (curValues != null && ! curValues.contains(value) && testValue(right, value)) {
                  // add a new entry only if multi is allowed or it's the one and only entry
                  if (allowedMulti.contains(right) || (curValues.isEmpty() && ! allowedMulti.contains(right))) {
                    curValues.add(value);
                    permMap.put(right, curValues);
                    refreshList = true;
                  }
                }
              }
            }
          }
        }
      }
      catch (SAXException | IOException | ParserConfigurationException e) {
        log.error("can't parse posted subjectPreferences data", e);
      }
    }
    if (refreshList) {
      SubjectPreferences.setPermissionMap(permMap);
    }
  }
  
  private boolean testValue(String name, String v) {
    // is the value in the allowed list of values (* indicates permission)
    boolean valueOk = allowedValues.get(name) != null && (allowedValues.get(name).contains(v.trim()) || allowedValues.get(name).contains("*"));

    if (! valueOk) {
      // if we're referencing a user permission for the allowed values, check if they are ok to use
      String source = valueSources.get(name);
      if (source != null && ! source.isEmpty()) {
        Subject subject = null;
        try { subject = SecurityUtils.getSubject(); } catch (Exception e) {/* no shiro */}
        if (subject != null)
          valueOk = subject.isPermitted(source + ":" + v.trim());
      }
    }
    // value is allowed, so we add it
    return valueOk;
  }
  
  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Pragma", "no-cache");
    response.setDateHeader("Expires", -1);

    Subject subject = null;
    try { subject = SecurityUtils.getSubject(); } catch (Exception e) {
      log.error("UserSelectedSubjectSettings requires Shiro", e);
      return;
    }

    String pathInfo = request.getPathInfo();
    boolean possible = pathInfo != null && pathInfo.length() > 0 && "possible".equals(pathInfo.substring(1));
    String name = request.getParameter("name");
    String value = request.getParameter("value");
    value = value != null ? value : "";
    name = name != null ? name : "";

    // multi values are separated by comma
    String[] singleValues = value.split(",");

    if (! name.isEmpty()) {

      String message = "";

      // check if the name is allowed
      if (allowedAttributes.contains(name)) {
        
        ArrayList<String> values = new ArrayList<>();
        for (String v : singleValues) {
  
          if (testValue(name, v))
            values.add(v.trim());

          // for not multi sets, we exit here
          if (! allowedMulti.contains(name))
            break;
        }
        // we have some permissions, so set them
        if (! values.isEmpty()) {
          setPermission(name, values);
          message = "The attribute name '" + name +  "' was set to " + values.toString();
        }
        else
          message = "The attribute name '" + name +  "' can not be set to '" + value + "'";
      }
      else
        message = "The attribute name '" + name + "' is not allowed by the configuration.";

      log.debug(message);

    }
    // if no name/value param is available print out the currently active settings in wrs format
    // in case "possible" is requested, print out all available ones and mark active ones
    else {
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
        writer.writeEndElement();

        writer.writeEndElement();

        writer.writeStartElement("Data");
        
        int id = 0;
        for (String a : allowedAttributes) {

          ArrayList<String> values = null;
          ArrayList<String> permList = new ArrayList<>(getPermissionList(a));
          if (possible)
            values = (subject.isAuthenticated() && valueSources.containsKey(a)) ? new ArrayList<>(SecurityHelper.getPermissions(SecurityUtils.getSubject(), valueSources.get(a))) : allowedValues.get(a);
          else
            values = permList;
            
          if (values != null && ! values.isEmpty()) {
            
            for (String v : values) {
              writer.writeStartElement("R");
              writer.writeAttribute("id", "R" + ++id);

              if (permList.contains(v))
                writer.writeAttribute("active", "true");

              writer.writeStartElement("C");
              writer.writeCharacters(a);
              writer.writeEndElement();

              writer.writeStartElement("C");
              writer.writeCharacters(v);
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
  }
}
