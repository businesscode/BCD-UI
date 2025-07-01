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

import java.io.Serializable;
import org.apache.shiro.subject.PrincipalCollection;

/**
 * A primary principal, which holds technical user id. This principal may be
 * used by the realm in order to indicate a primary principal, see
 * {@link PrincipalCollection#getPrimaryPrincipal()}. The
 * {@link SecurityHelper#getUserId(org.apache.shiro.subject.Subject)} handles
 * this type.
 */
public class PrimaryPrincipal implements Serializable {
  private static final long serialVersionUID = 1L;
  final String id;
  String userLogin;
  String fullName;
  String email;

  public PrimaryPrincipal(String id, String userLogin, String fullName, String email) {
    this.id = id;
    this.userLogin = userLogin;
    this.fullName = fullName;
    this.email = email;
  }
  public PrimaryPrincipal(String id) {
    this.id = id;
  }

  public String getId() {
    return id;
  }

  public String getFullName() {
    return fullName;
  }

  public void setFullName(String fullName) {
    this.fullName = fullName;
  }

  public String getUserLogin() {
    return userLogin;
  }

  public void setUserLogin(String userLogin) {
    this.userLogin = userLogin;
  }

  public String getEmail() {
    return email;
  }
  public void setEmail(String email) {
    this.email = email;
  }

  @Override
  public String toString() {
    return id;
  }
}
