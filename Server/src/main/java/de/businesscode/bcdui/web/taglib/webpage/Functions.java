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
package de.businesscode.bcdui.web.taglib.webpage;

import java.util.Collection;

/**
 * Several helpers as jsp functions, find their documentation in webpage.tld
 */
public class Functions {

  private static long currentId = 0;

  public static String newId(String prefix) {
    if (prefix == null || prefix.trim().length() == 0) return "id" + currentId++;
    return prefix.trim() + currentId++;
  }

  public static String jsArray(Object obj) {
    if (obj == null) {
      return "[]";
    }
    if (obj instanceof Collection<?>) {
      Collection<?> col = (Collection<?>) obj;
      StringBuilder result = new StringBuilder();
      result.append('[');
      for (Object item : col) {
        if (result.length() > 1) result.append(',');
        result.append(jsString(item));
      }
      result.append(']');
      return result.toString();
    } else {
      String str = jsString(obj);
      if (str.length() < 3)
        return "[]";
      return "[" + str + "]";
    }
  }

  public static String coalesceJSArray(Object o1, Object o2) {
    String s1 = jsArray(o1);
    if (s1.length() > 2) return s1;
    return jsArray(o2);
  }

  public static String coalesceJSString(Object o1, Object o2) {
    String s1 = jsString(o1);
    if (s1.length() > 2) return s1;
    return jsString(o2);
  }

  public static String coalesceString(Object o1, Object o2) {
    String s1 = makeString(o1);
    if (s1.length() > 0) return s1;
    return makeString(o2);
  }

  public static String quoteJSString(Object obj) {
    if (obj == null) return "\"\"";
    return "\"" + obj.toString().replace("\\", "\\\\").replace("\"", "\\\"").replace("\r\n", "\n").replace("\n", "\\n") + "\"";
  }

  public static String arrayToJsHashMap(Object obj) {
    if (obj == null) return "{}";
    Collection<?> col = (Collection<?>) obj;
    if (col.isEmpty()) {
      return "{}";
    }
    StringBuilder result = new StringBuilder();
    for (Object item : col) {
      String v = item.toString();
      int pos1 = v.indexOf(':');
      int pos2 = v.indexOf('=');
      if (result.length() > 0) result.append(", ");
      if (pos1 > 0 && pos1 < pos2) {
        result.append(v.substring(0, pos1));
        result.append(": ");
        result.append(quoteJSString(v.substring(pos1 + 1)));
      } else {
        if (pos2 < 0) throw new RuntimeException("Broken parameter definition: " + v);
        result.append(v.substring(0, pos2));
        result.append(": { refId: " + quoteJSString(v.substring(pos2 + 1)) + " }");
      }
    }
    return "{ " + result.toString() + " }";
  }

  public static String makeString(Object obj) {
    if (obj == null) {
      return "";
    }
    if (obj instanceof Collection<?>) {
      Collection<?> col = (Collection<?>) obj;
      if (col.isEmpty()) {
        return "";
      }
      Object o = col.iterator().next();
      if (o == null) {
        return "";
      }
      return o.toString().trim();
    }
    if (obj instanceof String) {
      return obj.toString().trim();
    }
    return "";
  }

  public static String jsString(Object obj) {
    return quoteJSString(makeString(obj));
  }

  public static String optionalJsStringParam(String paramName, Object obj) {
    String value = quoteJSString(makeString(obj));
    if (value.length() <= 2) return "";
    return ", " + paramName + ": " + value;
  }

  public static String jsBoolean(Object obj) {
    if (obj == null) return "false";
    if (obj instanceof Boolean) return ((Boolean) obj).toString();
    if (obj instanceof String && "true".equalsIgnoreCase((String) obj)) return "true";
    return "false";
  }

  public static String jsBooleanWithDefault(Object obj, Object defaultValue) {
    if (obj == null) return defaultValue.toString();
    if (obj instanceof Boolean) return ((Boolean) obj).toString();
    if (obj instanceof String && ("true".equalsIgnoreCase(obj.toString()) || "false".equalsIgnoreCase(obj.toString()))) return obj.toString();
    return defaultValue.toString();
  }

  public static String optionalJsBooleanParam(String paramName, Object obj) {
    if( obj==null )
      return "";
    String value = jsBoolean(obj);
    return ", " + paramName + ": " + value;
  }

  public static String stringToJsArray(Object obj) {
    if (obj == null) {
      return "[]";
    }
    StringBuilder result = new StringBuilder();
    result.append('[');
    for (String str : obj.toString().trim().split("\\s+")) {
      if (result.length() > 1)
        result.append(", ");
      result.append(jsString(str));
    }
    result.append(']');
    return result.toString();
  }

  public static String coalesceStringToJsArray(Object o1, Object o2) {
    String s1 = makeString(o1);
    String so1 = stringToJsArray(s1.isEmpty() ? null : s1);
    if (so1.length() > 2) return so1;
    String s2 = makeString(o2);
    return stringToJsArray(s2.isEmpty() ? null : s2);
  }

  public static String optionalJsNumberParam(String paramName, Object obj) {
    if( obj==null )
      return "";
    return ", " + paramName + ":  parseFloat(" + obj.toString() +")";
  }

}
