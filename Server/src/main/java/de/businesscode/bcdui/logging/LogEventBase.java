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
package de.businesscode.bcdui.logging;

import org.apache.logging.log4j.message.Message;

/**
 * Base class for all log events that can occur in the frontend and should be logged into the
 * database. Objects of all classes derived from this class should not be logged by class loggers
 * but by virtloggers as defined in the BcdUiApplicationContextListener. Currently the class is
 * empty and is only used for structuring. It can be extended in the future.
 *
 * It needs to implements the {@link org.apache.logging.log4j.message.Message} interface as of Log4J 2.x
 *
 */
public abstract class LogEventBase implements Message {
  private static final long serialVersionUID = 1L;

  @Override
  public String getFormat() {
    return ""; // not needed in our case
  }

  @Override
  public Object[] getParameters() {
    return null; // not needed in our case
  }

  @Override
  public Throwable getThrowable() {
    return null; // not needed in most cases, overriden for example in de.businesscode.bcdui.web.errorLogging.ErrorLogEvent
  }

}
