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

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
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
import org.apache.shiro.authc.SimpleAuthenticationInfo;
import org.apache.shiro.authc.UsernamePasswordToken;
import org.apache.shiro.authc.credential.CredentialsMatcher;
import org.apache.shiro.authc.credential.HashedCredentialsMatcher;
import org.apache.shiro.authz.AuthorizationInfo;
import org.apache.shiro.codec.Hex;
import org.apache.shiro.crypto.RandomNumberGenerator;
import org.apache.shiro.crypto.SecureRandomNumberGenerator;
import org.apache.shiro.crypto.hash.Sha256Hash;
import org.apache.shiro.subject.PrincipalCollection;
import org.apache.shiro.subject.SimplePrincipalCollection;
import org.apache.shiro.util.ByteSource;
import org.apache.shiro.util.SimpleByteSource;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingSetNotFoundException;
import de.businesscode.bcdui.toolbox.config.BareConfiguration;
import de.businesscode.util.jdbc.Closer;
import de.businesscode.util.jdbc.wrapper.BcdSqlLogger;

/**
 * Used by shiro framework for retrieving authentication and authorization from the database
 * Relies on fe_user_rights and fe_user BindingSets providing support for plaintext (backwards compatibility)
 * and salted/hashed passwords using SHA256 hashing. The default hash iteration is 1024 and can be adjusted in shiro ini by setting
 * .hashIterations property. The default mode is hashed/salted, which can be disabled by setting .hashSalted=false
 * in shiro configuration when declaring this realm. When creating new password please use {@link #generatePasswordHashSalt(String, int)}
 * method of this class.
 */
public class JdbcRealm extends org.apache.shiro.realm.jdbc.JdbcRealm {
  private static final String BS_USER = "bcd_sec_user";
  private static final String BS_USER_RIGHTS = "bcd_sec_user_settings";
  private static final String BS_USER_ROLES = "bcd_sec_user_roles";
  private static final int DEFAULT_HASH_ITERATIONS = 1024;
  private final Logger log = Logger.getLogger(getClass());
  final private String u_table;
  final private String u_userid;
  final private String u_login;
  final private String u_password;
  final private String u_password_salt;

  private String ur_table;
  private String ur_userid;
  private String ur_userid_jdbcType;
  private String ur_righttype;
  private String ur_rightvalue;

  private String uro_table;
  private String uro_userid;
  private String uro_userid_jdbcType;
  private String uro_userrole;
  
  private boolean hashSalted = true;
  private int hashIterations = DEFAULT_HASH_ITERATIONS;
  
  public JdbcRealm() {
    super();
    this.setPermissionsLookupEnabled(false);
    try {
      Collection<String> c = new LinkedList<String>();
      c.add("user_id");

      BindingSet bs = Bindings.getInstance().get(BS_USER, c);
      u_table    = bs.getTableName();
      BindingItem biUserId = bs.get("user_id");
      u_userid   = biUserId.getColumnExpression();
      u_login    = bs.get("user_login").getColumnExpression();
      u_password = bs.get("password").getColumnExpression();
      u_password_salt = bs.get("password_salt").getColumnExpression();
      try {
        bs = Bindings.getInstance().get(BS_USER_RIGHTS, c);
        ur_table  = bs.getTableName();
        biUserId = bs.get("user_id");
        ur_userid_jdbcType = getCustomJdbcType(biUserId);
        ur_userid = biUserId.getColumnExpression();
        ur_righttype  = bs.get("right_type").getColumnExpression();
        ur_rightvalue = bs.get("right_value").getColumnExpression();
        this.setPermissionsLookupEnabled(true);
      } catch (BindingSetNotFoundException bsnf) {
        log.warn("JDBC Authorization not available due to missing binding set " + BS_USER_RIGHTS);
      } 
      try {
        bs = Bindings.getInstance().get(BS_USER_ROLES, c);
        uro_table  = bs.getTableName();
        biUserId = bs.get("user_id");
        uro_userid_jdbcType = getCustomJdbcType(biUserId);
        uro_userid = biUserId.getColumnExpression();
        uro_userrole  = bs.get("user_role").getColumnExpression();
      } catch (BindingSetNotFoundException bsnf) {
        log.warn("JDBC User Roles not available due to missing binding set " + BS_USER_ROLES);
      } 
    } catch (Exception e) {
      throw new RuntimeException("Failed to initilialize when accessing BindingSet", e);
    }
  }
  
