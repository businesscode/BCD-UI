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

bcdui.util.namespace("bcdui.component.cube.expandCollapse",
/** @lends bcdui.component.cube.expandCollapse */
{
  _init: function(htmlElement) {
  
    var outer = jQuery(htmlElement).closest("*[bcdrendererid]");
    var cubeId = outer.attr("bcdRendererId") || "";
    var cube = bcdui.factory.objectRegistry.getObject(cubeId);
  
    // not a cube?
    if (typeof cube == "undefined" || cube.type !== "bcdui.component.cube.Cube")
      return;
  
    var targetModel = cube.getEnhancedConfiguration();
    var cubeModel = cube.getPrimaryModel();
  
    // get mode
    var mode = cube.getEnhancedConfiguration().read("//xp:ExpandCollapseCells/@apply", "false");
    if (mode != "collapse" && mode != "expand") {
      jQuery(htmlElement).show();
      return;
    }
    var initialCollapsed = (mode === "collapse");

    // reset some flicker-avoiding styles
    outer.get(0).style.width = outer.attr("widthBak") || "";
    outer.get(0).style.height = outer.attr("heightBak") || "";
    outer.get(0).style.display = outer.attr("displayBak") || "";
    outer.removeAttr("heightBak");
    outer.removeAttr("widthBak");
    outer.removeAttr("displayBak");

    // set clickable buttons on col and row dimensions
    jQuery(htmlElement).find("th").each(function(i,e) {
      var el = jQuery(e);
  
      // build key like string (dimvalue + separator + ...) for the current TH based on coldim and actual value (for row dims) 
      var value = "";
      var idents = bcdui.widget._computeRowAndColIdents(el.get(0));
      var idx = cubeModel.read("/*/wrs:Header/wrs:Columns/wrs:C[@id='" + idents.bcdColIdent + "']/@pos", "0");
      if (idx != 0) {
        if (idents.bcdColIdent.indexOf("|") != -1) {
          var c = idents.bcdColIdent.split("|");
          idx = el.closest("tr").index();
          for (var y = 0; y <= idx; y++) {
            if (y > 0)
              value += bcdui.core.magicChar.separator;
            value += c[y];
          }
        }
        else {
          for (var x = 1; x <= idx; x++) {
            if (x > 1)
              value += bcdui.core.magicChar.separator;
            value += cubeModel.read("/*/wrs:Data/wrs:R[@id='" + idents.bcdRowIdent + "']/wrs:C[position()='" + x + "']");
          }
        }
      }
      var addButton = false;
      if (! el.hasClass("bcdDimension") && ! el.hasClass("bcdMeasure")) { // this skips rowDimensions/ColMeasures THs in THEAD
        addButton  = (el.closest("thead").length != 0 && el.closest("tr").next("tr").next("tr").length > 0);
        addButton |= (el.closest("thead").length == 0 && !(el.index() + 1 == el.next("td").index()));
  
        // do we have a collapsed column which is now marked as bcdTotal, if so remove the class, otherwise we have a real total and don't draw a button
        if (el.hasClass("bcdTotal")) {
         if (value.indexOf(bcdui.core.magicChar.dimTotal) != -1)
            addButton = false;
          else
            el.removeClass("bcdTotal");
        }
      }
      if (addButton) {
        var rowCol = el.closest("thead").length > 0 ? "xp:Col" : "xp:Row";
        var xPath = "/*/xp:XSLTParameters/xp:ExpandCollapseCells/" + rowCol + "[.='" + value + "']";
        var status = (targetModel.query(xPath) == null) ? (initialCollapsed ? "bcdExpand" : "bcdCollapse") : (initialCollapsed ? "bcdCollapse" : "bcdExpand");
        var data = el.text();
        el.html("<div class='bcdExpandContainer'><div class='bcdExpandCollapseButton " + status + "'></div><div class='bcdExpandOriginal'>" + data + "</div></div>");
        // remember xpath and value
        el.data("config", {value: value, xPath: xPath, targetModel: targetModel});
      }
    });
  
    // the actual click handler on the added buttons
    jQuery(htmlElement).find("th").on("click", ".bcdExpandCollapseButton", function(event) {
      
      // turn click handler off to avoid quick clicking on buttons before the cube actually refreshed itself
      jQuery(htmlElement).find("th").off("click");
      
      var el = jQuery(event.target);
      var config = el.closest("th").data("config");
      
      // avoid some flickering
      var outer = el.closest("*[bcdrendererid]");
      if (outer.get(0).style.width != "")
        outer.attr("widthBak", outer.get(0).style.width);
      if (outer.get(0).style.height != "")
        outer.attr("heightBak", outer.get(0).style.height);
      if (outer.get(0).style.display != "")
        outer.attr("displayBak", outer.get(0).style.display);
      outer.css("height", outer.outerHeight());
      outer.css("width", outer.outerWidth());
      outer.css("display", "block");
  
      if (typeof config == "undefined")
        return;
      
      // either add or remove the key value in the statusmodel
      if (config.targetModel.query(config.xPath) == null) {
        var node = bcdui.core.createElementWithPrototype(config.targetModel.getData(), config.xPath + "[@bcdHelper='true']");
        node.text = config.value;
        node.removeAttribute("bcdHelper");
      }
      else
        bcdui.core.removeXPath(config.targetModel.getData(), config.xPath)
  
      config.targetModel.fire(); // fire on cube configuration triggers rerender
    });
  }
});
