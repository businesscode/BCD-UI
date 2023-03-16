/*
  Copyright 2010-2023 BusinessCode GmbH, Germany

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
var os = require('os')
var fs = require('jsdoc/fs');
var helper = require('jsdoc/util/templateHelper');

exports.publish = function(taffyData, opts, tutorials) 
{
  var result = "// This file contains BCD-UI Javascript Api stubs for IDE autosuggest"+ newLine(0);
  result += "// BCD-UI version --bcd-dyn-replace-current-version-date--"+ newLine(0) + newLine(0);

  // Debugging tuffy sample
  //console.log( JSON.stringify( taffyData({longname: "bcdui.component.chart.XmlChart"}).get() ) );

  // Namespaces and static functions
  result += printNamespaces( taffyData, opts );

  // Make all self defined JsDoc types available
  taffyData({kind: "typedef"}).get().forEach( function(typedef) {
    result += typedef.comment + newLine(0);
  });

  var allClasses = find( taffyData, { kind: "class", access: { "!is": "private" } } );

  // For some reason TaffyDB contains classes multiple times (up to 3) and some occurrences are unclean
  // It could well be that it has an issue with our way to annotate them with ja-doc.
  // Here we remove them as a work-around
  allClasses = allClasses.filter( (clazz) => { return clazz.longname.indexOf("~") === -1 ; } );
  allClasses = allClasses.filter( (clazz) => { return clazz.undocumented !== true; } );

  // We want the definitions to follow the order in bcduiLoader.js
  // So we loop over the files there and find the matching classes
  // Further, for windows, we first normalize the path separator to /
  var jsFiles = opts.query.files.split(",");
  allClasses.forEach( function(clazz){
    clazz.meta.bcdFullJsPath = clazz.meta.path.replace(/\\/g,'/')+'/'+clazz.meta.filename
  });
  jsFiles.forEach( function(jsFile) {
    // Find all classs in the current file
    var groupClasses = allClasses.filter( function(clazz) {
      return clazz.meta.bcdFullJsPath.indexOf(jsFile) !== -1;
    });
    // Print classes
    groupClasses.forEach( function(clazz, clazzIdx) {
      result += printClass( taffyData, clazz );
    }); // class
  });

  // Export bcdui package root, hiding local symbols
  result = result + "export { bcdui };" + newLine(0);

  fs.mkPath(opts.destination);
  fs.writeFileSync(opts.destination+"/bcduiApiStubs.js", result, 'utf8')

}

/**
 * Print a class docu block
 * @param taffyData
 * @param clazz
 * @returns {String}
 */
