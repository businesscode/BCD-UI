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
(function(){
  /**
   * @private
   */
  jQuery.widget("bcdui.bcduiChipsChooserNg", jQuery.bcdui.bcduiWidget, {
    EVENT: {
      SYNC_WRITE : "bcd:widget.chipsChooser.sync_write",
      SYNC_READ : "bcd:widget.chipsChooser.sync_read"
    },

    /**
     * @private
     */
    _getCreateOptions : function(){
      return bcdui.widgetNg.impl.readParams.chipsChooser(this.element[0]);
    },
    /**
     * @private
     */
    _validateOptions : function(){
      bcdui.widgetNg.impl.validateParams.chipsChooser(this.options);
    },

    /**
     * @private
     */
    _create : function() {
      this._super();

      var template = "<div class='bcdChipChooser' id='{{=it.id}}'><div class='bcdUpper'></div><div class='bcdMiddle'><span class='form-control bcdDown' bcdTranslate='bcd_singleSelect_please_select'></span></div><div class='bcdLowerContainer'  style='display:none'><div class='bcdLower form-control'></div></div></div>";

      jQuery(this.element).append( doT.template(template)({ id: this.options.id }) );

      // trigger translation
      bcdui.i18n.syncTranslateHTMLElement({elementOrId:this.element.get(0)});

      // let's map attributes
      var args = {
            autofocus: this.options.autofocus
          , disabled:  this.options.disabled
          , displayBalloon: this.options.displayBalloon
          , doSortOptions: this.options.doSortOptions || true
          , hint: this.options.hint
          , onBeforeChange: this.options.onBeforeChange
          , onChange: this.options.onChange
          , scope: this.options.id
          , showLasso: true
          , unselectAfterMove: true
          , wrsInlineValueDelim: this.options.wrsInlineValueDelim
          , disableDrag: false
          , onItemMoved: this.options.onItemMoved
          , allowUnknownTargetValue: this.options.allowUnknownTargetValue
      }
      var sourceArgs = {
          optionsModelRelativeValueXPath: this.options.optionsModelRelativeValueXPath
        , optionsModelXPath: this.options.optionsModelXPath
        , targetHtml: this.element.find(".bcdLower")
        , generateItemHtml: function(args1) { return "<li class='ui-selectee' bcdValue='" + args1.value + "' bcdPos='" + args1.position + "' bcdLoCase='" + args1.caption.toLowerCase() + "' title='" + args1.caption + "'><span class='bcdItem'>" + args1.caption + "<i class='bcdCloseItem'></i></span></li>"; }
     }
      var targetArgs = {
          targetModelXPath: this.options.targetModelXPath
        , targetHtml: this.element.find(".bcdUpper")
        , dblClick: false
        , generateItemHtml: function(args1) { return "<li class='ui-selectee' bcdValue='" + args1.value + "' bcdPos='" + args1.position + "' bcdLoCase='" + args1.caption.toLowerCase() + "' title='" + args1.caption + "'><span class='bcdItem'>" + args1.caption + "<i class='bcdCloseItem'></i></span></li>"; }
        , generateItemHelperHtml: function(event, item) {
            var selectedItems = this.container.children('.ui-selected').not(".ui-sortable-placeholder").add(item);
            var caption = "<ul>";
            for (var i = 0; i < selectedItems.length && i < 5; i++)
              caption += "<li><span class='bcdItem'>" + jQuery(selectedItems[i]).find(".bcdItem").text() + "</span></li>";
            if (selectedItems.length > 5)
              caption += "<li>[...]</li>";
            caption += "</ul>";
            return jQuery(caption);
        }
      }

      sourceArgs = Object.assign(sourceArgs, args);
      targetArgs = Object.assign(targetArgs, args);

      bcdui.widgetNg.createConnectable(sourceArgs);
      bcdui.widgetNg.createConnectable(targetArgs);

      // clone dblclick behaviour from connectables and make it available as click on closing icon
      jQuery(this.element).find(".bcdUpper").on("click", ".bcdCloseItem", function(event) {
        var self = jQuery(event.target).closest("ul").parent()._bcduiWidget();
        var target = jQuery("[bcdScope='" + self.options.scope + "'].bcdDblClkTarget");
        target = target.length > 0 ? target : self._getScopedTargetContainers();
        var from = self.container; // we filter on li in this function, so use the outer box as 'from'
        var to = (jQuery(from).hasClass("bcdSource")) ? target.first() : self._getScopedSourceContainer();
        self._moveSelectedItems(from, to);
      });

      jQuery(this.element).find(".bcdMiddle span").on("click", function(event) {
        jQuery(event.target).toggleClass("bcdUp bcdDown");
        jQuery(event.target).closest(".bcdChipChooser").find(".bcdLowerContainer").toggle();
      });

      if (this.options.enableNavPath) {
        bcdui.widgetNg.chipsChooser.getNavPath(this.element.id, function(id, value) {
          bcdui.widget._linkNavPath(id, value);
        }.bind(this));
      }
    },

    /**
     * @private
     */
    _destroy: function() {
      this._super();
    }
  });
}());

/**
 * A namespace for the BCD-UI chipsChooser widget. For creation @see {@link bcdui.widgetNg.createChipsChooser}
 * @namespace bcdui.widgetNg.chipsChooser
 */
bcdui.widgetNg.chipsChooser = Object.assign(bcdui.widgetNg.chipsChooser,
/** @lends bcdui.widgetNg.chipsChooser */
{
  /**
   * onBeforeChange dir attribute value, can be used to identify the direction of the item move
   * @static
   */
  CHANGE_DIRECTION : {
      SRC_TO_TARGET : bcdui.widgetNg.connectable.CHANGE_DIRECTION.SRC_TO_TARGET
    , TARGET_TO_SRC : bcdui.widgetNg.connectable.CHANGE_DIRECTION.TARGET_TO_SRC
  },

   init: function(htmlElement){
    bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui chipsChooser widget adapter init");
    jQuery(htmlElement).bcduiChipsChooserNg();
  },

  /**
   * @param {string} id targetHtml of widget
   * @param {function} callback to be called with generated caption
   * @return {string} NavPath information via callback for widget
   */
  getNavPath: function(id, callback) {
    var e = jQuery.bcdFindById(id).get(0);
    if (e) {
      bcdui.widget._getCaptionFromWidgetElement(e, function(value) {
        callback(id, value);
      });
      return;
    }
    callback(id, "");
  }

});