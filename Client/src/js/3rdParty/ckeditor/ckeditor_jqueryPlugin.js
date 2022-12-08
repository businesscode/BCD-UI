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
        this.context.formatter_in = eval(this.options.formatter_in);
      } else {
        this.context.formatter_in = asIsFormatter;
      }

      if(this.options.formatter_out){
        this.context.formatter_out = eval(this.options.formatter_out);
      } else {
        this.context.formatter_out = asIsFormatter;
      }
      
      bcdui.factory.objectRegistry.withReadyObjects(this.context.target.modelId, function(){
        this._createAndBind();
      }.bind(this));
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
