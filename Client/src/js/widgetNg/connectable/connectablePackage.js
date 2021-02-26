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
   * Listens to updates on the target model and syncs the value back to the widget
   *
   * @method
   * @private
   */
  var XMLListener = class extends bcdui.widget.XMLDataUpdateListener
    /**
     * @lends XMLListener.prototype
     */
    {
      /**
       * @member bcdui.widget.inputField.XMLListener
       */
      updateValue(){
        var identical = (this.listenerType == "target");
        var widgetEl = jQuery("#" + this.htmlElementId);
        var widgetInstance = widgetEl._bcduiWidget();
        if (this.listenerType == "target") {
          var xPathValuesFromBox = jQuery("#" + this.htmlElementId).children(".ui-selectee").map(function() {return jQuery(this).attr("bcdValue")}).get();
          var target = widgetInstance.config.target;
          var nodes = bcdui.factory.objectRegistry.getObject(target.modelId).getData().selectNodes(target.xPath);
          if (nodes.length == xPathValuesFromBox.length) {
            var x = 0;
            while (identical && x < nodes.length) {
              identical &= (xPathValuesFromBox[x] == nodes[x].text);
              x++;
            }
          }
          else
            identical = false;
        }
        if (! identical)
          widgetInstance._readDataFromXML(this.listenerType);
      }
  };

  /**
   * internal parameters (not in the public API):
   * @param {function} [onItemMoved]          The callback is executed everytime an item (or a set of) is moved from between two connectables.
   *                                          the context is set to the instance of the origin widget and following parameters are passed
   *                                          from : container
   *                                          to   : container
   *                                          dir  : "src2dst" or "dst2src"
   * @private
   */
  jQuery.widget("bcdui.bcdConnectable", jQuery.bcdui.bcduiWidget,
    /** @lends bcdui.bcdConnectable */
    {
    /**
     * TODO migrate to jQuery Widget Event / Callback API
     * custom events fired on the connectable element
     *
     * @static
     */
    EVENT: {
      /**
       * fired on the connectable element after a SYNC_WRITE, that is
       * the widget value has been synced to the data model, 'memo' properties passed:
       *
       * - isValueEmpty {boolean}: if value is considered empty
       * - value {String}: the value synced
       * - hasWritten {boolean}: if the value has been written or not, i.e. the value is not written if value has not changed
       *
       * @method
       * @static
       */
      SYNC_WRITE : "bcd:widget.connectable.sync_write",

      /**
       * fired on the connectable element after a SYNC_READ, that is
       * the widget value has been loaded from the data model, 'memo' properties passed:
       *
       * - isValueEmpty {boolean}: if value is considered empty
       *
       * @static
       */
      SYNC_READ : "bcd:widget.connectable.sync_read"
    },

    /**
     * @private
     */
    _getCreateOptions : function(){
      return bcdui.widgetNg.impl.readParams.connectable(this.element[0]);
    },
    /**
     * @private
     */
    _validateOptions : function(){
      bcdui.widgetNg.impl.validateParams.connectable(this.options);
    },

    /**
     * initializes the widget according to the API
     *
     * @param element {Element} to initialize from
     * @param extendedConfig {Object?} optional configuration parameter as a part of protected level API
     *
     * extendedConfig parameters:
     * -  noTooltip: dont register a tooltip for a balloon
     * @private
     */
    _create : function() {
      this._super();

      // we need one global object for the scope
      // bcdui.widgetNg.connectable._bcdConnectableScope[current scope].activeBox is needed to rememeber the current box during a drag'n drop operation (to scroll the correct box)
      if (typeof bcdui.widgetNg.connectable._bcdConnectableScope == "undefined") bcdui.widgetNg.connectable._bcdConnectableScope = {};
      if (typeof bcdui.widgetNg.connectable._bcdConnectableScope[this.options.scope] == "undefined") bcdui.widgetNg.connectable._bcdConnectableScope[this.options.scope] = {};

      bcdui.log.isTraceEnabled() && bcdui.log.trace("creating connectable widget with config ");

      // setup our variables
      var args = this.options;

      if (!this.options.sortOptionsFunction){ // deploy default sorting function
        this.options.sortOptionsFunction = this._optionsSortingFunction;
      }

      this.wrsInlineValueDelim = args.wrsInlineValueDelim || "/";

      this.clickedRelativePos = null; // first click position for virtual lasso functionality
      this.doScroll = false;          // scroll event flag for auto-scroll functionality
      this.intervalId = null;         // interval handle for auto-scroll functionality
      this.scrollSensitivity = 20;    // custom scolling t/l/r/b pixel offset to start scrolling
      this.scrollSpeed = 20;          // custom scrolling scroll-by pixel numbers
      this.keyTimeout = null;         // timeout handle for type-to-select functionality
      this.lastWord = "";             // word collector for type-to-select functionality
      this.lastIndex = 0;             // matchlist index for type-to-select functionality

      // init internal config
      this.config = {
        target: args.targetModelXPath ? bcdui.factory._extractXPathAndModelId(args.targetModelXPath) : null,
        source: args.optionsModelXPath? bcdui.factory._extractXPathAndModelId(args.optionsModelXPath) : null,
        elementId: "connect_" + args.id,
        extendedConfig: this.options.extendedConfig||{}
      };
      if (this.config.source) {
        this.config.source.optionsModelRelativeValueXPath = args.optionsModelRelativeValueXPath;
        this.config.source.optionsModelRelativeFilterPredicate = args.optionsModelRelativeFilterPredicate;
      }

      // avoid rendering while attaching children
      this.setVisible(false);

      // and initally render the (empty) container
      this.container = jQuery(this._generateContainerHtml()).appendTo(this.element);


      // build optionsmodel wrapper if we got model dependencies
      // and replace config ids/xpaths if necessary
      if (this.config.source) {
        var cfg = {
          element: this.container.get(0),
          optionsModelId: this.config.source.modelId,
          optionsModelXPath: this.config.source.xPath,
          optionsModelRelativeValueXPath: this.config.source.optionsModelRelativeValueXPath
        };
        var models = bcdui.widget._extractModelsFromModelXPath(cfg.optionsModelXPath);
        if (models) {
          bcdui.widget._createWrapperModel(models, cfg, "widget/multiOptionsModelWrapper.xslt");
          this.config.source.modelId = cfg.optionsModelId;
          this.config.source.xPath = cfg.optionsModelXPath;
          this.config.source.optionsModelRelativeValueXPath = cfg.optionsModelRelativeValueXPath;
        }

        // in case of non-Wrs and with predicate enabled we add another target listener considering predicate to trigger options refresh
        // when pointing to Wrs options the change gets propagated by multiOptionsModelWrapper
        if(this.config.source && this.config.source.optionsModelRelativeFilterPredicate && this.options.optionsModelXPath.indexOf("wrs:") == -1){
          var _selector = this._getOptionSelector();
          // we have only to refresh the source side without syncing back to model
          _selector.onChange(this._renderItems.bind(this, false), _selector.xPath + this.config.source.optionsModelRelativeFilterPredicate);
        }

        // finally set the valueXPath used in the update listener
        this.config.source.valueXPath = this.config.source.xPath + (this.config.source.optionsModelRelativeValueXPath ? "/" + this.config.source.optionsModelRelativeValueXPath : "");
      }

      // init the control
      this._createConnectableControl();

      // initially render items
      this._renderItems(true, true);

      // rerender connected boxes to ensure integrity of items
      if (this.config.target) {
        // we are a target, so update the source
        this._getScopedSourceElement()._bcduiWidget()._renderItems(true);
      }
      if (this.config.source) {
        // we a a source, so update (multiple) targets
        this._getScopedTargetElements().each(function(){ jQuery(this)._bcduiWidget()._renderItems(true) });
      }

      // register listeners, one for targetmodel changes, one for optionsmodel changes
      if (this.config.target) {
        var syncValueListener = new XMLListener({
          idRef: this.config.target.modelId,
          trackingXPath: this.config.target.xPath,
          htmlElementId: this.config.elementId
        });
        syncValueListener.scope = this.options.scope;
        syncValueListener.listenerType = "target";
        bcdui.factory.addDataListener(syncValueListener);
        this.syncValueListener = syncValueListener;
      }
      if (this.config.source) {
        var updateValueListener = new XMLListener({
          idRef: this.config.source.modelId,
          trackingXPath: this.config.source.valueXPath,
          htmlElementId: this.config.elementId
        });
        updateValueListener.scope = this.options.scope;
        updateValueListener.listenerType = "source";
        bcdui.factory.addDataListener(updateValueListener);
        this.updateValueListener = updateValueListener;
      }

      // attach balloon
      if (this.options.hint) {
        this.container.attr("bcdHint", this.options.hint);
      }
      bcdui.widgetNg.commons.balloon.attach(this.config.elementId, {noTooltip: this.config.extendedConfig.noTooltip});

      // display constructed container
      this.setVisible(true);

      // set autofocus after display
      if(args.autofocus)
        this.container.focus();
    },

    /**
     *  is triggered when data model has changed and we need to re-render our connectable, e.g. when options model changed or you injected something into target model
     *  @private
     */
    _readDataFromXML: function(listenerType, reEntry){

      // re-render current connectable
      this._renderItems(listenerType == "source");
      
      var targetReadFunc = function(){ jQuery(this)._bcduiWidget()._readDataFromXML(listenerType, true); };

      // we rerendered the target box due to a target event, now we also need to redraw the belonging source box
      if (this.config.target && ! reEntry) {
        this._getScopedSourceElement().each(targetReadFunc);
      }

      // we rerendered the source box due to a source event, now we also need to redraw each belonging target box
      if (this.config.source && ! reEntry) {
        this._getScopedTargetElements().each(targetReadFunc);
      }
    },

    /**
     * writes values into data model, handles Wrs and non-Wrs targets.
     *
     * @param {object} sourceBox      Container as jQuery object to extract the values from.
     * @param {object} targetConfig   Configuration of the target to write values to.
     *
     * @private
     */
    _doWriteXML: function(sourceBox, targetConfig) {

      // triggerd after a nonUIUpdate (inject/optionsmodel change) or when you used the ui to drag/move items
      // write values to target (wrs or non wrs mode)

      var values = jQuery(sourceBox).children(".ui-selectee").map(function() {return jQuery(this).attr("bcdValue")}).get(); // get values from source as array
      var targetModel = bcdui.factory.objectRegistry.getObject(targetConfig.modelId);

      if (targetConfig.xPath.indexOf("wrs:") > -1) {
        var inlineValue = (values||[]).join(this.wrsInlineValueDelim);
        bcdui.core.createElementWithPrototype(targetModel.getData(), targetConfig.xPath).text = inlineValue;
      } else {
        var tMXP = (targetConfig.xPath.match(/.*\/@\w+$/) === null ) ? targetConfig.xPath : targetConfig.xPath.substring(0,targetConfig.xPath.lastIndexOf("@")-1);
        bcdui.core.removeXPath(targetModel.getData(), tMXP, true, true);
        for (var i = 0; i < values.length; ++i) {
          bcdui.core.createElementWithPrototype(targetModel.getData(), targetConfig.xPath + "[. = '" + bcdui.core.magicChar.separator + "']");
          var n = targetModel.query(targetConfig.xPath + "[. = '" + bcdui.core.magicChar.separator + "']");
          if (n.nodeType === 2)
            (n.ownerElement || n.selectSingleNode("parent::*")).setAttribute(n.nodeName, values[i]);
          else
            n.text = values[i];
        }
      }
      targetModel.fire();
    },

    /**
     * Writes data on both connectables, this function is called if an item has been moved from source to target
     * @private
     */
    _writeDataToXML: function(source, target){
      source = jQuery(source);
      target = jQuery(target);

      // remember source and target boxes, can be reused for all kind of purposes (e.g. same box move detection)
      bcdui.widgetNg.connectable._bcdConnectableScope[this.options.scope].source = source.attr("id");
      bcdui.widgetNg.connectable._bcdConnectableScope[this.options.scope].target = target.attr("id");

      // when the target is a target box, we need to write data to its targetxpath
      if (target.hasClass("bcdTarget")) {
        var tInstance = target.parent()._bcduiWidget();
        this._doWriteXML(target, bcdui.factory._extractXPathAndModelId( tInstance.options.targetModelXPath ));
        tInstance.onChange();
      }

      // when the source is also a target box, we of course need to write data to its targetxpath, too
      // we skip an obsolete additional write if we moved an item within the same target box
      if (source.attr("id") != target.attr("id") && source.hasClass("bcdTarget")) {
        var sInstance = source.parent()._bcduiWidget();
        this._doWriteXML(source, bcdui.factory._extractXPathAndModelId( sInstance.options.targetModelXPath ));
        sInstance.onChange();
      }
    },

    /**
     * @private
     */
    _destroy: function() {
      this._super();
      this.container.off();

      // ## now detach listeners
      if (this.syncValueListener) {
        this.syncValueListener.unregister();
        this.syncValueListener = null;
      }
      if (this.updateValueListener) {
        this.updateValueListener.unregister();
        this.updateValueListener = null;
      }
    },
    
    /**
     * @return jQuery object containing the source element for current scope; this is the element containing .bcdSource container
     * @private
     */
    _getScopedSourceElement: function(){
      return this._getScopedSourceContainer().parent();
    },

    /**
     * @return jQuery object containing the source container for current scope; this is the .bcdSource element
     * @private
     */
    _getScopedSourceContainer: function(){
      return jQuery("[bcdScope='" + this.options.scope + "'].bcdSource");
    },

    /**
     * @return jQuery object containing (mulitple) target element for current scope; these are elements each containing a .bcdTarget container
     * @private
     */
    _getScopedTargetElements: function(){
      return this._getScopedTargetContainers().parent();
    },

    /**
     * @return jQuery object containing (mulitple) containers for current scope; these are .bcdTarget elements
     * @private
     */
    _getScopedTargetContainers: function(){
      return jQuery("[bcdScope='" + this.options.scope + "'].bcdTarget");
    },

    /**
     * renders items (and optionally purges target model)
     *
     * @param {boolean} [doWriteXML=false]    If set to true, also purges current configuration into target model, effective on a connectable of type 'bcdTarget' only.
     * @param {boolean} [isInitalCall=false]  If set to true, also runs one time init routine, i.e. navPath initialization
     * @private
     */
    _renderItems: function(doWriteXML, isInitalCall) {

      // we're a target box....
      if (this.config.target) {

        // we wait for readiness of current target and belonging source
        // and remember source options
        var targetModels = new Array(this.config.target.modelId);
        var sourceConfig = this._getScopedSourceElement()._bcduiWidget().config.source;
        targetModels.push(sourceConfig.modelId);

        bcdui.factory.objectRegistry.withReadyObjects(targetModels, function(){

          // build up a value, original position and caption map
          var nodes = bcdui.factory.objectRegistry.getObject(sourceConfig.modelId).getData().selectNodes(sourceConfig.xPath);
          var bcdPosMap = {};
          var captionMap = {};

          var sortedOptions = jQuery.makeArray(nodes).map(function(node) {
            var caption = node.nodeValue || node.text;
            var value = sourceConfig.optionsModelRelativeValueXPath ? node.selectSingleNode(sourceConfig.optionsModelRelativeValueXPath) : null;
            if (value != null)
              value = value.nodeValue || value.text;
            else
              value = caption;
            return { value: bcdui.util.escapeHtml(value), caption: bcdui.util.escapeHtml(caption) };
          });

          if (this.options.doSortOptions) {
            sortedOptions.sort(function(a,b){
              return this.options.sortOptionsFunction(a,b,{ instance : this });
            }.bind(this));
          }

          for (var i = 0; i < sortedOptions.length; i++) {
            var value = sortedOptions[i].value;
            bcdPosMap[value] = i;
            captionMap[value] = sortedOptions[i].caption;
          }

          // regenerate items
          this.container.empty();

          var html = "";
          // get array of target item in case of wrs mode
          var targetItems = bcdui.factory.objectRegistry.getObject(this.config.target.modelId).getData().selectSingleNode(this.config.target.xPath);
          targetItems = targetItems == null ? [] : targetItems.text.split(this.wrsInlineValueDelim);
          var targetNodes = (this.config.target.xPath.indexOf("wrs:") > -1) ? targetItems : bcdui.factory.objectRegistry.getObject(this.config.target.modelId).getData().selectNodes(this.config.target.xPath);
          for (var j = 0; j < targetNodes.length; j++) {
            var idValue = (this.config.target.xPath.indexOf("wrs:") > -1) ? targetNodes[j] : targetNodes[j].text;
            idValue = bcdui.util.escapeHtml(idValue);

            // only render items which are available in the options model and get original position and caption information (unless you allow them)
            if (typeof bcdPosMap[idValue] != "undefined")
              html += this.generateItemHtml({value: idValue, caption: captionMap[idValue], position: bcdPosMap[idValue], id: this.config.elementId, isTarget: true, _widgetInstance: this });
            else if (this.options.allowUnknownTargetValue && idValue != "")
              html += this.generateItemHtml({value: idValue, caption: idValue, position: -1, id: this.config.elementId, isTarget: true, _widgetInstance: this});
          }
          this.container.append(html);

          // clean possibly existing garbage (not valid) entries on target element
          // this should be done on init or on options model change
          if (doWriteXML)
            this._doWriteXML(this.container, this.config.target);

        }.bind(this));
      }


      // we're a source box....
      if (this.config.source) {

        // we wait for readiness of all belonging targets and source
        var sourceModels = new Array(this.config.source.modelId);
        // collect target model ids into models-array
        this._getScopedTargetElements().each(function(){
          sourceModels.push( bcdui.factory._extractXPathAndModelId( jQuery(this)._bcduiWidget().options.targetModelXPath ).modelId )
        });

        bcdui.factory.objectRegistry.withReadyObjects(sourceModels, function(){
          // we need to ensure to always use the *current* target information for filtering out source items here
          var targetConfig = new Array();

          // collect target model xpath into targetConfig
          this._getScopedTargetElements().each(function(){
            targetConfig.push( bcdui.factory._extractXPathAndModelId( jQuery(this)._bcduiWidget().options.targetModelXPath ) )
          });

          this.container.empty();

          var nodes = bcdui.factory.objectRegistry.getObject(this.config.source.modelId).getData().selectNodes(this.config.source.xPath);

          // build filtered element items
          this.filteredItems = {};
          var filteredNodes = this.config.source.optionsModelRelativeFilterPredicate ? bcdui.factory.objectRegistry.getObject(this.config.source.modelId).getData().selectNodes(this.config.source.xPath + this.config.source.optionsModelRelativeFilterPredicate) : nodes;
          for (var i = 0; i < filteredNodes.length; i++) {
            var idValue = filteredNodes[i].text;
            if (this.config.source.optionsModelRelativeValueXPath) {
              idValue = filteredNodes[i].selectSingleNode(this.config.source.optionsModelRelativeValueXPath);
              idValue = idValue != null ? idValue.text : idValue;
            }
            idValue = bcdui.util.escapeHtml(idValue);
            this.filteredItems[idValue] = idValue;
          }

          var self = this;
          // extract options from data model
          var sortedOptions = jQuery.makeArray(nodes).map(function(node) {
            var caption = node.nodeValue || node.text;
            var value = self.config.source.optionsModelRelativeValueXPath ? node.selectSingleNode(self.config.source.optionsModelRelativeValueXPath) : null;
            if (value != null)
              value = value.nodeValue || value.text;
            else
              value = caption;
            return { value: bcdui.util.escapeHtml(value), caption: bcdui.util.escapeHtml(caption) };
          });

          // let's optionally sort our optionsmodel by caption
          if (this.options.doSortOptions) {
            sortedOptions.sort(function(a,b){
              return this.options.sortOptionsFunction(a,b,{ instance : this });
            }.bind(this));
          }

          // build list with items from all targets
          var targetValues = [];
          var targetValuesTemp = [];
          for (var t = 0; t < targetConfig.length; t++) {
            if (targetConfig[t].xPath.indexOf("wrs:") > -1) {
              targetValuesTemp = bcdui.factory.objectRegistry.getObject(targetConfig[t].modelId).getData().selectSingleNode(targetConfig[t].xPath);
              targetValuesTemp = targetValuesTemp == null ? [] : targetValuesTemp.text.split(this.wrsInlineValueDelim);
            }
            else
              targetValuesTemp = jQuery.makeArray(bcdui.factory.objectRegistry.getObject(targetConfig[t].modelId).queryNodes(targetConfig[t].xPath)).map(function(e){return e.text;});
            targetValuesTemp = targetValuesTemp.map(function(e){return bcdui.util.escapeHtml(e);})

            targetValues = targetValues.concat(targetValuesTemp);
          }

          var html = "";
          for (var j = 0; j < sortedOptions.length; j++) {

            // remember original positions and captions for value
            var value = sortedOptions[j].value;

            // render item only if it's part of the filtered values and not in one target
            var doShow = (this.filteredItems[value] == value) && targetValues.indexOf(value) == -1;
            if (doShow)
              html += this.generateItemHtml({value: value, caption: sortedOptions[j].caption, position: j, id: this.config.elementId, isTarget: false, _widgetInstance: this});
          }
          this.container.append(html);

        }.bind(this));
      }
    },

    /**
     * our default options sorting function uses alphabetical sorting on captions
     * @private
     */
    _optionsSortingFunction : function(a, b){
      var x = a.caption.toLowerCase(), y = b.caption.toLowerCase();
      return x < y ? -1 : x > y ? 1 : 0;
    },

    /**
     * @return {array} an array with all selected values from all targets and returns as array
     * @private
     */
    _collectSelectedValues : function(){
      var wrsDelim = this.wrsInlineValueDelim; // delimiter used in a Wrs element
      return this._getScopedTargetElements()
      // to {modelId, xPath}
      .map(function(){
        return bcdui.factory._extractXPathAndModelId( jQuery(this)._bcduiWidget().options.targetModelXPath )
      })
      // get raw array
      .get()
      // resolve values
      .reduce(function(arr,t){
        var values; // array of values to return

        if(t.xPath.indexOf("wrs:") > -1){ // is targeting to Wrs element
          var value = bcdui.factory.objectRegistry.getObject(t.modelId).read(t.xPath);
          if(value){
            values = value.split(wrsDelim);
          }
        } else {
          values = jQuery.makeArray(
            bcdui.factory.objectRegistry.getObject(t.modelId).getData().selectNodes(t.xPath)
          )
          // extract value from dom node
          .map(function(n){
            return n.text;
          });
        }

        return arr.concat(values);
      },[]);
    },

    /**
     * Same as _collectSelectedValues() but returns a hashmap (with null values)
     * @return {object} a map with values as keys (and undefined as values)
     * @private
     */
    _collectSelectedValuesMap : function(){
      return this._collectSelectedValues().reduce(function(o,e){ o[e] = undefined; return o; }, {});
    },

    /**
     * @private
     */
    _generateContainerHtml: function() {
      return "<ul " + (this.options.disabled ? "disabled" : "") + " tabindex='" + (this.options.tabIndex ? this.options.tabIndex : "1") + " ' id='" + this.config.elementId + "' bcdScope='" + this.options.scope + "' class='bcdConnectable" + (this.options.className ? " " + this.options.className : "") + (this.config.target && this.options.isDoubleClickTarget ? " bcdDblClkTarget" : "") + (this.config.source ? " bcdSource" : " bcdTarget") + "'></ul>";
    },

    /**
     * straight forward sort which sorts by the attribute bcdPos (original position)
     * @private
     */ 
    _sort: function(theContainer) {
      var theItems = jQuery(theContainer).children(".ui-selectee");
      theItems.sort(function (a, b) {
        return (parseInt(jQuery(a).get(0).getAttribute("bcdPos"), 10) > parseInt(jQuery(b).get(0).getAttribute("bcdPos"), 10) ? 1 : -1);
      });
      theContainer.append(theItems);

      // remove items which are not part of the filtered items...
      // if you're using optionsModelRelativeFilterPredicate you might have target items
      // which should not appear in the filtered source items when you move them
      // so after the resort we can simply kick them out
      theItems = jQuery(theContainer).children(".ui-selectee");
      for (var i = 0; i < theItems.length; i++) {
        var value = bcdui.util.escapeHtml(jQuery(theItems[i]).attr("bcdValue"));
        var filteredItems = theContainer.parent()._bcduiWidget().filteredItems;
        if (filteredItems && filteredItems[value] != value)
          jQuery(theItems[i]).addClass("bcdRemove");
      }
      jQuery(".bcdRemove", theContainer).remove();

    },

    /**
     *  general scroll-the-control routine which scrolls top/right/left/bottom depending on the position...
     *  @private
     */
    _scrollControl: function(args) {
      var pos = {
          top:    jQuery(args.id).offset().top
        , left:   jQuery(args.id).offset().left
        , right:  jQuery(args.id).offset().left + jQuery(args.id).prop("clientWidth")
        , bottom: jQuery(args.id).offset().top + jQuery(args.id).prop("clientHeight")
      };

      var oldT = jQuery(args.id).get(0).scrollTop;
      var oldL = jQuery(args.id).get(0).scrollLeft;

      if(pos.bottom - args.pageY < this.scrollSensitivity)
        jQuery(args.id).get(0).scrollTop = jQuery(args.id).get(0).scrollTop + this.scrollSpeed;
      else if(args.pageY - pos.top < this.scrollSensitivity)
        jQuery(args.id).get(0).scrollTop = jQuery(args.id).get(0).scrollTop - this.scrollSpeed;
      if(pos.right - args.pageX < this.scrollSensitivity)
        jQuery(args.id).get(0).scrollLeft = jQuery(args.id).get(0).scrollLeft + this.scrollSpeed;
      else if(args.pageX - pos.left < this.scrollSensitivity)
        jQuery(args.id).get(0).scrollLeft = jQuery(args.id).get(0).scrollLeft - this.scrollSpeed;

      this.doScroll = oldT != jQuery(args.id).get(0).scrollTop || oldL != jQuery(args.id).get(0).scrollLeft;

      return pos;
    },

    /**
     * @private
     */
    _handleSelectableScrolling: function(args) {

      // scroll the control if needed
      var pos = this._scrollControl(args);

      // mark items which are under the virtual lasso (= original mouse click pos and current mouse pos) as selected
      // for this we first calculate r1 which is the virtual rectangle inside the control (incl. possible scoll)
      var r1 = {
            left: this.clickedRelativePos.left
          , top: this.clickedRelativePos.top
          , right: args.pageX - pos.left + jQuery(args.id).prop('scrollLeft')
          , bottom: args.pageY - pos.top + jQuery(args.id).prop('scrollTop')
      };

      // normalize rectangle since we might move up / left
      if (r1.left > r1.right) { var b = r1.left; r1.left = r1.right; r1.right = b;  }
      if (r1.top > r1.bottom) { var c = r1.top; r1.top = r1.bottom; r1.bottom = c; }

      // mark items as selected (stored positions in 'position data' which are touched by the lasso)
      var items = jQuery(args.id).children(".ui-selectee");
      for (var i = 0; i < items.length; i++) {
        var r2 = jQuery(items[i]).data("position");
        if (typeof r2 != "undefined" && r2 != null) {
          if (r1.left > r2.right || r2.left > r1.right || r1.top > r2.bottom || r2.top > r1.bottom)
            jQuery(items[i]).removeClass("ui-selecting");
          else
            jQuery(items[i]).addClass("ui-selecting");
        }
      }
    },

    /**
     * @private
     */
    _getMoveType: function(from, to) {
      var value = bcdui.widgetNg.connectable.CHANGE_DIRECTION.SRC_TO_TARGET;
      if (jQuery(to).hasClass("bcdSource"))
        value = bcdui.widgetNg.connectable.CHANGE_DIRECTION.TARGET_TO_SRC;
      else if (jQuery(from).hasClass("bcdTarget"))
        value = bcdui.widgetNg.connectable.CHANGE_DIRECTION.TARGET_TO_TARGET;
      return value;
    },

    /**
     * attach events to container
     * @private
     */
    _createConnectableControl: function(){
      var nop = function(args){ return true; };

      // setup our function handlers
      this.onBeforeChange = this.options.onBeforeChange || nop;
      this.onChange = this.options.onChange || nop;
      this.generateItemHelperHtml = this.options.generateItemHelperHtml || function(event, item) {
        // custom helper rendering...we show up to 5 selected items (+ "..." if there are more)
        var selectedItems = this.container.children('.ui-selected').not(".ui-sortable-placeholder").add(item);
        var caption = "<ul>";
        for (var i = 0; i < selectedItems.length && i < 5; i++)
          caption += "<li>" + (jQuery(selectedItems[i]).text() == "" ? jQuery(selectedItems[i]).attr("bcdValue") : jQuery(selectedItems[i]).text()) + "</li>";
        if (selectedItems.length > 5)
          caption += "<li>[...]</li>";
        caption += "</ul>";
        return jQuery(caption);
      };

      this.generateItemHtml = this.options.generateItemHtml || function(args){return "<li class='ui-selectee' bcdValue='" + args.value + "' bcdPos='" + args.position + "' bcdLoCase='" + args.caption.toLowerCase() + "' title='" + args.caption + "'><span class='bcdItem'>" + args.caption + "</span></li>";};

      var self = this;

      // let's handle ctrl-a, del, return via keydown
      this.container.keydown(function(event) {
        // select ALL
        if ((event.ctrlKey || event.metaKey) && event.keyCode == "65") {
          jQuery(this).children(".ui-selectee").addClass("ui-selected");
          event.preventDefault();
          return false;
        }
        // in case of DEL key (and being a target), move all seletect items to source
        if (event.keyCode == "46" && self.config.target) {
          self._moveSelectedItems(jQuery(this), self._getScopedSourceContainer());
          event.preventDefault();
          return false;
        }
        // in case of RETURN key move all selected items to first target or bcdDblClkTargetor or to source
        if (event.keyCode == "13") {
          var target = jQuery("[bcdScope='" + self.options.scope + "'].bcdDblClkTarget");
          target = target.length > 0 ? target : self._getScopedTargetContainers();
          var to = (jQuery(this).hasClass("bcdSource")) ? target.first() : self._getScopedSourceContainer();
          self._moveSelectedItems(jQuery(this), to);
          event.preventDefault();
          return false;
        }
      });

      // for typing we better use keypress
      this.container.keypress(function(event) {

        var old = self.lastWord;
        self.lastWord += String.fromCharCode(event.charCode||event.which||event.keyCode).toLowerCase();

        var items = jQuery(this).find("[bcdLoCase^='" + self.lastWord + "']");

        // if we don't find a match reset to last word but increase index of matchlist
        if (items.length == 0 && old.length > 0) {
          self.lastWord = old;
          self.lastIndex++;
        }
        items = jQuery(this).find("[bcdLoCase^='" + self.lastWord + "']");
        if (items.length > 0) {
          // if we reached last index, jump back to first
          if (self.lastIndex >= items.length)
            self.lastIndex = 0;

          // and finally bring item into view
          var offset = jQuery(this).children(".ui-selectee").first().position().top;
          jQuery(this).scrollTop(jQuery(items[self.lastIndex]).position().top - offset);

          // auto select item, deselect others
          jQuery(items[self.lastIndex]).siblings('.ui-selected').removeClass("ui-selected");
          jQuery(items[self.lastIndex]).addClass("ui-selected");
        }

        // let's have a timeout where our wordtyping gets reset
        if (self.keyTimeout)
          clearTimeout(self.keyTimeout);
        self.keyTimeout = setTimeout(function () { self.lastIndex = 0; self.lastWord = ""; self.keyTimeout = null; }, 750);

        // avoid space forcing scrolling
        if (event.keyCode == 32) {
          event.preventDefault();
          return false;
        }
      });

      // have a separate on click handler to support ctrl/shift and click actions on bcdItems only
      // this is needed to bring the selection functions of selectables to sortables
      this.container.on("click", ".bcdItem", function (event) {

        // clean variable and timers of keystroke support
        self.container.focus();
        if (self.keyTimeout) clearTimeout(self.keyTimeout);
        self.lastWord = "";
        self.lastIndex = 0;

        var oTarget = jQuery(event.target);
        if( ! oTarget.is('.ui-selectee'))
          oTarget = oTarget.parents('.ui-selectee');

        // handle ctrl + click
        if (event.ctrlKey || event.metaKey)
          jQuery(oTarget).toggleClass("ui-selected");

        // handle shift + click
        else if(event.shiftKey) {
          oTarget = jQuery(event.target);

          if( ! oTarget.is('.ui-selectee'))
            oTarget = oTarget.parents('.ui-selectee');

          var iNew = jQuery(event.currentTarget).find('.ui-selectee').index(oTarget);
          var iCurrent = jQuery(event.currentTarget).find('.ui-selectee').index(jQuery(event.currentTarget).find('.ui-selected'));

          if (iCurrent < iNew) {
            var iHold = iNew;
            iNew = iCurrent;
            iCurrent = iHold;
          }

          if(iNew != '-1') {
            jQuery(event.currentTarget).find('.ui-selected').removeClass('ui-selected');
            for (var i=iNew;i<=iCurrent;i++)
              jQuery(event.currentTarget).find('.ui-selectee').eq(i).addClass('ui-selected');
          }
        }
        // handle standard click
        else
          jQuery(oTarget).addClass("ui-selected").siblings().removeClass('ui-selected');
      });

      // mouse down has to handle several things
      // - shift key support
      // - recalculated relative item positions and remmeber first clicked position for virtual lasso
      this.container.mousedown(function(event) {

        // mark clicks on scrollbars, we then set another class which is in the cancel list of the selectable
        // otherwise it would deselect items when you try to scroll
        if (   event.pageX > jQuery(event.target)[0].clientWidth + jQuery(event.target).offset().left
            || event.pageY > jQuery(event.target)[0].clientHeight + jQuery(event.target).offset().top
        )
          jQuery(this).addClass("bcdNotSelectable");
        else
          jQuery(this).removeClass("bcdNotSelectable");

        // Shift Key support
        if(event.shiftKey) {
          var oTarget = jQuery(event.target);

          if( ! oTarget.is('.ui-selectee'))
            oTarget = oTarget.parents('.ui-selectee');

          var iNew = jQuery(event.currentTarget).find('.ui-selectee').index(oTarget);
          var iCurrent = jQuery(event.currentTarget).find('.ui-selectee').index(jQuery(event.currentTarget).find('.ui-selected'));

          if (iCurrent < iNew) {
            var iHold = iNew;
            iNew = iCurrent;
            iCurrent = iHold;
          }

          if(iNew != '-1') {
            jQuery(event.currentTarget).find('.ui-selected').removeClass('ui-selected');
            for (var i=iNew;i<=iCurrent;i++)
              jQuery(event.currentTarget).find('.ui-selectee').eq(i).addClass('ui-selected');
            event.stopImmediatePropagation(); // we need to stop here, otherwise bubbling will deselect our items directly
            return false;
          }
        }

        // and remember relative position of this first click
        // needed later to construct the 'real' lasso rectangle
        var boxOffset = jQuery(this).offset();
        var scrollLeft = jQuery(this).prop('scrollLeft');
        var scrollTop = jQuery(this).prop('scrollTop');

        var a = {};
        a.left = event.pageX - boxOffset.left + scrollLeft;
        a.top = event.pageY - boxOffset.top + scrollTop;
        self.clickedRelativePos = a;

        // recalculate relative positions of elements since we need them for later "is item in lasso" check
        var items = jQuery(this).children(".ui-selectee");
        for (var j = 0; j < items.length; j++) {
          var pos = jQuery(items[j]).offset();
          jQuery(items[j]).data({
            position: {
              left: pos.left - boxOffset.left + scrollLeft,
              top: pos.top - boxOffset.top + scrollTop,
              right: pos.left - boxOffset.left + scrollLeft + jQuery(items[j]).outerWidth(),
              bottom: pos.top - boxOffset.top + scrollTop + jQuery(items[j]).outerHeight()
            }
          })
        }
      });

      // create the jquery selectable
      if (! this.options.disabled) {
        this.container.selectable({
            filter: ".ui-selectee"
          , cancel: ".bcdItem, .bcdNotSelectable"
          , start: function () {

            // clean variable and timers of keystroke support
            jQuery(this).focus();
            if (self.keyTimeout) clearTimeout(self.keyTimeout);
            self.lastWord = "";
            self.lastIndex = 0;

            jQuery(document).on("mousemove", function(event) {

              // drawing lasso

              if (self.options.showLasso) {
                // get relative position of current mouse pos
                var boxOffset = self.container.offset();
                var scrollLeft = self.container.prop('scrollLeft');
                var scrollTop = self.container.prop('scrollTop');
  
                var q = {
                    top:    boxOffset.top  - scrollTop  + self.clickedRelativePos.top
                  , left:   boxOffset.left - scrollLeft + self.clickedRelativePos.left
                  , right:  event.pageX
                  , bottom: event.pageY
                };

                // normalize rectangle since we might move up / left
                if (q.left > q.right) { var b = q.left; q.left = q.right; q.right = b;  }
                if (q.top > q.bottom) { var c = q.top; q.top = q.bottom; q.bottom = c; }

                // check if we reach the border

                var classes = new Array();

                if (boxOffset.top > q.top) {
                  q.top = boxOffset.top;
                  classes[classes.length] = "bcdNoTop";
                }
                if (boxOffset.left > q.left) {
                  q.left = boxOffset.left;
                  classes[classes.length] = "bcdNoLeft";
                }
                if (boxOffset.top + self.container.prop("clientHeight") < q.bottom) {
                  q.bottom = boxOffset.top + self.container.prop("clientHeight");
                  classes[classes.length] = "bcdNoBottom";
                }
                if (boxOffset.left + self.container.prop("clientWidth") < q.right) {
                  q.right = boxOffset.left + self.container.prop("clientWidth");
                  classes[classes.length] = "bcdNoRight";
                }

                jQuery(".ui-selectable-helper").css({
                   top: q.top
                  , left: q.left
                  , width: (q.right - q.left)
                  , height: (q.bottom - q.top)
                });
                jQuery(".ui-selectable-helper").removeClass("bcdNoTop bcdNoLeft bcdNoBottom bcdNoRight");
                jQuery(".ui-selectable-helper").addClass(classes.join(" "));
              }

              // for auto scrolling we add an interval which calls the scroll handling again....
              if (self.doScroll && self.intervalId == null) {
                self.intervalId = setInterval(function () {
                  self._handleSelectableScrolling({id: self.container, pageY: event.pageY, pageX: event.pageX});
                }, 100);
              }
              // in case we don't have autoscrolling we kill the interval
              if (! self.doScroll && self.intervalId != null) {
                clearInterval(self.intervalId);
                self.intervalId = null;
              }

              // custom scroll handling
              self._handleSelectableScrolling({id: self.container, pageY: event.pageY, pageX: event.pageX});

              // turn off standard processing...since we do everything on our own...
              // i.e. no more lasso
              event.stopImmediatePropagation();
              return false;
            });
          }
          , stop: function() {

            // don't forget to kill the auto scroll interval
            self.doScroll = false;
            if (self.intervalId != null) {
              clearInterval(self.intervalId);
              self.intervalId = null;
            }

            // and our mousemove listener
            jQuery(document).off('mousemove');
          }
        });

        // prevent IE 8 specific text selection issues
        this.container.on('dragstart, selectstart', function(event) {
          event.preventDefault();
        });

        // tiny hover effect on items
        this.container.on({
          mouseenter: function(event) { jQuery(this).addClass("bcdConnectableHover"); },
          mouseleave: function(event) { jQuery(this).removeClass("bcdConnectableHover"); }
        }, ".ui-selectee");

        // create sortables with custom scrolling
        this.container.sortable({
            connectWith: "[bcdScope='" + this.options.scope + "']"
          , scroll: false
          , start: function(){
            jQuery(document).on("mousemove", function(event) {
              if (bcdui.widgetNg.connectable._bcdConnectableScope[self.options.scope].activeBox)
                self._scrollControl({id: jQuery(bcdui.widgetNg.connectable._bcdConnectableScope[self.options.scope].activeBox), pageY: event.pageY, pageX: event.pageX});
            });
          }
          , stop: function() {jQuery(document).off('mousemove');}
          , helper: this.generateItemHelperHtml.bind(this)
        });

        // remember which selectable box you're currently in
        // since we want to scroll the underlying sortable and not necessarily only the source
        // which is actually an issue in jQuery...it scrolls the box where the item comes from only
        // bcdDropTarget for possibly existing css effects
        this.container.on("sortover", function(event, ui) {
          jQuery(this).addClass("bcdDropTarget");
          bcdui.widgetNg.connectable._bcdConnectableScope[self.options.scope].activeBox = event.target;
        });
        this.container.on("sortout", function(event, ui) {
          jQuery(this).removeClass("bcdDropTarget");
        });

        // handle multi-select, add items in container data and remove them from source
        this.container.on("sortstart", function(event, ui) {

          ui.item.data("sameBox", true);
          this.valuesBefore = jQuery(this).children(".ui-selectee").map(function() {return jQuery(this).attr("bcdValue")}).get().join();

          // take all .ui-selected items, not the sortable placeholder but the item itself
          //  (since for a standard drag it doesn't need to be .ui-selected yet...)
          var selectedItems = self.container.children('.ui-selected').not(".ui-sortable-placeholder").add(ui.item);
          var items = jQuery(selectedItems).clone();

          // store pos of selected ones in items
          for (var i = 0; i < selectedItems.length; i++)
            jQuery(items[i]).data("pos", jQuery(selectedItems[i]).index());
          
          // rememeber all origial positions
          jQuery("#" + self.config.elementId).children('.ui-selectee').not(".ui-sortable-placeholder").each(function(i,e){jQuery(e).data("pos", jQuery(e).index())})
          
          // remove some obsolete jquery styling
          jQuery(items).removeAttr("style").removeClass("bcdConnectableHover");

          // store the container as data and remove them (by hiding them)
          if (items != null && items.length > 0){
            ui.item.data('itemContainer', items).siblings('.ui-selected').not(".ui-sortable-placeholder").addClass("bcdHidden");
            // store our origin container in case we get detached from DOM
            ui.item.data("bcdSortStartOriginContainer", self.container);
          }
        });

        // handle multi-select, add items from container data in destination
        this.container.on("sortstop", function(event, ui) {

          // finally kill original items
          ui.item.data("bcdSortStartOriginContainer").find(".bcdHidden").remove();

          var box = jQuery(ui.item).closest("[bcdScope='" + self.options.scope + "']"); // is empty if ui.item is detached

          var isTargetToTarget = jQuery(box).hasClass("bcdTarget") && jQuery(event.target).hasClass("bcdTarget");
          var selectList = isTargetToTarget ? ".bcdLocked" : ".bcdLocked, .bcdTargetLocked"

          var items = (ui.item.data("sameBox")) ? ui.item.data('itemContainer') : ui.item.data('itemContainer').not(selectList);
          var itemsLocked = ui.item.data('itemContainer').filter(selectList);

          // item got detached from DOM, this happens during a 'cancel' on jQuery sortable plugin
          // when all items got selected, here we reinsert them back to origin and stop
          if(!box.length){
            if (items != null){
              ui.item.data("bcdSortStartOriginContainer").append(items);
            }
            return;
          }

          // on a move, clear selected items in the target first, so only the new added ones remain active
          box.children('.ui-selected').removeClass("ui-selected bcdConnectableHover");

          // insert items after current dragpos
          if (items != null && items.length > 0)
            ui.item.after(items);

          // in case of a not sameBox move, move back locked items to their original position
          if (! ui.item.data("sameBox")) {
            var sourceItems = jQuery(event.target).children('.ui-selectee').not(".ui-sortable-placeholder");
            itemsLocked.each(function(i, e){
              var pos = jQuery(e).data("pos");
              var added = false;
              for (var s = 0; s < sourceItems.length; s++) {
                if (jQuery(sourceItems[s]).data("pos") > pos) {
                  jQuery(e).insertBefore(sourceItems[s]);
                  added = true;
                  break;
                }
              }
              if (! added)
                jQuery(event.target).append(jQuery(e));
            });
          }

          // remove current item, since it's either locked or part of the item list
          ui.item.remove();

          // check if we need to unselect our selection after the move
          if (box.parent()._bcduiWidget().options.unselectAfterMove)
            box.children('.ui-selected').removeClass("ui-selected");

          // resort source side since source side should use original ordering
          if (box.hasClass("bcdSource"))
            self._sort(box);

          var to_instance = box._bcduiWidget();
          if(to_instance.options.onItemMoved){
            to_instance.options.onItemMoved.call(self, {
              from:self.container,
              to:box,
              dir: self._getMoveType(this, box)
            })
          }

          // and update XML (only if something really changed, e.g. in case of a source to source move, nothing changes)
          if (this.valuesBefore != jQuery(this).children(".ui-selectee").map(function() {return jQuery(this).attr("bcdValue")}).get().join())
            self._writeDataToXML(this, box);
        });

        // cancel sort depending on result of onBeforeChange function call
        // this is only called when you change the box, not when you reorder items within a box...
        this.container.on("sortreceive", function(event, ui) {
          ui.item.data("sameBox", false);
          var from = event.target;
          var to = from;
          if (typeof ui.sender != "undefined")
            from = ui.sender;
          var scope = {
            items : ui.item.data('itemContainer')
          };
          if (! self.onBeforeChange({element:self.container.get(0), dir: self._getMoveType(from, to), itemCount: scope.items.length, scope : scope})) {
            ui.sender.sortable("cancel");
          } else {
            // re-assign scope.items in case is has been modified
            ui.item.data("itemContainer", scope.items);
          }
        });

        // add a double click handler to directly move item from source to main target or vice versa
        this.container.on("dblclick", ".ui-selectee", function (event) {
          var target = jQuery("[bcdScope='" + self.options.scope + "'].bcdDblClkTarget");
          target = target.length > 0 ? target : self._getScopedTargetContainers();
          var from = self.container; // we filter on li in this function, so use the outer box as 'from'
          var to = (jQuery(from).hasClass("bcdSource")) ? target.first() : self._getScopedSourceContainer();
          self._moveSelectedItems(from, to);
        });
      }
    },

    /**
     * @private
     */
    _moveSelectedItems : function(from, to) {
      from = jQuery(from);
      to = jQuery(to);
      if (from.length > 0 && to.length > 0) {
        var isTargetToTarget = jQuery(to).hasClass("bcdTarget") && jQuery(from).hasClass("bcdTarget");
        // enclose items into scope to be modifyable in .onBeforeChange handler
        var scope = {
          items : from.children('.ui-selected').not(".ui-sortable-placeholder").not(".bcdLocked" + (!isTargetToTarget ? ", .bcdTargetLocked" : ""))
        };
        if (scope.items.length) {
          if (this.onBeforeChange({element:this.container.get(0), dir: this._getMoveType(from, to), itemCount: scope.items.length, scope:scope})) {

            var to_instance = to.parent()._bcduiWidget();
            // on a move, clear selected items in the target first, so only the new added ones remain active
            to.children('.ui-selected').removeClass("ui-selected bcdConnectableHover");

            // the actual move...
            scope.items.appendTo(to);

            // check if we need to unselect our selection after the move
            if (to_instance.options.unselectAfterMove)
              to.children('.ui-selected').removeClass("ui-selected bcdConnectableHover");

            // resort source side since source side should use original ordering
            if (to.hasClass("bcdSource"))
              this._sort(to);

            if(to_instance.options.onItemMoved){
              to_instance.options.onItemMoved.call(this, {
                from:from,
                to:to,
                dir: this._getMoveType(from, to)
              })
            }

            // and update XML according to what we have in the boxes
            this._writeDataToXML(from, to);
          }
        }
      }
    },

    /**
     * change sorting / move items up or down
     * 
     * @private
     * @param {integer} moveDir=1     Direction to move, -1=up, +1=down
     */
    _moveSelectedItemsUpDown : function(dir){
      dir = dir||-1;
      var container = this.element.find(".bcdConnectable");
      var selectedItems = container.children('.ui-selected');
      var allItems = container.children('.ui-selectee');

      // skip in case...
      if(
          // either none or all are selected...
          selectedItems.length == 0 || allItems.length == selectedItems.length
          // or edging selection
          || ( dir < 0 && selectedItems[0]        === allItems[0]         )
          || ( dir > 0 && selectedItems.last()[0] === allItems.last()[0]  )
        ){
        return;
      }

      /*
       * approach:
       * we have to support heterogene selection, i.e. selection with many non connected blocks.
       * to yield minimal DOM write operations we dont move the selection, instead we move
       * the left/right (upper/lower) neighbour, resulting in 1 DOM op in best case
       * and selection-n in worst case.
       */
      var src = [];
      var dst = [];

      selectedItems.each(function(i,e){
        e = jQuery(e);
        var ref = dir < 0 ? e.prev() : e.next(); // left/right neighbour for reference detection
        var end = dir > 0 ? e.prev() : e.next(); // right/left neighbour for selection detection
        // determine reference neihghbour to move
        if(!ref.hasClass("ui-selected")){
          src.push(ref);
        }
        // determine beginning/end of selection
        if(!end.hasClass("ui-selected")){
          dst.push(e);
        }
      });

      // relocate
      for(var i=0;i<src.length;i++){
        if(dir < 0){
          src[i].insertAfter(dst[i]);
        } else {
          src[i].insertBefore(dst[i]);
        }
      }

      // scroll to first/last visible reference element
      container.bcdScrollTo(
          dir < 0 ? container.children(".ui-selected").first() : container.children(".ui-selected").last(), { snapTo : 'nearest' }
      );

      this._doWriteXML(container, this.config.target);
    }
  });

  bcdui.util.namespace("bcdui.widgetNg.connectable");
  bcdui.widgetNg.connectable.TreeSupport = class
  /**
   * @lends bcdui.widgetNg.connectable.TreeSupport
   * */ 
  {
    /**
     * @classdesc
     * Tree support class providing item rendering, controls binding and onItemMoved handler
     *
     * @constructs
     * @param {jQuery}  container                       The container
     * @param {object}  config                            Options
     * @param {boolean} [config.isDefaultCollapsed=true]  Initial state
     * @param {string}  config.levelNodeName              Local nodename of the level, i.e. "Level"
     * @param {string}  config.itemNodeName               Local nodename of the item, i.e. "Item"
     * @param {string}  config.valueAttrName              Attribute name of value attribute, i.e. "id"
     * @param {string}  config.captionAttrName            Attribute name of caption attribute, i.e. "caption"
     * @param {number}  [config.leftPaddingLevel=14]      Left padding in pixels per level depth
     */
    constructor(container, config){
      config = config || {};
      if(!config.levelNodeName){
        throw ".levelNodeName property undefined";
      }
      if(!config.itemNodeName){
        throw ".itemNodeName property undefined";
      }
      if(!config.valueAttrName){
        throw ".valueAttrName property undefined";
      }
      if(!config.captionAttrName){
        throw ".captionAttrName property undefined";
      }
      this.config = jQuery.extend(config, {
        isDefaultCollapsed : config.isDefaultCollapsed == undefined ? true : config.isDefaultCollapsed
      });
      this.config.leftPaddingLevel = this.config.leftPaddingLevel || 14;

      this.levelStateMap = {}; 
      // doT template as expected by connectable
      this.templates = {
        item : doT.compile("<li class='ui-selectee {{=it.className}}' style='padding-left: {{=it.depth * " + this.config.leftPaddingLevel + "}}px' bcdValue='{{=it.value}}' bcdPos='{{=it.position}}' bcdLoCase='{{=it.caption.toLowerCase()}}'>{{=it.handle}}<span class='bcdItem'>{{=it.caption}}</span></li>")
      };

      var self = this;
      container.on("click", ".ui-node-handle", function(){
        var li = jQuery(this).parent(); // li
        var isCollapsed = li.hasClass("ui-node-collapsed");
        var levelId = li.attr("bcdValue");

        if(self.config.isDefaultCollapsed){
          self.levelStateMap[levelId] = isCollapsed ? false : true;
        } else {
          self.levelStateMap[levelId] = isCollapsed ? true : false;
        }

        // re render widget
        li._bcduiWidget()._renderItems(false);
      });

      // prebuilt xpath and funcs for _optionsSortingFunction()
      this.ancestorSelfXPath = "ancestor-or-self::*[ self::" + this.config.levelNodeName + " or self::" + this.config.itemNodeName + " ]";
      this._funcMapNodeToCaptionAttrName = function(attrName, n){
        return n.getAttribute(attrName);
      }.bind(null, this.config.captionAttrName);

      this.cache={selector:{}};
    }

    _buildAncestorPath(widgetInstance, value){
      var elementInData = this._getOptionSelector(widgetInstance).valueNode(value);
      elementInData = elementInData.nodeType === 2 ? (elementInData.ownerElement || elementInData.selectSingleNode("parent::*")) : elementInData;
      // build ancestorPath by caption
      var ancestors = jQuery.makeArray(elementInData.selectNodes(this.ancestorSelfXPath)).map(this._funcMapNodeToCaptionAttrName);
      if(bcdui.browserCompatibility.isWebKit){
        ancestors.reverse(); // in web-kit ancestor-or-self::* returns bottom-up order
      }
      return ancestors.join(".");
    }

    /**
     * our default options sorting function uses alphabetical sorting on captions but
     * preserves leafs in trees.
     *
     * @private
     */
    _optionsSortingFunction(a, b, args){
      var x = this._buildAncestorPath(args.instance, a.value), y = this._buildAncestorPath(args.instance, b.value);
      return x < y ? -1 : x > y ? 1 : 0;
    }

    /**
     * @return {boolean}  true, if given level is collapsed
     * @private
     */
    isLevelCollapsed(levelId){
      // try prefix lookup (assume the id on leaf prefixed by parent id)
      var levelState = (function(levelStateMap, isDefaultCollapsed){
        for(var key in levelStateMap){
          var state = levelStateMap[key];
          if( levelId.startsWith(key + ".") && state == isDefaultCollapsed){ // TODO hardcoded level separator
            return state;
          }
        }
      })(this.levelStateMap, this.config.isDefaultCollapsed);

      if(levelState === undefined){
        levelState = this.levelStateMap[levelId];
      }

      if(levelState === undefined){
        return this.config.isDefaultCollapsed;
      }

      if (this.config.isDefaultCollapsed){
        return levelState == true;
      } else {
        return levelState == false;
      }
    }

    /**
     * Context: widget's instace
     * @param {object}  args  parameters from connectable
     * @param {jQuery}  from  The source container .bcdSource/.bcdTarget, depends on direction
     * @param {jQuery}  to    The target container .bcdTarget/.bcdSource, depends on direction
     * @param {string}  dir   Direction: src2dst, dst2src
     * @private
     */
    onItemMoved(args) {
      var self = this;
      var sourceBox = args.dir == "src2dst" ? args.from : args.to;
      var targetBox = args.dir == "dst2src" ? args.from : args.to;
      var levelNodeName = this.config.levelNodeName, itemNodeName = this.config.itemNodeName, valueAttrName = this.config.valueAttrName;

      // rebuild source box

      // rebuild target box if it has got new items
      if(args.dir == "src2dst"){
        var optionsSelector = args.from._bcduiWidget()._getOptionSelector();
        var modelData = optionsSelector.getData();
        // find the parent of last level ancestor from our options we use to lookup levels from
        var levelLookupElement = modelData.selectSingleNode(optionsSelector.xPath).selectSingleNode("ancestor::" + levelNodeName + "[last()]/..");

        /*
        * we solely rely on html dom information as the target box
        * is either modified via UI (retaining level information from our renderer)
        * or is rendered from target, which is flat and does not contain level information
        */
        var getLeaveValues = function(levelId){
          // select all items belonging to given level
          return jQuery.makeArray( levelLookupElement.selectNodes(".//" + levelNodeName + "[@"+ valueAttrName +"='"+levelId+"']//" + itemNodeName) ); //Level[@id]//Item
        };

        // used to render target box
        var itemTpl = doT.compile('<ul class="ui-selectee" bcdvalue="{{=it.value}}" bcdlocase="{{=it.caption.toLowerCase()}}"><span class="bcdItem">{{=it.caption}}</span></ul>');

        /*
        * here we (1) expand all level nodes to its children and
        * (2) remove the level nodes from dom and remove (3) css styling
        */

        // leaves in the box
        var itemsInTheBox = targetBox.children(":not(.ui-node)");
        
        // (3) on remove decoration from non-node items
        itemsInTheBox.removeClass("ui-leaf").removeAttr("style"); // @style yields padding

        // process level nodes
        targetBox.children(".ui-node")
        // (1) for each level expand children (merge)
        .each(function(){
          getLeaveValues(this.getAttribute("bcdValue")).forEach(function(node){
            var value = node.getAttribute(self.config.valueAttrName); // value provided by attribute
            // skip possible duplicate
            if(itemsInTheBox.has("[bcdvalue='"+value+"']").length)return;
            // insert
            jQuery(itemTpl({
              value : value,
              caption : node.getAttribute(self.config.captionAttrName) // caption provided by attribute
            })).insertBefore(this);
          }.bind(this));
        })
        // (2) remove level node from html dom
        .remove();
      }
      // in either case we have to re-render sourceBox in order to rebuild tree
      sourceBox._bcduiWidget()._renderItems(true);
    }

    /**
     * returns cached option selector of given widgetInstance
     * @private
     */
    _getOptionSelector(widgetInstance){
      return this.cache.selector[widgetInstance.id] = this.cache.selector[widgetInstance.id] || widgetInstance._getOptionSelector({ enableCaching: true });
    }

    /**
     * item html renderer for tree structure
     * @param {object}  args                  Gets them from connectable, which area
     * @param {string}  args.value            The value of the item
     * @param {string}  args.caption          The caption of the item
     * @param {integer} args.position         The position of the item in the options document
     * @param {object}  args._widgetInstance  The instance of the connectable
     * @private
     */
    generateItemHtml(args){
      var elementInData = this._getOptionSelector(args._widgetInstance).valueNode(args.value);
      // normalize to Element (i.e. value node is mapped to attribute)
      elementInData = elementInData.nodeType === 2 ? elementInData.ownerElement || elementInData.selectSingleNode("parent::*") : elementInData;

      args.handle = "";     // handle to expand/collapse node
      args.className = "";  // extra class name
      args.depth = 0;       // default level depth

      var levelNodeName = this.config.levelNodeName, itemNodeName = this.config.itemNodeName, valueAttrName = this.config.valueAttrName;

      var isChild = !!elementInData.selectSingleNode("parent::" + this.config.levelNodeName);
      var hasChildren = !!elementInData.selectSingleNode(itemNodeName);

      // returns true if all children of a level have been selected 
      var checkIfAllChildrenSelected = function(levelId){
        var selectedValuesMap = args._widgetInstance._collectSelectedValuesMap();
        // TODO performance opt: map
        var leftOver = jQuery.makeArray( elementInData.selectNodes(".//" + itemNodeName) ).filter(function(n){ return !(n.getAttribute(valueAttrName) in selectedValuesMap); });
        return leftOver.length == 0;
      };

      // source rendering

      if(hasChildren){ // node rendering
        args.handle = "<span class='ui-node-handle'></span>";

        if(checkIfAllChildrenSelected(args.value)){
          return ""; // dont need to render this level 
        }

        if(this.isLevelCollapsed(args.value)){
          args.className = "ui-node ui-node-collapsed";
        } else {
          args.className = "ui-node ui-node-expanded";
        }

      } else { 
        args.className = "ui-leaf";
      }

      if(isChild){ // leaves rendering
        
        // check if parent collapsed, then dont render child
        if( this.isLevelCollapsed( elementInData.parentNode.getAttribute(valueAttrName) ) ){
          return "";
        }

        args.depth = elementInData.selectNodes("ancestor::" + levelNodeName).length; // level depth
      }

      return this.templates.item(args);
    }
  };
}());

