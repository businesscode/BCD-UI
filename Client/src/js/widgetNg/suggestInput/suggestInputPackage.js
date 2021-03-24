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
 * The SuggestInput widget,
 * this supports native html5 (if browser is capable) or fallsback
 * to custom implemeentation.
 * Implementation specifics:
 * this widget uses 'bcdui.widgetNg.input' for the input control implementation
 * and adds handlers and options list around it.
 *
 * Additionally, a custom validation is attached to validate that entered value matches
 * one in the options model (required if allowNewItem is prohibited). This procedure is run everytime
 * the option model changes. Invalid values are not accepted by the widget.
 *
 * The option-model passed in is transparently wrapped by the multiWrapperOptions-wrapper and is used
 * as drop-in replacement for original options model. That wrapper supports optionsXPath with multiple
 * source references within xpath , i.e. $guiStatus//ClientSettings/Editor[@id = $editorData/currentEditor],
 * so it re-updates everytime either $guiStatus has changed on the target node and considers $editorData changes,
 * as well as implementing distinct-values and sorting.
 *
 * The datalist rendering (options list) is implemented differently for native and custom widgets:
 *
 * Custom implementation:
 *
 * The redisplaying of the options list is a separate action and updates the list (in HTML DOM) only in case
 * the options list is displayed. For building HTML options list a singleton renderer is utilized (in case
 * no custom renderer is suppplied otherwise each a custom renderer gets populated with widgets parameters),
 * which works in the wrapped options-model mentioned above. The renderer renders into a singleton datalist-element
 * which is repositioned for each widget when revealing the datalist for it, before rendering options for particular
 * widget the inputModel of a singleton renderer is swapped with the option-model of that widget, calling a 'rebind',
 * during entering keystrokes into the input field the renderer is invoked periodically (refineOptions) to adjust/filter
 * options for the current input whilst passing the current widget's value to the rendering processor.
 *
 * Native implementation:
 *
 * the options are renderered as soon as widget as constructed to the unique datalist element of a widget
 * (each widget has its down unique datalist element). That datalist is always re-freshed as options model
 * changes. There're no further handlers since implemented natively by the browser (i.e. revealing the list,
 * filtering by what user types etc)
 *
 * Custom Events:
 *
 * this widget uses custom events to handle visual effects. Logic which requires distinct flow must not / is not
 * implemented via event-based logic. The pattern for custom events is that an htmlElementId reference for target
 * (and optionally more parameters) are put into a 'memo' of such event (PrototypeJS API). Generally, events should
 * be considered handled deferred and detached from a default program flow.
 *
 * Particularry following events are implemented:
 *
 * - WIDGET_LEFT:
 *   this event is fired once user logically leaves the widget, here we handle the possible placeholder justifying
 */
