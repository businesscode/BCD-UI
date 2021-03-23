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
package de.businesscode.bcdui.web;

import java.util.ResourceBundle.Control;

import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;

import org.apache.commons.vfs.FileSystemException;
import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.core.config.Configurator;

import de.businesscode.bcdui.binding.BindingAliasMap;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.cache.CacheFactory;
import de.businesscode.bcdui.toolbox.AWorkerQueue;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.toolbox.config.BareConfiguration;
import de.businesscode.bcdui.vfs.provider.database.VFSManagerFactory;
import de.businesscode.bcdui.web.accessLogging.AccessLogAppender;
import de.businesscode.bcdui.web.accessLogging.LoginLogAppender;
import de.businesscode.bcdui.web.accessLogging.PageLogAppender;
import de.businesscode.bcdui.web.accessLogging.SessionLogAppender;
import de.businesscode.bcdui.web.accessLogging.SqlLogAppender;
import de.businesscode.bcdui.web.errorLogging.ErrorLogAppender;
import de.businesscode.bcdui.web.i18n.I18n;
import de.businesscode.util.SingletonHolder;
import de.businesscode.util.jdbc.DatabaseCompatibility;


/**
 * In web environments serves for initializing de.businesscode.bcdui.toolbox.Configuration
 * With application context settings (from context and web.xml)
 *
 */
public class BcdUiApplicationContextListener implements ServletContextListener
{
  private final Logger log = LogManager.getLogger(getClass());
  private static Control resourceBundleControl;
  
  public static Control getResourceBundleControl() {
    return resourceBundleControl;
  }

  /*
   * can be overriden to add features
   */
  @Override
  public void contextDestroyed(ServletContextEvent context) {
    log.debug("closing VFS");
    VFSManagerFactory.shutdown();
    log.debug("shutting down worker queues");
    AWorkerQueue.shutdownQueues(false);
    log.debug("clearing singletons");
    SingletonHolder.clear();
    log.debug("clearing Bindings");
    Bindings.clear();
    log.debug("clearing BidingAliasMap");
    BindingAliasMap.clear();
    log.debug("clearing DatabaseCompatibility");
    DatabaseCompatibility.clear();
  }

