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
 * @namespace bcdui.widgetNg
 */

/**
 * widget balloon (singleton) to enable bcdui-tooltips on input widgets as well as
 * visualization of validation messages.
 *
 * concept:
 * there is one (singleton) ballon which a widget can bind to via one-time attach() call,
 * the bound widget element shall provide additional DOM attribute 'bcdRowIdent' carrying the ID of the
 * DOM element providing the data to display (tooltip + validation messages).
 *
 * prior to re-display a special data provider discovers the target element via 'contextId' reference
 * and reads the hint from 'bcdHint' attribute (or 'hint' option) and retrieves the validationMessages
 * via '_validationMessages_' element data. This information is displayed to the user.
 */

/**
 * A namespace for the BCD-UI balloon widget.
 * @namespace bcdui.widgetNg.commons.balloon
 */
jQuery.extend(bcdui.widgetNg.commons.balloon,
/** @lends bcdui.widgetNg.commons.balloon */
{
  /**
   * constants
   */
  CONST : {
    /**
     * id of the singleton data provider for ballon renderer
     */
    dataProviderId : "bcd_widget_balloon_data_provider",
    /**
     * id of the singleton balloon renderer
     */
    tooltipRendererId : "bcd_widget_tooltip_renderer",
    /**
     * id of the singleton balloon renderer
     */
    balloonRendererId : "bcd_widget_balloon_renderer"
  }
});

/**
 * PrototypeJS element maps key for internal configuration object
 */
bcdui.widgetNg.commons.balloon.MAPKEY_CONFIG = "_bcdui.widget.balloon_";

/**
 * the singleton data provider which is data provider to the tooltip renderer,
 * it fetches the ID of element from 'bcdRowIdent' data provider, locates that
 * element, fetches the tooltip message and validation messages from the 'bcdHint'
 * attribute (or 'hint' option) and '_validationMessages_' map value respectively, parses them into a DOM
 * document which is returned to the renderer to be rendered.
 */
bcdui.widgetNg.commons.balloon.DATA_PROVIDER = bcdui.factory.createJsDataProvider({
  id: bcdui.widgetNg.commons.balloon.CONST.dataProviderId
  , doAllwaysRefresh: true
  , callback: function(){
    // bcdRowIdent may not be available first time this data provider fires
    var rowIdent = bcdui.wkModels.bcdRowIdent;
    if(rowIdent == null)return;

    var elId = rowIdent.getData();
    bcdui.log.isTraceEnabled() && bcdui.log.trace(bcdui.widgetNg.commons.balloon.CONST.dataProviderId + ": target element id: " + elId);
    var el = bcdui._migPjs._$(elId);
    if(! el.length > 0){
      bcdui.log.isTraceEnabled() && bcdui.log.trace(bcdui.widgetNg.commons.balloon.CONST.dataProviderId + ": no such target element found, do nothing.");
      return bcdui.core.emptyModel.dataDoc;
    }

    var dataDocString = bcdui.widgetNg.commons.balloon.messagesToXML(el.data("_validationMessages_"), el.attr("bcdHint"));

    if(dataDocString == null){
      bcdui.log.isTraceEnabled() && bcdui.log.trace(bcdui.widgetNg.commons.balloon.CONST.dataProviderId + ": no data found, do nothing.");
      return bcdui.core.emptyModel.dataDoc;
    }

    bcdui.log.isTraceEnabled() && bcdui.log.trace(bcdui.widgetNg.commons.balloon.CONST.dataProviderId + ": data doc generated: " + dataDocString);
    // if we have document, return parsed DOM

    return bcdui.core.browserCompatibility.createDOMFromXmlString(dataDocString, "widgetBalloon data model for element id: " + elId);
  }
});

/**
 * defer tooltip renderer creation into the _init(), which
 * has to be executed during attach()
 *
 * @private
 */
