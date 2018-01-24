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
 * API for an SingleSelectPackage implementation as jQuery Widget
 * This widget offers mobile and custom implementation dependending on the browser. 'mobile' is referred to as 'native'
 * whereas custom implementation is custom.
 *
 * native functions are implemented with "_ntv_" prefix, whereas custom implementation functions are
 * prefixed with "_cst_" prefixes.
 *
 * #SELECT constraint bug IE#
 * IE has a bug with SELECT element and required flag, the native .checkValidity() returns
 * TRUE for empty selection in update handler when switching from some valid to empty selection,
 * however, after the update event handling .hasValidity() returns FALSE. Therefore we dont use
 * native constraint check hence not stick -required- to the SELECT element,
 * rather we attach our custom validator.
 */
(function(){
  jQuery.widget("bcdui.bcduiSingleSelectNg", jQuery.bcdui.bcduiWidget, {
    /**
     * @private
     */
    _getCreateOptions : function(){
      return bcdui.widgetNg.impl.readParams.singleSelect(this.element[0]);
    },
    /**
     * @private
     */
    _validateOptions : function(){
      bcdui.widgetNg.impl.validateParams.singleSelect(this.options);
    },

    /**
     * implement destroy, here we tidy up listeners and other stuff also related to PrototypeJS
     * @private
     */
    _destroy : function(){
      this._super();
      // actually confusing but listeners check this status to stop
      this.isDestroyed=true;
      var htmlElementId = this.options.id;
      var el = bcdui._migPjs._$(htmlElementId);

      // ## move on with prototypeJS tidy up ##
      if(el.length > 0){
        el.off();
        el.data("_args_",   null);
        el.data("_config_", null);
      }

      // ## now detach listeners
      this.updateValueListener.unregister();
      this.updateValueListener = null;
    },

    /**
     * @private
     */
    _create : function() {
      this._super();
      bcdui.log.isTraceEnabled() && bcdui.log.trace("initializing SingleSelect");

      var rootContainer = bcdui._migPjs._$(this.element[0]);
      var args = this.options;
      var self = this;

      // handle empty placeholder as no placeholder
      if (this.options.placeholder && this.options.placeholder == "")
        delete this.options.placeholder;

      // TODO rename htmlElementId to inputElementId
      var config = {
          target: bcdui.factory._extractXPathAndModelId(args.targetModelXPath),
          htmlElementId: "singleSelect_" + args.id,
          // for inputWidget compatibility
          extendedConfig:{}
      };

      var isNative = true;
      config.isNative = isNative;

      bcdui.log.isTraceEnabled() && bcdui.log.trace("type: " + args.type);
      bcdui.log.isTraceEnabled() && bcdui.log.trace("native: " + isNative);

      // TODO: rename, controlEl is actually the selectElement
      var controlEl;

      if(isNative){
        controlEl = this._ntv_createInputControl(args, config);
      }else{
        // custom implementation TODO
        this.element.text("!no native widget support for this browser!");
        bcdui.log.warn("no custom implementtion todo");
        return;
      }

      controlEl = bcdui._migPjs._$(controlEl);

      // in case of jQM - install refresher and some workarounds
      if(typeof jQuery != "undefined"){
        controlEl.on(bcdui.widgetNg.utils.EVENT.SYNC_READ, bcdui.widgetNg.utils._jqmRefresh.bind(undefined,controlEl.get(0).id));
        var _loadingDiv = jQuery("<div></div>").css({
          "position":"relative",
          "width":"16px",
          "height":"16px"
        }).addClass("statusNotReady");
        // workaround for jqm, as it overlays our native SELECT with his custom layer
        rootContainer.data("__LOADING_INDICATOR__", _loadingDiv.get(0));
        this.setVisible(false);
        rootContainer.parent().get(0).appendChild(_loadingDiv.get(0));
      }

      rootContainer.append(controlEl);

      controlEl.data("_args_", args);
      controlEl.data("_config_", config);

      // complete initialization once dependencies has been loaded TODO applicable in native?
      // TODO add to utils
      bcdui.widgetNg.utils._setUnsetFieldLoadingStatus(controlEl.get(0), true);

      // dependencies to sync for
      config.dependencies = [config.target.modelId];

      var rawOptionsRef = bcdui.factory._extractXPathAndModelId(args.optionsModelXPath);
      // initially we also wait for the raw options model (will be wrapped later)
      if(rawOptionsRef.modelId){
        config.dependencies.push(rawOptionsRef.modelId);
      }

      // add observers and listeners
      {
        controlEl.on("change", bcdui.widgetNg.utils.updateValue.bind(undefined,controlEl.get(0).id));

        // listen to updates on model
        this._setOnTargetModelChange(function(){
          try{
            if(!this._writingData){
              bcdui.widgetNg.utils._syncValue(config.htmlElementId);
            }
          } finally {
            this._writingData = false;
          }
        }.bind(this));
      }

      bcdui.log.isTraceEnabled() && bcdui.log.trace("dependencies: " + config.dependencies);

      // complete initialization once dependencies has been loaded
      bcdui.factory.objectRegistry.withReadyObjects({
          ids:config.dependencies,
          fn:function(args, config, controlElement, rootContainer, widgetInstance){
            bcdui.log.isTraceEnabled() && bcdui.log.trace("dependencies loaded patching options model");
            // now we can build our options model wrapper and wait for it to get ready, we can use optimization since we not rely on //Values/Value normalization
            config.isOptionsModelNormalized = bcdui.widgetNg.utils._patchOptionsModel(args, config, controlElement, null, true);
            bcdui.log.isTraceEnabled() && bcdui.log.trace("source configuration is now ", config.source);
            bcdui.factory.objectRegistry.withReadyObjects(config.source.modelId, function(){
              if(widgetInstance.isDestroyed){ // can happen that
                if(window["console"] && bcdui.isDebug){
                  console.warn("widget initialization after destroy()", widgetInstance);
                }
                return;
              }
              // here we finalize the initialization
              try{
                if(config.isNative){
                  widgetInstance._ntv_init(controlElement);
                }else{
                  //bcdui.widgetNg.suggestInput._cst_init(controlElement);
                }
              }finally{
                // attach validators
//                bcdui.widgetNg.suggestInput._attachValidators(controlElement);

                // read more on this workaround in #SELECT constraint bug IE# docfeed in widget description
                if(args.required && ( !bcdui.browserCompatibility._hasFeature("input.required") || bcdui.browserCompatibility.isIE )){
                  bcdui.widgetNg.utils._addValidator(controlElement.id, bcdui.widgetNg.validation.validators.widget.notEmptyValidator);
                }

                // add validator
                bcdui.widgetNg.utils._addValidator(controlElement.id, bcdui.widgetNg.validation.validators.widget.existingValueValidator);
                // reset loadings status
                bcdui.widgetNg.utils._setUnsetFieldLoadingStatus(controlElement.id, false);
                // run explicit validation
                bcdui.widgetNg.utils._validateElement(controlElement);
                // sync the bound model value once
                bcdui.widgetNg.utils._syncValue(config.htmlElementId);
                bcdui.log.isTraceEnabled() && bcdui.log.trace("initialized " + args.id);

                // display after initialization (jqm workaround)
                {
                  var loadIndicator = rootContainer.data("__LOADING_INDICATOR__");
                  if(loadIndicator){
                    rootContainer.parent().get(0).removeChild(loadIndicator);
                    rootContainer.data("__LOADING_INDICATOR__", null)
                    self.setVisible(true);
                  }
                }

                // set autofocus after display
                if(args.autofocus){
                  jQuery(controlEl).focus();
                }

                if (! args.disableNavPath) {
                  bcdui.widgetNg.singleSelect.getNavPath(args.id, function(id, value) {
                    bcdui.widget._linkNavPath(id, value);
                  }.bind(this));
                }
              }
            }, false);
          }.bind(undefined,args, config, controlEl.get(0), rootContainer, this)
      }, false);
    },

    
    /**
     * forces widget to write its current content to targetModelXPath
     */
    manifestValue: function() {
      bcdui.widgetNg.utils.updateValue.bind(this, this.element.children().first().get(0).id);
    },

    /**
     * syncs widget to options data provider and update the internal datalist element
     * with values from source and re-validates the widget.
     *
     * @param htmlElementId
     *
     * @private
     */
    _ntv_syncToOptionsProvider: function(htmlElementId){
      var el = bcdui._migPjs._$(htmlElementId);
      var config = el.data("_config_");
      var args = el.data("_args_");
      var dataListEl = bcdui._migPjs._$(config.dataListElementId).get(0);
      var currentDataValue=bcdui.widgetNg.utils._readDataFromXML(htmlElementId).value;

      bcdui.log.isTraceEnabled() && bcdui.log.trace("(singleSelect._ntv_syncToOptionsProvider)updating the data list, current model value: " + currentDataValue);

      // remove all options under dataListEl
      jQuery(dataListEl).empty();

      // used within forEachFunc loop to detect the first run for the "please select" option
      var optionContextScope = {
          captionNode : jQuery("<option value='' bcdTranslate='" + this.options.placeholder + "'></option>"),
          isFirst: true,
          hasSelectedValue: false
      }

      // returns { value, caption }
      var getNodeValueCaption = null;

      // either read value/caption from xPath or optionsModelRelativeValueXPath/xPath according to config.source
      if(config.source.optionsModelRelativeValueXPath){
        getNodeValueCaption = function(node){
          return {
            value   : node.selectSingleNode(config.source.optionsModelRelativeValueXPath).text,
            caption : node.text
          };
        };
      }else{
        getNodeValueCaption = function(node){
          return {
            value   : node.text,
            caption : node.text
          };
        };
      }

      // copy all options into dataListEl, tag selected
      // TODO reuse / externalize?
      var self = this;
      bcdui.widgetNg.utils._updateInternalOptions({
        htmlElementId: el.get(0),
        doSort : args.doSortOptions && !config.isOptionsModelNormalized,  // in case we have no optionsmodel wrapper we have to care about sorting
        // this function is called on every node selected by config.source.xPath
        forEachFunc: function(index, attrNode){

          // add placeholder as first option
          if (self.options.placeholder && optionContextScope.isFirst)
            dataListEl.appendChild(optionContextScope.captionNode.get(0));
          optionContextScope.isFirst=false;

          var valueObject = getNodeValueCaption(attrNode);

          var opts = {value: valueObject.value};

          // only one can be selected here (singleSelect)
          if(!optionContextScope.hasSelectedValue && currentDataValue == valueObject.value){
            optionContextScope.hasSelectedValue = true;
            opts.selected = "selected";
          }

          // dom api for speed
          var el = document.createElement("option");
          for(var name in opts){
            el.setAttribute(name, opts[name]);
          }
          el.innerHTML = valueObject.caption;

          dataListEl.appendChild(el);
        },
        onReadyFunc: function(el, dataListEl, widgetInstance){
          // check if we have selected value, otherwise set "Please select" selector as selected
          if(!optionContextScope.hasSelectedValue){
            optionContextScope.captionNode.attr("selected","selected");
          }
          // apply i18n
          bcdui.i18n.syncTranslateHTMLElement({elementOrId:el});
          // respect jQueryMobile overlays
          bcdui.widgetNg.utils._jqmRefresh(el.id, true);
          // re-validate widget
          bcdui.widgetNg.utils._validateElement(el);
          // un/set bcd-singleselect-empty class if has no options
          var options = dataListEl.getElementsByTagName("option");
          if(options.length == 0){
            jQuery(dataListEl).addClass("bcd-singleselect-empty");
          }else{
            jQuery(dataListEl).removeClass("bcd-singleselect-empty");
          }

          if ( ! currentDataValue || ! bcdui.widgetNg.validation.hasValidStatus(el) ) {
            // enable first option when doAutoSelectSolelyOption is enabled (only if you also got only one option at all)
            // or in case of no placeholder use, then the first item is used directly and we need to make sure the value is written to the target initially
            if (
                (widgetInstance.options.doAutoSelectSolelyOption && options.length == 2)
                ||
                (! widgetInstance.options.placeholder && options.length > 0)
                ) { 

              var solelyValue = options[0].getAttribute("value");
              // escape stack
              setTimeout( widgetInstance._syncWrite.bind(undefined,el, solelyValue) );
            }
          }
        }.bind(undefined,el.get(0), dataListEl, this)
      });
    },

    /**
     * initializes a native SELECT implementation, all dependencies are resolved and can be access here w/o sync
     *
     * - declares 'list'-attribute on the input-element and binds to the datalist
     * - attaches handlers to listen to options-model which populate the 'datalist' input element is bound to
     *
     * @param htmlElementId of the controller element (or the controller element itself)
     * @private
     */
    _ntv_init: function(htmlElement){

      var el = bcdui._migPjs._$(htmlElement);

      bcdui.log.isTraceEnabled() && bcdui.log.trace("native selectInput initialization");
      // TODO: use jq api (data)
      var config = el.data("_config_");
      // datalist is THE native html SELECT element
      config.dataListElementId = el.get(0).id;

      // update the data list initially
      this._ntv_syncToOptionsProvider(el.get(0));

      // register listener on the options to update the list
      bcdui.log.isTraceEnabled() && bcdui.log.trace("register options update listener on source; for el# " + el.get(0).id, config.source);
      // TODO: extract?

      this.updateValueListener = bcdui.widgetNg.utils._registerDataListener({
        idRef: config.source.modelId,
        trackingXPath: config.source.valueXPath,
        htmlElementId: el.get(0).id,
        updateValueCallback: function(htmlElementId, widgetInstance){
          bcdui.log.isTraceEnabled() && bcdui.log.trace("source (options) model changed, updating widget...");

          // re-validate widget once options have changed
          // TODO: use jq instead of Pjs
          var el = bcdui._migPjs._$(htmlElementId);
          var isValid = bcdui.widgetNg.utils._validateElement(el.get(0));
          // if not valid - remove the value
          if(!isValid){
            bcdui.log.isTraceEnabled() && bcdui.log.trace("current widget value invalid - removing");
            widgetInstance._syncWrite(htmlElementId,"");
          }
          widgetInstance._ntv_syncToOptionsProvider(htmlElementId);
        }.bind(undefined,el.get(0).id, this)
      });
    },

    /**
     * syncs current input value (or optionally given value) of the widget into model
     *
     * @param optNewValue {String?} if this value is given, the input control will be updated by this value and then synced to model
     *                              otherwise current controls value is synced to the model
     *
     * @static
     * @private
     */
    _syncWrite: function(htmlElementId, optNewValue){
      var el = bcdui._migPjs._$(htmlElementId);
      if(bcdui.util.isString(optNewValue)){
        el.get(0).value = optNewValue;
      }
      bcdui.widgetNg.utils.updateValue(el.get(0));
    },

    /**
     * @return html select element to attach
     *
     * @private
     */
    _ntv_createInputControl: function(args, config){
      var el = jQuery("<select></select>");
      el.attr("id", config.htmlElementId);
      // the hints are handled by balloons
      el.attr("bcdHint", args.hint);
      el.attr("tabindex", args.tabindex);
      el.attr("autofocus", args.autofocus);
      //el.attr(args.placeholder, "placeholder");
      // read more on in #SELECT constraint bug IE# in widget description
      if(!bcdui.browserCompatibility.isIE){
        el.attr("required", args.required);
      } else {
        el.attr("bcdrequired", args.required);
      }

      // TODO fix: handle in init
      if(args.disabled){
        el
        .prop("disabled", true)
        .attr("disabled","disabled")
        .addClass("bcdDisabled")
        ;
      }

      return el.get(0);
    },

    /**
     * sets or unsets the widgets loading status
     * TODO: make avaiable widget-globally?
     * TODO: handle via disabled/enabled rather than readonly
     * TODO: use jq
     *
     * @private
     */
    _setUnsetFieldLoadingStatus: function(htmlElementId, isLoading){
      var el = bcdui._migPjs._$(htmlElementId);
      if(isLoading){
        el.addClass("bcdLoading");
        el.attr("readonly","readonly");
      }else{
        el.removeClass("bcdLoading");
        el.attr("readonly", null);
      }
    },

    validate : function(){
      bcdui.widgetNg.utils._validateElement(this.element.find("select").first());
    }
  });
}());

/**
 * A namespace for the BCD-UI singleSelect widget. For creation @see {@link bcdui.widgetNg.createSingleSelect}
 * @namespace bcdui.widgetNg.singleSelect
 */
bcdui.util.namespace("bcdui.widgetNg.singleSelect",
  /** @lends bcdui.widgetNg.singleSelect */
  {
  /**
   * initializes the widget according to the API
   *
   * @param element {Element} to initialize from
   * @private
   */
  init : function(htmlElement){
    bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui input widget adapter init");
    jQuery(htmlElement).bcduiSingleSelectNg();
  },

  /**
   * @param {string} id targetHtml of widget
   * @param {function} callback to be called with generated caption
   * @return {string} NavPath information via callback for widget
   */
  getNavPath: function(id, callback) {
    var e = jQuery.bcdFindById(id).get(0);
    if (e) {
      bcdui.widget._getCaptionFromWidgetElement(e, function(value) {
        callback(id, value);
      });
      return;
    }
    callback(id, "");
  }
});
