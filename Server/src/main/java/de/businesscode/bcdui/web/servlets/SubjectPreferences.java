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

import org.apache.logging.log4j.Logger;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.mgt.DefaultSecurityManager;
import org.apache.shiro.subject.SimplePrincipalCollection;
import org.apache.shiro.subject.Subject;
import org.apache.shiro.subject.support.DefaultSubjectContext;
import org.w3c.dom.Document;
import org.w3c.dom.Node;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

import de.businesscode.bcdui.subjectsettings.SubjectPreferencesRealm;
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

  private static final String CONFIGNAMESPACEURI = "http://www.businesscode.de/schema/bcdui/config-1.0.0";

  @Override
  public void init(ServletConfig config) throws ServletException {
    super.init(config);
    
    DocumentBuilderFactory documentBuilderFactory = SecureXmlFactory.newDocumentBuilderFactory();
    documentBuilderFactory.setXIncludeAware(true);
    documentBuilderFactory.setNamespaceAware(true);
    
    InputStream is = getServletContext().getResourceAsStream("/bcdui/conf/subjectPreferences.xml");

    if (is != null) {
      try {
        Document doc = documentBuilderFactory.newDocumentBuilder().parse(is);
        is.close();
        
        if (doc != null) {
          NodeList settings = doc.getElementsByTagNameNS(CONFIGNAMESPACEURI, "Setting");
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

            NodeList values = ((Element)node).getElementsByTagNameNS(CONFIGNAMESPACEURI, "Value");
            NodeList sources = ((Element)node).getElementsByTagNameNS(CONFIGNAMESPACEURI, "SourceSetting");
            
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
                if ("Value".equals(vNode.getLocalName()) && CONFIGNAMESPACEURI.equals(vNode.getNamespaceURI())) {
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
        log.error("can't parse subjectPreferences.xml");
      }
    }
  }

  public static List<String> getPermission(String name) {

    final ArrayList<String> values = new ArrayList<>();

    // get current permission map from UserSelectedSubjectSettingsRealm
    // modify it and set it again. Trigger isPermitted() to get permissions active 
    ((DefaultSecurityManager) SecurityUtils.getSecurityManager()).getRealms().stream().filter(r -> r instanceof SubjectPreferencesRealm).forEach(r -> {
      HashMap<String, ArrayList<String>> permMap = (HashMap<String, ArrayList<String>>)((SubjectPreferencesRealm)r).getPermissionMap();
      ArrayList<String> vs =  permMap.get(name);
      if (vs != null)
        vs.forEach((s) -> { values.add(s); });
    });

    return values;
  }

  public static void setPermission(String name, String value) {
    ArrayList<String> values = new ArrayList<>();
    values.add(value);
    SubjectPreferences.setPermission(name, values);
  }

  public static void setPermission(String name, List<String> values) {
    Subject subject = SecurityUtils.getSubject();

    // in case we're not yet logged in, use a guest principal
    if (subject.getSession().getAttribute(DefaultSubjectContext.PRINCIPALS_SESSION_KEY) == null)
      subject.getSession().setAttribute(DefaultSubjectContext.PRINCIPALS_SESSION_KEY, new SimplePrincipalCollection("bcd-guest", "bcd-guest"));          

    // get current permission map from UserSelectedSubjectSettingsRealm modify it and set it again 
    ((DefaultSecurityManager) SecurityUtils.getSecurityManager()).getRealms().stream().filter(r -> r instanceof SubjectPreferencesRealm).forEach(r -> {
      HashMap<String, ArrayList<String>> permMap = (HashMap<String, ArrayList<String>>)((SubjectPreferencesRealm)r).getPermissionMap();
      permMap.put(name, (ArrayList<String>)values);
      ((SubjectPreferencesRealm)r).activatePermissions(subject.getPrincipals(), permMap);
    });
  }
  
  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Pragma", "no-cache");
    response.setDateHeader("Expires", -1);

    Subject subject = null;
    try { subject = SecurityUtils.getSubject(); } catch (Exception e) {
      log.error("UserSelectedSubjectSettings requires Shiro");
      return;
    }

    String name = request.getParameter("name");
    String value = request.getParameter("value");
    value = value != null ? value : "";
    String message = "The parameter 'name' is empty";

    // multi values are separated by comma
    String[] singleValues = value.split(",");

    if (name != null && name.length() > 0) {
      
      // check if the name is allowed
      if (allowedAttributes.contains(name)) {
        
        ArrayList<String> values = new ArrayList<>();
        for (String v : singleValues) {
  
          // is the value in the allowed list of values (* indicates permission)
          boolean valueOk = allowedValues.get(name) != null && (allowedValues.get(name).contains(v.trim()) || allowedValues.get(name).contains("*"));

          if (! valueOk) {
            // if we're referencing a user permission for the allowed values, check if they are ok to use
            String source = valueSources.get(name);
            if (source != null && ! source.isEmpty()) {
              valueOk = subject.isPermitted(source + ":" + v.trim());
            }
          }
          // value is allowed, so we add it
          if (valueOk)
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
    }

    log.debug(message);
  }
}
