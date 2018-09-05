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
 * @fileoverview
 * This file contains the implementation of the TransformationChain class.
 */

bcdui.core.TransformationChain = bcdui._migPjs._classCreate(bcdui.core.DataProvider,
/**
 * @lends bcdui.core.TransformationChain.prototype
 */
{

  /**
   * @classdesc
   * A class representing one or more transformations applied on models with parameters. Transformators can be js functions, XSLTs or doTjs templates.
   * Use {@link bcdui.core.Renderer Renderer} or {@link bcdui.core.ModelWrapper ModelWrapper} as concrete sub classes
   * @extends bcdui.core.DataProvider
   * @abstract
   *
   * @constructs
   * @description
   * The constructor for the TransformationChain class.
   */
  initialize: function(args)
    {
      bcdui.core.DataProvider.call(this,args);

      /**
       * The list of dataProviders passed to the transformations. One of them must
       * be a Model defining the input of the transformation chain.
       * User can provide a inputModel
       * And/or a single or an array of data providers.
       * If no inputModel is given, the (first) dataProvider will be used as the inputModel
       * @type Array
       * @private
       */
      this.dataProviders = undefined;
      if( !!args.dataProviders ) {
        if( !Array.isArray(args.dataProviders) )
          this.dataProviders = [args.dataProviders];
        else
          this.dataProviders = args.dataProviders.slice(0);
      }
      if( !!args.inputModel ) { // Both is possible
        this.dataProviders = !!this.dataProviders ? this.dataProviders : [];
        this.dataProviders.unshift(args.inputModel);
      }
      
      if (typeof this.dataProviders == "undefined" ) {
        this.dataProviders = [bcdui.wkModels.guiStatus];
      }
      if (typeof args.chain == "undefined") {
        throw Error("Must specify \"chain\" property (id='"+this.id+"').");
      }
      if( !!args.parameters ) {
        this.dataProviders = this.dataProviders.concat( bcdui.factory._extractDataProvidersAndUpdateDependencies(args.parameters, []) );
      }
      /**
       * The data document offered by this model. Use getData() to read it.
       * @type XMLDocument
       * @private
       */
      this.dataDoc = null;

      /*
       * We add here some implicit parameter models to each transformation (guiStatus, i18n, guiStatusEstablished)
       * Only transformations producing one of the implicit models do not get these, to prevent circular ready-state dependencies
       */
      var implicitParamModels = [
          ["guiStatus", bcdui.wkModels.guiStatus]
        , [bcdui.i18n._modelDefaultName, bcdui.wkModels.bcdI18nModel]
        , ["guiStatusEstablished", bcdui.wkModels.guiStatusEstablished]
      ];

      // 'this' is an implicitModel on our own...
      var add = (implicitParamModels.map(function(a) {return a[0]}).indexOf(this.id) == -1);

      // 'this' is a modelUpdater on an implicit model
      if (this.modelUpdaterTargetModel && this.modelUpdaterTargetModel.id)
        add &= (implicitParamModels.map(function(a) {return a[0]}).indexOf(this.modelUpdaterTargetModel.id) == -1);

      if (add) {
        for (var i = 0; i < implicitParamModels.length; i++) {
          if (!this.dataProviders.some(function(dataProvider) { return dataProvider.id == implicitParamModels[i][0] ; })) {//don't override already set value
            if(typeof implicitParamModels[i][1] != "undefined"){
              this.dataProviders.push(implicitParamModels[i][1]);
            }
          }
        }
      }
      // Adds for convenience the current date im ms to the chain, passed identical to all xslt of the chain
      // There is also the current date for each individual xslt
      this.dataProviders.push(new bcdui.core.ConstantDataProvider({name:"bcdChainDate",value:new Date().getTime()}) );

      /**
       * The id of the parameter denoting the primary model of the
       * transformation.
       * @type String
       * @private
       */
      this.modelParameterId = this.dataProviders[0].id;

      /*
       * Set the implicit parameters.
       */
      this.dataProviders.push(
        new bcdui.core.ConstantDataProvider({name: "bcdControllerVariableName", value: this.id}),
        new bcdui.core.ConstantDataProvider({name: "bcdInputModelId", value: this.modelParameterId}),
        new bcdui.core.ConstantDataProvider({name: "bcdContextPath", value: bcdui.contextPath})
      );

      /**
       * (optional) The ID of the HTML element and the html element itself getting the result of the final XSLT
       * transformation if it has output="html". If it creates XML this can be null.
       * this is set on first exectue
       * @type string
       * @private
       */
      if (this.setTargetHtml)
        this.setTargetHtml(this.targetHtml);

      /**
       * chainParam: chain parameter. Can have many typey: xml, string, array etc. 
       * Will be translated to the internal format later and then stored in this.chain
       * @type bcdui.core.Model
       * @private
       */
        this.chainParam = args.chain;
        
      /**
       * @private
       */
        this.chain = null;

      /**
       * This status is set when the constructor has set all parameters.
       * @type bcdui.core.status.InitializedStatus
       * @constant
       */
      this.initializedStatus = new bcdui.core.status.InitializedStatus();

      /**
       * The status code activated as soon as the loading begins.
       * @type bcdui.core.status.LoadingStatus
       * @constant
       */
      this.loadingStatus = new bcdui.core.status.LoadingStatus();

      /**
       * A status reached when the chain model is ready.
       * @type bcdui.core.status.ChainLoadedStatus
       * @constant
       */
      this.chainLoadedStatus = new bcdui.core.status.ChainLoadedStatus();

      /**
       * This status is kept as long as the transformation chain is waiting
       * for parameters to load and when the chain has already loaded.
       * @type bcdui.core.status.WaitingForParametersStatus
       * @constant
       */
      this.waitingForParametersStatus = new bcdui.core.status.WaitingForParametersStatus();

      /**
       * As long as this status is active the XSLT transformations are running.
       * @type bcdui.core.status.TransformingStatus
       * @constant
       */
      this.transformingStatus = new bcdui.core.status.TransformingStatus();

      this.waitingForUncomittedChanges = new bcdui.core.status.WaitingForUncomittedChanges();

      /**
       * The status code is reached when a transformation failed and operation cannot proceed
       * @type bcdui.core.status.TransformFailedStatus
       * @constant
       */
      this.transformFailedStatus = new bcdui.core.status.TransformFailedStatus();

      /**
       * The status code is reached when everything is finished and the transformation
       * result is available. This is the final state of the TransformationChain process
       * if no error occurs.
       * @type bcdui.core.status.TransformedStatus
       * @constant
       */
      this.transformedStatus = new bcdui.core.status.TransformedStatus();

      /**
       * This (final) status is reached when an error occurs during the loading or
       * transformation process.
       * @type bcdui.core.status.LoadFailedStatus
       * @constant
       */
      this.loadFailedStatus = new bcdui.core.status.LoadFailedStatus();

      /**
       * This (final) status is reached when the chain model could not be loaded.
       * @type bcdui.core.status.ChainStylesheetLoadingFailed
       * @constant
       */
      this.chainLoadingFailed = new bcdui.core.status.ChainLoadingFailed();

      /**
       * This (final) status is reached when the loading of a chain stylesheet has
       * failed.
       * @type bcdui.core.status.ChainStylesheetLoadingFailed
       * @constant
       */
      this.chainStylesheetLoadingFailed = new bcdui.core.status.ChainStylesheetLoadingFailed();

      /**
       * store on instance for _fireStatusEvent() to access it; TODO remove when
       * refactoring to deferred targetHtml rediscovery after transformation completion.
       * @private
       */
      this.suppressInitialRendering = !!args.suppressInitialRendering;

      this.setStatus(this.initializedStatus);

      /*
       * Register the status transition listener controlling the process
       * implemented by the transformation chain.
       */
      this.addStatusListener(this._statusTransitionHandler.bind(this));

      // Only HTML renderers start execution immediately in case it is not suppressed (or target does not yet exist)
      if (! args.suppressInitialRendering) {
        var targetElement = this.targetHtmlElement || (this.targetHTMLElementId ? document.getElementById(this.targetHTMLElementId) : null);
        if (targetElement != null) {
          jQuery(targetElement).attr('bcdRendererId', args.id).data('bcdRenderer',this);
          this.execute();
        }
      }
    },

  /**
   * The global state transition listener. This listener is responsible for
   * executing the appropriate action based on a state transition.
   * @private
   */
  _statusTransitionHandler: function(/* StatusEvent */ statusEvent)
    {
      if (statusEvent.getStatus().equals(this.loadingStatus)) {
        /*
         * The loading should begin. Therefore we start loading the chain model
         * and all parameters in parallel.
         */
        this.dataProviders.forEach(function(dp){dp.execute(false)});
        // If we have a chain xml doc, we have to wait for it to become ready,
        // otherwise it was a js chain or string or array, to we do not have to wait
        this._synchronizedStatusTransition(this.chainLoadedStatus, this.chainParam && this.chainParam.execute ? [ this.chainParam ] : [], this._chainLoadingFailed.bind(this));
      } else if (statusEvent.getStatus().equals(this.chainLoadedStatus)) {
        /*
         * As soon as the chain document has been loaded we can parse the chain
         * and start loading the models for its stylesheets.
         */
        this._parseChain();
      } else if (statusEvent.getStatus().equals(this.waitingForParametersStatus)) {
        /*
         * When all stylesheets of the chain are loaded we must possibly
         * wait for the data models to be loaded.
         */
        var that = this;
        this._synchronizedStatusTransition(this.transformingStatus, this.dataProviders.filter(function(dp){return !that.modelUpdaterTargetModel || dp.id !== that.modelUpdaterTargetModel.id}));
      } else if (statusEvent.getStatus().equals(this.transformingStatus)) {
        /*
         * When everything has finished loading we go to the transforming status
         * executing all transformations one after another.
         */
        this._refresh();
      }
    },

  /**
   * The ready status for the transformation chain is reached as soon as all
   * transformations are finished.
   * <p>
   *  The status transitions of the class are as follows:          </p>
   *                                                               <p style="padding-left: 10px"><table><tr><td style="border: 3px double black; text-align: center" colspan="2">
   *      Initialized                                              </td><td style="padding-left: 20px">
   *          All variables have been initialized.
   *                                                               </td></tr><tr><td>&nbsp;</td><td style="border-left: 1px solid black">&nbsp;</td><td></td></tr><tr><td style="border: 1px solid black; text-align: center" colspan="2">
   *      Loading                                                  </td><td style="padding-left: 20px">
   *          Start loading chain document.
   *                                                               </td></tr><tr><td>&nbsp;</td><td style="border-left: 1px solid black">&nbsp;</td><td></td></tr><tr><td style="border: 1px solid black; text-align: center" colspan="2">
   *      ChainLoaded                                              </td><td style="padding-left: 20px">
   *          The chain document has been loaded. Start
   *          loading chain stylesheets.
   *                                                               </td></tr><tr><td>&nbsp;</td><td style="border-left: 1px solid black">&nbsp;</td><td></td></tr><tr><td style="border: 1px solid black; text-align: center" colspan="2">
   *  <i> WaitingForParameters </i>                                </td><td style="padding-left: 20px">
   *          Chain stylesheets loaded. Waiting for
   *          parameter data providers (<i>execute</i>).
   *                                                               </td></tr><tr><td>&nbsp;</td><td style="border-left: 1px solid black">&nbsp;</td><td></td></tr><tr><td style="border: 1px solid black; text-align: center" colspan="2">
   *      Transforming                                             </td><td style="padding-left: 20px">
   *          The chain stylesheets are running.
   *                                                               </td></tr><tr><td>&nbsp;</td><td style="border-left: 1px solid black">&nbsp;</td><td></td></tr><tr><td style="border: 3px double black; text-align: center" colspan="2">
   *  <b> Transformed </b>                                         </td><td style="padding-left: 20px">
   *          The output has been generated. (<b>ready</b>)
   *
   * </td></tr></table></p>
   * @return {Status} The transformed status.
   */
  getReadyStatus: function()
    {
      return this.transformedStatus;
    },

  /**
   * A getter for the document produced by the transformation chain.
   * @return {*} The output of the last transfomration in the chain if it does
   * not produce HTML (output="html").
   */
  getData: function()
    {
      return this.dataDoc;
    },

  /**
   * Start the loading process of the stylesheets and executes the transformations
   * again.
   */
  reloadStylesheets: function()
    {
      this.setStatus(this.chainLoadedStatus);
    },

  /**
   * Gets the data providers attached to this object as hash map. This map can
   * be passed to the transformator functions to set the parameters
   * @param (Array?) If stylesheetParams is given, only params for that stylesheet (the global ones plus the given local from the param) are returned
   *                 if not given, all dataproviders given to any stylesheet are included
   * @private
   */
  _getDataProviderValues: function(/* Array? */ stylesheetParams)
    {
      // Data providers for all stylesheets
      var dPs = this.dataProviders.slice(0);

      // Add data providers exclusive for this stylesheets
      // Or even those being set for at least one of stylesheet
      if( stylesheetParams ) {
        dPs = dPs.concat( stylesheetParams );
      } else {
        for( var p=0; p<this.chain.phases.length; p++ )
          for( var s=0; s<this.chain.phases[p].xslts.length; s++ )
            dPs = dPs.concat( this.chain.phases[p].xslts[s].params || [] );
      }

      // Transform it into a has map
      return dPs.reduce( function(map, x) {
        map[bcdui.util.isFunction(x.getName) ? x.getName() : x.id] = x.getData();
        return map;
      }, {});
    },

  /**
   * @returns {bcdui.core.DataProvider} returns the parameter of the given name
   */
  getDataProviderByName: function(/* String */ name)
    {
      return this._getDataProviderValues()[name];
    },

  /**
   * Loops over all elements inside the targetHTMLElement with an "bcdOnLoad" attribute and
   * executes the respective JavaScript code.
   *
   * WORKAROUND: We cannot use the standard "onload" attribute here, because of an IE 7 bug.
   *             This bug leads to onload being always NULL and event causing IE 7 to crash
   *             sometimes if set on an INPUT element. With FireFox or Chrome it would work
   *             perfectly.
   *
   * @private
   */
  _executeOnXAttributes: function( targetElement, attribute )
    {
      jQuery(targetElement).find(" *["+attribute+"]").each(function(idx,onLoadElement) {
        var initCode = onLoadElement.getAttribute( attribute );
        if (initCode && initCode.trim().length!=0) {
          (function() { eval(initCode); }.bind(onLoadElement))(); // No defer, keep order for bcdui.core.bcdParamBag
        }
        onLoadElement.removeAttribute( attribute );
      });
    },
    
  /**
   * Executes the specified transformation on the inputDoc and (recursively) starts
   * the following transformation when the xslt has finished if there is one. This
   * function is an auxiliary function of "_transformNext".
   * This is called once for each chain.phases.xslt. If a xslt itself creates a stylesheet which is executed, this is done
   * in xml post processing, not here
   * @param {Object} current transformation rule from this.chain.phases.xslt to be executed
   * @param {(XMLDocument|Object)} Input to be transformed
   * @private
   */
  _runTransformation: function(/* object */ xslt, /* object */ input )
    {
      xslt.running = true;
      xslt.input = input;
      var processor = xslt.processor;
      var stylesheetURL = (xslt.model && xslt.model.urlProvider) ? xslt.model.urlProvider.getData() : null;

      // Adds for convenience the current date for the individual transformation
      // There is also the current date in ms passed identical to all xslt of the chain
      var currDataDP = new bcdui.core.ConstantDataProvider({name:"bcdCurrDate",value: new Date().getTime()});
      var params = this._getDataProviderValues(xslt.params); // Get chain-wide and xslt-local params
      params[currDataDP.getName()] = currDataDP.getData();

      // This is called after the current transformation is finished
      // In case of generating XSLT as output of this step, this is only called after the last generated intermediate one has finished and did output XML or HTML
      // closures: traceXsltProcTime, input, targetElement
      var callBack = function( result ) 
        {
          xslt.output = result;

          // The result is inserted into DOM if this was the last result and we have a targetHTMLElementId
          // We cannot make this dependent on the outputFormat as that is only know explicitly for XSLT
          if( xslt.isLastOfChain && !!this.targetHTMLElementId ) 
          {
            var targetElement = this.targetHtmlElement || (this.targetHTMLElementId ? document.getElementById(this.targetHTMLElementId) : null);
            if (targetElement != null) {
              targetElement.setAttribute('bcdRendererId', this.id); // Set it again, it could have been removed in between
  
              this._executeOnXAttributes(targetElement, "bcdOnUnLoad");
  
              // Transformation can deliver HTML as DOM or as a string
              if( typeof result=="string" ) {
                jQuery(targetElement).html( result ); // to support .destroy() mechanism of jQuery Widgets
                bcdui.i18n.syncTranslateHTMLElement({elementOrId:targetElement});
              }
              // XSLT will deliver fragment
              // If we receive a document, we assume the last step did not provide any output to us, because in such cases
              // we do always treat the input doc as the output. In these cases, we do nothing
              else if( result.nodeType !== Node.DOCUMENT_NODE )
              {
                var partiallIdDP = this.dataProviders.find(function(dataProvider) { return dataProvider.name == "bcdPartialHtmlTargets";  });
                if( partiallIdDP && !!partiallIdDP.getData().trim()) {
                  var ids = partiallIdDP.getData().split(" ");
                  for( var i = 0; i < ids.length; i++ ) {
                    var node = document.getElementById(ids[i]);
                    var newContent = result.querySelector ? result.querySelector("#"+ids[i]) : result.getElementById(ids[i]); // getElementById for IE <= 7 
                    if( node && newContent ) {
                      bcdui.i18n.syncTranslateHTMLElement({elementOrId:newContent});
                      jQuery(node).replaceWith( newContent );
                    } else if( node )
                      jQuery(node).remove();
                  }
                }  else {
                  for ( var ch = 0; ch < result.childNodes.length; ch++) {
                    bcdui.i18n.syncTranslateHTMLElement({elementOrId:result.childNodes[ch]});
                  }
                  // Browser takes care that the fragment itself is treated as a container and only its children are appended to the HTML DOM
                  jQuery(targetElement).empty();  // to support .destroy() mechanism of jQuery Widgets
                  targetElement.appendChild(result);
                }
              }
  
              this._executeOnXAttributes(targetElement, "bcdOnload");
            }
          }

          // Now transform the next of this.chain.phases.xslt
          this._transformNext();
          
        }.bind(this)


      // We exclude empty parameters and possible namespace declarations (which could come if a user simply passes
      // genericly all attributes of a node), because browsers have an issue with invalid parameters
      for (var x in params) {
        if( typeof params[x] === "undefined" || params[x] === null || x.indexOf(":")!==-1 )
          delete params[x];
        // remove non-xml objects for XSLT processors only
        else if (xslt.processor.xslt && typeof params[x] == "object" && ! params[x].nodeType) {
          delete params[x];
        }
      }

      var traceXsltProcTime = Date.now(); // debug code
      
      // Run the transformation.
      // Depending on the result, we need to apply smart postprocessing (resolving includes, browser-namespace specifics and generated XSLT)
      processor.transform( { input: input, parameters: params, callBack: function(result) 
        {
          traceXsltProcTime = Date.now() - traceXsltProcTime;
          bcdui.debug._addProcessorExecutionTime( this.id, traceXsltProcTime );
          if( bcdui.log.isTraceEnabled() ) {
            var inputAsString = xslt.input.nodeType ? new XMLSerializer().serializeToString(xslt.input) : typeof input==="string" ? input : JSON.stringify(xslt.input);
            bcdui.log.trace("Finished transformation to "+(processor.outputFormat+" ")+(traceXsltProcTime)+"ms "+(stylesheetURL?stylesheetURL:"")+", input:"+(inputAsString.length/1000).toFixed(1)+"k, "+this.id);
          }
          if( ! result ) {
            this.setStatus(new bcdui.core.status.TransformFailedStatus());
            bcdui.log.error("Transformation "+this.id + " failed " + (stylesheetURL?stylesheetURL:"") );
          }
          else if( result.nodeType ) {
            bcdui.core.xmlLoader._asyncTransformToXMLPostProcess( { processor: processor, sourceDoc: xslt.input,
              stylesheetURL: stylesheetURL, onSuccess: callBack, transformationChain: this, xslt: xslt, params: params },
              result);
          }
          else
            callBack( result );
        }.bind(this)
      });
      return;
    },

  /**
   * Adds a new data provider to the transformation chain. If there is already a data provider
   * with the given name it is replaced.
   * @param {Object} newDataProvider the new dataprovider which should be added
   * @param {string} [newName] an optional new name for the provider. if given an alias will be created
   * @return {bcdui.core.DataProvider} The old data provider registered under the name or
   * null if there has not been any.
   */
  addDataProvider: function(/* DataProvider */ newDataProvider, newName)
    {
      var name = bcdui.util.isFunction(newDataProvider.getName) ? newDataProvider.getName() : newDataProvider.id;

      if(newName && newName != name) {
        name = newName;
        newDataProvider = new bcdui.core.DataProviderAlias({name: newName, source: newDataProvider})
      }

      for (var i = 0; i < this.dataProviders.length; ++i) {
        var dataProvider = this.dataProviders[i];
        if (bcdui.util.isFunction(dataProvider.getName) && dataProvider.getName() == name ||
            !bcdui.util.isFunction(dataProvider.getName) && dataProvider.id == name) {
          var oldDataProvider = this.dataProviders[i];
          this.dataProviders[i] = newDataProvider;
          return oldDataProvider;
        }
      }
      this.dataProviders.push(newDataProvider);
      return null;
    },

  /**
   * Getter for the primary model of the chain. The first transformation of
   * the chain takes a document as input. This document comes from the
   * primary model.
   * @return {bcdui.core.DataProvider} The model the first transformation in
   * the chain is running on.
   */
  getPrimaryModel: function()
    {
      return this.dataProviders.find(function(dataProvider) {
        return dataProvider.id == this.modelParameterId;
      }.bind(this));
    },

  /**
   * Adds a new data provider to the list which becomes the new primary model
   * of the transformation chain.
   * @param primaryModel the new primary model of the transformation chain.
   */
  setPrimaryModel: function(/* DataProvider */ primaryModel)
    {
      this.dataProviders.unshift(primaryModel);
      this.modelParameterId = primaryModel.id;
    },

  /**
   * A function executing the next transformation in the chain. If there is no transformation
   * currently running it starts the first one. If the last transformation has finished running
   * it places the result either in the target HTML element or in the dataDoc.
   * @private
   */
  _transformNext: function()
    {
      var currentXslt = null;
      var nextXslt = null;
      // We use the last not-null output for the next step to that xslts do not need to copy input if they do nop
      var lastNotNullOutput       = this.getPrimaryModel().getData();
      var lastButOneNotNullOutput = lastNotNullOutput;

      /*
       * Find out which XSLT transformation is currently running and which
       * is the next one.
       */      
      this.chain.phases.some(function(phase) {
        return phase.xslts.some(function(xslt) {
          if (currentXslt != null) {
            nextXslt = xslt;
            return true;
          }
          lastButOneNotNullOutput = lastNotNullOutput;
          lastNotNullOutput = xslt.output || lastNotNullOutput; // skip empty outputs
          if (xslt.running) {
            currentXslt = xslt;
            xslt.running = false;
          }
        });
      });

      if (currentXslt == null) {
        // No currentXslt means that no XSLT has been running so
        // we start with the first.
        this._runTransformation(this.chain.phases[0].xslts[0], this.getPrimaryModel().getData());
      } else if (nextXslt == null) {
        // Found, but no following XSLT means that we are
        // finished. Then we set the status accordingly and
        // Also, we have to check whether our output reference is equal to our input reference, i.e. all steps did a XsltNop
        // In that case we need to do a deep copy, because our output must be an object independent from our input,
        // both are externally addressable and independently usable
        // Referencing the identical document
        // The dataDoc returned by getData() is the last XML output when the
        // transformation chain generates HTML. This is useful when there are
        // other renderers based on this transformation chain result (e.g. charts
        // attached to a cube etc.).
        var doc = !!this.targetHTMLElementId ? lastButOneNotNullOutput : lastNotNullOutput;
        if( this.getPrimaryModel().getData() === doc ){
          this.dataDoc = bcdui.core.browserCompatibility.cloneDocument(doc); // TODO will be called for all js transf. outputting their input
        } else{
          this.dataDoc = doc;
        }
        var newStatus = this._uncommitedWrites ? this.waitingForUncomittedChanges : this.transformedStatus;  
        this.setStatus(newStatus);
      } else {
        this._runTransformation(nextXslt, lastNotNullOutput );
      }
    },

  /**
   * Tests if the transformation chain is currently processing its XSLTs.
   * @return {boolean} True, if the transformation chain is currently running.
   * @private
   */
  _isCurrentlyTransforming: function()
    {
      return this.chain.phases.some(function(phase) {
        return phase.xslts.some(function(xslt) {
          return xslt.running ? true : false;
        });
      });
    },

  /**
   * Processes the XSLTs in the transformation chain and produces the result.
   * @private
   */
  _refresh: function()
    {
      if (!this._isCurrentlyTransforming()) {
        this._transformNext();
      }
    },

  /**
   * Runs the transformation chain process.
   * @private
   */
  _executeImpl: function()
    {
      if (this.status.equals(this.transformedStatus)) {
        this.setStatus(this.waitingForParametersStatus);
      } else if (this.status.equals(this.initializedStatus)) {
        this.setStatus(this.loadingStatus);
      }
    },

  /**
   * @return {String} String representation of the chain.
   */
  toString: function()
    {
      return "[TransformationChain: " + this.id + "]";
    },

  /**
   * Tests if all transformation models (phase.xslt.model) are ready and
   * sets the status to "this.waitingForParametersStatus" if all models
   * are ready.
   * @private
   */
  _checkAllTransformationsLoaded: function() {
      var ready =
        this.chain.phases.every(function(phase) {
          return phase.xslts.every(function(xslt) {
            return typeof xslt.processor != "undefined";
          });
        });
      if (ready) {
        this.setStatus(this.waitingForParametersStatus);
      }
    },

  /**
   * @returns {bcdui.core.Status[]} Returns all statuses indicating a failure
   */
  getFailedStatus: function()
    {
      return [ this.chainLoadingFailed, this.chainStylesheetLoadingFailed ];
    },

  /**
   * This callback function is executed when the loading of a chain model
   * has failed. It sets the failed status for this transformationChain.
   * @private
   */
  _chainLoadingFailed: function()
    {
      if (!this.hasFailed()) {
        this.setStatus(this.chainLoadingFailed);
        bcdui.log.error("Chain loading has failed");
      }
    },

  /**
   * This callback function is executed when the loading of a chain stylesheet
   * has failed. It sets the failed status for this transformationChain.
   * @private
   */
  _chainStylesheetLoadingFailed: function(/* object */ xsltInfo)
    {
      if (!this.hasFailed()) {
        this.setStatus(this.chainStylesheetLoadingFailed);
        var url = null;
        if (xsltInfo && xsltInfo.model && xsltInfo.model.urlProvider)
          url = xsltInfo.model.urlProvider.getData();
        bcdui.log.error("Chain stylesheet loading has failed: " + url);
      }
    },

  /**
   * A callback function executed whenever an XSLT stylesheet of the chain
   * has finished loading.
   * @private
   */
  _singleChainTransformerLoaded: function(/* object */ phase, /* object */ xsltInfo)
    {
      if (this.hasFailed()) {
        bcdui.log.warn("Aborting further processor creation, because chain stylesheet loading has already failed");
        return;
      }
      xsltInfo.transformerFactory( { callerDebug: this.id, model: xsltInfo.model.getData(), callBack: function(proc) {
        xsltInfo.processor = proc;
        this._checkAllTransformationsLoaded();
      }.bind(this) });
    },

  /**
   * This function is called as soon as the chain model has finished loading. It
   * parses the chain document and starts loading the referenced style sheets.
   * @private
   */
  _parseChain: function()
    {
      //-------------------------------------
      // If this is a not a js-chain, but just a single or a collection of rules, build a js chain
      if (Array.isArray(this.chainParam) || typeof this.chainParam === "string" || typeof this.chainParam === "function" )
      {
        // Very plain structure. Only one phase and no params in these cases
        this.chain = { phases: [ { xslts: [] } ] };

        // Make sure, each xslt within a phase has a model with the rule as its data
        (Array.isArray(this.chainParam) ? this.chainParam : [ this.chainParam ]).forEach( function( rule, stylesheetNo )
          {
            var name = "bcd_"+this.id + "_chain_" + stylesheetNo;
            var mappingInfo = bcdui.core.transformators.ruleToTransformerMapping.find( function(mapping) { return mapping.test(rule); } );
            if( typeof mappingInfo === "undefined" )
              throw Error("Unknown type of transformation rule ("+rule.toString()+") for "+this.id)
            mappingInfo = mappingInfo.info;
            this.chain.phases[0].xslts.push( { model: new mappingInfo.ruleDp( rule, name ), transformerFactory: mappingInfo.ruleTf } );
          }.bind(this)
        );
      }

      //-------------------------------------
      // If this is a model containing a stylesheet
      else if( this.chainParam && this.chainParam.getData && this.chainParam.getData().selectSingleNode("/xsl:stylesheet")!=null )
      {
        // Very plain structure. Only one phase and no params in these cases
        this.chain = { phases: [ { xslts: [] } ] };
        var mappingInfo = bcdui.core.transformators.ruleToTransformerMapping.find( function(mapping) { return mapping.test(".xslt"); } );
        this.chain.phases[0].xslts.push( { model: this.chainParam, transformerFactory: mappingInfo.info.ruleTf } );
      }
    
      //-------------------------------------
      // If this is a chain XML Document, we parse it here and create a JS chain object
      else if( this.chainParam && this.chainParam.getData ) 
      {
        this.chain = { phases: [] };
        var phaseElements = this.chainParam.getData().selectNodes("//chain:Phase");

      /*
       * Loop over all phases to fill the "phases" array.
       */
        for (var phaseNo = 0; phaseNo < phaseElements.length; ++phaseNo)
        {
          var phaseElement = phaseElements.item(phaseNo);
          /*
           * Create the next item in the phases array.
           */
          var phase = {
              index: this.chain.phases.length,
              name: phaseElement.getAttribute("name") || "0",
              xslts: []
          };
          this.chain.phases.push(phase);

          // Loop over stylesheets
          var stylesheetElements = phaseElement.selectNodes("chain:Stylesheet");
          for (var stylesheetNo = 0; stylesheetNo < stylesheetElements.length; ++stylesheetNo) {
            var stylesheet = stylesheetElements.item(stylesheetNo);
            var xslt = { model: null, params: [] };

            // Fetch the Param elements for this stylesheet from the chain document.
            var paramElements = stylesheet.selectNodes("chain:Param");
            for (var paramNo = 0; paramNo < paramElements.length; ++paramNo) {
              var paramElement = paramElements.item(paramNo);
              xslt.params.push( new bcdui.core.ConstantDataProvider( {
                  name: paramElement.getAttribute("name"),
                  value: paramElement.text
                } ) 
              );
            }

            // url or xslt
            var xsltModel = null;
            if (stylesheet.getAttribute("url") != null) {
              /*
               * Usually it comes from a URL attribute.
               */
              xsltModel = new bcdui.core.SimpleModel({
                url: bcdui.util.url.resolveURLWithXMLBase(stylesheet, stylesheet.getAttribute("url"))
              });
              var mappingInfo = bcdui.core.transformators.ruleToTransformerMapping.find( function(mapping) { return mapping.test(stylesheet.getAttribute("url")); } );
              xslt.transformerFactory = mappingInfo.info.ruleTf;
            } else if (stylesheet.getAttribute("jsFactoryExpression") != null){
              /*
               * It can also be returned by a JS function.
               */
              xsltModel = eval(stylesheet.getAttribute("jsFactoryExpression"));
              xslt.transformerFactory = bcdui.core.browserCompatibility.asyncCreateXsltProcessor;
            } else if (stylesheet.getAttribute("jsProcFct") != null) {
              /*
               * Or not a URL but a js function itself
               */
              var jsProcFctName = stylesheet.getAttribute("jsProcFct");
              var jsProcFct = jsProcFctName.split(".").reduce( function( fkt, f ) { return fkt[f] }, window );
              xsltModel = new bcdui.core.ConstantDataProvider( { value: jsProcFct } );
              xslt.transformerFactory = function( args ) { args.callBack( new bcdui.core.transformators.JsTransformator( args.model) ) };
            } else if( stylesheet.selectSingleNode("./chain:JsProcFct") ) {
              var jsSource = "";
              for( var child=stylesheet.selectSingleNode("./chain:JsProcFct").firstChild; child; child=child.nextSibling ) {
                if( child.nodeType == 3 )
                  jsSource += child.nodeValue;
              }
              xsltModel = new bcdui.core.ConstantDataProvider( { value: eval("bcdDummyFkt = " + jsSource ) } );
              xslt.transformerFactory = function( args ) { args.callBack( new bcdui.core.transformators.JsTransformator( args.model) ) };
            } else if( stylesheet.selectSingleNode("./xsl:stylesheet") ) {
              xsltModel = new bcdui.core.StaticModel( { data: stylesheet.selectSingleNode("./xsl:stylesheet") } );
              xsltModel.execute();
              xslt.transformerFactory = bcdui.core.browserCompatibility.asyncCreateXsltProcessor;
            }
            xslt.model = xsltModel; 
            phase.xslts.push( xslt );

          } // Stylesheets
        } // phases
      } // parse xml chain

      //-------------------------------------
      // In this case, the chain is already a JS chain model
      else
        this.chain = this.chainParam;


      //--------------------------------
      // Now we have the chain in js form, let's load all stylesheets
      for( var p=0; p<this.chain.phases.length; p++ ) 
      {
        var phase = this.chain.phases[p];

        for( var stylesheetNo=0; stylesheetNo<phase.xslts.length; stylesheetNo++ ) 
        {
          /*
           * If the model is already available we do not need to add a listener.
           */
          var xsltModel = phase.xslts[stylesheetNo].model;
          if (!xsltModel.isReady()) {
            /*
             * Add the status listener observing when the stylesheet model has finished loading.
             * Then the processor can be created and possibly the next state can be set.
             */
            xsltModel.addStatusListener({
              status: xsltModel.getReadyStatus(),
              listener: this._singleChainTransformerLoaded.bind(this, phase, phase.xslts[stylesheetNo]).bind(this)
            });
            var failedStati = xsltModel.getFailedStatus();
            (Array.isArray(failedStati) ? failedStati : [ failedStati ]).forEach(function(failedStatus) {
              xsltModel.addStatusListener({
                status: failedStatus,
                listener: this._chainStylesheetLoadingFailed.bind(this,phase.xslts[stylesheetNo]).bind(this)
              });
            }, this);
            xsltModel.execute();
          } else {
            this._singleChainTransformerLoaded(phase, phase.xslts[stylesheetNo]);
          }
          
        } // transformation loop
      } // phases loop

      // Mark last transformation in past phase as the very last of the chain
      this.chain.phases[p-1].xslts[stylesheetNo-1].isLastOfChain = true;
    },

  /**
   * Intercepts status changes and sets the CSS class of the target HTML element either
   * to "statusReady" or "statusNotReady" dependent on which status the class is currently in.
   * @private
   */
  _fireStatusEvent: function(/* Object */ args)
    {
      if (this.targetHTMLElementId) {
        var targetElement = this.targetHtmlElement || (this.targetHTMLElementId ? document.getElementById(this.targetHTMLElementId) : null);
        if (targetElement == null)
          throw Error("TargetElement '"+this.targetHTMLElementId+"' not found.");
        if (this.isReady()) {
          jQuery(targetElement).addClass("statusReady").removeClass("statusNotReady");
        } else if (!this.suppressInitialRendering || this.getStatus() !== this.initializedStatus) {
          jQuery(targetElement).addClass("statusNotReady").removeClass("statusReady");
        }
      }
      bcdui.core.DataProvider.prototype._fireStatusEvent.call(this, args);
    }
}); // Create class: bcdui.core.TransformationChain



