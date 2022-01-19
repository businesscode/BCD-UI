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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.logging.log4j.Logger;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.subject.Subject;

import de.businesscode.bcdui.subjectsettings.SecurityHelper;

import org.apache.logging.log4j.LogManager;

/**
 * Servlet to manage a BCD_EL_USER_BEAN hashmap entries available as a shiro session attribute.
 *
 * Client can call the GET on servlet with parameters: name=&lt;attribute name&gt;&amp;value=&lt;attribute value&gt; and the servlet sets the session map attribute.
 *
 * The space separated list of allowed attributes should be configured in the init param ALLOWED_ATTRIBUTES.
 *
 */
public class SessionAttributesManager extends HttpServlet {
  
  public static final String BCD_EL_USER_BEAN = "bcdUserBean";
  
  /**
   * 
   */
  private static final long serialVersionUID = 1L;
  private final Logger log = LogManager.getLogger(getClass());
  //
  private static final ArrayList<String> allowedAttributes = new ArrayList<>();
  private static final HashMap<String, String> allowedValues = new HashMap<>();
  private static final HashMap<String, String> defaultValues = new HashMap<>();

  /**
   * @see javax.servlet.GenericServlet#init(javax.servlet.ServletConfig)
   */
  @Override
  public void init(ServletConfig config) throws ServletException {
    super.init(config);

    String[] attributes = config.getInitParameter("ALLOWED_ATTRIBUTES").split(",");
    for (String v : attributes) {
      allowedAttributes.add(v.trim());
    }

    String allValues = config.getInitParameter("ALLOWED_VALUES");
    if (allValues != null) {
      String[] values = allValues.split(",");
      for (String v : values) {
        if (v.indexOf(":") > -1 &&  v.split(":").length > 1) {
          String key = v.split(":")[0].trim();
          String val = v.split(":")[1].trim();
          allowedValues.put(key, " " + val + " ");
          if (val.split(" ").length > 0)
            defaultValues.put(key, val.split(" ")[0]);
        }
      }
    }

    if (config.getInitParameter("ALLOWED_ATTRIBUTES") != null)
      log.debug("Configured with init parameter: " + config.getInitParameter("ALLOWED_ATTRIBUTES"));
    else
      log.warn("Missing init parameter ALLOWED_ATTRIBUTES");
  }
  
  /* get belonging bean value for given key
   * if value is not found, lookup possible existing default value (first entry in ALLOWED_VALUES list)
   * and set the entry
   */
  public static String getBeanValue(String key) {
    Subject subject = SecurityUtils.getSubject();
    String value = null;
    boolean gotSession = subject != null && subject.getSession() != null;
    HashMap<String, String> bean = gotSession ? (HashMap<String, String>)subject.getSession().getAttribute(BCD_EL_USER_BEAN) : null;
    // still no map?, create it
    if (bean == null)
      bean = new HashMap<>();

    value = bean.get(key);

    // no value found, lookup default
    if (value == null) {
      value = defaultValues.get(key);

      // still no default? then lookup user permissions
      if (value == null && gotSession) {

        // take alphabetically 1st value as default
        // however, we can't add this value to the defaultValues map since this is user specific information and not static servlet one!
        List<String> sortedPerm = new ArrayList<>(SecurityHelper.getPermissions(subject, BCD_EL_USER_BEAN + ":" + key));
        sortedPerm.sort(String::compareToIgnoreCase);
        if (! sortedPerm.isEmpty())
          value = sortedPerm.get(0);
      }

      // default found, so set it, no need to doublecheck key here since defaultValues only exist for allowed keys
      if (value != null && gotSession) {
        bean.put(key, value);
        subject.getSession().setAttribute(BCD_EL_USER_BEAN, bean);
      }
    }
    return value == null ? "" : value;
  }

  /**
   * @see javax.servlet.http.HttpServlet#doGet(javax.servlet.http.HttpServletRequest, javax.servlet.http.HttpServletResponse)
   */
  @Override
  protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    response.setHeader("Cache-Control", "no-cache");
    response.setHeader("Pragma", "no-cache");
    response.setDateHeader("Expires", -1);

    String name = request.getParameter("name");
    String value = request.getParameter("value");
    String message = "The parameter 'name' is empty";

    if (name != null && name.length() > 0) {
      if (allowedAttributes.contains(name)) {

        // add bcdBeanUser.name entries as HashMap session variable "bcdBeanUser" where the key/value pairs
        // are kept without the prefix.
        boolean error = true;
        Subject subject = SecurityUtils.getSubject();
        // check value against list of allowed values or subject settings user rights
        if (subject != null && subject.getSession() != null && ((allowedValues.get(name) != null && allowedValues.get(name).contains(" " + value + " ")) || subject.isPermitted(BCD_EL_USER_BEAN + ":" + name + ":" + value))) {
          Map<String, String> bean = (HashMap<String, String>)subject.getSession().getAttribute(BCD_EL_USER_BEAN);
          if (bean == null)
            bean = new HashMap<>();
          bean.put(name, value);
          subject.getSession().setAttribute(BCD_EL_USER_BEAN, bean);
          error = false;
        }
        message ="The " + BCD_EL_USER_BEAN + " '" + name +  (error ? "' can not be set to '" : "' was set to ") + value;
      }
      else {
        message = "The attribute name '" + name + "' is not allowed by the configuration. Please set the init param ALLOWED_ATTRIBUTES in your web.xml";
      }
    }
    log.debug(message);
  }
}
