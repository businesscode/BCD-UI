/*
  Copyright 2026-2026 BusinessCode GmbH, Germany

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
package de.businesscode.bcdui.subjectsettings.services;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import javax.sql.DataSource;

import de.businesscode.bcdui.subjectsettings.SubjectSettings;
import org.apache.commons.dbutils.QueryRunner;
import org.apache.logging.log4j.Level;
import de.businesscode.bcdui.toolbox.config.BareConfiguration;
import de.businesscode.sqlengine.SQLEngine;
import de.businesscode.util.jdbc.wrapper.BcdSqlLogger;

/**
 * Default {@link UserIdResolver}: treats idType as the id of a BindingItem on bcd_sec_user, and
 * looks up the user whose trimmed value there contains idValue in its list
 * e.g. idType "phone" matches a project-added "phone" BindingItem in bcd_sec_user.
 * The field in the database may contain multiple values separated by ';'
 * addInfo is here mapped to field=value pairs
 */
public class DefaultUserIdResolver implements UserIdResolver {

  // idType is embedded directly into the SQL/Velocity template as $k.<idType> - restrict it to a safe
  // identifier shape before that happens, since it otherwise comes straight from a request header.
  private static final Pattern ID_TYPE_PATTERN = Pattern.compile("[a-zA-Z][a-zA-Z0-9_]*");

  @Override
  public String resolveUserId(String idType, String idValue, Map<String, String> addInfo) {
    // Prevent SQL injection
    if (!ID_TYPE_PATTERN.matcher(idType).matches()) throw new IllegalArgumentException("Invalid idType '" + idType + "'");

    DataSource dataSource;
    try {
      String dsName = SubjectSettings.getInstance().getDataSourceName();
      dataSource = BareConfiguration.getInstance().getUnmanagedDataSource(dsName);
    } catch (Exception e) {
      throw new RuntimeException("Failed to obtain datasource", e);
    }

    // The keys are embedded into the template just like idType, so they underlie the same restriction.
    // The values are bound as parameters, keeping their order in sync with the placeholders.
    StringBuilder callerGivenRestriction = new StringBuilder();
    List<Object> params = new ArrayList<>();
    for (Map.Entry<String, String> e : addInfo.entrySet()) {
      if (!ID_TYPE_PATTERN.matcher(e.getKey()).matches()) throw new IllegalArgumentException("Invalid addInfo key '" + e.getKey() + "'");
      callerGivenRestriction.append(" and $k.").append(e.getKey()).append(" = ?");
      params.add(e.getValue());
    }

    String stmt = String.format("""
        #set( $k = $bindings.bcd_sec_user )
        select $k.user_id_
        from $k
        where ( $k.%s = ? or ';'||replace($k.%s,' ','')||';' like '%%;'||?||';%%' )
              and $k.user_id_ is not null and ($k.is_disabled_ is null or $k.is_disabled_<>'1')
              %s""",
        idType, idValue, idType, idValue, callerGivenRestriction);

    BcdSqlLogger.setLevel(Level.OFF);
    try {
      String sql;
      try {
        sql = new SQLEngine().transform(stmt);
      } catch (RuntimeException e) {
        return null; // idType is not a known BindingItem on bcd_sec_user
      }
      return new QueryRunner(dataSource, true).query(sql, rs -> {
        if (!rs.next()) return null;
        String userId = rs.getString(1);
        if (rs.next()) throw new IllegalStateException("Ambiguous: idType '" + idType + "', '"+params.get(0)+"': multiple users match");
        return userId;
      }, params.toArray());
    } catch (SQLException e) {
      throw new RuntimeException("Failed to resolve idValue", e);
    } finally {
      BcdSqlLogger.reset();
    }
  }
}
