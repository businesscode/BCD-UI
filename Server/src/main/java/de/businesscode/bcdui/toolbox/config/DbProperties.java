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

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map.Entry;
import java.util.concurrent.atomic.AtomicBoolean;

import org.apache.commons.dbutils.QueryRunner;
import org.apache.commons.dbutils.ResultSetHandler;
import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;

import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.sqlengine.SQLEngine;
import de.businesscode.util.jdbc.wrapper.BcdSqlLogger;

/**
 * this class loads the configuration properties from database,
 * this class is thread-safe and can also be used as a singleton,
 * the {@link #getProperties(String)} method is used to retrieve properties and
 * it will keep the internal data up-to-date in case {@link #refreshCycleSec} has
 * been set in constructor. You may want to set {@link #setListener(Listener)} to
 * listen to updates.
 *
 * This class has no threads monitoring the age of data, so the reload does not happen
 * fully on its own, rather the aging is checked on following methods:
 *
 * {@link #getProperties(String)}, {@link #reloadIfAged()}
 *
 *
 */
public class DbProperties {
  private final Logger log = LogManager.getLogger(getClass());

  public static interface Listener {
    /**
     * properties have been reloaded
     */
    void reloaded();

    /**
     * exception occurred during reload
     */
    void handleLoadException(Throwable t);

    /**
     * binding is missing
     * @param bindingSetId
     */
    void bindingMissing(String bindingSetId);
  }


  /*
   * a property is stored in either scope: client,server
   */
  private final HashMap<String, HashMap<String, Object>> scopes = new HashMap<String, HashMap<String,Object>>();
  private final String TPL_SQL_SELECT;
  private final String dataSourceName;

  private long lastRefreshTime;
  private final long refreshCycleSec;
  private Listener listener;
  private boolean bindingSetFound=false;

  /*
   * preventing concurrent reload execution
   */
  private final AtomicBoolean isReloading = new AtomicBoolean(false);
  /*
   * preventing scheduling thread creation
   */
  private final AtomicBoolean isReloadingScheduled = new AtomicBoolean(false);
  private final String bindingSetId;

  /**
   * create DbProperties instance, the properties are NOT initialized/loaded,
   * consider {@link #reload()} or {@link #scheduleReload()}
   *
   * @param bindingSetId
   * @param refreshCycleSec to refresh the properties, may be 0 to disable auto-refresh cycle
   *
   * @throws BindingException if binding-set could not be obtained or was not found
   * @throws RuntimeException in case name of DataSource could not be obtained
   */
  @SuppressWarnings("deprecation")
  public DbProperties(String bindingSetId, int refreshCycleSec) throws BindingException {
    super();
    this.bindingSetId = bindingSetId;
    try {
      this.dataSourceName = Bindings.getInstance().get(bindingSetId).getJdbcResourceName();
    } catch (BindingException be) {
      throw be;
    } catch (Exception e) {
      throw new RuntimeException("failed to obtain data source", e);
    }
    this.refreshCycleSec = refreshCycleSec;
    this.TPL_SQL_SELECT = "#set($b = $bindings." + bindingSetId + ") SELECT $b.scope-,$b.name-,$b.type-,$b.value- FROM $b.plainTableName";

    if(log.isDebugEnabled()){
      log.debug("init on binding-set " + bindingSetId + " with refresh cycle (sec) " + refreshCycleSec);
    }
  }

  public void setListener(Listener listener) {
    this.listener = listener;
  }

  /**
   * triggers reload of properties, this is a *blocking* call, if you want to reload properties asynchronously use {@link #scheduleReload()} method,
   * however only one concurrent reload is processed, so that if multiple threads call this method simultaneously the first one initiates
   * a reload while other calls are discarded and this method returns immediately with 'false'
   *
   * @return true if properties have been reloaded or false if another concurrent reload is in process, so this call has had no effect
   */
  public boolean reload() {
    try {
      verifyBindingSet();
    } catch (BindingException be) {
      if(listener != null){
        listener.bindingMissing(bindingSetId);
      }
      return false;
    }

    synchronized (isReloading) {
      if(isReloading.get()){
        if(log.isTraceEnabled()){
          log.trace("reload already in progress, ignore call");
        }
        return false;
      }
      isReloading.set(true);
    }


    if(log.isTraceEnabled()){
      log.trace("reloading from database...");
    }

    lastRefreshTime = System.currentTimeMillis();
    try {
      final HashMap<String, HashMap<String, Object>> scopes = readFromDatabase();
      refreshProperties(scopes);
    } catch (Exception e) {
      if(listener != null){
        listener.handleLoadException(e);
      }
    } finally {
      // no sync required
      isReloading.set(false);
    }

    if(log.isTraceEnabled()){
      log.trace("configs reloaded");
    }

    return true;
  }

