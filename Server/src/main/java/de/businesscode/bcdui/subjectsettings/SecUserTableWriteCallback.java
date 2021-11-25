package de.businesscode.bcdui.subjectsettings;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.*;

import org.apache.commons.dbutils.QueryRunner;
import org.apache.commons.dbutils.ResultSetHandler;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.crypto.hash.Sha256Hash;
import org.apache.shiro.subject.Subject;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.exc.BindingNotFoundException;
import de.businesscode.bcdui.binding.write.WriteProcessingCallback;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.sqlengine.SQLEngine;

/**
 * To enable this class, add it as WriteProcessing/Callbacks/Callback/@class to bcd_sec_user BindingSet
 * When writing to bcd_src_user we apply special handling:
 * 1. Real column names of password and salt are not available in the BindingSet, so we set them here (for this one Wrq instance only, the value in BindingSet itself is not touched)
 *    Defaults are 'password' and 'password_salt', can be overwritten in web.xml in shiro as realmBcdJdbc.bcdSecUserPasswordColumnName/.bcdSecUserPasswordSaltColumnName
 * 2. Password column writing is allowed only if
 *    a) the current user has the right given in PARAM_NAME_PERMISSION, which defaults to DEFAULT_PERMISSION, empty means everybody can write, or
 *    b) the old password is also given in an wrs:M and it matches the one currently found in database
 * 3. If BindingItem password_salt is available in the BindingSet, we want the password salted
 *    On write we take the plain text pwd, hash it with salt and store both values. We may need to add the salt column before, if it is not present in the Wrq to the header and each row
 * 4. If password BindingItem is not in the Wrq, or password is empty or equals NO_PASSWORD_GIVEN_VALUE, we remove the column
 */
public class SecUserTableWriteCallback extends WriteProcessingCallback {

  public static final String PARAM_NAME_PERMISSION = "adminRight";
  public static final String DEFAULT_PERMISSION    = "bcdAdmin:Users";
  public static final String NO_PASSWORD_GIVEN_VALUE = "\u2026"; // Horizontal Ellipsis: "…"

  protected boolean pwdInOrigWrq = false;
  protected BindingItem passwordBi, passwordSaltBi;
  protected List<BindingItem> columnsOfCaller, columnsFull, columnsWoPwd;
  protected List<Integer> columnTypesOfCaller, columnTypesFull, columnTypesWoPwd;
  protected Connection con = null;
  protected boolean bsHasSalt = true;
  protected Subject subject = SecurityUtils.getSubject();

