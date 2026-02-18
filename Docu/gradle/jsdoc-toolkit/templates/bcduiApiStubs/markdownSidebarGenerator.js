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
 * Generate markdown documentation for packages
 * Outputs one file per function
 */
class MarkdownSidebarGenerator extends MarkdownBaseGenerator {

  packages = {} // package_name -> { package: "", members: [], classes: [] }, members and classes map their name to their md
  current = "";

  /**
   * Constructor
   */
  constructor(opts, taffyDb) {
    super(opts, taffyDb);
  }

  //------------------------
  // Generate packages
  startPackage(packageDoc) {
    let pkg = packageDoc.longname.replaceAll(".", "_");
    let packageMd = this.packages[pkg] || { package: "", members: [], classes: [] };
    let intend = "  ".repeat(Math.max(packageDoc.longname.split(".").length - 1, 1));
    packageMd.package += `${intend}* [**_${packageDoc.longname}_**](${packageDoc.longname}.md)\n`;
//    packageMd += `${intend}  * <u>Functions:</u>\n`;
    this.packages[pkg] = packageMd;
  }

  printPackageMember(memberDoc) {}

  printPackageFunction(memberDoc) {
    let pkg = memberDoc.memberof.replaceAll(".", "_");
    let packageMd = this.packages[pkg] || "";
    let intend = "  ".repeat(memberDoc.longname.split(".").length-1);
    packageMd.members.push( `${intend}* [${memberDoc.name}()](${memberDoc.longname}.md)\n` );
    this.packages[pkg] = packageMd;
  }

  finishPackage(packageDoc) {
    let pkg = packageDoc.longname.replaceAll(".", "_");
    let packageMd = this.packages[pkg] || "";
    let intend = "  ".repeat(Math.max(packageDoc.longname.split(".").length - 1, 1));
//    packageMd += `${intend}  * <u>Classes:</u>\n`;
    this.packages[pkg] = packageMd;
  }

  //--------------------------
  // Generate classes
  startClass(classDoc) {
    let pkg = classDoc.memberof.replaceAll(".", "_");
    let packageMd = this.packages[pkg] || "";
    let intend = "  ".repeat(Math.max(classDoc.longname.split(".").length - 1, 1));
    packageMd.classes.push( `${intend}* [${classDoc.name} <sup>class</sup>](${classDoc.longname}.md)\n` );
    this.packages[pkg] = packageMd;
  }

  printMethod(methodDoc, isInherited) {}

  printClassMember(memberDoc) {}

  finishClass(classDoc) {}

  //--------------------------------
  // Finishing all generations
  finish() {
    Object.values(this.packages).forEach( value => {
      this.current += value.package;
      this.current += value.members.sort().join("");
      this.current += value.classes.sort().join("");
    });
    let path = this.mdOutputElementsPath;
    // docsif default is _sidebar.md, but the underscore is hidden by Jekyll on github, so we use a custom name here
    let fileName = "sidebar.md";
    fs.mkdirSync(path, { recursive: true });

    fs.writeFileSync( path + fileName, "* [Home](/)\n" );
    fs.writeFileSync( path + fileName, "* JavaScript packages\n", { flag: 'a' } );

    fs.writeFileSync( path + fileName, this.current, { flag: 'a' } );
  }
}

module.exports = {MarkdownSidebarGenerator}