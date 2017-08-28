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

import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;

import org.apache.commons.vfs.FileSystemException;
import org.apache.log4j.Level;
import org.apache.log4j.Logger;

import de.businesscode.bcdui.binding.BindingAliasMap;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.cache.CacheFactory;
import de.businesscode.bcdui.toolbox.AWorkerQueue;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.toolbox.config.BareConfiguration;
import de.businesscode.bcdui.vfs.provider.database.VFSManagerFactory;
import de.businesscode.bcdui.web.accessLogging.BuiAccessLogAppender;
import de.businesscode.bcdui.web.accessLogging.BuiLoginLogAppender;
import de.businesscode.bcdui.web.accessLogging.BuiPageLogAppender;
import de.businesscode.bcdui.web.accessLogging.BuiSessionLogAppender;
import de.businesscode.bcdui.web.accessLogging.BuiSqlLogAppender;
import de.businesscode.bcdui.web.errorLogging.BuiErrorLogAppender;
import de.businesscode.util.SingletonHolder;
import de.businesscode.util.jdbc.DatabaseCompatibility;


/**
 * In web environments serves for initializing de.businesscode.bcdui.toolbox.Configuration
 * With application context settings (from context and web.xml)
 *
 */
public class BcdUiApplicationContextListener implements ServletContextListener
{
  private final Logger log = Logger.getLogger(getClass());

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
   * must keep certain order of initialization, therefore this class offers API to beimplemented
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
      Bindings.getInstance();
      Bindings.getInstance().readDependentBindings();
      Bindings.getInstance().readAdditionalBindings();
    } catch (BindingException e) {
      log.error(e.getMessage(), e);
    }finally{

      // add frontend error logging when bcd_log_error binding is available
      try {
        if (Bindings.getInstance().hasBindingSet("bcd_log_error")) {
          Logger logger = Logger.getLogger(Class.forName("de.businesscode.bcdui.web.clientLogging.FrontendLogTransceiver"));
          if (logger.getEffectiveLevel() == null || logger.getEffectiveLevel().isGreaterOrEqual(Level.ERROR))
            logger.setLevel(Level.ERROR);
          logger        = Logger.getLogger(Class.forName("de.businesscode.bcdui.web.wrs.CsvServlet"));
          if (logger.getEffectiveLevel() == null || logger.getEffectiveLevel().isGreaterOrEqual(Level.ERROR))
            logger.setLevel(Level.ERROR);
          logger        = Logger.getLogger(Class.forName("de.businesscode.bcdui.web.wrs.SylkServlet"));
          if (logger.getEffectiveLevel() == null || logger.getEffectiveLevel().isGreaterOrEqual(Level.ERROR))
            logger.setLevel(Level.ERROR);
          logger        = Logger.getLogger(Class.forName("de.businesscode.bcdui.web.wrs.WrsServlet"));
          if (logger.getEffectiveLevel() == null || logger.getEffectiveLevel().isGreaterOrEqual(Level.ERROR))
            logger.setLevel(Level.ERROR);
          Logger.getRootLogger().addAppender(new BuiErrorLogAppender());
        }
      } catch (Exception e) {}

      // add access logging when bcd_log_access binding is available
      try {
        if (Bindings.getInstance().hasBindingSet("bcd_log_access")) {
          Logger logger = Logger.getLogger(Class.forName("de.businesscode.bcdui.web.filters.RequestLifeCycleFilter"));
          if (logger.getEffectiveLevel() == null || logger.getEffectiveLevel().isGreaterOrEqual(Level.DEBUG))
            logger.setLevel(Level.DEBUG);
          logger        = Logger.getLogger(Class.forName("de.businesscode.bcdui.web.wrs.CsvServlet"));
          if (logger.getEffectiveLevel() == null || logger.getEffectiveLevel().isGreaterOrEqual(Level.TRACE))
            logger.setLevel(Level.TRACE);
          logger        = Logger.getLogger(Class.forName("de.businesscode.bcdui.web.wrs.SylkServlet"));
          if (logger.getEffectiveLevel() == null || logger.getEffectiveLevel().isGreaterOrEqual(Level.TRACE))
            logger.setLevel(Level.TRACE);
          logger        = Logger.getLogger(Class.forName("de.businesscode.bcdui.web.wrs.WrsServlet"));
          if (logger.getEffectiveLevel() == null || logger.getEffectiveLevel().isGreaterOrEqual(Level.TRACE))
            logger.setLevel(Level.TRACE);
          logger        = Logger.getLogger(Class.forName("de.businesscode.bcdui.wrs.export.Wrs2Excel"));
          if (logger.getEffectiveLevel() == null || logger.getEffectiveLevel().isGreaterOrEqual(Level.TRACE))
            logger.setLevel(Level.TRACE);
          Logger.getRootLogger().addAppender(new BuiAccessLogAppender());
        }
      } catch (Exception e) {}

      // add page logging when bcd_log_page binding is available
      try {
        if (Bindings.getInstance().hasBindingSet("bcd_log_page")) {
          Logger logger = Logger.getLogger(Class.forName("de.businesscode.bcdui.web.filters.RequestLifeCycleFilter"));
          if (logger.getEffectiveLevel() == null || logger.getEffectiveLevel().isGreaterOrEqual(Level.TRACE))
            logger.setLevel(Level.TRACE);
          logger        = Logger.getLogger(Class.forName("de.businesscode.bcdui.web.wrs.ExcelExportServlet"));
          if (logger.getEffectiveLevel() == null || logger.getEffectiveLevel().isGreaterOrEqual(Level.TRACE))
            logger.setLevel(Level.TRACE);
          Logger.getRootLogger().addAppender(new BuiPageLogAppender());
        }
      } catch (Exception e) {}

      // add session logging when bcd_log_session binding is available
      try {
        if (Bindings.getInstance().hasBindingSet("bcd_log_session")) {
          Logger logger = Logger.getLogger(Class.forName("de.businesscode.bcdui.web.filters.RequestLifeCycleFilter"));
          if (logger.getEffectiveLevel() == null || logger.getEffectiveLevel().isGreaterOrEqual(Level.DEBUG))
            logger.setLevel(Level.DEBUG);
          Logger.getRootLogger().addAppender(new BuiSessionLogAppender());
        }
      } catch (Exception e) {}

      // add login logging when bcd_log_login binding is available
      try {
        if (Bindings.getInstance().hasBindingSet("bcd_log_login")) {
          Logger logger = Logger.getLogger(Class.forName("de.businesscode.bcdui.web.filters.RequestLifeCycleFilter"));
          if (logger.getEffectiveLevel() == null || logger.getEffectiveLevel().isGreaterOrEqual(Level.DEBUG))
            logger.setLevel(Level.DEBUG);
          Logger.getRootLogger().addAppender(new BuiLoginLogAppender());
        }
      } catch (Exception e) {}
      // set sql logging when bcd_log_sql binding is available
      try {
        if (Bindings.getInstance().hasBindingSet("bcd_log_sql")) {
          Logger logger = Logger.getLogger(Class.forName("de.businesscode.util.jdbc.wrapper.BcdStatementWrapper"));
          if (logger.getEffectiveLevel() == null || logger.getEffectiveLevel().isGreaterOrEqual(Level.TRACE))
            logger.setLevel(Level.TRACE);
          Logger.getRootLogger().addAppender(new BuiSqlLogAppender());
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
