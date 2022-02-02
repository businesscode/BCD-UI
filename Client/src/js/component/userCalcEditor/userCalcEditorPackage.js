/*
  Copyright 2010-2022 BusinessCode GmbH, Germany

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
 * @namespace bcdui.component.userCalcEditor
 */
bcdui.component.userCalcEditor = Object.assign(bcdui.component.userCalcEditor, 
/** @lends bcdui.component.userCalcEditor */
{

  /**
   * @private
   */
  _schema_userCalcEditor_args: !(bcdui.factory.validate.jsvalidation._patterns) ? {} : 
    {
      name: "_schema_userCalcEditor_args",
      properties: {
        id:                             { type: "string",  required: false, pattern: bcdui.factory.validate.jsvalidation._patterns.dataProviderId },
        dialogCaption :                 { type: "string",  required: false },
        targetModelXPath:               { type: "string",  required: true,  pattern: bcdui.factory.validate.jsvalidation._patterns.writableModelXPath },
        optionsModelXPath:              { type: "string",  required: false, pattern: bcdui.factory.validate.jsvalidation._patterns.absoluteXPathWithDollar },
        optionsModelRelativeValueXPath: { type: "string",  required: false, pattern: bcdui.factory.validate.jsvalidation._patterns.relativeXPath },
        uniqueOptionsModelXpath:        { type: "string",  required: false, pattern: bcdui.factory.validate.jsvalidation._patterns.absoluteXPath },
        validateVariableNamesCheckbox:  { type: "boolean", required: false },
        validateVariableNamesCaption:  { type: "string", required: false },
        successCallBack :               { type: "function", required: false },
        skipServerSidedFunctions:       { type: "boolean", required: false }
      }
    },

    /**
     * @private
     */
   _htmlContainerId: "bcdCalcEditorModalContentDiv",

   /**
    * @private
    */
   _callbackFunction : undefined,

  /**
   * Brings up a user calc editor, i.e. an inout field with autocomplete for entering formulas that can be used in calculation.xslt
   * @param {Object} args The argument map:
   * @param {writableModelXPath}   args.targetModelXPath          - The XPath to write to.
   * @param {string}   [args.id]                                  - The base id of the field. If nothing is specified the id is generated.
   * @param {modelXPath} [args.optionsModelXPath]                 - An XPath returning a node-set holding the allowed
   * @param {modelXPath} [args.uniqueOptionsModelXPath]           -
   * variables for the formula editor. The parameter "optionsModelRelativeValueXPath" can optionally
   * be set to define non-visible values belonging to the visible options denoted by this XPath.
   * @param {xPath}    [args.optionsModelRelativeValueXPath]      - If specified this XPath is applied to each node returned by the "optionsModelXPath" to get a non-visible value to
   * be written to the target node. When no "optionsModelRelativeValueXPath" is given there is no distinction between the caption and value of each option.
   * @param {string}   [args.dialogCaption]                       - Caption of dialog window, it will be used as i18n key to translate the caption.
   * @param {boolean}  [args.isFormatOptionsVisible=true]         - Show format fields (format, scale, percent)
   * @param {boolean}  [args.validateVariableNamesCheckbox=false] - Show checkbox which enabling\disabling validation of variable names with list in optionsModel while input formula
   * @param {string}   [args.validateVariableNamesCaption]        - Caption of checkbox, which enable\disable formula variables validation
   * @param {function} [args.successCallBack                      - Callback function which called after success saving model after closing modal window
   * @param {boolean}  [args.skipServerSidedFunctions=false]      - Set to true to disable usage of server sided functions like CntDist.
   */
  showUserCalcEditor: function(args)
  {
    bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.component.userCalcEditor._schema_userCalcEditor_args);
    if (!args.id) {
      args.id = bcdui.factory.objectRegistry.generateTemporaryIdInScope("userCalcEditor_");
      if (args.id == "userCalcEditor_") {
        args.id += "0";
      }
    }
    var parameters = {
        dialogCaption:                  typeof args.dialogCaption == 'undefined' ? 'Calculation editor' : args.dialogCaption
      , targetModelXPath:               args.targetModelXPath
      , optionsModelXPath:              args.optionsModelXPath
      , uniqueOptionsModelXpath:        args.uniqueOptionsModelXpath
      , optionsModelRelativeValueXPath: args.optionsModelRelativeValueXPath
      , isFormatOptionsVisible:         typeof args.isFormatOptionsVisible == 'undefined' ? true : args.isFormatOptionsVisible
      , validateVariableNamesCheckbox:  typeof args.validateVariableNamesCheckbox == 'undefined' ? false : args.validateVariableNamesCheckbox
      , validateVariableNamesCaption:   typeof args.validateVariableNamesCaption == 'undefined' ? "Skip check of values" : args.validateVariableNamesCaption
      , skipServerSidedFunctions:       typeof args.skipServerSidedFunctions == 'undefined' ? false : args.skipServerSidedFunctions
      , id:                             args.id
    };
    bcdui.component.userCalcEditor._callbackFunction = args.successCallBack;

    if (jQuery("#" + bcdui.component.userCalcEditor._htmlContainerId).length == 0) {
      jQuery("body").append("<div id='" + bcdui.component.userCalcEditor._htmlContainerId + "' style='display:none; position:relative'></div>");
    }

    var targetModel = bcdui.factory._extractXPathAndModelId(args.targetModelXPath);
    var elem = bcdui.core.createElementWithPrototype(bcdui.factory.objectRegistry.getObject(targetModel.modelId).getData(), targetModel.xPath);

    var wrapperId = "modal_" + args.id;
    var tempModel = bcdui.factory.createStaticModel( {
      id: "temp_model_" + wrapperId,
      data: "<Root>" + (elem != null ? new XMLSerializer().serializeToString(elem) : "<Model></Model>") + "</Root>"
    });
    parameters.tempTargetModelXPath = "$" + bcdui.factory.objectRegistry.getObject(tempModel).id + "/Root/*";

    var res = bcdui.factory.createRenderer({
      id: wrapperId,
      url: bcdui.util.url.resolveToFullURLPathWithCurrentURL("/bcdui/js/component/userCalcEditor/userCalcEditorTemplate.xslt"),
      parameters: parameters,
      targetHTMLElementId: bcdui.component.userCalcEditor._htmlContainerId
    });

    bcdui.factory.objectRegistry.withReadyObjects(wrapperId, function() {
      var containerHtmlElement = bcdui._migPjs._$(args.id).get(0);
      containerHtmlElement.isEditMode = args.isEditMode;
      if(args.isEditMode) {
        containerHtmlElement.originalCaption = elem.selectSingleNode("@caption").text;
      }
      bcdui.widget._assureModelIdAndXPathAttributes( {htmlElement: containerHtmlElement} );
      var bcdCalcEditorFormat = bcdui._migPjs._$(containerHtmlElement).find("input.bcdCalcEditorFormat")[0];
      bcdCalcEditorFormat.onclick = bcdui.component.userCalcEditor._onCalcEditorFormatChanged.bind(undefined,bcdCalcEditorFormat, containerHtmlElement);

      var isFormatNodesExists = bcdui.factory.objectRegistry.getObject(targetModel.modelId).getData().selectSingleNode(targetModel.xPath + "/calc:Calc/@unit") != null;
      isFormatNodesExists = isFormatNodesExists || bcdui.factory.objectRegistry.getObject(targetModel.modelId).getData().selectSingleNode(targetModel.xPath + "/calc:Calc/@scale") != null;
      if (isFormatNodesExists){
        bcdCalcEditorFormat.setAttribute("checked","checked");
        bcdCalcEditorFormat.checked = true;
        bcdCalcEditorFormat.defaultChecked = true;
      } else {
        bcdCalcEditorFormat.removeAttribute("checked");
      }
      bcdui.component.userCalcEditor._onCalcEditorFormatChanged(bcdCalcEditorFormat, containerHtmlElement);

      var isAutoZinOp = bcdui.factory.objectRegistry.getObject(targetModel.modelId).getData().selectSingleNode(targetModel.xPath + "/calc:Calc[@zeroIfNullOp='true']") != null;

      var bcdZeroIfNullOp = bcdui._migPjs._$(containerHtmlElement).find("input.bcdZeroIfNullOp")[0];

      if(isAutoZinOp) {
        bcdZeroIfNullOp.setAttribute("checked", "checked");
        bcdZeroIfNullOp.checked = true;
        bcdZeroIfNullOp.defaultChecked = true;
      }

      var isSuppressZero = bcdui.factory.objectRegistry.getObject(targetModel.modelId).getData().selectSingleNode(targetModel.xPath + "/calc:Calc/calc:Niz") != null;
      var bcdSuppressZero = bcdui._migPjs._$(containerHtmlElement).find("input.bcdSuppressZero")[0];
      if (isSuppressZero){
        bcdSuppressZero.setAttribute("checked", "checked");
        bcdSuppressZero.checked = true;
        bcdSuppressZero.defaultChecked = true;
      }

      var bcdCalcEditorPercent = bcdui._migPjs._$(containerHtmlElement).find("input.bcdCalcEditorPercent")[0];
      var isPercent = bcdui.widget._getDataFromXML(bcdui.factory.objectRegistry.getObject(targetModel.modelId), targetModel.xPath + "/calc:Calc/@unit") == "%";
      if (isPercent){
        bcdCalcEditorPercent.setAttribute("checked", "checked");
        bcdCalcEditorPercent.checked = true;
        bcdCalcEditorPercent.defaultChecked = true;
      }
      bcdui.factory.objectRegistry.withReadyObjects(targetModel.modelId, function() {
        var params = {
            position: {my: "center center", at: "center center"}
          , width: 420
          , title: args.dialogCaption
          , htmlElementId: bcdui.component.userCalcEditor._htmlContainerId
        };
        bcdui.widget.showModalBox(params);

        var tm = jQuery("#inputScale > input").attr("bcdTargetModelId");
        var tx = jQuery("#inputScale > input").attr("bcdTargetModelXPath");

        // avoid an empty or illegal scale field
        if (tm != null && tx != null) {
          bcdui.factory.objectRegistry.getObject(tm).onChange({trackingXPath: tx, callback: function(){
            if (jQuery("#doScale").is(":checked")) {
              var v = bcdui.factory.objectRegistry.getObject(tm).read(tx, "");
              v = "" + ((isNaN(parseInt(v, 10)) || parseInt(v, 10) < 0) ? 2 : parseInt(v, 10));
              bcdui.factory.objectRegistry.getObject(tm).write(tx, v, true);
            }
          }});
        }

        // since we created this as a hidden div, we need to show the copied content now
        jQuery("#" + bcdui.component.userCalcEditor._htmlContainerId).show();
      });
    });
  },

  /**
   * @private
   */
  _onCalcEditorFormatChanged: function(element, containerHtmlElement) {
    var t = bcdui.component.userCalcEditor._getModelData(containerHtmlElement);
    var currentFormula = bcdui.factory.objectRegistry.getObject(t.tempTargetModelId).getData().selectSingleNode("//calc:Calc");
    var elementsContainer = bcdui._migPjs._$(containerHtmlElement).find(".bcdCalcEditorFormatComponents")[0];
    var nodes = elementsContainer.getElementsByTagName("input");
    if (element.checked) {
      for(var i = 0; i < nodes.length; i++) {
        nodes[i].removeAttribute("disabled");
      }
      if (currentFormula != null){
        if (currentFormula.getAttribute("scale") == null){
          currentFormula.setAttribute("scale", 2);
          bcdui.factory.objectRegistry.getObject(t.tempTargetModelId).fire();
        }
      }
    } else {
      for(var i = 0; i < nodes.length; i++) {
        nodes[i].setAttribute("disabled","disabled");
      }
      if (currentFormula != null){
        currentFormula.removeAttribute("scale");
        currentFormula.removeAttribute("unit");
        bcdui.factory.objectRegistry.getObject(t.tempTargetModelId).fire();
      }
    }
  },

  /**
   * is called whenever a name is updated to validate against empty input and uniqueness check
   * @private
   */
  _onNameUpdate : function(containerHtmlElement, formularHtmlContainer, inputEl){
    var t = bcdui.component.userCalcEditor._getModelData(bcdui._migPjs._$(containerHtmlElement).get(0));
    var tempDataModel = bcdui.factory.objectRegistry.getObject(t.tempTargetModelId);
    var value = bcdui.widget._getDataFromXML(tempDataModel, t.tempTargetModelXPath + "/@caption");
    var isEditMode = bcdui._migPjs._$(containerHtmlElement).get(0).isEditMode;

    /**
     * @private
     */
    function _setInvalidState(message) {
      inputEl.isInvalid=true;
      // add invalid markup
      bcdui._migPjs._$(inputEl).parent().addClass("bcdInvalid");
      inputEl.setAttribute("title",message);
      // write invalid state
      bcdui.core.createElementWithPrototype(tempDataModel,t.tempTargetModelXPath+"/@captionError").text=message;
    }

    /**
     * @private
     */
    function _clearInvalidState() {
      if(inputEl.isInvalid){
        bcdui._migPjs._$(inputEl).parent().removeClass("bcdInvalid");
        inputEl.removeAttribute("title");
        bcdui.core.removeXPath(tempDataModel, t.tempTargetModelXPath+"/@captionError");
        inputEl.isInvalid=false;
      }
    }

    var message = "";

    if(value=="" || value==null) {
      // check non-empty
      message = "Name is empty";
    }else{
      // skip uniqueness check if in editMode and the caption is still the original one
      if(!isEditMode || value != bcdui._migPjs._$(containerHtmlElement).get(0).originalCaption){
        if (t.uniqueOptionsModelXpath) {
          var optionsModel = bcdui.factory.objectRegistry.getObject(bcdui._migPjs._$(formularHtmlContainer).attr("bcdoptionsmodelid"));
          // case insensitive check
          var isUnique = optionsModel.dataDoc.selectSingleNode(t.uniqueOptionsModelXpath+"[ translate(.,'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz') = translate('"+value+"','ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz')]") == null;
          if(!isUnique) {
            // check uniqueness
            message = "Name is not unique";
          }
        }
      }
    }

    if(message != "") {
      // set invalid state
      _setInvalidState(message);
    }else{
      // clear invalid state
      _clearInvalidState();
    }
  },

  /**
   * Saving temporary model to target model
   * @private
   */
  _save: function()
    {
      var containerHtmlElement = jQuery("#" + bcdui.component.userCalcEditor._htmlContainerId).children().first().get(0);
      var t = bcdui.component.userCalcEditor._getModelData(containerHtmlElement);
      var generatedNodes = bcdui.factory.objectRegistry.getObject(t.tempTargetModelId).getData().selectSingleNode(t.tempTargetModelXPath);

      if (generatedNodes != null){
        var isValid = bcdui.widget._getDataFromXML(bcdui.factory.objectRegistry.getObject(t.tempTargetModelId), t.tempTargetModelXPath + "/@isValid");
        var message = bcdui.widget._getDataFromXML(bcdui.factory.objectRegistry.getObject(t.tempTargetModelId), t.tempTargetModelXPath + "/@message");
        var captionError = bcdui.widget._getDataFromXML(bcdui.factory.objectRegistry.getObject(t.tempTargetModelId), t.tempTargetModelXPath + "/@captionError");
        captionError = (captionError == null) ? "" : ", " + captionError;

        if (isValid == "true" && captionError == "" && generatedNodes.getAttribute("caption") != null && generatedNodes.getAttribute("caption") != "") {
          bcdui.core.removeXPath(t.targetModel, t.targetModelXPath + "/*");
          var elem = bcdui.core.createElementWithPrototype(t.targetModel.getData(), t.targetModelXPath);
          if (elem.getAttribute("id") == null)
            elem.setAttribute("id", containerHtmlElement.getAttribute("id"));

          elem.setAttribute("caption", generatedNodes.getAttribute("caption"));
          elem.setAttribute("userDefined","true");
          elem.setAttribute("userInput", generatedNodes.getAttribute("userInput"));
          var formula = generatedNodes.selectSingleNode("*");
          if (formula != null) {
            var bcdCalcEditorPercent = bcdui._migPjs._$(containerHtmlElement).find("input.bcdCalcEditorPercent")[0];
            if (bcdCalcEditorPercent.checked) {
              formula.setAttribute("unit", "%");
            }else{
              formula.removeAttribute("unit");
            }
            if (!bcdui._migPjs._$(containerHtmlElement).find("input.bcdCalcEditorFormat")[0].checked){
              formula.removeAttribute("unit");
              formula.removeAttribute("scale");
            }

            // If there is a global zero-if-null-on-operands, add ann appropriate attribute to calc:Calc node
            var bcdZeroIfNullOp = bcdui._migPjs._$(containerHtmlElement).find("input.bcdZeroIfNullOp")[0];
            if (bcdZeroIfNullOp.checked)
              generatedNodes.selectSingleNode("calc:Calc").setAttribute("zeroIfNullOp","true");

            // If there is a global Niz, put a calc:Nix node between calc:Calc and its child
            var bcdSuppressZero = bcdui._migPjs._$(containerHtmlElement).find("input.bcdSuppressZero")[0];
            if (bcdSuppressZero.checked) {
              var calcNode = generatedNodes.selectSingleNode("calc:Calc").cloneNode(true);
              bcdui.core.removeXPath(generatedNodes, "calc:Calc/*");
              var niz = bcdui.core.browserCompatibility.appendElementWithPrefix(generatedNodes.selectSingleNode("calc:Calc"), "calc:Niz");
              for(var i=0; i<calcNode.childNodes.length; i++)
                niz.appendChild(calcNode.childNodes.item(i));
            }
            elem.appendChild(generatedNodes.selectSingleNode("*").cloneNode(true));
          }
          t.targetModel.fire();
        }
        else {

          if (generatedNodes.getAttribute("caption") == null || generatedNodes.getAttribute("caption") == "") {
            message = bcdui.wkModels.bcdI18nModel.getData().getElementsByTagName("bcd_ApplyDenyMessage").length > 0 ? bcdui.wkModels.bcdI18nModel.getData().getElementsByTagName("bcd_ApplyDenyMessage")[0].text : "Please fill out all required chooser";
            captionError = "";
          }

          alert(message == null ? "Incorrect data " + captionError : message + captionError);
          return;
        }
      }

      if (typeof bcdui.component.userCalcEditor._callbackFunction != 'undefined')
        bcdui.component.userCalcEditor._callbackFunction();

      bcdui.component.userCalcEditor._destroy(containerHtmlElement);
    },

    /**
     * Closing modal without saving
     * @private
     */
  _cancel: function()
    {
      var containerHtmlElement = jQuery("#" + bcdui.component.userCalcEditor._htmlContainerId).children().first().get(0);
      bcdui.component.userCalcEditor._destroy(containerHtmlElement);
    },

    /**
     * @private
     */
  _destroy: function(containerHtmlElement) {
    bcdui.widget.hideModalBox();
    bcdui.component.userCalcEditor._callbackFunction = undefined;
    if (containerHtmlElement != null)
      containerHtmlElement.InnerHTML = "";
  },

  /**
   * Retrieves the common target and options data.
   * @param {HtmlElement} containerHtmlElement Widget container element.
   * @return The map contains the following properties:
   * <ul>
   *   <li>targetModelId: {String} The identifier of target model.</li>
   *   <li>targetModel: {bcdui.core.DataProvider} The target model.</li>
   *   <li>targetModelXPath: {String} The XPath in whole XML model data.</li>
   *   <li>doc: {DomDocument} The XML data of provider.</li>
   *   <li>tempTargetModelId: {String} The identifier of temporary model.</li>
   *   <li>tempTargetModelXPath: {bcdui.core.DataProvider} The XPath in whole temporary model.</li>
   * </ul>
   * @private
   */
  _getModelData: function(containerHtmlElement)
    {
      var bcdOptionsModelXPath = containerHtmlElement.getAttribute("bcdOptionsModelXPath");
      var targetModelXPath = containerHtmlElement.getAttribute("bcdTargetModelXPath");
      var tempTargetModelXPath = containerHtmlElement.getAttribute("bcdTempTargetModelXPath");
      var tempTargetModel = bcdui.factory._extractXPathAndModelId(tempTargetModelXPath);
      var targetModelId = containerHtmlElement.getAttribute("bcdTargetModelId");
      var targetModel = bcdui.factory.objectRegistry.getObject(targetModelId);
      var uniqueOptionsModelXpath = containerHtmlElement.getAttribute("bcdUniqueOptionsModelXpath");
      var doc = targetModel.getData();

      var modelData = {
          bcdOptionsModelXPath : bcdOptionsModelXPath,
          targetModelId: targetModelId,
          targetModel: targetModel,
          targetModelXPath: targetModelXPath,
          uniqueOptionsModelXpath : uniqueOptionsModelXpath,
          doc: doc,
          tempTargetModelId: tempTargetModel.modelId,
          tempTargetModelXPath: tempTargetModel.xPath
      };

      modelData.element = containerHtmlElement;

      return modelData;
    }
}); // namespace