  /**
   * verify if bindingsset exists
   * @throws BindingException
   */
  @SuppressWarnings("deprecation")
  private void verifyBindingSet() throws BindingException {
    if(!bindingSetFound){
      Bindings.getInstance().get(bindingSetId);
      bindingSetFound = true;
    }
  }

  /**
   * triggers scheduled reload of properties and returns immediately,
   * however, the load is performed only once in a time, even though this method is called
   * from multiple threads simulatenously, while loading other calls to this methds are ignored.
   *
   * calling this methods effectively is same as {@link #scheduleReload(long)} with 0 as parameter.
   */
  public void scheduleReload() {
    scheduleReload(0);
  }

  /**
   * unlike {@link #scheduleReload()} this method schedules the reload only in case the
   * last reload time is older than given 'maturedTimeMs' such that {@link #getLastRefreshTime()} + maturedTimeMs &lt;= current time
   *
   * @param refreshCycleSec the mature time offset or 0 to schedule immediately
   */
  public void scheduleReload(long refreshCycleSec) {
    if(getLastRefreshTime() + refreshCycleSec*1000 <= System.currentTimeMillis()){

      synchronized (isReloadingScheduled) {
        if(isReloadingScheduled.get())return;
        isReloadingScheduled.set(true);
      }

      if(log.isTraceEnabled()){
        log.trace("scheduling reload due to time offset (sec) " + refreshCycleSec);
      }

      final Thread t = new Thread("DbPropertiesReloader"){
        @Override
        public void run() {
          try{
            reload();
          }finally{
            // no sync required here
            isReloadingScheduled.set(false);
          }
        }
      };
      t.setDaemon(true);
      t.start();
    }
  }

  /**
   *
   * @return the last refresh ms
   */
  public long getLastRefreshTime() {
    return lastRefreshTime;
  }

  /**
   *
   * @param scopeId
   * @return property-set for given scope, may be NULL if no such scope exists
   */
  public HashMap<String, Object> getProperties(String scopeId){
    try{
      synchronized (scopes) {
        return scopes.get(scopeId);
      }
    }finally{
      reloadIfAged();
    }
  }

  /**
   * this method has no effect in case no refreshCycle was set during construction,
   * otherwise it schedules load in case of aged data
   */
  public void reloadIfAged(){
    if(refreshCycleSec>0){
      scheduleReload(refreshCycleSec);
    }
  }

  /**
   * helper to get properties for given scope
   * @param scope
   * @return properties for given scope, if no properties for scope exists, it will be created
   */
  private HashMap<String, Object> getProperties(HashMap<String, HashMap<String, Object>> scopes, String scope){
    HashMap<String, Object> p = scopes.get(scope);
    if(p==null){
      p = new HashMap<String, Object>();
      scopes.put(scope, p);
    }
    return p;
  }

  private HashMap<String, HashMap<String, Object>> readFromDatabase() throws Exception {
    final HashMap<String, HashMap<String, Object>> scopes = new HashMap<String, HashMap<String,Object>>();
    Connection con = BareConfiguration.getInstance().getUnmanagedConnection(dataSourceName);
    try{
      BcdSqlLogger.setLevel(Level.ALL); // Execute from normal log as it adds no value
      new QueryRunner(true).query(con, new SQLEngine().transform(TPL_SQL_SELECT), new ResultSetHandler<Void>() {
        @Override
        public Void handle(ResultSet rs) throws SQLException {

          while(rs.next()){
            String scope = rs.getString(1);
            String key = rs.getString(2);
            String type = rs.getString(3);
            String value = rs.getString(4);
            getProperties(scopes, scope).put(key, createValueObject(value, type));
          }

          return null;
        }
      });
      return scopes;
    }finally{
      BcdSqlLogger.reset();
      if( con != null ) con.close();
    }
  }

  /**
   * parses given value as a type, returns value as-is if no suitable type was supplied,
   * only types supported are java.lang.Boolean .. java.lang.Integer
   *
   * @param value
   * @param type (may be NULL) then value is returned as-is
   * @return
   */
  private Object createValueObject(String value, String type) {
    if(type==null||type.isEmpty())return value;

    try {
      return Class.forName(type).getMethod("valueOf", String.class).invoke(null, value);
    } catch (Exception e) {
      log.warn("failed to parse value '"+value+"' into as type '"+type+"'",e);
      return value;
    }
  }

  /**
   * refresh internal properties with given props, this method is thread-safe
   *
   * @param props
   */
  private void refreshProperties(HashMap<String, HashMap<String, Object>> newScopes) {
    synchronized (scopes) {
      for(Entry<String, HashMap<String, Object>> scope : newScopes.entrySet()){
        final HashMap<String, Object> props = getProperties(scopes, scope.getKey());
        props.clear();
        props.putAll(scope.getValue());
      }
    }
    try{
      if(this.listener != null){
        this.listener.reloaded();
      }
    }catch(Exception e){
      log.warn("reload listener execution failed", e);
    }
  }
}
