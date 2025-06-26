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

import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.Set;
import java.util.stream.Collectors;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authc.AuthenticationInfo;
import org.apache.shiro.authz.AuthorizationInfo;
import org.apache.shiro.authz.Permission;
import org.apache.shiro.mgt.DefaultSecurityManager;
import org.apache.shiro.realm.AuthorizingRealm;
import org.apache.shiro.realm.BcdShiroHelper;
import org.apache.shiro.session.Session;
import org.apache.shiro.subject.PrincipalCollection;
import org.apache.shiro.subject.Subject;

import de.businesscode.bcdui.subjectsettings.config.Security;
import de.businesscode.bcdui.subjectsettings.config.Security.Operation;

/**
 * helper to evaluate shiro security on {@link Security} settings
 */
public class SecurityHelper {

  private static Logger log = LogManager.getLogger(SecurityHelper.class);

  /**
   * checks current security context of the user for given operation. Security
   * is retrieved via SecurityUtils provided by shiro. Please read specification
   * in subjectsettings.xsd
   *
   * @param security
   *          to check against
   * @param forOperationName
   *          for operation name (which must be defined in security)
   * @throws SecurityException
   * @throws NoPermissionException
   */
  public static void checkSecurity(Security security, String forOperationName) throws SecurityException {
    checkSecurity(security, forOperationName, true);
  }

  /**
   * checks current security context of the user for given operation. Security
   * is retrieved via SecurityUtils provided by shiro. Please read specification
   * in subjectsettings.xsd
   *
   * @param security
   *          to check against
   * @param forOperationName
   *          for operation name
   * @param operationNameMandatory
   *          if true, and operation name is not found in security, a SecurityException is thrown, otherwise execution passes
   * @throws SecurityException
   * @throws NoPermissionException
   */
  public static void checkSecurity(Security security, String forOperationName, boolean operationNameMandatory) throws SecurityException {
    if(security == null){
      throw new SecurityException("Security configuration missing, attempted to check operation name " + forOperationName);
    }

    Subject subject = SecurityUtils.getSubject();

    if(subject == null || !subject.isAuthenticated()){
      throw new SecurityException("Attempted to check operation name " + forOperationName + ", but the user is not authenticated!");
    }

    Operation op = findOperation(security, forOperationName);
    // no operation yet is mandatory, means exception
    if(op == null){
      if(operationNameMandatory){
        throw new SecurityException("Configuration for Operation " + forOperationName + " is missing");
      } else {
        return; // operation is not secured: pass
      }
    }

    // blank permission means: pass, otherwise check each separated by ' '
    if(!op.getPermission().isEmpty()){

      // for performace' sake used detailed infos in debug mode only

      if(log.isDebugEnabled()){
        String perms[] = op.getPermission().split(" ");
        boolean result[] = subject.isPermitted(perms);
        StringBuilder sb = new StringBuilder();
        for(int i=0;i<result.length;i++){
          if(!result[i]){
            sb.append(perms[i]);
            sb.append(" ");
          }
        }
        // ok got some permission user does not have
        if(sb.length()>0){
          // format
          sb.setLength(sb.length()-1);
          // throw exception
          throw new NoPermissionException(security, forOperationName, sb.toString());
        }
      }else{
        if(!subject.isPermittedAll(op.getPermission().split(" "))){
          throw new NoPermissionException(security, forOperationName, "[available in Debug mode enabled]");
        }
      }
    }
  }

  /**
   * @return shiro's {@link Session} or null if no exits, does not create a session if there is none
   */
  public static Session getSession(){
    Subject subject = SecurityUtils.getSubject();
    if(subject !=null){
      return subject.getSession(false);
    }
    return null;
  }

  /**
   *
   * @param security
   * @param operationName
   * @return TRUE if operation definition for operationName is found in security
   */
  public static boolean hasOperation(Security security, String operationName){
    return findOperation(security, operationName)!=null;
  }

  /**
   *
   * @param security
   * @param operationName
   * @return Operation object for given operationName from Security or NULL if none found
   */
  public static Operation findOperation(Security security, String operationName){
    for(Operation op : security.getOperation()){
      if(operationName.equals(op.getName())){
        return op;
      }
    }
    return null;
  }
  
  /**
   * Returns a principal used by user to login into the system or any first principal made available
   * by the realm. Also see {@link #getUserId(Subject)}
   *
   * @param subject
   * @return user login or null if either no subject provided or no such princpial found or subject is not authenticated
   */
  public static String getUserLogin(Subject subject){
    if(subject == null || !subject.isAuthenticated()){
      return null;
    }
    // our Jdbc principal sets the login as string and any other realms set principals as string, too.
    PrincipalCollection pc = subject.getPrincipals();
    final String princ;
    if(pc == null){
      Object p = subject.getPrincipal();
      princ = p == null ? null : p.toString();
    } else {
      PrimaryPrincipal pp = pc.oneByType(PrimaryPrincipal.class);
      if( pp != null ) princ = pc.oneByType(PrimaryPrincipal.class).getUserLogin();
      else princ = pc.byType(String.class).iterator().next();
    }
    if(princ == null){
      throw new RuntimeException("Authenticated subject but no principal found.");
    }
    return princ;
  }

