/*
  Copyright 2010-2017 BusinessCode GmbH, Germany

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

  // Debug helper
  //console.log( JSON.stringify( taffyData({longname: "bcdui.component.chart"}).get() ) );

  printNamespaces( taffyData, opts );

  var allClasses = find( taffyData, { kind: "class", access: { "!is": "private" }, virtual: { "!is": true } } );
  var bcdFileGroups = opts.query.bcdFileGroups.split(",");

  bcdFileGroups.forEach( function(group) 
  {
    var result = "";

    var groupClasses = allClasses.filter( function(clazz) { 
      return clazz.meta.filename.indexOf(group) !== -1;
    });
    
    groupClasses.forEach( function(clazz, clazzIdx) {

      result += printClass( taffyData, clazz );

    }); // class
    
    if( result ) {
      // Hiding local symbols
      result = "(function(){" + newLine+newLine + result + "})();"+newLine;

      fs.mkPath(opts.destination);
      fs.writeFileSync(opts.destination+"/"+group+"ApiStub.js", result, 'utf8')
    }
  });

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
  result += "/*"+newLine;
  result += "  "+clazz.alias+newLine;
  result += " */"+newLine;

  // This dummy has to come before the clazz comment and it has to have the same name as the member (without the package)
  // Eclipse does not recognize prototype extension on nested objects, that's why we put them on this global object first
  var tempAlias = clazz.name;
  result += "var "+tempAlias+"; // Serves as an Eclipse workaround"+newLine;
  
  // Print the comment.
  // Class related
  result += newLine+"/**"+newLine;
  if( clazz.classdesc || clazz.virtual )
    result += "@classdesc"+newLine;
  if( clazz.classdesc )
    result += clazz.classdesc+newLine;
  if( clazz.virtual )
    result += "@abstract Use a concrete subclass"+newLine; // Wired enough, Eclipse needs a random string here to not treat the next tag as its content
  if( clazz.augments )
    clazz.augments.forEach( function(aug) { result+="@extends "+aug+newLine } );
  if( clazz.deprecated )
    result += "@deprecated" + clazz.deprecated + newLine;

  // Constructor related. Eclipse Mars does not like the @constructs tag, it will use the next tag as its content
  if( clazz.description )
    result += "@description "+clazz.description+newLine;
  result += printCommentExamplesMandatories( clazz, clazz );
  result += printCommentExamples( clazz.examples, clazz, "Constructor" );
  result += printCommentParams( clazz.params, clazz, "Constructor" );
  result += newLine+" */"+newLine;

  // Assignment to name with package is needed for Eclipse auto-suggest and for tooltip of functions
  // Assignment to short name is necessary for Eclipse fly-over on constructor and the type-name for the methods
  result += clazz.alias+" = "+tempAlias+" = function(";
  if( clazz.params ) {
    clazz.params.filter(function(param){
      if( param.name )
        return param.name.indexOf(".")===-1;
      console.warn("Missing param name for constructor of "+clazz.longname);
        return false;
    }).forEach( function(param, paramIdx) {
      result += paramIdx > 0 ? ", " : " ";
      result += param.name;
    });
    result += " ";
  }
  result += "){};"+newLine;
  if( clazz.augments )
    result += clazz.name+".prototype = Object.create("+clazz.augments+".prototype);"+newLine+newLine;

  // Now print the methods
  var methods = find(taffyData,{ kind: "function", memberof: clazz.longname });
  methods = methods.filter( function(m){ return m.access !== "private" } );
  methods.sort( function(m1, m2){ return m1.name > m2.name } );

  var ownMethods = methods.filter( function(m){ return !m.inherits } );
  ownMethods.forEach( function(method, methodIdx) {
    result += printMethod(method, methodIdx, clazz, tempAlias)
  });

  // TODO note in comment that the method is inherited
  var inheritedMethods = methods.filter( function(m){ return !!m.inherits } );
  if( inheritedMethods.length > 0 ) {
    result += "//------------------"+newLine;
    result += "// Inherited Methods"+newLine+newLine;
  }
  inheritedMethods.forEach( function(method, methodIdx) {
    result += printMethod(method, methodIdx, clazz, tempAlias )
  });

  // Finally re-assign the temp object with same name but without package to the long name to complete the Eclipse workaround
  result += clazz.alias+" = "+tempAlias+";"+newLine+newLine;

  return result;
}