function printClass( taffyData, clazz )
{
  var result = "";

  result += newLine(0);

  // Add the documentation for the class
  // This is before the class definition and is used by IDEA.
  // Eclipse 2021-12 and VSC 1.63 need get a copy at the constructor below
  result += "/**" + newLine(1);
  result += printExternalLink("https://businesscode.github.io/BCD-UI-Docu/jsdoc/"+clazz.longname+".html")+newLine(1);
  if( clazz.classdesc )
    result += "@description " + clazz.classdesc.replace(/(\r?\n|\r)/gm," ") + newLine(1);
  if (clazz.description)
    result += "@description " + clazz.description.replace(/(\r?\n|\r)/gm," ") + newLine(1);
  if (clazz.examples)
    result += printCommentExamples( clazz.examples );
  if (clazz.augments)
    result += "@extends " + clazz.augments[0]  + newLine(0);;
  result += "*/" + newLine(0)

  // The name of the class is stored in the variable .longname.
  // Some longnames contain a ~ which needs to be removed
  var name_adjusted = clazz.longname;
  if (name_adjusted.includes("~")){
    name_adjusted = name_adjusted.split("~")[1]
  }

  // Start -> Print out Class
  // Print the name...
  result += name_adjusted + " = class ";

  // ...add extends for this class, stored in .augments
  if (clazz.augments)
    result += "extends " + clazz.augments[0];

  result += "{" + newLine(1);

  // ... add Constructor parameter
  result += "/**" + newLine(1);

  result += printCommentParams(clazz.params, clazz, "Constructor");

  // Eclipse 2021-12 an VSC expect the class description at the constructor.
  // We print it after the params because for IDEA this is repeated for each param and after it is better to read
  result += printExternalLink("https://businesscode.github.io/BCD-UI-Docu/jsdoc/"+clazz.longname+".html")+newLine(1);
  if( clazz.classdesc )
    result += "@description " + clazz.classdesc.replace(/ *(\r?\n|\r) */gm," ") + newLine(1);
  if (clazz.description)
    result += "@description " + clazz.description.replace(/( *\r?\n|\r *)/gm," ") + newLine(1);
  if (clazz.examples)
    result += printCommentExamples( clazz.examples );
  if (clazz.augments)
    result += "@extends " + clazz.augments[0]  + newLine(1);;

  result += "  */" + newLine(1);

  // ... add the Constructor
  result += "constructor("
  var paramList = "";
  if(clazz.params && clazz.params.length !== 0){
    clazz.params.forEach( function(param) {
      if (param.name.includes('.')) return;
      paramList += param.name + ", ";
    })
    paramList = paramList.slice(0, -2);
  }

  result += paramList+"){"
  if( clazz.augments ) result += " super("+paramList+"); "; // Avoid missing arg warning in Eclipse
  else result += " console.log("+paramList+"); "; // Avoid unused arg warning in Eclipse
  result += "}" + newLine(1);

  // ...for each method, print the methods
  var methods = find(taffyData,{ kind: "function", memberof: name_adjusted });
  methods = methods.filter( function(m){ return m.access !== "private" } );
  methods.sort( function(m1, m2){ return m1.name > m2.name } );
  var ownMethods = methods.filter( function(m){ return !m.inherits } );
  ownMethods.forEach( function(method, methodIdx) {
    result += printMethod_forClasses(method, methodIdx, clazz, method.name) + newLine(1);
  });

  // ... add all methods that are inherited from the parent class
  var inheritedMethods = methods.filter( function(m){ return !!m.inherits && ownMethods.filter(om => om.name === m.name).length === 0 } );
  inheritedMethods.forEach( function(method, methodIdx) {
    result += printMethod_forClasses(method, methodIdx, clazz, method.name ) + newLine(1)
  });

  // ... and close the bracket
  result = result.slice(0, -2) + newLine(0);
  result += "}" + newLine(0) + newLine(0) + newLine(0);

  return result;
}

/**
 * Print a method docu block
 * @param method
 * @param methodIdx
 * @param clazz
 * @returns {String}
 */
function printMethod_forClasses(method, methodIdx, clazz, name)
{
  var result = ""

  // Add the documentation for the method, but only if the documentation actually exists.
  if (method.description || (method.params && method.params.length !== 0)) {
    result = "/**" + newLine(1);
    result += printExternalLink("https://businesscode.github.io/BCD-UI-Docu/jsdoc/"+clazz.longname+".html#"+(method.scope==="static"?".":"")+method.name)+newLine(1);

    if (method.description)
      result += "@description " + formatDescription(method.description) + newLine(1);

    // ... add the params
    result += printCommentParams(method.params, clazz, method);

    if (method.inherits) result += "@inherits " + method.inherits + newLine(1);
    if (method.overrides) result += "@overrides " + method.overrides + newLine(1);
    if (method.deprecated) result += "@deprecated " + method.deprecated + newLine(1);
    if (method.returns) {
      var ret = method.returns[0];
      result += "@return";
      result += printCommentDataTypes(ret.type);
      if (ret.description)
        result += " " + ret.description;
      result += newLine(1);
    }
    result += "*/" + newLine(1);
  }

  // Create the method
  result += name + "(";
  var paramList = "";
  if (method.params){
    method.params.forEach(function (param){
      if (param.name.includes('.')) return;
      paramList += param.name + ",";
    })
    if (method.params.length != 0) {
      paramList = paramList.slice(0, -1);
    }
  }

  // Close the bracket
  if( paramList!=="" ) result += paramList+") { console.log("+paramList+"); }"; // Avoid unused var warning (in Eclipse)
  else result += ") {}";

  return result;
}

