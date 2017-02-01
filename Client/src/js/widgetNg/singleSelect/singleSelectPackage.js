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

/* generic widget utils. TODO: make all widgets use this utitilies (extracted from inputPackage with no logical changes) */
(function(){
  /**
   * A namespace for the BCUDI GUI widget utils.
   * @namespace bcdui.widgetNg.utils
   * @private
   */
  bcdui.util.namespace("bcdui.widgetNg.utils",
  /** @lends bcdui.widgetNg.utils */
  {
    /* TODO: not compatible generally */
    XMLListener : bcdui._migPjs._classCreate(bcdui.widget.XMLDataUpdateListener,
        /**
         * @lends XMLListener.prototype
         */
    {
          /**
           * @method
           */
          updateValue: function(){
            // only sync data when data really changed
            var el = document.getElementById(this.htmlElementId);
            try{
              if(!el._writingData){
                // use widget API to sync TODO: isnt it better to use events rather direct API calls? then not need to stick to widgetFullName
                bcdui.log.isTraceEnabled() && bcdui.log.trace("XMLListener updateValue delegation (syncValue) to element #" + this.htmlElementId);
                bcdui.widgetNg.utils._syncValue(this.htmlElementId);
              }else{
                bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.input.XMLListener: ignore self-writing update on el#"+this.htmlElementId);
              }
            }finally{
              el._writingData = false;
            }
          }
    }),

    /**
     * TODO migrate to jQuery Widget Event / Callback API
     * custom events fired on the input element
     *
     * @static
     */
    EVENT: {
      /**
       * fired on the input element after a SYNC_WRITE, that is
       * the widget value has been synced to the data model, 'memo' properties passed:
       *
       * - isValueEmpty {boolean}: if value is considered empty
       * - value {String}: the value synced
       * - hasWritten {boolean}: if the value has been written or not, i.e. the value is not written if either invalid or value has not changed
       *
       * @static
       */
      SYNC_WRITE : "bcd:widget.input.sync_write",

      /**
       * fired on the input element after a SYNC_READ, that is
       * the widget value has been loaded from the data model, 'memo' properties passed:
       *
       * - isValueEmpty {boolean}: if value is considered empty
       *
       * @static
       */
      SYNC_READ : "bcd:widget.input.sync_read"
    },

    /**
     * writes newValue into bound model, DOES NOT VALIDATE! params:
     *
     * - inputElementId
     * - value
     * - isValid (optional)
     *
     * is -isValid is set to FALSE, the targetNode is tagged with bcdInvalid attribute if set to TRUE the attribute is removed,
     * in case it is unset - there is no effect on that attribute
     *
     * @return {boolean} true in case the target document was changed
     *
     * @private
     */
    _writeDataToXML: function(params){
      bcdui.log.isTraceEnabled() && bcdui.log.trace("_writeDataToXML");
      var el = bcdui._migPjs._$(params.inputElementId);
      var args = el.data("_args_");
      var config = el.data("_config_");

      bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.utils._writeDataToXML: writing data...");
      // tag that we're writing data ourself so that XMLUpdateListener
      // ignores and does not propagate this update.
      // the listener resets this flag on its own once it is run
      el._writingData=true;
      var result = bcdui.widget._copyDataFromHTMLElementToTargetModel(
          bcdui.factory.objectRegistry.getObject(config.target.modelId),
          config.target.xPath,
          params.value,
          args.keepEmptyValueExpression,
          false,
          function(modelId, xPath){
            bcdui.widgetNg.utils._invalidModelNodeReset(modelId, xPath)
          }.bind(this, config.target.modelId, config.target.xPath)
      );
      bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.input._writeDataToXML: ...data written");

      el.trigger(bcdui.widget.events.writeValueToModel);

      return result;
    },

    /**
     * cleans the bcdInvalid attribute on the model node
     *
     * @private
     */
    _invalidModelNodeReset: function(modelId, xPath){
      var node = bcdui.factory.objectRegistry.getObject(modelId).dataDoc.selectSingleNode(xPath);
      if(node != null){
        // is ATTRIBUTE
        if(node.nodeType == 2){
          node = bcdui.util.xml.getParentNode(node);
        }
        node.removeAttribute("bcdInvalid");
      }
    },

    /**
     * adds validator to a widget
     *
     * @param inputElementId
     * @param validatorFunc - implementing widget validation api
     *
     * @private
     */
    _addValidator: function(inputElementId, validatorFunc){
      bcdui.log.isTraceEnabled() && bcdui.log.trace("adding validator");
      var config = bcdui._migPjs._$(inputElementId).data("_config_");
      if(config.validators == null){
        config.validators=[];
      }
      config.validators.push(validatorFunc);
    },

    /**
     * triggers jquerymobile.selectmenu("refresh") to update UI overlay,
     * does nothing if jquerymobile is not enabled
     *
     * @private
     */
    _jqmRefresh : function(elId, doForce){
      if(window.jQuery){
        var w = jQuery("select#" + elId);
        // if .selectmenu widget is available
        if(w.selectmenu !== undefined){
          // pre-initialize if not done yet
          if ( w.data("mobile-selectmenu") === undefined ) {
            w.selectmenu();
          }
          w.selectmenu("refresh", doForce||false);
        }
      }
    },

    /**
     * this function shall be called in order to accept value from GUI control into the model,
     * also we handle a placeholder here, since this is considered to be the API to sync new GUI input
     *
     */
    updateValue: function(inputElementId){
      bcdui.log.isTraceEnabled() && bcdui.log.trace("updateValue(gui to data)");
      var inputEl = bcdui._migPjs._$(inputElementId);
      var args = inputEl.data("_args_");
      var config = inputEl.data("_config_");

      bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.input.updateValue: update via xpath : " + config.target.xPath + ", modelId: " + config.target.modelId);

      var guiValue = inputEl.get(0).value;
      bcdui.log.isTraceEnabled() && bcdui.log.trace("guiValue: " + guiValue);
      if(bcdui.widgetNg.utils._isEmptyField(inputEl.get(0))){
        // handle non-native placeholder
        guiValue="";
      }
      var modelValue = bcdui.widgetNg.utils._readDataFromXML(inputElementId).value||"";
      // tells if current widget value differs from data value
      var hasValueChanged = guiValue != modelValue;
      var isValid = null;

      // validation hier vorziehen, im fall das feld ist invalid um evtl. aufzuraumen
      if(!bcdui.widgetNg.validation.hasValidStatus(inputEl.get(0))){
        bcdui.log.isTraceEnabled() && bcdui.log.trace("force validation in case of invalid field status");
        isValid = bcdui.widgetNg.utils._validateElement(inputElementId, !hasValueChanged);
      }

      bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.input.updateValue: modelValue: " + modelValue + ", guiValue: " + guiValue);

      var hasWritten = false;
      if(hasValueChanged){
        bcdui.log.isTraceEnabled() && bcdui.log.trace("validate before write?");
        // we only revalidate in case we did not do it by chance before
        if(isValid || (isValid==null && bcdui.widgetNg.utils._validateElement(inputElementId, false))){
          bcdui.widgetNg.utils._writeDataToXML({
            inputElementId: inputElementId,
            value : guiValue
          });
          hasWritten = true;
        }else{
          bcdui.log.isTraceEnabled() && bcdui.log.trace("skip _writeDataToXML due to invalid input");
        }
      }else{
        bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.input.updateValue: skip update due to unchanged value");
      }
  
      // handle placeholder here if we have to
      if(guiValue=="" && !config.extendedConfig.hasCustomPlaceholderHandler){
        bcdui.widgetNg.utils._setUnsetPlaceholder(inputElementId, true);
      }
      inputEl.trigger(bcdui.widgetNg.utils.EVENT.SYNC_WRITE,{
        isValueEmpty : guiValue == "",
        value : guiValue,
        hasWritten: hasWritten
      });
    },

    /**
     * reads from bound model, args:
     *
     * - targetModel
     * - targetXPath
     *
     * @return {Object} with properties:
     *  value: the raw value from model
     * @private
     */
    _readDataFromXML: function(inputElementId){
      bcdui.log.isTraceEnabled() && bcdui.log.trace("readDataFromXML");
      var config = bcdui._migPjs._$(inputElementId).data("_config_");
      return {
        value: bcdui.widget._getDataFromXML(bcdui.factory.objectRegistry.getObject(config.target.modelId),config.target.xPath)
      }
    },

    /**
     * updates the widget with data from bound model., args:
     *
     * - targetModel
     * - targetXPath
     *
     * here we also implement SYNC_WRITE to the data model for
     * invalid- to valid transition, that is once widget becomes valid
     * after invalid state, it persists the value into the model
     *
     * @private
     */
    _syncValue: function(inputElementId){
      var value = bcdui.widgetNg.utils._readDataFromXML(inputElementId).value||"";
      var el = bcdui._migPjs._$(inputElementId);
      // we're settings fields value - reset placeholder
      if(el.prop("bcdIsValuePlaceholder")){
        el.prop("bcdIsValuePlaceholder", false);
        el.removeClass("bcdPlaceholder");
      }
      el.get(0).value = value;
      var isValueEmpty = value == null || !value.trim();
      // validate
      bcdui.log.isTraceEnabled() && bcdui.log.trace("validate after sync, value read from model is: " + value + ", is value empty: " + isValueEmpty);
      bcdui.widgetNg.utils._validateElement(inputElementId, true);
      if(!el.data("_config_").extendedConfig.hasCustomPlaceholderHandler){
        bcdui.widgetNg.utils._setUnsetPlaceholder(inputElementId, isValueEmpty);
      }
      el.trigger(bcdui.widgetNg.utils.EVENT.SYNC_READ, {isValueEmpty : isValueEmpty});
    },

    /**
     * runs all validators
     *
     * @return {object[]} NULL in case of valid validation or array of validation messages
     * @private
     */
    _getValidationMessages: function(inputElementId){
      var config = bcdui._migPjs._$(inputElementId).data("_config_");
      if(! config)
        return null;

      var validators = config.validators;

      var messages=[];

      if(validators!=null){
        bcdui.log.isTraceEnabled() && bcdui.log.trace("found validators: " + validators.length);
        validators.forEach(function(v){
          var res = v(inputElementId);
          if(res!=null){
            messages.push(res.validationMessage);
          }
        });
      }

      bcdui.log.isTraceEnabled() && bcdui.log.trace("messages produced by validators: " + messages);

      return messages.length==0?null:messages;
    },

    /**
     * validates the element and sets validation markers, displays messages to the user,
     * this function implements the validation pattern allowing to validate the value of the
     * widget with custom validators. Additionally, a target-node can also have a validity status
     * which is also checked during SYNC_READ (means data loaded from model to widget) but check is
     * omitted in case of SYNC_WRITE (means data written from widget to model).
     *
     * TODO: this is generic purpose widget API extract this function to generic widget package
     *
     * @param inputElement
     * @param checkDataModelValidity if true, additionally the model validity is taken into account
     *
     * @return true in case of valid (OR element is not attached to DOM anymore) or false in case of invalid element status
     *
     * @private
     */
    _validateElement: function(inputElement, checkDataModelValidity){
      var el = bcdui._migPjs._$(inputElement);
      if(!el.length > 0){
        return true;
      }
      var msg = bcdui.widgetNg.utils._getValidationMessages(inputElement);
      bcdui.log.isTraceEnabled() && bcdui.log.trace("validation messages: " + msg);

      if(checkDataModelValidity === true){
        // run invalidModelDataValidator if intructed so
        var result = bcdui.widgetNg.validation.validators.widget.invalidModelDataValidator(el);
        if(result){
          if(msg==null){
            msg=[];
          }
          msg.push(result.validationMessage);
        }
      }

      return bcdui.widgetNg.validation.validateField(inputElement, msg);
    },

    /**
     * manual placeholder handling,
     * in case no value is set:
     *
     * 1) set element value to placeholder
     * 2) tag with CSS bcdPlaceholder class
     * 3) set elements bcdIsValuePlaceholder attribute to true, so that other APIs may detect that the value set is a placeholder
     *
     * this function must be called onfocus() and onblur() in case placeholder is set
     *
     * @param doSet - true if to set, false to remove
     * @private
     */
    _setUnsetPlaceholder: function(inputElementId, doSet){
      // we must not run in case browser supports placeholder
      if(bcdui.browserCompatibility._hasFeature("input.placeholder"))return;

      var el = bcdui._migPjs._$(inputElementId);

      if(doSet && el.is(":focus")){
        // no need to set placeholder on an active (focused) field
        return;
      }

      var args = el.data("_args_");
      // no placeholder configured
      if(!args.placeholder){
        return;
      }

      // we dont handle password fields
      if(args.type=="password")return;

      var isEmptyField = bcdui.widgetNg.utils._isEmptyField(el.get(0));

      if(doSet && isEmptyField){
        // set placeholder, if we have an empty value
        el.prop("bcdIsValuePlaceholder",true);
        el.addClass("bcdPlaceholder");
        el.get(0).value=args.placeholder;
      }else if(!doSet && el.prop("bcdIsValuePlaceholder")){
        // remove placeholder
        el.prop("bcdIsValuePlaceholder",false);
        el.removeClass("bcdPlaceholder");
        el.get(0).value="";
      }
    },

    /**
     * @return {boolean} true if value is empty, also considers the placeholder, value is empty if it is null or empty string
     * @private
     */
    _isEmptyField: function(inputElementId){
      var el = bcdui._migPjs._$(inputElementId);
      return el.get(0).value==null||!el.get(0).value.trim()||el.prop("bcdIsValuePlaceholder");
    }
  });
}());

