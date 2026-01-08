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

/**
 * Base class for all api stubs and markdown documentation Generators
 */
class Generator {

  ONLINE_JS_DOC = "https://businesscode.github.io/BCD-UI-Docu/jsdoc/";

  /**
   * Constructor
   */
  constructor(opts, taffyDb) {
    this.opts = opts;
    this.taffyDb = taffyDb;
  }

  //------------------------
  // Generate packages
  startPackage(packageDoc) {}

  printPackageMember(memberDoc) {}

  printPackageFunction(memberDoc) {}

  finishPackage(packageDoc) {}

  //--------------------------
  // Generate classes
  startClass(classDoc) {}

  printMethod(methodDoc, isInherited) {}

  printClassMember(memberDoc) {}

  finishClass(classDoc) {}

  //--------------------------------
  // Finishing all generations
  finish(module, fileName, content) {}

  /**
   * Get the copyright string for the generated files
   * @param sep
   * @returns {string}
   */
  getCopyRight(sep = ", ") {
    return `BCD-UI library${sep}@see https://businesscode.github.io/BCD-UI-Docu${sep}Copyright 2010-2025 BusinessCode GmbH, Germany${sep}Apache License, Version 2.0`;
  }

  /**
   * Create an example for JSDoc where a method is shown with exactly the mandatory parameters
   */
  printCommentExamplesMandatories( method, clazz, atExample=true, always=false )
  {
    if( ! method.params || (method.params.length < 2 && !method.params[0]?.name.includes(".")) )
      if( !always ) return "";

    const defaults = {
      targetModelXPath: '"$guiStatus/cust:Elem/@value"',
      targetHtml: '"#myDiv"',
      optionsModelXPath: '"$myModel/wrs:Wrs/wrs:Data/wrs:R/wrs:C[1]"',
      inputModel: "myModel",
      callback: "myCbFunc",
      chain: '["myRenderer.xslt", finalCleanupFunc]'
    }

    // generate a sample. VSC 16.3 will only show leading spaces for the first row, so we do not write them here at all TODO
    var instName = "my" + this.getAbbreviation(clazz.name);
    var result = "````js"+nL();
    result += "    // Usage"+nL();
    if( method === clazz ) {
      if( clazz.virtual )
        return "";
      result += "    var "+instName+" = new " + clazz.longname;
    } else if( method.scope !== "static" ) {
      if( method.returns )
        result += "    var ret = ";
      result += instName + "." + method.name;
    } else  {
      result += "    ";
      if( method.returns )
        result += "var ret = ";
      result += method.longname.replace("#","."); // Instance functions are separated with a # from classname in jsdoc, but her we want to see the dot
    }
    result += "(";

    var hasParamBag = method.params?.some( function(p) { return p.name.indexOf(".") !== -1; } );

    let mandParams = "";
    let that = this;
    method.params?.filter( function(param) {
      // We do not want param bags here, only their parts
      return ! param.optional && ! (hasParamBag && param.name.split(".").length===1);
    }).forEach( function(param,paramIdx) {
      mandParams += paramIdx > 0 ? ", " : " ";
      if( hasParamBag ) {
        mandParams += param.name.split(".")[1];
        if (defaults[param.name.split(".")[1]]) mandParams += `: ${defaults[param.name.split(".")[1]]}`;
      } else
        mandParams += param.name;
    });
    if( mandParams ) {
      if (hasParamBag) result += "{";
      result += mandParams + " ";
      if (hasParamBag) result += "}";
    }
    result += ");"+nL()+"  ````";

    if(atExample) result = "  @example"+nL(1) + result + nL();
    return nL()+result+nL();
  }

  /**
   * Allows returning a dummy value of the right type to prevent warnings during generation
   * @param returnsDoclet
   * @returns {string}
   */
  getReturnDummy(returnsDoclet) {
    const typeDummies = {
      'string': "\"\"",
      'number': "0",
      'boolean': "false",
      'object': "{}",
      'null': "null",
      "integer": "0",
      "*": "{}",
      "void": ""
    };

    let ret = typeDummies[returnsDoclet?.[0]?.type?.names?.[0]?.toLowerCase()];
    if( typeof ret === "undefined" ) ret = nL(2) + "// @ts-ignore (Return dummy value may be of wrong type)" + nL(2) + "return null;" + nL(1);
    else ret = "return " + ret + ";"
    return ret;
  }

  /**
   * Print a type or (type1|type2)
   * @param type
   * @returns {string}
   */
  printCommentDataTypes( type )
  {
    var result = "";
    if( type && type.names ) {
      result += type.names.length>1 ? "(":"";
      type.names.forEach( function(pTNname, pTNnameIdx) { result += pTNnameIdx>0 ? "|" : ""; result += pTNname } );
      result += (type.names.length>1 ? ")":"");
    }
    return result;
  }

  /**
   * Retrieve documentation from super classes if @inheritDoc is set
   * @param taffyData
   * @param doclet
   * @param docu
   * @returns {object} docu including inherited docu
   */
  inheritDocu(taffyData, doclet) {
    const propsToInherit = ['inheritdoc', 'overrides', 'description', 'params', 'returns', 'access', 'comment'];

    const docu = { ...doclet };
    const hierarchy = taffyData({ longname: doclet.longname }).get();
    for(let p = 1; p<hierarchy.length && 'inheritdoc' in hierarchy[p-1]; p++) {
      for( const prop of propsToInherit ) {
        docu[prop] = docu[prop] ?? hierarchy[p][prop];
      }
    }
    return docu;
  }

  /**
   * Check, if a class is or inherits from another class
   * @param docs taffyDb
   * @param childName longname
   * @param parentName longname
   * @returns {boolean}
   */
  inheritsFrom(docs, childName, parentName) {
    let current = childName;

    while (current) {
      if (current === parentName) return true;
      const classDef = docs({ longname: current, kind: 'class' }).first();
      if (!classDef || !classDef.augments || !classDef.augments.length) break;
      current = classDef.augments[0];
    }

    return false;
  }

  /**
   * Return first 2 capital letters of a string
   * or first letter and first 2 consonants if no 2 capital letters
   * @param str
   * @returns {*|string}
   */
  getAbbreviation(str) {
    // Find all capital letters
    const capitals = str.match(/[A-Z]/g);

    if (capitals && capitals.length >= 2) {
      // Return first 2 capital letters
      return capitals.join("");
    }

    // Fallback: first letter + first 2 consonants
    const firstLetter = str.charAt(0).toUpperCase();
    const consonants = str.slice(1).match(/[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]/g) || [];

    return firstLetter + consonants.slice(0, 2).join('').toLowerCase();
  }

}

/**
 * Utility functions for a new line and starting the next line followed by n tabs
 */
function nL(tabs = 0) { return os.EOL + "  ".repeat(tabs); }


module.exports = {Generator};