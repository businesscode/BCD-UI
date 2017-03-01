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
  jQuery.widget("bcdui.bcduiCheckboxNg", jQuery.bcdui.bcduiWidget, {
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
      this._super();

      bcdui.log.isTraceEnabled() && bcdui.log.trace("creating checkbox widget with config ");

      // init internal config
      var extendedConfig=null;
      var config = {
          target: bcdui.factory._extractXPathAndModelId(this.options.targetModelXPath),
          extendedConfig: this.options.extendedConfig||{}
      };

      // avoid rendering while attaching children
      this.element.hide();

      var checkboxEl = this._createInputControl();

      this.element.data("_config_", config);

      // sync the bound model value once
      bcdui.factory.objectRegistry.withReadyObjects(config.target.modelId, function(){
        this._syncValue();
      }.bind(this),false);

      this._setOnTargetModelChange(function(){
        try{
          if(!this._writingData){
            this._syncValue();
          }
        } finally {
          this._writingData = false;
        }
      }.bind(this));

      // attach to DOM
      this.element.append(checkboxEl);

      // add listeners
      if(!this.options.readonly){
        bcdui.log.isTraceEnabled() && bcdui.log.trace("checkbox NOT read-only, set up handlers.");
        this._on({
          change : this.updateValue.bind(this)
        });
      }else{
        bcdui.log.isTraceEnabled() && bcdui.log.trace("checkbox IS read-only, dont attach modification listeners.");
      }

      if(this.options.hint){
        // attach balloon or use @title
        if(this.options.displayBalloon){
          // balloon API
          checkboxEl.attr("bcdHint", this.options.hint);
          checkboxEl.attr("id", "input" + this.options.id);
          bcdui.widgetNg.commons.balloon.attach(checkboxEl, {noTooltip: config.extendedConfig.noTooltip});
        } else {
          checkboxEl.attr("title", this.options.hint);
        }
      }

      // apply disabled state
      if(this.options.disabled){
        this.disable();
      }

      // display constructed container
      this.element.show();

      // set autofocus after display
      if(this.options.autofocus){
        checkboxEl.focus();
      }

      bcdui.widgetNg.checkbox.getNavPath(this.element.id, function(id, value) {
        bcdui.widget._linkNavPath(id, value);
      }.bind(this));

    },

    /**
     * updates the widget with data from bound model.
     *
     * here we also implement SYNC_WRITE to the data model for
     * invalid- to valid transition, that is once widget becomes valid
     * after invalid state, it persists the value into the model
     *
     * @private
     */
    _syncValue: function(){
      var value = this._readDataFromXML().value||"";
      this.element.children("input").prop("checked", (value != null && ! !value.trim() && value != "0"))
      this.element.trigger(this.EVENT.SYNC_READ, {isValueEmpty : false});
    },

    /**
     * @return {Object} properties:
     *  widget: is the widget element to append to layout,
     *  control: A-element
     *
     * @private
     */
    _createInputControl: function(){

      var el = jQuery("<input/>");

      var opts = this.options;
      el.attr("tabindex", opts.tabindex);
      el.attr("autofocus", opts.autofocus);
      el.attr("readonly", opts.readonly);
      el.attr("type", "checkbox");

      // bind native html events, if defined
      ["onchange","onclick"].forEach(function(v){
        opts[v]&&el.attr(v, opts[v]);
      });

      if(opts.disabled){
        el.attr("disabled","disabled");
        el.addClass("bcdDisabled");
      }

      return el;
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
    _readDataFromXML: function(){
      bcdui.log.isTraceEnabled() && bcdui.log.trace("_readDataFromXML");
      var config = this.element.data("_config_");
      return {
        value: bcdui.widget._getDataFromXML(bcdui.factory.objectRegistry.getObject(config.target.modelId),config.target.xPath)
      }
    },

    /**
     * this function shall be called in order to accept value from GUI control into the model
     *
     */
    updateValue: function(){
      bcdui.log.isTraceEnabled() && bcdui.log.trace("updateValue(gui to data)");
      var config = this.element.data("_config_");

      bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.checkbox.updateValue: update via xpath : " + config.target.xPath + ", modelId: " + config.target.modelId);

      var guiValue = this.element.children("input").prop("checked") ? "1" : "0";
      var modelValue = this._readDataFromXML().value||"";
      // tells if current widget value differs from data value
      var hasValueChanged = guiValue != modelValue;

      bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.checkbox.updateValue: modelValue: " + modelValue + ", guiValue: " + guiValue);

      var hasWritten = false;
      if(hasValueChanged){
        this._writeDataToXML({
          value : guiValue
        });
        hasWritten = true;
        this.element.trigger(bcdui.widget.events.writeValueToModel);
      }else{
        bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.checkbox.updateValue: skip update due to unchanged value");
      }

      this.element.trigger(this.EVENT.SYNC_WRITE,{
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
     * - value
     *
     * @return {boolean} true in case the target document was changed
     *
     * @private
     */
    _writeDataToXML: function(params){
      bcdui.log.isTraceEnabled() && bcdui.log.trace("_writeDataToXML");
      var config = this.element.data("_config_");

      bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.bcduiCheckboxNg._writeDataToXML: writing data...");
      // tag that we're writing data ourself so that XMLUpdateListener
      // ignores and does not propagate this update.
      // the listener resets this flag on its own once it is run
      this._writingData=true;
      var ret = bcdui.widget._copyDataFromHTMLElementToTargetModel(
          bcdui.factory.objectRegistry.getObject(config.target.modelId),
          config.target.xPath,
          params.value,
          this.options.keepEmptyValueExpression,
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
      this._super();
      this.element.off().data("_config_", null);
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
    var e = jQuery.bcdFindById(id)._bcduiWidget();
    if (e) {
      var t = bcdui.factory._extractXPathAndModelId(e.options.targetModelXPath);
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
    callback(id, "");
  }

});
