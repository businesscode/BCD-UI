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
      // set a fake optionsModelXPath to avoid validation of suggestInput mandatory parameter, will be replaced with real one later on
      this.options["optionsModelXPath"] = "bcd";

      this._super();
      bcdui.log.isTraceEnabled() && bcdui.log.trace("creating inputlookup widget with config ");

      // optional filter
      let filterDp = new bcdui.core.StaticModel("<Root/>");
      if (this.options.filterElement) {
        if( typeof this.options.filterElement === "string" )
          this.options.filterElement = bcdui.wrs.wrsUtil.parseFilterExpression(this.options.filterElement);
        filterDp.dataDoc = this.options.filterElement;
      }

      const keyStroke = new bcdui.core.ConstantDataProvider({ name : "keyStroke", value : "" })
      bcdui.factory.objectRegistry.registerObject(keyStroke);

      const optionsModel = new bcdui.core.StaticModel("<Empty/>");
      bcdui.factory.objectRegistry.registerObject(optionsModel);

      const wrq = new bcdui.core.SimpleModel({
        url: new bcdui.core.RequestDocumentDataProvider({
          requestModel: new bcdui.core.ModelWrapper({
              chain: bcdui.config.jsLibPath + "widgetNg/inputLookup/request.xslt"
            , parameters: {
                keyStroke: keyStroke
              , bRef: this.options.bRef
              , bindingSet: this.options.bindingSetId
              , rowEnd: this.options.rowEnd || 10
              , lookupType: this.options.wildcard || "startswith"
              , filterDp: filterDp
              }
          })
        })
      });
      bcdui.factory.objectRegistry.registerObject(wrq);

      const el = jQuery("<span class='bcdInputLookup'></span>");
      this.element.append(el);

      let timeout = null;

      const params = {
        optionsModelXPath: "$" + optionsModel.id + "/*/wrs:Data/wrs:R/wrs:C[1]"
      , disableNativeSupport: true
      , targetHtml: this.element.find(".bcdInputLookup").get(0)
      , filterFunction: function(args) {

          const iValue = args.value;

          // no value, simply show the last loaded one (if available)
          if (iValue == "" || keyStroke.value == iValue)
            return false;

          // we started a timeout already, kill it
          if (timeout != null) {
            clearTimeout(timeout);
            timeout = null;
          }

          // avoid reload if we only limit already loaded values
          if (keyStroke.value.length != 0 && keyStroke.value.length <= iValue.length && iValue.startsWith(keyStroke.value) && wrq.queryNodes("/*/wrs:Data/wrs:R").length < self.options.rowEnd)
            return false;

          // start a new timeout
          timeout = setTimeout(function() {

            // take over keystroke value
            keyStroke.value = iValue;

            // refresh dataprovider/modelwrapper
            wrq.urlProvider.requestModel.onReady({onlyFuture: true, onlyOnce: true, onSuccess: function() {
              wrq.urlProvider.onReady({onlyFuture: true, onlyOnce: true, onSuccess: function() {
                wrq.onReady({onlyFuture: true, onlyOnce: true, onSuccess: function() {
                  optionsModel.dataDoc = wrq.dataDoc;
                  optionsModel.fire();
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

      bcdui.widgetNg.createSuggestInput(jQuery.extend(this.options, params));

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
