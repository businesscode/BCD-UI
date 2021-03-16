/*
  Copyright 2010-2018 BusinessCode GmbH, Germany

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
package de.businesscode.bcdui.web.i18n;

import java.sql.Connection;
import java.util.Collections;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

import org.apache.commons.dbutils.QueryRunner;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;

import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.sqlengine.SQLEngine;

/**
 * Resource bundle loading from binding-set bcd_i18n
 */
class SqlResourceBundle extends MapResourceBundle {
  private static Logger logger = LogManager.getLogger(SqlResourceBundle.class);

  SqlResourceBundle(Locale locale) {
    super(locale, load(locale));
  }

  //@formatter:off
  private static final String selectFileSQL=
      " #set( $k = $bindings.bcd_i18n ) "+
      " SELECT" +
      "   $k.key-" +
      " , $k.value-" +
      " FROM $k.getPlainTableName()" +
      " WHERE $k.lang- = ?";
    //@formatter:on

  /**
   * parses Wrs document filtering given locale
   * 
   * @param is
   * @param locale
   * @return
   */
  private static Map<String, String> load(Locale locale) {
    logger.debug("loading from database");

    try {
      BindingSet i18nBs = Bindings.getInstance().get("bcd_i18n");
      String sql = new SQLEngine().transform(selectFileSQL);
      try (Connection con = Configuration.getInstance().getUnmanagedConnection(i18nBs.getDbSourceName())) {
        return new QueryRunner(true).query(con, sql, (rs) -> {
          final Map<String, String> keyMap = new HashMap<>();

          while (rs.next()) {
            keyMap.put(rs.getString(1), rs.getString(2));
          }

          return Collections.unmodifiableMap(keyMap);
        }, locale.getLanguage());
      }
    } catch (Exception e) {
      throw new RuntimeException("loading resource from database failed", e);
    }
  }
}
