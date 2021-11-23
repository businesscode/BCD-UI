/*
  Copyright 2010-2021 BusinessCode GmbH, Germany

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
import org.apache.shiro.subject.Subject;
import org.apache.shiro.subject.support.SubjectThreadState;
import org.apache.shiro.util.ThreadState;
import org.apache.shiro.web.env.WebEnvironment;
import org.apache.shiro.web.util.WebUtils;

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
    ThreadState threadState = null;
    try {
      try {
        conf.addConfigurationParameter(Configuration.VFS_CATALOG_KEY, CacheFactory.registerVFSCatalog());
      } catch (FileSystemException e) {
        log.error("Failed to bootstrap VFS", e);
      }
      initBeforeBindings(conf);

      // make SecurityManager available
      WebEnvironment webEnv = WebUtils.getRequiredWebEnvironment(context.getServletContext());
      Subject subject = new Subject.Builder(webEnv.getWebSecurityManager()).buildSubject();
      threadState = new SubjectThreadState(subject);
      threadState.bind();

      // initial binding set generation
      Bindings bindings = Bindings.getInstance();
      bindings.readDependentBindings();
      bindings.readAdditionalBindings();
      resourceBundleControl = I18n.createResourceControl(context.getServletContext());
    } catch (BindingException e) {
      log.error(e.getMessage(), e);
    }finally{

      if (threadState != null)
        threadState.clear();

      // In the following "virtloggers" are used to decouple the logging of
      // frontend events into the database from the class loggers.
      
      // add frontend error logging when bcd_log_error binding is available
      try {
        if (Bindings.getInstance().hasBindingSet("bcd_log_error")) {
          Logger logger = LogManager.getLogger("de.businesscode.bcdui.logging.virtlogger.error");
          Configurator.setLevel(logger.getName(), Level.INFO);
          
          /*
           * It is recommended to not set up loggers and appenders programatically and it is even still lacking some functionality, 
           * but this approach works and results in exactly what we want.
           * 
           * Alternatives that were ruled out due to several reasons:
           *   - Defining the loggers and appenders in the config file and programatically only setting the level. This approach is not 
           *     really possible without some really ugly practices. Loading multiple configuration files is not possible, but we don't 
           *     want all these internal loggers and appenders cluttering the log4j2.xml file. Also, changing the threshold of an appender
           *     is not possible at all, instead it would have to be removed completely and rebuilt with a new level. Turning this entire
           *     logger level to OFF would result in the logevents not reaching the root logger's appenders, i.e. the Console, which would
           *     not be what we want. (more info: https://logging.apache.org/log4j/2.x/manual/customconfig.html)
           *   - Adding a regular ThresholdFilter to the appender is not sufficient, as it's threshold level can't be changed. Using a
           *     DynamicThresholdFilter could be possible, but not in the way the ThreadContext is already used in this project. The
           *     RequestLifeCycleFilter clears the ThreadContextMap after each request chain is handled, so any value we would set for the
           *     DTF would get deleted as well. (more info: https://logging.apache.org/log4j/2.x/manual/filters.html#DynamicThresholdFilter)
           *   - Add a (static) boolean to the appender that is used to decide if the append method actually does anything or not is also 
           *     a possibility, but that would still require the loggers and appenders to be defined in the configuration file and thus not 
           *     alleviate the previous issues.
           */
          
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
