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
const fs = require('fs');
const path = require("path");

const {ApiStubsBaseGenerator} = require("./apiStubsBaseGenerator");

/**
 * Generate a JavaScript api stub for a class
 */
class ApiStubsClassGenerator extends ApiStubsBaseGenerator {

  _current = "";
  clazz = null;

  /**
   * Start a class definition
   * @param clazz doclet
   */
  startClass(clazz) {
    this.clazz = clazz;

    var result = "";

    result += nL();

    // Add the documentation for the class
    // In praxis this docu will be shown in IDEA and VSC on autocomplete after the package
    result += "/**" + nL(1);
    result += "@class " + clazz.longname + nL(1);
    result += this.printExternalLink(clazz.longname)+nL(1);
    if( clazz.classdesc )
      result += "@description " + clazz.classdesc + nL(1);
    if (clazz.description)
      result += "@description " + clazz.description + nL(1);
    result += this.printCommentExamplesMandatories( clazz, clazz );
    if (clazz.examples)
      result += this.printCommentExamples( clazz.examples );
    if (clazz.augments)
      result += "@extends " + clazz.augments[0] + nL();
    result += "*/" + nL()

    // Start -> Print out Class
    // Print the name...
    result += "// @ts-ignore" + nL();
    result += "export class " + clazz.name + " ";

    // ...add extends for this class, stored in .augments
    if (clazz.augments)
      result += "extends " + clazz.augments[0] + " ";

    result += "{" + nL(1);

    // ... add Constructor
    // In theory the constructor inherits the class doc,
    // but IDEA 2026 needs at least the constructor signature, otherwise it shows the parent class' constructor,
    // and tsc then in turn also needs the comment block with the params types, otherwise they become any
    // So we repeat docu here
    // In praxis this docu will be shown in IDEA and VSC on hover especially after () are appended
    result += "/**" + nL(1);
    if( clazz.classdesc )
      result += "@description " + clazz.classdesc + nL(1);
    if (clazz.description)
      result += "@description " + clazz.description + nL(1);
    result += this.printExternalLink(clazz.longname)+nL(1);
    result += this.printCommentExamplesMandatories( clazz, clazz );
    if (clazz.examples)
      result += this.printCommentExamples( clazz.examples );
    // @extends cannot be shown here as tsc will complain that it is not attached to a class
    let {typeDefs, paramsDoc} = this.printCommentParams(clazz.params, clazz, "Constructor");
    result += paramsDoc; // Inline plain params, typedefs are prepended to class output below
    result += "  */" + nL(1);
    result += "constructor("
    var paramList = "";
    if(clazz.params && clazz.params.length !== 0){
      clazz.params.forEach( function(param) {
        if (param.name.includes('.')) return;
        paramList += param.name + ", ";
      })
      paramList = paramList.slice(0, -2);
    }

    // Constructor function body
    result += paramList+") {"
    if( clazz.augments ) {
      // Param list for super() is likely wrong, prevent tsc from complaining by adding @ts-ignore
      result += nL(2) + "// @ts-ignore (ignore wrong param list)" + nL(2);
      result += "super(" + paramList + "); " + nL(2);
    }
    result += "}" + nL(1);

    this._current += typeDefs + result;
  }

  /**
   * Properties of classes
   */
  printClassMember(member)
  {
    let result = nL();
    if( member.description ) {
      result += "/**" + nL(1);
      result += " * " + member.description + nL(1);
      const type = " {" + this.printCommentDataTypes(member.type) + "}";
      if(type) result += " * @type" + type + nL(1);
      result += " */" + nL(1);
    } else if( member.comment ) {
      result += member.comment + nL(1);
    }
    if( member.scope === "static")
      result += "static ";
    //const initVal = member.type && member.type.names[0].includes(".") ? "new "+member.type.names[0]+"()" : null;
    result += member.name + "= null;" + nL(1);

    this._current += result;
  }


  /**
   * Print a method docu block
   * @param method
   * @param isInherited class has a definition itself, does nit just inherit
   * @returns {string}
   */
  printMethod(method, isInherited) {
    var result = nL();

    const docu = this.inheritDocu(this.taffyDb, method);

    // Add the documentation for the method, but only if the documentation actually exists.
    if (docu.description || docu.params?.length > 0 || docu.returns) {
      result += "  /**" + nL(1);
      result += this.printExternalLink(this.clazz.longname, (docu.scope==="static"?".":"")+docu.name)+nL(1);

      if (docu.description)
        result += "@description " + this.cleanupDescription(docu.description) + nL(1);

      // ... add the params and if extracted the typedefs of complex param types
      let {typeDefs, paramsDoc} = this.printCommentParams(docu.params, this.clazz, method);
      result = typeDefs + result; // prepend any typeDefs
      result += paramsDoc;

      if (docu.inherits) result += "@inherits " + docu.inherits + nL(1);
      if (!isInherited && docu.overrides) result += "@overrides " + docu.overrides + nL(1);
      if (!isInherited) result += "@public"+nL(1); // tsc needs this to not omit empty inherited function
      result += this.printCommentExamplesMandatories( docu, this.clazz );
      if (docu.deprecated) result += "@deprecated " + docu.deprecated + nL(1);
      if (docu.returns) {
        var ret = docu.returns[0];
        result += "@return";
        result += " {" + this.printCommentDataTypes(ret.type)+ "}";
        if (ret.description)
          result += " " + ret.description;
        result += nL(1);
      } else {
        result += "@return {void}" + nL(1);
      }
      result += "*/" + nL(1);
    }

    // Create the method signature
    result += method.name + "(";
    var paramList = "";
    if (method.params){
      method.params.forEach(function (param){
        if (param.name.includes('.')) return;
        paramList += param.name + ",";
      })
      if (method.params.length !== 0) {
        paramList = paramList.slice(0, -1);
      }
    }
    // method body
    let returnDummy = this.getReturnDummy(docu.returns);
    if( paramList!=="" ) result += paramList+") { "+returnDummy+" }"; // Avoid unused var warning (in Eclipse)
    else result += ") { "+returnDummy+" }";

    this._current += result;
  }

  /**
   * Finish a class definition
   * @param clazz doclet
   */
  finishClass(clazz) {

    let result = "";

    // ... and close the class definition bracket
    result = result.slice(0, -2) + nL();
    result += "}" + nL() + nL() + nL();
    this._current += result;

    // Create package folder
    let filePath = this.opts.destination+"/"+clazz.memberof.replaceAll(".","/") + "/";
    fs.mkdirSync(filePath, { recursive: true });

    // Header comment
    const fileName = clazz.name.charAt(0).toLowerCase() + clazz.name.slice(1)+".js";
    let prefix = `/** ${this.getCopyRight()} */${nL()}`;
    fs.writeFileSync(filePath + fileName, prefix); // Also deleting the old file

    // Import bcdui
    const relBcduiPath = path.relative(filePath, this.opts.destination+"/bcdui").replace(/\\/g, '/') || ".";
    const importBcdui = `import * as bcdui from "${relBcduiPath}/exports.js";${nL()}`;
    fs.appendFileSync(filePath + fileName, importBcdui)

    // Class definition
    fs.appendFileSync(filePath + fileName, this._current );
    this._current = "";
  }

}

/**
 * Utility functions for a new line and starting the next line followed by n tabs
 */
function nL(tabs = 0) { return os.EOL + "  ".repeat(tabs); }


module.exports = {ApiStubsClassGenerator};