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
 * Input field
 * - Text input field
 * - Features:
 *   * Options model
 *     - Provides a drop down with its values, dynamically filtered by fragments entered in input field
 *     - Defines allowed values
 *     - Allows to enter captions, which are translated to values
 *     - Can be reloaded from the server with new suggestions based on fragments entered in input field
 *     - Can have an extra "clear" option
 *     - Allows wild cards startswith, endswith, contains filtering values from options model
 *     - Allowing/disallowing values not presented in options model
 *   * Like and equals operator (via targetModelXpath)
 *   * Case sensitive / insensitive (via targetModelXpath)
 *   * Custom callbacks
 *   * Enable/disable
 *   * Mouse/keyboard aware
 *   * Handles Wrs specifics as well as standard models
 *   * Allows to show test for empty, like "Please select"
 *
 * TODO
 *   Limit max returned rows -> automodel
 *
 */

/**
 * A namespace for the BCD-UI inputField widget. For creation @see {@link bcdui.widget.createInputField}
 * @namespace bcdui.widget.inputField
 */
bcdui.util.namespace("bcdui.widget.inputField",
/** @lends bcdui.widget.inputField */
{
  /**
   * observable events
   */
  events : {
    /**
     * is fired on the INPUT field after a value has been updated from a list by mouse-click
     */
    UPDATED_BY_CLICK : "EV:bcdui.widget.inputField.UPDATED_BY_CLICK"
  },

  /**
   * The initialization function called by inputField.xslt.
   * For parameters, see widgetPackage.js
   * @function
   * @param {HTMLElement} htmlElement The element the input field is based on.
   * @private
   */
  init: function(e)
  {
    if (e.getAttribute("bcdOptionsModelXPath")) jQuery(e).addClass("bcdComboInputField");

    // Please note: for IE8 compatibility it is required to render input fields
    // as self closing elements with jQuery.

    jQuery(e).append(
      "<input"
      + (e.getAttribute("bcdIsPassword") == "true" ? " type='password'" : "")
      + bcdui.widget._domFromBcdAttribute(e, "bcdTabIndex", "tabindex")
      + bcdui.widget._domFromBcdAttribute(e, "bcdMaxLength", "maxlength")
      + "/>"
    ).addClass(e.getAttribute("bcdOptionsModelXPath") ? "bcdInputField bcdComboInputField" : "bcdInputField");
    var htmlElement = jQuery(e).children().last().get(0);
    bcdui.widget._moveBcdAttributes(e, htmlElement);
    bcdui.widget._bcdIdToDomId(htmlElement);

    // we need to split init and _initElement here due to grid custom input overlay implementation
    // with a new grid implementation this should split should be removed
    bcdui.widget.inputField._initElement(htmlElement);
  },
  
  /**
   * Common init function but currently kept as single-entry point for grid overlay input field 
   * @param {} htmlElement - inputField
   * @private
   */
  _initElement: function(htmlElement) {
    bcdui.widget._assureModelIdAndXPathAttributes( {htmlElement: htmlElement} );
    this._adjustDefaultParameters(htmlElement);
    var config = {
      element: htmlElement,
      targetModelId: htmlElement.getAttribute("bcdTargetModelId"),
      targetModelXPath: htmlElement.getAttribute("bcdTargetModelXPath"),
      optionsModelId: htmlElement.getAttribute("bcdOptionsModelId")  || "",
      optionsModelXPath: htmlElement.getAttribute("bcdOptionsModelXPath")  || "",
      optionsModelRelativeValueXPath: htmlElement.getAttribute("bcdOptionsModelRelativeValueXPath")  || "",
      optionsModelIsSuggestionOnly: htmlElement.getAttribute("bcdOptionsModelIsSuggestionOnly")  || "",
      additionalFilterXPath: htmlElement.getAttribute("bcdAdditionalFilterXPath")  || "",
      emptyValue: htmlElement.getAttribute("bcdEmptyValue") || (htmlElement.getAttribute("bcdOptionsModelId") ? "bcd_autoCompletionBox_emptyValue" : "" ),
      commitOnTabKey: htmlElement.getAttribute("bcdCommitOnTabKey") || "",
      isMandatory: htmlElement.getAttribute("bcdMandatory") == "true",
      wildcard: htmlElement.getAttribute("bcdWildcard")
    };

    // models contains all models EXCEPT the options model itself
    var models = bcdui.widget._extractModelsFromModelXPath(config.optionsModelXPath);
    if(models){
      // If there are additional models beside the input model, a combining model wrapper is created and
      // _createWrapperModel() overwrites config.optionsModelId and config.bcdOptionsModelXPath with this new combining model
      bcdui.widget._createWrapperModel(models, config, "widget/multiOptionsModelWrapper.xslt");
    }

    var isOptionsModelPresented = ! !config.optionsModelId.trim();

    // Init element (assure it has an id)
    bcdui.widget._cleanupHTMLElementId(htmlElement);

    // This is the listener on the targetModelXpath
    // If an options model is given, we need to wait until both model will be available,
    // because listener of this event handler is using both models
    bcdui.factory.objectRegistry.withReadyObjects({
      ids: isOptionsModelPresented
            ? [config.targetModelId, config.optionsModelId]
            : config.targetModelId,
      fn : function(){
        var targetModel = bcdui.factory.objectRegistry.getObject(config.targetModelId);
        var listener = new bcdui.widget.inputField.XMLListener({
          idRef: config.targetModelId,
          trackingXPath: config.targetModelXPath,
          htmlElementId: htmlElement.id
        });
        bcdui.factory.addDataListener(listener);
        bcdui.widget._registerHTMLElementListener(htmlElement, listener);
        // initial sync only when no data was injected yet
        if (jQuery("#" + htmlElement.id).val() == "")
          bcdui.widget.inputField._readDataFromXML(htmlElement.id);

        if (htmlElement.getAttribute("bcdEnableNavPath") != null && htmlElement.getAttribute("bcdEnableNavPath") == "true") {
          bcdui.widget.inputField.getNavPath(jQuery(htmlElement).parent().parent().attr("id"), function(id, value) {
            bcdui.widget._linkNavPath(id, value);
          }.bind(this));
        }
      }
    });

    bcdui._migPjs._$(htmlElement).parent().css({ visibility: "" });

    // Transfer value to targetModelXpath when field is left
    htmlElement.onchange = bcdui.widget.inputField._writeDataToXML.bind(undefined,htmlElement.id, false);

    // Custom event listener
    this._createBCDEventPublishers(htmlElement);

    // This is the listener on the options model (if present)
    if (isOptionsModelPresented)
    {

      // disable inputField as long as we don't have drop down masterdata ready
      if (typeof bcdui.factory.objectRegistry.getObject(config.optionsModelId) != "undefined" && ! bcdui.factory.objectRegistry.getObject(config.optionsModelId).isReady())
        bcdui._migPjs._$(htmlElement).prop("disabled", true);

      bcdui.widget.inputField._addDropDownListeners(htmlElement.id);

      bcdui.factory.objectRegistry.withReadyObjects({
          ids: config.optionsModelId,
          fn: function() {
            var _el = bcdui._migPjs._$(htmlElement.id);
            /* the IDs are not stable, so after potential redisplay they may be gone, in that case we dont consider them */
            if(! _el.length > 0){
              return;
            }
            if ("true" != _el.attr("bcdDisabled")) _el.prop("disabled", false);

            // Now that the optionsmodel is available, allow working with the drop.down arrow to open the list
            bcdui.widget.inputField._registerOptionsModelListeners(htmlElement.id);

            // Creates a listener on data changes to the original (or combined) options model to refresh the layout
            bcdui.factory.objectRegistry.getObject(config.optionsModelId).addStatusListener({  // TODO: Make sure the listener is not recreated when the same input field is recreated (same id), also/or deregister listener when inputfield is gone
              listener: function( optionsModelId, htmlElementId, statusEvent )
              {
                var optionsModel = bcdui.factory.objectRegistry.getObject(optionsModelId);
                var htmlElement = bcdui._migPjs._$(htmlElementId);
                if( !htmlElement.length > 0)
                  return;

                var loadingText = bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_autoCompletionBox_loading"}) || "Loading...";
                // If the value box exists and we are the owner, show "loading"
                // Could be that bcdAutoCompletionBox has never been opened but still dependent options model are being reloaded
                var valueBox = bcdui._migPjs._$("bcdAutoCompletionBox");
                if ( optionsModel.getStatus() != optionsModel.getReadyStatus() && valueBox.length > 0 && valueBox.attr("bcdHtmlElementId")==htmlElementId )
                  valueBox.html(loadingText);

                // When only values from the optionsmodel are allowed, we need to disable input during load of the optionsmodel
                // Because the order of model-events is not strict, we only depend on the actual state here, not on the event
                if( htmlElement.attr("bcdOptionsModelIsSuggestionOnly")!="true" ) {
                  if ( optionsModel.getStatus() == optionsModel.getReadyStatus() ) {
                    bcdui.widget.inputField._enableInputField(htmlElementId, true);
                  } else  {
                    bcdui.widget.inputField._disableInputField(htmlElementId, document.activeElement!=htmlElement.get(0) ? loadingText : null, true );
                  }
                }

                // For working with the models, we just want to depend on the status event send, because that one only comes ones
                if( statusEvent.status.equals( optionsModel.getReadyStatus() ) ) {
                  // remove old values from input field if they don't fit to the options model
                  bcdui.widget.inputField._readDataFromXML(htmlElementId,true);
                  bcdui.widget.inputField._updateDropDownList(htmlElementId,true,false);
                  bcdui.widget.inputField._moveSelection( {htmlElementId: htmlElementId, direction: 1, forceFirst: true } ); // Allow to select the top one by enter
                }

              }.bind(undefined, config.optionsModelId, htmlElement.id )
            });
          }
      });
      bcdui._migPjs._$(htmlElement).on("click", function(e) {
        bcdui.widget.inputField._updateDropDownList(this.id, false, true);
        bcdui.widget.inputField._moveSelection( {htmlElementId: this.id, direction: 1, forceFirst: true, ignoreIfSelected: true } );
      }.bind(htmlElement));
    } else {
      var onBlur = htmlElement.getAttribute("bcdOnBlur");
      if (onBlur) {
        bcdui._migPjs._$(htmlElement).on("blur", function() {
          eval(onBlur);
        }.bind(htmlElement));
      }
    }

    // Leaving the input field
    // Never leave the field empty when leaving, instead, fill it with the "empty message"
    bcdui._migPjs._$(htmlElement).on("blur", function()
    {
      // If we are working with wildcards ('*'), then having only wildcards means an empty filter
      var presetWithWc = htmlElement.getAttribute("bcdWildcard");
      if( presetWithWc && this.value.replace(/\*/g,"").length==0 ) {
        this.title = this.value = "";
      } else if( htmlElement.getAttribute("type")!="password" )
        this.title = this.value;

      // If the filter is empty, show the message
      if( this.value=="" ) {
        if( htmlElement.getAttribute("bcdEmptyValue")=="true" )
          this.title = this.value = bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_autoCompletionBox_emptyValue"});
        else if( htmlElement.getAttribute("bcdEmptyValue") && htmlElement.getAttribute("bcdEmptyValue")!="false" )
          this.title = this.value = bcdui.i18n.syncTranslateFormatMessage({msgid:htmlElement.getAttribute("bcdEmptyValue")});
        bcdui._migPjs._$(this).addClass("bcdInputEmptyValue");
      }
    }.bind(htmlElement));

    // On focus, remove the Empty message if necessary
    bcdui._migPjs._$(htmlElement).on("focus", function(e) {
      if( bcdui._migPjs._$(this).hasClass("bcdInputEmptyValue") ) {
        bcdui.widget.inputField._prepareForInput(this);
        if( this.getAttribute("bcdKeepOptionBoxClosedThisTime")!="true" )
          bcdui.widget.inputField._updateDropDownList(this.id, false, true);
        this.removeAttribute("bcdKeepOptionBoxClosedThisTime");
      }
    }.bind(htmlElement));

    // set cursor at the end position
    if( "true" == htmlElement.getAttribute("bcdSetCursorPositionAtEnd")){
      bcdui._migPjs._$(htmlElement).on("focus", function() {
        bcdui.widget.inputField._setCursorPosition(this);
      }.bind(htmlElement));
    }

    // if requested, let this input field get focus after creation
    if ("true" == htmlElement.getAttribute("bcdSetFocus")) {
      try{bcdui._migPjs._$(htmlElement).focus();}catch(e){bcdui.log.warn("error htmlElement.focus()" + e.message);}
      window.setTimeout(function() {
        try{
          bcdui._migPjs._$(htmlElement).focus();
        }catch(e){bcdui.log.warn("error htmlElement.focus()" + e.message);}
        if( bcdui.util.isFunction(htmlElement.select) ){
          htmlElement.select();
        }
        var onFocus = htmlElement.getAttribute("bcdOnFocus");
        if (onFocus) {
          eval(onFocus);
        }
      }, 50);
    }

    // check if mandatory
    if(config.isMandatory){
      bcdui.widget.inputField._validateMandatory(htmlElement);
      // re-check every time, the target changes
      bcdui.factory.addDataListener({
        idRef: config.targetModelId,
        trackingXPath: config.targetModelXPath,
        listener: function(){
          bcdui.widget.inputField._validateMandatory(htmlElement);
        }
      });
    }
    // add default <Please select>
  },

  /**
   * @private
   */
  _validateMandatory: function(htmlElementId){
    var el = bcdui._migPjs._$(htmlElementId);
    var targetModelId = el.attr("bcdTargetModelId");
    var xpath = el.attr("bcdTargetModelXPath");
    var doc = bcdui.factory.objectRegistry.getObject(targetModelId).getData();
    var node = doc.selectSingleNode(xpath);
    var hasValue = node!=null && node.text.trim().length

    if(!hasValue){
      el.addClass("bcdInvalid");
    }else{
      el.removeClass("bcdInvalid");
    }
  },

    /**
     * Prepares the input field for data input, especially when no value is selected
     * I.e. remove any user-hint and possibly set * according to wildcards
     * @private
     */
    _prepareForInput: function( /*HTMLElement or ID*/ elementOrId, newText )
    {
      var el = bcdui._migPjs._$(elementOrId);
      if( ! el.length > 0 ){
        return; // no element - no action
      }

      // Wildcards: We may want to preset the empty field with wildcards (which the user can later edit)
      var selStart;
      if( typeof el.get(0).selectionStart != "undefined" ) {
        selStart = el.hasClass("bcdInputEmptyValue") ? null : el.get(0).selectionStart;
      } else { // IE <= 8
        var r = (document.getSelection ? document.getSelection() : document.selection).createRange().duplicate(); // document.selection is for IE <= 8
        r.moveEnd('character', -el.get(0).value.length);
        selStart = (r.text == '') ? el.get(0).value.length : el.get(0).value.lastIndexOf(r.text);
      }

      if( el.hasClass("bcdInputEmptyValue") || newText != undefined ) {
        newText = newText || "";
        var pos = 0;

        var presetWithWc = el.attr("bcdWildcard") || "";
        if( presetWithWc=="startswith" ) {
          newText = newText + (newText.endsWith("*") ? "" : "*");
          pos = selStart ? selStart : 0;
        } else if( presetWithWc=="endswith" ) {
          var offset = newText.startsWith("*") ? 0 : 1;
          newText = (newText.startsWith("*") ? "" : "*") + newText;
          pos = selStart ? selStart+offset : 1;
        } else if(presetWithWc=="contains") {
          var offset = newText.startsWith("*") ? 0 : 1;
          newText = (newText.startsWith("*") ? "" : "*") + newText + (newText.endsWith("*") ? "" : "*");
          pos = selStart ? selStart+offset : 1;
        } else {
          pos = newText.length;
        }

        el.attr("title", newText);
        el.get(0).value = newText;
        bcdui.widget.inputField._setCursorPosition( el.get(0), pos );
        el.removeClass("bcdInputEmptyValue");
      }
    },

    /**
     *  the hideOnClickListener is registered in _updateOptions and de-registered in _hideOptions.
     *  it closes the popup box if the user clicks somewhere in the web page
     *  @private
     */
    _hideOnClickListener: function(event){
      var valueBox = jQuery("#bcdAutoCompletionBox");
      var htmlElementId = valueBox.attr("bcdHtmlElementId");
      var elem = bcdui._migPjs._$(htmlElementId);
      // stop observing in case our target element is gone
      if(!elem.length > 0){
        jQuery(document).off('mousedown',bcdui.widget.inputField._hideOnClickListener);
        return;
      }
      // if click on any place outside valuebox or click on options element
      // valueBox == event.element() means that click on scrollbar

      // IE triggers a blur on a click inside the options, we do flag a scrollbar click
      // here so other blur handlers (e.g. grid) can differ between a real closing options event and a scrollbar click
      if (valueBox.get(0) != event.target) {
        if(htmlElementId && event && ((typeof event.target) != 'undefined') && ! jQuery.contains(elem.get(0).parentNode, event.target)){
          bcdui.widget.inputField._hideOptions(htmlElementId,elem.attr("bcdOptionsModelIsSuggestionOnly")!="true",1);
        }
      }
      else
        valueBox.attr("bcdScrollBarClick", "true");
    },

    /**
     * sets cursor at the end of value of the HTML Element
     * @private
     * @param elementOrId
     */
    _setCursorPosition: function( /*HTMLElement or ID*/ elementOrId, newPos ){
      var el = bcdui._migPjs._$(elementOrId);
      if( ! el.length > 0 ){
        return; // no element - no action
      }
      var pos = typeof newPos != "undefined" ? newPos : el.get(0).value.length;
      try{
        if(bcdui.browserCompatibility.isIE && el.get(0).createTextRange){
          var range = el.get(0).createTextRange();
          range.collapse(true);
          range.moveEnd('character', pos);
          range.moveStart('character', pos);
          range.select();
        }
        else if(el.get(0).setSelectionRange){// FF, Chrome
          el.get(0).setSelectionRange(pos,pos);
        }
      }catch(e){
        ; // swallow but report in console
        window.console&&window.console.error("inputFieldPackage.js: failed to _setCursorPosition()", e);
      }
    },

    /**
     * @private
     */
    _enableInputField: function(htmlElementId, noAction){
      var element = bcdui._migPjs._$(htmlElementId);
      if (element) element.attr("bcdDisabled", "false");
      clearTimeout( bcdui.widget.inputField._loadingTimer[htmlElementId] );
      if (noAction !== true) // Sometimes, we cannot really en/disable the input field in some cases here, because (in IE) it looses focus then
        element.prop("disabled", false);
      bcdui.widget.inputField._registerOptionsModelListeners(htmlElementId);
      // re-add dropdownlisteners
      bcdui.widget.inputField._removeDropDownListeners(htmlElementId);
      bcdui.widget.inputField._addDropDownListeners(htmlElementId);
    },

    /**
     * A delete input in that cases triggers a page-back
     * @private
     */
    _disableInputField: function(htmlElementId, disableValue, noAction){
      var element = bcdui._migPjs._$(htmlElementId);
      if (element) element.attr("bcdDisabled", "true");
      if (noAction !== true) // Sometimes, we cannot really disable the input field in some cases here, because (in IE) it looses focus then
        element.prop("disabled", true);
      bcdui.widget.inputField._deRegisterOptionsModelListeners(htmlElementId);
      bcdui.widget.inputField._removeDropDownListeners(htmlElementId);
      // We do delay the loading message a bit, just short enough so that the user will see it soon but long enough to prevent
      // flickering in cases where it soon comes out that the value entered is still valid
      clearTimeout( bcdui.widget.inputField._loadingTimer[htmlElementId] );
      bcdui.widget.inputField._loadingTimer[htmlElementId] = setTimeout( function() {
          if (disableValue ){ element.attr("title", disableValue); element.value = disableValue; }
        }, 500 );
    },

  /**
   * Helper to convert callback code-strings to functions
   * @private
   */
  _getAttributeAsJSFunction: function(/* HTMLElement */ htmlElement, /* String */ attributeName)
    {
      var code = htmlElement.getAttribute(attributeName);
      if (! code ) return null;
      return function() {
        eval(code);
      }
    },

  /**
   * Add custom onSomething handlers
   * @private
   */
  _createBCDEventPublishers: function(/* HTMLElement */ htmlElement)
    {
      var onEscKey = this._getAttributeAsJSFunction(htmlElement, "bcdOnEscKey");
      var onEnterKey = this._getAttributeAsJSFunction(htmlElement, "bcdOnEnterKey");
      var onTabKey = this._getAttributeAsJSFunction(htmlElement, "bcdOnTabKey");
      if (onEnterKey != null || onTabKey != null || onEscKey != null) {
        bcdui._migPjs._$(htmlElement).on("keydown", function(evt) {
          if (evt.keyCode == bcdui.util.Event.KEY_TAB && onTabKey != null ) {
            /*
             * In case of TAB and RETURN we want to save the value, no matter what the
             * following key handler does (e.g. leaving the cell in the grid editor).
             */
            this.onchange();
            evt.stopPropagation();
            evt.preventDefault();
            if (onTabKey != null) {
              onTabKey.apply(htmlElement);
            }
          } else if (evt.keyCode == bcdui.util.Event.KEY_ESC && onEscKey != null) {
            evt.stopPropagation();
            evt.preventDefault();
            onEscKey.apply(htmlElement);
          } else if (evt.keyCode == bcdui.util.Event.KEY_RETURN && onEnterKey != null) {
            evt.stopPropagation();
            evt.preventDefault();// we consume the event in onkeyUp because of IE6
          }
        }.bind());

        if(onEnterKey){
          bcdui._migPjs._$(htmlElement).on("keyup", function(evt) {
            if(evt.keyCode == bcdui.util.Event.KEY_RETURN){// ENTER
              if(bcdui.widget.inputField._areOptionsVisible(htmlElement.id)){
                return;
              }
              this.onchange();
              evt.stopPropagation();
              evt.preventDefault();
              onEnterKey.apply(htmlElement);
            }
          }.bind());
        }
      }
    },

  /**
   * Fills the input field with the value from its targetModelXPath
   * If that value is not valid according to the current options model, that value is cleared also from targetModelXpath
   * Takes care for caption handling
   * @private
   */
  _readDataFromXML: function( htmlElementId, isTriggeredByOptionsModel )
    {
      var htmlElement = document.getElementById(htmlElementId);
      if (htmlElement){

        bcdui.factory.objectRegistry.withReadyObjects(htmlElement.getAttribute("bcdOptionsModelId"), function() {

          // re-check if element is still present (e.g. grid drop down is a candidate for temporary input fields)
          if (document.getElementById(htmlElementId) == null)
            return;

          var optionsModel = bcdui.factory.objectRegistry.getObject(htmlElement.getAttribute("bcdOptionsModelId"));
          var keepEmptyValueExpression = (htmlElement.getAttribute("bcdKeepEmptyValueExpression") == "true");
          var targetModel = bcdui.factory.objectRegistry.getObject(htmlElement.getAttribute("bcdTargetModelId"));
          var targetModelXPath = htmlElement.getAttribute("bcdTargetModelXPath");
          var result = bcdui.widget._getDataAndCaptionFromXML(targetModel, targetModelXPath);
          var newV = null;
  
          // Which value to use.
          var multilevelRequestNode = optionsModel ? optionsModel.getData().selectSingleNode("/*/wrs:RequestDocument/wrq:WrsService[@serviceName='BcdMultiLevelSuggest']") : null;
          if( multilevelRequestNode ) { // Multilevel select
            // While searching, keep the value shown
            if( isTriggeredByOptionsModel || htmlElement.value ) {
              newV = htmlElement.value;
            } else 
            {
              // Otherwise, on page load, concatenate the filter values to a text, possible separated with levelSeparator
              var exprNodes = targetModel.getData().selectNodes(targetModelXPath+"/f:Expression");
              newV = "";
              var levelSeparator = multilevelRequestNode.selectSingleNode("wrq:SearchExpression/@levelSeparator");
              for( var e=0; e<exprNodes.length; e++ ) {
                newV += exprNodes.item(e).getAttribute("caption") || exprNodes.item(e).getAttribute("value");
                if( e<exprNodes.length-1 )
                  newV += " "+(levelSeparator.nodeValue ? levelSeparator.nodeValue+" " : "");
              }
            }
          } else if( (isTriggeredByOptionsModel && htmlElement.getAttribute("bcdWildcard") && htmlElement.value.indexOf("*")!=-1)
              || (htmlElement.value && htmlElement.getAttribute("bcdOptionsModelIsSuggestionOnly")=="true") ) {
            newV = htmlElement.value; // While editing or if suggestion only (and we are not empty, which is initializing), the value in the field is always ok
          } else if( !result.value ) {
            newV = "";
          } else if( htmlElement.getAttribute("bcdOptionsModelIsSuggestionOnly")=="true" ) {
            newV = result.value;  // Take whatever value found
          } else if( result.value && !bcdui.widget._findValueInOptionsModel(htmlElementId,result.value)
                     && !targetModel.getData().selectSingleNode("/wrs:Wrs") ) {

            // If the value is not longer allowed according to the new options model, clean it from targetXPath
            // in case using a caption/value options model, also remove the caption attribute
            var targetNode = targetModel.getData().selectSingleNode(targetModelXPath);
            var isAttribute = targetNode && targetNode.nodeType==2;

            if (bcdui.widget.inputField._useCaptions(htmlElement)) {
              var xPath = isAttribute ? targetModelXPath.substring(0,targetModelXPath.lastIndexOf("@")-1) : targetModelXPath;
              targetNode = targetModel.getData().selectSingleNode(xPath);
              if (targetNode)
                targetNode.removeAttribute("caption");
            }
            if (isAttribute && !keepEmptyValueExpression)
              // remove full node when targetXPath points to an attribute (e.g. /*/f:Filter/f:Expression[@bRef = 'country' and @op = '=']/@value)
              // remove only attribute when keepEmptyValueExpression if given
              bcdui.core.removeXPath(targetModel, targetModelXPath.substring(0,targetModelXPath.lastIndexOf("@")-1));
            else
              bcdui.core.removeXPath(targetModel, targetModelXPath);
            targetModel.fire();
            result.caption = result.value = null;
            newV = "";
          } else if ( bcdui.widget.inputField._useCaptions(htmlElement)) {
            newV = result.caption = bcdui.widget._getCaptionOfValue(htmlElementId, result.value);
          } else
            newV = result.value;
  
          var gotFocus = document.activeElement != null && document.activeElement.id == htmlElement.id;
  
          if (! gotFocus && newV == "" && htmlElement.getAttribute("bcdOptionsModelId") ) {
            if( htmlElement.getAttribute("bcdEmptyValue")=="true" )
              newV = bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_autoCompletionBox_emptyValue"});
            else if( htmlElement.getAttribute("bcdEmptyValue") && htmlElement.getAttribute("bcdEmptyValue")!="false" )
              newV = bcdui.i18n.syncTranslateFormatMessage({msgid:htmlElement.getAttribute("bcdEmptyValue")});
            else
              newV = "";
            bcdui._migPjs._$(htmlElement).addClass("bcdInputEmptyValue");
          } else if( newV == "" ) {
            bcdui._migPjs._$(htmlElement).addClass("bcdInputEmptyValue");
          } else {
            bcdui._migPjs._$(htmlElement).removeClass("bcdInputEmptyValue");
          }
          if(htmlElement.getAttribute("bcdAutofit")=="true"){
            var old = htmlElement.value;
            if(newV != "" && old != newV){
              htmlElement.size=newV.length;
            }
          }
  
          // Do not change if value is still valid.
          // Would re-position the cursor (after refresh of options model for example)
          if( htmlElement.value != newV )
            htmlElement.title = htmlElement.value = newV;
        });
      }
    },
    
//    _setNewValue : function(htmlElement, newV) {
//      
//    },

  /**
   * destroys the widget
   * @private
   */
  _destroy : function(elementOrId){
    // TODO add deep tidy up
    var el = bcdui._migPjs._$(elementOrId);
    if(el.length > 0){
      el.attr("bcdIsDestroyed","true");
    }
  },

  /**
   * Transfers the data entered (or selected from drop-down) in the chooser to the targetModelXpath
   * Will translate the caption given in the input field into the value based on the options-model, if necessary
   * If no match for caption was found in options model, value (in input field and target model) is set to empty
   * Does handle standard and Wrs target models (i.e. create wrs:M)
   * @param htmlElementId
   * @param isUpdatedByClick - should be true in case this function is called because a list-item was clicked
   * @private
   */
  _writeDataToXML: function(htmlElementId, isUpdatedByClick)
    {
      var htmlElement = document.getElementById(htmlElementId);
      if(htmlElement.getAttribute("bcdIsDestroyed") == "true"){
        return;
      }
      var targetModel = bcdui.factory.objectRegistry.getObject(htmlElement.getAttribute("bcdTargetModelId"));
      var targetModelXPath = htmlElement.getAttribute("bcdTargetModelXPath");
      var keepEmptyValueExpression = (htmlElement.getAttribute("bcdKeepEmptyValueExpression") == "true");
      var isWritten=false;

      // Handling for a drop-down single select, find which value to write to tatgetModel
      var optionsModel = bcdui.factory.objectRegistry.getObject(htmlElement.getAttribute("bcdOptionsModelId"));
      if( optionsModel && optionsModel.isReady() && optionsModel.getData().selectSingleNode("/*/wrs:RequestDocument/wrq:WrsService[@serviceName='BcdMultiLevelSuggest']") ) {
        var optionsModelXPath = htmlElement.getAttribute("bcdOptionsModelXPath") || "";
        var caption = htmlElement.value;
        var cellNodes = optionsModel.getData().selectNodes("/*/wrs:Data/wrs:R[@id='"+htmlElement.getAttribute("bcdSelectedRowId")+"']/wrs:C");
        bcdui.core.removeXPath(targetModel, targetModelXPath);
        // Do we have a match or do we leave the field while not having a match?
        if( cellNodes.length > 0 )
        {
          // Update the targetNode
          var node = bcdui.core.createElementWithPrototype(targetModel, targetModelXPath);
          var headerNodes = optionsModel.getData().selectNodes("/*/wrs:Header/wrs:Columns/wrs:C");
          for( var c=0; c<cellNodes.length; c++ ) {
            var colVal = cellNodes.item(c).text;
            if( colVal.trim().length === 0 )
              continue;
            var expr = bcdui.core.browserCompatibility.appendElementWithPrefix(node, "f:Expression")
            expr.setAttribute( "bRef",  headerNodes.item(c).getAttribute("id") );
            expr.setAttribute( "op",    "=" );
            expr.setAttribute( "value", colVal );
            var cellCaption = cellNodes.item(c).getAttribute("caption");
            if( cellCaption )
              expr.setAttribute( "caption", cellCaption );
            node.appendChild(expr);
          }
        } else {
          htmlElement.title = htmlElement.value = "";
        }
        bcdui.wkModels.guiStatus.fire();
      } else if( htmlElement.getAttribute("bcdOptionsModelIsSuggestionOnly")=="true" ) {
        isWritten=bcdui.widget._copyDataFromHTMLElementToTargetModel(targetModel, targetModelXPath, htmlElement.value , keepEmptyValueExpression );
      } else if (bcdui.widget.inputField._useCaptions(htmlElement)){
        var caption = htmlElement.value;
        var value = bcdui.widget._getValueOfCaption(htmlElementId, htmlElement.value);
        isWritten=bcdui.widget._copyDataAndCaptionFromHTMLElementToTargetModel(targetModel, targetModelXPath, value, caption ,  keepEmptyValueExpression);
        // in case of unmatched value we clear the input on the element
        if(value == null ){
          htmlElement.title = htmlElement.value = "";
        }
      } else { // Handling for plain input fields
        isWritten=bcdui.widget._copyDataFromHTMLElementToTargetModel(targetModel, targetModelXPath, htmlElement.value , keepEmptyValueExpression );
      }
      bcdui.widget.inputField._writeAdditionalFilter(htmlElementId);
      if(isWritten && isUpdatedByClick){
        bcdui._migPjs._$(htmlElement).trigger(bcdui.widget.inputField.events.UPDATED_BY_CLICK);
      }
    },

  /**
   * Determine whether we have to deal with value/caption pares from an options model
   * @private
   */
    _useCaptions: function(htmlElement){
      if (htmlElement != null ) {
        return (( htmlElement.getAttribute("bcdOptionsModelId") ) &&
               (  htmlElement.getAttribute("bcdOptionsModelXPath") ) &&
               (  htmlElement.getAttribute("bcdOptionsModelRelativeValueXPath") ));
      }
      return false;
    },

  /**
   * Register events on the drop down arrow (mouse, key, arrow drop down)
   * @private
   */
  _registerOptionsModelListeners: function(htmlElementId)
    {
      var htmlElement = document.getElementById(htmlElementId);
      if (htmlElement != null && !htmlElement.__ifp_registered) {
        htmlElement.__ifp_registered = true;
        htmlElement = bcdui._migPjs._$(htmlElement);
        htmlElement.on("keydown", bcdui.widget.inputField._keyDown.bind(undefined,htmlElement.get(0).id));
        htmlElement.on("keyup", bcdui.widget.inputField._keyUp.bind(undefined,htmlElement.get(0).id));
      }
    },

    /**
     * @private
     */
    _addDropDownListeners: function(htmlElementId) {
      var htmlElement = jQuery("#" + htmlElementId);
      var dropDownImage = htmlElement.next('span');
      if (! dropDownImage.length > 0)
        dropDownImage = jQuery(htmlElement.get(0).parentNode.appendChild(document.createElement("span")));
      dropDownImage.attr("disabled", false);
      dropDownImage.removeClass("bcdDisabled");
      dropDownImage.on("mousedown", function() {dropDownImage.addClass("bcdDropDownClicked")});
      dropDownImage.on("mouseleave", function() {dropDownImage.removeClass("bcdDropDownClicked")});
      dropDownImage.on("click", function() {
        dropDownImage.removeClass("bcdDropDownClicked");
        if (htmlElement.get(0).__ifp_registered)
          bcdui.widget.inputField._toggleOptions(htmlElementId, true);
      });
    },
    /**
     * @private
     */
    _removeDropDownListeners: function(htmlElementId) {
      var htmlElement = jQuery("#" + htmlElementId);
       var dropDownImage = htmlElement.next('span');
       var dropDownEvents = ['mousedown', 'mouseleave', 'click' ];
       if (dropDownImage.length > 0) {
         dropDownEvents.forEach(function(e){ dropDownImage.off(e);});
         dropDownImage.attr("disabled", true);
         dropDownImage.addClass("bcdDisabled");
       }
    },

   /**
    * Deregister events on the drop down box
    * @private
    */
   _deRegisterOptionsModelListeners: function (htmlElementId)
   {
     var inputEvents = ['keydown','keyup'];
     var htmlElement = bcdui._migPjs._$(htmlElementId);
     if (htmlElement.length > 0) {
       htmlElement.prop("__ifp_registered", false);
       inputEvents.forEach(function(e){ htmlElement.off(e);})
     }
   },

  /**
   * Internet Explorer focus bug workaround method.
   * @private
   */
  _ieWorkaround_onMouseOverValueBox: function(htmlElementId)
    {
      if (typeof bcdui.widget.inputField._timer != "undefined") {
        delete bcdui.widget.inputField._timer;
        window.clearTimeout(bcdui.widget.inputField._timer);
      }
      var valueBox = document.getElementById("bcdAutoCompletionBox");
      if (valueBox != null) {
        valueBox.setAttribute("bcdPreventHidingFor", htmlElementId);
      }
    },

  /**
   * Toggle hide / show options drop down
   * @private
   */
  _toggleOptions: function(htmlElementId, noFilter)
    {
      var valueBox = jQuery("#bcdAutoCompletionBox");
      if (!valueBox.length > 0 || valueBox.attr("bcdHtmlElementId") != htmlElementId || !valueBox.is(":visible")) {
        bcdui.widget.inputField._prepareForInput( htmlElementId );
        bcdui.widget.inputField._writeAdditionalFilter( htmlElementId, 0 );
        bcdui.widget.inputField._updateDropDownList(htmlElementId, noFilter,true);
      } else {
        bcdui.widget.inputField._hideOptions(htmlElementId,bcdui._migPjs._$(htmlElementId).attr("bcdOptionsModelIsSuggestionOnly")!="true",1);
        if (bcdui.util.isFunction(bcdui._migPjs._$(htmlElementId).select)) bcdui._migPjs._$(htmlElementId).select();
      }
    }
    ,

  /**
   * @private
   */
  _keyUp: function(htmlElementId, event)
    {
      switch (event.keyCode) {
        case bcdui.util.Event.KEY_RETURN:
          bcdui.widget.inputField._hideOptions(htmlElementId,true,0); // Use ESC to not choose from the drop down
          break;

        // Handled on key-down
        case bcdui.util.Event.KEY_ESC:
        case bcdui.util.Event.KEY_UP:
        case bcdui.util.Event.KEY_DOWN:
        case bcdui.util.Event.KEY_PAGEUP:
        case bcdui.util.Event.KEY_PAGEDOWN:
        case 113: // F2
          break;

        default:
          // Update list, then allow to selecting the first entry by enter when we entered enough to get the right one to the top
          bcdui.widget.inputField._updateDropDownList(htmlElementId,false,true)
          bcdui.widget.inputField._moveSelection( {htmlElementId: htmlElementId, direction: 1, forceFirst: true, ignoreIfSelected: true} );
          var htmlElement = bcdui._migPjs._$(htmlElementId);

          // On DEL, BACKSPACE at the end: re-add wildcards, unless a wildcard itself was deleted
          if( (event.keyCode==bcdui.util.Event.KEY_BACKSPACE || event.keyCode==bcdui.util.Event.KEY_DELETE) && htmlElement.attr("bcdAdditionalFilterXPath") ) {
            if( bcdui.widget.inputField._valueOnKeyDownSingleton.charAt(bcdui.widget.inputField._valueOnKeyDownSingleton.length-1)!="*" )
              bcdui.widget.inputField._prepareForInput( htmlElementId, htmlElement.get(0).value );
          }

          // If the value changed, refilter options
          bcdui.widget.inputField._writeAdditionalFilter(htmlElementId);

          htmlElement.attr("title", htmlElement.get(0).value);
          break;
      }
    },

    /**
     * InputField- Singleton for server-options refresh time
     * @private
     */
    _additionalFilterTimer: {},
    _loadingTimer: {},

    /**
     * Can be used to reload the options model from the server based on the value of the input field
     * @private
     */
    _writeAdditionalFilter: function( htmlElementId, delay)
    {
      var htmlElement = bcdui._migPjs._$(htmlElementId);
      if( !htmlElement.attr("bcdAdditionalFilterXPath") )
        return;
      var minInactivityTime = typeof delay != "undefined" ? delay : 500;

      // We only write it if it actually changed,
      // and if there is no new request to write it within 500ms, so it is not updated per key but during a short pause after several keys
      if( typeof bcdui.widget.inputField._additionalFilterTimer[htmlElementId] != "undefined" )
        clearTimeout(bcdui.widget.inputField._additionalFilterTimer[htmlElementId]);
      bcdui.widget.inputField._additionalFilterTimer[htmlElementId] =
        setTimeout(
            function( additionalFilterModelId, additionalFilterXPath, newValue, wildcard, optionsModelId ) {
              var aFXNode = bcdui.core.createElementWithPrototype( bcdui.factory.objectRegistry.getObject(additionalFilterModelId).getData(), additionalFilterXPath );

              // We avoid loading the data from the server, if we only further restrict the data and have loaded all data fitting the search expression last time
              var optionsModel = bcdui.factory.objectRegistry.getObject(optionsModelId);
              var maxExceeded = optionsModel ? optionsModel.getData().selectSingleNode("/*/wrs:Footer/wrs:MaxRowsExceeded[text()='true']") : null;
              if( ( !!aFXNode.nodeValue && newValue.trim() === aFXNode.nodeValue.trim() ) ||
                  ( !!aFXNode.nodeValue && newValue.startsWith(aFXNode.nodeValue) && (!wildcard || wildcard==="startswith") && !maxExceeded && aFXNode.nodeValue.length>2 ) ) {
                bcdui.widget.inputField._readDataFromXML(htmlElementId,true);
                bcdui.widget.inputField._updateDropDownList(htmlElementId,false,false);
                bcdui.widget.inputField._moveSelection( {htmlElementId: htmlElementId, direction: 1, forceFirst: true } ); // Allow to select the top one by enter
              } else {
                aFXNode.nodeValue = newValue;
                bcdui.wkModels.guiStatus.fire();
              }
            }.bind( undefined, htmlElement.attr("bcdAdditionalFilterModelId"), htmlElement.attr("bcdAdditionalFilterXPath"),
                htmlElement.prop("value"), htmlElement.attr("bcdWildcard"), htmlElement.attr("bcdOptionsModelId") ),
            minInactivityTime );
    },

  /**
   * Input field value during key_down.
   * Used to transport information from key_down to key_up, thats why a singleton is enough
   * @private
   */
  _valueOnKeyDownSingleton: "",

  /**
   * @private
   */
  _keyDown: function(htmlElementId, event)
    {
      if(! bcdui._migPjs._$(htmlElementId).length > 0){
        return;
      }
      bcdui.widget.inputField._valueOnKeyDownSingleton = bcdui._migPjs._$(htmlElementId).get(0).value;
      switch (event.keyCode) {
        case bcdui.util.Event.KEY_DOWN: {
          bcdui.widget.inputField._moveSelection( {htmlElementId: htmlElementId, direction: 1} );
          break;
        }
        case bcdui.util.Event.KEY_UP: {
          bcdui.widget.inputField._moveSelection( {htmlElementId: htmlElementId, direction: -1} );
          break;
        }
        case bcdui.util.Event.KEY_PAGEDOWN: {
          bcdui.widget.inputField._moveSelection( {htmlElementId: htmlElementId, direction: 1} );
          break;
        }
        case bcdui.util.Event.KEY_PAGEUP: {
          bcdui.widget.inputField._moveSelection( {htmlElementId: htmlElementId, direction: -1} );
          break;
        }
        case bcdui.util.Event.KEY_RETURN: {// consume the event in keyUp because of IE6
          event.stopPropagation();
          event.preventDefault();
          break;
        }
        case bcdui.util.Event.KEY_TAB:
          bcdui.widget.inputField._hideOptions(htmlElementId, bcdui._migPjs._$(htmlElementId).attr("bcdCommitOnTabKey")=="true"||bcdui._migPjs._$(htmlElementId).attr("bcdClearOption")=="false", 2);
          break;
        case bcdui.util.Event.KEY_ESC:
          bcdui.widget.inputField._hideOptions(htmlElementId, false, 0);
          break;
      }
    },

  /**
   * @private
   */
  _getSelectedElement: function(htmlElementId)
    {
      var valueBox = jQuery("#bcdAutoCompletionBox");
      if (valueBox.length > 0 && valueBox.attr("bcdHtmlElementId") == htmlElementId) {
        var selectedElements = valueBox.find(".bcdSelected");
        if (selectedElements.length > 0) {
          return selectedElements[0];
        }
      }
      return null;
    },

  /**
   * @private
   */
  _setSelectedElement: function(htmlElementId, anchor)
    {
      var valueBox = jQuery("#bcdAutoCompletionBox");
      if (valueBox.length > 0 && valueBox.attr("bcdHtmlElementId") == htmlElementId) {
        var selectedElements = valueBox.find(".bcdSelected");
        if (selectedElements.length > 0) {
          jQuery(selectedElements[0]).removeClass("bcdSelected");
        }
        bcdui._migPjs._$(anchor).closest("div").addClass("bcdSelected");
      }
      return null;
    },

  /**
   * Allows to move the selection relative to its current position within the options drop down
   * forceFirst will set the selection to the first entry.
   * @private
   */
  _moveSelection: function( args )
    {
      var valueBox = jQuery("#bcdAutoCompletionBox");
      if (valueBox.length > 0 && valueBox.attr("bcdHtmlElementId") == args.htmlElementId) {
        var nextElement = null;

        var selectedElements = valueBox.find(".bcdSelected");
        if (selectedElements.length > 0) {
          // if we have a selection and are asked to ingore then we skip moving
          if(args.ignoreIfSelected){
            return;
          }
          var boxheight = valueBox.height();
          var height    = jQuery(valueBox.children()[0]).height();
          nextElement = (args.direction > 0) ? bcdui.util.xml.nextElementSibling(selectedElements[0]) : bcdui.util.xml.previousElementSibling(selectedElements[0]);
          selectedElements[0].className = "";
        }

        // Behaviour when reaching the end of the list
        // When walking +-1, we flip to the other end of the list, when jumping we set us to the end in the direction we jumped
        if (nextElement == null) {
          if (args.direction <0 )
            nextElement = bcdui.util.xml.firstElementChild(valueBox.get(0));
          else
            nextElement = bcdui.util.xml.lastElementChild(valueBox.get(0));
        }

        if (args.forceFirst) {
          nextElement = bcdui.util.xml.firstElementChild(valueBox.get(0));
          var htmlElement = document.getElementById(args.htmlElementId);
          if (htmlElement != null && htmlElement.getAttribute("bcdClearOption") && htmlElement.getAttribute("bcdClearOption")!="false" )
            nextElement = bcdui.util.xml.nextElementSibling(nextElement,1);
        }

        if(nextElement){
          bcdui._migPjs._$(nextElement).addClass("bcdSelected");
          bcdui.widget.inputField._scrollElement(valueBox.get(0), nextElement);
        }
      }
    },

    /**
     * scrolls the div so that current selected element is visible
     * @private
     */

    _scrollElement: function( valueBox, element){
      var vb = bcdui._migPjs._$(valueBox) 
      var el = bcdui._migPjs._$(element)
      var boxheight = vb.height();
      var height    = el.height();
      var top       = bcdui.util.positionedOffset(el.get(0)).top;
      if ( top +  height + 10  - vb.get(0).scrollTop >  boxheight ){
        vb.get(0).scrollTop = top;
        return;
      }else if ( top < vb.get(0).scrollTop ){
        vb.get(0).scrollTop = top - boxheight;
        return;
      }
    },


  /**
   * Close th options box.
   * setValue defines whether the value currently selected in the option box is used as out new value
   * focus can be
   *   0 for set focus
   *   1 for set focus but do not show option box this time
   *   2 for do not set focus on input field
   * @private
   */
  _hideOptions: function(htmlElementId, /* Boolean default true*/ setValue, focus, isSelectedByClick)
    {
      // unregister the click listener
      jQuery(document).off('mousedown',bcdui.widget.inputField._hideOnClickListener);

      var valueBox =  bcdui._migPjs._$("bcdAutoCompletionBox");
      valueBox.removeAttr("bcdScrollBarClick");  // we close the box, so we can also remove the scrollBar flag

      var htmlElement = document.getElementById(htmlElementId);
      if (valueBox.length > 0 && valueBox.attr("bcdHtmlElementId") == htmlElementId) {
        valueBox.hide();
        if (!(setValue == false)) {
          var selectedElement = bcdui.widget.inputField._getSelectedElement(htmlElementId);
          if (selectedElement != null) {
            if(htmlElement){
	            htmlElement.removeAttribute( "bcdSelectedRowId" );
              if (selectedElement.getAttribute("bcd_autoCompletionBox_emptyValue") == "true") {
                if ( htmlElement.getAttribute("bcdOptionsModelId") ){
                  var text = "";
                  if( htmlElement.getAttribute("bcdEmptyValue")=="true" )
                    text = bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_autoCompletionBox_emptyValue"});
                  else if( htmlElement.getAttribute("bcdEmptyValue") && htmlElement.getAttribute("bcdEmptyValue")!="false" )
                    text = bcdui.i18n.syncTranslateFormatMessage({msgid:htmlElement.getAttribute("bcdEmptyValue")});
                  htmlElement.title = htmlElement.value = text;
                  bcdui._migPjs._$(htmlElement).addClass("bcdInputEmptyValue");
                }
              } else {
                htmlElement.title = htmlElement.value = bcdui._migPjs._$(selectedElement).text();
                htmlElement.setAttribute( "bcdSelectedRowId", selectedElement.getAttribute("rowId") );
              }
              bcdui.widget.inputField._writeDataToXML(htmlElementId, isSelectedByClick);
            }
          }
        } else if( htmlElement.getAttribute("bcdOptionsModelIsSuggestionOnly")=="true" ){
          bcdui.widget.inputField._writeDataToXML(htmlElementId, isSelectedByClick);
        }

        if( focus!=2 ) {
          window.setTimeout(
            function(){
              try {
                if( focus==1 )
                  bcdui._migPjs._$(htmlElementId).attr("bcdKeepOptionBoxClosedThisTime","true");
                bcdui._migPjs._$(htmlElementId).focus();
              } catch (e) {
                bcdui.log.warn("exception in inputFieldPackage _hideOptions:" + e.message);
              }
          } , 1);
        }
        valueBox.get(0).removeAttribute("bcdHtmlElementId");
      }
    },

  /**
   * @private
   */
  _areOptionsVisible: function(htmlElementId)
    {
      var valueBox = bcdui._migPjs._$("bcdAutoCompletionBox");
      if (valueBox.length > 0  && valueBox.attr("bcdHtmlElementId") == htmlElementId) {
        return valueBox.is(":visible");
      }
      return false;
    },

  /**
   * Adjusts the list of options shown in the drop down
   * based on the list in the options model (no server request) and the fragment entered in the input field
   * And shows the drop-down selection box
   *
   * @private
   */
  _updateDropDownList: function(htmlElementId, noFilter, doClaimForThisInput )
    {
      var htmlElement = document.getElementById(htmlElementId);

      // used in grid, the htmlElement does not necessarily exist anymore, so
      // also check for its existence.
      if( ! htmlElement || ! htmlElement.getAttribute("bcdOptionsModelId") )
        return;

      // First time we may need to create the singleton #bcdAutoCompletionBox
      var valueBox = jQuery("#bcdAutoCompletionBox");
      if (! valueBox.length > 0) {
        valueBox = jQuery(bcdui.widget._createTopLevelElement({ htmlElementId: "bcdAutoCompletionBox" }));
        if (bcdui.browserCompatibility.isIE) {
          valueBox.on("mouseenter", bcdui.widget.inputField._ieWorkaround_onMouseOverValueBox.bind(undefined,htmlElementId));
        }
      }

      var value = htmlElement.value;

      // Do not touch if we are not forced to and are not the current owner (maybe optionsModel loaded but user moved on)
      if( !doClaimForThisInput && valueBox.attr("bcdHtmlElementId") != htmlElementId )
        return;

      // Move and size the box to the current owner input field
      bcdui.util.clonePosition(valueBox.get(0), htmlElement,
          { setHeight: false,
            setWidth: true,
            offsetTop: bcdui._migPjs._$(htmlElement).innerHeight()
          }
      );

      // We want the drop down box to have at least the width of the owning input field
      valueBox.css({minWidth:bcdui._migPjs._$(htmlElement).innerWidth()+"px"});

      var maxOptionsCount = parseInt(htmlElement.getAttribute("bcdMaxOptionsCount"), 10);
      if (isNaN(maxOptionsCount)) {
        maxOptionsCount = 0;
      }

      /*
       * when populated, the listview will scroll either to this target or to top.
       */
      var _scrollToTarget=null;

      // Do not touch content if it did not change
      if( valueBox.attr("bcdHtmlElementId") != htmlElementId || valueBox.attr("bcdValue") != value || noFilter )
      {
        valueBox.attr("bcdHtmlElementId", htmlElementId);
        valueBox.attr("bcdValue", value);

        // Find the values to be shown from the options model
        // This client-filtering is always case insensitive
        var optionsModelId = htmlElement.getAttribute("bcdOptionsModelId") || "";
        var optionsModelXPath = htmlElement.getAttribute("bcdOptionsModelXPath") || "";
        var optionsModel = bcdui.factory.objectRegistry.getObject(optionsModelId);
        var nodes = optionsModel.getData().selectNodes(optionsModelXPath);

        // Determine and fill the options from the options model, start with the options "clear" option
        valueBox.html("");
        var clearOption = htmlElement.getAttribute("bcdClearOption");
        if ( htmlElement.getAttribute("bcdOptionsModelId") && clearOption && clearOption!="false" )
        {
          var text = bcdui.i18n.syncTranslateFormatMessage({msgid: clearOption=="true" ? 'bcd_autoCompletionBox_clearOption' : clearOption });
          var item = bcdui._migPjs._$(bcdui.widget.inputField._addOption(valueBox.get(0), htmlElementId, jQuery("<span>" + text + "</span>").get(0)));
          item.attr("bcd_autoCompletionBox_emptyValue", "true");
          item.addClass("bcdClearOption");
        }
        
        var generatedOptions = new Array();

        // Create one option per value and mark matches visually
        var optionsCount = 0;
        var isContains = htmlElement.getAttribute("bcdWildcard")=="contains";
        var multilevelRequestNode = optionsModel.getData().selectSingleNode("/*/wrs:RequestDocument/wrq:WrsService[@serviceName='BcdMultiLevelSuggest']");
        var levelSeparator = multilevelRequestNode ? multilevelRequestNode.selectSingleNode("wrq:SearchExpression/@levelSeparator") : null;
        levelSeparator = levelSeparator ? levelSeparator.nodeValue : null;
        for (var opt = 0; opt < nodes.length; ++opt) {
          var node = nodes[opt];
          
          // The value(s) may come from an element content, an attribute or even consist of a series of nodes in case of multi-level suggest
          var valueLevels = new Array();
          if( multilevelRequestNode ) 
          {
            // Read the data/caption into an array. We skip empty fields, they belong to a different hierarchy, if they should ever be allowed, use dim model here
            var levelNodes = node.selectNodes("../wrs:C");
            for( var i=0; i<levelNodes.length; i++ ) {
              var v = levelNodes.item(i).getAttribute("caption") ? levelNodes.item(i).getAttribute("caption") : levelNodes.item(i).text;
              if( !!v )
                valueLevels.push(v.split(" "));
            }
          } else if ( node.nodeType === 1 ) {
            valueLevels.push(node.text.split(" "));
          } else {
            valueLevels.push(node.nodeValue.split(" "));
          }

          // Now we mark the matches, if search expression(s) are given          
          if( value.trim() ) 
          {
            // Create an array of search values, each entry being an array of the words of that search level
            var searchLevels = new Array();
            var searchLevelValues = levelSeparator ? value.replace(/\*/g,"").split(levelSeparator) : [value.replace(/\*/g,"")];
            for( var i=0; i<searchLevelValues.length; i++ ) {
              searchLevels.push(searchLevelValues[i].split(" ").filter(function(e){return e.trim()}).map(function(e){return e.toLocaleLowerCase()}));
            }

            // We need to find all search expressions
            for( var sl=0; sl<searchLevels.length; sl++ ) {

              // When looking for a match, we need to take the level separators levelSeparator into account, i.e. we are looking only in certain levels
              var maxFilterLevel = (valueLevels.length-1) - (searchLevels.length-1) + sl;
              searchLevelLoop: {
                var vl=sl; // Reinit also when entering via searchLevelLoop: label
                for( ; vl<=maxFilterLevel; vl++ ) {

                  // Lets apply the individual words of a search level
                  for( var sv = 0; sv<searchLevels[sl].length; sv++ ) { // do not reinit sv when coming here via searchLevelLoop: label

                    // Therefore we look in all value levels and start as deep as we are on search level
                    var ld = sv; // Reinit also when entering via searchLevelLoop: label
                    for( ; ld<valueLevels[vl].length; ld++ ) {
                      var sVal = searchLevels[sl][sv];

                      // If we found a match, lets mark it an remove the search expression
                      if( !isContains && valueLevels[vl][ld].toLocaleLowerCase().startsWith(sVal) ) {
                        var oldVal = valueLevels[vl][ld];
                        var oldVal = oldVal.replace(/<span class='bcdSuggestMatchPart'>/g, "▶").replace(/<\/span>/g, "◀");
                        var markerInMarker = oldVal.substring(0,sVal.length).indexOf("▶") != -1 && oldVal.substring(0,sVal.length).indexOf("◀") == -1;
                        valueLevels[vl][ld] = (markerInMarker ? "" : "<span class='bcdSuggestMatchPart'>") + oldVal.substring(0,sVal.length) + (markerInMarker ? "" : "</span>") + oldVal.substring(sVal.length);
                        valueLevels[vl][ld] = valueLevels[vl][ld].replace(/▶/g, "<span class='bcdSuggestMatchPart'>").replace(/◀/g, "</span>");
                        searchLevels[sl].splice(sv,1);
                        sl--; // Because we removed the current element
                        break searchLevelLoop;
                      } else if( isContains ) {
                        var oldVal = valueLevels[vl][ld];
                        var oldVal = oldVal.replace(/<span class='bcdSuggestMatchPart'>/g, "▶").replace(/<\/span>/g, "◀");
                        var idx = oldVal.toLocaleLowerCase().indexOf(sVal);
                        if( idx!==-1 ) {
                          valueLevels[vl][ld] = oldVal.substring(0,idx);
                          var markerInMarker = valueLevels[vl][ld].indexOf("▶") != -1 && valueLevels[vl][ld].indexOf("◀") == -1;
                          valueLevels[vl][ld] += markerInMarker ? "" : "<span class='bcdSuggestMatchPart'>";
                          valueLevels[vl][ld] += oldVal.substring(idx,idx+sVal.length);
                          valueLevels[vl][ld] += (markerInMarker ? "" : "</span>") + oldVal.substring(idx+sVal.length);
                          valueLevels[vl][ld] = valueLevels[vl][ld].replace(/▶/g, "<span class='bcdSuggestMatchPart'>").replace(/◀/g, "</span>");
                          searchLevels[sl].splice(sv,1);
                          sl--; // Because we removed the current element
                          break searchLevelLoop;
                        }
                      }
                    }
                  }
                }
              }                
            }
            // Do not include the options if we could not find all values
            if( noFilter!=true && [].concat.apply([],searchLevels).length !== 0 )
              continue;
          }

          var val = jQuery("<span>"+valueLevels.map(function(v){return v.join(" ")}).join(" "+(levelSeparator?levelSeparator+" ":""))+"</span>").get(0);
          var isSelected = value==val&&noFilter;
          var rowId = node.nodeType===1 && node.tagName==="C" ? node.parentNode.getAttribute("id") : undefined;
          generatedOptions.push( {val: val, isSelected: isSelected, rowId: rowId} );

          // Only up to the selected number
          if( maxOptionsCount > 0 && ++optionsCount >= maxOptionsCount ) 
            return;
        }

        // sort options
        if (htmlElement.getAttribute("bcdIsSortOptions") == "true") {
          generatedOptions = generatedOptions.sort(
            function(a,b){
              var x = jQuery(a.val).text().toLowerCase(), y = jQuery(b.val).text().toLowerCase();
              return x < y ? -1 : x > y ? 1 : 0;
            }
          );
        }

        // finally add the option
        generatedOptions.forEach(function(b){
          var listEl = bcdui.widget.inputField._addOption(valueBox.get(0), htmlElementId, b.val, b.isSelected, b.rowId);
          if(b.isSelected) {
            _scrollToTarget = listEl;
          }
        })
      }

      // Make drop down box sensitive to user actions
      valueBox.on("mouseover", function(event){
        var tgt = jQuery(event.target);
        if (tgt.length > 0 && tgt.get(0).id != "bcdAutoCompletionBox") {
          bcdui.widget.inputField._setSelectedElement(valueBox.attr("bcdHtmlElementId"), tgt.get(0));
        }
      });
      valueBox.on("mousedown", function(event){
        var tgt = jQuery(event.target);
        if (tgt.length > 0 && tgt.get(0).id != "bcdAutoCompletionBox") {
          bcdui.widget.inputField._optionClicked(valueBox.attr("bcdHtmlElementId"), tgt.get(0));
        }
      });

      // Show
      if (!valueBox.is(":visible"))
        valueBox.show();

      if(_scrollToTarget){
        // position the selected item into the center of the box
        jQuery('#bcdAutoCompletionBox').get(0).scrollTop = bcdui._migPjs._$(_scrollToTarget).offsetTop - jQuery('#bcdAutoCompletionBox').outerHeight()/2;
      }else{
        // scroll to Top
        jQuery('#bcdAutoCompletionBox').get(0).scrollTop = 0;
      }

      // register event listener that closes the popup if the user clicks somewhere outside of the popup
      jQuery(document).on('mousedown',bcdui.widget.inputField._hideOnClickListener);

      //set focus to input field so the user can start typing
      try{bcdui._migPjs._$(htmlElementId).focus();}catch(e){bcdui.log.warn("onfocus failed in _updateDropDownList: "+e.message);}
    },

  /**
   * Add the option to the bcdAutoCompletionBox.
   * @return the added item (HTMLElement)
   * @private
   */
  _addOption: function(valueBox, htmlElementId, value, isSelected, rowId)
    {
      var item = valueBox.appendChild(document.createElement("div"));
      if( rowId )
      	item.setAttribute( "rowId", rowId );
      item.appendChild(value);
      if(isSelected){
        bcdui._migPjs._$(item).addClass("bcdSelected");
      }
      return item;
    },

  /**
   * @private
   */
  _optionClicked: function(htmlElementId, anchor)
    {
      bcdui.widget.inputField._setSelectedElement(htmlElementId, anchor);
      // Because focus will re-open the box immedeatly again but we interpret "clear" as closing it,
      // we prevent setting the focus too the input field in that case
      var focus = anchor.getAttribute("bcd_autoCompletionBox_emptyValue") == "true" ? 1 : 0;
      bcdui.widget.inputField._hideOptions(htmlElementId,true,focus,true);
    },

    /**
     *  Set default parameters
     * @param HTMLElement  htmlElement The element the input field is based on.
     * @private
     */
    _adjustDefaultParameters: function(htmlElement){
      bcdui.log.isDebugEnabled() && bcdui.log.debug('call _adjustDefaultParameters inputFile widget');
      if(!htmlElement.getAttribute("bcdClearOption") )
          htmlElement.setAttribute("bcdClearOption","false");
      if(!htmlElement.getAttribute("bcdMandatory"))
          htmlElement.setAttribute("bcdMandatory","false");
      if(!htmlElement.getAttribute("bcdKeepEmptyValueExpression"))
          htmlElement.setAttribute("bcdKeepEmptyValueExpression","false");
      if(!htmlElement.getAttribute("bcdAutofit"))
          htmlElement.setAttribute("bcdAutofit","false");
      if(!htmlElement.getAttribute("bcdIsSortOptions"))
        htmlElement.setAttribute("bcdIsSortOptions","false");
      if( htmlElement.getAttribute("bcdOptionsModelIsSuggestionOnly")=="true" )  // We cannot derive an id -> we have to work with ids not with captions
        htmlElement.removeAttribute("bcdOptionsModelRelativeValueXPath");
      if( htmlElement.getAttribute("bcdAdditionalFilterXPath") ) {
        var addFilterParams = bcdui.factory._extractXPathAndModelId(htmlElement.getAttribute("bcdAdditionalFilterXPath"));
        htmlElement.setAttribute("bcdAdditionalFilterModelId",addFilterParams.modelId);
        htmlElement.setAttribute("bcdAdditionalFilterXPath",addFilterParams.xPath);
      }
      if( ! htmlElement.getAttribute("bcdOptionsModelId") || ! htmlElement.getAttribute("bcdOptionsModelXPath") )
      {
        htmlElement.removeAttribute("bcdOptionsModelId");
        htmlElement.removeAttribute("bcdOptionsModelXPath");
        htmlElement.removeAttribute("bcdOptionsModelRelativeValueXPath");
      }
    },

    /**
     * @param {string} id targetHtml of widget
     * @param {function} callback to be called with generated caption
     * @return {string} NavPath information via callback for widget
     */
    getNavPath: function(id, callback) {
      if (id && id != "") {
        var e = jQuery("#" + id + " input[bcdTargetModelXPath]").first().get(0);
        if (e) {
          bcdui.widget._getCaptionFromWidgetElement(e, function(value) {
            callback(id, value);
          });
          return;
        }
      }
      callback(id, "");
    },

  /**
   * Transformator for building a MultiLevelSuggestion request
   * Connect the inputfield with a (auto)model using this as request builder (input doesn't matter, use guistatus)
   * And refresh it via additionalFilterXPath, same as for plain suggest
   */
  buildRequestTransformator: function( doc, parameters ) {
      var req = bcdui.core.browserCompatibility.createDOMFromXmlString("<wrq:WrsService xmlns:wrq='http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0'/>");
      var dimNode = parameters.dimModel.getData().selectSingleNode("/*/Dimension[@name='"+parameters.dimensionName+"']");
      req.documentElement.setAttribute("serviceName", "BcdMultiLevelSuggest");
      req.documentElement.appendChild(dimNode.cloneNode(true));
      var serverValue = parameters.additionalFilterXPath.getAttribute("serverValue");
      var sE = req.createElement("wrq:SearchExpression");
      req.documentElement.appendChild( sE );
      if( serverValue )
        sE.setAttribute( "value", serverValue );
      if( parameters.levelSeparator )
        sE.setAttribute( "levelSeparator", parameters.levelSeparator );
      if( parameters.useCaption )
        sE.setAttribute( "useCaption", "true" );
      return req;
    },
    
    /**
     * @classdesc
     *  Listener to see changes of target Xpath in model. Calls visualization and validation of new data
     * @extends bcdui.widget.XMLDataUpdateListener
     * @private
     */
  XMLListener: bcdui._migPjs._classCreate(bcdui.widget.XMLDataUpdateListener,
    /**
     * @lends bcdui.widget.inputField.XMLListener.prototype
     */
    {
      updateValue: function()
        {
          bcdui.widget.inputField._readDataFromXML(this.htmlElementId);
        }

    })
}); // namespace
