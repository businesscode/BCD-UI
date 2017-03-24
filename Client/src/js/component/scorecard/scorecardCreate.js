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
bcdui.util.namespace("bcdui.component",
/** @lends bcdui.component */
{
  /**
   * From JS, use new bcdui.component.scorecard.ScorecardModel() instead. This is for JSP etc.
   * @private
   */
  createScorecardModel: function(args)
  {
    args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.component._schema_createScorecardModel_args );
    args.metaData = args.config || args.metaData || args.metaDataModel;
    bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.component._schema_createScorecardModel_args);

    if (typeof args.id == "undefined")
      args.id = bcdui.factory.objectRegistry.generateTemporaryId();

    var dependencies = [ args.metaData ];
    if( args.customParameterModel ) {
      var custParamModelId = bcdui.util.isString(args.customParameterModel) ?
          args.customParameterModel : bcdui.factory._isSymbolicLink(args.customParameterModel) ?
              args.customParameterModel.refId : args.customParameterModel.id;
      dependencies.push(custParamModelId);
      args.customParameterModelId = custParamModelId;
    }
    bcdui.factory.objectRegistry.withObjects( dependencies,
      function() {
        new bcdui.component.scorecard.ScorecardModel( args );
      }
    );

    return bcdui.factory._generateSymbolicLink(args);
  }
});

