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
package de.businesscode.bcdui.toolbox;

import java.lang.reflect.InvocationTargetException;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

import javax.sql.DataSource;

import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;

import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.toolbox.config.BareConfiguration;
import de.businesscode.bcdui.toolbox.config.ConfigurationProvider;
import de.businesscode.bcdui.toolbox.config.DbProperties;
import de.businesscode.util.JNDIProvider;
import de.businesscode.util.SingletonHolder;

/**
 *
 * This class extends the {@link JNDIProvider} and offers a common API to retrieve configuration parameter from JNDI
 * context as specified by servlet spec, furthermore this class cascades the configuration via {@link DbProperties}
 * allowing to manage dynamic properties from database. all API refer to "server" scope in sense of {@link DbProperties} scope,
 * except of {@link #getClientParameters()} which provides "client" scope configuration from database.
 *
 */
public class Configuration implements ConfigurationProvider {
  /* singleton handling */
  // this one is used internally in static convenience getters
  private static boolean isInitialized = false;
  private static SingletonHolder<Configuration> holder = new SingletonHolder<Configuration>() {
    @Override
    protected Configuration createInstance() {
      return new Configuration();
    }
  }; // MUST NOT initialize eagerly here!

  public static Configuration getInstance() {
    return holder.get();
  }

  // Well known context values:
  public static final String CONFIG_FILE_PATH_KEY  = "bcdui/filePathKey";
  public static final String DISABLE_CACHE         = "bcdui/disableCache";
  public static final String VFS_CATALOG_KEY       = "bcdui/cache/vfs/catalog";
  public static final String CONFIG_DB_RELOAD_SEC  = "bcdui/config/dbProperties/reloadFrequencySeconds";

  public static final String DEFAULT_DB_CONTEXT_ID = "bcdui/defaultConnection";
  private static final String BINDING_DB_CONFIG    = "bcd_db_properties";
  private static final int DEFAULT_CONFIG_DB_RELOAD_SEC = 30; // db properties are reloaded after every 30sec

  private DbProperties dbProperties;
  private BareConfiguration bareConfig;

  static private Logger log = LogManager.getLogger(Configuration.class);

  // For the optional classes, we determine here, which one to use based on a priority list and a lookup, which class actually is available
  // This serves as our form of dependency injection until we can assume all platforms we run on have CDI
  public static enum OPT_CLASSES {
    WRQ2SQL,            // Extends de.businesscode.bcdui.wrs.load.Wrq2Sql, has constructor with param: (IRequestOptions)
    WRQCALC2SQL,        // Extends de.businesscode.bcdui.wrs.load.WrqCalc2Sql, has constructor with param: (WrqInfo)
    DATASOURCEWRAPPER,  // Implements java.jdbc.DataSource, has constructor with params: (DataSource origDataSource, Boolean alertUnclosedObjects, String dataSourceName)
    BINDINGS,           // Extends de.businesscode.bcdui.binding.Bindings, has constructor with no params
    SUBJECTSETTINGS2SQL,// Implements de.businesscode.bcdui.wrs.load.SqlConditionGenerator, has constructor with params: (BindingSet bindingSet, WrqInfo wrqInfo, Collection<Element> connectives)
    VFSRESOURCEPROVIDER, // Implements de.businesscode.bcdui.web.servlets.StaticResourceServlet.ResourceProvider, has a default contructor
    DATABASECOMPATIBILITY // Implements de.businesscode.bcdui.web.servlets.StaticResourceServlet.ResourceProvider, has a default contructor
  }
  static private final Map<OPT_CLASSES,String[]> optionalClassesPrio;
  static private final Map<OPT_CLASSES,Class<?>> optionalClasses;
  static {
    optionalClassesPrio = new HashMap<OPT_CLASSES, String[]>();
    optionalClassesPrio.put(OPT_CLASSES.WRQ2SQL,     new String[]{"de.businesscode.bcdui.wrs.load.Wrq2Sql_TopN_Opt", "de.businesscode.bcdui.wrs.load.Wrq2Sql"});
    optionalClassesPrio.put(OPT_CLASSES.WRQCALC2SQL, new String[]{"de.businesscode.bcdui.wrs.load.WrqCalc2Sql_AnalytFct_Opt", "de.businesscode.bcdui.wrs.load.WrqCalc2Sql"});
    optionalClassesPrio.put(OPT_CLASSES.BINDINGS,    new String[]{"de.businesscode.bcdui.binding.BindingsEnterprise", "de.businesscode.bcdui.binding.Bindings"});
    optionalClassesPrio.put(OPT_CLASSES.DATASOURCEWRAPPER, new String[]{"de.businesscode.util.jdbc.wrapper.BcdDataSourceWrapper"});
    optionalClassesPrio.put(OPT_CLASSES.SUBJECTSETTINGS2SQL, new String[]{"de.businesscode.bcdui.wrs.load.SubjectSettings2Sql_Custom", "de.businesscode.bcdui.wrs.load.SubjectSettings2Sql"});
    optionalClassesPrio.put(OPT_CLASSES.VFSRESOURCEPROVIDER, new String[]{"de.businesscode.bcdui.web.servlets.VfsResourceProvider"});
    optionalClassesPrio.put(OPT_CLASSES.DATABASECOMPATIBILITY, new String[]{"de.businesscode.util.jdbc.DatabaseCompatibilityEnterprise", "de.businesscode.util.jdbc.DatabaseCompatibility"});
    
    // For some classes he have several options available, for now we determine here, which one to use
    optionalClasses = new HashMap<OPT_CLASSES, Class<?>>();
    for(Iterator<OPT_CLASSES> it = optionalClassesPrio.keySet().iterator(); it.hasNext(); ) {
      OPT_CLASSES className = it.next();
      String[] classOptions = optionalClassesPrio.get(className);
      for(int i=0; i<classOptions.length; i++) {
        try {
          optionalClasses.put(className, Class.forName(classOptions[i]) );
          break;
        } catch(ClassNotFoundException e) {
          // No harm, we just try the next one
        }
      }
    }
  }

