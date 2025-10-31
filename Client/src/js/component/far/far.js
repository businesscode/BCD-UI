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
"use strict";

/** 
 * A FAR component
 */
bcdui.component.far.Far = class
{
  /**
   * events fired on (or on a child of) the targetHtml
   *
   * @public
   */
  events = {
    /**
     * is fired on the element containing far grid everytime the FAR renderer has finished rendering
     */
    rendered : "bcdui.component.far.rendered"
  }
  /**
   * @param {object}                    args                    The parameter map contains the following properties:
   * @param {targetHtmlRef}             args.targetHtml         A reference to the HTML DOM Element where to render the output.
   * @param {bcdui.core.DataProvider}   args.config             Configuration document from http://www.businesscode.de/schema/bcdui/far-1.0.0
   * @param {string}                    [args.componentId=far]  An ID for the component, 'far' is the default. This is not the data provider's technical identifier,
   *                                                            this ID is used as component identifer to support multiple components on single page, i.e. reuse same configuration.
   * @param {bcdui.core.DataProvider}   [args.statusModel=bcdui.wkModels.guiStatusEstablished]  The StatusModel, containing the filters at /SomeRoot/f:Filter
   * @param {Object|string}           [args.actionHandler]      Instance (or name) of an action handler class. Requires contextMenuActionHandler property. Default is an instance of bcdui.component.far.ActionHandler.
   */
  constructor(args){
    const self = this;
    // enhance arguments
    this.options = Object.assign(true,{},args);
    // business component id to read configuration, may be ambiguous
    this.options.componentId = this.options.componentId || "far";
    this.options.statusModel = args.statusModel || bcdui.wkModels.guiStatusEstablished;
    this.options.targetHtml = jQuery("#" + bcdui.util._getTargetHtml(args, this.options.componentId));

    // check args
    this.options.config || (function(){throw "Argument .config missing"})();

    // technical ID which MUST be unique; all technical IDs derived in scope must inherit from this ID
    this.id = bcdui.factory.objectRegistry.generateTemporaryIdInScope("bcd" + this.options.componentId);
    
    this.actionHandler = (this.options.actionHandler && this.options.actionHandler.contextMenuActionHandler) ? this.options.actionHandler : new bcdui.component.far.ActionHandler();

    // create enhanced configuration
    this.enhancedConfig = bcdui.component.far.enhancer.createEnhancedConfiguration({
      chain:        this.options.enhancedConfigurationChain, // internal API
      config:       this.options.config,
      statusModel:  this.options.statusModel,
      componentId:  this.options.componentId,
      id:           this.id + "_enhancedConfig" // register since we use it in bcduiFarConfigurator widget
    });
    this.farModel = new bcdui.component.far.FarModel({
      enhancedConfig: this.enhancedConfig,
      statusModel:  this.options.statusModel,
      componentId:  this.options.componentId,
      requestModelChain: this.options.farModel ? this.options.farModel.requestModelChain : undefined // internal API
    });

    // create UI skeleton
    this._createLayout();

    this.gridRenderingTarget = this.options.targetHtml.find(".bcd-far-grid"); // container for the grid

    // complete initialization
    this.enhancedConfig.onceReady(this._configLoaded.bind(this));

    // bind UI events
    this.gridRenderingTarget.on("bcdui:far:reportExport", ()=>{
      self.reportExport();
    });

    // create far renderer
    this._initRenderer();
  }

  /**
   * runs a excel export on currently rendered grid
   * 
   * @private
   */
  reportExport(){
    bcdui.component.exports.exportWysiwygAsExcel({rootElement: this.gridRenderingTarget});
  }

  /**
   * Prepare layout for UI components, convention for class is : bcd-far- + [component], containers:
   *
   *  configurator
   *  paginate
   *  grid
   *
   * @private
   */
  _createLayout(){
    this.options.targetHtml.html("<div class='bcd-far-configurator'></div><div class='bcd-far-filter'></div><div class='bcd-far-paginate'></div><div class='bcd-far-grid'></div>");
  }

  /**
   * initializes Renderer, assumes that this.farModel is constructed
   * @private
   */
  _initRenderer(){
    // paginate control, only if configured
    this.enhancedConfig.onceReady(function(){
      if(!this.enhancedConfig.getData().selectSingleNode("/*/far:Layout//far:Paginate")){
        return; // no pagination enabled
      }
      var totalRowsCountProvider = this.farModel._getTotalRowsCountProvider();
      var paginationControl = new bcdui.core.Renderer({
        targetHtml : this.options.targetHtml.find(".bcd-far-paginate"),
        chain : bcdui.contextPath + "/bcdui/js/component/far/pagination.xslt",
        inputModel : this.enhancedConfig,
        parameters : {
          enhancedConfigModelId : this.enhancedConfig.id,
          farModel : this.farModel,
          totalRowCountModel : totalRowsCountProvider
        }
      });
      // update pagination panel when total rows data provider changes
      totalRowsCountProvider.onChange(paginationControl.execute.bind(paginationControl));
    }.bind(this));

    // htmlBuilder on Wrs
    var gridRendering = new bcdui.core.Renderer({
      targetHtml : this.gridRenderingTarget,
      chain : this.options.renderingChain || [
        bcdui.contextPath + "/bcdui/xslt/wrs/paginate.xslt",        // apply far:Paginate
        bcdui.contextPath + "/bcdui/xslt/renderer/htmlBuilder.xslt" // final rendering of Wrs
      ], // renderingChain = internal API
      inputModel : this.farModel,
      parameters : {
        sortCols : false,
        sortRows : false,
        makeRowSpan : false,
        paramModel : this.enhancedConfig
      }
    });
    gridRendering.onReady(function(){
      this.gridRenderingTarget.trigger( this.events.rendered );
    }.bind(this));

    // trigger rendering everytime UI pagination updates $config/xp:Paginate
    this.enhancedConfig.onChange(gridRendering.execute.bind(gridRendering), "/*/xp:Paginate");
  }

  /**
   * Initilizes component from enhanced configuration, this.enhancedConfig is considered ready at this point
   * @private
   */
  _configLoaded(){
    // check if to render the configurator
    var configuratorElement = this.enhancedConfig.getData().selectSingleNode("/*/far:Configurator");
    if(configuratorElement){
      var treeConfig = {
          levelNodeName:        "far:Category",
          itemNodeName:         "far:Item",
          isDefaultCollapsed:   true
      };
      this.options.targetHtml
      .find(".bcd-far-configurator")
      .bcduiFarConfigurator({
        dimensions_optionsModelXPath:               "$" + this.enhancedConfig.id + "/*/far:Configurator/far:Dimensions//*/@caption",
        dimensions_optionsModelRelativeValueXPath:  "../@idRef",
        dimensions_treeConfig:                      treeConfig,

        measures_optionsModelXPath:                 "$" + this.enhancedConfig.id + "/*/far:Configurator/far:Measures//*/@caption",
        measures_optionsModelRelativeValueXPath:    "../@idRef",
        measures_treeConfig:                        treeConfig,

        targetModelXPath:                           "$guiStatus/guiStatus:Status/far:Far[@id='" + this.options.componentId + "']",
        
        doSortOptions:                              !!configuratorElement.selectSingleNode("far:Sorting[@enabled='true']")
      });
    }

    // enable default context menu; TODO: implementation note, in future we many want to extend it with href to xml or inline definition
    if(this.enhancedConfig.query("/*/far:ContextMenu")){
      bcdui.widget.createContextMenu({
        targetHtml : this.gridRenderingTarget,
        inputModel : new bcdui.core.SimpleModel(bcdui.config.libPath + "js/component/far/contextMenu.xml"),
        actionHandler: this.actionHandler.contextMenuActionHandler
      });
    }
    // enable report filter
    if(this.enhancedConfig.query("/*/far:ReportFilter")){
      // our HideUnselected option on $guiStatus
      var xPath_hideUnselected = "/guiStatus:Status/guiStatus:ClientSettings/far:ReportFilter[@id='" + this.options.componentId + "']/far:HideUnselected";
      var xPath_farLayout = "/guiStatus:Status/far:Far[@id='" + this.options.componentId + "']/far:Layout/far:Columns";
      // create options model from Dimenions and Measures suitable for universal filter widget
      var universalFilterModel = new bcdui.core.ModelWrapper({
        id          : this.id + "_universalFilterModel",
        inputModel  : this.enhancedConfig,
        chain       : [function(doc){
          var newDoc = bcdui.core.browserCompatibility.createDOMFromXmlString("<Root/>");
          var allItems = jQuery
          // select all Dimensions and Measures
          .makeArray( doc.selectNodes("/*/far:Dimensions//dm:LevelRef|/*/far:Measures//dm:Measure") )
          // normalize to value/caption
          .map(function(n){
            return {
              value   : n.getAttribute("id") || n.getAttribute("bRef"), // Measures/@id or dm:LevelRef/@bRef 
              caption : n.getAttribute("caption"),
              isDim   : (n.baseName||n.localName) == "LevelRef"
            }
          })
          ;

          // if hide-unselected is enabled, keep selected only
          if(bcdui.wkModels.guiStatus.read(xPath_hideUnselected, "0") == "1"){
            // build map of our current selection
            var farLayoutItems = jQuery.makeArray(
              bcdui.wkModels.guiStatus.getData().selectNodes(xPath_farLayout + "/*")
            ).reduce(function(map, n){
              map[(n.getAttribute("idRef") || n.getAttribute("bRef"))] = null;
              return map;
            },{});
            
            allItems = allItems.filter(function(item){ // value,caption object
              return farLayoutItems.hasOwnProperty(item.value);
            });
          }

          allItems
          // sort by caption
          .sort(function(a,b){
            return a.caption < b.caption ? -1 : a.caption == b.caption ? 0 : 1;
          })
          // write as Item/id caption
          .forEach(function(n){
            var itemEl = doc.createElement("Item");
            itemEl.setAttribute("id", n.value);
            itemEl.setAttribute("caption", n.caption);
            if(n.isDim){
              itemEl.setAttribute("isDim", "true"); // required by reportFilterRendering.xslt
            }
            newDoc.documentElement.appendChild(itemEl);
          });
          return newDoc;
        }]
      });
      // recompute on showAll change
      bcdui.wkModels.guiStatus.onChange(universalFilterModel.execute.bind(universalFilterModel), xPath_hideUnselected);
      // recompute on layout change
      bcdui.wkModels.guiStatus.onChange(universalFilterModel.execute.bind(universalFilterModel), xPath_farLayout);
      // recompute on enhancedConfig change
      this.enhancedConfig.onChange(universalFilterModel.execute.bind(universalFilterModel));

      // render filter widget
      var targetModelXPathReportFilter = "/guiStatus:Status/f:Filter/f:And[@id='" + this.options.componentId + "']";
      var reportFilterContainer = this.options.targetHtml.find(".bcd-far-filter");
      reportFilterContainer.bcduiUniversalFilterNg({
        targetModelXPath      : "$guiStatus" + targetModelXPathReportFilter,
        bRefOptionsModelXPath : "$" + universalFilterModel.id + "/*/Item/@caption",
        bRefOptionsModelRelativeValueXPath : "../@id",
        renderingChain        : bcdui.contextPath + "/bcdui/js/component/far/reportFilterRendering.xslt",
        renderingChainParameters : {
          universalFilterModel : universalFilterModel
        },
        inputRow                           : jQuery.extend(true, { // internal widget API
          renderingChain : bcdui.contextPath + "/bcdui/js/component/far/reportFilterInputRendering.jstlit", // we need custom UI here for the HideUnselected option
          renderingChainParameters : {
            xPath_hideUnselected : "$guiStatus" + xPath_hideUnselected
          }
        }, this.options.reportFilter != null ? this.options.reportFilter.inputRow : null)
      });

      /*
       * Currently, our report filters always work in Having mode, which requires all items filtered to be selected in the report;
       * ensure they are and also, they must be removed from filter once deselected from the configurator.
       *
       * in /Client/src/js/component/far/model/request.xslt we map all Items from report filter as a wrq:Having filter to
       * support dim/measure combination, this requires us to ensure that all items being filtered are selected as well.
       * Add listeners here to sync between configuration and report filters
       */
      var syncReportAndFilter = function(removeMissingItemsFromFilter){
        // ensure that all items we have in report filter are selected
        var reportFilterItemMap = jQuery.makeArray(
            bcdui.wkModels.guiStatus.getData().selectNodes(targetModelXPathReportFilter + "//f:Expression")
        )
        .map(function(n){
          return n.getAttribute("bRef")
        })
        .reduce(function(map,value){map[value]=null;return map;}, {}); // make unique, reduce to map
        var reportFilterItems = Object.keys(reportFilterItemMap); // unique item set

        // ensure we have them in far:Layout/far:Columns
        var farLayoutColumns = bcdui.wkModels.guiStatus.getData().selectSingleNode("/*/far:Far[@id='"+this.options.componentId+"']/far:Layout/far:Columns");
        var missingItems = farLayoutColumns == null ? reportFilterItems : reportFilterItems.filter(function(bRef){
          return !farLayoutColumns.selectSingleNode("*[@bRef='"+bRef+"' or @idRef='"+bRef+"']");
        });

        if(!missingItems.length){
          return; // nothing to do
        }

        // we can either remove the missingItems from report filter or add them into selection
        if(removeMissingItemsFromFilter){
          reportFilterContainer._bcduiWidget()._deleteElementsByRef(missingItems);
        } else {
          // lookup in enhancedConfig and create dim/meas respectively
          var configDoc = this.enhancedConfig.getData();
          var targetDoc = bcdui.wkModels.guiStatus.getData();
          var rootItemXPath = "/*/far:Far[@id='"+this.options.componentId+"']/far:Layout/far:Columns";
          missingItems.forEach(function(bRef){
            var refItem = configDoc.selectSingleNode("/*/far:Dimensions/dm:LevelRef[@bRef='"+bRef+"']|/*/far:Measures/dm:Measure[@id='"+bRef+"']");
            if((refItem.localName||refItem.baseName) == "LevelRef"){ // dim
              bcdui.core.createElementWithPrototype(targetDoc, rootItemXPath + "/dm:LevelRef[@bRef='"+bRef+"']");
            }else{ // measure
              bcdui.core.createElementWithPrototype(targetDoc, rootItemXPath + "/dm:MeasureRef[@idRef='"+bRef+"']");
            }
          });
          bcdui.wkModels.guiStatus.fire();
        }
      };
      bcdui.wkModels.guiStatus.onChange(syncReportAndFilter.bind(this, false), targetModelXPathReportFilter);                     // add missing items to report
      bcdui.wkModels.guiStatus.onChange(syncReportAndFilter.bind(this, true), "/*/far:Far[@id='"+this.options.componentId+"']");  // remove missing from filter
    }
  }
};

