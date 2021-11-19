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
package de.businesscode.bcdui.wrs;

import java.io.IOException;
import java.sql.Connection;

import javax.xml.parsers.ParserConfigurationException;
import javax.xml.xpath.XPathExpressionException;

import org.w3c.dom.Document;
import org.xml.sax.SAXException;

import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingException;

/**
 * The class represents request options for an operation.<br>
 * Typically all parameters are readed from a HTTP-Request and/or application configuration
 *
 */
public interface IRequestOptions {

  /**
   * getRequestUrl
   *
   * @return the URL of the request
   */
  String getRequestUrl();

  /**
   * getRequestDoc
   *
   * @return the request xml-document or null
   */
  Document getRequestDoc();

  /**
   * isDebugMode
   *
   * @return true if debug mode
   */
  boolean isDebugMode();

  /**
   * gets managed connection that should not be closed
   *
   * @param dbSourceName
   *          - the name of requeted db-connection, null for default
   * @return the database connection
   * @throws Exception
   *           - if connection with the name not found or database is not available
   */
  Connection getManagedConnection(String dbSourceName) throws Exception;
  /**
   * gets UnmanagedConnection, that should be closed by user
   *
   * @param dbSourceName
   * @return
   * @throws Exception
   */
  Connection getUnmanagedConnection(String dbSourceName) throws Exception;

  /**
   * getBindings
   *
   * @return the Bindings used for this request, using this and not Bindings.getInstance() allows usage in batch environments
   * @throws BindingException
   * @throws ParserConfigurationException
   * @throws IOException
   * @throws SAXException
   * @throws XPathExpressionException
   */
  Bindings getBindings() throws XPathExpressionException, SAXException, IOException, ParserConfigurationException, BindingException;

  /**
   * Method getMaxSQLBatchSize
   * @return max count of statements to execute in a SQL Statement
   */
  int getMaxSQLBatchSize();
  /**
   *
   * Method setMaxSQLBatchSize
   * @param maxSQLBatchSize - max count of statements to execute in a SQL Statement
   */
  void setMaxSQLBatchSize(int maxSQLBatchSize);

  /**
   * Method getMaxRows
   * @return max count rows to be returned
   */
  int getMaxRows();

  /**
   * Delayed setting the request doc, of not already available in constructor
   * @param doc
   */
  void setRequestDoc(Document doc);
}
