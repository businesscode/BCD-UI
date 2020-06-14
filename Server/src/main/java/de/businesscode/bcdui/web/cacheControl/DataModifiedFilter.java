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
package de.businesscode.bcdui.web.cacheControl;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.TimeZone;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.log4j.Logger;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.sqlengine.SQLEngine;
import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.jdbc.Closer;

/**
 * Cache control based on requested binding set name and data from scope_last_modified
 * If a request matches a certain scope, we check its last_refreshed and compare it against the request's If-Modified-Since-Header
 * If possible according to that, we send a 304 instead of forwarding to get new data
 * - If the scope was found in bcd_cache_scope, we are active, otherwise we do chain.doFilter
 * - If If-Modified-Since was sent, we compare that with the scopes scope_last_modified
 * - If If-Modified-Since was not sent or data was out-dated, we call chain.doFilter and set expires to earliest_next_modified if given
 * See bcdui4.DataModifiedFilter in web.xml for how to use
 */
public class DataModifiedFilter implements Filter {

  public static final String REFRESH_PERIOD_PARAM_NAME = "SCOPES_REFRESH_PERIOD_MS";
  public static final int REFRESH_PERIOD_DEFAULT = 30*1000;

  protected Map<String,ScopeInfo> scopesLamos = null;
  protected Logger logger = Logger.getLogger(this.getClass());
  protected long lastRefreshedMs = 0;
  protected long refreshPeriodMs = REFRESH_PERIOD_DEFAULT;
  protected Calendar utcCal = null; 

  // Where in the database to find the scope's last_modified
  protected static final String selectSQL =
      " #set( $t = $bindings.bcd_cache_scope ) "+
      " SELECT" +
      "   $t.scope, $t.scope_last_modified, $t.earliest_next_modified, $t.expires_min_offset_sec" +
      " FROM $t";