/**
 * Print a method docu block
 * @param method
 * @param methodIdx
 * @param clazz
 * @returns {String}
 */
function printMethod(method, methodIdx, clazz, tempAlias) 
{
  var result = "/**"+newLine;
  if( method.description )
    result += "@description"+newLine+method.description+newLine;
  if( method.virtual )
    result += "@abstract Use a concrete subclass"+newLine; // Wired enough, Eclipse needs a random string here to not indent the next tag
  if( method.inherits )
    result += "@inherits "+method.inherits+newLine;
  if( method.overrides )
    result += "@overrides "+method.overrides+newLine;
  if( method.deprecated )
    result += "@deprecated" + method.deprecated + newLine;
  result += printCommentParams( method.params, clazz, method );
  result += printCommentExamplesMandatories( method, clazz );
  result += printCommentExamples( method.examples, clazz, method );

  if( method.returns ) {
    var ret = method.returns[0];
    result += "@return";
    result += printCommentDataTypes( ret.type );
    if( ret.description )
      result += " "+ret.description;
    result += newLine;
  }
  
  result += " */"+newLine;

  // Now the Javascript code
  result += tempAlias;
  if( !method.scope === "static" ) 
    result += ".prototype";
  result += "."+method.name+" = function(";
  if( method.params ) {
    method.params.filter(function(param) { 
      return param.name && param.name.indexOf(".")===-1
    }).forEach( function(param, paramIdx) {
      result += paramIdx > 0 ? ", " : " ";
      result += param.name;
    });
    result += " ";
  }
  result += "){};"+newLine+newLine;

  result += newLine;

  return result;
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
  
  var result = "@parameters"+newLine; // Fake tag, useful for building an optical group. @param woul conflict with our dl approach
  result += "<dl>" + newLine;
  params.forEach( function(param) {
    result += "<dt>";
    if( param.name ) {
      result += param.name.indexOf(".")!==-1 ? "&#160;&#160;&#160;&#160;- " : ""; // Indent properties of argument object
      result += param.name.split(".")[param.name.split(".").length-1];
    } else
      console.warn("Missing param name at "+clazz.longname+"."+method.name);
    result += printCommentDataTypes( param.type );
    if( param.defaultvalue )
      result += " - default: " + param.defaultvalue;
    else if( param.optional )
      result += " - optional";
    result += "</dt><dd>";
    if( param.description )
      result += "  "+param.description;
    result += "</dd>"+newLine;
    
    /*
  // Backup - Classic JSDoc style
  result += "@param";
  result += printCommentDataTypes( param.type );
  if( param.name ) {
    result += " "+param.name;
  } else
    console.warn("Missing param name at "+clazz.longname+"."+method.name);
  if( param.description )
    result += "  "+param.description;
     */
  });
  result += "</dl>" + newLine;

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
    result += "}" + (type.names.length>1 ? ")":"");
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
    examples.forEach( function(example) { result+="@example <code><pre>"+newLine+example.replace(/</g, "&lt;")+newLine+"</pre></code>"+newLine } );
  return result;
}


/**
 * Create an example for JSDoc where a method is shown with exactly the mandatory parameters
 */
