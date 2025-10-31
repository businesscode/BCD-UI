/*
  Copyright 2010-2025 BusinessCode GmbH, Germany

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
 * A namespace for the BCD-UI contextMenu widget.
 * @namespace bcdui.widget.contextMenu
 * @private
 */
bcdui.widget.contextMenu = Object.assign(bcdui.widget.contextMenu,
/** @lends bcdui.widget.contextMenu */
{
  /**
   * Context menu div and standard data providers are singletons, created here for usage everywhere
   * @private
   */
  _createContextMenuDiv: function()
    {
      var cm = bcdui.util.getSingletonElement("bcdContextMenuDiv");
      if( "true"!=cm.attr("bcdInitialized") ) {
        bcdui.widget.contextMenu._attachDelayedAutoHiding({ targetHTMLElementId: "bcdContextMenuDiv" });

        // contextMenu click handler
        jQuery("#bcdContextMenuDiv").on("click", function(event) {
          const eventSourceElementId = jQuery("#bcdContextMenuDiv").attr("bcdEventSourceElementId") || "";
          if (eventSourceElementId != "" && jQuery("#" + eventSourceElementId).length > 0) {

            const actionHandler = jQuery("#bcdContextMenuDiv").data("actionHandler");
            if (actionHandler) {

              // collect all html attributes from bcdActionId element
              const bcdActionIdElement = jQuery(event.target).closest("*[bcdActionId]").get(0);
              const htmlAttr = {};
              if (bcdActionIdElement)
                Array.from(bcdActionIdElement.attributes).forEach(function(a) { htmlAttr[a.nodeName] = a.nodeValue; });
              
              const _srcEl = jQuery("#" + eventSourceElementId);
              let bcdRowIdent = _srcEl.closest("[bcdRowIdent]").attr("bcdRowIdent");
              let bcdColIdent = _srcEl.closest("[bcdColIdent]").attr("bcdColIdent");
              let _table;
              if(!event.bcdColIdent && (_table=_srcEl.closest("table")).length){ // lookup in the thead/tr[last()] element of the outer table, if colIdent was not on ancestor path
                var _lastTr = _table.find("thead tr").last();
                bcdColIdent = jQuery(_lastTr.find("th").add("td", _lastTr).get(_srcEl.index())).attr("bcdColIdent");
              }

              // add some well knowns
              const wellKnown = {
                event: event
              , htmlElement: jQuery(event.target).get(0)
              , bcdColIdent: bcdColIdent
              , bcdRowIdent: bcdRowIdent
              , bcdEventSourceElement : jQuery("#" + eventSourceElementId).get(0)
              }
              setTimeout(function() { actionHandler.click(Object.assign(wellKnown, htmlAttr));});
            }
            else
              throw 'no contextMenu action handler found';
          }
        });
        cm.attr("bcdInitialized","true");
      }
    },

  /**
   * @private
   */
  _attachDelayedAutoHiding: function(args)
    {
      var timer = null;
      bcdui._migPjs._$(args.targetHTMLElementId).on("click", function() {
        if (timer != null) {
          window.clearTimeout(timer);
          timer = null;
        }
        if(bcdui._migPjs._$(args.targetHTMLElementId).length > 0)
          bcdui._migPjs._$(args.targetHTMLElementId).hide();
      });
      bcdui._migPjs._$(args.targetHTMLElementId).on("mouseleave", function() {
        if (timer != null) {
          window.clearTimeout(timer);
          timer = null;
        }
        if(bcdui._migPjs._$(args.targetHTMLElementId).length > 0){
          timer = setTimeout(function() { bcdui._migPjs._$(args.targetHTMLElementId).hide(); }, (args.delay || 500));
        }
      });
      bcdui._migPjs._$(args.targetHTMLElementId).on("mouseenter", function() {
        if (timer != null) {
          window.clearTimeout(timer);
          timer = null;
        }
      });
    }    
});