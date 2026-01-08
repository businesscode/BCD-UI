/*
  Copyright 2010-2025 BusinessCode GmbH, Germany

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
const os = require('os')
const {Generator} = require("./generator");

/**
 * Generate a JavaScript api stub for a class from the jsdoc annotations
 * This file contains common logic for package and class api stubs
 * @extends Generator
 */
class ApiStubsBaseGenerator extends Generator {

  /**
   * Print the comment section for the parameters
   * Will create a type definition for the nested parameters to better support tsc
   * @param params
   * @param clazz
   * @param method
   * @returns { {string, string} }
   */
  printCommentParams( params, clazz, method )
  {
    if( !params || params.length===0)
      return {typeDefs: "", paramsDoc: ""};

    // Helper to derive a good name for our argument types
    function getTypeName(prefix) {
      let typeName = clazz.longname
        .split(".")
        .slice(1)
        .map( e => e.charAt(0).toUpperCase() + e.slice(1) )
        .join("_");
      return `Type_`
        + clazz.name.charAt(0).toUpperCase() + clazz.name.slice(1)
        + (method.name || method).charAt(0).toUpperCase() + (method.name || method).slice(1)
        + prefix.split(".").slice(1).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join("")
        + "_Args";
    }

    // Group parameters by prefix like args vs args.saveChain
    let prefixMap = new Map();
    params.forEach(function(param) {
      let prefix = param.name.substring(0, param.name.lastIndexOf("."));
      if( !prefixMap.has(prefix) ) prefixMap.set(prefix, []);
      prefixMap.get(prefix).push(param);
    });

    // We want the most deep nested types first
    let prefixOrder = Array.from(prefixMap.keys()).sort( (a, b) => b.split(".").length - a.split(".").length );

    // Loop over prefixes and collect parameter blocks (i.e. per prefix)
    let paramsDoc = "";
    let typeDefs = "";
    prefixOrder.forEach( prefix => {
      let params = prefixMap.get(prefix);
      let result = "";
      if( prefix ) {
        result += nL() + "/**" + nL(1);
        result += "@typedef {Object} " + getTypeName(prefix) + nL(1);
      }

      // Loop over parameters for this prefix
      const codeEscape = "````";
      let that = this;
      params.forEach(function (param) {
        // If nested, we are part of a typedef
        result += prefix ? "@property" : "@param";

        // Datatype. The created typedef, if found, otherwise it comes from jsdoc
        if( prefixMap.get(param.name) ) result += " {" + getTypeName(param.name) + "}";
        else result += " {" + that.printCommentDataTypes(param.type) + "}";

        // Param/Property-name without any nesting prefix
        if( param.name ) {
          let paramName = prefix ? param.name.substring(prefix.length+1) : param.name;
          if( param.defaultvalue ) paramName += "="+param.defaultvalue;
          result += " " + (param.optional ? '[' + paramName + ']' : paramName);
        } else
          console.warn("Missing param name at " + clazz.longname + "." + method.name);

        // Param/Property description
        result += " -"; // make sure a description like '2nd...' is not an issue
        if( prefix && param.defaultvalue )
          result += " default=" + param.defaultvalue;
        if( param.description )
          result += that.cleanupDescription(param.description);
        if( prefixMap.get(param.name) ) {
          const paramNameList =  prefixMap.get(param.name)
            .map(p => { return p.name.substring(param.name.length+1) + (p.optional ? "?" : ""); } )
            .join(", ");
          result += `${nL(2)}${codeEscape}js${nL(2)}{ ${paramNameList} }${nL(2)}${codeEscape}${nL(2)}<br/>Use autocomplete in {} to get a full parameter description <br/>`;
        }
        result += nL(1);
      });

      // We end the parameter prefix group. Maybe the end of a @typedef block,
      // or just the last unnested param in the class documentation
      if( prefix ) {
        result += "*/" + nL(1);
        typeDefs += result;
      }
      else paramsDoc += result;
    });

    // Because paramsDoc just go to the currently written method docu,
    // and typedefs need to be at the top of the file,
    // we return them separately.
    return {typeDefs, paramsDoc};
  }



  /**
   * Print sourcecode examples into the comment area
   * @param examples
   * @returns {string}
   */
  printCommentExamples( examples )
  {
    var result = "";
    if( examples ) examples.forEach( function(example) { result += nL(1) + "@example"+ nL(1) + example+ nL(1) } );
    return result;
  }


  /**
   * Necessary cleanup for descriptions
   * a) XML samples with @ are misinterpreted as jsdoc tags, we escape them, Some like {@link are valid, so only those looking like xml (testcase dp.write())
   * b) IDEA as of beginning 2022 has issues (WEB-18474) with multi-line descriptions. They lead to repeated description at the other params. (tescase each args.x param when ctrl-space within {})
   * c) VSC 1.63 does cut multiline descriptions at the first html tag (testcase bcdui.core).
   *    While it still does ignore html tags, it destroys the intended format but this way it is at least visible as unformatted text
   * @param text
   */
  cleanupDescription(text)
  {
    if( !text )
      return "";
    return "  "+text.replace(/( |\/|,|\[)@/g,"$1&commat;").replace(/ *(\r?\n|\r) */gm," ");
  }

  /**
   * Print a link to an online documentation
   * @param link
   * @returns {string}
   */
  printExternalLink(link) {
    var result = `@see [Online Documentation](${link})`;
    return result;
  }
}

/**
 * Utility functions for a new line and starting the next line followed by n tabs
 */
function nL(tabs = 0) { return os.EOL + "  ".repeat(tabs); }

module.exports = {ApiStubsBaseGenerator};