bcdui.widgetNg.commons.balloon._init = function(){
  if(!bcdui.widgetNg.commons.balloon.TOOLTIP_RENDERER){
    // special balloon container
    if(!jQuery("#bcdWidgetBalloon").length > 0){
      var widgetBalloonContainer = jQuery("<div id='bcdWidgetBalloon'></div>");
      widgetBalloonContainer.css({display: "none"});
      document.body.appendChild(widgetBalloonContainer.get(0));
    }
    /**
     * singleton tooltip renderer
     */
    bcdui.widgetNg.commons.balloon.TOOLTIP_RENDERER = bcdui.widget.createTooltip({
      id: bcdui.widgetNg.commons.balloon.CONST.tooltipRendererId,
      url: bcdui.contextPath + "/bcdui/js/widgetNg/validationTooltip.xslt",
      inputModel: bcdui.widgetNg.commons.balloon.CONST.dataProviderId,
      parameters: {"I18N_TAG":bcdui.i18n.TAG}
    });
    /**
     * singleton balloon renderer
     */
    bcdui.widgetNg.commons.balloon.BALLOON_RENDERER = bcdui.widget.createTooltip({
      id: bcdui.widgetNg.commons.balloon.CONST.balloonRendererId,
      url: bcdui.contextPath + "/bcdui/js/widgetNg/validationTooltip.xslt",
      inputModel: bcdui.widgetNg.commons.balloon.CONST.dataProviderId,
      parameters: {"I18N_TAG":bcdui.i18n.TAG},
      tooltipTargetHtmlId : "bcdWidgetBalloon"
    });
  }
};

/**
 * attaches the balloon to given, focusable element,
 * this function does nothing in case a balloon is already attached
 * on this element.
 *
 * @param {element|string} htmlElementId  The target to attach ballon to.
 * @param {object}  [args]                Object literal containing following properties
 * @param {boolean} [args.noTooltip]      If balloon is attach a tooltip (mouseover) is attached as well,you can disable it here.
 * @param {boolean} [args.noBalloon]      If set to TRUE the static balloon is not displayed
 *
 * @return true if attached, false if not; if both noTooltip and noBalloon parameters are set, this function returns FALSE and has no effect.
 */
bcdui.widgetNg.commons.balloon.attach = function(htmlElementId,args){
  if(!args){
    args={};
  }

  if(args.noTooltip && !args.noBalloon){ // balloon + flyover are both disabled.
    bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.commons.balloon.attach: skip, since tooltip+balloon were suppressed on #" + htmlElementId);
    return false;
  }

  var el = bcdui._migPjs._$(htmlElementId);
  if(! el.length > 0 || el.prop("_hasBalloon")){
    bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.commons.balloon.attach: skip, since no el found or already attached on #" + htmlElementId);
    return false;
  }else{
    bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.commons.balloon.attach()ing balloon to #" + htmlElementId);
    el.prop("_hasBalloon", true);
  }

  // bcdRowIdent data provider requires this one to provide elements id
  el.attr("bcdRowIdent",el.get(0).id);

  var config = {
      balloonRendererId : bcdui.widgetNg.commons.balloon.CONST.balloonRendererId
  };


  // all balloon functions can get configuration from here
  el.data(bcdui.widgetNg.commons.balloon.MAPKEY_CONFIG, config);

  bcdui.widgetNg.commons.balloon._init();

  // init tooltip renderer (not balloon)
  if(!args.noTooltip){
    bcdui.factory.objectRegistry.withReadyObjects(bcdui.widgetNg.commons.balloon.CONST.tooltipRendererId,function(){
      bcdui.widget._attachTooltipRenderer({
        tooltipRendererId : bcdui.widgetNg.commons.balloon.CONST.tooltipRendererId
          , targetHtmlElement : el.get(0)
          , filter            : ""
            , tableMode         : false
            , identsWithin      : htmlElementId
            , delay             : 200
      });
    },false);
  }

  // attach listeners for instant hint if not suppressed
  if(!args.noBalloon){
    el.on("focus", bcdui.widgetNg.commons.balloon.displayHintBalloon.bind(undefined,htmlElementId));
    el.on("blur", bcdui.widgetNg.commons.balloon.hideHintBalloon.bind(undefined,htmlElementId));
  }

  return true;
};

/**
 * permanently displays the hint-balloon for given htmlElementId using the
 * default tooltip technique but reposition it (next to the element) as tray-message,
 * you have to hide the the balloon executing general hideHintBalloon()
 *
 * configuration params:
 *
 * - balloonRendererId
 *
 * configuration object is expected to be in the element map: bcdui.widgetNg.commons.balloon.MAPKEY_CONFIG
 */

