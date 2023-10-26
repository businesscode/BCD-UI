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
 * API for an Date Input widget implementation as jQuery Widget and extends the bcduiInput
 * widget for implementation.
 *
 * This widget offers native and custom implementation dependending on the browser capabilities,
 * the native implementation utilizes html5 input type feature.
 *
 * native functions are implemented with "_ntv_" prefix, whereas custom implementation functions are
 * prefixed with "_cst_" prefixes.
 *
 * TODO: when implementing custom widget switch the implementation to has-a relation towards bcduiInput
 * widget rather than is-a (inheritance) and delegate the jQuery Widget API (setOptions, etc) according to specs
 */

(function(){
  jQuery.widget("bcdui.bcduiDateInputNg", jQuery.bcdui.bcduiInputNg,
  /** @lends bcdui.bcduiDateInputNg.prototype */
  {

    /**
     * @private
     */
    _getCreateOptions : function(){
      return bcdui.widgetNg.impl.readParams.dateInput(this.element[0]);
    },
    /**
     * @private
     */
    _validateOptions : function(){
      bcdui.widgetNg.impl.validateParams.dateInput(this.options);
    },

    /**
     * @private
     */
    _create : function(){
      // normalize type
      var inputType;
      if(this.options.type == "yrMonth"){
        inputType="month";
      }else{
        inputType="date";
      }

      var isNative = bcdui.browserCompatibility._hasFeature("inputtypes." + inputType);

      bcdui.log.isDebugEnabled() && bcdui.log.debug("type: " + this.options.type);
      bcdui.log.isDebugEnabled() && bcdui.log.debug("native: " + isNative);

      if(isNative){
        /*
         * in case of native implementation we rewrite the API as needed and construct the input widget with appropriate @type
         */

        // disable reset control, since native implementation provides it
        this.options.disableResetControl = true;
        // make compatible with input type API

        this.options.extendedConfig = { noTooltip: true, type : inputType };

        // construct the bcduiInput widget
        this._superApply(this.options);
      }else{
        // custom implementation TODO
        this.element.text("!no native widget support for this browser!");
        bcdui.log.warn("custom implementtion todo");
      }
    }
  })
}(jQuery));

/*
 * TODO convenience init adapter since generateWidgetApi.xslt currrently generates
 * bootstrap code like bcdui.widgetNg.button.init(targetHtmlElement), we have to change
 * it to jQuery Widget init style
 */


/**
 * A namespace for the BCD-UI dateInput widget.
 * @namespace bcdui.widgetNg.dateInput
 * @private
 */
bcdui.widgetNg.dateInput = Object.assign(bcdui.widgetNg.dateInput,
/** @lends bcdui.widgetNg.dateInput */
{
  init: function(htmlElement){
    bcdui.log.isDebugEnabled() && bcdui.log.debug("bcdui widget adapter init");
    jQuery(htmlElement).bcduiDateInputNg();
  }
});
