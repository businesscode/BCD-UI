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
package de.businesscode.bcdui.subjectsettings;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.Set;

import javax.sql.DataSource;

import org.apache.commons.dbutils.QueryRunner;
import org.apache.log4j.Level;
import org.apache.log4j.Logger;
import org.apache.shiro.authc.AuthenticationException;
import org.apache.shiro.authc.AuthenticationInfo;
import org.apache.shiro.authc.AuthenticationToken;
import org.apache.shiro.authc.SimpleAccount;
import org.apache.shiro.authc.UsernamePasswordToken;
import org.apache.shiro.authz.AuthorizationInfo;
import org.apache.shiro.subject.PrincipalCollection;

import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingSetNotFoundException;
import de.businesscode.bcdui.toolbox.config.BareConfiguration;
import de.businesscode.util.jdbc.Closer;
import de.businesscode.util.jdbc.wrapper.BcdSqlLogger;

/**
 * Used by shiro framework for retrieving authentication and authorization from the database
 * Relies on fe_user_rights and fe_user BindingSets
 */
public class JdbcRealm extends org.apache.shiro.realm.jdbc.JdbcRealm {
  private static final String BS_USER = "bcd_sec_user";
  private static final String BS_USER_RIGHTS = "bcd_sec_user_settings";
  private static final Logger log = Logger.getLogger(JdbcRealm.class);
  private String u_table;
  private String u_userid;
  private String u_name;
  private String u_password;
  private String ur_table;
  private String ur_userid;
  private String ur_righttype;
  private String ur_rightvalue;

  public JdbcRealm() {
    super();
    this.setPermissionsLookupEnabled(false);
    try {
      Collection<String> c = new LinkedList<String>();
      c.add("user_id");

      BindingSet bs = Bindings.getInstance().get(BS_USER, c);
      u_table    = bs.getTableName();
      u_userid   = bs.get("user_id").getColumnExpression();
      u_name     = bs.get("name").getColumnExpression();
      u_password = bs.get("password").getColumnExpression();
      try {
        bs = Bindings.getInstance().get(BS_USER_RIGHTS, c);
        ur_table  = bs.getTableName();
        ur_userid = bs.get("user_id").getColumnExpression();
        ur_righttype  = bs.get("right_type").getColumnExpression();
        ur_rightvalue = bs.get("right_value").getColumnExpression();
        this.setPermissionsLookupEnabled(true);
      } catch (BindingSetNotFoundException bsnf) {
        log.warn("JDBC Authorization not available due to missing binding set " + BS_USER_RIGHTS);
      } 
    } catch (Exception e) {
      throw new RuntimeException("Failed to initilialize when accessing BindingSet", e);
    }
  }

  /**
   * 
   * @return unmanaged datasource, the caller is responsible to close connections
   */
  protected DataSource getDataSource(){
    if(dataSource == null){
      String dsName = null; // Default data source
      if( SubjectSettings.getInstance().getSubjectSettings().getJdbc().getDataSource()!=null )
        dsName = SubjectSettings.getInstance().getSubjectSettings().getJdbc().getDataSource().getName();
      try {
        dataSource = BareConfiguration.getInstance().getUnmanagedDataSource(dsName);
      } catch (Exception e) {
        throw new RuntimeException("failed to obain datasource",e);
      }
    }

    return dataSource;
  }
  
  /**
   * checks against local database if user exists, either with or without a password, according to the flag
   * 
   * @param principal - i.e. username
   * @param passwd - is provided as-is
   * @param ignorePassword - if true, the password is ignored while solely assuring existence of user
   * 
   * @return true if user exists, false otherwise; additionally this method may throw any defined exceptions if
   * implementation wants to expose more detailed information
   * @throws AuthenticationException if the imlementation wants to expose detail reason
   */
  protected boolean authenticate(String principal, String passwd, boolean ignorePassword) throws AuthenticationException, SQLException {
    String stmt = "select 1 from "+u_table+" where "+u_userid+" = ? and (is_disabled is null or is_disabled<>'1')";
    ArrayList<String> params = new ArrayList<>();
    params.add(principal);
    if(!ignorePassword){
      stmt += " and "+u_password+" = ? ";
      params.add(passwd);
    }
    return new QueryRunner(getDataSource(), true).query(stmt, (rs) -> rs.next(), params.toArray());
  }