  protected Configuration(){
    super();
    isInitialized = true;
    this.bareConfig = BareConfiguration.getInstance();

    // Set some defaults
    try {
      getConfigurationParameter(DISABLE_CACHE);
    } catch (Exception e) {
      addConfigurationParameter(DISABLE_CACHE, false);
    }

    /*
     * check if we have bcd_db_properties bindings-set if so install
     * dbproperties
     */
    {
      try {
        this.dbProperties = new DbProperties(BINDING_DB_CONFIG, bareConfig.getConfigurationParameter(CONFIG_DB_RELOAD_SEC, DEFAULT_CONFIG_DB_RELOAD_SEC));
        /*
         * listen to actions on dbproperties
         */
        this.dbProperties.setListener(new DbProperties.Listener() {
          @Override
          public void reloaded() {
            populateFromDbProperties();
          }

          /*
           * unregister DbProperties in case we receive BindingsNotFoundException
           */
          @Override
          public void handleLoadException(Throwable t) {
            // ignore
          }

          @Override
          public void bindingMissing(String bindingSetId) {
            if(log.isInfoEnabled()){
              log.info("shutdown DbProperties due tue non-existent bindingset " + bindingSetId);
            }
            dbProperties.setListener(null);
            dbProperties=null;
          }
        });
        this.dbProperties.reload();
      } catch (BindingException be) {
        if(log.isDebugEnabled()){
          log.info(BINDING_DB_CONFIG + " BindingSet not found. DbProperties disabled");
        }
      } catch (Exception e) {
        log.fatal("failed to initialize DbProperties", e);
      }
    }
  }

  /*
   * merge
   */
  private void populateFromDbProperties(){
    if(this.dbProperties == null)return;

    if(log.isTraceEnabled()){
      log.trace("populating configuration from db properties");
    }
    HashMap<String, Object> serverProps = this.dbProperties.getProperties("server");
    if(serverProps != null){
      bareConfig.getConfigurationParameters().putAll(serverProps);
    }
  }

  @Override
  public Object getConfigurationParameter(String id) {
    try{
      return bareConfig.getConfigurationParameter(id);
    }finally{
      if(this.dbProperties != null){
        this.dbProperties.reloadIfAged();
      }
    }
  }

  @Override
  public <T> T getConfigurationParameter(String id, T defaultValue) {
    try{
      return bareConfig.getConfigurationParameter(id, defaultValue);
    }finally{
      if(this.dbProperties != null){
        this.dbProperties.reloadIfAged();
      }
    }
  }

  @Override
  public Object getConfigurationParameterOrNull(String id) {
    try{
      return bareConfig.getConfigurationParameterOrNull(id);
    }finally{
      if(this.dbProperties != null){
        this.dbProperties.reloadIfAged();
      }
    }
  }

  /**
   * retrieve client properties
   *
   * @return client properties OR null in case no are specified or DbProperties is not available
   */
  public HashMap<String, Object> getClientParameters() {
    if( dbProperties != null ){
      return dbProperties.getProperties("client");
    }else{
      return null;
    }
  }

  /* Convenience API Layer - Projects are encouraged to use this class, not the BareConfiguration */

