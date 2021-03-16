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

package de.businesscode.util.jdbc;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;

/**
 * closes JDBC objects
 */
public class Closer {
  private static final Logger log = LogManager.getLogger(Closer.class);

  /**
   * closes objects of following types:
   *
   *  Statement
   *  ResultSet
   *  Connection
   *
   * ignores thrown exceptions. If a close operation is aborted by exception
   * whilst iterating given objects, the queue just keeps being processed with
   * next object.
   *
   * @param closables to close, if array is provided its items are allowed to be null
   * @throws IllegalArgumentException if object of unsupported class provided
   */
  public static void closeAllSQLObjects(Object ... closables){
    for (Object obj : closables) {
      if (obj != null) {
        try {
            if (obj instanceof Connection) {
              ((Connection) obj).close();
            } else if (obj instanceof Statement) {
              ((Statement) obj).close();
            } else if (obj instanceof ResultSet) {
              ((ResultSet) obj).close();
            } else {
              throw new IllegalArgumentException("fatal: no implementation for type " + obj.getClass().getName() + " found");
            }
        } catch (Exception sqle) {
          log.warn("ignore caught exception while closing object of type " + obj.getClass().getName(), sqle);
        }
      } //if obj!=null
    }
  }
}
