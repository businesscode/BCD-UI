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
 * A namespace for the BCD-UI formulaEditor widget.
 * @namespace bcdui.widget.formulaEditor
 */
bcdui.widget.formulaEditor = Object.assign(bcdui.widget.formulaEditor,
/** @lends bcdui.widget.formulaEditor */
{
  /**
   * Initialization of the whole widget. For creation @see {@link bcdui.widget.createFormulaEditor}
   * @param containerHtmlElement {HTMLElement} Widget container element.
   * @private
   */
  init: function(containerHtmlElement) {

    var skipVal = containerHtmlElement.getAttribute("bcdSkipValidationCaption");
    skipVal = (skipVal != null && skipVal != "") ? skipVal : "Skip check of values";
    var doValCheckbox = containerHtmlElement.getAttribute("bcdValidateVariableNamesCheckbox") == "true";

    jQuery(containerHtmlElement).append(
        "<div style='zoom:0;overflow:hidden;clear:both;height:0px;width:0px;'/>"
      + "<label" + bcdui.widget._domFromBcdAttribute(containerHtmlElement, "bcdCaption", "bcdTranslate") + ">"
      + bcdui.widget._getBcdAttributeValue(containerHtmlElement, "bcdCaption")
      + "</label><span class='bcdValue'><input type='text' class='bcdFormulaEditField form-control' /></span>"
      + "<div class='bcdFormulaSkipValidationDiv'"
      + (! doValCheckbox ? " style='display:none'" : "")
      + "><input type='checkbox' class='bcdFormulaSkipValidation checkboxes'"
      + (doValCheckbox ? " checked='true'" : "")
      + "/><label class='bcdFormulaSkipValidationLabel' bcdTranslate='" + skipVal + "'>" + skipVal + "</label></div>"
    ).addClass("bcdFormulaEditor");
    bcdui.widget._bcdIdToDomId(containerHtmlElement);
    bcdui.i18n.translateHTMLElement({elementOrId:containerHtmlElement});

    var el = bcdui._migPjs._$(containerHtmlElement);
    
    this._adjustDefaultParameters(containerHtmlElement);
    var id = containerHtmlElement.getAttribute("id");
    if (!id) {
      id =  bcdui.factory.objectRegistry.generateTemporaryIdInScope("formulaEditor_");
      if (id == "formulaEditor_") id += "0";
    }

    // legacy id naming    
    containerHtmlElement.setAttribute("id", id);

      bcdui.widget._assureModelIdAndXPathAttributes( {htmlElement: containerHtmlElement} );

      var config = bcdui.widget.formulaEditor._getModelData(el.get(0));

      // link to the skipValidationControl
      el.find("input.bcdFormulaSkipValidation")[0].onclick = bcdui.widget.formulaEditor._validateValue.bind(undefined,el.get(0));

      var isOptionsModelPresented = typeof config.optionsModelId != "undefined" && config.optionsModelId != null && !!config.optionsModelId.trim() &&
        typeof config.optionsModelXPath != "undefined" && config.optionsModelXPath != null && !!config.optionsModelXPath.trim();

      bcdui.factory.objectRegistry.withReadyObjects(
          isOptionsModelPresented
            ? [config.targetModelId, config.optionsModelId]
            : config.targetModelId,
          function() {

            bcdui.log.isDebugEnabled() && bcdui.log.debug("init: " + id + ", " + config.targetModelId);
            // initialization
            bcdui.widget.formulaEditor._initUpdaterViewFromXMLData(el.get(0));
            var validationTooltip = bcdui.widget.formulaEditor._initValidateWrapper(el.get(0));

            // attaching events to formula input control
            el.find("input.bcdFormulaEditField").each(function(i, input) {
              bcdui.widget.formulaEditor._addKeyObservers(containerHtmlElement, input);
              input.onchange = bcdui.widget.formulaEditor._onFormulaChanged.bind(undefined,el.get(0));
            });
            el.find("input.bcdFormulaSkipValidation").each(function(i, input) {
              input.onchange = bcdui.widget.formulaEditor._onFormulaChanged.bind(undefined,el.get(0));
            });

            bcdui.widget._initWidgetMandatory({
              htmlElement: el.get(0),
              onMandatoryChanged: function() {
                // run validation with changed mandatory value
                bcdui.widget.formulaEditor._validateValue(el.get(0));
              }
            });
            bcdui.widget.formulaEditor._onFormulaChanged(el.get(0));
            // calling initial validation
            bcdui.widget.formulaEditor._validateValue(el.get(0));
            el.css({ visibility: "" });
          });
    },

  /**
   * Initialization of validation wrapper. Using to show tooltip with custom validation results
   * @param containerHtmlElement {HTMLElement} Widget container element.
   * @param tooltipListener {Function} Listener which controls the tool tip.
   * @private
   */
  _initValidateWrapper: function(containerHtmlElement)
    {
      var t = bcdui.widget.formulaEditor._getModelData(containerHtmlElement);
      t.containerHtmlElement = containerHtmlElement;
      t.toolTipHtmlElement = bcdui._migPjs._$(containerHtmlElement).find("span.bcdValue")[0];
      return new bcdui.widget.validationToolTip(t);
    },

  /**
   * Update (plus validate if needed) listener initialization.
   * @param containerHtmlElement {HTMLElement} Widget container element.
   * @private
   */
  _initUpdaterViewFromXMLData: function(containerHtmlElement)
    {
      var t = bcdui.widget.formulaEditor._getModelData(containerHtmlElement);
      var listener = new bcdui.widget.formulaEditor.XMLListener({
        idRef: t.targetModelId,
        trackingXPath: t.targetModelXPath,
        htmlElementId: containerHtmlElement.id
      });
      bcdui.factory.addDataListener(listener);
      bcdui.widget.formulaEditor._updateViewFromXMLData(containerHtmlElement);
    },

  /**
   * Retrieves the common target and options data.
   * @param containerHtmlElement {HTMLElement} Widget container element.
   * @private
   * @return The map contains the following properties:
   * <ul>
   *   <li>targetModelId: {String} The identifier of target model.</li>
   *   <li>targetModel: {DataProvider} The target model.</li>
   *   <li>targetModelXPath: {String} The XPath in whole XML model data.</li>
   *   <li>doc: {XMLDocument} The XML data of provider.</li>
   *   <li>optionsModelId: {String} The identifier of options model.</li>
   *   <li>optionsModel: {DataProvider} The options model.</li>
   *   <li>optionsModelXPath: {String} The XPath in whole XML options data.</li>
   *   <li>optionsModelRelativeValueXPath: {String} The relative XPath in whole XML options data.</li>
   * </ul>
   */
  _getModelData: function(containerHtmlElement)
    {
      var targetModelXPath = containerHtmlElement.getAttribute("bcdTargetModelXPath");
      var userInputXPath = targetModelXPath + "/@userInput";
      var targetModelId = containerHtmlElement.getAttribute("bcdTargetModelId");
      var optionsModelXPath = containerHtmlElement.getAttribute("bcdOptionsModelXPath");
      var optionsModelRelativeValueXPath = containerHtmlElement.getAttribute("bcdOptionsModelRelativeValueXPath");

      var targetModel = bcdui.factory.objectRegistry.getObject(targetModelId);
      var doc = targetModel.getData();
      var modelData = { targetModelId: targetModelId, targetModel: targetModel, targetModelXPath: targetModelXPath, doc: doc, userInputXPath: userInputXPath };

      if (bcdui.util.isString(optionsModelXPath) && !!optionsModelXPath.trim()) {
        modelData.optionsModelId = containerHtmlElement.getAttribute("bcdOptionsModelId");
        modelData.optionsModel = bcdui.factory.objectRegistry.getObject(modelData.optionsModelId);
        modelData.optionsModelXPath = optionsModelXPath;
        modelData.optionsModelRelativeValueXPath = optionsModelRelativeValueXPath;
      }

      modelData.element = containerHtmlElement;

      return modelData;
    },

  /**
   * Fires when formula changed. Will call updating XML formula model
   * @param InputField {HTMLElement} The input element which contains formula.
   * @private
   */
  _onFormulaChanged: function(containerHtmlElement)
    {
      var inputField = bcdui._migPjs._$(containerHtmlElement).find("input.bcdFormulaEditField")[0];
      bcdui.log.isTraceEnabled() && bcdui.log.trace("formula changed to: " + inputField.value);
      var formula = inputField.value;
      var t = bcdui.widget.formulaEditor._getModelData(containerHtmlElement);
      var skipValidationEl = bcdui._migPjs._$(containerHtmlElement).find("input.bcdFormulaSkipValidation")[0];
      var skipVariablesValidation = skipValidationEl.checked;
      var skipServerSidedFunctions = bcdui._migPjs._$(containerHtmlElement).attr("bcdSkipServerSidedFunctions") == "true";
      bcdui.widget.formulaEditor._updateXMLDoc(formula, t.targetModel, t.targetModelXPath, t.optionsModel, t.optionsModelXPath, t.optionsModelRelativeValueXPath, skipVariablesValidation, skipServerSidedFunctions);
    },

  /**
   * Updates the XML model data. Parses formula and if success put tree under targetModelXPath
   * @private
   * @param formula {String} formula value.
   * @param targetModel {DataProvider} The target model.
   * @param targetModelXPath {String} The XPath in whole XML model data.
   * @param optionsModel {DataProvider?} The options model with variables for formula.
   * @param optionsModelXPath {String?} The XPath to variable in whole XML options data.
   * @param optionsModelRelativeValueXPath {String?} Relative path to caption of variable in options model
   * @param skipServerSidedFunctions {Boolean} Set to true to disable usage of server sided functions like CntDist. Default is false.
   */
  _updateXMLDoc: function(formula, targetModel, targetModelXPath, optionsModel, optionsModelXPath, optionsModelRelativeValueXPath, skipVariablesValidation, skipServerSidedFunctions)
    {
      var doc = targetModel.getData();
      if (formula == "") {
       bcdui.core.removeXPath(targetModel, "//calc:Calc/*" );
       targetModel.fire();
        return;
      }

      var currentFormula = targetModel.getData().selectSingleNode("//calc:Calc");
      // if initialization
      if (currentFormula == null){
        var defaultScale = 2;
        var defaultUnit = "%";
      }else{
        var defaultScale = targetModel.getData().selectSingleNode("//calc:Calc/@scale") == null ? null : targetModel.getData().selectSingleNode("//calc:Calc/@scale").value;
        var defaultUnit = targetModel.getData().selectSingleNode("//calc:Calc/@unit") == null ? null : targetModel.getData().selectSingleNode("//calc:Calc/@unit").value;
      }

      bcdui.widget.formulaEditor._setUnparsedFormula(formula, targetModel, targetModelXPath);

      var parseResult = bcdui.widget.formulaEditor._parseText(formula, optionsModel, optionsModelXPath, optionsModelRelativeValueXPath, skipVariablesValidation, skipServerSidedFunctions);
      var elem = bcdui.core.createElementWithPrototype(targetModel.getData(), targetModelXPath);
      elem.text = "";
      bcdui.core.removeXPath(elem, "*");

      if (parseResult.result && parseResult.xml != null){
        if (defaultScale == null)
          parseResult.xml.removeAttribute("scale");
        else
          parseResult.xml.setAttribute("scale", defaultScale);
        if (defaultUnit == null)
          parseResult.xml.removeAttribute("unit");
        else
          parseResult.xml.setAttribute("unit", defaultUnit);
        elem.appendChild(parseResult.xml);
      }
      elem.setAttribute("userInput", formula);
      targetModel.fire();
    },

  /**
   * Return formula tree if formula successfully parsed, and input string if formula not parsed
   * @param targetModel {DataProvider} The target model.
   * @param targetModelXPath {String} The XPath in whole XML model data.
   * @private
   */
  readFormula: function(targetModel, targetModelXPath)
    {
      var userInput = bcdui.widget._getDataFromXML(targetModel, targetModelXPath + "/@userInput");
      var isValid = bcdui.widget._getDataFromXML(targetModel, targetModelXPath + "/@isValid");
      if (isValid == "true"){
        return targetModel.getData().selectSingleNode(targetModelXPath+"/*/");
      }else{
        return userInput;
      }
    },

  /**
   * Updates the XML attribute @userInput in model (will call only validation and will not generate xml).
   * @private
   * @param formula {String} formula value.
   * @param targetModel {DataProvider} The target model.
   * @param targetModelXPath {String} The XPath in whole XML model data.
   */
  _setUnparsedFormula: function(formula, targetModel, targetModelXPath)
    {
      var doc = targetModel.getData();
      var elem = bcdui.core.createElementWithPrototype(targetModel.getData(), targetModelXPath);
      elem.setAttribute("userInput", formula);
      targetModel.fire();
    },

  /**
   * Insert selected variable to input field.
   * @private
   * @param containerHtmlElement {HTMLElement} Widget container element.
   * @param variablesModelId {string} The variables model identifier.
   */
  _insertVariableFromModel: function(containerHtmlElement, variablesModelId)
    {
      // getting selected variable from temp model
      var variable = bcdui.factory.objectRegistry.getObject(variablesModelId).getData().selectSingleNode("//Root/Variable");
      if (variable == null || variable.text == "") return;
      // insert caption in formula editor text
      bcdui.widget.formulaEditor._insertText(containerHtmlElement, bcdui.widget._getCaptionOfValue(containerHtmlElement.id, variable.text));
      // remove node with variable from temp model
      variable.parentNode.removeChild(variable);
      bcdui.factory.objectRegistry.getObject(variablesModelId).fire();
    },

  /**
   * Insert text to formula input field.
   * @private
   * @param containerHtmlElement {HTMLElement} Widget container element.
   * @param variable {string?} custom text.
   */
  _insertText: function(containerHtmlElement, variable)
    {
      var el = bcdui._migPjs._$(containerHtmlElement);
    
      el.find("input.bcdFormulaEditField").each(function(index, input) {
        // getting current caret position in formula field (stored in attr)
        var pos = input.getAttribute("bcdCurrentCaret");
        if (!pos)
          pos = input.value.length;
        else
          pos = parseInt(pos);
        // checking if variable name contains formula parts
        if (bcdui.widget.formulaEditor.Parser.is_string_contain_operators(variable))
          variable = '"' + variable +'"';
        if (typeof(variable) == 'undefined' || variable == null || variable == "") return;
        // composing new formula string with variable
        input.value = (pos > 0 ? input.value.substring(0, pos) : "")
                        + variable
                        + input.value.substring(pos);
        // calling event handler (new text will be stored in model)
        bcdui.widget.formulaEditor._onFormulaChanged(el.get(0));
      });
    },

  /**
   * Returns caret position of input field
   * @param inputField {HTMLElement} html input element.
   * @private
   */
  _getCaret: function(inputField)
    {
      if( typeof inputField.selectionStart != "undefined" )
        return inputField.selectionStart;
      else if (inputField.createTextRange) {
        var r = (document.getSelection ? document.getSelection() : document.selection).createRange().duplicate(); // document.selection is for IE <= 8
        r.moveEnd('character', inputField.value.length)
        if (r.text == '') return inputField.value.length
          return inputField.value.lastIndexOf(r.text)
      }
    },

    /**
     * @private
     */
  _setCaret: function(inputField, position){
    if(inputField.setSelectionRange) {
      inputField.focus();
      inputField.setSelectionRange(position,position);
    }
    else if (inputField.createTextRange) {
      var range = inputField.createTextRange();
      range.collapse(true);
      range.moveEnd('character', position);
      range.moveStart('character', position);
      range.select();
    }
  },

  /**
   * parsing formula by calling external formula parser
   * @param {string} formula The actual formula.
   * @param {dataProvider} optionsModel The dataprovider holding the XML options.
   * @param {string} optionsModelXPath The XPath in whole XML options data.
   * @param {string} optionsModelRelativeValueXPath The relative XPath in whole XML options data.
   * @param {boolean} doNotValidateContent Do not validate content.
   * @param {boolean} skipServerSidedFunctions Skip server-sided functions.
   * @private
   */
  _parseText: function(formula, optionsModel, optionsModelXPath, optionsModelRelativeValueXPath, doNotValidateContent, skipServerSidedFunctions)
  {
      var result = bcdui.widget.formulaEditor.Parser.shunting_yard(formula, optionsModel, optionsModelXPath, optionsModelRelativeValueXPath, doNotValidateContent, skipServerSidedFunctions);
      return result;
    },

  /**
   * Updates the displayed value of formula from model XML data.
   * @private
   * @param containerHtmlElement {HTMLElement} Widget container element.
   */
  _updateViewFromXMLData: function(containerHtmlElement)
    {
      var el = bcdui._migPjs._$(containerHtmlElement);
      var t = bcdui.widget.formulaEditor._getModelData(el.get(0));
      el.find("input.bcdFormulaEditField").each(function(index, input) {
        var res = bcdui.widget._getDataFromXML(t.targetModel, t.userInputXPath);
        if (input.value != res) {
          input.value = res != null ? res : "";
        }
      });
    },

  /**
   * Formula validator
   * @private
   * @param containerHtmlElement {HTMLElement} Widget container element.
   */
  _validateValue: function(containerHtmlElement)
    {
      var el = bcdui._migPjs._$(containerHtmlElement);
      if (el.attr("bcdValidate") == "true") {
        var t = bcdui.widget.formulaEditor._getModelData(el.get(0));
        var formula = bcdui.widget._getDataFromXML(t.targetModel, t.userInputXPath);
        var message = "";
        var nullableAttr = t.doc.selectSingleNode(bcdui.widget._getMandatoryXPath(t.targetModel, t.targetModelXPath));
        var mandatory = (nullableAttr != null && nullableAttr.value == "0") || el.attr("bcdMandatory") == "true"
                      ? true : false;
        if (mandatory && (formula == null || formula == "")){
          message = "Formula is empty";
        }

        // validate content only if not skipped validation
        var skipValidationEl = el.find("input.bcdFormulaSkipValidation")[0];
        var skipVariablesValidation = skipValidationEl.checked;
        var skipServerSidedFunctions = el.attr("bcdSkipServerSidedFunctions") == "true";

        if (message == "" && formula) {
          var parseResult = bcdui.widget.formulaEditor._parseText(formula, t.optionsModel, t.optionsModelXPath, t.optionsModelRelativeValueXPath, skipVariablesValidation, skipServerSidedFunctions);
          if (!parseResult.result) {
            message = parseResult.error;
          }
        }
        // putting validation results to model
        var doc = bcdui.factory.objectRegistry.getObject(t.targetModelId).getData();
        var targetElement = bcdui.core.createElementWithPrototype(doc, t.targetModelXPath);

        if (message != null && message.trim() != "") {
          if (targetElement.getAttribute("isValid") != "false" || targetElement.getAttribute("message") != message) {
            targetElement.setAttribute("isValid", "false");
            targetElement.setAttribute("message", message);
            bcdui.factory.objectRegistry.getObject(t.targetModelId).fire();
          }
          el.find("span.bcdValue").each(function(i, span) {
            if (!bcdui._migPjs._$(span).hasClass("bcdInvalid")) bcdui._migPjs._$(span).addClass("bcdInvalid");
          });
          el.find("input.bcdFormulaEditField").each(function(i, input) {
            if (!bcdui._migPjs._$(input).hasClass("bcdInvalid")) bcdui._migPjs._$(input).addClass("bcdInvalid");
          });

        } else {
          if (targetElement.getAttribute("isValid") != "true") {
            targetElement.setAttribute("isValid", "true");
            if (targetElement.getAttribute("message")) {
              targetElement.removeAttribute("message");
            }
            bcdui.factory.objectRegistry.getObject(t.targetModelId).fire();
          }
          el.find("span.bcdValue").each(function(i, span) {
            if (bcdui._migPjs._$(span).hasClass("bcdInvalid")) bcdui._migPjs._$(span).removeClass("bcdInvalid");
          });
          el.find("input.bcdFormulaEditField").each(function(i, input) {
            if (bcdui._migPjs._$(input).hasClass("bcdInvalid")) bcdui._migPjs._$(input).removeClass("bcdInvalid");
          });
        }
      }
    },

  /**
   * Adds to the date input field key observers: onkeyup and onkeydown.
   * @private
   * @param input {HTMLElement} Date field - year, month or day.
   */
  _addKeyObservers: function(containerHtmlElement, input)
    {
    
      bcdui._migPjs._$(input).on("keyup", function(event) {
        // save current caret position
        input.setAttribute("bcdCurrentCaret", bcdui.widget.formulaEditor._getCaret(input));
        // setting formula into @userInput and validation after it
        var t = bcdui.widget.formulaEditor._getModelData(containerHtmlElement);
        bcdui.widget.formulaEditor._setUnparsedFormula(input.value, t.targetModel, t.targetModelXPath);
        var valueBox = document.getElementById("bcdAutoCompletionBox");
        switch (event.keyCode) {
          case bcdui.util.Event.KEY_DOWN: {
            if (valueBox == null || !bcdui._migPjs._$(valueBox).is(":visible")) {
              bcdui.widget.formulaEditor._updateOptions(containerHtmlElement, true /* noFilter */);
            }
            bcdui.widget.formulaEditor._moveSelection(containerHtmlElement, 1);
            break;
          }
          case bcdui.util.Event.KEY_UP: {
            if (valueBox == null || !bcdui._migPjs._$(valueBox).is(":visible")) {
              bcdui.widget.formulaEditor._updateOptions(containerHtmlElement, true /* noFilter */);
            }
            bcdui.widget.formulaEditor._moveSelection(containerHtmlElement, -1);
            break;
          }
          case bcdui.util.Event.KEY_RETURN: {// consume the event in keyUp because of IE6
            bcdui.widget.formulaEditor._hideOptions(containerHtmlElement, true);
            event.stopPropagation();
            event.preventDefault();
            break;
          }
          // to avoid default ESC-key behaviour
          case bcdui.util.Event.KEY_ESC: {
            event.stopPropagation();
            event.preventDefault();
            break;
          }
          default: {
            bcdui.widget.formulaEditor._updateOptions(containerHtmlElement);
          }
        }
      });
      bcdui._migPjs._$(input).on("keydown", function(event) {
        switch (event.keyCode) {
          case bcdui.util.Event.KEY_ESC: {
            event.stopPropagation();
            event.preventDefault();
            bcdui.widget.formulaEditor._hideOptions(containerHtmlElement, false);
            break;
          }
          case bcdui.util.Event.KEY_UP: {
            event.stopPropagation();
            event.preventDefault();
            break;
          }
          case bcdui.util.Event.KEY_DOWN: {
            event.stopPropagation();
            event.preventDefault();
            break;
          }
        }
      });
      // to avoid default ESC-key behaviour
      bcdui._migPjs._$(input).on("keypress", function(event) {
        switch (event.keyCode) {
          case bcdui.util.Event.KEY_ESC: {
            event.stopPropagation();
            event.preventDefault();
            break;
          }
        }
      });
      bcdui._migPjs._$(input).on("click", function(event) {
        input.setAttribute("bcdCurrentCaret", bcdui.widget.formulaEditor._getCaret(input));
      });
    },

  /**
   * @param {boolean} setValue=true
   * @private
   */
  _hideOptions: function(containerHtmlElement, setValue)
    {
      var htmlElement = bcdui._migPjs._$(containerHtmlElement).find("input.bcdFormulaEditField")[0];
      var htmlElementId = containerHtmlElement.id;
      // unregister the click listener
      jQuery(document).stop('mousedown',bcdui.widget.formulaEditor._hideOnClickListener);

      var valueBox = bcdui._migPjs._$("bcdAutoCompletionBox");
      if (valueBox != null && valueBox.attr("bcdHtmlElementId") == htmlElementId) {
        valueBox.hide();
        if (!(setValue == false)) {
          var selectedElement = bcdui.widget.formulaEditor._getSelectedElement(containerHtmlElement);
          if (selectedElement != null) {
            if(htmlElement){
                var v = bcdui.util.stripTags(selectedElement.innerHTML).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
                if (v.indexOf("\"") != 0)
                  v = "\"" + v + "\"";
                var pos = htmlElement.getAttribute("bcdCurrentCaret");
                if (!pos)
                  pos = htmlElement.value.length;
                var textBeforeCursor = htmlElement.value.substring(0, pos).replace(/["a-zA-Z0-9\.\s\[]*$/, v);
                var textAfterCursor = htmlElement.value.substring(pos);
                htmlElement.value = textBeforeCursor + textAfterCursor;
              }
              htmlElement.onchange();
            }
        }
        window.setTimeout(
          function(){
            try {
              bcdui._migPjs._$(htmlElement).focus();
              if (textBeforeCursor)
                bcdui.widget.formulaEditor._setCaret(htmlElement, textBeforeCursor.length);
              valueBox.hide();
            } catch (e) {
              bcdui.log.warn("exception in formulaEditorPackage _hideOptions:" + e.message);
            }
        } , 1);
      }
    },

  /**
   * @private
   */
  _areOptionsVisible: function(containerHtmlElement)
    {
      var valueBox = bcdui._migPjs._$("bcdAutoCompletionBox");
      if (valueBox != null && valueBox.attr("bcdHtmlElementId") == containerHtmlElement.id) {
        return valueBox.is(":visible");
      }
      return false;
    },

  /**
   * @private
   */
  _updateOptions: function(containerHtmlElement, noFilter)
    {
      // attach bcdAutoCompletionBox in toplevel bcdSingletonHolder 
      var bcdHolder = bcdui.util.getSingletonElement("bcdSingletonHolder", true);

      // First time we may need to create the singleton #bcdAutoCompletionBox
      var valueBox = jQuery("#bcdAutoCompletionBox");
      if (! valueBox.length > 0) {
        jQuery(bcdHolder).append("<div id='bcdAutoCompletionBox' style='display:none; position:absolute'></div>");
        valueBox = jQuery("#bcdAutoCompletionBox");
//        if (bcdui.browserCompatibility.isIE) {
//          valueBox.on("mouseenter", bcdui.widget.inputField._ieWorkaround_onMouseOverValueBox.bind(undefined,htmlElementId));
//        }
      }

      var htmlElement = bcdui._migPjs._$(containerHtmlElement).find("input.bcdFormulaEditField")[0];
      var value = htmlElement.value;
      value = value.substring(0, bcdui.widget.formulaEditor._getCaret(htmlElement));
      value = "" + value.match(/["a-zA-Z0-9\.\s\[]*$/);

      if (valueBox.attr("bcdHtmlElementId") == containerHtmlElement.id && valueBox.attr("bcdValue") == value && !noFilter) {
        return;
      }

      valueBox.attr("bcdHtmlElementId", containerHtmlElement.id);

      bcdui.util.clonePosition(valueBox.get(0), htmlElement,
          { setHeight: false,
            setWidth: false,
            offsetTop: bcdui._migPjs._$(htmlElement).outerHeight()
          }
      );

      valueBox.attr("bcdValue", value);

      var maxOptionsCount = parseInt(htmlElement.getAttribute("bcdMaxOptionsCount"), 10);
      if (isNaN(maxOptionsCount)) {
        maxOptionsCount = 0;
      }

      var optionsModelId = containerHtmlElement.getAttribute("bcdOptionsModelId");
      var optionsModelXPath = containerHtmlElement.getAttribute("bcdOptionsModelXPath");
      var optionsModel = bcdui.factory.objectRegistry.getObject(optionsModelId);
      var nodes = null;
      if(!noFilter){
        var xPathPredicate = "[../@bcdSeparator='true' or starts-with(normalize-space(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ([\"', 'abcdefghijklmnopqrstuvwxyz')), normalize-space(translate('" + value + "', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ([\"', 'abcdefghijklmnopqrstuvwxyz')))]";
        var xPath = optionsModelXPath + (!value.trim() || value == "\"" ? "" : xPathPredicate);
        nodes = optionsModel.getData().selectNodes(xPath);
      }
      else{
        nodes = optionsModel.getData().selectNodes(optionsModelXPath);
      }

      //the value sort can be turned off
      if (htmlElement.getAttribute("bcdIsSortOptions") == "true") {
        nodes = jQuery.makeArray(nodes).sort(
          function(a,b){
            var x = (a.nodeValue||a.text).toLowerCase(), y = (b.nodeValue||b.text).toLowerCase();
            return x < y ? -1 : x > y ? 1 : 0;
          }
        );
      }
      valueBox.html("");

      if (nodes.length == 0 || (value == "" && !noFilter)) {
        if (valueBox.is(":visible"))
          bcdui.widget.formulaEditor._hideOptions(containerHtmlElement, false);
        return;
      }
      // add option from model
      for (var i = 0; i < nodes.length; ++i) {
        if (maxOptionsCount > 0 && i >= maxOptionsCount) break;
        var node = nodes[i];
        var isSep = (node.selectSingleNode(".././@bcdSeparator") != null && node.selectSingleNode(".././@bcdSeparator").text == "true");
        var val = node.nodeType == 1 ? node.text : node.nodeValue;
        bcdui.widget.formulaEditor._addOption(containerHtmlElement, val, isSep);
      }

      if (!valueBox.is(":visible")) {
        // take over font-size of inputfield
        jQuery(valueBox).css("font-size", jQuery(htmlElement).css("font-size"));

        valueBox.show();
      }
      // scroll to Top
      bcdui._migPjs._$('bcdAutoCompletionBox').get(0).scrollTop = 0;
      bcdui._migPjs._$('bcdAutoCompletionBox').get(0).style.width = 'auto';
      bcdui._migPjs._$('bcdAutoCompletionBox').get(0).style.minWidth = '150px';
      // register event listener that closes the popup if the user clicks somewhere outside of the popup
      jQuery(document).on('mousedown',bcdui.widget.formulaEditor._hideOnClickListener);

      //set focus to input field so the user can start typing
      bcdui._migPjs._$(htmlElement).focus();
    },

  /**
   * Add the option to the bcdAutoCompletionBox.
   * @return the added item (HTMLElement)
   * @private
   */
  _addOption: function(containerHtmlElement, value, isSep)
    {
      var valueBox = document.getElementById("bcdAutoCompletionBox");
      var item = valueBox.appendChild(document.createElement("div"));
      if (isSep)
        bcdui._migPjs._$(item).addClass("bcdSeparator");
      item.onmousedown = bcdui.widget.formulaEditor._optionClicked.bind(undefined,containerHtmlElement, item);
      bcdui._migPjs._$(item).on("mouseover", bcdui.widget.formulaEditor._setSelectedElement.bind(undefined,containerHtmlElement, item));
      item.appendChild(document.createTextNode(value));
      return item;
    },

  /**
   * @private
   */
  _optionClicked: function(containerHtmlElement, anchor)
    {
      bcdui.widget.formulaEditor._setSelectedElement(containerHtmlElement, anchor);
      bcdui.widget.formulaEditor._hideOptions(containerHtmlElement);
    },

  /**
   * @private
   */
  _getSelectedElement: function(containerHtmlElement)
    {
      var valueBox = document.getElementById("bcdAutoCompletionBox");
      if (valueBox != null && valueBox.getAttribute("bcdHtmlElementId") == containerHtmlElement.id) {
        var selectedElements = bcdui._migPjs._$(valueBox).find(".bcdSelected");
        if (selectedElements.length > 0) {
          return selectedElements[0];
        }
      }
      return null;
    },

  /**
   * @private
   */
  _setSelectedElement: function(containerHtmlElement, anchor)
    {
      if (bcdui._migPjs._$(anchor).hasClass("bcdSeparator"))
        return null;

      var valueBox = document.getElementById("bcdAutoCompletionBox");
      if (valueBox != null && valueBox.getAttribute("bcdHtmlElementId") == containerHtmlElement.id) {
        var selectedElements = bcdui._migPjs._$(valueBox).find(".bcdSelected");
        if (selectedElements.length > 0) {
          bcdui._migPjs._$(selectedElements[0]).removeClass("bcdSelected");
        }

        bcdui._migPjs._$(anchor).addClass("bcdSelected");
      }
      return null;
    },

  /**
   * @private
   */
  _moveSelection: function(containerHtmlElement, difference)
    {
      var valueBox = document.getElementById("bcdAutoCompletionBox");
      if (valueBox != null && valueBox.getAttribute("bcdHtmlElementId") == containerHtmlElement.id) {
        var nextElement = null;

        var selectedElements = bcdui._migPjs._$(valueBox).find(".bcdSelected");
        if (selectedElements.length > 0) {
          nextElement = (difference > 0) ? bcdui.util.xml.nextElementSibling(selectedElements[0]) : bcdui.util.xml.previousElementSibling(selectedElements[0]);

          if (nextElement != null && bcdui._migPjs._$(nextElement).hasClass("bcdSeparator"))
            nextElement = (difference > 0) ? bcdui.util.xml.nextElementSibling(nextElement) : bcdui.util.xml.previousElementSibling(nextElement);

            bcdui._migPjs._$(selectedElements[0]).removeClass("bcdSelected");
        }

        if (nextElement == null) {
          if (difference > 0)
            nextElement = bcdui.util.xml.firstElementChild(valueBox);
          else
            nextElement = bcdui.util.xml.lastElementChild(valueBox);
        }
        if(nextElement){
          bcdui._migPjs._$(nextElement).addClass("bcdSelected");
          bcdui.widget.formulaEditor._scrollIntoView(nextElement, valueBox);
        }
      }
    },

    /**
     * ensure item visibility by scrolling it into the view if necessary
     * 20 is taken as buffer for a possible horizontal scrollbar
     * @private
     */
    _scrollIntoView: function(element, container) {
      var containerTop = jQuery(container).scrollTop();
      var containerBottom = containerTop + jQuery(container).height();
      var elemTop = element.offsetTop;
      var elemBottom = elemTop + jQuery(element).height();
      if (elemTop < containerTop) {
        jQuery(container).scrollTop(elemTop);
      } else if (elemBottom + 20 > containerBottom) {
        jQuery(container).scrollTop(elemBottom + 20 - jQuery(container).height());
      }
    },
  /**
   *  the hideOnClickListener is registered in _updateOptions and deregistered in _hideOptions.
   *  it closes the popup box if the user clicks somewhere in the web page
   *  @private
   */
  _hideOnClickListener: function(event)
    {
      var valueBox = bcdui._migPjs._$("bcdAutoCompletionBox");
      var htmlElementId = valueBox.attr("bcdHtmlElementId");
      var elem = jQuery("#" + htmlElementId);
      // if click on any place outside valuebox or click on options element
      // valueBox == event.element() means that click on scrollbar
      if (elem.length > 0 && valueBox.get(0) != event.target) {
        if(htmlElementId && event && ((typeof event.target) != 'undefined') && !jQuery.contains(elem.get(0).parentNode, event.target)){
          bcdui.widget.formulaEditor._hideOptions(elem);
        }
      }
    },

  /**
   * Set default parameters
   * @private
   * @param HTMLElement  htmlElement The element the formulaEditor is based on.
   */
  _adjustDefaultParameters: function(HTMLElement)
    {
      if (HTMLElement.getAttribute("bcdValidate") == ""||!HTMLElement.getAttribute("bcdValidate")) {
        HTMLElement.setAttribute("bcdValidate", "true");
      }
      if (HTMLElement.getAttribute("bcdMandatory") == ""||!HTMLElement.getAttribute("bcdMandatory")) {
        HTMLElement.setAttribute("bcdMandatory", "false");
      }
    },

    /**
     * Listener to see changes of target Xpath in model. Calls visualization and validation of new data
     * @extends bcdui.widget.XMLDataUpdateListener
     * @private
     */
    XMLListener: class extends bcdui.widget.XMLDataUpdateListener
        /**
         * @lends bcdui.widget.formulaEditor.XMLListener.prototype
         */        
        {
          updateValue()
            {
              var containerHtmlElement = bcdui._migPjs._$(this.htmlElementId);
              bcdui.widget.formulaEditor._updateViewFromXMLData(containerHtmlElement.get(0));
              // formula JS validation
              bcdui.widget.formulaEditor._validateValue(containerHtmlElement.get(0));
            }
        },

    /**
     * Listener to see changes of target Xpath in model. Calls visualization and validation of new data
     * @extends bcdui.widget.XMLDataUpdateListener
     * @private
     */
    XMLVariablesListener: class extends bcdui.widget.XMLDataUpdateListener
        /**
         * @lends bcdui.widget.formulaEditor.XMLVariablesListener.prototype
         */        
        {
          constructor(){super()}

          updateValue()
            {
              var containerHtmlElement = bcdui._migPjs._$(this.htmlElementId);
              bcdui.widget.formulaEditor._insertVariableFromModel(containerHtmlElement.get(0), this._targetModelId);
            }
        }
}); // namespace
