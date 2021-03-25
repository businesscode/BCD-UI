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
(function(){
  /**
   * internal parameters (not in the public API):
   * @param {function}  [onItemMoved]                   See bcduiConnectable.onItemMoved; when provided this function is bound to both connectables.
   * @param {function}  [generateItemHtmlSource]        See bcduiConnectable.generateItemHtml, used for source box
   * @param {function}  [generateItemHtmlTarget]        See bcduiConnectable.generateItemHtml, used for target box
   * @param {boolean}   [doSortOptions=false]           See bcduiConnectable.doSortOptions, used for both boxes
   * @param {boolean}   [unselectAfterMove=false]       See bcduiConnectable.unselectAfterMove, used for both boxes
   * @param {object}    [treeConfig]                    Configuration according to bcdui.widgetng.connectable.TreeSupport
   *
   * @private
   */
  jQuery.widget("bcdui.bcduiSideBySideChooserNg", jQuery.bcdui.bcduiWidget, {
    EVENT: {
      SYNC_WRITE : "bcd:widget.sideBySideChooser.sync_write",
      SYNC_READ : "bcd:widget.sideBySideChooser.sync_read"
    },

    /**
     * @private
     */
    _getCreateOptions : function(){
      return bcdui.widgetNg.impl.readParams.sideBySideChooser(this.element[0]);
    },
    /**
     * @private
     */
    _validateOptions : function(){
      bcdui.widgetNg.impl.validateParams.sideBySideChooser(this.options);
    },

    /**
     * @private
     */
    _create : function() {
      this._super();

      var template = "<div class='bcdSideBySideChooser'>" +
        "<table>" +
          "<thead>" +
            "<tr><th class='bcdSbscSourceItemsHeader' bcdTranslate='{{=it.sourceCaption}}'>{{=it.sourceCaption}}</th><th></th><th class='bcdSbscTargetItemsHeader' bcdTranslate='{{=it.targetCaption}}'>{{=it.targetCaption}}</th><th></th></tr>" +
          "</thead>" +
        "<tbody>" +
          "<tr>" +
            "<td class='bcdCol' id='{{=it.id}}sbsLeft'></td>" +
            "<td class='bcdCol2'><span class='bcd-sbs-controls'><span class='bcdButton bcdToMainTarget'><a href='javascript:void(0)'></a></span><span class='bcdButton bcdToSource'><a href='javascript:void(0)'></a></span></span></td>" +
            "<td class='bcdCol3' id='{{=it.id}}sbsRight'></td>" +
            "<td class='bcdCol4'><span class='bcd-sbs-controls'><span class='bcdButton bcdMoveUp'><a href='javascript:void(0)'></a></span><span class='bcdButton bcdMoveDown'><a href='javascript:void(0)'></a></span></span></td>" +
           "</tr>" +
          "</tbody>" +
        "</table>" +
      "</div>";

      jQuery(this.element).append(
        doT.template(template)({
          sourceCaption: (this.options.sourceCaption || "Source")
        , targetCaption: (this.options.targetCaption || "Target")
        , id: this.options.id
        })
      );

      // trigger translation
      bcdui.i18n.syncTranslateHTMLElement({elementOrId:this.element.get(0)});

      // let's map attributes
      var args = {
            autofocus: this.options.autofocus
          , className: "bcdSbscList"
          , disabled:  this.options.disabled
          , displayBalloon: this.options.displayBalloon
          , doSortOptions: this.options.doSortOptions || false // maybe a future optional parameter
          // generateItemHtml - we use standard rendering
          , hint: this.options.hint
          // id - we already use the id for outer rendering and scope, so let the widget generate its own
          // isDoubleClickTarget - we use the default (1st target)
          , onBeforeChange: this.options.onBeforeChange
          , onChange: this.options.onChange
          , scope: this.options.id
          , showLasso: false
          // targetHtml - we rendered a tab, so we set our own ids now
          , unselectAfterMove: this.options.unselectAfterMove || false
          , wrsInlineValueDelim: this.options.wrsInlineValueDelim
          , disableDrag: false
          , onItemMoved: this.options.onItemMoved
          , allowUnknownTargetValue: this.options.allowUnknownTargetValue
      }
      var sourceArgs = {
          optionsModelRelativeFilterPredicate: this.options.optionsModelRelativeFilterPredicate
        , optionsModelRelativeValueXPath: this.options.optionsModelRelativeValueXPath
        , optionsModelXPath: this.options.optionsModelXPath
        , targetHtml: this.element.find("#" + this.options.id + "sbsLeft")
        , generateItemHtml: this.options.generateItemHtmlSource
      }
      var targetArgs = {
        targetModelXPath: this.options.targetModelXPath
        , targetHtml: this.element.find("#" + this.options.id + "sbsRight")
        , generateItemHtml: this.options.generateItemHtmlTarget
      }

      // treeMode: attach our handles
      if(this.options.treeConfig){
        var treeSupport = new bcdui.widgetNg.connectable.TreeSupport(this.element, this.options.treeConfig);
        jQuery.extend(args, {
          onItemMoved :             treeSupport.onItemMoved.bind(treeSupport),
          unselectAfterMove :       true
        });
        sourceArgs.generateItemHtml = treeSupport.generateItemHtml.bind(treeSupport);
        sourceArgs.sortOptionsFunction = treeSupport._optionsSortingFunction.bind(treeSupport);
      }

      sourceArgs = Object.assign(sourceArgs, args);
      targetArgs = Object.assign(targetArgs, args);

      // and generate the connectables
      bcdui.widgetNg.createConnectable(sourceArgs);
      bcdui.widgetNg.createConnectable(targetArgs);

      // click handler for buttons movement moving selected entries from source to target or vice versa
      jQuery("#" + this.options.id + " .bcd-sbs-controls").on("click", ".bcdToMainTarget, .bcdToSource", function(event){

        var from = "";
        var to = "";
        var element = jQuery(event.target).closest(".bcdButton");

        if (jQuery(element).hasClass("bcdToMainTarget")) {
          from = jQuery(event.target).closest(".bcdSideBySideChooser").find(".bcdSource").first();
          to = jQuery(event.target).closest(".bcdSideBySideChooser").find(".bcdTarget").first();
        }
        if (jQuery(element).hasClass("bcdToSource")) {
          from = jQuery(event.target).closest(".bcdSideBySideChooser").find(".bcdTarget").first();
          to = jQuery(event.target).closest(".bcdSideBySideChooser").find(".bcdSource").first();
        }
        if (from != to) {
          from._bcduiWidget()._moveSelectedItems(from, to);
        };
      });

      // up/down controls applicatable on 'to' area
      jQuery("#" + this.options.id + " .bcd-sbs-controls").on("click", ".bcdMoveUp, .bcdMoveDown", function(event){
        var el = jQuery(this);
        var isDirUp = el.hasClass("bcdMoveUp");
        el.closest(".bcdSideBySideChooser").find(".bcdTarget")._bcduiWidget()._moveSelectedItemsUpDown( isDirUp ? -1 : 1 );
      });

      if (this.options.enableNavPath) {
        bcdui.widgetNg.sideBySideChooser.getNavPath(this.element.id, function(id, value) {
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
 * A namespace for the BCD-UI sideBySideChooser widget. For creation @see {@link bcdui.widgetNg.createSideBySideChooser}
 * @namespace bcdui.widgetNg.sideBySideChooser
 */
bcdui.widgetNg.sideBySideChooser = Object.assign(bcdui.widgetNg.sideBySideChooser,
/** @lends bcdui.widgetNg.sideBySideChooser */
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
    bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui sideBySideChooser widget adapter init");
    jQuery(htmlElement).bcduiSideBySideChooserNg();
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
