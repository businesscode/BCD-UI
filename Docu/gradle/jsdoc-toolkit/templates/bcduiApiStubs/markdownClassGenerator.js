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

const {MarkdownBaseGenerator} = require('./markdownBaseGenerator');

/**
 * Generate markdown documentation for classes
 */
class MarkdownClassGenerator extends MarkdownBaseGenerator {

  current = "";

  /**
   * Start class md documentation
   * @param classDoc
   */
  startClass(classDoc) {
    // Class name and description
    this.current += "# Class " + classDoc.longname + os.EOL;
    this.current += (classDoc.classdesc || "") + os.EOL;

    // Inheritance
    if (classDoc.augments) this.current += "- Extends " + classDoc.augments[0];
    let inheritsDP = this.inheritsFrom(this.taffyDb, classDoc.longname, "bcdui.core.DataProvider");
    let inheritsRenderer = this.inheritsFrom(this.taffyDb, classDoc.longname, "bcdui.core.Renderer");
    if( inheritsRenderer ) this.current += ", is a Renderer";
    if( inheritsDP ) this.current += ", can act as a bcdui.core.DataProvider";

    // Constructor
    this.current += os.EOL + "## Constructor";
    this.current += this.printCommentExamplesMandatories( classDoc, classDoc, false );
    this.printMethod(classDoc, false, "");

    // Constructor examples
    if(classDoc.examples) {
      this.current += os.EOL+"#### Examples"
      classDoc.examples.forEach( e => this.current += os.EOL+"````js"+os.EOL+e+os.EOL+"````" );
    }

    // We now expect printMethod calls
    this.current += os.EOL + "## Methods";
  }

  /**
   * Print a method documentation
   * @param methodDoc doclet
   * @param isInherited
   * @param methodName
   */
  printMethod(methodDoc, isInherited, methodName){
    this.current += os.EOL + os.EOL + "---";

    // Method signature
    let docu = this.inheritDocu(this.taffyDb, methodDoc);
    let reType = (docu.returns?.[0]?.type?.names?.[0] ?? "void").replaceAll(/([<|])/g, "\\$1");
    let argsList = (docu.params||[])
      .filter(p=>!p.name.includes("."))
      .map( p => p.name + (p.optional ? "?" : "") )
      .join(", ");
    this.current += os.EOL + (methodName ?? "### ." + (docu.name || "") + "(" + argsList + ")" + ": " + reType);

    // Description
    if( docu.description )this.current += os.EOL + docu.description;
    if( docu.overrides ) this.current += os.EOL + "- Overrides " + docu.overrides;
    else if( docu.inherits ) this.current += os.EOL + "- Inherited from " + docu.inherits.split("#")[0];

    // Parameter list
    this.current += this.printParams( docu.params );
  }

  /**
   * Finish class md documentation
   * @param classDoc
   */
  finishClass(classDoc){
    let module = classDoc.longname.split(".").slice(-1).join("/");
    let path =   this.opts.destination + "/../md/elements/"; // keep it flat, no module;
    let fileName = classDoc.name + ".md";
    fs.mkdirSync(path, { recursive: true });
    fs.writeFileSync( path + fileName, this.current );
    this.current = "";
  }

}

module.exports = MarkdownClassGenerator;