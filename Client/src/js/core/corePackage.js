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
"use strict";
/**
 * @fileoverview
 * This file contains the namespace declaration of the bcdui.core namespace and
 * fills it with the constants and utility functions.
 */

/** 
 * <p>
 *
 * This namespace encapsulates consists of the lower layer of BCDUI core
 * functionality. It is composed of three blocks of functionality:
 *                                                                             <dl><dt>
 *   Core Classes                                                              </dt><dd><p>
 *         The core classes are the foundation for most BCDUI objects
 *         on the page. The processes these objects are reflecting are
 *         running  asynchronously and implemented in the form of a
 *         state-machine behaviour. The central interface for these
 *         classes is the {@link bcdui.core.DataProvider} interface.
 *                                                                             </p></dd><dt>
 *   Page Lifecycle Support                                                    </dt><dd><p>
 *         These are functions dealing with the loading of XML and
 *         creating and executing XSLT, provided by the central
 *         {@link bcdui.core.xmlLoader} object. Additionally there
 *         are function for managing page status. This status is
 *         encapsulated in the {@link guiStatus} object which can be
 *         compressed and uncompressed to transport it in URLs and
 *         browser bookmarks.
 *                                                                             </p></dd><dt>
 *   Utility functions                                                         </dt><dd><p>
 *         The core package provides lots of utility functions to
 *         support XML processing, enhance cross-browser compatibility
 *         and to simplify JavaScript development. Most of these
 *         functions are located directly under the bcdui.core namespace.
 *                                                                             </p></dd></dl></p><p>
 * The functions and classes provided here can be used directly or they
 * can be accessed through a higher architecture layer such as the
 * {@link bcdui.factory} namespace.
 *
 * </p>
 * @namespace bcdui.core
 */
