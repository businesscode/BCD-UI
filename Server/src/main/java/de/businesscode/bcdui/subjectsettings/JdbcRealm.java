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
import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;
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
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.toolbox.config.BareConfiguration;
import de.businesscode.sqlengine.SQLEngine;
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

  // These default column names can be overwritten in web.xml or shiro.ini by setting realmBcdJdbc.passwordColumnName/.passwordSaltColumnName
  // They are not in BindingSet for security reasons
  final static public String BCD_SEC_USER_PASSWORD_BINDINGITEM      = "password";
  final static public String BCD_SEC_USER_PASSWORD_SALT_BINDINGITEM = "password_salt";
  final static public String BCD_SEC_USER_PASSWORD_COLUMN_NAME_DEFAULT      = "password";
  final static public String BCD_SEC_USER_PASSWORD_SALT_COLUMN_NAME_DEFAULT = "password_salt";
  private String passwordColumnName     = BCD_SEC_USER_PASSWORD_COLUMN_NAME_DEFAULT;
  private String passwordSaltColumnName = BCD_SEC_USER_PASSWORD_SALT_COLUMN_NAME_DEFAULT;
  private static String configPasswordColumnName;
  private static String configPasswordSaltColumnName;

  public static final int DEFAULT_HASH_ITERATIONS = 1024;
  private final Logger log = LogManager.getLogger(getClass());

  private static int hashIterations = DEFAULT_HASH_ITERATIONS;

  public JdbcRealm() {
    super();
    this.setPermissionsLookupEnabled(true);
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
    if(isHashSalted()) {
      final HashedCredentialsMatcher matcher = new org.apache.shiro.authc.credential.HashedCredentialsMatcher(Sha256Hash.ALGORITHM_NAME);
      matcher.setHashIterations(hashIterations);
      return matcher;
    }else {
      return super.getCredentialsMatcher();
    }
  }

  /**
   * To support hashed passwords with salt we have to load the password + hash (if salted) from database,
   * so the hash can be recomputed and verified.
   *
   * @param userLogin
   * @return array of: [technical user id, password (string), salt(string)] or null if userLogin is not known; salt can be set to null, if not supported
   */
  protected String[] getAccountCredentials(String userLogin) throws SQLException {
    boolean hashSalted = isHashSalted();
    String stmt = "#set( $k = $bindings.bcd_sec_user ) select $k.user_id-, " + getPasswordColumnName() + (hashSalted ? ", " + getPasswordSaltColumnName()  : "") + " from $k.getPlainTableName() where $k.user_login- = ? and $k.user_id- is not null and ($k.is_disabled- is null or $k.is_disabled-<>'1')";
    return new QueryRunner(getDataSource(), true).query(new SQLEngine().transform(stmt), rs -> {
      if(rs.next()){
        ArrayList<String> result = new ArrayList<>();
        result.add(rs.getString(1));
        result.add(rs.getString(2));
        String salt = hashSalted ? rs.getString(3) : null;
        if(salt != null && salt.trim().isEmpty()){
          salt = null;
        }
        if(hashSalted && salt == null) {
          throw new RuntimeException("salt required but missing.");
        }
        result.add(salt);
        return result.toArray(new String[]{});
      } else {
        return null;
      }
    }, userLogin);
  }

  /**
   * ExternalAuthenticationToken indicates that the authentication has already happened externally
   * We let the user through here.
   */
  @Override
  public boolean supports(AuthenticationToken token) {
    return token instanceof ExternalAuthenticationToken ?  true : super.supports(token);
  }

  /**
   * Return the user-id to be used with  {@link #getPermissions(Connection, String, Collection)} and {@link #getRoleNamesForUser(Connection, String)}
   * If available, we return the technical user id here, we know it exists if we find a PrimaryPrincipal. Otherwise we use the plain user name
   */
  @Override
  protected String getAvailablePrincipal(PrincipalCollection pc) {
    PrimaryPrincipal pp = pc.oneByType(PrimaryPrincipal.class);
    if( pp != null ) return pp.getId();
    else return pc.getPrimaryPrincipal().toString();
  }

  /**
   * Asserts that the submitted AuthenticationToken's credentials match the stored account AuthenticationInfo's credentials, and if not, throws an AuthenticationException.
   * In our case we do not need to verify credentials if it is Windows-SSQ or OAuth, because they are responsible
   */
  @Override
  protected void assertCredentialsMatch(AuthenticationToken token, AuthenticationInfo authInfo) throws AuthenticationException {
    if(!(token instanceof ExternalAuthenticationToken)) {
      super.assertCredentialsMatch(token, authInfo);
    }
  }

  @Override
  protected AuthenticationInfo doGetAuthenticationInfo(AuthenticationToken token) throws AuthenticationException {
    // If SubjectSettings are not to be used for authentication, do not try to authorize
    if (SubjectSettings.getInstance().getAuthentication().getSubjectSettings() == null)
      return null;

    // Otherwise try to verify credentials
    try {
      // we don't want to log our JDBC activity
      BcdSqlLogger.setLevel(Level.OFF);

      // For externally authenticated users (SPNEGO or OAuth for example) we still check for the login_name to be translated
      // into a BCD-UI technical id. If not there, we accept the login name as user id
      // getAvailablePrincipal() will prefer the id but will return the login_name otherwise for later role and permission lookup
      if (token instanceof ExternalAuthenticationToken) {
        String[] credentialInfo = getAccountCredentials(token.getPrincipal().toString());
        if(credentialInfo != null){
          return new SimpleAccount(new PrimaryPrincipal(credentialInfo[0]), null, getName());
        } else {
          return new SimpleAccount(token.getPrincipal(), null, getName());
        }
      } else if (token instanceof UsernamePasswordToken) {
        UsernamePasswordToken upassToken = (UsernamePasswordToken) token;

        String[] credentialInfo = getAccountCredentials(upassToken.getUsername());
        if(credentialInfo != null){
          SimplePrincipalCollection pc = new SimplePrincipalCollection();
          pc.add(new PrimaryPrincipal(credentialInfo[0]), getName());   // technical user-id
          pc.add(upassToken.getUsername(), getName());                  // user-login

          // salted vs. plaintext pass
          if(isHashSalted()) {
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
  @Override
  protected Set<String> getRoleNamesForUser(Connection con, String userId) throws SQLException {
    final Set<String> roles = new HashSet<>();

    BindingItem biUserId = null;
    try { biUserId = getBindingItem("bcd_sec_user_roles", "user_id"); } catch (BindingException e) {
      log.info("JDBC user roles not active, no binding set bcd_sec_user_roles");
    }

    if (biUserId == null) {
      roles.add("default");
    } else {
      try {
        BcdSqlLogger.setLevel(Level.OFF);
        String uroUseridjdbcTypeColExpre = getCustomJdbcType(biUserId);
        String sql = "#set( $k = $bindings.bcd_sec_user_roles ) select $k.user_role- from $k.getPlainTableName() where " + getDefineJdbcParameter(biUserId.getColumnExpression(), uroUseridjdbcTypeColExpre);

        new QueryRunner(true).query(con, new SQLEngine().transform(sql), rs -> {
          while(rs.next()){
            roles.add(rs.getString(1));
          }
          return null;
        }, userId);
      } catch (Exception e) {
        log.error("Error getting user roles from DB.",e);
      } finally {
        BcdSqlLogger.reset();
      }
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
  @Override
  protected Set<String> getPermissions(Connection con, String userId, Collection<String> roleNames)
    throws SQLException
  {
    Set<String> permissions = new HashSet<>();

    BindingItem biUserId = null;
    try { biUserId = getBindingItem("bcd_sec_user_settings", "user_id"); } catch (BindingException e) { log.info("JDBC Authorization not available due to missing binding set bcd_sec_user_settings"); }
  
    if (biUserId != null) {
  
      PreparedStatement ps = null;
      ResultSet rs = null;
  
      try {
        String urUseridjdbcTypeColExpre = getCustomJdbcType(biUserId);
        String sql = "#set( $k = $bindings.bcd_sec_user_settings ) select $k.right_type-, $k.right_value- from $k.getPlainTableName() where " + getDefineJdbcParameter(biUserId.getColumnExpression(), urUseridjdbcTypeColExpre);
  
        // we don't want to log our JDBC activity
        BcdSqlLogger.setLevel(Level.OFF);
  
        ps = con.prepareStatement(new SQLEngine().transform(sql));
        ps.setString(1, userId);
        rs = ps.executeQuery();
        while( rs.next() ) {
          String permission = rs.getString(1);
          if( rs.getString(2)!=null && rs.getString(2).length()!=0 )
            permission = permission+":"+rs.getString(2);
          permissions.add(permission);
        }
      } catch (Exception e) {
        log.error("Error getting subject settings from DB.",e);
      } finally {
        BcdSqlLogger.reset();
  
        Closer.closeAllSQLObjects(rs, ps);
      }
    }
    return permissions;
  }

  /**
   * the super implementation relies here on dataSource
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
   * Convenience method using default number of iterations
   * @param plainTextPassword
   * @param iterations
   * @return
   */
  public static String[] generatePasswordHashSalt(String plainTextPassword) {
    return generatePasswordHashSalt(plainTextPassword, DEFAULT_HASH_ITERATIONS);
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
    String[] salted = generatePasswordHashSalt(clearPasswd, DEFAULT_HASH_ITERATIONS);
    System.out.println(String.format("hash-iterations:%s\npasswd hash:%s\nsalt:%s\n", DEFAULT_HASH_ITERATIONS, salted[0], salted[1]));
  }

  /**
   * These setters are called from Shiro if realmBcdJdbc.#propertyname# are set in web.xml
   * @return
   */
  public void setPasswordColumnName(String passwordColumnsName) {
    JdbcRealm.setConfigPasswordColumnName(passwordColumnsName);
    this.passwordColumnName = passwordColumnsName;
  }
  public String getPasswordColumnName() {
    return this.passwordColumnName;
  }
  public void setPasswordSaltColumnName(String passwordSaltColumnName) {
    JdbcRealm.setConfigPasswordSaltColumnName(passwordSaltColumnName); 
    this.passwordSaltColumnName = passwordSaltColumnName;
  }
  public String getPasswordSaltColumnName() {
    return this.passwordSaltColumnName;
  }
  public void setHashIterations(int hashIterations) {
    JdbcRealm.hashIterations = hashIterations;
  }
  public static int getHashIterations() {
    return JdbcRealm.hashIterations;
  }

  private BindingItem getBindingItem(String bindingSet, String bindingItem) throws BindingException {
    Collection<String> c = new LinkedList<>();
    c.add(bindingItem);
    BindingSet bs = Bindings.getInstance().get(bindingSet, c);
    return bs.get(bindingItem);
  }
  
  private boolean isHashSalted() {
    try { getBindingItem("bcd_sec_user", "password_salt"); } catch (BindingException e) { return false; }
    return true;
  }

  public static String getConfigPasswordColumnName() {
    return configPasswordColumnName;
  }

  public static void setConfigPasswordColumnName(String configPasswordColumnName) {
    JdbcRealm.configPasswordColumnName = configPasswordColumnName;
  }

  public static String getConfigPasswordSaltColumnName() {
    return configPasswordSaltColumnName;
  }

  public static void setConfigPasswordSaltColumnName(String configPasswordSaltColumnName) {
    JdbcRealm.configPasswordSaltColumnName = configPasswordSaltColumnName;
  }

}