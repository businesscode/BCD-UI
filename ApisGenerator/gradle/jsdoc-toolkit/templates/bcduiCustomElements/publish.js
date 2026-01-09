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
  var clazzes = taffyData( { kind: "class", longname: "bcdui.core.Renderer", undocumented: { "!is": true } } ).get();
  if( clazzes.length === 1 ) {
    var result = "import \"../../modules/core.js\"" + newLine; 
    result += printCustomTag( "bcd-renderer", clazzes[0].memberof+"."+"RendererTag", clazzes[0].params, "bcdui.factory.createRenderer", "" );
    fs.mkPath( path );
    fs.writeFileSync( path+"/customElements.js", result, 'utf8');
  }
}

/**
 * More components to be added
 * Workaround JSDoc 3.6.7 returns a class twice, one short and one long version for unknown reason.
 * Test for undocumented != true dropy the short one
 */
function customElementsComponent( taffyData, path )
{
  // We want to name it 'Chart', though technically it is an XmlChart
  var clazzes = taffyData( { kind: "class", longname: "bcdui.component.chart.XmlChart", undocumented: { "!is": true } } ).get();
  if( clazzes.length === 1 ) {
    var result = "import \"../../modules/core.js\"" + newLine; 
    result += printCustomTag( "bcd-chart", clazzes[0].memberof+"."+"ChartTag", clazzes[0].params, "bcdui.component.chart.createChart", "../../modules/component/chart.js" );
    fs.mkPath( path+"/chart" );
    fs.writeFileSync( path+"/chart/customElements.js", result, 'utf8');
  }

  clazzes = taffyData( { kind: "class", longname: "bcdui.component.cube.Cube", undocumented: { "!is": true } } ).get();
  if( clazzes.length === 1 ) {
    var result = "import \"../../modules/core.js\"" + newLine; 
    result += printCustomTag( "bcd-cube", clazzes[0].memberof+"."+"CubeTag", clazzes[0].params, "bcdui.component.createCube", "../../modules/component/cube.js" );
    fs.mkPath( path+"/cube" );
    fs.writeFileSync( path+"/cube/customElements.js", result, 'utf8');
  }

  clazzes = taffyData( { kind: "class", longname: "bcdui.component.scorecard.Scorecard", undocumented: { "!is": true } } ).get();
  if( clazzes.length === 1 ) {
    var result = "import \"../../modules/core.js\"" + newLine; 
    result += printCustomTag( "bcd-scorecard", clazzes[0].memberof+"."+"ScorecardTag", clazzes[0].params, "bcdui.component.createScorecard", "../../modules/component/scorecard.js" );
    fs.mkPath( path+"/scorecard" );
    fs.writeFileSync( path+"/scorecard/customElements.js", result, 'utf8');
  }

  clazzes = taffyData( { kind: "class", longname: "bcdui.component.far.Far", undocumented: { "!is": true } } ).get();
  if( clazzes.length === 1 ) {
    var result = "import \"../../modules/core.js\"" + newLine; 
    result += printCustomTag( "bcd-far", clazzes[0].memberof+"."+"FarTag", clazzes[0].params, "bcdui.component.createFar", "../../modules/component/far.js" );
    fs.mkPath( path+"/far" );
    fs.writeFileSync( path+"/far/customElements.js", result, 'utf8');
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
  
  var resultWidget = "import \"../modules/core.js\"" + newLine;
  widgets.forEach( function( widget ) {
    var name = widget.name.substring(6); // Get rid of "create"
    const jsFileName = name.substring(0, 1).toLowerCase() + name.substring(1) + ".js";
    resultWidget += printCustomTag( "bcd-"+name.toLowerCase()+postfix, widget.memberof+"."+name+postfix+"Tag", widget.params, widget.longname, (postfix == "ng" ? "../modules/widgetNg/" : "../modules/widget/") + jsFileName );
  });
  fs.mkPath( path );
  fs.writeFileSync( path+"/customElements.js", resultWidget, 'utf8');
}

function printCustomTag( tagName, jsConstructorLongname, params, factory, jsFileName)
{
  params = params || [];

  result = "// " + tagName + " HTML custom element" + newLine;
  result += "bcdui.util.createCustomElement( '"+tagName+"', async function() {" + newLine;
  result += "  var args = { targetHtml: this };" + newLine;

  // Because HTML attributes are not case sensitive, we cannot generically derive param names from attribute names, instead we have to list them explicitly
  var allowedParamTypes = ["string", "boolean", "xPath", "i18nToken", "modelXPath", "writableModelXPath", "bcdui.core.DataProvider", "function", "chainDef", "enum", "enumString", "number", "integer", "stringList", "url"];
  // for default values we have to distinguish between literals and string values
  var stringParamTypes = ["string", "xPath", "i18nToken", "modelXPath", "writableModelXPath", "enumString", "stringList", "url"];
  params.filter( function( param ) {
    // id attribute refers to the html tag, not the object. Use objectId for that
    if( param.name.indexOf(".") === -1 || param.name === "args.id" )
      return false;
    return param.type && param.type.names.filter( function( typeName ) {
      return allowedParamTypes.indexOf( typeName ) !== -1
    }).length != 0;
  })
  .forEach( function(param) {
    var attribName = param.name.substring( param.name.indexOf(".") + 1 );
    var hasDefaultValue = ("defaultvalue" in param);
    var isStringType = !!param.type.names.filter(e => stringParamTypes.indexOf(e) > -1).length;
    var padding = "";
    if( !hasDefaultValue ){
      result += "  if( this.hasAttribute('"+attribName+"') )" + newLine + "  ";
    }
    if( param.type.names.indexOf("function") >= 0 ){
      result += "    args." + attribName + " = bcdui.util._toJsFunction( this.getAttribute('"+attribName+"') );" + newLine;
    } else if ( param.type.names.indexOf("boolean") >= 0 ) {
      var isDefaultTrue = param.defaultvalue === true;
      if(isStringType){
        // if we have multitype which can also be string, consider default as boolean only if it is true,false, otherwise pass as string literal
        result += "  args." + attribName + " = this.getAttribute('"+attribName+"') || " + JSON.stringify(param.defaultvalue) + " ;" + newLine;
      }
      // disabled, readonly are HTML properties, if specified (no value) they are enabled
      else if (attribName.toLowerCase() == "disabled" || (attribName.toLowerCase() == "readonly")) {
        result += "  args." + attribName + " = this.getAttribute('"+attribName+"') != null;" + newLine;
      }
      else{
        result += "  args." + attribName + " = this.getAttribute('"+attribName+"') === '" + (!isDefaultTrue) + "' ? " + (!isDefaultTrue) + " : " + (isDefaultTrue) + " ;" + newLine;
      }
    } else if ( param.type.names.indexOf("number") >= 0 || param.type.names.indexOf("integer") >= 0 ) {
      var defaultValue = param.defaultvalue;
      if(defaultValue !== undefined){
        defaultValue = " || " + defaultValue;
      } else {
        defaultValue = "";
      }
      var parser = param.type.names.indexOf("integer") >= 0 ? "parseInt" : "parseFloat";
      result += "  args." + attribName + " = " + parser + "( this.getAttribute('"+attribName+"') , 10)" + defaultValue + ";" + newLine;
    } else {
      var defaultValue = param.defaultvalue;
      if(defaultValue !== undefined){
        defaultValue = " || " + defaultValue;
      } else {
        defaultValue = "";
      }
      result += "  args." + attribName + " = this.getAttribute('"+attribName+"')" + defaultValue + ";" + newLine;
    }
  });
  result += "  if( this.hasAttribute('objectId') )" + newLine;
  result += "    args.id = this.getAttribute('objectId');" + newLine;
  if (jsFileName != "")
    result += "  await import(\"" + jsFileName+"\");" + newLine;
  result += "  " + factory + "( args );" + newLine;
  result += "  this._bcdHtmlReady = true;" + newLine;
  result += "  this.dispatchEvent(new CustomEvent('bcdHtmlReady', { bubbles: true }));" + newLine;
  result += "});" + newLine;
  return result;
}

/*
 * Utility functions
 */
var newLine = os.EOL;
