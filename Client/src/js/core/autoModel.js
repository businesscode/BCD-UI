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
bcdui.core.AutoModel = bcdui._migPjs._classCreate(bcdui.core.SimpleModel,
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
   * @param {string}                  [args.filterBRefs]                  - Space separated list of bRefs in $guiStatus f:Filter to be used as filters.
   * @param {string}                  [args.orderByBRefs]                 - Space separated list of bRefs that will be used to order the data. This ordering has a higher priority over possible auto ordering by useCaptions or isDistinct.
   * @param {string}                  [args.initialFilterBRefs]           - Space separated list of bRefs in $guiStatus f:Filter to be used as filters for initial, very first request only. Unlike filterBRefs, these filter values are not monitored for changes.
   * @param {string}                  [args.mandatoryfilterBRefsSubset]   - Space separated subset of bRefs that needs to be set before the automodel gets data. Until available, no request will be run.
   * @param {boolean}                 [args.isDistinct=false]             - If true, a group by is generated across all columns by default wrq-stylesheet.
   * @param {boolean}                 [args.useCaptions=false]            - If true, caption = bRef+'_caption will be used.
   * @param {modelXPath}              [args.additionalFilterXPath]        - Allows using additional filters not part of $guiStatus f:Filter. These filters are monitored for changes. The given xPath needs to point to the filter expression itself, not to a parent.
   * @param {modelXPath}              [args.additionalPassiveFilterXPath] - Optional, allows using additional filters not part of $guiStatus f:Filter, unlike 'additionalFilterXPath', this xPath is not monitored for changes.
   * @param {number}                  [args.maxRows]                      - Optional, Limits the request to n rows. Use distinct if you need a certain order.
   *
   * @param {string}  [args.id]                   - A globally unique id for use in declarative contexts
   * @param {boolean} [args.isAutorefresh=false]  - If true, will reload when any (other) filter regarding a bRefs or the additionalFilterXPath change.
   * @param {string}  [args.url=WrsServlet]       - Optional, allows overwriting Wrs-servlet as source.
   *
   * @param {string} [args.reqDocStyleSheetUrl]   - Optional custom wrq-stylesheet URL to generate the request. Most parameters here only apply when using default wrq-styleshhet.
   * @param {Object} [args.reqDocParameters]      - Optional parameters for a custom request document builder.
   * @param {Array}  [args.reqDocChain]           - Optional custom chain for request document builder.
   * @example
   * // Create a simple AutoModel, reading distinct bindingItems 'country', 'region' and 'city' from BindingSet 'md_geo'
   * var am = new bcdui.core.AutoModel({ bindingSetId: "md_geo", bRefs: "country region city", isDistinct: true });
   */
  initialize: function(args)
    {
      var isLeaf = ((typeof this.type == "undefined")  ? "" + (this.type = "bcdui.core.AutoModel" ): "") != "";

      if( !args.reqDocChain && (typeof args.reqDocStyleSheetUrl == "undefined" || args.reqDocStyleSheetUrl == null || !args.reqDocStyleSheetUrl.trim() )) {
        // No stylesheet URL means the default requestDocumentBuilder.xslt is used
        args.reqDocStyleSheetUrl = (bcdui.config.jsLibPath + "wrs/requestDocumentBuilder.xslt");
      }

       // create the model wrapper that creates web row set request
       var params  = {
           bindingSetId: args.bindingSetId,
           bRefs:        args.bRefs,
           filterBRefs:  args.filterBRefs ,
           orderByBRefs:  args.orderByBRefs ,
           mandatoryFilterBRefs: args.mandatoryfilterBRefsSubset,
           isDistinct:   args.isDistinct ,
           useCaptions:  args.useCaptions,
           maxRows:      typeof args.maxRows != "undefined" ? args.maxRows : -1 };
       jQuery.extend( params, args.reqDocParameters || {} );

       // handle initialFilterBRefs via JSDataProvider
       if(args.initialFilterBRefs){
         var dataLink = new bcdui.core.JsDataProvider({
           doAllwaysRefresh : true,
           callback : function(initialFilterBRefs){
             // reset value once we have been used once
             if(this.hasBeenRun)return "";
             this.hasBeenRun = true;
             return initialFilterBRefs;
           }.bind(undefined,args.initialFilterBRefs)
         });
         params.initialFilterBRefs = dataLink;
       }

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

       var wrapperArgs = {
         chain: args.reqDocChain || args.reqDocStyleSheetUrl,
         inputModel: bcdui.wkModels.guiStatus,
         parameters: params
       };
       if (args.id)
         jQuery.extend( wrapperArgs, {id: args.id +"Req"} );  // if we have a given Id, we name the requestDoc accordingly

       var wrapper = new bcdui.core.ModelWrapper(wrapperArgs);

       var simpleModelArgs = {
           url: new bcdui.core.RequestDocumentDataProvider( { requestModel: wrapper, modelUrl: args.url } )
         , isAutoRefresh: args.isAutoRefresh
         , debug: args.debug
       };
       if (args.id)
         jQuery.extend( simpleModelArgs, {id: args.id} );  // if we have a given Id, use it 

       // create the desired model and inject the model wrapper as request document
       bcdui.core.SimpleModel.call(this, simpleModelArgs);

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
             idRef: bcdui.wkModels.guiStatus.id,
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

       if (isLeaf)
         this._checkAutoRegister();

       return this;
    }
});
