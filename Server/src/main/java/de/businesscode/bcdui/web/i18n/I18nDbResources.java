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
package de.businesscode.bcdui.web.i18n;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Enumeration;
import java.util.HashMap;
import java.util.ListResourceBundle;
import java.util.Locale;
import java.util.Map;
import java.util.ResourceBundle;
import java.util.Set;

import javax.servlet.http.HttpSession;

import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;

import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.sqlengine.SQLEngine;
import de.businesscode.util.Utils;
import de.businesscode.util.jdbc.Closer;

public class I18nDbResources extends ListResourceBundle {
  public static final String BCDUI_LANG_VAR_NAME = "bcdui.lang";
  public static final String BCDUI_DECIMAL_SEPARATOR = "bcdui.dec.sep";
  public static final String BCDUI_GROUPING_SEPARATOR = "bcdui.group.sep";
  public static final String BCDUI_DATE_PATTERN = "bcdui.date.pattern";
  public static final String BCDUI_DATETIME_PATTERN = "bcdui.datetime.pattern";
  public static final String BCDUI_XSLT_DATE_PATTERN = "bcdui.xslt.date.pattern";
  public static final String BCDUI_XSLT_DATETIME_PATTERN = "bcdui.xslt.datetime.pattern";
  public static final String BCDUI_DATE_SEPARATOR = "bcdui.date.separator";

  private static final String SESSION_KEY_CONTENTS = I18nDbResources.class.getName();

  private Locale lang;
  private Logger logger;
  private Connection con;
  private String decimalSeparator;
  private String groupSeparator;
  private String datePattern;
  private String dateTimePattern;
  private String xsltDatePattern;
  private String xsltDateTimePattern;
  private String dateSeparator;
  private ResourceBundle messagesBundle;
  private HttpSession session;

  private static final String selectFileSQL=
      " #set( $k = $bindings.bcd_i18n ) "+
      " SELECT" +
      "   $k.key-" +
      " , $k.value-" +
      " FROM $k.getPlainTableName()" +
      " WHERE $k.lang- = ?" +
      " UNION" +
      " SELECT" +
      "   $k.key-" +
      " , $k.value-" +
      " FROM $k.getPlainTableName() v2" +
      " WHERE $k.lang- = 'default'" +
      " AND $k.key- NOT IN (SELECT $k.key- FROM $k.getPlainTableName() WHERE $k.key- = v2.$k.key- and $k.lang- = ?)";

  /**
   * I18nDbResources
   */
  public I18nDbResources(HttpSession session, Connection con) {
    this.session = session;

    this.lang = (Locale) session.getAttribute(I18nDbResources.BCDUI_LANG_VAR_NAME);
    this.decimalSeparator = (String) session.getAttribute(I18nDbResources.BCDUI_DECIMAL_SEPARATOR);
    this.groupSeparator = (String) session.getAttribute(I18nDbResources.BCDUI_GROUPING_SEPARATOR);

    this.datePattern = (String) session.getAttribute(I18nDbResources.BCDUI_DATE_PATTERN);
    this.dateSeparator = (String) session.getAttribute(I18nDbResources.BCDUI_DATE_SEPARATOR);
    this.xsltDatePattern = (String) session.getAttribute(I18nDbResources.BCDUI_XSLT_DATE_PATTERN);

    this.dateTimePattern = (String) session.getAttribute(I18nDbResources.BCDUI_DATETIME_PATTERN);
    this.xsltDateTimePattern = (String) session.getAttribute(I18nDbResources.BCDUI_XSLT_DATETIME_PATTERN);

    this.logger = LogManager.getLogger(this.getClass());
    this.con = con;
    try {
      this.messagesBundle = ResourceBundle.getBundle("i18n/messages", this.lang, new Control(){
      @Override
      public Locale getFallbackLocale(String baseName, Locale locale) {
        return Locale.ROOT;
      }
    });
    }
    catch (Exception e) {
      this.messagesBundle = null;
    }
  }
  /**
   * @see java.util.ListResourceBundle#getContents()
   */
  @Override
  protected Object[][] getContents() {
    Object[][] con = (Object[][])this.session.getAttribute(SESSION_KEY_CONTENTS);
    if(con == null) {
      con = retrieveContents();
      this.session.setAttribute(SESSION_KEY_CONTENTS, con);
    }

    return con;
  }

  public static Connection getControlConnection() throws Exception{
    BindingSet bs  = Bindings.getInstance().get("bcd_i18n", new ArrayList<String>());
    Connection con = Configuration.getInstance().getManagedConnection(bs.getDbSourceName());
    return con;
  }

  public static String getTransformSQL(String sql){
    String fe = new SQLEngine().transform(sql);
    return fe;
  }

