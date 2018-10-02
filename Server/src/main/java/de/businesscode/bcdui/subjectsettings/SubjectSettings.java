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
package de.businesscode.bcdui.subjectsettings;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;

import javax.xml.bind.JAXBContext;
import javax.xml.bind.Unmarshaller;
import javax.xml.bind.annotation.XmlAccessType;
import javax.xml.bind.annotation.XmlAccessorType;
import javax.xml.bind.annotation.XmlRootElement;
import javax.xml.bind.annotation.XmlType;

import org.apache.log4j.Logger;
import org.apache.shiro.session.Session;

import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.subjectsettings.config.SubjectFilterType;
import de.businesscode.bcdui.subjectsettings.config.SubjectFilterType.BindingItems;
import de.businesscode.bcdui.subjectsettings.config.SubjectFilterType.BindingItems.C;
import de.businesscode.bcdui.subjectsettings.config.SubjectSettingsConfig;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.toolbox.config.BareConfiguration;
import de.businesscode.bcdui.web.i18n.I18n;

/**
 * Subject settings are session settings in web and non-web environments
 * It covers rights, i18n settings and so on
 */
@XmlAccessorType(XmlAccessType.FIELD)
@XmlType(name = "SubjectSettingsConfig")
@XmlRootElement(name = "SubjectSettingsConfig", namespace="http://www.businesscode.de/schema/bcdui/subjectsettings-1.0.0")
public class SubjectSettings extends SubjectSettingsConfig {

  private static final String permissionAttributePrefix = "permission:";

  private static SubjectSettings singelton = null;
  private static final Logger log = Logger.getLogger(SubjectSettings.class);
  private Map<String,SubjectFilterType> subjectFilterTypeMap = null;
  private static boolean rightsInDbAvailable = true;
  private static Lock initLock = new ReentrantLock(true);
  private static Lock lookupLock = new ReentrantLock(true);

  /**
   * if subjectsettings was configured by project or we just have a hollow instance
   */
  private boolean wasConfigured = false;

  /**
   * @return TRUE if this instance was configured by host project is is hollow instance
   */
  public boolean isWasConfigured() {
    return wasConfigured;
  }

  public final static SubjectSettings getInstance()
  {
    if( singelton==null ) {
      initLock.lock();
      try{
        if(singelton==null){
          String confPath = (String)BareConfiguration.getInstance().getConfigurationParameterOrNull(Configuration.CONFIG_FILE_PATH_KEY);
          if(confPath == null){
            singelton = new SubjectSettings();
            singelton.initImplicitFilters();
          }else{
            try {
              FileInputStream file = new FileInputStream(confPath+File.separator+"subjectSettings.xml");
              JAXBContext jc = JAXBContext.newInstance( SubjectSettings.class );
              Unmarshaller u = jc.createUnmarshaller();
              SubjectSettings s = (SubjectSettings)u.unmarshal( file );
              file.close();
              s.wasConfigured=true;
              s.initImplicitFilters();

              singelton = s;
              // early init of the map here in same thread while stream is open
              singelton.getSubjectFilterTypeByName("");

              // Now let's check whether bcd_sec_user_settings is available.
              // If not, subject attributes set in realm, may still be used for subject settings
              try {
                Collection<String> c = new LinkedList<String>();
                c.add("user_id");
                Bindings.getInstance().get("bcd_sec_user_settings",c);
              } catch (BindingException e) {
                rightsInDbAvailable = false; // Not an error but a negative test result
              }
            } catch (Exception e) {
              if(e instanceof FileNotFoundException){
                log.info("No SubjectSettings subjectSettings.xml found in init path - disable subjectSettings");
              }else{
                log.error("Disable subjectSettings, due to exception during initialization", e);
              }
              singelton = new SubjectSettings();
            }
          }
        }
      }finally{
        initLock.unlock();
      }
    }
    return singelton;
  }

  public SubjectFilterType getSubjectFilterTypeByName( String type )
  {
    if( subjectFilterTypeMap==null ) {
      lookupLock.lock();
      try{
        if(subjectFilterTypeMap==null){
          subjectFilterTypeMap = new HashMap<String,SubjectFilterType>();
          SubjectFilterTypes types = getSubjectFilterTypes();
          if(types != null){
            List<SubjectFilterType> sfL = types.getSubjectFilterType();
            if(sfL != null){
              for (SubjectFilterType subjectFilterType : sfL) {
                subjectFilterTypeMap.put(subjectFilterType.getName(), subjectFilterType);
              }
            }
          }
        }
      }finally{
        lookupLock.unlock();
      }
    }
    return subjectFilterTypeMap.get(type);
  }

