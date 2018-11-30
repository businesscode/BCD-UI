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
package de.businesscode.bcdui.web.wrs;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

import javax.servlet.ServletContext;
import javax.servlet.http.HttpServletRequest;

import org.w3c.dom.Document;

import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.toolbox.ServletUtils;
import de.businesscode.bcdui.wrs.IRequestOptions;

/**
 * Implements IRequestOptions for Wrs operations, which may not be originated in an HTTP request
 * When using getManagedConnection() also call returnAllThreadManagedConnections()!
 */
public class RequestOptions implements IRequestOptions {
  private int maxSQLBatchSize;
  private int maxRows = 10000; // default
  private Document requestDoc = null;
  private Map<String,Connection> connections = new HashMap<String, Connection>();

  /**
   * HttpRequestOptions
   *
   * @param servletCtx
   * @param request
   */
  public RequestOptions(int maxRows) {
    super();
    this.maxRows = maxRows;
  }

  public ServletContext getServletCtx() {
    throw new IllegalArgumentException("Requesting a servlet context, which is not available");
  }

  /**
   * @return the httpRequest
   */
  public final HttpServletRequest getHttpRequest() {
    throw new IllegalArgumentException("Requesting an HTTP request, which is not available");
  }

  /**
   *
   * @return the sessionId or null
   */
  public final String getSessionId() {
    throw new IllegalArgumentException("Requesting a session id, which is not available");
  }

  // ===========================================================================================================

  /**
   * When using this also call returnAllThreadManagedConnections(), otherwise db connections leak
   * @see de.businesscode.bcdui.wrs.IRequestOptions#getManagedConnection(java.lang.String)
   */
  @Override
  public Connection getManagedConnection(String dbSourceName) throws Exception {
    Connection con = Configuration.getInstance().getManagedConnection(dbSourceName, false);
    return con;
  }

  /**
   * Close all managed connections associated with the current thread
   * @throws SQLException
   */
  public void closeAllThreadManagedConnections() throws SQLException {
    Configuration.getInstance().closeAllConnections(false);
    connections.clear();
  }
  
  /**
   * @see de.businesscode.bcdui.wrs.IRequestOptions#getRequestUrl()
   */
  @Override
  public String getRequestUrl() {
    return ServletUtils.getInstance().reconstructURL(getHttpRequest());
  }

  /**
   * @see de.businesscode.bcdui.wrs.IRequestOptions#getRequestDoc()
   */
  @Override
  public Document getRequestDoc() {
    if( requestDoc != null )
      return requestDoc;
    return (Document) getHttpRequest().getAttribute("guiStatusDoc"); // TODO statusDocAttributeName configurable?
  }

  /**
   * @see de.businesscode.bcdui.wrs.IRequestOptions#isDebugMode()
   */
  @Override
  public boolean isDebugMode() {
    return true;
  }

  /**
   * @see de.businesscode.bcdui.wrs.IRequestOptions#getBindings()
   */
  @Override
  public Bindings getBindings() {
    try {
      return Bindings.getInstance();
    }
    catch (Exception e) {
      throw new RuntimeException("Unable to load bindings for this request.", e);
    }
  }

  /**
   * gets max count of statements to execute in SQL Statement
   */
  @Override
  public int getMaxSQLBatchSize() {
    return maxSQLBatchSize;
  }

  /**
   * sets max count of statements to execute in SQL Statement
   */
  @Override
  public void setMaxSQLBatchSize(int i) {
    maxSQLBatchSize = i;
  }

  @Override
  /**
   * @see de.businesscode.bcdui.wrs.IRequestOptions#getUnmanagedConnection(java.lang.String)
   */
  public Connection getUnmanagedConnection(String dbSourceName) throws Exception {
    return Configuration.getInstance().getUnmanagedConnection(dbSourceName);
  }

  @Override
  public int getMaxRows() {
    return maxRows;
  }

  @Override
  public void setRequestDoc(Document doc) {
    this.requestDoc = doc;
  }
}
