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
  jQuery.widget("bcdui.bcduiPasteListNg", jQuery.bcdui.bcduiInputNg,
  /** @lends bcdui.bcduiTextAreaNg.prototype */
  {

    /**
     * @private
     */
    _getCreateOptions : function(){
      return bcdui.widgetNg.impl.readParams.pasteList(this.element[0]);
    },
    /**
     * @private
     */
    _validateOptions : function(){
      bcdui.widgetNg.impl.validateParams.pasteList(this.options);
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

    _syncValue: function(inputElementId) {
      this._superApply(arguments);
      var inputEl = bcdui._migPjs._$(inputElementId);
      let args = inputEl.data("_args_");
      var value = inputEl.val();
      // Here we accept only ',' as separator
      if( args["toUpper"] ) value = value.toUpperCase();
      var uniqueValues = value.split(args["outSep"] || ",").filter(function(item, i, ar){ return ar.indexOf(item) === i; });
      uniqueValues = uniqueValues.slice(0, args["maxVals"]);
      value = uniqueValues.join("\n");
      inputEl.val( value );
    },

    /**
     * @private
     */
    _createInputControl: function(args, config) {

      // Call textArea implementation. 
      // Not overwriting or calling this._super(args, config) does call input impl, so we can't use that one here
      let ret = jQuery.bcdui.bcduiTextAreaNg.prototype._createInputControl(args, config);

      // Our additional params
      let el = jQuery(ret.widget);
      el.attr("pasteSeps", args.pasteSeps);
      el.attr("outSep", args.outSep);
      el.attr("toUpper", args.toUpper);
      el.attr("maxVals", args.maxVals);

      return ret;
    },

    /**
     * this function shall be called in order to accept value from GUI control into the model
     */
    updateValue: function(inputElementId) {
      var inputEl = bcdui._migPjs._$(inputElementId);
      var guiValue = inputEl.val();
      let args = inputEl.data("_args_");
      if( !!guiValue.trim() ) {
        
        // Use configured separators?
        let separators = "[" + (args["pasteSeps"] || ";, \\|\\t\\n" ) + "]+";
        var re = new RegExp(separators,"g");
        let value = guiValue.trim().replace(re," ").split(" ");

        // Make values unique, limit to first maxVals values
        var uniqueValues = value.filter(function(item, i, ar){ return ar.indexOf(item) === i; });
        uniqueValues = uniqueValues.slice(0, args["maxVals"]);

        // Filter wants it , separated
        var filterValues = uniqueValues.join(args["outSep"] || ",");

        // Should it be case-insensitive?
        if( args["toUpper"] ) filterValues = filterValues.toUpperCase();

        inputEl.val(filterValues);
      } else {
        inputEl.val("");
      }
      this._superApply(arguments);
      // We display it one per row
      inputEl.val( inputEl.val().replace(new RegExp((args["outSep"] || ","),"g"),'\n') );
    }
  })
}());

/**
 * A namespace for the BCD-UI pasteList widget.
 * @namespace bcdui.widgetNg.pasteList
 * @private
 */
bcdui.util.namespace("bcdui.widgetNg.pasteList",
/** @lends bcdui.widgetNg.pasteList */
{
  init: function(htmlElement){
    bcdui.log.isDebugEnabled() && bcdui.log.debug("bcdui widget adapter init");
    jQuery(htmlElement).bcduiPasteListNg();
  }
});