  /**
   * Find out where our target columns are (pwd and salt), add salt if it is not present but password is and the BindingSet contains it
   * @throws Exception 
   */
  @Override
  public void endHeader(List<BindingItem> columns, List<Integer> columnTypes, Collection<String> keyColumnNames) throws Exception {

    //---------------------------
    // Password column
    // If password is not part of Wrq, we do not do anything
    int wrqPasswordColIdx = indexOf(columns, JdbcRealm.BCD_SEC_USER_PASSWORD_BINDINGITEM);
    if( wrqPasswordColIdx == -1 ) {
      return;
    }
    pwdInOrigWrq = true;

    //---------------------------
    // Salt column
    // Make sure, salt column is does or now become part of Wrq, if it is part of the BindingSet
    bsHasSalt = bindingSet.hasItem(JdbcRealm.BCD_SEC_USER_PASSWORD_SALT_BINDINGITEM);
    int wrqPasswordSaltColIdx = indexOf(columns, JdbcRealm.BCD_SEC_USER_PASSWORD_SALT_BINDINGITEM);

    // Create the salt BindingItem if we want salted passwords and the column is missing in the request
    if( bsHasSalt && wrqPasswordSaltColIdx == -1 ) {
      try {
        BindingItem bi;
        bi = bindingSet.get(JdbcRealm.BCD_SEC_USER_PASSWORD_SALT_BINDINGITEM);
        columns.add( bi );
        wrqPasswordSaltColIdx = columns.size() - 1;
        columnTypes.add(Types.VARCHAR);
      } catch (BindingNotFoundException e) { /* cannot happen, we just checked it */ }
    }
    
    //---------------------------
    // Set real column names for password and salt
    // We set the real column name of password and salt on a local copy of the BindingItem, which is from now on used for this Wrq
    final String passwordColName = Configuration.getInstance().getConfigurationParameter(JdbcRealm.BCD_SEC_USER_PASSWORD_COLUMN_CONFIG_NAME, JdbcRealm.BCD_SEC_USER_PASSWORD_COLUMN_NAME_DEFAULT);
    final String passwordSaltColName = Configuration.getInstance().getConfigurationParameter(JdbcRealm.BCD_SEC_USER_PASSWORD_SALT_COLUMN_CONFIG_NAME, JdbcRealm.BCD_SEC_USER_PASSWORD_SALT_COLUMN_NAME_DEFAULT);
    passwordBi = new BindingItem(columns.get(wrqPasswordColIdx));
    passwordBi.setColumnExpression(passwordColName); // Overwriting col expr on local copy only
    columns.set(wrqPasswordColIdx, passwordBi);
    if( bsHasSalt ) {
      passwordSaltBi = columns.get(wrqPasswordSaltColIdx);
      passwordSaltBi.setColumnExpression(passwordSaltColName); // Overwriting col expr on local copy only
      columns.set( wrqPasswordSaltColIdx, passwordSaltBi );
    }
    
    //---------------------------
    // Now we create a copy of the columns list with and without the password and possible salt columns for later use
    // To switch row-wise, depending on whether a new password its given
    this.columnsFull = new LinkedList<BindingItem>(columns);
    this.columnTypesFull = new LinkedList<Integer>(columnTypes);
    this.columnsWoPwd = new LinkedList<BindingItem>(columns);
    this.columnTypesWoPwd = new LinkedList<Integer>(columnTypes);
    this.columnsWoPwd.remove(wrqPasswordColIdx);
    this.columnTypesWoPwd.remove(wrqPasswordColIdx);
    int afterPwdRemoveSaltColIdx = indexOf(columnsWoPwd, JdbcRealm.BCD_SEC_USER_PASSWORD_SALT_BINDINGITEM);
    if( afterPwdRemoveSaltColIdx != -1 ) {
      this.columnsWoPwd.remove(afterPwdRemoveSaltColIdx);
      this.columnTypesWoPwd.remove(afterPwdRemoveSaltColIdx);
    }

    //---------------------------
    // Get right db connection
    // columnsOfCaller allows us to manipulate the list which is used by our caller when writing the wrq
    con = Configuration.getInstance().getManagedConnection(bindingSet.getJdbcResourceName());
    columnsOfCaller = columns;
    columnTypesOfCaller = columnTypes;
  }