  public int getHashIterations() {
    return hashIterations;
  }
  
  public boolean isHashSalted() {
    return hashSalted;
  }
  
  public void setHashIterations(int hashIterations) {
    this.hashIterations = hashIterations;
  }
  
  public void setHashSalted(boolean hashSalted) {
    this.hashSalted = hashSalted;
  }

  /**
   * Support for type-name=OTHER, cust:type-name=uuid
   *
   * @param biUserId
   * @return cust:type-name , if defined
   */
  protected String getCustomJdbcType(BindingItem bindingItem) {
    if(bindingItem.isDefinedJDBCDataType() && bindingItem.getJDBCDataType() == Types.OTHER){
      return bindingItem.getCustomAttributesMap().get("type-name");
    }
    return null;
  }

  /**
   * support for custom jdbc type, do any explicit casts here
   *
   * @param columnExpression
   * @param customType (may be null)
   * @return
   */
  protected String getDefineJdbcParameter(String columnExpression, String customType) {
    if (customType != null && !customType.isEmpty()) {
      return " " + columnExpression + " = (?)::" + customType + " ";
    } else {
      return " " + columnExpression + " = ? ";
    }
  }

  /**
   * 
   * @return unmanaged datasource, the caller is responsible to close connections
   */
  protected DataSource getDataSource(){
    if(dataSource == null){
      String dsName = SubjectSettings.getInstance().getDataSourceName(); // Default data source
      try {
        dataSource = BareConfiguration.getInstance().getUnmanagedDataSource(dsName);
      } catch (Exception e) {
        throw new RuntimeException("failed to obain datasource",e);
      }
    }

    return dataSource;
  }
  
  @Override
  public CredentialsMatcher getCredentialsMatcher() {
    if(hashSalted) {
      final HashedCredentialsMatcher matcher = new org.apache.shiro.authc.credential.HashedCredentialsMatcher(Sha256Hash.ALGORITHM_NAME);
      matcher.setHashIterations(hashIterations);
      return matcher;
    }else {
      return super.getCredentialsMatcher();
    }
  }

  /**
   * To support hashed passwords with salt we have to load the password + hash from database,
   * so the hash can be recomputed and verified.
   *
   * @param userLogin
   * @return array of: [technical user id, password (string), salt(string)] or null if userLogin is not known; salt can be set to null, if not supported
   */
  protected String[] getAccountCredentials(String userLogin) throws SQLException {
    String stmt = "select "+u_userid+", "+u_password+", "+u_password_salt+" from "+u_table+" where "+u_login+" = ? and "+u_userid+" is not null and (is_disabled is null or is_disabled<>'1')";
    return new QueryRunner(getDataSource(), true).query(stmt, (rs) -> {
      if(rs.next()){
        ArrayList<String> result = new ArrayList<>();
        result.add(rs.getString(1));
        result.add(rs.getString(2));
        String salt = rs.getString(3);
        if(salt != null && salt.trim().isEmpty()){
          salt = null;
        }
        result.add(salt);
        return result.toArray(new String[]{});
      } else {
        return null;
      }
    }, userLogin);
  }

  /**
   * extend support to our implicit authentication token
   */
  @Override
  public boolean supports(AuthenticationToken token) {
    return token instanceof ImplicitAuthenticationToken ?  true : super.supports(token);
  }