bcdui.core.Renderer = bcdui._migPjs._classCreate(bcdui.core.TransformationChain, 
/** @lends bcdui.core.Renderer.prototype */
{
  /**
   * @classdesc
   * A concrete subclass of {@link bcdui.core.TransformationChain TransformationChain}, inserting its output into targetHtml.
   * Renderer are not executed explicitly but they start on creation and execute their dependencies (i.e. parameters) automatically unless they are already {@link bcdui.core.AbstractExecutable#isReady ready}.
   * @extends bcdui.core.TransformationChain
   * 
   * @constructs
   * @param {Object} args - An argument object with the following properties:
   * @param {chainDef} args.chain - The definition of the transformation chain
   * <ul>
   *   <li>a single string with the URL of the transformation XSLT or doTjs template</li>
   *   <li>or a JS transformator function</li>
   *   <li>or an array with a mixture of URLs and JS transformators</li>
   *   <li>or a DataProvider with an XML document following xsd http://www.businesscode.de/schema/bcdui/chain-1.0.0</li>
   * </ul>
   * Make sure the last transformation outputs html, for example in case of XSLT set the last stylesheet to &lt;xsl:output method="html" 
   * @param {bcdui.core.DataProvider} args.inputModel                       - The model with the data to be transformed in html
   * @param {targetHtmlRef}           [args.targetHtml]                     - A reference to the HTML DOM Element where to put the output
   * @param {Object}                  [args.parameters]                     - An object, where each property holds a DataProvider as a transformation parameter
   * Once this Renderer is {@link bcdui.core.AbstractExecutable#execute executed}, it will check each parameter and execute it if it is not {@link bcdui.core.AbstractExecutable .isReady()} before executing itself.
   * @param {string}                  [args.id]                             - Globally unique id for use in declarative contexts
   * @param {boolean}                 [args.suppressInitialRendering=false] - If true, the renderer does not initially auto execute but waits for an explicit execute
   */
  initialize: function(args)
  {
    var isLeaf = ((typeof this.type == "undefined")  ? "" + (this.type = "bcdui.core.Renderer" ): "") != "";
    
    args.chain = args.chain || bcdui.contextPath+"/bcdui/xslt/renderer/htmlBuilder.xslt";

    // remember targetHtml here only. It can even be undefined, so you can set it later via setTargetHtml member function
    // for backwardsCompatiblity, also support targetHTMLElementId/targetHtmlElementId
    this.targetHtml = args.targetHtml || args.targetHTMLElementId || args.targetHtmlElementId
    bcdui.core.TransformationChain.call(this, args);
    if (isLeaf)
      this._checkAutoRegister();
  },

  /**
   * Overwrites inherited execute(forced)
   * Allows also to provide instead of the boolean forced an args object with
   * @param args {(boolean|Object)} forced or args:
   *   <ul>
   *     <li>fn: {function?} A function called once when the object becomes ready again. Called immediately if we are already ready && shouldRefresh==false</li>
   *     <li>partialHtmlTargets: {String?} Space separated list of html element ids. If given, only these elements within targetHmtlElement of the render 
   *         are touched in the DOM tree, plus the chain gets the parameter bcdPartialHtmlTargets set to this value. Valid for this one call only, cleared after.</li>
   *     <li>shouldRefresh: {boolean?} "false" if this method should do nothing when the object is already in the ready status. Default is "true"false".</li>
   *   </ul>
   */
  execute: function( /* object */ args)
  {
    // set targetHTMLElementId/targetHtmlElement on first execute
    if (! this.targetHTMLElementId) {
      // we have a real html element object
      if (typeof this.targetHtml != "string" && jQuery(this.targetHtml).length > 0)
        this.targetHtmlElement = jQuery(this.targetHtml).get(0);
      this.targetHTMLElementId = bcdui.util._getTargetHtml({targetHtml: this.targetHtml}, "renderer_");
    }

    // Well-known data provider, reuse if already created
    var bcdPartialHtmlDP = this.dataProviders.find(function(dataProvider) { return dataProvider.name == "bcdPartialHtmlTargets";  });

    // Simple interface with non or boolean arg
    if( typeof args === "undefined" || typeof args === "boolean" ) 
    {
      if( bcdPartialHtmlDP )
        bcdPartialHtmlDP.setData("");
      bcdui.core.TransformationChain.prototype.execute.call( this, args );
    } 
    // Full interface with arg object
    else 
    {
      // If given, set bcdPartialHtmlTargets, otherwise clear
      if( bcdPartialHtmlDP )
        bcdPartialHtmlDP.setData( args.partialHtmlTargets ? args.partialHtmlTargets : "" );
      else
        this.dataProviders.push(new bcdui.core.StringDataProvider({name:"bcdPartialHtmlTargets",
          value: args.partialHtmlTargets ? args.partialHtmlTargets : ""}) );

      // Callback onready
      if (typeof args.fn != "undefined") 
      {
        if( this.isReady() && !args.shouldRefresh )
          setTimeout( args.fn );
        else
          this.addStatusListener({ status: this.getReadyStatus(), onlyOnce: true, listener: args.fn });
      }

      // Default transformation chain behaviour
      bcdui.core.TransformationChain.prototype.execute.call( this, args.shouldRefresh );
    }
  },

  /**
   * Return the target html element where the renderer places its output
   */
  getTargetHtml: function()
  {
    return this.targetHtmlElement || jQuery("#" + this.targetHTMLElementId).get(0);
  },

  /**
   * Sets the target html element where the renderer places its output
   * @param targetHtmlElement {HtmlElement} target html element
   */
  setTargetHtml: function(targetHtmlElement)
  {
    this.targetHtmlElement = null;
    this.targetHTMLElementId = null;

    // a real html element id, then use the access via id
    if (typeof targetHtmlElement == "string" && document.getElementById(targetHtmlElement) != null) {
      this.targetHTMLElementId = targetHtmlElement;
    }
    else if (jQuery(targetHtmlElement).length > 0) {
      this.targetHtmlElement = jQuery(targetHtmlElement).get(0);
      this.targetHTMLElementId = bcdui.util._getTargetHtml({targetHtml: targetHtmlElement}, "renderer_");
    }
  }
});

