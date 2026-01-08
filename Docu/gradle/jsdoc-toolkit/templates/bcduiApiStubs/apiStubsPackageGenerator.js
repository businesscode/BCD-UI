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
 * Generate a JavaScript api stub for a package
 */
class ApiStubsPackageGenerator extends ApiStubsBaseGenerator {

  _current = "";
  namespace = null;

  /**
   * Start output for a package
   * @param namespace doclet namespace object
   */
  startPackage(namespace) {
    this.namespace = namespace;

    var result = "";

    //-----------------------------------------------
    // Check for conflicting @namespace definitions and throw an error
    var sameNsDefs = this.taffyDb({kind: "namespace", longname: namespace.longname}).get();
    if (sameNsDefs.length > 1) {
      var errorMsg = namespace.longname + " was found at: ";
      sameNsDefs.forEach(function (nsDef) {
        errorMsg += "[" + nsDef.meta.filename + " line: " + nsDef.meta.lineno + "] ";
      });
      throw ("namespace '" + namespace.longname + "' is defined multiple times! " + errorMsg);
    }

    // Print the namespace like bcdui.component = {} with its comment;
    let nsResult = nL() + "/**" + nL();
    nsResult += " * " + this.printExternalLink(this.ONLINE_JS_DOC + namespace.longname + ".html") + nL();
    if (namespace.description)
      nsResult += " * @description " + this.cleanupDescription(namespace.description) + nL();
    nsResult += " * @namespace " + namespace.longname + nL();
    nsResult += " */" + nL();
    result += nsResult;

    this._current += result;
  }

  /**
   * Static package functions
   * @param method
   * @param methodIdx
   * @param clazz
   * @param tempAlias
   * @returns {string}
   */
  printPackageFunction(method) {

    var result = "/**" + nL();

    // IDEA 2021.1.3 will repeat the full description for each param, so we start with the param description here
    // to make it easier to read
    let {typeDefs, paramsDoc} = this.printCommentParams(method.params, this.namespace, method);
    result += paramsDoc;

    result += this.printExternalLink(this.ONLINE_JS_DOC + this.namespace.longname + ".html#" + (method.scope === "static" ? "." : "") + method.name) + nL(1);
    result += "@description " + this.cleanupDescription(method.description) + nL(1);
    // IDEA (2012.2) needs @method (to show type) and @memberOf (to understand it belongs to the class)
    result += "@method " + method.name + nL();
    if (method.virtual)
      result += "@abstract Use a concrete subclass" + nL(); // Wired enough, Eclipse needs a random string here to not indent the next tag
    if (method.inherits)
      result += "@inherits " + method.inherits + nL();
    if (method.overrides)
      result += "@overrides " + method.overrides + nL();
    if (method.deprecated)
      result += "@deprecated " + method.deprecated + nL();
    // IDEA prefers samples before parameters
    result += this.printCommentExamplesMandatories(method, this.namespace);
    result += this.printCommentExamples(method.examples);

    if (method.returns) {
      var ret = method.returns[0];
      result += "@return";
      result += " {" + this.printCommentDataTypes(ret.type) + "} ";
      if (ret.description)
        result += " " + ret.description;
      result += nL();
    } else {
      result += "@return {void}" + nL(1);
    }
    // Next row is actually evaluated by IDEA and it is not enough to have that in the able above
    result += "@memberOf " + this.namespace.longname + (method.scope !== "static" ? "#" : "") + "" + nL();
    result += " */" + nL();

    // Now the Javascript code
    result += `export function ${method.name}(`;
    var paramList = "";
    if (method.params) {
      method.params.filter(function (param) {
        return param.name && param.name.indexOf(".") === -1
      }).forEach(function (param, paramIdx) {
        paramList += paramIdx > 0 ? ", " : "";
        paramList += param.name;
      });
    }
    let returnDummy = this.getReturnDummy(method.returns);
    result += paramList + ") { " + returnDummy + " };" + nL()

    result = typeDefs + result; // Prepend any typeDefs to method docu block
    this._writeFile(method.name + ".js", result);
  }

  /**
   * Print the properties of an object
   */
  printPackageMember(member) {
    var result = nL();

    if ( // Wired, happens on bcdui.something[1] = x;
      member.longname.indexOf("[undefined]") !== -1
      // Skip class and namespaces, they are also show up here as kind:member, but are handled else where.
      // And if the property shows up multiple times (init, assignment etc), it is enough to declare it private once to hide it here
      || this.taffyDb({longname: member.longname}, [{kind: "class"}, {kind: "namespace"}, {access: "private"}]).count() > 0
      // If it shows up undocumented but there is a documented version, take that one
      || (!member.description && this.taffyDb({
        longname: member.longname,
        description: {"isUndefined": false}
      }).count() > 0))
      return true;

    if (member.description) {
      result += "/**" + nL();
      result += " * " + member.description + nL();
      result += " */" + nL();
    } else {
      console.log("No description for " + member.longname);
    }

    result += "export const " + member.name;
    if (member.meta.code.type === "NewExpression" && member.type)
      result += " = new " + member.type.names[0] + "()";
    else if (member.meta.code.type === "Literal" && member.meta.code.value && member.type && member.type.names[0].toLowerCase() === "string")
      result += " = \"" + member.meta.code.value + "\"";
    else if (member.meta.code.type === "Literal" && !isNaN(parseFloat(member.meta.code.value)))
      result += " = " + member.meta.code.value;
    else
      result += " = {}"; // We need this dummy assignment for Eclipse Mars autosuggestion to work. And if we assign only null, tooltip fails
    result += ";" + nL();

    this._current += result;
  }