  /**
   * Salt the password and save the hashed pwd and salt into their columns
   * We are only allowed to write the password, if we have admin rights or provide the old password and change ourselves
   */
  @Override
  public void endDataRow(ROW_TYPE rowType, List<String> cValues, List<String> oValues) throws Exception {

    //-----------------------------------------------------------
    // If password is not part of Wrq, we do not do anything
    if( ! pwdInOrigWrq )
      return;

    //-----------------------------------------------------------
    // If the password is empty, i.e. it is not to be changed
    // Switch to header without password columns and remove the values
    int wrqPasswordColIdx = indexOf(columnsOfCaller, JdbcRealm.BCD_SEC_USER_PASSWORD_BINDINGITEM);
    int wrqPasswordSaltColIdx = indexOf(columnsOfCaller, JdbcRealm.BCD_SEC_USER_PASSWORD_SALT_COLUMN_NAME_DEFAULT);
    if( cValues.get(wrqPasswordColIdx) == null
        || cValues.get(wrqPasswordColIdx).isEmpty()
        || NO_PASSWORD_GIVEN_VALUE.equals(cValues.get(wrqPasswordColIdx)) ) {
      cValues.remove(wrqPasswordColIdx);
      if( rowType.equals(ROW_TYPE.M) )
        oValues.remove(wrqPasswordColIdx);
      int saltIdxAfterPwdDelete = wrqPasswordSaltColIdx - (wrqPasswordSaltColIdx > wrqPasswordColIdx ? 1 : 0);
      if( saltIdxAfterPwdDelete > -1 ) {
        cValues.remove(saltIdxAfterPwdDelete);
        if( rowType.equals(ROW_TYPE.M) )
          oValues.remove(saltIdxAfterPwdDelete);        
      }
      columnsOfCaller.clear();
      columnsOfCaller.addAll(columnsWoPwd);
      columnTypesOfCaller.clear();
      columnTypesOfCaller.addAll(columnTypesWoPwd);
      return;
    }

    //-----------------------------------------------------------
    // Password is not empty
    // Let's check access rights
    if( ! isAllowed(rowType, cValues, oValues, wrqPasswordColIdx) )
      throw new SecurityException("Cannot change password");

    // Switch to header including password columns
    columnsOfCaller.clear();
    columnsOfCaller.addAll(columnsFull);
    columnTypesOfCaller.clear();
    columnTypesOfCaller.addAll(columnTypesFull);

    // If we do not want salting :-(, just pass the password, means, we are done now
    if( wrqPasswordSaltColIdx == -1 )
      return;

    // Otherwise Salt the password and set the values
    String[] pwd_salt = JdbcRealm.generatePasswordHashSalt(cValues.get(wrqPasswordColIdx));
    cValues.set(wrqPasswordColIdx, pwd_salt[0]);
    if( rowType.equals(ROW_TYPE.M) )
      oValues.set(wrqPasswordColIdx, null);
    if( cValues.size() > wrqPasswordSaltColIdx ) {
      cValues.set(wrqPasswordSaltColIdx, pwd_salt[1]);
      if( rowType.equals(ROW_TYPE.M) )
        oValues.set(wrqPasswordSaltColIdx, null);
    } else {
      cValues.add(pwd_salt[1]);
      if( rowType.equals(ROW_TYPE.M) )
        oValues.add(null);
    }
  }

  
  /**
   * Check permissions. Either we are user-admin or are the user itself and know the old password
   * @param cValues
   * @param oValues
   * @return
   * @throws Exception
   */
  protected boolean isAllowed( ROW_TYPE wrqRowType, List<String> cValues, List<String> oValues, int wrqPasswordColIdx ) throws Exception {

    // Check, which permission makes us user admin
    String permissionType = DEFAULT_PERMISSION;
    for( Map<String,String> param: getParams().getParamList() ) {
      permissionType = getParams().getValue( param, PARAM_NAME_PERMISSION, DEFAULT_PERMISSION);
    }
    if( permissionType.isEmpty() )
      return true; 

    //---------------------------
    // Case 1: An admin is allowed inserting and updating now
    Set<String> userAdminRights = SecurityHelper.getPermissions(subject, permissionType);
    if( userAdminRights.size() != 0 )
      return true; 

    //---------------------------
    // Case 2: A user can only change and only his own account

    // Get user login from Wrq
    int wrqUserLoginIdx = indexOf(columnsFull, "user_login");
    String wrqUserLogin = null;
    if( wrqUserLoginIdx != -1 )
      wrqUserLogin = cValues.get(wrqUserLoginIdx);
    if( wrqUserLogin == null || wrqUserLogin.isEmpty() )
      return false; // user id unknown from wrq

    // Modify ourselves?
    if( ! wrqRowType.equals(ROW_TYPE.M) || ! wrqUserLogin.equals(SecurityHelper.getUserLogin(subject)) )
      return false;

    // Find the user in db and get old hashed pwd and salt from database
    ResultSetHandler<String[]> rsh = new ResultSetHandler<String[]>() {
      @Override
      public String[] handle(ResultSet rs) throws SQLException {
        String[] tmp = null;
        if(rs.next()) {
          tmp = new String[2];
          tmp[0]  = rs.getString(1);
          tmp[1] = rs.getString(2);
        }
        return tmp;
      }
    };
    String selectOldPwdSaltSqlRaw = "#set ($t = $bindings.bcd_sec_user) SELECT $t.password, $t.password_salt  FROM $t WHERE $t.user_login- = ?";
    String[] dbPwdSalt = new QueryRunner(true).query(con, new SQLEngine().transform(selectOldPwdSaltSqlRaw), rsh, wrqUserLogin);
    // We have the old pwd in plain text in Wrq, verify it is correct.
    String wrqOldPwd = oValues.get(wrqPasswordColIdx);
    if( dbPwdSalt != null &&  wrqOldPwd != null ) {
      String hashedWrqPassword = new Sha256Hash(wrqOldPwd, dbPwdSalt[2], JdbcRealm.getHashIterations()).toHex();
      if( ! hashedWrqPassword.equals(dbPwdSalt[1]) )
        return false; // Wrong old password
    }

    //---------------------------
    // We passed all tests
    return true;
  }

}
