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
 * API for an Text Area widget implementation as jQuery Widget and extends the bcduiInput
 * widget for implementation.
 */

(function(){
  jQuery.widget("bcdui.bcduiTextAreaNg", jQuery.bcdui.bcduiInputNg,
  /** @lends bcdui.bcduiTextAreaNg.prototype */
  {

    /**
     * @private
     */
    _getCreateOptions : function(){
      return bcdui.widgetNg.impl.readParams.textArea(this.element[0]);
    },
    /**
     * @private
     */
    _validateOptions : function(){
      bcdui.widgetNg.impl.validateParams.textArea(this.options);
    },

    /**
     * @private
     */
    _createInputControl: function(args, config){
      var el = jQuery("<textarea class='form-control'></textarea>");

      el.attr("id", config.inputElementId);
      // the hints are handled by balloons
      el.attr("bcdHint", args.hint);
      el.attr("tabindex", args.tabindex);
      el.attr("autofocus", args.autofocus);
      el.attr("maxlength", args.maxlength);
      el.attr("placeholder", args.placeholder);
      el.attr("pattern", args.pattern);
      el.attr("required", args.required);
      el.attr("readonly", args.readonly);
      el.attr("cols", args.cols);
      el.attr("rows", args.rows);

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
    }
  })
}());

/**
 * A namespace for the BCD-UI textArea widget.
 * @namespace bcdui.widgetNg.textArea
 * @private
 */
bcdui.widgetNg.textArea = Object.assign(bcdui.widgetNg.textArea,
/** @lends bcdui.widgetNg.textArea */
{
  init: function(htmlElement){
    bcdui.log.isDebugEnabled() && bcdui.log.debug("bcdui widget adapter init");
    jQuery(htmlElement).bcduiTextAreaNg();
  }
});
