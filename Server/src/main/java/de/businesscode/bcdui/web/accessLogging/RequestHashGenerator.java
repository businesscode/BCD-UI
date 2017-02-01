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

package de.businesscode.bcdui.web.accessLogging;

import javax.servlet.http.HttpServletRequest;

public class RequestHashGenerator {

  public static final String X_HTTP_HEADER_PAGE    = "X-BCD.pageHash";
  public static final String X_HTTP_HEADER_REQUEST = "X-BCD.requestHash";

  /**
   * @param request
   * @return a unique (not strictly) number based on hashing a cleaned up referer or a random number
   */
  public static String generateHash(HttpServletRequest request) {
    String addOn = request.getSession(false) != null ? request.getSession(false).getId() : "-";
    String url = request.getHeader("Referer");
    if (url == null)
      return addOn;
    int x = url.indexOf("//");
    url = x != -1 ? url.substring(x + 2) : url;
    int y = url.indexOf("/");
    url = x != -1 && y != -1 ? url.substring(y) : url;
    int z = url.indexOf("#");
    url = z != -1 ? url.substring(0, z) : url;
    url = "" + (url + addOn).hashCode();
    return url;
  }
}
