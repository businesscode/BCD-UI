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

const helper = require('jsdoc/util/templateHelper');
const {MarkdownBaseGenerator} = require('./markdownBaseGenerator');

/**
 * Generate markdown documentation for packages
 * Outputs one file per function
 */
class MarkdownPackageGenerator extends MarkdownBaseGenerator {

  /**
   * Package description
   * @param packageDoc
   */
  startPackage(packageDoc) {
    this.currentPackage = "";  // Package overview page
    this.current = "";         // Page per function

    // Package header
    this.currentPackage += `# Package ${packageDoc.longname}${os.EOL}${os.EOL}`;
    if(packageDoc.description) this.currentPackage += this.jsLinksToMarkdownLinks(packageDoc.description) + os.EOL;

    /**
     * Because publish handles packages and classes separately, we need to take care for the classes here ourselves.
     */
    var allClasses = helper.find( this.taffyDb,
      { kind: "class", memberof: packageDoc.longname,
        access: { "!is": "private" }, abstract: {"!is": true}, virtual: {"!is": true} }
    );
    allClasses = allClasses.filter( _ => _.longname.indexOf("~") === -1 );
    allClasses = allClasses.filter( _ => _.undocumented !== true );
    allClasses.sort( (a,b) => a.name.localeCompare(b.name) );
    let that = this;
    // h4 to avoid this becoming part of sidebar
    that.currentPackage += `${os.EOL}${os.EOL}----${os.EOL}<h4>Classes</h4>${os.EOL}${os.EOL}`;
    allClasses.forEach( classDoc => {
      that.currentPackage += `${os.EOL}${os.EOL}[${classDoc.name}](${classDoc.longname}.md)`;
      if(classDoc.classdesc) that.currentPackage += "\\" + os.EOL + this.jsLinksToMarkdownLinks(classDoc.classdesc.split(/\.\s/)[0]) + ".";
    });

    /**
     * Function section
     * h4 to avoid this becoming part of sidebar
     */
    this.currentPackage += `${os.EOL}${os.EOL}----${os.EOL}<h4>Functions</h4>${os.EOL}${os.EOL}`;
  }

  /**
   * List sub packages and
   * Write this package's overview page
   * @param packageDoc
   */
  finishPackage(packageDoc) {

    // Properties
    this.currentPackage += `${os.EOL}${os.EOL}----${os.EOL}<h4>Members</h4>${os.EOL}${os.EOL}`;
    var allProperties = helper.find( this.taffyDb,
      { kind: "constant", memberof: packageDoc.longname,
        access: { "!is": "private" }, abstract: {"!is": true}, virtual: {"!is": true} }
    );
    let that = this;
    allProperties.forEach(propDoc => {
      // No link, they just appear in the package overview page with type and full description
      that.currentPackage += `${os.EOL}${os.EOL}**${propDoc.name}** {${propDoc.type?.names?.[0] ?? "*"}}`;
      if(propDoc.description) that.currentPackage += "\\" + os.EOL + that.jsLinksToMarkdownLinks(propDoc.description);
    });

    // List sub-packages
    var subPackages = helper
      .find( this.taffyDb, { kind: "namespace", memberof: packageDoc.longname, access: { "!is": "private" }  } )
      .sort( (a,b) => a.name.localeCompare(b.name) );
    this.currentPackage += `${os.EOL}${os.EOL}----${os.EOL}<h4>Subpackages</h4>${os.EOL}${os.EOL}`;
    subPackages.forEach( subPackageDoc => {
      that.currentPackage += `${os.EOL}${os.EOL}[${subPackageDoc.longname}](${subPackageDoc.longname}.md)`;
      if(subPackageDoc.description) that.currentPackage += "\\" + os.EOL + this.jsLinksToMarkdownLinks(subPackageDoc.description.split(/\.\s/)[0]) + ".";
    })

    //----------------------------------
    // Write package overview md page
    let path =  this.mdOutputElementsPath; // keep it flat, no module;
    let fileName = packageDoc.longname + ".md";
    fs.mkdirSync(path, { recursive: true });
    fs.writeFileSync( path + fileName, this.currentPackage );
    this.currentPackage = "";
  }

  /**
   * List classes on the package overview page
   * And one page per static package function
   * @param docu
   */
  printPackageFunction(docu) {

    // List function on the package overview page
    this.currentPackage += `${os.EOL}${os.EOL}[${docu.name}()](${docu.longname}.md)`;
    if(docu.description) this.currentPackage += "\\" + os.EOL + this.jsLinksToMarkdownLinks(docu.description.split(/\.\s/)[0]) + ".";

    // Title
    // Needs to be the first on markdown page so that is recognized as title and for example used in search results
    // We add package information below so that we can create hook to show it on top in HTML
    this.current += "# " + docu.name + "()" + os.EOL;
    this.current += `<span hidden class='htmlPackage'>${docu.longname.substring(0, docu.longname.lastIndexOf('.'))}</span>` + os.EOL + os.EOL;

    // Description
    if( docu.description ) this.current += os.EOL + this.jsLinksToMarkdownLinks(docu.description);
    if( docu.overrides ) this.current += os.EOL + "- Overrides " + docu.overrides;
    else if( docu.inherits ) this.current += os.EOL + "- Inherited from " + docu.inherits.split("#")[0];

    // Example
    this.current += os.EOL + this.printCommentExamplesMandatories(docu, docu, false, true)

    // Parameter description
    this.current += "**Parameters**:";
    let params = this.printParams( docu.params );
    if( params ) this.current += os.EOL + params;
    else this.current += " _None_";

    // Return value
    this.current += os.EOL+os.EOL+"**Returns**:";
    if (docu.returns) {
      var ret = docu.returns[0];
      this.current += " {" + this.printCommentDataTypes(ret.type) + "}";
      if (ret.description)
        this.current += " - " + ret.description;
      this.current += os.EOL;
    } else {
      this.current += " {void}" + os.EOL;
    }

    // Examples
    if(docu.examples) {
      let pl = docu.examples.length > 1 ? "s" : "";
      this.current += `${os.EOL}**Example${pl}:**`;
      docu.examples.forEach( e => this.current += os.EOL+"````js"+os.EOL+e+os.EOL+"````" );
    }

    // Write file for this function
    let path =  this.mdOutputElementsPath; // keep it flat, no module;
    let fileName = docu.longname + ".md";
    fs.mkdirSync(path, { recursive: true });
    fs.writeFileSync( path + fileName, this.current );
    this.current = "";
  }

}

module.exports = MarkdownPackageGenerator;