(function(){
  jQuery.widget("bcdui.bcduiSingleSelectNg",{
    /**
     * @private
     */
    _getCreateOptions : function(){
      return bcdui.widgetNg.impl.readParams.singleSelect(this.element[0]);
    },

    /**
     * implement destroy, here we tidy up listeners and other stuff also related to PrototypeJS
     * @private
     */
    _destroy : function(){
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
      this.syncValueListener.unregister();
      this.syncValueListener = null;

      this.updateValueListener.unregister();
      this.updateValueListener = null;
    },

    /**
     * @private
     */
    _create : function() {
      if(!this.options.id){
        this.options.id = "singleSelect_"+bcdui.factory.objectRegistry.generateTemporaryId();
      }
      this.element.attr("id", this.options.id);
      bcdui.log.isTraceEnabled() && bcdui.log.trace("initializing SingleSelect");

      var rootContainer = bcdui._migPjs._$(this.element[0]);
      var args = this.options;

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
        rootContainer.hide();
        rootContainer.parent().get(0).appendChild(_loadingDiv.get(0));
      }

      rootContainer.append(controlEl);

      controlEl.data("_args_", args);
      controlEl.data("_config_", config);

      // complete initialization once dependencies has been loaded TODO applicable in native?
      // TODO add to utils
      bcdui.widgetNg.suggestInput._setUnsetFieldLoadingStatus(controlEl.get(0), true);

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

        // register data update listener, once target model available
        // tidy up this one in _destroy
        var syncValueListener = new bcdui.widgetNg.utils.XMLListener({
          idRef: config.target.modelId,
          trackingXPath: config.target.xPath,
          htmlElementId: config.htmlElementId
        });
        bcdui.factory.addDataListener(syncValueListener);
        this.syncValueListener = syncValueListener;
      }

      bcdui.log.isTraceEnabled() && bcdui.log.trace("dependencies: " + config.dependencies);

      // complete initialization once dependencies has been loaded
      bcdui.factory.objectRegistry.withReadyObjects({
          ids:config.dependencies,
          fn:function(args, config, controlElement, rootContainer, widgetInstance){
            bcdui.log.isTraceEnabled() && bcdui.log.trace("dependencies loaded patching options model");
            // now we can build our options model wrapper and wait for it to get ready, we can use optimization since we not rely on //Values/Value normalization
            config.isOptionsModelNormalized = bcdui.widgetNg.suggestInput._patchOptionsModel(args, config, controlElement, null, true);
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
                bcdui.widgetNg.utils._addValidator(controlElement.id, bcdui.widgetNg.suggestInput._validators._existingValueValidator);
                // reset loadings status
                bcdui.widgetNg.suggestInput._setUnsetFieldLoadingStatus(controlElement.id, false);
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
                    rootContainer.show();
                  }
                }

                // set autofocus after display
                if(args.autofocus){
                  jQuery(controlEl).focus();
                }

                bcdui.widgetNg.singleSelect.getNavPath(rootContainer.attr("bcdTargetHtmlElementId"), function(id, value) {
                  bcdui.widget._linkNavPath(id, value);
                }.bind(this));
              }
            }, false);
          }.bind(undefined,args, config, controlEl.get(0), rootContainer, this)
      }, false);
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
          captionNode : jQuery("<option value='' bcdTranslate='bcd_singleSelect_please_select'></option>"),
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
      bcdui.widgetNg.suggestInput._updateInternalOptions({
        htmlElementId: el.get(0),
        doSort : args.doSortOptions && !config.isOptionsModelNormalized,  // in case we have no optionsmodel wrapper we have to care about sorting
        // this function is called on every node selected by config.source.xPath
        forEachFunc: function(index, attrNode){
          // add "please select" as first option
          if(optionContextScope.isFirst){
            dataListEl.appendChild(optionContextScope.captionNode.get(0));
            optionContextScope.isFirst=false;
          }

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

          // apply doAutoSelectSolelyOption solely option finally
          var opts=null;
          if(
              widgetInstance.options.doAutoSelectSolelyOption                             // if enabled
              && (opts=jQuery(dataListEl).find("option")).length==2                       // the only option we have (first one is please select)
              && ( ! currentDataValue || ! bcdui.widgetNg.validation.hasValidStatus(el) ) // and no value set OR widget is invalid
          ){

            var solelyValue = opts.last().attr("value");

            // escape stack
            setTimeout( widgetInstance._syncWrite.bind(undefined,el, solelyValue) );
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

      this.updateValueListener = bcdui.widgetNg.suggestInput._registerDataListener({
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
        el.prop("disabled", true);
        el.addClass("bcdDisabled");
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
    }
  });
}());

/**
 * A namespace for the BCUDI GUI singleSelect widget.
 * @namespace bcdui.widgetNg.singleSelect
 * @private
 */
bcdui.util.namespace("bcdui.widgetNg.singleSelect", {
  /**
   * initializes the widget according to the API
   *
   * @param element {Element} to initialize from
   */
  init : function(htmlElement){
    bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui input widget adapter init");
    jQuery(htmlElement).bcduiSingleSelectNg();
  },

  /**
   * returns NavPath information via callback for widget which is addressed by its targetHtmlId
   * @param {string} id targetHtmlElementId of widget
   * @param {callback} function function to be called with generated caption
   */
  getNavPath: function(id, callback) {
    if (id && id != "") {
      var e = jQuery("*[bcdTargetHtmlElementId='" + id + "']").first().get(0);
      if (e) {
        bcdui.widget._getCaptionFromWidgetElement(e, function(value) {
          callback(id, value);
        });
        return;
       }
    }
    callback(id, "");
  }
});