  /**
   * see {@link BareConfiguration#isCacheDisabled()}
   * @return
   */
  public static boolean isCacheDisabled() {
    /*
     * here we either proxy through instance to trigger refresh values or refer to
     * BareConfiguration
     */
    if(isInitialized){
      return getInstance().getConfigurationParameter(Configuration.DISABLE_CACHE, false);
    }else{
      return BareConfiguration.getInstance().isCacheDisabled();
    }
  }

  /**
   * see {@link BareConfiguration#getManagedConnection(String)}
   * @param dbSourceName
   * @throws Exception
   * @return
   */
  public Connection getManagedConnection(String dbSourceName) throws Exception{
    return bareConfig.getManagedConnection(dbSourceName);
  }

  /**
   * see {@link BareConfiguration#getManagedConnection(String)}
   * @param dbSourceName
   * @throws Exception
   * @return
   */
  public Connection getManagedConnection(String dbSourceName, boolean closedByRequestLifeCycleFilter) throws Exception{
    return bareConfig.getManagedConnection(dbSourceName, closedByRequestLifeCycleFilter);
  }
  
  /**
   * see {@link BareConfiguration#getUnmanagedConnection(String)}
   * @param dbSourceName
   * @throws Exception
   * @return
   */
  public Connection getUnmanagedConnection(String dbSourceName) throws Exception{
    return bareConfig.getUnmanagedConnection(dbSourceName);
  }

  /**
   * see {@link BareConfiguration#addConfigurationParameter(String, Object)}
   * @param id
   * @param value
   */
  public <T> void addConfigurationParameter(String id, T value) {
    bareConfig.getConfigurationParameters().put(id, value);
  }

  /**
   * see {@link BareConfiguration#closeAllConnections(boolean)}
   * @param rollback
   * @throws SQLException
   */
  public void closeAllConnections(boolean rollback) throws SQLException{
    bareConfig.closeAllConnections(rollback);
  }

  /**
   * convenience getter for {@link #getUnmanagedDataSource(String)}
   *
   * @param dbSourceName
   * @return see {@link #getUnmanagedDataSource(String)}
   * @throws Exception
   */
  public DataSource getUnmanagedDataSource(String dbSourceName) throws Exception {
    return bareConfig.getUnmanagedDataSource(dbSourceName);
  }

  /**
   * Returns for a given token Configuration.OPT_CLASSES the 'best' class, or null if none
   * 'Best' means the one with the highest priority according to optionalClassesPrio found in classpath
   * Can be switched to CDI, once available on all platforms
   * @param name
   * @return
   */
  static public Class<?> getClassoption( OPT_CLASSES name )
  {
    return optionalClasses.get(name);
  }

  /**
   * like {@link #getClassoption(OPT_CLASSES)} but looks for <b>public</b> constructor accepting given types and instantiates
   * the class, with given params in case a class is not found this method returns null, in case a class is found but a 
   * constructor is missing, this method throws an exception.
   * 
   * @param name of class binding
   * @param types to be accepted by constructor
   * @param params the params in exact order as types
   * @return the instance of matched class or null in case no such class could be found
   * @throws RuntimeException in case the class is missing a constructor accepting given parameters or if the instatiation fails
   */
  static public <T> T getClassInstance(OPT_CLASSES name, Class<?>[] types, Object... params) throws RuntimeException {
    Class<?> clazz = getClassoption(name);
    return clazz == null ? null : getClassInstance(clazz, types, params);
  }

  /**
   * Looks for a <b>public</b> constructor accepting given types and instatiates the class, with given params. in case a class a constructor is missing, this
   * method throws an exception.
   * 
   * @param clazz
   *          to instantiate
   * @param types
   *          to be accepted by constructor
   * @param params
   *          the params in exact order as types
   * @return the instance of matched class
   * @throws RuntimeException
   *           in case the class is missing a constructor accepting given parameters or if the instatiation fails
   */
  @SuppressWarnings("unchecked")
  static public <T> T getClassInstance(Class<?> clazz, Class<?>[] types, Object... params) throws RuntimeException {
    if (clazz == null) {
      return null;
    }
    try {
      return (T) clazz.getConstructor(types).newInstance(params);
    } catch (NoSuchMethodException e) {
      throw new RuntimeException("failed to instantiate due to missing constructor accepting types", e);
    } catch (InstantiationException | IllegalAccessException e) {
      throw new RuntimeException("failed to instantiate", e);
    } catch (InvocationTargetException e) {
      throw new RuntimeException("failed to instantiate due to exception caught in constructor", e);
    }
  }
}