bcdui.component.scorecard.Scorecard = bcdui._migPjs._classCreate( bcdui.core.Renderer,
/** @lends bcdui.component.scorecard.Scorecard.prototype */
{
  /**
   * @classdesc
   * Creates a convenience standard scorecard renderer.
   * You can create this with a configuration args.config or a {@link bcdui.component.scorecard.ScorecardModel} as args.input.  
   * This renderer provides a default tooltip and supports default actions for detail-export, WSYIWYG export and detail-drill-over for a context menu
   * Call these by triggering scorecardActions:[detailExport|reportExcelExport|drillToAnalysis] at the cell, 
   * you may provide them with a custom 'chain' and 'chainParameters', see bcdRowIdent in default context menu as samples.
   * @extends bcdui.core.Renderer
   *
   * @constructs
   * @param {Object} args - The parameter map contains the following properties:
   * @param {targetHtmlRef}           args.targetHtml                         - The socrecard renderer's target html element.
   * @param {bcdui.core.DataProvider} [args.inputModel]                       - The data of the scorecard model {@link bcdui.component.scorecard.ScorecardModel}. Provide args.config or args.inputModel
   * @param {bcdui.core.DataProvider} [args.config]                           - The data of the scorecard configuration model according to XSD http://www.businesscode.de/schema/bcdui/scorecard-1.0.0
   *    If given, an internal ScorecardModel based on the configuration data will be created. args.config it will be provided as 'scConfig' to the renderer chain. Provide args.config or args.inputModel
   * @param {string}                  [args.id]                               - The id of the new object. If omitted the id is automatically generated.
   * @param {chainDef}                 args.chain                             - An alternative rendering chain, See {@link bcdui.core.Renderer}. Default here is HtmlBuilder.
   * @param {string}                  [args.tooltipUrl]                       - To overwrite default renderer xslt of the tooltip. An empty string will disable tooltips. 
   *    Default is BCD-UI's default sc tooltip, which shows all attributes of a cell. To give a KPI an attribute, nest an scc:AspectRef into scc:AspectKpi in the scorecard definition.
   * @param {bcdui.core.DataProvider} [args.statusModel=bcdui.wkModels.guiStatusEstablished] - StatusModel, containing the filters at /SomeRoot/f:Filter, default is 'guiStatusEstablished'
   * @param {bcdui.core.DataProvider} [args.customParameter]                  - Custom parameters for usage in custom aggregators, aspects and renderer as 'customParameter' parameter.</li>
   * @param {Object}                  [args.parameters]                       - An object, where each property holds a DataProvider being a renderer parameter used in custom chains
   * @param {(boolean|string)}        [args.contextMenu=false]                - If true, scorecard's default context menu is used, otherwise provide the url to your context menu xslt here.
   */
  initialize: function(args) 
  {
    var isLeaf = ((typeof this.type == "undefined")  ? "" + (this.type = "bcdui.component.scorecard.Scorecard" ): "") != "";

    // As long as ScorecardModel internally relies on the registry to find its sub- or helper models, we have to enforce an id here
    // also context menu needs it
    this.id = args.id = args.id || bcdui.factory.objectRegistry.generateTemporaryIdInScope("scorecard_");

    // Argument defaults
    args.chain = args.chain || bcdui.contextPath+"/bcdui/xslt/renderer/htmlBuilder.xslt";
    this.statusModel = args.statusModel || bcdui.wkModels.guiStatusEstablished;
    this.metaDataModel = args.config;
    this.targetHtml = args.targetHtml;
    args.tooltipUrl = typeof args.tooltipUrl !== "undefined" ? args.tooltipUrl : bcdui.contextPath+"/bcdui/js/component/scorecard/scTooltip.xslt";

    if (! args.enhancedConfiguration && args.config)
      args.enhancedConfiguration = new bcdui.core.ModelWrapper({inputModel: this.metaDataModel, chain: [ bcdui.contextPath+"/bcdui/js/component/scorecard/mergeLayout.xslt"],parameters: {scorecardId: this.id, statusModel: this.statusModel } } );
    if (! args.enhancedConfiguration && args.inputModel)
      args.enhancedConfiguration = args.inputModel;
    if (! args.enhancedConfiguration) {
      bcdui.log.error("Scorecard "+this.id+" has neither an inputModel nor a config parameter");
      return;
    }

    this.inputModel = new bcdui.core.DataProviderHolder();
    bcdui.factory.objectRegistry.withReadyObjects(args.enhancedConfiguration, function() {
      var rqModel = null;
      // don't run when we don't have at least one KpiRef
      if( ! bcdui.factory.objectRegistry.getObject(args.enhancedConfiguration).getData().selectSingleNode("/*/scc:Layout/scc:KpiRefs/scc:KpiRef") )
        rqModel = new bcdui.core.StaticModel( "<Wrq xmlns='http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0'></Wrq>" );
      else if( !!args.config )
        rqModel = new bcdui.component.scorecard.ScorecardModel({ id: this.id+"_model", config: args.enhancedConfiguration, statusModel: this.statusModel, customParameter: args.customParameter });
      else if( !!args.inputModel )
        rqModel = args.inputModel;
      this.inputModel.setSource(rqModel);
    }.bind(this));

    bcdui.core.Renderer.call( this, {
      id: this.id,
      inputModel: this.inputModel,
      targetHtml: args.targetHtml, 
      chain: args.chain,
      parameters: jQuery.extend({ sortRows: false, sortCols: false, makeRowSpan: true, scConfig: args.enhancedConfiguration, customParameter: args.customParameter}, args.parameters )
    });
  
    //------------------
    // We also create some convenience objects: tooltip, detail export and WYSIWYG export infrastructure
    // Being lazy
    this.onReady({ executeIfNotReady: true, onlyOnce: true, onSuccess: function() {

      //--------------------
      // Create the tooltip
      if( args.tooltipUrl && args.tooltipUrl!="false" && args.tooltipUrl != "" ) {
        bcdui.widget.createTooltip({ tableMode: true, filter:"td|th",
          inputModel: this.inputModel, url: args.tooltipUrl,
          targetRendererId: this.id, parameters: jQuery.extend( {}, args.parameters, { sccDefinition: args.enhancedConfiguration } ) } );
      }

      //--------------------
      // Create the context menu
      if( !!args.contextMenu && args.contextMenu !== 'false' && args.contextMenu !== false ) {
        var contextMenuUrl = args.contextMenu === true || args.contextMenu === 'true' ? bcdui.config.jsLibPath+"component/scorecard/contextMenu.xslt" : args.contextMenu;
        var bcdPageAccess = " " + (bcdui.config.clientRights.bcdPageAccess || []).reduce(function(a, b) { return a + " " + b;},[]) + " ";
        this.contextMenu = new bcdui.core.ModelWrapper({ chain: contextMenuUrl, inputModel: this.statusModel,
          parameters: { bcdRowIdent: bcdui.wkModels.bcdRowIdent, bcdColIdent: bcdui.wkModels.bcdColIdent, sccDefinition: args.enhancedConfiguration, bcdPageAccess: bcdPageAccess } });
        bcdui.widget.createContextMenu({ targetRendererId: this.id, refreshMenuModel: true, tableMode: true, inputModel: this.contextMenu });
      }

      var _getKpiId = function( inputModel, bcdRowIdent) {
        return inputModel.getData().selectSingleNode("/*/wrs:Data/wrs:R[@id='"+bcdRowIdent+"']/wrs:C[position()=/*/wrs:Header/wrs:Columns/wrs:C[@id='bcd_kpi_id']/@pos]/text()").nodeValue;
      }

      //-----------------------------------------------------------
      // Standard action handlers
      // Fires a detail export request based on current bcdRow/ColIdents of context menu
      bcdui._migPjs._$(args.targetHtml).on(" scorecardActions:detailExport", function(scId, evt, memo){

        // Each scorecard gets a detailExportWrq creating ModelWarpper, if its not there for us yet, create it
        if( ! this.actionDetailExportWrq ) 
        {
          // Standard parameters
          var parameters = {
            sccDefinition: args.enhancedConfiguration,
            dimensionModel: bcdui.wkModels.bcdDimensions,
            statusModel: this.statusModel, filterModel: this.statusModel
          };

          // Custom xslt plus custom parameters
          jQuery.extend(parameters, memo.chainParameters);
          var chain = memo.chain || [ bcdui.contextPath+"/bcdui/js/component/scorecard/detailExportWrq.xslt", bcdui.component.scorecard._periodTranslator ];

          // Create the export Wrq and execute each time, we become ready
          this.actionDetailExportWrq = new bcdui.core.ModelWrapper({ inputModel: this.inputModel, chain: chain, parameters: parameters });
          var fileType = memo.fileType || bcdui.config.settings.bcdui.component.exports.detailExportDefaultFormat;
        }
        // Enforce updating of context sensitive parameters, especially bcdRow/ColIdent
        // we are using memo.bcdRow/ColIdent and not bcdui.wkModels because the mouse may have moved already
        this.actionDetailExportWrq.addDataProvider(new bcdui.core.ConstantDataProvider({name: 'bcdColIdent', value: memo.bcdColIdent }));
        this.actionDetailExportWrq.addDataProvider(new bcdui.core.ConstantDataProvider({name: 'bcdRowIdent', value: memo.bcdRowIdent }));
        this.actionDetailExportWrq.addDataProvider(new bcdui.core.ConstantDataProvider({name: 'kpiId', value: _getKpiId( this.inputModel, memo.bcdRowIdent)}));
        for (var cP in memo.chainParameters) {
          this.actionDrillToAnalysisGuiStatus.addDataProvider(
            memo.chainParameters[cP] instanceof bcdui.core.DataProvider
              ? memo.chainParameters[cP]
              : new bcdui.core.ConstantDataProvider({name: cP, value:  memo.chainParameters[cP]})
          , cP);
        }

        this.actionDetailExportWrq.execute(true);
        bcdui.component.exports.detailExport( { wrq: this.actionDetailExportWrq, type: fileType } );

      }.bind( this, args.id ) );

      //---------------------------------
      // Fires a drill to detail data based on current bcdRow/ColIdents of context menu
      bcdui._migPjs._$(args.targetHtml).on( "scorecardActions:drillToAnalysis", function(scId, evt, memo){

        // Each scorecard gets a target guiStatus creating ModelWrapper for drill over, if its not there for us yet, create it
        if( !this.actionDrillToAnalysisGuiStatus ) 
        {
          // Standard parameters
          var parameters = {
            sccDefinition: args.enhancedConfiguration,
            dimensionModel: bcdui.wkModels.bcdDimensions,
            statusModel: this.statusModel, filterModel: this.statusModel
          };

          // Custom xslt plus custom parameters
          jQuery.extend(parameters, memo.chainParameters);
          var chain = memo.chain || [bcdui.contextPath+"/bcdui/js/component/scorecard/drillToAnalysis.xslt", bcdui.component.scorecard._periodTranslator ];

          // Create the target url and open page each time, we become ready
          this.actionDrillToAnalysisGuiStatus = new bcdui.core.ModelWrapper({ chain: chain, inputModel: this.inputModel, parameters: parameters });
        }

        // Enforce updating of parameters, especially bcdRow/ColIdent
        // We are using memo.bcdRow/ColIdent and not bcdui.wkModels because the mouse may have moved already
        this.actionDrillToAnalysisGuiStatus.addDataProvider(new bcdui.core.ConstantDataProvider({name: "bcdColIdent", value: memo.bcdColIdent}));
        this.actionDrillToAnalysisGuiStatus.addDataProvider(new bcdui.core.ConstantDataProvider({name: "bcdRowIdent", value: memo.bcdRowIdent}));
        this.actionDrillToAnalysisGuiStatus.addDataProvider(new bcdui.core.ConstantDataProvider({name: 'kpiId', value: _getKpiId( this.inputModel, memo.bcdRowIdent)}));
        for (var cP in memo.chainParameters) {
          this.actionDrillToAnalysisGuiStatus.addDataProvider(
            memo.chainParameters[cP] instanceof bcdui.core.DataProvider
              ? memo.chainParameters[cP]
              : new bcdui.core.ConstantDataProvider({name: cP, value:  memo.chainParameters[cP]})
          , cP);
        }

        this.actionDrillToAnalysisGuiStatus.onceReady( function() {
          bcdui.core.compression.compressDOMDocument( this.actionDrillToAnalysisGuiStatus.getData(), function(compressedDoc) {
            window.open(bcdui.core.setRequestDocumentParameter(memo.targetPage, compressedDoc));
          });
        }.bind(this));

        this.actionDrillToAnalysisGuiStatus.execute(true);

      }.bind( this, args.id ) );

      //---------------------------------
      // Fires a report WYSIWYG- export to excel
      bcdui._migPjs._$(args.targetHtml).on("scorecardActions:reportExcelExport", function(evt){
        bcdui.component.exports.exportWysiwygAsExcel({rootElement: bcdui._migPjs._$(evt.target).closest("table").get(0)});
      });

    }.bind(this)});

    // Now we finished our constructor, we can check whether we need to register ourselves
    if (isLeaf)
      this._checkAutoRegister();
  },

  /**
   * @returns {bcdui.core.DataProvider} configuration model of the scorecard
   */
  getConfigModel: function() {
    return this.metaDataModel;
  },
  /**
   * Only for backward compatibility. If needed in future, should be part of Renderer
   * @private
   * @returns {targetHtmlref} Target element in HTML of the scorecard
   */
  getTargetHTMLElement: function() { 
    return jQuery("#"+this.targetHtml).get(0);
  }
});

  /**
   * Period filterTranslation handling
   * replaces filter which contain the given bRefs with a pure period range filter
   * the bRefs are removed from the cube layout since you can't know if they are available as dimension in the target report
   * Additionally you can change the postfix
   * @param {Object} doc - chain input document
   * @param {Object} param - chain parameter bag
   * @private
   */
  bcdui.component.scorecard._periodTranslator = function(doc, param) {

    if (param && param.sccDefinition) {
      var nodeFtTrw = param.sccDefinition.selectSingleNode("/*/scc:Kpis/scc:Kpi[@id='"+param.kpiId+"']//dm:Translations/dm:PeriodTranslation[@toRangeWhen]");
      if (nodeFtTrw) {

        // generate correct dateFrom/dateTo
        bcdui.widget.periodChooser.rebuildDateFromDateToFromFilter(doc);
        var bRefs = nodeFtTrw.getAttribute("toRangeWhen").split(" ");

        // find belonging outer period nodes 
        var targetModelNodes = [];
        var determinedPostfix = null;
        for (var x=0; x < bRefs.length; x++) {

          var nodes = doc.selectNodes("//f:Filter//f:Expression[@op and @value!='' and (@bRef='" + bRefs[x] + "' or starts-with(@bRef, '" + bRefs[x] + "_'))]");
          for (var n = 0; n < nodes.length; n++) {
            var outerAnd = null
            var node = nodes[n];
            // simple f:And/f:Expression
            if (node && node.parentNode && node.parentNode.nodeName == "f:And") {
              outerAnd = node.parentNode;
              // or f:And/f:Or/f:And/f:Expression
              if (node.parentNode.parentNode && node.parentNode.parentNode.nodeName == "f:Or" && node.parentNode.parentNode.parentNode && node.parentNode.parentNode.parentNode.nodeName == "f:And")
                outerAnd = node.parentNode.parentNode.parentNode;
              if (outerAnd.getAttribute("bcdMarker") == null && outerAnd.getAttribute("dateFrom") && outerAnd.getAttribute("dateTo")) {
                outerAnd.setAttribute("bcdMarker", "true");
                var bRef = node.getAttribute("bRef");
                determinedPostfix = bRef.indexOf("_") == -1 ? "" : bRef.substring(bRef.indexOf("_") + 1);
                targetModelNodes.push(outerAnd);
              }
            }
          }
        }
        // remove temporary marker
        var marked = doc.selectNodes("//f:And[@bcdMarker]");
        for (var m = 0; m < marked.length; m++)
          marked[m].removeAttribute("bcdMarker");

        // replace found period filter blocks with pure range filter
        for (var t = 0; t < targetModelNodes.length; t++) {
          var targetNode = targetModelNodes[t];

          // do we have a postfix?
          var postfix = targetNode.getAttribute("bcdPostfix");
          if (postfix == null && determinedPostfix != null)
            postfix = determinedPostfix;
          postfix = postfix != null ? postfix : "";
          if (postfix == "bcdEmpty") postfix = "";
          var b = (postfix != "" ? "dy_" + postfix : "dy");

          // clear and rebuild filter
          bcdui.core.removeXPath(targetNode, "./*");
          bcdui.core.createElementWithPrototype(targetNode, "./f:Expression[@op='>=' and @bRef='" + b + "' and @value='" + targetNode.getAttribute("dateFrom") + "']");
          bcdui.core.createElementWithPrototype(targetNode, "./f:Expression[@op='<=' and @bRef='" + b + "' and @value='" + targetNode.getAttribute("dateTo") +  "']");
        }
      }

      // replace all bRefs postfixes
      var nodeFtTrw = param.sccDefinition.selectSingleNode("/*/scc:Kpis/scc:Kpi[@id='"+param.kpiId+"']//dm:Translations/dm:PeriodTranslation[@postfix]");
      if (nodeFtTrw) {
        var postfix = nodeFtTrw.getAttribute("postfix") || "";
        for (var x in bcdui.widget.periodChooser._dateRangeBindingItemNames) {
          jQuery.makeArray(doc.selectNodes("//f:Filter//f:Expression[@op and @value!='' and (@bRef='" + bcdui.widget.periodChooser._dateRangeBindingItemNames[x] + "' or starts-with(@bRef, '" + bcdui.widget.periodChooser._dateRangeBindingItemNames[x] + "_'))]")).forEach(function(e) {
            var purebRef = e.getAttribute("bRef");
            purebRef = purebRef == null ? "" : (purebRef.indexOf("_") != -1 ? purebRef.substring(0, purebRef.indexOf("_")) : purebRef);
            e.setAttribute("bRef", purebRef + (postfix != "" ? "_" + postfix : ""));
          });
        }
        jQuery.makeArray(doc.selectNodes("//f:*[@bcdPostfix]")).forEach(function(e) {
          e.setAttribute("bcdPostfix", postfix == "" ? "bcdEmpty" : postfix);
        });
      }

      return doc;
    }
  };

  /**
   * Factory method for scorecard for declarative environments.
   * From JS, use new {@link bcdui.component.scorecard.Scorecard} instead
   * @private
   */
  bcdui.component.createScorecard = function(args) 
  {
    args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.component._schema_createScorecard_args );
    args.chain = args.chain || args.url;
    args.id = args.id || bcdui.factory.objectRegistry.generateTemporaryIdInScope("scorecard_");
    args.config = args.config || args.metaData || args.metaDataModel;
    args.inputModel = args.inputModel || (args.dataProviders && args.dataProviders[0] ? args.dataProviders[0] : null);
    args.targetHtml = args.targetHTMLElementId = bcdui.util._getTargetHtml(args, "scorecard_");
    args.parameters = args.parameters||{};
    bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.component._schema_createScorecard_args);

    // Some objects may not exist (i.e. not being registered) yet. bcdui.component.scorecard.Scorecard itself makes sure later, they are also ready.
    var waitForDpRegistration = [args.inputModel, args.config];
    Object.keys(args.parameters).forEach( function(key) {
      if( bcdui.factory._isSymbolicLink(args.parameters[key]) )
        waitForDpRegistration.push( args.parameters[key] );
    });
    bcdui.factory.objectRegistry.withObjects( waitForDpRegistration, function() {
      // We are factory level (createXX). Core level (new ...) requires the real dataProviders, not just their symlinks, 
      // so we swap that here, knowing that they are registered due to waitFor
      Object.keys(args.parameters).forEach( function(key) {
        if( bcdui.factory._isSymbolicLink(args.parameters[key]) )
          args.parameters[key] = bcdui.factory.objectRegistry.getObject(args.parameters[key]);
      });
      args.inputModel = bcdui.factory.objectRegistry.getObject(args.inputModel);
      args.config = bcdui.factory.objectRegistry.getObject(args.config);
      var sc = new bcdui.component.scorecard.Scorecard(args);
    });

    return { refId: args.id, symbolicLink: true };
  };
