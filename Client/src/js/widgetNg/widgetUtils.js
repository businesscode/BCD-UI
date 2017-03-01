(function(){
  /**
   * A namespace for the BCUDI GUI widget utils.
   * @namespace bcdui.widgetNg.utils
   * @private
   */
  bcdui.util.namespace("bcdui.widgetNg.utils",
  /** @lends bcdui.widgetNg.utils */
  {
    /**
     * TODO migrate to jQuery Widget Event / Callback API
     * custom events fired on the input element
     *
     * @static
     */
    EVENT: {
      /**
       * fired on the input element after a SYNC_WRITE, that is
       * the widget value has been synced to the data model, 'memo' properties passed:
       *
       * - isValueEmpty {boolean}: if value is considered empty
       * - value {String}: the value synced
       * - hasWritten {boolean}: if the value has been written or not, i.e. the value is not written if either invalid or value has not changed
       *
       * @static
       */
      SYNC_WRITE : "bcd:widget.input.sync_write",

      /**
       * fired on the input element after a SYNC_READ, that is
       * the widget value has been loaded from the data model, 'memo' properties passed:
       *
       * - isValueEmpty {boolean}: if value is considered empty
       *
       * @static
       */
      SYNC_READ : "bcd:widget.input.sync_read"
    },

    /**
     * writes newValue into bound model, DOES NOT VALIDATE! params:
     *
     * - inputElementId
     * - value
     * - isValid (optional)
     *
     * is -isValid is set to FALSE, the targetNode is tagged with bcdInvalid attribute if set to TRUE the attribute is removed,
     * in case it is unset - there is no effect on that attribute
     *
     * @return {boolean} true in case the target document was changed
     *
     * @private
     */
    _writeDataToXML: function(params){
      bcdui.log.isTraceEnabled() && bcdui.log.trace("_writeDataToXML");
      var el = bcdui._migPjs._$(params.inputElementId);
      var args = el.data("_args_");
      var config = el.data("_config_");

      bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.utils._writeDataToXML: writing data...");
      // tag that we're writing data ourself so that XMLUpdateListener
      // ignores and does not propagate this update.
      // the listener resets this flag on its own once it is run
      this._writingData=true;
      var result = bcdui.widget._copyDataFromHTMLElementToTargetModel(
          bcdui.factory.objectRegistry.getObject(config.target.modelId),
          config.target.xPath,
          params.value,
          args.keepEmptyValueExpression,
          false,
          function(modelId, xPath){
            bcdui.widgetNg.utils._invalidModelNodeReset(modelId, xPath)
          }.bind(this, config.target.modelId, config.target.xPath)
      );
      bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.input._writeDataToXML: ...data written");

      el.trigger(bcdui.widget.events.writeValueToModel);

      return result;
    },

    /**
     * cleans the bcdInvalid attribute on the model node
     *
     * @private
     */
    _invalidModelNodeReset: function(modelId, xPath){
      var node = bcdui.factory.objectRegistry.getObject(modelId).dataDoc.selectSingleNode(xPath);
      if(node != null){
        // is ATTRIBUTE
        if(node.nodeType == 2){
          node = bcdui.util.xml.getParentNode(node);
        }
        node.removeAttribute("bcdInvalid");
      }
    },

    /**
     * adds validator to a widget
     *
     * @param inputElementId
     * @param validatorFunc - implementing widget validation api
     *
     * @private
     */
    _addValidator: function(inputElementId, validatorFunc){
      bcdui.log.isTraceEnabled() && bcdui.log.trace("adding validator");
      var config = bcdui._migPjs._$(inputElementId).data("_config_");
      if(config.validators == null){
        config.validators=[];
      }
      config.validators.push(validatorFunc);
    },

    /**
     * triggers jquerymobile.selectmenu("refresh") to update UI overlay,
     * does nothing if jquerymobile is not enabled
     *
     * @private
     */
    _jqmRefresh : function(elId, doForce){
      if(window.jQuery){
        var w = jQuery("select#" + elId);
        // if .selectmenu widget is available
        if(w.selectmenu !== undefined){
          // pre-initialize if not done yet
          if ( w.data("mobile-selectmenu") === undefined ) {
            w.selectmenu();
          }
          w.selectmenu("refresh", doForce||false);
        }
      }
    },

    /**
     * this function shall be called in order to accept value from GUI control into the model,
     * also we handle a placeholder here, since this is considered to be the API to sync new GUI input
     *
     */
    updateValue: function(inputElementId){
      bcdui.log.isTraceEnabled() && bcdui.log.trace("updateValue(gui to data)");
      var inputEl = bcdui._migPjs._$(inputElementId);
      var args = inputEl.data("_args_");
      var config = inputEl.data("_config_");

      bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.input.updateValue: update via xpath : " + config.target.xPath + ", modelId: " + config.target.modelId);

      var guiValue = inputEl.get(0).value;
      bcdui.log.isTraceEnabled() && bcdui.log.trace("guiValue: " + guiValue);
      if(bcdui.widgetNg.utils._isEmptyField(inputEl.get(0))){
        // handle non-native placeholder
        guiValue="";
      }
      var modelValue = bcdui.widgetNg.utils._readDataFromXML(inputElementId).value||"";
      // tells if current widget value differs from data value
      var hasValueChanged = guiValue != modelValue;
      var isValid = null;

      // validation hier vorziehen, im fall das feld ist invalid um evtl. aufzuraumen
      if(!bcdui.widgetNg.validation.hasValidStatus(inputEl.get(0))){
        bcdui.log.isTraceEnabled() && bcdui.log.trace("force validation in case of invalid field status");
        isValid = bcdui.widgetNg.utils._validateElement(inputElementId, !hasValueChanged);
      }

      bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.input.updateValue: modelValue: " + modelValue + ", guiValue: " + guiValue);

      var hasWritten = false;
      if(hasValueChanged){
        bcdui.log.isTraceEnabled() && bcdui.log.trace("validate before write?");
        // we only revalidate in case we did not do it by chance before
        if(isValid || (isValid==null && bcdui.widgetNg.utils._validateElement(inputElementId, false))){
          bcdui.widgetNg.utils._writeDataToXML({
            inputElementId: inputElementId,
            value : guiValue
          });
          hasWritten = true;
        }else{
          bcdui.log.isTraceEnabled() && bcdui.log.trace("skip _writeDataToXML due to invalid input");
        }
      }else{
        bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui.widgetNg.input.updateValue: skip update due to unchanged value");
      }
  
      // handle placeholder here if we have to
      if(guiValue=="" && !config.extendedConfig.hasCustomPlaceholderHandler){
        bcdui.widgetNg.utils._setUnsetPlaceholder(inputElementId, true);
      }
      inputEl.trigger(bcdui.widgetNg.utils.EVENT.SYNC_WRITE,{
        isValueEmpty : guiValue == "",
        value : guiValue,
        hasWritten: hasWritten
      });
    },

    /**
     * reads from bound model, args:
     *
     * - targetModel
     * - targetXPath
     *
     * @return {Object} with properties:
     *  value: the raw value from model
     * @private
     */
    _readDataFromXML: function(inputElementId){
      bcdui.log.isTraceEnabled() && bcdui.log.trace("readDataFromXML");
      var config = bcdui._migPjs._$(inputElementId).data("_config_");
      return {
        value: bcdui.widget._getDataFromXML(bcdui.factory.objectRegistry.getObject(config.target.modelId),config.target.xPath)
      }
    },

    /**
     * updates the widget with data from bound model., args:
     *
     * - targetModel
     * - targetXPath
     *
     * here we also implement SYNC_WRITE to the data model for
     * invalid- to valid transition, that is once widget becomes valid
     * after invalid state, it persists the value into the model
     *
     * @private
     */
    _syncValue: function(inputElementId){
      var value = bcdui.widgetNg.utils._readDataFromXML(inputElementId).value||"";
      var el = bcdui._migPjs._$(inputElementId);
      // we're settings fields value - reset placeholder
      if(el.prop("bcdIsValuePlaceholder")){
        el.prop("bcdIsValuePlaceholder", false);
        el.removeClass("bcdPlaceholder");
      }
      el.get(0).value = value;
      var isValueEmpty = value == null || !value.trim();
      // validate
      bcdui.log.isTraceEnabled() && bcdui.log.trace("validate after sync, value read from model is: " + value + ", is value empty: " + isValueEmpty);
      bcdui.widgetNg.utils._validateElement(inputElementId, true);
      if(!el.data("_config_").extendedConfig.hasCustomPlaceholderHandler){
        bcdui.widgetNg.utils._setUnsetPlaceholder(inputElementId, isValueEmpty);
      }
      el.trigger(bcdui.widgetNg.utils.EVENT.SYNC_READ, {isValueEmpty : isValueEmpty});
    },

    /**
     * runs all validators
     *
     * @return {object[]} NULL in case of valid validation or array of validation messages
     * @private
     */
    _getValidationMessages: function(inputElementId){
      var config = bcdui._migPjs._$(inputElementId).data("_config_");
      if(! config)
        return null;

      var validators = config.validators;

      var messages=[];

      if(validators!=null){
        bcdui.log.isTraceEnabled() && bcdui.log.trace("found validators: " + validators.length);
        validators.forEach(function(v){
          var res = v(inputElementId);
          if(res!=null){
            messages.push(res.validationMessage);
          }
        });
      }

      bcdui.log.isTraceEnabled() && bcdui.log.trace("messages produced by validators: " + messages);

      return messages.length==0?null:messages;
    },

    /**
     * validates the element and sets validation markers, displays messages to the user,
     * this function implements the validation pattern allowing to validate the value of the
     * widget with custom validators. Additionally, a target-node can also have a validity status
     * which is also checked during SYNC_READ (means data loaded from model to widget) but check is
     * omitted in case of SYNC_WRITE (means data written from widget to model).
     *
     * TODO: this is generic purpose widget API extract this function to generic widget package
     *
     * @param inputElement
     * @param checkDataModelValidity if true, additionally the model validity is taken into account
     *
     * @return true in case of valid (OR element is not attached to DOM anymore) or false in case of invalid element status
     *
     * @private
     */
    _validateElement: function(inputElement, checkDataModelValidity){
      var el = bcdui._migPjs._$(inputElement);
      if(!el.length > 0){
        return true;
      }
      var msg = bcdui.widgetNg.utils._getValidationMessages(inputElement);
      bcdui.log.isTraceEnabled() && bcdui.log.trace("validation messages: " + msg);

      if(checkDataModelValidity === true){
        // run invalidModelDataValidator if intructed so
        var result = bcdui.widgetNg.validation.validators.widget.invalidModelDataValidator(el);
        if(result){
          if(msg==null){
            msg=[];
          }
          msg.push(result.validationMessage);
        }
      }

      return bcdui.widgetNg.validation.validateField(inputElement, msg);
    },

    /**
     * manual placeholder handling,
     * in case no value is set:
     *
     * 1) set element value to placeholder
     * 2) tag with CSS bcdPlaceholder class
     * 3) set elements bcdIsValuePlaceholder attribute to true, so that other APIs may detect that the value set is a placeholder
     *
     * this function must be called onfocus() and onblur() in case placeholder is set
     *
     * @param doSet - true if to set, false to remove
     * @private
     */
    _setUnsetPlaceholder: function(inputElementId, doSet){
      // we must not run in case browser supports placeholder
      if(bcdui.browserCompatibility._hasFeature("input.placeholder"))return;

      var el = bcdui._migPjs._$(inputElementId);

      if(doSet && el.is(":focus")){
        // no need to set placeholder on an active (focused) field
        return;
      }

      var args = el.data("_args_");
      // no placeholder configured
      if(!args.placeholder){
        return;
      }

      // we dont handle password fields
      if(args.type=="password")return;

      var isEmptyField = bcdui.widgetNg.utils._isEmptyField(el.get(0));

      if(doSet && isEmptyField){
        // set placeholder, if we have an empty value
        el.prop("bcdIsValuePlaceholder",true);
        el.addClass("bcdPlaceholder");
        el.get(0).value=args.placeholder;
      }else if(!doSet && el.prop("bcdIsValuePlaceholder")){
        // remove placeholder
        el.prop("bcdIsValuePlaceholder",false);
        el.removeClass("bcdPlaceholder");
        el.get(0).value="";
      }
    },

    /**
     * @return {boolean} true if value is empty, also considers the placeholder, value is empty if it is null or empty string
     * @private
     */
    _isEmptyField: function(inputElementId){
      var el = bcdui._migPjs._$(inputElementId);
      return el.get(0).value==null||!el.get(0).value.trim()||el.prop("bcdIsValuePlaceholder");
    },

    /**
     * sets or unsets the widgets loading status, also considers
     * the 'allowNewItem' flag and if set, make the field 'readonly' while
     * it is in 'loading' state.
     * TODO: widget-global
     *
     * @private
     */
    _setUnsetFieldLoadingStatus: function(htmlElementId, isLoading){
      var ctx = bcdui.widgetNg.utils._getContext(htmlElementId);
      if(!(ctx && ctx.args)){
        return;
      }
      if(isLoading){
        jQuery(ctx.el).addClass("bcdLoading");
        if(ctx.args.allowNewItem == false){
          jQuery(ctx.el).attr("readonly","readonly");
        }
      }else{
        jQuery(ctx.el).removeClass("bcdLoading");
        if(ctx.args.allowNewItem == false){
          jQuery(ctx.el).attr("readonly",null);
        }
      }
    },

    /**
     * convienience function to retrieve the context on the htmlElementId
     * TODO: widget-global
     *
     * @param htmlElementId
     * @return {Object} null in case widget has been destroyed or Object with properties:
     *
     * - el: the Element (PrototypeJS wrap)
     * - config: configuration
     * - args: API args
     *
     * @private
     */
    _getContext: function(htmlElementId){
      var el = bcdui._migPjs._$(htmlElementId);
      if(!el||el.length==0){
        return null;
      }
  
      var config = el.data("_config_");
      if(!config || config.isDestroyed){
        return null;
      }
  
      return {
        el:el.get(0),
        config: config,
        args: el.data("_args_")
      }
    },

    /**
     * builds multiModelWrapper around the options model, in case necessary
     * after execution the 'config' object get new properties:
     *
     * 'source.modelId'
     * 'source.xPath'                           the XPath pointing to CAPTION
     * 'source.valueXPath'                      the XPath pointing to VALUE, which is either xPath or optionsModelRelativeValueXPath + xPath
     * 'source.optionsModelRelativeValueXPath'  the XPath pointint to VALUE ( in case VALUE != CAPTION ), this is optional
     *
     *
     * @param args
     * @param config
     * @param controlElement
     * @param extraParams some extra params to optionsmodel factory, pls. see bcdui.widget._createWrapperModel() API
     * @param dontPatchIfSingleModel, if set to true, and there is only one model reference in source xpath, the source is not patched
     *        this also means that source model is not normalized. Te normalized model contains //Values/Value structure.
     *
     * @private
     * @return true if patched, false otherwise.
     */
    _patchOptionsModel: function(args, config, controlElement, extraParams, dontPatchIfSingleModel){
      // this block currenty uses bcdui.widget._createWrapperModel() which needs currently manual handling
  
      /*
       * initialize multiwrappermodel as our new options model.
       *
       *  _createWrapperModel() currently depends on: args.optionsModelId and args.optionsModelXPath
       *  and requires the array of referenced models, so we do it here. a TODO is to merge that function
       *  so it does everything on its own.
       */
      bcdui.log.isTraceEnabled() && bcdui.log.trace("optionsModelXPath: " + args.optionsModelXPath);
      var models=[];
      if(!args.optionsModelXPath.startsWith("$")){
        // fallback: no explicit reference found, assuming guiStatus as target
        models.push("$guiStatus");
      }
      var _refModels = bcdui.widget._extractModelsFromModelXPath(args.optionsModelXPath);
      if(_refModels != null){
        models = models.concat(_refModels);
      }
      models = models.reduce(function(a, b) { if(a.indexOf(b)===-1) a.push(b); return a; }, []);
  
      bcdui.log.isTraceEnabled() && bcdui.log.trace("optionsModelXPath references models: " + models);
  
      // _createWrapperModel() comatibility
      args.optionsModelId = models[0].replace(/\$/,""); // either implicit guiStatus here or referenced models
      args.element = controlElement;
  
      // enhancement: in case we have simple source reference and forced flag, we do so
      // FIXME: as internal options renderer is hardcoded to //Values/Value structure, also see _cst_prepareOptionsRendererId()
      if(models.length==1 && dontPatchIfSingleModel){
        // reference original model here
        config.source = {
            modelId: args.optionsModelId,
            xPath: args.optionsModelXPath.replace(/\$[^\/]+/,"")
        };
        if(args.optionsModelRelativeValueXPath){
          config.source.optionsModelRelativeValueXPath = args.optionsModelRelativeValueXPath;
          config.source.valueXPath = config.source.xPath + "/" + config.source.optionsModelRelativeValueXPath;
        } else {
          config.source.valueXPath = config.source.xPath;
        }
        bcdui.log.isTraceEnabled() && bcdui.log.trace("skip options-wrapper since we have one souce model and custom renderer",config);
        return false;
      }
  
  
      /*
       * respect API:
       *
       * [hasOptions]
       * - doSortOptions
       * - doRetainInputSchema
       */
      bcdui.widget._createWrapperModel(models, args, "widget/multiOptionsModelWrapper.xslt", jQuery.extend(
          {
            addLowerCaseCaption : "false"
          } //defaults
          ,
          {
            doRetainInputSchema:args.doRetainInputSchema,
            doSortOptions:args.doSortOptions
          }, // take only specific params
          extraParams)  // sample-in all extra params
      );
  
      /*
       * _createWrapperModel() adds/rewrites in the args:
       *
       * - optionsModelId
       * - optionsModelXPath
       * - optionsModelRelativeValueXPath
       *
       * we adopt it to our 'source' API
       */
      config.source = {
          modelId: args.optionsModelId,
          xPath: args.optionsModelXPath,
          optionsModelRelativeValueXPath : args.optionsModelRelativeValueXPath
      };
      config.source.valueXPath = config.source.xPath + "/" + config.source.optionsModelRelativeValueXPath;
  
      return true;
    },

    /**
     * this function syncs internal options list to options provided by data provider and executes given callback,
     * - this function also changes widgets UI state via _setUnsetFieldLoadingStatus()
     * - a field validation is triggered after options have been reloaded
     * (TODO REMOVE)
     * paramter in args:
     * @param htmlElementId {Object|String}
     * @param forEachFunc {Function} the callback function which is executed for each of found nodes according to .forEach() API
     * @param onReadyFunc {Function?} optional function to execute when we are ready iterating
     * @param doSort {Boolean} default FALSE; if TRUE the options are sorted via bcdui.widgetNg.utils.sorting.node.cmpAlphaIgnoreCase comparator.
     * @private
     */
    _updateInternalOptions: function(args){
      var ctx = bcdui.widgetNg.utils._getContext(args.htmlElementId);
      if(!ctx)return;
      // set field to loading status
      bcdui.widgetNg.utils._setUnsetFieldLoadingStatus(ctx.el, true);
      bcdui.factory.objectRegistry.withReadyObjects(ctx.config.source.modelId,function(){
        try{
          var nodes = jQuery.makeArray(bcdui.widgetNg.utils._getOptionNodes(ctx.el));
          if(args.doSort){
            nodes = nodes.sort(bcdui.widgetNg.utils.sorting.node.cmpAlphaIgnoreCase);
          }
          jQuery.each(nodes, args.forEachFunc);
        }finally{
          // reset field to nonloading status
          bcdui.widgetNg.utils._setUnsetFieldLoadingStatus(ctx.el, false);
          if(bcdui.util.isFunction(args.onReadyFunc)){
            args.onReadyFunc();
          }
        }
      },true);
    },

    /**
     * registers HTML element / XML update listener, which terminates itself once
     * the htmlElement is not attached to HTML DOM anymore.
     * args:
     *
     * @param idRef
     * @param trackingXPath
     * @param htmlElementId
     * @param updateValueCallback
     *
     * @return listener instance
     * @private
     */
    _registerDataListener: function(args){
      var listener = new bcdui.widget.XMLDataUpdateListener({
        idRef: args.idRef,
        trackingXPath: args.trackingXPath,
        htmlElementId: args.htmlElementId
      });
      listener.updateValue = args.updateValueCallback;
      bcdui.factory.addDataListener(listener);
      return listener;
    },

    /**
     * return the option nodes (wrapped into []) - requires the model and data to be up-to date, you
     * have to call this function after the object is initialized, an Error is thrown in case data-provider
     * is NOT ready.
     * (REMOVE)
     * @private
     * @return DOM NodeSet
     */
    _getOptionNodes: function(htmlElementId){
      var el = bcdui._migPjs._$(htmlElementId);
      var config = el.data("_config_");
      if (!config)
        return [];
      
      var dataProvider = bcdui.factory.objectRegistry.getObject(config.source.modelId);
  
      if(dataProvider == null){
        throw new Error("cannot read values as " + config.source.modelId + " is unknown.");
      }
  
      if(!dataProvider.isReady()){
        throw new Error("cannot read values as " + config.source.modelId + " is NOT ready.");
      }
  
      bcdui.log.isTraceEnabled() && bcdui.log.trace("reading values from " + config.source.xPath + " ( and relative value xpath: "+ config.source.optionsModelRelativeValueXPath +") of data provider " + config.source.modelId);
  
      return dataProvider.getData().selectNodes(config.source.xPath);
    }
  });
}());
