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
 * Input Widget implementation as jQuery Widget
 */
(function(){
  jQuery.widget("bcdui.bcduiInputNg", jQuery.bcdui.bcduiWidget,
    /** @lends bcdui.bcduiInputNg */
    {
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

    version : "1",

    /**
     * @private
     */
    _getCreateOptions : function(){
      return Object.assign({}, this.options, bcdui.widgetNg.impl.readParams.input(this.element[0]));
    },
    /**
     * @private
     */
    _validateOptions : function(){
      bcdui.widgetNg.impl.validateParams.input(this.options);
    },

    /**
     * initializes the widget according to the API
     * @private
     */
    _create : function() {
      this._super();

      bcdui.log.isTraceEnabled() && bcdui.log.trace("creating input widget with config ");
      var rootContainer = this.element;

      var args = this.options;

      // init internal config
      // TODO remove / rewrite / communicate via widget-extensions (inheritance) and events
      var extendedConfig=null;
      var config = {
          target: bcdui.factory._extractXPathAndModelId(args.targetModelXPath),
          inputElementId: "input_" + args.id,
          extendedConfig: this.options.extendedConfig||{}
      };
      this.config = config;

      args.type = config.extendedConfig.type||args.type||"text";

      // avoid rendering while attaching children
      this.setVisible(false);

      var uiControl = this._createInputControl(args, config);

      // store args on element
      // TODO rewrite, use jQuery data style
      jQuery(uiControl.control).data("_args_", args);
      jQuery(uiControl.control).data("_config_", config);

      // sync the bound model value once
      bcdui.factory.objectRegistry.withReadyObjects(config.target.modelId, function(){
        if(this.isDestroyed){
          if(window["console"] && bcdui.isDebug){
            console.warn("widget initialization after destroy()",this);
          }
          return;
        }
        // initial sync only when no data was injected yet
        if (jQuery("#" + config.inputElementId).val() == "")
          this._syncValue(config.inputElementId);
      }.bind(this));

      // listen to updates on model
      this._setOnTargetModelChange(function(){
        try{
          if(!this._writingData){
            this._syncValue(config.inputElementId);
          }
        } finally {
          this._writingData = false;
        }
      }.bind(this));

      // handle label creation before appending control
      this._createLabel(uiControl.widget.getAttribute("id"));

      // attach to DOM
      rootContainer.append(uiControl.widget);

      // add custom placeholder if not supported natively
      if(args.placeholder && !bcdui.browserCompatibility._hasFeature("input.placeholder") && !config.extendedConfig.hasCustomPlaceholderHandler){
        this._on(uiControl.control , {
          focus : this._setUnsetPlaceholder.bind(this,config.inputElementId, false),
          blur : this._setUnsetPlaceholder.bind(this,config.inputElementId, true)
        });
      }

      // add listeners
      if(!args.readonly){
        jQuery(uiControl.control).on("keydown", (e) => {
          // cancel validation when receiving keystrokes yet only when input has focus
          if(jQuery(e.target).is(":focus")){
            this._cancelPendingValidation();
          }
        });
        bcdui.log.isTraceEnabled() && bcdui.log.trace("input NOT read-only, set up handlers.");

        if(!config.extendedConfig.hasCustomUpdateHandler){
          // avoid updateValue calls (write to target) which are triggerd by non-user blurs (e.g. pageEffect focus change)
          // before target is ready
          bcdui.factory.objectRegistry.withReadyObjects(config.target.modelId, function(){
            this._on( uiControl.control , {
              blur : this.updateValue.bind(this,config.inputElementId),

              // firefox does not focus the inputfield when clicking on up/down arrows in type=int input field. As a result, the blur event is not fired
              // so focus the input field in any case when clicking
              click: function(event) {jQuery(event.target).focus();}
            });
          }.bind(this));
        }

        if(args.setCursorPositionAtEnd || args.isTextSelectedOnFocus){
          this._on( uiControl.control , {
            blur : this._handleCursorPosition.bind(this,config.inputElementId)
          });
        }

        // create and attach reset control if not disabled
        if(!args.disableResetControl){
          var resetControl = this._createResetControl();
          rootContainer.append(resetControl);
          // add listener
          this._on( resetControl , {
            click : this._clearValue.bind(this,config.inputElementId)
          });
        }

        // attach implicit validators
        if(args.maxlength){
          this._addValidator(config.inputElementId, bcdui.widgetNg.validation.validators.widget.valueLength);
        }
        // attach our pattern validator in case not supported by browser
        if(args.pattern && !bcdui.browserCompatibility._hasFeature("input.pattern")){
          this._addValidator(config.inputElementId, bcdui.widgetNg.validation.validators.widget.patternValidator);
        }
        // check for required validator
        if(args.required && !bcdui.browserCompatibility._hasFeature("input.required")){
          this._addValidator(config.inputElementId, bcdui.widgetNg.validation.validators.widget.notEmptyValidator);
        }
        // check for optional validationFunction
        if(args.validationFunction){
          var func = bcdui.util.isString(args.validationFunction) ? eval(args.validationFunction) : args.validationFunction;
          if(!func){
            throw new Error("custom validation function not found (is null): " + (bcdui.util.isString(args.validationFunction)?"name:" + args.validationFunction : ""));
          }
          this._addValidator(config.inputElementId, func);
        }


        if(args.type=="int"){
          this._addValidator(config.inputElementId, bcdui.widgetNg.validation.validators.widget.TYPE_VALIDATORS["int"]);
        }else if(args.type=="numeric"){
          this._addValidator(config.inputElementId, bcdui.widgetNg.validation.validators.widget.TYPE_VALIDATORS["number"]);
        }else if(args.type=="email"){
          this._addValidator(config.inputElementId, bcdui.widgetNg.validation.validators.widget.TYPE_VALIDATORS["email"]);
        }
      }else{
        bcdui.log.isTraceEnabled() && bcdui.log.trace("input IS read-only, dont attach modification listeners.");
      }

      // attach balloon displaying fly-over + ballon for the widget to display hints and validation
      bcdui.widgetNg.commons.balloon.attach(config.inputElementId, {noTooltip: config.extendedConfig.noTooltip, noBalloon:!args.displayBalloon});

      // apply disabled state
      if(this.options.disabled){
        this.disable();
      }

      // display constructed container
      this.setVisible(true);

      // set autofocus after display
      if(args.autofocus){
        jQuery(uiControl.control).focus();
      }

      if (this.options.enableNavPath) {
        bcdui.widgetNg.input.getNavPath(this.options.id, function(id, value) {
          bcdui.widget._linkNavPath(id, value);
        }.bind(this));
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
      var value = this._readDataFromXML(inputElementId).value||"";
      var el = bcdui._migPjs._$(inputElementId);
      // we're settings fields value - reset placeholder
      if(el.prop("bcdIsValuePlaceholder")){
        el.prop("bcdIsValuePlaceholder",false);
        el.removeClass("bcdPlaceholder");
      }
      el.get(0).value = value;
      var isValueEmpty = value == null || !value.trim();

      ! isValueEmpty ? jQuery(el).closest("*[data-bcdui-widget]").addClass("bcdActiveFilter") : jQuery(el).closest("*[data-bcdui-widget]").removeClass("bcdActiveFilter");

      // validate
      bcdui.log.isTraceEnabled() && bcdui.log.trace("validate after sync, value read from model is: " + value + ", is value empty: " + isValueEmpty);
      if (this.options.isSync){
        this._validateElement(inputElementId, true, true);
        if(!el.data("_config_").extendedConfig.hasCustomPlaceholderHandler){
          this._setUnsetPlaceholder(inputElementId, isValueEmpty);
        }
        el.trigger(this.EVENT.SYNC_READ, {isValueEmpty : isValueEmpty});
      }
      else {
        this._validateElement(inputElementId, true)
        .then(() => {
          // check if widget still exists
          if (jQuery("#" + inputElementId).length > 0) {
            if(!el.data("_config_").extendedConfig.hasCustomPlaceholderHandler){
              this._setUnsetPlaceholder(inputElementId, isValueEmpty);
            }
            el.trigger(this.EVENT.SYNC_READ, {isValueEmpty : isValueEmpty});
          }
        });
      }
    },

    /**
     * @return {Object} properties:
     *  widget: is the widget element to append to layout,
     *  control: A-element
     *
     * @private
     */
    _createInputControl: function(args, config){
      
      var el = jQuery("<input class='form-control'></input>");

      el.attr("id", config.inputElementId);
      // the hints are handled by balloons
      el.attr("bcdHint", args.hint);
      el.attr("tabindex", args.tabindex);
      el.attr("autofocus", args.autofocus);
      el.attr("maxlength", args.maxlength);
      el.attr("max", args.max);
      el.attr("min", args.min);
      el.attr("placeholder", args.placeholder);
      el.attr("pattern", args.pattern);
      el.attr("required", args.required);
      el.attr("readonly", args.readonly);
      if(!!args.autocomplete){
        el.attr("autocomplete", args.autocomplete);
      }
      // bind native html events, if defined
      this._mapNativeHtmlEvents(el);

      if(args.type){
        if(args.type=="int"){
          el.attr("type", "number");
        }else if(args.type=="numeric"){
          el.attr("type", "number");
          el.attr("step", "any");
        }else{
          el.attr("type", args.type);
        }
      }else{
        el.attr("type", "text");
      }

      var resetControl=null;

      if(args.disabled){
        el
        .prop("disabled","disabled")
        .attr("disabled","disabled")
        .addClass("bcdDisabled")
        ;
      }

      return {
        widget: el.get(0),
        control: el.get(0)
      }
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
      bcdui.log.isTraceEnabled() && bcdui.log.trace("_readDataFromXML");
      var config = bcdui._migPjs._$(inputElementId).data("_config_");
      return {
        value: bcdui.widget._getDataFromXML(bcdui.factory.objectRegistry.getObject(config.target.modelId),config.target.xPath)
      }
    },

    /**
     * validates the element and sets validation markers, displays messages to the user,
     * this function implements the validation pattern allowing to validate the value of the
     * widget with custom validators. Additionally, a target-node can also have a validity status
     * which is also checked during SYNC_READ (means data loaded from model to widget) but check is
     * omitted in case of SYNC_WRITE (means data written from widget to model).
     *
     * @param inputElementId
     * @param checkDataModelValidity if true, additionally the model validity is taken into account
     * @param isSync, if set to true, the validation is done synchronously ( attached asyncValidate functions are not called)
     *
     * @return Promise resolving with validation result.
     *
     * @private
     */
    _validateElement: function(inputElementId, checkDataModelValidity, isSync){
      var el = document.getElementById(inputElementId);
      var msg = this._getValidationMessages(inputElementId);
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

      var isValid = bcdui.widgetNg.validation.validateField(inputElementId, msg);

      if (isSync === true) {
        if(msg){ // custom validators reported errors
          return msg;
        } else if (!isValid){ // implicit validator reported error
          return bcdui.widgetNg.validation.addValidityMessage(null, "Error"); // unknown error occurred
        } else {
          return null; // in sync mode, we don't run asyncValidate functions
        }
      }
      else 
        return new Promise((resolve, reject) => {
          if(msg){ // custom validators reported errors
            resolve({
              validationMessage : msg
            });
          } else if (!isValid){ // implicit validator reported error
            resolve(bcdui.widgetNg.validation.addValidityMessage(null, "Error")); // unknown error occurred
          } else {
            this._asyncValidate().then(resolve, reject);
          }
        });
    },

    /**
     * re-validates the widget, this API allows jQuery(el).bcduiInput("validate")
     */
    validate : function(){
      this._validateElement(this.config.inputElementId, true);
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

      var isEmptyField = this._isEmptyField(el.get(0));

      if(doSet && isEmptyField){
        // set placeholder, if we have an empty value
        el.prop("bcdIsValuePlaceholder", true);
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
     * implements feature for:
     * - setCursorPositionAtEnd
     * - isTextSelectedOnFocus
     *
     * @private
     */
    _handleCursorPosition: function(inputElementId){
      var el = bcdui._migPjs._$(inputElementId);
      var args = el.data("_args_");
      // we dont have to do anything on empty value, however we expect the _setUnsetPlaceholder() function to be run before
      if(!this._isEmptyField(inputElementId) && (args.setCursorPositionAtEnd || args.isTextSelectedOnFocus)){
        //var pos = typeof newPos != "undefined" ? newPos : el.value.length;
        var pos = el.get(0).value.length;
        var startPos = args.isTextSelectedOnFocus ? 0 : pos;
        if(bcdui.browserCompatibility.isIE && el.get(0).createTextRange){
          var range = el.get(0).createTextRange();
          range.collapse(true);
          range.moveEnd('character', pos);
          range.moveStart('character', startPos);
          range.select();
        }else if(el.get(0).setSelectionRange){// FF, Chrome
          el.get(0).setSelectionRange(startPos,pos);
        }
      }
    },

    /**
     * forces widget to write its current content to targetModelXPath
     */
    manifestValue: function(){
      this.updateValue(this.element.children().first().get(0).id);
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
      if(this._isEmptyField(inputEl.get(0))){
        // handle non-native placeholder
        guiValue="";
      }
      if(args.doTrimInput && guiValue != null ){
        inputEl.get(0).value = guiValue = guiValue.trim();
      }
      var modelValue = this._readDataFromXML(inputElementId).value||"";
      // tells if current widget value differs from data value
      var hasValueChanged = guiValue != modelValue;

      bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.input.updateValue: modelValue: " + modelValue + ", guiValue: " + guiValue);

      // handle placeholder here if we have to
      if(guiValue=="" && !config.extendedConfig.hasCustomPlaceholderHandler){
        this._setUnsetPlaceholder(inputElementId, true);
      }

      var triggerWrite = (hasWritten) => {

        guiValue ? jQuery("#" + inputElementId).closest("*[data-bcdui-widget]").addClass("bcdActiveFilter") : jQuery("#" + inputElementId).closest("*[data-bcdui-widget]").removeClass("bcdActiveFilter");

        inputEl.trigger(this.EVENT.SYNC_WRITE,{
          isValueEmpty : guiValue == "",
          value : guiValue,
          hasWritten: !!hasWritten // default:false
        });
      };

      // if value has changed we revalidate and write it to the model if value was valid
      var doWrite = function(validationResult) {
        var hasWritten = false;
        if(!validationResult){ // write only with valid value
          this._writeDataToXML({
            inputElementId: inputElementId,
            value : guiValue
          });
          hasWritten = true;
        }
        triggerWrite(hasWritten);
      }.bind(this);

      if(hasValueChanged){
        if (this.options.isSync) {
          doWrite(this._validateElement(inputElementId, false, true));
        }
        else {
          this._validateElement(inputElementId, false)
          .then((validationResult) => {
            doWrite(validationResult);
          });
        }
      } else { // value has not changed

        // tidy up, in case of invalidity state
        if(!bcdui.widgetNg.validation.hasValidStatus(inputEl.get(0))){
          bcdui.log.isTraceEnabled() && bcdui.log.trace("force validation in case of invalid field status");
          if (this.options.isSync) {
            this._validateElement(inputElementId, !hasValueChanged, true);
            triggerWrite();
          }
          else {
            this._validateElement(inputElementId, !hasValueChanged).then(() => { triggerWrite() });
          }
        } else {
          triggerWrite();
        }
      }
    },

    /**
     * cleans the bcdInvalid attribute
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
      bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.bcduiInputNg._writeDataToXML: writing data...");
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
            this._invalidModelNodeReset(modelId, xPath);
          }.bind(this,config.target.modelId, config.target.xPath)
      );
      bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.input._writeDataToXML: ...data written");
      el.trigger(bcdui.widget.events.writeValueToModel);
      return result;
    },

    /**
     * creates and returns reset control element
     *
     * @private
     */
    _createResetControl: function(){
      return jQuery("<span>[ X ]</span>");
    },

    /**
     * clears the value
     *
     * @private
     */
    _clearValue: function(inputElementId){
      bcdui.log.isTraceEnabled() && bcdui.log.trace("_clearValue(gui)");
      bcdui._migPjs._$(inputElementId).get(0).value="";
      this.updateValue(inputElementId);
    },

    /**
     * @private
     */
    _destroy: function() {
      this._super();
      // actually confusing but listeners check this status to stop
      this.isDestroyed = true;
      var htmlElementId = this.options.id;
      var el = bcdui._migPjs._$(htmlElementId);

      // ## move on with prototypeJS tidy up ##
      if(el.length > 0){
        el.off();
        el.data("_args_",   null);
        el.data("_config_", null);
        this.element.data("_config_", null);
      }
    }
  });
}());

/*
 * TODO convenience init adapter since generateWidgetApi.xslt currrently generates
 * bootstrap code like bcdui.widgetNg.button.init(targetHtmlElement), we have to change
 * it to jQuery Widget init style
 */

/**
 * A namespace for the BCD-UI input widget. For creation @see {@link bcdui.widgetNg.createInput}
 * @namespace bcdui.widgetNg.input
 */
bcdui.widgetNg.input = Object.assign(bcdui.widgetNg.input,
/** @lends bcdui.widgetNg.input */
{
  /**
   * @private
   */
  init: function(htmlElement){
    bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui input widget adapter init");
    jQuery(htmlElement).bcduiInputNg();
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
