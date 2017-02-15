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
(function(){
  jQuery.widget("bcdui.bcduiSideBySideChooserNg",
  /** @lends bcdui.bcduiSideBySideChooserNg.prototype */
  {
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
    _create : function() {

      if(!this.options.id)
        this.options.id = "sideBySideChooser_"+bcdui.factory.objectRegistry.generateTemporaryId();
      this.element.attr("id", this.options.id);

      var template = "<div class='bcdSideBySideChooser'>" +
        "<table>" +
          "<thead>" +
            "<tr><th class='bcdSbscSourceItemsHeader' bcdTranslate='{{=it.sourceKey}}'>{{=it.sourceCaption}}</th><th></th><th class='bcdSbscTargetItemsHeader' bcdTranslate='{{=it.targetKey}}'>{{=it.targetCaption}}</th><th></th></tr>" +
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
          sourceKey: this.options.sourceCaptionKey
        , targetKey: this.options.targetCaptionKey
        , sourceCaption: (this.options.defaultSourceCaption || "Source")
        , targetCaption: (this.options.defaultTargetCaption || "Target")
        , id: this.options.id
        })
      );

      // let's map attributes
      var args = {
            autofocus: this.options.autofocus
          , className: "bcdSbscList"
          , disabled:  this.options.disabled
          , displayBalloon: this.options.displayBalloon
          , doSortOptions: true // maybe a future optional parameter
          // generateItemHtml - we use standard rendering
          , hint: this.options.hint
          // id - we already use the id for outer rendering and scope, so let the widget generate its own
          // isDoubleClickTarget - we use the default (1st target)
          , onBeforeChange: this.options.onBeforeChange
          , onChange: this.options.onChange
          , scope: this.options.id
          , showLasso: false
          // targetHtmlElementId - we rendered a tab, so we set our own ids now
          , unselectAfterMove: false
          , wrsInlineValueDelim: this.options.wrsInlineValueDelim
          , disableDrag: false
      }
      var sourceArgs = {
          optionsModelRelativeFilterPredicate: this.options.optionsModelRelativeFilterPredicate
        , optionsModelRelativeValueXPath: this.options.optionsModelRelativeValueXPath
        , optionsModelXPath: this.options.optionsModelXPath
        , targetHtmlElementId: this.options.id + "sbsLeft"
      }
      var targetArgs = {
        targetModelXPath: this.options.targetModelXPath
        , targetHtmlElementId: this.options.id + "sbsRight"
      }

      jQuery.extend(sourceArgs, args);
      jQuery.extend(targetArgs, args);

      // and generate the connectables
      bcdui.widgetNg.createConnectable(sourceArgs);
      bcdui.widgetNg.createConnectable(targetArgs);

      // click handler for buttons movement moving selected entries from source to target or vice versa
      jQuery("#" + this.options.id + " .bcd-sbs-controls a").click(function(event) {

        var from = to = "";

        if (jQuery(event.target).parent().hasClass("bcdToMainTarget")) {
          from = jQuery(event.target).closest(".bcdSideBySideChooser").find(".bcdSource").first();
          to = jQuery(event.target).closest(".bcdSideBySideChooser").find(".bcdTarget").first();
        }
        if (jQuery(event.target).parent().hasClass("bcdToSource")) {
          from = jQuery(event.target).closest(".bcdSideBySideChooser").find(".bcdTarget").first();
          to = jQuery(event.target).closest(".bcdSideBySideChooser").find(".bcdSource").first();
        }
        if (from != to) {

          if (jQuery(from).children('.ui-selected').not(".ui-sortable-placeholder").length > 0) {

            var widgetEl = jQuery(to).closest("[bcdWidgetFullName]");
            widgetEl = widgetEl.data(widgetEl.attr("bcdWidgetFullName"));

            if (widgetEl.onBeforeChange({element:jQuery("#" + widgetEl.config.elementId).get(0), dir: widgetEl._getMoveType(from, to), itemCount: jQuery(from).children('.ui-selected').not(".ui-sortable-placeholder").length})) {
              // on a move, clear selected items in the target first, so only the new added ones remain active
              jQuery(to).children('.ui-selected').removeClass("ui-selected bcdConnectableHover");

              // the actual move...
              jQuery(from).children('.ui-selected').not(".ui-sortable-placeholder").appendTo(to);

              // resort source side since source side should use original ordering
              if (jQuery(to).hasClass("bcdSource"))
                widgetEl._sort(jQuery(to));

              // and update XML
              widgetEl._writeDataToXML(from, to);
            }
          }
        };
      });

      // up/down controls applicatable on 'to' area
      jQuery("#" + this.options.id + " .bcd-sbs-controls").on("click", ".bcdMoveUp, .bcdMoveDown", function(event){
        var el = jQuery(this);
        var isDirUp = el.hasClass("bcdMoveUp");
        var widgetEl = el.closest(".bcdSideBySideChooser").find(".bcdTarget").closest("[bcdWidgetFullName]");
        widgetEl = widgetEl.data(widgetEl.attr("bcdWidgetFullName"));
        widgetEl._moveSelectedItemsUpDown( isDirUp ? -1 : 1 );
      });

      bcdui.widgetNg.input.getNavPath(this.element.attr("bcdTargetHtmlElementId"), function(id, value) {
        bcdui.widget._linkNavPath(id, value);
      }.bind(this));
    },

    /**
     * @private
     */
    _destroy: function() {
      var htmlElementId = this.options.id;
      var el = jQuery(htmlElementId);

      if(el.length > 0){
        el.off()
        el.data("_args_",   null);
        el.data("_config_", null);
      }
    }
  });
}());

/**
 * A namespace for the BCUDI GUI sideBySideChooser widget.
 * @namespace bcdui.widgetNg.sideBySideChooser
 */
bcdui.util.namespace("bcdui.widgetNg.sideBySideChooser",
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
   * returns NavPath information via callback for widget which is addressed by its targetHtmlId
   * @param {string} id targetHtmlElementId of widget
   * @param {callback} function function to be called with generated caption
   */
  getNavPath: function(id, callback) {
    if (id && id != "") {
      var e = jQuery("*[bcdTargetHtmlElementId='" + id + "']").first().get(0);
      if (e) {
        bcdui.widget._getCaptionFromWidgetElement(e, function(value) {
          callback(id, value);
        });
        return;
      }
    }
    callback(id, "");
  }

});