(function(){
  jQuery.widget("bcdui.bcduiSuggestInputNg", jQuery.bcdui.bcduiInputNg,
    /** @lends bcdui.bcduiSuggestInputNg */
    {
    /**
     * events defined in this package
     *
     * @static
     */
    EVENT : {
      /**
       * this event is fired once the user leaves the widget
       *
       * @static
       */
      WIDGET_LEFT : "bcd:widget.suggestInput.left"
    },

    /**
     * @private
     */
    _getCreateOptions : function(){
      return jQuery.extend(true, {}, this.options, bcdui.widgetNg.impl.readParams.suggestInput(this.element[0]));
    },
    /**
     * @private
     */
    _validateOptions : function(){
      bcdui.widgetNg.impl.validateParams.suggestInput(this.options);
    },

    /**
     * destroys given widget and frees resources
     * @private
     */
    _destroy : function(htmlElementId){
      this._super();
      var el = bcdui._migPjs._$(htmlElementId);
      if(! el.length > 0)return; // we cant tidy up what is not there anymore
  
      var config = el.data("_config_");
      config.isDestroyed = true;
  
      // ## now detach listeners
      if(config.listeners){
        jQuery.each(config.listeners, function(n,v){
          v.unregister();
        });
      }
  
      // ## move on with prototypeJS tidy up ##
      el.off();
      el.data("_args_",   null);
      el.data("_config_", null);
    },
  
    /**
     * initializes the widget according to the API,
     *
     * this init() function decides whether to initialize a native html5 or
     * a custom widget, depended on browsers capabitilies.
     *
     * The pattern is that internally there're different APIs (and even different flows) to
     * adopt to each implementation properly. Public APIs are common and delegate to either
     * implementation.
     *
     * A naming convention for native functions is _ntv_XXX (which all are private) for custom _cst_XXX respectively.
     *
     * Workflow of the init (general stuff):
     *
     * - add validator
     * - create options model wrapper _createWrapperModel() around options to apply multiOptionsModelWrapper.xslt supporting nested dependencies,
     *   this will be the only options data provider we use and sync to.
     * - attach listener on the options model wrapper to either validate the widget once options change or delete the value (see API)
     * - delegate to native or custom implementation subprocedure to attach handles for re-rendering the options list, etc.
     * @private
     */
    _create : function(){
      var rootContainer = this.element.css({position:"relative"}); // force relative position as wraps an absolute dropdown
      var args = this.options;
  
      if(args.filterFunction && bcdui.util.isString(args.filterFunction)){
        args.filterFunction = eval(args.filterFunction);
      }
  
      // if browser supports html5 datalist
      var isNative = !args.disableNativeSupport && bcdui.browserCompatibility._hasFeature("input.list");
  
      // construct super type
  
      if(!isNative){
        /*
         * if we have a custom implementation we also will be handling more stuff
         * within this package
         */
        this.options.extendedConfig = {
            hasCustomUpdateHandler: true,
            hasCustomPlaceholderHandler: true
        };
      }
      // initialize inputWidget
      this._super();

      // according to bcdui.widgetNg.input initialization
      var controlElement = this.element.find("input");
  
      // rewrite args+config and augment config
      var config = controlElement.data("_config_");
      controlElement.data("_args_", args);

      config.isNative = isNative;
      config.doTrimInput = args.doTrimInput || false;
  
      // dependencies to sync for
      config.dependencies = [config.target.modelId];
  
      var rawOptionsRef = bcdui.factory._extractXPathAndModelId(args.optionsModelXPath);
      // initially we also wait for the raw options model (will be wrapped later)
      if(rawOptionsRef.modelId){
        config.dependencies.push(rawOptionsRef.modelId);
      }

      // custom placeholder handling is only available in custom implementation
      if(args.placeholder && !bcdui.browserCompatibility._hasFeature("input.placeholder") && !isNative){
        // during writeback to the model, conditionally set placeholder
        controlElement.on(bcdui.widgetNg.utils.EVENT.SYNC_WRITE, function(event, memo){
          if(memo.isValueEmpty){
            bcdui.widgetNg.utils._setUnsetPlaceholder(event.target.id, true);
          }
        });
        // during syncing back from model set/reset placeholder
        controlElement.on(bcdui.widgetNg.utils.EVENT.SYNC_READ, function(event, memo){
          bcdui.widgetNg.utils._setUnsetPlaceholder(event.target.id, memo.isValueEmpty);
        });
        // remove the placeholder on-focus
        controlElement.on("focus",bcdui.widgetNg.utils._setUnsetPlaceholder.bind(undefined,controlElement.get(0).id, false));
        // add placeholder on widget-left
        controlElement.on(this.EVENT.WIDGET_LEFT, function(event, memo){
          // make it deferred to allow potential blur() to occur
          setTimeout(bcdui.widgetNg.utils._setUnsetPlaceholder.bind(undefined,memo.htmlElementId, true));
        });
      }

      // complete initialization once dependencies has been loaded
      bcdui.widgetNg.utils._setUnsetFieldLoadingStatus(controlElement.get(0), true);
      bcdui.factory.objectRegistry.withReadyObjects({
          ids:config.dependencies,
          fn:function(args, config, controlElement){
            // widget could have been destroyed meanwhile
            if(config.isDestroyed){
              return;
            }
  
            // now we can build our options model wrapper and wait for it to get ready, then proceeding with init
            // set addLowerCaseCaption to true because of optimized case-insensitive lookup
            bcdui.widgetNg.utils._patchOptionsModel(args, config, controlElement, {addLowerCaseCaption:"true"}, args.optionsRendererId ? true : false);
  
            bcdui.factory.objectRegistry.withReadyObjects(config.source.modelId, function(){
              // widget could have been destroyed meanwhile
              if(config.isDestroyed){
                return;
              }
              // here we finalize the initialization
              try{
                if(config.isNative){
                  this._ntv_init(controlElement);
                }else{
                  this._cst_init(controlElement);
                }
              }finally{
                // attach validators
                this._attachValidators(controlElement);
                // reset loadings status
                bcdui.widgetNg.utils._setUnsetFieldLoadingStatus(controlElement, false);
                // run explicit validation
                bcdui.widgetNg.utils._validateElement(controlElement);
              }
            }.bind(this));
          }.bind(this, args, config, controlElement.get(0))
      });
    },
  
    /**
     * attaches the data change listener to the options model,
     * the listener is only attached in case it is required,
     * that is allowNewItem is set to FALSE
     *
     * @param args
     * @param config
     *
     * @private
     */
    _attachOptionsModelChangedListener: function(args, config, htmlElementId){
      if(args.allowNewItem === false){
        var el = bcdui._migPjs._$(htmlElementId);
        var config = el.data("_config_");
        // attach only if we have to know about changed options passively.
        var listener = bcdui.widgetNg.utils._registerDataListener({
          idRef: config.source.modelId,
          trackingXPath: config.source.xPath,
          htmlElementId: bcdui._migPjs._$(htmlElementId).get(0).id,
          updateValueCallback: function(htmlElementId){
  
            // re-validate widget once options have changed
            var el = bcdui._migPjs._$(htmlElementId);
            var isValid = bcdui.widgetNg.utils.validateElement(el.get(0));
            // if not valid - remove the value
            if(!isValid){
              this._syncWrite(htmlElementId,"");
            }
  
          }.bind(this,htmlElementId)
        });
        jQuery.extend(true, config , {listeners : { syncValueListener : listener }});
      }else{
        bcdui.log.isTraceEnabled() && bcdui.log.trace("skip attaching optionsmodelchanged listener on #" + htmlElementId);
      }
    },
  
    /**
     * attaches validators
     *
     * @param htmlElementId
     * @private
     */
    _attachValidators: function(htmlElementId){
      var ctx = bcdui.widgetNg.utils._getContext(htmlElementId);
      if(ctx && ctx.args && ctx.args.allowNewItem == false){
        /*
         * see validators._existingValueValidator
         */
        throw "allowNewItem flag is not implemented";
      }
    },

    /**
     * initializes a native html5 implementation, all dependencies are resolved and can be access here w/o sync
     *
     * - declares 'list'-attribute on the input-element and binds to the datalist
     * - attaches handlers to listen to options-model which populate the 'datalist' input element is bound to
     *
     * @param htmlElementId of the controller element (or the controller element itself)
     * @private
     */
    _ntv_init: function(htmlElementId){
      bcdui.log.isTraceEnabled() && bcdui.log.trace("native suggestion box initialization");
      var el = bcdui._migPjs._$(htmlElementId);
      var config = el.data("_config_");
      // build datalist
      config.dataListElementId = this._ntv_createDataListElement(el.parent().get(0)).id;
  
      // update the data list initially
      this._ntv_syncToOptionsProvider(el.get(0));
  
      // patch the control element: add 'list' attribute
      el.attr("list",config.dataListElementId);
  
      // register listener on the options to update the list
      bcdui.log.isTraceEnabled() && bcdui.log.trace("update listener on options provider registered");
      var listener = bcdui.widgetNg.utils._registerDataListener({
        idRef: config.source.modelId,
        trackingXPath: config.source.xPath,
        htmlElementId: el.get(0).id,
        updateValueCallback: this._ntv_syncToOptionsProvider.bind(this,el.get(0))
      });
      jQuery.extend(true, config , {listeners : { syncValueListenerNtv : listener }});
    },

    /**
     * syncs widget to options data provider and update the internal datalist element
     * with values from source and re-validates the widget.
     *
     * @param htmlElementId
     * @param optionElementName wrapping the option value
     *
     * TODO: should be changed to approach used for non-native implementation which allows
     * usage of custom options renderer (although complex layout is not supported by browsers,
     * we should use same implementation) once BCD-UI provides JsRenderer we can switch this
     * implementations to use renderers
     *
     * @private
     */
    _ntv_syncToOptionsProvider: function(htmlElementId){
      var el = bcdui._migPjs._$(htmlElementId);
      var config = el.data("_config_");
      var dataListEl = bcdui._migPjs._$(config.dataListElementId).get(0);
  
      bcdui.log.isTraceEnabled() && bcdui.log.trace("(_ntv_syncToOptionsProvider)updating the data list");
  
      // remove all options under dataListEl
      jQuery(dataListEl).empty();
  
      // copy all options into dataListEl
      bcdui.widgetNg.utils._updateInternalOptions({
        htmlElementId: el.get(0),
        forEachFunc: function(index, attrNode){
  
          // dom api for speed
          var el = document.createElement("option");
          el.setAttribute("value", attrNode.text);
  
          dataListEl.appendChild(el);
        },
        onReadyFunc: function(el){
          // re-validate widget
          bcdui.widgetNg.utils._validateElement(el);
        }.bind(undefined,el.get(0))
      });
    },

    /**
     * creates a datalist element as a child of a given element
     *
     * @param {htmlElement} parentElement the parent element where the datalist is being attached to
     * @private
     */
    _ntv_createDataListElement: function(parentElement){
      var el = jQuery("<datalist id='" + parentElement.id + "_dataList" + "'></datalist>");
      parentElement.appendChild(el.get(0));
  
      return el.get(0);
    },

    /**
     * initializes a custom implementation, all depependencies are resolved and can be access here w/o sync to
     * data providers.
     *
     * - creates a 'datalist' div-control containing the options
     * - attaches handlers to handle custom widget implementation
     *
     * @private
     */
    _cst_init: function(htmlElementId){
      bcdui.log.isTraceEnabled() && bcdui.log.trace("custom suggestion box initialization");
      var ctx = bcdui.widgetNg.utils._getContext(htmlElementId);
      if(!ctx)return;
  
      // build datalist element
      this._cst_getDataListElement();
  
      // prepare the options renderer
      this._cst_prepareOptionsRendererId(htmlElementId);
  
      // attach options model listener to react to option model changes
      this._attachOptionsModelChangedListener(ctx.args, ctx.config, htmlElementId);
  
      /*
       *  attach handlers
       */
      // reveal options box on focus
      jQuery(ctx.el).on("focus",this._cst_revealOptions.bind(this,htmlElementId));
      // refine as user types
      jQuery(ctx.el).on("keyup",this._cst_keyUpHandler.bind(this,ctx.el));
      // keyhandler for options box control
      jQuery(ctx.el).on("keydown", this._cst_keyDownHandler.bind(this,ctx.el.id));
    },
  
    /**
     * control key set for fast lookup
     *
     * @private
     */
    _CONTROL_KEYS_MAP: (function(){
      var map={};
      [
       bcdui.util.Event.KEY_DOWN,
       bcdui.util.Event.KEY_UP,
       bcdui.util.Event.KEY_PAGEDOWN,
       bcdui.util.Event.KEY_PAGEUP,
       bcdui.util.Event.KEY_RETURN,
       bcdui.util.Event.KEY_TAB,
       bcdui.util.Event.KEY_ESC
       ].forEach(function(e){
        map[e+""]=1;
      });
      return map;
    })(),
  
    /**
     * refine options if no control key was published
     *
     * @private
     */
    _cst_keyUpHandler: function(htmlElement, event){
      if(!this._CONTROL_KEYS_MAP[event.keyCode+""]){
        // refine option in case this is not a control key event
        this._cst_refineOptions(htmlElement);
      }
    },
  
    /**
     * controls the selection in optionsbox
     *
     * @private
     */
    _cst_keyDownHandler: function(htmlElementId, event){
      if(!this._cst_isOptionsListVisible()){
        /*
         * if options list is not visible we decide if to ignore the keyhit
         * or display the options list, in either case there is no further
         * handling for the key-hit
         */
        if(event.keyCode == bcdui.util.Event.KEY_DOWN || event.keyCode == bcdui.util.Event.KEY_PAGEDOWN){
          // roll out the optionslist
          this._cst_revealOptions(htmlElementId);
        } else if(event.keyCode == bcdui.util.Event.KEY_RETURN || event.keyCode == bcdui.util.Event.KEY_TAB){
          // apply selected value
          this._cst_applyValueFromOptionsOrControl(htmlElementId);
          // handle return here which means that is the cell loses focus
          this._cst_handleWidgetLeft(htmlElementId);
        }
        return;
      }
  
      var el = bcdui._migPjs._$(htmlElementId);
  
      switch (event.keyCode) {
        case bcdui.util.Event.KEY_DOWN: {
          this._cst_moveOptionSelection(1, el.get(0));
          break;
        }
        case bcdui.util.Event.KEY_UP: {
          this._cst_moveOptionSelection(-1);
          break;
        }
        case bcdui.util.Event.KEY_PAGEDOWN: {
          this._cst_moveOptionSelection(1);
          break;
        }
        case bcdui.util.Event.KEY_PAGEUP: {
          this._cst_moveOptionSelection(-1);
          break;
        }
        case bcdui.util.Event.KEY_RETURN: {
          // consume event here to keep the field focused to allow user for further navigation
          event.stopPropagation();
          event.preventDefault();
          this._cst_applyValueFromOptionsOrControl(htmlElementId);
          break;
        }
        case bcdui.util.Event.KEY_TAB:
          this._cst_applyValueFromOptionsOrControl(htmlElementId);
          // handle widget left
          this._cst_handleWidgetLeft(htmlElementId);
          break;
        case bcdui.util.Event.KEY_ESC:
          this._cst_hideOptions();
          break;
      }
    },
  
    /**
     * updates value to the model, the value synced back to the model is either
     * taken from the dropdown box selected (if selected) or current widgets input
     * value is simpy synced to the model.
     *
     * @param htmlElementId
     * @private
     */
    _cst_applyValueFromOptionsOrControl: function(htmlElementId){
      var selectedElement = bcdui._migPjs._$(this._cst_getSelectedOptionElement());
      if(selectedElement.length > 0){
        this._applyValueFromDropDown(htmlElementId, selectedElement.attr("bcdCaption"), selectedElement.attr("bcdId")); // sync from dropdown selection
      }else{
        this._syncWrite(htmlElementId); // sync widgets value
      }
      this._cst_hideOptions();
    },

    /**
     * applies a value from dropdown: delegate to either a custom or a default implementation
     * @private
     * @static
     */
    _applyValueFromDropDown : function(htmlElementId, bcdCaption, bcdId){
      try{
        (bcdui._migPjs._$(htmlElementId).data("_args_").applyListItemSelectionFunction || this._applyValueFromDropDown_default)(this, htmlElementId, bcdCaption, bcdId);
      } catch (e) {
        window.console && window.console.warn("ignored caught exception", e);
      }
    },

    /**
     * @private
     * @static
     */
    _applyValueFromDropDown_default : function(instance, htmlElementId, bcdCaption, bcdId){
      instance._syncWrite(htmlElementId, bcdCaption);
    },

    /**
     * @return currently selected element from the optionsbox or NULL or no selected element found OR box is not visible
     * @private
     */
    _cst_getSelectedOptionElement: function(){
      var optionsEl = bcdui._migPjs._$(this._cst_getDataListElement());
      if(!optionsEl.is(":visible")){
        return null;
      }
      var selectedElement = optionsEl.find(".bcdOptionIsSelected");
      return selectedElement.length == 0 ? null : selectedElement[0];
    },
  
    /**
     * moves the selection in the options box according to the delta, stops on
     * top/last element, selects first one if none was selected
     *
     * @param delta {integer} one of [-1,1] a positive delta moves selection down
     * @param htmlElement {Object}
     * @private
     */
    _cst_moveOptionSelection: function(delta, htmlElement){
      var selectedElement = bcdui._migPjs._$(this._cst_getSelectedOptionElement());
  
      var newSelectedElement = null;
  
      if(! selectedElement.length > 0){
        /*
         * nothing selected yet - take first option
         */
        var firstOption = jQuery(jQuery(bcdui._migPjs._$(this._cst_getDataListElement()).children().get(0)).children().get(0));
        if(firstOption.length > 0){
          firstOption.addClass("bcdOptionIsSelected");
          newSelectedElement = firstOption.get(0);
        }
      }else{
        // move to next
        var nextElement = delta>0 ? selectedElement.next() : selectedElement.prev();
        // only move selection if we have next/previous item
        if(nextElement.length > 0){
          // unselected current element
          selectedElement.removeClass("bcdOptionIsSelected");
          // scroll to selected element
          this._scrollToElement(selectedElement.parent().parent().get(0), selectedElement.get(0));
          // select next
          nextElement.addClass("bcdOptionIsSelected");
          newSelectedElement = nextElement.get(0);
        }
      }
    },
    
    /**
     * @private
     */
    _scrollToElement: function( scrollable, element ){
      var boxheight = bcdui._migPjs._$(scrollable).height();
      var height    = bcdui._migPjs._$(element).height();
      var top       = bcdui.util.positionedOffset(bcdui._migPjs._$(element).get(0)).top;
      if ( top +  height + 10  - scrollable.scrollTop >  boxheight ){
        scrollable.scrollTop = top;
        return;
      }else if ( top < scrollable.scrollTop ){
        scrollable.scrollTop = top - boxheight;
        return;
      }
    },
  
    /**
     * refines the options, that is redisplay the renderer,
     * the options box is not hidden during redisplay, the
     * options renderer may apply further logic like filtering
     * on the widget value etc, upon completion of rendering
     * this function checks if the dataListEl has children and
     * either .hide()s or .show()s it.
     *
     * TODO: this one works for non-native implementation only but should be also used to render native options
     *
     * @param el
     * @param cbAfterRedisplay
     *
     * @private
     */
    _cst_refineOptions: function(el, cbAfterRedisplay){
      bcdui.log.isTraceEnabled() && bcdui.log.trace("refining options");
  
      var ctx = bcdui.widgetNg.utils._getContext(el);
      if(!ctx)return;
      var dataListEl = bcdui._migPjs._$(this._cst_getDataListElement());
      var optionsRendererId = this._cst_prepareOptionsRendererId(el);
  
      // make up this function since we will use it in more places
      var reDisplay = function() {
        bcdui.factory.reDisplay({
          idRef: optionsRendererId,
          forced : true,
          fn : function(){
            // either ensure visibility or hide the options box if no options found
            if( dataListEl.find("[bcdCaption]").length==0 ){
              // hide
              dataListEl.hide();
            }else{
              // show
              dataListEl.show();
            }
  
            if(cbAfterRedisplay){
              try{
                cbAfterRedisplay();
              }catch(e){
                bcdui.log.warn("error occured in cbAfterRedisplay callback", e);
              }
            }
          }
        });
      };
  
      /* rebind, just in case the box was bound to different target */
      if(dataListEl.attr("bcdBoundTo") != el.id){
        this._cst_revealOptions(el, true);
      }
  
      var skipRedisplay = false;
  
      if(ctx.args.filterFunction){
        try{
          skipRedisplay = ctx.args.filterFunction({ htmlElementId:ctx.el.id, value:ctx.el.value, onComplete:reDisplay });
        }catch(e){
          skipRedisplay = false;
          bcdui.log.warn("error during filterKeyStroke execution", e);
        }
      }
  
      !skipRedisplay&&reDisplay();
    },
  
    /**
     * BINDS and reveals options box for given htmlElementId
     *
     * @param doRebindOnly - true if to skip refine-options, this is because of cyclic dependency
     *
     * @private
     */
    _cst_revealOptions: function(htmlElementId, doRebindOnly){
      bcdui.log.isTraceEnabled() && bcdui.log.trace("_cst_revealOptions");
  
      var ctx = bcdui.widgetNg.utils._getContext(htmlElementId);
      if(!ctx)return;
      var el = ctx.el;
      var dataListEl = bcdui._migPjs._$(this._cst_getDataListElement());
  
      dataListEl.hide();
  
      /*
       * rebind to given htmlElement
       */
      dataListEl.attr("bcdBoundTo", el.id);
  
      /*
       * TODO: offsetTop: obtain top from el offsetHeight so that options are display below the input field
       * but maybe also use another appraoach (with node re-attaching) to that positioning works automatically
       */
      // re-attach in node tree here
      el.parentNode.appendChild(dataListEl.get(0));
  //    dataListEl.clonePosition(el,{
  //      setHeight: false,
  //      offsetTop: "15px"
  //    });
  
      // reassign minimum width, TODO: in IE empty box still collapses by width, simulate min-width, since width has to be adjustable to its content
      dataListEl.css({
        "min-width": Math.round(bcdui._migPjs._$(el).outerWidth()*.8)+"px"
      });
  
      // rebuild options list
      if(doRebindOnly !== true){
        this._cst_refineOptions( htmlElementId );
      }
  
      bcdui.log.isTraceEnabled() && bcdui.log.trace("_cst_ui_revealDataList() rebound to " + htmlElementId);
    },
  
    /**
     * hides the options list
     *
     * @private
     */
    _cst_hideOptions: function(){
      bcdui.log.isTraceEnabled() && bcdui.log.trace("_cst_hideOptions");
      bcdui._migPjs._$(this._cst_getDataListElement()).hide();
    },
  
    /**
     * the ID of custom datalist singleton element to carry the options for
     * currently active input widget
     *
     * @private
     */
    _CST_DATALIST_ELEMENT_ID: "bcd_widget_suggestInput_dataList",
  
    /**
     *
     * @return {Boolean} true, if the options list is currently visible
     * @private
     */
    _cst_isOptionsListVisible: function(){
      return bcdui._migPjs._$(this._CST_DATALIST_ELEMENT_ID).is(":visible");
    },
  
    /**
     * creates (if not already exists) a singleton datalist DIV container element
     * and attaches following handlers to it:
     *
     * - mouseover: this handler is used to visualize the selection while hovering with mouse
     * - click: this handler changes widgets value to that of picked element
     *
     * @return {Element} the datalist container element
     *
     * @private
     */
    _cst_getDataListElement: function(){
      var elId = this._CST_DATALIST_ELEMENT_ID;
      var el = bcdui._migPjs._$(elId);
  
      if(! el.length > 0){
        el = jQuery("<div id='" + elId + "' class='bcd-datalist'></div>").css({position: "absolute"}).hide();
        document.body.appendChild(el.get(0));
  
        /*
         * attach handlers
         */
  
        // option highlighting
        el.on("mouseover", function(event){
          var currentEl = jQuery(event.target).closest("[bcdCaption]")||jQuery(event.target);
          // unhover old
          jQuery.each(currentEl.parent().find(".bcdOptionIsHovered"), function(i, e){
            jQuery(e).removeClass("bcdOptionIsHovered");
          });
          // hover new
          currentEl.addClass("bcdOptionIsHovered");
        });
  
        // option selection
        el.on("mousedown", function(event){
          //our value is located at an ancestor with bcdCaption attr, look it up
          var currentEl = jQuery(event.target).closest("[bcdCaption]");
  
          if(!currentEl.length > 0){
            // may happen if we have no values (empty box)
            return;
          }
  
          // write options value to the widget and sync it
          var optionsBoxEl = bcdui._migPjs._$(this._CST_DATALIST_ELEMENT_ID);
          var htmlElementId = optionsBoxEl.attr("bcdBoundTo");
          this._applyValueFromDropDown(htmlElementId, currentEl.attr("bcdCaption"), currentEl.attr("bcdId")); // apply selection from dropdown
          // hide box
          this._cst_hideOptions();
        }.bind(this));
  
        // we listen on global mousedown event on a document, inside we side when our
        // handler will be de-registered to prevent pollution.
        // widget-leave handling, we assume that MOUSEDOWN is fired before FOCUS event,
        // in case not, we have to split the logic of WIDGET_LEFT detection into FOCUS and MOUSEDOWN
        // or defer the detection - primarily because IE removes a focus from field during scrollbar
        // action.
        var mouseDownHdl = function(event){
          var dropDown = bcdui._migPjs._$(this._CST_DATALIST_ELEMENT_ID);
          // if we dont have a singleton dropdown - we unregister our handler, since our factroy will craete a new
          // handler along with a new dropdown box, once a dropdown box is required
          if (!dropDown.length > 0){
            jQuery(document).off("mousedown", mouseDownHdl);
            return;
          }
          var boundToId = dropDown.attr("bcdBoundTo");
          bcdui.log.isTraceEnabled() && bcdui.log.trace("mousedown target element: " + event.target.id);
          /*
           * boundToId-value:
           *
           * 1) either is NULL/blank (so dropdown was never bound before)
           * 2) or refers to a (previously) bound element, via @bcdBoundTo attribute ( this case we care about )
           *
           * after MOUSEDOWN event a FOCUS is fired on target element, which also rebinds the dropdown box
           * to a new focused element, hence overriding the @bcdBoundTo value, since we're in MOUSEDOWN which
           * is fired *before* FOCUS event, we still have the old value the dropdownbox was bound to.
           *
           */
          if(
              boundToId != null
              && boundToId != event.target.id
              && event.target.id != this._CST_DATALIST_ELEMENT_ID
              && !jQuery.contains(dropDown, event.target)){
            this._syncWrite(boundToId);
            /*
             * handle only if:
             * - dropdown is bound
             * - target element other than dropdown bound to (click on same input-field is ignored)
             * - target element not the dropdown itself (descendant is not descendant-or-self)
             * - target element not inside the dropdown (ignore item selection click)
             */
            this._cst_handleWidgetLeft(boundToId);
          }
        }.bind(this);
        jQuery(document).on("mousedown", mouseDownHdl);
      }
  
      return el;
    },
  
    /**
     * 1) hides the dropdown
     * 2) unbinds the dropdown
     * 3) checks for invalid status, if so reset the value
     * 4) fires WIDGET_LEFT
     *
     * @htmlElementId which has been left
     * @private
     * @static
     */
    _cst_handleWidgetLeft: function(htmlElementId){
      bcdui.log.isTraceEnabled() && bcdui.log.trace("_cst_handleWidgetLeft the input #" + htmlElementId);
      var dropDown = bcdui._migPjs._$(this._CST_DATALIST_ELEMENT_ID);
      // hide
      if(dropDown.is(":visible")){
        dropDown.hide();
      }
      // unbind
      dropDown.attr("bcdBoundTo",null);
      var el = bcdui._migPjs._$(htmlElementId);
      // reset widget in case of invalid value
      if(!bcdui.widgetNg.validation.hasValidStatus(el.get(0))){
        // TODO - reset UI only, or reset DOM value or reset UI to DOM value?
        bcdui.log.warn("TODO: implement, retain from model");
      }
      // fire WIDGET_LEFT
      el.trigger(this.EVENT.WIDGET_LEFT,{htmlElementId:htmlElementId});
    },
  
    /**
     * syncs current input value (or optionally given value) of the widget into model
     *
     * @param optNewValue {String?} if this value is given, the input control will be updated by this value and then synced to model
     *                              otherwise current controls value is synced to the model
     *
     * @private
     * @static
     */
    _syncWrite: function(htmlElementId, optNewValue){
      var el = bcdui._migPjs._$(htmlElementId);
  
      if(!el.length > 0){
        return;
      }
  
      if(bcdui.util.isString(optNewValue)){
        el.get(0).value = optNewValue;
      }
      bcdui.widgetNg.utils.updateValue(htmlElementId);
    },
  
    /**
     * the default singleton options renderer ID
     *
     * @private
     */
    _OPTIONS_RENDERER_ID : "bcd_widget_suggestInput_dataListRenderer",
    /**
     * is set to TRUE once a default options renderer is initialized and
     * can be synced thru _OPTIONS_RENDERER_ID, due to bcdui.factory.createRenderer()
     * which registered the renderer deferred (after dependencies are resolved) we cannot
     * check for existence of the renderer object in advance.
     *
     * @private
     */
    _DEFAULT_OPTIONS_RENDERER_INITIALIZED: false,
  
    /**
     * a singleton widget-value data provider passed to the options-renderer with the current widget-value
     *
     * @private
     */
    _WIDGET_VALUE_DATAPROVIDER: bcdui.factory.createConstantDataProvider({name: "bcdWidgetValue", value: null }),
  
    /**
     *
     * either retrieve a singleton renderer in case no custom provided, or retrieve custom one.
     * this function ensures that all widget specific parameters to renderer are rebound to given
     * widget.
     *
     * @param htmlElementId
     * @return {String} ID of the renderer
     * @private
     */
    _cst_prepareOptionsRendererId: function(htmlElementId){
      var ctx = bcdui.widgetNg.utils._getContext(htmlElementId);
      if(!ctx)return;
      var rendererId = "", renderer = null;
  
      bcdui.factory.objectRegistry.getObject(this._WIDGET_VALUE_DATAPROVIDER).value = ctx.el.value;
  
      // caching rocks, impl in rebindRendererParams() inner func
      if(ctx._optionsRenderer && ctx._optionsRenderer.boundTo == ctx.el.id){
        return ctx._optionsRenderer.rendererId;
      }
  
      // snapshot widget values to pass to options renderer
      var srcModel = bcdui.factory.objectRegistry.getObject(ctx.config.source.modelId);
      if(!srcModel){
        bcdui.log.error("srcModel is not registered(null), id: " + ctx.config.source.modelId);
      }
      var providers = [];
      // TODO enhancement: create static JsDataProvider every parameter, so we dont have to re-recreate data provider everytime; like _WIDGET_VALUE_DATAPROVIDER
      providers.push(new bcdui.core.ConstantDataProvider({ name: "bcdInputModelId",   value: ctx.config.source.modelId }));
      providers.push(new bcdui.core.ConstantDataProvider({ name: "bcdIsNative",       value: ctx.config.isNative }));
      providers.push(new bcdui.core.ConstantDataProvider({ name: "suggestItemCount",  value: ctx.args.suggestItemCount }));
  
      // rebind widget specific values : put this into separate function as it may happen that we have to re-init renderer deferred at it is not
      // known to ObjectRegistry right after construction
      var rebindRendererParams = function(renderer){
        // reset input document to options document of our widget
        renderer.dataProviders[0] = srcModel;
        renderer.modelParameterId = renderer.dataProviders[0].id;
  
        for(var i=0;i<providers.length;i++){
          renderer.addDataProvider(providers[i]);
        }
  
        // this for optimization so we dont need to rebind if we still are bound to same widget
        ctx._optionsRenderer = {
          boundTo : ctx.el.id,
          rendererId : renderer.id
        };
      };
  
      if(ctx.args.optionsRendererId){
        /* we have custom renderer */
        rendererId = ctx.args.optionsRendererId;
        renderer = bcdui.factory.objectRegistry.getObject(rendererId);
  
        var customStaticRebind = function(renderer){
          // rebind to different target before rendering
          renderer.setTargetHtml(this._CST_DATALIST_ELEMENT_ID);
          renderer.addDataProvider(bcdui.factory.objectRegistry.getObject(this._WIDGET_VALUE_DATAPROVIDER));
        }.bind(this);
  
        /* rebind with static configuration */
        if(!renderer){
          bcdui.factory.objectRegistry.withObjects(rendererId,function(){ customStaticRebind(bcdui.factory.objectRegistry.getObject(rendererId)) });
        }else{
          customStaticRebind(renderer);
        }
      } else {
        /* we dont have custom renderer, use global one */
  
        rendererId = this._OPTIONS_RENDERER_ID;
  
        // static init
        if(!jQuery.bcdui.bcduiSuggestInputNg._DEFAULT_OPTIONS_RENDERER_INITIALIZED){
          jQuery.bcdui.bcduiSuggestInputNg._DEFAULT_OPTIONS_RENDERER_INITIALIZED = true;
  
          bcdui.log.isTraceEnabled() && bcdui.log.trace("creating singleton renderer with id: " + rendererId);
  
          /*
           * FIXME: once JavaScriptRenderer is available, implement such renderer to handle arbirtrary source.xPath (single),
           * as the current stylesheet is hardcoded to //Values/Value structure, but the source model is not always patched
           * via _patchOptionsModel() function hence the source structure is not always normalized.
           *
           * another approach (yet less efficient) is to keep using XSLTRenderer but with "patched" stylesheet which can
           * resolve dynamic source.xPath
           */
          bcdui.factory.createRenderer({
            id:         rendererId
            , targetHtml: "#" + this._CST_DATALIST_ELEMENT_ID
            , url:      bcdui.config.jsLibPath + "widgetNg/suggestInput/optionsRenderer.xslt"
            , inputModel: bcdui.core.emptyModel
            , dataProviders: this._WIDGET_VALUE_DATAPROVIDER
            , parameters: {
              bcdIsNative : ctx.config.isNative,
              suggestItemCount : ctx.args.suggestItemCount
            }
            , suppressInitialRendering: true
          });
          renderer = bcdui.factory.objectRegistry.getObject(rendererId);
        }
      }
  
      // immediate or later rebind
      if(!renderer){
        bcdui.factory.objectRegistry.withObjects(rendererId,function(){ rebindRendererParams(bcdui.factory.objectRegistry.getObject(rendererId)) });
      }else{
        rebindRendererParams(renderer);
      }
  
      return rendererId;
    }
  });
})();

/**
 * A namespace for the BCUDI GUI suggestInput widget. For creation @see {@link bcdui.widgetNg.createSuggestInput}
 * @namespace bcdui.widgetNg.suggestInput
 */
jQuery.extend(bcdui.widgetNg.suggestInput,
/** @lends bcdui.widgetNg.suggestInput */
{
  /**
   * initializes the widget according to the API
   *
   * @param element {Element} to initialize from
   * @private
   */
  init : function(htmlElement){
    bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui suggest input widget adapter init");
    jQuery(htmlElement).bcduiSuggestInputNg();
  },

  /**
   * @param {string} id targetHtml of widget
   * @param {function} callback to be called with generated caption
   * @return {string} NavPath information via callback for widget
   */
  getNavPath: function(id, callback) {
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
