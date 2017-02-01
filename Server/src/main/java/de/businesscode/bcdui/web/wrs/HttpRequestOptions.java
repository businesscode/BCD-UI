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

import javax.servlet.ServletContext;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

import org.w3c.dom.Document;

import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.toolbox.ServletUtils;
import de.businesscode.bcdui.wrs.IRequestOptions;

/**
 * Wrapp a httpRequest and implements IRequestOptions for Wrs operations
 */
public class HttpRequestOptions implements IRequestOptions {
  private final HttpServletRequest httpRequest;
  private int maxSQLBatchSize;
  private int maxRows = 10000; // default
  private ServletContext servletCtx;
  private Document requestDoc = null;

  /**
   * HttpRequestOptions
   *
   * @param servletCtx
   * @param request
   */
  public HttpRequestOptions(ServletContext servletCtx, HttpServletRequest request, int maxRows) {
    super();
    this.httpRequest = request;
    this.maxRows = maxRows;
    this.servletCtx = servletCtx;
  }

  public ServletContext getServletCtx() {
    return servletCtx;
  }

  /**
   * @return the httpRequest
   */
  public final HttpServletRequest getHttpRequest() {
    return httpRequest;
  }

  /**
   *
   * @return the sessionId or null
   */
  public final String getSessionId() {
    HttpSession session = httpRequest.getSession(false);
    return session != null ? session.getId() : null;
  }

  // ===========================================================================================================

  /**
   * @see de.businesscode.bcdui.wrs.IRequestOptions#getManagedConnection(java.lang.String)
   */
  @Override
  public Connection getManagedConnection(String dbSourceName) throws Exception {
    return Configuration.getInstance().getManagedConnection(dbSourceName);
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
    return ServletUtils.getInstance().isFeDebug(getHttpRequest());
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