  /**
   * we return technical user identifier here so {@link #getPermissions(Connection, String, Collection)} and {@link #getRoleNamesForUser(Connection, String)}
   * work on technical identifier, too.
   */
  @Override
  protected String getAvailablePrincipal(PrincipalCollection pc) {
    Object princ = pc.getPrimaryPrincipal();
    if(princ instanceof PrimaryPrincipal){
      return ((PrimaryPrincipal)princ).getId();
    }
    return princ.toString();
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

      if (token instanceof ImplicitAuthenticationToken) {
        // in case of SSO we do not verify if user exists in local table
        return new SimpleAccount(token.getPrincipal(), token.getCredentials(), getClass().getName());
      } else if (token instanceof UsernamePasswordToken) {
        UsernamePasswordToken upassToken = (UsernamePasswordToken) token;

        String[] credentialInfo = getAccountCredentials(upassToken.getUsername());
        if(credentialInfo != null){
          SimplePrincipalCollection pc = new SimplePrincipalCollection();
          pc.add(new PrimaryPrincipal(credentialInfo[0]), getName());   // technical user-id
          pc.add(upassToken.getUsername(), getName());                  // user-login

          // salted vs. plaintext pass
          if(hashSalted) {
            // use same scheme as in de.businesscode.bcdui.subjectsettings.SecurityHelper.generatePasswordHashSalt(String) tool
            return new SimpleAuthenticationInfo(pc, Hex.decode(credentialInfo[1]), new SimpleByteSource(Hex.decode(credentialInfo[2])));
          } else {
            return new SimpleAuthenticationInfo(pc, credentialInfo[1]);
          }
        }
      } else {
        return null;
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

  /**
   * load roles from db
   */
  protected Set<String> getRoleNamesForUser(Connection con, String userId) throws SQLException {
    final Set<String> roles = new HashSet<String>();
    if (uro_table == null) {
      roles.add("default");
    } else {
      new QueryRunner(true).query(con, "SELECT "+uro_userrole+" FROM "+uro_table+" WHERE " + getDefineJdbcParameter(uro_userid, uro_userid_jdbcType), (rs) -> {
        while(rs.next()){
          roles.add(rs.getString(1));
        }
        return null;
      }, userId);
    }
    return roles;
  }

  /*
   * Return user's permissions
   * Of fe_user_rights use right_type as first part and append right_value as second part if it exists
   *
   * @see org.apache.shiro.realm.jdbc.JdbcRealm#getPermissions(java.sql.Connection, java.lang.String, java.util.Collection)
   * @Override
   */
  protected Set<String> getPermissions(Connection con, String userId, Collection<String> roleNames)
    throws SQLException
  {
    Set<String> permissions = new HashSet<String>();
    String stmt = "select "+ur_righttype+", "+ur_rightvalue+" from "+ur_table+" where " + getDefineJdbcParameter(ur_userid, ur_userid_jdbcType);
    PreparedStatement ps = null;
    ResultSet rs = null;

    try {
      // we dont want to log our JDBC activity
      BcdSqlLogger.setLevel(Level.OFF);

      ps = con.prepareStatement(stmt);
      ps.setString(1, userId);
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
  
  /**
   * Generates a password hash + salt with {@link #DEFAULT_HASH_ITERATIONS} iterations, for use with
   * {@link org.apache.shiro.authc.credential.Sha256CredentialsMatcher}
   *
   * The hash and salt are returned as hex-encoded string, compatible with
   * {@link JdbcRealm}
   *
   * @param plainTextPassword
   * @return [ password hash (hex), password salt (hash) ]
   */
  public static String[] generatePasswordHashSalt(String plainTextPassword, int iterations) {
    ArrayList<String> result = new ArrayList<>();

    RandomNumberGenerator rng = new SecureRandomNumberGenerator();
    ByteSource salt = rng.nextBytes();

    String hashedPassword = new Sha256Hash(plainTextPassword, salt, iterations).toHex();

    result.add(hashedPassword);
    result.add(new SimpleByteSource(salt).toHex());

    return result.toArray(new String[] {});
  }
  
  /**
   * main helper to create passwords interactively or by argument
   * @param args
   * @throws Throwable
   */
  public static void main(String[] args) throws Throwable{
    String clearPasswd = args.length>0?args[0]:null;
    if(clearPasswd==null||clearPasswd.isEmpty()) {
      System.out.println("login passwd:");
      try(BufferedReader br = new BufferedReader(new InputStreamReader(System.in))){
        clearPasswd = br.readLine();
      }
    }
    String salted[]=generatePasswordHashSalt(clearPasswd, DEFAULT_HASH_ITERATIONS);
    System.out.println(String.format("passwd hash:%s\nsalt:%s\n", salted[0], salted[1]));
  }
}