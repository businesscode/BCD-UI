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

(function($) {
  // numeric compare function for array.sort
  var ARRAY_NUMERIC_SORT = function(a, b) {
    return a - b;
  };

  $.widget("bcdui.bcduiSliderNg", jQuery.bcdui.bcduiWidget, {
    /**
     * @private
     */
    _getCreateOptions : function() {
      return bcdui.widgetNg.impl.readParams.slider(this.element[0]);
    },

    /**
     * @private
     */
    _validateOptions : function() {
      bcdui.widgetNg.impl.validateParams.slider(this.options);
    },

    /**
     * @private
     */
    _destroy : function() {
      this._super();
    },

    /**
     * backed by jQueryUI Slider widget
     * 
     * @private
     */
    _create : function() {
      this._super();

      // check special options
      if (this.options.optionsModelXPath == null) {
        if (this.options.range == null) { // is .range option supplied, we assume noUiSlider API
          if (this.options.min == null || this.options.max == null)
            throw "Missing .min, .max parameters";
        }
      } else {
        if (this.options.min != null || this.options.max != null)
          throw "Must not set .min, .max parameters";
      }

      // wrapping element to render the slider into
      this.element.addClass("bcd-slider");

      $("<span class='bcdLoading'/>").appendTo(this.element); // use element to indicate loading, rather than class on targetHtml

      if (!this.options.labelRenderingFunctionTargetHtml) {
        this.options.labelRenderingFunctionTargetHtml = $("<div class='bcd-slider-label'/>").appendTo(this.element); // render the state of the widget
      } else {
        this.options.labelRenderingFunctionTargetHtml = $(this.options.labelRenderingFunctionTargetHtml);
      }

      // element containing the sliderElement, we need a wrapping element for that
      this.sliderTargetHtml = $("<div/>").appendTo(this.element);
      // this element is initalized with .slider() jQueryUI Widget
      this.sliderElement = null;

      // preset widgetRendering function
      if (!this.options.labelRenderingFunction) {
        this.options.labelRenderingFunction = this._defaultLabelRenderingFunction.bind(this);
      }

      // deferred construction; is executed once target and options are ready (if provided).
      var create = function() {
        if (!this.isDestroyed) {
          var self = this;

          // constructs a jQueryUI Slider Widget control into targetHtml;
          // jQueryUI Slider does not allow us to change min/max, so we have to reconstruct the widget if options change
          var constructWidgetImpl = function(targetHtml) {
            this.element.find(".bcdLoading").remove(); // remove loading indicator
            var rewriteModel = false;
            if (this.sliderElement) {
              this.sliderElement.remove(); // explicitely destroy widget
              rewriteModel = true;
            }
            this.sliderElement = jQuery("<div/>").appendTo(targetHtml.empty()); // reconstruct DOM entirely

            // re/read bound options
            if (this.options.optionsModelXPath) {
              this.boundOptions = this._getBoundOptions();
            }

            // params for slider / range / non-range
            var sliderArgs = this._getSliderOptions();

            // ensure sorted indexes when bound to options
            this.boundOptions && Array.isArray(sliderArgs.start) && sliderArgs.start.sort(ARRAY_NUMERIC_SORT);

            // construct the slider widget
            noUiSlider.create(this.sliderElement.get(0), sliderArgs);

            // write data to model on change
            this.sliderElement.get(0).noUiSlider.on("change", function(values) {
              self._writeModel(values);
            });

            // continously render label while sliding/updating the handle
            this.sliderElement.get(0).noUiSlider.on("update", function(values) {
              self._renderWidgetLabel(values);
            });

            // rewrite state to model
            if (rewriteModel) {
              this._writeModel(sliderArgs.start);
            }
          }.bind(this);

          // construct initially the widget impl
          constructWidgetImpl(this.sliderTargetHtml);

          // listen to target updates
          this._setOnTargetModelChange(function() {
            this._readModel();
          }.bind(this));

          // listen to options model updates, if we have one, and rebuild widget if options changes
          if (this.boundOptions) {
            this._getOptionSelector().onChange(constructWidgetImpl.bind(this, this.sliderTargetHtml));
          }
        }
      }.bind(this);

      // use jQuery's Deffered Queue instead of ecma6 Promise
      var dfd = [ $.Deferred() ]; // 0 = target, 1 = option(optional)

      // resolve target model
      this._getTargetSelector().getDataProvider().onceReady({
        onSuccess : dfd[0].resolve,
        executeIfNotReady : true
      });

      if (this.options.optionsModelXPath) { // we use value mapping to data provided by model
        dfd.push($.Deferred());

        // create a new model combining the options
        this._patchOptionsModel();

        // resolve options model to get ready ( have to resolve via objectRegistry )
        bcdui.factory.objectRegistry.withReadyObjectsNoExecute(this.options.optionsModelId, dfd[1].resolve);
      }

      // once everything got resolved, create the slider
      $.when.apply(undefined, dfd.map(function(e) {
        return e.promise()
      })).done(create);

      // init navPath
      if (! this.options.disableNavPath) {
        bcdui.widgetNg.slider.getNavPath(this.options.id, function(id, value) {
          bcdui.widget._linkNavPath(id, value);
        }.bind(this));
      }
    },

    /**
     * triggers rendering of current widget label, parameter may be undefined, then the slider widget is called for values, this function does nothing in case tooltips enabled in
     * options
     * 
     * @private
     * @param {integer|array}
     *          [value] value, range or skip, to read current value from the widget
     */
    _renderWidgetLabel : function(value) {
      if (this.options.tooltips !== undefined) {
        return;
      }
      // normalize, retrieve range/value from widget
      if (arguments.length == 0) {
        value = this.sliderElement.get(0).noUiSlider.get();
        if (!Array.isArray(value)) {
          value = [ value ]; // wrap into array
        }
      }

      // prepare args
      var args = {
        targetHtml : this.options.labelRenderingFunctionTargetHtml,
        captions : value.map(this._mapIndexToCaption.bind(this)),
        values : value.map(this._mapIndexToOption.bind(this))
      };

      this.options.labelRenderingFunction(args);
    },

    /**
     * default rendering of the label
     * 
     * @private
     * @param {object}
     *          with params
     * @param {targetHtmlRef}
     *          target html to render into
     * @param {array}
     *          [captions] set for range captions (or single element array)
     * @param {array}
     *          [values] set for range values (or single element array)
     */
    _defaultLabelRenderingFunction : function(args) {
      if (args.captions.length > 1) {
        args.targetHtml.text(args.captions[0] + " .. " + args.captions[1]);
      } else {
        args.targetHtml.text(args.captions[0]);
      }
    },

    /**
     * depending on current configuration (options available or not) returns proper settings, at this point options model and target model must be ready.
     * 
     * @private
     * @return {Object} with options for noUiSlider
     */
    _getSliderOptions : function() {
      var self = this;

      // default opts
      var opts = {
        animate : false,
        range : {
          // set initial from parameters
          min : this.options.min,
          max : this.options.max
        }
      };

      // merge options into opts if options.range provided
      if (this.options.range != null) {
        opts = $.extend(true, opts, this.options);
      }

      var currentValue = this._getValuesFromModel();

      // set current model values
      if (!Array.isArray(currentValue)) { // non-range mode
        if (this.options.isRange === true) {
          throw "Invalid state"; // range mode mapped to model in non-range mode
        }
        opts.start = [ currentValue || opts.range.min ]; // wrap into array
      } else { // range mode
        if (this.options.isRange === false) {
          throw "Invalid state"; // range mode mapped to model in range mode
        }
        opts.start = currentValue.map(function(e) {
          return e == null ? opts.range.min : e;
        }); // defaults to min
        opts.connect = true; // show bar between handles
        opts.behaviour = 'drag'; // enable drag the bar, enable tap
      }

      // remap options to indexes
      if (this.boundOptions) {
        var format = {
          to : function(value) {
            return self._mapIndexToCaption(Math.round(value));
          }
        };
        opts.step = 1; // use stepping when we have bound options
        opts.pips = {
          mode : "steps",
          density : this.boundOptions.values.length,
          filter : function(value) { // always large value on pips
            return 1;
          },
          format : format
        };
        opts.range.min = 0;
        opts.range.max = this.boundOptions.values.length - 1;
        this.sliderElement.parent().addClass("bcd-slider-has-pips"); // hack, need to set this in order to fix padding for pips
        if (this.options.isRange !== true) { // non-range mode
          opts.start = [ this._mapOptionToIndex(opts.start[0]) ];
        } else {
          opts.start = opts.start.map(this._mapOptionToIndex.bind(this));
        }
      }

      return opts;
    },

    /**
     * gets options from optionsModel
     * 
     * @private
     * @return {object} with following properties
     * @param {array}
     *          values array
     * @param {array}
     *          [captions] optional captions, if configured
     * @param {object}
     *          valuePosMap position-by-value map
     * @param {object}
     *          [captionPosMap] position-by-caption map
     */
    _getBoundOptions : function() {
      var optionsSelector = this._getOptionSelector();
      var buildPosMap = function(arr) {
        return arr.reduce(function(map, val, idx) {
          map[val] = idx;
          return map;
        }, {});
      };
      var res = {
        values : optionsSelector.values(),
        captions : optionsSelector.captions()
      };
      res.valuePosMap = buildPosMap(res.values);
      res.captionPosMap = buildPosMap(res.captions);

      return res;
    },

    /**
     * @private
     */
    _patchOptionsModel : function() {
      bcdui.widgetNg.utils._patchOptionsModel(this.options, {}, this.element.get(0), null, false);
      // fix path which gets overridden in bcdui.widgetNg.utils._patchOptionsModel
      this.options.optionsModelXPath = "$" + this.options.optionsModelId + this.options.optionsModelXPath;
    },

    /**
     * @private
     * @param {integer}
     *          index
     * @return either returns index or maps to boundOptions, if available and returns the mapped value
     */
    _mapIndexToOption : function(index) {
      if (this.boundOptions) {
        index = Math.round(parseFloat(index));
        var mapped = this.boundOptions.values[index];
        return mapped == null ? index : mapped;
      } else {
        return index;
      }
    },

    /**
     * @private
     * @param {integer}
     *          index
     * @return either returns index or maps to boundOptions, if available and returns the mapped caption
     */
    _mapIndexToCaption : function(index) {
      if (this.boundOptions) {
        index = Math.round(Number(index));
        var mapped = this.boundOptions.captions[index];
        return mapped == null ? index : mapped;
      } else {
        return index;
      }
    },

    /**
     * @private
     * @return {object} index of the option or 0 or option
     */
    _mapOptionToIndex : function(option) {
      if (this.boundOptions) {
        return Number(this.boundOptions.valuePosMap[option]) || 0;
      } else {
        return option;
      }
    },

    /**
     * @private
     * @return {object} index of the caption or 0 or option
     */
    _mapCaptionToIndex : function(option) {
      if (this.boundOptions) {
        return Number(this.boundOptions.captionPosMap[option]) || 0;
      } else {
        return option;
      }
    },

    /**
     * updates model with new value, this function is called by widget onchange
     * 
     * @private
     * @param {array}
     *          value the distinct value (single element in array) or range
     */
    _writeModel : function(value) {
      var selector = this._getTargetSelector();
      var dataProvider = selector.getDataProvider();
      var xPath = selector.xPath;

      if (this.boundOptions) {
        // fix range, may happen if greather value disappears from option and defaulted by first one
        value.sort(ARRAY_NUMERIC_SORT);
      }

      value = value.map(function(e) { // map index to option value
        var v = this._mapIndexToOption(e);
        return v == null ? "" : v;
      }.bind(this));

      if (this.options.isRange === true) {
        bcdui.core.createElementWithPrototype(dataProvider.getData(), xPath + this.options.relativeTargetXPathMin, false).text = value[0];
        bcdui.core.createElementWithPrototype(dataProvider.getData(), xPath + this.options.relativeTargetXPathMax, false).text = value[1];
      } else {
        bcdui.core.createElementWithPrototype(dataProvider.getData(), xPath, true).text = value[0];
      }

      // mask this update as self-update
      this._targetUpdated();
      // propagate update
      dataProvider.fire();
    },

    /**
     * read data from target model and reset the widget
     * 
     * @private
     */
    _readModel : function() {
      var currentValue = this._getValuesFromModel();

      if (!Array.isArray(currentValue)) { // non-range mode
        this.sliderElement.get(0).noUiSlider.set(this._mapOptionToIndex(currentValue));
      } else { // range mode
        var values = currentValue.map(this._mapOptionToIndex.bind(this));
        this.sliderElement.get(0).noUiSlider.set(values);
      }

      // update on change
      this._renderWidgetLabel();
    },

    /**
     * reads values from target model
     * 
     * @private
     * @return {string|array} either distinct value or range
     */
    _getValuesFromModel : function() {
      var selector = this._getTargetSelector();
      var dataProvider = selector.getDataProvider();
      var xPath = selector.xPath;

      if (this.options.isRange === true) { // range-mode
        return [ dataProvider.read(xPath + this.options.relativeTargetXPathMin), dataProvider.read(xPath + this.options.relativeTargetXPathMax) ];
      } else { // non-range mode
        return dataProvider.read(xPath);
      }
    }
  });
})(jQuery);

/**
 * A namespace for the BCD-UI slider widget. For creation
 * 
 * @see {@link bcdui.widgetNg.createSlider}
 * @namespace bcdui.widgetNg.slider
 */
bcdui.util.namespace("bcdui.widgetNg.slider",
/** @lends bcdui.widgetNg.slider */
{
  /**
   * initializes the widget according to the API
   * 
   * @param element
   *          {Element} to initialize from
   * @private
   */
  init : function(htmlElement) {
    jQuery(htmlElement).bcduiSliderNg();
  },

  /**
   * @param {string}
   *          id targetHtml of widget
   * @param {function}
   *          callback to be called with generated caption
   * @return {string} NavPath information via callback for widget
   */
  getNavPath : function(id, callback) {
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
