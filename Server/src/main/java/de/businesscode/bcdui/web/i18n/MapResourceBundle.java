/*
  Copyright 2010-2018 BusinessCode GmbH, Germany

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
package de.businesscode.bcdui.web.i18n;

import java.util.Collections;
import java.util.Enumeration;
import java.util.Locale;
import java.util.Map;
import java.util.ResourceBundle;

/**
 * A {@link ResourceBundle} backed by a {@link Map}
 *
 */
class MapResourceBundle extends ResourceBundle {
  private final Map<String, String> keyMap;
  private final Locale locale;

  MapResourceBundle(Locale locale, Map<String, String> keyMap) {
    this.keyMap = keyMap;
    this.locale = locale;
  }

  @Override
  public Locale getLocale() {
    return locale;
  }

  @Override
  public Enumeration<String> getKeys() {
    return Collections.enumeration(keyMap.keySet());
  }

  @Override
  protected String handleGetObject(String key) {
    return keyMap.get(key);
  }

  /**
   * 
   * @return true if this resource bundle does not contain any key
   */
  public boolean isEmpty() {
    return keyMap.isEmpty();
  }
}
