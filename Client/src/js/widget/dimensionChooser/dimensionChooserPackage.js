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
 * A namespace for the BCD-UI dimensionChooser widget. For creation @see {@link bcdui.widgetNg.createDimensionChooser}
 * @namespace bcdui.widget.dimensionChooser
 */
bcdui.widget.dimensionChooser = Object.assign(bcdui.widget.dimensionChooser,
/** @lends bcdui.widget.dimensionChooser */
{
  /**
   * init creates a model wrapper dimensionSelection and a listener that creates inputFields and automodels depending
   * on the selected level.
   * @private
   */
  init: function( htmlElement ){

    if (htmlElement.getAttribute("bcdLabel")){
      var labelEl = jQuery("<label></label>").appendTo(htmlElement);
      bcdui.widget._initLabel(labelEl, null, htmlElement.getAttribute("bcdLabel"));
    }

    bcdui.widget._bcdIdToDomId(htmlElement);
    bcdui.widget._cleanupHTMLElementId(htmlElement);
    this._adjustDefaultParameters(htmlElement);
    bcdui.widget._assureModelIdAndXPathAttributes( {htmlElement: htmlElement} );

    var caption = htmlElement.getAttribute("bcdCheckBoxCaption") != null ? htmlElement.getAttribute("bcdCheckBoxCaption") : "MultiSelect";
    var multiSelect = htmlElement.getAttribute("bcdMultiSelect") != null ? htmlElement.getAttribute("bcdMultiSelect") : "false";

    var clearOptionLevel = htmlElement.getAttribute("bcdClearOptionLevel");
    var clearOption = htmlElement.getAttribute("bcdClearOption") != null ? htmlElement.getAttribute("bcdClearOption") : "";
    clearOptionLevel = (clearOptionLevel == null) ? clearOption : clearOptionLevel;
    var emptyValueLevel = htmlElement.getAttribute("bcdEmptyValueLevel");
    var emptyValue = htmlElement.getAttribute("bcdEmptyValue") != null ? htmlElement.getAttribute("bcdEmptyValue") : "";
    emptyValueLevel = (emptyValueLevel == null) ? emptyValue : emptyValueLevel;

    var id = htmlElement.getAttribute("bcdId") || htmlElement.getAttribute("id");
    id = id == null ? "" : id;

    var bcdMultiSelectTargetXpath = "/*/f:Filter/f:Or[@bcdDimension=&#39;" + htmlElement.getAttribute("bcdDimension") + "&#39;]";
    var bcdMultiSelectTargetXpathExclude = "/*/f:Filter/f:And[@bcdDimension=&#39;" + htmlElement.getAttribute("bcdDimension") + "_exclude&#39;]";
    var bcdMultiSelectEditXpath = "/*/guiStatus:ClientSettings/guiStatus:MultiSelect[@bcdDimension=&#39;" + htmlElement.getAttribute("bcdDimension") + "&#39;]/f:Filter/f:And";
    var bcdSelectedMultiPath = "/*/guiStatus:ClientSettings/guiStatus:SelectedMulti[@bcdDimension=&#39;" + htmlElement.getAttribute("bcdDimension") + "&#39;]";

    jQuery(htmlElement).append(
      "<table><tr" + ((multiSelect != "check") ? " style='display:none'>" : ">")
    + "<td id='" + id + "_expandMulti'><span class='bcdMultiSelect'><span class='radio'><form><span>"
    + "<input type='checkbox' title='" + caption + "' onclick='bcdui.widget.dimensionChooser._toggleMulti(this);'></input>"
    + "<span>" + caption + "</span></span></form></span></span></td></tr>"
    + "<tr" + ((multiSelect != "true") ? " style='display:none'>" : ">")
    + "<td id='" + id + "_multiSelectBox'"
    + " bcdMultiSelectTargetXpath='" + bcdMultiSelectTargetXpath + "'"
    + " bcdMultiSelectTargetXpathExclude='" + bcdMultiSelectTargetXpathExclude + "'"
    + " bcdMultiSelectEditXpath='" + bcdMultiSelectEditXpath + "'"
    + " bcdSelectedMultiPath='" + bcdSelectedMultiPath + "'"
    + bcdui.widget._domFromBcdAttribute(htmlElement, "bcdTargetModelId", "bcdTargetModelId")
    + " bcdDimensionChooserId='" + id + "'>"

    + "<span id='" + id + "_multiContainer'"
    + bcdui.widget._domFromBcdAttribute(htmlElement, "bcdTargetModelId", "bcdTargetModelId")
    + bcdui.widget._domFromBcdAttribute(htmlElement, "bcdSelectedMultiPath", "bcdTargetModelXPath")
    + " bcdTargetModelXPath='" + bcdSelectedMultiPath + "'"
    + " bcdKeepEmptyValueExpression='false'"
    + " bcdOptionsModelId='" + id + "_Selection'"
    + " bcdOptionsModelXPath='/Selections/Selection/Caption'"
    + " bcdOptionsModelRelativeValueXPath='../Value'"
    + " bcdIsCheckBox='false'"
    + "></span>"

    + "</td></tr><tr" + ((multiSelect != "true") ? " style='display:none'" : "") + ((htmlElement.getAttribute("bcdAllowMixedSelect") != "true") ? " class='bcdNonMixed'" : "class='bcdMixed'") +  "><td>"
    + "<span id='" + id + "_addButton_cell' class='bcdButton bcdAdd'><a onclick='this.className=&quot;bcdClicked&quot;; bcdui.widget.dimensionChooser._addMultiSelect(&quot;" + id + "_multiSelectBox\&quot;, false, false); this.className=&quot;&quot;;' href='javascript:void(0)' id='" + id + "_addButton' title='Add'>Incl.</a></span>"

    + (htmlElement.getAttribute("bcdAllowMixedSelect") == "true" ? ("<span id='" + id + "_excludeButton_cell'class='bcdButton bcdExclude'><a onclick='this.className=&quot;bcdClicked&quot;; bcdui.widget.dimensionChooser._addMultiSelect(&quot;" + id + "_multiSelectBox\&quot;, false, true); this.className=&quot;&quot;;' href='javascript:void(0)' id='" + id + "_excludeButton' title='Exclude'>Excl.</a></span>") : "")

    + "<span id='" + id + "_removeButton_cell'class='bcdButton bcdRemove'><a onclick='this.className=&quot;bcdClicked&quot;; bcdui.widget.dimensionChooser._removeMultiSelect(&quot;" + id + "_multiSelectBox\&quot;); this.className=&quot;&quot;;' href='javascript:void(0)' id='" + id + "_removeButton' title='Remove'>Remove</a></span>"
    + "</td></tr><tr><td><div class='bcdChooserCaptionFixed' style='margin-top: 7px;'>Level</div>"

    + "<span id='" + id + "_levelContainer' bcdId='" +  id + "_level' bcdKeepEmptyValueExpression='false' bcdIsSortOptions='false'"
    + bcdui.widget._domFromBcdAttribute(htmlElement, "bcdTargetModelId", "bcdTargetModelId")
    + bcdui.widget._domFromBcdAttribute(htmlElement, "bcdTargetModelXPath", "bcdTargetModelXPath")
    + " bcdOptionsModelXPath='/*/dm:Level[@visible=&#39;true&#39; or not(@visible)]/@caption'"
    + " bcdOptionsModelRelativeValueXPath='../@id'"
    + " bcdClearOption='" + clearOptionLevel + "'"
    + " bcdEmptyValue='" + emptyValueLevel + "'"
    + "></span>"
    
    + "</td></tr></table>"        
    ).addClass("bcdDimensionChooser");
    
    // level selector widget needs a distinct level model
    var distinctWrapper = new bcdui.core.ModelWrapper({
      inputModel: bcdui.wkModels.bcdDimensions
    , chain: bcdui.contextPath + "/bcdui/js/widget/dimensionChooser/distinctOptions.xslt"
    , parameters: {dimName: htmlElement.getAttribute("bcdDimension") }
    } );
    bcdui.factory.objectRegistry.registerObject(distinctWrapper);
    jQuery("#" + id + "_levelContainer").attr("bcdOptionsModelId", distinctWrapper.id);

    // init inner multiSelect and inputField
    bcdui.widget.multiSelect.init(jQuery("#" + id + "_multiContainer").get(0));
    bcdui.widget.inputField.init(jQuery("#" + id + "_levelContainer").get(0));
    
    var e = htmlElement;
    var multiSelectTargetXpath = "/*/f:Filter/f:Or[@bcdDimension='" + htmlElement.getAttribute("bcdDimension") + "']";
    var multiSelectTargetXpathExclude = "/*/f:Filter/f:And[@bcdDimension='" + htmlElement.getAttribute("bcdDimension") + "_exclude']";
    var multiSelectEditXpathRoot = "/*/guiStatus:ClientSettings/guiStatus:MultiSelect[@bcdDimension = '"+ htmlElement.getAttribute("bcdDimension") +"']/f:Filter"; 
    var multiSelectEditXpath = multiSelectEditXpathRoot + "/f:And";
    var selectedMulti="/*/guiStatus:ClientSettings/guiStatus:SelectedMulti[@bcdDimension='"+ htmlElement.getAttribute("bcdDimension")+"']";
    var multiExpandXpath ="/*/guiStatus:ExpandMulti[@bcdDimension='"+ htmlElement.getAttribute("bcdDimension")+"']";
    var config = {
      element: htmlElement,
      elementId: htmlElement.id,
      idRef: htmlElement.getAttribute("bcdTargetModelId"),
      targetModelId: htmlElement.getAttribute("bcdTargetModelId"),
      targetModelXPath: htmlElement.getAttribute("bcdTargetModelXPath"),
      dimensionName: htmlElement.getAttribute("bcdDimension"),
      multiSelect: htmlElement.getAttribute("bcdMultiSelect"),
      allowMixedSelect: htmlElement.getAttribute("bcdAllowMixedSelect"),
      checkBoxCaption: htmlElement.getAttribute("bcdCheckBoxCaption"),
      configurationModelId: htmlElement.getAttribute("bcdConfigurationModelId"),
      useCaptions: htmlElement.getAttribute("bcdUseCaptions"),
      clearOption: htmlElement.getAttribute("bcdClearOption"),
      clearOptionLevel: htmlElement.getAttribute("bcdClearOptionLevel"),
      emptyValue: htmlElement.getAttribute("bcdEmptyValue"),
      emptyValueLevel: htmlElement.getAttribute("bcdEmptyValueLevel"),
      mandatory: htmlElement.getAttribute("bcdMandatory"),
      url: htmlElement.getAttribute("bcdURL"),
      multiExpandXpath: multiExpandXpath,
      multiSelectTargetXpath: multiSelectTargetXpath,
      multiSelectTargetXpathExclude: multiSelectTargetXpathExclude,
      limitLevels: htmlElement.getAttribute("bcdLimitLevels") || ""
    };

    // remember config on main element
    jQuery("#" + e.id).data("config", config);

    // Model Wrapper that creates the options model of the multiselect box
    bcdui.factory.createModelWrapper({
      id: e.id +'_Selection',
      url: bcdui.config.jsLibPath + 'widget/dimensionChooser/dimensionSelection.xslt',
      inputModel: config.targetModelId,
      parameters: {chooserId: e.id, dimensionName: config.dimensionName }
    });

    // Listener creates or removes dimension chooser selects according to the level
    var models = [ bcdui.wkModels.bcdDimensions, config.targetModelId, distinctWrapper.id];
    if (config.configurationModelId)
      models.push(config.configurationModelId);

    bcdui.factory.objectRegistry.withReadyObjects(models, function(){

      // build levelStorage object which is a lookup of elements for each level
      var xPath = "/dm:Dimensions/dm:Dimension[@id='" + config.dimensionName + "']/*/dm:Level/@id";
      var levelStorage = {};
      var availLevels = bcdui.wkModels.bcdDimensions.queryNodes(xPath);
      for (var l = 0; l < availLevels.length; l++) {
        var Levels = new Array();
        bcdui.widget.dimensionChooser._createLevelLists(Levels, availLevels[l], config.dimensionName);
        levelStorage[availLevels[l].text] = Levels;
      }
      jQuery("#" + e.id).data("levelStorage", levelStorage);

      // listener on manifested f:filter changes
      bcdui.factory.addDataListener({
        idRef: config.targetModelId,
        onlyOnce: false,
        trackingXPath: multiSelectTargetXpath + "|" + multiSelectTargetXpathExclude,
        id: e.id + "_listenerMultiSelectTargetXpath",
        listener: function(){

          // if html doesn't exist anymore, we remove the listener 
          if (bcdui.widget.dimensionChooser._cleanupListener(config)) return;

          // update optionsmodel for multiselect
          bcdui.factory.objectRegistry.getObject(e.id +'_Selection').execute(true);

          // check if we got an internal or external change
          // this internal change flag needs to be set when the dimchooser itself triggers
          // a filter change (e.g. when adding or removing an entry)
          // you need to ensure(!) that in case it is set, this listener IS triggered, so the flag gets reset correctly
          var levelStorage = jQuery("#" + e.id).data("levelStorage");
          var internalUpdate = jQuery("#" + e.id).data("internal") || false;
          jQuery("#" + e.id).data("internal", false);

          // in case the event was triggered from outside, we try to set the elements and level
          if (! internalUpdate) {
            var targetModel = bcdui.factory.objectRegistry.getObject(config.targetModelId);

            var foundLevel =  bcdui.widget.dimensionChooser._guessLevel(targetModel, multiSelectTargetXpath, levelStorage);

            // let's remove all choosers first (deregister objects, remove lines etc) without refreshing the filter area
            bcdui.widget.dimensionChooser._removeObsoleteChooser(config.element.id, [], config.element.id, config.targetModelId, true, config.dimensionName);

            // show multi area accordingly if we got more than one filter elements
            if (config.multiSelect != "false" && targetModel.getData().selectNodes(multiSelectTargetXpathExclude + "/f:Or").length > 0)
              bcdui.widget.dimensionChooser._showMultiSelectArea(config.element.id);
            else if (config.multiSelect != "false" && targetModel.getData().selectNodes(multiSelectTargetXpath + "/f:And").length > 1)
              bcdui.widget.dimensionChooser._showMultiSelectArea(config.element.id);
            else if (config.multiSelect != "true")
              bcdui.widget.dimensionChooser._hideMultiSelectArea(config.element.id);

            // copy 1st filter into edit area to make it visible in the input fields (especially needed in single mode) 
            bcdui.core.removeXPath(targetModel.getData(), multiSelectEditXpath);
            var source = targetModel.getData().selectSingleNode(multiSelectTargetXpath + "/f:And[1]");
            var sourceExclude = targetModel.getData().selectSingleNode(multiSelectTargetXpathExclude + "/f:Or[1]");
            if (source != null) {
              var destination = bcdui.core.createElementWithPrototype(targetModel.getData(), multiSelectEditXpathRoot);
              destination.appendChild(source.cloneNode(true));
            } else if (sourceExclude != null) { // reset level selection on only-exclude-selection
              foundLevel = "";
            }

            // write calculated level based on 1st filter and recreate the chooser
            bcdui.core.createElementWithPrototype(targetModel.getData(), config.targetModelXPath).text = foundLevel;
            var Levels = foundLevel != "" && levelStorage[foundLevel] ? levelStorage[foundLevel] : new Array();
            bcdui.widget.dimensionChooser._createDimensionChooser(Levels, config.element.id, config);
          }
        }
      });
      
      // update level input field with possible visible=false flags to hide levels (also take limitLevels into account)
      var optionsModelLevel = bcdui.factory.objectRegistry.getObject(distinctWrapper.id);
      var notVisibleLevels = config.configurationModelId ? jQuery.makeArray(bcdui.factory.objectRegistry.getObject(config.configurationModelId).getData().selectNodes("rnd:Configuration/rnd:Level[@visible='false']/@id")).map(function(e) { return e.nodeValue || e.text; }) : [];
      var levelNodes = optionsModelLevel.getData().selectNodes("/*/dm:Level");
      var limitLevels = config.limitLevels.split(" ");
      limitLevels = limitLevels.filter(function(e){return e.trim() != "";});
      for (var i = 0; i < levelNodes.length; i++) {
        var id = levelNodes[i].getAttribute("id");
        if ((notVisibleLevels.length > 0 && notVisibleLevels.indexOf(id) != -1) || (limitLevels.length > 0 && limitLevels.indexOf(id) == -1))
          levelNodes[i].setAttribute("visible", "false");
      }
      optionsModelLevel.fire();
      var targetModel = bcdui.factory.objectRegistry.getObject(config.targetModelId);

      bcdui.widget.dimensionChooser._cleanFilters(config);

      // initialize multi select area
      var multiSelect = jQuery("#" + e.id).find('span.bcdMultiSelect select').first();
      multiSelect.attr("bcdSelectedMultiPath" , selectedMulti);
      multiSelect.attr("bcdMixedTargetModelXPath" , config.targetModelXPath );
      multiSelect.attr("bcdMixedOptionsModelId" , bcdui.wkModels.bcdDimensions.id );
      multiSelect.attr("bcdMixedDimensionName" , config.dimensionName );
      multiSelect.attr("ondblclick","bcdui.widget.dimensionChooser._removeMultiSelect('"+  e.id  +"_multiSelectBox'"+ ");");
      bcdui.widget.dimensionChooser._initMultiSelect(e.id, targetModel, config.dimensionName, config);

      var visibleLevels = jQuery.makeArray(availLevels).map(function(e){return e.text});
      var hidden = jQuery.makeArray(optionsModelLevel.getData().selectNodes("/*/dm:Level[@visible='false']/@id")).map(function(e){return e.text;});
      visibleLevels = visibleLevels.filter(function(e){ return hidden.indexOf(e) == -1; }) // filter hidden ones
      visibleLevels = visibleLevels.filter(function(e, idx){return visibleLevels.indexOf(e) == idx}); // make unique

      // Special case: When there is only one visible level, we hide the level chooser and set its value (if empty)
      if( visibleLevels.length === 0 ) {
        bcdui.log.warn("BCD-UI: DimensionChooser "+e.id+" could not find any levels.")
      } else if( visibleLevels.length == 1 ) {
        jQuery("#" + e.id+ "_level").closest("TR").hide();
        var levelNode = bcdui.core.createElementWithPrototype(targetModel.getData(),config.targetModelXPath);
        levelNode.nodeValue = visibleLevels[0];
      }

      // (re)generate choosers functionality
      var listener = function(elId, init, config){

        // if html doesn't exist anymore, we remove the listener 
        if (bcdui.widget.dimensionChooser._cleanupListener(config)) return;

        var levelStorage = jQuery("#" + elId).data("levelStorage");
        var targetModel = bcdui.factory.objectRegistry.getObject(config.targetModelId);
        var level = targetModel.getData().selectSingleNode(config.targetModelXPath);
        var oneLevelMode = ! jQuery("#" + elId + "_level").closest("TR").is(":visible");

        if (init) {

          // show multi area accordingly if we got more than one filter element or excluded entries
          if (config.multiSelect != "false" && targetModel.getData().selectNodes(multiSelectTargetXpathExclude + "/f:Or").length > 0)
            bcdui.widget.dimensionChooser._showMultiSelectArea(config.element.id);
          else if (config.multiSelect != "false" && targetModel.getData().selectNodes(multiSelectTargetXpath + "/f:And").length > 1)
            bcdui.widget.dimensionChooser._showMultiSelectArea(config.element.id);
          else if (config.multiSelect != "true")
            bcdui.widget.dimensionChooser._hideMultiSelectArea(config.element.id);

          // copy 1st filter into edit area to make it visible in the input fields (especially needed in single mode) 
          bcdui.core.removeXPath(targetModel.getData(), multiSelectEditXpath);
          var source = targetModel.getData().selectSingleNode(multiSelectTargetXpath + "/f:And[1]");
          var sourceExclude = targetModel.getData().selectSingleNode(multiSelectTargetXpathExclude + "/f:Or[1]");
          if (source != null) {
            var destination = bcdui.core.createElementWithPrototype(targetModel.getData(), multiSelectEditXpathRoot);
            destination.appendChild(source.cloneNode(true));
          } else if (sourceExclude != null) {
            level = null; // reset level selection on only-exclude-selection
          }

          // if no level is given, we try to guess it
          if (level == null) {
            var foundLevel =  bcdui.widget.dimensionChooser._guessLevel(targetModel, multiSelectTargetXpath, levelStorage);
            bcdui.core.createElementWithPrototype(targetModel.getData(), config.targetModelXPath).text = foundLevel;
            level = foundLevel != "" ? foundLevel : null;
          }
          else {
            level = level.text;
          }
        }
        else if (level != null)
          level = level.text;

        var Levels = level != null && levelStorage[level] ? levelStorage[level] : new Array();
        bcdui.widget.dimensionChooser._removeObsoleteChooser(elId, Levels, elId, config.targetModelId, false, config.dimensionName);
        bcdui.widget.dimensionChooser._createDimensionChooser(Levels, elId, config);
      };

      // regenerate choosers on each level change
      bcdui.factory.addDataListener({
        idRef: config.targetModelId,
        onlyOnce: false,
        id: htmlElement.id + "_listenerTargetModelXPath",
        trackingXPath: config.targetModelXPath,
        listener: listener.bind(undefined, htmlElement.id, false, config)
      });

      // and initially
      listener(htmlElement.id, true, config);

      if (htmlElement.getAttribute("bcdEnableNavPath") != null && htmlElement.getAttribute("bcdEnableNavPath") == "true") {
        bcdui.widget.dimensionChooser.getNavPath(jQuery(htmlElement).parent().attr("id"), function(id, value) {
          bcdui.widget._linkNavPath(id, value);
        }.bind(this));
      }
    });

    // initially show multi select if wanted
    if( config.multiSelect === 'true' )
      bcdui.core.createElementWithPrototype( bcdui.factory.objectRegistry.getObject(config.targetModelId).getData(),multiExpandXpath +"/@value" ).nodeValue = "true";
    var expand = bcdui.factory.objectRegistry.getObject(config.targetModelId).getData().selectSingleNode(multiExpandXpath +"/@value");
    expand = (expand == null ? false : expand.text == "true");
    if (expand)
      bcdui.widget.dimensionChooser._showMultiSelectArea(e.id);

    // copy listener for single mode only which copies full choosers to real filter area
    bcdui.factory.addDataListener({
      id: e.id+'_listenerCopySelection',
      idRef:  config.targetModelId,
      trackingXPath: "$" + config.targetModelId + "/*/guiStatus:ClientSettings/guiStatus:MultiSelect[@bcdDimension = '"+ config.dimensionName +"']/f:Filter//f:And/f:Expression",
      listener:      function() {

        // if html doesn't exist anymore, we remove the listener 
        if (bcdui.widget.dimensionChooser._cleanupListener(config)) return;

        // only manifest filter if we're in single mode
        var expand = bcdui.factory.objectRegistry.getObject(config.targetModelId).getData().selectSingleNode(multiExpandXpath +"/@value");
        expand = (expand == null ? false : expand.text == "true");
        if (! expand)
          bcdui.widget.dimensionChooser._addMultiSelect(e.id+ '_multiSelectBox', true, false);
      }
    });
  },

  /**
   * remove the filter from target model
   * @private
   */
  _removeMultiSelect: function( targetHtmlElementId){

    var targetHtmlElement       = jQuery("#" + targetHtmlElementId);
    var dimChooserId            = targetHtmlElement.attr("bcdDimensionChooserId");
    var targetModel             = bcdui.factory.objectRegistry.getObject(targetHtmlElement.attr("bcdTargetModelId"));
    var multiSelectEditXpath    = targetHtmlElement.attr("bcdMultiSelectEditXpath");
    var multiSelectTargetXpath  = targetHtmlElement.attr("bcdMultiSelectTargetXpath");
    var multiSelectTargetXpathExclude  = targetHtmlElement.attr("bcdMultiSelectTargetXpathExclude");
    var selectedMulti           = targetHtmlElement.attr("bcdSelectedMultiPath");
    var values = targetModel.getData().selectNodes(selectedMulti);
    if(values.length > 0){

      // mark this as an internal filter change
      targetHtmlElement.closest("[bcddimension]").data("internal", true);

      jQuery.each(values, function(i, e) {
        // only remove candidates which have the same number of children
        // needed for mixedMode since you might remove entries via e.g. a country selection
        // while they do have station of facility elements, too
          var numberOfExpressionsPerValue = values[0].text.match(/f:Expression/g).length;
          var nodes = targetModel.queryNodes(e.text);
          for (var n = 0; n < nodes.length; n++) {
            var childs = nodes[n].selectNodes("f:Expression").length;
            if (childs == numberOfExpressionsPerValue)
              bcdui.core.removeXPath(nodes[n], ".", false, true);
        }
        e.parentNode.removeChild(e);
      });
      targetModel.fire();

      var activeNodes = targetModel.getData().selectNodes(multiSelectTargetXpath + "//f:Expression").length + targetModel.getData().selectNodes(multiSelectTargetXpathExclude + "//f:Expression").length;
      activeNodes > 0 ? jQuery(targetHtmlElement).closest(".bcdDimensionChooser").addClass("bcdActiveFilter") : jQuery(targetHtmlElement).closest(".bcdDimensionChooser").removeClass("bcdActiveFilter");

    }
    // enable/disable level selector if needed
    bcdui.widget.dimensionChooser._checkLevelLock(dimChooserId, targetModel, multiSelectTargetXpath)

  },
  /**
   * add the filter selection to target model
   * @private
   */
  _addMultiSelect: function( targetHtmlElementId, replace, exclude){
    var targetHtmlElement       = jQuery("#" + targetHtmlElementId);
    var dimChooser              = targetHtmlElement.closest("[bcddimension]");
    var config                  = dimChooser.data("config");
    var levelStorage            = dimChooser.data("levelStorage");
    var targetModel             = bcdui.factory.objectRegistry.getObject(targetHtmlElement.attr("bcdTargetModelId"));
    var multiSelectEditXpath    = targetHtmlElement.attr("bcdMultiSelectEditXpath");
    var multiSelectTargetXpath  = targetHtmlElement.attr("bcdMultiSelectTargetXpath");
    var multiSelectTargetXpathExclude  = targetHtmlElement.attr("bcdMultiSelectTargetXpathExclude");
    var dimChooserId            = targetHtmlElement.attr("bcdDimensionChooserId");
    var values                  = targetModel.getData().selectNodes(multiSelectEditXpath);
    var targetModelId           = dimChooser.attr("bcdTargetModelId");
    var targetModelXPath        = dimChooser.attr("bcdTargetModelXPath");

    var level = targetModel.getData().selectSingleNode(targetModelXPath);
    var Levels = level != null && levelStorage != null && levelStorage[level.text] ? levelStorage[level.text] : new Array();
    var numberOfExpressionsPerValue = Levels.length;

    // needs to be defered. Otherwise input field validation keeps field untouched (bcdInvalid) 
    var fkt = function() {
      bcdui.widget.dimensionChooser._copyTargetElements(targetModel, multiSelectTargetXpath , values,  numberOfExpressionsPerValue , replace, dimChooserId, config.dimensionName, exclude, multiSelectTargetXpathExclude);

      values.length > 0 ? jQuery(targetHtmlElement).closest(".bcdDimensionChooser").addClass("bcdActiveFilter") : jQuery(targetHtmlElement).closest(".bcdDimensionChooser").removeClass("bcdActiveFilter");

      // also check if adding needs to turn off level selection
      if (targetModel.read(config.multiExpandXpath +"/@value", "false") == "true")      
        bcdui.widget.dimensionChooser._checkLevelLock(dimChooserId, targetModel, config.multiSelectTargetXpath);
    };
    setTimeout(fkt);
  },

  /**
   * 
   * @private
   */
  _initMultiSelect: function( dimChooserId, targetModel, dimension, config){
    var htmlElement = jQuery("#" + dimChooserId +'_multiSelectBox');
    var multiSelectTargetXpath = "/*/f:Filter/f:Or[@bcdDimension='" + dimension + "']";
    var multiSelectEditXpath = "/*/guiStatus:ClientSettings/guiStatus:MultiSelect[@bcdDimension='" + dimension + "']/f:Filter";

    var numberOfExpressionsPerValue = jQuery("#" + dimChooserId).find('span.bcdInputField').length - 1;

    // in case of mixed mode selection we might have various multiSelectTargetXpath entries and need to select the correct one for the set selection
    // so we need to get a list of used bRefs depending on the selected level
    var multiSelect = jQuery("#" + dimChooserId +'_multiSelectBox').find('span.bcdMultiSelect select').first();
    var targetModelXPath = multiSelect.attr("bcdMixedTargetModelXPath");
    var optionsModelId = multiSelect.attr("bcdMixedOptionsModelId");
    var dimensionName = multiSelect.attr("bcdMixedDimensionName");
    var bRefs = "";

    var levelStorage = jQuery("#" + dimChooserId).data("levelStorage");
    var level =  bcdui.widget.dimensionChooser._guessLevel(targetModel, multiSelectTargetXpath, levelStorage);

    // if guessing failed, we might have a preset level to takeover
    if (level == "")
      level = targetModel.read(config.targetModelXPath, "");

    var Levels = level != "" && levelStorage[level] ? levelStorage[level] : new Array();
    for (var l = 0; l < Levels.length; l++) {
      if (l > 0)
        bRefs +=" and ";
      bRefs += "f:Expression[@bRef='" + Levels[l].getAttribute("bRef") + "']"
    }
    
    // set the correct level (mixed mode might have a different level on 1st element than current one) 
    bcdui.core.createElementWithPrototype(targetModel.getData(), targetModelXPath).text = level;

    var value = targetModel.getData().selectSingleNode(multiSelectTargetXpath + "/f:And" + (bRefs != "" ? "[" + bRefs + "]" : ""));
    if ( value ){
      var parent = targetModel.getData().selectSingleNode(multiSelectEditXpath);
      if ( ! parent ){
        parent = bcdui.core.createElementWithPrototype(targetModel.getData(),multiSelectEditXpath);
      }
      else{
        for (var i = parent.childNodes.length - 1; i >= 0; i--) {
          if ( parent.childNodes[i].getAttribute('id') === dimChooserId){
            parent.removeChild(parent.childNodes[i]);
          }
        }
      }
      parent.appendChild(value.cloneNode(true));
    }
  },

  /**
   * Copy preselected filter elements to target model filters
   * @private
   */
  _copyTargetElements: function(/* DataProvider */ targetModel, /* String */ targetModelXPath, /* Array */ values, numberOfExpressionsPerValue, replace, dimChooserId, dimensionName, exclude, targetModelXPathExclude) {

    // switch target in case of exclude mode
    if (exclude)
      targetModelXPath = targetModelXPathExclude;

    // mark this as an internal filter change
    jQuery("#" + dimChooserId).data("internal", true);

    // take pseudo attribute bcdRedisplay and increase it by one
    var p = targetModel.getData().selectSingleNode(targetModelXPath);
    var r = p != null ? p.getAttribute("bcdRedisplay") : null;
    r = r == null || isNaN(parseInt(r, 10)) ? 0 : parseInt(r, 10) + 1;

    if (replace)
      bcdui.core.removeXPath(targetModel.getData(), targetModelXPath, false, true );
    var parent = targetModel.getData().selectSingleNode(targetModelXPath);
    if (! parent)
      parent = bcdui.core.createElementWithPrototype(targetModel.getData(),targetModelXPath);

    // we only really add it when all values are available 
    if (values.length > 0 && values[0].childNodes.length  == numberOfExpressionsPerValue) {
      jQuery.each(values, function(i, e){
        // add selection only once (by removing a possibly existing identical one first)
        var xpath = bcdui.widget.dimensionChooser._removalXpath(e, dimChooserId, dimensionName, exclude);
        if (xpath != "") {
          var nodes = targetModel.queryNodes(xpath);
          // only remove candidates which have the same number of children
          // needed for mixedMode since you might remove entries via e.g. a country selection
          // while they do have station of facility elements, too
          for (var n = 0; n < nodes.length; n++) {
            var childs = nodes[n].selectNodes("f:Expression[@value]").length;
            if (childs == numberOfExpressionsPerValue)
              bcdui.core.removeXPath(nodes[n], ".", false, true);
          }
        }
        e.removeAttribute("bcdDimension");
        parent.appendChild(e.cloneNode(true));
      });
    }

    // in case of exclude mode, we switch And/Or nodes of written filter and change op to !=
    if (exclude) {
      var andNodes = targetModel.queryNodes(targetModelXPath + "/f:And");
      for (var a = 0; a < andNodes.length; a++) {
        var exp = andNodes[a].selectNodes("./f:Expression");
        for (var e = 0; e < exp.length; e++) {
          var bRef = bcdui.util.escapeHtml(exp[e].getAttribute("bRef"));
          var value = bcdui.util.escapeHtml(exp[e].getAttribute("value"));
          var caption = exp[e].getAttribute("caption") != null ? bcdui.util.escapeHtml(exp[e].getAttribute("caption")) : null;
          var path = "@op='!='" + (bRef ? " and @bRef='" + bRef + "'" : "") + (value ? " and @value='" + value + "'" : "") + (caption ? " and @caption='" + caption + "'" : "");
          bcdui.core.createElementWithPrototype(targetModel, targetModelXPath + "/f:Or[@bcdCount='" + a + "']/f:Expression[" + path + "]");

          // for an exlude we need to include nulls
          var pathNull = "@op='='" + (bRef ? " and @bRef='" + bRef + "'" : "");
          bcdui.core.createElementWithPrototype(targetModel, targetModelXPath + "/f:Or[@bcdCount='" + a + "']/f:Expression[" + pathNull + "]");
        }
      }
      bcdui.core.removeXPath(targetModel, targetModelXPath + "/f:And");
      var cleanupNodes = targetModel.queryNodes(targetModelXPath + "/f:Or[@bcdCount]");
      jQuery.makeArray(cleanupNodes).forEach(function(e){e.removeAttribute("bcdCount");});
    }

    // ensure that we do trigger an event by setting the new value of bcdRedisplay
    parent.setAttribute("bcdRedisplay", "" + r);
    targetModel.fire();
  },

  /**
   * 
   * @private
   */
  _removalXpath: function( element, chooserId, dimensionName, exclude ){
    var xpath ="";
    var index = 0;
    var childNodes = element.selectNodes("./f:Expression[@value]");
    jQuery.each(childNodes, function(index, e) {
      if (index == 0)
        xpath = xpath + (exclude ? "/*/f:Filter/f:And[@bcdDimension='" + dimensionName +"_exclude']/f:Or[" : "/*/f:Filter/f:Or[@bcdDimension='" + dimensionName +"']/f:And[");

      var value = bcdui.util.escapeHtml(e.getAttribute('value'));

      xpath = xpath + "./" + e.nodeName + "[@bRef='" + e.getAttribute("bRef") + "' and @op='" + (exclude ? "!=" : "=") +"' and @value='" + value + "']" ;
      
      // for exlude also include null filters 
      if (exclude)
        xpath = xpath + " and ./" + e.nodeName + "[@bRef='" + e.getAttribute("bRef") + "' and @op='=']" ;

      if (index < childNodes.length - 1)
        xpath = xpath + " and ";

      return xpath;

    }, xpath);
    if (xpath != "")
      xpath = xpath + "]";
    return xpath;
  },

  /**
   * returns the Level element from dimension Model for a given dimensionModelId, dimensionName, level name
   * @private
   */
  _getDimensionLevel: function(dimName, name){
    return bcdui.wkModels.bcdDimensions.query("/dm:Dimensions/dm:Dimension[@id='"+dimName+"']/*/dm:Level[@id='"+name+"']");
  },


  /**
   * remove html elements(input fields, level captions, and table rows) and remove input model of dimension level that aren't required by new selected level
   * @private
   */
  _removeObsoleteChooser: function(dimChooserName, requiredChooserList, dimChooserId, targetModelId, noRefresh, dimensionName){

    var targetModel = bcdui.factory.objectRegistry.getObject(targetModelId);

    // Cleanup all object that aren't required any more.
    // remove all dc_bcdRenderer_  and unregister corresponding autoModels and autoModelsReq dataprovider
    var LevelIds = new Array(); // collect only the level ids for cleanup lookup
    requiredChooserList.reduce( function(list, e){list.push( e.getAttribute('id')); return list;}, LevelIds );

    // cleanup multiSelectEditXpath in case of a dim change
    // this removes all not needed levels which is a must have for mixed mode handling
    var multiSelectEditXpath = "/*/guiStatus:ClientSettings/guiStatus:MultiSelect[@bcdDimension= '"+ dimensionName +"']/f:Filter/f:And";
    var setFilters = targetModel.getData().selectNodes(multiSelectEditXpath + "/f:Expression");

    for (var s = 0; s < setFilters.length; s++) {
      var setAtt = setFilters[s].getAttribute("bRef");
      var valid = false;
      for (var r = 0; r < requiredChooserList.length; r++)
        valid |= (setAtt == requiredChooserList[r].getAttribute("bRef"));
      if (! valid)
        bcdui.core.removeXPath(targetModel.getData(), multiSelectEditXpath + "/f:Expression[@bRef='" + setAtt + "']");
    }

    // also remove f:And node for a full cleanup if we removed all filters
    if (targetModel.queryNodes(multiSelectEditXpath + "/f:Expression").length == 0) {
      bcdui.core.removeXPath(targetModel.getData(), multiSelectEditXpath);
    }

    jQuery("#" + dimChooserName).find("div").each( function (i, e){
      if ( e.nodeName.toUpperCase() == 'DIV' && e.getAttribute('id') && e.getAttribute('id').indexOf(dimChooserId+'_bcdRenderer_') == 0 ){
        var id = e.getAttribute('id').substring( (dimChooserId+'_bcdRenderer_').length);
        if ( LevelIds.indexOf( id )===-1 ){
          var tr = e.parentNode.parentNode;
          e.parentNode.removeChild(e);
          //remove the tr element from table including the caption
          tr.parentNode.removeChild(tr);
        }
      }
    });

    // in case we don't want to modify the manifested filers (e.g. coming from external filter writing events), we exit here 
    if (noRefresh)
      return;

    // in case of a non multi mode we need to possibly clean up the already manifested filters
    // a simple targetModel.fire() is not enough since you might not change the target filters
    // (e.g. when going from a country to country/station selection, no nodes were removed)
    var multiExpandXpath ="/*/guiStatus:ExpandMulti[@bcdDimension='"+ dimensionName + "']";
    var expand = targetModel.getData().selectSingleNode(multiExpandXpath +"/@value");
    expand = (expand == null ? false : expand.text == "true");
    if (! expand)
      bcdui.widget.dimensionChooser._addMultiSelect(dimChooserId + '_multiSelectBox', true, false);
  },

  /**
   * traverses the dependencies in dimensionModel and add all required parents to a list.
   * The List is order top down, so the the selected level is always the last element of the list.
   * @private
   */

  _createLevelLists: function( Levels , level, dimensionName ){
    if (level ){
      var selectedLevel = bcdui.widget.dimensionChooser._getDimensionLevel(dimensionName, level.nodeValue);
      var requiredLevel = selectedLevel.getAttribute("unique") == "false" ? selectedLevel.selectSingleNode("preceding-sibling::*[1]/@id") : null;
      Levels.push(selectedLevel);
      // estimate all required levels by following the unique=false attributes from selected level upwards
      while ( selectedLevel  && requiredLevel ){
        selectedLevel = bcdui.widget.dimensionChooser._getDimensionLevel(dimensionName, requiredLevel.nodeValue);
        if ( selectedLevel){
          Levels.push( selectedLevel);
          requiredLevel = selectedLevel.getAttribute("unique") == "false" ? selectedLevel.selectSingleNode("preceding-sibling::*[1]/@id") : null;
        }else {
          throw new Error("Required Level not found :" + requiredLevel.nodeValue);
        }
      }
      Levels.reverse(); // reverse the list for item generation top-down
    }
  },

  /**
   * _createDimensionChooser: creates the html elements ,inputField, autoModel for all required level, that aren't available already
   *
   * @TODO: review creation of multiselect chooser without binding set and autmodell
   * @TODO: review additionalFilterXPath concat with | in case of a real hierarchy
   * @private
   */
  _createDimensionChooser: function( LevelList, dimChooserId , config ){
    var dimensionNode = bcdui.wkModels.bcdDimensions.query("/dm:Dimensions/dm:Dimension[@id='"+config.dimensionName+"']");
    LevelList.reduce( function(bRefs, e, index){
      var optionsModelXpath;
      var id =  e.getAttribute('id');

      var bindingSetIdNode = e.selectSingleNode("../@bindingSet");
      var bindingSetId = (bindingSetIdNode ? bindingSetIdNode.nodeValue : null);

      var levelConfiguration = null;
      var filterCondition    = null;
      if (config.configurationModelId ){
        filterCondition = bcdui.factory.objectRegistry.getObject(config.configurationModelId).getData().selectSingleNode("rnd:Configuration/rnd:Level[@id='"+id+"']/rnd:FilterCondition");
        levelConfiguration = bcdui.factory.objectRegistry.getObject(config.configurationModelId).getData().selectSingleNode("rnd:Configuration/rnd:Level[@id='"+id+"']");
      }

      var autoModel = dimChooserId+'_'+id+'Model';

      // Here we calculate the params for the automodel
      // Even if it already exists (and there is no need to re-create it) we need most of the args for the re-created inputfield
      var autoModelArgs = {
        id: autoModel,
        bindingSetId: bindingSetId,
        isDistinct: true,
        isAutoRefresh: true,
        useCaptions: config.useCaptions,
        url: config.url,
        statusModel: bcdui.factory.objectRegistry.getObject(config.targetModelId) // use the model where we write our filters (i.e. server sided optionModels, additionalFilterXPath) to as statusModel
      };

      var optionsModelPrefix = "$" + autoModel +"/*/wrs:Data/";

      // some of the variables are required in automodel creation and input creation,
      var required = e.getAttribute("unique") == "false" ? e.selectSingleNode("preceding-sibling::*[1]/@id") : null;
      var listOfbRefs ='';
      if (required ){
        var requiredBRef = LevelList.find( function(level){return level.getAttribute('id') === required.nodeValue ; });
        listOfbRefs =  requiredBRef.getAttribute('bRef') + ' ' + e.getAttribute('bRef');
        autoModelArgs.bRefs = listOfbRefs;
        autoModelArgs.mandatoryfilterBRefsSubset = requiredBRef.getAttribute('bRef');
        var xpath = "$"+config.targetModelId+ "/*/guiStatus:ClientSettings/guiStatus:MultiSelect[@bcdDimension='"+ config.dimensionName +"']/f:Filter/f:And/f:Expression" ;
        autoModelArgs.additionalFilterXPath =  bcdui.widget.dimensionChooser._bRefToXPath(xpath, bRefs);

        optionsModelXpath = "wrs:R/wrs:C[position() = '2' and ../wrs:C[1] = $"+config.targetModelId+"/*/"
          + "guiStatus:ClientSettings/guiStatus:MultiSelect[@bcdDimension='"+config.dimensionName+"']/" + "f:Filter"
          + "/f:And"
          + "/f:Expression[@bRef = '"+requiredBRef.getAttribute('bRef')+"' and @op = '=']/@value ";
      }else{
        optionsModelXpath = "wrs:R/wrs:C[position() = '1' ";
        autoModelArgs.bRefs = e.getAttribute('bRef');
      }

      // complete the optionsModelXPath with optional configuration and close the bracket
      if ( filterCondition != null && filterCondition.text != null ) {
        optionsModelXpath += ' and ' + filterCondition.text ;
      }
      optionsModelXpath += ' ]';

      optionsModelXpath = optionsModelPrefix + optionsModelXpath;

      // if we dont have a bindingset, we dont want an options model in inputfield and we dont want an automodel neither
      if (!bindingSetId){
        optionsModelXpath = null;
      } else {

        if (bindingSetId && config.useCaptions === 'true'){
          optionsModelXpath += '/@caption';
        }

        // add own bRef here, because we need only the parents for filter above.
        bRefs.push(e.getAttribute('bRef'));

        // append optional additional attributes to bRefs from dimChooserConfig
        if (levelConfiguration){
          var additionalbRefs = levelConfiguration.getAttribute("bRefs");
          if (additionalbRefs && additionalbRefs != ''){
            autoModelArgs.bRefs = autoModelArgs.bRefs + " " + additionalbRefs;
          }
          var additionalfilterBrefs = levelConfiguration.getAttribute("filterBRefs");
          if (additionalfilterBrefs && additionalfilterBrefs != ''){
            autoModelArgs.filterBRefs = ( autoModelArgs.filterBRefs ? autoModelArgs.filterBRefs + " " : "" )  + additionalfilterBrefs;
          }

          var mandatoryfilterBRefsSubset = levelConfiguration.getAttribute("mandatoryfilterBRefsSubset");
          if (mandatoryfilterBRefsSubset && mandatoryfilterBRefsSubset != ''){
            autoModelArgs.mandatoryfilterBRefsSubset = mandatoryfilterBRefsSubset;
          }
          if( levelConfiguration.getAttribute("serverSideOptionsModelFilter")=="true" ) {
            // in this case we also add our bRef to set of filterBRefs to initially filter options model by provided value
            autoModelArgs.initialFilterBRefs = ( autoModelArgs.initialFilterBRefs ? autoModelArgs.initialFilterBRefs + " " : "" ) + e.getAttribute('bRef');
            // handle Required
            if(required){
              var requiredBRef = dimensionNode.selectSingleNode("./*/dm:Level[@id = '"+required.text+"']/@bRef").text;
              autoModelArgs.additionalPassiveFilterXPath = "$" + config.targetModelId + "/*/guiStatus:ClientSettings/guiStatus:MultiSelect[@bcdDimension = '"+config.dimensionName+"']/f:Filter/f:And/f:Expression[@bRef='"+requiredBRef+"']";
            }
            autoModelArgs.additionalFilterXPath = "$" + config.targetModelId + "/*/guiStatus:ClientSettings/rnd:InputFieldTemp/f:Expression[@bcdAmId='"+autoModel+"']";
            autoModelArgs.maxRows = bcdui.widget.dimensionChooser.ServerSideOptionsModelFilterMaxRows;
          }
          if (levelConfiguration.getAttribute("orderByBRefs") != null) {
            autoModelArgs.orderByBRefs = levelConfiguration.getAttribute("orderByBRefs");
          }
          var additionalFilterXPath =levelConfiguration.getAttribute("additionalFilterXPath");
          if (additionalFilterXPath){
            autoModelArgs.additionalFilterXPath = (! autoModelArgs.additionalFilterXPath ? '' : autoModelArgs.additionalFilterXPath +"|")  + additionalFilterXPath;
          }
        }
        //create automodel. Only once and keep it, even if the level is switched, because it may be switched back again
        if ( ! bcdui.factory.objectRegistry.getObject(autoModel) )
          bcdui.factory.createAutoModel( autoModelArgs );
      }



      if ( ! jQuery("#" + dimChooserId+'_bcdRenderer_'+id).length > 0 ){
        // Create Div as child of DimChooserBox
        var divId = dimChooserId+'_bcdRenderer_'+id;
        var table = jQuery("#" + dimChooserId).find("tbody").first();
        var row   =  document.createElement('tr');
        row.setAttribute('className', 'bcdChooserCaption');
        row.setAttribute('class', 'bcdChooserCaption');
        table.append(row);

        var parentCell =  document.createElement('td');
        row.appendChild(parentCell);

        var label = document.createElement('div');
        label.setAttribute('className', 'bcdChooserCaption');
        label.setAttribute('class', 'bcdChooserCaption');
        label.setAttribute('level',id);
        if( bcdui.factory.objectRegistry.getObject(config.targetModelId).getData().selectSingleNode( config.targetModelXPath).length > 1 ) {
          label.text = id;
        } else
          label.appendChild(document.createTextNode(String.fromCharCode(160)));
        parentCell.appendChild(label);

        var newdiv = document.createElement('div');
        newdiv.setAttribute('id',divId);
        newdiv.setAttribute("bcdTargetModelId", config.targetModelId );
        parentCell.appendChild(newdiv);

        var inputArgs = {
          id: dimChooserId+'_'+id+'Input',
          targetHTMLElementId: divId,
          keepEmptyValueExpression: false,
          clearOption: config.clearOption,
          emptyValue: config.emptyValue,
          mandatory: true,
          onEnterKey: ""
        };

        if (config.mandatory === 'false')
          inputArgs.mandatory = false;

        if ( optionsModelXpath && config.useCaptions === 'true'){
          inputArgs.optionsModelRelativeValueXPath = "..";
        }
        if ( optionsModelXpath){
          inputArgs.optionsModelXPath = optionsModelXpath;
        }
        var wildcard = (levelConfiguration && levelConfiguration.getAttribute("wildcard")) ? levelConfiguration.getAttribute("wildcard") : "";
        var hideWildcardChar = (levelConfiguration && levelConfiguration.getAttribute("hideWildcardChar")) ? levelConfiguration.getAttribute("hideWildcardChar") : ""; 
        var op = (levelConfiguration && levelConfiguration.getAttribute("op")) ? levelConfiguration.getAttribute("op") : "=";
        var ic = (levelConfiguration && levelConfiguration.getAttribute("ic")=="true" ) ? " and @ic='true' " : "";
        var targetModelXpath = "/*/guiStatus:ClientSettings/guiStatus:MultiSelect[@bcdDimension='"+config.dimensionName+"']/f:Filter/f:And/f:Expression[@bRef='"+e.getAttribute('bRef') +"' and @op='"+op+"' "+ic+"]/@value";
        newdiv.setAttribute("bcdTargetModelXPath",targetModelXpath);

        if (wildcard != "") {inputArgs.wildcard = wildcard;}
        if (hideWildcardChar != ""){inputArgs.hideWildcardChar = (hideWildcardChar == "true");}

        inputArgs.targetModelXPath = "$" + config.targetModelId + targetModelXpath;

        if(  levelConfiguration && levelConfiguration.getAttribute("optionsModelIsSuggestionOnly")=="true" ) {
          inputArgs.optionsModelIsSuggestionOnly = "true";
        }
        if(  levelConfiguration && levelConfiguration.getAttribute("serverSideOptionsModelFilter")=="true" ) {
          inputArgs.additionalFilterXPath = "$" + config.targetModelId + "/*/guiStatus:ClientSettings/rnd:InputFieldTemp/f:Expression[@bcdAmId='"+autoModel+"' and @op='like' and @bRef='"+e.getAttribute('bRef') +"' and @ic='true']/@value";
          inputArgs.wildcard = inputArgs.wildcard || "contains";
        }

        bcdui.widget.createInputField(inputArgs);
      }

      if(config.multiSelect === "check"){
        // apply the @suppressMultiSelection logic which hides/displays the multi-check option
        // in case the level does not support multi-selection
        if(e.getAttribute("suppressMultiSelection") == "true"){
          bcdui.widget.dimensionChooser._hideMultiSelectControl(dimChooserId);
        }else{
          bcdui.widget.dimensionChooser._displayMultiSelectControl(dimChooserId);
        }
      }
      return bRefs;
    }, []);
  },
  
  /**
   * 
   * @private
   */
  _toggleMulti: function (htmlElement) {
    var dimChooser = jQuery(htmlElement).closest("[bcddimension]");
    var config = dimChooser.data("config");
    var id = dimChooser.attr("id");
    if (! jQuery(htmlElement).prop("checked")) {
      // out of sight out of mind, so remove multi selects before hiding the chooser
      var doFire = false;
      if (bcdui.factory.objectRegistry.getObject(config.targetModelId).getData().selectSingleNode(config.multiSelectTargetXpath) != null) {
        dimChooser.data("internal", true);
        bcdui.core.removeXPath(bcdui.factory.objectRegistry.getObject(config.targetModelId).getData(), config.multiSelectTargetXpath);
        doFire = true;
      }
      if (bcdui.factory.objectRegistry.getObject(config.targetModelId).getData().selectSingleNode(config.multiSelectTargetXpathExclude) != null) {
        dimChooser.data("internal", true);
        bcdui.core.removeXPath(bcdui.factory.objectRegistry.getObject(config.targetModelId).getData(), config.multiSelectTargetXpathExclude);
        doFire = true;
      }
      if (doFire)
        bcdui.factory.objectRegistry.getObject(config.targetModelId).fire();

      bcdui.widget.dimensionChooser._hideMultiSelectArea(id);
    }
    else
      bcdui.widget.dimensionChooser._showMultiSelectArea(id);
    // either add single to multi select or clear out selection
    bcdui.widget.dimensionChooser._addMultiSelect(id + '_multiSelectBox', true, false);
  },

  /**
   * 
   * @private
   */
  _checkLevelLock : function(dimChooserId, targetModel, multiSelectTargetXpath) {
    // in case of a non allowed mixed mode (and available filters), we disable the level selector (defered)
    if (targetModel.getData().selectNodes(multiSelectTargetXpath + "/f:And").length > 0) {
      var allowMixedSelect = jQuery("#" + dimChooserId).closest("[bcddimension]").attr("bcdAllowMixedSelect");
      if (allowMixedSelect === "false") {
        setTimeout(bcdui.widget.inputField._disableInputField.bind(this, dimChooserId + "_level"));
        return;
      }
    }
    // or reenable if needed
    if (jQuery("#" + dimChooserId + "_levelContainer input").first().prop("disabled"))
      setTimeout(bcdui.widget.inputField._enableInputField.bind(this, dimChooserId + "_level"));
  },

  /**
   * 
   * @private
   */
  _showMultiSelectArea : function(dimChooserId) {
    var config = jQuery("#" + dimChooserId).data("config");
    var targetModel = bcdui.factory.objectRegistry.getObject(config.targetModelId);

    // disable level selector if needed
    bcdui.widget.dimensionChooser._checkLevelLock(dimChooserId, targetModel, config.multiSelectTargetXpath)

    // show the hidden trs and check the checkbox
    jQuery("#" + dimChooserId + '_multiSelectBox').closest("TR").show();
    jQuery("#" + dimChooserId + '_addButton' + '_cell').closest("TR").show();
    jQuery("#" + dimChooserId + " input[type='checkbox']").prop("checked", true);

    // remember state
    var node = targetModel.getData().selectSingleNode(config.multiExpandXpath+"/@value");
    if (node == null)
      node = bcdui.core.createElementWithPrototype(targetModel.getData(), config.multiExpandXpath+"/@value");
    node.text = "true";
  },

  /**
   * 
   * @private
   */
  _hideMultiSelectArea : function(dimChooserId) {
    // enable the level selector in any case (defered)
    setTimeout(bcdui.widget.inputField._enableInputField.bind(this, dimChooserId + "_level"));
    
    // hide trs and uncheck the checkbox
    jQuery("#" + dimChooserId + '_multiSelectBox').closest("TR").hide();
    jQuery("#" + dimChooserId + '_addButton' + '_cell').closest("TR").hide();
    jQuery("#" + dimChooserId + " input[type='checkbox']").prop("checked", false);

    // remember state
    var config = jQuery("#" + dimChooserId).data("config");
    var node = bcdui.factory.objectRegistry.getObject(config.targetModelId).getData().selectSingleNode(config.multiExpandXpath+"/@value");
    if (node == null)
      node = bcdui.core.createElementWithPrototype(bcdui.factory.objectRegistry.getObject(config.targetModelId).getData(), config.multiExpandXpath+"/@value");
    node.text = "false";
  },
  /**
   * displays the multi-select control checkbox
   * @private
   */
  _displayMultiSelectControl : function(dimChooserId){
    jQuery("#" + dimChooserId + "_expandMulti").show();
  },

  /**
   * hides the multi-select control checkbox, preserve space
   * @private
   */
  _hideMultiSelectControl : function(dimChooserId){
    jQuery("#" + dimChooserId + "_expandMulti").hide();
  },

  /**
   *  Set default parameters
   * @param HTMLElement  htmlElement The element the input field is based on.
   * @private
   */
  _adjustDefaultParameters: function(HTMLElement){
    if(HTMLElement.getAttribute("bcdMultiSelect")==""||!HTMLElement.getAttribute("bcdMultiSelect")){
        HTMLElement.setAttribute("bcdMultiSelect","false");
    }
    if(HTMLElement.getAttribute("bcdAllowMixedSelect")==""||!HTMLElement.getAttribute("bcdAllowMixedSelect")){
        HTMLElement.setAttribute("bcdAllowMixedSelect","false");
    }
    if(HTMLElement.getAttribute("bcdUseCaptions")==""||!HTMLElement.getAttribute("bcdUseCaptions")){
      HTMLElement.setAttribute("bcdUseCaptions","false");
    }
  },

  /**
   * _bRefToXPath: is a utility that appends an attribute to the given xpath from list of bRefs.
   * bRefs = [ a, b, c]
   * xpath = /path
   * => /path[ @bRef ='a' or @bRef = 'b' or @bRef ='c']
   * @private
  */
  _bRefToXPath: function( xpath, bRefs) {
    for(var i = 0; i < bRefs.length; i++){
      if (i == 0 ) { xpath = xpath  +'['}
      if (i > 0 ){ xpath =  xpath + " or "; }
      xpath = xpath + " @bRef = '" + bRefs[i] + "'";
    }
    if (bRefs.length > 0 ) {  xpath = xpath + " ]";}
    return xpath;
  },

  // Max rows loaded from server when an input field is backed by a serverside filtered options model
  ServerSideOptionsModelFilterMaxRows: 50,
  
  /**
   * try to guess the used level from the current filter settings
   * @private
  */
  _guessLevel: function(targetModel, multiSelectTargetXpath, levelStorage) {
    // try to guess level out of filter data by taking the first filter group and matching it against the dimension model
    var foundLevel = "";
    var filterNodes = targetModel.getData().selectNodes(multiSelectTargetXpath + "/f:And[1]/f:Expression");
    var l1 = jQuery(filterNodes).map(function() {return this.getAttribute("bRef")}).sort();
    for (var l in levelStorage) {
      var l2 = jQuery(levelStorage[l]).map(function() {return this.getAttribute("bRef")}).sort();
      if (l1.length == l2.length) {
        var allOk = true;
        for (var b = 0; b < l1.length; b++)
          allOk &= (l1[b] == l2[b]);
        if (allOk) {
          foundLevel = l;
          break;
        }
      }
    }
    return foundLevel;
  },

  /**
   * @param {string} id targetHtml of widget
   * @param {function} callback to be called with generated caption
   * @return {string} NavPath information via callback for widget
   */
  getNavPath: function(id, callback) {
    if (id && id != "") {
      var e = jQuery("#" + id + " div[bcdTargetModelXPath]").first().get(0);
      if (e) {
        var targetModelId = e.getAttribute("bcdTargetModelId");
        var targetXPath = e.getAttribute("bcdTargetModelXPath");
        if (targetXPath && targetXPath.indexOf("$") != -1) {
          var t = bcdui.factory._extractXPathAndModelId(targetXPath);
          targetModelId = t.modelId;
          targetXPath = t.xPath;
        }
        var dimension = e.getAttribute("bcdDimension") ||  "";

        if (targetModelId != null && targetXPath != null) {
          bcdui.factory.objectRegistry.withReadyObjects(targetModelId, function() {
            var captionArray = ["", ""];

            for (var x = 0; x < 2; x++) {

              var targetNodes = x == 0
               ? bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectNodes("/*/f:Filter/f:Or[@bcdDimension='" + dimension + "']/f:And")
               : bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectNodes("/*/f:Filter/f:And[@bcdDimension='" + dimension + "_exclude']/f:Or");
  
              for (var t = 0; t < targetNodes.length; t++) {
                if (t > 3) {
                  captionArray[x] += ((captionArray[x] == "" ? "..." : ",..."));
                  break;
                }
                var targetNode = targetNodes[t];
  
                var filters = targetNode.selectNodes("f:Expression[@value]");
                var subCaption = ""; 
                for (var f = 0; f < filters.length; f++) {
                  var caption = filters[f].getAttribute("caption") || filters[f].getAttribute("value");
                  if (caption != null) {
                    subCaption += (subCaption == "" ? caption : ("|" + caption));
                  }
                }
                captionArray[x] += (captionArray[x] == "" ? subCaption : ("," + subCaption));
              }
            }

            captionArray[0] = captionArray[0] != "" && captionArray[1] != "" ? "[+] " + captionArray[0] : captionArray[0];
            captionArray[1] = captionArray[1] != ""                          ? "[-] " + captionArray[1] : captionArray[1];

            var finalCaption = captionArray[0] + (captionArray[1] != "" ? " " : "") + captionArray[1];

            callback(id, finalCaption);
          });
          return;
        }
      }
    }
    callback(id, "");
  }

  /**
   * checks if container html still exists, if not, listeners, filters and client area is cleaned
   * @param {object} config the dimchooser config object
   * @returns boolean true when chooser is not existing anymore
   * @private
   */
  , _cleanupListener: function(config) {
    if (jQuery("#" + config.elementId).length == 0) {
      if (config.targetModelId) {
        var targetModel = bcdui.factory.objectRegistry.getObject(config.targetModelId);
        if (targetModel) {
          targetModel.removeDataListener(config.elementId + "_listenerTargetModelXPath");
          targetModel.removeDataListener(config.elementId + "_listenerMultiSelectTargetXpath");
          targetModel.removeDataListener(config.elementId + "_listenerCopySelection");
        }
      }
      return true;
    }
    return false;
  },
  
  /**
   * looks for not complete filter bRefs for dimension and tries to build up a valid filter area when filters are found
   * @param {object} targetModel the dimchooser target model
   * @param {object} config the dimchooser config object
   * @private
   */
  _cleanFilters: function(config) {
    
    // collect unique list of existing bRefs for current dimension
    var possibleBrefs = jQuery.makeArray(bcdui.wkModels.bcdDimensions.queryNodes("/dm:Dimensions/dm:Dimension[@id='" + config.dimensionName + "']/*/dm:Level/@bRef")).map(function(e){return e.text;});
    possibleBrefs = possibleBrefs.filter(function(e, i) {return i == possibleBrefs.indexOf(e)});

    // enrich information with unique and required level information
    possibleBrefs = possibleBrefs.map(
      function(e){
        var level = bcdui.wkModels.bcdDimensions.query("/dm:Dimensions/dm:Dimension[@id='" + config.dimensionName + "']/*/dm:Level[@bRef='" + e + "']");
        var isUnique = level.getAttribute("unique");
        isUnique = isUnique == null || isUnique.text == "true"; 
        var Levels = new Array();
        if (! isUnique) {
          var selectedLevel = level.selectSingleNode("preceding-sibling::*[1]");
          Levels.push(selectedLevel.getAttribute("bRef"));
          var requiredLevel = selectedLevel.getAttribute("unique") == "false" ? selectedLevel.selectSingleNode("preceding-sibling::*[1]") : null;
          while (requiredLevel != null) {
            selectedLevel = requiredLevel;
            Levels.push(selectedLevel.getAttribute("bRef"));
            requiredLevel = selectedLevel.getAttribute("unique") == "false" ? selectedLevel.selectSingleNode("preceding-sibling::*[1]") : null;
          }
          Levels.reverse();
        }
        return {unique: isUnique, bRef: e, requires: Levels};
      }
    );

    var targetModel = bcdui.factory.objectRegistry.getObject(config.targetModelId);

    possibleBrefs.forEach(function(e) {

      jQuery.makeArray(targetModel.queryNodes("/*/f:Filter//f:Expression[@bRef='" + e.bRef + "']")).forEach(function(n) {

        // don't check filters which are in a dimchooser structure (inc./exl.) or a cube exclude
        if (n.selectSingleNode("./ancestor::*[@bcdDimension]") == null
            && n.selectSingleNode("./ancestor::*[@exclBRef]") == null
        ) {
          // remove filter which are not unique and the required levels are missing
          if (!e.unique) {
            var count = 0;
            e.requires.forEach(function(r){ count += (targetModel.query("/*/f:Filter//f:Expression[@bRef='" + r + "']") != null) ? 1 : 0; });
            if (count < e.requires.length)
              bcdui.core.removeXPath(targetModel.getData(), "/*/f:Filter//f:Expression[@bRef='" + e.bRef + "']");
          }
  
          // check what to do with free floating filters
          var doAddNode = true;

          // we don't have a dimchooser outer node, so create it and add the free float
          var root = targetModel.query("/*/f:Filter/f:Or[@bcdDimension='" + config.dimensionName + "']/f:And");
          if (root == null)
            root = bcdui.core.createElementWithPrototype(targetModel.getData(), "/*/f:Filter/f:Or[@bcdDimension='" + config.dimensionName + "']/f:And");
          // multiselect dimchooser? Then we can't really decide where to put it, so skip it
          else if (targetModel.queryNodes("/*/f:Filter/f:Or[@bcdDimension='" + config.dimensionName + "']/f:And").length > 1)
            doAddNode = false;
          // node already exists within a dimchooser outer node? Then overwrite value there with the floating one
          else if (targetModel.query("/*/f:Filter/f:Or[@bcdDimension='" + config.dimensionName + "']/f:And/f:Expression[@bRef='" + e.bRef + "']") != null) {
            var found = targetModel.query("/*/f:Filter/f:Or[@bcdDimension='" + config.dimensionName + "']/f:And/f:Expression[@bRef='" + e.bRef + "']");
            if (n.getAttribute("value") != null) found.setAttribute("value", n.getAttribute("value")); else found.removeAttribute("value");
            if (n.getAttribute("caption") != null) found.setAttribute("caption", n.getAttribute("caption")); else found.removeAttribute("caption");
            if (n.getAttribute("op") != null) found.setAttribute("op", n.getAttribute("op")); else found.removeAttribute("op");
            doAddNode = false;
          }
          // we want to add it an existing node, so remove all filters in there which don't belong to the current bRef+required levels
          else {
            jQuery.makeArray(targetModel.queryNodes("/*/f:Filter/f:Or[@bcdDimension='" + config.dimensionName + "']/f:And/f:Expression")).forEach(function(f) {
              var foundBRef = f.getAttribute("bRef") || "";
              if (foundBRef != e.bRef && e.requires.indexOf(foundBRef) == -1)
                f.setAttribute("bcdFloat", "true"); // mark it, so it gets removed
            });
          }
          if (doAddNode)
            root.appendChild(n.cloneNode(true));

          // mark free floating filter
          n.setAttribute("bcdFloat", "true");
        }
      });        
    });

    // remove all free floating filters
    bcdui.core.removeXPath(targetModel.getData(), "//f:Expression[@bcdFloat='true']");
  }
}); // namespace