bcdui.core.ModelWrapper = bcdui._migPjs._classCreate(bcdui.core.TransformationChain, 
/** @lends bcdui.core.ModelWrapper.prototype */
{
  /**
  * @classdesc
  * A concrete subclass of {@link bcdui.core.TransformationChain TransformationChain}, being a DataProvider itself, providing the transformed input.
  * @extends bcdui.core.TransformationChain
  * 
  * @constructs
  * @param {Object} args - An argument object with the following properties:
  * @param {chainDef} args.chain - The definition of the transformation chain
  * <ul>
  *   <li>a single string with the URL of the transformation XSLT or doTjs template</li>
  *   <li>or a JS transformator function</li>
  *   <li>or an array with a mixture of URLs and JS transformators</li>
  *   <li>or a DataProvider with an XML document following xsd http://www.businesscode.de/schema/bcdui/chain-1.0.0</li>
  * </ul>
  * @param {bcdui.core.DataProvider} args.inputModel - The model with the data to be transformed
  * @param {Object}     [args.parameters]            - An object, where each property holds a DataProvideras a transformation parameter
  * Once this ModelWapper is {@link bcdui.core.AbstractExecutable#execute executed}, it will check each parameter and execute it, if it is not {@link bcdui.core.AbstractExecutable .isReady()}
  * @param {string}     [args.id]                    - Globally unique id for use in declarative contexts
  */
  initialize: function(args)
  {
    var isLeaf = ((typeof this.type == "undefined")  ? "" + (this.type = "bcdui.core.ModelWapper" ): "") != "";
    
    bcdui.core.TransformationChain.call(this, args);

    if (isLeaf)
      this._checkAutoRegister();
  }
});

