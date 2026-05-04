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
/**
 * @fileoverview
 * This file is used by JSDoc to generate API stubs
 * It tries to optimize auto-suggest and type tooltip help in Eclipse Mars I JSDT editor, criteria are:
 * - editor autosuggests nested bcdui. types with comment
 * - editor autosuggests methods of these types with comment
 * - tooltip works on constructor and on methods
 * - no global object without package (like SimpleModel) is autosuggested on new
 * - for both above, the type header is no to wired (current solution is not perfect here)
 * - The methods in autosuggest indicate where they come from (current solution is not perfect here)
 */
var helper = require('jsdoc/util/templateHelper');
const MarkdownIndexGenerator = require("./markdownIndexGenerator")
const MarkdownPackageGenerator = require("./markdownPackageGenerator")
const MarkdownClassGenerator = require("./markdownClassGenerator")
const {MarkdownSidebarGenerator} = require("./markdownSidebarGenerator")
const {ApiStubsClassGenerator} = require("./apiStubsClassGenerator")
const {ApiStubsPackageGenerator} = require("./apiStubsPackageGenerator")

/**
 * Entry point for documentation generation from jsdoc
 * @param taffyData taffy db holding the doclets created by jsdoc
 * @param opts      command line options
 */
exports.publish = function(taffyData, opts)
{
  // console.log(JSON.stringify( taffyData({name: "addRowMeasure"}).get()[0], null, 2 ));

  // We generate various output files for IDE autocompletion, typescript type files and for AO
  const generators = [
    new ApiStubsClassGenerator(opts, taffyData),
    new ApiStubsPackageGenerator(opts, taffyData),
    new MarkdownIndexGenerator(opts, taffyData),
    new MarkdownPackageGenerator(opts, taffyData),
    new MarkdownClassGenerator(opts, taffyData),
    new MarkdownSidebarGenerator(opts, taffyData)
  ]

  //-----------------------------------------
  // Namespaces and static functions
  var allNamespaces = helper.find( taffyData, { kind: "namespace", access: { "!is": "private" } } );
  // Make sure namespaces are defined bottom up
  allNamespaces = allNamespaces.sort( function(a,b){ return a.longname.localeCompare(b.longname) } )

  allNamespaces
    .filter( n => n.longname.startsWith("bcdui") )
    .forEach( function( namespace ) {

      // Open package definition
      generators.forEach(g => g.startPackage(namespace));

      // Now list the static functions of this namespace
      var methods = helper.find(taffyData,{ kind: "function", memberof: namespace.longname });
      methods = methods.filter( m => m.access !== "private" )
      methods.sort( (m1, m2) => m1.name.localeCompare(m2.name) );
      methods.forEach ( function( method, methodIdx ) {
        generators.forEach(g => g.printPackageFunction(method));
      });

      // And any properties of this namespace
      var members = taffyData( { memberof: namespace.longname, access: {"!is": "private"} }, [ {kind: "member"}, {kind: "constant"} ] ).get();
      members.sort( (m1, m2) => m1.name.localeCompare(m2.name) );
      members.filter( m => m.description ).forEach( function(member) {
        generators.forEach(g => g.printPackageMember(member));
      });

      // Close and write the package
      generators.forEach(g => g.finishPackage(namespace));
  });

  //------------------------------------------
  // Class definitions
  var allClasses = helper.find( taffyData, { kind: "class", access: { "!is": "private" } } );

  // For some reason TaffyDB contains classes multiple times (up to 3) and some occurrences are unclean
  // It could well be that it has an issue with our way to annotate them with ja-doc.
  // Here we remove them as a work-around
  allClasses = allClasses.filter( _ => _.longname.indexOf("~") === -1 );
  allClasses = allClasses.filter( _ => _.undocumented !== true );

  // We want the definitions to follow the order in bcduiLoader.js
  // So we loop over the files there and find the matching classes
  // Further, for windows, we first normalize the path separator to /
  var jsFiles = opts.query.files.split(",");
  allClasses.forEach( function(clazz){
    clazz.meta.bcdFullJsPath = clazz.meta.path.replace(/\\/g,'/')+'/'+clazz.meta.filename
  });
  jsFiles.forEach( function(jsFile) {
    // Find all classes in the current file
    var groupClasses = allClasses.filter( function(clazz) {
      return clazz.meta.bcdFullJsPath.indexOf(jsFile) !== -1;
    });
    // Print classes
    groupClasses.forEach( function(clazz, clazzIdx) {

      // Open class definition
      generators.forEach( g => g.startClass(clazz) );


      // The name of the class is stored in the variable .longname.
      // Some longnames contain a ~ which needs to be removed
      var name_adjusted = clazz.longname;
      if (name_adjusted.includes("~")){
        name_adjusted = name_adjusted.split("~")[1]
      }

      // ...for each method, print the methods
      var methods = helper.find(taffyData,{ kind: "function", memberof: name_adjusted });
      methods = methods.filter( _=> _.access !== "private" );
      methods.sort( (m1, m2) => m1.name.localeCompare(m2.name) );
      var ownMethods = methods.filter( _ => !_.inherits );
      ownMethods.forEach( function(method, methodIdx) {
        generators.forEach(g => g.printMethod(method, false));
      });

      // ... add all methods that are inherited from the parent class
      // Each implementation of each base class in hierarchically shows up, we make it here unique (TODO and take just any)
      var inheritedMethods = methods.filter( function(m){ return !!m.inherits && ownMethods.filter(om => om.name === m.name).length === 0 } );
      inheritedMethods.sort( (m1, m2) => m1.name.localeCompare(m2.name) );
      const handledMethodMap = new Set();
      inheritedMethods.forEach( function(method, methodIdx) {
        if( handledMethodMap.has(method.name) ) return;
        handledMethodMap.add(method.name);
        generators.forEach(g => g.printMethod(method, true));
      });

      // Static class members
      var members = taffyData( { memberof: clazz.longname, access: {"!is": "private"} }, [ {kind: "constant"} ] ).get();
      members.sort( (m1, m2) => m1.name.localeCompare(m2.name) );
      members.forEach( function(member) {
        generators.forEach( g => g.printClassMember(member) );
      });

      // Close class
      generators.forEach( g => g.finishClass(clazz) );

    }); // class

  });

  // Close all generators
  generators.forEach( g => g.finish() );
}

