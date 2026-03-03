/*
  Copyright 2010-2026 BusinessCode GmbH, Germany

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
    this.current += "# Class " + classDoc.name + os.EOL;
    // To have the class name in header be the first line, which is important for search index,
    // we write the package here below in a hidden span, and move it upo and show it with a kook on display
    this.current += "package " + classDoc.longname.substring(0, classDoc.longname.lastIndexOf(".")) + os.EOL;
    this.current += os.EOL + this.jsLinksToMarkdownLinks((classDoc.classdesc || "")) + os.EOL;

    // Inheritance
    if (classDoc.augments) {
      this.current += os.EOL + "_Extends_ [" + classDoc.augments[0] + "](" + classDoc.augments[0] + ".md)";
      if( !["bcdui.core.DataProvider", "bcdui.core.Renderer"].includes(classDoc.augments[0]) ) {
        let inheritsDP = this.inheritsFrom(this.taffyDb, classDoc.longname, "bcdui.core.DataProvider");
        let inheritsRenderer = this.inheritsFrom(this.taffyDb, classDoc.longname, "bcdui.core.Renderer");
        if (inheritsRenderer) this.current += ", is a Renderer";
        if (inheritsDP) this.current += ", can act as a DataProvider";
      }
    }

    // Constructor
    this.current += os.EOL + "## Constructor";
    this.current += this.printCommentExamplesMandatories( classDoc, classDoc, false );
    this.printMethod(classDoc, false, true);

    // Constructor examples
    this._printExamples(classDoc);

    // If this file is delivered to an LLM, only sent headers for the remaining part of the file
    // Unless full details are requested
    this.current += os.EOL + "<!-- LLM_HINT DETAILS_STARTING -->";

    // We now expect printMethod calls
    this.current += os.EOL + "## Methods";
  }

  /**
   * Print a method documentation
   * @param methodDoc doclet
   * @param isInherited
   * @param isConstructor
   */
  printMethod(methodDoc, isInherited, isConstructor = false){
    this.current += os.EOL + os.EOL + ( isConstructor ? "---" : "" );

    // Method signature
    let docu = this.inheritDocu(this.taffyDb, methodDoc);
    this.current += os.EOL + (isConstructor ? "" : "### " + docu.name);

    // We want to show the signature but not include it on the header because it would become part of the anchor
    // which makes it hard to navigate to the element from search results or link externally
    // So we add the signature here hidden and later restore it in a docsify hook
    let retType = (docu.returns?.[0]?.type?.names?.[0] ?? "void").replaceAll(/([<|])/g, "\\$1");
    let argsList = (docu.params||[])
      .filter(p=>!p.name.includes("."))
      .map( p => p.name + (p.optional ? "?" : "") )
      .join(", ");
    let sig = "(" + argsList + ") &#x21FE; {" + retType + "}";
    if( !isConstructor ) this.current += os.EOL + `${docu.name}${sig}` + os.EOL + os.EOL;

    // Description
    if( docu.description )this.current += os.EOL + this.jsLinksToMarkdownLinks(docu.description);
    if( docu.overrides ) this.current += " \\" + os.EOL + "_Overrides_ " + docu.overrides;
    else if( docu.inherits ) this.current += " \\" + os.EOL + "_Inherited from_ " + docu.inherits.split("#")[0];

    // Parameter list
    let paramTable = this.printParams( docu.params );
    this.current += paramTable;

    // Description of return value
    if( !isConstructor ) {
      if( !paramTable ) this.current += "\\";
      this.current += os.EOL + "**Returns** ";
      if( retType !== "void" ) {
        this.current += "{" + retType + "}:";
        this.current += " " + this.jsLinksToMarkdownLinks((docu.returns[0].description ?? ""));
      } else {
        this.current += "{void}";
      }
    }

    // Method examples
    this._printExamples(docu);

  }

  /**
   * Finish class md documentation
   * @param classDoc
   */
  finishClass(classDoc){
    let module = classDoc.longname.split(".").slice(-1).join("/");
    let path = this.mdOutputElementsPath; // keep it flat, no module;
    let fileName = classDoc.longname + ".md";
    fs.mkdirSync(path, { recursive: true });
    fs.writeFileSync( path + fileName, this.current );
    this.current = "";
  }

  /**
   * Print @example belonging to the class or method
   * @param doc
   * @private
   */
  _printExamples(doc) {
    let that = this;
    if(doc.examples) {
      this.current += os.EOL+"#### Examples"
      doc.examples.forEach( e => {
        let example = that.jsLinksToMarkdownLinks(e);
        if( !example.trim().startsWith("````") ) example = "````js" + os.EOL + example + os.EOL + "````";
        this.current += os.EOL + example;
      });
    }

  }

}

module.exports = MarkdownClassGenerator;