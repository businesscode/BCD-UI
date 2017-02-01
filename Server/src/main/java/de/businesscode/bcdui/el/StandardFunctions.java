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
package de.businesscode.bcdui.el;

import java.text.SimpleDateFormat;
import java.util.Date;

public class StandardFunctions {

  public static final String xmlTimestampFormat = "yyyy-MM-dd'T'HH:mm:ss";
  public static final String xmlDateFormat = "yyyy-MM-dd";

  public static String formatXMLDate(Date date) {
    if (date == null) return null;
    return new SimpleDateFormat(xmlDateFormat).format(date);
  }

  public static String formatXMLTimestamp(Date date) {
    if (date == null) return null;
    return new SimpleDateFormat(xmlTimestampFormat).format(date);
  }

  public static Date parseXMLDate(String date) {
    if (date == null) return null;
    date = date.trim().replace(' ', 'T');
    try {
      if (date.indexOf(':') > 0) {
        return new SimpleDateFormat(xmlTimestampFormat).parse(date);
      }
      return new SimpleDateFormat(xmlDateFormat).parse(date);
    } catch (Exception ex) {
      return null;
    }
  }

  public static Date parseNumberDate(Long date) {
    if (date == null) return null;
    return new Date(date);
  }
}
