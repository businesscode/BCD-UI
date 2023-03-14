/*
  Copyright 2010-2022 BusinessCode GmbH, Germany

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
"use strict";
/**
 * Utilities for working with URLs
 * @namespace
 */
bcdui.util.url = 
/** @lends bcdui.util.url */
{
/**
 * This utility function applies a relative URL to a base URL and returns the
 * resulting URL. It is quite useful to compute for example the value of the
 * xml:base attribute of XIncludes, because the xml:base URL it the model's
 * data URL applied to the browser's href. For example if the relativeBaseUrl
 * is "/myProject/reports/myReport.jsp" and the relativeUrl is
 * "../include/data.xml" the result will be "/myProject/include/data.xml".
 * @param {string} relativeBaseUrl - The URL the relativeUrl is based on. This may be a relative or an absolute URL.
 * @param {string} relativeUrl - The relative URL to be resolved.
 * @return {string} The result of applying the relativeUrl to the relativeBaseUrl.
 */
translateRelativeURL: function( relativeBaseUrl,  relativeUrl)
  {
    if (bcdui.util.url.isAbsoluteURL(relativeUrl)) return relativeUrl;
    var resultParts = relativeBaseUrl.split("/");
    var urlParts = relativeUrl.split("/");

    --resultParts.length;

    for (var i = 0; i < urlParts.length; ++i) {
      var part = urlParts[i];
      if (part == "..") {
        if (resultParts.length == 0) {
          for (--i; i + 1 < urlParts.length && urlParts[i + 1] == ".."; ++i) {
            resultParts[resultParts.length] = "..";
          }
        } else {
          --resultParts.length;
        }
      } else if (part != ".") {
        resultParts[resultParts.length] = part;
      }
    }

    var result = "";
    for (var i = 0; i < resultParts.length; ++i) {
      if (i > 0) result += "/";
      result += resultParts[i];
    }

    return result;
  },

/**
 * Converts a relative URL (like ../Ziplet) to a full URL path (like
 * (/myApp/ZipLet), based on the current page location.
 * @param {String} url - The (relative or absolute) url to a full URL path.
 * @return {String} The full URL path which is the absolute URL
 * without the host/protocol/port part, starting with slash.
 */
resolveToFullURLPathWithCurrentURL: function( url)
  {
    if (url.substring(0, 1) == "/") {
      return bcdui.getContextPath().replace(/\/?$/, url);
    }
    return bcdui.util.url.translateRelativeURL(location.pathname, url);
  },

/**
 * Tests if the specified URL is an absolute URL or null. In this case it
 * returns true and false otherwise.
 * @param {string} url The URL to be inspected.
 * @return {boolean} True if the URL is either null or an absolute URL.
 */
isAbsoluteURL: function(url)
  {
    return url == null || url.charAt(0) == '/' || url.indexOf("http://") == 0 || url.indexOf("https://") == 0;
  },

/**
 * Gets the folder containing the document identified by the URL. So if the
 * URL is for example "http://xxxxx/root/data.xml" it returns
 * "http://xxxxx/root/". If the URL is already pointing to a folder (ending
 * with "/") it simply returns this URL.
 * @param {string} url - The URL the folder is computed from.
 * @return {string} The parent folder of the element denoted by the URL or
 * the URL itself if it is already a folder (ending with slash "/").
 */
extractFolderFromURL: function( url)
  {
    if (url == null || !url.trim()) return null;
    url = url.trim();
    if (url.endsWith("/")) return url;
    return url.substring(0, url.lastIndexOf("/") + 1);
  },

/**
 * Resolves a URL with its correct xml:base. To compute the xml:base for the
 * URL it may be necessary to resolve the xml:base with its ancestor xml:base
 * elements unless one of them is an absolute URL.
 * @param {DomElement} DomElement The point where the xml:base resolution should
 * start.
 * @param {string} url The URL to be resolved.
 * @return {string} The URL resolved with all xml:base elements of the element
 * itself and its ancestor elements.
 */
resolveURLWithXMLBase: function( xmlElement, url)
  {
    // Context path
    if( url.startsWith("bcduicp://") )
      return bcdui.config.contextPath + "/" + url.substring(10);

    // Absolute URL
    if (bcdui.util.url.isAbsoluteURL(url)) return url;

    var combinedXmlBase = null;
    for (var element = xmlElement;
         element != null && element.nodeType == 1 &&
         !bcdui.util.url.isAbsoluteURL(combinedXmlBase || ""); element = element.parentNode) {
      var xmlBase = bcdui.util.url.extractFolderFromURL(element.getAttribute("xml:base"));
      if (xmlBase != null) {
        if (combinedXmlBase == null || bcdui.util.url.isAbsoluteURL(xmlBase)) {
          combinedXmlBase = xmlBase;
        } else {
          combinedXmlBase = bcdui.util.url.translateRelativeURL(xmlBase, combinedXmlBase);
        }
      }
    }

    if (url == null) return combinedXmlBase;
    if (combinedXmlBase == null) return url;
    return bcdui.util.url.translateRelativeURL(combinedXmlBase, url);
  }

}; // namespace