bcdui.widgetNg.commons.balloon.displayHintBalloon = function(htmlElementId){
  var el = bcdui._migPjs._$(htmlElementId);
  var config = el.data(bcdui.widgetNg.commons.balloon.MAPKEY_CONFIG);

  // need this to be set to current element id for the balloonRenderer
  bcdui.wkModels.bcdRowIdent.setData(el.attr("bcdRowIdent"));

  bcdui.factory.reDisplay({
    idRef: config.balloonRendererId,
    fn: function(){
      var el = bcdui._migPjs._$(bcdui.factory.objectRegistry.getObject(config.balloonRendererId).targetHTMLElementId);
      if(el.length > 0 && bcdui.util.stripTags(el.html()).trim().length===0){
        /*
         * dont display empty content
         */
        return;
      }

      bcdui.widgetNg.commons.balloon._positionElement({
        htmlElement: el.get(0),
        position: "Tray.SW"
      });
    }
  });
};


/**
 * positions element, params:
 * - {Element}htmlElement
 * - {enum: Tray.SW Tray.SE Tray.NW Tray.NE}position:
 *  tray(south-west(default), south-east, north-west, north-east) - positions element at viewport
 * @private
 */
bcdui.widgetNg.commons.balloon._positionElement = function(args){
  if(!args.position){
    args.position="Tray.SW";
  }

  var el = bcdui._migPjs._$(args.htmlElement);

  if(!el.is(":visible")){
    // some fade-in effect
    el.fadeIn(100);
  }

  var edgeOffsetPx = 10;

  var viewPortWidth = jQuery(window).outerWidth();
  var viewPortHeight = jQuery(window).outerHeight();

  var boxWidth = el.outerWidth();
  var boxHeight = el.outerHeight();

  var coords = {x:0,y:0};

  // others not implemented yet
  if(args.position!="Tray.SW"){
    bcdui.log.warn("positionElement: position " + SE + " not implemented yet, using Tray.SW position");
  }

  if(true||args.position == "Tray.SW"){
    coords.x = edgeOffsetPx;
    coords.y = viewPortHeight - edgeOffsetPx - boxHeight;
  }
  bcdui.log.isTraceEnabled() && bcdui.log.trace("positionElement: reposition at " + coords.x + ", " + coords.y + " applying positioning: " + args.position);
  el.css({
    top:  coords.y + "px",
    left: coords.x + "px"
  });
};

/**
 * hides previously visible balloon
 */
bcdui.widgetNg.commons.balloon.hideHintBalloon = function(htmlElementId){
  var el = bcdui._migPjs._$(htmlElementId);
  var config = el.data(bcdui.widgetNg.commons.balloon.MAPKEY_CONFIG);
  var renderer = bcdui.factory.objectRegistry.getObject(config.balloonRendererId);
  if(renderer != null){
    bcdui._migPjs._$(renderer.targetHTMLElementId).hide();
  }
};

/**
 * construct XML string out of messages and tooltip data
 *
 * DTD:
 * BalloonData&lt;Tooltip?,Messages?>
 * Tooltip&lt;CDATA>
 * ValidationMessages&lt;Item+>
 * Item&lt;CDATA>
 *
 * @return NULL (if no messages found / tooltip) or DOM string
 */
bcdui.widgetNg.commons.balloon.messagesToXML = function(messagesArray, tooltipString){
  // normalize
  messagesArray=jQuery.makeArray(messagesArray||[]).reduce(function(a, b) { return b != null ? a.concat(b) : a; }, [])
  tooltipString=tooltipString||"";

  if(messagesArray.length==0 && !tooltipString.trim())return null;

  var str="<BalloonData>";

  if(!!tooltipString.trim()){
    str+="<Tooltip>" + tooltipString + "</Tooltip>";
  }

  if(messagesArray.length>0){
    str += "<ValidationMessages>";

    messagesArray.forEach(function(el){
      str+="<Item>" + el + "</Item>";
    });

    str += "</ValidationMessages>";
  }

  str += "</BalloonData>";

  return str;
};

/**
 * A namespace for the BCD-UI widget different comparators.
 * @namespace bcdui.widgetNg.utils.sorting
 * @private
 */
jQuery.extend(bcdui.widgetNg.utils.sorting,
/** @lends bcdui.widgetNg.utils.sorting */
{
  /**
   * comparator for alphabetical and ignore-case
   *
   * @private
   */
  cmpAlphaIgnoreCase : function(a,b){
    var x = a.toLowerCase(), y = b.toLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
  },

  /**
   * same as in superpackage but for DOM node extensions
   */
  node : {
    /**
     * comparator for alphabetical and ignore-case, can be used on
     * node-sets
     *
     */
    cmpAlphaIgnoreCase : function(a,b){
      return bcdui.widgetNg.utils.sorting.cmpAlphaIgnoreCase(a.text, b.text);
    }
  }

});
