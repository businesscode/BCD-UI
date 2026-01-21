/*
  Copyright 2010-2019 BusinessCode GmbH, Germany

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

/*
 * jQuery Plugin adapter for CKEDITOR integrating with BCDUI:
 * 
 * API:
 * 
 * jQuery("textarea").ckeditor(<options>);
 * 
 * API:
 * 
 * id="bcdHtmlEditor"
 * required="true"
 * doTrimInput="true"
 * targetModelXPath="$dataModel//wrs:Data/[@id='{$rowId}']/wrs:C[{$textPos}]"
 * customConfig="./ckeditor_config.js"
 * formatter_in=function(value){return value;}
 * formatter_out=function(value){return value;}
 * 
*/

"use strict";

(function(){
  const ATTR_SELF_WRITING = "data-selfWriting";

  /**
   * self-unregistable listener to delegate model updates
   */
  const XMLListener  = class extends bcdui.widget.XMLDataUpdateListener {
    updateValue() { jQuery("#" + this.htmlElementId).ckeditor("syncValue"); }
  };

  /**
   * used as default text formatting function
   */
  const asIsFormatter = function(arg){ return arg; };

  jQuery.widget("elp.ckeditor",{
    _create : function(){
      if(!this.options.id){
        this.options.id = bcdui.factory.objectRegistry.generateTemporaryId();
      }
      // currently required for XMLListener
      this.element.attr("bcdWidgetFullName", this.widgetFullName);

      // store member variables here
      this.context = {
        target : bcdui.factory._extractXPathAndModelId(this.options.targetModelXPath),
      };
      
      if(this.options.formatter_in){
        this.context.formatter_in = bcdui.util._getJsObjectFromString(this.options.formatter_in);
      } else {
        this.context.formatter_in = asIsFormatter;
      }

      if(this.options.formatter_out){
        this.context.formatter_out = bcdui.util._getJsObjectFromString(this.options.formatter_out);
      } else {
        this.context.formatter_out = asIsFormatter;
      }
      
      bcdui.factory.objectRegistry.withReadyObjects(this.context.target.modelId, function(){
        this._createAndBind();
      }.bind(this));

      const self = this;
      jQuery("body").on("ck:dialog_ready", function(event, htmlElement) { self._initListeners(htmlElement); });
      jQuery("body").on("ck:instance_ready", function(event, htmlElement) { self._initListeners(htmlElement); });
      jQuery("body").on("ck::iframe_ready", function(event, iframe) {
        jQuery(iframe).on('load', function() {
          const frameDoc = iframe.contentWindow.document;
          const htmlElement = jQuery(frameDoc).find("[ckOnLoad]").get(0);
          const data = htmlElement.dataset;
          if (data) {
            self._initListeners(htmlElement);
            window.parent.CKEDITOR.tools.callFunction.apply(htmlElement, [parseInt((data.loadFn || "-1"), 10), htmlElement]);
          }
        });
      });
    },

    _removeListeners(container) {
      jQuery(container).off('click.cke');
      jQuery(container).off('focus.cke');
      jQuery(container).off('mousedown.cke');
      jQuery(container).off('mouseout.cke');
      jQuery(container).off('mouseover.cke');
      jQuery(container).off('blur.cke');
      jQuery(container).off('dragstart.cke');
      jQuery(container).off('keypress.cke');
      jQuery(container).off('mouseup.cke');
      jQuery(container).off('keydown.cke');
    },

    _initListeners(container) {
      this._removeListeners(container);
      jQuery(container).on('click.cke', '[ckOnClick]', function (event) {
        const htmlElement = jQuery(event.target).attr("ckOnClick") ? jQuery(event.target).get(0) : jQuery(event.target).closest("[ckOnClick]").get(0);
        let returnValue = false;
        const data = htmlElement.dataset;
        if (data) {
          const clickType = parseInt((data.clickType || "-1"), 10);
          const clickFn = parseInt((data.clickFn || "-1"), 10);
          switch (clickType) {
            case 1:
              if (CKEDITOR.env.ie)
                return false;
              else
                CKEDITOR.tools.callFunction.apply(htmlElement, [clickFn, htmlElement]);
              break;
            case 2:
              CKEDITOR.tools.callFunction.apply(htmlElement, [clickFn]);
              break;
            case 3:
              CKEDITOR.tools.callFunction.apply(htmlElement, [clickFn, null]);
              break;
            case 4:
              CKEDITOR.tools.callFunction.apply(htmlElement, [clickFn, "?"]);
              break;
            case 5:
              CKEDITOR.tools.callFunction.apply(htmlElement, [clickFn, data.clickColor, data.clickLabel, htmlElement]);
              break;
            case 6:
              if (CKEDITOR.env.ie)
                return false;
              else
                CKEDITOR.tools.callFunction.apply(htmlElement, [clickFn, data.clickIndex]);
              break;
            case 7:
              CKEDITOR.tools.callFunction.apply(htmlElement, [clickFn, data.clickVal]);
              break;
          }
        }
        return returnValue;
      });

      jQuery(container).on('focus.cke', '[ckOnFocus]', function (event) {
        const htmlElement = jQuery(event.target).attr("ckOnFocus") ? jQuery(event.target).get(0) : jQuery(event.target).closest("[ckOnFocus]").get(0);
        let returnValue = false;
        const data = htmlElement.dataset;
        if (data) {
          const focusType = parseInt((data.focusType || "-1"), 10);
          const focusFn = parseInt((data.focusFn || "-1"), 10);
          switch (focusType) {
            case 1:
              returnValue = CKEDITOR.tools.callFunction.apply(htmlElement, [focusFn, event]);
              break;
          }
        }
        return returnValue;
      });

      jQuery(container).on('mousedown.cke', '[ckOnMouseDown]', function (event) {
        const htmlElement = jQuery(event.target).attr("ckOnMouseDown") ? jQuery(event.target).get(0) : jQuery(event.target).closest("[ckOnMouseDown]").get(0);
        let returnValue = false;
        const data = htmlElement.dataset;
        if (data) {
          const mouseDownType = parseInt((data.mouseDownType || "-1"), 10);
          const mouseDownFn = parseInt((data.mouseDownFn || "-1"), 10);
          switch (mouseDownType) {
            case 1:
              CKEDITOR.tools.callFunction.apply(htmlElement, [mouseDownFn, event]);
              break;
          }
        }
        return returnValue;
      });
      
      jQuery(container).on('mouseout.cke', '[ckOnMouseOut]', function (event) {
        const htmlElement = jQuery(event.target).attr("ckOnMouseOut") ? jQuery(event.target).get(0) : jQuery(event.target).closest("[ckOnMouseOut]").get(0);
        let returnValue = false;
        const data = htmlElement.dataset;
        if (data) {
          const mouseOutType = parseInt((data.mouseOutType || "-1"), 10);
          const mouseOutFn = parseInt((data.mouseOutFn || "-1"), 10);
          switch (mouseOutType) {
            case 1:
              CKEDITOR.tools.callFunction.apply(htmlElement, [mouseOutFn, data.mouseOutIndex]);
              break;
          }
        }
        return returnValue;
      });

      jQuery(container).on('mouseover.cke', '[ckOnMouseOver]', function (event) {
        const htmlElement = jQuery(event.target).attr("ckOnMouseOver") ? jQuery(event.target).get(0) : jQuery(event.target).closest("[ckOnMouseOver]").get(0);
        let returnValue = false;
        const data = htmlElement.dataset;
        if (data) {
          const mouseOverType = parseInt((data.mouseOverType || "-1"), 10);
          const mouseOverFn = parseInt((data.mouseOverFn || "-1"), 10);
          switch (mouseOverType) {
            case 1:
              CKEDITOR.tools.callFunction.apply(htmlElement, [mouseOverFn, data.mouseOverIndex]);
              break;
          }
        }
        return returnValue;
      });

      jQuery(container).on('blur.cke', '[ckOnBlur]', function (event) {
        const htmlElement = jQuery(event.target).attr("ckOnBlur") ? jQuery(event.target).get(0) : jQuery(event.target).closest("[ckOnBlur]").get(0);
         htmlElement.style.cssText = htmlElement.style.cssText;
      });

      jQuery(container).on('dragstart.cke', '[ckOnDragStart]', function () { return false; });

      if ( CKEDITOR.env.gecko && CKEDITOR.env.mac )
        jQuery(container).on('keypress.cke', '[ckOnKeyPress]', function () { return false; });

      if (CKEDITOR.env.ie) {
        jQuery(container).on('mouseup.cke', '[ckOnMouseUp]', function (event) {
          if (CKEDITOR.tools.getMouseButton(event)==CKEDITOR.MOUSE_BUTTON_LEFT) {
            const htmlElement = jQuery(event.target).attr("ckOnClick") ? jQuery(event.target).get(0) : jQuery(event.target).closest("[ckOnClick]").get(0);
            const data = htmlElement.dataset;
            if (data) {
              const clickType = parseInt((data.clickType || "-1"), 10);
              const clickFn = parseInt((data.clickFn || "-1"), 10);
              switch (clickType) {
              case 1:
                  CKEDITOR.tools.callFunction.apply(htmlElement, [clickFn, htmlElement]);
                  break;
              case 6:
                  CKEDITOR.tools.callFunction.apply(htmlElement, [clickFn, data.clickIndex]);
                  break;
              }
            }
          }
          return false;
        });
      }

      jQuery(container).on('keydown.cke', '[ckOnKeyDown]', function (event) {
        const htmlElement = jQuery(event.target).attr("ckOnKeyDown") ? jQuery(event.target).get(0) : jQuery(event.target).closest("[ckOnKeyDown]").get(0);
        let returnValue = false;
        const data = htmlElement.dataset;
        if (data) {
          const keyDownType = parseInt((data.keyDownType || "-1"), 10);
          const keyDownFn = parseInt((data.keyDownFn || "-1"), 10);
          switch (keyDownType) {
            case 1:
              returnValue = CKEDITOR.tools.callFunction.apply(htmlElement, [keyDownFn, event]);
              break;
            case 2:
              returnValue = CKEDITOR.tools.callFunction.apply(htmlElement, [keyDownFn, data.keyDownIndex, event]);
              break;
            case 3:
              returnValue = CKEDITOR.tools.callFunction.apply(htmlElement, [keyDownFn, event, this]);
              break;
          }
        }
        return returnValue;
      });
    },

    /**
     * creates widget and binds data listeners to targetXPath
     */
    _createAndBind : function() {
      // create widget
      this.context.ckeditor = CKEDITOR.replace(this.element[0],{
        customConfig: this.options.customConfig
      });
      
      // init value from model
      this.syncValue();
      
      // bind on blur to delegate .writeValue
      this.context.ckeditor.on("blur",function(widgetId){
        jQuery("#" + widgetId).ckeditor("writeValue");
      }.bind(null, this.options.id));

      // bind to validate on change
      this.context.ckeditor.on("change", function(){
        this.validate();
      }.bind(this));

      // bind data listener
      this.context.syncValueListener = new XMLListener({
        idRef: this.context.target.modelId,
        trackingXPath: this.context.target.xPath,
        htmlElementId: this.options.id
      });
      bcdui.factory.addDataListener(this.context.syncValueListener);
    },

    /**
     * add .val jquery API
     */
    val : function(){
      let data = this.context.ckeditor.getData()||"";
      return this.options.doTrimInput=="true" ? data.trim() : data;
    },

    /**
     * writes widget value to the model
     */
    writeValue : function(){
      // revalidate explicitely
      this.validate();
      let data = this.val();
      // data not changed, skip update
      data = this.context.formatter_out(data);
      if(data == this.context.lastData){
        return;
      }
      // flag will be cleared by .syncValue
      this.element.attr(ATTR_SELF_WRITING, "true");
      this.context.lastData = data;
      bcdui.factory.objectRegistry.getObject(this.context.target.modelId).write(this.context.target.xPath, data, true);
    },

    validate : function(){
      if(this.options.required && !this.val()){
        this.element.parent().find("#cke_" + this.options.id).addClass("bcdInvalid");
      } else {
        this.element.parent().find("#cke_" + this.options.id).removeClass("bcdInvalid");
      }
    },

    /**
     * update widget from model
     */
    syncValue : function(){
      try{
        if(!this.element.attr(ATTR_SELF_WRITING)){
          // obtain current value
          let data = bcdui.factory.objectRegistry.getObject(this.context.target.modelId).read(this.context.target.xPath);
          data = this.context.formatter_in(data);
          this.context.lastData = data;
          // set value, will revalidate automatically
          this.context.ckeditor.setData(data);
        }
      } finally {
        this.element.removeAttr(ATTR_SELF_WRITING);
      }
    },

    _destroy : function(){
      this.context.syncValueListener.unregister();
      this.context = null;
    },

    /**
     * merge options
     */
    _getCreateOptions : function(){
      const optsFromElement = function(el,optsArray){
        let map={};
        optsArray.forEach(function(e){ map[e]=el.attr(e); });
        return map;
      };
      return jQuery.extend(true, {}, this.options, optsFromElement(this.element, ["id","required","doTrimInput","targetModelXPath","customConfig","formatter_in","formatter_out"]));
    }
  });
})();