/**
 * Loop over namespaces and static functions
 */
function printNamespaces( taffyData, opts )
{
  var allNamespaces = find( taffyData, { kind: "namespace", access: { "!is": "private" }  } );
  // Make sure namespaces are defined bottom up
  allNamespaces = allNamespaces.sort( function(a,b){ return a.longname.localeCompare(b.longname) } )

  var result = "";
  allNamespaces.forEach( function( namespace ) {

    // Check for conflicting @namespace definitions
    var sameNsDefs = taffyData( { kind: "namespace", longname: namespace.longname } ).get();
    if( sameNsDefs.length > 1 ) {
      var errorMsg = namespace.longname + " was found at: ";
      sameNsDefs.forEach( function(nsDef) {
        errorMsg += "[" + nsDef.meta.filename + " line: " + nsDef.meta.lineno +"] ";
      });
      throw("namespace '" + namespace.longname + "' is defined multiple times! " + errorMsg);
    }

    result += newLine(0) + "/**" + newLine(0);
    result += " * " + printExternalLink("https://businesscode.github.io/BCD-UI-Docu/jsdoc/"+namespace.longname+".html") + newLine(0);;
    if( namespace.description )
      result += " * @description " + formatDescription(namespace.description) + newLine(0);
    result += " * @namespace " + newLine(0);
    result += " */" + newLine(0);
    if( namespace.longname.indexOf(".") === -1 )
      result += "var ";
    result += namespace.longname + " = {};" + newLine(0) + newLine(0);

    result += printProperties( taffyData, namespace.longname );

    // Now list the static functions of this namespace
    var methods = find(taffyData,{ kind: "function", memberof: namespace.longname });
    methods = methods.filter( function(m){ return m.access !== "private" } );
    methods.sort( function(m1, m2){ return m1.name > m2.name } );

    methods.forEach ( function( method, methodIdx ) {
      result += newLine(0) + printMethods_forNamespace(method, methodIdx, namespace, namespace.longname);
    })

  });

  return result;
}

/**
 * Static package functions
 * @param method
 * @param methodIdx
 * @param clazz
 * @param tempAlias
 * @returns {string}
 */
function printMethods_forNamespace(method, methodIdx, clazz, tempAlias)
{
  var result = "/**"+newLine(0);

  // IDEA 2021.1.3 will repeat the full description for each param, so we start with the param description here
  // to make it easier to read
  result += printCommentParams( method.params, clazz, method );

  result += printExternalLink("https://businesscode.github.io/BCD-UI-Docu/jsdoc/"+clazz.longname+".html#"+(method.scope==="static"?".":"")+method.name)+newLine(1);
  result += "@description " + formatDescription(method.description)+newLine(1);
  // IDEA (2012.2) needs @method (to show type) and @memberOf (to understand it belongs to the class)
  result += "@method "+method.name+newLine(0);
  if( method.virtual )
    result += "@abstract Use a concrete subclass"+newLine(0); // Wired enough, Eclipse needs a random string here to not indent the next tag
  if( method.inherits )
    result += "@inherits "+method.inherits+newLine(0);
  if( method.overrides )
    result += "@overrides "+method.overrides+newLine(0);
  if( method.deprecated )
    result += "@deprecated "+ method.deprecated+newLine(0);
  // IDEA prefers samples before parameters
  result += printCommentExamplesMandatories( method, clazz );
  result += printCommentExamples( method.examples );

  if( method.returns ) {
    var ret = method.returns[0];
    result += "@return";
    result += printCommentDataTypes( ret.type );
    if( ret.description )
      result += " "+ret.description;
    result += newLine(0);
  }
  // Next row is actually evaluated by IDEA and it is not enough to have that in the able above
  result += "@memberOf "+clazz.longname+(method.scope !== "static" ? "#" : "")+""+newLine(0);
  result += " */"+newLine(0);

  // Now the Javascript code
  result += clazz.longname;
  if( method.scope !== "static" )
    result += ".prototype";
  result += "."+method.name+" = function(";
  var paramList = "";
  if( method.params ) {
    method.params.filter(function(param) {
      return param.name && param.name.indexOf(".")===-1
    }).forEach( function(param, paramIdx) {
      paramList += paramIdx > 0 ? ", " : "";
      paramList += param.name;
    });
  }
  // Add a console.log to prevent unused var when file is validated (by Eclipse)
  if( paramList !== "" ) result += paramList+") { console.log("+paramList+"); };"+newLine(0)+newLine(0);
  else result += ") {};"+newLine(0)+newLine(0);

  result += newLine(0);

  return result;
}

