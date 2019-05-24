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
 * A namespace for the BCD-UI multiSelect widget. For creation @see {@link bcdui.widget.createMultiSelect}
 * @namespace  bcdui.widget.multiSelect
 */
bcdui.util.namespace("bcdui.widget.multiSelect",
/** @lends bcdui.widget.multiSelect */
{
  /**
   * The initialization function called by multiSelect.xslt.
   * @function
   * @param {HTMLElement} htmlElement The element the multiSelect is based on.
   * @method
   * @private
   */
  init: function(e)
    {
      if (e.getAttribute("bcdLabel")){
        var labelEl = jQuery("<label/>").appendTo(e);
        bcdui.widget._initLabel(labelEl, e.getAttribute("bcdid"), e.getAttribute("bcdLabel"));
      }

      jQuery(e).append(
        e.getAttribute("bcdIsCheckBox") == "true"
          ? "<span class='radio'></span>"
          : "<select multiple='multiple' class='form-control' "
            + bcdui.widget._domFromBcdAttribute(e, "bcdVisibleSize", "size")
            + "></select>"
        ).addClass("bcdMultiSelect");
      var htmlElement = jQuery(e).children().last().get(0);
      bcdui.widget._moveBcdAttributes(e, htmlElement);
      bcdui.widget._bcdIdToDomId(htmlElement);

      this._adjustDefaultParameters(htmlElement);
      bcdui.widget._assureModelIdAndXPathAttributes( {htmlElement: htmlElement} );
      var config = {
          element: htmlElement,
          targetModelId: htmlElement.getAttribute("bcdTargetModelId"),
          targetModelXPath: htmlElement.getAttribute("bcdTargetModelXPath"),
          optionsModelId: htmlElement.getAttribute("bcdOptionsModelId"),
          optionsModelXPath: htmlElement.getAttribute("bcdOptionsModelXPath"),
          optionsModelRelativeValueXPath: htmlElement.getAttribute("bcdOptionsModelRelativeValueXPath"),
          isCheckBox:                       htmlElement.getAttribute("bcdIsCheckBox"),
          delimiter:                        htmlElement.getAttribute("bcdDelimiter"),
          doSortOptions:                    htmlElement.getAttribute("bcdDoSortOptions") == "true" ? true : false
      };
      var models = bcdui.widget._extractModelsFromModelXPath(config.optionsModelXPath);
      if (models) {
        bcdui.widget._createWrapperModel(models, config, "widget/multiOptionsModelWrapper.xslt",{
          doSortOptions : config.doSortOptions
        }); // does change config!
      }
      var action = function() {
        bcdui.widget._cleanupHTMLElementId(htmlElement);
        var targetModel = bcdui.factory.objectRegistry.getObject(config.targetModelId);
        var listener = new bcdui.widget.multiSelect.XMLListener({
          idRef: config.targetModelId,
          trackingXPath: config.targetModelXPath,
          htmlElementId: htmlElement.id
        });
        bcdui.factory.addDataListener(listener);
        //bcdui.widget._registerHTMLElementListener(htmlElement, listener);

        if (config.optionsModelId) {
          var optionsListener = new bcdui.widget.multiSelect.XMLListener({
            idRef: config.optionsModelId,
            trackingXPath: config.optionsModelXPath + (config.optionsModelRelativeValueXPath ? "/" + config.optionsModelRelativeValueXPath : ""), // listen not the full optionsModel but only optionsModelXPath+optionsModelRelativeValueXPath
            htmlElementId: htmlElement.id
          });
          bcdui.factory.objectRegistry.withObjects({
            ids: [ config.optionsModelId ],
            fn: function() {
                  if (!optionsListener.hasBeenUnRegistered())
                    {
                      bcdui.factory.addDataListener(optionsListener);
                      bcdui.widget._registerHTMLElementListener(htmlElement, optionsListener);
                    }
                  
                  if (htmlElement.getAttribute("bcdEnableNavPath") != null && htmlElement.getAttribute("bcdEnableNavPath") == "true") {
                    bcdui.widget.multiSelect.getNavPath(jQuery(htmlElement).parent().parent().attr("id"), function(id, value) {
                      bcdui.widget._linkNavPath(id, value);
                    }.bind(this));
                  }
                }
          });
        }
        else {
          if (htmlElement.getAttribute("bcdEnableNavPath") != null && htmlElement.getAttribute("bcdEnableNavPath") == "true") {
            bcdui.widget.multiSelect.getNavPath(jQuery(htmlElement).parent().parent().attr("id"), function(value) {
              bcdui.widget._linkNavPath(jQuery(htmlElement).parent().parent().attr("id"), value);
            }.bind(this));
          }
        }

        bcdui.widget.multiSelect._readDataFromXML(htmlElement.id, bcdui.factory.objectRegistry.getObject(config.optionsModelId) );
      };

      if (bcdui.util.isString(config.optionsModelId) && ! !config.optionsModelId.trim()) {
        bcdui.factory.objectRegistry.withReadyObjects(config.optionsModelId, action);
      } else {
        action();
      }
    },

  /**
   * @function
   * @param htmlElementId
   * @private
   * @method
   */
  _readDataFromXML: function(htmlElementId, evtSrc)
    {
      bcdui.widget.multiSelect._updateOptions(htmlElementId, evtSrc);
    },

  /**
   * @method
   * @private
   */
  _updateOptions: function(/* String */ htmlElementId, evtSrc)
    {
      var htmlElement = bcdui._migPjs._$(htmlElementId).get(0);
      // if the html element is not available anymore exit the method
      // this happens if the optionsmodel is used and is ready when multiselect is repainted
      if (! bcdui._migPjs._$(htmlElementId).length > 0){
        return;
      }
      var args = {
        htmlElement:                    htmlElement,
        optionsModel:                   bcdui.factory.objectRegistry.getObject(htmlElement.getAttribute("bcdOptionsModelId")),
        targetModel:                    bcdui.factory.objectRegistry.getObject(htmlElement.getAttribute("bcdTargetModelId")),
        optionsModelXPath:              htmlElement.getAttribute("bcdOptionsModelXPath"),
        optionsModelRelativeValueXPath: htmlElement.getAttribute("bcdOptionsModelRelativeValueXPath"),
        keepEmptyValueExpression:       htmlElement.getAttribute("bcdKeepEmptyValueExpression"),
        targetModelXPath:               htmlElement.getAttribute("bcdTargetModelXPath"),
        isCheckBox:                     htmlElement.getAttribute("bcdIsCheckBox"),
        delimiter:                      htmlElement.getAttribute("bcdDelimiter"),
        itemName:                       htmlElementId + "_bcdui_option"
      };
      if ( evtSrc && evtSrc.id == htmlElement.getAttribute("bcdOptionsModelId")){
        bcdui.factory.objectRegistry.withReadyObjectsNoExecute( args.optionsModel, function() {
          var optionsModelNodes = args.optionsModel.getData().selectNodes(args.optionsModelXPath);
          // the options model has changed
          var replace = (htmlElement.childNodes.length == 0);
          if (!replace) {
            var options ;
            if (args.isCheckBox === 'true'){
              options = bcdui._migPjs._$(htmlElement).find("input[type='checkbox']");
            }else{
              options = htmlElement.options;
            }
            // if the number of html options is different from optionmodels than we replace
            replace = !(options && optionsModelNodes.length == options.length);
            if (!replace) {
              var captionsInOptionsModel = jQuery.makeArray(optionsModelNodes).map(function(e) { return e.nodeValue || e.text });
              var check = jQuery.makeArray(htmlElement.options).map(function(e){return e.firstChild}).map(function(e){return e.nodeValue});
              var i = captionsInOptionsModel.length;
              while (!replace && i-- > 0) {
                replace = captionsInOptionsModel[i] != check[i];
              }
              captionsInOptionsModel = jQuery.makeArray(captionsInOptionsModel).map(bcdui.widget._getValueOfCaption.bind(undefined,htmlElementId));
              check = jQuery.makeArray(htmlElement.options).map(function(e){return e.value});
              i = captionsInOptionsModel.length;
              while (!replace && i-- > 0) {
                replace = captionsInOptionsModel[i] != check[i];
              }
            }
          }
          if (replace) {
            htmlElement.innerHTML = "";
            var defaultValue = bcdui.widget._getDataFromXML(args.targetModel, args.targetModelXPath);
            bcdui.widget.multiSelect._createOptionsElement(args, optionsModelNodes, defaultValue);
          }

          //  test if we have the values from target model still in options modell, if not and if the target model
          // isn't a wrs remove it. (This removes filter expressions in case of updated optionsmodel)
          var isWrsModel = (args.targetModel.getData().selectSingleNode("/wrs:Wrs") != null ? true:false);
          if(!isWrsModel){
            jQuery.makeArray(args.targetModel.getData().selectNodes(args.targetModelXPath))
            .forEach(
              function( node ){
               var value = node.value;
               var caption = bcdui.widget._getCaptionOfValue(htmlElementId, value);
               if(caption == null ){
                 // remove the value attribute or the complete f:Expression
                 var expressionMatcher = args.keepEmptyValueExpression == 'true' ? null : args.targetModelXPath.match("(.*/f:Expression[^/]*)/@value");
                 if (expressionMatcher != null && expressionMatcher.length > 1) {
                   bcdui.core.removeXPath(args.targetModel, expressionMatcher[1]);
                 } else {
                   bcdui.core.removeXPath(args.targetModel, args.targetModelXPath);
                 }
                 args.targetModel.fire();
               }
             } // function()
            ) // each
          }
        }.bind(this));
      }else{
        // if the target model has changed we have to update the html element
        // it could be optimized by not creating new options from scratch.

        // define the mapping function depended if we have delimter or not
        var mapFunc = args.delimiter&&args.delimiter!=""?function(map,e){
          var v = e.nodeValue || e.text;
          if(v){
            var values = v.split(args.delimiter);
            for(var i=0;i<values.length;i++){
              var x = values[i];
              map[x] = x;
            }
          }
          return map;
        }:function(map, e) { var v = e.nodeValue || e.text; map[v] = v; return map; };
        var selectedValues = jQuery.makeArray(args.targetModel.getData().selectNodes(args.targetModelXPath)).reduce(mapFunc, {});
        if (args.isCheckBox === 'true'){
          var options = bcdui._migPjs._$(htmlElement).find("input[type='checkbox']");
          jQuery.makeArray(options).forEach(function(optionElement) {
            // the checkbox needs to be set like element.checked = true/false
            // setAttribute("checked",true or "checked") doesnt work always, it seems to be a refresh issue
            if ( optionElement.value in selectedValues ){
              optionElement.checked =true;
              // IE6 seems to need this additionally
              optionElement.defaultChecked =true;
            }
            else {
              optionElement.checked= false;
           // IE6 seems to need this additionally
              optionElement.defaultChecked= false;
            }
           });

        }else{
          jQuery.makeArray(htmlElement.options).forEach(function(optionElement) {
            // only set selected attribute for elements which did change
            // resetting the full optionElements would lead to focus effects on IE
            if (! (optionElement.selected == (optionElement.value in selectedValues))) {
              optionElement.selected = ! optionElement.selected;
            }
          });
        }
      }
    },



  /**
   * @method
   * @private
   */
  _createOptionsElement: function(args, optionsModelNodes, defaultValue)
    {
      // we use different mapping function if delimiter is enabled
      var mapFunc = args.delimiter&&args.delimiter!=""?function(map,e){
        var v = e.nodeValue || e.text;
        if(v){
          var values = v.split(args.delimiter);
          for(var i=0;i<values.length;i++){
            var x = values[i];
            map[x] = x;
          }
        }
        return map;
      }:function(map, e) { var v = e.nodeValue || e.text; map[v] = v; return map; };

      var selectedValues = jQuery.makeArray(args.targetModel.getData().selectNodes(args.targetModelXPath)).reduce(mapFunc, {});

      if ( args.isCheckBox === 'true'){
        var checkBoxForm = null;
        var formName = args.htmlElement.id +'_form';
        checkBoxForm = document.createElement("form");
        checkBoxForm.setAttribute("name", formName);
      }

      var captionValueArr = bcdui.widget._getCaptionValueArray(args.htmlElement.id);

      jQuery.makeArray(captionValueArr||optionsModelNodes).forEach(function(item) {
        var caption=null;
        var value=null;
        // either fetch values from associative array or we got them from a nodeset
        if(captionValueArr){
          caption = item[0];
          value = item[1];
        }else{
          caption = value = item.nodeValue||item.text;
        }
        var optionCaptionNode = document.createTextNode(caption);
        if ( args.isCheckBox === 'true'){
          var optionSpan = document.createElement("span");
          var textSpan = document.createElement("span");
          bcdui._migPjs._$(textSpan).css({verticalalign: "top"});
          textSpan.appendChild(optionCaptionNode);
          checkBoxForm.appendChild(optionSpan);
          args.htmlElement.appendChild(checkBoxForm);
          var checkBoxElement = document.createElement( "input");
          checkBoxElement.setAttribute("type","checkbox");  // do this before parent.appendChild(..) in IE, type is readonly if element is in dom tree
          checkBoxElement.setAttribute("name", args.htmlElement.id);
          checkBoxElement.setAttribute("value", value);
          checkBoxElement.setAttribute("title", caption);
          // The checkbox input needs to a child of the form tag before the checked attribute is set, otherwise it looks not checked
          optionSpan.appendChild(checkBoxElement);
          var isSelected  = value in selectedValues;
          checkBoxElement.checked= isSelected;
          // IE6 seems to need this additionally
          checkBoxElement.defaultChecked = isSelected;
          optionSpan.appendChild(textSpan);
        }
        else{
          var optionElement = document.createElement("option");
          optionElement.setAttribute("value", value);
          // only set selected attribute for elements which did change
          // resetting the full optionElements would lead to focus effects on IE
          if (! (optionElement.selected == value in selectedValues))
            optionElement.selected = ! optionElement.selected; // For IE6 this needs to be done befor the node is apppended to HTML, and it is nicer anyway
          optionElement.setAttribute("title", caption);
          optionElement.appendChild(optionCaptionNode);
          args.htmlElement.appendChild(optionElement);
        }
      });
      // add observers outside of loop
      if (jQuery.makeArray(captionValueArr||optionsModelNodes).length > 0) {
        if (args.isCheckBox === 'true'){
          // we can take the htmlElement.id here (outer span) instead of adding the observer to each input field
          bcdui._migPjs._$(document.getElementById(args.htmlElement.id)).on("click", bcdui.widget.multiSelect._writeDataToXML.bind(undefined,args.htmlElement.id));
        } else {
          args.htmlElement.onchange = bcdui.widget.multiSelect._writeDataToXML.bind(undefined,args.htmlElement.id);
        }
      }
    },

    /**
     * @param {string} id targetHtml of widget
     * @param {function} callback to be called with generated caption
     * @return {string} NavPath information via callback for widget
     */
    getNavPath: function(id, callback) {
      if (id && id != "") {
        var e = jQuery("#" + id + " *[bcdTargetModelXPath]").first().get(0);
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
   * @function
   * @param htmlElementId
   * @method
   * @private
   */
   _writeDataToXML: function(htmlElementId)
    {
      var htmlElement   = document.getElementById(htmlElementId);
      var targetModel   = bcdui.factory.objectRegistry.getObject(htmlElement.getAttribute("bcdTargetModelId"));
      var targetXPath   = htmlElement.getAttribute("bcdTargetModelXPath");
      var delimiter     = htmlElement.getAttribute("bcdDelimiter");
      var isCheckBox    = htmlElement.getAttribute("bcdIsCheckBox");

      if ( isCheckBox === 'true'){
        var values = jQuery.makeArray(jQuery(htmlElement).find("input"))
            .filter(function(opt){return opt.checked;})
            .map(function(e){return e.value});
      } else {
        var values =  jQuery.makeArray(htmlElement.options)
             .filter(function(opt) { return opt.selected; })
             .map(function(e){return e.value});
      }

      /*
       * write delimited values if we have delimiter defined
       */
      if(delimiter && delimiter != "") {
        if(values.length==0 && targetModel.dataDoc.selectSingleNode("/wrs:Wrs")==null){ // only .remove() if not WRS
          var nodeToRemove = targetModel.dataDoc.selectSingleNode(targetXPath);
          // if node is @ remove its parent, does not handle wrs however
          if(nodeToRemove && nodeToRemove.nodeType == 2){
            var p = bcdui.util.xml.getParentNode(nodeToRemove);
            p.parentNode.removeChild(p);
          } else {
            bcdui.core.removeXPath(targetModel.dataDoc, targetXPath);
          }
        }else{
          bcdui.core.createElementWithPrototype(targetModel.dataDoc, targetXPath).text = values.join(delimiter);
        }
      } else {
        bcdui.core._syncMultipleValues(
            /* doc         */ targetModel,
            /* targetXPath */ targetXPath,
            /* values      */ values
        );
      }
      targetModel.fire();
    },

   /**
    *  Set default parameters
    * @param HTMLElement  htmlElement The element the multiSelect is based on.
    * @private
    */
    _adjustDefaultParameters: function(HTMLElement){
      if(HTMLElement.getAttribute("bcdIsCheckBox")==""||!HTMLElement.getAttribute("bcdIsCheckBox")){
          HTMLElement.setAttribute("bcdIsCheckBox","false");
      }
    },

    /**
     * @classdesc
     *  Listener to see changes of target Xpath in model. Calls visualization and validation of new data
     * @extends bcdui.widget.XMLDataUpdateListener
     * @private
     */
    XMLListener: bcdui._migPjs._classCreate( bcdui.widget.XMLDataUpdateListener,
    /**
     * @lends bcdui.widget.multiSelect.XMLListener.prototype
     */
    {
      updateValue: function(evtSrc)
        {
          bcdui.widget.multiSelect._readDataFromXML(this.htmlElementId, evtSrc);
        }
    })
}); // namespace
