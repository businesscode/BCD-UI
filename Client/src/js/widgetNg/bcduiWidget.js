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
     */
    _create : function(){
      this._super();
      this._validateOptions();

      if(this.element.prop($.bcdui.bcduiWidget.KEY_WIDGET_NAME)){
        var err = "Widget construction error: element is already occupied by another widget!";
        window.console && window.error(err, this);
        throw err;
      }
      this.element.prop($.bcdui.bcduiWidget.KEY_WIDGET_NAME, this.widgetFullName);
      // write data- attr to make widgets selectable via DOM
      this.element.attr("data-" + $.bcdui.bcduiWidget.KEY_WIDGET_NAME, this.widgetFullName);

      // assure id with following priority: element.id, options.id, generatedId
      this.options.id = this.element.attr("id") || this.options.id || bcdui.factory.objectRegistry.generateTemporaryIdInScope( this.widgetFullName );
      this.element.attr("id", this.id = this.element.id = this.options.id);
    },

    /**
     * registers XMLListener if options.targetModelXPath, executing callback everytime
     * the data changes. Currently it is up to implementation to detect if the change
     * was originated from widget itself.
     *
     * @param {function} callback The callback to executon upon model change
     */
    _setOnTargetModelChange : function( callback ){
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
        this._modelListener.onUpdateCallback = callback;
        // register data update listener, once target model available
        bcdui.factory.addDataListener(this._modelListener);
      }
    },

    /**
     * frees resources this widget has allocated
     */
    _destroy: function() {
      this._super();

      // ## detach listener in case we have one
      if (this._modelListener) {
        this._modelListener.unregister();
        delete this._modelListener;
      }
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
     */
    execJsOption : function(optionId){
      return bcdui.util._execJs( this.options[optionId], this.element.get(0), false, arguments, 1 );
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