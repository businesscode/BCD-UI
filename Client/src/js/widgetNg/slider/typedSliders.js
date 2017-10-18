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
 * bcduiTimeSliderNg
 * 
 * @private
 */
(function($) {
  // we map timeband to decimal interval by following formula: <hours> + <minutes>/60
  // using minute ratio rather than minute value allows to use closed interval, however
  // rounding issues prevents from selecting odd minutes, but usually one uses interval
  // rather than exact minute value
  var timeToDec = window.timeToDec = function(value) {
    var parts = value.split(":");
    return (Number(parts[0]) || 0) + (Number(parts[1]) || 0) / 60;
  };
  var decToTime = window.decToTime = function(value) {
    var parts = value.toString().split(".");
    var min = ((Number("." + parts[1]) || 0) * 60).toFixed(0); // ratio to minute
    // pad with zeroes
    min.length == 1 && (min = "0" + min);
    parts[0].length == 1 && (parts[0] = "0" + parts[0]);
    return parts[0] + ':' + min;
  };

  var intervalToDec = function(value) {
    if (!value)
      return undefined;
    var parts = value.split(":");
    // check that minute is divisor of 60
    var m = Number(parts[1]) || 0;
    if (m && 60 % m !== 0)
      throw "Interval must be 60-fold";
    var value = Number(parts[0] || 0) + (m / 60);
    if (isNaN(value))
      throw "Invalid interval, format: h:m";
    return value;
  };

  var defaults = {
    min : "00:00",
    max : "24:00",
    step : ":15",
    margin : ":0",
    limit : ""
  };

  /**
   * @param {object}
   *          arg Argument with following properties
   * @param {string}
   *          [min="00:00"] Lower limit.
   * @param {string}
   *          [max="24:00"] Higher limit.
   * @param {string}
   *          [step="0:15"] Interval size.
   * @param {string}
   *          [margin=":0"] Minimum range duration.
   * @param {string}
   *          [limit] Maximum range duration.
   */
  $.widget("bcdui.bcduiTimeSliderNg", {
    _create : function() {
      $.extend(true, this.options, {
        isRange : true, // bcdui-api: enable range
        range : {
          min : timeToDec(this.options.min || defaults.min),
          max : timeToDec(this.options.max || defaults.max)
        },
        step : intervalToDec(this.options.step || defaults.step),
        margin : intervalToDec(this.options.margin || defaults.margin),
        limit : intervalToDec(this.options.limit || defaults.limit),
        format : {
          to : function(value) {
            return decToTime(value); // to string
          },
          from : function(value) {
            return timeToDec(value); // from string
          }
        },
        tooltips : true,
        pips : {
          mode : "positions",
          values : [ 0, 25, 50, 75, 100 ],
          density : 5,
          format : {
            to : function(value) {
              return decToTime(value);
            }
          }
        },
        cssPrefix : "bcduiTimeSlider-"
      });
      this.element.bcduiSliderNg(this.options);
    }
  });
})(jQuery);