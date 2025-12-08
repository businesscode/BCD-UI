/*
  Copyright 2010-2022 BusinessCode GmbH, Germany

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
 * Label Widget Implementation as jQuery Widget
 */
(function(){
  /**
   * Listens to updates on the options model and rerenders the widget
   *
   * @method
   * @private
   * @extends bcdui.widget.XMLDataUpdateListener
   */
  var XMLListener = class extends bcdui.widget.XMLDataUpdateListener
    {
      updateValue(){
        var widgetEl = jQuery("#" + this.htmlElementId);
        if (widgetEl.length > 0) {
          var widgetInstance = widgetEl._bcduiWidget();
          if (widgetInstance)
            widgetInstance._render();
        }
      }
  };

  jQuery.widget("bcdui.bcduiLabelNg", jQuery.bcdui.bcduiWidget, {

    _getCreateOptions : function(){
      return bcdui.widgetNg.impl.readParams.label(this.element[0]);
    },

    _validateOptions : function(){
      bcdui.widgetNg.impl.validateParams.label(this.options);
    },

    /**
     * @private
     */
    _destroy: function() {
      this._super();
      if (this.updateValueListener) {
        this.updateValueListener.unregister();
        this.updateValueListener = null;
      }
    },

    _create : function(){
      this._super();

      // @caption overrides @text for backwards compatibility
      if (this.options.caption)
        this.options.text=this.options.caption;

      bcdui.log.isDebugEnabled() && bcdui.log.debug("creating a label, title " + this.options.hint);

      var args = this.options;
      this.config = {
        element: this.element.get(0),
        elementId: args.id
      };

      if (this.options.optionsModelXPath) {
        var info = bcdui.factory._extractXPathAndModelId(this.options.optionsModelXPath);
        this.config = Object.assign(this.config, {
          optionsModelId: info.modelId,
          optionsModelXPath: info.xPath
        });
        var models = bcdui.widget._extractModelsFromModelXPath(this.config.optionsModelXPath);
        if (models)
          bcdui.widget._createWrapperModel(models, config, "widget/multiOptionsModelWrapper.xslt"); // does change config!
      }

      // create container
      var elWrap = jQuery("<span></span>").addClass("bcdLabel");
      elWrap.attr("title", this.options.hint);
      elWrap.attr("tabindex", this.options.tabindex);
      this.element.append(elWrap);

      // render label(s)
      this._render();

      // add listener on optionsModelChange
      if (this.config.optionsModelXPath) {
        var updateValueListener = new XMLListener({
          idRef: this.config.optionsModelId,
          trackingXPath: this.config.optionsModelXPath,
          htmlElementId: this.config.elementId
        });
        bcdui.factory.addDataListener(updateValueListener);
        this.updateValueListener = updateValueListener;
      }
    },

    _render: function() {
      var el = "";
      if (this.config.optionsModelId) {
        bcdui.factory.objectRegistry.withReadyObjects(this.config.optionsModelId, function(){
          var model = bcdui.factory.objectRegistry.getObject(this.config.optionsModelId);
          Array.from(model.queryNodes(this.config.optionsModelXPath)).forEach(function(value){
            el += "<label" + (bcdui.i18n.isI18nKey(value.text) ? (" bcdTranslate='"+value.text.substring(1)+"'></label>") : (">" + bcdui.util.escapeHtml(value.text) + "</label>"));
          });
          jQuery(this.config.element).find(".bcdLabel").empty().append(el);
          bcdui.i18n.syncTranslateHTMLElement({elementOrId:this.config.element});
        }.bind(this));
      }
      else {
        el = "<label" + (bcdui.i18n.isI18nKey(this.options.text) ? (" bcdTranslate='"+this.options.text.substring(1)+"'></label>") : (">" + bcdui.util.escapeHtml(this.options.text) + "</label>"));
        jQuery(this.config.element).find(".bcdLabel").empty().append(el);
        bcdui.i18n.syncTranslateHTMLElement({elementOrId:this.config.element});
      }
    }
  });
}());

/**
 * A namespace for the BCD-UI label widget.
 * @namespace bcdui.widgetNg.label
 * @private
 */
bcdui.widgetNg.label = Object.assign(bcdui.widgetNg.label,
/** @lends bcdui.widgetNg.label */
{
  /**
   * @private
   */
  init: function(htmlElement){
    bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui label widget adapter init");
    jQuery(htmlElement).bcduiLabelNg();
  }
});
