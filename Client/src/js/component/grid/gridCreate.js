/*
  Copyright 2010-2019 BusinessCode GmbH, Germany

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
 * This namespace contains functionality directly related to BCD-UI grid
 * @namespace bcdui.component.grid
 */
"use strict"; 

/*
 * Notes:
 * when updating to a new handsontable version, the local functional overwrites need to be rechecked (ManualColumnResize, sumCellSizes, getSetting, getColumnHeader, getColumnWidth) if they still match the source (+ needed patch)
 * 
 * Future Improvements:
 *  - support optionModels which reference a different model ($), keep in mind that a code/caption map is built up on startup and is used for reference validation, too
 *    If dynamic/dependent optionsmodels are supported, the map needs to cover all possible code/captions to avoid validation problems 
 *  - Support column sorting with pagination. Currently handsontable's sort is used (which sorts by caption) on the current data window only, a gridModel sort which spans over all pages needs to check code/caption.
 *    Editing the grid should retrigger sorting after updating a cell
 *  - Customize the currently in tfoot stored action buttons to own rendering
 */

bcdui.util.namespace("bcdui.component.grid");

/**
 * @classdesc
 * Creates a GridModel
 * @extends bcdui.core.DataProvider
 *
 * @constructs bcdui.component.grid.GridModel
 * @param {Object} args The parameter map contains the following properties:
 * @param {bcdui.core.DataProvider} [args.config=./gridConfiguration.xml]                  - The model containing the grid configuration data. If it is not present a SimpleModel with the url  './gridConfiguration.xml' is created.
 * @param {string}                  [args.id]                                              - The object's id, needed only when later accessing via id. If given the GridModel registers itself at {@link bcdui.factory.objectRegistry}
 * @param {bcdui.core.DataProvider} [args.statusModel=bcdui.wkModels.guiStatusEstablished] - StatusModel, containing the filters as /SomeRoot/f:Filter
 * @param {chainDef}                [args.saveChain]                                       - The definition of the transformation chain
 * @param {Object}                  [args.saveParameters]                                  - An object, where each property holds a DataProvider, used as a transformation parameters.
 * @param {chainDef}                [args.validationChain]                                 - The definition of the transformation chain
 * @param {Object}                  [args.validationParameters]                            - An object, where each property holds a DataProvider, used as a transformation parameters.
 * @param {chainDef}                [args.loadChain]                                       - The definition of the transformation chain
 * @param {Object}                  [args.loadParameters]                                  - An object, where each property holds a DataProvider, used as a transformation parameters.
*/
bcdui.component.grid.GridModel = function(args)
{
  var isLeaf = ((typeof this.type == "undefined")  ? "" + (this.type = "bcdui.component.grid.GridModel" ): "") != "";

  // Evaluate default parameters
  this.id = args.id ? args.id : bcdui.factory.objectRegistry.generateTemporaryIdInScope("gridModel");
  this.config      = args.config || new bcdui.core.SimpleModel( { url: "gridConfiguration.xml" } );
  this.statusModel = args.statusModel || bcdui.wkModels.guiStatusEstablished;

  // Create our RequestDocumentDataProvider from configuration
  var reqMw = new bcdui.core.ModelWrapper({
    inputModel: this.config,
    parameters: {statusModel: this.statusModel },
    chain: bcdui.contextPath+"/bcdui/js/component/grid/request.xslt"
  });
  
  // Load our data
  bcdui.core.SimpleModel.call( this, {saveChain: args.saveChain, saveParameters: args.saveParameters, url: new bcdui.core.RequestDocumentDataProvider({requestModel: reqMw}), id: this.id });

  // optional load chain
  if (args.loadChain)
    new bcdui.core.ModelUpdater({targetModel: this, chain: args.loadChain, autoUpdate: true, parameters: args.loadParameters || {} });
  
  // validation wrapper, grid renderer adds basic wrs and reference validation
  this.validationChain = args.validationChain || [];
  this.validationParameters = args.validationParameters || {};
  this.validationParameters["bcdGridModel"] = this; // make gridModel available in validation chain
  this.validationResult = this.validationChain ? new bcdui.core.ModelWrapper({ chain: this.validationChain, inputModel: new bcdui.core.StaticModel("<wrs:ValidationResult xmlns:wrs=\"http://www.businesscode.de/schema/bcdui/wrs-1.0.0\"><wrs:Wrs><wrs:Header><wrs:Columns><wrs:C pos=\"1\" id=\"rowId\"/><wrs:C pos=\"2\" id=\"colId\"/><wrs:C pos=\"3\" id=\"errMsg\"/></wrs:Columns></wrs:Header><wrs:Data/></wrs:Wrs></wrs:ValidationResult>"), parameters: this.validationParameters }) : null;

  if (isLeaf)
    this._checkAutoRegister();
};

bcdui.component.grid.GridModel.prototype = Object.create( bcdui.core.SimpleModel.prototype,
/** @lends bcdui.component.grid.GridModel.prototype */
{
});


/**
 * @classdesc
 * Creates a grid front end based on given data or a configuration
 * @extends bcdui.core.Renderer
 *
 * @constructs bcdui.component.grid.Grid
 * @param args The parameter map contains the following properties:
 * @param {targetHtmlRef}           args.targetHtml                                        - A reference to the HTML DOM Element where to put the output
 * @param {bcdui.core.DataProvider} [args.config=./gridConfiguration.xml]                  - The model containing the grid configuration data. If it is not present a SimpleModel with the url  './gridConfiguration.xml' is created.
 * @param {bcdui.core.DataProvider} [args.statusModel=bcdui.wkModels.guiStatusEstablished] - StatusModel (default is 'guiStatusEstablished'), containing the filters as /SomeRoot/f:Filter
 * @param {bcdui.core.DataProvider} [args.inputModel]                                      - WRS or GridModel which is used, if not provided, it is generated out of the config. If provided, config is ignored unless it is set explicitly
 * @param {string}                  [args.id]                                              - The object's id, needed only when later accessing via id. If given the Grid registers itself at {@link bcdui.factory.objectRegistry}
 * @param {Object}                  [args.hotArgs]                                         - Arguments which are extended to handsontable creation
 * @param {string|chainDef}         [args.tooltipChain]                                    - To overwrite default tooltip chain. An empty string will disable tooltips, otherwise the default gridTooltip.xslt is used
 * @param {(boolean|string)}        [args.contextMenu=false]                               - If true, grid's default context menu is used, otherwise provide the url to your context menu xslt here.
 * @param {function}                [args.customSave]                                      - Custom save function
 * @param {function}                [args.afterAddRow]                                     - Custom function(args) which is called after a row was added (args.rowNode, wrs row node which was added, args.headerMeta wrs header object)
 * @param {chainDef}                [args.saveChain]                                       - A chain definition which is used for the grid saving operation 
 * @param {Object}                  [args.saveParameters]                                  - Parameters for the saving chain
 * @param {chainDef}                [args.loadChain]                                       - A chain definition which is used for the grid loading operation 
 * @param {Object}                  [args.loadParameters]                                  - Parameters for the loading chain
 * @param {chainDef}                [args.validationChain]                                 - A chain definition which is used for the validation operation. basic wrs and reference validation is given by default
 * @param {Object}                  [args.validationParameters]                            - Parameters for the validation chain
 * @param {boolean}                 [args.allowNewRows=true]                               - Allows inserting new rows via default contextMenu or drag/paste 
 * @param {boolean}                 [args.columnFilters=false]                             - Enable basic column filter input fields
 * @param {integer}                 [args.maxHeight]                                       - Set a maximum vertical size in pixel (only used when no handsontable height is set)
 * @param {boolean}                 [args.isReadOnly=false]                                - Turn on viewer-only mode
 * @param {boolean}                 [args.topMode=false]                                   - Add/save/restore buttons appear at the top, pagination at bottom, insert row at top
 *  
*/
bcdui.component.grid.Grid = function(args)
{
  this.id = args.id || bcdui.factory.objectRegistry.generateTemporaryIdInScope("grid");
  bcdui.factory.objectRegistry.registerObject( this );
  this.targetHtml = bcdui.util._getTargetHtml(args, "grid_");

  this.config = args.config;
  if (! this.config) {
    this.config = args.inputModel ? (args.inputModel.config || new bcdui.core.StaticModel("<grid:GridConfiguration/>")) : new bcdui.core.SimpleModel( { url: "gridConfiguration.xml" } );
  }

  this.topMode = args.topMode || false;
  this.isReadOnly = args.isReadOnly || false;
  this.statusModel = args.statusModel = args.statusModel || bcdui.wkModels.guiStatusEstablished;
  this.htTargetHtmlId = this.targetHtml+"_ht";
  this.hotArgs = args.hotArgs;
  this.allowNewRows = !(args.allowNewRows === false || args.allowNewCells === false);
  if (this.isReadOnly)
    this.allowNewRows = false;

  this.rowDependencyRegEx = /\$grid\.([A-Za-z0-9_]+)/g;

  this.columnFilters = args.columnFilters || false;
  this.maxHeight = args.hotArgs && args.hotArgs.height ? undefined : args.maxHeight;
  this.columnSorting = true;

  // takeover set columnSorting
  if (this.hotArgs && typeof this.hotArgs.columnSorting != "undefined")
    this.columnSorting = this.hotArgs.columnSorting;

  var validationParameters = {
      source: new bcdui.core.ConstantDataProvider({id: this.id + "_afterChange_source", name: "source", value: ""})
    , changes: new bcdui.core.ConstantDataProvider({id: this.id + "_afterChange_changes", name: "changes", value: []})
  }
  var validationChain = [this._validateWrs.bind(this)];

  if (args.validationChain) {
    if (Array.isArray(args.validationChain))
      validationChain = validationChain.concat(args.validationChain);
    else
      validationChain.push(args.validationChain);
  }
  if (args.validationParameters)
    validationParameters = jQuery.extend(validationParameters, args.validationParameters);

  // If we do not have an explicit input model, we create our own here from the metadata
  if( ! args.inputModel ) {
    this.gridModel = new bcdui.component.grid.GridModel({
        id: this.id +"_bcdImpl_model"
      , config: args.config
      , statusModel: args.statusModel
      , saveChain: args.saveChain
      , saveParameters: args.saveParameters
      , loadChain: args.loadChain
      , loadParameters: args.loadParameters
      , validationChain: validationChain
      , validationParameters: validationParameters
    });
  }
  else {

    // use inputModel as gridModel and make it visible in validation chain
    this.gridModel = args.inputModel;
    validationParameters["bcdGridModel"] = args.inputModel;

    // update gridmodel's validation chain
    if (this.gridModel.validationChain) {
      if (Array.isArray(this.gridModel.validationChain))
        validationChain= validationChain.concat(this.gridModel.validationChain);
      else
        validationChain.push(this.gridModel.validationChain);
    }
    if (this.gridModel.validationParameters)
      validationParameters = jQuery.extend(validationParameters, this.gridModel.validationParameters);

    this.gridModel.validationResult = new bcdui.core.ModelWrapper({ chain: validationChain, inputModel: new bcdui.core.StaticModel("<wrs:ValidationResult xmlns:wrs=\"http://www.businesscode.de/schema/bcdui/wrs-1.0.0\"><wrs:Wrs><wrs:Header><wrs:Columns><wrs:C pos=\"1\" id=\"rowId\"/><wrs:C pos=\"2\" id=\"colId\"/><wrs:C pos=\"3\" id=\"errMsg\"/></wrs:Columns></wrs:Header><wrs:Data/></wrs:Wrs></wrs:ValidationResult>"), parameters: validationParameters});
  }

  // init custom callbacks for save and afterAddRow
  this.saveRoutine = args.customSave || this.save;
  this.customAfterAddRow = args.afterAddRow;
  this.afterAddRow = function(args) {

    // fill new cell with value if column is mandatory and the optionsmodel only got one value
    var nodes = args.rowNode.selectNodes("wrs:C");
    for (var n = 0; n < nodes.length; n++) {
      if (this.colsWithReferences.indexOf("" + (n + 1)) != -1) {
        var colId = this.wrsHeaderIdByPos["" + (n + 1)];
        if (this.wrsHeaderMeta[colId].nullable === "0") {
          var i = 0;
          var oneAndOnly = null;
          for (var e in this.optionsModelInfo[colId].codeCaptionMap) {
            oneAndOnly = e;
            if (i++ > 0) {
              oneAndOnly = null;
              break;
            }
          }
          if (oneAndOnly != null)
            nodes[n].text = oneAndOnly;
        }
      }
    }
    if (this.customAfterAddRow)
      this.customAfterAddRow(args);
  } 
    
    args.afterAddRow || function(args){};

  // modelupdater for wrs header changes like exchanging reference information 
  new bcdui.core.ModelUpdater({ targetModel: this.gridModel , chain: bcdui.contextPath+"/bcdui/js/component/grid/updateWrsHeader.xslt" , autoUpdate: false, parameters: {config: this.config} });

  // for singleSelect widget use via wrs:References, we need to have the id registered
  if (typeof bcdui.factory.objectRegistry.getObject(this.gridModel.id) == "undefined")
    bcdui.factory.objectRegistry.registerObject(this.gridModel);

  // Now we have a gridModel
  // Create enhancedConfiguration from user-provided configuration
  // since we want to take information from enhancedConfiguration, we need to make sure the renderer does not start until
  // we got the information. For this, we use a dp holder for the renderer. Its source is set as soon as we're done
  this.gridModelHolder = new bcdui.core.DataProviderHolder();
  this.enhancedConfiguration = new bcdui.core.ModelWrapper({
    inputModel: this.config,
    chain: [ bcdui.contextPath+"/bcdui/js/component/grid/configurationRenderer.xslt"],
    parameters: {gridModel: this.gridModel, statusModel: this.statusModel, gridModelId: this.gridModel.id }
  });

  // add onChange listener on enhancedConfiguration and collect optionsModel information
  this.getEnhancedConfiguration().onceReady(function(){

    // if gridModel got filter, we enable the deep key check and prebuild request xml
    this.enableDeepKeyCheck = this.gridModel.query("/*//wrq:WrsRequest//f:Filter//f:Expression") != null;
    var keyColumns = "";
    this.keyColumns = new Array();
    jQuery.makeArray(this.getEnhancedConfiguration().queryNodes("/*/grid:Columns/wrq:C[@isKey='true']/@id")).forEach(function(e) { keyColumns += "<C bRef='" + e.text + "'/>"; this.keyColumns.push(e.text) }.bind(this));
    var binding = this.gridModel.read("/*//wrq:WrsRequest//wrq:BindingSet", "");
    this.keyRequestPre = "<WrsRequest xmlns='http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0' xmlns:f='http://www.businesscode.de/schema/bcdui/filter-1.0.0'><Select><Columns>" + keyColumns + "</Columns><From><BindingSet>" + binding + "</BindingSet></From><f:Filter><f:Or>";
    this.keyRequestPost = "</f:Or></f:Filter><Grouping>" + keyColumns + "</Grouping></Select></WrsRequest>"

    // early init of wrsHeaderMeta since it's used by collect rowDependency Columns
    this.wrsHeaderMeta = bcdui.wrs.wrsUtil.generateWrsHeaderMeta(this.gridModel.getData());
    
    // validate GridModel against GridConfig (problems can only occur if you provide a gridModel yourself and an own config)
    var j = 1;
    jQuery.makeArray(this.getEnhancedConfiguration().queryNodes("/*/grid:Columns/wrq:C")).forEach(function(e) {
      if (this.gridModel.query("/*/wrs:Header/wrs:Columns/wrs:C[@pos='" + j++ + "' and @id='" + e.getAttribute("bRef") + "']") == null)
        throw new Error("GridConfiguration holds column which isn't in GridModel (or wrong position): " + this.id + " " + e.getAttribute("bRef"));
    }.bind(this));
    j = 1;
    jQuery.makeArray(this.gridModel.queryNodes("/*/wrs:Header/wrs:Columns/wrs:C")).forEach(function(e) {
      if (this.getEnhancedConfiguration().query("/*/grid:Columns/wrq:C[position()='" + j++ + "' and @bRef='" + e.getAttribute("id") + "']") == null)
        throw new Error("GridModel holds column which isn't in GridConfiguration (or wrong position): " + this.id + " " + e.getAttribute("id"));
    }.bind(this));

    this.getEnhancedConfiguration().onChange( { callback: function() {this.gridModel.execute(true);}.bind(this) } );
    this.hasReferences = this.getEnhancedConfiguration().queryNodes("/*/grid:Columns/wrq:C[grid:Editor/grid:Param[@name='optionsModelXPath']]").length > 0;

    this.optionsModelInfo = {};
    var optionsModels = new Array();

    this.colsWithReferences = new Array();
    this.colsWithReferencesInfo = new Array();
    var cNodes = this.getEnhancedConfiguration().queryNodes("/*/grid:Columns/wrq:C[grid:Editor/grid:Param[@name='optionsModelXPath']]");
    for (var i = 0; i < cNodes.length; i++) {

      var optionsModelXPath = cNodes[i].selectSingleNode("./grid:Editor/grid:Param[@name='optionsModelXPath']");
      optionsModelXPath = optionsModelXPath == null ? null : optionsModelXPath.getAttribute("value");
      var optionsModelRelativeValueXPath = cNodes[i].selectSingleNode("./grid:Editor/grid:Param[@name='optionsModelRelativeValueXPath']");
      optionsModelRelativeValueXPath = optionsModelRelativeValueXPath == null ? null : optionsModelRelativeValueXPath.getAttribute("value");

      if (optionsModelXPath != null) {

        // collect rowDependency Columns
        var dependendOnCols = [];
        var regEx = new RegExp(this.rowDependencyRegEx);
        var match = regEx.exec(optionsModelXPath);
        while (match != null) {
          var v = match[1];
          if (v != null) {
            var vc = parseInt(v.substring(1), 10);
            // either we reference an id
            if (typeof this.wrsHeaderMeta[v] != "undefined")
              dependendOnCols.push(this.getEnhancedConfiguration().read("/*/grid:Columns/wrq:C[position()='"+this.wrsHeaderMeta[v].pos+"']/@id", ""));
            // or an index (c1, c2,...)
            else if (v.length > 1 & v[0] == "c" && ! isNaN(vc))
              dependendOnCols.push(this.getEnhancedConfiguration().read("/*/grid:Columns/wrq:C[position()='"+vc+"']/@id", ""));
            else
              throw "illegal row dependency value " + this.id + " " + v;
          }
          match = regEx.exec(optionsModelXPath);
        }

        var testXPath = optionsModelXPath.substring(1).replace(this.rowDependencyRegEx, "");
        if (testXPath.indexOf("$") == -1) {
          var info = bcdui.factory._extractXPathAndModelId(optionsModelXPath);
          optionsModels.push(info.modelId);
          this.optionsModelInfo[cNodes[i].getAttribute("bRef")] = {
              optionsModelId: info.modelId
            , optionsModelXPath: info.xPath
            , optionsModelRelativeValueXPath: optionsModelRelativeValueXPath
            , codeCaptionMap : {}
            , captionCodeMap : {}
            , gotRowDependency: info.xPath.indexOf("$grid") != -1
            , isSuggestInput: cNodes[i].selectSingleNode("./grid:Editor[@type='bcduiSuggestInput']") != null
            , dependendOnCols: dependendOnCols.filter(function(e, idx){return dependendOnCols.indexOf(e) == idx})
            , referencedByCols: []
          }
  
          this.colsWithReferences.push(cNodes[i].getAttribute("pos"));
          this.colsWithReferencesInfo.push(cNodes[i].getAttribute("bRef"));
        }
      }
    }
    var dependendToReference = function(x) {
      this.optionsModelInfo[x].dependendOnCols.forEach(function(e) {
        if (this.optionsModelInfo[e].referencedByCols.indexOf(x) == -1) {
          var colIdx = parseInt(this.getEnhancedConfiguration().read("/*/grid:Columns/wrq:C[@id='"+x+"']/@pos", "0"), 10);
          if (this.colsWithReferences.indexOf("" + colIdx))
            this.optionsModelInfo[e].referencedByCols.push(colIdx);
        }
      }.bind(this));
    }.bind(this);

    // build referencedByCols from dependendOnCols
    for (var x in this.optionsModelInfo)
      dependendToReference(x);

    // attach validation modelwrapper listener to map errors
    if (this.gridModel.validationResult) {
      this.gridModel.validationResult.onReady({onlyFuture: true, onlyOnce: false, onSuccess: function() {

        var renderErrors = function() {
          this.errors = {};
          var gotOldErrors = this.gotErrors || 0;
          var errorEntries = this.gridModel.validationResult.queryNodes("/*/wrs:Wrs/wrs:Data/wrs:*[local-name()!='D']");
          // Collect the error cells in errors. Each row with an error has a errors property with an array for the error columns
          for (var e = 0; e < errorEntries.length; e++) {
            var errorCs = errorEntries[e].getElementsByTagName("*");
            var factor = (errorEntries[e].localName||errorEntries[e].baseName) === "M" ? 2 : 1;
            var rowId = errorCs[0].text;
            this.errors[rowId] = this.errors[rowId] || [];
            this.errors[rowId][this.hotInstance.propToCol(errorCs[factor].text)] = 1;
          }
          this.gotErrors = errorEntries.length > 0;

          // refresh table to show errors
          if (errorEntries.length > 0 || gotOldErrors != this.gotErrors)
            this.hotInstance.render(); 
        }.bind(this);

        // deepKeyCheck runs a request on the database looking if the keys do exist
        if (this.doDeepKeyCheck) {
          var filter = "";
          for (var deepKey in this.deepKeyCheckKeys) {
            filter += "<f:And>";
            var keyValues = deepKey.split(bcdui.core.magicChar.separator);
            for (var f = 0; f < keyValues.length; f++)
              filter += "<f:Expression " + (keyValues[f] == "" ? "" : "value='" + keyValues[f] + "'") + " op='=' bRef='" + this.keyColumns[f] + "'/>";
            filter += "</f:And>";
          }
          var keyCheckModel = new bcdui.core.SimpleModel({ url : new bcdui.core.RequestDocumentDataProvider({ requestModel: new bcdui.core.StaticModel(this.keyRequestPre + filter + this.keyRequestPost)}) });
          keyCheckModel.onceReady(function() {

            // get old modified or deleted keys so we can exclude them from the check
            var oldKeys = {};
            jQuery.makeArray(this.gridModel.queryNodes("/*/wrs:Data/wrs:M")).forEach(function(modRow) {
              var key = "";
              var oldNodes = modRow.selectNodes("wrs:O");
              for (var i = 0; i < oldNodes.length; i++)
                if (this.wrsValidateKeyColumnsPos.indexOf(i) != -1)
                  key += (key != "" ? bcdui.core.magicChar.separator + (oldNodes[i].text || "") : (oldNodes[i].text || ""));
              oldKeys[key] = 1;
            }.bind(this));
            jQuery.makeArray(this.gridModel.queryNodes("/*/wrs:Data/wrs:D")).forEach(function(modRow) {
              var key = "";
              var oldNodes = modRow.selectNodes("wrs:C");
              for (var i = 0; i < oldNodes.length; i++)
                if (this.wrsValidateKeyColumnsPos.indexOf(i) != -1)
                  key += (key != "" ? bcdui.core.magicChar.separator + (oldNodes[i].text || "") : (oldNodes[i].text || ""));
              oldKeys[key] = 1;
            }.bind(this));

            jQuery.makeArray(keyCheckModel.queryNodes("/*/wrs:Data/wrs:R")).forEach(function(row) {
              // let's rebuild the concatenated key
              var key = "";
              jQuery.makeArray(row.selectNodes("wrs:C")).forEach(function(column) {
                key += (key != "" ? bcdui.core.magicChar.separator + (column.text || "") : (column.text || ""));
              }.bind(this));
  
              // if found key is not part of the modfied (client) ones, add unique key constraint error
              if (!(oldKeys[key] == 1)) {
                // and mark the row (every key cell) as bad (in this.wrsErrors and in validationResult)
                var rowId = this.deepKeyCheckKeys[key];
                this.foundServerSidedKeys[key] = rowId;
                for (var k = 0; k < this.wrsValidateKeyColumns.length; k++) {
                  var col = this.wrsValidateKeyColumns[k];
                  this.wrsErrors[rowId] = this.wrsErrors[rowId] || []; this.wrsErrors[rowId][col] = this.wrsErrors[rowId][col] || [0];
                  this.wrsErrors[rowId][col] |= 128;
                  bcdui.core.createElementWithPrototype(this.gridModel.validationResult.getData(), "/*/wrs:Wrs/wrs:Data/wrs:R[wrs:C[1]='" + rowId + "' and wrs:C[2]='" + col + "' and wrs:C[3]='bcd_ValidUniq']");
                }
              }
            }.bind(this));

            // refresh grid to show errors
            renderErrors();
            
          }.bind(this));
          keyCheckModel.execute(true);
        }
        else
          renderErrors(); // refresh grid to show errors

        return;

      }.bind(this)});
    }

    // wait for optionsmodel readiness 
    optionsModels = optionsModels.filter(function(e, idx){return optionsModels.indexOf(e) == idx});
    bcdui.factory.objectRegistry.withReadyObjects(optionsModels, function() {

      // build up a code / caption map for faster access
      // actually it only makes sense if the optionsModel got a optionsModelRelativeValueXPath, otherwise the shown value IS the value which is written
      // the gridModel read operation is costy
      for (var m in this.optionsModelInfo) {
        var captionXPath = (this.optionsModelInfo[m].optionsModelXPath + (this.optionsModelInfo[m].optionsModelRelativeValueXPath != null ? ("[" + this.optionsModelInfo[m].optionsModelRelativeValueXPath) : "") + "[.='{{=it[0]}}']" + (this.optionsModelInfo[m].optionsModelRelativeValueXPath != null ? "]" : "")).replace(this.rowDependencyRegEx, "");
        var valueXPath = (this.optionsModelInfo[m].optionsModelXPath + (this.optionsModelInfo[m].optionsModelRelativeValueXPath != null ? "/" + this.optionsModelInfo[m].optionsModelRelativeValueXPath : "")).replace(this.rowDependencyRegEx, "");
        var optionRows = bcdui.factory.objectRegistry.getObject(this.optionsModelInfo[m].optionsModelId).queryNodes(valueXPath);
        for (var o = 0; o < optionRows.length; o++ ){
          var option = optionRows[o].nodeType == 3 ? optionRows[o].nodeValue : optionRows[o].text;
          var caption = this.optionsModelInfo[m].optionsModelRelativeValueXPath != null ? bcdui.factory.objectRegistry.getObject(this.optionsModelInfo[m].optionsModelId).read(captionXPath, [option]) : [option];
          this.optionsModelInfo[m].codeCaptionMap[bcdui.util.escapeHtml(option)] = caption;
          this.optionsModelInfo[m].captionCodeMap[bcdui.util.escapeHtml(caption)] = option;
        }
      }

      this.gridModelHolder.setSource(this.gridModel);

    }.bind(this));

    this._createHtmlStructure(args);

  }.bind(this));
  
  // Initialize out parent class, by calling the methods in the chain, we guarantee to dataProviders are ready
  // Grid rendering chain, any change on enhancedConfiguration will refresh input model and any change to that will re-render this grid
  bcdui.core.Renderer.call( this, {
      id: this.id,
      inputModel: this.gridModelHolder,
      targetHtml: this.targetHtml,
      parameters: { paramModel: this.getEnhancedConfiguration() },
      chain: [ this._prepareHtOptions.bind(this), this._renderData.bind(this) ]
    }
  );

  // show common buttons and pagination when rendering is done
  this.onceReady(function() {
    jQuery("#" + this.htTargetHtmlId).closest("table").find("thead").show();
    jQuery("#" + this.htTargetHtmlId).closest("table").find("tfoot").show();
  });

  // Listen on future changes
  this.gridModel.onceReady( function() {
    this.gridModel.onChange( this.execute.bind(this) );
  }.bind(this) );
};

