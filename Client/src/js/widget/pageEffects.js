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
 * A namespace for the BCD-UI page effects.
 * @namespace bcdui.widget.pageEffects
 * @private
 */
bcdui.util.namespace("bcdui.widget.pageEffects",
/**  @lends bcdui.widget.pageEffects */
{
  /* 
   * class names:
   *  bcdEffectPageSizeAdjust     - auto resize header/footer/menu to current bodycontainer/area width
   *  bcdEffectSizeAdjust         - sidebar effects (either grip with floating/sticky sidebar, or increasing sidebar
   *  bcdEffectAutoScroll         - auto scroll sidebar to current view
   *  bcdEffectDraggable          - have sideBar Items drag'n droppable
   *  bcdEffectCollapse           - have sideBar Items collapsable/expandable
   *  bcdEffectMinimizeOnClick    - have the sidebar size adjust feature with a click to minimize it, not hover over body 
  */

  /**
   * @private
   */
  _sort: function(theContainer) {
    var theItems = jQuery(theContainer).children(".bcdSection");
    theItems.sort(function (a, b) {
      var id_a = jQuery(a).attr("bcdId");
      var id_b = jQuery(b).attr("bcdId");
      var nodeA = bcdui.wkModels.guiStatus.getData().selectSingleNode("/*/guiStatus:PersistentSettings/guiStatus:bcdSideBarOrder/guiStatus:Item[@id='" + id_a + "']");
      var posA = (nodeA != null) ? nodeA.text : "-1";
      var nodeB = bcdui.wkModels.guiStatus.getData().selectSingleNode("/*/guiStatus:PersistentSettings/guiStatus:bcdSideBarOrder/guiStatus:Item[@id='" + id_b + "']");
      var posB = (nodeB != null) ? nodeB.text : "-1";
      return (parseInt(posA, 10) > parseInt(posB, 10) ? 1 : parseInt(posA, 10) < parseInt(posB, 10) ? -1 : 0);
    });
    theContainer.append(theItems);
  },
  
  init: function() {

    // set username if available
    if (bcdui.config.userName && jQuery("#bcdUserName").length > 0)
      jQuery("#bcdUserName").text(bcdui.config.userName);

    var args = {
        sideBarSizeAdjust:  jQuery("#bcdSideBarContainer").hasClass("bcdEffectSizeAdjust")
      , sideBarAutoScroll:  jQuery("#bcdSideBarContainer").hasClass("bcdEffectAutoScroll")
      , pageSizeAdjust:     jQuery("#bcdSideBarContainer").hasClass("bcdEffectPageSizeAdjust")
      , sideBarDraggable:   jQuery("#bcdSideBarContainer").hasClass("bcdEffectDraggable")
      , sideBarCollapsable: jQuery("#bcdSideBarContainer").hasClass("bcdEffectCollapse")
      , sideBarMinimizeOnClick: jQuery("#bcdSideBarContainer").hasClass("bcdEffectMinimizeOnClick")
    };

    // nothing to do?
    if (! args.sideBarSizeAdjust && ! args.sideBarAutoScroll && ! args.pageSizeAdjust && ! args.sideBarDraggable && ! args.sideBarCollapsable && ! args.sideBarMinimizeOnClick)
      return
    
    if (jQuery("#bcdSideBarEffect").length == 0)
      jQuery("#bcdSideBarContainer").prepend("<div id='bcdSideBarEffect'></div>");

    bcdui.widget.pageEffects._bcdSideBarMinWidth  = parseInt(jQuery("#bcdSideBarEffect").css("minWidth").replace("px", ""), 10);
    bcdui.widget.pageEffects._bcdSideBarMaxWidth  = parseInt(jQuery("#bcdSideBarEffect").css("maxWidth").replace("px", ""), 10);
    bcdui.widget.pageEffects._bcdSideBarWidth     = parseInt(jQuery("#bcdSideBarEffect").css("width").replace("px", ""), 10);

    bcdui.widget.pageEffects._bcdSideBarMinWidth  = isNaN(bcdui.widget.pageEffects._bcdSideBarMinWidth) ? 0 : bcdui.widget.pageEffects._bcdSideBarMinWidth;
    bcdui.widget.pageEffects._bcdSideBarMaxWidth  = isNaN(bcdui.widget.pageEffects._bcdSideBarMaxWidth) ? 0 : bcdui.widget.pageEffects._bcdSideBarMaxWidth;
    bcdui.widget.pageEffects._bcdSideBarWidth     = isNaN(bcdui.widget.pageEffects._bcdSideBarWidth) ? 0 : bcdui.widget.pageEffects._bcdSideBarWidth;

    bcdui.widget.pageEffects._sideBarVisible      = false;
    bcdui.widget.pageEffects._missedBodyHover     = false;
    bcdui.widget.pageEffects._missedSideBarHover  = false;
    bcdui.widget.pageEffects._timeout             = null;
    bcdui.widget.pageEffects._over                = null;
    bcdui.widget.pageEffects._minimizeOnClick     = jQuery("#bcdSideBarContainer").hasClass("bcdEffectMinimizeOnClick")
    bcdui.widget.pageEffects._animationTimeOut    = bcdui.widget.pageEffects._minimizeOnClick ? 1 : 1000;

    if (bcdui.widget.pageEffects._bcdSideBarMinWidth == bcdui.widget.pageEffects._bcdSideBarMaxWidth && bcdui.widget.pageEffects._bcdSideBarMaxWidth == bcdui.widget.pageEffects._bcdSideBarWidth)
      args.sideBarSizeAdjust = false;

    if (jQuery("#bcdSideBarArea").length == 0) {
      var children = jQuery("#bcdSideBarContainer").children();
      jQuery("#bcdSideBarContainer").prepend("<div id='bcdSideBarArea'><span class='bcdSideBarGrip'><span class='bcdGripPin'><span class='bcdGripPinChar'></span>&#160;</span>" + (bcdui.widget.pageEffects._minimizeOnClick ? "<span class='bcdGripClose'><span class='bcdGripCloseChar'></span>&#160;</span>" : "") + "</span></div");
      
      var focus = jQuery(":focus");
      jQuery("#bcdSideBarArea").append(children);
      if (focus.length > 0)
        focus.focus();
    }

    // remember initial right position of grip
    bcdui.widget.pageEffects._bcdGripRight        = parseInt(jQuery(".bcdSideBarGrip").css("right"), 10);
    bcdui.widget.pageEffects._bcdGripRight        = isNaN(bcdui.widget.pageEffects._bcdGripRight) ? 0 : bcdui.widget.pageEffects._bcdGripRight;

    // avoid closing floating sidebar when an element got the focus and is waiting for an input
    if (args.sideBarSizeAdjust) {
      jQuery("#bcdSideBarArea").focusout(function(e) {
        if (bcdui.widget.pageEffects._missedBodyHover) {
          bcdui.widget.pageEffects._missedBodyHover = false;
          if (bcdui.widget.pageEffects._bcdSideBarWidth == bcdui.widget.pageEffects._bcdSideBarMinWidth)
            setTimeout(bcdui.widget.pageEffects._decreaseSideBar);
          else
            setTimeout(bcdui.widget.pageEffects._moveOutSideBar);
        }
        else if (bcdui.widget.pageEffects._missedSideBarHover) {
          bcdui.widget.pageEffects._missedSideBarHover = false;
          if (bcdui.widget.pageEffects._bcdSideBarWidth == bcdui.widget.pageEffects._bcdSideBarMinWidth)
            setTimeout(bcdui.widget.pageEffects._increaseSideBar);
          else
            setTimeout(bcdui.widget.pageEffects._moveInSideBar);
        }
      });
    }

    // scroll sidebar to current view (avoid open drop downs)
    // also set header/footer width to current bodyContainer/Area width
    
    if (args.sideBarSizeAdjust || args.pageSizeAdjust || args.sideBarAutoScroll) {
      jQuery(window).scroll(function(e) {
        if (jQuery("#bcdSideBarArea input[text], #bcdSideBarArea textarea").is(":focus")) return;
        if (jQuery("#bcdAutoCompletionBox:visible").length > 0) return;
        if (args.pageSizeAdjust)
          jQuery("#bcdFooterArea,#bcdSpacerArea,#bcdMenuBarArea,#bcdHeaderArea").css("width", jQuery("body").prop("scrollWidth") + "px");

        if (args.sideBarAutoScroll) {
          var docHeight     = jQuery(document).height();
          var bodyHeight    = jQuery("body").height();
          var sideBarHeight = jQuery("#bcdSideBarContainer").height();
          var scrollY       = jQuery("html").scrollTop() > jQuery("body").scrollTop() ? jQuery("html").scrollTop() : jQuery("body").scrollTop();
          var threshold     = sideBarHeight/4;

          // remember original top position
          var top = isNaN(parseInt(jQuery('#bcdSideBarContainer').css("top"), 10)) ? 0 : parseInt(jQuery('#bcdSideBarContainer').css("top"), 10);
          if (jQuery('#bcdSideBarContainer').data("origTop") == null)
            jQuery('#bcdSideBarContainer').data("origTop", "" + isNaN(parseInt(jQuery('#bcdSideBarContainer').css("top"), 10)) ? 0 : parseInt(jQuery('#bcdSideBarContainer').css("top"), 10));

          // remember original offset top position
          var offTop = isNaN(jQuery('#bcdSideBarContainer').offset().top) ? 0 : jQuery('#bcdSideBarContainer').offset().top;
          if (jQuery('#bcdSideBarContainer').data("origOffTop") == null)
            jQuery('#bcdSideBarContainer').data("origOffTop", offTop);

          var newTop = top;

          // hit top, reset sidebar to original top position, set it always since we have a kind of natural top down placement 
          if (scrollY <= 0)
            newTop = jQuery('#bcdSideBarContainer').data("origTop");

          // hit bottom, set sidebar so that its bottom ends with the page but only when the original top of sidebar is not visible
          else if (scrollY + bodyHeight >= docHeight) {
            if (jQuery('#bcdSideBarContainer').data("origOffTop") < docHeight - bodyHeight)
              newTop = docHeight - sideBarHeight - jQuery('#bcdSideBarContainer').data("origOffTop");
          }

          // sidebar disappeared at top, set it to the current scrollpos (taking original offset top into account)
          else if (offTop + sideBarHeight - threshold < scrollY)
            newTop = scrollY - jQuery('#bcdSideBarContainer').data("origOffTop");

          // sidebar disappeared at bottom, set it so its bottom ends with the current window (taking original offset top into account)
          else if (scrollY + bodyHeight < offTop + threshold)
            newTop = scrollY - jQuery('#bcdSideBarContainer').data("origOffTop") - sideBarHeight + bodyHeight;

          // start animation to new position when something actually changed
          if (newTop != top)
            jQuery('#bcdSideBarContainer').stop(true).animate({top: newTop} ,750);
        }
      });
    }

    // resize header/footer on a resize
    if (args.sideBarSizeAdjust || args.pageSizeAdjust) {
      jQuery(window).resize(function(e) {
        if (jQuery("#bcdSideBarArea input[text], #bcdSideBarArea textarea").is(":focus")) return;
        if (jQuery("#bcdAutoCompletionBox:visible").length > 0) return;
        if (args.pageSizeAdjust) {
          var w = jQuery(document).width() > jQuery("body").width() ? jQuery(document).width() : jQuery("body").width();
          jQuery("#bcdFooterArea,#bcdSpacerArea,#bcdMenuBarArea,#bcdHeaderArea").css("width", w + "px");
        }
      });
    }

    if (args.sideBarSizeAdjust) {
      // init sidebar effects
      if (bcdui.widget.pageEffects._bcdSideBarWidth == bcdui.widget.pageEffects._bcdSideBarMinWidth) {
        jQuery(".bcdSideBarGrip, .bcdGripPin").show();
        jQuery("#bcdSideBarArea").hover( function () {
          if (bcdui.widget.pageEffects._over != "sidebar") {
            bcdui.widget.pageEffects._over = "sidebar";
            bcdui.widget.pageEffects._increaseSideBar();
          }
        });
        jQuery("#bcdBodyContainer").hover( function () {
          if (bcdui.widget.pageEffects._over != "body") {
            bcdui.widget.pageEffects._over = "body";
            if (! bcdui.widget.pageEffects._minimizeOnClick)
              bcdui.widget.pageEffects._decreaseSideBar();
          }
        });
      }
      else {
        jQuery(".bcdSideBarGrip, .bcdGripPin").show();
        jQuery("#bcdSideBarArea").hover( function () {
          if (bcdui.widget.pageEffects._over != "sidebar") {
            bcdui.widget.pageEffects._over = "sidebar";
            bcdui.widget.pageEffects._moveInSideBar();
          }
        });
        jQuery("#bcdBodyContainer").hover( function () {
          if (bcdui.widget.pageEffects._over != "body") {
            bcdui.widget.pageEffects._over = "body";
            if (! bcdui.widget.pageEffects._minimizeOnClick)
              bcdui.widget.pageEffects._moveOutSideBar();
          }
        });
      }
    
      jQuery(".bcdSideBarGrip").click( function (event) {
        
        if (jQuery(event.target).hasClass("bcdGripCloseChar")) {
          bcdui.widget.pageEffects._over = "sidebar";
          jQuery(".bcdGripPin").removeClass("bcdGripActive");
          bcdui.core.createElementWithPrototype(bcdui.wkModels.guiStatus.getData(), "/*/guiStatus:PersistentSettings/guiStatus:bcdSideBarPin").text = "0";
          jQuery("#bcdSideBarContainer").css("width",
              bcdui.widget.pageEffects._bcdSideBarWidth != bcdui.widget.pageEffects._bcdSideBarMinWidth
              ? bcdui.widget.pageEffects._bcdSideBarMinWidth
              : bcdui.widget.pageEffects._bcdSideBarMinWidth + 20
          );          
          if (bcdui.widget.pageEffects._bcdSideBarWidth == bcdui.widget.pageEffects._bcdSideBarMinWidth)
            bcdui.widget.pageEffects._decreaseSideBar();
          else
            bcdui.widget.pageEffects._moveOutSideBar();
        }
        else if (jQuery(event.target).hasClass("bcdGripPinChar")) {
          jQuery(".bcdGripPin").toggleClass("bcdGripActive");
          bcdui.core.createElementWithPrototype(bcdui.wkModels.guiStatus.getData(), "/*/guiStatus:PersistentSettings/guiStatus:bcdSideBarPin").text = jQuery(".bcdGripPin").hasClass("bcdGripActive") ? "1" : "0";
          if (jQuery(".bcdGripPin").hasClass("bcdGripActive")) {
            jQuery("#bcdSideBarContainer").css("width", 
              bcdui.widget.pageEffects._bcdSideBarWidth != bcdui.widget.pageEffects._bcdSideBarMinWidth
                ? bcdui.widget.pageEffects._bcdSideBarWidth + bcdui.widget.pageEffects._bcdSideBarMinWidth
                : bcdui.widget.pageEffects._bcdSideBarMaxWidth + 20
            );
            jQuery("#bcdSideBarArea").css("left", 0);
          }
          else {
            jQuery("#bcdSideBarContainer").css("width",
                bcdui.widget.pageEffects._bcdSideBarWidth != bcdui.widget.pageEffects._bcdSideBarMinWidth
                ? bcdui.widget.pageEffects._bcdSideBarMinWidth
                : bcdui.widget.pageEffects._bcdSideBarMinWidth + 20
            );
          }
        }
      });
  
      // recreate grip status from persistent gui status setting 
      bcdui.factory.objectRegistry.withReadyObjects(["guiStatus"], function() {
        var isActive = bcdui.wkModels.guiStatus.getData().selectSingleNode("/*/guiStatus:PersistentSettings/guiStatus:bcdSideBarPin");
        isActive = (isActive != null && isActive.text == "1");
        if (isActive) {
          jQuery(".bcdGripPin").addClass("bcdGripActive");
          jQuery("#bcdSideBarContainer").css("width",
              bcdui.widget.pageEffects._bcdSideBarWidth != bcdui.widget.pageEffects._bcdSideBarMinWidth
                ? bcdui.widget.pageEffects._bcdSideBarWidth + bcdui.widget.pageEffects._bcdSideBarMinWidth
                : bcdui.widget.pageEffects._bcdSideBarMaxWidth + 20
          );
          jQuery("#bcdSideBarArea").css("left", 0);
          if (bcdui.widget.pageEffects._bcdSideBarWidth == bcdui.widget.pageEffects._bcdSideBarMinWidth)
            jQuery("#bcdSideBarArea").css({width: bcdui.widget.pageEffects._bcdSideBarMaxWidth + "px"}, 200);
        }
        else {
          jQuery(".bcdGripPin").removeClass("bcdGripActive");
          jQuery("#bcdSideBarContainer").css("width", 
              bcdui.widget.pageEffects._bcdSideBarWidth != bcdui.widget.pageEffects._bcdSideBarMinWidth
              ? bcdui.widget.pageEffects._bcdSideBarMinWidth
              : bcdui.widget.pageEffects._bcdSideBarMinWidth + 20
          );
        }
      });
    }
    
    if (args.sideBarDraggable || args.sideBarCollapsable) {

      jQuery("#bcdSideBarArea .bcdSection").each(function(i,e) {

        // add bcdIds to bcdSection if not given
        if (! jQuery(e).attr("bcdId"))
          jQuery(e).attr("bcdId", "id_" + jQuery(e).index());
  
        // initialize classes / show/hide status for sideBarCollapsable effect
        if (args.sideBarCollapsable) {
          var sItem = jQuery(e);
          var sHeader = sItem.find("> .bcdSectionCaption");

          sHeader.prepend( "<span class='bcdBlindUpDownClose'></span>");
          sHeader.parent().addClass("bcdBlindUpDown");
          var id = sItem.attr("bcdId");
          var value = bcdui.wkModels.guiStatus.getData().selectSingleNode("/*/guiStatus:PersistentSettings/guiStatus:bcdSideBarVisible/guiStatus:Item[@id='" + id + "']");
          if (value != null && value.text == "0") {
            jQuery(e).find("> *:not(.bcdSectionCaption, script)").hide();
            jQuery(e).find("> .bcdSectionCaption").addClass("bcdHeadClosed");
          }
          else {
            jQuery(e).find("> *:not(.bcdSectionCaption, script)").show();
            jQuery(e).find("> .bcdSectionCaption").addClass("bcdHeadOpened");
          }
        }
      });

      bcdui.widget.pageEffects._findGripPosition(args.sideBarSizeAdjust, args.sideBarCollapsable);

      // final initialization for sideBarCollapsable effect
      if (args.sideBarCollapsable) {
        jQuery("#bcdSideBarArea .bcdBlindUpDownClose").css({cursor: "pointer"});
        jQuery("#bcdSideBarArea .bcdBlindUpDownClose").on("click", function() {
          var sItem = jQuery(this).closest(".bcdSection");
          var sBody = sItem.find("> *:not(.bcdSectionCaption, script)");
          var sHeader = sItem.find("> .bcdSectionCaption");
          var id = sItem.attr("bcdId");
          var value = sBody.stop().is(":visible") ? 0 : 1;
          sHeader.toggleClass("bcdHeadOpened bcdHeadClosed");
          sBody.toggle("blind", 250, bcdui.widget.pageEffects._findGripPosition.bind(null, args.sideBarSizeAdjust, args.sideBarCollapsable));
          bcdui.core.createElementWithPrototype(bcdui.wkModels.guiStatus.getData(), "/*/guiStatus:PersistentSettings/guiStatus:bcdSideBarVisible/guiStatus:Item[@id='" + id + "']").text = value;
        });
      }

      // final initialization for sideBarDraggable effect
      if (args.sideBarDraggable) {
        jQuery("#bcdSideBarArea .bcdSection > .bcdSectionCaption").css({cursor: "move"});
        var focus = jQuery(":focus");
        this._sort(jQuery("#bcdSideBarArea"));
        if (focus.length > 0)
          focus.focus();
        jQuery("#bcdSideBarArea").sortable({ items: ".bcdSection", handle: "> .bcdSectionCaption", cancel: ".bcdBlindUpDownClose" });
        jQuery("#bcdSideBarArea").on("sortstop", function(event, ui) {
          jQuery("#bcdSideBarArea .bcdSection").each(function(i,e) {
            var id = jQuery(e).attr("bcdId");
            var pos = jQuery(e).index();
            // store status in guiStatus
            bcdui.core.createElementWithPrototype(bcdui.wkModels.guiStatus.getData(), "/*/guiStatus:PersistentSettings/guiStatus:bcdSideBarOrder/guiStatus:Item[@id='" + id + "']").text = pos;
          });
        });
      }
    }
  },
   
  /**
   * @private
   */
  _decreaseSideBar: function() {
    bcdui.widget.pageEffects._missedBodyHover = false;
    if (jQuery("#bcdSideBarArea input[text], #bcdSideBarArea textarea").is(":focus")) { bcdui.widget.pageEffects._missedBodyHover = true; return; }
    if (jQuery("#bcdAutoCompletionBox:visible").length > 0) { bcdui.widget.pageEffects._missedBodyHover = true; return; }
    if (! bcdui.widget.pageEffects._sideBarVisible)
      return;
    bcdui.widget.pageEffects._sideBarVisible = false;
    if (bcdui.widget.pageEffects._timeout != null) clearTimeout(bcdui.widget.pageEffects._timeout);
    bcdui.widget.pageEffects._timeout = setTimeout(function(){
      if (! bcdui.widget.pageEffects._sideBarVisible) {
        jQuery("#bcdSideBarArea").stop(true, false);
        if (! jQuery(".bcdGripPin").hasClass("bcdGripActive")) {
          jQuery("#bcdSideBarArea").animate({width: bcdui.widget.pageEffects._bcdSideBarMinWidth + "px"}, 200);
        }
      }
    }, bcdui.widget.pageEffects._animationTimeOut);
  },

  /**
   * @private
   */
  _increaseSideBar: function() {
    bcdui.widget.pageEffects._missedSideBarHover = false;
    if (jQuery("#bcdSideBarArea input[text], #bcdSideBarArea textarea").is(":focus")) { bcdui.widget.pageEffects._missedSideBarHover = true; return; }
    if (jQuery("#bcdAutoCompletionBox:visible").length > 0) { bcdui.widget.pageEffects._missedSideBarHover = true; return; }
    jQuery("#bcdSideBarArea").stop(true, false);
    bcdui.widget.pageEffects._sideBarVisible = true;
    if (! jQuery(".bcdGripPin").hasClass("bcdGripActive")) {
      jQuery("#bcdSideBarArea").animate({width: bcdui.widget.pageEffects._bcdSideBarMaxWidth + "px"}, 200);
    }
  },

  /**
   * @private
   */
  _moveInSideBar: function() {
    bcdui.widget.pageEffects._missedSideBarHover = false;
    if (jQuery("#bcdSideBarArea input[text], #bcdSideBarArea textarea").is(":focus")) { bcdui.widget.pageEffects._missedSideBarHover = true; return; }
    if (jQuery("#bcdAutoCompletionBox:visible").length > 0) { bcdui.widget.pageEffects._missedSideBarHover = true; return; }
    jQuery("#bcdSideBarArea").stop(true, false);
    bcdui.widget.pageEffects._sideBarVisible = true;
    if (! jQuery(".bcdGripPin").hasClass("bcdGripActive")) {
      jQuery("#bcdSideBarArea").animate({left: '0px'}, 200);
    }
  },

  /**
   * @private
   */
  _moveOutSideBar: function() {
    bcdui.widget.pageEffects._missedBodyHover = false;
    if (jQuery("#bcdSideBarArea input[text], #bcdSideBarArea textarea").is(":focus")) { bcdui.widget.pageEffects._missedBodyHover = true; return; }
    if (jQuery("#bcdAutoCompletionBox:visible").length > 0) { bcdui.widget.pageEffects._missedBodyHover = true; return; }
    if (! bcdui.widget.pageEffects._sideBarVisible)
      return;
    bcdui.widget.pageEffects._sideBarVisible = false;
    if (bcdui.widget.pageEffects._timeout != null) clearTimeout(bcdui.widget.pageEffects._timeout);
    bcdui.widget.pageEffects._timeout = setTimeout(function(){
      if (! bcdui.widget.pageEffects._sideBarVisible) {
        jQuery("#bcdSideBarArea").stop(true, false);
        if (! jQuery(".bcdGripPin").hasClass("bcdGripActive")) {
          jQuery("#bcdSideBarArea").animate({left: (-1 * (bcdui.widget.pageEffects._bcdSideBarWidth)) + "px"}, 200);
        }
      }
    }, bcdui.widget.pageEffects._animationTimeOut);
  },
  
  /**
   * try to find a good place for the grip when collapsed sections are used
   * it tries to add itself to the first non closed section.
   * If all sections are closed it hides himself completely
   * @private
   */
  _findGripPosition: function(sideBarSizeAdjust, sideBarCollapsable) {
    
    // we don't have the sideBarSizeAdjust or sideBarCollapsable effect
    if (!sideBarSizeAdjust || !sideBarCollapsable)
      return
    
    // no sections, no need to modify the grip
    if (jQuery("#bcdSideBarArea .bcdSection").length == 0)
      return;

    // adjust grip right position if we got sections with borders
    var x1 = parseInt(jQuery("#bcdSideBarArea .bcdSection").css("borderLeftWidth"), 10);
    var x2 = parseInt(jQuery("#bcdSideBarArea .bcdSection").css("borderRightWidth"), 10);
    x1 = isNaN(x1) ? 0 : x1;
    x2 = isNaN(x2) ? 0 : x2;
    jQuery(".bcdSideBarGrip").css("right", (bcdui.widget.pageEffects._bcdGripRight - x1 - x2) + "px");

    // find first open section
    var openSection = jQuery("*.bcdSection").find("*.bcdSectionCaption:not(.bcdHeadClosed)").first();
    if (openSection.length == 0) {
      // no good place to show...
      jQuery(".bcdSideBarGrip").hide();
    }
    else {
      // set it to the first open one (we take the element below the sectionCaption top position as anchor, -1 for px adjustment)
      jQuery(".bcdSideBarGrip").show();
      jQuery(".bcdSideBarGrip").css("top", jQuery("*.bcdSection *.bcdSectionCaption:not(.bcdHeadClosed)").next().position().top -1);
    }
  }
});