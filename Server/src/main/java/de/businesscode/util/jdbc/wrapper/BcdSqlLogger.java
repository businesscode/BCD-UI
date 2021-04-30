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
package de.businesscode.util.jdbc.wrapper;

import org.apache.logging.log4j.Level;

/**
 * global switch for internal bcd connection wrapper class, which is not globally exposed.
 * The BcdSqlLogger is for internal usage and may temporary disable sql logging for internal
 * classes, usage:
 *
 * <pre>
 *  BcdSqlLogger.setLevel(Level.TRACE);
 *  try{
 *   ...
 *  } finally {
 *   BcdSqlLogger.reset(); // resets the default level; it is very important to call this method here to prevent threadlocal leaking
 *   ...
 *  }
 * </pre>
 *
 * per default the programmatic switch is always enabled, as user controls sql logging solely via
 * log4j configuration. This flag cascades FALSE yet does not enforce logging in case is disabled
 * by log4j configuration.
 *
 */
public class BcdSqlLogger {
  /*
   * cannot work with soft references here, as the state must be persistent and the caller does not
   * get hard-reference by calling isEnabled(), so that GC can anytime collect our state
   */
  private static final ThreadLocal<Level> level = new ThreadLocal<Level>();

  /**
   * sets the current logging level to use by BcdStatementWrapper to log sqls, until the invocation of {@link #reset()}
   *
   * @param newLevel
   */
  public static void setLevel(Level newLevel) {
    level.set(newLevel);
  }

  /**
   * resets logging switch for current thread, which is usually:enabled
   */
  public static void reset() {
    level.remove();
  }

  /**
   * retrieve current level
   *
   * @param defaultLevel
   * @return the preset level or the defaultLevel if none is preset
   */
  static Level getLevel(Level defaultLevel) {
    final Level ref = level.get();
    return ref == null ? defaultLevel : ref;
  }
}
