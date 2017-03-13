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
  /**
   * Listens to updates on the target model and syncs the value back to the widget
   *
   * @method
   * @private
   */
  var XMLListener = bcdui._migPjs._classCreate( bcdui.widget.XMLDataUpdateListener,
    /**
     * @lends XMLListener.prototype
     */
    {
      /**
       * @member bcdui.widget.inputField.XMLListener
       */
      updateValue: function(){
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
  });

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
      var rootContainer = this.element;

      // setup our variables
      var args = this.options;

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
      // TODO remove / rewrite / communicate via widget-extensions (inheritance) and events
      var extendedConfig=null;
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
      rootContainer.hide();

      // and initally render the (empty) container
      var html = this._generateContainerHtml();
      jQuery(rootContainer).append(html);


      // build optionsmodel wrapper if we got model dependencies
      // and replace config ids/xpaths if necessary
      if (this.config.source) {
        var cfg = {
          element: jQuery("#" + this.config.elementId).get(0),
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

        // finally set the valueXPath used in the update listener
        this.config.source.valueXPath = this.config.source.xPath + (this.config.source.optionsModelRelativeValueXPath ? "/" + this.config.source.optionsModelRelativeValueXPath : "");
      }

      // init the control
      var uiControl = this._createConnectableControl(args, rootContainer);

      // store args on element
      // TODO rewrite, use jQuery data style
      jQuery(uiControl.control).data("_args_", args);
      jQuery(uiControl.control).data("_config_", this.config);

      // initially render items
      this._renderItems(true, true);

      // rerender connected boxes to ensure integrity of items
      if (this.config.target) {
        var source = jQuery("[bcdScope='" + this.options.scope + "'].bcdSource").parent();
        if (source.length > 0)
          source._bcduiWidget()._renderItems(true);
      }
      if (this.config.source) {
        var targets = jQuery("[bcdScope='" + this.options.scope + "'].bcdTarget").parent();
        for (var t = 0; t < targets.length; t++)
          jQuery(targets[t])._bcduiWidget()._renderItems(true);
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
        jQuery("#" + this.config.elementId).attr("bcdHint", this.options.hint);
      }
      bcdui.widgetNg.commons.balloon.attach(this.config.elementId, {noTooltip: this.config.extendedConfig.noTooltip});

      // display constructed container
      rootContainer.show();

      // set autofocus after display
      if(args.autofocus)
        jQuery(uiControl.control).focus();
    },

    /**
     *  is triggered when we need to recreate our connectable, e.g. when options model changed or you injected something into target model
     *  @private
     */
    _readDataFromXML: function(listenerType, reEntry){

      // re-render current connectable
      this._renderItems(listenerType == "source");

      // we rerendered the target box due to a target event, now we also need to redraw the belonging source box
      if (this.config.target && ! reEntry) {
        var source = jQuery("[bcdScope='" + this.options.scope + "'].bcdSource").parent();
        if (source.length > 0)
          source._bcduiWidget()._readDataFromXML(listenerType, true);
      }

      // we rerendered the source box due to a source event, now we also need to redraw each belonging target box
      if (this.config.source && ! reEntry) {
        var target = jQuery("[bcdScope='" + this.options.scope + "'].bcdTarget").parent();
        for (var t = 0; t < target.length; t++)
          jQuery(target[t])._bcduiWidget()._readDataFromXML(listenerType, true);
      }
    },

    /**
     * @private
     */
    _doWriteXML: function(sourceBox, targetConfig) {

      // triggerd after a nonUIUpdate (inject/optionsmodel change) or when you used the ui to drag/move items
      // write values to target (wrs or non wrs mode)

      var values = jQuery(sourceBox).children(".ui-selectee").map(function() {return jQuery(this).attr("bcdValue")}).get(); // get values from source as array

      if (targetConfig.xPath.indexOf("wrs:") > -1) {
        var inlineValue = (values||[]).join(this.wrsInlineValueDelim);
        bcdui.core.createElementWithPrototype(bcdui.factory.objectRegistry.getObject(targetConfig.modelId).getData(), targetConfig.xPath).text = inlineValue;
      } else {
        var tMXP = (targetConfig.xPath.match(/.*\/@\w+$/) === null ) ? targetConfig.xPath : targetConfig.xPath.substring(0,targetConfig.xPath.lastIndexOf("@")-1);
        bcdui.core.removeXPath(bcdui.factory.objectRegistry.getObject(targetConfig.modelId).getData(), tMXP, true, true);
        var updateTemplate = doT.template(targetConfig.xPath + "[. = {{=it.value}}]");
        for (var i = 0; i < values.length; ++i) {
          var updateXPath = updateTemplate({value: bcdui.core.quoteXPathString(values[i]) });
          bcdui.core.createElementWithPrototype(bcdui.factory.objectRegistry.getObject(targetConfig.modelId).getData(), updateXPath);
        }
      }
      bcdui.factory.objectRegistry.getObject(targetConfig.modelId).fire();
    },

    /**
     * @private
     */
    _writeDataToXML: function(source, target){

      // remember source and target boxes, can be reused for all kind of purposes (e.g. same box move detection)
      bcdui.widgetNg.connectable._bcdConnectableScope[this.options.scope].source = jQuery(source).attr("id");
      bcdui.widgetNg.connectable._bcdConnectableScope[this.options.scope].target = jQuery(target).attr("id");

      // when the target is a target box, we need to write data to its targetxpath
      if (jQuery(target).hasClass("bcdTarget")) {
        var t = jQuery(target).parent()._bcduiWidget();
        var realTarget = bcdui.factory._extractXPathAndModelId( t.options.targetModelXPath );
        this._doWriteXML(target, realTarget);
        t.onChange();
      }

      // when the source is also a target box, we of course need to write data to its targetxpath, too
      // we skip an obsolete additional write if we moved an item within the same target box
      if (jQuery(source).attr("id") != jQuery(target).attr("id") && jQuery(source).hasClass("bcdTarget")) {
        var t = jQuery(source).parent()._bcduiWidget();
        var realTarget = bcdui.factory._extractXPathAndModelId( t.options.targetModelXPath );
        this._doWriteXML(source, realTarget);
        t.onChange();
      }
    },

    /**
     * @private
     */
    _destroy: function() {
      this._super();
      var htmlElementId = this.options.id;
      var el = bcdui._migPjs._$(htmlElementId);

      // ## move on with prototypeJS tidy up ##
      if(el.length > 0){
        el.off();
        el.data("_args_",   null);
        el.data("_config_", null);
      }

      // ## now detach listeners
      if (this.config.target) {
        this.syncValueListener.unregister();
        this.syncValueListener = null;
      }
      if (this.config.source) {
        this.updateValueListener.unregister();
        this.updateValueListener = null;
      }
    },

    /**
     * @private
     */
    _renderItems: function(doWriteXML, isInitalCall) {

      // we're a target box....
      if (this.config.target) {

        // we wait for readiness of current target and belonging source
        // and remember source options
        var models = new Array();
        models[models.length] = this.config.target.modelId;
        var sources = jQuery("[bcdScope='" + this.options.scope + "'].bcdSource").parent();
        var sourceConfig = {};
        if (sources.length > 0) {
          var sourceOptions = sources._bcduiWidget().options;
          sourceConfig = bcdui.factory._extractXPathAndModelId( sourceOptions.optionsModelXPath );
          models[models.length] = sourceConfig.modelId;
          sourceConfig.optionsModelRelativeValueXPath = sourceOptions.optionsModelRelativeValueXPath;
        }

        bcdui.factory.objectRegistry.withReadyObjects(models, function(){

          // build up a value, original position and caption map
          var nodes = bcdui.factory.objectRegistry.getObject(sourceConfig.modelId).getData().selectNodes(sourceConfig.xPath);
          var bcdPosMap = {};
          var captionMap = {};

         var self = this;
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
            sortedOptions = sortedOptions.sort(function(a, b){
              var x = a.caption.toLowerCase(), y = b.caption.toLowerCase();
              return x < y ? -1 : x > y ? 1 : 0;
            });
          }

          for (var i = 0; i < sortedOptions.length; i++) {
            var idValue = sortedOptions[i].value;
            bcdPosMap[idValue] = i;
            captionMap[idValue] = sortedOptions[i].caption;
          }

          // regenerate items
          jQuery("#" + this.config.elementId).empty();

          var html = "";
          // get array of target item in case of wrs mode
          var targetItems = bcdui.factory.objectRegistry.getObject(this.config.target.modelId).getData().selectSingleNode(this.config.target.xPath);
          targetItems = targetItems == null ? [] : targetItems.text.split(this.wrsInlineValueDelim);
          var nodes = (this.config.target.xPath.indexOf("wrs:") > -1) ? targetItems : bcdui.factory.objectRegistry.getObject(this.config.target.modelId).getData().selectNodes(this.config.target.xPath);
          for (var i = 0; i < nodes.length; i++) {
            var idValue = (this.config.target.xPath.indexOf("wrs:") > -1) ? nodes[i] : nodes[i].text;
            idValue = bcdui.util.escapeHtml(idValue);

            // only render items which are available in the options model and get original position and caption information
            if (typeof bcdPosMap[idValue] != "undefined")
              html += this.generateItemHtml({value: idValue, caption: captionMap[idValue], position: bcdPosMap[idValue], id: this.config.elementId});
          }
          jQuery("#" + this.config.elementId).append(html);

          // clean possibly existing garbage (not valid) entries on target element
          // this should be done on init or on options model change
          if (doWriteXML)
            this._doWriteXML(jQuery("#" + this.config.elementId), this.config.target);

          if (isInitalCall) {
            bcdui.widgetNg.connectable.getNavPath(this.element.id, function(id, value) {
              bcdui.widget._linkNavPath(id, value);
            }.bind(this));
          }
        }.bind(this));
      }


      // we're a source box....
      if (this.config.source) {

        // we wait for readiness of all belonging targets and source
        var models = new Array();
        models.push(this.config.source.modelId);

        var targets = jQuery("[bcdScope='" + this.options.scope + "'].bcdTarget").parent();
        for (var t = 0; t < targets.length; t++)
          models.push(bcdui.factory._extractXPathAndModelId( jQuery(targets[t])._bcduiWidget().options.targetModelXPath ).modelId);

        bcdui.factory.objectRegistry.withReadyObjects(models, function(){
          // we need to ensure to always use the *current* target information for filtering out source items here
          var targets = jQuery("[bcdScope='" + this.options.scope + "'].bcdTarget").parent();
          var targetConfig = new Array();
          for (var t = 0; t < targets.length; t++)
            targetConfig.push(bcdui.factory._extractXPathAndModelId( jQuery(targets[t])._bcduiWidget().options.targetModelXPath ));

          jQuery("#" + this.config.elementId).empty();

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

          // let's optionally sort our optionsmodel by caption
          var self = this;
          var sortedOptions = jQuery.makeArray(nodes).map(function(node) {
            var caption = node.nodeValue || node.text;
            var value = self.config.source.optionsModelRelativeValueXPath ? node.selectSingleNode(self.config.source.optionsModelRelativeValueXPath) : null;
            if (value != null)
              value = value.nodeValue || value.text;
            else
              value = caption;
            return { value: bcdui.util.escapeHtml(value), caption: bcdui.util.escapeHtml(caption) };
          });

          if (this.options.doSortOptions) {
            sortedOptions = sortedOptions.sort(function(a, b){
              var x = a.caption.toLowerCase(), y = b.caption.toLowerCase();
              return x < y ? -1 : x > y ? 1 : 0;
            });
          }

          var html = "";
          for (var i = 0; i < sortedOptions.length; i++) {

            // remember original positions and captions for value
            var idValue = sortedOptions[i].value;

            // render item only if it's part of the filtered values
            var doShow = (this.filteredItems[idValue] == idValue);

            for (var t = 0; t < targetConfig.length; t++) {
              var targetItems = bcdui.factory.objectRegistry.getObject(targetConfig[t].modelId).getData().selectSingleNode(targetConfig[t].xPath);
              targetItems = targetItems == null ? [] : targetItems.text.split(this.wrsInlineValueDelim);
              doShow &= (targetConfig[t].xPath.indexOf("wrs:") > -1)
              ? (targetItems.indexOf(idValue) == -1)
              : (bcdui.factory.objectRegistry.getObject(targetConfig[t].modelId).getData().selectSingleNode(targetConfig[t].xPath + "[.='" + idValue + "']") == null);
            }
            if (doShow)
              html += this.generateItemHtml({value: idValue, caption: sortedOptions[i].caption, position: i, id: this.config.elementId});
          }
          jQuery("#" + this.config.elementId).append(html);

          if (isInitalCall) {
            bcdui.widgetNg.connectable.getNavPath(this.element.id, function(id, value) {
              bcdui.widget._linkNavPath(id, value);
            }.bind(this));
          }

        }.bind(this));
      }
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
        var value = jQuery(theItems[i]).attr("bcdValue");
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
      if (r1.top > r1.bottom) { var b = r1.top; r1.top = r1.bottom; r1.bottom = b; }

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
     * @private
     */
    _createConnectableControl: function(args, rootContainer){

      var self = this;
      var instance = jQuery(rootContainer)._bcduiWidget();
      var nop = function(args){ return true; };

      // setup our function handlers
      this.onBeforeChange = instance.options.onBeforeChange || nop;
      this.onChange = instance.options.onChange || nop;
      this.generateItemHtml = instance.options.generateItemHtml || function(args){return "<li class='ui-selectee' bcdValue='" + args.value + "' bcdPos='" + args.position + "' bcdLoCase='" + args.caption.toLowerCase() + "' title='" + args.caption + "'><span class='bcdItem'>" + args.caption + "</span></li>";};

      // let's handle ctrl-a, del, return via keydown
      jQuery("#" + this.config.elementId).keydown(function(event) {
        // select ALL
        if ((event.ctrlKey || event.metaKey) && event.keyCode == "65") {
          jQuery(this).children(".ui-selectee").addClass("ui-selected");
          event.preventDefault();
          return false;
        }
        // in case of DEL key (and being a target), move all seletect items to source
        if (event.keyCode == "46" && self.config.target) {
          self._moveSelectedItems(jQuery(this), jQuery("[bcdScope='" + self.options.scope + "'].bcdSource").first());
          event.preventDefault();
          return false;
        }
        // in case of RETURN key move all selected items to first target or bcdDblClkTargetor or to source
        if (event.keyCode == "13") {
          var target = jQuery("[bcdScope='" + self.options.scope + "'].bcdDblClkTarget");
          target = target.length > 0 ? target : jQuery("[bcdScope='" + self.options.scope + "'].bcdTarget");
          var to = (jQuery(this).hasClass("bcdSource")) ? target.first() : jQuery("[bcdScope='" + self.options.scope + "'].bcdSource").first();
          self._moveSelectedItems(jQuery(this), to);
          event.preventDefault();
          return false;
        }
      });

      // for typing we better use keypress
      jQuery("#" + this.config.elementId).keypress(function(event) {

        var old = self.lastWord;
        self.lastWord += String.fromCharCode(event.charCode||event.which||event.keyCode).toLowerCase();

        var items = jQuery(this).find("[bcdLoCase^='" + self.lastWord + "']");

        // if we don't find a match reset to last word but increase index of matchlist
        if (items.length == 0 && old.length > 0) {
          self.lastWord = old;
          self.lastIndex++;
        }
        var items = jQuery(this).find("[bcdLoCase^='" + self.lastWord + "']");
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
      jQuery("#" + this.config.elementId).on("click", ".bcdItem", function (event) {

        // clean variable and timers of keystroke support
        jQuery("#" + self.config.elementId).focus();
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
          var oTarget = jQuery(event.target);

          if( ! oTarget.is('.ui-selectee'))
            oTarget = oTarget.parents('.ui-selectee');

          var iNew = jQuery(event.currentTarget).find('.ui-selectee').index(oTarget);
          var iCurrent = jQuery(event.currentTarget).find('.ui-selectee').index(jQuery(event.currentTarget).find('.ui-selected'));

          if (iCurrent < iNew) {
            iHold = iNew;
            iNew = iCurrent;
            iCurrent = iHold;
          }

          if(iNew != '-1') {
            jQuery(event.currentTarget).find('.ui-selected').removeClass('ui-selected');
            for (i=iNew;i<=iCurrent;i++)
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
      jQuery("#" + this.config.elementId).mousedown(function(event) {

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
            iHold = iNew;
            iNew = iCurrent;
            iCurrent = iHold;
          }

          if(iNew != '-1') {
            jQuery(event.currentTarget).find('.ui-selected').removeClass('ui-selected');
            for (i=iNew;i<=iCurrent;i++)
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
        for (var i = 0; i < items.length; i++) {
          var pos = jQuery(items[i]).offset();
          jQuery(items[i]).data({
            position: {
              left: pos.left - boxOffset.left + scrollLeft,
              top: pos.top - boxOffset.top + scrollTop,
              right: pos.left - boxOffset.left + scrollLeft + jQuery(items[i]).outerWidth(),
              bottom: pos.top - boxOffset.top + scrollTop + jQuery(items[i]).outerHeight()
            }
          })
        }
      });

      // create the jquery selectable
      if (! this.options.disabled) {
        jQuery("#" + this.config.elementId).selectable({
            filter: ".ui-selectee"
          , cancel: ".bcdItem, .bcdNotSelectable"
          , start: function () {

            // clean variable and timers of keystroke support
            jQuery(this).focus();
            if (self.keyTimeout) clearTimeout(self.keyTimeout);
            self.lastWord = "";
            self.lastIndex = 0;

            jQuery(document).mousemove(function(event) {

              // drawing lasso

              if (self.options.showLasso) {
                // get relative position of current mouse pos
                var boxOffset = jQuery("#" + self.config.elementId).offset();
                var scrollLeft = jQuery("#" + self.config.elementId).prop('scrollLeft');
                var scrollTop = jQuery("#" + self.config.elementId).prop('scrollTop');
  
                var q = {
                    top:    boxOffset.top  - scrollTop  + self.clickedRelativePos.top
                  , left:   boxOffset.left - scrollLeft + self.clickedRelativePos.left
                  , right:  event.pageX
                  , bottom: event.pageY
                };

                // normalize rectangle since we might move up / left
                if (q.left > q.right) { var b = q.left; q.left = q.right; q.right = b;  }
                if (q.top > q.bottom) { var b = q.top; q.top = q.bottom; q.bottom = b; }

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
                if (boxOffset.top + jQuery("#" + self.config.elementId).prop("clientHeight") < q.bottom) {
                  q.bottom = boxOffset.top + jQuery("#" + self.config.elementId).prop("clientHeight");
                  classes[classes.length] = "bcdNoBottom";
                }
                if (boxOffset.left + jQuery("#" + self.config.elementId).prop("clientWidth") < q.right) {
                  q.right = boxOffset.left + jQuery("#" + self.config.elementId).prop("clientWidth");
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
                  self._handleSelectableScrolling({id: jQuery("#" + self.config.elementId), pageY: event.pageY, pageX: event.pageX});
                }, 100);
              }
              // in case we don't have autoscrolling we kill the interval
              if (! self.doScroll && self.intervalId != null) {
                clearInterval(self.intervalId);
                self.intervalId = null;
              }

              // custom scroll handling
              self._handleSelectableScrolling({id: jQuery("#" + self.config.elementId), pageY: event.pageY, pageX: event.pageX});

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
            jQuery(document).unbind('mousemove');
          }
        });

        // prevent jQuery dblclick issue (
        var _mouseStart = jQuery("#" + this.config.elementId).data('selectable')['_mouseStart'];
        jQuery("#" + this.config.elementId).data('selectable')['_mouseStart'] = function(e) {
          _mouseStart.call(this, e);
          this.helper.css({"top": -1, "left": -1 });
        };

        // prevent IE 8 specific text selection issues
        jQuery("#" + this.config.elementId).on('dragstart, selectstart', function(event) {
          event.preventDefault();
        });

        // tiny hover effect on items
        jQuery("#" + this.config.elementId).on({
          mouseenter: function(event) { jQuery(this).addClass("bcdConnectableHover"); },
          mouseleave: function(event) { jQuery(this).removeClass("bcdConnectableHover"); }
        }, ".ui-selectee");

        // create sortables with custom scrolling
        jQuery("#" + this.config.elementId).sortable({
            connectWith: "[bcdScope='" + this.options.scope + "']"
          , scroll: false
          , start: function(){
            jQuery(document).mousemove(function(event) {
              if (bcdui.widgetNg.connectable._bcdConnectableScope[self.options.scope].activeBox)
                self._scrollControl({id: jQuery(bcdui.widgetNg.connectable._bcdConnectableScope[self.options.scope].activeBox), pageY: event.pageY, pageX: event.pageX});
            });
          }
          , stop: function() {jQuery(document).unbind('mousemove');}
          , helper: function(event, item) {

            // custom helper rendering...we show up to 5 selected items (+ "..." if there are more)
            var selectedItems = jQuery("#" + self.config.elementId).children('.ui-selected').not(".ui-sortable-placeholder").add(item);
            var caption = "<ul>";
            for (var i = 0; i < selectedItems.length && i < 5; i++)
              caption += "<li>" + (jQuery(selectedItems[i]).text() == "" ? jQuery(selectedItems[i]).attr("bcdValue") : jQuery(selectedItems[i]).text()) + "</li>";
            if (selectedItems.length > 5)
              caption += "<li>[...]</li>";
            caption += "</ul>";
            return jQuery(caption);
          }
        });

        // remember which selectable box you're currently in
        // since we want to scroll the underlying sortable and not necessarily only the source
        // which is actually an issue in jQuery...it scrolls the box where the item comes from only
        // bcdDropTarget for possibly existing css effects
        jQuery("#" + this.config.elementId).on("sortover", function(event, ui) {
          jQuery(this).addClass("bcdDropTarget");
          bcdui.widgetNg.connectable._bcdConnectableScope[self.options.scope].activeBox = event.target;
        });
        jQuery("#" + this.config.elementId).on("sortout", function(event, ui) {
          jQuery(this).removeClass("bcdDropTarget");
        });

        // handle multi-select, add items in container data and remove them from source
        jQuery("#" + this.config.elementId).on("sortstart", function(event, ui) {

          ui.item.data("sameBox", true);
          this.valuesBefore = jQuery(this).children(".ui-selectee").map(function() {return jQuery(this).attr("bcdValue")}).get().join();

          // take all .ui-selected items, not the sortable placeholder but the item itself
          //  (since for a standard drag it doesn't need to be .ui-selected yet...)
          var selectedItems = jQuery("#" + self.config.elementId).children('.ui-selected').not(".ui-sortable-placeholder").add(ui.item);
          var items = jQuery(selectedItems).clone();

          // store pos of selected ones in items
          for (var i = 0; i < selectedItems.length; i++)
            jQuery(items[i]).data("pos", jQuery(selectedItems[i]).index());
          
          // rememeber all origial positions
          jQuery("#" + self.config.elementId).children('.ui-selectee').not(".ui-sortable-placeholder").each(function(i,e){jQuery(e).data("pos", jQuery(e).index())})
          
          // remove some obsolete jquery styling
          jQuery(items).removeAttr("style").removeClass("bcdConnectableHover");

          // store the container as data and remove them
          if (items != null && items.length > 0){
            ui.item.data('itemContainer', items).siblings('.ui-selected').remove();
            // store our origin container in case we get detached from DOM
            ui.item.data("bcdSortStartOriginContainer", jQuery(this));
          }
        });

        // handle multi-select, add items from container data in destination
        jQuery("#" + this.config.elementId).on("sortstop", function(event, ui) {

          var items = (ui.item.data("sameBox")) ? ui.item.data('itemContainer') : ui.item.data('itemContainer').not(".bcdLocked");
          var itemsLocked = ui.item.data('itemContainer').filter(".bcdLocked");

          var box = jQuery(ui.item).closest("[bcdScope='" + self.options.scope + "']"); // is empty if ui.item is detached

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

          // and update XML (only if something really changed, e.g. in case of a source to source move, nothing changes)
          if (this.valuesBefore != jQuery(this).children(".ui-selectee").map(function() {return jQuery(this).attr("bcdValue")}).get().join())
            self._writeDataToXML(this, box);
        });

        // cancel sort depending on result of onBeforeChange function call
        // this is only called when you change the box, not when you reorder items within a box...
        jQuery("#" + this.config.elementId).on("sortreceive", function(event, ui) {
          ui.item.data("sameBox", false);
          var from = to = event.target;
          if (typeof ui.sender != "undefined")
            from = ui.sender;
          if (! self.onBeforeChange({element:jQuery("#" + self.config.elementId).get(0), dir: self._getMoveType(from, to), itemCount: ui.item.data('itemContainer').length})) {
            ui.sender.sortable("cancel");
          }
        });

        // add a double click handler to directly move item from source to main target or vice versa
        jQuery("#" + this.config.elementId).on("dblclick", ".ui-selectee", function (event) {
          var target = jQuery("[bcdScope='" + self.options.scope + "'].bcdDblClkTarget");
          target = target.length > 0 ? target : jQuery("[bcdScope='" + self.options.scope + "'].bcdTarget");
          var from = jQuery("#" + self.config.elementId); // we filter on li in this function, so use the outer box as 'from'
          var to = (jQuery(from).hasClass("bcdSource")) ? target.first() : jQuery("[bcdScope='" + self.options.scope + "'].bcdSource").first();
          self._moveSelectedItems(from, to);
        });
      }

      var el = jQuery("#" + this.config.elementId);

      return {
        widget: el.get(0),
        control: el.get(0)
      }
    },

    /**
     * @private
     */
    _moveSelectedItems : function(from, to) {
      if (from.length > 0 && to.length > 0) {
        var itemCount = jQuery(from).children('.ui-selected').not(".ui-sortable-placeholder").not(".bcdLocked").length;
        if (itemCount > 0) {
          if (this.onBeforeChange({element:jQuery("#" + this.config.elementId).get(0), dir: this._getMoveType(from, to), itemCount: itemCount})) {

            // on a move, clear selected items in the target first, so only the new added ones remain active
            jQuery(to).children('.ui-selected').removeClass("ui-selected bcdConnectableHover");

            // the actual move...
            jQuery(from).children('.ui-selected').not(".ui-sortable-placeholder").not(".bcdLocked").appendTo(to);

            // check if we need to unselect our selection after the move
            var widgetEl = jQuery(to).parent();
            if (widgetEl._bcduiWidget().options.unselectAfterMove)
              jQuery(to).children('.ui-selected').removeClass("ui-selected bcdConnectableHover");

            // resort source side since source side should use original ordering
            if (jQuery(to).hasClass("bcdSource"))
              this._sort(jQuery(to));

            // and update XML
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
  },

  /**
   * @param {string} id targetHtml of widget
   * @param {function} callback to be called with generated caption
   * @return {string} NavPath information via callback for widget
   */
  getNavPath: function(id, callback) {
    return callback(id, "");
  }

});