  /**
   * Finish output for a package
   * @param packageDoc doclet
   */
  finishPackage(packageDoc) {
    this._writeFile("package.js", this._current);
    this._current = "";
  }


  /**
   * Finish output for all packages.
   * This includes:
   * - Make all self-defined JsDoc @typedef available as global types
   * - Create a bundle exports.js file for each package
   */
  finish() {
    this._writeTypedefsFile();
    this._createPackageExports();
  }


  /**
   * Per each package we create a bundle exports.js file
   */
  _createPackageExports() {
    // Recurse into all subdirectories and create a bundle exports.js for each package
    const root = path.resolve(this.opts.destination, 'bcdui');
    const exists = (p) => { try { return fs.existsSync(p); } catch (e) { return false; } };

    // recursion function
    const walkAndWrite = (dir, skip=false) => {
      if (!exists(dir) || skip) return;

      const entries = fs.readdirSync(dir, {withFileTypes: true});
      const subDirs = [];
      const files = [];

      entries.forEach((entry) => {
        if (entry.name.startsWith('.')) return;
        if (entry.isDirectory()) {
          subDirs.push(entry.name);
        } else if (entry.isFile() && entry.name.endsWith('.js') && entry.name !== 'index.js') {
          files.push(entry.name);
        }
      });

      // Recurse into children first
      subDirs.forEach((d) => walkAndWrite(path.join(dir, d)));

      // Build index content
      let content = '';
      files
        .filter(f => f !== 'exports.js' && f !== 'typedefs.js')
        .sort()
        .forEach((f) => {
          content += `export * from './${f.split('.')[0]}';` + nL();
        });
      subDirs.sort().forEach((d) => {
        content += `export * as ${d} from './${d}/exports';` + nL();
      });

      const exportPath = path.join(dir, 'exports.js');
      fs.writeFileSync(exportPath, content);
    };

    walkAndWrite(root);

    // Write the index.js
    let indexJs = `/**${nL()} * ${this.getCopyRight(os.EOL+" * ")}${nL()} */`;
    indexJs += `${nL()}export * as bcdui from './exports.js';${nL()}`;
    fs.writeFileSync(root + "/index.js", indexJs);
  }

  /**
   * Make all self-defined JsDoc @typedef available in one types file
   * @returns {string}
   */
  _writeTypedefsFile() {
    let typeDefs = "";

    // Collect typedefs per package
    let packageTypeDefs = new Map();
    let that = this;
    this.taffyDb({kind: "typedef"}).get().forEach( function(typedef) {
      let typedefText = typedef.comment + nL() + nL();
      // tsc needs these imports for typedefs in packages
      const toBcduiPath = "./";
      typedefText = typedefText.replaceAll(/(@(?:typedef|param|property)\s+\{)([^}]+)(})/g,     (match, prefix, content, suffix) => {
        const replaced = content.replaceAll(/bcdui\./g, `import("${toBcduiPath}exports").`);
        return prefix + replaced + suffix;
      })
      typeDefs += typedefText;
      let folder = that.opts.destination + "/bcdui/";
      packageTypeDefs.set(folder, (packageTypeDefs.get(folder) ?? "") + typedefText );
    });

    // Individual files for typedefs, one per package
    packageTypeDefs.forEach( (value, key) => {
      fs.mkdirSync(key, { recursive: true });
      fs.writeFileSync(key + "/typedefs.js", value);
    });

    return typeDefs;
  }

  /**
   * Write a file to the destination folder
   * @param fileName
   * @param content
   * @private
   */
  _writeFile(fileName, content) {
    let targetPath = this.opts.destination + "/" + this.namespace.longname.replaceAll(".", "/") + '/';
    fs.mkdirSync(targetPath, {recursive: true});
    let prefix = `/** ${this.getCopyRight()} */${nL()}`;
    const bcduiPath = path.relative(targetPath, this.opts.destination + "/bcdui").replace(/\\/g, '/') || ".";
    const bcduiImport = `import * as bcdui from "${bcduiPath}/exports.js";${nL()}`;
    fs.writeFileSync(targetPath + fileName, prefix + bcduiImport + content)
  }

}

/**
 * Utility functions for a new line and starting the next line followed by n tabs
 */
function nL(tabs = 0) { return os.EOL + "  ".repeat(tabs); }

module.exports = {ApiStubsPackageGenerator};