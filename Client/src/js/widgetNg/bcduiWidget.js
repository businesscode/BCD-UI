(function($){
  /**
   * Listens to updates on the target model and syncs the value back to the widget
   * @private
   */
  var XMLListener = bcdui._migPjs._classCreate(bcdui.widget.XMLDataUpdateListener,
    /**
     * @lends XMLListener.prototype
     */
    {
      /**
       * @member bcdui.widget.inputField.XMLListener
       */
      updateValue: function(){
        var widgetInstance = $("#" + this.htmlElementId)._bcduiWidget();
        // check if the instance is still alive
        widgetInstance && this.onUpdateCallback && this.onUpdateCallback();
      }
  });

  /**
   * the abstract, base widget for all widgets, providing basic functionality.
   * Any Widget shall use this widget as a base (according to jQuery UI Widget Factory API)
   * and explicitely call this._super() in its _create(). Please read more on _create() method
   * of this widget.
   *
   * Usually, when creating typical widget implementing a declared widget API, you override the 
   * _getCreateOptions() and _validateOptions() methods.
   *
   * This widget also provides default interface to listen for model updates via ( bcdui.widget.XMLDataUpdateListener ),
   * read more on that on _setOnTargetModelChange() method.
   *
   * Always propagate call to the super() implementation on an overwritten method.
   *
   * @private
   */
  $.widget("bcdui.bcduiWidget",{

    /**
     * Override this method and call the generated read params function,
     * i.e. return bcdui.widgetNg.impl.readParams.button(this.element[0]);
     *
     * @private
     */
    _getCreateOptions : function(){
      return null;
    },

    /**
     * Override this method and call the generated validate params function,
     * i.e. bcdui.widgetNg.impl.validateParams.button(this.options);
     *
     * @private
     */
    _validateOptions : function(){
      
    },

    /**
     * stores the widget name to allow retrieval via jQuery._bcdWidget(),
     * assures that this.options.id property is always set and assigned to id
     * of the element, such as: this.id === this.options.id === this.element.id === this.element.attr("id") === this.element.get(0).id === this.element.get(0).getAttribute("id")
     * @private
     */
    _create : function(){
      this._super();
      this._validateOptions();

      if(this.element.prop($.bcdui.bcduiWidget.KEY_WIDGET_NAME)){
        var err = "Widget construction error: element is already occupied by another widget!";
        window.console && window.console.error(err, this);
        throw err;
      }
      this.element.prop($.bcdui.bcduiWidget.KEY_WIDGET_NAME, this.widgetFullName);
      // write data- attr to make widgets selectable via DOM
      this.element.attr("data-" + $.bcdui.bcduiWidget.KEY_WIDGET_NAME, this.widgetFullName);

      // assure id with following priority: element.id, options.id, generatedId
      this.options.id = this.element.attr("id") || this.options.id || bcdui.factory.objectRegistry.generateTemporaryIdInScope( this.widgetFullName.replace(/-/g,"_") );
      this.element.attr("id", this.id = this.element.id = this.options.id);

      // the cache object, which can be emptied anytime
      this.cache = {};
    },

    /**
     * If your widget supports targetModelXPath, you cann register a target modification callback which is 
     * executed everytime the data in options.targetModelXPath changes. In order to prevent a cycle
     * (i.e. your widget is update targetModelXPath and then you usually do not want to get your
     * modification callback executed), please call _targetUpdated() everytime you updating data
     * in targetModelXPath BEFORE .fire()ing the data-provider.
     *
     * @param {function} callback The callback to executon upon model change
     * @private
     * @throws Throws an error if targetModelXPath option is not set 
     */
    _setOnTargetModelChange : function( callback ){
      if(! this.options.targetModelXPath){
        throw ".targetModelXPath is not set";
      }
      // ## detach listener in case we have one
      if (this._modelListener) {
        this._modelListener.unregister();
        delete this._modelListener;
      }
      if(this.options.targetModelXPath){
        var target = bcdui.factory._extractXPathAndModelId(this.options.targetModelXPath);
        // tidy up on _destroy()
        this._modelListener = new XMLListener({
          idRef: target.modelId,
          trackingXPath: target.xPath,
          htmlElementId: this.options.id
        });
        this._modelListener.onUpdateCallback = function(){
          var ts = this._getTargetSelector();
          var currentSnapshot = ts.getDataProvider()._hashValueForListener(ts.xPath);
          if ( !this._targetSnapshotHash || this._targetSnapshotHash !== currentSnapshot ){
            callback();
          }
        }.bind(this);
        // register data update listener, once target model available
        bcdui.factory.addDataListener(this._modelListener);
      }
    },

    /**
     * If you have registered a target modification callback via _setOnTargetModelChange(), then call
     * this method everytime you write internal state into targetModelXPath and before issueing .fire() on
     * the target data provider.
     * @private
     * @throws Throws an error if targetModelXPath option is not set 
     */
    _targetUpdated : function(){
      if( !this.options.targetModelXPath ){
        throw ".targetModelXPath is not set";
      }
      var ts = this._getTargetSelector();
      this._targetSnapshotHash = ts.getDataProvider()._hashValueForListener(ts.xPath);
    },

    /**
     * frees resources this widget has allocated
     * @private
     */
    _destroy: function() {
      this._super();

      // ## detach listener in case we have one
      if (this._modelListener) {
        this._modelListener.unregister();
        delete this._modelListener;
      }

      delete this.cache;
    },

    /**
     * handles "disabled" option and applies "disabled" property as well as adds "bcdDisabled"
     * css class on all HTML FORM input/control elements inside widget's element
     *
     * @param {string} option           The option to set/get
     * @param {string} value            Of the option to set
     *
     * @private
     */
    _setOption : function(option, value){
      this._superApply(arguments);
      if("disabled" == option){
        value = (value+"")=="true";
        var elements = jQuery(this.element).find("input, textarea, select, button");
        if(value){
          elements.prop("disabled", value);
          elements.addClass("bcdDisabled");
        }else{
          elements.removeProp("disabled");
          elements.removeClass("bcdDisabled");
        }
      }
    },

    /**
     * Executes an option intended to be a JS function passing over arguments from this function. The context
     * of the executed function is always set to the Element from this.element.
     *
     * execJsOption("onClickAction",[arg1 [, arg2 ...])
     * 
     * @param {string}  optionId  The id of the option to execute
     * 
     * @return {object} return value of the function.
     * @private
     */
    execJsOption : function(optionId){
      return bcdui.util._execJs( this.options[optionId], this.element.get(0), false, arguments, 1 );
    },

    /**
     * Provide selector to options (if widget has optionXPath defined)
     * @private
     */
    _getOptionSelector : function(){
      this.cache._getOptionSelector = this.cache._getOptionSelector || this._getSelector(this.options.optionsModelXPath, this.options.optionsModelRelativeValueXPath);
      return this.cache._getOptionSelector;
    },

    /**
     * Provide selector to target
     * @private
     */
    _getTargetSelector : function(){
      this.cache._getTargetSelector = this.cache._getTargetSelector || this._getSelector(this.options.targetModelXPath);
      return this.cache._getTargetSelector;
    },

    /**
     * Creates a selector
     *
     * @param {string}  modelXPath            The modelXPath
     * @param {string}  [relativeValueXPath]  The relative xPath (relative to modelXPath)
     * @return {object}   with xPath, modelId, captionXPath, valueXPath, valueNodes():array/nodelist,
     *                    captionNodes():array/nodelist; values():array of values; captions():array of captions;
     *                    entries():returns array of value,caption; map():returns single object with value:caption map;
     *                    valueNode(id):returns node matching id;valueNode():returns the value node;
     *                    getData():returns underlying dataDoc;getDataProvider():returns dataprovider;
     *                    selectSingleNode(xPath):returns single node;
     * @private
     */
    _getSelector : function(modelXPath, relativeValueXPath){
      if(!modelXPath){ // this widget does not have optionsXPath
        return undefined;
      }
      var res = bcdui.factory._extractXPathAndModelId(modelXPath);
      res.captionXPath = res.valueXPath = res.xPath;

      if(relativeValueXPath){
        res.optionsModelRelativeValueXPath = relativeValueXPath;
        res.valueXPath = res.captionXPath + "/" + relativeValueXPath;
      }

      /* helpers */
      var selectNodes = function(xPath){
        return jQuery.makeArray(
            bcdui.factory.objectRegistry.getObject(res.modelId).getData().selectNodes(xPath)
        );
      };
      var mapNodeToString = function(node){
        return node.text;
      }

      /* provide api */
      res.getDataProvider = function(){
        return bcdui.factory.objectRegistry.getObject(res.modelId);
      }
      res.getData = function(){
        return res.getDataProvider().getData();
      }
      res.selectSingleNode = function(xPath){
        return selectNodes(xPath)[0];
      }
      res.valueNode = function(id){
        if(!id){
          return selectNodes(res.valueXPath)[0]; // just the first node 
        }
        return selectNodes(res.valueXPath + "[.='" + id + "']")[0]; // i.e. valueNode('identifier')
      };
      res.valueNodes = selectNodes.bind(null, res.valueXPath);
      res.captionNodes = selectNodes.bind(null, res.captionXPath);
      res.values = function(){
        return res.valueNodes().map(mapNodeToString);
      }
      res.captions = function(){
        return res.captionNodes().map(mapNodeToString);
      }
      res.entries = function(){
        var valueNodes = res.valueNodes();
        var captionNodes = res.captionNodes();
        return valueNodes.map(function(n,i){
          return {
            value : n.text,
            caption : captionNodes[i].text
          }
        });
      }
      res.map = function(){
        return res.entries().reduce(function(map, e){
          map[e.value] = e.caption;
          return map;
        }, {});
      }
      return res;
    },

    /**
     * maps native HTML events defined by hasHtmlEvents API,
     * every concrete widget has to call this method providing
     * element to bind the events to. The events are bound to functions
     * provided by options.
     *
     * @param {element} [targetElement=this.element]  The target to bind events to.
     *
     * @private
     */
    _mapNativeHtmlEvents : function(targetElement){
      var opts = this.options;
      targetElement = !!targetElement ? jQuery(targetElement) : this.element;
      ["onchange","onclick"].filter(function(v){return opts[v]}).forEach(function(v){
        // our paramaters are always native js functions
        targetElement.on(v.substring(2), opts[v]);
      });
    }
  });

  /**
   * the key on element's property to store the widget name
   */
  $.bcdui.bcduiWidget.KEY_WIDGET_NAME = "bcdui-widget-name";
  /**
   * shortcut for lookups
   */
  $.bcdui.bcduiWidget.SELECTOR = "[data-" + $.bcdui.bcduiWidget.KEY_WIDGET_NAME + "]";

  // this API is meant to be hidden and should not be used from outside
  delete $.fn.bcduiWidget;

  /**
   * jQuery Plugin to retrieve generally the widget instance from an element: jQuery(widget).bcduiWidget(),
   * this API is private and is intented to be used internally only. Public jQuery UI Factory API is available
   * thru widget function, i.e. jQuery(widget).someConcreteWidget("disable")
   *
   * @private
   * @return { object } widget's instance or undefined
   */
  $.fn._bcduiWidget = function(){
    var widgetName = this.prop($.bcdui.bcduiWidget.KEY_WIDGET_NAME) || undefined;
    if( !widgetName ){
      // quick check to exit recursion
      return arguments[0] === true ? undefined : this.closest($.bcdui.bcduiWidget.SELECTOR)._bcduiWidget(true);
    }
    return this.data( widgetName ); // returns the instance as per jQuery UI Widget Factory API
  }
})( jQuery );