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
 * API for an Text Area widget implementation as jQuery Widget and extends the bcduiInput
 * widget for implementation.
 */

(function(){
  jQuery.widget("bcdui.bcduiTextAreaNg", jQuery.bcdui.bcduiInputNg, {

    /**
     * @private
     */
    _getCreateOptions : function(){
      return bcdui.widgetNg.impl.readParams.textArea(this.element[0]);
    },

    /**
     * @private
     */
    _createInputControl: function(args, config){
      var el = jQuery("<textarea></textarea>");

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
     * @private
     */
    _setOption : function(k,v){
      this._superApply(arguments);
      if("disabled" == k){
        v = (v+"")=="true";
        var el = jQuery(this.element).children("textarea");
        el.prop("disabled", v);
        if(v){
          el.addClass("bcdDisabled");
        }else{
          el.removeClass("bcdDisabled");
        }
      }
    }

  })
}());
/*
 * TODO convenience init adapter since generateWidgetApi.xslt currrently generates
 * bootstrap code like bcdui.widgetNg.button.init(targetHtmlElement), we have to change
 * it to jQuery Widget init style
 */
/**
 * A namespace for the BCUDI GUI textArea widget.
 * @namespace bcdui.widgetNg.textArea
 * @private
 */
bcdui.util.namespace("bcdui.widgetNg.textArea",
/** @lends bcdui.widgetNg.textArea */
{
  init: function(htmlElement){
    bcdui.log.isDebugEnabled() && bcdui.log.debug("bcdui widget adapter init");
    jQuery(htmlElement).bcduiTextAreaNg();
  }
});
