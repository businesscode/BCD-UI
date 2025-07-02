/*
  Copyright 2010-2025 BusinessCode GmbH, Germany

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
import org.apache.shiro.authc.SimpleAuthenticationInfo;
import org.apache.shiro.authc.UsernamePasswordToken;
import org.apache.shiro.authc.credential.CredentialsMatcher;
import org.apache.shiro.authc.credential.HashedCredentialsMatcher;
import org.apache.shiro.authz.AuthorizationInfo;
import org.apache.shiro.lang.codec.Hex;
import org.apache.shiro.crypto.RandomNumberGenerator;
import org.apache.shiro.crypto.SecureRandomNumberGenerator;
import org.apache.shiro.crypto.hash.Sha256Hash;
import org.apache.shiro.subject.PrincipalCollection;
import org.apache.shiro.subject.SimplePrincipalCollection;
import org.apache.shiro.lang.util.ByteSource;
import org.apache.shiro.lang.util.SimpleByteSource;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.toolbox.config.BareConfiguration;
import de.businesscode.sqlengine.SQLEngine;
import de.businesscode.util.jdbc.Closer;
import de.businesscode.util.jdbc.wrapper.BcdSqlLogger;

/**
 * Used by shiro framework for retrieving authentication and authorization from the database
 * Relies on bcd_sec_user and bcd_sec_user_settings BindingSets providing support for plaintext (backwards compatibility)
 * and salted/hashed passwords using SHA256 hashing. The default hash iteration is 1024 and can be adjusted in shiro ini by setting
 * .hashIterations property. The default mode is hashed/salted, which can be disabled by not having a binding item password_salt in bcd_sec_user
 * in shiro configuration when declaring this realm. When creating new password please use {@link #generatePasswordHashSalt(String, int)}
 * method of this class.
 * Beside user authenticated here against bcd_sec_user,
 * we attach authorization in form of permissions from bcd_sec_user_settings here to those users
 * as well as to users authenticated with ExternalAuthenticationToken as created by OAut
 */
public class JdbcRealm extends org.apache.shiro.realm.jdbc.JdbcRealm {

  // These default column names can be overwritten in web.xml or shiro.ini by setting realmBcdJdbc.passwordColumnName/.passwordSaltColumnName
  // They are not in BindingSet for security reasons
  final static public String BCD_SEC_USER_PASSWORD_BINDINGITEM      = "password";
  final static public String BCD_SEC_USER_PASSWORD_SALT_BINDINGITEM = "password_salt";
  final static public String BCD_SEC_USER_PASSWORD_COLUMN_NAME_DEFAULT      = "password";
  final static public String BCD_SEC_USER_PASSWORD_SALT_COLUMN_NAME_DEFAULT = "password_salt";
  public static final String REGEXP_EMAIL = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$";
  private String passwordColumnName     = BCD_SEC_USER_PASSWORD_COLUMN_NAME_DEFAULT;
  private String passwordSaltColumnName = BCD_SEC_USER_PASSWORD_SALT_COLUMN_NAME_DEFAULT;
  private static String configPasswordColumnName;
  private static String configPasswordSaltColumnName;
  protected final HashedCredentialsMatcher hashedCredentialsMatcher;
  public static final int DEFAULT_HASH_ITERATIONS = 1024;
  private final Logger log = LogManager.getLogger(getClass());

  private static int hashIterations = DEFAULT_HASH_ITERATIONS;

  public JdbcRealm() {
    super();
    this.setPermissionsLookupEnabled(true);
    hashedCredentialsMatcher = new org.apache.shiro.authc.credential.HashedCredentialsMatcher(Sha256Hash.ALGORITHM_NAME);
    hashedCredentialsMatcher.setHashIterations(hashIterations);
  }

  /**
   * Support for type-name=OTHER, cust:type-name=uuid
   *
   * @param bindingItem
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
        throw new RuntimeException("failed to obtain datasource",e);
      }
    }

    return dataSource;
  }

  /**
   * Shiro will use this to compare the AuthenticationToken from the request with the AuthenticationInfo from our system
   * @return
   */
  @Override
  public CredentialsMatcher getCredentialsMatcher() {
    if(isHashSalted()) {
      return hashedCredentialsMatcher;
    }else {
      return super.getCredentialsMatcher();
    }
  }