  /**
   * extend support to our implicit authentication token
   */
  @Override
  public boolean supports(AuthenticationToken token) {
    return token instanceof ImplicitAuthenticationToken ?  true : super.supports(token);
  }

  @Override
  protected AuthenticationInfo doGetAuthenticationInfo(AuthenticationToken token) throws AuthenticationException {
    // If SubjectSettings are not to be used for authentication, do not try to authorize
    if (SubjectSettings.getInstance().getAuthentication().getSubjectSettings() == null)
      return null;

    // Otherwise try to verify credentials
    try {
      // we dont want to log our JDBC activity
      BcdSqlLogger.setLevel(Level.OFF);
      final boolean isAuthenticated;

      if (token instanceof ImplicitAuthenticationToken) {
        // in case of SSO we do not verify if user exists in local table
        isAuthenticated = true;
      } else if (token instanceof UsernamePasswordToken) {
        UsernamePasswordToken theToken = (UsernamePasswordToken) token;
        isAuthenticated = authenticate(theToken.getUsername(), new String(theToken.getPassword()), false);
      } else {
        isAuthenticated = false;
      }

      if (isAuthenticated) {
        return new SimpleAccount(token.getPrincipal(), token.getCredentials(), getClass().getName());
      }
    } catch (AuthenticationException aue) {
      throw aue;
    } catch (Exception e) {
      log.error("Unrecoverable exception while authenticating", e);
    } finally {
      BcdSqlLogger.reset();
    }

    return null;
  }

  /*
   * Roles are not yet implemented
   * @see org.apache.shiro.realm.jdbc.JdbcRealm#getRoleNamesForUser(java.sql.Connection, java.lang.String)
   * @Override
   */
  protected Set<String> getRoleNamesForUser(Connection con, String username)
      throws SQLException
  {
    Set<String> roles = new HashSet<String>();
    roles.add("default");
    return roles;
  }

  /*
   * Return user's permissions
   * Of fe_user_rights use right_type as first part and append right_value as second part if it exists
   *
   * @see org.apache.shiro.realm.jdbc.JdbcRealm#getPermissions(java.sql.Connection, java.lang.String, java.util.Collection)
   * @Override
   */
  protected Set<String> getPermissions(Connection con, String username, Collection<String> roleNames)
    throws SQLException
  {
    Set<String> permissions = new HashSet<String>();
    String stmt = "select "+ur_righttype+", "+ur_rightvalue+" from "+ur_table+" where "+ur_userid+" = ?";
    PreparedStatement ps = null;
    ResultSet rs = null;

    try {
      // we dont want to log our JDBC activity
      BcdSqlLogger.setLevel(Level.OFF);

      ps = con.prepareStatement(stmt);
      ps.setString(1, username);
      rs = ps.executeQuery();
      while( rs.next() ) {
        String permission = rs.getString(1);
        if( rs.getString(2)!=null || rs.getString(2).length()!=0 )
          permission = permission+":"+rs.getString(2);
        permissions.add(permission);
      }
    } catch (Exception e) {
      log.error("Error getting subject settings from DB.",e);
    } finally {
      BcdSqlLogger.reset();

      Closer.closeAllSQLObjects(rs, ps);
    }
    return permissions;
  }

  /**
   * the super imlementation relies here on dataSource
   */
  @Override
  protected AuthorizationInfo doGetAuthorizationInfo(PrincipalCollection arg0) {
    getDataSource();
    return super.doGetAuthorizationInfo(arg0);
  }
}