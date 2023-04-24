/*
  Copyright 2010-2023 BusinessCode GmbH, Germany

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

(function(){
  jQuery.widget("bcdui.bcduiInputLookupNg", jQuery.bcdui.bcduiWidget,
    /** @lends bcdui.bcduiInputLookupNg */
  {

    _getCreateOptions : function(){
      return bcdui.widgetNg.impl.readParams.inputLookup(this.element[0]);
    },

    _validateOptions : function(){
      bcdui.widgetNg.impl.validateParams.inputLookup(this.options);
    },

    _create : function(){
      this._super();
      bcdui.log.isTraceEnabled() && bcdui.log.trace("creating inputlookup widget with config ");
      
      const keyStroke = new bcdui.core.ConstantDataProvider({ name : "keyStroke", value : "" })
      bcdui.factory.objectRegistry.registerObject(keyStroke);

      const wrq = new bcdui.core.SimpleModel({
        url: new bcdui.core.RequestDocumentDataProvider({
          requestModel: new bcdui.core.ModelWrapper({
              chain: bcdui.config.jsLibPath + "widgetNg/inputLookup/request.xslt"
            , parameters: {
                keyStroke: keyStroke
              , bRef: this.options.bRef
              , bindingSet: this.options.bindingSetId
              , max: this.options.max || 10
              , lookupType: this.options.lookupType || "startswith"
              }
          })
        })
      });
      bcdui.factory.objectRegistry.registerObject(wrq);

      const el = jQuery("<span class='bcdInputLookup'></span>");
      el.attr("id", "label_" + this.options.id);
      this._createLabel(el.attr("id"));
      this.element.append(el);

      let timeout = null;

      const params = {
        doTrimInput: true
      , disableNativeSupport: true
      , targetModelXPath: this.options.targetModelXPath
      , optionsModelXPath: "$" + wrq.id + "/*/wrs:Data/wrs:R/wrs:C[1]"
      , targetHtml: this.element.find(".bcdInputLookup").get(0)
      , filterFunction: function(args) {

          // no value, simply show the last loaded one (if available)
          if (args.value == "")
            return false;

          // we started a timeout already, kill it
          if (timeout != null) {
            clearTimeout(timeout);
            timeout = null;
          }

          // start a new timeout
          timeout = setTimeout(function() {

            // take over keystroke value
            keyStroke.value = args.value;

            // refresh dataprovider/modelwrapper
            wrq.urlProvider.requestModel.onReady({onlyFuture: true, onlyOnce: true, onSuccess: function() {
              wrq.urlProvider.onReady({onlyFuture: true, onlyOnce: true, onSuccess: function() {
                wrq.onReady({onlyFuture: true, onlyOnce: true, onSuccess: function() {
                  args.onComplete();
                }});
                wrq.execute(true);
              }});
              wrq.urlProvider.execute(true);
            }});
            wrq.urlProvider.requestModel.execute(true);
          }, this.options.delay || 500);

          return true;

        }.bind(this)
      };

      bcdui.widgetNg.createSuggestInput(params);

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

/**
 * A namespace for the BCD-UI inputLookup widget.
 * @namespace bcdui.widgetNg.inputLookup
 * @private
 */
bcdui.widgetNg.inputLookup = Object.assign(bcdui.widgetNg.inputLookup,
/** @lends bcdui.widgetNg.inputLookup */
{
  /**
   * @private
   */
  init: function(htmlElement){
    bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui inputlookup widget adapter init");
    jQuery(htmlElement).bcduiInputLookupNg();
  }
});