function printCommentExamplesMandatories( method, clazz )
{
  if( ! method.params || method.params.length < 2 )
    return "";
 
  var instName = clazz.name.charAt(0).toLowerCase() + clazz.name.slice(1);
    
  var result = "// Usage using just the mandatory parameters:"+newLine;
  if( method === clazz ) {
    if( clazz.virtual )
      return "";
    result += "var "+instName+" = new " + clazz.longname;
  } else {
    if( method.returns )
      result += "var ret = ";
    result += method.longname;
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

  result += newLine;

  return "@example"+newLine+"<code><pre>"+newLine+result.replace(/</g, "&lt;")+newLine+"</pre></code>"+newLine;
  
}

/**
 * Loop over namespaces and create a common output file
 */
function printNamespaces( taffyData, opts )
{
  var allNamespaces = find( taffyData, { kind: "namespace", access: { "!is": "private" }  } );
  var result = "";
  allNamespaces.forEach( function( namespace ) {

    // Check fo conflicting @namespace definitions
    var sameNsDefs = taffyData( { kind: "namespace", longname: namespace.longname } ).get();
    if( sameNsDefs.length > 1 ) {
      var errorMsg = namespace.longname + " was found at: ";
      sameNsDefs.forEach( function(nsDef) {
        errorMsg += "[" + nsDef.meta.filename + " line: " + nsDef.meta.lineno +"] ";
      });
      throw("namespace '" + namespace.longname + "' is defined multiple times! " + errorMsg);
    }
    
    result += "/**" + newLine;
    if( namespace.description )
      result += " * " + namespace.description + newLine;
    result += " * @namespace " + newLine;
    result += " */" + newLine;
    if( namespace.longname.indexOf(".") === -1 )
      result += "var ";
    result += namespace.longname + " = {};" + newLine + newLine;
    
    result += printProperties( taffyData, namespace.longname );

    var methods = find(taffyData,{ kind: "function", memberof: namespace.longname });
    methods = methods.filter( function(m){ return m.access !== "private" } );
    methods.sort( function(m1, m2){ return m1.name > m2.name } );
    methods.forEach ( function( method, methodIdx ) {
      result += printMethod(method, methodIdx, namespace, namespace.longname);
    })

  });

  fs.mkPath(opts.destination);
  fs.writeFileSync(opts.destination+"/bcduiNamespacesApiStub.js", result, 'utf8')
}


/**
 * Print the properties of an object
 */
function printProperties( taffyData, containerLongname )
{
  var result = "";
  var members = taffyData( { memberof: containerLongname, access: {"!is": "private"} }, [ {kind: "member"}, {kind: "constant"} ] ).get();
  members.forEach( function(member) {

    if( // Wired, happens on bcdui.something[1] = x;
        member.longname.indexOf("[undefined]") !== -1
          // Skip class and namespaces, they are also show up here as kind:member, but are handled else where. 
          // And if the property shows up multiple times (init, assignment etc), it is enough to declare it private once to hide it here
        || taffyData({ longname: member.longname}, [{kind: "class"}, {kind: "namespace"}, {access: "private"}] ).count() > 0
          // If it shows up undocumented but there is a documented version, take that one
        || ( !member.description && taffyData({ longname: member.longname, description: {"isUndefined": false} } ).count() > 0 ) )
      return true;

    if( member.description ) {      
      result += "/**" + newLine;
      result += " * " + member.description + newLine;
      result += " */" + newLine;
    }

    result += member.longname;
    if( member.meta.code.type === "NewExpression" && member.type )
      result += " = new " + member.type.names[0] + "()";
    else if( member.meta.code.type === "Literal" && member.meta.code.value && member.type && member.type.names[0].toLowerCase() === "string" )
      result += " = \"" + member.meta.code.value + "\"";
    else if( member.meta.code.type === "Literal" && parseFloat(member.meta.code.value) === parseFloat(member.meta.code.value) )
      result += " = " + member.meta.code.value;
    else
      result += " = {}"; // We need this dummy assignment for Eclipse Mars autosuggestion to work. And if we assign only null, tooltip fails
    result +=  ";"+newLine;
  });
  
  return result + newLine;
}

/*
 * Utility functions
 */
var newLine = os.EOL;
function find(taffyData, spec) {
  return helper.find(taffyData, spec);
}
