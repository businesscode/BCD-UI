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
 * A namespace for the BCD-UI widget effects.
 * @namespace bcdui.widget.effects
 */
jQuery.extend(bcdui.widget.effects,
/** @lends bcdui.widget.effects */
{
  /**
   * default duration of effects
   * @default 0.2
   * @constant
   */
  defaultDuration:0.2,
  /**
   * @default bcduiBlindBody
   * @constant
   */
  defaultBlindBodyClassName:"bcdBlindUpDownBody",
  /**
   * @default bcduiBlindHead
   * @constant
   */
  defaultBlindHeadClassName:"bcdBlindUpDownHead",

  /**
   * blinds the content Up/Down
   * @param {Object}     args                  The parameter map contains the following properties.
   * @param {Object}     args.idOrElement      HTML element or ID that contains element(s) to blind Up/Down
   * @param {string}     [args.blindBodyClassName=bcdBlindUpDownBody] CSS className of HTML element to blind Up/Down
   * @param {integer}    [args.duration=2]     duration in seconds used for blind animation
   * @param {boolean}    [args.noEffect=false] True for a simple show/hide without blind effect (blind can influence charts gradients on IE
   */
  blindUpDown: function(args){
    var elem = bcdui._migPjs._$(args.idOrElement);
    var actualId = elem.get(0).id;
    var className = "."+(args.blindBodyClassName || this.defaultBlindBodyClassName);
    var noEffect = args.noEffect || false;
    var els = elem.find(className);

    if(els.length > 0)
      elem = bcdui._migPjs._$(els[0]);
    else if(elem.parent().find(className).length > 0)
      elem = bcdui._migPjs._$(elem.parent().find(className)[0]);
    else
      bcdui.log.warn("did not find element with CSS className:" + className);

    var state;
    if(elem.hasClass('bcdClosed') ) {// open
      if (noEffect)
        elem.show();
      else
        elem.show("blind", {direction: "vertical"}, (args.duration || this.defaultDuration) * 1000);
      elem.removeClass('bcdClosed');
      elem.addClass('bcdOpened');
      if(bcdui._migPjs._$(args.idOrElement).find("."+this.defaultBlindHeadClassName).length > 0){
        var hEl = bcdui._migPjs._$(args.idOrElement).find("."+this.defaultBlindHeadClassName);
        hEl.first().removeClass('bcdHeadClosed');
        hEl.first().addClass('bcdHeadOpened');
      }
      state="open";
    }
    else{
      if (noEffect)
        elem.hide();
      else
        elem.hide("blind", {direction: "vertical"}, (args.duration || this.defaultDuration) * 1000);
      elem.removeClass('bcdOpened');
      elem.addClass('bcdClosed');
      if(bcdui._migPjs._$(args.idOrElement).find("."+this.defaultBlindHeadClassName).length > 0){
        var hEl = bcdui._migPjs._$(args.idOrElement).find("."+this.defaultBlindHeadClassName);
        hEl.first().removeClass('bcdHeadOpened');
        hEl.first().addClass('bcdHeadClosed');
      }
      state="closed";
    }

    // in case we call blindUpDown directly we need the default target information again
    args.targetModelId = args.targetModelId || "guiStatus";
    args.targetModelXPath = args.targetModelXPath || "/*/guiStatus:ClientSettings/BlindUpDown[@id='"+ (actualId + "_bcduiBlindBody") +"']";
    bcdui.factory.objectRegistry.getObject(args.targetModelId).write(args.targetModelXPath, state, true);
  },

  /**
   * Called from the targetModel listener. It updates the area according to the xpath given state 
   * @private
   */
  _syncBlindUpDown: function(args){
    var elem = bcdui._migPjs._$(args.idOrElement);
    var className = "."+(args.blindBodyClassName || this.defaultBlindBodyClassName);
    var els = elem.find(className);

    if(els.length > 0)
      elem = bcdui._migPjs._$(els[0]);
    else if(elem.parent().find(className).length > 0)
      elem = bcdui._migPjs._$(elem.parent().find(className)[0]);
    else
      bcdui.log.warn("did not find element with CSS className:" + className);

    // determine current state and call blindUpDown accordingly if state is not in sync
    var state = bcdui.factory.objectRegistry.getObject(args.targetModelId).read(args.targetModelXPath, "");
    if (state == "closed" && ! elem.hasClass('bcdClosed')) { 
      elem.addClass('bcdOpened');
      elem.removeClass('bcdClosed');
      bcdui.widget.effects.blindUpDown(args);
    }
    if (state == "open" && ! elem.hasClass('bcdOpened')) {
      elem.addClass('bcdClosed');
      elem.removeClass('bcdOpened');
      bcdui.widget.effects.blindUpDown(args);
    }
  }
});