bcdui.component.far.triggerAdd = function() {
  jQuery(this).trigger('bcdui:universalFilter:add')
};

/**
 * enhancement DSL adapter utility : far-config to enhanced configuration
 * @namespace
 */
bcdui.component.far.enhancer = Object.assign(bcdui.component.far.enhancer,
/** @lends bcdui.component.far.enhancer */    
{
  /**
   * Create an enhanced configuration data provider which is required as a configuration
   * for any part of the FAR component.
   *
   * @param {object}                    args                    The arguments
   * @param {bcdui.core.DataProvider}   args.config             Configuration document from http://www.businesscode.de/schema/bcdui/far-1.0.0
   * @param {string}                    [args.componentId=far]  An ID for the component, 'far' is the default. This is not the data provider's,
   *                                                            this ID is used as component identifer to support multiple components on single page
   * @param {bcdui.core.DataProvider}   [args.statusModel=bcdui.wkModels.guiStatusEstablished]  StatusModel, containing the filters at /SomeRoot/f:Filter,
   *                                                                                            far:Far/far:ConfiguratorLayout element, etc. default is 'guiStatusEstablished'
   * @param {chainDef}                  [args.chain=/bcdui/js/component/far/config-enhancer.xslt] Overrides default chain definition.
   *
   * @return {bcdui.core.DataProvider}  Dataprovider with enhanced configuration document
   *                                    based on the input configuration. This data provider
   *                                    does not listen to changes on the input configuration
   *                                    document.
   * @public
   */
  createEnhancedConfiguration : function(args){
    var enhancerParams = Object.assign({},args,{
      chain : args.chain || bcdui.contextPath + "/bcdui/js/component/far/config-enhancer.xslt",
      inputModel : args.config,
      parameters : {
        statusModel : args.statusModel || bcdui.wkModels.guiStatusEstablished,
        componentId : args.componentId || "far",
        dimensionsModel : bcdui.wkModels.bcdDimensions,
        categoriesModel : bcdui.wkModels.bcdCategories,
        sortingItemSeparator : bcdui.core.magicChar.separator
      }
    });
    return new bcdui.core.ModelWrapper(enhancerParams);
  }
});