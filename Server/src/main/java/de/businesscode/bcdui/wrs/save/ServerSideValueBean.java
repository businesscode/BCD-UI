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
package de.businesscode.bcdui.wrs.save;


/**
 * the interface with required API any serverside value bean has to implement, all the convenient API has to return
 * a renderered String suitable to write it to database via DatabaseWriter
 *
 */
public interface ServerSideValueBean {
  /**
   * returns the principal username (as token known to the system user has used for authentication)
   *
   * @return username OR null, in case user is not known
   * @deprecated use {@link #getUserLogin()} instead
   */
  @Deprecated
  String getUserName();
  
  /**
   * returns the string literal the user used to login. To retrieve the technical user-id see {@link #getUserId()}
   * 
   * @return the user login or null, in case user is not known
   */
  String getUserLogin();
  
  /**
   * returns technical user identifier, it does not necessarily is the literal used by user to login
   * into his account, see {@link #getUserLogin()} for this case.
   * 
   * @return the user id or null, in case user is not known
   */
  String getUserId();

  /**
   * @return UUID v4
   */
  String generateUuid();

  /**
   * current session id
   *
   * @return session id or null
   */
  String getSessionId();

  /**
   * the creation stamp of the value bean, this stamp remains stable during lifecycle of this bean
   *
   * @return date rendered as ISO12 w/o timezone: yyyy-MM-dd HH:mm:ss
   */
  String getCreationStamp();
}
