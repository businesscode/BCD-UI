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
 * This file creates a custom tag basically for each BCD-UI construct, that has a parameter of type targetHtmlRef
 * and outputs one file per file group containing this
 * This should be bcdui.core.Renderer and all widgets(Ng)
 */
var os = require('os')
var fs = require('jsdoc/fs');
var helper = require('jsdoc/util/templateHelper');

exports.publish = function(taffyData, opts, tutorials) 
{

  // Debug helper
  //console.log( JSON.stringify( taffyData( { memberof: "bcdui.widget" } ).get() ) );
  
  customElementsCore( taffyData, opts.destination+"/js/core" );

  customElementsComponent( taffyData, opts.destination+"/js/component" );

  customElementsWidgets( taffyData, "bcdui.widget", "", opts.destination+"/js/widget" );
  customElementsWidgets( taffyData, "bcdui.widgetNg", "ng", opts.destination+"/js/widgetNg" );
}

/**
 * Renderer is the only element of core getting a custom tag
 */
function customElementsCore( taffyData, path )
{
  var result = "";
  var clazz = taffyData( { kind: "class", longname: "bcdui.core.Renderer" } ).get()[0];
  result += printCustomTag( "bcd-"+clazz.name.toLowerCase(), clazz.memberof+"."+clazz.name+"Tag", clazz.params, "bcdui.factory.createRenderer" );
  
  fs.mkPath( path );
  fs.writeFileSync( path+"/customElements.js", result, 'utf8');
}

/**
 * More components to be added
 */
function customElementsComponent( taffyData, path )
{
  // We want to name it 'Chart', though technically it is an XmlChart
  var clazzes = taffyData( { kind: "class", longname: "bcdui.component.chart.XmlChart" } ).get();
  if( clazzes.length === 1 ) {
    var result = printCustomTag( "bcd-chart", clazzes[0].memberof+"."+"ChartTag", clazzes[0].params, "bcdui.component.chart.createChart" );
    fs.mkPath( path+"/chart" );
    fs.writeFileSync( path+"/chart/customElements.js", result, 'utf8');
  }

  clazzes = taffyData( { kind: "class", longname: "bcdui.component.cube.Cube" } ).get();
  if( clazzes.length === 1 ) {
    var result = printCustomTag( "bcd-cube", clazzes[0].memberof+"."+"CubeTag", clazzes[0].params, "bcdui.component.createCube" );
    fs.mkPath( path+"/cube" );
    fs.writeFileSync( path+"/cube/customElements.js", result, 'utf8');
  }
  
  clazzes = taffyData( { kind: "class", longname: "bcdui.component.scorecard.Scorecard" } ).get();
  if( clazzes.length === 1 ) {
    var result = printCustomTag( "bcd-scorecard", clazzes[0].memberof+"."+"ScorecardTag", clazzes[0].params, "bcdui.component.createScorecard" );
    fs.mkPath( path+"/scorecard" );
    fs.writeFileSync( path+"/scorecard/customElements.js", result, 'utf8');
  }
}

/**
 * Loop over widgets and widgets ng
 * @param taffyData
 * @param packageName
 * @param postfix
 * @param path
 */
function customElementsWidgets( taffyData, packageName, postfix, path )
{
  // All members of bcdui.widget having a param of type targetHtmlRef
  var widgets = taffyData( { memberof: packageName } ).get().filter( function( widget ) { 
    if( !widget.params || widget.name.indexOf("create")!==0 )  
      return false;
    return widget.params.some( function( param ) {
      if( !param.type )  
        return false;
      return param.type.names[0] === "targetHtmlRef";
    }); 
  });
  
  var resultWidget = "";
  widgets.forEach( function( widget ) {
    var name = widget.name.substring(6); // Get rid of "create"
    resultWidget += printCustomTag( "bcd-"+name.toLowerCase()+postfix, widget.memberof+"."+name+postfix+"Tag", widget.params, widget.longname );
  });
  fs.mkPath( path );
  fs.writeFileSync( path+"/customElements.js", resultWidget, 'utf8');
}

function printCustomTag( tagName, jsConstructorLongname, params, factory )
{
  result = "// " + tagName + newLine;
  result += "bcdui.util.namespace('" + jsConstructorLongname.substring(0,jsConstructorLongname.lastIndexOf(".")) + "');" + newLine;
  result += jsConstructorLongname + " = document.registerElement(\"" + tagName + "\", { prototype: " + newLine;
  result += "  Object.create(HTMLElement.prototype, {" + newLine;
  result += "    createdCallback: {" + newLine;
  result += "      value: function() {" + newLine;  
  result += "        setTimeout( function() { " + newLine;
  result += "          var args = { targetHtml: this };" + newLine;

  // Because HTML attributes are not case sensitive, we cannot generically derive param names from attribute names, instead we have to list them explicitly
  var allowedParamTypes = ["string", "boolean", "xpath", "i18nToken", "writableXPathWithDollar", "bcdui.core.DataProvider"];
  var attributes = params.filter( function( param ) {
    // id attribute refers to the html tag, not the object. Use objectId for that
    if( param.name.indexOf(".") === -1 || param.name === "args.id" )
      return false;
    return param.type && param.type.names.filter( function( typeName ) {
      return allowedParamTypes.indexOf( typeName ) !== -1
    }).length != 0;
  });
  attributes.forEach( function(attrib) {
    var attribName = attrib.name.substring( attrib.name.indexOf(".") + 1 );
    result += "          if( this.hasAttribute('"+attribName+"') )" + newLine;
    result += "            args." + attribName + " = this.getAttribute('"+attribName+"');" + newLine;
  });
  result += "          if( this.hasAttribute('objectId') )" + newLine;
  result += "            args.id = this.getAttribute('objectId');" + newLine;

  result += "          " + factory + "( args );" + newLine;
  result += "        }.bind(this) );" + newLine;
  result += "      }" + newLine;
  result += "    }" + newLine;
  result += "  })" + newLine;
  result += "});" + newLine;
  result += newLine;
  return result;
}

/*
 * Utility functions
 */
var newLine = os.EOL;
