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

import org.apache.shiro.authc.AuthenticationToken;

/**
 * this token is used in conjuction to {@link AuthenticationFilter} which
 * authenticates a subject by any different scheme, i.e. SPNEGO
 */
public class ImplicitAuthenticationToken implements AuthenticationToken {
  private static final long serialVersionUID = 1L;

  // TODO: we should probably use java.security.Principal here for full flexibility
  private final String principal;

  public ImplicitAuthenticationToken(String principal) {
    this.principal = principal;
  }

  @Override
  public String getCredentials() {
    return principal;
  }

  @Override
  public String getPrincipal() {
    return principal;
  }
}
