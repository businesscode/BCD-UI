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
 * Generate markdown documentation for packages
 * Outputs one file per function
 */
class MarkdownPackageGenerator extends MarkdownBaseGenerator {

  current = "";

  startPackage(packageDoc) {
  }

  finishPackage(packageDoc) {
  }

  /**
   * Static package function
   * @param docu
   */
  printPackageFunction(docu) {

    // Title
    this.current += "# " + docu.name + "()";

    // Description
    if( docu.description ) this.current += os.EOL + docu.description;
    if( docu.overrides ) this.current += os.EOL + "- Overrides " + docu.overrides;
    else if( docu.inherits ) this.current += os.EOL + "- Inherited from " + docu.inherits.split("#")[0];

    // Example
    this.current += os.EOL + this.printCommentExamplesMandatories(docu, docu, false, true)

    // Parameter description
    this.current += this.printParams( docu.params );

    // Examples
    if(docu.examples) {
      this.current += os.EOL+"#### Examples"
      docu.examples.forEach( e => this.current += os.EOL+"````js"+os.EOL+e+os.EOL+"````" );
    }

    // Write file for this function
    let path =   this.opts.destination + "/../md/elements/"; // keep it flat, no module;
    let fileName = docu.name + ".md";
    fs.mkdirSync(path, { recursive: true });
    fs.writeFileSync( path + fileName, this.current );
    this.current = "";
  }

}

module.exports = MarkdownPackageGenerator;