/*
 * TODO convenience init adapter since generateWidgetApi.xslt currrently generates
 * bootstrap code like bcdui.widgetNg.button.init(targetHtmlElement), we have to change
 * it to jQuery Widget init style
 */

/**
 * A namespace for the BCD-UI connectable widget. For creation @see {@link bcdui.widgetNg.createConnectable}
 * @namespace bcdui.widgetNg.connectable
 */
bcdui.util.namespace("bcdui.widgetNg.connectable",
/** @lends bcdui.widgetNg.connectable */
{
  /**
   * @private
   */
  _isSameBoxMovement: function(scope) {
    return (bcdui.widgetNg.connectable._bcdConnectableScope && bcdui.widgetNg.connectable._bcdConnectableScope[scope]) && bcdui.widgetNg.connectable._bcdConnectableScope[scope].source == bcdui.widgetNg.connectable._bcdConnectableScope[scope].target;
  },

  /**
   * onBeforeChange dir attribute value, can be used to identify the direction of the item move
   * @static
   */
  CHANGE_DIRECTION : { SRC_TO_TARGET : "src2dst", TARGET_TO_SRC : "dst2src", TARGET_TO_TARGET : "dst2dst" },

  /**
   * @private
   */
  init: function(htmlElement){
    bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui connectable widget adapter init");
    jQuery(htmlElement).bcdConnectable();
  }

});
