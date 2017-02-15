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
/**
 * @fileoverview
 */

var bcdui = bcdui || new Object();
bcdui.factory = bcdui.factory || new Object();
bcdui.factory.validate = bcdui.factory.validate || new Object();

/**
 * A namespace providing utilities for JavaScript parameter validation.
 * It is used in debug mode to detect invalid parameters for various JavaScript functions.
 * @namespace
 * @private
 */
bcdui.factory.validate.jsvalidation = {

  /**
   * This namespace contains a set of frequently occuring regexp string patterns
   * (just the pattern strings, not the RegExp objects themselves) for testing various
   * string arguments. It can be passed to the function {@link bcdui.factory.validate.jsvalidation.validateArgs}
   * to test the arguments passed to a certain JavaScript function.
   * @private
   */
  _patterns:
    {
      /**
       * An absolute XPath optionally starting with a dollar sign. A matching
       * example would be:
       *    <pre>  $guiStatus//f:Filter  </pre>
       * Not matching example:
       *    <pre>  ../f:Filter  </pre>
       * @constant
       */
      absoluteXPathWithDollar: "^((\\$\\w+)?/.*[\\]\\w])?$",

      /**
       * An absolute XPath without a dollar sign in advance. Matching example
       *    <pre>  /g:Status/f:Filter  </pre>
       * Not matching example:
       *    <pre>  g:Status/f:Filter  </pre>
       * @constant
       */
      absoluteXPath:           "^(/.*[\\]\\w])?$",

      /**
       * A relative XPath. This could be:
       *    <pre>  ../../wrs:Header  </pre>
       * but not
       *    <pre>  /wrs:Wrs/wrs:Data  </pre>
       * @constant
       */
      relativeXPath:           "^([\\w.].*[\\]\\w.]?)?$",

      /**
       * An XPath which can be passed to {@link bcdui.core.createElementWithPrototype} to
       * write to it. Therefore this XPath is restricted in its expressiveness compared
       * to a general XPath. Example:
       *    <pre>  /wrs:Wrs/wrs:Data/wrs:R[1]/wrs:C[2]  </pre>
       * Not allowed:
       *    <pre>  //wrs:C[2]  </pre>
       * @constant
       */
      writableModelXPath: "^((\\$\\w+)?(/(\\w+:|@)?([a-zA-Z]\\w*|\\*)(\\[(\\d+|(\\s*((\\w+:)?[a-zA-Z]\\w*\\s*(\\[\\d+\\]\\s*)?|@[a-zA-Z]\\w*\\s*)=\\s*('[^']*'|\"[^\"]*\"))(\\s+and\\s+(\\s*((\\w+:)?[a-zA-Z]\\w*\\s*(\\[\\d+\\]\\s*)?|@[a-zA-Z]\\w*\\s*)=\\s*('[^']*'|\"[^\"]*\")))*\\s*)\\])*)+)?$",

      /**
       * A string which can be used as HTML element id. For example
       *    <pre>  myElement1  </pre>
       * is valid, but not
       *    <pre>  *myElem  </pre>
       * @constant
       */
      htmlElementId:           "^([a-zA-Z_]\\w*)?$",

      /**
       * A valid id string for a {@link bcdui.core.DataProvider}. This can be
       *    <pre>  countryData  </pre>
       * but not
       *    <pre>  $ctrData </pre>
       * @constant
       */
      dataProviderId:          "^([a-zA-Z_]\\w*)?$",

      /**
       * A string in the XML Date format. This string can be like
       *    <pre>  2011-06-21  </pre>
       * but not
       *    <pre>  21.06.2011  </pre>
       * @constant
       */
      xmlDate:                 "^(\\d{4}-((01|03|05|07|08|10|12)-(0[1-9]|[12][0-9]|3[01])|02-(0[1-9]|[12][0-9])|(04|06|09|11)-(0[1-9]|[12][0-9]|30)))?$"
    },

  /**
   * @private
   */
  _argumentTypeValidators:
    {
        "string":       function(/* String */ str, /* Object? */ property)
                          {
                            if (!bcdui.util.isString(str)) return false;
                            if (!property || !property.pattern) return true;
                            return new RegExp(property.pattern).test(str);
                          }
      , "function":     function(obj) { return Object.prototype.toString.call(obj) === '[object Function]' }
      , "array":        Array.isArray
      , "number":       function(obj) { return Object.prototype.toString.call(obj) === '[object Number]' }
      , "integer":      function(item) { return (typeof item== 'number' && Math.floor(item) === item); }
      , "boolean":      function(item) { return typeof item == "boolean" || item == "true" || item == "false" }
      , "object":       function(item) { return typeof item == "object" }
      , "htmlElement":  function(item) { return bcdui._migPjs._$(item).length > 0 }
      , "targetHtmlRef":  function(item) { return bcdui._migPjs._$(item).length > 0 || jQuery(item).length > 0 || bcdui.util.isString(item) }
      , "jquery":       function(item) { return jQuery(item).length > 0 }
      , "dataProvider": function(item)
                         {
                           if (bcdui.util.isString(item))
                             return new RegExp(bcdui.factory.validate.jsvalidation._patterns.dataProviderId).test(item);
                           if (bcdui.factory && bcdui.factory._isSymbolicLink(item))
                             return true;
                           return (item instanceof bcdui.core.DataProvider);
                         }
    },

  /**
   * Simple argument map format checker similar to json schema, works only in
   * debug mode.
   * See
   *      http://tools.ietf.org/html/draft-zyp-json-schema-03
   * and
   *      json-schema.org
   * Example
   * <pre>
      {
        id: { type: "string", required: false },
        targetModelXPath: { type: "string", required: true },
        optionsModelXPath: { type: "string", required: true },
        optionsModelRelativeValueXPath: { type: "string", required: false }
      }
   *  </pre>
   * @private
   */
  _validateArgs: function(/* Object */ args, /* Object */ schema) {

    // when bcdui.config.debug is false (see bcduiLoaderPost.js) this function only exists as an empty function

    if (!args)
      return;

    var errors = "";
    var unexpectedType = "";
    var unexpected = "";
    for (var key in schema.properties) {
      var property = schema.properties[key];
      if ( typeof args[key] === "undefined" || args[key] == null) {
        if (property.required)
          errors += (errors == "" ? "" : " | ") + key + " is missing";
        continue;
      }
      if ( typeof property.type === "undefined" )
        errors += (errors == "" ? "" : " | ") + key + " is missing type";
      var types = Array.isArray(property.type) ? property.type : [ property.type ];
      var isValid = (types.length == 0);
      if (!isValid) {
        if (types.length > 1 && property["enum"])
          errors += (errors == "" ? "" : " | ") + key + " multiple types provided";
        for (var i = 0; i < types.length && !isValid; ++i) {
          var validator = bcdui.factory.validate.jsvalidation._argumentTypeValidators[types[i]];
          if (typeof validator === "undefined")
            errors += (errors == "" ? "" : " | ") + key + " unknown type '" + types[i] + "'";
          else if (validator(args[key], property)) {
            if (property["enum"]) {
              isValid = jQuery.makeArray(property["enum"]).indexOf(args[key]);
              if (!isValid)
                // We know that there is only 1 type in case of enum so we can throw
                // the error now
                errors += (errors == "" ? "" : " | ") + key + ":" + args[key] + " must be one of '" + +property["enum"].join(",") + "'";
            } else
              isValid = true;
          }
        }
      }
      if (!isValid)
        unexpectedType += (unexpectedType == "" ? "" : " | ") + key + ":" + args[key];
    }

    if (errors != "")
      throw Error("JS Schema error for " + schema.name + " (id: " + args.id + ") : " + errors.replace(/(\r\n|\n|\r)/gm, ""));

    if (unexpectedType != "")
      bcdui.log.warn("Unexpected type/format for " + schema.name + " (id: " + args.id + ") : " + unexpectedType.replace(/(\r\n|\n|\r)/gm, ""));

    for (var key in args)
      if (!(key in schema.properties))
        unexpected += (unexpected == "" ? "" : " | ")+ key + ":" + args[key];
    if (unexpected != "")
      bcdui.log.warn("Unexpected properties for " + schema.name + " (id: " + args.id + ") : " + unexpected.replace(/(\r\n|\n|\r)/gm, ""));
  }
};
