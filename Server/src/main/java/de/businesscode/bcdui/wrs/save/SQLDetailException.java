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
 * An exception with SQL details, which may not be save to be included in the message to the client
 */
public class SQLDetailException extends Exception
{
  private static final long serialVersionUID = -717057192812741240L;

  public SQLDetailException( String message, Exception e) {
    super(message,e);
  }
}