  /**
   * setup implicit filters
   */
  private void initImplicitFilters() {

    // Array of implicit filters: type name, binding column, IsClientControlled, IsNullAllowsAccess
    String implicitFilters[][] = {
       {I18n.SUBJECT_FILTER_TYPE, "bcd_lang", "true", "false"}
      ,{SecurityHelper.SUBJECT_FILTER_TYPE_BCDUSERID, "bcd_userId", "false", "true"}
    };
    
    for (int i = 0; i < implicitFilters.length; i++) {

      String type = implicitFilters[i][0];
      String column = implicitFilters[i][1];
      boolean clientControlled = Boolean.parseBoolean(implicitFilters[i][2]);
      boolean nullAllowed = Boolean.parseBoolean(implicitFilters[i][3]);

      SubjectFilterTypes types = getSubjectFilterTypes();
      if (types == null || !types.getSubjectFilterType().stream().anyMatch(f -> type.equals(f.getName()))) {
        if (types == null) {
          types = new SubjectFilterTypes();
          setSubjectFilterTypes(types);
        }
        SubjectFilterType implFilter = new SubjectFilterType();
        implFilter.setIsClientControlled(clientControlled);
        implFilter.setIsNullAllowsAccess(nullAllowed);
        implFilter.setName(type);
        implFilter.setOp("=");
        C c = new C();
        c.setBRef(column);
        BindingItems bi = new BindingItems();
        bi.setC(c);
        implFilter.setBindingItems(bi);
  
        getSubjectFilterTypes().getSubjectFilterType().add(implFilter);
        log.debug("'" + type + "': implict filter added.");
      } else {
        log.debug("'" + type + "': filter defined in context.");
      }
    }
  }

  // Allow to check whether there are also rights stored in db
  // Otherwise they may be given as subject attributes
  public static boolean rightsInDbAvailable() {
    return rightsInDbAvailable;
  }

  /**
   * @return name of DataSource to use or null if none defined in SubjectSettings/Jdbc/DataSource
   */
  public String getDataSourceName() {
    try {
      return getSubjectSettings().getJdbc().getDataSource().getName();
    }catch(NullPointerException npe) {
      return null;
    }
  }

  /**
   * @param subjectFilterType
   * @return filter type literal, which is either defined by filter type name or explicit type
   */
  public String getFilterType(SubjectFilterType subjectFilterType){
    String type = subjectFilterType.getType();
    // would be better if SubjectFilterType.getType() did this lookup, but its generated hence need jaxb to support custom getters
    return type != null ? type : subjectFilterType.getName();
  }

  /**
   * returns permission mapped for given filter type from the user session
   *
   * @param session - which may be null, then this method returns null
   * @param subjectFilterType - to lookup permission for in the session
   * @return value for the permission or null if none found
   */
  public String getFilterTypeValue(Session session, SubjectFilterType subjectFilterType){
    if(session == null)return null;
    Object value = session.getAttribute(permissionAttributePrefix + getFilterType(subjectFilterType));
    return value == null ? null : value.toString();
  }

  /**
   * returns permission mapped for given filter type from the user session
   *
   * @param session
   *          - which may be null, then this method returns null
   * @param subjectFilterTypeName
   *          - to lookup permission for in the session
   * @return value for the permission or null if none found
   */
  public String getFilterTypeValue(Session session, String subjectFilterTypeName) {
    if (session == null)
      return null;
    final SubjectFilterType filterType = getSubjectFilterTypeByName(subjectFilterTypeName);
    if (filterType != null) {
      return getFilterTypeValue(session, filterType);
    }
    return null;
  }

  /**
   * sets a value of given subjectFilterType
   * 
   * @param session, must not be null
   * @param subjectFilterType
   */
  public void setFilterTypeValue(Session session, SubjectFilterType subjectFilterType, Object value){
    session.setAttribute(permissionAttributePrefix + getFilterType(subjectFilterType), value);
  }

  /**
   * sets a value of given subjectFilterType
   * 
   * @param session
   * @param subjectFilterTypeName
   * @param value
   */
  public void setFilterTypeValue(Session session, String subjectFilterTypeName, String value){
    SubjectFilterType filterType = getSubjectFilterTypeByName(subjectFilterTypeName);
    if (filterType != null)
      session.setAttribute(permissionAttributePrefix + getFilterType(filterType), value);
  }

  /**
   * Do not use directly, use getInstance() instead, this class is expected to be only instantiated by JAXB as a singelton
   */
  protected SubjectSettings() {
  }
}