bcdui.core.ModelUpdater = bcdui._migPjs._classCreate(bcdui.core.TransformationChain,
/** @lends bcdui.core.ModelUpdater.prototype */
{
  /**
   * @classdesc
   * A concrete subclass of {@link bcdui.core.TransformationChain TransformationChain}, replacing its targetModel's content with the result of the transformation applied to it.
   * Can be applied to all concrete subclasses of {@link bcdui.core.AbstractUpdatableModel AbstractUpdatableModel}, 
   * like {@link bcdui.core.bcdui.core.StaticModel StaticModel} or {@link bcdui.core.SimpleModel SimpleModel}
   * Technically, this is a bcdui.core.TransformationChain object but it should not be executed, fired, modified or read from directly.
   * 
   * @constructs
   * @param {Object} args - An argument object with the following properties:
   * @param {chainDef} args.chain - The definition of the transformation chain
   * <ul>
   *   <li>a single string with the URL of the transformation XSLT or doTjs template</li>
   *   <li>or a JS transformator function</li>
   *   <li>or an array with a mixture of URLs and JS transformators</li>
   *   <li>or a DataProvider with an XML document following xsd http://www.businesscode.de/schema/bcdui/chain-1.0.0</li>
   * </ul>
   * @param {bcdui.core.DataProvider} args.targetModel        - The model to be transformed and replaced
   * @param {Object}                  [args.parameters]       - An object, where each property holds a DataProvider, used as a transformation parameters.
   * Once this ModelUpdater is {@link bcdui.core.AbstractExecutable#execute executed}, it will check each parameter and execute it, if it is not {@link bcdui.core.AbstractExecutable#isReady .isReady()}
   * @param {boolean}                 [args.autoUpdate=true] - A boolean value indicating if the ModelUpdater should run on every change in the targetModel. Can be a data modification event or if targetModel again reaches the ready status. If autoUpdate is false a model updater only runs when the targetModel is (re)executed. 
   * @param {string}                  [args.id]               - Globally unique id for use in declarative contexts
   */
  initialize: function(args)
  {
    var isLeaf = ((typeof this.type == "undefined")  ? "" + (this.type = "bcdui.core.ModelUpdater" ): "") != "";
    
    if (typeof args.inputModel != "undefined") {
      throw Error("Must not define input model on model updater");
    }
    /*
     * Set a dummy model as input model because it is anyway exchanged by the target model
     * when the modelUpdater is executed. If we omit it we would cause a parameter validation
     * exception.
     */
    args.inputModel = bcdui.core.emptyModel;
    this.modelUpdaterTargetModel = args.targetModel;
    bcdui.core.TransformationChain.call(this, args);
    args.targetModel._addModelUpdater(this, args.autoUpdate);

    if (isLeaf)
      this._checkAutoRegister();
  }
});