  /**
   * Returns a primary principal by sense of shiro's primary principle. When using {@link JdbcRealm} this
   * is the technical user id. If you use any other realm the value returned by this method would equal
   * to {@link #getUserLogin(Subject)}
   *
   * @param subject
   * @return user identifier or null if either no subject provided or no such princpial found or subject is not authenticated
   */
  public static String getUserId(Subject subject){
    if(subject == null || !subject.isAuthenticated()){
      return null;
    }
    PrincipalCollection pc = subject.getPrincipals();
    final Object princ;
    if(pc == null){
      princ = subject.getPrincipal();
    } else {
      princ = pc.getPrimaryPrincipal();
    }
    if(princ == null){
      throw new RuntimeException("Authenticated subject but no principal found.");
    }
    if(princ instanceof PrimaryPrincipal){ // may not be available when using other realm
      return ((PrimaryPrincipal)princ).getId();
    } else {
      return princ.toString();
    }
  }

  /**
   * Returns a primary principal by sense of shiro's primary principle. When
   * using {@link JdbcRealm} this is the technical user id. If you use any other
   * realm the value returned by this method would equal to
   * {@link #getUserLogin(Subject)}
   *
   * @param authInfo
   * @return user identifier or null if either no authInfo provided or no
   *         principals found or no primary principal found
   */
  public static String getUserId(AuthenticationInfo authInfo) {
    if (authInfo == null){
      return null;
    }
    PrincipalCollection pc = authInfo.getPrincipals();
    final Object princ;
    if (pc == null) {
      return null;
    } else {
      princ = pc.getPrimaryPrincipal();
    }
    if (princ == null) {
      return null;
    }
    if (princ instanceof PrimaryPrincipal) { // may not be available when using other realm
      return ((PrimaryPrincipal) princ).getId();
    } else {
      return princ.toString();
    }
  }

  /**
   * retrieve list of permissions for given type on the subject.
   *
   * @param subject
   *          the subject must be authenticated
   * @param permissionType
   *          to retrieve permissions for or NULL in order to retrieve full permission set, in such a case
   *          the permissions are returned as they are (with full permission domain)
   * @return empty/non-empty set of permissions
   *
   * @throws SecurityException
   *           in case the subject is not authenticated
   */
  public static Set<String> getPermissions(Subject subject, String permissionType) {
    return extractFromAuthorizationInfo(subject, (ai, set) -> {
      // combine string and object permissions
      // geo:country:de, geo:country:*, foo:bar
      Collection<String> stringPerms = ai.getStringPermissions();
      {
        final Collection<Permission> objPerms = ai.getObjectPermissions();
        if(objPerms != null) { // combine to stringPerms
          if(stringPerms == null) {
            stringPerms = new LinkedList<>();
          }
          stringPerms.addAll(objPerms.stream().map(p->p.toString()).collect(Collectors.toCollection(LinkedList::new)));
        }
      }
      // empty perms-set
      if(stringPerms == null || stringPerms.isEmpty()){
        return;
      }
      if(permissionType == null) {
        set.addAll(stringPerms); // add all as they are
      } else {
        stringPerms.stream().filter(p -> p.startsWith(permissionType + ":")).forEach(p -> {
          // remove permissiontype followed by colon
          set.add(p.substring(permissionType.length() + 1));
        });
      }
    });
  }

  /**
   * retrieve list of roles on the subject.
   *
   * @param subject
   *          the subject must be authenticated
   * @return empty/non-empty set of permissions
   *
   * @throws SecurityException
   *           in case the subject is not authenticated
   */
  public static Set<String> getRoles(Subject subject) {
    return extractFromAuthorizationInfo(subject, (ai, set) -> {
      Collection<String> roles = ai.getRoles();
      if (roles != null) {
        set.addAll(ai.getRoles());
      }
    });
  }

  @FunctionalInterface
  private static interface InfoCollector {
    /**
     * collect desired information from {@link AuthorizationInfo} into set
     * @param ai
     * @param set
     */
    void collect(AuthorizationInfo ai, Set<String> set);
  }

  /**
   * general method to collect information from {@link AuthorizationInfo} on a provided subject
   * using {@link InfoCollector}. This method heavily utilizes internals of Shiro framework via reflection as Shiro do not
   * provide such an interface to retrieve collection of permissions.
   *
   * @param subject
   * @param collector
   * @return
   */
  private static Set<String> extractFromAuthorizationInfo(Subject subject, InfoCollector collector) {
    if (!subject.isAuthenticated()) {
      throw new SecurityException("subject is not authenticated");
    }
    final PrincipalCollection principals = subject.getPrincipals();
    DefaultSecurityManager dsm = (DefaultSecurityManager) SecurityUtils.getSecurityManager();

    Set<String> valueSet = new HashSet<>();

    try {
      dsm.getRealms().stream().filter(r -> r instanceof AuthorizingRealm).forEach(r -> {
        final Object queryResult = BcdShiroHelper.getAuthorizationInfo((AuthorizingRealm)r, principals);
        // no AuthorizationInfo returned
        if(queryResult == null){
          return;
        }
        if (queryResult instanceof AuthorizationInfo) {
          collector.collect( (AuthorizationInfo) queryResult, valueSet);
        } else {
          throw new RuntimeException("query-result is not of compatible type: " + queryResult.getClass().getName());
        }
      });
    } catch (Exception e) {
      throw new RuntimeException("failed to retrieve permissions", e);
    }
    return valueSet;
  }
}