/*
  Copyright 2010-2024 BusinessCode GmbH, Germany

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

import java.io.IOException;
import java.math.BigDecimal;
import java.sql.Connection;

import org.apache.commons.dbutils.QueryRunner;
import org.apache.commons.dbutils.handlers.ScalarHandler;
import org.apache.commons.text.StringEscapeUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.sqlengine.SQLEngine;
import de.businesscode.util.jdbc.Closer;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
/**
 * provides next identifier - table based id generator,
 * binding-set: bcd_identifier
 *
 */
public class WrsNextIdentifierServlet extends HttpServlet {
  private static final long serialVersionUID = 1L;
  private final Logger log = LogManager.getLogger(getClass());

  /**
   * provides next identifier
   * the SCOPE is retrieved from pathInfo
   */
  @Override
  protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    try {
      String scope = request.getPathInfo();
      if (scope == null) {
        throw new Exception("SCOPE on pathInfo required");
      }
      scope = scope.substring(1); // leading slash

      // check for blocksize, i.e. scopeId/10
      int blockSize = 0;
      {
        if (scope.contains("/")) {
          String[] split = scope.split("/");
          if(split.length == 0 || split.length > 2){
            throw new ServletException("invalid block size, format is: /servlet/scopeId/blockSize; you provided " + scope);
          }
          scope = split[0];
          try {
            blockSize = Integer.valueOf(split[1]);
          } catch (Exception e) {
            throw new ServletException("invalid block size, format is: /servlet/scopeId/blockSize", e);
          }
        }
      }

      String nextId = getNextIdentifier(this.log, scope, blockSize);

      log.trace("got next identifier for scope " + scope + ": " + nextId);

      // @formatter:off
      StringBuilder sb = new StringBuilder("<?xml version=\"1.0\"?><NextIdentifier xmlns=\"http://www.businesscode.de/schema/bcdui/bindings-1.0.0\" scope=\"" + StringEscapeUtils.escapeXml11(scope) + "\" blockSize=\"" + blockSize + "\">");
      // @formatter:on

      sb.append(nextId);
      sb.append("</NextIdentifier>");

      response.getWriter().append(sb.toString());
    } catch (Exception e) {
      throw new ServletException(e);
    }
  }

  /**
   * @param log
   *          - logger to use for logging
   * @param scope
   *          - scope id
   * @param blockSize
   *          - block size or 0 to pick only one id
   * @return
   * @throws Exception
   */
  public static String getNextIdentifier(Logger log, String scope, int blockSize) throws Exception {
    blockSize = blockSize < 1 ? 1 : blockSize;
    log.trace("retrieve identifier for scope " + scope + ", blockSize: " + blockSize);

    Connection con = Configuration.getInstance().getUnmanagedConnection(Bindings.getInstance().get("bcd_identifier").getJdbcResourceName());
    try {
      final SQLEngine e = new SQLEngine();
      BigDecimal nextId;

      con.setAutoCommit(false);

      Throwable lastInsertException = null;
      // @formatter:off
      while(true){
        int updatedRows = new QueryRunner(true).update(con,e.transform("#set($b = $bindings.bcd_identifier)UPDATE $b.plainTableName SET $b.lastid_ = $b.lastid_ + "+ blockSize +" WHERE $b.scope_ = ?"), scope);
        if(updatedRows > 0){
          // ID counted, retrieve it
          nextId = new QueryRunner(true).query(con, e.transform("#set($b = $bindings.bcd_identifier)SELECT $b.lastid_ FROM $b.plainTableName WHERE $b.scope_ = ?"), new ScalarHandler<BigDecimal>(1),scope);
          break;
        }else if(lastInsertException == null){
          // no updates as there is no such scope, create it
          log.debug("create non existent scope: {}, blockSize: {} ", scope, blockSize);
          nextId = new BigDecimal("0").add(new BigDecimal(blockSize));
          try {
            new QueryRunner(true).update(con, e.transform("#set($b = $bindings.bcd_identifier)INSERT INTO $b.plainTableName ($b.scope_, $b.lastid_) VALUES (?,?)"), scope, nextId);
            break;
          } catch (Exception uniqueViolationException) {
            // we expect actually the unique key violation exception
            lastInsertException = uniqueViolationException;
          }
        } else {
          throw new RuntimeException("unexpected exception occurred", lastInsertException);
        }
      }
      // @formatter:on
      con.commit();
      return nextId.toString();
    } finally {
      Closer.closeAllSQLObjects(con);
    }
  }
}
