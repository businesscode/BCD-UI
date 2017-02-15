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
package de.businesscode.bcdui.toolbox.config;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

import javax.sql.DataSource;

import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.web.filters.RequestLifeCycleFilter;
import de.businesscode.util.JNDIProvider;
import de.businesscode.util.SingletonHolder;

/**
 * bare configuration singleton, this class is for internal purpose and must not be used in
 * projects, consider using {@link Configuration} that purpose. This class has to be used in cases
 * where static or instance initializers directly or transitively depend on BindingSet
 *
 */
public class BareConfiguration extends JNDIProvider {
  /* singleton handling */
  private static SingletonHolder<BareConfiguration> holder = new SingletonHolder<BareConfiguration>() {
    @Override
    protected BareConfiguration createInstance() {
      return new BareConfiguration();
    }
  };

  public static BareConfiguration getInstance() {
    return holder.get();
  }

  /* members */

  /**
   * The cache mapping datasource names to JDBC connections per thread (request).
   */
  private final ConnectionCache connectionCache = new ConnectionCache();

  /**
   * configuration parameter map.
   *
   * @return
   */
  public Map<String, Object> getConfigurationParameters() {
    return configurationParameters;
  }

  /**
   * add new or overwrite existing configuration parameter
   *
   * @param id
   * @param value
   * @return old parameters value in case the parameter has been overwritten or null
   */
  public <T> Object addConfigurationParameter(String id, T value) {
    return configurationParameters.put(id, value);
  }

  /**
   * A class holding a mapping from datasource names to connections for
   * each thread. These connections must be closed when the thread is
   * released.
   */
  private static class ConnectionCache extends ThreadLocal<Map<String, Connection>> {
    @Override
    protected Map<String, Connection> initialValue() {
      return new HashMap<String, Connection>();
    }
  }

  /**
   * This function gets a managed connection from the specified dbSourceName. It
   * is managed for three reasons: <ul>
   *   <li>Each request gets only one single connection per dbSourceName.</li>
   *   <li>All connections are closed at the end of the request. They must not
   *       be closed manually.</li>
   *   <li>transaction scope: a managed connection is always initialized with <b>autocommit = false</b> and comitted
   *       at the end of the httprequest lifecycle (or rolled back in case of exception)</li>
   * </ul>
   * <p>
   * <b>ATTENTION:</b> A managed connection may only be obtained within HttpRequest scope which
   * is managed by {@link RequestLifeCycleFilter} responsible to tidy up the resources.
   * This method will throw an exception in case of usage out of HttpRequest scope. Please use
   * the {@link #getUnmanagedConnection(String)} instead and close the obtained {@link Connection}
   * manually.
   *
   * </p>
   * @param dbSourceName The datasource name. May be NULL so a default connection is returned.
   * @return A managed connection from the configured dataSource with non-autocommit.
   * @throws Exception in case something went wrong. Especially, if the current thread is not bound to a HTTP request.
   */
  public Connection getManagedConnection(String dbSourceName) throws Exception {
    if(!RequestLifeCycleFilter.isThreadBoundToHttpRequest())
      throw new Exception("A managed connection may only be obtained within HttpServletRequest lifecycle. It " +
          "seems like this method was called not called in scope of a HttpServletRequest or the request is not" +
          " managed by BCD-UI RequestLifeCycleFilter. Please check your web.xml and ensure that all URLs are mapped " +
          "to that filter or consult BCD-UI development team.");

    Map<String, Connection> map = connectionCache.get();
    String dbSourceNameWithDefault = dbSourceName == null ? "(default connection)" : dbSourceName;
    Connection connection = map.get(dbSourceNameWithDefault);
    if (connection == null) {
      DataSource dataSource = getUnmanagedDataSource(dbSourceName);
      connection = dataSource.getConnection();
      connection.setAutoCommit(false);
      map.put(dbSourceNameWithDefault, connection);
    }
    return generateUnClosableConnection(connection);
  }

