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
 * This file contains all the functions for encoding and decoding status
 * documents. It can either encode or decode on the client if the document
 * is small enough or use the ZipLet on the server if better compression
 * is needed.
 * Please note that this package requires the ZipLet to be registered at /bcdui/servlets/ZipLet.
 */

/**
 * @namespace
 */
bcdui.core.compression = {

  /**
   * The URL the ZipLet is Served from. This URL is used when the document to be
   * decoded has server-side compression or when the encoding process on the client
   * is not effective enough.
   * @private
   * @type String
   */
  _zipLetURL: "/bcdui/servlets/ZipLet",

  /**
   * @private
   */
  _zipLetURLLimit: 1900,

  /**
   * This variable contains 64 characters used for encoding the status document.
   * These characters are special in that they do not need to be escaped when
   * they are put in a URL. Therefore they are especially useful for any encoding.
   * @see #_encodeString
   * @see #_decodeString
   * @see #_encodeStringWithAlphabetMapping
   * @see #_decodeStringWithAlphabetMapping
   * @type string
   * @constant
   * @private
   */
  _b64ToChar: "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_",

  /**
   * Auxiliary function returning true if the specified character is a whitespace.
   * @param {char} c The character to be tested.
   * @return {boolean} True if c is a whitespace character.
   * @private
   */
  _isWhitespace: function(/* char */ c)
    {
      return c == " " || c == "\n" || c == "\t" || c == "\r";
    },

  /**
   * Auxiliary function testing if the specified character is a digit (between 0 and 9).
   * @param {char} c The character to be tested.
   * @return {boolean} True if c is a digit.
   * @private
   */
  _isDigit: function(/* char */ c)
    {
      return (c >= 48 && c <= 57);
    },

  /**
   * Client-side compression of a serialized XML document. This compression method does
   * two things: 1) Remove tag names of closing tag because its name can be computed by
   * maintaining a tag name stack; 2) When a tag or attribute name occurs for the second
   * time it is replaced by the tag number of its first occurence. This number can be
   * computed on-the-fly by increasing a counter each time a new tag or attribute name is
   * found.
   * <br/>
   * Please note that currently the <?xml ...?> directive produces an error and needs to
   * be removed in the data parameter.
   * @see de.businesscode.soa.model.ZipLet
   * @see #_uncompressXMLString
   * @param {string} data The serialized XML document to be compressed.
   * @return {string} The compressed XML-like document.
   * @private
   */
  _compressXMLString: function(/* string */ data)
    {
      var constPrefix = "__token_";
      var result = "";
      var tokenMap = new Array();
      var currentTokenNo = 0;
      var withinTag = false;
      var currentToken = "";
      for (var i = 0; i < data.length; ++i) {
        var c = data.charAt(i);
        if (c == "<") {
          currentToken = "";
          result += c;
          if (i+1 < data.length && data.charAt(i+1) == "/") {
            while (i < data.length && data.charAt(i) != ">") {
              ++i;
            }
            result += ">";
          } else {
            withinTag = true;
          }
        } else if (withinTag) {
          if (this._isWhitespace(c) || c == ">" || c == "/" || c == "\"") {
            if (currentToken != "") {
              if (currentToken.charAt(currentToken.length - 1) == "=") {
                currentToken = currentToken.substr(0, currentToken.length - 1);
              }
              if (typeof tokenMap[constPrefix + currentToken] == "undefined") {
                tokenMap[constPrefix + currentToken] = currentTokenNo++;
                for (var partLength = currentToken.length - 1; partLength > 0; --partLength) {
                  if (typeof tokenMap[constPrefix + currentToken.substr(0, partLength)] != "undefined" &&
                      !this._isDigit(currentToken.charCodeAt(partLength))) {
                    result += tokenMap[constPrefix + currentToken.substr(0, partLength)];
                    result += currentToken.substr(partLength);
                    currentToken = "";
                    break;
                  }
                }
                if (currentToken != "") {
                  result += currentToken;
                }
              } else {
                result += tokenMap[constPrefix + currentToken];
              }
              currentToken = "";
            }
            result += c;
            if (c == "\"") {
              while (++i < data.length) {
                var c = data.charAt(i);
                result += c;
                if (c == "\"") break;
              }
            }
            withinTag = (c != ">");
          } else {
            currentToken += c;
          }
        } else {
          result += c;
        }
      }

      return result;
    },

  /**
   * Transforms a compressed XML-like document to its original valid serialized XML
   * document. This document can then be parsed with a DOM parser. This function is
   * the inverse function of _compressXMLString.
   * @see de.businesscode.soa.model.ZipLet
   * @see #_compressXMLString
   * @param {string} data The data to be uncompressed.
   * @return {string} The serialized XML document.
   * @private
   */
  _uncompressXMLString: function(/* string */ data)
    {
      var result = "";
      var reverseTokenMap = new Array();
      var withinTag = false;
      var tagBeginning = false;
      var currentToken = "";
      var tagStack = new Array();
      for (var i = 0; i < data.length; ++i) {
        var c = data.charAt(i);
        if (c == "<") {
          currentToken = "";
          result += c;
          if (i+1 < data.length && data.charAt(i+1) == ">") {
            result += "/";
            result += tagStack[tagStack.length-1];
            result += ">";
            --tagStack.length;
            ++i;
          } else {
            withinTag = true;
            tagBeginning = true;
          }
        } else if (withinTag) {
          if (this._isWhitespace(c) || c == ">" || c == "/" || c == "\"") {
            if (currentToken != "") {
              var isNewToken = true;
              var decodedToken = currentToken;

              if (this._isDigit(currentToken.charCodeAt(0))) {
                var tokenPos = 0;
                while (tokenPos < currentToken.length && this._isDigit(currentToken.charCodeAt(tokenPos))) {
                  ++tokenPos;
                }
                var tokenNo = parseInt(currentToken.substr(0, tokenPos), 10);
                var tokenSuffix = (tokenPos < currentToken.length ? currentToken.substr(tokenPos) : "");
                decodedToken = reverseTokenMap[tokenNo] + tokenSuffix;
                isNewToken = (tokenSuffix != "");
              }

              if (isNewToken) {
                reverseTokenMap[reverseTokenMap.length] = decodedToken;
              }

              result += decodedToken;
              if (!tagBeginning) result += "=";

              if (tagBeginning && c != "/") {
                tagStack[tagStack.length] = decodedToken;
              }
              tagBeginning = false;
              currentToken = "";
            } else if (!tagBeginning && c == "/") {
              --tagStack.length;
            }
            result += c;
            if (c == "\"") {
              while (++i < data.length) {
                var c = data.charAt(i);
                result += c;
                if (c == "\"") break;
              }
            }
            withinTag = (c != ">");
          } else {
            currentToken += c;
          }
        } else {
          result += c;
        }
      }

      return result;
    },

  /**
   * Auxiliary function for {link #_encodeString} converting a number to a hexadecimal
   * representation.
   * @param {integer} value The value to be transformed to a hexadecimal number.
   * @param {boolean} hasRecursed Internal flag. Must not be set when calling it.
   * @return {string} The value as hex number.
   * @private
   */
  _toHexString: function(/* integer */ value, /* boolean? */ hasRecursed)
    {
      if (value == 0) return hasRecursed ? "" : "0";
      return this._toHexString(value >> 4, true) + this._b64ToChar.charAt(value & 15);
    },

  /**
   * Encodes the specified string by mapping the alphabet used in the input to a
   * fixed 64 character alphabet. This 64 character alphabet consists of characters
   * which does not need to be encoded in a URL. However if the input contains more
   * than 64 different characters this encoding function returns NULL. In this case
   * the _encodeString() function must be used because it can handle all input
   * strings.
   * @param {string} data The string to be encoded.
   * @return {string} Encoded string or NULL if the alphabet of the input string is
   * too large to be encoded by alphabet mapping.
   * @see #_decodeStringWithAlphabetMapping
   * @private
   */
  _encodeStringWithAlphabetMapping: function(/* string */ data)
    {
      var alphabetMapping = new Array();
      var alphabet = "";
      var result = "";
      for (var i = 0; i < data.length; ++i) {
        var c = data.charAt(i);
        if (typeof alphabetMapping[c] == "undefined") {
          alphabetMapping[c] = alphabet.length;
          alphabet += c;
          if (alphabet.length > this._b64ToChar.length) return null;
        }
        result += this._b64ToChar.charAt(alphabetMapping[c]);
      }
      return this._encodeString(alphabet) + result;
    },

  /**
   * This function decodes an string which has been encoded with the function
   * _encodeStringWithAlphabetMapping.
   * @param {string} encodedData The data to be decoded.
   * @return {string} The decoded result which is always not NULL.
   * @see #_encodeStringWithAlphabetMapping
   * @private
   */
  _decodeStringWithAlphabetMapping: function(/* string */ encodedData)
    {
      var alphabet = this._decodeString(encodedData);
      var data = encodedData.substr(this._encodeString(alphabet).length);
      var result = "";
      for (var i = 0; i < data.length; ++i) {
        var c = data.charAt(i);
        result += alphabet.charAt(this._b64ToChar.indexOf(c));
      }
      return result;
    },

  /**
   * This function converts a string to an encoded 64-character string (like base64).
   * It is an alternative to the global JavaScript "encode" function, but it produces
   * more compact strings. These strings can be put in a URL without any further
   * escaping.
   * @param {string} data The string to be encoded.
   * @return {string} The encoded string which can be put into a URL without
   * escaping it.
   * @see #_decodeString
   * @private
   */
  _encodeString: function(/* string */ data)
    {
      var result = this._toHexString(data.length) + "-";
      for (var i = 0; i < data.length; i += 3) {
        var b1 = data.charCodeAt(i) & 255;
        var b2 = i + 1 < data.length ? data.charCodeAt(i+1) & 255 : 0;
        var b3 = i + 2 < data.length ? data.charCodeAt(i+2) & 255 : 0;
        result += this._b64ToChar.charAt( (b1 & 252) >> 2 );
        result += this._b64ToChar.charAt( (b1 & 3) << 4 | b2 >> 4 );
        result += this._b64ToChar.charAt( (b2 & 15) << 2 | b3 >> 6 );
        result += this._b64ToChar.charAt(  b3 & 63 );

      }
      return result;
    },

  /**
   * Reconstructs a string from its 64-character encoded form produced by the
   * {link #_encodeString} function.
   * @param {string} data An encoded string.
   * @return {string} The reconstructed string.
   * @see #_encodeString
   * @private
   */
  _decodeString: function(/* string */ data)
    {
      var offset = data.indexOf('-');
      if (offset <= 0) return "";
      var size = parseInt(data.substring(0, offset++), 16);
      var result = "";
      var b1, b2;
      var pos = 0;
      for (var i = 0; i < size; ++i) {
        b1 = this._b64ToChar.indexOf(data.charAt(offset + pos));
        b2 = offset + pos + 1 < data.length ? this._b64ToChar.indexOf(data.charAt(offset + pos + 1)) : 0;
        switch (i % 3) {
          case 0:
            result += String.fromCharCode((b1 << 2 | b2 >> 4) & 255);
            break;

          case 1:
            result += String.fromCharCode(((b1 & 15) << 4 | b2 >> 2) & 255);
            break;

          default:
            result += String.fromCharCode(((b1 & 3) << 6 | b2) & 255);
            ++pos;
        }
        ++pos;
      }

      return result;
    },

  /**
   * Serializes the specified DOM document and removes all comments from it.
   * @param doc {DOMDocument} The document to be serialized without comments.
   * @return The string representation of the XML document.
   * @see #compressDOMDocument
   * @private
   */
  _serializeXMLWithoutComments: function(/* XMLDocument */ doc)
    {
      return new XMLSerializer().serializeToString(doc).replace(new RegExp("<!--[^-]+(-[^-]+)*-->", "g"), "");
    },

  /**
   * Compresses a DOMDocument and encodes it in a string. This string can then be added
   * to the URL to pass the DOMDocument to another page. Whenever possible this function
   * tries to do the compression and encoding on the client. However if the client-side
   * encoding is too big it makes a server request to get a more compact encoding.
   * URL length limits for GET in chars:
   * <ul>
   *   <li>IE       - 2048
   *   <li>FF       - 65536
   *   <li>Webkit   - 80000
   *   <li>Opera    - 190000
   *   <li>Tomcat/Apache  - 8190 overall, including url, header etc
   * </ul>
   * therefore max guiStatusGZ length:
   * max URL length minus path length
   *
   * @param {XMLDocument} doc - The DOM document to be compressed.
   * @param {function} fn - The callback function executed when the compression succeeds. This
   * function gets a string argument with the compressed document.
   * @param {boolean} [isSync=false] - If set to true the compression is forced to call the callback *fn* synchronously,
   * i.e. keeping the event call stack, etc
   * @param {boolean} [compressAll=false] -I f set to true 'tiny' compression is taken into account even for non guiStatus docs
   */
  compressDOMDocument: function(/* XMLDocument */ doc, /* function */ fn, /* function? */ errorFn, isSync, compressAll)
    {
      var xmlStr = this._serializeXMLWithoutComments(doc);

      // cleanup Namespaces, especially useful for Chrome where default namespaces were added
      xmlStr = bcdui.core.browserCompatibility.removeObsoleteNS(xmlStr);

      // try to get a canonical xml format, replace tokens:
      // a line is defined as a sequence of characters followed by a line feed ("\n"),
      // a carriage return ("\r") or a carriage return immediately followed by a line feed ("\r\n")
      xmlStr = xmlStr.replace(/\t/g," ").replace(/\r\n/g," ").replace(/\n/g," ").replace(/\r/g," ");
      if (xmlStr.substr(0, 2) == "<?") {
        xmlStr = xmlStr.substr(xmlStr.indexOf(">") + 1);
      }
      var hasSpecialChars = false;
      for (var i = 0; i < xmlStr.length && !hasSpecialChars; ++i) {
        var c = xmlStr.charCodeAt(i);
        if (c > 127) hasSpecialChars = true;
      }
      if (!hasSpecialChars) {
        var compressedXmlString = this._compressXMLString(xmlStr);
        var encodedWithAlphabetMapping = this._encodeStringWithAlphabetMapping(compressedXmlString);
        if (encodedWithAlphabetMapping != null) {
          var candidate = "z" + encodedWithAlphabetMapping;
          if (candidate.length <= this._zipLetURLLimit) {
            fn(candidate);
            return;
          }
        }
        candidate = "x" + this._encodeString(compressedXmlString);
        if (candidate.length <= this._zipLetURLLimit) {
          fn(candidate);
          return;
        }
      }

      var url = location.href.replace(/https?:\/\/[^\/]+\/([^\/]+).*/, "/$1" + this._zipLetURL);

      var isGuiStatus = (doc != null) ? (doc.selectSingleNode("/*[self::guiStatus:Status]") != null) : false;
      if (typeof compressAll != "undefined" && compressAll)
        isGuiStatus = true;

      var self = this;

      bcdui.core.xmlLoader.post({
        "url": url + (isGuiStatus ? "?tiny=" + self._zipLetURLLimit : ""),
        "doc": doc,
        isSync: isSync,
        onSuccess: function(result)
        {
          if (isGuiStatus && (result.documentElement.text.length == 0 || result.documentElement.text.length > self._zipLetURLLimit)) {
            var message = (result.documentElement.text.length == 0)
            ? ("Your URL settings have expired and aren't available anymore.")
            : ("The zipped status document is too big: (" + result.documentElement.text.length + " characters)");

            if (errorFn) {
              errorFn(result.documentElement.text, message);
            } else {
              bcdui.log.error(message);
              throw Error(message);
            }
          } else {
            fn(result.documentElement.text);
          }
        },
        onFailure: function(e)
        {
          if (errorFn) {
            errorFn(null, e);
          } else {
            bcdui.log.error(e);
            throw Error(e);
          }
        }
      });
    },

  /**
   * This function decodes an encoded and compressed XML document passed as the
   * {@link bcdui.core.compression.compressDOMDocument compressedXmlString()} argument. It can either make the computations on the
   * client or on the server dependent on the encoding type.
   * @param {string} compressedXmlString The encoded and compressed XML document to
   * be reconstructed.
   * @return {bcdui.core.DataProvider} A DataProvider instance holding the
   * uncompressed data when it is in the Ready state.
   */
  uncompressDOMDocument: function(/* string */ compressedXmlString, /* string? */ id)
    {
      if (compressedXmlString == null || compressedXmlString == "") {
        return new bcdui.core.StaticModel({
          id: id || ("unzipRequest_empty_" + (++bcdui.core.compression.unzipRequestId)),
          data: bcdui.core.browserCompatibility.newDOMDocument()
        });
      }

      if (compressedXmlString.charAt(0) == "x" || compressedXmlString.charAt(0) == "z") {
        var decodedString = (compressedXmlString.charAt(0) == "x"
          ? this._decodeString(compressedXmlString.substr(1))
          : this._decodeStringWithAlphabetMapping(compressedXmlString.substr(1)));
        var serializedDoc = this._uncompressXMLString(decodedString);
        return new bcdui.core.StaticModel({
          id: id || ("unzipRequest_client_" + (++bcdui.core.compression.unzipRequestId)),
          data: serializedDoc
        });
      }

      var result = new bcdui.core.SimpleModel({
        id: id || ("unzipRequest_server_" + (++bcdui.core.compression.unzipRequestId)),
        url: location.href.replace(/https?:\/\/[^\/]+\/([^\/]+).*/, "/$1" + this._zipLetURL + "?data=" + compressedXmlString)
      });

      return result;
    },

    /**
     * @private
     */
    unzipRequestId: 0

}; // bcdui.util.namespace
