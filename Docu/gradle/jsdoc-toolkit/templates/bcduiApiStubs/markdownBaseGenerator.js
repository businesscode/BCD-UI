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
const helper = require('jsdoc/util/templateHelper');

const {Generator} = require("./generator");

/**
 * Generate markdown documentation for a class or method
 * Common logic for package and class api stubs markdown generation
 * @extends Generator
 */
class MarkdownBaseGenerator extends Generator {

  /**
   * Constructor
   * @param opts
   * @param taffyDb
   */
  constructor(opts, taffyDb) {
    super(opts, taffyDb);
    this.mdIndexPath    = "generated/index/";
    this.mdElementsPath = "generated/elements/";
    this.mdOutputIndexPath    = this.opts.destination + "/../md/" + this.mdIndexPath   ;
    this.mdOutputElementsPath = this.opts.destination + "/../md/" + this.mdElementsPath;
  }

  /**
   * Print a parameter list and potentially contained complex types
   * @param params
   * @returns {string}
   */
  printParams(params) {

    let result = "";

    // Parameter list
    if( params?.length > 0 ) {

      //--------------------
      // Parameters themselves
      result += os.EOL+os.EOL;
      result += "| Name     | Type     | Default  | Description |" + os.EOL;
      result += "|----------|----------|----------|-------------|" + os.EOL;
      let that = this;
      params.forEach( param => {
        let name = param.name+ (param.optional ? "?" : "");
        let types = this.printCommentDataTypes(param.type).replaceAll(/([<|])/g, "\\$1");
        let defaultVal = param.defaultvalue ?? "";
        let descr = param.description?.replace(/[\r\n]+/g, '<br/>').trim() ?? "";
        descr = that.jsLinksToMarkdownLinks(descr);
        result += `| ${name} | ${types} | ${defaultVal} | ${descr} |${os.EOL}`
      });

      //--------------------
      // Potentially complex types from the parameter list
      // Types do not become headers so that they are not part of the sidebar
      params.forEach( param => {
        param.type?.names.forEach(tn => {
          let types = helper.find(this.taffyDb, {kind: "typedef", name: tn});
          if( types.length === 0 || !types[0].properties ) return;
          result += os.EOL + "Type **" + tn + "**" + os.EOL;
          result += os.EOL + "| Name     | Type     | Default  | Description |";
          result += os.EOL + "|----------|----------|----------|-------------|";
          types[0].properties?.forEach(p => {
            let desc = that.jsLinksToMarkdownLinks(p.description);
            desc = desc.replaceAll(/[\r\n]+/g, '<br/>').trim();
            result += os.EOL + `| ${p.name + (p.optional ? "" : "")} | ${p.type.names[0]} | ${p.defaultvalue ?? ""} | ${desc} |`
          });
          result += os.EOL;
        });
      });
    }

    return result;
  }

  /**
   * Replace jsdoc {@link} tags with markdown links
   * Limitation: We do not have links to param types but list them below the function
   * @param content
   * @returns {string}
   */
  jsLinksToMarkdownLinks(content) {
    if( !content ) return content;
    return content.replaceAll(
      /\{@link\s+([^}\s]+)(?:\s+([^}]*))?\}/g,
      function(match, ref, text) {
        const label = text || ref;
        if( label.endsWith("Param") ) return " of type **" + label + "**";
        const path = ref.replaceAll(/\(|\)/g, "");
        return `[${label}](${path}.md)`;
      }
    );
  }

}

module.exports = {MarkdownBaseGenerator};