  /**
   * Creates a wrapper class throwing an exception when the connection is
   * closed. This is used by {@link #getManagedConnection(String)} to identify
   * the places where the connection is closed manually (which is not allowed
   * for managed connections).
   * @return Wrapped connection which throws an exception on close.
   */
  private static Connection generateUnClosableConnection(final Connection source) {
    return (Connection) Proxy.newProxyInstance(Connection.class.getClassLoader(), new Class[] { Connection.class }, new InvocationHandler() {
      @Override
      public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        if (method.getName().equals("close"))
          throw new RuntimeException("Error: Must not close a connection returned by Configuration.getConnection");
        return method.invoke(source, args);
      }
    });
  }

  /**
   * This method closes all connections opened with getConnection and belonging
   * to the current thread. It is called by the RequestLifeCycleFilter.
   * @param rollback Set this to true if rollback should be made instead of commit.
   * The default is "false" - so a commit is applied on managed connections
   */
  public void closeAllConnections(boolean rollback) throws SQLException {
    Map<String, Connection> cache = connectionCache.get();
    try {
      SQLException exception = null;
      for (Connection con : cache.values())
        try {
          if (!con.getAutoCommit()){
            if (rollback) {
              log.error("Rolling back");
              con.rollback();
            } else
              con.commit();
          }
        } catch (SQLException ex) {
          if (exception == null)
            // The first Exception is thrown
            exception = ex;
          log.error(ex);
          ex.printStackTrace();
          if (!rollback) {
            // If we are not in rollback mode the commit failed and then we
            // try to make a rollback now.
            try {
              con.rollback();
            } catch (SQLException e) {
              e.printStackTrace();
              log.error(e);
            }
          }
        } finally {
          try {
            con.close();
          } catch (Exception e) {
            e.printStackTrace();
            log.error(e);
          }
        }
      if (exception != null)
        throw exception;
    } finally {
      cache.clear();
      // remove the threadlocalmap so that no memory leak is indicated
      connectionCache.remove();
    }
  }

  /**
   * Takes a new connection from the specified DataSource. This connection is not
   * managed meaning that it is always a new connection for each call and it needs
   * to be closed manually, as well as this connection is <b>autocommit</b> as per default.
   * @param dbSourceName The DataSource generating the connection.
   * @return The new unmanaged connection, with autocommit.
   */
  public Connection getUnmanagedConnection(String dbSourceName) throws Exception {
    DataSource dataSource = getUnmanagedDataSource(dbSourceName);
    Connection con = dataSource.getConnection();
    con.setAutoCommit(true);
    return con;
  }

  /**
   * see {@link #getUnmanagedDataSource(ConfigurationProvider, String)}
   *
   * @param dbSourceName
   * @return
   * @throws Exception
   */
  public DataSource getUnmanagedDataSource(String dbSourceName) throws Exception {
    return getUnmanagedDataSource(this, dbSourceName);
  }
  
  /**
   * see {@link #getRawDataSource(ConfigurationProvider, String)}
   *
   * @param dbSourceName
   * @return
   * @throws Exception
   */
  public DataSource getRawDataSource(String dbSourceName) throws Exception {
    return getRawDataSource(this, dbSourceName);
  }

  /**
   * Gets the DataSource associated with the specified dbSourceName. This DataSource
   * does not return managed connections in contrast to
   * {@link #getManagedConnection(String)}.
   * @param dbSourceName, if null then configured default datasource is returned. May be NULL so a default connection is returned.
   * @return the dataSource with the given ID or the default dataSource (configuring in DEFAULT_DB_CONTEXT_ID)
   */
  public static DataSource getUnmanagedDataSource(ConfigurationProvider provider, String dbSourceName) throws Exception {
    try {
      if (dbSourceName == null || dbSourceName.isEmpty()) {
        dbSourceName = (String) provider.getConfigurationParameter(Configuration.DEFAULT_DB_CONTEXT_ID);
        if (dbSourceName == null) {
          throw new Exception("The default data source id is not defined in configuration. Please set the parameter " + Configuration.DEFAULT_DB_CONTEXT_ID);
        }
      }
      DataSource dataSource = (DataSource) provider.getConfigurationParameter(dbSourceName);
      boolean throwErrorForNotClosedObjects = provider.getConfigurationParameter(Configuration.IS_DEBUG, false);
      DataSource s = dataSource;
      InvocationHandler proxiedInstance = Configuration.getClassInstance(Configuration.OPT_CLASSES.DATASOURCEWRAPPER, new Class<?>[]{DataSource.class, Boolean.class, String.class}, dataSource, throwErrorForNotClosedObjects, dbSourceName);
      if( proxiedInstance != null ) {
        s = (DataSource)Proxy.newProxyInstance(
            proxiedInstance.getClass().getClassLoader(),
            new Class[] { DataSource.class },
            proxiedInstance
        );
      }
      return s;
    }
    catch (Exception e) {
      throw new Exception("Unable to get DataSource. dbSourceName=" + dbSourceName, e);
    }
  }

  /**
   * Gets the not wrapped DataSource associated with the specified dbSourceName. This DataSource
   * does not return managed connections in contrast to
   * {@link #getManagedConnection(String)}.
   * @param dbSourceName, if null then configured default datasource is returned. May be NULL so a default connection is returned.
   * @return the dataSource with the given ID or the default dataSource (configuring in DEFAULT_DB_CONTEXT_ID)
   */
  public static DataSource getRawDataSource(ConfigurationProvider provider, String dbSourceName) throws Exception {
    try {
      if (dbSourceName == null || dbSourceName.isEmpty()) {
        dbSourceName = (String) provider.getConfigurationParameter(Configuration.DEFAULT_DB_CONTEXT_ID);
        if (dbSourceName == null) {
          throw new Exception("The default data source id is not defined in configuration. Please set the parameter " + Configuration.DEFAULT_DB_CONTEXT_ID);
        }
      }
      return (DataSource) provider.getConfigurationParameter(dbSourceName);
    }
    catch (Exception e) {
      throw new Exception("Unable to get DataSource. dbSourceName=" + dbSourceName, e);
    }
  }

  // Convenience
  public boolean isDebug() {
    return (Boolean)getConfigurationParameter(Configuration.IS_DEBUG, false);
  }

  // Convenience
  public boolean isCacheDisabled() {
    return (Boolean)getConfigurationParameter(Configuration.DISABLE_CACHE, false);
  }
}