/**
 * Print the properties of an object
 */
function printProperties( taffyData, containerLongname )
{
  var result = "";
  var members = taffyData( { memberof: containerLongname, access: {"!is": "private"} }, [ {kind: "member"}, {kind: "constant"} ] ).get();
  members.filter( m => m.description ).forEach( function(member) {

    if( // Wired, happens on bcdui.something[1] = x;
        member.longname.indexOf("[undefined]") !== -1
          // Skip class and namespaces, they are also show up here as kind:member, but are handled else where. 
          // And if the property shows up multiple times (init, assignment etc), it is enough to declare it private once to hide it here
        || taffyData({ longname: member.longname}, [{kind: "class"}, {kind: "namespace"}, {access: "private"}] ).count() > 0
          // If it shows up undocumented but there is a documented version, take that one
        || ( !member.description && taffyData({ longname: member.longname, description: {"isUndefined": false} } ).count() > 0 ) )
      return true;

    if( member.description ) {      
      result += "/**" + newLine(0);
      result += " * " + member.description + newLine(0);
      result += " */" + newLine(0);
    }

    var connect = member==="static" ? '.' : '.prototype.'; // Member are separated with a # from classname in jsdoc, but her we want to see the dot
    result += member.longname.replace("#",connect);
    if( member.meta.code.type === "NewExpression" && member.type )
      result += " = new " + member.type.names[0] + "()";
    else if( member.meta.code.type === "Literal" && member.meta.code.value && member.type && member.type.names[0].toLowerCase() === "string" )
      result += " = \"" + member.meta.code.value + "\"";
    else if( member.meta.code.type === "Literal" && !isNaN(parseFloat(member.meta.code.value) ))
      result += " = " + member.meta.code.value;
    else
      result += " = {}"; // We need this dummy assignment for Eclipse Mars autosuggestion to work. And if we assign only null, tooltip fails
    result +=  ";"+newLine(0);
  });
  
  return result + newLine(0);
}

/*
 * Utility functions
 */
var newLine = function(Tabs){
  var result = "";

  for(var i = 0; i < Tabs; i++){
    result += "  ";
  }
  return os.EOL + result;
}

function find(taffyData, spec) {
  return helper.find(taffyData, spec);
}

/**
 * Print the comment section for the parameters
 * TODO, in case of multiple parameter sets, keep the groups together
 * @param params
 * @param clazz
 * @param method
 * @returns {String}
 */
function printCommentParams( params, clazz, method )
{
  if( !params || params.length===0)
    return "";

  var result = "";
  params.forEach( function(param) {
    result += "@param";
    result += printCommentDataTypes(param.type);
    if (param.name) {
      result += " " + (param.optional ? '['+param.name+']' : param.name);
    } else
      console.warn("Missing param name at " + clazz.longname + "." + method.name);
    if (param.description)
      result += "  " + formatDescription(param.description);
    result += newLine(1);
  });

  return result;
}

/**
 * Print a {type} or {(type1|type2)} for the comment section
 * @param type
 * @returns {String}
 */