bcdui.component.grid.Grid.prototype = Object.create( bcdui.core.Renderer.prototype,
/** @lends bcdui.component.grid.Grid.prototype */
{
  
  /**
   *  helper function for codeCaption mapping and rowDependencies
   * @return object
   * @private
   */
  _getRefValue: { writable: true, configurable: true, enumerable: true, value: function(references, rowId, lookUp) {
    var refValue = null;
    if (references.gotRowDependency) {
      var xPath = references.optionsModelXPath + (references.optionsModelRelativeValueXPath != null ? ("[" + references.optionsModelRelativeValueXPath) : "") + "[.='" + lookUp + "']" + (references.optionsModelRelativeValueXPath != null ? "]" : "");
      xPath = this._resolveRowDependency({rowId: rowId, xPath: xPath});
      refValue = bcdui.factory.objectRegistry.getObject(references.optionsModelId).read(xPath);
    }
    else
      refValue = references.codeCaptionMap[bcdui.util.escapeHtml(lookUp)];
    if (references.isSuggestInput && refValue == null)
      refValue = lookUp;  // suggestInput with a suggested value
    return refValue;
  }},

  /**
   * helper function for grid validation. Depending on the provided colInfo it checks what to check and does the type specific validation
   * @private
   */
  _validateCell: { writable: true, configurable: true, enumerable: true, value: function(rowId, colInfo, value) {
    var colId = colInfo.id;
    var cellError = 0;
    if ((!colInfo.isReadyOnly && !colInfo.isHidden) || colInfo.isKey) {
      var checkBits = colInfo.checkBits;

      // NUMBER CHECK
      if ((checkBits & 1) && value.replace(/[0-9\.\-]/g, "").length != 0)
        cellError |= 1;

      // INTEGER CHECK
      if ((checkBits & 2) && value.replace(/[0-9]/g, "").length != 0)
        cellError |= 2;

      // DISPLAY SIZE CHECK
      if ((checkBits & 4) && value.length > colInfo.displaySize && colInfo.displaySize != "")
        cellError |= 4;

      // NULLABLE CHECK
      if ((checkBits & 8) && value == "")
        cellError |= 8;

      // SCALE CHECK
      if ((checkBits & 16) && value.indexOf(".") != -1 && value.substring(value.indexOf(".")).length - 1 > colInfo.scale)
        cellError |= 16;

      // DATE CHECK (YYYY-MM-DD) and  TIMESTAMP CHECK (YYYY-MM-DDTHH:MM:SS or YYYY-MM-DD HH:MM:SS)
      if ((checkBits & 32 || checkBits & 64) && value != "") {
        var yr = parseInt(value.substring(0,4), 10);
        var mo = parseInt(value.substring(5,7), 10);
        var dy = parseInt(value.substring(8,10), 10);
        var err = false;
        if (isNaN(yr) || isNaN(mo) || isNaN(dy) || value.length != (checkBits & 64 ? 19 : 10) || value.substring(4,5) != "-" || value.substring(7,8) != "-" || dy < 1 || dy > 31 || mo < 1 || mo > 12) {
          err = true;
        }
        else if (mo == 2) {
          if (yr % 4 == 0 && (yr % 100 != 0 || yr % 400 == 0)) {
            if (dy > 29) {
              err = true;
            }
          }
          else if (dy > 28) {
            err = true;
          }
        }
        else if (mo < 8 && mo % 2 == 0 && dy > 30) {
          err = true;
        }
        else if (mo > 7 && mo % 2 == 1 && dy > 30) {
          err = true;
        }
        // and the hh:mm:ss checks
        if (checkBits & 64 && value != "") {
          var hh = parseInt(value.substring(11,13), 10);
          var mm = parseInt(value.substring(14,16), 10);
          var ss = parseInt(value.substring(17,19), 10);
          if (value.substring(13,14) != ":" || value.substring(16,17) != ":" || (!(value.substring(10,11) == " " || value.substring(10,11) == "T")) || hh < 0 || hh > 23 || mm < 0 || mm > 59 || ss < 0 || ss > 59) {
            err = true;
          }
        }
        if (err) {
          cellError |= (checkBits & 64 ? 64 : 32);
        }
      }
      if ((checkBits & 256)) {
        if (this._getRefValue(colInfo.references, rowId, value) == null) {
          cellError |= 256;
        }
      }
      if ((checkBits & 512)) {
        try {
          bcdui.util.xml.parseDocument(value);
        }
        catch (e) {
          cellError |= 512;
        }        
      }
    }
    // error for cell found, merge it into existing ones 
    if (cellError > 0) {
      this.wrsErrors[rowId] = this.wrsErrors[rowId] || [];
      this.wrsErrors[rowId][colId] = this.wrsErrors[rowId][colId] || [0];
      this.wrsErrors[rowId][colId] |= cellError;
    }
    // no error for cell found, replace current error with old one 
    else if (typeof this.wrsErrors[rowId] != "undefined" && this.wrsErrors[rowId][colId] > 0)
      this.wrsErrors[rowId][colId] = cellError;
  }},

  /**
   * wrs type/scale/nullabla/key/reference validator 
   * @private
   */
  _validateWrs: { writable: true, configurable: true, enumerable: true, value: function(doc, args) {

    // initially build up wrsValidateInfo etc and remember which columns needs which checks
    if (! this.wrsValidateInfo) {
      this.wrsValidateInfo = [];
      this.wrsValidateKeyColumns = [];
      this.wrsValidateKeyColumnsPos = [];
      this.wrsValidationErrorCodes = [
          "bcd_ValidTypeName_NUMERIC"
        , "bcd_ValidTypeName_INTEGER"
        , "bcd_ValidDisplaySize"
        , "bcd_ValidNullable"
        , "bcd_ValidScale"
        , "bcd_ValidTypeName_DATE"
        , "bcd_ValidTypeName_TIMESTAMP"
        , "bcd_ValidUniq"
        , "bcd_ValidReferences"
        , "bcd_ValidDocument"
      ];
      var headerNodes = this.getEnhancedConfiguration().queryNodes("/*/grid:Columns/wrq:C");
      for (var h = 0; h < headerNodes.length; h++) {
        var type       = headerNodes[h].getAttribute("type-name");
        var nullable   = headerNodes[h].getAttribute("nullable");
        var id         = headerNodes[h].getAttribute("id");
        var isKey      = (headerNodes[h].getAttribute("isKey") === "true");
        var pos        = parseInt(headerNodes[h].getAttribute("pos"), 10);
        var references = this.optionsModelInfo[id];
        var isDocument = (headerNodes[h].getAttribute("isDocument") === "true");

        var checkBits = 0;
        if ("DECIMAL|DOUBLE|FLOAT|NUMERIC|REAL".indexOf(type) != -1)          checkBits |= 1;   // is decimal
        if ("INTEGER".indexOf(type) != -1)                                    checkBits |= 2;   // is integer
        if ("VARCHAR|CHAR".indexOf(type) != -1)                               checkBits |= 4;   // displaySize
        if (nullable == "0")                                                  checkBits |= 8;   // nullable
        if ("DECIMAL|DOUBLE|FLOAT|NUMERIC|REAL".indexOf(type) != -1)          checkBits |= 16;  // scale
        if (type == "DATE")                                                   checkBits |= 32;  // date
        if (type == "TIMESTAMP")                                              checkBits |= 64;  // timestamp
        if (isKey) {
          this.wrsValidateKeyColumns.push(id);
          this.wrsValidateKeyColumnsPos.push(pos - 1);
                                                                              checkBits |= 128; // key unique
        }
        if (this.colsWithReferences.indexOf("" + pos) != -1)                  checkBits |= 256; // references
        if (isDocument)                                                       checkBits |= 512; // document

        // let's sort in via pos (even if it's pretty uncommon that a wrs header @pos doesn't use the physical order)
        this.wrsValidateInfo[pos - 1] = ({
          checkBits: checkBits
        , scale: headerNodes[h].getAttribute("scale")
        , displaySize: headerNodes[h].getAttribute("display-size")
        , id: id
        , isKey: isKey
        , isReadyOnly: this.isReadOnly || headerNodes[h].getAttribute("readOnly") === "true"
        , isHidden: headerNodes[h].getAttribute("isHidden") === "true"
        , references: references
        });
      }
    }

    // first validation queue step, kill the previous
    bcdui.core.removeXPath(doc, "/*/wrs:Wrs/wrs:Data");

    this.deepKeyCheckKeys = {};
    this.doDeepKeyCheck = false;
    this.wrsErrors = this.wrsErrors || {};
    var needKeyCheck = (args.source == "loadData" || args.changes.length == 0);
    var columns = [];

    // check if a key column was changed and collect affected columns
    if (args.changes.length > 0) {
      for (var ch = 0; ch < args.changes.length; ch++) {
        var change = args.changes[ch];
        if (this.wrsValidateKeyColumns.indexOf(change.colId) != -1) {
          needKeyCheck = true;  // a key column is actually affected
        }
        columns.push(change.colIdx - 1);
        // in case of row dependencies, check the linked cells, too
        if (this.optionsModelInfo[change.colId]) {
          for (var refc = 0; refc < this.optionsModelInfo[change.colId].referencedByCols.length; refc++) {
            columns.push(this.optionsModelInfo[change.colId].referencedByCols[refc] - 1);
          }
        }
      }
    }

    // add all key columns is a key check is needed (but only if we have a column sub selection, otherwise we check everything anyway)
    if (needKeyCheck && args.changes.length > 0)
      columns = columns.concat(this.wrsValidateKeyColumnsPos); // let's include all key columns

    // make them distinct and sort them
    columns = columns.filter(function(e, idx){return columns.indexOf(e) == idx}).sort();

    // no key cell changed, we only quickly check the cell
    if (! needKeyCheck) {
      for (var cha = 0; cha < args.changes.length; cha++) {
        var curChange = args.changes[cha];
        this._validateCell(curChange.rowId, this.wrsValidateInfo[curChange.colIdx - 1], curChange.newValue);
        // in case of row dependencies, check the linked cells, too
        if (this.optionsModelInfo[curChange.colId]) {
          for (var rc = 0; rc < this.optionsModelInfo[curChange.colId].referencedByCols.length; rc++) {
            var colIdx = this.optionsModelInfo[curChange.colId].referencedByCols[rc];
            var refValue = this.gridModel.read("/*/wrs:Data/wrs:*[@id='" + curChange.rowId + "']/wrs:C[position()='" + colIdx + "']", "");
            this._validateCell(curChange.rowId, this.wrsValidateInfo[colIdx - 1], refValue);
          }
        }
      }
    }
    // otherwise, we run over all rows
    else {
      var keys = {};
      var row = this.gridModel.query("/*/wrs:Data/wrs:*[1]");
      while (row) {

        // ensure we only run over element nodes  
        if (row.nodeType != 1) {
          row = row.nextSibling;
          continue;
        }

        var rowId = row.getAttribute("id");
        var rowElement = (row.localName||row.baseName);
        if (rowElement != "D") {
          var x = 0;
          var key = "";
          // we got single cell changes, only check these cells
          if (columns.length > 0) {
            // a paste with identical data would cause a change event but with no wrs:M data while a standard change does create a wrs:M, that's why we have to get the factor
            var factor = (rowElement == "M" ? 2 : 1);
            for (var c = 0; c < columns.length; c++) {
              var value = row.childNodes[columns[c] * factor].text || "";
              if (this.wrsValidateInfo[columns[c]].isKey)
                key += (key != "" ? bcdui.core.magicChar.separator + value : value);
              this._validateCell(rowId, this.wrsValidateInfo[columns[c]], value);
            }
          }
          else {
            // run over all cells
            for (var cn = 0; cn < row.childNodes.length; cn++) {
              var column = row.childNodes[cn];
              if ((column.localName||column.baseName) == "C") {
                var columnValue = column.text || "";
                // build Key
                if (this.wrsValidateInfo[x].isKey)
                  key += (key != "" ? bcdui.core.magicChar.separator + columnValue : columnValue);
                this._validateCell(rowId, this.wrsValidateInfo[x], columnValue);
                x++;
              }
            }
          }
          if (key != "") {
            var foundKey = keys[key];

            // Was there already a server match for this key?
            if (! foundKey && this.foundServerSidedKeys[key])
              foundKey = rowId;

            // new key found, remember it
            if (! foundKey) {
              keys[key] = rowId;

              // in case we do a deep (server sided) key lookup check, remember keys of changed/inserted rows
              if (rowElement != "R" && this.enableDeepKeyCheck) {
                
                // in case we have a client sided error (e.g. wrong dataformat, wrong size etc) in a key column
                // we don't add the value to the deepcheck (otherwise you'd run into sql type issues). User has to fix client sided errors first, then
                // the deepkey check may find another one
                var alreadyBad = false;
                for (var kk = 0; kk < this.wrsValidateKeyColumns.length; kk++) {
                  var co = this.wrsValidateKeyColumns[kk];  
                  if (typeof this.wrsErrors[rowId] != "undefined" && typeof this.wrsErrors[rowId][co] != "undefined" && this.wrsErrors[rowId][co] > 0) {
                    alreadyBad = true;
                    break;
                  }
                }
                if (! alreadyBad)
                  this.deepKeyCheckKeys[key] = rowId;
              }
            }
            // (client sided) key constraint, mark all key cells for found key row and current row
            else {
              // no need for a server lookup when we already have a client unique key constraint
              delete this.deepKeyCheckKeys[key];

              for (var k = 0; k < this.wrsValidateKeyColumns.length; k++) {
                var col = this.wrsValidateKeyColumns[k];
                this.wrsErrors[foundKey] = this.wrsErrors[foundKey] || []; this.wrsErrors[foundKey][col] = this.wrsErrors[foundKey][col] || [0];
                this.wrsErrors[foundKey][col] |= 128;
                this.wrsErrors[rowId] = this.wrsErrors[rowId] || []; this.wrsErrors[rowId][col] = this.wrsErrors[rowId][col] || [0];
                this.wrsErrors[rowId][col] |= 128;
              }
            }
          }
        }
        else {
          // we need to remove possible existing errors in the deleted row
          delete this.wrsErrors[rowId];
        }
        row = row.nextSibling;
      }
    }

    // finally create reference errors
    for (var rId in this.wrsErrors) {
      for (var cId in this.wrsErrors[rId]) {
        var ec = 0;
        for (var b = 1; b <= Math.pow(2,(this.wrsValidationErrorCodes.length - 1)); b *= 2 ) {
          if (this.wrsErrors[rId][cId] & b)
            bcdui.core.createElementWithPrototype(doc, "/*/wrs:Wrs/wrs:Data/wrs:R[wrs:C[1]='" + rId + "' and wrs:C[2]='" + cId + "' and wrs:C[3]='" + this.wrsValidationErrorCodes[ec] + "']");
          ec++;
        }
      }
    }

    // only need to do deep check if we have identified some keys
    this.doDeepKeyCheck = Object.entries(this.deepKeyCheckKeys).length > 0;

    return doc;
  }},

  /**
   * function which is put in front of a renderer which renders a cell with references
   * returns the caption instead of the code and adds an error in case the referenced value is not available
   * @return code from caption
   * @private
   */
  _renderByReference: { writable: true, configurable: true, enumerable: true, value: function(rowIdx, col, value) {
    rowIdx = this.hotInstance.toPhysicalRow(rowIdx);
    var row = this.hotInstance.getSourceDataAtRow(rowIdx);
    var refValue = null;
    if (row) {
      var colIdx = this.hotInstance.toPhysicalColumn(col);
      var colId = this.wrsHeaderIdByPos["" + (colIdx + 1)] || "";
      var references = this.optionsModelInfo[colId];
      if (references != null) {
        refValue = references.codeCaptionMap[bcdui.util.escapeHtml(value)];
        if (references.isSuggestInput && refValue == null)
          refValue = value;  // suggestInput with a suggested value
        else if (refValue == null)
          refValue = value;  // a drop down without optionsModelRelativeValueXPath
      }
    }
    return refValue;
  }},
  /**
   * function which is put in front of a renderer
   * @return object with colId, colIdx, rowId and the gridModel value at that position or null in case of not available
   * @private
   */
  _getGridModelValues: { writable: true, configurable: true, enumerable: true, value: function(rowIdx, col, value) {
    rowIdx = this.hotInstance.toPhysicalRow(rowIdx);
    var row = this.hotInstance.getSourceDataAtRow(rowIdx);
    if (row && row.r && this.gridModel) {
      var colIdx = this.hotInstance.toPhysicalColumn(col);
      var colId = this.wrsHeaderIdByPos["" + (colIdx + 1)] || "";
      var rowId = row.r.getAttribute("id");
      return {colId: colId, colIdx: colIdx + 1, rowId: rowId, value: this.gridModel.read("/*/wrs:Data/wrs:*[@id='" + rowId + "']/wrs:C[position()='"+(colIdx+1)+"']", "")};
    }
    return null;
  }},

  /**
   * transforms the wrs data into a js array which handsontable understands. Also prepares data types and formats.
   * @method
   * @return doc chain output document
   * @private
   */
  _prepareHtOptions: { writable: true, configurable: true, enumerable: true, value: function()
  {
    // domProperty() handles access from handsontable to Wrs
    function domProperty(instance, prop) {
      var colIdx = parseInt( instance.gridModel.query("/*/wrs:Header/wrs:Columns/wrs:C[@id='"+prop+"']").getAttribute("pos"), 10 ) -1;
      var ret = function (row, value) {
        if (! row ) return;
        var factor = (row.r.localName||row.r.baseName) === "M" ? 2 : 1;
        var c = row.c[colIdx*factor];
        var stringValue = "" + (value != null ? value : "");
        var lookUp = ( typeof value !== 'undefined' && stringValue != c.text ) ? stringValue : c.text;

        // we have a new value and it is a change, so we need to update the value in our data source
        if( typeof value !== 'undefined' && stringValue != c.text ) {

          var rowIdx = parseInt(instance.gridModel.queryNodes("/*/wrs:Data/*[@id='" + row.r.getAttribute("id") + "']/preceding-sibling::*").length, 10); 
          var colId = instance.wrsHeaderIdByPos["" + (colIdx + 1)] || "";
          var references = instance.optionsModelInfo[colId];

          // We do not fire() here because that would trigger a grid redisplay
          instance.gridModel.write("/*/wrs:Data/wrs:*[position()="+(rowIdx+1)+"]/wrs:C[position()="+(colIdx + 1)+"]", stringValue );

          // Update data of handsontable
          row.r = instance.gridModel.query("/*/wrs:Data/wrs:*[position()="+(rowIdx+1)+"]");
          row.c = jQuery.makeArray(row.r.getElementsByTagName("*")).filter(function(e){return (e.localName||e.baseName) != "null";})

          // the upper write might create a M, so redefine factor
          factor = (row.r.localName||row.r.baseName) === "M" ? 2 : 1;

          // caption/code handling, if optionsModelInformation is available, try to match the data
          if (references != null) {
            var refValue = null;
            refValue = references.captionCodeMap[bcdui.util.escapeHtml(lookUp)];
            if (references.isSuggestInput && refValue == null)
              refValue = lookUp;  // suggestInput with a suggested value
            else if (refValue == null)
              refValue = lookUp;  // a drop down without optionsModelRelativeValueXPath
            if (refValue != null)
              row.c[factor * colIdx].text = refValue;
          }
        }

        return lookUp;

      }.bind(this);

      // There seems to be a flaw in Handsontable when colHeader.data[] is a function
      // This is obviously returned in afterChange hook, so we transport some row-independent information here this way
      ret.prop   = prop;
      ret.colIdx = colIdx;
      return ret;
    }
    
    this.wrsHeaderMeta = bcdui.wrs.wrsUtil.generateWrsHeaderMeta(this.gridModel.getData());
    this.wrsHeaderIdByPos = {};
    jQuery.makeArray(this.gridModel.queryNodes("/*/wrs:Header/wrs:Columns/wrs:C")).forEach(function(e) {
      this.wrsHeaderIdByPos[e.getAttribute("pos")] = e.getAttribute("id");
    }.bind(this));

    this.htOptions = {};
    this.gotHiddenColumns = false;

    // As data, we provide an array of objects, each objects' property 'e' points to a row in our wrs
    // This way we can replace the wrs:R by a new wrs:D or wrs:M when necessary

    this._refreshDataCompletely();

    // Loop over wrs:Columns/wrs:C and create handsontable's column information
    this.htOptions.colHeaders = [];
    this.htOptions.columns = [];
    Array.prototype.forEach.call( this.getEnhancedConfiguration().queryNodes("/*/grid:Columns/wrq:C"), function(hc, idx) {
      // Create header captions
      var id      = hc.getAttribute("id") || "";
      var caption = hc.getAttribute("caption") || id;
      caption = caption.indexOf(bcdui.i18n.TAG) == 0 ? bcdui.i18n.syncTranslateFormatMessage({msgid:caption}) : caption;
      this.htOptions.colHeaders.push(
          hc.getAttribute("isHidden") == "true"
            ? "<div class='colHeader'></div>"
            : (this.columnFilters && hc.getAttribute("columnFilter") !== "false")
              ? ("<div class='bcdFilterContainer colHeader'><div class='bcdFilterOriginal'>" + caption + "</div><div class='bcdFilterButton' colId='"+id+"'></div></div>")
              : ("<div class='colHeader'>" + caption + "</div>")
      );

      // Create column type information
      var editor    = hc.selectSingleNode("grid:Editor/@type");
      var renderer  = hc.selectSingleNode("grid:Renderer/@type");
      var editorParameter =  jQuery.makeArray(hc.selectNodes("grid:Editor/grid:Param"));
      var rendererParameter = jQuery.makeArray(hc.selectNodes("grid:Renderer/grid:Param"));
      var format = null;
      var scale = parseInt( hc.getAttribute("scale"), 10 );
      if( isFinite(scale) ) {
        format = "0.";
        for( var f=0; f<scale; f++ )
          format += "0";
        // We append [0000] to format to show one more decimal places than allowed in case it is there to hint the user why the field is marked red
        format += "[0000]";
      }

      var typeName = "|" + hc.getAttribute("type-name") + "|";
      var type = "text";
      if ("|BIGINT|BIT|DECIMAL|DOUBLE|FLOAT|INTEGER|NUMERIC|REAL|SMALLINT|TINYINT|".indexOf(typeName) != -1)
        type = "numeric";
      if ("|DATE||".indexOf(typeName) != -1)
        type = "date";
      if ("|TIMESTAMP|TIME".indexOf(typeName) != -1)
        type = "time";

      var colHeader = {
          data:       domProperty(this, id)
        , type:       type
        , readOnly:   this.isReadOnly || hc.getAttribute("readOnly") == "true" || hc.getAttribute("isHidden") == "true" // hidden columns will be readonly to avoid copy/paste overwrites
        , format:     format
        , allowEmpty: hc.getAttribute("nullable") != "0" // nullable is an xs:Bit
        , rendererX:  renderer  ? (renderer.text != ""  ? renderer.text.split(".").reduce( function( fkt, f ) { return fkt[f] }, window ) : null) : null
        , editor:    editor    ? (editor.text != ""    ? editor.text.split(".").reduce( function( fkt, f ) { return fkt[f] }, window ) : null) : null
        , validator: null // we handle validation in afterChange hook
        , editorParameter: {}
        , rendererParameter: {}
        , isKey: hc.getAttribute("isKey") == "true"
        , isHidden: hc.getAttribute("isHidden") == "true"
      };

      // take over possible hotArgs column values
      if (this.hotArgs && this.hotArgs.columns && typeof this.hotArgs.columns[idx] != "undefined") {
        jQuery.extend(colHeader, this.hotArgs.columns[idx]);
      }

      this.gotHiddenColumns |= colHeader.isHidden;
      if (this.gotHiddenColumns && ! colHeader.isHidden)
        throw "isHidden columns must be defined at the end of the column list"; // ensure no copy/paste operations with not visible data

      // set zero width to hidden columns
      if (colHeader.isHidden)
        colHeader["width"] = "0px";
      // otherwise support an optional width attribute
      else if (hc.getAttribute("width") != null) {
        var w = parseInt(hc.getAttribute("width"), 10)
        if (! isNaN(w))
          colHeader["width"] = "" + w + "px";
      }

      // for cells with references, we encapsule the renderer with a reference getter function  
      if (renderer && renderer.selectSingleNode("..").getAttribute("gotReferences") === "true") {
        colHeader["renderer"] = function(instance, td, row, col, prop, value, cellProperties) {
          var newValue = this._renderByReference(row, col, value);
          var gridValues = this._getGridModelValues(row, col, value);
          return colHeader["rendererX"](instance, td, row, col, prop, newValue, cellProperties, gridValues);
        }.bind(this);
      }
      // for custom renderers, we also add the gridValues helper
      else if (renderer) {
        colHeader["renderer"] = function(instance, td, row, col, prop, value, cellProperties) {
          var gridValues = this._getGridModelValues(row, col, value);
          return colHeader["rendererX"](instance, td, row, col, prop, value, cellProperties, gridValues);
        }.bind(this);
      }
      else
        colHeader["renderer"] = colHeader["rendererX"];

      // hidden cells get a dummy renderer
      if (colHeader.isHidden)
        colHeader["renderer"] = function(instance, td, row, col, prop, value, cellProperties) { td.innerHTML = ""; return td; };

      // set editor/renderer parameters
      editorParameter.forEach(function(e) {colHeader.editorParameter[e.getAttribute("name")] = e.getAttribute("value");});
      rendererParameter.forEach(function(e) {colHeader.rendererParameter[e.getAttribute("name")] = e.getAttribute("value");});

      this.htOptions.columns.push( colHeader );

    }.bind(this) );

    // remove hotArgs.columns since we already used them to extend our columns
    if (this.hotArgs && this.hotArgs.columns)
      delete this.hotArgs.columns;

  }},
  
  /**
   * rebuild grid data (filtered and/or paginated ... or plain)
   * @private
   */
  _refreshDataCompletely: { writable: true, configurable: true, enumerable: true, value: function(doc, args) {

    // reset remembered width since new data means new width calculation, so we don't want to reuse stored values (for visible columns only though) 
    for (var x in this.storedWidths) {
      if (this.hiddenColumns.indexOf(parseInt(this.wrsHeaderMeta[x].pos, 10) - 1) == -1)
        this.storedWidths[x] = -1;
    }

    if (! this.htOptions.data)
      this.htOptions.data = [];
    else
      this.htOptions.data.splice(0, this.htOptions.data.length);  // splice to trigger hot's object listener, do not set it to []!

    var gotPagination = this.getEnhancedConfiguration().query("//xp:Paginate") != null;
    var curPage = parseInt(this.pager.read("//xp:Paginate/xp:PageNumber", "-1"), 10);
    curPage = isNaN(curPage) ? -1 : curPage;
    var pageSize = parseInt(this.getEnhancedConfiguration().read("//xp:Paginate/xp:PageSize", "-1"), 10);
    var wrsStart = ((curPage - 1) * pageSize) + 1;
    var wrsStop = wrsStart + pageSize - 1; 
    var xPath = (gotPagination && curPage != -1 && pageSize != -1) ? "[position() >= " + wrsStart + " and position() <= " + wrsStop + "]" : "";
    var index = 0;
    this.rowIdMap = {};
    Array.prototype.forEach.call( this.gridModel.queryNodes("/*/wrs:Data/wrs:*[not(@filtered)]" + xPath), function(e){
      this.htOptions.data.push({ r: e, c: jQuery.makeArray(e.getElementsByTagName("*")).filter(function(e){return (e.localName||e.baseName) != "null";}) })
      this.rowIdMap[e.getAttribute("id")] = index++;
    }.bind(this));
  }},

  /**
   * A transformator to render grid via handsontable call
   * @method
   * @param doc chain input document
   * @param args The parameter map contains the following properties:
   * @param {string} args.bcdInputModelId - The id of the grid input model
   * @return doc chain output document
   * @private
   */
  _renderData: { writable: true, configurable: true, enumerable: true, value: function(doc, args) {
    
    /**
     * handle drawing of grouped Headers, collapsed headers and headerCss styling
     * @param isForced
     * @private
     */

    function codeToCaption(data, coords) {
      if (data.length > 0) {
        coords.forEach(function(e){
          var realEndRow = e.startRow + data.length;
          var realEndCol= e.startCol + data[0].length;
          var yy = 0;
          for (var y = e.startRow; y < realEndRow; y++) {
            var xx = 0;
            for (var x = e.startCol; x < realEndCol; x++) {
              var colId = this.wrsHeaderIdByPos["" + (x + 1)] || "";
              if (colId != "") {
                var references = this.optionsModelInfo[colId];
                if (references != null) {
                  var refValue = "";
                  var value = data[yy][xx];
                  refValue = references.codeCaptionMap[bcdui.util.escapeHtml(value)];
                  if (references.isSuggestInput && refValue == null)
                    refValue = value;  // suggestInput with a suggested value
                  else if (refValue == null)
                    refValue = value;  // a drop down without optionsModelRelativeValueXPath
                  data[yy][xx] = refValue;
                }
              }
              xx++;
            }
            yy++;
          }
        }.bind(this));
      }
    }

    function captionToCode(data, coords) {
      if (data.length > 0) {
        coords.forEach(function(e){
          var realEndRow = e.startRow + data.length;
          var realEndCol= e.startCol + data[0].length;
          var yy = 0;
          for (var y = e.startRow; y < realEndRow; y++) {
            var xx = 0;
            for (var x = e.startCol; x < realEndCol; x++) {
              data[yy][xx] = data[yy][xx].replace(/\r?\n|\r/g, ""); // kill possible line feeds (e.g. when copy/pasting from text editor)
              var colId = this.wrsHeaderIdByPos["" + (x + 1)] || "";
              if (colId != "") {
                var references = this.optionsModelInfo[colId];
                if (references != null) {
                  var refValue = "";
                  var value = data[yy][xx];
                  refValue = references.captionCodeMap[bcdui.util.escapeHtml(value)];
                  if (references.isSuggestInput && refValue == null)
                    refValue = value;  // suggestInput with a suggested value
                  else if (refValue == null)
                    refValue = value;  // a drop down without optionsModelRelativeValueXPath
                  data[yy][xx] = refValue;
                }
              }
              xx++;
            }
            yy++;
          }
        }.bind(this));
      }
    }

    function beforeCopy(data, coords) {
      var fkt = codeToCaption.bind(this, data, coords);
      fkt();
    }

    function beforeCut(data, coords) {
      var fkt = codeToCaption.bind(this, data, coords);
      fkt();
    }

    function afterPaste(data, coords) {
      this.paste = false;
      this.pastedRows.forEach(function(e) {
        this.afterAddRow({rowNode:e, headerMeta: this.wrsHeaderMeta});
      }.bind(this));
    }
    
    function beforePaste(data, coords) {
      this.pastedRows = [];
      this.paste = true;
      var fkt = captionToCode.bind(this, data, coords);
      fkt();
    }
    
    function afterColumnResize(currentColumn, newSize, isDoubleClick) {}

    function afterRender(isForced) {

      // add bcdRowIdents (needs to get updated due to column sorting)
      var offsetRow = this._getRenderedRowRange().start;
      jQuery("#" + this.htTargetHtmlId +" .ht_master").find("tbody tr").each(function(index, value) {
        var rowIdx = this.hotInstance.toPhysicalRow(offsetRow + index);
        var row = this.hotInstance.getSourceDataAtRow(rowIdx);
        if (row)
          jQuery(value).attr("bcdRowIdent", row.r.getAttribute("id"));
      }.bind(this));

      if (this.columnFilters) {

        var targetModelXPath = "/*/guiStatus:ClientSettings/guiStatus:ColumnFilters[@id='" + this.getPrimaryModel().id +"']";

        // set filter class/title according to condition
        jQuery("#" + this.htTargetHtmlId +" .ht_clone_top").find(".bcdFilterButton").each(function(i,e) {
          var id = jQuery(e).attr("colId");
          if (bcdui.wkModels.guiStatus.query(targetModelXPath + "/f:Or[@id='"+id+"']/f:Expression") != null)
            jQuery(e).addClass("active");
        });

        // inject filter handling (listeners, tooltips, etc...only needed to be done once)
        if (! this.columnFiltersOnce) {
          this.columnFiltersOnce = true;
          
          bcdui.widget.createTableHeadFilter({
            tableElement: jQuery("#" + this.htTargetHtmlId +" .ht_clone_top").find("table").get(0)
          , inputModel: this.getPrimaryModel()
          , targetModelXPath: targetModelXPath
          , useCustomHeaderRenderer: true
          , getFilteredValues: function(colIdx) { return jQuery.makeArray(this.gridModel.queryNodes("/*/wrs:Data/wrs:*[not(@filtered)]/wrs:C[" + colIdx + "]"));}.bind(this)
          , getCaptionForColumnValue: function(index, value) {
              var x = this.colsWithReferences.indexOf("" + index);
              return (x != -1 ? this.optionsModelInfo[this.colsWithReferencesInfo[x]].codeCaptionMap[bcdui.util.escapeHtml(value)] || value : value);
            }.bind(this)
          , callback: function() {
  
              // build array of columns which got a filter
              var colsWithFilter = jQuery.makeArray(bcdui.wkModels.guiStatus.queryNodes(targetModelXPath + "/f:Or[f:Expression]/@id")).map(function(e) {
                return this.wrsHeaderMeta[e.text].pos;
              }.bind(this));
  
              // mark filtered cells 
              jQuery.makeArray(this.gridModel.queryNodes("/*/wrs:Data/wrs:*")).forEach(function(e) {
                var factor = (e.localName||e.baseName) === "M" ? 2 : 1;
                e.removeAttribute("filtered");
                var wrsC = jQuery.makeArray(e.getElementsByTagName("*")).filter(function(e){return (e.localName||e.baseName) != "null";});
                for (var i = 0; i < (wrsC.length / factor); i++) {
                  if (colsWithFilter.indexOf("" + (i+1)) != -1) {
                    var bRef = this.wrsHeaderIdByPos["" + (i + 1)] || "";
                    var value = (wrsC[i * factor].text);
                    if (value == "")
                      value = bcdui.core.magicChar.dimEmpty;
                    if (bcdui.wkModels.guiStatus.query(targetModelXPath + "/f:Or[@id='"+bRef+"']/f:Expression[@value='{{=it[0]}}']",[value]) == null) {
                      e.setAttribute("filtered", "true");
                      break;
                    }
                  }
                }
              }.bind(this));

              // reset to page 1 in case of pagination
              if (this.getEnhancedConfiguration().query("//xp:Paginate") != null) {
                var page = this.pager.read("/*/xp:Paginate/xp:PageNumber", "1");
                if (page != "1")
                  this.pager.write("/*/xp:Paginate/xp:PageNumber", "1", true);   // also triggers full validation
                else {
                  this.pager.execute(true);  // also triggers full validation
                }
              }
              else {
                this._refreshDataCompletely();
                this.hotInstance.render();
                this.afterChange([], "edit"); // trigger full validation
              }
            }.bind(this)
          });
        }
      }

      if (this.hasHeaderGroups || this.hotInstance.headerCss || this.gotHiddenColumns) {
        var offset = this._getRenderedColumnsRange().start;
        jQuery(this.hotInstance.rootElement).find("thead").each(function(index, value) {
          var isMasterOrTopClone = (jQuery(value).closest(".ht_master").length > 0 || jQuery(value).closest(".ht_clone_top").length > 0);
         if (isMasterOrTopClone && this.hotInstance.headerCss) {
            var x = 0;
            jQuery(value).find("tr").last().find("th").each(function(i, v) {
              if (jQuery(v).find("span.cornerHeader").length == 0)
                jQuery(v).addClass(this.hotInstance.headerCss[x++ + offset]);
            }.bind(this));
          }

         // virtual horizontal rendering might cut off a colspan column, so we need to fix it
         // for each invisible bcdColSpan attribute, we check if there is a colspan left of it, if not it was removed and we
         // make the cell visible, take over the class from the colspan cell and add the remaining colspan value.
         // finally we take over the caption from the cut off colspan cell just for some better visual representation
         if (this.hasHeaderGroups) { 
            jQuery(value).find("tr").each(function(i,y){
              var first = false;
              var ths = jQuery(y).find("th");
              ths.each(function(j,x){
                if (! jQuery(x).is(":visible") && jQuery(x).hasClass("bcdColSpan")) {
                  if (jQuery(y).find("th:nth-child(-n + " + jQuery(x).index() + ")").filter("th[colspan]").length == 0) {
                    if (! first) {
                      jQuery(x).show();
                      jQuery(x).addClass(jQuery(x).attr("csClass"));
                      jQuery(x).attr("colspan", parseInt(jQuery(x).attr("rcs") || "1", 10));
                      jQuery(x).attr("oc", parseInt(jQuery(x).attr("rcs") || "1", 10));
                      jQuery(x).find(".colHeader").text(jQuery(x).attr("caption"));
                    }
                    first = true;
                  }
                }
                else
                  first = false;

                // also virtual horizontal rendering might cut off the very right part (so instead of n columns just n-1 are rendered since
                // handsontable decided that parts might not fit) so we need to adjust possible colspans which go beyond this area
                var colspan = parseInt((jQuery(x).attr("colspan") || "1"), 10);
                if (colspan > 1) {
                  if (ths.length < jQuery(x).index() + colspan) {
                    jQuery(x).attr("colspan", ths.length - jQuery(x).index());
                    jQuery(x).attr("oc", ths.length - jQuery(x).index());
                  }
                } 
              });
            })
          }
        }.bind(this));

        // handle hidden/collapsed columns initially
        if (this.initiallyCollapsedOrHidden || (this.hiddenColumns && this.hiddenColumns.length > 0)) {
          delete this.initiallyCollapsedOrHidden;
          this._handleCollapsedHeader();
        }
      }

      // in case maxHeight is used, we check if we need to set or reset the height
      // this needs to be in a timeout to avoid rendering issues in handsontable
      if (this.maxHeight) {
        var h = 0;
        jQuery("#" + this.htTargetHtmlId + " .ht_master tr").each(function(i,e){ h += jQuery(e).outerHeight(); })
        if (h >= this.maxHeight && ! this.maxHeightReached) {
          this.maxHeightReached = true;
          setTimeout(function() {
            this.hotInstance.updateSettings({height: this.maxHeight});
          }.bind(this));
        }
        if (h < this.maxHeight && this.maxHeightReached) {
          this.maxHeightReached = false;
          setTimeout(function() {
            jQuery("#" + this.htTargetHtmlId + " .ht_master .wtHolder").get(0).style.height = ""; // seems to be a handsontable problem, it should remove the set height from the holder, too
            this.hotInstance.updateSettings({height: null});
          }.bind(this));
        }
      }
    }

    /**
     * set hotInstance member, build up headerCss and prepare grouped headers
     * @param isForced
     * @private
     */
    function beforeRender(isForced) {

			// not using afterInit here to setup hotInstance etc because it is actually fired AFTER beforeRender
			// so we use this hook, keep in mind that a gridModel refresh triggers an execute of the grid renderer
      // and this will change the hotInstance, so we need to refresh it
      // depending on the used column width settings, afterGetColHeader might be called even earlier

      // remember handsontable instance for later use
      this.hotInstance = jQuery("#" + this.htTargetHtmlId).handsontable("getInstance");
      this.hotInstance.getBCDUIGrid = function() { return this; }.bind(this);

      // support C element classes
      var headerColumns = jQuery.makeArray(this.getEnhancedConfiguration().queryNodes("/*/grid:Columns/wrq:C"));
      if (headerColumns.length > 0) {
        this.hotInstance.headerCss = new Array();
        for (var i = 0; i < headerColumns.length; i++) {
          var e = headerColumns[i];
          var cssClass = "";
          if (e.getAttribute("isKey") === "true") {
            cssClass += " bcdKey";
          }
          if (e.getAttribute("readOnly") === "true") {
            cssClass += " bcdReadOnly";
          }
          var c = e.getAttribute("class") || "";
          c = c != "" ? " " + c : "";
          this.hotInstance.headerCss.push(cssClass + c);
        }
      }

      if (this.hasHeaderGroups || this.gotHiddenColumns) {

        var self = this;

        // overwrite handsontable function: only provide column width drag on last THEAD TR to prevent dragging on upper grouped headers
        if (this.hotInstance.getSettings().manualColumnResize && this.hotInstance.getPlugin("ManualColumnResize")) {
          this.hotInstance.getPlugin("ManualColumnResize").onMouseOver = function(event) {
            if (this.checkIfColumnHeader(event.target)) {
              var th = this.getTHFromTargetElement(event.target);
              if (!th || ! (jQuery(th).parent().index() == jQuery(th).closest("THEAD").find("TR").length - 1)) { // only allow last TR
                return;
              }

              var colspan = th.getAttribute('colspan');

              if ((colspan === null || colspan === 1)) {
                if (!this.pressed) {
                  this.setupHandlePosition(th);
                }
              }
            }
          }.bind(this.hotInstance.getPlugin("ManualColumnResize"));
        }

        // overwrite handsontable sumCellSizes to skip hidden columns (i.e. hidden columns give a 0 width amount)
        [ this.hotInstance.view.wt.wtOverlays.leftOverlay
        ].forEach(function(e){ e.sumCellSizes = function(from, to) {
          var defaultColumnWidth = this.wot.wtSettings.defaultColumnWidth;
          var column = from;
          var sum = 0;

          while (column < to) {
            if (! (self.hiddenColumns && self.hiddenColumns.indexOf(column) != -1)) {
              sum += this.wot.wtTable.getStretchedColumnWidth(column) || defaultColumnWidth;
            }
            column += 1;
          }

          return sum;
        }.bind(e) });

        // overwrite handsontable getSetting for main table and top/left overlay clone to return an array with functions for header row creation
        [ this.hotInstance.view.wt.wtOverlays.leftOverlay.clone.wtTable.wot
        , this.hotInstance.view.wt.wtOverlays.topOverlay.clone.wtTable.wot
        , this.hotInstance.view.wt.wtTable.wot
        ].forEach(function(e){ e.getSetting = function(key, param1, param2, param3, param4) {
          var v = this.wtSettings.getSetting(key, param1, param2, param3, param4);
          if (key != "columnHeaders")
            return v;

          // custom columnHeaders
          var newHead = [];
          if (self.filledGroupedHeader) {
            self.filledGroupedHeader.forEach(function(e){
              newHead.push(function(column, TH) {
                // when rendering rowheader, remove possible existing col/rowspan (which might happen due to virtual scrolling)
                if (column == -1) {
                  jQuery(TH).removeAttr("colspan");
                  jQuery(TH).removeAttr("rowspan");
                  jQuery(TH).empty().append("<div class='relative'><span class='colHeader cornerHeader'>&nbsp;</span></div>");
                  jQuery(TH).attr("bcdColIdent", ""); // just for styling purposes to access real row columns via th[bcdColIdent=''] since afterGetColHeader sets an empty one for rowcolumns, too
                  return;
                }
                // replace TH with the one from pre-constructed matrix
                var el = jQuery(e[column]);
                if (el.length > 0) {
                  jQuery(TH).replaceWith(el);
                }
              }.bind(self));
            });
          }
          newHead.push(v[0]); // add original header row
          return newHead;
        }.bind(e) });

        // overwrite handsontable getColumnHeader for main table and top overlay clone to return the last tr in case no level is given
        // used for clicking header cells
        [ this.hotInstance.view.wt.wtOverlays.topOverlay.clone.wtTable
        , this.hotInstance.view.wt.wtTable
        ].forEach(function(e) {
          e.getColumnHeader = function(col) {
            var level = null;
            if (arguments.length > 1 && arguments[1] !== undefined)
              level = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
            var TR = level != null ? this.THEAD.childNodes[level] : this.THEAD.lastChild;
            if (TR)
              return TR.childNodes[this.columnFilter.sourceColumnToVisibleRowHeadedColumn(col)];
          }.bind(e)
        });

        // overwrite handsontable getColumnWidth for main table and top overlay clone to return a real 0 value for hidden columns and not the default column width value
        [ this.hotInstance.view.wt.wtOverlays.topOverlay.clone.wtTable
          , this.hotInstance.view.wt.wtTable
          ].forEach(function(e) {
            e.getColumnWidth = function(sourceColumn) {
              var width = this.wot.wtSettings.settings.columnWidth;

              if (typeof width === 'function') {
                width = width(sourceColumn);
              } else if ((typeof width === 'undefined' ? 'undefined' : _typeof(width)) === 'object') {
                width = width[sourceColumn];
              }

              if (typeof width != "undefined")
                return width;
              else
                return this.wot.wtSettings.settings.defaultColumnWidth;

            }.bind(e)
          });
      }
    }


    /**
     * Marks modified and invalid cells
     * @param td
     * @param rowIdx
     * @param colIdx
     * @param souproprce
     * @param value
     * @param cellProperties
     * @private
     */
    function afterRenderer(td, rowIdx, colIdx, prop, value, cellProperties) {
      rowIdx = this.hotInstance.toPhysicalRow(rowIdx);
      var row = this.hotInstance.getSourceDataAtRow(rowIdx);
      if (row) {
        colIdx = this.hotInstance.toPhysicalColumn(colIdx);
        // Mark deleted, invalid, modified and inserted cells. This is else-if to set a prio on marking.
        if( (row.r.localName||row.r.baseName) == "D" ) {
          td.classList.add("bcdDeleted");
        } else if( this.errors && this.errors[row.r.getAttribute("id")] && this.errors[row.r.getAttribute("id")][colIdx] == 1 ) {
          td.classList.add("bcdInvalid");
        } else if( (row.r.localName||row.r.baseName) == "M" ) {
          var colIdxCo = colIdx * 2; // wrs:C and wrs:O column pairs
          var wrsC = row.c[colIdxCo];
          var wrsO = row.c[colIdxCo+1];
          if( wrsC.text != wrsO.text )
            td.classList.add("bcdModified");
        } else if( (row.r.localName||row.r.baseName) == "I" ) {
          td.classList.add("bcdInserted");
        }
        cellProperties.instance.headerCss[colIdx].split(" ").forEach(function(e) {if (e != '') td.classList.add(e);});

        if (this.scrollToBottom) {
          delete this.scrollToBottom;
          setTimeout(function(){this.hotInstance.scrollViewportTo(this.hotInstance.countRows() - 1, 0, true, false);}.bind(this));
        }
      }
    }


    /**
     * After a set of changes, we update the row-has-errors array errors here
     * errors is later also used for marking invalid cells on redisplay
     * errors is an array filed where each field represents the colIdx. If it is 1, the col has an error
     * @param changes
     * @param source
     * @private
    */
    function afterChange(changes, source) {
      
      // init hotInstance in case it is not yet present (e.g. not calling beforeRendering because table is hidden)
      this.hotInstance = this.hotInstance || jQuery("#" + this.htTargetHtmlId).handsontable("getInstance");

      // this is triggered during scrolling and we don't trigger the validation in this case
      if (source === "ObserveChanges.change")
        return;

      // Run the validation, will then trigger refresh above (usually source is "loadData" and "edit")
      // ObserveChanges.change seems to be triggered additionally after an edit, so we skip it to avoid double validation
      if (this.gridModel.validationResult) {
        // provide source and changes information to validation chain
        bcdui.factory.objectRegistry.getObject(this.id + "_afterChange_source").value = source || "";

        var normalizedChanges = [];
        (changes || []).forEach(function([row, prop, oldValue, newValue]) {
          var dataRow = this.hotInstance.getSourceDataAtRow(row);
          if (dataRow != null) {
            var rowIdx = this.hotInstance.toPhysicalRow(row) + 1;
            var rowId = dataRow.r.getAttribute("id");
            var colIdx = this.hotInstance.toPhysicalColumn(prop.colIdx) + 1;
            var colId = this.wrsHeaderIdByPos["" + colIdx] || "";

            // take only valid colIds (i.e. NOT data pasted over borders)
            if (colId != "") {
              normalizedChanges.push({rowIdx: rowIdx, colIdx: colIdx, colId: colId, rowId: rowId, newValue: typeof newValue != "undefined" ? ("" + newValue) : ""}); // ensure new value being a string
            }
          }
        }.bind(this));
        bcdui.factory.objectRegistry.getObject(this.id + "_afterChange_changes").value = normalizedChanges;

        this.gridModel.validationResult.execute();
      }
    }
    
    /**
     * Attach bcdColIdent to column TH element
     * @param col
     * @param th
     * @private
    */
    function afterGetColHeader(col, th) {
      this.hotInstance = jQuery("#" + this.htTargetHtmlId).handsontable("getInstance");
      var colIdx = this.hotInstance.toPhysicalColumn(col) + 1;
      jQuery(th).attr("bcdColIdent", this.wrsHeaderIdByPos["" + colIdx] || "");

      // optionally hide header
      if (this.hideColHeaders)
        jQuery(th).closest("tr").hide();
    }

    /**
     * when using grouped headers, we want to mark the full spanned rows as selected
     * also stopImmediatePropagation to avoid sideeffects with handsontable's click handling
     * @param event
     * @param coords
     * @param TD
     * @private
    */
    function beforeOnCellMouseDown(event, coords, TD) {
      if (jQuery(event.target).hasClass("bcdFilterButton"))
        event.stopImmediatePropagation();
      else if (jQuery(event.target).hasClass("bcdGroupAction")) {
        this.hotInstance.deselectCell();
        event.stopImmediatePropagation();
      }
      else {
        var span = parseInt(TD.getAttribute("oc") || "1", 10);
        if (span > 1) {
          this.hotInstance.selectCell(0, coords.col, this.hotInstance.countRows() - 1, coords.col + span - 1, false);
          event.stopImmediatePropagation();
        }
      }
    }
    
    /**
     * hot wants to add a new row (e.g. via drag or copy/paste)
     * even for a multiple row containing copy/paste, it seems that this function is called
     * n times with amount = 1
     * @param index
     * @param amount
     * @private
    */
    function afterCreateRow(index, amount) { 
      var rowIdx = this.hotInstance.toPhysicalRow(index);
      var row = this.hotInstance.getSourceDataAtRow(rowIdx);
      if (row) {
        var nextRow = this.gridModel.queryNodes("/*/wrs:Data/wrs:*").length + 1;
        for (var i = 0; i < amount; i++) {
          // if hot added an incomplete data source element for the new row, we need to fix it by adding wrs:I/C on our own
          // in case of pasting it seems that afterCreateRow is called an additional time on the same row so we need to assure to skip this 
          if (typeof row.r === "undefined" || typeof row.r.nodeTyoe === "undefined") {
            row.r = bcdui.core.createElementWithPrototype(this.gridModel.getData(), "/*/wrs:Data/wrs:I[@id='I_" + (nextRow + i) + "']");

            // we clean the inserted C elements for alignment since createElementWithPrototype might have set the first referenced item (insertRow.xslt does not do this with setDefaultValue=false)
            var e = bcdui.core.createElementWithPrototype(row.r, "./wrs:C[" + this.gridModel.queryNodes("/*/wrs:Header/wrs:Columns/wrs:C").length +"]");
            jQuery.makeArray(e.parentNode.selectNodes("./wrs:C")).forEach(function(e) {
              e.text = "";
              bcdui.core.browserCompatibility.appendElementWithPrefix(e, "wrs:null");
            });

            // in case of a paste operation, we remmeber the rows for later callback use
            if (this.paste)
              this.pastedRows.push(row.r);
            else
              this.afterAddRow({rowNode:row.r, headerMeta: this.wrsHeaderMeta});

            // We use getElementsByTagName here for IE performance, but as it works recursively, we need to clean it afterwards
            row.c = jQuery.makeArray(row.r.getElementsByTagName("*")).filter(function(e){return (e.localName||e.baseName) === "C" || (e.localName||e.baseName) === "O";})
          }
        }
        if (amount > 0) {
          // rebuild rowIdMap when new rows were inserted
          var x = 0;
          this.rowIdMap = {};
          this.htOptions.data.forEach(function(e){ this.rowIdMap[e.r.getAttribute("id")] = x++; }.bind(this));
          this.afterChange([], "edit");  // trigger full validation
        }
      }
    }

    /**
     * propToCol of hot seems to be broken if colHeader.data is a function as in our case. It will then always return the prop's name
     * Here we overwrite and fix propToCol
     * @param columns
     * @private
     */
    function _propToColFactory( columns ) {
      var propArrayClosure = columns.map( function( value ) { return value.data.prop } );
      return function _propToCol( prop ) {
        return propArrayClosure.indexOf(prop);
      }
    }

    if (this.paginationRenderer)
      this.paginationRenderer.execute();

    // Create Handsontable
    jQuery("#"+this.htTargetHtmlId).replaceWith("<div id='"+this.htTargetHtmlId+"'><div>");
    
    // build grouped and collapsable headers (when available)
    var hasRowHeader = (this.hotArgs && this.hotArgs.rowHeaders === true);
    this.hasHeaderGroups = this.config.query("/*/grid:SelectColumns//grid:Group") != null;
    this.collapsableHeaderGroups = this.config.query("/*/grid:SelectColumns//grid:Group/@collapsed") != null;
    this.initiallyCollapsedOrHidden = this.gotHiddenColumns || this.config.query("/*/grid:SelectColumns//grid:Group[@collapsed='true']") != null;

    if (this.hasHeaderGroups) {
      this.filledGroupedHeader = this._createGroupedHeader({hasRowHeader: hasRowHeader, createCornersOnly: false});
      this.headerMatrix = this._createGroupedHeader({matrixOnly: true});

      // initially update headerMatrix with settings from guiStatus
      jQuery.makeArray(bcdui.wkModels.guiStatus.queryNodes("/*/guiStatus:PersistentSettings/guiStatus:Grid[@id='" + this.id + "']/guiStatus:Group")).forEach(function(e) {
        var id = (e.getAttribute("id") || "").substring(1).split("_");
        var row = id[0] || -1;
        var col = id[1] || -1;
        if (this.headerMatrix.length > 0 && row >= 0 && row < this.headerMatrix.length && col >= 0 && col < this.headerMatrix[0].length && this.headerMatrix[row][col] != null)
          this.headerMatrix[row][col].isCollapsed = (e.text && e.text == "1") || false;
      }.bind(this));
    }

    // add click handler for header groups
    if (this.collapsableHeaderGroups) {
      jQuery("#" + this.htTargetHtmlId).on("click", ".ht_clone_top .bcdGroupAction", function(e) {
        var curGroupTH = jQuery(e.target).closest("th");
        var row = curGroupTH.closest("tr").index();
        // get the correct column offset by taking the current column window into account
        var range = this._getRenderedColumnsRange()
        var col = range.start + jQuery(curGroupTH).index() - (hasRowHeader ? 1 : 0);

        var wasCollapsed = this.headerMatrix[row][col].isCollapsed;
        this.headerMatrix[row][col].isCollapsed = ! this.headerMatrix[row][col].isCollapsed;
        bcdui.wkModels.guiStatus.write("/*/guiStatus:PersistentSettings/guiStatus:Grid[@id='" + this.id + "']/guiStatus:Group[@id='R" + row + "_" + col + "']", this.headerMatrix[row][col].isCollapsed ? "1" : "0", true);

        if (wasCollapsed) {
          // open upper group, too
          for (var y = row - 1; y >= 0; y--) {
            for (var x = col; x > 0; x--) {
              if (this.headerMatrix[y][x] == null) {
                var xx = x;
                while (xx-- > 0) {
                  if (this.headerMatrix[y][xx] && this.headerMatrix[y][xx].type == "G") {
                    this.headerMatrix[y][xx].isCollapsed = false;
                    break;
                  }
                }
              }
              else if (this.headerMatrix[y][x] && this.headerMatrix[y][x].type == "C") {
                break;
              }
              else if (this.headerMatrix[y][x] && this.headerMatrix[y][x].type == "G") {
                this.headerMatrix[y][x].isCollapsed = false;
                break;
              }
            }
          }
        }
        this._handleCollapsedHeader();
      }.bind(this));
    }

    // keep function for calling it within our grid instance 
    this.afterChange = afterChange.bind(this);

    var createArgs = {
        colHeaders: this.htOptions.colHeaders
      , columns: this.htOptions.columns
      , columnSorting: false
      , data: this.htOptions.data
      , rowHeaders: false
      , renderAllRows: false
      , undo: false
      , redo: false
      , invalidCellClassName: 'bcdInvalid'
      , fillHandle: {autoInsertRow: true} 
      , afterRender:       afterRender.bind(this)
      , afterRenderer:     afterRenderer.bind(this)
      , afterChange:       afterChange.bind(this)
      , afterCreateRow:    afterCreateRow.bind(this)
      , afterGetColHeader: afterGetColHeader.bind(this)
      , beforeRender:      beforeRender.bind(this)
      , afterColumnResize: afterColumnResize.bind(this)
      , afterInit: function() { setTimeout(function(){this.render();}.bind(this)); } // one initial refresh to correctly set width/height
    };

		// add code/caption handling for copy/paste
    if (this.hasReferences) {
      createArgs["beforeCopy"]  = beforeCopy.bind(this); 
      createArgs["beforeCut"]   = beforeCut.bind(this);
      createArgs["beforePaste"] = beforePaste.bind(this) 
      createArgs["afterPaste"]  = afterPaste.bind(this);
    }

    // optionally limit cells (disable create-rows-on-drag)
    if (! this.allowNewRows) {
      createArgs["maxCols"] = this.htOptions.colHeaders.length;
      createArgs["maxRows"] = this.gridModel.queryNodes("/*/wrs:Data/wrs:*[not(@filtered)]").length;
      this.lastMaxRows = createArgs["maxRows"];
    }

    // disable create-rows-on-drag when we got pagination
    var gotPagination = this.getEnhancedConfiguration().query("//xp:Paginate") != null;
    var curPage = parseInt(this.pager.read("//xp:Paginate/xp:PageNumber", "-1"), 10);
    curPage = isNaN(curPage) ? -1 : curPage;
    var pageSize = parseInt(this.getEnhancedConfiguration().read("//xp:Paginate/xp:PageSize", "-1"), 10);
    if (gotPagination && pageSize != -1 && curPage != -1 && pageSize < this.gridModel.queryNodes("/*/wrs:Data/wrs:*[not(@filtered)]").length) {
      createArgs["maxRows"] = parseInt(pageSize, 10);
      this.lastMaxRows = createArgs["maxRows"];

      // if page contains less rows, update value accordingly
      var wrsStart = ((curPage - 1) * pageSize) + 1;
      var wrsStop = wrsStart + pageSize - 1;
      if (wrsStop > this.gridModel.queryNodes("/*/wrs:Data/wrs:*[not(@filtered)]").length)
        wrsStop = this.gridModel.queryNodes("/*/wrs:Data/wrs:*[not(@filtered)]").length;
      if (wrsStop - wrsStart + 1 < createArgs["maxRows"])
        createArgs["maxRows"] = wrsStop - wrsStart + 1;
    }

    // turn off columnSorting if you got pagination, this might be a future improvement (see top of file)
    if (gotPagination) {
      this.columnSorting = false;
      if (this.hotArgs && this.hotArgs.columnSorting === true)
        delete this.hotArgs.columnSorting;
    }

    // highlight column groups
    if (this.hasHeaderGroups) {
      createArgs["beforeOnCellMouseDown"] = beforeOnCellMouseDown.bind(this);
    }

    // we keep enabled colHeaders (to store bcdColIdent), but we hide it on request
    this.hideColHeaders = (this.hotArgs && (this.hotArgs.colHeaders === null || this.hotArgs.colHeaders === false || (this.hotArgs.colHeaders && this.hotArgs.colHeaders.length == 0)));
    if (this.hideColHeaders)
      delete this.hotArgs.colHeaders;

    var finalArgs = jQuery.extend(createArgs, this.hotArgs);
    // allow custom handsonable hooks for already internally used functions, our function will be executed first though
    [ ["afterChange", afterChange]
    , ["afterRender", afterRender]
    , ["afterRenderer", afterRenderer]
    , ["afterCreateRow", afterCreateRow]
    , ["afterGetColHeader", afterGetColHeader]
    , ["beforeRender", beforeRender]
    , ["afterColumnResize", afterColumnResize]
    , ["beforeCopy", beforeCopy]
    , ["beforeCut", beforeCut]
    , ["beforePaste", beforePaste]
    , ["afterPaste", afterPaste]
    , ["beforeOnCellMouseDown", beforeOnCellMouseDown]
    ].forEach(function(f) {
      if (this.hotArgs && typeof this.hotArgs[f[0]] == "function") {
        finalArgs[f[0]] = function(p1, p2, p3, p4, p5, p6) {
          var q0 = f[1].bind(this, p1, p2, p3, p4, p5, p6);
          var q1 = this.hotArgs[f[0]].bind(this, p1, p2, p3, p4, p5, p6);
          q0();
          q1();
        }.bind(this);
      }
    }.bind(this));

    this.maxHeightReached = false;
    this.columnFiltersOnce = false;
    bcdui.wkModels.guiStatus.remove("/*/guiStatus:ClientSettings/guiStatus:ColumnFilters[@id='" + this.getPrimaryModel().id + "']", true);
    this.collapseCheckOnce = false;
    this.wrsErrors = {};
    this.foundServerSidedKeys = {};
    delete this.wrsValidateInfo;

    // create grid
    jQuery("#"+this.htTargetHtmlId).handsontable(finalArgs);

    // See explanation of _propToCol overwriting above
    jQuery("#"+this.htTargetHtmlId).handsontable("getInstance").hotPropToCol = jQuery("#"+this.htTargetHtmlId).handsontable("getInstance").propToCol;
    jQuery("#"+this.htTargetHtmlId).handsontable("getInstance").propToCol = _propToColFactory( this.htOptions.columns );
    return doc;
  }},

  /**
   * handle grid row dependencies (find belonging cell in gridModel and update xPath accordingly)
   * @private
   */
  _resolveRowDependency: { writable: true, configurable: true, enumerable: true, value: function( args ) {
    var xPathFinal = args.xPath;
    var regEx = new RegExp(this.rowDependencyRegEx);
    var match = regEx.exec(args.xPath);
    while (match != null) {
      var v = match[1];
      if (v != null) {
        var vc = parseInt(v.substring(1), 10);
        // either we reference an id
        if (typeof this.wrsHeaderMeta[v] != "undefined")
          v = this.wrsHeaderMeta[v].pos;
        // or an index (c1, c2,...)
        else if (v.length > 1 & v[0] == "c" && ! isNaN(vc))
          v = vc;
        else
          throw "illegal row dependency value " + this.id + " " + v;
        var m = match[0].replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
        var refValue = this.gridModel.getData().selectSingleNode("/*/wrs:Data/wrs:*[@id='" + args.rowId + "']/wrs:C[position()='" + v + "']");
        refValue = refValue == null ? "" : refValue.text;
        xPathFinal = xPathFinal.replace(new RegExp(m, 'g'), refValue || "");
      }
      // next match
      match = regEx.exec(args.xPath);
    }
    return xPathFinal;
  }},

  /**
   * get handsontable's virtual horizontal column offsets
   * @private
   */
  _getRenderedColumnsRange: { writable: true, configurable: true, enumerable: true, value: function( args ) {
    var start = this.hotInstance.view.wt.wtTable.getFirstRenderedColumn();
    var stop = this.hotInstance.view.wt.wtTable.getLastRenderedColumn();
    return {start: start, stop: stop};
  }},

  /**
   * get handsontable's virtual vertical row offsets
   * @private
   */
  _getRenderedRowRange: { writable: true, configurable: true, enumerable: true, value: function( args ) {
    var start = this.hotInstance.view.wt.wtTable.getFirstRenderedRow();
    var stop = this.hotInstance.view.wt.wtTable.getLastRenderedRow();
    return {start: start, stop: stop};
  }},

  /**
   * hide/show grouped columns depending on its state, fix colspans etc, also used for explicitly hidden columns
   * @private
   */
  _handleCollapsedHeader: { writable: true, configurable: true, enumerable: true, value: function() {

    var offset = this.hotInstance.hasRowHeaders() ? 2 : 1; // nth child starts with 1, and an additional +1 for rowheaders
    var range = this._getRenderedColumnsRange();

    // collect hidden and visible columns
    var matrix = this.headerMatrix || [];
    this.hiddenColumns = new Array();
    for (var y = 0; y < matrix.length - 1; y++) {
      for (var x = 0; x < matrix[0].length; x++) {
        if (matrix[y][x] && matrix[y][x].type == "G" && matrix[y][x].isCollapsed) {
          var xx = 1;
          while (x + xx < matrix[y].length && matrix[y][x + xx] == null) {
            if (y > 0 && matrix[y - 1][x + xx] != null)
              break;
            else if (x + xx >= range.start && x + xx <= range.stop) // only include it if it's in current viewport range
              this.hiddenColumns.push(x + xx);
            xx++;
          }
        }
        // mark Groups with bcdCollapsed
        // only include it if it's in current viewport range and recalculate the offset of the ths according to it
        if (matrix[y][x] && matrix[y][x].type == "G") {
          if (x >= range.start && x <= range.stop) {
            var realX = x - range.start + offset;
            var e = jQuery("#" + this.htTargetHtmlId +" .ht_clone_top").find("thead tr:nth-child(" + (y + 1)+ ") th:nth-child(" + realX + ")").find(".bcdGroupAction");
            if (matrix[y][x].isCollapsed)
              e.addClass("bcdCollapsed");
            else
              e.removeClass("bcdCollapsed");
          }
        }
      }
    }
    this.htOptions.columns.forEach(function(e, i){ if (e.isHidden) this.hiddenColumns.push(i); }.bind(this));

    // show all
    jQuery("#" + this.htTargetHtmlId + " .bcdClosed").removeClass("bcdClosed");
    jQuery("#" + this.htTargetHtmlId + " .bcdToBeClosed").removeClass("bcdToBeClosed");

    // colgroup col element modification
    // display:none columns are not taken into account in colgroup/col, so if column 3 is not visible col[3] corresponds to (visible) column 4
    // that's why we rebuild the col elements by writing the visible ones and filling up with 0px
    // removing them would kill handsontable's access to them
    // initially remember current width in this.storedWidths (by colId)
    [ jQuery("#" + this.htTargetHtmlId +" .ht_master colgroup col")
    , jQuery("#" + this.htTargetHtmlId +" .ht_clone_top colgroup col")
    ].forEach(function(cg) {
        cg.each(function(x,e) {
          var realX = x - (offset - 1) + range.start; // offset -1 since we're not in nth-child context anymore
          var colId = this.wrsHeaderIdByPos["" + (realX + 1)] || "";
          if (colId != "") {
            var outerWidth = parseInt(jQuery(e).outerWidth(), 10);
            this.storedWidths = this.storedWidths || {};
            var manWidth = this.hotInstance.getSettings().manualColumnResize && this.hotInstance.getPlugin("ManualColumnResize").manualColumnWidths[realX] || -1;
            // when using manual column sizes, use them
            if (manWidth != -1)
              this.storedWidths[colId] = manWidth;
            // otherwise initially remember current width
            else if (typeof this.storedWidths[colId] == "undefined" || this.storedWidths[colId] == -1)
              this.storedWidths[colId] = outerWidth;
            // and finally set it as style width
            jQuery(e).css("width", this.storedWidths[colId]);
          }
        }.bind(this));
    }.bind(this));

    // mark the ones which will be hidden
    this.hiddenColumns.forEach(function(e) {
      var realX = e - range.start + offset;
      var headerCellsToHide = jQuery("#" + this.htTargetHtmlId +" .ht_master, #" + this.htTargetHtmlId +" .ht_clone_top").find("thead tr th:nth-child(" + realX + ")");
      headerCellsToHide.addClass("bcdToBeClosed");
    }.bind(this));

    // write new width values
    [ jQuery("#" + this.htTargetHtmlId +" .ht_master")
    , jQuery("#" + this.htTargetHtmlId +" .ht_clone_top")
    ].forEach(function(t) {
      var c = 1;
      var cols = jQuery(t).find("colgroup col");
      jQuery(t).find("thead tr:last-child th").each(function(x,e){
        var colElement = jQuery(t).find("colgroup col:nth-child(" + c + ")");
        var realX = x - (offset - 1) + range.start; // offset -1 since we're not in nth-child context anymore
        var colId = this.wrsHeaderIdByPos["" + (realX + 1)] || "";
        if (! jQuery(e).hasClass("bcdToBeClosed")) {
          colElement.css("width", this.storedWidths[colId]);
          c++;
        }
      }.bind(this));
      // and fill up the rest with 0
      while (c <= cols.length) {
        jQuery(t).find("colgroup col:nth-child(" + c++ + ")").css("width", "0px");
      }
    }.bind(this));

    // finally hide selected cells
    this.hiddenColumns.forEach(function(e) {
      var realX = e - range.start + offset;
      var headerCellsToHide = jQuery("#" + this.htTargetHtmlId +" .ht_master, #" + this.htTargetHtmlId +" .ht_clone_top").find("thead tr th:nth-child(" + realX + ")");
      var bodyCellsToHide = jQuery("#" + this.htTargetHtmlId +" .ht_master tbody tr td:nth-child(" + realX + ")");
      headerCellsToHide.addClass("bcdClosed");
      bodyCellsToHide.addClass("bcdClosed");
    }.bind(this));

    // and update colspans according to the show/hide state
    var colSpans = jQuery("#" + this.htTargetHtmlId +" .ht_master, #" + this.htTargetHtmlId +" .ht_clone_top").find("thead tr th[colspan]");
    colSpans.each(function(i,e) {
      var originalColSpan = parseInt(jQuery(e).attr("oc") || "1", 10);
      var newColSpan = 0; 
      var col = jQuery(e).index() - (offset - 1) + range.start;
      for (var x = col; x < col + originalColSpan; x++) {
        if (this.hiddenColumns.indexOf(x) == -1)
          newColSpan++;
      }
      jQuery(e).attr("colspan", newColSpan);
    }.bind(this));

    // let handsontable recalculate width of all wider elements
    this.hotInstance.view.wt.wtOverlays.adjustElementsSize(true);
  }},

  /**
   * builds up a tr/th html which is based on the grid:Group definitions in the configuration
   * @private
   */
  _createGroupedHeader: { writable: true, configurable: true, enumerable: true, value: function( args ) {

    /**
     * recursively builds up a helper matrix for cells and grouped cells
     * the final matrix has as much rows as the maximum grouping level and as much columns as the grid
     * it contains either null (fields which will be row/column spanned, C (a rendered Item) or G (a group)
     */
    function buildMatrix(matrix, x, y, root, columns) {
      var nodes = root.selectNodes("./*");
      for (var n = 0; n < nodes.length; n++) {
        if (typeof matrix[y] == "undefined")
          matrix.push(new Array(columns));
        if ((nodes[n].localName||nodes[n].baseName) == "C") {
          matrix[y][x] = {type: "C"};
          x++;
        }
        if ((nodes[n].localName||nodes[n].baseName) == "Group") {
          var caption = nodes[n].getAttribute("caption") || "";
          caption = caption.indexOf(bcdui.i18n.TAG) == 0 ? bcdui.i18n.syncTranslateFormatMessage({msgid:caption}) : caption;
          matrix[y][x] = {type: "G", caption: caption, cssClass: nodes[n].getAttribute("class") || ""};
          matrix[y][x].collapsable = (nodes[n].getAttribute("collapsed") != null);
          matrix[y][x].isCollapsed = (nodes[n].getAttribute("collapsed") === "true"); // take initial value from config
          x = buildMatrix(matrix, x, y + 1, nodes[n], columns)
        }
      }
      return x;
    }

    var matrix = new Array();
    buildMatrix(matrix, 0, 0, this.config.query("/*/grid:SelectColumns/wrq:Columns"), this.config.queryNodes("/*/grid:SelectColumns/wrq:Columns//wrq:C").length);

    if (args.matrixOnly)
      return matrix;

    var numberOfRows = matrix.length - 1; // the matrix last row would be the header row which is shown by handsontable, so we only take the previous ones

    var rows =  new Array();
    for (var y = 0; y < numberOfRows; y++) {
      var rowElements = new Array();

      var colSpanCaption = "";
      var colSpanLen = 0;
      var colSpanClass = "";
      for (var x = 0; x < matrix[y].length; x++) {

        var cssClass = matrix[y][x] && matrix[y][x].cssClass && matrix[y][x].cssClass != "" ? " class='" + matrix[y][x].cssClass + "'" : "";

        // to keep handsontable's TR counting in sync, we add hidden th elements for the col/rowspan items
        // for some housekeeping later on, we mark this empty cell with bcdColSpan class if it's caused by a colspan (not rowspan)
        if (matrix[y][x] == null) {
          var cs = colSpanLen-- > 1 ? (" class='bcdColSpan' caption='" + colSpanCaption + "' csClass='" + colSpanClass + "' rcs='" + colSpanLen + "'") : "";
          rowElements.push("<th style='display:none'" + cs + "><div class='relative'><span class='colHeader'>&nbsp;</span></div></th>");
        }

        // we found a C, we can render it. Below a C only nulls can appear, so we add a rowspan.
        else if (matrix[y][x].type == "C") {
          colSpanCaption = "";
          colSpanClass = "";
          colSpanLen = 0;
          var rowspan = matrix.length - y > 1 ? (" rowspan='" +  (numberOfRows - y) + "'") : "";
          rowElements.push("<th" + cssClass + rowspan + "><div class='relative'><span class='colHeader'>&nbsp;</span></div></th>");
        }

        // we found a group. To determine the colspan, we look to the right and one row above.
        // as soon as we found something != null or reached the end, we stop counting the colspan and render the cell 
        else if (matrix[y][x].type == "G") {
          colSpanCaption = bcdui.util.escapeHtml(matrix[y][x].caption);
          var colspan = 1;
          var xx = 1;
          while (x + xx < matrix[y].length && matrix[y][x + xx] == null) {
            if (y > 0 && matrix[y - 1][x + xx] != null)
              break;
            colspan++;
            xx++; 
          }
          colSpanLen = colspan;
          colspan = colspan > 1 ? (" colspan='" + colspan + "' oc='" + colspan + "'") : "";
          colSpanClass = matrix[y][x].cssClass;
          rowElements.push("<th"+ cssClass + colspan + "><div class='relative'>" + (this.collapsableHeaderGroups && matrix[y][x].collapsable ? "<span class='bcdGroupAction'></span>" : "") + "<span class='colHeader'>" + bcdui.util.escapeHtml(matrix[y][x].caption) + "</span></div></th>");
        }
      }
      rows.push(rowElements);
    }
    return rows;
  }},
  
  /**
   * since a gridModel fire would reconstruct the full handsontable, we avoid firing the model (e.g. when adding new rows)
   * however, we need to do some manual work on the data (this.htOptions.data) then.
   * newly inserted data gets added to the array, really removed one (this is not a 'wrs:D' but an inserted and directly removed row)
   * gets removed from the array. For quicker access we use the rowIdMap (which might need to get reconstructed on inserts/changes)
   * finally handsontable's render() is called to update the existing hot instance
   * @param {string} rowId   - the currently modified RowId (gridModel)
   * @param {string} [colIdx] - the currently modified colum index (gridModel) , 0 based
   * @private
   */
  _refreshGridData: { writable: true, configurable: true, enumerable: true, value: function( rowId, colIdx ) {

    var rebuildIndexList = false;
    var e = this.gridModel.query("/*/wrs:Data/wrs:*[@id='" + rowId + "']");
    var changes = [];
    // row exists, was refreshed or inserted
    if (e != null) {

      // row was inserted?
      if (this.rowIdMap[rowId] == null) {

        // place row correctly in htOptions.data (according to gridModel)
        var next = this.gridModel.query("/*/wrs:Data/wrs:*[@id='" + rowId + "']/following-sibling::*");
        var newPos = (next != null) ? this.rowIdMap[next.getAttribute("id")] : null;
        if (newPos != null) {
          this.htOptions.data.splice(newPos, 0, {});
          this.rowIdMap[rowId] = newPos;
          rebuildIndexList = true;
        }
        else { // or put it at the end
          this.htOptions.data.push({});
          this.rowIdMap[rowId] = this.htOptions.data.length - 1;
          this.scrollToBottom = true;  // we want to jump to the bottom to make the new row visible
        }
      }

      // update information (wrs:R (wrs:M/I/D) / wrs:C (wrs:O) data in hot data array
      var hDataEntry = this.htOptions.data[this.rowIdMap[rowId]];
      hDataEntry.r = e;
      hDataEntry.c = jQuery.makeArray(e.getElementsByTagName("*")).filter(function(e){return (e.localName||e.baseName) != "null";})

      // take over the row changes for afterChange call
      if ((e.localName||e.baseName) != "D") {
        if (typeof colIdx != "undefined") {
          var factor = ((e.localName||e.baseName) == "M") ? 2 : 1; 
          changes.push([-1, {colIdx: colIdx}, "", hDataEntry.c[(factor * colIdx)].text || ""]);
        }
        else {
          var i = 0;
          hDataEntry.c.forEach(function(c) {
            if ((c.localName||c.baseName) == "C") {
              // [row, prop, oldValue, newValue], where we only provide prop.colIdx and no old value, row will be populated after rowIdMap build below
              changes.push([-1, {colIdx: i++}, "", c.text || ""]);
            }
          });
        }
      }
    }

    // row was removed completely (not marked as D)
    else if (this.rowIdMap[rowId] != null) {
      // remove row from data
      this.htOptions.data.splice(this.rowIdMap[rowId], 1);
      rebuildIndexList = true;
    }

    // rebuild rowIdMap
    if (rebuildIndexList) {
      var index = 0;
      this.rowIdMap = {};
      this.htOptions.data.forEach(function(e){ this.rowIdMap[e.r.getAttribute("id")] = index++; }.bind(this));
    }

    // rerender
    this.hotInstance.render();

    // populate rowpos, and trigger validation
    changes.forEach(function(c) { c[0] = this.rowIdMap[rowId]; }.bind(this));
    this.afterChange(changes, "edit");  // trigger partial validation (can be full for a deleted row)
  }},

  /**
   * @private
   */
  _createHtmlStructure: { writable: true, configurable: true, enumerable: true, value: function( args ) {
    var table = jQuery("<table class='bcdGrid'/>");
    table.append("<thead style='display:none'><tr><td class='form-row'></td></tr></thead>");
    table.append("<tbody><tr><td><div id='"+this.htTargetHtmlId+"'><div></td></tr></tbody>");
    table.append("<tfoot style='display:none'><tr><td class='form-row'></td></tr></tfoot>");
    var buttonCell = jQuery(table).find(this.topMode ? "thead" : "tfoot");
    
    if (this.allowNewRows)
      buttonCell.find("td").append("<div class='col-sm-auto'><bcd-buttonNg caption='"+bcdui.i18n.TAG+"bcd_Grid_RowAdd' onClickAction='bcdui.factory.objectRegistry.getObject(\""+this.id+"\").addRow();'></bcd-buttonNg></div>");

    buttonCell.find("td").append("<div class='col-sm-auto'><bcd-buttonNg caption='"+bcdui.i18n.TAG + (this.isReadOnly ? "bcd_Edit_Reload" : "bcd_Edit_ResetAll") + "' onClickAction='bcdui.factory.objectRegistry.getObject(\""+this.id+"\").reset();'></bcd-buttonNg></div>");

    if (! this.isReadOnly)
      buttonCell.find("td").append("<div class='col-sm-auto'><bcd-buttonNg caption='"+bcdui.i18n.TAG+"bcd_Edit_Save'     onClickAction='bcdui.factory.objectRegistry.getObject(\""+this.id+"\").saveRoutine();'></bcd-buttonNg></div>");

    table.append(buttonCell);
    jQuery("#"+this.targetHtml).append(table);
    
    // set trimming container to current table in case we're rendering ourself in an overflow container to prevent handsontable to make the grid too big 
    var trimmingContainer = this._getTrimmingContainer(jQuery("#"+this.targetHtml).get(0));
    if (trimmingContainer !== window)
      jQuery("#"+this.targetHtml).find("table").css({overflow: "auto", width: "auto", height: "auto"});

    // pagination renderer, model and listener to rerender on page change
    this.pager = new bcdui.core.StaticModel("<Data><xp:Paginate xmlns:xp='http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0'><xp:PageNumber>" + this.getEnhancedConfiguration().read("//xp:Paginate/xp:PageNumber", "1") + "</xp:PageNumber></xp:Paginate></Data>");
    bcdui.factory.objectRegistry.registerObject(this.pager);
    var gotPagination = this.getEnhancedConfiguration().query("//xp:Paginate") != null;
    this.pager.onceReady(function() {
      this.pager.onChange(function() {
        // reset/set maxRows
        var createArgs = {maxRows: Infinity};
        if (! this.allowNewRows)
          createArgs["maxRows"] = this.gridModel.queryNodes("/*/wrs:Data/wrs:*[not(@filtered)]").length;
        var curPage = parseInt(this.pager.read("//xp:Paginate/xp:PageNumber", "-1"), 10);
        curPage = isNaN(curPage) ? -1 : curPage;
        var pageSize = parseInt(this.getEnhancedConfiguration().read("//xp:Paginate/xp:PageSize", "-1"), 10);
        if (gotPagination && pageSize != -1 && curPage != -1 && pageSize < this.gridModel.queryNodes("/*/wrs:Data/wrs:*[not(@filtered)]").length) {
          createArgs["maxRows"] = parseInt(pageSize, 10);

          // if page contains less rows, update value accordingly
          var wrsStart = ((curPage - 1) * pageSize) + 1;
          var wrsStop = wrsStart + pageSize - 1;
          if (wrsStop > this.gridModel.queryNodes("/*/wrs:Data/wrs:*[not(@filtered)]").length)
            wrsStop = this.gridModel.queryNodes("/*/wrs:Data/wrs:*[not(@filtered)]").length;
          if (wrsStop - wrsStart + 1 < createArgs["maxRows"])
            createArgs["maxRows"] = wrsStop - wrsStart + 1;
        }

        if (this.lastMaxRows != createArgs["maxRows"])
          this.hotInstance.updateSettings(createArgs);
        this.lastMaxRows = createArgs["maxRows"]; 

        this._refreshDataCompletely();
        this.hotInstance.render();
        this.afterChange([], "edit");  // trigger full validation

        // redraw to adjust new page counts
        if (this.paginationRenderer)
          this.paginationRenderer.execute();

      }.bind(this))
    }.bind(this));

    this.pager.execute();
    var headOrFoot = this.topMode ? "tfoot" : "thead";
    this.paginationRenderer = gotPagination
    ? new bcdui.core.Renderer({
        targetHtml: "#" + this.targetHtml + " " + headOrFoot + " td"
      , chain: bcdui.contextPath + "/bcdui/js/component/grid/pagination.xslt"
      , inputModel : this.getEnhancedConfiguration()
      , parameters:{ targetModel: this.pager, gridModel: this.gridModel, targetModelId: this.pager.id }
      })
    : null;

    // we might use custom optionsModels, so we need to provide the correct caption value for the old value
    // to the tooltip renderer (which by default only knows wrs/reference captions and the actual gridModel values
    var prepareTooltip = function(doc, args) {
      if (args.bcdColIdent && args.bcdRowIdent && args.gridInstanceId) {
        var grid = bcdui.factory.objectRegistry.getObject(args.gridInstanceId);
        if (grid) {
          doc.selectSingleNode("/*/wrs:Data").removeAttribute("mappedCaption");

          var isDocument = false;
          if (typeof grid.wrsHeaderMeta[args.bcdColIdent].pos != "undefined")
            isDocument = grid.getEnhancedConfiguration().query("/*/grid:Columns/wrq:C[position()='" + grid.wrsHeaderMeta[args.bcdColIdent].pos + "']").getAttribute("isDocument") === "true";
          doc.selectSingleNode("/*/wrs:Data").setAttribute("isDocument", "" + isDocument);
          
          var references = grid.optionsModelInfo[args.bcdColIdent];
          if (references) {
            var index = grid.wrsHeaderMeta[args.bcdColIdent].pos; //grid.gridModel.read("/*/wrs:Header/wrs:Columns/wrs:C[@id='" + args.bcdColIdent + "']/@pos", "-1");
            var value = grid.gridModel.read("/*/wrs:Data/wrs:M[@id='" + args.bcdRowIdent + "']/wrs:O[position()='"+ index + "']");
            if (value) {
              var refValue = references.codeCaptionMap[bcdui.util.escapeHtml(value)];
              if (references.isSuggestInput && refValue == null)
                refValue = value;  // suggestInput with a suggested value
              else if (refValue == null)
                refValue = value;  // a drop down without optionsModelRelativeValueXPath
              doc.selectSingleNode("/*/wrs:Data").setAttribute("mappedCaption", refValue);
            }
          }
        }
      }
      return doc;
    }

    // Add context menu and tooltip once data is ready
    this.gridModel.onceReady(function() {

      // in case grid is in a tab, we need to trigger a refresh when changing tabs
      var tabItem = jQuery("#" + this.targetHtml).closest(".bcdTabItem");
      if (tabItem.length > 0) {
        tabItem.on("bcd:widget.tab.show", function(event, args) {
          if (this.hotInstance)
            this.hotInstance.render();
        }.bind(this));
      }

      //--------------------
      // Create the tooltip (chain)
      args.tooltipChain = typeof args.tooltipChain !== "undefined" ? args.tooltipChain : bcdui.contextPath+"/bcdui/js/component/grid/gridTooltip.xslt";
      // in case of references, use a preprocessor, too
      var c = typeof args.tooltipChain === "string" ? [args.tooltipChain] : args.tooltipChain;
      var chain = this.hasReferences ? [prepareTooltip].concat(c) : c;
      if( args.tooltipChain && args.tooltipChain!="false" && args.tooltipChain != "" ) {
        bcdui.widget.createTooltip({ tableMode: true, filter:"td|th", delay: 1000,
          inputModel: this.gridModelHolder, chain: chain, targetRendererId: this.id,
          parameters: jQuery.extend( {}, args.parameters, { gridDefinition: this.getEnhancedConfiguration(), gridModelValidation: this.gridModel.validationResult, gridInstanceId: this.id } ) } );
      }

      //--------------------
      // Create the context menu
      if( !!args.contextMenu && args.contextMenu !== 'false' && args.contextMenu !== false ) {
        var contextMenuUrl = args.contextMenu === true || args.contextMenu === 'true' ? bcdui.config.jsLibPath+"component/grid/contextMenu.xslt" : args.contextMenu;
        var bcdPageAccess = " " + ((bcdui.config.clientRights && bcdui.config.clientRights.bcdPageAccess) || []).reduce(function(a, b) { return a + " " + b;},[]) + " ";
        this.contextMenu = new bcdui.core.ModelWrapper({ chain: contextMenuUrl, inputModel: this.statusModel,
          parameters: {
            bcdRowIdent: bcdui.wkModels.bcdRowIdent
          , bcdColIdent: bcdui.wkModels.bcdColIdent
          , gridDefinition: this.getEnhancedConfiguration()
          , bcdPageAccess: bcdPageAccess
          , allowNewRows: "" + this.allowNewRows
          , allowSorting: "" + this.columnSorting
          , gridModel: this.gridModel
          , gotExport: "" + (typeof bcdui.component.exports != "undefined")
          }
        });
        bcdui.widget.createContextMenu({ targetRendererId: this.id, refreshMenuModel: true, tableMode: true, inputModel: this.contextMenu });
      }

      // context menu actions
      jQuery("#" + this.targetHtml).on("gridActions:rowAdd", function(evt, memo){
        var rowId = memo ? memo.rowId : "";
        var q = this.hotInstance.countRows();
        var gotPagination = this.getEnhancedConfiguration().query("//xp:Paginate") != null;

        var insertBeforeSelection = false;
        // clicked on AddRow button, then - depending on topMode - chooser top or bottom row
        if (rowId == "") {
          // for pagination, always add at top or current page
          if (gotPagination) {
            var topRow = q > 0 ? this.hotInstance.getSourceDataAtRow(0).r.getAttribute("id") : null
            rowId = (topRow == null) ? "R1" : topRow;
            insertBeforeSelection = true;
          }
          else if (this.topMode) {
            var thisPageFirstRowId = q > 0 ? this.hotInstance.getSourceDataAtRow(0).r.getAttribute("id") : null
            rowId = (thisPageFirstRowId == null) ? "R1" : thisPageFirstRowId;
            insertBeforeSelection = true;
          }
          else {
            var thisPageLastRowId = q > 0 ? this.hotInstance.getSourceDataAtRow(q - 1).r.getAttribute("id") : null
            rowId = (thisPageLastRowId == null) ? "R1" : thisPageLastRowId;
          }
        }

        // handle context menu specific insert positions 
        if (memo && memo.mode) {
          if (memo.mode == "top") {
            var topRowId = q > 0 ? this.hotInstance.getSourceDataAtRow(0).r.getAttribute("id") : null
            rowId = (topRowId == null) ? "R1" : topRowId;
            insertBeforeSelection = true;

            // in pagination we don't have sorting, so we can pick the first row in the gridModel
            if (gotPagination)
              rowId = this.gridModel.read("/*/wrs:Data/*[position()=1]/@id", "R1");
          }
          if (memo.mode == "bottom") {
            var bottomRowId = q > 0 ? this.hotInstance.getSourceDataAtRow(q - 1).r.getAttribute("id") : null
            rowId = (bottomRowId == null) ? "R1" : bottomRowId;
            insertBeforeSelection = false;

            // in pagination we don't have sorting, so we can pick the last row in the gridModel
            if (gotPagination)
              rowId = this.gridModel.read("/*/wrs:Data/*[position()=last()]/@id", "R1");
          }
          if (memo.mode == "above") {
            rowId = memo.rowId;
            insertBeforeSelection = true;
          }
          if (memo.mode == "below") {
            rowId = memo.rowId;
            insertBeforeSelection = false;
          }
        }

        var rowPos = this.gridModel.queryNodes("/*/wrs:Data/*[@id='" + rowId + "']/preceding-sibling::*").length + 1;

        // determine id of newly inserted row (might differ from rowId due to pagination mode)
        var realRowId = this.gridModel.query("/*/wrs:Data/*[" + rowPos + "]/@id");
        realRowId = realRowId == null ? rowId : realRowId.text; 
        var newRowId = this.gridModel.query("/*/wrs:Data/*") == null ? "new" : "I_" + bcdui.wrs.wrsUtil._transactionsNumber + "_" + realRowId;
        bcdui.wrs.wrsUtil.insertRow({model: this.gridModel, propagateUpdate: false, rowStartPos:rowPos, rowEndPos:rowPos, insertBeforeSelection: insertBeforeSelection, setDefaultValue: false, fn: function(){
          this.afterAddRow({rowNode: this.gridModel.query("/*/wrs:Data/wrs:*[@id='" + newRowId + "']"), headerMeta: this.wrsHeaderMeta});
          this._refreshGridData(newRowId);
          this.jumpToRow(newRowId, 0);
        }.bind(this)});
      }.bind(this));

      jQuery("#" + this.targetHtml).on("gridActions:rowDelete", function(evt, memo){
        if (memo.rowId) {
          bcdui.wrs.wrsUtil.deleteRow(this.gridModel, memo.rowId, false);

          // remove possible existing errors for removed row, important for previously inserted and removed rows
          // which then don't appear at all in the gridModel (and not as wrs:D)
          if (this.wrsErrors)
            delete this.wrsErrors[memo.rowId];

          this._refreshGridData(memo.rowId);
        }
      }.bind(this));

      jQuery("#" + this.targetHtml).on("gridActions:rowRestore", function(evt, memo){
        if (memo.rowId) {
          bcdui.wrs.wrsUtil.restoreRow(this.gridModel, memo.rowId, false);
          this._refreshGridData(memo.rowId);
        }
      }.bind(this));

      jQuery("#" + this.targetHtml).on("gridActions:cellRestore", function(evt, memo){
        if (memo.rowId && memo.columnId) {
          var index = this.wrsHeaderMeta[memo.columnId].pos;
          bcdui.wrs.wrsUtil.restore({model: this.gridModel,  propagateUpdate: false, rowStartPos: memo.rowId, rowEndPos: memo.rowId, colStartPos: index, colEndPos: index, fn: function(){this._refreshGridData(memo.rowId, index - 1);}.bind(this)});
        }
      }.bind(this));

      jQuery("#" + this.targetHtml).on("gridActions:rowDuplicate", function(evt, memo){
        if (memo.rowId) {
          var newRowId = "D_" + bcdui.wrs.wrsUtil._transactionsNumber + "_" + memo.rowId;
          bcdui.wrs.wrsUtil.duplicateRow( this.gridModel, memo.rowId, false, function(){
            this.afterAddRow({rowNode: this.gridModel.query("/*/wrs:Data/wrs:*[@id='" + newRowId + "']"), headerMeta: this.wrsHeaderMeta});
            this._refreshGridData(newRowId);
          }.bind(this));
        }
      }.bind(this));

      jQuery("#" + this.targetHtml).on("gridActions:fullDataExport", function(evt){
        bcdui.component.exports.exportToExcelTemplate({ inputModel: this.gridModel });
      }.bind(this));
      
      jQuery("#" + this.targetHtml).on("gridActions:columnSort", function(evt, memo){
        var configColumn = this.getEnhancedConfiguration().query("/*/grid:Columns");
        if (configColumn != null)
          configColumn.setAttribute("manualSort", memo.direction != null);
        var column = parseInt(this.wrsHeaderMeta[memo.columnId].pos, 10) -1;
        var createArgs = memo.direction == null ? {columnSorting: false} : {columnSorting: {indicator: false, initialConfig: {column: column, sortOrder: (memo.direction == "ascending" ? "asc" : "desc")} }};
        this.hotInstance.updateSettings(createArgs);
      }.bind(this));

    }.bind(this));

  }},

  /**
   * @private
   */
  _getTrimmingContainer: { writable: true, configurable: true, enumerable: true, value: function(base) {
    var el = base.parentNode;

    while (el && el.style && document.body !== el) {
      if (el.style.overflow !== 'visible' && el.style.overflow !== '') {
        return el;
      }

      var computedStyle = getComputedStyle(el);
      var allowedProperties = ['scroll', 'hidden', 'auto'];
      var property = computedStyle.getPropertyValue('overflow');
      var propertyY = computedStyle.getPropertyValue('overflow-y');
      var propertyX = computedStyle.getPropertyValue('overflow-x');

      if (allowedProperties.includes(property) || allowedProperties.includes(propertyY) || allowedProperties.includes(propertyX)) {
        return el;
      }

      el = el.parentNode;
    }

    return window;
  }},

  /**
   * @private
   */
  _blindGrid: { writable: true, configurable: true, enumerable: true, value: function() {
    setTimeout(function(){jQuery.blockUI({message: bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_Wait"})})});
  }},

  /**
   * @private
   */
  _unBlindGrid: { writable: true, configurable: true, enumerable: true, value: function() {
    setTimeout(jQuery.unblockUI);
  }},
  
  /**
   * Jumps to the first error
   * @method
   */
  jumpToError: { writable: true, configurable: true, enumerable: true, value: function() {
    // try to jump to first error
    var firstErrorColumn = this.gridModel.validationResult.query("/*/wrs:Wrs/wrs:Data/wrs:*[1]/wrs:C[2]");
    firstErrorColumn = firstErrorColumn != null ? firstErrorColumn.text : null
    if (firstErrorColumn == null) {
      var colIdx = jQuery("#" + this.targetHtml + " .bcdInvalid").closest("td").first().index() + (this.hotInstance.hasRowHeaders() ? 1 : 0);
      firstErrorColumn = jQuery("#" + this.targetHtml + " .bcdInvalid").first().closest("table").find("thead tr:last-child th:nth-child(" + colIdx + ")").attr("bcdColIdent") || "";
    }
    var firstErrorColumnPos = parseInt(this.wrsHeaderMeta[firstErrorColumn].pos, 10) - 1;
    firstErrorColumnPos = firstErrorColumnPos < 0 ? 0 : firstErrorColumnPos;

    var firstErrorRow = this.gridModel.validationResult.query("/*/wrs:Wrs/wrs:Data/wrs:*[1]/wrs:C[1]");
    firstErrorRow = firstErrorRow != null ? firstErrorRow.text : jQuery("#" + this.targetHtml + " .bcdInvalid").closest("tr").attr("bcdRowIdent") || "";

    this.jumpToRow(firstErrorRow, firstErrorColumnPos);
  }},

  /**
   * Jumps to given row/col
   * @method
   */
  jumpToRow:  { writable: true, configurable: true, enumerable: true, value: function(rowId, colPos) {
    // in case of pagination, we calc the needed page numer and jump to it if necessary
    var gotPagination = this.getEnhancedConfiguration().query("//xp:Paginate") != null;
    var curPage = parseInt(this.pager.read("//xp:Paginate/xp:PageNumber", "-1"), 10);
    if (gotPagination) {
      var pageSize = parseInt(this.getEnhancedConfiguration().read("//xp:Paginate/xp:PageSize", "-1"), 10);
      var page = 1 + Math.floor(this.gridModel.queryNodes("//wrs:Data/wrs:*[@id='"+rowId+"']/preceding-sibling::*").length / pageSize);
      if (curPage != page) {
        this.pager.write("/*/xp:Paginate/xp:PageNumber", page, true);
      }
    }
    var colId = this.wrsHeaderIdByPos["" + (colPos + 1)];
    setTimeout(function(){
      if (typeof this.rowIdMap[rowId] != "undefined") {
       var e = jQuery("#" + this.htTargetHtmlId +" .ht_master tr[bcdRowIdent='" + rowId + "'");
        var f = jQuery("#" + this.htTargetHtmlId +" .ht_master thead tr *[bcdColIdent='" + colId + "']");
        if (e.length == 0 || f.length == 0) // row or col is not even rendered (virtual scrolling), jump to it anyway
          this.hotInstance.scrollViewportTo(this.rowIdMap[rowId], colPos, false, false);
        else {
          var viewportTop = jQuery(window).scrollTop();
          var viewportLeft = jQuery(window).scrollLeft();
          var viewportBottom = viewportTop + jQuery(window).height();
          var viewportRight = viewportLeft + jQuery(window).width();
          var elementTop = e.offset().top;
          var elementBottom = elementTop + e.outerHeight();
          var elementLeft = f.offset().left;
          var elementRight = elementLeft + f.outerWidth();
          if (! (elementBottom > viewportTop && elementTop < viewportBottom && elementRight > viewportLeft && elementLeft < viewportRight)) {
            this.hotInstance.scrollViewportTo(this.rowIdMap[rowId], colPos, false, false);
          }
        }
        this.hotInstance.selectCell(this.rowIdMap[rowId], colPos);
        jQuery("#" + this.htTargetHtmlId + " .handsontableInput").first().focus();
      }
    }.bind(this));
  }},

  /**
   * Save the modified data to the database
   * @method
   */
  save: { writable: true, configurable: true, enumerable: true, value: function() {

    var doSave = function() {
      if ((this.gridModel.validationResult && this.gridModel.validationResult.queryNodes("/*/wrs:Wrs/wrs:Data/wrs:*").length > 0) || jQuery("#" + this.targetHtml + " .bcdInvalid").length > 0) {
        alert(bcdui.i18n.syncTranslateFormatMessage({msgid: "bcd_Grid_SaveError"}));
        this.jumpToError();
        return;
      }
      this._blindGrid();
      bcdui.wrs.wrsUtil.saveModel({ model: this.gridModel, reload: true, onSuccess: this._unBlindGrid });
    }.bind(this);

    if (this.gridModel.validationResult)
      this.gridModel.validationResult.onceReady({executeIfNotReady: true, onSuccess: doSave}); 
    else
      doSave();
  }},

  /**
   * Drop all changes and load fresh data
   * @method
   */
  reset: { writable: true, configurable: true, enumerable: true, value: function() {
    this._blindGrid();
    this.gridModel.execute(true);
    this.gridModel.onceReady(this._unBlindGrid);
  }},

  addRow: { writable: true, configurable: true, enumerable: true, value: function() {
    jQuery("#" + this.htTargetHtmlId).trigger("gridActions:rowAdd");
	}},

  /**
   * @method
   * @returns {bcdui.core.DataProvider} configuration model of the grid
   */
  getConfigModel: { writable: true, configurable: true, enumerable: true, value: function() {
    return this.metaDataModel;
  }},

  /**
   * @method
   * @returns {bcdui.core.DataProvider} Enhanced configuration model of the grid
   */
  getEnhancedConfiguration: { writable: true, configurable: true, enumerable: true, value: function() {
    return this.enhancedConfiguration; 
  }}
});


/************************
 * Glue-ware for declarative environments, not to be used directly
 */
bcdui.util.namespace("bcdui.component",
/** @lends bcdui.component */
{
  /**
   * Helper for jsp and XAPI and custom HTMLElements. First waits for all dependencies to be available
   * @param {bcdui.core.DataProvider} [args.config=./gridConfiguration.xml]                  - The model containing the grid configuration data. If it is not present a SimpleModel with the url  './gridConfiguration.xml' is created.
   * @param {string}                  [args.id]                                              - The object's id, needed only when later accessing via id. If given the GridModel registers itself at {@link bcdui.factory.objectRegistry}
   * @param {bcdui.core.DataProvider} [args.statusModel=bcdui.wkModels.guiStatusEstablished] - StatusModel, containing the filters as /SomeRoot/f:Filter
   * @param {chainDef}                [args.saveChain]                                       - The definition of the transformation chain
   * @param {Object}                  [args.saveParameters]                                  - An object, where each property holds a DataProvider, used as a transformation parameters.
   * @param {chainDef}                [args.validationChain]                                 - The definition of the transformation chain
   * @param {Object}                  [args.validationParameters]                            - An object, where each property holds a DataProvider, used as a transformation parameters.
   * @param {chainDef}                [args.loadChain]                                       - The definition of the transformation chain
   * @param {Object}                  [args.loadParameters]                                  - An object, where each property holds a DataProvider, used as a transformation parameters.
   * @private
   */
  createGridModel: function( args )
  {
    args.id = args.id ? args.id : bcdui.factory.objectRegistry.generateTemporaryIdInScope("gridModel");
    args.config = args.config || args.metaDataModel;
    bcdui.factory.objectRegistry.withObjects( [args.config, args.statusModel, args.saveChain, args.validationChain, args.loadChainn ],  function() {
      new bcdui.component.grid.GridModel( {
        config:               bcdui.factory.objectRegistry.getObject(args.config),
        id:                   args.id,
        statusModel:          bcdui.factory.objectRegistry.getObject(args.statusModel),
        saveChain:            bcdui.factory.objectRegistry.getObject(args.saveChain),
        saveParameters:       args.saveParameters,
        validationChain:      bcdui.factory.objectRegistry.getObject(args.validationChain),
        validationParameters: args.validationParameters,
        loadChain:            bcdui.factory.objectRegistry.getObject(args.loadChain),
        loadParameters:       args.loadParameters
      });
    });
    return { refId: args.id, symbolicLink: true };
  },

  /**
   * Helper for jsp and XAPI and custom HTMLElements. First waits for all dependencies to be available
   * @param {targetHtmlRef}           args.targetHtml                                        - A reference to the HTML DOM Element where to put the output
   * @param {bcdui.core.DataProvider} [args.config=./gridConfiguration.xml]                  - The model containing the grid configuration data. If it is not present a SimpleModel with the url  './gridConfiguration.xml' is created.
   * @param {bcdui.core.DataProvider} [args.statusModel=bcdui.wkModels.guiStatusEstablished] - StatusModel (default is 'guiStatusEstablished'), containing the filters as /SomeRoot/f:Filter
   * @param {bcdui.core.DataProvider} [args.inputModel]                                      - WRS or GridModel which is used, if not provided, it is generated out of the config. If provided, config is ignored unless it is set explicitly
   * @param {string}                  [args.id]                                              - The object's id, needed only when later accessing via id. If given the Grid registers itself at {@link bcdui.factory.objectRegistry}
   * @param {Object}                  [args.hotArgs]                                         - Arguments which are extended to handsontable creation
   * @param {string}                  [args.tooltipChain]                                    - To overwrite default tooltip chain. An empty string will disable tooltips, otherwise the default gridTooltip.xslt is used
   * @param {(boolean|string)}        [args.contextMenu=false]                               - If true, grid's default context menu is used, otherwise provide the url to your context menu xslt here.
   * @param {function}                [args.customSave]                                      - custom save function
   * @param {function}                [args.afterAddRow]                                     - custom function(args) which is called after a row was added (args.rowNode, wrs row node which was added, args.headerMeta wrs header object)
   * @param {chainDef}                [args.saveChain]                                       - A chain definition which is used for the grid saving operation 
   * @param {Object}                  [args.saveParameters]                                  - Parameters for the saving chain
   * @param {chainDef}                [args.loadChain]                                       - A chain definition which is used for the grid loading operation 
   * @param {Object}                  [args.loadParameters]                                  - Parameters for the loading chain
   * @param {chainDef}                [args.validationChain]                                 - A chain definition which is used for the validation operation. basic wrs and reference validation is given by default
   * @param {Object}                  [args.validationParameters]                            - Parameters for the validation chain
   * @param {boolean}                 [args.allowNewRows=true]                              - Allows inserting new cells via default contextMenu or drag/paste 
   * @param {boolean}                 [args.columnFilters=false]                             - Enable basic column filter input fields
   * @param {boolean}                 [args.maxHeight]                                       - set a maximum vertical size in pixel (only used when no handsontable height is set)   * @private
   * @param {boolean}                 [args.isReadOnly]                                      - turn on viewer-only mode
   * @private
   */
  createGrid: function( args )
  {
    args.id = args.id ? args.id : bcdui.factory.objectRegistry.generateTemporaryIdInScope("grid");
    args.config = args.config || args.metaDataModel;
    bcdui.factory.objectRegistry.withObjects( [args.config, args.statusModel, args.inputModel, args.saveChain, args.validationChain, args.loadChain], function() {
      new bcdui.component.grid.Grid( {
        targetHtml:           bcdui.util._getTargetHtml(args, "grid_"),
        config:               bcdui.factory.objectRegistry.getObject(args.config),
        statusModel:          bcdui.factory.objectRegistry.getObject(args.statusModel),
        inputModel:           bcdui.factory.objectRegistry.getObject(args.inputModel),
        id:                   args.id,
        hotArgs:              args.hotArgs,
        tooltipChain:         args.tooltipChain,
        contextMenu:          args.contextMenu,
        customSave:           args.customSave,
        afterAddRow:          args.afterAddRow,
        saveChain:            bcdui.factory.objectRegistry.getObject(args.saveChain),
        saveParameters:       args.saveParameters,
        validationChain:      bcdui.factory.objectRegistry.getObject(args.validationChain),
        validationParameters: args.validationParameters,
        loadChain:            bcdui.factory.objectRegistry.getObject(args.loadChain),
        loadParameters:       args.loadParameters,
        allowNewRows:         args.allowNewRows || args.allowNewCells,
        columnFilters:        args.columnFilters,
        maxHeight:            args.maxHeight,
        isReadOnly:           args.isReadOnly
      });
    });
    return { refId: args.id, symbolicLink: true };
  }
});
