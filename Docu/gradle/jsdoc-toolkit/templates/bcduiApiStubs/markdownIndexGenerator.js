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

const {Generator} = require('./generator');

/**
 * Here we give a list of BCD-UI elements to give the LLM an overview of what exists.
 * Outputs a summary for the most important classes and functions.
 * auxiliaryElements are just listed by name, detail API can still be looked up
 */
class MarkdownIndexGenerator extends Generator {

  docuIndex = {};

  /**
   * Class documentation
   * @param clazz doclet object
   */
  startClass( clazz ) {
    this._printFunctionOrClass( clazz );
  }

  /**
   * Static static package function documentation
   * @param packageFunction doclet object
   */
  printPackageFunction( packageFunction) {
    this._printFunctionOrClass( packageFunction );
  }

  /**
   * Add a class or a static package function documentation to the index
   * @param functionOrClass
   */
  _printFunctionOrClass(functionOrClass) {

    // We skip some "almost" internal functionality
    let documentation = functionOrClass.description || functionOrClass.classdesc;
    let longname = functionOrClass.longname;
    let skipList =
      [ "bcdui.component.cube.configurator.",
        "bcdui.component.cube.configuratorDND.",
        "bcdui.core.browserCompatibility."
      ];
    if( skipList.some( s => longname.startsWith(s) ) ) return;
    if( functionOrClass.virtual || functionOrClass.deprecated || ! documentation ) return;
    if( this.inheritsFrom(this.taffyDb, functionOrClass.longname, "bcdui.core.Status")
        && functionOrClass.longname !== "bcdui.core.Status" ) return;

    // Collect the summary information about the element
    let element = {};
    let name = longname.split(".")[longname.split(".").length-1];
    let summary = documentation || "";
    summary = summary.replaceAll(/{@link [a-zA-Z0-9.]+ (\w+)}/g, "$1");
    summary = summary.split(/\r?\n|\r|\.\W|;/)[0];
    element.summary = summary;
    element.kind = functionOrClass.kind;
    let inheritsDP = this.inheritsFrom(this.taffyDb, functionOrClass.longname, "bcdui.core.DataProvider");
    let inheritsRenderer = this.inheritsFrom(this.taffyDb, functionOrClass.longname, "bcdui.core.Renderer");
    if( inheritsDP && !inheritsRenderer ) element.implements = ["DataProvider"];
    else if ( inheritsRenderer ) element.implements = ["Renderer"];

    // We have high level groups to allow LLM so only retrieve the right subset
    let group = longname.includes(".core.") ? "core"
                         : longname.includes(".component.") ? "component"
                         : longname.includes(".widget.") || longname.includes(".widgetNg.") ? "widget"
                         : "util";
    if( !this.docuIndex[group] ) this.docuIndex[group] = { elements: {}, auxiliaryElements: [] };

    // Commonly used elements get the full element summary
    // Rarely used elements are just listed by name so that they can be looked up via GetDetailSpec
    let isCommon =
      ( functionOrClass.kind === "class" )
      || functionOrClass.longname.includes("widget.create")
      || functionOrClass.longname.includes("widgetNg.create");

    if( isCommon ) this.docuIndex[group].elements[name] = element;
    else this.docuIndex[group].auxiliaryElements.push( functionOrClass.longname.split(".").slice(2).join(".") );
  }

  /**
   * We have seen all classes and functions, now write the summary files
   * Write summary files, one per group core | component | widget | util
   */
  finish() {
    let path = this.opts.destination+"/../md/index/";
    fs.mkdirSync(path, { recursive: true });

    // One file per group
    for( let group in this.docuIndex) {
      let fileName = path + "index_"+group+".md";

      // General remarks
      let prefix = `# Available Elements in group ${group}`;
      prefix += `${os.EOL} Note: A detail specification is available for all elements.`;
      prefix += `${os.EOL} <!-- For LLM: Use tool GetDetailedSpecification(elementName) -->`;
      fs.writeFileSync(fileName, prefix ); // Also deleting the old file

      // List of main elements
      fs.appendFileSync(fileName, `${os.EOL}${os.EOL} ## Elements` );
      fs.appendFileSync(fileName, `${os.EOL} | Name | Summary | Remark |` );
      fs.appendFileSync(fileName, `${os.EOL} |------|---------|--------|` );
      for (const [key, value] of Object.entries(this.docuIndex[group].elements)) {
        // let name = (value.kind === "class" ? "class " : "") + key + (value.kind === "function" ? "()" : "");
        let implementsStr = value.implements ? "Is a " + value.implements?.join(", ") : "";
        fs.appendFileSync(fileName, `${os.EOL} | ${key} | ${value.summary} | ${implementsStr} |` );
      }

      // List of less frequently used elements
      if( this.docuIndex[group].auxiliaryElements.length > 0 ) {
        let auxElems = (this.docuIndex[group].auxiliaryElements??[]).join(", ")
        fs.appendFileSync(fileName, `${os.EOL}${os.EOL} ## Auxiliary elements` );
        fs.appendFileSync(fileName, `${os.EOL}${auxElems}` );
      }
    }
  }
}

module.exports = MarkdownIndexGenerator;