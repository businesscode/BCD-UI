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
 * A namespace for the BCD-UI periodChooser widget. For creation @see {@link bcdui.widget.createPeriodChooser}
 * @namespace bcdui.widget.periodChooser
 */
bcdui.util.namespace("bcdui.widget.periodChooser",
/** @lends bcdui.widget.periodChooser */
{
  /**
  * @private
  */
  _bcdui_i18n_suported: false,

  /**
   * @private
   */
  _dateRangeBindingItemNames: { year : "yr", quarter : "qr", month: "mo", week: "cw",  weekYear: "cwyr", various:"dy", timestamp:"ts", yearweek: "cwyrcw", yearquarter: "yrqr", yearmonth: "yrmo"},

  /**
   * @private
   */
  _getBindingItemName: function(id, type) {
    var containerHtmlElement = jQuery("#" + id).get(0);
    var postfix = "";
    if (containerHtmlElement) {
      var targetModelId = containerHtmlElement.getAttribute("bcdTargetModelId");
      var targetModel = bcdui.factory.objectRegistry.getObject(targetModelId);
      var targetModelXPath = containerHtmlElement.getAttribute("bcdTargetModelXPath");
      var node = targetModel.query(targetModelXPath);
      if (node) {
        if (node.nodeType == 2)
          node = targetModel.getData().selectSingleNode(targetModelXPath + "/..");
        postfix = node.getAttribute("bcdPostfix");
        postfix = postfix != null ? postfix : "";
      }
    }

    if (postfix == "bcdEmpty")
      postfix = "";

    return bcdui.widget.periodChooser._dateRangeBindingItemNames[type] + (postfix != "" ? "_" + postfix : "");
  },

  /**
   * @private
   */
  _getBindingItemNames: function(id) {
    var a = {};
    for (var x in bcdui.widget.periodChooser._dateRangeBindingItemNames)
      a[x] = bcdui.widget.periodChooser._getBindingItemName(id, x);
    return a;
  },

  /**
   * @private
   */
  _getBindingItemNamesByTargetModel: function(targetModel, targetModelXPath) {
    var a = {};
    var node = targetModel.query(targetModelXPath);
    var postfix = "";
    if (node) {
      if (node.nodeType == 2)
        node = targetModel.getData().selectSingleNode(targetModelXPath + "/..");
      postfix = node.getAttribute("bcdPostfix");
      postfix = postfix != null ? postfix : "";
    }
    if (postfix == "bcdEmpty")
      postfix = "";
    for (var x in bcdui.widget.periodChooser._dateRangeBindingItemNames)
      a[x] = bcdui.widget.periodChooser._dateRangeBindingItemNames[x] + (postfix != "" ? "_" + postfix : "");
    return a;
  },

  /**
   * check if current postfixValue is in optionsModel
   * if so, switch filters to this value, otherwise use 1st entry of optionsModel
   * @param config {Object} config object holding information about target, options, etc.
   * @private
   */
  _validateAndSwithPostfix: function(config) {
    var targetModel = bcdui.factory.objectRegistry.getObject(config.targetModelId);
    var value = targetModel.read(config.targetModelXPath + "/@bcdPostfix", "");
    value = bcdui.widget.periodChooser._getValidPostfix(config, value);
    bcdui.widget.periodChooser.switchPostfix(config.id, value);
  },

  _getValidPostfix: function(config, postfix) {
    // test if a valid value from the optionsModel was set, if not, set fallback value (either first from optionsModel or setup postfix or bcdEmpty
    var targetModel = bcdui.factory.objectRegistry.getObject(config.targetModelId);
    if (config.optionsModelId) {
      var validValues = jQuery.makeArray(bcdui.factory.objectRegistry.getObject(config.optionsModelId).queryNodes(config.valueXPath)).map(function(node){return node.nodeValue || node.text;})
      if (validValues.indexOf(postfix) == -1) {
        postfix = config.bcdPostfix && config.bcdPostfix != "" ? config.bcdPostfix : "bcdEmpty";
        postfix = validValues.length > 0 ? validValues[0] : postfix;
        targetModel.write(config.targetModelXPath + "/@bcdPostfix", postfix);
      }
      if (validValues.length == 0)
        jQuery("#" + config.id + "_postfixes").hide();
      else
        jQuery("#" + config.id + "_postfixes").show();
    }
    return postfix;
  },

  /**
   * Switch periodchooser to a different period_type
   * by replacing the bRef attributes and the bcdPostfix attribute
   * @param id {String} id of the period chooser widget
   * @param period_type {String} new period_type
   */
  switchPostfix: function(id, period_type, alreadyReplaced) {
    var containerHtmlElement = jQuery("#" + id).get(0);
    if (containerHtmlElement) {
      var targetModelId = containerHtmlElement.getAttribute("bcdTargetModelId");
      var targetModel = bcdui.factory.objectRegistry.getObject(targetModelId);
      var targetModelXPath = containerHtmlElement.getAttribute("bcdTargetModelXPath");
      var node = targetModel.query(targetModelXPath);
      if (node) {
        node.setAttribute("bcdPostfix", period_type);
        var filterNodes = targetModel.queryNodes(targetModelXPath + "//f:Expression");
        for (var f = 0; f < filterNodes.length; f++) {
          var bRef = filterNodes[f].getAttribute("bRef");
          if (bRef) {
            // remove possible postString separated by _
            if (bRef.indexOf("_") != -1)
              bRef = bRef.substring(0, bRef.indexOf("_"));
            // add new postString separated by _
            if (period_type != "" && period_type != "bcdEmpty")
              bRef += "_" + period_type;
          }
          filterNodes[f].setAttribute("bRef", bRef);
        }
        targetModel.fire();
      }
    }
  },

  /**
   * "Is Ctrl and any symbol key have been simultaneously down" flag.
   * @private
   */
  _isCtrlWasDown: false,

  /**
   * returns a function which returns a value of specified targetElement
   * @private
   */
  _createValueProvider: function(targetElement){
    return function(){
      return targetElement.value;
    };
  },

  /**
   * Initialization of the whole widget.
   * @param containerHtmlElement {HTMLElement} Widget container element.
   * @private
   */
  
  setSimpleXPathMode : function(containerHtmlElement) {
    if (containerHtmlElement.getAttribute("bcdUseSimpleXPath") == "true") {
      containerHtmlElement.setAttribute("bcdIsFreeRangeSelectable", "false");
      containerHtmlElement.setAttribute("bcdOutputPeriodType",      "false");
      containerHtmlElement.setAttribute("bcdIsDaySelectable",       "true");        // we only allow DAY
      containerHtmlElement.setAttribute("bcdIsWeekSelectable",      "false");
      containerHtmlElement.setAttribute("bcdIsMonthSelectable",     "false");
      containerHtmlElement.setAttribute("bcdIsQuarterSelectable",   "false");
      containerHtmlElement.setAttribute("bcdIsYearSelectable",      "false");
      containerHtmlElement.removeAttribute("bcdPostfix");                           // remove the following attributes since they only provide bRef manipulation (and we got a fixed xpath)
      containerHtmlElement.removeAttribute("bcdOptionsModelXPath");
      containerHtmlElement.removeAttribute("bcdOptionsModelRelativeValueXPath");
      containerHtmlElement.removeAttribute("bcdOptionsModelId");
    }
  },

  init: function(containerHtmlElement) {

    bcdui.widget.periodChooser.setSimpleXPathMode(containerHtmlElement);

    var isFreeRange         = containerHtmlElement.getAttribute("bcdIsFreeRangeSelectable") == "true";
    var showPrevNextButtons = containerHtmlElement.getAttribute("bcdShowPrevNextButtons") == "true";
    var suppressCaptions    = containerHtmlElement.getAttribute("bcdSuppressCaptions") == "true";
    var textInput           = containerHtmlElement.getAttribute("bcdTextInput") == "true";
    var isSecondSelectable  = containerHtmlElement.getAttribute("bcdIsSecondSelectable") == "true";
    var isMinuteSelectable  = containerHtmlElement.getAttribute("bcdIsMinuteSelectable") == "true";
    var isHourSelectable    = containerHtmlElement.getAttribute("bcdIsHourSelectable") == "true";
    var useSimpleXPath      = containerHtmlElement.getAttribute("bcdUseSimpleXPath") == "true";
    var showClearButton     = containerHtmlElement.getAttribute("bcdShowClearButton") == "true";

    var hint = "yyyy-mm-dd";
         if (isSecondSelectable) hint = "yyyy-mm-dd hh:mm:ss";
    else if (isMinuteSelectable) hint = "yyyy-mm-dd hh:mm";
    else if (isHourSelectable) hint = "yyyy-mm-dd hh";

    var caption1 = "Date";
    var caption2 = "Date";
    var c = bcdui.widget._getBcdAttributeValue(containerHtmlElement, "bcdCaption").split(",");
         if (suppressCaptions)                                {caption1 = ""; caption2 = "";}
    else if (isFreeRange)                                     {caption1 = (c.length == 2) ? c[0] : "From"; caption2 = (c.length == 2) ? c[1] : "To";}
    else if (containerHtmlElement.getAttribute("bcdCaption")) {caption1 = containerHtmlElement.getAttribute("bcdCaption"); caption2 = containerHtmlElement.getAttribute("bcdCaption")}

    var timeClass = isSecondSelectable ? "bcdTimeMiddle bcdMinute" : "bcdMinute";
    
    var buttoStyle = (containerHtmlElement.getAttribute("bcdSuppressButtons") == "true" ? "style='display:none'" : "");
    
    jQuery(containerHtmlElement).append(
          "<input class='bcdHidden'/>"
        + "<span class='bcdButton' " + buttoStyle + "><a href='javascript:void(0)'>" + caption1 + "</a></span>"
        + ("<span class='bcdValue'>"
            + (textInput ?
              ( " <input type='text' class='bcdYear' maxLength='4'/>"
              + "<input type='text' class='bcdDateDelimiter' readonly='readonly' disabled='disabled' value='-'/>"
              + "<input type='text' class='bcdMonth' maxLength='2'/>"
              + "<input type='text' class='bcdDateDelimiter' readonly='readonly' disabled='disabled' value='-'/>"
              + "<input type='text' class='bcdDay' maxLength='2'/>"
              + (isHourSelectable ?
                  ( "<input type='text' class='bcdDateTimeDelimiter' readonly='readonly' disabled='disabled' value=' '/>"
                  + "<input type='text' class='bcdHour' maxLength='2'/>"): "")
              + (isMinuteSelectable ?
                  ( "<input type='text' class='bcdDateDelimiter' readonly='readonly' disabled='disabled' value=':'/>"
                  + "<input type='text' class='" + timeClass + "' maxLength='2'/>"): "")
              + (isSecondSelectable ?
                  ( "<input type='text' class='bcdDateDelimiter' readonly='readonly' disabled='disabled' value=':'/>"
                  + "<input type='text' class='bcdSecond' maxLength='2'/>"): "")
              ): "")
            + "</span>"
            + (showClearButton ? "<span class='bcdClearButton'></span>" : "")
          )
        + (isFreeRange ?
            ("<div class='bcdHr'><hr/></div>"
            + "<input class='bcdHidden'/>"
            + "<span class='bcdButton' " + buttoStyle + "><a href='javascript:void(0)'>" + caption2 + "</a></span>"
            + ("<span class='bcdValue'>"
              + (textInput ?
                ( " <input type='text' class='bcdYear' maxLength='4'/>"
                + "<input type='text' class='bcdDateDelimiter' readonly='readonly' disabled='disabled' value='-'/>"
                + "<input type='text' class='bcdMonth' maxLength='2'/>"
                + "<input type='text' class='bcdDateDelimiter' readonly='readonly' disabled='disabled' value='-'/>"
                + "<input type='text' class='bcdDay' maxLength='2'/>"
                + (isHourSelectable ?
                    ( "<input type='text' class='bcdDateTimeDelimiter' readonly='readonly' disabled='disabled' value=' '/>"
                    + "<input type='text' class='bcdHour' maxLength='2'/>"): "")
                + (isMinuteSelectable ?
                    ( "<input type='text' class='bcdDateDelimiter' readonly='readonly' disabled='disabled' value=':'/>"
                    + "<input type='text' class='" + timeClass + "' maxLength='2'/>"): "")
                + (isSecondSelectable ?
                    ( "<input type='text' class='bcdDateDelimiter' readonly='readonly' disabled='disabled' value=':'/>"
                    + "<input type='text' class='bcdSecond' maxLength='2'/>"): "")
                ): "")
              + "</span>"
            )): ""
          )
        + (showPrevNextButtons ?("<br/><a href='#' class='bcdPeriodChooserModLeft' onclick='bcdui.widget.periodChooser._incPeriod(-1, this);return false;'></a>&#160;<a href='#' class='bcdPeriodChooserModRight' onclick='bcdui.widget.periodChooser._incPeriod(1, this);return false;'></a>"): "")
        + (textInput ? ("<div class='bcdHr'><hr/></div><span class='bcdHint'>" + hint + "</span>") : "" )
    ).addClass("bcdPeriodChooser");
    bcdui.widget._bcdIdToDomId(containerHtmlElement);
    bcdui.widget.periodChooser._initElement(containerHtmlElement);
  },

  /**
   * Common init function but currently kept as single-entry point for custom rendered periodchoosers 
   * @param {} htmlElement - periodChooser
   * @private
   */
  _initElement: function(containerHtmlElement) {
    
    bcdui.widget.periodChooser.setSimpleXPathMode(containerHtmlElement);

    this._adjustDefaultParameters(containerHtmlElement);
      var id = containerHtmlElement.getAttribute("id");
      if (!id) {
        id =  bcdui.factory.objectRegistry.generateTemporaryIdInScope("periodChooser_");
        if (id == "periodChooser_") id += "0";
      }

      // legacy id naming    
      containerHtmlElement.setAttribute("id", id);

      bcdui.widget._assureModelIdAndXPathAttributes( {htmlElement: containerHtmlElement} );

      // prepare optionsModel information
      var config = {
          element: containerHtmlElement,
          targetModelId: containerHtmlElement.getAttribute("bcdTargetModelId"),
          targetModelXPath: containerHtmlElement.getAttribute("bcdTargetModelXPath"),
          optionsModelId: containerHtmlElement.getAttribute("bcdOptionsModelId"),
          optionsModelXPath: containerHtmlElement.getAttribute("bcdOptionsModelXPath"),
          optionsModelRelativeValueXPath: containerHtmlElement.getAttribute("bcdOptionsModelRelativeValueXPath"),
          postfix: containerHtmlElement.getAttribute("bcdPostfix"),
          id: containerHtmlElement.getAttribute("id")
      };
      config.valueXPath = config.optionsModelXPath + (config.optionsModelRelativeValueXPath ? "/" + config.optionsModelRelativeValueXPath : "");

      var models = config.optionsModelXPath ? bcdui.widget._extractModelsFromModelXPath(config.optionsModelXPath) : null;
      if (models)
        bcdui.widget._createWrapperModel(models, config, "widget/multiOptionsModelWrapper.xslt");

      // let's init the fields

      var models = [config.targetModelId];
      if (config.optionsModelId)
        models.push(config.optionsModelId);

      bcdui.factory.objectRegistry.withReadyObjects(models, function() {
        bcdui.log.isDebugEnabled() && bcdui.log.debug("init: " + id + ", " + config.targetModelId);
        
        // preparing postfix attribute at targetXPath
        var postfix = config.postfix != null ? config.postfix : "";
        var targetModel = bcdui.factory.objectRegistry.getObject(config.targetModelId);
        var node = targetModel.getData().selectSingleNode(config.targetModelXPath);
        if (node == null)
          node = bcdui.core.createElementWithPrototype(targetModel.getData(), config.targetModelXPath);
        if (node != null) {
          if (node.nodeType == 2)
            node = targetModel.getData().selectSingleNode(config.targetModelXPath + "/..");
          
          // guess postfix from filters
          var pt = null;
          var filterNodes = targetModel.queryNodes(config.targetModelXPath + "//f:Expression");
          if (filterNodes.length > 0) {
            pt = filterNodes[0].getAttribute("bRef");
            pt = (pt.indexOf("_") != -1) ? pt.substring(pt.indexOf("_") + 1) : "";
          }
          // if nothing was found (or no prefix), we take the one from config
          if (pt == null || pt == "")
            pt = (config.postfix && config.postfix != "") ? config.postfix : "bcdEmpty";

          // validate found postfix and set attribute
          postfix = bcdui.widget.periodChooser._getValidPostfix(config, pt != null ? pt : postfix);
          node.setAttribute("bcdPostfix", postfix);

          // repair bRefs in case one of the latter postfix setters changed the postfix
          jQuery.makeArray(filterNodes).forEach(function(e) {
            var bRef = e.getAttribute("bRef");
            bRef = (bRef.indexOf("_") != -1) ? bRef.substring(0, bRef.indexOf("_")) : bRef;
            var pf = (postfix != "bcdEmpty") ? "_" + postfix : "";
            e.setAttribute("bRef", bRef + pf);
          });

        }

        // repair cwyr-cw and yr-mo nodes to cwyr + cw etc nodes
        jQuery.makeArray(targetModel.queryNodes(config.targetModelXPath + "//f:Expression[starts-with(@bRef, 'yrqr_') or @bRef='yrqr' or starts-with(@bRef, 'cwyrcw_') or @bRef='cwyrcw' or starts-with(@bRef, 'yrmo_') or @bRef='yrmo']")).forEach(function(e){
          var bRef = e.getAttribute("bRef") || "";
          var clone = e.cloneNode(true);
          var value = (e.getAttribute("value") || "").split("-");
          var postfix = bRef.indexOf("_") != -1 ? bRef.substring(bRef.indexOf("_") + 1) : "";
          postfix = postfix == "" ? "" : "_" + postfix;
          if (value.length == 2) {
            e.setAttribute("bRef", ((bRef.indexOf("cwyrcw") == 0 ? "cwyr" : "yr") + postfix));
            e.setAttribute("value", value[0]);
            clone.setAttribute("bRef", ((bRef.indexOf("cwyrcw") == 0 ? "cw" : (bRef.indexOf("yrqr") == 0 ? "qr" : "mo")) + postfix));
            clone.setAttribute("value", value[1]);
            e.parentNode.appendChild(clone);
          }
        });

        // render input drop down if we have an optionModel
        if (config.optionsModelId) {
          var inputHtml = "<span class='bcdPostfix' id='" + config.id + "_postfixes' bcdKeepEmptyValueExpression='true'"
          + " bcdTargetModelId='" + config.targetModelId + "'"
          + " bcdTargetModelXPath='" + config.targetModelXPath.replace(/'/g, "&#39;") + "/@bcdPostfix'"
          + " bcdOptionsModelId='" + config.optionsModelId + "'"
          + " bcdOptionsModelXPath='" + config.optionsModelXPath + "'"
          + (config.optionsModelRelativeValueXPath ? "bcdOptionsModelRelativeValueXPath='" + config.optionsModelRelativeValueXPath + "'" : "")
          + "></span>";
          jQuery(containerHtmlElement).prepend(inputHtml);
          bcdui.widget.inputField.init(jQuery("#" + config.id + "_postfixes").get(0));

          // listener on objectModel changes
          bcdui.factory.objectRegistry.getObject(config.optionsModelId).onChange(bcdui.widget.periodChooser._validateAndSwithPostfix.bind(this, config));

          // listener on targetModel changes
          targetModel.onChange(bcdui.widget.periodChooser._validateAndSwithPostfix.bind(this, config), config.targetModelXPath + "/@bcdPostfix");
        }

        // default periodChooser init
        var values = bcdui._migPjs._$(containerHtmlElement).find("span.bcdValue");
        var hiddens = bcdui._migPjs._$(containerHtmlElement).find("input.bcdHidden");
        hiddens[0].isFrom = values[0].isFrom = true;
        hiddens[0].onchange = bcdui.widget.periodChooser._onPeriodSelected.bind(undefined,hiddens[0]);
        var buttons = bcdui._migPjs._$(containerHtmlElement).find("span.bcdButton");
        buttons[0].onclick = bcdui.widget.periodChooser._showPopup.bind(undefined,values[0], hiddens[0], "from");
        if (containerHtmlElement.getAttribute("bcdIsFreeRangeSelectable") === "true") {
          hiddens[1].isFrom = values[1].isFrom = false;
          // expose opposites value getters
          hiddens[1].getOtherValue = bcdui.widget.periodChooser._createValueProvider(hiddens[0]);
          hiddens[0].getOtherValue = bcdui.widget.periodChooser._createValueProvider(hiddens[1]);
          hiddens[1].onchange = bcdui.widget.periodChooser._onPeriodSelected.bind(undefined,hiddens[1]);
          buttons[1].onclick = bcdui.widget.periodChooser._showPopup.bind(undefined,values[1], hiddens[1], "to");
        }

        var t = bcdui.widget.periodChooser._getTargetData(containerHtmlElement);
        var fromDate = bcdui.widget.periodChooser._getDateFromAttr(t.doc, bcdui.widget.periodChooser._getDateFromXPath(t.doc, t.targetModelXPath, bcdui.widget.periodChooser._isOutputPeriodType(containerHtmlElement)));
        var toDate = bcdui.widget.periodChooser._getDateFromAttr(t.doc, bcdui.widget.periodChooser._getDateToXPath(t.doc, t.targetModelXPath, bcdui.widget.periodChooser._isOutputPeriodType(containerHtmlElement)));
        
        // set dateFrom/dateTo attributes automatically if not given
        if (fromDate == "" || toDate == "") { 

          var argsFrom = {};
          var argsTo = {};
  
          // grab simple =, >=, <= period types
          var __names = bcdui.widget.periodChooser._getBindingItemNames(id);

          if (t.useSimpleXPath) {
            for (var x in __names) {
              var newName = __names[x].indexOf("_") == -1 ? __names[x] : __names[x].substring(0, __names[x].indexOf("_"));
              if (newName == "dy") {
                var node = t.doc.selectSingleNode(t.targetModelXPath);
                var value = node != null ? node.text : "";
                argsFrom[newName] = argsTo[newName] = value;
              }
            }
          }
          else {
    
            // grab simple =, >=, <= period types
            for (var x in __names) {
              var newName = __names[x].indexOf("_") == -1 ? __names[x] : __names[x].substring(0, __names[x].indexOf("_"));
              var value = t.doc.selectSingleNode(t.targetModelXPath + "/f:Expression[@bRef='" + __names[x] + "' and (@op='=' or @op='>=')]/@value"); value = value == null ? "" : value.text;
              if (value != "") argsFrom[newName] = value;
              value = t.doc.selectSingleNode(t.targetModelXPath + "/f:Expression[@bRef='" + __names[x] + "' and (@op='=' or @op='<=')]/@value"); value = value == null ? "" : value.text;
              if (value != "") argsTo[newName] = value;
            }
            // grab multi year period types (we're only interested in the outer ranges)
            for (var x in __names) {
              var newName = __names[x].indexOf("_") == -1 ? __names[x] : __names[x].substring(0, __names[x].indexOf("_"));
              var value = t.doc.selectSingleNode(t.targetModelXPath + "/f:Or/f:And[f:Expression[@op='>=']]/f:Expression[@bRef='" + __names[x] + "' and (@op='=' or @op='>=')]/@value"); value = value == null ? "" : value.text;
              if (value != "") argsFrom[newName] = value;
              value = t.doc.selectSingleNode(t.targetModelXPath + "/f:Or/f:And[f:Expression[@op='<=']]/f:Expression[@bRef='" + __names[x] + "' and (@op='=' or @op='<=')]/@value"); value = value == null ? "" : value.text;
              if (value != "") argsTo[newName] = value;
            }
            //  special filter case (see rebuildDateFromDateToFromFilter)
            if (argsFrom["yr"]   && ! argsTo["yr"])     argsTo["yr"]     = argsFrom["yr"];
            if (argsTo["yr"]     && ! argsFrom["yr"])   argsFrom["yr"]   = argsTo["yr"];
            if (argsFrom["cwyr"] && ! argsTo["cwyr"])   argsTo["cwyr"]   = argsFrom["cwyr"];
            if (argsTo["cwyr"]   && ! argsFrom["cwyr"]) argsFrom["cwyr"] = argsTo["cwyr"];
          }

          // let's convert the found values to iso dates
          var periodFrom = bcdui.widget.periodChooser._periodToISORange(argsFrom);
          var periodTo = bcdui.widget.periodChooser._periodToISORange(argsTo);
          
          // and set outer limits as new from / to
          if (fromDate == "" && periodFrom.from != "")
            bcdui.widget.periodChooser._setDateFrom(t.doc, t.targetModelXPath, periodFrom.from, bcdui.widget.periodChooser._isOutputPeriodType(containerHtmlElement));
          if (toDate == "" && periodTo.to != "")
            bcdui.widget.periodChooser._setDateTo(t.doc, t.targetModelXPath, periodTo.to, bcdui.widget.periodChooser._isOutputPeriodType(containerHtmlElement));
        }

        // initialization
        var validationTooltip = bcdui.widget.periodChooser._initValidateWrapper(containerHtmlElement/*, tooltipListener*/);
        bcdui.widget.periodChooser._initUpdaterViewFromXMLData(containerHtmlElement, validationTooltip);
        if (containerHtmlElement.getAttribute("bcdTextInput") === "true") {
          bcdui._migPjs._$(containerHtmlElement).find("input.bcdYear, input.bcdMonth, input.bcdDay, input.bcdHour, input.bcdMinute, input.bcdSecond").each(function(i, input) {
            bcdui.widget.periodChooser._addKeyObservers(input);
            input.onfocus = bcdui.widget.periodChooser._onFocusInput.bind(undefined,input);
            input.onblur = bcdui.widget.periodChooser._onBlurInput.bind(undefined,input);
            input.onpaste = bcdui.widget.periodChooser._onPasteInput.bind(undefined,input);
          });
        }

        bcdui._migPjs._$(containerHtmlElement).css({ visibility: "" });
        
        jQuery(containerHtmlElement).on("click", ".bcdClearButton", function(){
          var targetModelId = jQuery(this).closest(".bcdPeriodChooser").attr("bcdTargetModelId");
          var targetModelXPath = jQuery(this).closest(".bcdPeriodChooser").attr("bcdTargetModelXPath");
          var targetModel = bcdui.factory.objectRegistry.getObject(targetModelId);

          if (typeof targetModel != "undefined" && targetModelXPath != "") {
            var node = targetModel.query(targetModelXPath);
            var isAttr = node != null ? (node.nodeType == 2) : false;
            if (node) {
              node = isAttr ? targetModel.query(targetModelXPath + "/..") : node;
              node.removeAttribute("dateFrom");
              node.removeAttribute("dateTo");
              targetModel.remove(targetModelXPath + (isAttr ? "/.." : "") + (bcdui.widget.periodChooser._isWrs(targetModel.getData()) ? "" : "/*"), true);
            }
          }
        });

        if (containerHtmlElement.getAttribute("bcdEnableNavPath") != null && containerHtmlElement.getAttribute("bcdEnableNavPath") == "true") {
          bcdui.widget.periodChooser.getNavPath(jQuery(containerHtmlElement).parent().attr("id"), function(id, value) {
            bcdui.widget._linkNavPath(id, value);
          }.bind(this));
        }

        if (containerHtmlElement.getAttribute("bcdAutoPopup") == "true") {
          var values = jQuery(containerHtmlElement).find("span.bcdValue").first().get(0);
          var hiddens = jQuery(containerHtmlElement).find("input.bcdHidden").first().get(0);
          bcdui.widget.periodChooser._showPopup(values, hiddens, "from");
        }
      });
    },
    /**
   * Initialization of validation wrapper.
   * @param containerHtmlElement {HTMLElement} Widget container element.
   * @param tooltipListener {Function} Listener which controls the tool tip.
   * @private
   */
  _initValidateWrapper: function(containerHtmlElement)
    {
      var t = bcdui.widget.periodChooser._getTargetData(containerHtmlElement);
      var xpathFrom, xpathTo;
      xpathFrom = xpathTo = t.targetModelXPath;
      if (!bcdui.widget._isWrs(t.doc)) {
        xpathFrom = bcdui.widget.periodChooser._getDateFromXPath(t.doc, t.targetModelXPath, bcdui.widget.periodChooser._isOutputPeriodType(containerHtmlElement));
        xpathTo = bcdui.widget.periodChooser._getDateToXPath(t.doc, t.targetModelXPath, bcdui.widget.periodChooser._isOutputPeriodType(containerHtmlElement));
      }
      var id = containerHtmlElement.getAttribute("id");
      var fromId = id + "_from";
      var toId = id + "_to";
      t.containerHtmlElement = containerHtmlElement;
      t.validateMethod = bcdui.widget.periodChooser._validateValue;
      t.validateWrapperUrl = bcdui.contextPath + "/bcdui/js/widget/periodChooser/periodChooserValidate.xslt";
      t.validateWrapperParameters = {
        from: new bcdui.core.DataProviderWithXPath({
          name: fromId + "_name",
          source: t.targetModel,
          xPath: xpathFrom,
          nullValue: ""
        }),
        to: new bcdui.core.DataProviderWithXPath({
          name: toId + "_name",
          source: t.targetModel,
          xPath: xpathTo,
          nullValue: ""
        })
      };
      return new bcdui.widget.validationToolTip(t);
    },

  /**
   * Update (plus validate if needed) listener initialization.
   * @param containerHtmlElement {HTMLElement} Widget container element.
   * @private
   */
  _initUpdaterViewFromXMLData: function(containerHtmlElement, validationTooltip)
    {
    var id = containerHtmlElement.getAttribute("id");
    var t = bcdui.widget.periodChooser._getTargetData(containerHtmlElement);
      var xpath = t.targetModelXPath;
      if (!t.useSimpleXPath && !bcdui.widget._isWrs(t.doc)) {
        if (!bcdui.widget.periodChooser._isOutputPeriodType(containerHtmlElement)){
          xpath += "/f:Expression[@bRef='" + bcdui.widget.periodChooser._getBindingItemName(id, "various") + "']/@value";
        }
      }
      var targetModel = bcdui.factory.objectRegistry.getObject(t.targetModelId);
      var listener = new bcdui.widget.periodChooser.XMLListener({
        idRef: t.targetModelId,
        trackingXPath: xpath,
        htmlElementId: containerHtmlElement.id
      });
      bcdui.factory.addDataListener(listener);
      bcdui.widget.periodChooser._updateViewFromXMLData(containerHtmlElement);
      bcdui.widget.periodChooser._validateValue(containerHtmlElement);
    },

  /**
   * Checks WRS mode.
   * @param doc {Document} The XML document.
   * @returns {Boolean} True in WRS mode.
   * @private
   */
  _isWrs: function(doc)
    {
      return doc.selectSingleNode("/wrs:Wrs") != null;
    },

  /**
   * Is output result should be formatted as period
   * @param containerHtmlElement {HTMLElement}
   * @returns {Boolean} True if results will be periods.
   * @private
   */
  _isOutputPeriodType: function(containerHtmlElement){
    return containerHtmlElement.getAttribute("bcdOutputPeriodType") === "true";
  },

  /**
   * Retrieves the common target data.
   * @private
   * @param containerHtmlElement {HTMLElement} Widget container element.
   * @return The map contains the following properties:
   * <ul>
   *   <li>targetModelId: {String} The identifier of target model.</li>
   *   <li>targetModel: {DataProvider} The target model.</li>
   *   <li>targetModelXPath: {String} The XPath in whole XML model data.</li>
   *   <li>doc: {XMLDocument} The XML data of provider.</li>
   * </ul>
   */
  _getTargetData: function(containerHtmlElement)
    {
      var targetModelId = containerHtmlElement.getAttribute("bcdTargetModelId");
      var targetModel = bcdui.factory.objectRegistry.getObject(targetModelId);
      var targetModelXPath = containerHtmlElement.getAttribute("bcdTargetModelXPath");
      var outputPeriodType = bcdui.widget.periodChooser._isOutputPeriodType(containerHtmlElement)
      var doc = targetModel.getData();
      return {
          targetModelId: targetModelId,
          targetModel: targetModel,
          targetModelXPath: targetModelXPath,
          doc: doc,
          outputPeriodType: outputPeriodType,
          isSecondSelectable: containerHtmlElement.getAttribute("bcdIsSecondSelectable") == "true",
          isMinuteSelectable: containerHtmlElement.getAttribute("bcdIsMinuteSelectable") == "true",
          isHourSelectable: containerHtmlElement.getAttribute("bcdIsHourSelectable") == "true",
          isDaySelectable: containerHtmlElement.getAttribute("bcdIsDaySelectable") != "false",
          isWeekSelectable: containerHtmlElement.getAttribute("bcdIsWeekSelectable") != "false",
          isMonthSelectable: containerHtmlElement.getAttribute("bcdIsMonthSelectable") != "false",
          isQuarterSelectable: containerHtmlElement.getAttribute("bcdIsQuarterSelectable") != "false",
          isYearSelectable: containerHtmlElement.getAttribute("bcdIsYearSelectable") != "false",
          useSimpleXPath: containerHtmlElement.getAttribute("bcdUseSimpleXPath") == "true",
          id: containerHtmlElement.getAttribute("id"),
          optionsModelId: containerHtmlElement.getAttribute("bcdOptionsModelId"),
          optionsModelXPath: containerHtmlElement.getAttribute("bcdOptionsModelXPath"),
          optionsModelRelativeValueXPath: containerHtmlElement.getAttribute("bcdOptionsModelRelativeValueXPath"),
          postfix: containerHtmlElement.getAttribute("bcdPostfix")
      };
    },

  /**
   * Retrieve the hidden field related to the certain "displayed value" span ("From" or "To").
   * @private
   * @param span {HTMLElement} The element (span in our case) which displays period value.
   * @returns {HTMLElement} The appropriate hidden field.
   */
  _getHiddenFieldBySpanValue: function(span)
    {
      return bcdui._migPjs._$(span).prevAll("input.bcdHidden").get(0);
    },

  /**
   * Fires when new period selected.
   * @private
   * @param hiddenInputField {HTMLElement} The hidden input element which contains internal representation of period value.
   */
  _onPeriodSelected: function(hiddenInputField)
    {
      // compares the date fragment only
      function dateEquals(d1,d2){
        d1=""+d1;
        d2=""+d2;
        if((d1+d2).indexOf(":")>-1){
          return d1.split(/[ T]/)[0] == d2.split(/[ T]/)[0];
        }else{
          return d1==d2;
        }
      }
      bcdui.log.isTraceEnabled() && bcdui.log.trace("selected period: " + hiddenInputField.value);
      var containerHtmlElement = bcdui._migPjs._$(hiddenInputField).parent().get(0);
      var dates = hiddenInputField.value.split(";");
      var fromDate = "";
      var toDate = "";
      if (dates.length >= 2) {
        // checks if the either from/to counterpart is already initialized and has a value
        var hasCounterPartValue = hiddenInputField.getOtherValue ? hiddenInputField.getOtherValue()!=";" : false;
        // checks if the input was provided by a calendar (and not by other input methods, that is we get 3 fields [from];[to];PC)
        var isCalendarRollerInput = dates.length==3&&dates[2]=="PC";
        var isLastDaySelect = dates.length==3&&dates[2]=="XX";
        if (
            !dateEquals(dates[0], dates[1])
            || isLastDaySelect
            || containerHtmlElement.getAttribute("bcdIsFreeRangeSelectable") === "false"
            || (isCalendarRollerInput && !hasCounterPartValue)
            || (hiddenInputField.isFrom && isCalendarRollerInput && hiddenInputField.getOtherValue && hiddenInputField.getOtherValue()!=";" && hiddenInputField.getOtherValue()+";PC" < hiddenInputField.value)
            || (! hiddenInputField.isFrom && isCalendarRollerInput && hiddenInputField.getOtherValue && hiddenInputField.getOtherValue()!=";" && hiddenInputField.getOtherValue()+";PC" > hiddenInputField.value)
          ) {
          fromDate = dates[0];
          toDate = dates[1];
        } else if (hiddenInputField.isFrom) {
          fromDate = dates[0];
        } else {
          toDate = dates[dates[0]==dates[1] ? 0 : 1]; // incase of different times we assign toDate from dates[1]
        }
      }
      var t = bcdui.widget.periodChooser._getTargetData(containerHtmlElement);
      if (bcdui.widget.periodChooser._isWrs(t.doc)) {
        bcdui.widget.periodChooser._updateWrsXMLDoc(fromDate, t.targetModel, t.targetModelXPath);
      } else {
        bcdui.widget.periodChooser._updateXMLDoc(fromDate, toDate, t);
      }
    },

  /**
   * Updates the WRS XML model data ("To date" not supported).
   * @private
   * @param fromDate {String} The "from" period value.
   * @param targetModel {DataProvider} The target model.
   * @param targetModelXPath {String} The XPath in whole XML model data.
   */
  _updateWrsXMLDoc: function(fromDate, targetModel, targetModelXPath)
    {
      if (fromDate == "") {
        return;
      }
      var oldValue = bcdui.widget._getDataFromXML(targetModel, targetModelXPath);
      if (fromDate == oldValue) {
        bcdui.log.isTraceEnabled() && bcdui.log.trace("date unchanged");
        return;
      }
      bcdui.widget._copyDataFromHTMLElementToTargetModel(targetModel, targetModelXPath, fromDate, true);
    },

    /**
     * returns path to dateFrom value, depends on outputPeriodType
     * @private
     */
    _getDateFromXPath: function(doc, targetModelXPath, outputPeriodType){
      var xpathFrom = targetModelXPath;
      if (!bcdui.widget._isWrs(doc)) {
        if (doc.selectSingleNode(targetModelXPath) != null && doc.selectSingleNode(targetModelXPath).nodeType == 2)
          xpathFrom = targetModelXPath + "/../@dateFrom";
        else
        xpathFrom = targetModelXPath + "/@dateFrom";
      }
      return xpathFrom;
    },

    /**
     * returns path to dateTo value, depends on outputPeriodType
     * @private
     */
    _getDateToXPath: function(doc, targetModelXPath, outputPeriodType){
      var xpathTo = targetModelXPath;
      if (!bcdui.widget._isWrs(doc)) {
        if (doc.selectSingleNode(targetModelXPath) != null && doc.selectSingleNode(targetModelXPath).nodeType == 2)
          xpathTo = targetModelXPath + "/../@dateTo";
        else
        xpathTo = targetModelXPath + "/@dateTo";
      }
      return xpathTo;
    },

  /**
   * Updates the XML model data.
   * @private
   * @param fromDate {String} The "from" period value.
   * @param toDate {String} The "to" period value.
   * @param pcConfig {
   *  @param targetModelId {String} The identifier of target model.
   *  @param targetModelXPath {String} The XPath in whole XML model data.
   *  @param outputPeriodType {Boolean} if output of periodChooser produced as periodType.
   *  @param isWeekSelectable {Boolean}
   *  @param isYearSelectable {Boolean}
   *  @param isQuarterSelectable {Boolean}
   *  @param isMonthSelectable {Boolean}
   * }   */
  _updateXMLDoc: function(fromDate, toDate, pcConfig)
    {
      var targetModel = bcdui.factory.objectRegistry.getObject(pcConfig.targetModelId);
      var targetModelXPath = pcConfig.targetModelXPath;
      var outputPeriodType = pcConfig.outputPeriodType;
      var doc = targetModel.getData();
      if (fromDate == "" && toDate == "") {
        if (doc.selectNodes(targetModelXPath).length > 0) {
          bcdui.core.removeXPath(doc, targetModelXPath);
          targetModel.fire();
        }
      } else {
        var fromDateXPath, toDateXPath;
        fromDateXPath = bcdui.widget.periodChooser._getDateFromXPath(doc, targetModelXPath, outputPeriodType);
        toDateXPath = bcdui.widget.periodChooser._getDateToXPath(doc, targetModelXPath, outputPeriodType);
        if (fromDate != "") {
          if (doc.selectSingleNode(fromDateXPath) != null
              && doc.selectSingleNode(fromDateXPath).text
              && doc.selectSingleNode(fromDateXPath).text == fromDate) {
            fromDate = "";
          }
        }
        if (toDate != "") {
          if (doc.selectSingleNode(toDateXPath) != null
              && doc.selectSingleNode(toDateXPath).text
              && doc.selectSingleNode(toDateXPath).text == toDate) {
            toDate = "";
          }
        }
        if (fromDate == "" && toDate == "") {
          bcdui.log.isTraceEnabled() && bcdui.log.trace("from and to date unchanged");
          return;
        }
        if (fromDate != "") {
          bcdui.widget.periodChooser._setDateFrom(doc, targetModelXPath, fromDate, outputPeriodType);
        }
        if (toDate != "") {
          bcdui.widget.periodChooser._setDateTo(doc, targetModelXPath, toDate, outputPeriodType);
        }
        if (fromDate != "" || toDate != "") {
          fromDate = doc.selectSingleNode(fromDateXPath);
          toDate = doc.selectSingleNode(toDateXPath);
          bcdui.widget.periodChooser._setDatePeriodType(fromDate != null ? fromDate.value : "", toDate != null ? toDate.value : "", pcConfig);
        }
        targetModel.fire();
      }
    },

  /**
   * Shows the pop-up calendar.
   * @private
   * @param htmlElement {HTMLElement} The element (span in our case) which displays period value.
   * @param hiddenInputField {HTMLElement} The hidden input element which contains internal representation of period value.
   * @param dateOrder \{"from", "to"\} for what date popup will shown
   */
  _showPopup: function(htmlElement, hiddenInputField, dateOrder)
    {
      var containerHtmlElement = bcdui._migPjs._$(htmlElement).parent().get(0);
      var firstSelectableDay   = containerHtmlElement.getAttribute("bcdFirstSelectableDay");
      var lastSelectableDay    = containerHtmlElement.getAttribute("bcdLastSelectableDay");
      var isDaySelectable      = containerHtmlElement.getAttribute("bcdIsDaySelectable");
      var isWeekSelectable     = containerHtmlElement.getAttribute("bcdIsWeekSelectable");
      var isMonthSelectable    = containerHtmlElement.getAttribute("bcdIsMonthSelectable");
      var isQuarterSelectable  = containerHtmlElement.getAttribute("bcdIsQuarterSelectable");
      var isYearSelectable     = containerHtmlElement.getAttribute("bcdIsYearSelectable");
      var isHourSelectable     = containerHtmlElement.getAttribute("bcdIsHourSelectable");

      var t = bcdui.widget.periodChooser._getTargetData(containerHtmlElement);
      // init calendar value from XML
      var fromDate, toDate;
      if (bcdui.widget.periodChooser._isWrs(t.doc)) {
        fromDate = toDate = bcdui.widget._getDataFromXML(t.targetModel, t.targetModelXPath);
        if(!fromDate){
          fromDate = toDate = new Date().toISOString().substring(0,10);
        }
      } else {
        fromDate = bcdui.widget.periodChooser._getDateFromAttr(t.doc, bcdui.widget.periodChooser._getDateFromXPath(t.doc, t.targetModelXPath, bcdui.widget.periodChooser._isOutputPeriodType(containerHtmlElement)));
        toDate = bcdui.widget.periodChooser._getDateFromAttr(t.doc, bcdui.widget.periodChooser._getDateToXPath(t.doc, t.targetModelXPath, bcdui.widget.periodChooser._isOutputPeriodType(containerHtmlElement)));
      }

      if (dateOrder == "from")
        hiddenInputField.value = fromDate;
      else if (dateOrder == "to")
        hiddenInputField.value = toDate;
      else
        hiddenInputField.value = fromDate + ";" + toDate;

      bcdui.widget.periodChooser.popUpCalendar(
        /* ctl */                     htmlElement
        /* ctl2 */                  , hiddenInputField
        /* out2 */                  , hiddenInputField
        /* format */                , "yyyy-mm-dd"
        /* startFormat */           , "yyyy-mm-dd"
        /* endFormat */             , "yyyy-mm-dd"
        /* parseFormat */           , "yyyy-mm-dd"
        /* isRange */               , true
        /* _firstSelDate */         , firstSelectableDay || null
        /* _lastSelDate */          , lastSelectableDay || null
        /* _isDaySelectable */      , !(isDaySelectable == "false")
        /* _isWeekSelectable */     , !(isWeekSelectable == "false")
        /* _isMonthSelectable */    , !(isMonthSelectable == "false")
        /* outputSpanId */          , null
        /* _isYearSelectable */     , !(isYearSelectable == "false")
        /* _isQuarterSelectable */  , !(isQuarterSelectable == "false")
        /* _isTimeSpan */           , isHourSelectable == "true"
      );
    },

  /**
   * Updates the displayed value of period chooser from model XML data.
   * @param containerHtmlElement {HTMLElement} Widget container element.
   * @private
   */
  _updateViewFromXMLData: function(containerHtmlElement)
    {
      var t = bcdui.widget.periodChooser._getTargetData(containerHtmlElement);
      var isWrs = bcdui.widget.periodChooser._isWrs(t.doc);
      bcdui._migPjs._$(containerHtmlElement).find("span.bcdValue").each(function(index, htmlElement) {
        var fromDate, toDate;
        if (isWrs) {
          // "free range" flag is ignored
          fromDate = toDate = bcdui.widget._getDataFromXML(t.targetModel, t.targetModelXPath)||"";
        } else
        {
          if (containerHtmlElement.getAttribute("bcdOutputPeriodType") === "true"){
          }
          if (containerHtmlElement.getAttribute("bcdIsFreeRangeSelectable") === "true") {
            fromDate = toDate = index == 0 // index == 0 is true for "From" date
              ? bcdui.widget.periodChooser._getDateFromAttr(t.doc, bcdui.widget.periodChooser._getDateFromXPath(t.doc, t.targetModelXPath, bcdui.widget.periodChooser._isOutputPeriodType(containerHtmlElement)))
              : bcdui.widget.periodChooser._getDateFromAttr(t.doc, bcdui.widget.periodChooser._getDateToXPath(t.doc, t.targetModelXPath, bcdui.widget.periodChooser._isOutputPeriodType(containerHtmlElement)));
          } else {
            fromDate = bcdui.widget.periodChooser._getDateFromAttr(t.doc, bcdui.widget.periodChooser._getDateFromXPath(t.doc, t.targetModelXPath, bcdui.widget.periodChooser._isOutputPeriodType(containerHtmlElement)));
            toDate = bcdui.widget.periodChooser._getDateFromAttr(t.doc, bcdui.widget.periodChooser._getDateToXPath(t.doc, t.targetModelXPath, bcdui.widget.periodChooser._isOutputPeriodType(containerHtmlElement)));
          }
        }
        if (containerHtmlElement.getAttribute("bcdTextInput") === "true") {
          var datetime = fromDate.split(";")[0];
          var date = datetime.split("T")[0].split("-");
          // don't rewrite data in fields by same data - user can lose the selection in field!
          bcdui.widget.periodChooser._fillDateFieldIfNeeded(bcdui._migPjs._$(htmlElement).find("input.bcdYear")[0], date, 0);
          bcdui.widget.periodChooser._fillDateFieldIfNeeded(bcdui._migPjs._$(htmlElement).find("input.bcdMonth")[0], date, 1);
          bcdui.widget.periodChooser._fillDateFieldIfNeeded(bcdui._migPjs._$(htmlElement).find("input.bcdDay")[0], date, 2);
          if (t.isHourSelectable){
              var time = (datetime.split("T").length > 1) ? datetime.split("T")[1].split(":") : [];
              bcdui.widget.periodChooser._fillTimeFieldIfNeeded(bcdui._migPjs._$(htmlElement).find("input.bcdHour")[0], time, 0);
              bcdui.widget.periodChooser._fillTimeFieldIfNeeded(bcdui._migPjs._$(htmlElement).find("input.bcdMinute")[0], time, 1);
              bcdui.widget.periodChooser._fillTimeFieldIfNeeded(bcdui._migPjs._$(htmlElement).find("input.bcdSecond")[0], time, 2);
          }
        } else {
          htmlElement.innerHTML = bcdui.util.datetime.prettyPrintDateRange(fromDate, toDate);
        }
        bcdui.widget.periodChooser._getHiddenFieldBySpanValue(htmlElement).value = fromDate + ";" + toDate;
      });
    },

  /**
   * Fills the certain date field (year, month or day) if field value isn't equals calculated date value.
   * @private
   * @param field {HTMLElement} The one of date field - year, month or day.
   * @param date {Array} The array of strings with date's elements - year, month or day.
   * @param i {Integer} Index to access to the date array.
   */
  _fillDateFieldIfNeeded: function(field, date, i)
    {
      if (jQuery.makeArray(date).length > i) {
        if (field.value != date[i]) { field.value = date[i]; }
      } else if (field.value != "") {
        field.value = "";
      }
    },

    /**
     * Fills the certain time field (hour, minute or second) if field value isn't equals calculated date value.
     * @private
     * @param field {HTMLElement} The one of date field - year, month or day.
     * @param date {Array} The array of strings with date's elements - year, month or day.
     * @param i {Integer} Index to access to the date array.
     */
    _fillTimeFieldIfNeeded: function(field, time, i)
      {
        if (field != null){
          if (jQuery.makeArray(time).length > i) {
            if (field.value != time[i]) { field.value = time[i]; }
          } else if (field.value != "") {
            field.value = "";
          }
        }
      },
  /**
   * @private
   * @param doc {XmlDocument} The target model.
   * @param xPath {String} The XPath to concrete date in whole XML model data.
   * @returns {String} "from" or "to" date from model (date which specified in xPath).
   */
  _getDateFromAttr: function(doc, xPath)
    {
      var dateNode = doc.selectSingleNode(xPath);
      if (dateNode == null || !dateNode.value) return "";
      if (!bcdui.util.datetime.isValidDate(dateNode.value))
        return "";
      return dateNode.value;
    },

    /**
     * Storing dateFrom into model
     * @private
     */
  _setDateFrom: function(doc, targetModelXPath, dateFrom, outputPeriodType)
    {
      var fromDateXPath = bcdui.widget.periodChooser._getDateFromXPath(doc, targetModelXPath, outputPeriodType);
      var node = bcdui.core.createElementWithPrototype(doc, fromDateXPath);
      node.text = dateFrom;
    },

    /**
     * Storing dateTo into model
     * @private
     */
  _setDateTo: function(doc, targetModelXPath, dateTo, outputPeriodType)
    {
      var toDateXPath = bcdui.widget.periodChooser._getDateToXPath(doc, targetModelXPath, outputPeriodType);
      var node = bcdui.core.createElementWithPrototype(doc, toDateXPath);
      node.text =  dateTo;
    },

    /**
     * Method which checking if fromDate and toDate are one of known date periods and adding a nodes for them into model
     * @private
     * @param pcConfig - periodChooser configuration \{
     *  targetModelId
     *  targetModelXPath
     *  outputPeriodType
     *  isWeekSelectable
     *  isMonthSelectable
     *  isQuarterSelectable
     *  isYearSelectable
     *  isHourSelectable
     *  isMinuteSelectable
     *  isSecondSelectable
     * \}
     */
  _setDatePeriodType: function(dateFrom, dateTo, pcConfig)
    {
      var doc = bcdui.factory.objectRegistry.getObject(pcConfig.targetModelId).getData();
      if (bcdui.widget.periodChooser._isWrs(doc))
        return;
      var __createDatePeriodXPathNode = bcdui.widget.periodChooser._createDatePeriodXPathNode;
      var __names = bcdui.widget.periodChooser._getBindingItemNames(pcConfig.id);
      var xPath = pcConfig.targetModelXPath;
      bcdui.core.removeXPath(doc, xPath+"/*");
      // if not valid date
      if (!bcdui.util.datetime.isValidDate(dateFrom) || !bcdui.util.datetime.isValidDate(dateTo))
        return;
      var from = bcdui.util.datetime.parseDate(dateFrom);
      var to = bcdui.util.datetime.parseDate(dateTo);

      if (pcConfig.useSimpleXPath) {
        bcdui.core.createElementWithPrototype(doc, xPath).text  = bcdui.util.datetime.formatDate(from);
        return;
      }

      if (pcConfig.outputPeriodType){
        // if isYear range
        if (pcConfig.isYearSelectable && bcdui.util.datetime.isYearRange(from, to)) {
          if (from.getFullYear() == to.getFullYear()) {
            __createDatePeriodXPathNode(doc, xPath, __names.year, "=", from.getFullYear());
            return;
          }else if(from.getFullYear() < to.getFullYear()){
            __createDatePeriodXPathNode(doc, xPath, __names.year, ">=", from.getFullYear());
            __createDatePeriodXPathNode(doc, xPath, __names.year, "<=", to.getFullYear());
            return;
          }
        }
        // if isQuarter range
        if (pcConfig.isQuarterSelectable && bcdui.util.datetime.isQuarterRange(from, to)) {
          __createDatePeriodXPathNode(doc, xPath, __names.quarter, "=", Math.floor(from.getMonth() / 3 + 1));
          __createDatePeriodXPathNode(doc, xPath, __names.year, "=", from.getFullYear());
          return;
        }
        // if isMonth range
        if (pcConfig.isMonthSelectable && bcdui.util.datetime.isMonthRange(from, to) && from <= to) {
          if (from.getFullYear() == to.getFullYear()){
            __createDatePeriodXPathNode(doc, xPath, __names.year, "=", from.getFullYear());
            if (from.getMonth() == to.getMonth()) {
              __createDatePeriodXPathNode(doc, xPath, __names.month, "=", bcdui.util.datetime._twoDigits(from.getMonth() + 1));
            } else {
              __createDatePeriodXPathNode(doc, xPath, __names.month, ">=", bcdui.util.datetime._twoDigits(from.getMonth() + 1));
              __createDatePeriodXPathNode(doc, xPath, __names.month, "<=", bcdui.util.datetime._twoDigits(to.getMonth() + 1));
            }
          } else {
            var fOr = bcdui.core.createElementWithPrototype(doc, xPath + "/f:Or");
            var fAndDateFrom = bcdui.core.browserCompatibility.appendElementWithPrefix(fOr, "f:And");
            var fAndDateTo = bcdui.core.browserCompatibility.appendElementWithPrefix(fOr, "f:And");
            var fYears = bcdui.core.browserCompatibility.appendElementWithPrefix(fOr, "f:And");
            // 1. Date from  mo >=, yr =
            __createDatePeriodXPathNode(fAndDateFrom, "", __names.year, "=", from.getFullYear());
            __createDatePeriodXPathNode(fAndDateFrom, "", __names.month, ">=", bcdui.util.datetime._twoDigits(from.getMonth() + 1));
            // 1. Date to mo <=, yr =
            __createDatePeriodXPathNode(fAndDateTo, "", __names.year, "=", to.getFullYear());
            __createDatePeriodXPathNode(fAndDateTo, "", __names.month, "<=", bcdui.util.datetime._twoDigits(to.getMonth() + 1));
            if (to.getFullYear() - from.getFullYear() > 1) {
              // 3. year from >, year to <
              __createDatePeriodXPathNode(fYears, "", __names.year, ">", from.getFullYear());
              __createDatePeriodXPathNode(fYears, "", __names.year, "<", to.getFullYear());
            }
          }
          return;
        } // end isMonth
        // if isWeek range
        if (pcConfig.isWeekSelectable && bcdui.util.datetime.isWeekRange(from, to) && from <= to) {
          var yFrom = bcdui.util.datetime.getISOWeekYear(from);
          var yTo = bcdui.util.datetime.getISOWeekYear(to);
          var wFrom = bcdui.util.datetime.getISOWeekNumber(from);
          var wTo = bcdui.util.datetime.getISOWeekNumber(to);
          // format week range
          if (yFrom == yTo ) {
            __createDatePeriodXPathNode(doc, xPath, __names.weekYear, "=", yFrom);
            if (wFrom == wTo && yFrom == yTo) {
              __createDatePeriodXPathNode(doc, xPath, __names.week, "=", bcdui.util.datetime._twoDigits(wFrom));
            } else {
              __createDatePeriodXPathNode(doc, xPath, __names.week, ">=", bcdui.util.datetime._twoDigits(wFrom));
              __createDatePeriodXPathNode(doc, xPath, __names.week, "<=", bcdui.util.datetime._twoDigits(wTo));
            }
          } else {
            var fOr = bcdui.core.createElementWithPrototype(doc, xPath + "/f:Or");
            var fAndDateFrom = bcdui.core.browserCompatibility.appendElementWithPrefix(fOr, "f:And");
            var fAndDateTo = bcdui.core.browserCompatibility.appendElementWithPrefix(fOr, "f:And");
            var fYears = bcdui.core.browserCompatibility.appendElementWithPrefix(fOr, "f:And");
            // 1. Date from  cw >=, cwyr =
            __createDatePeriodXPathNode(fAndDateFrom, "", __names.weekYear, "=", yFrom);
            __createDatePeriodXPathNode(fAndDateFrom, "", __names.week, ">=", bcdui.util.datetime._twoDigits(wFrom));
            // 1. Date to cw <=, cwyr =
            __createDatePeriodXPathNode(fAndDateTo, "", __names.weekYear, "=", yTo);
            __createDatePeriodXPathNode(fAndDateTo, "", __names.week, "<=", bcdui.util.datetime._twoDigits(wTo));
            if (to.getFullYear() - from.getFullYear() > 1) {
              // 3. cwyr from >, cwyr to <
              __createDatePeriodXPathNode(fYears, "", __names.weekYear, ">", yFrom);
              __createDatePeriodXPathNode(fYears, "", __names.weekYear, "<", yTo);
            }
          }
          return;
        } // end isWeek
      } // end  isOutput

      // if date is valid but not any range
      if (pcConfig.isHourSelectable) {
        __createDatePeriodXPathNode(doc, xPath, __names.various, ">=", bcdui.util.datetime.formatDateTime(from));
        __createDatePeriodXPathNode(doc, xPath, __names.various, "<=", bcdui.util.datetime.formatDateTime(to));
      } else {
        __createDatePeriodXPathNode(doc, xPath, __names.various, ">=", bcdui.util.datetime.formatDate(from));
        __createDatePeriodXPathNode(doc, xPath, __names.various, "<=", bcdui.util.datetime.formatDate(to));
      }
    },

    /**
     * Creating a node for date period
     * @private
     */
  _createDatePeriodXPathNode: function(doc, xpath, bRef, op, value){
      if (xpath == "") {
        var targetElement = bcdui.core.browserCompatibility.appendElementWithPrefix(doc, "f:Expression");
        targetElement.setAttribute("bRef", bRef);
      } else {
        var path =  "/f:Expression[@bRef='" + bRef + "' and @op='" + op + "']"; // xpath to period node
        var node = bcdui.core.createElementWithPrototype(doc, xpath); // creating parent node
        var targetElement = bcdui.core.createElementWithPrototype(node, path); // creating node with period inside parent (createElementWithPrototype not works with more than one attr address in xpath)
      }
      targetElement.setAttribute("op", op);
      if (typeof value != 'undefined')
        targetElement.setAttribute("value", value);
      return targetElement;
    },

    /**
     * @param firstSelectableDay {String} The first selectable day value (if given)
     * @private
     */
  _getNow: function(firstSelectableDay) {
    
    var now = new Date();
    var nowIso = bcdui.widget.periodChooser._dateToIso(now);

    // if nothing is specified, we return "now"
    if (firstSelectableDay == null || ! firstSelectableDay.match(/\d{4}\-\d{2}\-\d{2}/g))
      return now;

    // if firstSelectableDay is specified, we check if it's < today, if so, return today (otherwise a focus would set a "not allowed" date)
    if (firstSelectableDay < nowIso)
      return now;

    // otherwise return firstSelectableDay value
    return new Date(
      parseInt(firstSelectableDay.substring(0, 4), 10),
      parseInt(firstSelectableDay.substring(5, 7), 10) - 1,
      parseInt(firstSelectableDay.substring(8, 10), 10));
  },
    
  /**
   * OnFocus event listener of date fields - year, month and day.
   * @param inputElement {HTMLElement} The one of date field - year, month or day.
   * @private
   */
  _onFocusInput: function(inputElement)
    {
      var now = null;
      var parent = bcdui._migPjs._$(inputElement).parent().get(0);

      var firstSelectableDay = bcdui._migPjs._$(parent).parent().get(0).getAttribute("bcdFirstSelectableDay");

      var year = bcdui._migPjs._$(parent).find("input.bcdYear")[0];
      if (year.value == null || !year.value.trim()) {
        if (now == null) { now = bcdui.widget.periodChooser._getNow(firstSelectableDay); }
        year.value = now.getFullYear();
      }
      var month = bcdui._migPjs._$(parent).find("input.bcdMonth")[0];
      if (month.value == null || !month.value.trim()) {
        if (now == null) { now = bcdui.widget.periodChooser._getNow(firstSelectableDay); }
        month.value = bcdui.util.datetime._twoDigits(now.getMonth() + 1);
      }
      var day = bcdui._migPjs._$(parent).find("input.bcdDay")[0];
      if (day.value == null || !day.value.trim()) {
        if (now == null) { now = bcdui.widget.periodChooser._getNow(firstSelectableDay); }
        if (bcdui._migPjs._$(parent).parent().get(0).getAttribute("bcdIsFreeRangeSelectable") === "true") {
            if (parent.isFrom) {
              day.value = "01";
            } else {
              var t = new Date(now.getFullYear(), now.getMonth(), 1);
              t.setMonth(t.getMonth() + 1);
              t.setDate(t.getDate() - 1);
              day.value = t.getDate();
            }
        } else {
          day.value = bcdui.util.datetime._twoDigits(now.getDate());
        }
        var hour = bcdui._migPjs._$(parent).find("input.bcdHour")[0];
        if (hour != null) {
          if (hour.value == null || !hour.value.trim()) {
            if (now == null) { now = bcdui.widget.periodChooser._getNow(firstSelectableDay); }
            if (bcdui._migPjs._$(parent).parent().get(0).getAttribute("bcdIsFreeRangeSelectable") === "true") {
                  hour.value = parent.isFrom ? "00" : "23";
            } else {
              hour.value = "00";
            }
          }
        }
        var minute = bcdui._migPjs._$(parent).find("input.bcdMinute")[0];
        if (minute != null) {
          if (minute.value == null || !minute.value.trim()) {
            if (now == null) { now = bcdui.widget.periodChooser._getNow(firstSelectableDay); }
            if (bcdui._migPjs._$(parent).parent().get(0).getAttribute("bcdIsFreeRangeSelectable") === "true") {
              minute.value= parent.isFrom ? "00" : "59";
            } else {
              minute.value = "00";
            }
          }
        }
        var second = bcdui._migPjs._$(parent).find("input.bcdSecond")[0];
        if (second != null) {
          if (second.value == null || !second.value.trim()) {
            if (now == null) { now = bcdui.widget.periodChooser._getNow(firstSelectableDay); }
            if (bcdui._migPjs._$(parent).parent().get(0).getAttribute("bcdIsFreeRangeSelectable") === "true") {
                  second.value = parent.isFrom ? "00" : "59";
            } else {
              second.value = "00";
            }
          }
        }
      }
      if (now != null) {
        // there is a change
        var v = year.value + "-" + month.value + "-" + day.value;
        if (hour != null){
          v += "T" + hour.value;
          if (minute != null) {
            v += ":" + minute.value;
          }else{
            if (parent.isFrom)
              v += ":00";
            else
              v += ":59";
          }
          if (second != null) {
            v += ":" + second.value
          }else{
            if (parent.isFrom)
              v += ":00";
            else
              v += ":59";
          }
        }
        bcdui.widget.periodChooser._getHiddenFieldBySpanValue(parent).value = v + ";" + v;
      }
      if (bcdui._migPjs._$(inputElement).is(":focus"))
        bcdui._migPjs._$(inputElement).select();
      else
        bcdui._migPjs._$(inputElement).focus().select();
    },

    /**
     * 
     * @private
     */
  _onPasteInput: function(inputElement) {
    var oldMaxLength = inputElement.getAttribute("bcdMaxLength");
    inputElement.setAttribute("bcdMaxLength", 20);
    setTimeout(function(){
        var input = inputElement.value;
        inputElement.setAttribute("bcdMaxLength", oldMaxLength);
        if (!bcdui.util.datetime.isValidDate(input)) {
          inputElement.value = input.substring(0, Math.min(input.length, oldMaxLength));
          return;
        }
        var date = bcdui.util.datetime.parseDate(input);
        var parent = bcdui._migPjs._$(inputElement).parent().get(0);
        var year = bcdui._migPjs._$(parent).find("input.bcdYear")[0];
        var month = bcdui._migPjs._$(parent).find("input.bcdMonth")[0];
        var day = bcdui._migPjs._$(parent).find("input.bcdDay")[0];
        var hour = bcdui._migPjs._$(parent).find("input.bcdHour")[0];
        var minute = bcdui._migPjs._$(parent).find("input.bcdMinute")[0];
        var second = bcdui._migPjs._$(parent).find("input.bcdSecond")[0];
        year.value = date.getFullYear();
        month.value = bcdui.util.datetime._twoDigits(date.getMonth() + 1);
        day.value = bcdui.util.datetime._twoDigits(date.getDate());
        if (hour != null)
          hour.value = bcdui.util.datetime._twoDigits(date.getHours());
        if (minute != null)
          minute.value = bcdui.util.datetime._twoDigits(date.getMinutes());
        else
          date.setMinutes(0, 0, 0);
        if (second != null)
          second.value = bcdui.util.datetime._twoDigits(date.getSeconds());
        else
          date.setSeconds(0, 0);
        var hiddenInput = bcdui.widget.periodChooser._getHiddenFieldBySpanValue(parent);
        hiddenInput.value = bcdui.util.datetime.formatDateTime(date);
        if (hour != null)
          hiddenInput.value = bcdui.util.datetime.formatDateTime(date);
    }, 0); //or 4
  },

  /**
   * OnBlur event listener of date fields - year, month, day, hour, minute, second.
   * @private
   * @param inputElement {HTMLElement} The one of date field - year, month, day, hour, minute, second.
   */
  _onBlurInput: function(inputElement)
    {
      bcdui.widget.periodChooser._completeDateField(inputElement); // autocomlete value in current field
      var hiddenInput = bcdui.widget.periodChooser._getHiddenFieldBySpanValue(bcdui._migPjs._$(inputElement).parent().get(0));
      var datetime = hiddenInput.value.split(";")[0];
      var date = datetime.split("T")[0];
      var parcels = date.split("-");
      if (jQuery.makeArray(parcels).length != 3) {
        bcdui.log.warn("_onBlurInput: " + bcdui._migPjs._$(hiddenInput).parent().get(0).id + ", wrong date format - " + date);
        return;
      }
      if (bcdui._migPjs._$(inputElement).hasClass("bcdYear")) {
        date = inputElement.value + "-" + parcels[1] + "-" + parcels[2];
      } else if (bcdui._migPjs._$(inputElement).hasClass("bcdMonth")) {
        date = parcels[0] + "-" + inputElement.value + "-" + parcels[2];
      } else if (bcdui._migPjs._$(inputElement).hasClass("bcdDay")) {
        date = parcels[0] + "-" + parcels[1] + "-" + inputElement.value;
      }
      hiddenInput.value = date + ";" + date;
      if (jQuery(bcdui._migPjs._$(inputElement).parent().get(0)).parent().get(0).getAttribute("bcdIsHourSelectable") == "true") {
        if (datetime.split("T").length > 1)
          var time = datetime.split("T")[1];
        else {
          var time = bcdui._migPjs._$(inputElement).parent().get(0).isFrom ? "00:00:00" : "23:59:59";
        }
        var timeParcels = time.split(":");
        date += "T";
        if (bcdui._migPjs._$(inputElement).hasClass("bcdHour")) {
          date += inputElement.value + ":" + timeParcels[1] + ":" + timeParcels[2];
        } else if (bcdui._migPjs._$(inputElement).hasClass("bcdMinute")) {
          date += timeParcels[0] + ":" + inputElement.value + ":" + timeParcels[2];
        } else if (bcdui._migPjs._$(inputElement).hasClass("bcdSecond")) {
          date += timeParcels[0] + ":" + timeParcels[1] + ":" + inputElement.value;
        }else{
          date += timeParcels[0] + ":" + timeParcels[1] + ":" + timeParcels[2];
        }
        hiddenInput.value = date + ";" + date;
      }
      hiddenInput.onchange();
    },

  /**
   * See _increasePeriod, but take pcConfig from dom
   * @private
   */
  _incPeriod: function(value, htmlElement) {
    var e = jQuery(htmlElement).closest(".bcdPeriodChooser");
    if (e.length > 0) {
      bcdui.widget.periodChooser._increasePeriod(value, {
        targetModelId: e.attr("bcdTargetModelId")
      , targetModelXPath: e.attr("bcdTargetModelXPath")
      , outputPeriodType: e.attr("bcdOutputPeriodType") == "true"
      , isHourSelectable: e.attr("bcdIsHourSelectable") == "true"
      , isWeekSelectable: e.attr("bcdIsWeekSelectable") == "true"
      , isMonthSelectable: e.attr("bcdIsMonthSelectable") == "true"
      , isQuarterSelectable: e.attr("bcdIsQuarterSelectable") == "true"
      , isYearSelectable: e.attr("bcdIsYearSelectable") == "true"
     });
    }
  },

  /**
   * Increases period and write new value to the model.
   * @private
   * @param value {Integer} The delta value.
   * @param pcConfig {
   *  @param targetModelId {String} The identifier of target model.
   *  @param targetModelXPath {String} The XPath in whole XML model data.
   *  @param outputPeriodType {Boolean} if output of periodChooser produced as periodType.
   *  @param isWeekSelectable {Boolean}
   *  @param isYearSelectable {Boolean}
   *  @param isQuarterSelectable {Boolean}
   *  @param isMonthSelectable {Boolean}
   * }
   */
  _increasePeriod: function(value, pcConfig)
    {
      var targetModel = bcdui.factory.objectRegistry.getObject(pcConfig.targetModelId);
      var targetModelXPath = pcConfig.targetModelXPath;
      if (bcdui.widget.periodChooser._isWrs(targetModel.getData())) {
        var dateString = bcdui.widget._getDataFromXML(targetModel, targetModelXPath);
        var date = bcdui.util.datetime.parseDate(dateString);
        if (date != null) {
          date.setDate(date.getDate() + value); // only days
          dateString = bcdui.util.datetime.formatDate(date);
          if (pcConfig.isHourSelectable){
            dateString = bcdui.util.datetime.formatDateTime(date);
          }
          bcdui.widget.periodChooser._updateWrsXMLDoc(dateString, targetModel, targetModelXPath)
        }
      } else {
        var fromDate = bcdui.util.datetime.parseDate(bcdui.widget.periodChooser._getDateFromAttr(targetModel.getData(), bcdui.widget.periodChooser._getDateFromXPath(targetModel.getData(), targetModelXPath, pcConfig.outputPeriodType)));
        var toDate = bcdui.util.datetime.parseDate(bcdui.widget.periodChooser._getDateFromAttr(targetModel.getData(), bcdui.widget.periodChooser._getDateToXPath(targetModel.getData(), targetModelXPath, pcConfig.outputPeriodType)));
        if (fromDate != null && toDate != null) {
          bcdui.util.datetime.increasePeriod(value, fromDate, toDate);
          var fromDateString = bcdui.util.datetime.formatDate(fromDate);
          var toDateString = bcdui.util.datetime.formatDate(toDate);
          if (pcConfig.isHourSelectable){
            fromDateString = bcdui.util.datetime.formatDateTime(fromDate);
            toDateString = bcdui.util.datetime.formatDateTime(toDate);
          }
          bcdui.widget.periodChooser._setDateFrom(targetModel.getData(), targetModelXPath, fromDateString, pcConfig.outputPeriodType);
          bcdui.widget.periodChooser._setDateTo(targetModel.getData(), targetModelXPath, toDateString, pcConfig.outputPeriodType);
          bcdui.widget.periodChooser._setDatePeriodType(fromDateString, toDateString, pcConfig);
          if( targetModel.fire )
            targetModel.fire();
        }
      }
    },

  /**
   * Turns a month/year input into an ISO date (YYYY-MM-DD) range output
   * @private
   * @param pcargs {
   *  @param year {Integer} the yr information.
   *  @param mo {Integer} the mo information.
   *  @param cw {Integer} the cw information.
   *  @param cwyr {Integer} the cwyr information.
   *  @param dy {String} the dy information.
   * @return attributes: from and to for calculated range
   * }
   */
  _periodToISORange: function( args )
  {
    var a = {from: "", to: ""};
    if (args.mo) args.mo = parseInt(args.mo, 10);
    if (args.cw) args.cw = parseInt(args.cw, 10);
    if (args.yr) args.yr = parseInt(args.yr, 10);
    if (args.cwyr) args.cwyr = parseInt(args.cwyr, 10);
    if (args.qr) args.qr = parseInt(args.qr, 10);
    if (   (args.yr && isNaN(args.yr))
        || (args.mo && isNaN(args.mo))
        || (args.mo && args.mo < 1)
        || (args.mo && args.mo > 12)
        || (args.cw && isNaN(args.cw))
        || (args.cw && args.cw < 1)
        || (args.cw && args.cw > 53)
        || (args.cwyr && isNaN(args.cwyr))
        || (args.qr && isNaN(args.qr))
        || (args.qr && args.qr < 1)
        || (args.qr && args.qr > 4)
        )
      return a;

    // single day
    if (! args.qr && args.dy && ! args.yr && ! args.mo && ! args.cw && ! args.cwyr) {
      a.from = a.to = args.dy;
    }
    // single year
    else if (! args.qr && ! args.dy && args.yr && ! args.mo && ! args.cw && ! args.cwyr) {
      a.from = args.yr + "-01-01";
      a.to = args.yr + "-12-31";
    }
    // single weekyear
    else if (! args.qr && ! args.dy && !args.yr && ! args.mo && ! args.cw && args.cwyr) {
      a.from = args.cwyr + "-01-01";
      a.to = args.cwyr + "-12-31";
    }
    // quarter
    else if (args.qr && ! args.dy && args.yr && ! args.mo && ! args.cw && ! args.cwyr) {
      var quarterArrayFrom = ["-01-01", "-04-01", "-07-01", "-10-01"];
      var quarterArrayTo = ["-03-31", "-06-30", "-09-30", "-12-31"];
      a.from = args.yr + quarterArrayFrom[args.qr - 1];
      a.to = args.yr + quarterArrayTo[args.qr - 1];
    }
    // month
    else if (! args.qr && ! args.dy && args.yr && args.mo && ! args.cw && ! args.cwyr) {
      var mocw = args.mo;
      var yr = args.yr;
      // switch to next month and subtract one day
      if (mocw == 12) {yr++; mocw=1;} else mocw++;
      var eom = new Date(yr, mocw-1, 1);
      eom.setDate(eom.getDate()-1);
      a.from = args.yr + "-" + (parseInt(args.mo, 10) < 10 ? "0":"") + args.mo + "-01";
      a.to = bcdui.widget.periodChooser._dateToIso(eom);
    }
    // week
    else if (! args.qr && ! args.dy && ! args.yr && ! args.mo && args.cw && args.cwyr) {
      // set 1st of Jan of selected (calendarweek) year
      var sow = new Date(args.cwyr, 0, 1);
      // jump back to monday
      var dow = sow.getDay();
      var off = (dow > 0) ? dow - 1 : 6;
      sow.setDate(sow.getDate() - off);
      // get thursday of that week and check if it's in last or current year (if not, the 1st week starts a week later)
      var thu = new Date(sow);
      thu.setDate(thu.getDate() + 3);
      if (thu.getFullYear() != args.cwyr) sow.setDate(sow.getDate() + 7);
      // now we got the first week and we can simply add the weeks
      sow.setDate(sow.getDate() + 7 * (args.cw - 1));
      a.from = bcdui.widget.periodChooser._dateToIso(sow);
      // end is 6 days later
      sow.setDate(sow.getDate() + 6);
      a.to = bcdui.widget.periodChooser._dateToIso(sow);
    }
    
    return a;
  },
  
  /**
   * Turns a month/year input into an ISO date (YYYY-MM-DD) range output
   * @private
   */
  _dateToIso: function (theDate) {
    var yr = "" + theDate.getFullYear();
    var mocw = "" + (theDate.getMonth() + 1);
    var dy = "" + theDate.getDate();
    if (mocw.length == 1) mocw = "0" + mocw;
    if (dy.length == 1) dy = "0" + dy;
    return yr + "-" + mocw + "-" + dy;
  },

  /**
   * Turns a period filter into a period range filter, same period type (mo/cw/dy)
   * Assumes a filter as written by the periodChooser: f:And with two yr+mo or cwyr+cw or one dy f:Expression(s) as children
   * Given period becomes the end of the range. 
   * Does not work with ranges as input or hours
   * Works sync and assumes targetModel to be ready
   * @private
   * @param args {
   *  @param value {Integer} Positive size of the range.
   *  @param targetModelId {String|object} Target model.
   *  @param targetModelXPath {String} The XPath in whole XML model data.
   * }
   */
  _periodToRange: function( args )
  {
    var model = bcdui.factory.objectRegistry.getObject(args.targetModelId);
    var node = model.getData().selectSingleNode(args.targetModelXPath);
    if( !node || !node.selectSingleNode("f:Expression") )
      return;

    var n = bcdui.widget.periodChooser._getBindingItemNamesByTargetModel(model, args.targetModelXPath);

    // The current period becomes the new end, if its a range, we remove the lower end
    var clonedInput = node.cloneNode(true);
    var clonedMoCwDyNode = clonedInput.selectSingleNode("f:Expression[@bRef='" + n.quarter + "' or @bRef='" + n.month + "' or @bRef='" + n.week + "' or @bRef='" + n.various + "']/@op[.='=']");
    if( clonedMoCwDyNode )
      clonedMoCwDyNode.nodeValue = "<=";

    // Change the original filter to range start
    var rangeStart = - (args.value - 1);
    var options = {
      targetModelId: model, 
      targetModelXPath: args.targetModelXPath,
      isQuarterSelectable: null !== clonedInput.selectSingleNode("f:Expression[@bRef='" + n.quarter + "']"),
      isMonthSelectable:   null !== clonedInput.selectSingleNode("f:Expression[@bRef='" + n.month + "']"),
      isWeekSelectable:    null !== clonedInput.selectSingleNode("f:Expression[@bRef='" + n.week + "']"),
      isDaySelectable:     null !== clonedInput.selectSingleNode("f:Expression[@bRef='" + n.various + "']"),
      outputPeriodType:    null !== clonedInput.selectSingleNode("f:Expression[@bRef='" + n.quarter + "' or @bRef='" + n.month + "' or @bRef='" + n.week + "']")
    }
    bcdui.widget.periodChooser._increasePeriod( rangeStart, options );

    // since we've increased the period, we need to set dateTo accordingly
    node.setAttribute("dateTo",clonedInput.getAttribute("dateTo"));

    // Check whether start and end of range are in the same year
    var oldYr, newYr;
    // mo / cw case
    if( clonedInput.selectSingleNode("./f:Expression[@bRef='" + n.year + "' or @bRef='" + n.weekYear + "']") ) {
      oldYr = clonedInput.selectSingleNode("./f:Expression[@bRef='" + n.year + "' or @bRef='" + n.weekYear + "']/@value").nodeValue;
      newYr = node.selectSingleNode("./f:Expression[@bRef='" + n.year + "' or @bRef='" + n.weekYear + "']/@value").nodeValue;
    } 
    // dy case
    else {
      oldYr = clonedInput.selectSingleNode("./f:Expression[@bRef='" + n.various + "']/@value").nodeValue.split("-")[0];
      newYr = node.selectSingleNode("./f:Expression[@bRef='" + n.various + "']/@value").nodeValue.split("-")[0];
    }

    // For dy in free range case, we also get dy <=, which we do not need anymore 
    var dy2 = node.selectSingleNode("./f:Expression[@bRef='" + n.various + "' and @op='<=']");
    if( dy2 )
      dy2.parentNode.removeChild( dy2 );

    // New condition is (yr=2015 && mo/cw >= 2 && mo/cw <= 6) or ((yr=2014 && mo/cw >= 10) || (yr=2015 &&  mo/cw <= 3)), 
    // depending on whether we cross a year border, or simply a range of dy
    if( oldYr === newYr || node.selectSingleNode("./f:Expression[@bRef='" + n.various + "']")!==null ) {
      node.selectSingleNode("./f:Expression[@bRef='" + n.quarter + "' or @bRef='" + n.month + "' or @bRef='" + n.week + "' or @bRef='" + n.various + "']/@op").nodeValue = ">=";
      node.appendChild(clonedInput.selectSingleNode("f:Expression[(@bRef='" + n.quarter + "' or @bRef='" + n.month + "' or @bRef='" + n.week + "' or @bRef='" + n.various + "') and @op='<=']"));
    }
    else {

      // create a new (!, to ensure we use the current timestamp) outer f:And with inner f:Or periodChooser like format node
      var inner = bcdui.core.createElementWithPrototype(node.parentNode, "f:And[@id='id_" + new Date().getTime() + "']/f:Or");
      inner.parentNode.setAttribute("id", node.getAttribute("id"));

      // and move mandatory attributes dateFrom, dateTo to new f:And root node
      // either they were given or generated by periodToRangeTransformator 
      ["dateFrom","dateTo"].forEach( function(att) {
        inner.parentNode.setAttribute(att, node.getAttribute(att));
        node.removeAttribute(att);
        clonedInput.removeAttribute(att);
      });

      // also move optional attributes isValid, bcdPostfix to new f:And root node
      // such attributes belong to the period chooser widget only and may not exist in a filter condition without a widget 
      ["isValid","bcdPostfix"].forEach( function(att) {
        if (node.getAttribute(att) != null)
          inner.parentNode.setAttribute(att, node.getAttribute(att));
        node.removeAttribute(att);
        clonedInput.removeAttribute(att);
      });

      // Add lower range to inner f:Or
      inner.appendChild(node);
      // Make it lower end of range
      inner.selectSingleNode("./f:And/f:Expression[@bRef='" + n.quarter + "' or @bRef='" + n.month + "' or @bRef='" + n.week + "' or @bRef='" + n.various + "']/@op").nodeValue = ">=";
      // Add upper range to inner f:Or
      inner.appendChild(clonedInput);
    }
  },

  /**
   * A transformer, taking the input, leaving everything 1:1 except a period filter, which is transformed to a range
   * with the given date or range end as the end and keeping the input period type
   * @param parameters {
   *  @param rangeSize {Integer} Size of the range.
   *  @param targetModelXPath {String} The xPath pointing to the period filter within the transformed document.
   * }
   */
  periodToRangeTransformator: function( doc, parameters )
  {
    var model = new bcdui.core.StaticModel( { data: bcdui.core.browserCompatibility.cloneDocument(doc) } );
    model.execute();
    // create targetNode if it's not available (in this case, the xPath has to be fully qualified)
    var targetNode = model.getData().selectSingleNode(parameters.targetModelXPath);
    if (targetNode == null)
      targetNode = model.write(parameters.targetModelXPath);
    var n = bcdui.widget.periodChooser._getBindingItemNamesByTargetModel(model, parameters.targetModelXPath);
    if( !targetNode.getAttribute("dateFrom") || !targetNode.getAttribute("dateTo") ) {
      var params = {};
      [
         n.year
        ,n.quarter
        ,n.month
        ,n.weekYear
        ,n.week
        ].forEach(function(v) { 
        var node = targetNode.selectSingleNode("f:Expression[@bRef='"+v+"']/@value");
        params[v] = node ? node.nodeValue : null;
      });
      var fromTo = bcdui.widget.periodChooser._getDateFromToQMC( params );
      targetNode.setAttribute( "dateFrom", fromTo.dateFrom.toISOString().split("T")[0] );
      targetNode.setAttribute( "dateTo",   fromTo.dateTo.toISOString().split("T")[0] );
    }
    bcdui.widget.periodChooser._periodToRange( { targetModelId: model, value: parameters.rangeSize, targetModelXPath: parameters.targetModelXPath } );
    return model.dataDoc;
  },

  /**
   * Validates the date and copy validation info from wrapper to the model.
   * @param containerHtmlElement
   * @private
   */
  _validateValue: function(containerHtmlElement)
    {
      if (containerHtmlElement.getAttribute("bcdValidate") == "true") {
        var setValidityClass = function(isValid){
          bcdui._migPjs._$(containerHtmlElement).find("span.bcdValue").each(function(i, span) {
            if(isValid){
              jQuery(span).removeClass("bcdInvalid");
            } else {
              jQuery(span).addClass("bcdInvalid");
            }
          });
        };
        var validateWrapperId = containerHtmlElement.getAttribute("bcdValidateWrapperId");
        var validateWrapper = bcdui.factory.objectRegistry.getObject(validateWrapperId);
        // copy validation info from wrapper to the model
        validateWrapper&&bcdui.core.reExecute(validateWrapper);
        bcdui.factory.objectRegistry.withReadyObjects( containerHtmlElement.getAttribute("bcdValidateWrapperId"), function()
        {
          validateWrapper = bcdui.factory.objectRegistry.getObject(validateWrapperId);
          var message = validateWrapper.getData().selectSingleNode("/validation-result").text;
          var t = bcdui.widget.periodChooser._getTargetData(containerHtmlElement);
          if (bcdui.widget.periodChooser._isWrs(t.doc)) {
            var column = bcdui.core.createElementWithPrototype(t.doc, "/wrs:Wrs/wrs:Header/wrs:ValidationResult/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[1]");
            column.setAttribute("pos", "1");
            column.setAttribute("id", "RowId");
            column.setAttribute("type-name", "NUMERIC");
            column = bcdui.core.createElementWithPrototype(t.doc, "/wrs:Wrs/wrs:Header/wrs:ValidationResult/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[2]");
            column.setAttribute("pos", "2");
            column.setAttribute("id", "ColPos");
            column.setAttribute("type-name", "NUMERIC");
            column = bcdui.core.createElementWithPrototype(t.doc, "/wrs:Wrs/wrs:Header/wrs:ValidationResult/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[3]");
            column.setAttribute("pos", "3");
            column.setAttribute("id", "error");
            column.setAttribute("type-name", "VARCHAR");

            var node = null;
            var f = bcdui.widget.periodChooser._extractRowAndColFromWrsModelXPath(t.targetModel, t.targetModelXPath);
            if (f) {
              var xp = "/wrs:Wrs/wrs:Header/wrs:ValidationResult/wrs:Wrs/wrs:Data/wrs:R[wrs:C[1]='" + f.row + "' and wrs:C[2]='" + f.col + "']";
              node = t.doc.selectSingleNode(xp);
            }
            if (message) {
              if (node) {
                bcdui.core.createElementWithPrototype(t.doc, xp + "/wrs:C[3]", false).text = message;
              } else {
                // insert wrs:R to the last position under wrs:Data
                node = bcdui.core.createElementWithPrototype(t.doc, "/wrs:Wrs/wrs:Header/wrs:ValidationResult/wrs:Wrs/wrs:Data", false);
                var pos = 1 + node.selectNodes("./wrs:R").length;
                var el = bcdui.core.createElementWithPrototype(t.doc, "/wrs:Wrs/wrs:Header/wrs:ValidationResult/wrs:Wrs/wrs:Data/wrs:R[" + pos + "]/wrs:C[1]", false);
                el.text = f.row;
                el = bcdui.core.createElementWithPrototype(t.doc, "/wrs:Wrs/wrs:Header/wrs:ValidationResult/wrs:Wrs/wrs:Data/wrs:R[" + pos + "]/wrs:C[2]", false);
                el.text = f.col;
                el = bcdui.core.createElementWithPrototype(t.doc, "/wrs:Wrs/wrs:Header/wrs:ValidationResult/wrs:Wrs/wrs:Data/wrs:R[" + pos + "]/wrs:C[3]", false);
                el.text = message;
              }
              setValidityClass(false);
            } else if (node) {
              node.parentNode.removeChild(node);
              setValidityClass(true);
            }
          } else {
            var targetElement = bcdui.core.createElementWithPrototype(t.doc, t.targetModelXPath);
            if (targetElement.nodeType == 2)
              targetElement = t.doc.selectSingleNode(t.targetModelXPath + "/..");
            if (message) {
              targetElement.setAttribute("isValid", "false");
              targetElement.setAttribute("message", message);
              setValidityClass(false);
            } else {
              targetElement.setAttribute("isValid", "true");
              if (targetElement.getAttribute("message")) {
                targetElement.removeAttribute("message");
              }
              setValidityClass(true);
            }
          }
        }, !!validateWrapper);
      }
    },

  /**
   * Extracts and returns the row and column indexes from WRS xpath.
   * @private
   * @param targetModel {DataProvider} The target model.
   * @param targetModelXPath {String} The XPath in whole XML model data.
   * @return The map contains the following properties or null if data is not available
   * <ul>
   *   <li>row: {Integer} Row index.</li>
   *   <li>col: {Integer} Column index.</li>
   * </ul>
   */
  _extractRowAndColFromWrsModelXPath: function(targetModel, targetModelXPath)
    {
      var node = targetModel.getData().selectSingleNode(targetModelXPath);
      if (node) {
        var rowIndex = node.parentNode.selectNodes("./preceding-sibling::wrs:*").length;
        var columnIndex = node.selectNodes("./preceding-sibling::wrs:C").length;
        return { row: 1 + rowIndex, col: 1 + columnIndex };
      }
      return null;
    },

  /**
   * Adds to the date input field key observers: onkeyup and onkeydown.
   * @private
   * @param input {HTMLElement} Date field - year, month or day.
   */
  _addKeyObservers: function(input)
    {
      bcdui._migPjs._$(input).on("keyup", function(event) {
        if (!(event.ctrlKey || event.altKey) && bcdui.widget.periodChooser._isInput(event.keyCode)) {
          var input = event.target;
          if (bcdui.widget.periodChooser._isCtrlWasDown) {
            bcdui.widget.periodChooser._isCtrlWasDown = false;
          } else if (input.value.length >= input.maxLength) {
            // jump to the next date field
            setTimeout(function() { bcdui.widget.periodChooser._nextPCField(input); }, 100);
          }
        }
      });
      bcdui._migPjs._$(input).on("keydown", function(event) {
        if (event.ctrlKey || event.altKey) {
          if (bcdui.widget.periodChooser._isInput(event.keyCode)) {
            bcdui.widget.periodChooser._isCtrlWasDown = true;
          }
        } else {
          var input = event.target;
          switch (event.keyCode) {
          case bcdui.util.Event.KEY_UP:
           // increase value in current field
            var res = parseInt(input.value, 10);
            if (input.value.replace(/^0*/, "") == res.toString() || res == 0) {
              var max = 0;
              if (bcdui._migPjs._$(input).hasClass("bcdYear")) {
                max = 2100;
              } else if (bcdui._migPjs._$(input).hasClass("bcdMonth")) {
                max = 12;
              } else if (bcdui._migPjs._$(input).hasClass("bcdDay")) {
                max = 31;
              } else if (bcdui._migPjs._$(input).hasClass("bcdHour")) {
                max = 23;
              } else if (bcdui._migPjs._$(input).hasClass("bcdMinute")) {
                max = 59;
              } else if (bcdui._migPjs._$(input).hasClass("bcdSecond")) {
                max = 59;
              }
              if (res < max) {
                input.value = res + 1;
                bcdui.widget.periodChooser._completeDateField(input);
              }
            }
            break;
          case bcdui.util.Event.KEY_DOWN:
            // decrease value in current field
            var res = parseInt(input.value, 10);
            if (input.value.replace(/^0*/, "") == res.toString() || res == 0) {
              var min = input.maxLength == 4 ? 1900 : 1;
              if (res > min) {
                input.value = res - 1;
                bcdui.widget.periodChooser._completeDateField(input);
              }
            }
            break;
          case bcdui.util.Event.KEY_TAB:
            // "jump" to the next field
            event.stopPropagation();
            event.preventDefault();
            if (event.shiftKey)
              bcdui.widget.periodChooser._prevField(input);
            else
              bcdui.widget.periodChooser._nextField(input);
            break;
          }
        }
      });
    },

  /**
   * Completes the date field. For month or day field when there's an one-digit value in it the leading
   * zero is added. For year field when there's non four-digits value in it the value completed to 2000 year.
   * @param input {HTMLElement} Date field - year, month or day.
   * @private
   */
  _completeDateField: function(input)
    {
      if (input.value.length < input.maxLength) {
        switch (input.maxLength) {
        case 2: input.value = "0" + (input.value.length == 1 ? input.value : "1"); break;
        case 4:
          var t = "2";
          for (var i = 0; i < 3 - input.value.length; i++)
            t += "0";
          t += input.value;
          input.value = t; break;
        }
      }
    },

  /**
   * Calculate and activate "next" date field relative the current active field.
   * If last field selected moves to first PeriodChooser field
   * @param input {HTMLElement} Current active date field - year, month or day.
   * @private
   */
  _nextPCField: function(input)
    {
      var el = bcdui._migPjs._$(input);
      var next;
      var bcdHour = el.nextAll("input.bcdHour");
      var bcdMinute = el.nextAll("input.bcdMinute");
      var bcdSecond = el.nextAll("input.bcdSecond");
      if (el.hasClass("bcdYear")) {
        next = el.nextAll("input.bcdMonth");
      } else if (el.hasClass("bcdMonth")) {
        next = el.nextAll("input.bcdDay");
      } else if (el.hasClass("bcdDay") && bcdHour.length > 0) {
        next = bcdHour;
      } else if (el.hasClass("bcdHour") && bcdMinute.length > 0) {
        next = bcdMinute;
      } else if (el.hasClass("bcdMinute") && bcdSecond.length > 0) {
        next = bcdSecond;
      } else {
        var value = el.parent();
        var nextValue = value.nextAll("span.bcdValue");
        next = (! nextValue.length > 0 ? value.parent() : nextValue).find("input.bcdYear").first();
      }
      if (next.is(":focus"))
        next.select();
      else
        next.focus().select();
    },
  /**
   * Calculate and activate "next" date field relative the current active field.
   * if last field selected moves to next widget
   * @param input {HTMLElement} Current active date field - year, month or day.
   * @private
   */
  _nextField: function(input)
    {
      var el = bcdui._migPjs._$(input);
      var next = null;
      var bcdHour = el.nextAll("input.bcdHour");
      var bcdMinute = el.nextAll("input.bcdMinute");
      var bcdSecond = el.nextAll("input.bcdSecond");
      if (el.hasClass("bcdYear")) {
        next = el.nextAll("input.bcdMonth");
      } else if (el.hasClass("bcdMonth")) {
        next = el.nextAll("input.bcdDay");
      } else if (el.hasClass("bcdDay") && bcdHour.length > 0) {
        next = bcdHour;
      } else if (el.hasClass("bcdHour") && bcdMinute.length > 0) {
        next = bcdMinute;
      } else if (el.hasClass("bcdMinute") && bcdSecond.length > 0) {
        next = bcdSecond;
      } else {
        var value = el.parent();
        var nextValue = value.nextAll("span.bcdValue");
        if (! nextValue.length > 0) {
          // trying to find next widget
          var b = bcdui._migPjs._$(input);
          // moving to top of DOM
          while (b.parent().length > 0 && typeof b.parent().get(0).tagName != 'undefined')
            b = b.parent();
          // getting all inputs
          var inputs = b.find("input[type='text'], input:not([type])");
          var i = 0;
          // finding next visible input
          while (next == null || ! next.length > 0) {
            var nextIndex = i == inputs.length - 1 ? 0 : i + 1;
            if (input == inputs[i]){
              if (bcdui.widget.periodChooser._isVisible(inputs[nextIndex])){
                next = jQuery(inputs[nextIndex]);
                break;
              }else{
                input = jQuery(inputs[nextIndex]).get(0);
              }
            }
            i = nextIndex;
          }
        }else{
          next = nextValue.find("input.bcdYear").first();
        }
      }
      if (next.is(":focus"))
        next.select();
      else
        next.focus().select();
    },

  /**
   * Calculate and activate "previous" date field relative the current active field.
   * if first field selected moves to previous widget
   * @param input {HTMLElement} Current active date field - year, month or day.
   * @private
   */
  _prevField: function(input)
    {
      var el = bcdui._migPjs._$(input);
      var prev = null;
      var bcdHour = el.prevAll("input.bcdHour");
      var bcdMinute = el.prevAll("input.bcdMinute");
      var bcdSecond = el.prevAll("input.bcdSecond");
      if (el.hasClass("bcdSecond")) {
        prev = bcdMinute;
      }else if (el.hasClass("bcdMinute")) {
        prev = bcdHour;
      }else if (el.hasClass("bcdHour")){
        prev = el.prevAll("input.bcdDay");
      }else if (el.hasClass("bcdDay")) {
        prev = el.prevAll("input.bcdMonth");
      } else if (el.hasClass("bcdMonth")) {
        prev = el.prevAll("input.bcdYear");
      } else {
        var value = el.parent();
        var prevValue = value.prevAll("span.bcdValue");
        if (! prevValue.length > 0) {
          // trying to find next widget
          var b = bcdui._migPjs._$(input);
          // moving to top of DOM
          while (b.parent().length > 0 && typeof b.parent().get(0).tagName != 'undefined')
            b = b.parent();
          // getting all inputs
          var inputs = b.find("input[type='text'], input:not([type])");
          var i = inputs.length - 1;
          // finding next visible input
          while (prev == null || ! prev.length > 0) {
            var nextIndex = i == 0 ? inputs.length - 1 : i - 1;
            if (input == inputs[i]){
              if (bcdui.widget.periodChooser._isVisible(inputs[nextIndex])){
                prev = jQuery(inputs[nextIndex]);
                break;
              }else{
                input = jQuery(inputs[nextIndex]).get(0);
              }
            }
            i = nextIndex;
          }
        }else{
          prev = prevValue.find("input.bcdSecond, input.bcdMinute, input.bcdHour, input.bcdDay").first();
        }
      }
      if (prev.is(":focus"))
        prev.select();
      else
        prev.focus().select();
    },

  /**
   * Checks if elem is visible
   * @param input {HTMLElement}
   * @private
   */
  _isVisible: function(elem){
    if (! bcdui._migPjs._$(elem).is(":visible")) {
      return false;
    }
    return bcdui._migPjs._$(elem).outerWidth() != 0 && bcdui._migPjs._$(elem).outerHeight() != 0;
  },

  /**
   * @param code {Integer} Key code.
   * @returns {Boolean} "True" if key code represents printable symbol.
   * @private
   */
  _isInput: function(code)
    {
      return code == 32 || (code > 47 && code < 94) || (code > 95 && code < 123) || (code > 185 && code < 193) || (code > 218 && code < 223);
    },

   /**
    *  Set default parameters
    * @param HTMLElement  htmlElement The element the periodChooser is based on.
    * @private
    */
    _adjustDefaultParameters: function(HTMLElement) {
      if (HTMLElement.getAttribute("bcdIsDaySelectable") == ""||!HTMLElement.getAttribute("bcdIsDaySelectable")) {
        HTMLElement.setAttribute("bcdIsDaySelectable", "true");
      }
      if (HTMLElement.getAttribute("bcdIsWeekSelectable") == ""||!HTMLElement.getAttribute("bcdIsWeekSelectable")) {
        HTMLElement.setAttribute("bcdIsWeekSelectable", "false");
      }
      if (HTMLElement.getAttribute("bcdIsMonthSelectable") == ""||!HTMLElement.getAttribute("bcdIsMonthSelectable")) {
        HTMLElement.setAttribute("bcdIsMonthSelectable", "true");
      }
      if (HTMLElement.getAttribute("bcdIsQuarterSelectable") == ""||!HTMLElement.getAttribute("bcdIsQuarterSelectable")) {
        HTMLElement.setAttribute("bcdIsQuarterSelectable", "true");
      }
      if (HTMLElement.getAttribute("bcdIsYearSelectable") == ""||!HTMLElement.getAttribute("bcdIsYearSelectable")) {
        HTMLElement.setAttribute("bcdIsYearSelectable", "true");
      }
      if (HTMLElement.getAttribute("bcdShowPrevNextButtons") == ""||!HTMLElement.getAttribute("bcdShowPrevNextButtons")) {
        HTMLElement.setAttribute("bcdShowPrevNextButtons", "false");
      }
      if (HTMLElement.getAttribute("bcdIsFreeRangeSelectable") == ""||!HTMLElement.getAttribute("bcdIsFreeRangeSelectable")) {
        HTMLElement.setAttribute("bcdIsFreeRangeSelectable", "false");
      }
      if (HTMLElement.getAttribute("bcdOutputPeriodType") == ""||!HTMLElement.getAttribute("bcdOutputPeriodType")) {
          HTMLElement.setAttribute("bcdOutputPeriodType", "false");
        }
      if (HTMLElement.getAttribute("bcdTextInput") == ""||!HTMLElement.getAttribute("bcdTextInput")) {
        HTMLElement.setAttribute("bcdTextInput", "false");
      }
      if (HTMLElement.getAttribute("bcdValidate") == ""||!HTMLElement.getAttribute("bcdValidate")) {
        HTMLElement.setAttribute("bcdValidate", "true");
      }
      if (HTMLElement.getAttribute("bcdMandatory") == ""||!HTMLElement.getAttribute("bcdMandatory")) {
        HTMLElement.setAttribute("bcdMandatory", "false");
      }
    },

    /**
     * @classdesc
     *  Listener to see changes of target Xpath in model. Calls visualization and validation of new data
     * @extends bcdui.widget.XMLDataUpdateListener
     * @private
     */
    XMLListener: bcdui._migPjs._classCreate(bcdui.widget.XMLDataUpdateListener,
        {
          /**
           * @lends bcdui.widget.periodChooser.XMLListener.prototype
           */        
          updateValue: function()
            {
              var containerHtmlElement = bcdui._migPjs._$(this.htmlElementId).get(0);
              bcdui.widget.periodChooser._updateViewFromXMLData(containerHtmlElement);
              bcdui.widget.periodChooser._validateValue(containerHtmlElement);
            }
    }),

    /**
     * Get the Date from a combination of yr/qr, yr/mo or cwyr/cw
     * @return \{ dataFrom, dataTo \}
     * @private
     */
    _getDateFromToQMC: function( args )
    {
      if( args.qr)
        return { dateFrom: new Date(Date.UTC(args.yr, (parseInt(args.qr)-1)*3, 1)),
                 dateTo: new Date(Date.UTC(args.yr, (parseInt(args.qr)-1)*3 + 2 + 1, 0)) };

      if( args.mo )
        return { dateFrom: new Date(Date.UTC(args.yr, parseInt(args.mo)-1, 1)), 
                 dateTo: new Date(Date.UTC(args.yr, parseInt(args.mo)-1 + 1, 0)) };

      // CW
      var weekStart = bcdui.widget.periodChooser._getFirstDayOfWeek( args.cw, args.cwyr );
      return { dateFrom: weekStart,
               dateTo: new Date(Date.UTC( weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6 )) };
    },
    
    /**
     * Helper to get the Date of an ISO calendar week's start and end, 
     * based on Julien Kronegg's answer in stackoverflow
     * @private
     */
    _getFirstDayOfWeek: function(week, year) 
    { 
      var date       = bcdui.widget.periodChooser._getFirstDayOfFirstWeekOfYear(year);
      var weekTime   = 1000 * 60 * 60 * 24 * 7 * (week - 1); // Week to milliseconds
      var targetTime = date.getTime() + weekTime;
      date.setTime(targetTime);
      return date;
    },

    /**
     * Helper, first day of calendar week 1. May be in the previous year.
     * based on Julien Kronegg's answer in stackoverflow
     * @private
     */
    _getFirstDayOfFirstWeekOfYear: function(year) 
    {
      // Get the first day of the year
      var firstDayOfYear = new Date(Date.UTC(year,0));

      var FIRST_DAY_OF_WEEK = 1; // Monday, according to iso8601
      var WEEK_LENGTH = 7; // 7 days per week
      var day = firstDayOfYear.getDay();
      day = (day === 0) ? 7 : day; // make the days monday-sunday equals to 1-7 instead of 0-6
      var dayOffset = -day + FIRST_DAY_OF_WEEK; // dayOffset will correct the date in order to get a Monday
      // the current week has not the minimum 4 days required by iso 8601 => add one week
      if (WEEK_LENGTH-day+1<4)
        dayOffset += WEEK_LENGTH;
      var date = new Date(firstDayOfYear.getTime()+dayOffset*24*60*60*1000);
      return date;
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
          var ePostFix = jQuery(e).find(".bcdPostfix input").first().get(0);
          bcdui.widget._getCaptionFromWidgetElement(ePostFix, function(postFix) {
            var targetModel = e.getAttribute("bcdTargetModelId");
            var targetXPath = e.getAttribute("bcdTargetModelXPath");
            if (targetModel != null && targetXPath != null) {
              bcdui.factory.objectRegistry.withReadyObjects(targetModel, function(){
                var fromDate = bcdui.factory.objectRegistry.getObject(targetModel).getData().selectSingleNode(targetXPath + "/@dateFrom");
                var toDate = bcdui.factory.objectRegistry.getObject(targetModel).getData().selectSingleNode(targetXPath + "/@dateTo");
                if (fromDate != null && toDate != null) {
                  callback(id, (postFix != "" ? bcdui.util.datetime.prettyPrintDateRange(fromDate.text, toDate.text) + " (" + postFix + ")" : bcdui.util.datetime.prettyPrintDateRange(fromDate.text, toDate.text)));
                  return;
                }
                callback(id, "");
                return;
              });
              return;
            }
            callback(id, "");
            return;
          });
          return;
        }
      }
      callback(id, "");
    },

    /**
     * adds/overwrites dateFrom/dateTo attributes on periodChoosers filter nodes (outer And)
     * based on the currently available filters
     * @param {targetModelDoc} document containing the filter nodes which needs to get worked on
     */
    rebuildDateFromDateToFromFilter: function(targetModelDoc) {

      // try to find periodChooser outer f:And nodes where dateFrom/dateTo should be added
      var targetModelNodes = [];
      var determinedPostfix = null;
      for (var x in bcdui.widget.periodChooser._dateRangeBindingItemNames) {
        var nodes = targetModelDoc.selectNodes("//f:Filter//f:Expression[@op and @value!='' and (@bRef='" + bcdui.widget.periodChooser._dateRangeBindingItemNames[x] + "' or starts-with(@bRef, '" + bcdui.widget.periodChooser._dateRangeBindingItemNames[x] + "'))]");
        for (var n = 0; n < nodes.length; n++) {
          var outerAnd = null
          var node = nodes[n];
          // simple f:And/f:Expression
          if (node && node.parentNode && node.parentNode.nodeName == "f:And") {
            outerAnd = node.parentNode;
            // or f:And/f:Or/f:And/f:Expression
            if (node.parentNode.parentNode && node.parentNode.parentNode.nodeName == "f:Or" && node.parentNode.parentNode.parentNode && node.parentNode.parentNode.parentNode.nodeName == "f:And")
              outerAnd = node.parentNode.parentNode.parentNode;
            if (outerAnd.getAttribute("bcdMarker") == null) {
              outerAnd.setAttribute("bcdMarker", "true");
              var bRef = node.getAttribute("bRef");
              determinedPostfix = bRef.indexOf("_") == -1 ? "" : bRef.substring(bRef.indexOf("_") + 1);
              targetModelNodes.push(outerAnd);
            }
          }
        }
      }

      // remove temporary marker
      var marked = targetModelDoc.selectNodes("//f:And[@bcdMarker]");
      for (var m = 0; m < marked.length; m++)
        marked[m].removeAttribute("bcdMarker");

      // let's rebuild the period ranges
      for (var t = 0; t < targetModelNodes.length; t++) {
        var targetNode = targetModelNodes[t];

        // get currently used periodtype (either set one or determined one)
        var postfix = "";
        if (targetNode) {
          postfix = targetNode.getAttribute("bcdPostfix");
          if (postfix == null && determinedPostfix != null)
            postfix = determinedPostfix;
          postfix = postfix != null ? postfix : "";
        }
        if (postfix == "bcdEmpty")
          postfix = "";

        // get correct names for periodtype
        var __names = {};
        for (var x in bcdui.widget.periodChooser._dateRangeBindingItemNames)
          __names[x] = bcdui.widget.periodChooser._dateRangeBindingItemNames[x] + (postfix != "" ? "_" + postfix : "");
      
        var argsFrom = {};
        var argsTo = {};
  
        // grab simple =, >=, <= period types
        for (var x in __names) {
          var newName = __names[x].indexOf("_") == -1 ? __names[x] : __names[x].substring(0, __names[x].indexOf("_"));
          var value = targetNode.selectSingleNode("./f:Expression[@bRef='" + __names[x] + "' and (@op='=' or @op='>=')]/@value"); value = value == null ? "" : value.text;
          if (value != "") argsFrom[newName] = value;
          value = targetNode.selectSingleNode("./f:Expression[@bRef='" + __names[x] + "' and (@op='=' or @op='<=')]/@value"); value = value == null ? "" : value.text;
          if (value != "") argsTo[newName] = value;
        }
        // grab multi year period types (we're only interested in the outer ranges)
        for (var x in __names) {
          var newName = __names[x].indexOf("_") == -1 ? __names[x] : __names[x].substring(0, __names[x].indexOf("_"));
          var value = targetNode.selectSingleNode("./f:Or/f:And[f:Expression[@op='>=']]/f:Expression[@bRef='" + __names[x] + "' and (@op='=' or @op='>=')]/@value"); value = value == null ? "" : value.text;
          if (value != "") argsFrom[newName] = value;
          value = targetNode.selectSingleNode("./f:Or/f:And[f:Expression[@op='<=']]/f:Expression[@bRef='" + __names[x] + "' and (@op='=' or @op='<=')]/@value"); value = value == null ? "" : value.text;
          if (value != "") argsTo[newName] = value;
        }
        //  special filter case: you might have a filter structure like this (e.g. via a 2016-01-01 to 2017-12-31 plus cell filter 2016 filterFromCell result)
        //  f:Or
        //    f:And
        //      f:Expression[bRef='yr' value='2016' op='=']
        //      f:Expression[bRef='mo' value='01' op='>=']
        //    /f:And
        //    f:And
        //      f:Expression[bRef='mo' value='12' op='<=']
        //    /f:And
        //  /f:Or
        //  which would lead to a from "yr:2016, mo:01" and a to "mo:12". In this case the yr information from 'from' needs to be cloned to the 'to' part
        if (argsFrom["yr"]   && ! argsTo["yr"])     argsTo["yr"]     = argsFrom["yr"];
        if (argsTo["yr"]     && ! argsFrom["yr"])   argsFrom["yr"]   = argsTo["yr"];
        if (argsFrom["cwyr"] && ! argsTo["cwyr"])   argsTo["cwyr"]   = argsFrom["cwyr"];
        if (argsTo["cwyr"]   && ! argsFrom["cwyr"]) argsFrom["cwyr"] = argsTo["cwyr"];

        // let's convert the found values to iso dates and add the attributes
        var periodFrom = bcdui.widget.periodChooser._periodToISORange(argsFrom);
        var periodTo = bcdui.widget.periodChooser._periodToISORange(argsTo);

        if (periodFrom.from && periodFrom.from != "" && periodTo.to && periodTo.to != "") {
          targetNode.setAttribute("dateFrom", periodFrom.from);
          targetNode.setAttribute("dateTo", periodTo.to);
        }
      }
    }
}); // namespace