bcdui.util.namespace("bcdui.core", 
/** 
 * @lends bcdui.core 
 */
{

  /**
   * This for usage of xapi.
   * Objects created via xapi communicate in javascript with their parents and children via this param bag
   * Each object opens a new level on the stack-like structure. Such a level allows is to register objects for usage of parent and children.
   * For example a cube will register itself as parentdataProvider to the stack level it opened for its children and can itself access for example
   * the model id of a model tag put inside of it
   * @private
   */
  bcdParamBag: [{}],
  
  /**
   * Array for internal namespace support functions.
   * @private
   */
  nsResolvableArray :{},

  // xmlConstants is defined earlier via BCDUIConfig

  /**
   * A boolean flag indicating if the core library is in debug mode or not.
   * @type boolean
   * @constant
   * @private
   */
  _isDebugMode: true,

  /**
   * This constant specifies the name of the URL parameter holding the compressed
   * request document.
   * @type String
   * @constant
   * @private
   */
  _requestDocumentParameterName: "guiStatusGZ",

  /**
   * A boolean value defining if the URL parameter "_requestDocumentParameterName"
   * should be appended as anchor or as regular parameter.
   * @type Boolean
   * @constant
   * @private
   */
  _requestDocumentParameterAsAnchor: false,

  /**
   * The full URL to the webRowSet servlet.
   * @type String
   * @constant
   */
  webRowSetServletPath: bcdui.contextPath + "/bcdui/servlets/WrsServlet",

  /**
   * The full URL to the webRowSet servlet at servletsSessionCached path
   * @type String
   * @constant
   */
  webRowSetServletPathSessionCached: bcdui.contextPath + "/bcdui/servletsSessionCached/WrsServlet",

  /**
   * A debugging function for the core components.
   * @private
   */
  debug: function(/* string */ message) {
    if (bcdui.core._isDebugMode) {
      bcdui.log.debug(message);
    }
  },
  
  /**
   * For generation of temporary "random" but unique ids
   * @private
   */
  _runningTempId: 0,
  /**
   * @private
   */
  _idScopes: {},

  /**
   * @private
   */
  _generateTemporaryId: function( givenId ) {
    if( typeof givenId == "undefined" || givenId==null || givenId=="" )
      return "bcdCId_" + (bcdui.core._runningTempId++);
    else
      return givenId;
  },

  /**
   * @private
   */
  _generateTemporaryIdInScope: function(scope) {
    var runningId = bcdui.core._idScopes[scope] || 0;
    bcdui.core._idScopes[scope] = runningId + 1;
    return scope + runningId;
  },

  /**
   * These are named magic UTF-8 constants, defined by BCD-UI. When referring to it in xml, use &#xE0F0;
   * @namespace
   */
  magicChar: {
    /**
     * Indicates a null dimension value in expressions like "DE|\uE0F0" for DE-total or simple an empty station value
     * @constant
     * @type {string}
     */
    dimEmpty:       "\uE0F0",
    /**
     * Indicates that the null in the expression above stands for a real null in the data
     * @constant
     * @type {string}
     */
    dimNull:        "\uE0F0"+"0",
    /**
     * Indicates that the null in the expression above stands for a null due to aggregation level (grouping=1)
     * @constant
     * @type {string}
     */
    dimTotal:       "\uE0F0"+"1",
    /**
     * Grand total column
     * @constant
     * @type {string}
     */
    measureGTC:     "\uE0F0"+"2C",
    /**
     * Sub total column
     * @constant
     * @type {string}
     */
    measureSTC:     "\uE0F0"+"1C",
    /**
     * Grand total row
     * @constant
     * @type {string}
     */
    measureGTR:     "\uE0F0"+"2R",
    /**
     * Subtotal row
     * @constant
     * @type {string}
     */
    measureSTR:     "\uE0F0"+"1R",

    /**
     * Used when concatenating strings as a separator which cannot (should not) appear in any data
     * @constant
     * @type {string}
     */
    separator:      "\uE0F2",
    /**
     * Used in expressions similar to zin(), i.e. a null should become a value which cannot (should not) appear in any data and is also != separator
     * @constant
     * @type {string}
     */
    nonWord:        "\uE0F3"
  },

  /**
   * Removes XML elements from a DOM document. These XML elements are identified
   * with an XPath.
   * @param {document} doc - The document the XPath specified in the "path"
   * argument is evaluated on.
   * @param {xpath} path - The XPath pointing to the nodes to be removed.
   * @param {boolean} [enableWrsExtensions=true] Set this flag to "true" if the function should treat
   * wrs elements differently (like converting wrs:R to wrs:D instead of removing it).
   * It is "true" by default.
   * @param {boolean} [removeEmptyElements=false] A flag indicating if elements which do not contain any
   * content anymore should be removed. The default value is "false". This is for example
   * very useful when the path is something like /Items/Item/@value and the respective
   * Item elements need to be cleared as well.
   * @return {number} The number of removed nodes.
   * @private
   */
  removeXPath: function(/* XMLDocument | DataProvider */ doc, /* String */ path, /* Boolean? */ enableWrsExtensions, /* Boolean? */ removeEmptyElements)
    {
      var useWrsExtensions = (typeof enableWrsExtensions == "undefined" ? true : enableWrsExtensions);
      doc = bcdui.core._getDocParameter(doc);

      var attrName = path.match("/@\\w+$");
      if (attrName != null) {
        /*
         * Remove attribute nodes
         */
        attrName = attrName[0].substring(2);
        var nodes = doc.selectNodes(path.match("(.*)/@\\w+$")[1] + "[@" + attrName + "]");
        var count = nodes.length;
        for (var i = 0; i < nodes.length; ++i) {
          nodes.item(i).removeAttribute(attrName);
          if (removeEmptyElements && nodes.item(i).selectNodes("text()|@*").length == 0)
            nodes.item(i).parentNode.removeChild(nodes.item(i));
        }
        return count;
      }

      /*
       * Remove elements
       */
      var nodes = Array.from(doc.selectNodes(path));
      var count = 0;

      if (nodes != null && nodes.length > 0) {
        count = nodes.length;
        for (var i = 0; i < nodes.length; ++i) {
          var node = nodes[i];
          var nodeName = (node.baseName || node.localName);
          if (useWrsExtensions && node.namespaceURI == bcdui.core.xmlConstants.namespaces.wrs &&
              (nodeName == "R" || nodeName == "M" || nodeName == "D" || nodeName == "I")) {
            /*
             * Special treatment of wrs:R/M/D/I elements.
             */
            bcdui.wrs.wrsUtil.deleteWrsRow(node);
          } else {
            /*
             * When wrsExtensions are disabled or the nodes are non-wrs elements
             * they are removed immediately.
             */
            if(node.nodeType == 2){// is @
              bcdui.util.xml.getParentNode(node).removeAttribute(node.name);
            }
            else
              node.parentNode.removeChild(node);
          }
        }
      }

      return count;
    },

  /**
   * Removes the xml:base attribute from all XML elements. This is useful for example
   * in FireFox and Chrome, because they do not allow xml:base to occur in XSLT documents.
   * @param {document} doc - The document the xml:base attributes should be removed from.
   * @return {document} The doc passed as argument for convenience.
   * @private
   */
  removeXMLBase: function(/* XMLDocument */ doc)
    {
    Array.from(doc.selectNodes("//*[@*[name() = 'xml:base']]")).forEach(function(element) {
        element.removeAttribute("xml:base");
      });
      return doc;
    },

  /**
   * @private
   */
  setRequestDocumentParameter: function(/* string */ url, /* string */ unEscapedValue)
    {
      return this.setUrlParameter(url, this._requestDocumentParameterName, unEscapedValue, this._requestDocumentParameterAsAnchor);
    },
  
  /**
   * encode parameters into a query-string
   * @return {string} the query string, with encoded parameters; this string does not start with '?'
   */
  createQueryString: function(params){
    return Object.keys(params).map(function(k) {
      return k + "=" + encodeURIComponent(params[k]);
    }).join("&");
  },

  /**
   * Extracts the value of a parameter definition from the URL. For example if
   * the URL is "http://myHost/myApp/myReport.jsp?guiStatusGZ=abc" and the
   * parameterName is "guiStatusGZ" the return value is "abc".
   * @param {string} url The URL containing the parameter.
   * @param {string} parameterName The parameter name.
   * @param {string} [defaultValue=null] The default value when the result would be null.
   * If not specified it returns null if the parameter is not found.
   * @return {string} The value of the parameter or the default value (usually NULL)
   * if the parameter is empty or not found.
   */
  getUrlParameter: function(/* string */ url, /* string */ parameterName, /* string? */ defaultValue)
    {
      var result = new RegExp("[?&#]" + parameterName + "=([^&#]*)").exec(url);
      if (result == null || result.length < 2 || result[1] == null) {
        if (typeof defaultValue == "undefined") return null;
        return defaultValue;
      }
      return result[1];
    },

  /**
   * Replaces a parameter=value definition inside a URL. For example if the
   * url is "/myApp/myReport.jsp?guiStatusGZ=abc&menuId=xyz", the parameterName
   * is "guiStatusGZ" and the unEscapedValue is "newValue" the result will be
   * "/myApp/myReport.jsp?menuId=xyz&guiStatusGZ=newValue". Please note that
   * this function does not preserve the original parameter ordering.
   * <br/>
   * Additionally it can also put parameter definitions in the anchor section of
   * the URL, for example like "/myApp/myReport.jsp?menuId=xyz#guiStatusGZ=bla".
   * @param {string} url The URL where the parameter replacement should be applied.
   * @param {string} parameterName The name of the parameter.
   * @param {string} unEscapedValue The parameter value which must not be escaped.
   * This function escapes it. If this is NULL the parameter definition is removed.
   * @param {boolean} [asAnchor=false] A boolean value (which is false by default)
   * indicating if the parameter definition should be placed in the anchor section
   * of the URL.
   * @param {boolean} [allowMultiple=false] If set to true, allows multiple occurences
   * of parameter (i.e. resulting in a parsed array on the server)
   * @return {string} The transformed URL.
   */
  setUrlParameter: function(url, parameterName, unEscapedValue, asAnchor, allowMultiple)
    {
      // Removes the already existing param=value definition from the URL, in case allowMultiple=false
      var result = !!allowMultiple ? url : url.replace(new RegExp("([?&#])" + parameterName + "(=[^&#]*)?&?"), "$1").replace(new RegExp("[&?]#"), "#");

      if (unEscapedValue != null) {

        // Escape the value
        var value = escape(unEscapedValue);

        var anchorPos = result.indexOf("#");
        if (anchorPos >= 0) {
          // When there is a hash symbol we insert either on the left or on
          // the right side of it.
          if (asAnchor) {
            result = result.substr(0, anchorPos + 1) + parameterName + "=" + value + (result.length - 1 > anchorPos ? "&" : "") + result.substr(anchorPos + 1);
          } else {
            var questionMarkPos = result.indexOf("?");
            if (questionMarkPos >= 0) {
              result = result.substr(0, questionMarkPos + 1) + parameterName + "=" + value + "&" + result.substr(questionMarkPos + 1);
            } else {
              result = result.substr(0, anchorPos) + "?" + parameterName + "=" + value + result.substr(anchorPos);
            }
          }
        } else {
          if (asAnchor) {
            while (result.length > 0 && "&?".indexOf(result.substr(result.length - 1)) >= 0) {
              result = result.substr(0, result.length - 1);
            }
            result = result + "#" + parameterName + "=" + value;
          } else {
            var questionMarkPos = result.indexOf("?");
            var lastCharacter = result.substr(result.length - 1);
            if (questionMarkPos < 0) {
              result = result + "?" + parameterName + "=" + value;
            } else if (lastCharacter == "?" || lastCharacter == "&") {
              result = result + parameterName + "=" + value;
            } else {
              result = result + "&" + parameterName + "=" + value;
            }
          }
        }

      }

      // Remove trailing separator characters
      while (result.length > 0 && "&#?".indexOf(result.substr(result.length - 1)) >= 0) {
        result = result.substr(0, result.length - 1);
      }

      return result;
    },

  /**
   * Splits an XPath string into its top-level parts. For example when the XPath is
   *       /Root/Item[@type = 1]/Value
   * it returns
   *      [ "", "Root", "Item[@type = 1]", "Value" ]
   * The empty initial string comes from the first slash in the xPath. To omit it
   * the "skipStartingSlash" parameter should be set to "true".
   * @param {xpath} The XPath to be split.
   * @param skipStartingSlash True to make the function ignore the leading slash
   * if the XPath has one.
   * @return {Array} The parts the XPath consists of.
   * @private
   */
  splitXPath: function(/* String */ xPath, /* Boolean */ skipStartingSlash)
    {
      var quoteChars = "'\"";
      var result = new Array();
      var currentQuote = "";
      var predicateBracketLevel = 0;
      var pos = 0;

      var currentStr = "";

      while (pos < xPath.length) {
        var c = xPath.charAt(pos++);
        if (c != "/" || currentQuote != "" || predicateBracketLevel > 0) {
          currentStr += c;
          if (pos == xPath.length) {
            result.push(currentStr);
            break;
          }
        }
        if (currentQuote == c) {
          currentQuote = "";
        } else if (currentQuote == "") {
          if (c == "[") {
            ++predicateBracketLevel;
          } else if (c == "]") {
            --predicateBracketLevel;
          } else if (quoteChars.indexOf(c) >= 0) {
            currentQuote = c;
          } else if (c == "/" && predicateBracketLevel == 0) {
            if (pos > 1 || !skipStartingSlash) result.push(currentStr);
            currentStr = "";
          }
        }
      }

      return result;
    },

  /**
   * An auxiliary function for createElementWithPrototype and removeXPath.
   * @param doc The document or the data provider giving the requested document or element.
   * @returns {XMLDocument|XMLElement} The element belonging to the specified param.
   * @private
   */
  _getDocParameter: function(/* XMLDocument | DataProvider */ doc)
    {
      if (typeof doc.isReady != "undefined" && typeof doc.getData != "undefined") {
        /*
         * We assume the "doc" object is a DataProvider. Therefore we use the
         * getData() method to get the actual data from it but only if the
         * DataProvider is ready.
         */
        if (!doc.isReady()) {
          throw new Error("createElementWithPrototype: DataProvider '"+doc.id+"' must be ready for this function.");
        }
        doc = doc.getData();
        if (doc == null) {
          throw new Error("createElementWithPrototype: The data offered by the DataProvider  '"+doc.id+"' is null.");
        }

        if (doc.item && bcdui.util.isFunction(doc.item) && typeof doc.length != "undefined") {
          /*
           * We assume that the "doc" object is an w3c NodeList
           */
          if (doc.length == 0) {
            return null;
          }
          if (doc.length > 1) {
            throw new Error("createElementWithPrototype: The NodeList offered by the DataProvider  '"+doc.id+"' contains more than one (" + doc.length + ") element.");
          }
          /*
           * We take the first (and only) element as base for the xPath.
           */
          return doc.item(0);
        }
      }
      return doc;
    },

  /**
   * Splits an XPath predicate like "wrs:C[1]='abc' and wrs:C[@x='y']='z'" into
   * its parts, divided by the "and" conjunction. The result for the example is
   * the array [wrs:C[1]='abc', wrs:C[@x='y']='z']. It is an auxiliary function
   * for createElementWithPrototype.
   * @param str The string containing the XPath predicate.
   * @return {Array} The xPath predicate split by the "and" conjunction.
   * @private
   */
  splitXPathPredicate: function(/* string */ str)
    {
      var quoteChars = "'\"";
      var result = new Array();
      var currentQuote = "";
      var predicateBracketLevel = 0;
      var pos = 0;

      var currentStr = "";

      while (pos < str.length) {
        var delMatch = this._splitXPathPredicate_DelimiterRegExp.exec(str.substr(pos));
        var isDelimiter = delMatch != null;
        var c = str.charAt(pos++);
        if (delMatch == null || currentQuote != "" || predicateBracketLevel > 0) {
          currentStr += c;
          if (pos == str.length) {
            result.push(currentStr);
            break;
          }
        }
        if (currentQuote == c) {
          currentQuote = "";
        } else if (currentQuote == "") {
          if (delMatch != null && predicateBracketLevel == 0) {
            result.push(currentStr);
            currentStr = "";
            pos += delMatch[0].length - 1;
          } else if (c == "[") {
            ++predicateBracketLevel;
          } else if (c == "]") {
            --predicateBracketLevel;
          } else if (quoteChars.indexOf(c) >= 0) {
            currentQuote = c;
          }
        }
      }

      return result;
    },
    
  /**
   * @private
   */
  _splitXPathPredicate_DelimiterRegExp: new RegExp(/^\s+and\s+|^\s*\]\s*\[\s*/i),

  /**
   * Quotes a string so that it can be used within an XPath for selectNodes /
   * selectSingleNode. For example the string
   *    myValue
   * becomes
   *    'myValue'
   * . The quotes are automatically added so that it is a valid XPath string.
   * @param {xpath} str - The string to be quotes as an XPath string.
   * @returns {xpath} The XPath string representing str.
   */
  quoteXPathString: function(/* String */ str)
    {
      var hasSingleQuote = str.indexOf("'") >= 0;
      if (!hasSingleQuote)
        return "'" + str + "'";
      var hasDoubleQuote = str.indexOf('"') >= 0;
      if (!hasDoubleQuote)
        return '"' + str + '"';
      var parts = str.split("'");
      var resultItems = [];
      for (var i = 0; i < parts.length; ++i) {
        if (i > 0) resultItems.push("\"'\"");
        if (parts[i] != "")
          resultItems.push("'" + parts[i] + "'");
      }
      return "concat(" + resultItems.join(",") + ")";
    },

  /**
   * <p>
   * This function works similar to selectSingleNode in that executes an XPath
   * on a DOMDocument or XML element and returns an XML element. However if the
   * element does not exists it creates XML elements on the XPath so that the XPath
   * returns an element afterwards. For example if the document contains only a root
   * element and the path is
   * <pre>
       /Root/Filter[@name = 'abc']/Item
   * </pre>
   * it does the following:
   * <ol>
   *   <li>create an element "Filter" under the root node,</li>
   *   <li>set an attribute "name" with content "abc" on it,</li>
   *   <li>create an Item under it,</li>
   *   <li>return the Item. So the XPath "/Root/Filter[@name = 'abc']/Item" can be
   *       regarded as an XML prototype that is created if the element does not
   *       exist.</li>
   * </ol>
   * </p>
   * <p>
   * Please note that this function accepts only a very limited set of
   * XPaths because otherwise the inversion of the XPath would be too complicated
   * to be computed. For example it is not allowed to specify "//" in the XPath
   * and the "or" conjunction cannot be used.
   * </p>
   * If you want to modify an existing wrs cell, bcdui.wrs.wrsUtil.setCellValue might be a more convenient function to use.
   * @param {Element} baseElement - The DOM document or the XML element the path is evaluated on.
   * @param {xpath} path - The XPath identifying the element to be retrieved or
   * created.
   * @param {boolean} [enableWrsExtensions=true] Set this flag to "true" if the function should treat
   * wrs elements differently (like converting wrs:R to wrs:M or creating wrs:I
   * elements). It is "true" by default.
   * @return {Element} The XML element to be found under the specified XPath.
   */
  createElementWithPrototype: function(/* XMLDocument | XMLElement | DataProvider */ baseElement, /* String */ path, /* Boolean? */ enableWrsExtensions)
    {
      var useWrsExtensions = (typeof enableWrsExtensions == "undefined" ? true : enableWrsExtensions);
      var baseElement = bcdui.core._getDocParameter(baseElement);

      var node = baseElement.selectSingleNode(path);

      /*
        Translates XPath like
            /Root/Item/@idRef[. = 'TEST']
        into
            /Root/Item[@idRef = 'TEST']
       */
      path = path.replace(this._createElementWithPrototype_Trans, "$1[$2$3]");

      /*
       * If we prodive an element instead of a Document we need to adjust the doc
       * variables so that the Document methods (like createTextNode) can be called.
       */
      var doc = baseElement.ownerDocument || baseElement;

      if (node != null) {
        /*
         * The element already exists. If there are no wrs extensions we can simply
         * return it. Otherwise we must deal with the wrs:R => wrs:M transformation.
         */

        if (useWrsExtensions) {
          /*
           * If the wrs extensions are enabled we need to check if there are any wrs:R
           * elements along the ancestor axis which need to be converted to wrs:M elements.
           */
          var currentElement = node;
          if (currentElement.nodeType == 2) {
            currentElement = bcdui.util.xml.getParentNode(currentElement);
          }
          var hasChanged = false;
          while (currentElement) {
            if ((currentElement.baseName || currentElement.localName) == 'R' && currentElement.namespaceURI == bcdui.core.xmlConstants.namespaces.wrs) {
              /*
               * Rename wrs:R to wrs:M and create the wrs:O elements.
               */
              currentElement = bcdui.util.xml.renameElement(currentElement, "wrs:M");
              bcdui.wrs.wrsUtil.createWrsONodes(currentElement);
              hasChanged = true;
            }
            currentElement = currentElement.parentNode;
          }
          if (hasChanged) {
            /*
             * The reference to "node" is no longer valid since wrs:R has been renamed to wrs:M.
             */
            node = baseElement.selectSingleNode(path);
          }
        }

        return node;
      }

      var pathElementArray = bcdui.core.splitXPath(path, true);
      var currentNode = baseElement;

      for (var i = 0; i < pathElementArray.length; ++i) {
        /*
         * Loop over all parts of the expression.
         */
        var nextNode = currentNode.selectSingleNode(pathElementArray[i]);
        if (nextNode == null) {
          /*
           * The XPath part does not exists so we need to create it.
           */
          var pathElementParts = this._createElementWithPrototype_PredicateFinder.exec(pathElementArray[i]);
          if (pathElementParts != null) {
            /*
             * The XPath part contains a predicate.
             */
            var newNodeName = pathElementParts[1];
            if (newNodeName == "*" || newNodeName == "wrs:*") {
              /*
               * We found a wildcard for a non-existent element.
               */
              if (useWrsExtensions && (currentNode.baseName || currentNode.localName) == "Data" && currentNode.namespaceURI == bcdui.core.xmlConstants.namespaces.wrs) {
                /*
                 * We have a wrs:* in here so we assume that wrs:I should be created, because in
                 * the wrs format new rows are created as wrs:I.
                 */
                newNodeName = "wrs:I";
              } else {
                /*
                 * We have a "*" node name which does not exists and the wrs extensions are
                 * disabled. Since we do not know the new node name we throw an error.
                 */
                throw new Error("Cannot create element with node name '*' in XPath: " + path);
              }
            }
            var completePredicateString = pathElementParts[2];

            if (this._createElementWithPrototype_NumberTester.test(completePredicateString)) {
              /*
               * The predicate is a number, like wrs:*[5]. Then we need to create enough
               * elements until the predicate is fulfilled (here: 5 wrs:I rows). After
               * creating "maxTries" elements we assume that the predicate is broken so
               * that we do not produce inifite loops.
               */
              var maxTries = 1000;
              var requestedElementPath = pathElementArray[i];
              // in case of modification of requestedElementPath we store original value here
              var nextNodeXPath = null;
              /*
               * in case of wrs:C we will pad the exact number of items as defined in wrs:Header/wrs:Columns,
               * otherwise we pad only up to element position requested (backwards compatibility)
               */
              if(currentNode.parentNode.nodeName == "Data" && currentNode.parentNode.parentNode && currentNode.parentNode.parentNode.selectSingleNode("wrs:Header") != null){
                var colSize = currentNode.parentNode.parentNode.selectNodes("wrs:Header/wrs:Columns/wrs:C").length;
                nextNodeXPath = requestedElementPath;
                // replace position index to the max one
                requestedElementPath = requestedElementPath.replace(/\[.+\]/,"[" + colSize + "]")
              }
              while ((nextNode = currentNode.selectSingleNode(requestedElementPath)) == null) {
                var node = bcdui.core.browserCompatibility.appendElementWithPrefix(currentNode, newNodeName);
                if(useWrsExtensions){
                  bcdui.wrs.wrsUtil.repairWrsNode(node);
                }
                if (--maxTries <= 0) {
                  throw new Error("createElementWithPrototype: Array constraint too high: " + requestedElementPath);
                }
              }
              /*
               * in case requestedElementPath was modified we have to reset nextNode to originall requested one
               */
              if(nextNodeXPath){
                nextNode = currentNode.selectSingleNode(nextNodeXPath);
              }
            } else {
              /*
               * The predicate is a list of equality expressions concatenated with "and", like
               *    wrs:C[1] = 'DE' and wrs:C[2] = 'CGN'
               * Therefore we create the new element (wrs:I) and create each predicate part.
               */
              nextNode = bcdui.core.browserCompatibility.appendElementWithPrefix(currentNode, newNodeName);
              if(useWrsExtensions){
                bcdui.wrs.wrsUtil.repairWrsNode(nextNode);
              }
              var predicates = bcdui.core.splitXPathPredicate(completePredicateString);
              for (var predNo = 0; predNo < predicates.length; ++predNo) {
                /*
                 * Loop over all predicate parts; in the above example
                 *    ["wrs:C[1]='DE'", "wrs:C[2]='CGN'"]
                 * Each of the parts (e.g. wrs:C[1]='DE') must be decomposed into
                 * node name, index and assignment value.
                 */

                // if we got a concat xpath part as predicate, we resolve it and concatenate the string on our own
                // this is a concat which was created via dp.write (ending with , '')
                // _getFillParams ensures no ' or " around it, so we add it to make it a real string again
                var matches = /(.*)concat\(('.+, '')\)/g.exec(predicates[predNo]);
                if (matches != null && matches.length == 3)
                  predicates[predNo] = matches[1] + "'" + matches[2].split(",").map(function(e){ return e.trim().substring(1, e.trim().length - 1)}).join("") + "'";

                matches = this._createElementWithPrototype_EqualityExpressionSplitter.exec(predicates[predNo]);
                if (matches == null || matches.length < 6) {
                  throw new Error("createElementWithPrototype: Unrecognized predicate in XPath: " + pathElementArray[i]);
                }
                if (matches[1] == "@") {
                  /*
                   * The predicate is based on an attribute, for example
                   *    @id='DE'
                   */
                  nextNode.setAttribute(matches[2], matches[5].replace(/&quote;/g,'"').replace(/&apos;/g,"'").replace(/&#39;/g,"'"));
                } else if (matches[4]) {
                  /*
                   * The predicate contains an index after the element name, for example
                   *    wrs:C[2] = 'CGN'
                   * Then we must create enough elements to fulfil it and set the content
                   * of one of them.
                   */
                  var targetElement = null;
                  /*
                   * Create elements so that the index constraint is satisfied.
                   */
                  for (var childElementNo = parseInt(matches[4], 10); targetElement == null && childElementNo >= 0; --childElementNo) {
                    targetElement = nextNode.selectSingleNode(matches[2]+matches[3]);
                    if (targetElement == null)
                      bcdui.core.browserCompatibility.appendElementWithPrefix(nextNode, matches[2]);
                  }
                  if (targetElement == null)
                    throw new Error("createElementWithPrototype: Error in predicate in XPath: " + pathElementArray[i]);
                  /*
                   * Set the content of the target element.
                   */
                  targetElement.appendChild(doc.createTextNode(matches[5]));
                } else if (matches[2] == '.' || matches[2] == 'text()') {
                  /*
                   * The predicate is something like
                   *    . = 'abc'
                   * In this case we must add a text node.
                   */
                  nextNode.appendChild(doc.createTextNode(matches[5]));
                } else {
                  /*
                   * In this case we do not have an index on the element name and no attribute
                   * equality, for example
                   *    Value = 'xyz'
                   * Then we simply add the element and set its text content.
                   */
                  bcdui.core.browserCompatibility.appendElementWithPrefix(nextNode, matches[2]).appendChild(doc.createTextNode(matches[5]));
                }
              }

            }
          } else {
            /*
             * We have no predicate on the XPath part so we just need to create the attribute
             * or the element.
             */
            if (pathElementArray[i].substring(0, 1) == "@") {
              /*
               * Create a new attribute.
               */
              var attrName = pathElementArray[i].substring(1);
              currentNode.setAttribute(attrName, "");
              nextNode = currentNode.attributes.getNamedItem(attrName);
            } else {
              /*
               * Create an element. Convert * to wrs:I if appropriate.
               */
              if (useWrsExtensions && (pathElementArray[i] == "*" || pathElementArray[i] == "wrs:*"))
                pathElementArray[i] = "wrs:I";
              nextNode = bcdui.core.browserCompatibility.appendElementWithPrefix(currentNode, pathElementArray[i]);
            }
          }
        } else if (useWrsExtensions && (nextNode.baseName || nextNode.localName) == 'R' && nextNode.namespaceURI == bcdui.core.xmlConstants.namespaces.wrs) {
          /*
           * We found a wrs:R element and since we assume that "createElementWithPrototype" is
           * called before a data modification we convert it to a wrs:M element.
           */
          nextNode = bcdui.util.xml.renameElement(nextNode, "wrs:M");
          bcdui.wrs.wrsUtil.createWrsONodes(nextNode);
        }
        currentNode = nextNode;
      }

      // 'repair wrs:C in wrs:I, fill empty cells with wrs:null or take over reference value if available
      if (currentNode && (currentNode.nodeName == "wrs:I" || (currentNode.parentNode != null && currentNode.parentNode.nodeName == "wrs:I"))) {
        var curNode = currentNode.nodeName == "wrs:I" ? currentNode : currentNode.parentNode;
        if (curNode != null) {
          var columns = curNode.selectNodes("wrs:C");
          for (var c = 0; c < columns.length; c++) {
            if (columns[c].text == "") {
              // in case of available references either use single C for filling or (more than 1 C), we take the second
              // so we got a 'legacy' pos1=caption, pos2=code rule
              var refCList = baseElement.selectNodes("/*/wrs:Header/wrs:Columns/wrs:C[@pos=" + (c + 1) +"]/wrs:References//wrs:Data/*/wrs:C");
              var ref = (refCList.length > 0) ? refCList[refCList.length == 1 ? 0 : 1] : null; 
              if (ref != null)
                columns[c].text = ref.text;
              else
                bcdui.core.browserCompatibility.appendElementWithPrefix(columns[c], "wrs:null");
            }
          }
        }
      }

      return currentNode;
    },

  /**
   * @private
   */
  _createElementWithPrototype_Trans: new RegExp(/(.*)\s*\/\s*(@\w+)\s*\[\s*\.(\s*=\s*[^\]]+)]\s*$/),

  /**
   * This RegExp tests if the specified parameter is a numeric XPath predicate. Supported
   * predicates are numbers and position()=...
   * @private
   */
  _createElementWithPrototype_NumberTester: new RegExp("^\\s*(position\\(\\)\\s*=\\s*)?(-?[0-9]+|last\\(\\)(\\s*[+-]\\s*-?[0-9]+)?)\\s*$"),

  /**
   * A RegExp testing if an XPath part contains a predicate and providing the parts of the
   * XPath (node name and predicate). For example the XPath part
   *     wrs:R[@id = 'abc']
   * matches the RegExp whereas the XPath part
   *     wrs:R
   * without any predicate does not match.
   * @private
   */
  _createElementWithPrototype_PredicateFinder: new RegExp(/^([^\[]+)\[(.+)\]\s*$/),

  /**
   * This RegExp works on an XPath equality expression like
   *    wrs:C[1] = 'DE'
   * and tests if it is compliant with this function. It accepts all expressions
   * which are of this form (with or without a numeric index) and extracts the
   * node name, the optional array index and the comparison value.
   * @private
   */
  _createElementWithPrototype_EqualityExpressionSplitter: new RegExp(/(@?)(\w*:?[\w.-]+|\.|text\(\))\s*(\[\s*(\d+)\s*\])?\s*=\s*['"](.*)['"]/),


  /**
   * Synchronizes the elements the targetXPath points to so that there is one element for each
   * of the values provided. For example when the XPath is
   *     /wrs:Wrs/wrs:Data/wrs:*[wrs:C[1] = 'DE']/wrs:C[2]
   * there is one wrs:R/wrs:I element for each value and the value is in the second column.
   * This method however works also with simpler XPaths like
   *     /Root/Items/Item
   * or
   *     /Root/Items/Item/@value
   * ; in both cases there is one item per value, but it is stored in the item text in the first
   * example and in the value attribute in the second one.
   * @param doc The document the targetXPath is based on.
   * @param targetXPath The XPath pointing to the elements to be synchronized with the values.
   * @param values A string array containing the values to be stored in the elements under the
   * targetXPath.
   * @return {Integer} The number of elements created, modified or deleted by this function.
   * @private
   */
  _syncMultipleValues: function(/* XMLDocument | DataProvider */ doc, /* String */ targetXPath, /* Array */ values)
    {
      // Four examples:
      //
      //   /*/wrs:Data/wrs:*[wrs:C[1] = 'DE']/wrs:C[2]
      //              |                      |
      //              +----------------------+
      //                         +> This node must be copied for each option,
      //                            wrs extensions must be activated
      //
      //     => New Item XPath: /*/wrs:Data/wrs:*[wrs:C[1] = 'DE'][wrs:C[2] = '{$value}']
      //
      //
      //   /*/f:Filter/f:Expression[@bId = 'country' and @op = '=']/@value
      //              |                                            |
      //              +--------------------------------------------+
      //                                  +> This node is copied for each option
      //
      //     => New Item XPath: /*/f:Filter/f:Expression[@bId = 'country' and @op = '='][@value = '{$value}']
      //
      //
      //   /*/MyFilter/Item
      //              |   |
      //              +---+
      //                +> This node is copied for each option
      //
      //  => New Item XPath: /*/wrs:Data/wrs:*[wrs:C[1] = 'DE'][wrs:C[2] = '{$value}']
      //
      //
      //   /*/MyFilter/Item[@country = 'DE']
      //               |                   |
      //               +-------------------+
      //                          +> This node is copied for each option
      //
      //  Result:
      //    There are two cases:
      //      * The XPath ends with either an element with an index (such as wrs:C[2])
      //        or it ends with an attribute (like @value). Since the last XPath component
      //        cannot be copied (it is not possible to have 2 attributes @value or 2
      //        elements wrs:C[2]) its predecessor must be copied for each option.
      //      * Otherwise the last XPath component is copied for each option.

      /*
       * The function works in two steps: remove items that are no longer present and
       * add new items.
       */

      doc = bcdui.core._getDocParameter(doc);
      var opt = Array.from(values).reduce( function(map, v) { map[v] = v; return map; }, {} );
      var modifiedElementCount = 0;

      /*
       * STEP 1:
       *
       *   Loop over all items which are already in the XML and determine if the item
       *   should be kept or deleted. Also make necessary wrs modifications.
       */


      Array.from(doc.selectNodes(targetXPath)).forEach(function (item) {
        var val = item.nodeValue || item.text;
        var parentWrsNodeName = item.nodeType == 1 &&
              item.parentNode.namespaceURI == bcdui.core.xmlConstants.namespaces.wrs ?
                  item.parentNode.baseName || item.parentNode.localName : null;
        if (val in opt) {
          /*
           * Remove the value from the opt list, because it is already in and does
           * not need to be inserted.
           */
          delete opt[val];
          if (parentWrsNodeName == "D") {
            /*
             * The value is already present, but in a deleted row. This row must be
             * restored then.
             */
            bcdui.util.xml.renameElement(item.parentNode, "wrs:R");
            ++modifiedElementCount;
          }
        } else if (!(val in opt)) {
          /*
           * The value is currently present, but not in the new options. Therefore
           * it must be removed.
           */
          if (parentWrsNodeName == null) {
            /*
             * We are not in a wrs so we can just delete it.
             */
            if (item.nodeType == 2) {
              /*
               * Remove element holding the attribute. For example when the XPath is
               *    /Items/Item/@value
               * The element "Item" must be removed with the value instead of just
               * deleting the value attribute from the item.
               */
              var parentElement = bcdui.util.xml.getParentNode(item);
              parentElement.parentNode.removeChild(parentElement);
            } else {
              /*
               * Remove element.
               */
              item.parentNode.removeChild(item);
            }
          } else {
            /*
             * Otherwise we need special wrs handling.
             */
            bcdui.wrs.wrsUtil.deleteWrsRow(item.parentNode);
          }
          ++modifiedElementCount;
        }
      });


      /*
       * STEP 2:
       *
       *   Loop over all new values which are stored in the remaining (non-removed) elements
       *   of the "opt" hash.
       */


      /*
       * First we need to compute the newItemXPathPrefix which is then used to add the new
       * items with createElementWithPrototype.
       */
      var newItemXPathPrefix = "";

      var xPathComponents = bcdui.core.splitXPath(targetXPath);
      var lastComponent = xPathComponents[xPathComponents.length - 1];
      if (this._syncMultipleValues_AttributeOrIndexExpressionTester.test(lastComponent)) {
        /*
         * The last component of the XPath is an attribute or index expression; therefore
         * we need to modify the previous XPath expression with the options.
         * Example XPath
         *     /wrs:Wrs/wrs:Data/wrs:*[wrs:C[1] = 'DE']/wrs:C[2]
         * In this example we cannot create a new wrs:C[2] component in an already existing
         * wrs:*[wrs:C[1] = 'DE'] row. Instead we must create a new row for the wrs:C[2]
         * element.
         * Another example is
         *    /Root/Item/@value
         * where we cannot create a new value attribute for an existing Item, because
         * multiple value attributes are not allowed. Here we must also duplicate the
         * parent element (Item) for each value.
         */
        xPathComponents.pop();
        newItemXPathPrefix = xPathComponents.join("/") + "[" + lastComponent + " = ";
      } else {
        /*
         * When the last XPath component is plain we can duplicate the element itself
         * and append its value as text node.
         * Example XPath:
         *    /Root/Item
         */
        newItemXPathPrefix = xPathComponents.join("/") + "[. = ";
      }

      /*
       * Now we can create the elements.
       */
      for (var val in opt) {
        var newItemXPath = newItemXPathPrefix + bcdui.core.quoteXPathString(val) + "]";
        bcdui.core.createElementWithPrototype(doc, newItemXPath, true);
        ++modifiedElementCount;
      };

      return modifiedElementCount;
    },

   /**
   * @private
   */
  _syncMultipleValues_AttributeOrIndexExpressionTester: new RegExp(/^\s*((\w*\s*:\s*)?\w+\s*\[\s*\d+\s*\]|@\s*\w+)\s*$/),

  /**
   * Registers a callback function to be executed when the browser has finished
   * loading. If the loading has already finished the function is executed
   * immediately.
   * @param {function} fn The function executed as soon as the browser has finished loading.
   */
  ready: function(/* Function */ fn)
    {
      if (bcdui.core.windowLoaded) {
        fn();
      } else {
        jQuery(function() {
          bcdui.core.windowLoaded = true;
          if (bcdui.browserCompatibility.isGecko) {
            /*
             * Firefox swallows all errors thrown in this event handler.
             */
            try {
              fn();
            } catch (e) {
              bcdui.log.error(e);
            }
          } else {
            fn();
          }
        });
      }
    },

    /**
     * Reexecutes the process implemented by the concrete sub-class.
     * @param {Object} obj The abstract executable object which should be reexecuted
     * @param {function} [readyFunction] Function to be executed once on ready status 
     * @param {boolean} [shouldRefresh] Set this parameter to "false" if this method should do nothing when the object is already in the ready status.
     */
    reExecute: function(obj, readyFunction, shouldRefresh) {
      if (typeof readyFunction != "undefined") {
        obj.addStatusListener({
          status: obj.getReadyStatus(),
          onlyOnce: true,
          listener: function() {
            readyFunction();
          }
        });
      }
      obj.execute(shouldRefresh);
    }

}); // namespace

/**
 * Reverse namespace lookup. Find the pre-defined prefix by the long name, i.e. by the URL
 * @example
 *   // ret will be === "wrs"
 *   var ret = bcdui.core.xmlConstants.revNamespaces["http://www.businesscode.de/schema/bcdui/wrs-1.0.0"]
 * @constant
 */
bcdui.core.xmlConstants.revNamespaces = {};
Object.keys(bcdui.core.xmlConstants.namespaces).forEach( function(k) {
  bcdui.core.xmlConstants.revNamespaces[bcdui.core.xmlConstants.namespaces[k]] = k;
});

/*
 * This event observer tracks the status of the "load" flag to support the
 * bcdui.core.ready() function.
 */
window.addEventListener( "load", function() {
  bcdui.log.isTraceEnabled() && bcdui.log.trace("HTML page loading completed");
  bcdui.core.windowLoaded = true;
});


/**
 * @namespace bcdui.component
 */