  /**
   * Bootstrap for BCD-UI in an web-environment. This method is final as the bootstrapping
   * must keep certain order of initialization, therefore this class offers API to be implemented
   * by extended subclasses:
   * <ul>
   *  <li>{@link #initBeforeBindings(BareConfiguration)}</li>
   * </ul>
   * 
   * @param context
   */
  @Override
  final public void contextInitialized(ServletContextEvent context)
  {
    BareConfiguration conf = BareConfiguration.getInstance();
    conf.addConfigurationParameter(Configuration.CONFIG_FILE_PATH_KEY,context.getServletContext().getRealPath("/WEB-INF/bcdui") );

    try {
      try {
        conf.addConfigurationParameter(Configuration.VFS_CATALOG_KEY, CacheFactory.registerVFSCatalog());
      } catch (FileSystemException e) {
        log.error("Failed to bootstrap VFS", e);
      }
      initBeforeBindings(conf);

      // initial binding set generation
      Bindings bindings = Bindings.getInstance();
      bindings.readDependentBindings();
      bindings.readAdditionalBindings();
      resourceBundleControl = I18n.createResourceControl(context.getServletContext());
    } catch (BindingException e) {
      log.error(e.getMessage(), e);
    }finally{
      // In the following "virtloggers" are used to decouple the logging of
      // frontend events into the database from the class loggers.
      
      // add frontend error logging when bcd_log_error binding is available
      try {
        if (Bindings.getInstance().hasBindingSet("bcd_log_error")) {
          Logger logger = LogManager.getLogger("de.businesscode.bcdui.logging.virtlogger.error");
          Configurator.setLevel(logger.getName(), Level.INFO);
          
          /*
           * setAdditivity(false) would ensure that the logged messages are not propagated to the ancestors of the logger.
           * 
           * Because these kinds of exceptions were once passed to individual class loggers and this virtual logger, 
           * they would appear twice. Since all ErrorLogEvent/ServletException logging has been centralized in the 
           * RequestLifeCycleFilter, this is no longer an issue. In fact, the opposite is the case: when additivity 
           * is set to false, these exceptions are never shown on the console anymore.
           * 
           * Recommended solution is to set the threshold of the console appender, which can also be done in the 
           * already in use properties file. (see https://logging.apache.org/log4j/2.x/manual/configuration.html#Additivity)
           */
          //logger.setAdditivity(false);
          if (logger instanceof org.apache.logging.log4j.core.Logger) // is always the case when log4j-core is on the classpath
            ((org.apache.logging.log4j.core.Logger) logger).addAppender(ErrorLogAppender.createAppender());
        }
      } catch (Exception e) {}

      // add access logging when bcd_log_access binding is available
      try {
        if (Bindings.getInstance().hasBindingSet("bcd_log_access")) {
          Logger logger = LogManager.getLogger("de.businesscode.bcdui.logging.virtlogger.access");
          Configurator.setLevel(logger.getName(), Level.INFO);
          if (logger instanceof org.apache.logging.log4j.core.Logger) // is always the case when log4j-core is on the classpath
            ((org.apache.logging.log4j.core.Logger) logger).addAppender(AccessLogAppender.createAppender());
        }
      } catch (Exception e) {}

      // add page logging when bcd_log_page binding is available
      try {
        if (Bindings.getInstance().hasBindingSet("bcd_log_page")) {
          Logger logger = LogManager.getLogger("de.businesscode.bcdui.logging.virtlogger.page");
          Configurator.setLevel(logger.getName(), Level.INFO);
          if (logger instanceof org.apache.logging.log4j.core.Logger) // is always the case when log4j-core is on the classpath
            ((org.apache.logging.log4j.core.Logger) logger).addAppender(PageLogAppender.createAppender());
        }
      } catch (Exception e) {}

      // add session logging when bcd_log_session binding is available
      try {
        if (Bindings.getInstance().hasBindingSet("bcd_log_session")) {
          Logger logger = LogManager.getLogger("de.businesscode.bcdui.logging.virtlogger.session");
          Configurator.setLevel(logger.getName(), Level.INFO);
          if (logger instanceof org.apache.logging.log4j.core.Logger) // is always the case when log4j-core is on the classpath
            ((org.apache.logging.log4j.core.Logger) logger).addAppender(SessionLogAppender.createAppender());
        }
      } catch (Exception e) {}

      // add login logging when bcd_log_login binding is available
      try {
        if (Bindings.getInstance().hasBindingSet("bcd_log_login")) {
          Logger logger = LogManager.getLogger("de.businesscode.bcdui.logging.virtlogger.login");
          Configurator.setLevel(logger.getName(), Level.INFO);
          if (logger instanceof org.apache.logging.log4j.core.Logger) // is always the case when log4j-core is on the classpath
            ((org.apache.logging.log4j.core.Logger) logger).addAppender(LoginLogAppender.createAppender());
        }
      } catch (Exception e) {}
      // set sql logging when bcd_log_sql binding is available
      try {
        if (Bindings.getInstance().hasBindingSet("bcd_log_sql")) {
          Logger logger = LogManager.getLogger("de.businesscode.bcdui.logging.virtlogger.sql");
          Configurator.setLevel(logger.getName(), Level.INFO);
          if (logger instanceof org.apache.logging.log4j.core.Logger) // is always the case when log4j-core is on the classpath
            ((org.apache.logging.log4j.core.Logger) logger).addAppender(SqlLogAppender.createAppender());
        }
      } catch (Exception e) {}


      /*
       * initialize the common configuration scope
       */

      Configuration.getInstance();
    }
  }

  /**
   * this method is called within {@link #contextInitialized(ServletContextEvent)} after the {@link BareConfiguration}
   * has been initialized but before Bindings are parsed.
   * 
   * @param bareConfiguraion
   */
  protected void initBeforeBindings(BareConfiguration bareConfiguraion) throws BindingException {
  }
}
