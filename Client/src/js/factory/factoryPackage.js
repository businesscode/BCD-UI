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
 * Most parts of this package are not intended to be used from JavaScript and thus not part of the API documentation.
 * <p/>
 * The factory package implements the functionality necessary to use BCD-UI objects in the context of jsp, XSLT-templates and XAPI and widget XPath expressions,
 * in other words, wherever objects are connected by id rather than by providing JavaScript objects.
 * <p/>
 * The main difference between JavaScript and declarative contexts are that 
 * <ul>
 *   <li>All objects are identified and connected by a string id rather than by JavaScript references. For this reason, all objects created by the factory are registered automatically.
 *   <li>Second, it is allowed for objects to be created in an order following HTML output, as for example jsp tags are put into their output place.
 *       This leads to situations, where an object receives an object as input, which is only defined further down, something that cannot happen in JavaScript.
 *       Therefore the factories in here delay the object creation until all objects ot depends on are defined.
 * </ul>
 * 
  * @namespace bcdui.factory
 */
bcdui.factory = Object.assign(bcdui.factory, 
/** @lends bcdui.factory */
{

  /**
   * @private
   */
  _createRequestDocumentURL: function(args) {
    bcdui.core.compression.compressDOMDocument(args.domDocument, function(compressedDoc) {
      args.fn(bcdui.core.setRequestDocumentParameter(args.url, compressedDoc));
    });
  },
  
  /**
   * migrates chain to url if url is undefined and chain 'seems' like a url
   * 
   * @private
   */
  _fixupChainUrl: function(args){
    if(args.url && args.chain){
      window.console && window.console.warn("Defined both: .url and .chain properties in factory API call, please recheck", ars);
    }

    if(!args.url && args.chain && typeof args.chain == "string" && /.*\.(xslt|dott|js)$/i.test(args.chain)){
      args.url = args.chain;
      delete args.chain;
    }
  },

  /**
   * Taken an XPath which optionally starts with $... (where ... stands for a model name)
   * and returns the model name and the XPath for the model. For example when the XPath
   * is  $myModel/wrs:Wrs/wrs:Data/wrs:R it returns an object like: { xPath:
   * "/wrs:Wrs/wrs:Data/wrs:R", modelId: "myModel" }. If the model is missing "guiStatus"
   * is returned as modelId.
   * @param {String} xPathWithModelId The XPath optionally starting with a $model...
   * prefix and containing an XPath based on the model.
   * @return {Object} An object like { xPath: ... , modelId: ... } containing the parts
   * the xPathWithModelId parameter is composed of.
   * @private
   */
  _extractXPathAndModelId: function(xPathWithModelId) {
    var modelId = xPathWithModelId.replace(/^(\$(\w+))?.*$/, "$2");
    return {
      xPath: xPathWithModelId.replace(/^\$\w+/, ""),
      modelId: (modelId || "guiStatus")
    };
  },

  /**
   * Creates a dataprovider from an xPath, its value is the evaluated xPath
   */
  createDataProviderWithXPath: function(args) {
    if (typeof args.id == "undefined") {
      args.id = bcdui.factory.objectRegistry.generateTemporaryId();
    }

    var source = args.source || args.dataProvider || args.dataProviders;
    if (Array.isArray(source)) {
      source = source[0];
    }
    if (bcdui.factory._isSymbolicLink(source)) {
      source = source.refId;
    }

    if (bcdui.util.isString(source)) {
      bcdui.factory.objectRegistry.withObjects({
        ids: [ source ],
        fn: function() {
          new bcdui.core.DataProviderWithXPath({
            id: args.id,
            name: args.name || args.id,
            source: bcdui.factory.objectRegistry.getObject(source),
            xPath: args.xPath
          });
        }
      });
    } else {
      new bcdui.core.DataProviderWithXPath({
        id: args.id,
        name: args.name || args.id,
        source: source,
        xPath: args.xPath
      });
    }

    return bcdui.factory._generateSymbolicLink(args);
  },
  /**
   * creates a dataprovider the data is a list of elements found at xpath bundled below a artifical root node
   * @private
   */
  createDataProviderWithXPathNodes: function(args) {
    if (typeof args.id == "undefined") {
      args.id = bcdui.factory.objectRegistry.generateTemporaryId();
    }

    var source = args.source || args.dataProvider || args.dataProviders;
    if (Array.isArray(source)) {
      source = source[0];
    }
    if (bcdui.factory._isSymbolicLink(source)) {
      source = source.refId;
    }

    if (bcdui.util.isString(source)) {
      bcdui.factory.objectRegistry.withObjects({
        ids: [ source ],
        fn: function() {
          new bcdui.core.DataProviderWithXPathNodes({
            id: args.id,
            name: args.name || args.id,
            source: bcdui.factory.objectRegistry.getObject(source),
            xPath: args.xPath
          });
        }
      });
    } else {
      new bcdui.core.DataProviderWithXPathNodes({
        id: args.id,
        dataProvider: source,
        xPath: args.xPath
      });
    }

    return bcdui.factory._generateSymbolicLink(args);
  },

  /**
   * JSP/SXLT/API factory for {@link bcdui.core.StaticModel}
   * @private
   */
  createStaticModel: function(args)
    {
      args = this._xmlArgs( args, bcdui.factory.validate.core._schema_createStaticModel_args );
      bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.core._schema_createStaticModel_args);
      if (typeof args.id == "undefined") {
        args.id = bcdui.factory.objectRegistry.generateTemporaryId();
      }

      new bcdui.core.StaticModel(args);

      return bcdui.factory._generateSymbolicLink(args);
    },

    /**
     * JSP/SXLT/API factory for {@link bcdui.core.AutoModel}
     * @private
     */
   createAutoModel: function( /* Object */ args) {
     args = this._xmlArgs( args, bcdui.factory.validate.core._schema_createAutoModel_args );
     bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.core._schema_createAutoModel_args);

     if (typeof args.id == "undefined") {
       args.id = bcdui.factory.objectRegistry.generateTemporaryId();
     }

     args.isDistinct    = bcdui.factory._normalizeBoolean(args.isDistinct, false);
     args.isAutoRefresh = bcdui.factory._normalizeBoolean(args.isAutoRefresh, false);
     args.useCaptions   = bcdui.factory._normalizeBoolean(args.useCaptions, false);

     var autoModel = new bcdui.core.AutoModel(args);
     if (! args.id)
       args.id = autoModel.id;
     return bcdui.factory._generateSymbolicLink(args);
    },

  /**
   * JSP/SXLT/API factory for {@link bcdui.core.SimpleModel}
   * @private
   */
  createModel: function(/* Object */ args)
    {
      args = this._xmlArgs( args, bcdui.factory.validate.core._schema_createModel_args );
      bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.core._schema_createModel_args);
      if (typeof args.id == "undefined") {
        args.id = bcdui.factory.objectRegistry.generateTemporaryId();
      }
      args.isAutoRefresh = bcdui.factory._normalizeBoolean(args.isAutoRefresh, false);

      // We may need to wait for the object containing the request to exist
      var dependencies = [];

      // We want to work with a data provider object, that's why we get it here in case we only received a link
      if (bcdui.factory._isSymbolicLink(args.requestDocument)) {
        args.requestDocument = args.requestDocument.refId;
      }
      // Here we know we have the data provide id, if it is a string. Then we have to wait for the model to exist,
      // Otherwise it was the data provider object itself -> no need to wait, see below
      if (bcdui.util.isString(args.requestDocument)) {
        if (!args.requestDocument.trim()) {
          delete args.requestDocument;
        } else {
          dependencies.push(args.requestDocument);
        }
      }

      // Our data provider object is available, let's go
      var actionFunction = function() {
        var dataProviderForUrl = null;

        // Object is there, either we have it or we retrieve it here
        if (typeof args.requestDocument == "string") {
          dataProviderForUrl = bcdui.factory.objectRegistry.getObject(args.requestDocument);
        } else if (typeof args.requestDocument != "undefined") {
          dataProviderForUrl = args.requestDocument;
        }
        // We wrap the request data provider so that simple model can get a data provider providing the request url
        var requestDataProvider;
        if (dataProviderForUrl!= null) {
          requestDataProvider = new bcdui.core.RequestDocumentDataProvider( {url: dataProviderForUrl, modelURL: args.url, id: args.id+"_bcduiRequestDocument" } );
        }
        new bcdui.core.SimpleModel({
          id: args.id,
          url: requestDataProvider || args.url,
          isAutoRefresh: args.isAutoRefresh,
          mimeType: args.mimeType,
          debug:args.debug,
          saveChain: args.saveChain || args.chain,
          saveParameters: args.saveParameters || args.parameters
        });
      };

      // Lets see whether we need to wait for an data provider object or not
      if (dependencies.length == 0) {
        actionFunction();
      } else {
        bcdui.factory.objectRegistry.withObjects({
          ids: dependencies,
          fn: actionFunction
        });
      }

      return bcdui.factory._generateSymbolicLink(args);
    },

  /**
   * @private
   */
  _isSymbolicLink: function(/* object */ obj) {
    if (typeof obj == "undefined" || bcdui.util.isString(obj) || obj == null) return false;
    return obj.refId && bcdui.util.isString(obj.refId);
  },

  /**
   * @private
   */
  _generateSymbolicLink: function(/* object  | string */ obj) {
    return new bcdui.factory.SymLink(obj);
  },

  /**
   * Convenience method to normalize with different forms of data provider lists
   * @return {Array} Array of strings with the data provider's ids;
   *                 Also argument dependencies[] a is extended with the data provider's ids
   * @private
   */
  _extractDataProvidersAndUpdateDependencies: function(dataProv, dependencies) {
    // No valid dps given
    if (typeof dataProv == "undefined")
      return [];
    // One dp given as an id-string
    if (bcdui.util.isString(dataProv)) {
      if (!dataProv.trim()) return [];
      dependencies.push(dataProv);
      return [ dataProv ];
    }
    // An array with dp can be given as a mixture of id-strings and symbolic links
    if (Array.isArray(dataProv)) {
      return dataProv.map(function(p) {
        if (bcdui.factory._isSymbolicLink(p)) {
          dependencies.push(p);
          return bcdui.factory._generateSymbolicLink(p);
        }
        if (bcdui.util.isString(p)) {
          dependencies.push(p);
        }
        return p;
      });
    }
    // A single dp given as symbolic link
    if (bcdui.factory._isSymbolicLink(dataProv)) {
      dependencies.push(dataProv.refId);
      return [ bcdui.factory._generateSymbolicLink(dataProv) ];
    }
    // One dp is given as a model dataProvider js object
    if (dataProv.getData && bcdui.util.isFunction(dataProv.getData)) {
      return [ dataProv ];
    }
    // Otherwise the argument is treated as a hash map with name/value pairs
    return Object.keys(dataProv).map(function(entry) {
        var name = entry;
        var value = dataProv[entry];
        // If value is a scalar, a const data providers is created for it
        if (bcdui.util.isString(value) || bcdui.util.isNumber(value) || typeof value == "boolean" || (value && value.nodeType) ) {
          return new bcdui.core.ConstantDataProvider({
            name: name, value: value
          });
        } else if (value == null) {
          return new bcdui.core.ConstantDataProvider({
            name: name, value: null
          });
        } else if (bcdui.factory._isSymbolicLink(value)) {
          dependencies.push(value.refId);
          return { name: name, refId: value.refId, symbolicLink: true };
        } else if (bcdui.util.isFunction(value.getData) && bcdui.util.isFunction(value.getName)) {
          // if the value is a dataprovider and provided with its name, it is set directly,
          if (name == value.getName()) {
            return value;
          }
          // otherwise an alias is created for it (to provide the dp under the correct param name)
          return new bcdui.core.DataProviderAlias({
            name: name, source: value
          });
        } else {
          bcdui.log.error("Unknown parameter type detected.");
        }
      });
  },

  /**
   * JSP/SXLT/API factory for {@link bcdui.core.ModelUpdater}
   * @param args {Object}
   * @private
   */
  createModelUpdater: function(args)
    {
      args = this._xmlArgs( args, bcdui.factory.validate.core._schema_createModelUpdater_args );
      bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.core._schema_createModelUpdater_args);

      args.id = args.id || bcdui.factory.objectRegistry.generateTemporaryIdInScope("bcdModelUpdater_");

      // get dependencies
      if (args.targetModel == "guiStatus") {
        if (typeof args.dataProviders == "undefined")
          args.dataProviders = [];
        args.dataProviders.push(bcdui.core.emptyModel) // avoid auto-adding guiStatus as dependency for guiStatus model updater
      }
      bcdui.factory._fixupChainUrl(args);
      var o = bcdui.factory._collectDependencies(args);

      /*
       * Pre-inform the target model so that it can wait for the model updaters to be
       * added. Otherwise it is possible that it becomes ready before the updater has
       * been added.
       */
      var targetModelObject = bcdui.factory.objectRegistry.getObject(args.targetModel);
      if (targetModelObject && targetModelObject._waitForModelUpdaterToBeAdded) {
        targetModelObject._waitForModelUpdaterToBeAdded(args.id);
      } else {
        bcdui.factory.objectRegistry.withObjects([ args.targetModel ], function() {
          bcdui.factory.objectRegistry.getObject(args.targetModel)._waitForModelUpdaterToBeAdded(args.id);
        });
      }

      var actionFunction = function() {

        // take over collected chain
        args.chain = (!args.url) ? bcdui.factory.objectRegistry.getObject(o.chain) : o.chain;

        // transform ids and keep them as parameters instead of dataProviders
        args.dataProviders = bcdui.factory._mapDataProviders(o.dataProviders);
        args.parameters = args.dataProviders.reduce( function(map, x) {
          map[bcdui.util.isFunction(x.getName) ? x.getName() : x.id] = x;
          return map;
        }, {});
        delete args.dataProviders;

        // create modelupdater as soon as targetModel exists) 
        if (bcdui.factory.objectRegistry.getObject(args.targetModel)) {
          args.targetModel = bcdui.factory.objectRegistry.getObject(args.targetModel);
          new bcdui.core.ModelUpdater(args);
        } else {
          bcdui.factory.objectRegistry.withObjects([args.targetModel], function() {
            args.targetModel = bcdui.factory.objectRegistry.getObject(args.targetModel);
            new bcdui.core.ModelUpdater(args);
          });
        }
      };

      if (o.dependencies.length == 0) {
        actionFunction();
      } else {
        bcdui.factory.objectRegistry.withObjects({
          ids: o.dependencies,
          fn: actionFunction
        });
      }
    },

  /**
   * JSP/SXLT/API factory for {@link bcdui.core.Renderer}
   * @param args The parameter map contains the same members {@link bcdui.core.Renderer} plus the following properties:
   * @param {String} [args.url]  This parameter can be set when the renderer should only
   *          apply one single XSLT style sheet. It contains the URL pointing to
   *          it. If this parameter is set the 'chain' and 'stylesheetModel' parameters
   *          must be omitted.
   * @param {String|DataProvider|SymLink} [args.stylesheetModel] A model providing the stylesheet
   *          of the renderer. If specified the parameters 'url' and 'chain' are
   *          invalid.
   * @return {bcdui.factory.SymLink} A reference to the renderer (TransformationChain object).
   * @private
   */
  createRenderer: function(/* Object */ args)
    {
      args = this._xmlArgs( args, bcdui.factory.validate.core._schema_createRenderer_args );
      bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.core._schema_createRenderer_args);
      args.id = bcdui.factory.objectRegistry.generateTemporaryId(args.id);
      args.isRenderer = true; // since target might not be given, we need a token to identify the type

      if (args.targetHtml || args.targetHTMLElementId || args.targetHtmlElementId){
        // call rendererCallback() if any defined
        if(bcdui.config.rendererCallback && bcdui.util.isFunction(bcdui.config.rendererCallback)) {
          bcdui.config.rendererCallback(args.id);
        }
      }
      // we pass all args to trafo chain (targetHtml, targetHTMLElementId, targetHtmlElementId)
      return bcdui.factory.createTransformationChain(args);
    },

  /**
   * @private
   */
  createTransformationChain: function(/* Object */ args) {
    bcdui.factory._fixupChainUrl(args);

    var o = bcdui.factory._collectDependencies(args);

    var actionFunction = function() {
      var constructor = args.isRenderer ? bcdui.core.Renderer : bcdui.core.ModelWrapper;
      var renderer =
          new constructor({
            id: args.id,
            chain: (!args.url) ? bcdui.factory.objectRegistry.getObject(o.chain) : o.chain,
            dataProviders: bcdui.factory._mapDataProviders(o.dataProviders),
            targetHtml: args.targetHtml || args.targetHTMLElementId || args.targetHtmlElementId, // map all possible options to targetHtml for simplification
            suppressInitialRendering: args.suppressInitialRendering,
            postHtmlAttachProcess: args.postHtmlAttachProcess,
            debug: args.debug
          });
    };

    if (o.dependencies.length == 0) {
      actionFunction();
    } else {
      bcdui.factory.objectRegistry.withObjects({
        ids: o.dependencies,
        fn: actionFunction
      });
    }

    return bcdui.factory._generateSymbolicLink(args);
  },

  /**
   * Map ids and symlinks of bcdui.core.DataProvider to the bcdui.core.DataProvider
   * @param {Array.<(string|datasymlink)>}     idArray - An array of ids and symlinks
   * @return {Array.<bcdui.core.DataProvider>} An array of the associated bcdui.core.DataProvider. 
   *  If the symlink has a name different from the DP, then the DP is 'locally renamed' by wrappin it into a bcdui.core.DataProviderAlias 
   *  to preserve its parameter name, which can differ from the real name 
   * @private
   */
  _mapDataProviders: function(idArray) {
    return idArray.map(function(dataProvider) {
      if (bcdui.util.isString(dataProvider)) {
        return bcdui.factory.objectRegistry.getObject(dataProvider);
      }
      if (dataProvider.symbolicLink) {
        var realDataProvider = bcdui.factory.objectRegistry.getObject(dataProvider.refId);
        var currentName = bcdui.util.isFunction(realDataProvider.getName) ? realDataProvider.getName() : realDataProvider.id;
        if (dataProvider.name == currentName) {
          return realDataProvider;
        }
        return new bcdui.core.DataProviderAlias({
          name: dataProvider.name, source: realDataProvider
        });
      }
      return dataProvider;
    });
  },

  /**
   * Maps various DataProviders given in different form as args properties to a normalized bcdui.core.TransformationChain argument object
   * @param {Object} args - The parameter map contains the following properties:
   * @param {bcdui.core.DataProvider} [args.inputModel]       - If there, its id becomes the first ret.dataProviders[] entry
   * @param {bcdui.core.DataProvider} [args.model]            - Its id becomes an ret.dataProviders[] entry
   * @param {bcdui.core.DataProvider} [args.dataProviders]    - Its id becomes annret.dataProviders[] entry
   * @param {bcdui.core.DataProvider} [args.stylesheetModel]  - Its id becomes an ret.dependency[] entry
   * @param {bcdui.core.DataProvider} [args.chain]            - Its id becomes ret.chain
   * @returns {Object} with chain, dependencies and dataProviders as properties
   *   chain is the chain, dependencies are needed for the chain, dataProviders are input for the transformation
   * @private
   */
  _collectDependencies: function(args) {
    var dependencies = [];

    var dataProviders = bcdui.factory._extractDataProvidersAndUpdateDependencies(args.inputModel, dependencies);

    dataProviders = dataProviders.concat(
        bcdui.factory._extractDataProvidersAndUpdateDependencies(args.model, dependencies)
    );
    dataProviders = dataProviders.concat(
        bcdui.factory._extractDataProvidersAndUpdateDependencies(args.dataProviders, dependencies)
    );
    if (dataProviders.length == 0) {
      dependencies.push("guiStatus");
      dataProviders.push(bcdui.wkModels.guiStatus);
    }
    dataProviders = dataProviders.concat(
        bcdui.factory._extractDataProvidersAndUpdateDependencies(args.parameters, dependencies)
    );

    var chain = null;
    if (typeof args.stylesheetModel != "undefined" && args.stylesheetModel != null) {
      var chain = null;
      if (bcdui.factory._isSymbolicLink(args.stylesheetModel)) {
        dependencies.push(args.stylesheetModel.refId);
        chain = bcdui.factory.objectRegistry.getObject(args.stylesheetModel.refId)
      } else if (bcdui.util.isString(args.stylesheetModel)){
        dependencies.push(args.stylesheetModel);
        chain = bcdui.factory.objectRegistry.getObject(args.stylesheetModel)
      } else {
        dependencies.push(args.stylesheetModel.id);
        chain = args.stylesheetModel;
      }
    } else if (typeof args.url != "undefined" && args.url != null && args.url != "") {
      chain = args.url;
    } else if (bcdui.util.isString(args.chain)) {
      chain = args.chain;
      dependencies.push(chain);
    } else if (bcdui.factory._isSymbolicLink(args.chain)) {
      chain = args.chain.refId;
      dependencies.push(chain);
    } else if (typeof args.chain != "undefined") {
      chain = args.chain;
    }
    
    return {chain: chain, dependencies: dependencies, dataProviders: dataProviders};
  },

  /**
   * JSP/SXLT/API factory for {@link bcdui.core.ModelWrapper}
   * @param {Object} args The parameter map is identical to the parameter map of the {@link bcdui.factory.createRenderer} function
   * except for the 'targetHTMLElementId'. This is not used by a ModelWrapper.
   * @return {bcdui.factory.SymLink} A reference to the modelWrapper (TransformationChain object).
   * @private
   */
  createModelWrapper: function(args)
    {
      args = this._xmlArgs( args, bcdui.factory.validate.core._schema_createModelWrapper_args );
      bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.core._schema_createModelWrapper_args);
      args.id = bcdui.factory.objectRegistry.generateTemporaryId(args.id);
      return bcdui.factory.createTransformationChain(args);
    },

  /**
   * JSP/SXLT/API factory for {@link bcdui.core.JsDataProvider}
   * @private
   */
  createJsDataProvider: function(args)
    {
      args = this._xmlArgs( args, bcdui.factory.validate.core._schema_createJsDataProvider_args );
      bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.core._schema_createJsDataProvider_args);
      if (typeof args.id == "undefined") {
        args.id = bcdui.factory.objectRegistry.generateTemporaryId();
      }

      new bcdui.core.JsDataProvider( { id: args.id, callback: args.callback, doAllwaysRefresh: args.doAllwaysRefresh } )

      return bcdui.factory._generateSymbolicLink(args);
    },

    /**
     * JSP/SXLT/API factory for {@link bcdui.core.AsyncJsDataProvider}
     * @private
     */
    createAsyncJsDataProvider: function(args)
    {
      if (typeof args.id == "undefined") {
        args.id = bcdui.factory.objectRegistry.generateTemporaryId();
      }

      new bcdui.core.AsyncJsDataProvider( { id: args.id, callback: args.callback } )

      return bcdui.factory._generateSymbolicLink(args);
    },

    /**
     * JSP/SXLT/API factory for {@link bcdui.core.ConstantDataProvider}
     * @private
     */
    createConstantDataProvider: function(args)
    {
      if (typeof args.id == "undefined") {
        args.id = bcdui.factory.objectRegistry.generateTemporaryId();
      }

      new bcdui.core.ConstantDataProvider({id: args.id, name: args.name, value: args.value })

      return bcdui.factory._generateSymbolicLink(args);
    },


  /**
   * Adds a status listener to an existing DataProvider. A status listener is triggered
   * either when a specific state is reached or on any state change. Each BCDUI object
   * has a specific set of states and transitions between them. They are documented in
   * the respective component (such as the TransformationChain class).
   * @param {Object} args The parameter map contains the following properties:
   * @param {DataProvider|SymLink|String} args.idRef The DataProvider the listener is
   *          added to.
   * @param {Function|StatusListener} args.listener A function or StatusListener object
   *         representing the listener action.
   * @param {Status|String} [args.status] The status object which identifies the status
   *          that needs to be reached for the listener to be executed. If this
   *          parameter is missing the listener is called on every status transition.
   *          If the status is described with a String it can be the JavaScript variable
   *          name of the status object. If it starts with a dot (.) the status is taken
   *          from a property of the DataProvider. This is useful because most
   *          DataProviders (like TransformationChain) offer their possible status objects
   *          as properties so that the user can access them. (i.e. ".getReadyStatus()" as string)
   * @param {Boolean} [args.onlyOnce] A boolean variable indicating that the listener should
   *         be automatically removed after it has been executed. The default value
   *         is "false".
   *
   * @example
   *   bcdui.factory.addStatusListener({
   *       idRef:    myModel
   *     , status:   myModel.getReadyStatus()
   *     , listener: function() {
   *                   alert("The model has loaded!");
   *                 }
   *     , onlyOnce: true
   *   });
   * @private
   */
  addStatusListener: function(args)
    {
      args = this._xmlArgs( args, bcdui.factory.validate.core._schema_addStatusListener_args );
      bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.core._schema_addStatusListener_args);
      args.ids = args.idRef;
      delete args.idRef;
      args.fn = function() {
        if (typeof args.status == "string" && !!args.status.trim()) {
          var isFunctionCall = args.status.endsWith("()");
          if (isFunctionCall && args.status.startsWith(".")) {
            args.status = eval("bcdui.factory.objectRegistry.objectMap." + args.ids + args.status);
          } else if (isFunctionCall) {
            args.status = eval(args.status);
          } else {
            args.status = eval("new " + args.status + "()");
          }
        } else {
          delete args.status;
        }
        bcdui.factory.objectRegistry.getObject(args.ids).addStatusListener(args);
      };
      bcdui.factory.objectRegistry.withObjects(args);
    },

  /**
   * Adds a data listener to a DataProvider which can be triggered when the data (XML
   * document) is changed. The listener offers two options: It can either be fired on
   * any change or on a change in a specific XPath result.
   *
   * @param {Object} args The parameter map contains the following properties:
   * @param {DataProvider|SymLink|String} args.idRef The DataProvider the listener is
   *          added to.
   * @param {Function|Object} [args.listener]  A synonym for 'callback'.
   * @param {String} [args.side] Whether the listener is called before or after, default is after.
   * @param {Boolean}[args.onlyOnce] A boolean variable indicating that the listener should
   *         be automatically removed after it has been executed. The default value
   *         is "false".
   * @param {String}[trackingXPath] An XPath filter that is applied on the data document
   *          before checking if the data has actually changed. If the document has changed,
   *          but the result of the XPath has not, the callback function is not called.
   *
   * @example
   *   bcdui.factory.addDataListener({
   *       idRef:         guiStatus
   *     , trackingXPath: "/guiStatus:Status/f:Filter/f:Expression[@bRef = 'ctr']"
   *     , listener:      function() {
   *                        alert("myFilter has changed");
   *                      }
   *   });
   * @private
   */

    addDataListener: function(args) {

//  disabled jsvalidation here due to crowded output from widgets (xmldatalister)      
//  args = this._xmlArgs( args, bcdui.factory.validate.core._schema_addDataListener_args );
//  bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.core._schema_addDataListener_args);

    // cleanup possible $model reference in trackingXPath
    if (args.trackingXPath && bcdui.util.isString(args.trackingXPath) && !!args.trackingXPath.trim())
      args.trackingXPath = bcdui.factory._extractXPathAndModelId(args.trackingXPath).xPath;

    var func = function() { bcdui.factory.objectRegistry.getObject(args.idRef).onChange(args); }
    if (typeof args.idRef.onChange == "undefined")
      bcdui.factory.objectRegistry.withObjects(args.idRef, func);
    else
      func();
    },

    /**
     * Removes a data listener from a DataProvider (idRef). The listener can be either be addressed by an ID, by an listener object or
     * by a listener function.
     *
     * @param args The parameter map contains the following properties:
     * @param {DataProvider|SymLink|String} args.idRef The DataProvider the listener is
     *          added to.
     * @param args.id: Id of the listener
     * @param args.listener the function/listener itself
     *
     * @example
     *   bcdui.factory.removeDataListener({
     *       idRef:         guiStatus
     *     , id:     'my_listener'
     *   });
     * @private
     */
  removeDataListener: function(args) {
    if (args &&  typeof args.idRef != "undefined" ){
      bcdui.factory.objectRegistry.withReadyObjects( args.idRef, function() {
        bcdui.factory.objectRegistry.getObject(args.idRef).removeDataListener(args);
      });
    }
  },

  /**
   * Executes a transformation chain producing an XML document. Then it replaces the XML
   * document of the specified target DataProvider with the generated XML document. This
   * is useful when the target DataProvider should be initialized with some client-side
   * computed values. The behavior of the function is similar to the createModelWrapper
   * function and therefore it inherits all parameters from it. The only additional
   * parameter required is the "targetModel" parameter described below.
   * @param args The parameter map
   * @param {DataProvider|SymLink|String} args.targetModel  The ID of the Model
   *          (DataProvider) whose content is supposed to be transformed.
   * @param {DataProvider|SymLink|String} [args.chain] from modelWrapper - A DataProvider (or SymLink or
   *          its ID) which contains the list of style sheets that make up the
   *          transformation chain of this renderer. This DataProvider must
   *          contain an XML document satisfying the XML Schema 'chain-1.0.0.xsd'.
   *          The 'url' and 'chain' parameters are mutually exclusive.
   * @param {String}[args.url] from modelWrapper - This parameter can be set when the renderer should only
   *          apply one single XSLT style sheet. It contains the URL pointing to
   *          it. If this parameter is set the 'chain' parameter must be omitted.
   * @param {DataProvider|SymLink} [args.inputModel]  from modelWrapper - The DataProvider instance that
   *          becomes the input of the transformation chain. If omitted the first
   *          element of the dataProviders[] array is the input.
   * @param {DataProvider|SymLink[]} [args.dataProviders]  from modelWrapper - An array of DataProviders passed to
   *          the transformation chain. These data providers can be access in the
   *          transformation style sheets with xsl:param.
   * @param {Object}[args.parameters] from modelWrapper - A mapping from parameter names to DataProviders (or
   *          SymLinks) which are passed to the transformation chain. This is a more
   *          convenient way to pass parameters compared to the dataProviders array.
   * @example
      bcdui.factory.executeXSLT({
        targetModel    : myModel,
        url            : "../../insertValues.xslt",
        parameters     : { rowCount: 5 },
      });
   */
  executeXSLT: function(args)
    {
      args = this._xmlArgs( args, bcdui.factory.validate.core._schema_executeXSLT_args );
      bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.core._schema_executeXSLT_args);
      var targetId = args.targetModel;
      if (Array.isArray(targetId)) {
        targetId = targetId[0];
      }

      var rendererId = null;
      if (typeof args.id != "undefined") {
        var renderer = bcdui.factory.objectRegistry.getObject(args.id);
        if (renderer != null) {
          rendererId = renderer.id;
          renderer.execute(true);
        }
      }
      if (rendererId == null) {
        if (typeof args.dataProviders == "undefined") {
          args.dataProviders = [ targetId ];
        } else {
          args.dataProviders.push(targetId);
        }
        rendererId = bcdui.factory.createModelWrapper(args).refId;
      }

      bcdui.factory.objectRegistry.withReadyObjects({
        ids: [ rendererId, targetId ],
        fn: function() {
          var renderer = bcdui.factory.objectRegistry.getObject(rendererId);
          var targetModel = bcdui.factory.objectRegistry.getObject(targetId);
          targetModel.dataDoc = renderer.getData();
          targetModel.fire();
        }
      });
    },

  /**
   * (Re)-executes the given {@link bcdui.core.DataProvider} and calls a function
   * when it has finished.
   * @param {Object} args The argument map
   * @param {String|bcdui.factory.SymLink} args.idRef The data provider to be
   *         re-executed.
   * @param {Function} [args.fn] The function to be called when the data provider
   *         becomes ready.
   * @param {Boolean} [args.forced]  If true, the object will be re-executed even
   *         if it is currently ready. Otherwise it is not re-executed when
   *         it is already ready, but the callback function is executed
   *         immediately. The default value is "true".
   * @private
   */
  reDisplay: function(args)
    {
      if (typeof args.fn == "undefined") {
        bcdui.factory.objectRegistry.withObjects(args.idRef, function() {
          bcdui.factory.objectRegistry.getObject(args.idRef).execute(args.forced == "undefined" || args.forced);
        });
        return;
      }
      if (typeof args.forced == "undefined" || args.forced) {
        bcdui.factory.objectRegistry.withObjects(args.idRef, function() {
          var obj = bcdui.factory.objectRegistry.getObject(args.idRef);
          obj.addStatusListener({
              idRef: args.idRef
            , status: obj.getReadyStatus()
            , onlyOnce: true
            , listener: args.fn
          });
          obj.execute(true);
        });
      } else {
        bcdui.factory.objectRegistry.withReadyObjects(args.idRef, args.fn);
      }
    },


  /**
   * If args is a node, transforms the attributes corresponding to the given schema into args properties
   * Convention for html is: attribute with name 'bcdAttrName' becomes a property with the 'attrName'.
   * Currently only for html DOM
   * We need to go via the schema, because the attributes of html do not preserve the case, thus cannot become
   * properties 1:1. Also we exclude unknown attributes by this method
   * @return {Object} If args argument is a HTML node, the derived args, unmodified args otherwise
   * @private
   */
  _xmlArgs: function( args, schema )
    {
    if( args && args.ownerDocument && args.ownerDocument == document ) {
        var newArgs = {};
        for( var p in schema.properties ) {
          if( !schema.properties.hasOwnProperty(p) )
            continue;
          var v = args.getAttribute("bcd"+p.toLowerCase());
          if( v!=null )
            newArgs[p] = v;
        }
        args = newArgs;
      }
      return args;
    },

    /**
     * help function to create boolean values with default value from boolean or string coming from tags or other factory methods
     * @private
     */
    _normalizeBoolean: function( /* String or Boolean */ value, /*String or Boolean */ defaultValue ){
      if ( value === "true" || value === true){
        return true;
      }else if ( value === "false" || value === false){
        return false;
      }else{
        return ( defaultValue === "true" || defaultValue === true);
      }
    },

    /**
     * Syncs to given objects and normalizes them by reinjecting as object references into args eventually execute the callback providing
     * new args with resolved objects. All references listed in objArray can be expected by callback as raw object references and
     * reached they .ready state.
     *
     * consider call to _syncAndNormalize( ['statusDoc'], { statusDoc : 'guiStatus', foo : "bar" }, cb ), the cb will be executed
     * once 'guiStatus' is ready and cb will get following args: { statusDoc : bcdui.wkModels.guiStatus, foo : "bar" }
     *
     * @param {array}     objArray  Array of object references to AbstractExecutables, may be string (an id), SymLink or object reference
     * @param {object}    args      Original args
     * @param {function}  cb        Function to execute once objects are ready receiving 'args' as parameters with resolved properties defined in objArray
     * @private
     */
    _syncAndNormalize : function(objArray, args, cb){
      if(!objArray.map){
        objArray = [objArray];
      }
      // map to : { id, refId }
      objArray = objArray.map(function(e){
        var refId;

        var obj = args[e];
        if (typeof obj == "string"){
          refId = obj;
        } else if(obj) {
          refId = obj.refId || obj.id;
        }
        if(!refId)throw "Cannot normalize object to identifier, property name '"+e+"', property: " + obj;
        return {
          id : e,
          refId : refId
        }
      });
      var idsToSync = objArray.map(function(e){
        return e.refId;
      });

      bcdui.factory.objectRegistry.withReadyObjects(idsToSync, function(){
        objArray.forEach(function(e){
          args[e.id] = bcdui.factory.objectRegistry.getObject(e.refId);
        });
        cb(args);
      });
    }
}); // namespace  bcdui.factory

 /**
   *   This class represents a link for a data provider. Using links has the benefit that a
   *   link can exists even before the linked object has been constructed.
 */
bcdui.factory.SymLink = class
/**
 * @lends bcdui.factory.SymLink.prototype
 */
{

  /**
   * @param {String} obj The string id of the object to be referenced. This id can be
   * used with $getObject to get the actual object as soon as it exists.
   * @private
   */
  constructor(obj)
    {
      this.refId = ""; // For Eclipse (3.6), because @type is not supported and the auto-detection is wrong
      if (bcdui.util.isString(obj)) {
        this.refId = obj;
      } else {
        this.name = ""; // For Eclipse (3.6), because @type is not supported and the auto-detection is wrong
        this.name = bcdui.util.isFunction(obj.getName) ? obj.getName() : obj.name || obj.refId || obj.id;
        this.refId = obj.refId || obj.id;
        this.symbolicLink = true;
      }
    }

  /**
   * @return {String} A string representation of the symbolic link.
   */
   toString()
    {
      return "[ref: " + this.refId + "]";
    }
};
