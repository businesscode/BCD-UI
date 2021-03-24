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
 * Data provider implementation reading far:Configuration document and providing data according to it, you can use this model if you solely want
 * to read data using far:Configuration.
 * @extends bcdui.core.AsyncJsDataProvider
 */
bcdui.component.far.FarModel = class extends bcdui.core.AsyncJsDataProvider
/** @lends bcdui.component.far.FarModel.prototype */
{
  /**
   * @param {object}                  args                      Parameter map contains the following properties:
   * @param {bcdui.core.DataProvider} args.config               Configuration document from http://www.businesscode.de/schema/bcdui/far-1.0.0
   * @param {string}                  [args.componentId=far]    An ID for the component, 'far' is the default. This is not the data provider's technical identifier,
   *                                                            this ID is used as component identifer to support multiple components on single page, i.e. reuse same configuration.
   * @param {bcdui.core.DataProvider} [args.statusModel=bcdui.wkModels.guiStatusEstablished]  The StatusModel, containing the filters at /SomeRoot/f:Filter
   */
  constructor(args){ // takes .config or .enhancedConfig
    // call super-constructor
    var bcdPreInit = args ? args.bcdPreInit : null;
      super(jQuery.extend(args, {
        bcdPreInit: function() {
          if (bcdPreInit)
            bcdPreInit.call(this);
          // checks
          args = jQuery.extend({}, args, {
            callback : this._execute.bind(this)
          });
          if(!(args.config || args.enhancedConfig)){
            throw "Requires either .config or .enhancedConfig parameter to be provided.";
          }
          args.componentId = args.componentId || "far";
    }}))

    // normalize defaults
    args.statusModel = args.statusModel || bcdui.wkModels.guiStatusEstablished;
    if(!args.enhancedConfig){
      args.enhancedConfig = bcdui.component.far.enhancer.createEnhancedConfiguration({
        config:       args.config,
        statusModel:  args.statusModel,
        componentId:  args.componentId
      });
    }

    // create request transformation
    this.requestModel = new bcdui.core.ModelWrapper({
      inputModel : args.enhancedConfig,
      chain : args.requestModelChain || bcdui.contextPath + "/bcdui/js/component/far/model/request.xslt", // internal API
      parameters : {
        statusModel: args.statusModel,
        componentId: args.componentId
      }
    });

    // create data model
    this.dataModel = new bcdui.core.SimpleModel({
      url : new bcdui.core.RequestDocumentDataProvider({ requestModel : this.requestModel })
    });
  }

  /**
   * @return data provider returning /Root/TotalRows yielding the total rows count for current request
   * @private
   */
  _getTotalRowsCountProvider(){
    if(!this.totalRowsCountProvider){
      var totalRowsModel = new bcdui.core.SimpleModel({
        url : new bcdui.core.RequestDocumentDataProvider({
          requestModel : new bcdui.core.ModelWrapper({
            inputModel : this.requestModel,
            chain : bcdui.contextPath + "/bcdui/js/component/far/model/totalRowsCountRequest.xslt"
          })
        })
      });
      // total rows count provider
      this.totalRowsCountProvider = new bcdui.core.DataProviderWithXPathNodes({
        xPath : "/*/wrs:Data/wrs:*[1]/wrs:C[1]", // is empty in case only-measures selected
        source : totalRowsModel
      });
      // propagate changes
      this.requestModel.onChange(totalRowsModel.execute.bind(totalRowsModel));
    }
    return this.totalRowsCountProvider;
  }

  /**
   * triggered by .execute()
   * @private
   */
  _execute(args){
    this.dataModel.onceReady(function(){
      args.setData(this.getData());
    });
    this.dataModel.execute();
  }
};