  private Object[][] retrieveContents() {

    Map<String, String> map = new HashMap<String, String>();

    Connection connection = null;

    boolean gotBinding = true;
    try {connection = getControlConnection();} catch (Exception ex) {
      gotBinding  = false;
    }

    if (gotBinding) {
      if (lang != null) {
        PreparedStatement stmt = null;
        ResultSet result = null;

        try{

          SimpleDateFormat monthFormat = new SimpleDateFormat("MMM",lang);
          Calendar calendar = Utils.getDefaultCalendar(lang);
          calendar.set(Calendar.DAY_OF_MONTH,1);
          for(int i = 0; i < 12; i++){
            calendar.set(Calendar.MONTH, i);
            map.put("bcdui.month." + (i+1), monthFormat.format(calendar.getTime()));
          }

          String sql = getTransformSQL(selectFileSQL);
          stmt = connection.prepareStatement(sql);

          stmt.setString(1, lang.toString());
          stmt.setString(2, lang.toString());

          result = stmt.executeQuery();

          while (result.next()) {
            map.put(result.getString(1), result.getString(2));
          }
          if (decimalSeparator != null) {
            map.put(I18nDbResources.BCDUI_DECIMAL_SEPARATOR, decimalSeparator);
          }
          if (groupSeparator != null) {
            map.put(I18nDbResources.BCDUI_GROUPING_SEPARATOR, groupSeparator);
          }
          if (datePattern != null) {
            map.put(I18nDbResources.BCDUI_DATE_PATTERN, datePattern);
          }
          if (dateTimePattern != null) {
              map.put(I18nDbResources.BCDUI_DATETIME_PATTERN, dateTimePattern);
          }
          if (dateSeparator != null) {
            map.put(I18nDbResources.BCDUI_DATE_SEPARATOR, dateSeparator);
          }
          if (xsltDatePattern != null) {
            map.put(I18nDbResources.BCDUI_XSLT_DATE_PATTERN, xsltDatePattern);
          }
          if (xsltDateTimePattern != null) {
              map.put(I18nDbResources.BCDUI_XSLT_DATETIME_PATTERN, xsltDateTimePattern);
          }
          else{
            if (datePattern != null && dateSeparator != null){
              map.put(I18nDbResources.BCDUI_XSLT_DATE_PATTERN, datePattern.replace(dateSeparator, ""));
            }
          }
          if (messagesBundle != null) {
            try {
              Enumeration<String> keys = messagesBundle.getKeys();
              while (keys.hasMoreElements()) {
                String nextKey = keys.nextElement();
                map.put(nextKey, messagesBundle.getString(nextKey));
              }
            }
            catch (Exception e) {
              // do nothing
            }
          }
        }
        catch (Exception e) {
          throw new RuntimeException(e);
        }
        finally{
          Closer.closeAllSQLObjects(result, stmt);
        }
      }
      else {
        // debug:
        logger.warn("No language defined!");
      }
    }
    else {
      // debug:
      logger.warn("I18nDbResources table name was not found!");
    }
    // convert to array
    Set<String> keySet = map.keySet();
    String[][] resultArray = new String[keySet.size()][keySet.size()];
    int i = 0;
    for (String str : keySet) {
      resultArray[i][0] = str;
      resultArray[i][1] = map.get(str);
      i++;
    }

    return resultArray;
  }

  @Deprecated
  public Locale getLang() {
    return lang;
  }

  @Deprecated
  public void setLang(Locale lang) {
    this.lang = lang;
  }

  public Locale getLanguage() {
    return lang;
  }

  public void setLanguage(Locale lang) {
    this.lang = lang;
  }

  public Logger getLogger() {
    return logger;
  }

  public void setLogger(Logger logger) {
    this.logger = logger;
  }

  @Deprecated
  public Connection getCon() {
    return con;
  }

  @Deprecated
  public void setCon(Connection con) {
    this.con = con;
  }

  public Connection getConnection() {
    return con;
  }

  public void setConnection(Connection con) {
    this.con = con;
  }

  public String getDecimalSeparator() {
    return decimalSeparator;
  }

  public void setDecimalSeparator(String decimalSeparator) {
    this.decimalSeparator = decimalSeparator;
  }

  public String getGroupSeparator() {
    return groupSeparator;
  }

  public void setGroupSeparator(String groupSeparator) {
    this.groupSeparator = groupSeparator;
  }

  public String getDatePattern() {
    return datePattern;
  }

  public void setDatePattern(String datePattern) {
    this.datePattern = datePattern;
  }

  public String getDateTimePattern() {
    return dateTimePattern;
  }

  public void setDateTimePattern(String dateTimePattern) {
    this.dateTimePattern = dateTimePattern;
  }

  public String getXsltDatePattern() {
    return xsltDatePattern;
  }

  public void setXsltDatePattern(String xsltDatePattern) {
    this.xsltDatePattern = xsltDatePattern;
  }

  public String getXsltDateTimePattern() {
    return xsltDateTimePattern;
  }

  public void setXsltDateTimePattern(String xsltDateTimePattern) {
    this.xsltDateTimePattern = xsltDateTimePattern;
  }

  public String getDateSeparator() {
    return dateSeparator;
  }

  public void setDateSeparator(String dateSeparator) {
    this.dateSeparator = dateSeparator;
  }

  public ResourceBundle getMessagesBundle() {
    return messagesBundle;
  }

  public void setMessagesBundle(ResourceBundle messagesBundle) {
    this.messagesBundle = messagesBundle;
  }

}