  public record PrincipalInfo(String userId, String fullName, String password, String salt) {}
  /**
   * To support hashed passwords with salt we have to load the password + hash (if salted) from database,
   * so the hash can be recomputed and verified.
   *
   * @param userLogin
   * @param enforceSalt
   * @return array of: [technical user id, password (string), salt(string)] or null if userLogin is not known; salt can be set to null, if not supported
   */
  protected PrincipalInfo getPrincipalInfo(String userLogin, boolean enforceSalt) throws SQLException {
    boolean hashSalted = isHashSalted();
    String stmt = String.format("""
        #set( $k = $bindings.bcd_sec_user ) 
        select $k.user_id_, $k.name_, %s %s
        from $k.getPlainTableName() 
        where $k.user_login_ = ? and $k.user_id_ is not null and ($k.is_disabled_ is null or $k.is_disabled_<>'1')""", 
        getPasswordColumnName(), hashSalted ? ", "+getPasswordSaltColumnName() : "");
    return new QueryRunner(getDataSource(), true).query(new SQLEngine().transform(stmt), rs -> {
      if(rs.next()){
        String salt = hashSalted ? rs.getString(4) : null;
        if(salt != null && salt.trim().isEmpty()) salt = null;
        // Unless we authenticate from external, we enforce a pwd-salt being set if binding item is present for security reasons
        if(enforceSalt && hashSalted && salt == null) {
          throw new RuntimeException("salt required but missing.");
        }
        PrincipalInfo acc = new PrincipalInfo(rs.getString(1), rs.getString(2), rs.getString(3), salt);
        return acc;
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
   * In doGetAuthenticationInfo() if possible we set user_id and user_name as principals for AuthenticationInfo
   * Return the user-id to be used with  {@link #getPermissions(Connection, String, Collection)} and {@link #getRoleNamesForUser(Connection, String)}
   * If available, we return the technical user id here, we know it exists if we find a PrimaryPrincipal. Otherwise we use the plain user name
   * As Shiro requires (in 2025) String username = (String) getAvailablePrincipal(principals); and does not use toString(), we need this adapter.
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

  /**
   * Retrieve AuthenticationInfo as stored in the system (db) for later comparison with AuthenticationToken
   * @param token
   * @return
   * @throws AuthenticationException
   */
  @Override
  protected AuthenticationInfo doGetAuthenticationInfo(AuthenticationToken token) throws AuthenticationException {
    // If SubjectSettings are not to be used for authentication, do not try to authorize
    if (SubjectSettings.getInstance().getAuthentication().getSubjectSettings() == null)
      return null;

    // Otherwise try to verify credentials
    try {
      // we don't want to log our JDBC activity
      BcdSqlLogger.setLevel(Level.OFF);

      // For external authentication like OAuth we rely on that realm will have handled the lookup of the user_id and the authentication validation
      // Including creation of AuthenticationInfo and thus of a login
      // Note: Permissions below will still be added based on the userId given there
      if (token instanceof ExternalAuthenticationToken) {
        return null;
      } else if (token instanceof UsernamePasswordToken upassToken) {
        PrincipalInfo acc = getPrincipalInfo(upassToken.getUsername(), true);
        if(acc != null){
          SimplePrincipalCollection pc = new SimplePrincipalCollection();
          String email = upassToken.getUsername().matches(REGEXP_EMAIL) ? upassToken.getUsername() : null;
          PrimaryPrincipal pp = new PrimaryPrincipal(acc.userId, upassToken.getUsername(), acc.fullName, email);
          pc.add(pp, getName()); // This becomes the getPrimaryPrincipal(), if we are the first Realm in the chain to provide one

          // salted vs. plaintext pass
          if(isHashSalted()) {
            // use same scheme as in de.businesscode.bcdui.subjectsettings.SecurityHelper.generatePasswordHashSalt(String) tool
            return new SimpleAuthenticationInfo(pc, Hex.decode(acc.password), new SimpleByteSource(Hex.decode(acc.salt)));
          } else {
            return new SimpleAuthenticationInfo(pc, acc.password);
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
        String sql = "#set( $k = $bindings.bcd_sec_user_roles ) select $k.user_role_ from $k.getPlainTableName() where " + getDefineJdbcParameter("$k.user_id_", uroUseridjdbcTypeColExpre);

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
   * Of bcd_sec_user_settings use right_type as first part and append right_value as second part if it exists
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
        String sql = "#set( $k = $bindings.bcd_sec_user_settings ) select $k.right_type_, $k.right_value_ from $k.getPlainTableName() where " + getDefineJdbcParameter("$k.user_id_", urUseridjdbcTypeColExpre);
  
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
      System.out.println("Enter value:");
      try(BufferedReader br = new BufferedReader(new InputStreamReader(System.in))){
        clearPasswd = br.readLine();
      }
    }
    String[] salted = generatePasswordHashSalt(clearPasswd, DEFAULT_HASH_ITERATIONS);
    System.out.println(String.format("hash-iterations:%s\nhash:%s\nsalt:%s\n", DEFAULT_HASH_ITERATIONS, salted[0], salted[1]));
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