  /**
   * Handle the request -> 304 or operation
   */
  @Override
  public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain)
      throws IOException, ServletException {

    // Check, whether 304 applies
    boolean didSend304 = didSend304(req, res);
    
    // Otherwise follow normal operation
    if( ! didSend304 ) {
      chain.doFilter(req, res);
    }

    return;
  }

  /**
   * Check whether we can send a 304 and do so of possible
   * Will send "Last-Modified" header if the scope was found. That triggers "If-Modified-Since" to be sent next time by the client
   * @param req
   * @param res
   * @return false if 304 is not sufficient
   */
  protected boolean didSend304(ServletRequest req, ServletResponse res) {

    if( !(req instanceof HttpServletRequest) ) return false;
    HttpServletRequest httpReq = (HttpServletRequest)req; 
    HttpServletResponse httpRes = (HttpServletResponse)res; 

    // Scope unknown -> nothing to do for us
    String reqScope = getReqScope(httpReq);
    if( reqScope == null ) return false;
    
    // We found the scope, do we need to refresh its last modified?
    synchronized (this) {
      if( scopesLamos==null || refreshNeeded(reqScope) ) refreshScopes();
    }
    ScopeInfo scopeInfo = scopesLamos.get(reqScope);
    if(scopeInfo==null) return false;

    final Long scopeLamo = getScopeLastModified(reqScope);
    if(scopeLamo == null) return false;

    // We may be able to set an expires header, depending on
    // whether expires_min_offset_sec or earliestNextModified are given
    // That will prevent the client to send a request too early
    long nowUtc = Instant.now().toEpochMilli();
    if( scopeInfo.earliestNextModifiedMs != null && scopeInfo.expiresMinOffsetMs != null) {
      long expires = Math.max(scopeInfo.earliestNextModifiedMs, nowUtc + scopeInfo.expiresMinOffsetMs);
      httpRes.setDateHeader("expires", expires);
      httpRes.setHeader("Cache-Control", "private");
    } else if( scopeInfo.earliestNextModifiedMs != null && scopeInfo.earliestNextModifiedMs > nowUtc ) {
      httpRes.setDateHeader("expires", scopeInfo.earliestNextModifiedMs);
      httpRes.setHeader("Cache-Control", "private");
    } else if( scopeInfo.expiresMinOffsetMs != null ) {
      httpRes.setDateHeader("expires", nowUtc + scopeInfo.expiresMinOffsetMs);
      httpRes.setHeader("Cache-Control", "private");
    }

    // If "If-Modified-Since" was not sent, this may be the first query for that scope by the client
    // Send data and "Last-Modified", next time the client will send "If-Modified-Since"
    final long reqLamo = httpReq.getDateHeader("If-Modified-Since");
    if(reqLamo == -1) {
      httpRes.setDateHeader("Last-Modified", scopeLamo);
      return false;
    }

    // The data the client is out-dated, make sure it is send new (by returning false)
    // and set earliestNextModified if given as expires header
    if(reqLamo < scopeLamo) {
      httpRes.setDateHeader("Last-Modified", scopeLamo);
      return false;
    }

    // Send a SC_NOT_MODIFIED to the client so that it can use its cache
    httpRes.setStatus(HttpServletResponse.SC_NOT_MODIFIED);
    return true;
  }
  
  /**
   * Derive the caching-scope from the request.
   * In this case we just use the BindingSet as the scope
   * @param httpReq
   * @return
   */
  protected String getReqScope(HttpServletRequest httpReq) {
    Object gsd = httpReq.getAttribute("guiStatusDoc");

    if( !(gsd instanceof Document) ) return null;

    NodeList nl = ((Document)gsd).getElementsByTagNameNS(StandardNamespaceContext.WRSREQUEST_NAMESPACE,"BindingSet");
    if( nl.getLength()!=1 ) return null;

    String bindingSet = ((Element)nl.item(0)).getTextContent();
    return bindingSet;
  }

  /**
   * Check whether we have a a last-modified for the scope and return it.
   * Returns -1 if there was no entry found
   * @param scope
   * @return
   */
  protected Long getScopeLastModified(String scope) {
    ScopeInfo scopeInfo = scopesLamos.get(scope);
    return scopeInfo != null ? scopeInfo.scopeLastModifiedMs : null;
  }

  /**
   * Check whether we need to refresh the scope's data from bcd_cache_scope
   * That is the case if refreshPeriodMs has passed since last update and earliestNextModified is not in the future
   * @param scope
   * @return
   */
  protected boolean refreshNeeded(String scope) {
    ScopeInfo scopeInfo = scopesLamos.get(scope);
    if(scopeInfo == null) return false;
    long nowUtc = Instant.now().toEpochMilli();
    if( nowUtc < refreshPeriodMs + lastRefreshedMs) return false;
    if(scopeInfo.earliestNextModifiedMs == null) return true;
    return nowUtc > scopeInfo.earliestNextModifiedMs;
  }
  
  /**
   * Read all sopes' information fresh from bcd_cache_scope
   */
  protected void refreshScopes() {

    PreparedStatement stmt = null;
    ResultSet result = null;
    try {
      BindingSet bs  = Bindings.getInstance().get("bcd_cache_scope", new ArrayList<String>());
      @SuppressWarnings("resource") // is a managed connection
      Connection con = Configuration.getInstance().getManagedConnection(bs.getDbSourceName());
      
      String sql = new SQLEngine().transform(getSelectSql());
      stmt = con.prepareStatement(sql);
      result = stmt.executeQuery();
  
      Map<String,ScopeInfo> newScopesLamos = new HashMap<>();
      while (result.next()) {
        String scope = result.getString(1);
        ScopeInfo scopeInfo = new ScopeInfo(scope, result.getTimestamp(2, utcCal), result.getTimestamp(3, utcCal), result.getLong(4));
        newScopesLamos.put(scope, scopeInfo);
      }
      scopesLamos = newScopesLamos;
      lastRefreshedMs = Instant.now().toEpochMilli();

    } catch(Exception e) {
      logger.error("Not able to refresh scopes' last modified from database.", e);
    } finally {
      Closer.closeAllSQLObjects(result, stmt);
    }
    
  }

  /**
   * The query to get the scops' data
   * @return
   */
  protected String getSelectSql() {
    return selectSQL;
  }
  
  @Override
  public void init(FilterConfig filterConfig) throws ServletException {
    String initParameter = filterConfig.getInitParameter(REFRESH_PERIOD_PARAM_NAME);
    try {
      if(initParameter!=null)  refreshPeriodMs = Integer.parseInt(initParameter);
    } catch( NumberFormatException e ) {
      logger.warn(REFRESH_PERIOD_PARAM_NAME+" not an integer." + e);
    }
    utcCal = Calendar.getInstance();
    utcCal.setTimeZone(TimeZone.getTimeZone("UTC"));
  }

  @Override
  public void destroy() {
  }

  /**
   * Holds information about a scope like when data was actually refreshed last time
   * and possibly when it may be refreshed earliest next time
   *
   */
  protected static class ScopeInfo {
    final String scope;                 // Scope name
    final Long scopeLastModifiedMs;     // When the scope's data was last updated
    final Long earliestNextModifiedMs;  // If given, when the data is expected to be next updated earliest
    final Long expiresMinOffsetMs;      // If given, how long the data should be kept as valid by the client cache
    public ScopeInfo(String scope, Date scopeLastModifiedMs, Date earliestNextModifiedMs, Long expiresMinOffsetSec) {
      super();
      this.scope = scope;
      this.scopeLastModifiedMs = scopeLastModifiedMs != null ? scopeLastModifiedMs.getTime() : null;
      this.earliestNextModifiedMs = earliestNextModifiedMs != null ? earliestNextModifiedMs.getTime() : null;
      this.expiresMinOffsetMs = expiresMinOffsetSec != 0 ? expiresMinOffsetSec * 1000 : null;
    }
  }
  
}