function printCommentDataTypes( type )
{
  var result = "";
  if( type && type.names ) {
    result += " {" + (type.names.length>1 ? "(":"");
    type.names.forEach( function(pTNname, pTNnameIdx) { result += pTNnameIdx>0 ? "|" : ""; result += pTNname } );
    result += (type.names.length>1 ? ")":"") + "}";
  }
  return result;
}

/**
 * Print a sourcecode example for into the comment area
 * @param examples
 * @returns {String}
 */
function printCommentExamples( examples )
{
  var result = "";
  if( examples )
    examples.forEach( function(example) { result += printExample(example) } );
  return result;
}


/**
 * Create an example for JSDoc where a method is shown with exactly the mandatory parameters
 */
function printCommentExamplesMandatories( method, clazz )
{
  if( ! method.params || method.params.length < 2 )
    return "";

  // generate a sample. VSC 16.3 will only show leading spaces for the first row, so we do not write them here at all
  var instName = "my" + clazz.name;
  var result = "// Sample using the mandatory parameters"+newLine(0);
  if( method === clazz ) {
    if( clazz.virtual )
      return "";
    result += "  var "+instName+" = new " + clazz.longname;
  } else if( method.scope !== "static" ) {
    if( method.returns )
      result += "  var ret = ";
    result += instName + "." + method.name;
  } else  {
    result += "  ";
    if( method.returns )
      result += "var ret = ";
    result += method.longname.replace("#","."); // Instance functions are separated with a # from classname in jsdoc, but her we want to see the dot
  }
  result += "(";

  var hasParamBag = method.params.some( function(p) { return p.name.indexOf(".") !== -1; } );

  if( hasParamBag )
    result += " {";
  method.params.filter( function(param) {
    // We do not want param bags here, only their parts
    return ! param.optional && ! (hasParamBag && param.name.split(".").length===1);
  }).forEach( function(param,paramIdx) {
    result += paramIdx > 0 ? ", " : " ";
    if( hasParamBag )
      result += param.name.split(".")[1] + ": " + param.name.split(".")[1];
    else
      result += param.name;
  });
  if( hasParamBag )
    result += " }";
  result += " );";

  return printExample(result);

}

/**
 * Needed cleanup for descriptions
 * a) XML samples with @ are misinterpreted as jsdoc tags, we escape them, Some like {@link are valid, so only those looking like xml (testcase dp.write())
 * b) IDEA as of beginning 2022 has issues (WEB-18474) with multi-line descriptions. They lead to repeated description at the other params. (tescase each args.x param when ctrl-space within {})
 * c) VSC 1.63 does cut multiline descriptions at the first html tag (testcase bcdui.core).
 *    While it still does ignore html tags, it destroys the intended format but this way it is at least visible as unformatted text
 * @param text
 */
function formatDescription(text)
{
  if( !text )
    return "";
  return text.replace(/( |\/|,|\[)@/g,"$1&commat;").replace(/ *(\r?\n|\r) */gm," ");
}

/**
 * IDEA understands @link, VSC 1.63 and Eclipse 2021-12 doe not, so we create both here
 * Internal links do nor work for Eclipse anyway, so we just tak care here for external ones
 * @param link
 */
function printExternalLink(link) {
  var result = "@see [Online Api]("+link+") {@link "+link+" Online Api}";
  return result;
}

/**
 * VSC 1.63 and IDEA 2021-1-3 work fine with the @example tag including format and syntax highlighting
 * But Eclipse 2022-1 does not show the source code formatted (not even monospaced) and drops line breaks
 * We surround samples with <pre> to better support Eclipse. VSC is still ok when the tag is part of a comment
 * IDEA sadly looses syntax highlighting for this best tradeoff between the supported IDEs
 * @param example
 * @returns {string}
 */
function printExample(example) {
  let isHtml = example.match(/ *</);
  var result = "@example"+newLine(1);
  result += isHtml ?  "<-- <pre> -->" : "//<pre>";
  result += newLine(1)+example+newLine(1);
  result += isHtml ?  "<-- </pre> -->" : "//</pre>";
  result += newLine(1);
  return result;
}
