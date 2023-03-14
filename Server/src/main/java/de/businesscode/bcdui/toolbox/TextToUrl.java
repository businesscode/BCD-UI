/*
  Copyright 2010-2022 BusinessCode GmbH, Germany

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

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import javax.naming.Context;
import javax.naming.InitialContext;
import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.sql.DataSource;
import org.apache.commons.lang.StringEscapeUtils;

import de.businesscode.util.jdbc.Closer;

/**
 * This servlet allows POSTing a text and retrieve it (up to 24h) later via GET under a given name
 * Each servlet instance has its only scope name. Use for example
 * 
 * {@code
 *  <servlet>
 *    <servlet-name>SldToUrl</servlet-name>
 *    <servlet-class>de.businesscode.bcdui.toolbox.TextToUrl</servlet-class>
 *    <init-param><param-name>SCOPE</param-name>         <param-value>sld</param-value></init-param>
 *    <init-param><param-name>NAME_TEMPLATE</param-name> <param-value>sld%d.xml</param-value></init-param>
 *    <init-param><param-name>DATA_SOURCE</param-name>   <param-value>jdbc/datasourceName</param-value></init-param>
 *    <init-param><param-name>TABLE</param-name>         <param-value>tableName</param-value></init-param>
 *    <init-param><param-name>MIME_TYPE</param-name>     <param-value>text/xml</param-value></init-param>
 *  </servlet>
 * }
 * to initialize the servlet. Table needs to have the form
   CREATE TABLE tablename (
     name  VARCHAR(64),
     value CLOB,
     scope VARCHAR(32),
     ts    TIMESTAMP
   ) ;
 * For parameters &gt; 4000 character Oracle requires connectionProperties="SetBigStringTryClob=true"
 * (for example in Tomcat DataSource Resource definition)
 */
public class TextToUrl extends HttpServlet
{
  //---------------------------
  // writes the received character stream to db and returns a name to retrieve it
  @Override
  public void doPost(HttpServletRequest req, HttpServletResponse resp)
      throws ServletException, IOException
  {
    int gerneratedId = (int)(Math.random()*Integer.MAX_VALUE);
    String name = String.format(nameTemplate, gerneratedId);

    // Request body to string
    BufferedReader br = new BufferedReader(new InputStreamReader(req.getInputStream()));
    StringBuilder sb = new StringBuilder();
    String line = null;
    while ((line = br.readLine()) != null)
      sb.append(line + "\n");
    String text  = sb.toString();

    Connection con = null;
    PreparedStatement pStmt = null;
    try {
      con = ds.getConnection();

      // From time to time (every 100th time) remove old entries
      if( Math.random()<0.01 )
        con.prepareStatement(stmtClean).execute();

      // Store the given text for the scope under the name, built from name template and id
      pStmt = con.prepareStatement(stmtWrite);
      pStmt.setString(1, name);
      pStmt.setString(2, text);
      pStmt.executeUpdate();

      // print response
      resp.setContentType("text/xml");
      resp.getWriter().print("<response><name>"+StringEscapeUtils.escapeXml(name)+"</name></response>");
      resp.getWriter().close();

    } catch (SQLException e) {
      throw new ServletException(e.getMessage());
    }
    finally {
      Closer.closeAllSQLObjects(pStmt, con);
    }
  }


  /* ********************************
   * Get the stored text identified by name (and implicitely the scope of the servlet instance)
   */
  @Override
  public void doGet(HttpServletRequest req, HttpServletResponse resp)
      throws ServletException, IOException {

    Connection con = null;
    PreparedStatement pStmt = null;
    ResultSet rs = null;
    try {
      String name = req.getPathInfo().substring(1);

      // read response text from db
      con = ds.getConnection();
      pStmt = con.prepareStatement(stmtRead);
      pStmt.setString(1, name);
      rs = pStmt.executeQuery();

      resp.setContentType(mimeType);
      if( rs.next() )
        resp.getOutputStream().print("<response><value>"+StringEscapeUtils.escapeXml(rs.getString(1))+"</value></response>");
      else
        resp.getOutputStream().print("<error>No text found for '"+StringEscapeUtils.escapeXml(name)+"' in scope '"+getInitParameter(INIT_SCOPE)+"'</error>");

      resp.getOutputStream().close();
    } catch (SQLException e) {
      throw new ServletException(e.getMessage());
    }

    try {
      if( rs != null) rs.close();
      if( pStmt != null) pStmt.close();
      if( con != null) con.close();
    } catch (SQLException e) {
      throw new ServletException(e.getMessage());
    }
  }


  /* ********************************
   * Determine constants depending on configuration
   */
  @Override
  public void init(ServletConfig config) throws ServletException
  {
    try {
      // Get datasource by name
      Context init = new InitialContext();
      Context ctx  = (Context) init.lookup("java:comp/env");
      ds           = (DataSource) ctx.lookup(config.getInitParameter(INIT_DATASOURCE_TOKEN));

      // Determine statements
      stmtWrite    = "INSERT INTO "+config.getInitParameter(INIT_TABLE_TOKEN)+" (name, value, scope, ts) " +
                       " VALUES (?, ?, '"+config.getInitParameter(INIT_SCOPE)+"', current_timestamp)";
      stmtRead     = "SELECT value FROM "+config.getInitParameter(INIT_TABLE_TOKEN)+
                       " WHERE scope = '"+config.getInitParameter(INIT_SCOPE)+"' and name = ?";
      stmtClean    = "DELETE FROM "+config.getInitParameter(INIT_TABLE_TOKEN)+
                       " WHERE ts < current_date-1 and scope = '"+config.getInitParameter(INIT_SCOPE)+"'";

      // Initialize constants, determine mime type by random sample name
      nameTemplate = config.getInitParameter(INIT_NAME_TEMPLATE);
      mimeType     = config.getInitParameter(INIT_MIME_TYPE);

    } catch (Exception e) {
      throw new ServletException(e);
    }
    super.init(config);
  }

  // Constants for servlet init param-names and request param-name
  protected final static String INIT_SCOPE               = "SCOPE";
  protected final static String INIT_NAME_TEMPLATE       = "NAME_TEMPLATE";
  protected final static String INIT_DATASOURCE_TOKEN    = "DATA_SOURCE";
  protected final static String INIT_TABLE_TOKEN         = "TABLE";
  protected final static String INIT_MIME_TYPE           = "MIME_TYPE";

  // Some instance dependent constants
  protected String mimeType;
  protected String stmtWrite;
  protected String stmtRead;
  protected String stmtClean;
  protected String nameTemplate;
  protected DataSource ds;

  private static final long serialVersionUID = 4668349998077944047L;
}