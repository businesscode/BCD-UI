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
 * Button Widget Implementation as jQuery Widget
 */
(function(){
  jQuery.widget("bcdui.bcduiButtonNg", jQuery.bcdui.bcduiWidget, {

    _getCreateOptions : function(){
      return bcdui.widgetNg.impl.readParams.button(this.element[0]);
    },

    _validateOptions : function(){
      bcdui.widgetNg.impl.validateParams.button(this.options);
    },

    _create : function(){
      this._super();

      // @caption overrides @text for backwards compatibility
      if(this.options.caption){
        this.options.text=this.options.caption;
      }
      bcdui.log.isDebugEnabled() && bcdui.log.debug("creating a button, title " + this.options.hint);

      var buttonControl = this._createButtonControl();
      var args = this.options;

      if (this.options.optionsModelXPath) {
        var info = bcdui.factory._extractXPathAndModelId(this.options.optionsModelXPath);
        this.element.attr("bcdOptionsModelId", info.modelId);
        this.element.attr("bcdOptionsModelXPath", info.xPath);
        this.element.attr("bcdOptionsModelRelativeValueXPath", this.options.optionsModelRelativeValueXPath);
        var config = {
          element: this.element.get(0),
          optionsModelId: info.modelId,
          optionsModelXPath: info.xPath,
          optionsModelRelativeValueXPath: this.options.optionsModelRelativeValueXPath
        };
        var models = bcdui.widget._extractModelsFromModelXPath(config.optionsModelXPath);
        if (models) {
          bcdui.widget._createWrapperModel(models, config, "widget/multiOptionsModelWrapper.xslt"); // does change config!
        }
      }

      // bind actions
      this._on({
        "mousedown" : function(){
          jQuery(buttonControl.control).toggleClass("bcdClicked");
        },
        "mouseup" : function(){
          jQuery(buttonControl.control).toggleClass("bcdClicked");
        },
        "mouseout" : function(){
          jQuery(buttonControl.control).removeClass("bcdClicked");
        },
        "click" : function(event){
          var el = jQuery(buttonControl.control);
          if(args.stayPressed){
            el.addClass("bcdClicked");
            this.element.off(); // unbind all
            el.attr({
              href:null,
              onclick:null
            });
          }
          if(this.options.onClickAction){
            if (this.options.optionsModelXPath) {
              this._renderDropDownButtonControl(el);
              event.stopPropagation();
              event.preventDefault();
            }
            else {
              // execute JS onClickAction code settings context to control element
              window.setTimeout(this.options.onClickAction.bind(el.get(0)),0);
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

    },

    /**
     * creates the button control
     *
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

      var elWrap = jQuery("<span></span>").addClass("bcdButton btn-primary");
      if (this.options.optionsModelXPath) {
        elWrap.addClass("bcdDropDownButton");
        el.addClass("closed");
        if (! el.attr("tabindex"))
          el.attr("tabindex", "0") // anchor requires a tabindex since we want to listen on blur events
      }

      el.attr("href", this.options.href);

      elWrap.append(el);

      return {
        widget: elWrap.get(0),
        control: el.get(0)
      }
    },

    /**
     * @private
     */
    _renderDropDownButtonControl: function(el){

      var self = this;
      var isExpanded = el.hasClass("opened");

      // remove possibly existing div and listeners
      bcdui.widgetNg.button._cleanup(el);

      // if we're expanded already, change style and leave
      if (isExpanded)
        return;

      // otherwise build up list out of options model
      el.removeClass("closed").addClass("opened");

      var container = el.closest("*[bcdOptionsModelId]");
      var config = {
          optionsModelRelativeValueXPath: container.attr("bcdOptionsModelRelativeValueXPath")
        , optionsModelXPath: container.attr("bcdOptionsModelXPath")
        , optionsModelId: container.attr("bcdOptionsModelId")
      };

      bcdui.factory.objectRegistry.withReadyObjects(config.optionsModelId, function(){

        var outer = el.closest(".bcdButton");
        var outerpadL = parseInt(outer.css("paddingLeft"), 10);
        var outerborL = parseInt(el.css("borderLeftWidth"), 10);
        outerpadL = !outerpadL || outerpadL == "" || isNaN(outerpadL) ? 0 : outerpadL;
        outerborL = !outerborL || outerborL == "" || isNaN(outerborL) ? 0 : outerborL;

        // get padding and offset to clone buttons
        var padL = parseInt(el.css("paddingLeft"), 10);
        var padR = parseInt(el.css("paddingRight"), 10);
        padL = !padL || padL == "" || isNaN(padL) ? 0 : padL;
        padR = !padR || padR == "" || isNaN(padR) ? 0 : padR;
        var borL = parseInt(el.css("borderLeftWidth"), 10);
        var borR = parseInt(el.css("borderRightWidth"), 10);
        borL = !borL || borL == "" || isNaN(borL) ? 0 : borL;
        borR = !borR || borR == "" || isNaN(borR) ? 0 : borR;
        var left = (outer.offset().left + outerpadL + outerborL);

        // build flyover div, add options
        var dropDown = "<div id='bcdDropDownButton' style='display: none'><ul>"
        var i = 0;
        jQuery.makeArray(bcdui.factory.objectRegistry.getObject(config.optionsModelId).getData().selectNodes(config.optionsModelXPath)).forEach(function(n) {
          var caption = n.text;
          var idValue = n.text;
          if (config.optionsModelRelativeValueXPath) {
            idValue = n.selectSingleNode(config.optionsModelRelativeValueXPath);
            idValue = idValue != null ? idValue.text : idValue;
          }
          idValue = bcdui.util.escapeHtml(idValue);
          dropDown += "<li bcdValue='" + idValue + "'><span class='bcdButton btn-primary'><a href='#' style='min-width: " + (el.outerWidth() - padL - padR - borL - borR) + "px;' bcdTranslate='" + caption + "'>" + caption + "</a></span></li>";
          i++;
        });
        dropDown += "</ul></div>";
        jQuery("body").append(dropDown);
        
        // mouse position listeners over absolute div as helper for blur
        jQuery("#bcdDropDownButton").on("mouseenter", function() {jQuery("#bcdDropDownButton").addClass("bcdInside");});
        jQuery("#bcdDropDownButton").on("mouseleave", function() {jQuery("#bcdDropDownButton").removeClass("bcdInside");});

        // add listener on the li items
        jQuery("#bcdDropDownButton").on("click", "li", function(event) {
          event.stopPropagation();
          event.preventDefault();

          var oTarget = jQuery(event.target).closest("li");
          var value = oTarget.attr("bcdValue");

          bcdui.widgetNg.button._cleanup(el);

          window.setTimeout(self.options.onClickAction.bind(el.get(0), value),0);
        });

        // blur listener to get outer clicks (close drop down)
        jQuery(el).on("blur", function(event) {
          // in case we're over the absolute div, we don't do anything, closing is done by click handler
          // otherwise clean up
          if (! jQuery("#bcdDropDownButton").hasClass("bcdInside")) {
            bcdui.widgetNg.button._cleanup(el);
          }
        });
        // set x/y pos to bottom left of the button and show drop down
        jQuery("#bcdDropDownButton").css({top: outer.offset().top + outer.outerHeight(), left: left, fontSize: el.css("fontSize")});
        jQuery("#bcdDropDownButton").show();
      });
    }
  });
}());

/**
 * A namespace for the BCD-UI button widget. For creation @see {@link bcdui.widgetNg.createButton}
 * @namespace bcdui.widgetNg.button
 */
bcdui.widgetNg.button = Object.assign(bcdui.widgetNg.button,
/** @lends bcdui.widgetNg.button */
{
  /**
   * @param htmlElement
   * @private
   */
  init: function(htmlElement){
    bcdui.log.isDebugEnabled() && bcdui.log.debug("bcdui widget adapter init");
    jQuery(htmlElement).bcduiButtonNg();
  },

  /** 
   * @private
  */
  _cleanup: function(el) {
    jQuery(el).off("blur");
    jQuery("#bcdDropDownButton").off("click");
    jQuery("#bcdDropDownButton").off("mouseenter");
    jQuery("#bcdDropDownButton").off("mouseleave");
    jQuery("#bcdDropDownButton").remove();
    el.removeClass("opened").addClass("closed");
  }
});
