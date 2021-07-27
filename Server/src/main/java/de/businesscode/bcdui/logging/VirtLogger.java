package de.businesscode.bcdui.logging;

import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.core.Logger;
import org.apache.logging.log4j.core.LoggerContext;
import org.apache.logging.log4j.core.config.Configurator;

import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.web.accessLogging.AccessLogAppender;
import de.businesscode.bcdui.web.accessLogging.LoginLogAppender;
import de.businesscode.bcdui.web.accessLogging.PageLogAppender;
import de.businesscode.bcdui.web.accessLogging.SessionLogAppender;
import de.businesscode.bcdui.web.accessLogging.SqlLogAppender;
import de.businesscode.bcdui.web.errorLogging.ErrorLogAppender;

public class VirtLogger {
  private VirtLogger() {}
  
  /*
   * It is recommended to not set up loggers and appenders programatically and it is even still lacking some functionality, 
   * but this approach works and results in exactly what we want. The current solution is as follow:
   * 
   * The virtloggers do not need to be in any log4j2.xml file. Log4j2 first reads this file and sets up its configuration
   * accordingly. We could manually add to this configuration, but it is sometimes reloaded (not quite sure when), which discards
   * all manual changes. This could be alleviated by overriding the ConfigurationFactory, but that seems like overkill.
   * Instead, the virtloggers are all called once (negligible impact), even if the corresponding binding does not exist, and set
   * up in the appropriate way. Since all loggers are singletons, this carries over everywhere they are used.
   * 
   * Each virtlogger is forced to Level.INFO, overriding any level it might have inherited. This way, when the corresponding
   * binding exists, data is written to the table no matter what logging levels are specified on the user level. Individual
   * virtloggers can be toggled off of the Console, by turning their additivity off (this way the logs are not passed to the
   * parent logger -> ROOT, see log4j2_server_.xml). The ERROR logger defaults to additivity off, because a regular logger is
   * used besides it, since errors should always be displayed and should not be able to be hidden.
   * 
   * Alternatives that were ruled out due to several reasons:
   *   - Defining the loggers and appenders in the config file and programatically only setting the level. This approach is not
   *     really possible without some really ugly practices. Loading multiple configuration files is not possible*, and we don't
   *     want all these internal loggers and appenders cluttering the log4j2.xml file. Also, changing the threshold of an appender
   *     is not possible at all, instead it would have to be removed completely and rebuilt with a new level.
   *     (https://logging.apache.org/log4j/2.x/manual/customconfig.html)
   *   - *update: loading multiple configuration files is somewhat possible when using XInclude, but even then, Loggers, Appenders,
   *     Threshold, etc. need to be strictly separated and may not be mixed within one file. Also, the file locations can only be
   *     hardcoded, so it would be difficult to allow a non-project-internal file to be loaded along side a packaged file.
   *     (https://logging.apache.org/log4j/2.x/manual/configuration.html#XInclude)
   *   - Adding a regular ThresholdFilter to the appender is not sufficient, as it's threshold level can't be changed. Using a
   *     DynamicThresholdFilter could be possible, but not in the way the ThreadContext is already used in this project. The
   *     RequestLifeCycleFilter clears the ThreadContextMap after each request chain is handled, so any value we would set for the
   *     DTF would get deleted as well. The previous issue could be sidestepped by adding a (static) boolean to the appender that is
   *     used to decide if the append method actually does anything or not, but that seems like bad practice.
   *     (https://logging.apache.org/log4j/2.x/manual/filters.html#DynamicThresholdFilter)
   */
  
  public final static String ERROR   = "de.businesscode.bcdui.logging.virtlogger.error",
                             ACCESS  = "de.businesscode.bcdui.logging.virtlogger.access",
                             PAGE    = "de.businesscode.bcdui.logging.virtlogger.page",
                             SESSION = "de.businesscode.bcdui.logging.virtlogger.session",
                             LOGIN   = "de.businesscode.bcdui.logging.virtlogger.login",
                             SQL     = "de.businesscode.bcdui.logging.virtlogger.sql";
  public static boolean IS_SQL_ENABLED; // needed in EE to avoid excessive binding set lookups (BcdStatementWrapper)
  
  public static void setupVirtLoggers() {
    LoggerContext context = ((LoggerContext) LogManager.getContext(false));
    Logger logger = context.getLogger(ERROR);
    Configurator.setLevel(ERROR, Level.INFO);
    logger.setLevel(Level.INFO);
    logger.setAdditive(false); // don't pass logs to parent
    try {
      if (Bindings.getInstance().hasBindingSet("bcd_log_error")) // add appender only if appropriate binding set exists
        logger.addAppender(ErrorLogAppender.createAppender());
    } catch (BindingException e) {}
    
    logger = context.getLogger(ACCESS);
    Configurator.setLevel(ACCESS, Level.INFO);
    logger.setLevel(Level.INFO);
    try {
      if (Bindings.getInstance().hasBindingSet("bcd_log_access"))
        logger.addAppender(AccessLogAppender.createAppender());
    } catch (BindingException e) {}

    logger = context.getLogger(PAGE);
    Configurator.setLevel(PAGE, Level.INFO);
    logger.setLevel(Level.INFO);
    try {
      if (Bindings.getInstance().hasBindingSet("bcd_log_page"))
        logger.addAppender(PageLogAppender.createAppender());
    } catch (BindingException e) {}

    logger = context.getLogger(SESSION);
    Configurator.setLevel(SESSION, Level.INFO);
    logger.setLevel(Level.INFO);
    try {
      if (Bindings.getInstance().hasBindingSet("bcd_log_session"))
        logger.addAppender(SessionLogAppender.createAppender());
    } catch (BindingException e) {}

    logger = context.getLogger(LOGIN);
    Configurator.setLevel(LOGIN, Level.INFO);
    logger.setLevel(Level.INFO);
    try {
      if (Bindings.getInstance().hasBindingSet("bcd_log_login"))
        logger.addAppender(LoginLogAppender.createAppender());
    } catch (BindingException e) {}

    logger = context.getLogger(SQL);
    Configurator.setLevel(SQL, Level.INFO);
    logger.setLevel(Level.INFO);
    try {
      if (Bindings.getInstance().hasBindingSet("bcd_log_sql")) {
        IS_SQL_ENABLED = true;
        logger.addAppender(SqlLogAppender.createAppender());
      }
    } catch (BindingException e) {}
  }
}
