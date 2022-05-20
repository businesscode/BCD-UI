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
 * FAR configurator as jQuery Widget, writes far:Layout into targetModelXPath
 */
(function($){
  $.widget("bcdui.bcduiFarConfigurator", $.bcdui.bcduiWidget, {
    /**
     * @private
     */
    _getCreateOptions : function(){
      return bcdui.component.far.impl.readParams.farConfigurator(this.element[0]);
    },
    /**
     * @private
     */
    _validateOptions : function(){
      bcdui.component.far.impl.validateParams.farConfigurator(this.options);
    },
    /**
     * Works with cascading models, writes into internal status model and syncs to / from targetModelXPath (far:Layout)
     * @private
     */
    _create : function(){
      this._super();
      
      // create ids
      $.extend(true, this.options,{
        // the sorting chooser gets own adapted model
        sortingChooserModelId : this.id + "_sorting"
        // widget ids
        , chooserIds : {
          dims : this.id + "_dims",
          meas : this.id + "_meas",
          sort : this.id + "_sort"
        }
      });
      
      // internal status model we work on
      this.internalStatusModel = new bcdui.core.StaticModel({
        id: this.id + "_status",
        data: "<guiStatus:Status/>"
      });
      // our mashed up widgets write to here
      this.options.internalTargetModelXPath = "$" + this.internalStatusModel.id + "/*";
      
      // augment treeConfig valueAttrName, captionAttrName (derive from options xpath)
      var _getAttrName = function(xpath){return xpath.substr(xpath.lastIndexOf("@")+1)}; // helper
      this.options.dimensions_treeConfig.valueAttrName = _getAttrName(this.options.dimensions_optionsModelRelativeValueXPath);
      this.options.dimensions_treeConfig.captionAttrName = _getAttrName(this.options.dimensions_optionsModelXPath);
      this.options.measures_treeConfig.valueAttrName = _getAttrName(this.options.measures_optionsModelRelativeValueXPath);
      this.options.measures_treeConfig.captionAttrName = _getAttrName(this.options.measures_optionsModelXPath);

      var modelInit = function(){
        // sorting data provider
        var sortingChooserModel = new bcdui.core.ModelWrapper({
          id :  this.options.sortingChooserModelId,
          chain : bcdui.contextPath + "/bcdui/js/component/far/configurator/sorting-adapter.xslt",
          parameters : {
            statusLayoutElement:    new bcdui.core.DataProviderWithXPathNodes({ xPath: this.options.internalTargetModelXPath }),
            dimensions:             new bcdui.core.DataProviderWithXPathNodes({ xPath: this.options.dimensions_optionsModelXPath + "/.." }),
            measures:               new bcdui.core.DataProviderWithXPathNodes({ xPath: this.options.measures_optionsModelXPath + "/.." }),
            idAttrDimension:        this.options.dimensions_treeConfig.valueAttrName,
            captionAttrDimension:   this.options.dimensions_treeConfig.captionAttrName,
            idAttrMeasure:          this.options.measures_treeConfig.valueAttrName,
            captionAttrMeasure:     this.options.measures_treeConfig.captionAttrName,
            sortingItemSeparator:   bcdui.core.magicChar.separator
          }
        });
        // update our chooser model if internal status changes
        this.internalStatusModel.onChange(sortingChooserModel.execute.bind(sortingChooserModel));
        
        // renders entire layout and containers for the choosers
        new bcdui.core.Renderer({
          chain : bcdui.contextPath + "/bcdui/js/component/far/configurator/rendering.dott",
          targetHtml : this.element,
          parameters : {
            // currently a value is expected to be a primitive (or dataprovider)
            dimsChooserId : this.options.chooserIds.dims,
            measChooserId : this.options.chooserIds.meas,
            sortChooserId : this.options.chooserIds.sort
          }
        })
        .onceReady(function(){
          bcdui.i18n.syncTranslateHTMLElement({elementOrId:this.element.get(0)});
          this._initChoosers();
        }.bind(this));
      }.bind(this);

      // syncronizers between internal and external model, build internal model from target
      this._deploySynchronizers(modelInit);
    },

    /**
     * create and deploy synchronizers between internal status model and target model
     * @private
     */
    _deploySynchronizers : function(cbInitialInternalReady){
      /*
       * internal => external
       */
      var adapterToExternal = new bcdui.core.ModelWrapper({
        inputModel : this.internalStatusModel,
        chain: bcdui.contextPath + "/bcdui/js/component/far/configurator/internal-to-layout.xslt",
        parameters: {
          sortingItemSeparator : bcdui.core.magicChar.separator
        }
      });
      // propagate internalStatusModel updates to adapterToExternal
      this.internalStatusModel.onChange(function(){
        if(this.internalStatusModel._selfUpdate){
          delete this.internalStatusModel._selfUpdate;
          return; // skip self-update triggered from our adapter
        }
        adapterToExternal.onceReady(function(){
          this._copyNodeToTarget(
              adapterToExternal.getData().selectSingleNode("/*[*]"),
              this._getTargetSelector().getDataProvider(),
              this._getTargetSelector().xPath
          );
        }.bind(this));
        adapterToExternal.execute();
      }.bind(this), "/*");

      /*
       * internal <= external
       */
      var adapterToInternal = new bcdui.core.ModelWrapper({
        chain: bcdui.contextPath + "/bcdui/js/component/far/configurator/layout-to-internal.xslt",
        parameters: {
          sortingItemSeparator : bcdui.core.magicChar.separator,
          targetLayoutElement : new bcdui.core.DataProviderWithXPathNodes({ xPath: this.options.targetModelXPath })
        }
      });
      var syncExternalToInternal = function(callback){
        adapterToInternal.onceReady(function(){
          // can takeover dataDoc reference, no need to clone
          this.internalStatusModel.dataDoc = adapterToInternal.getData();
          this.internalStatusModel._selfUpdate = true;
          this.internalStatusModel.fire();
          callback && callback();
        }.bind(this));
        adapterToInternal.execute();
      }.bind(this);
      // propagate changes on external to adapterToInternal
      this._setOnTargetModelChange(syncExternalToInternal);

      syncExternalToInternal(cbInitialInternalReady); // run once on initial call and pass the callback
    },

    /**
     * helper function to copy an element into given targetXPath with option to remove in targetxpath
     * @param {element}                 srcElement  The element to copy, may be null to remove in target
     * @param {bcdui.core.DataProvider} dstDp       Target data provider
     * @param {string}                  dstXPath    xpath within dstDp
     *
     * @private
     */
    _copyNodeToTarget : function(srcElement, dstDp, dstXPath){
      // remove target element
      bcdui.core.removeXPath(dstDp.getData(), dstXPath, false);
      // create only if we have something in output
      if(srcElement){
        // create (with ancestors)
        var targetElement = bcdui.core.createElementWithPrototype(dstDp.getData(), dstXPath, false);
        // clone
        targetElement.appendChild(srcElement.cloneNode(true));
      }
      dstDp.fire();
    },

    /**
     * call this function as soon as our this.element contains containers for them,
     * as defined by this.options.chooserIds
     * @private
     */
    _initChoosers : function(){
      var captions = {
          source : bcdui.i18n.TAG + "bcd_FarConfigurator_Sbsc_Src",
          target : bcdui.i18n.TAG + "bcd_FarConfigurator_Sbsc_Trg"
      };
      // dimensions chooser
      jQuery("#" + this.options.chooserIds.dims).bcduiSideBySideChooserNg({
        optionsModelXPath:                this.options.dimensions_optionsModelXPath
        , optionsModelRelativeValueXPath: this.options.dimensions_optionsModelRelativeValueXPath
        , targetModelXPath:               this.options.internalTargetModelXPath + "/far:Dimensions/far:Item"
        , sourceCaption :                 captions.source
        , targetCaption :                 captions.target
        , treeConfig :                    this.options.dimensions_treeConfig
        , doSortOptions :                 this.options.doSortOptions
      });
      // measures chooser
      jQuery("#" + this.options.chooserIds.meas).bcduiSideBySideChooserNg({
        optionsModelXPath:                this.options.measures_optionsModelXPath
        , optionsModelRelativeValueXPath: this.options.measures_optionsModelRelativeValueXPath
        , targetModelXPath:               this.options.internalTargetModelXPath + "/far:Measures/far:Item"
        , sourceCaption :                 captions.source
        , targetCaption :                 captions.target
        , treeConfig :                    this.options.measures_treeConfig
        , doSortOptions :                 this.options.doSortOptions
      });
      // sorting chooser
      var sortingSbsc = jQuery("#" + this.options.chooserIds.sort).bcduiSideBySideChooserNg({
        optionsModelXPath: "$" + this.options.sortingChooserModelId + "/*/far:Sorting/far:Items/far:Item/@label"
        , optionsModelRelativeValueXPath: "../@id"
        , optionsModelRelativeFilterPredicate: "[../@doShow='true']"
        , targetModelXPath: this.options.internalTargetModelXPath + "/far:Sorting/far:Item"
        , sourceCaption : captions.source
        , targetCaption : captions.target
        , doSortOptions : this.options.doSortOptions
        , onBeforeChange : function(args){
          if(args.itemCount > 1 && args.dir == "src2dst"){
            // fix items: keep only one candidate of asc/desc, we have to rewrite args.scope.item jQuery object
            var _map = {}; // hash to filter dups
            args.scope.items = args.scope.items.filter(function(){
              var value = this.getAttribute("bcdvalue");
              // extract id (without .desc / .asc) suffix, align logic with sorting-adapter.xslt which defines these tokens
              value = value.substring(0, value.lastIndexOf(bcdui.core.magicChar.separator));
              if(!(value in _map)){
                _map[value] = null;
                return true;
              }
              return false;
            });
          }
          return true;
        }
      });

      // inject categeroy selector into SBSC layout
      jQuery("<tr><td></td></tr>")
      .insertBefore(sortingSbsc.find(".bcdCol").parent()) // tr of td.bcdCol
      .children("td")
      .bcduiSingleSelectNg({
        optionsModelXPath: "$" + this.options.sortingChooserModelId + "/*/far:Sorting/far:Categories/far:Item"
        , optionsModelRelativeValueXPath : "@id"
        , targetModelXPath:this.options.internalTargetModelXPath + "/far:SortingCategory"
      });
    }
  });
})( jQuery );

/**
 * @namespace bcdui.component.far
 */
bcdui.component.far.farConfigurator = Object.assign(bcdui.component.far.farConfigurator,
/** @lends bcdui.component.far.farConfigurator */
{
  /**
   * @param {targetHtml} htmlElement Creates a widget in given html element
   */
  init : function(htmlElement){
    jQuery(htmlElement).bcduiFarConfigurator();
  },

  /**
   * 
   */
  getNavPath: function(id, callback) {
    return callback(id, "");
  }
});
