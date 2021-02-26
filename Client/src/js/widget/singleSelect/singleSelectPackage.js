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
 * A namespace for the BCD-UI singleSelect widget. For creation @see {@link bcdui.widget.createSingleSelect}
 * @namespace bcdui.widget.singleSelect
 */
bcdui.util.namespace("bcdui.widget.singleSelect",
/**  @lends bcdui.widget.singleSelect */
{
  /**
   * Creates a new SingleSelect based on the parameters given via the htmlElement
   * @private
   */
  init: function(htmlElement){

    if (htmlElement.getAttribute("bcdLabel")){
      bcdui.widget._initLabel(jQuery("<label></label>").appendTo(htmlElement), null, htmlElement.getAttribute("bcdLabel"));
    }

    jQuery(htmlElement).addClass("bcdSingleSelect");
    bcdui.widget._bcdIdToDomId(htmlElement);

    this._adjustDefaultParameters(htmlElement);
    bcdui.widget._assureModelIdAndXPathAttributes( {htmlElement: htmlElement} );

    var config = {
      element: htmlElement,
      targetModelId: htmlElement.getAttribute("bcdTargetModelId"),
      targetModelXPath: htmlElement.getAttribute("bcdTargetModelXPath"),
      optionsModelId: htmlElement.getAttribute("bcdOptionsModelId"),
      optionsModelXPath: htmlElement.getAttribute("bcdOptionsModelXPath"),
      optionsModelRelativeValueXPath: htmlElement.getAttribute("bcdOptionsModelRelativeValueXPath")
    };

    var models = bcdui.widget._extractModelsFromModelXPath(config.optionsModelXPath);
    if(models){
      bcdui.widget._createWrapperModel(models, config, "widget/multiOptionsModelWrapper.xslt"); // does change config!
    }
    //Creates a listener on the original or combining options model to refresh the layout
    var action = function() {
      bcdui.widget._cleanupHTMLElementId(htmlElement);
      bcdui.factory.objectRegistry.getObject(config.optionsModelId).addStatusListener({
        status: bcdui.factory.objectRegistry.getObject(config.optionsModelId).getReadyStatus(),
        listener: function() {
          bcdui.widget.singleSelect._readDataFromXML(htmlElement.id, bcdui.factory.objectRegistry.getObject(config.optionsModelId));
        }
      });
      bcdui.widget._cleanupHTMLElementId(htmlElement);
      var targetModel = bcdui.factory.objectRegistry.getObject(config.targetModelId);
      var listener = new bcdui.widget.singleSelect.XMLListener({
        idRef: config.targetModelId,
        trackingXPath: config.targetModelXPath,
        htmlElementId: htmlElement.id
      });
      bcdui.factory.addDataListener(listener);
      bcdui.widget._registerHTMLElementListener(htmlElement, listener);
      bcdui.widget.singleSelect._readDataFromXML(htmlElement.id, bcdui.factory.objectRegistry.getObject(config.optionsModelId));

      if (htmlElement.getAttribute("bcdEnableNavPath") != null && htmlElement.getAttribute("bcdEnableNavPath") == "true") {
        bcdui.widget.singleSelect.getNavPath(jQuery(htmlElement).parent().attr("id"), function(id, value) {
          bcdui.widget._linkNavPath(id, value);
        }.bind(this));
      }
    };

    if (bcdui.util.isString(config.optionsModelId) && !!config.optionsModelId.trim()) {
      bcdui.factory.objectRegistry.withReadyObjects(config.optionsModelId, action);
    } else {
      action();
    }
  },
  /**
   * @private
   */
  _writeDataToXML: function(htmlElementId){
    var htmlElement = document.getElementById(htmlElementId);
    var targetModel = bcdui.factory.objectRegistry.getObject(htmlElement.getAttribute("bcdTargetModelId"));
    var selectedElements = jQuery.makeArray(htmlElement.getElementsByTagName("input")).filter(function(input) { return input.checked; });
    var val = selectedElements.length > 0 ? selectedElements[0].value : null;

    var xmlBaseNode = bcdui.core.createElementWithPrototype(targetModel.dataDoc, htmlElement.getAttribute("bcdTargetModelXPath"), true);

    if (val == null) {
      if (xmlBaseNode.nodeType == 2){// is @
        bcdui.util.xml.getParentNode(xmlBaseNode).removeAttribute(xmlBaseNode.name);
      }
      else
        xmlBaseNode.text = "";
    } else {
      if (xmlBaseNode.nodeType == 2)
        xmlBaseNode.nodeValue = val;
      else
        xmlBaseNode.text = val;
    }
    targetModel.fire();
    jQuery(htmlElement).trigger(bcdui.widget.events.writeValueToModel);
  },

   /**
    * @private
    */
  _readDataFromXML: function(htmlElementId, evtSrc){
    var htmlElement = document.getElementById(htmlElementId);
    var targetModel = bcdui.factory.objectRegistry.getObject(htmlElement.getAttribute("bcdTargetModelId"));
    var targetModelXPath = htmlElement.getAttribute("bcdTargetModelXPath");
    var value = bcdui.widget._getDataFromXML(targetModel, targetModelXPath);
    if (evtSrc && evtSrc.id == htmlElement.getAttribute("bcdOptionsModelId")) {
      value = bcdui.widget._getDataFromXML(targetModel, targetModelXPath);
      bcdui.widget.singleSelect._updateOptions(htmlElementId);
      var caption = bcdui.widget._getCaptionOfValue(htmlElementId, value);
      if(caption == null ){
        var isWrsModel = (targetModel.getData().selectSingleNode("/wrs:Wrs") != null ? true:false);
        if(!isWrsModel){
          bcdui.core.removeXPath(targetModel, targetModelXPath);
          targetModel.fire();
        }
      }
    } else {
      value ? jQuery("#" + htmlElementId).closest(".bcdSingleSelect").addClass("bcdActiveFilter") : jQuery("#" + htmlElementId).closest(".bcdSingleSelect").removeClass("bcdActiveFilter");

      jQuery(bcdui._migPjs._$(htmlElement).find("form input")).each(function(i, optionElement) {
        optionElement.checked = optionElement.value == value;
      });
    }
  },

  /**
   * @private
   */
  _updateOptions: function(htmlElementId){

    var htmlElement =  document.getElementById(htmlElementId);
    var args= {
      htmlElement: htmlElement,
      optionsModel: bcdui.factory.objectRegistry.getObject(htmlElement.getAttribute("bcdOptionsModelId")),
      targetModel: bcdui.factory.objectRegistry.getObject(htmlElement.getAttribute("bcdTargetModelId")),
      optionsModelXPath: htmlElement.getAttribute("bcdOptionsModelXPath"),
      formName: htmlElementId + "_bcdui_radio_form",
      itemName: htmlElementId + "_bcdui_radio",
      optionsModelRelativeValueXPath: htmlElement.getAttribute("bcdOptionsModelRelativeValueXPath"),
      targetModelXPath : htmlElement.getAttribute("bcdTargetModelXPath"),
      labelElement :htmlElement.querySelector("label")
    };
    if( args.optionsModel.getData()==null )
      return;
    var nodes = args.optionsModel.getData().selectNodes(htmlElement.getAttribute("bcdOptionsModelXPath"));

    if(typeof document.forms[args.formName] == 'undefined'){
       bcdui.widget.singleSelect._createOptionsElement(args, nodes);
    } else {
      var parent = document.forms[args.formName].parentNode;
      parent.removeChild(document.forms[args.formName]);
      bcdui.widget.singleSelect._createOptionsElement(args, nodes);
    }
  },

  /**
   * @param {string} id targetHtml of widget
   * @param {function} callback to be called with generated caption
   * @return {string} NavPath information via callback for widget
   */
  getNavPath: function(id, callback) {
    if (id && id != "") {
      var e = jQuery("#" + id + " span[bcdTargetModelXPath]").first().get(0);
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
    * @private
    */
  _createOptionsElement: function(args, nodes){
    var radioForm = document.createElement("form");
    radioForm.setAttribute("name", args.formName);

    var rootModelNode = args.targetModel.dataDoc.selectSingleNode(args.targetModelXPath);
    var captionValueArr = bcdui.widget._getCaptionValueArray(args.htmlElement.id);
    var i=0;
    jQuery.makeArray(captionValueArr||nodes).forEach(function(item) {
      var caption=null;
      var value=null;
      // either fetch values from associative array or we got them from a nodeset
      if(captionValueArr){
        caption = item[0];
        value = item[1];
      }else{
        caption = value = item.nodeType == 1 ? item.text : item.nodeValue;
      }

      var wrapperDiv = document.createElement("span");
      bcdui._migPjs._$(wrapperDiv).addClass("bcdRadioItem");
      var textSpan = document.createElement("span");
      textSpan.style.verticalalign = "top";
      textSpan.appendChild(document.createTextNode(caption));
      wrapperDiv.style.verticalalign = "top";
      radioForm.appendChild(wrapperDiv);
      var isSelected=false;
      var radioItemValue = value;
      if(rootModelNode){
        var targetVal = rootModelNode.nodeType == 1 ? rootModelNode.text : rootModelNode.nodeValue;
        if(targetVal == radioItemValue){
          isSelected = true;
        }
      }
      {
        wrapperDiv.style.whitespace = "nowrap";
        wrapperDiv.style.verticalalign = "top";
        var parent=document.createElement("div");
        parent.innerHTML="<input type='radio' " + (isSelected ?'checked':"" ) +" name='" + args.itemName + "' value='" + radioItemValue + "' bcdPosInOptionsModel='" + i + "'></input>";
        var radioItem=parent.firstChild;

        bcdui._migPjs._$(radioItem).on("click", bcdui.widget.singleSelect._writeDataToXML.bind(undefined,args.htmlElement.id));

        wrapperDiv.appendChild(radioItem);
        wrapperDiv.appendChild(textSpan);
      }
      ++i;
    });
    args.htmlElement.innerHTML = "";
    args.labelElement && args.htmlElement.appendChild(args.labelElement);
    args.htmlElement.appendChild(radioForm);
  },

   /**
   *  Set default parameters
   *  @private
   * @param HTMLElement  htmlElement The element the singleSelect is based on.
   */
  _adjustDefaultParameters: function(HTMLElement) {
    if (HTMLElement.getAttribute("bcdKeepEmptyValueExpression") == ""||!HTMLElement.getAttribute("bcdKeepEmptyValueExpression")) {
      HTMLElement.setAttribute("bcdKeepEmptyValueExpression", "true");
    }
    if (HTMLElement.getAttribute("bcdInputType") == ""||!HTMLElement.getAttribute("bcdInputType")) {
      HTMLElement.setAttribute("bcdInputType", "radio");
    }
  },

  /**
   * @classdesc
   *  Listener to see changes of target Xpath in model. Calls visualization and validation of new data
   * @extends bcdui.widget.XMLDataUpdateListener
   * @private
   */
  XMLListener: class extends bcdui.widget.XMLDataUpdateListener
      /**
       * @lends bcdui.widget.singleSeelct.XMLListener.prototype
       */   {
   updateValue(evtSrc){
       bcdui.widget.singleSelect._readDataFromXML(this.htmlElementId, evtSrc);
     }
   }
})
