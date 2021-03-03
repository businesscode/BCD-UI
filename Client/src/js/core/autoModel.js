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
bcdui.core.AutoModel = class extends bcdui.core.SimpleModel
/**  @lends bcdui.core.AutoModel.prototype */
{
  /**
   * @classdesc
   * An AutoModel is an easy way for loading data from a BindingSet in many cases. At minimum just provide the BindingSet id and a list of bRefs.
   * @extends bcdui.core.SimpleModel
   * 
   * @constructs bcdui.core.AutoModel
   * @param {Object} args The parameter map contains the following properties. Most parameters only apply when using default wrq-styleshhet.
   * @param {string}                  args.bindingSetId                   - Id of BindingSet to read from.
   * @param {string}                  args.bRefs                          - Space separated list of bRefs to be loaded.
   * @param {string}                  [args.filterBRefs]                  - Space separated list of bRefs in $guiStatus f:Filter to be used as filters. TODO: add static
   * @param {string}                  [args.orderByBRefs]                 - Space separated list of bRefs that will be used to order the data. This ordering has a higher priority over possible auto ordering by useCaptions or isDistinct. A minus(-) sign at the end indicates descending sorting.
   * @param {string}                  [args.initialFilterBRefs]           - Space separated list of bRefs in $guiStatus f:Filter to be used as filters for initial, very first request only. Unlike filterBRefs, these filter values are not monitored for changes.
   * @param {string}                  [args.mandatoryFilterBRefsSubset]   - Space separated subset of bRefs that needs to be set before the automodel gets data. Until available, no request will be run.
   * @param {boolean}                 [args.isDistinct=false]             - If true, a group by is generated across all columns by default wrq-stylesheet. Parameter .groupByBRefs is ignored in this case.
   * @param {boolean}                 [args.useCaptions=false]            - If true, caption = bRef+'_caption will be used.
   * @param {modelXPath}              [args.additionalFilterXPath]        - Allows using additional filters not part of $guiStatus f:Filter. These filters are monitored for changes. The given xPath needs to point to the filter expression itself, not to a parent.
   * @param {modelXPath}              [args.additionalPassiveFilterXPath] - Optional, allows using additional filters not part of $guiStatus f:Filter, unlike 'additionalFilterXPath', this xPath is not monitored for changes.
   * @param {number}                  [args.maxRows]                      - Optional, Limits the request to n rows. Use distinct if you need a certain order.
   *
   * @param {string}                  [args.id]                           - A globally unique id for use in declarative contexts
   * @param {boolean}                 [args.isAutoRefresh=false]          - If true, will reload when any (other) filter regarding a bRefs or the additionalFilterXPath change.
   *
   * @param {string}                  [args.reqDocStyleSheetUrl]          - Optional custom wrq-stylesheet URL to generate the request. Most parameters here only apply when using default wrq-styleshhet.
   * @param {Object}                  [args.reqDocParameters]             - Optional parameters for a custom request document builder.
   * @param {Array}                   [args.reqDocChain]                  - Optional custom chain for request document builder.
   * @param {bcdui.core.DataProvider} [args.statusModel=bcdui.wkModels.guiStatus] - the status model to resolve .filterBRefs against
   * @param {bcdui.core.DataProvider} [args.statusModelEstablished]       - the established status model to provide to ModelWrapper creating request document
   * @param {string}                  [args.groupByBRefs]                 - Space separated list of bRefs for grouping. Is not effective when using .isDistinct=true parameter.   
   * @param {document|element}        [args.filterElement]                - custom filter element (f:And, f:Or, f:Not, f:Expression) which is connected via f:And to other filters
   * @param {Object}                                        [args.saveOptions]         - An object, with the following elements
   * @param {chainDef}                                      [args.saveOptions.saveChain]              - The definition of the transformation chain
   * @param {Object}                                        [args.saveOptions.saveParameters]         - An object, where each property holds a DataProvider, used as a transformation parameters.
   * @param {boolean}                                       [args.saveOptions.reload=false]           - Useful especially for models of type SimpleModel for refreshing from server after save
   * @param {function}                                      [args.saveOptions.onSuccess]              - Callback after saving (and optionally reloading) was successfully finished
   * @param {function}                                      [args.saveOptions.onFailure]              - Callback on failure, is called if error occurs
   * @param {function}                                      [args.saveOptions.onWrsValidationFailure] - Callback on serverside validate failure, if omitted the onFailure is used in case of validation failures
   * @param {bcdui.core.DataProvider}                       [args.saveOptions.urlProvider]            - dataprovider holding the request url (by default taken from the underlying simple model url)
   * @example
   * // Create a simple AutoModel, reading distinct bindingItems 'country', 'region' and 'city' from BindingSet 'md_geo'
   * var am = new bcdui.core.AutoModel({ bindingSetId: "md_geo", bRefs: "country region city", isDistinct: true, filterElement:bcdui.util.xml.parseFilterExpression("country='DE'") });
   */
  constructor(args)
    {
      if( !args.reqDocChain && (typeof args.reqDocStyleSheetUrl == "undefined" || args.reqDocStyleSheetUrl == null || !args.reqDocStyleSheetUrl.trim() )) {
        // No stylesheet URL means the default requestDocumentBuilder.xslt is used
        args.reqDocStyleSheetUrl = (bcdui.config.jsLibPath + "wrs/requestDocumentBuilder.xslt");
      }
      
      var statusModel = args.statusModel||bcdui.wkModels.guiStatus;

       // create the model wrapper that creates web row set request
       var params  = {
           bindingSetId: args.bindingSetId,
           bRefs:        args.bRefs,
           filterBRefs:  args.filterBRefs ,
           orderByBRefs:  args.orderByBRefs ,
           groupByBRefs:  args.groupByBRefs,
           mandatoryFilterBRefs: args.mandatoryfilterBRefsSubset || args.mandatoryFilterBRefsSubset,
           isDistinct:   args.isDistinct ,
           useCaptions:  args.useCaptions,
           statusModel:  statusModel,
           maxRows:      typeof args.maxRows != "undefined" ? args.maxRows : -1 };
       jQuery.extend( params, args.reqDocParameters || {} );

       if (typeof args.additionalFilterXPath != "undefined" && args.additionalFilterXPath != null && ! !args.additionalFilterXPath.trim()) {
         var modelParams = bcdui.factory._extractXPathAndModelId(args.additionalFilterXPath);
         args.additionalFilterXPath = modelParams.xPath;
         args.additionalFilterModel = bcdui.factory.objectRegistry.getObject(modelParams.modelId); 
         params.additionalFilterXPath = new bcdui.core.DataProviderWithXPathNodes({ source: args.additionalFilterModel, xPath: args.additionalFilterXPath});
       }

       if (typeof args.additionalPassiveFilterXPath != "undefined" && args.additionalPassiveFilterXPath != null && ! !args.additionalPassiveFilterXPath.trim()) {
         var modelParams = bcdui.factory._extractXPathAndModelId(args.additionalPassiveFilterXPath);
         args.additionalPassiveFilterXPath = modelParams.xPath;
         args.additionalPassiveFilterModel = bcdui.factory.objectRegistry.getObject(modelParams.modelId);
         params.additionalPassiveFilterXPath = new bcdui.core.DataProviderWithXPathNodes({ source: args.additionalPassiveFilterModel, xPath: args.additionalPassiveFilterXPath });
       }

       // take provided chain (or stylesheet) and append the last step to merge .filterElement, if such was provided
       var wrapperChain = args.reqDocChain || args.reqDocStyleSheetUrl;

       if(!Array.isArray(wrapperChain)){
         wrapperChain = [wrapperChain];
       }

       if(args.filterElement){
         wrapperChain = wrapperChain.concat(doc => {
           doc.selectSingleNode("//f:Filter").appendChild(doc.importNode(args.filterElement.selectSingleNode("f:*"), true))
           return doc;
         });
       }

       var wrapperArgs = {
         chain: wrapperChain,
         inputModel: statusModel,
         parameters: params,
         statusModel: statusModel,
         statusModelEstablished: args.statusModelEstablished
       };
       if (args.id)
         jQuery.extend( wrapperArgs, {id: args.id +"Req"} );  // if we have a given Id, we name the requestDoc accordingly

       var wrapper = new bcdui.core.ModelWrapper(wrapperArgs);

       var simpleModelArgs = {
           url: new bcdui.core.RequestDocumentDataProvider( { requestModel: wrapper, modelUrl: args.url, uri: args.uri } )
         , isAutoRefresh: args.isAutoRefresh
         , debug: args.debug
         , saveOptions: args.saveOptions
       };
       if (args.id)
         jQuery.extend( simpleModelArgs, {id: args.id} );  // if we have a given Id, use it 

       // create the desired model and inject the model wrapper as request document
        var bcdPreInit = args ? args.bcdPreInit : null;
        super(jQuery.extend(args, {
        bcdPreInit: function() {
          if (bcdPreInit)
            bcdPreInit.call(this);
            // urspruenglicher this krempel vor super
            this.type = this.getClassName();

            // handle initialFilterBRefs via JSDataProvider
            if(args.initialFilterBRefs){
              var dataLink = new bcdui.core.JsDataProvider({
                doAllwaysRefresh : true,
                callback : function(initialFilterBRefs){
                  // reset value once we have been used once
                  if(this.hasBeenRun)return "";
                  this.hasBeenRun = true;
                  return initialFilterBRefs;
                }.bind(this,args.initialFilterBRefs)
              });
              params.initialFilterBRefs = dataLink;
            }
          }}))

       // create the xpath for gui status data listener from given filter Refs
       if (typeof args.filterBRefs != "undefined" && args.filterBRefs != null && !!args.filterBRefs.trim()) {
         var filters = args.filterBRefs.split(" ");
         var xpath = "/*/f:Filter//f:Expression"
         for(var i = 0; i < filters.length; i++){
           if (i == 0 ) { xpath = xpath  +'['}
           if (i > 0 ){ xpath =  xpath + " or "; }
           xpath = xpath + " @bRef = '" + filters[i] + "'";
         }
         if (filters.length > 0 ) {  xpath = xpath + " ]";}

         // create listener that updates the model wrapper if filters were changed
         if( args.isAutoRefresh ) {
           bcdui.factory.addDataListener({
             idRef: statusModel.id,
             trackingXPath: xpath,
             listener: function() {
               wrapper.execute(true);
             }
           });
         }
       }

       if (args.additionalFilterXPath && args.additionalFilterModel) {
         if (args.isAutoRefresh){
         // create listener that updates the model wrapper if filters were changed
           bcdui.factory.addDataListener({
             idRef: args.additionalFilterModel.id,
             trackingXPath: args.additionalFilterXPath,
             // instead of wrapper execution, set status to dirty
             listener: function() {
               wrapper.execute(true);
             }
           });
         }
       }
       return this;
    }

    getClassName() {return "bcdui.core.AutoModel";}
};
