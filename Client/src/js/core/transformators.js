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
"use strict";
/**
 * Collection of the different transformator types
 * XSLT kind of transformators are defined in browserCompatibility and extendedBrowserCompatibilty
 * For usage by TransformationChain
 * @private
 */
bcdui.core.transformators = 
/** @lends bcdui.core.transformators */
{
  /**
   * There are different kinds of processors XSLT, and JS.
   * For XSLT an XSLT stylesheet document is to be provided
   * For JS the function name or a function reference can be used
   * @param args The parameter map:
   * @params {String|function} args.procFkt The js function to be used for processing.
   * @params {function} args.callback Callback called once the processor is created
   * @private
   */
  factory: function( transformerFactory, args ) {
    var transf = new transformerFactory( args.model );
    args.callBack( transf );
  },

  /**
   * This mapping knows for each rule, which transformer and which container for the rule to use
   * A bit complex because: Transformators' factories are async, each rule type needs a different transf. and rule dp containter, also this makes the list extendable
   * @private
   */
  ruleToTransformerMapping:
    [
       // Plain js function
       { test: function(rule){ return typeof rule === "function" }, 
         info: { ruleDp: function( rule, name ) { return new bcdui.core.ConstantDataProvider({ name: name, value: rule }); },
                 ruleTf: function( args ) { args.callBack( new bcdui.core.transformators.JsTransformator( args.model) ) } } },
  
       // JS source file. Becomes a webworker
       { test: function(rule){ return  typeof rule === "string" && rule.match(/\.js[\;\?\#]?/) != null },
         info: { ruleDp: function( rule, name ) { return new bcdui.core.ConstantDataProvider({ name: name, value: rule }); },
                 ruleTf: function( args ) { args.callBack( new bcdui.core.transformators.WebworkerTransformator( args.model) ) } } },
  
       // dotJs template
       { test: function(rule){ return typeof rule === "string" && rule.match(/\.dott[\;\?\#]?/) != null }, 
         info: { ruleDp: function( rule ) { return new bcdui.core.SimpleModel({ url: rule }); }, 
                 ruleTf: function( args ) { args.callBack( new bcdui.core.transformators.DotJsTransformator( args.model) ) } } },
  
       // xslt
       { test: function(rule){ return  typeof rule === "string" && rule.match(/\.xsl[t\;\?\#]?/) != null }, 
         info: { ruleDp: function( rule ) { return new bcdui.core.SimpleModel({ url: rule }); }, 
                 ruleTf: function( args ) { bcdui.core.browserCompatibility.asyncCreateXsltProcessor(args) } } }
    ]

};

 /**
   * Most simple transformation, just 1:1 and base class for all transformators
   * For usage by TransformationChain
    */
bcdui.core.transformators.IdentityTransformator = class
{

  /**
   * @param {object} [template] Dummy only, not deeded:
   * @private
   */
  constructor(template)
  {
    this.params = {};
    this.template = null;
    if( typeof template !== "undefined" )
      this.template = template;
  }

  /**
   * For usage by TransformationChain
   * @param {string} name  - Name of the parameter as known to the transformation template
   * @param {object} value - Parameter value, can be anything that is understood by the template
   * @private
   */
  addParameter( name, value)
  {
    this.params[name] = value;
  }
  
  /**
   * For usage by TransformationChain
   * @private
   */
  transform( args )
  {      
    for (var x in args.parameters)
      this.addParameter(x, args.parameters[x]);

    if( args.outputOwner === document )
      this.transformToFragment( args.input, args.outputOwner, args.callBack );
    else
      this.transformToDocument( args.input, args.callBack );    
  }

  /**
   * For usage by TransformationChain
   * @private
   */
  transformToFragment( /* XMLDocument */ sourceDoc, /* XMLDocument */ ownerDocument, fn )
  {
    this.transformToDocument(sourceDoc, fn);
  }
  
  /**
   * For usage by TransformationChain
   * @private
   */
  transformToDocument( /* XMLDocument */ sourceDoc, /* function */ fn )
  {
    fn(sourceDoc);
  }
};

 /**
   * JsTransformator for Javascript transformators. 
   * A Javascript transformators is a function that receives the input as its first parameter and a object with properties as named parameters as the second parameter
   * For usage by TransformationChain
    */
bcdui.core.transformators.JsTransformator = class extends bcdui.core.transformators.IdentityTransformator
{
  /**
   * @param {(string|function)} prokFunc - The js function to be used for processing. Either a real function or a string with JS code for eval.
   * @private
   */
  constructor(/* object */ procFkt)
  //TODO: Documentation != Implementation
  {
    super( procFkt);
    if( typeof procFkt == "string" ) {
      procFkt = eval(procFkt);
    }
    this.procFkt = procFkt;
  }

  /**
   * For usage by TransformationChain
   * @private
   */
  transformToDocument( /* XMLDocument */ domToBeTransformed, /* function */ fn )
  {
    var ret = this.procFkt( domToBeTransformed, this.params );
    fn( typeof ret !== "undefined" ? ret : domToBeTransformed );
  }
};

 /**
   * WebworkerTransformator
   *  Perf check 2014.03 round cycle webworker overhead incl. 2 JSOM.stringify and 2 parse:
   *    jWrs with 61k cells, most having an attribute, 1.5MB source: IE11: 343ms, FF: 158ms, Chrome: 162ms
   *    jWrs with 250 cells, most having an attributes, 10k source: IE 11,9,8(fake ww): 14ms, FF: 15ms, Chrome: 13ms
   * For usage by TransformationChain
    */
bcdui.core.transformators.WebworkerTransformator = class extends bcdui.core.transformators.IdentityTransformator
{  
  /**
   * @param {Object} args The parameter map: contains Data to be transformed
   * @private
   */
  constructor( args)
  {
    super(args);
    this.worker = new Worker("webWorkerProc.js");
    this.worker.addEventListener("message", function ( oEvent ) {
        var response = JSON.parse( oEvent.data );
        this.fn( response.result );
      }.bind(this), false);
  }

  /**
   * For usage by TransformationChain
   * @private
   */
  transformToDocument( /* XMLDocument */ sourceDoc, /* function */ fn )
  {
    this.fn = fn; // TODO issue, when fn changes for next call, when first exec is not finished
    var parameters = {};
    jQuery.each( this.params, function(key,value) {
      parameters[key] = bcdui.core.convert.toJs(value); 
    });
    this.worker.postMessage( JSON.stringify( { input: sourceDoc, parameters: parameters } ) );
  }
};

 /**
   * JsTransformator
   * For usage by TransformationChain
    */
bcdui.core.transformators.DotJsTransformator = class extends bcdui.core.transformators.IdentityTransformator
{
  /**
   * @private
   */
  constructor(/* object */ procFkt)
  {
    super(procFkt);
  }

  /**
   * For usage by TransformationChain
   * @private
   */
  transformToDocument( /* XMLDocument */ sourceDoc, /* function */ fn )
  {
    if( !this.transFkt )
      this.transFkt = doT.template(this.template);
    fn( this.transFkt( { input:sourceDoc, params:this.params } ) );
  }
};
