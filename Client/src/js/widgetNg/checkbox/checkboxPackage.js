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
 * Checkbox Widget implementation as jQuery Widget
 */
(function(){
  /**
   * Listens to updates on the target model and syncs the value back to the widget
   *
   * @private
   */
  var XMLListener = bcdui._migPjs._classCreate(bcdui.widget.XMLDataUpdateListener,
    /**
     * @lends bcdui.widget.inputField.XMLListener.prototype
     */
    {
      /**
       * @member bcdui.widget.inputField.XMLListener
       */
      updateValue: function(){
        // only sync data when data really changed
        var el = document.getElementById(this.htmlElementId);
        try{
          if(!el._writingData){
            // use widget API to sync TODO: isnt it better to use events rather direct API calls? then not need to stick to widgetFullName
            var widgetEl = jQuery("#" + this.htmlElementId).closest("[bcdWidgetFullName]");
            widgetEl.data(widgetEl.attr("bcdWidgetFullName"))._syncValue(this.htmlElementId);
          }else{
            bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.checkbox.XMLListener: ignore self-writing update on el#"+this.htmlElementId);
          }
        }finally{
          el._writingData = false;
        }
      }
  });

  jQuery.widget("bcdui.bcduiCheckboxNg",
  /** @lends bcdui.bcduiCheckboxNg.prototype */
  {
    /**
     * TODO migrate to jQuery Widget Event / Callback API
     * custom events fired on the checkbox element
     *
     * @static
     */
    EVENT: {
      /**
       * fired on the checkbox element after a SYNC_WRITE, that is
       * the widget value has been synced to the data model, 'memo' properties passed:
       *
       * - isValueEmpty {boolean}: if value is considered empty
       * - value {String}: the value synced
       * - hasWritten {boolean}: if the value has been written or not, i.e. the value is not written if value has not changed
       *
       * @static
       */
      SYNC_WRITE : "bcd:widget.checkbox.sync_write",

      /**
       * fired on the checkbox element after a SYNC_READ, that is
       * the widget value has been loaded from the data model, 'memo' properties passed:
       *
       * - isValueEmpty {boolean}: if value is considered empty
       *
       * @static
       */
      SYNC_READ : "bcd:widget.checkbox.sync_read"
    },

    /**
     * @private
     */
    _getCreateOptions : function(){
      return bcdui.widgetNg.impl.readParams.checkbox(this.element[0]);
    },

    /**
     * initializes the widget according to the API
     *
     * @param element {Element} to initialize from
     * @param extendedConfig {Object?} optional configuration paramter as a part of protected level API
     *
     * extendedConfig parameters:
     * -  noTooltip: dont register a tooltip for a balloon
     * @private
     */
    _create : function() {
      if(!this.options.id){
        this.options.id = "chkbox_"+bcdui.factory.objectRegistry.generateTemporaryId();
      }
      this.element.attr("id", this.options.id);
      // currently required for XMLListener
      this.element.attr("bcdWidgetFullName", this.widgetFullName);

      bcdui.log.isTraceEnabled() && bcdui.log.trace("creating checkbox widget with config ");
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

      // avoid rendering while attaching children
      rootContainer.hide();

      var uiControl = this._createInputControl(args, config);

      // store args on element
      jQuery(uiControl.control).data("_args_", args);
      jQuery(uiControl.control).data("_config_", config);

      // sync the bound model value once
      bcdui.factory.objectRegistry.withReadyObjects(config.target.modelId, function(){
        this._syncValue(config.inputElementId);
      }.bind(this),false);

      // register data update listener, once target model available
      var syncValueListener = new XMLListener({
        idRef: config.target.modelId,
        trackingXPath: config.target.xPath,
        htmlElementId: config.inputElementId
      });
      bcdui.factory.addDataListener(syncValueListener);
      this.syncValueListener = syncValueListener;

      // attach to DOM
      rootContainer.append(jQuery(uiControl.widget));

      // add listeners
      if(!args.readonly){
        bcdui.log.isTraceEnabled() && bcdui.log.trace("checkbox NOT read-only, set up handlers.");
        this._on({
          change : this.updateValue.bind(this,config.inputElementId)
        });
      }else{
        bcdui.log.isTraceEnabled() && bcdui.log.trace("checkbox IS read-only, dont attach modification listeners.");
      }

      // attach balloon
      bcdui.widgetNg.commons.balloon.attach(config.inputElementId, {noTooltip: config.extendedConfig.noTooltip});

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

      bcdui.widgetNg.checkbox.getNavPath(this.element.attr("bcdTargetHtmlElementId"), function(id, value) {
        bcdui.widget._linkNavPath(id, value);
      }.bind(this));

    },

    /** handle disabled option
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
      el.get(0).checked = (value != null && ! !value.trim() && value != "0");
      el.trigger(this.EVENT.SYNC_READ, {isValueEmpty : false});
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
      el.attr("readonly", args.readonly);
      el.attr("type", "checkbox");

      // bind native html events, if defined
      ["onchange","onclick"].forEach(function(v){
        args[v]&&el.attr(v, args[v]);
      });

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
     * this function shall be called in order to accept value from GUI control into the model
     *
     */
    updateValue: function(inputElementId){
      bcdui.log.isTraceEnabled() && bcdui.log.trace("updateValue(gui to data)");
      var inputEl = bcdui._migPjs._$(inputElementId);
      var args = inputEl.data("_args_");
      var config = inputEl.data("_config_");

      bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.checkbox.updateValue: update via xpath : " + config.target.xPath + ", modelId: " + config.target.modelId);

      var guiValue = inputEl.get(0).checked ? "1" : "0";
      var modelValue = this._readDataFromXML(inputElementId).value||"";
      // tells if current widget value differs from data value
      var hasValueChanged = guiValue != modelValue;

      bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.checkbox.updateValue: modelValue: " + modelValue + ", guiValue: " + guiValue);

      var hasWritten = false;
      if(hasValueChanged){
        this._writeDataToXML({
          inputElementId: inputElementId,
          value : guiValue
        });
        hasWritten = true;
        inputEl.trigger(bcdui.widget.events.writeValueToModel);
      }else{
        bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.checkbox.updateValue: skip update due to unchanged value");
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

      bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.bcduiCheckboxNg._writeDataToXML: writing data...");
      // tag that we're writing data ourself so that XMLUpdateListener
      // ignores and does not propagate this update.
      // the listener resets this flag on its own once it is run
      el._writingData=true;
      var ret = bcdui.widget._copyDataFromHTMLElementToTargetModel(
          bcdui.factory.objectRegistry.getObject(config.target.modelId),
          config.target.xPath,
          params.value,
          args.keepEmptyValueExpression,
          false,
          function(modelId, xPath){
            this._invalidModelNodeReset(modelId, xPath)
          }.bind(this,config.target.modelId, config.target.xPath)
      );
      bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.checkbox._writeDataToXML: ...data written");
      return ret;
    },

    /**
     * re-validates the widget, this API allows jQuery(el).bcduiCheckboxNg("validate")
     */
    validate : function(){
      // do nothing
    },

    /**
     * @private
     */
    _destroy: function() {
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
 * A namespace for the BCD-UI checkbox widget.
 * @namespace bcdui.widgetNg.checkbox
 * @private
 */
bcdui.util.namespace("bcdui.widgetNg.checkbox",
/** @lends bcdui.widgetNg.checkbox */
{
  init: function(htmlElement){
    bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui checkbox widget adapter init");
    jQuery(htmlElement).bcduiCheckboxNg();
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
        var t = bcdui.factory._extractXPathAndModelId(e.getAttribute("bcdTargetModelXPath"));
        var targetModel = t.modelId;
        var targetXPath = t.xPath;

        if (targetModel != null && targetXPath != null) {
          bcdui.factory.objectRegistry.withReadyObjects(targetModel, function() {
            var targetNode = bcdui.factory.objectRegistry.getObject(targetModel).getData().selectSingleNode(targetXPath);
            var value = (targetNode == null ? "0" : targetNode.text);
            callback(id, (value == "1" ? "X" : "-"));
          });
          return;
        }
      }
    }
    callback(id, "");
  }

});
