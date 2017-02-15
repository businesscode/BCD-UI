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
 * Input Widget implementation as jQuery Widget
 */
(function(){
  /**
   * Listens to updates on the target model and syncs the value back to the widget
   *
   * @class
   * @extends bcdui.widget.XMLDataUpdateListener
   * @private
   */
  var XMLListener = bcdui._migPjs._classCreate(bcdui.widget.XMLDataUpdateListener,
    /**
     * @lends XMLListener.prototype
     */
    {
      /**
       * @member bcdui.widget.inputField.XMLListener
       */
      updateValue: function(){
        var el = document.getElementById(this.htmlElementId);
        try{
          if(!el._writingData){
            // use widget API to sync TODO: isnt it better to use events rather direct API calls? then not need to stick to widgetFullName
            var widgetEl = jQuery("#" + this.htmlElementId).closest("[bcdWidgetFullName]");
            widgetEl.data(widgetEl.attr("bcdWidgetFullName"))._syncValue(this.htmlElementId);
          }else{
            bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.input.XMLListener: ignore self-writing update on el#"+this.htmlElementId);
          }
        }finally{
          el._writingData = false;
        }
      }
  });

  jQuery.widget("bcdui.bcduiInputNg",
  /** @lends bcdui.bcduiInputNg.prototype */
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
      return jQuery.extend(true, {}, this.options, bcdui.widgetNg.impl.readParams.input(this.element[0]));
    },

    /**
     * initializes the widget according to the API
     *
     * @param element {Element} to initialize from
     * @param extendedConfig {Object?} optional configuration paramter as a part of protected level API
     *
     * extendedConfig parameters:
     * -  hasCustomUpdateHandler:
     *    if true, no default update handler is installed, you have to call bcdui.widgetNg.input.updateValue(inputElementId) yourself to
     *    sync widgets value to the target model
     * -  hasCustomPlaceholderHandler:
     *    if true, no default placeholder handler is installed, you have to call bcdui.widgetNg.input._setUnsetPlaceholder(inputElementId,true)
     *    yourself to put the placeholder
     * -  noTooltip: dont register a tooltip for a balloon
     *
     * @private
     */
    _create : function() {
      if(!this.options.id){
        this.options.id = bcdui.factory.objectRegistry.generateTemporaryId()
      }
      this.element.attr("id", this.options.id);
      // currently required for XMLListener
      this.element.attr("bcdWidgetFullName", this.widgetFullName);

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
      rootContainer.hide();

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
        this._syncValue(config.inputElementId);
      }.bind(this));

      // register data update listener, once target model available
      var syncValueListener = new XMLListener({
        idRef: config.target.modelId,
        trackingXPath: config.target.xPath,
        htmlElementId: config.inputElementId
      });
      bcdui.factory.addDataListener(syncValueListener);
      this.syncValueListener = syncValueListener;

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
        bcdui.log.isTraceEnabled() && bcdui.log.trace("input NOT read-only, set up handlers.");

        if(!config.extendedConfig.hasCustomUpdateHandler){
          // avoid updateValue calls (write to target) which are triggerd by non-user blurs (e.g. pageEffect focus change)
          // before target is ready
          bcdui.factory.objectRegistry.withReadyObjects(config.target.modelId, function(){
            this._on( uiControl.control , {
              blur : this.updateValue.bind(this,config.inputElementId)
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
      rootContainer.show();

      // set autofocus after display
      if(args.autofocus){
        jQuery(uiControl.control).focus();
      }

      bcdui.widgetNg.input.getNavPath(rootContainer.attr("bcdTargetHtmlElementId"), function(id, value) {
        bcdui.widget._linkNavPath(id, value);
      }.bind(this));
    },

    /**
     * handle disabled option
     * @private
     */
    _setOption : function(k,v){
      this._superApply(arguments);
      if("disabled" == k){
        v = (v+"")=="true";
        var el = jQuery(this.element).children("input");
        el.prop("disabled", v);
        if(v){
          el.addClass("bcdDisabled");
        }else{
          el.removeClass("bcdDisabled");
        }
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
      // validate
      bcdui.log.isTraceEnabled() && bcdui.log.trace("validate after sync, value read from model is: " + value + ", is value empty: " + isValueEmpty);
      this._validateElement(inputElementId, true);
      if(!el.data("_config_").extendedConfig.hasCustomPlaceholderHandler){
        this._setUnsetPlaceholder(inputElementId, isValueEmpty);
      }
      el.trigger(this.EVENT.SYNC_READ, {isValueEmpty : isValueEmpty});
    },

    /**
     * @return {Object} properties:
     *  widget: is the widget element to append to layout,
     *  control: A-element
     *
     * @private
     */
    _createInputControl: function(args, config){
      
      var el = jQuery("<input/>");

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
      // bind native html events, if defined
      ["onchange","onclick"].forEach(function(v){
        args[v]&&el.attr(v, args[v]);
      });

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
        el.attr("disabled","disabled");
        el.addClass("bcdDisabled");
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
     * TODO: this is generic purpose widget API extract this function to generic widget package
     *
     * @param inputElementId
     * @param checkDataModelValidity if true, additionally the model validity is taken into account
     *
     * @return true in case of valid or false in case of invalid element status
     *
     * @private
     */
    _validateElement: function(inputElementId, checkDataModelValidity){
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

      return bcdui.widgetNg.validation.validateField(inputElementId, msg);
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
      var isValid = null;

      // validation hier vorziehen, im fall das feld ist invalid um evtl. aufzuraumen
      if(!bcdui.widgetNg.validation.hasValidStatus(inputEl.get(0))){
        bcdui.log.isTraceEnabled() && bcdui.log.trace("force validation in case of invalid field status");
        isValid = this._validateElement(inputElementId, !hasValueChanged);
      }

      bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.input.updateValue: modelValue: " + modelValue + ", guiValue: " + guiValue);

      var hasWritten = false;
      if(hasValueChanged){
        bcdui.log.isTraceEnabled() && bcdui.log.trace("validate before write?");
        // we only revalidate in case we did not do it by chance before
        if(isValid || (isValid==null && this._validateElement(inputElementId, false))){
          this._writeDataToXML({
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
        this._setUnsetPlaceholder(inputElementId, true);
      }
      inputEl.trigger(this.EVENT.SYNC_WRITE,{
        isValueEmpty : guiValue == "",
        value : guiValue,
        hasWritten: hasWritten
      });
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
            this._invalidModelNodeReset(modelId, xPath)
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
      // actually confusing but listeners check this status to stop
      this.isDestroyed = true;
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
    }
  });
}());

/*
 * TODO convenience init adapter since generateWidgetApi.xslt currrently generates
 * bootstrap code like bcdui.widgetNg.button.init(targetHtmlElement), we have to change
 * it to jQuery Widget init style
 */

/**
 * A namespace for the BCUDI GUI input widget.
 * @namespace bcdui.widgetNg.input
 * @private
 */
bcdui.util.namespace("bcdui.widgetNg.input",
/** @lends bcdui.widgetNg.input */
{
  init: function(htmlElement){
    bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui input widget adapter init");
    jQuery(htmlElement).bcduiInputNg();
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
