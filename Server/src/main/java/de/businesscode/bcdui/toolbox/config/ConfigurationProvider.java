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
package de.businesscode.bcdui.toolbox.config;

/**
 * configuration provider interface
 *
 */
public interface ConfigurationProvider {
  /**
   * retrieve a (mandatory) parameter or throw exception, also see {@link #getConfigurationParameterOrNull(String)}
   *
   * @param id
   * @return configuration parameter instance
   *
   */
  public Object getConfigurationParameter(String id);

  /**
   * getter for configuration parameter including downcast
   *
   * @param id
   * @param defaultValue
   * @return configuration parameter instance or defaultValue
   *
   * @throws ClassCastException if configurationParameter is not of provided type
   */
  public <T> T getConfigurationParameter(String id, T defaultValue);

  /**
   * retrieve parameter
   *
   * @param id
   * @return configuration parameter instance or NULL
   */
  public Object getConfigurationParameterOrNull(String id);
}
