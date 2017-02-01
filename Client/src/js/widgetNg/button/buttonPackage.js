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
 * Button Widget Implementation as jQuery Widget
 */
(function(){
  jQuery.widget("bcdui.bcduiButtonNg",{

    _getCreateOptions : function(){
      return bcdui.widgetNg.impl.readParams.button(this.element[0]);
    },

    _create : function(){
      if(!this.options.id){
        this.options.id = bcdui.factory.objectRegistry.generateTemporaryId();
      }
      // @caption overrides @text for backwards compatibility
      if(this.options.caption){
        this.options.text=this.options.caption;
      }
      this.element.attr("id", this.options.id);
      bcdui.log.isDebugEnabled() && bcdui.log.debug("creating a button, title " + this.options.hint);

      var buttonControl = this._createButtonControl();
      var args = this.options;

      // bind actions
      this._on({
        "mousedown" : function(el){
          jQuery(buttonControl.control).toggleClass("bcdClicked");
        },
        "mouseup" : function(el){
          jQuery(buttonControl.control).toggleClass("bcdClicked");
        },
        "mouseout" : function(){
          jQuery(buttonControl.control).removeClass("bcdClicked");
        },
        "click" : function(){
          if(args.stayPressed){
            var el = jQuery(buttonControl.control);
            el.addClass("bcdClicked");
            jQuery(this.element).unbind(); // unbind all
            el.attr({
              href:null,
              onclick:null
            });
          }
          if(args.onClickAction){
            // execute JS onClickAction code settings context to control element
            if(bcdui.util.isString(args.onClickAction)){
              (function(){return eval(args.onClickAction)}).apply(this);
            }else{
              args.onClickAction.apply(this);
            }
          }
        }
      });

      // apply disabled state
      if(this.options.disabled){
        this.disable();
      }

      this.element.append(buttonControl.widget);

      // set autofocus after display
      if(this.options.autofocus){
        jQuery(buttonControl.control).focus();
      }

      // trigger translation
      bcdui.i18n.syncTranslateHTMLElement({elementOrId:this.element.get(0)});

      bcdui.widgetNg.button.getNavPath(this.element.attr("bcdTargetHtmlElementId"), function(id, value) {
        bcdui.widget._linkNavPath(id, value);
      }.bind(this));
    },

    /**
     * creates the button control
     *
     * @param element {Element} to initialize from
     * @private
     * @return \{widget: is the widget element to append to layout, control: A-element\}
     */
    _createButtonControl: function(){
      var el = jQuery("<a></a>");
      el.html(this.options.text);
      if(bcdui.i18n.isI18nKey(this.options.text)){
        el.attr("bcdTranslate", this.options.text);
      }
      el.attr("title", this.options.hint);
      el.attr("tabindex", this.options.tabindex);
      el.attr("autofocus", this.options.autofocus);

      var elWrap = jQuery("<span></span>").addClass("bcdButton");

      el.attr("href", this.options.href);

      elWrap.append(el);

      return {
        widget: elWrap.get(0),
        control: el.get(0)
      }
    }
  });
}());

/*
 * TODO convenience init adapter since generateWidgetApi.xslt currrently generates
 * bootstrap code like bcdui.widgetNg.button.init(targetHtmlElement), we have to change
 * it to jQuery Widget init style
 */

/**
 * A namespace for the BCUDI GUI button widget.
 * @namespace bcdui.widgetNg.button
 * @private
 */
bcdui.util.namespace("bcdui.widgetNg.button",
/** @lends bcdui.widgetNg.button */
{
  init: function(htmlElement){
    bcdui.log.isDebugEnabled() && bcdui.log.debug("bcdui widget adapter init");
    jQuery(htmlElement).bcduiButtonNg();
  },

  /**
   * returns NavPath information for widget via callback which is addressed by its targetHtmlId
   * @param {string} id targetHtmlElementId of widget
   */
  getNavPath: function(id, callback) {
    return callback(id, "");
  }

});
