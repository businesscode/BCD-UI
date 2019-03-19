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
 * @namespace bcdui.component.cube.configuratorDND
 */
bcdui.util.namespace("bcdui.component.cube.configuratorDND",
/** @lends bcdui.component.cube.configuratorDND */
{
  /**
   * @private
   */
  _CUBE_TEMP : {
      xPathRootWidget : "/*/WidgetTarget"
    , xPathRootLayout : "/*/TempLayout"
  },

  init : function(args) {

    // let's create our bucket model to hold the dnd master data
    var cubeBucketModelId = args.cubeId + "_bcd_dnd" + "_cube_bucket";

    // at least create the root node for clientRefresh Handling
    bcdui.core.createElementWithPrototype( bcdui.wkModels.guiStatus, "/*/guiStatus:ClientSettings/cube:ClientLayout[@cubeId ='"+ args.cubeId+"']" );
    
    bcdui.factory.createStaticModel({
      id: cubeBucketModelId,
      data: '<Root xmlns="http://www.businesscode.de/schema/bcdui/cube-2.0.0" xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0" xmlns:cube="http://www.businesscode.de/schema/bcdui/cube-2.0.0" xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0" xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0" xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0" xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0" xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"></Root>'
    });
    bcdui.factory.objectRegistry.getObject(cubeBucketModelId).execute(); // we're static, we're synchron...

    bcdui.component.cube.configuratorDND.fillBucketModel(cubeBucketModelId, args.metaDataModelId);

    // remember bucket and targetModelId for refresh function
    jQuery("#" + args.targetHtml).addClass("bcd_"+ args.cubeId + "_dnd");
    jQuery("#" + args.targetHtml).attr("bcdCubeId", args.cubeId).attr("contextId", "cubeDnd");
    jQuery(".bcd_" + args.cubeId + "_dnd").data("targetModelId", args.targetModelId);
    jQuery(".bcd_" + args.cubeId + "_dnd").data("cubeBucketModelId", cubeBucketModelId);

    // initially transform cube layout into in-between-model for connectables
    bcdui.component.cube.configuratorDND._cubeLayoutToControlModel(args.cubeId);

    // and initialize controls
    var cubeTargetId = cubeBucketModelId;
    var cubeTargetXPathRoot = bcdui.component.cube.configuratorDND._CUBE_TEMP.xPathRootWidget;

    var inputArgs = {
      optionsModelXPath: "$" + cubeBucketModelId + "/*/cube:Dimensions/dm:LevelRef/@caption"
    , optionsModelRelativeValueXPath: "../@bRef"
    , targetHtml: "#" + args.targetHtml + " .bcdDimensionList"
    , scope: args.cubeId + "_dims"
    , unselectAfterMove: true
    , extendedConfig: {noTooltip: true }
    };
    bcdui.widgetNg.createConnectable(inputArgs);
    var inputArgs = {
      targetHtml: "#" + args.targetHtml + " .bcdCurrentColDimensionList"
    , targetModelXPath: "$" + cubeTargetId + cubeTargetXPathRoot + "/ColDim/@id"
    , scope: args.cubeId + "_dims"
    , unselectAfterMove: true
    , generateItemHtml: bcdui.component.cube.configuratorDND._itemRenderer
    , extendedConfig: {noTooltip: true }
    };
    bcdui.widgetNg.createConnectable(inputArgs);
    var inputArgs = {
      targetHtml: "#" + args.targetHtml + " .bcdCurrentRowDimensionList"
    , targetModelXPath: "$" + cubeTargetId + cubeTargetXPathRoot + "/RowDim/@id"
    , scope: args.cubeId + "_dims"
    , isDoubleClickTarget: true
    , unselectAfterMove: true
    , generateItemHtml: bcdui.component.cube.configuratorDND._itemRenderer
    , extendedConfig: {noTooltip: true }
    };
    bcdui.widgetNg.createConnectable(inputArgs);
    var inputArgs = {
      optionsModelXPath: "$" + cubeBucketModelId + "/*/cube:Measures/dm:MeasureRef/@caption"
    , optionsModelRelativeValueXPath: "../@idRef"
    , targetHtml: "#" + args.targetHtml + " .bcdMeasureList"
    , scope: args.cubeId + "_meas"
    , unselectAfterMove: true
    , extendedConfig: {noTooltip: true }
    };
    bcdui.widgetNg.createConnectable(inputArgs);
    var inputArgs = {
      targetHtml: "#" + args.targetHtml + " .bcdCurrentColMeasureList"
    , targetModelXPath: "$" + cubeTargetId + cubeTargetXPathRoot + "/ColMes/@id"
    , scope: args.cubeId + "_meas"
    , unselectAfterMove: true
    , generateItemHtml: bcdui.component.cube.configuratorDND._itemRenderer
    , extendedConfig: {noTooltip: true }
    };
    bcdui.widgetNg.createConnectable(inputArgs);
    var inputArgs = {
      targetHtml: "#" + args.targetHtml + " .bcdCurrentMeasureList"
    , targetModelXPath: "$" + cubeTargetId + cubeTargetXPathRoot + "/RowMes/@id"
    , scope: args.cubeId + "_meas"
    , isDoubleClickTarget: true
    , unselectAfterMove: true
    , generateItemHtml: bcdui.component.cube.configuratorDND._itemRenderer
    , extendedConfig: {noTooltip: true }
    };
    bcdui.widgetNg.createConnectable(inputArgs);

    // initially mark the dimensions for GroupManager
    setTimeout(function(){bcdui.component.cube.configuratorDND._markGroupingDimensions(args.cubeId);});
    
    // add contextMenu handling for GroupManager
    bcdui.component.cube.configuratorDND._addGroupManagerContextMenu(args.targetHtml, args.cubeId);

    // and our listener to generate the layout on any control layout change
    bcdui.factory.addDataListener({
      idRef: cubeTargetId,
      trackingXPath: cubeTargetXPathRoot,
      listener: function() {

        // check if target model really changed

        var cubeBucketModelId = jQuery(".bcd_" + args.cubeId + "_dnd").data("cubeBucketModelId");
        var cubeTargetId = cubeBucketModelId;
        var cubeTargetXPathRoot = bcdui.component.cube.configuratorDND._CUBE_TEMP.xPathRootWidget;
        var targetModelId = jQuery(".bcd_" + args.cubeId + "_dnd").data("targetModelId");
        var cubeLayoutRoot = "/cube:Layout[@cubeId='" + args.cubeId + "']";
        var colDims = bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectNodes("/*" + cubeLayoutRoot + "/cube:Dimensions/cube:Columns/dm:LevelRef/@bRef");
        var rowDims = bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectNodes("/*" + cubeLayoutRoot + "/cube:Dimensions/cube:Rows/dm:LevelRef/@bRef");
        var colMeas = bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectNodes("/*" + cubeLayoutRoot + "/cube:Measures/cube:RowDims/dm:MeasureRef/@idRef");
        var rowMeas = bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectNodes("/*" + cubeLayoutRoot + "/cube:Measures/cube:AllDims/dm:MeasureRef/@idRef");
        var colDimsTarget = bcdui.factory.objectRegistry.getObject(cubeTargetId).getData().selectNodes(cubeTargetXPathRoot + "/ColDim/@id");
        var rowDimsTarget = bcdui.factory.objectRegistry.getObject(cubeTargetId).getData().selectNodes(cubeTargetXPathRoot + "/RowDim/@id");
        var colMeasTarget = bcdui.factory.objectRegistry.getObject(cubeTargetId).getData().selectNodes(cubeTargetXPathRoot + "/ColMes/@id");
        var rowMeasTarget = bcdui.factory.objectRegistry.getObject(cubeTargetId).getData().selectNodes(cubeTargetXPathRoot + "/RowMes/@id");

        var idArray = new Array();
        var idArrayTarget = new Array();

        for (var i = 0; i < rowDims.length; i++)
          if (bcdui.factory.objectRegistry.getObject(cubeBucketModelId).getData().selectSingleNode("/*/cube:Dimensions/dm:LevelRef[@bRef='" + rowDims[i].text + "']") != null)
            idArray.push(rowDims[i].text);
        for (var i = 0; i < rowDimsTarget.length; i++)
          idArrayTarget.push(rowDimsTarget[i].text);

        for (var i = 0; i < colDims.length; i++)
          if (bcdui.factory.objectRegistry.getObject(cubeBucketModelId).getData().selectSingleNode("/*/cube:Dimensions/dm:LevelRef[@bRef='" + colDims[i].text + "']") != null)
            idArray.push(colDims[i].text);
        for (var i = 0; i < colDimsTarget.length; i++)
          idArrayTarget.push(colDimsTarget[i].text);

        for (var i = 0; i < colMeas.length; i++)
          if (bcdui.factory.objectRegistry.getObject(cubeBucketModelId).getData().selectSingleNode("/*/cube:Measures/dm:MeasureRef[@idRef='" + colMeas[i].text + "']") != null)
            idArray.push(colMeas[i].text);
        for (var i = 0; i < colMeasTarget.length; i++)
          idArrayTarget.push(colMeasTarget[i].text);

        for (var i = 0; i < rowMeas.length; i++)
          if (bcdui.factory.objectRegistry.getObject(cubeBucketModelId).getData().selectSingleNode("/*/cube:Measures/dm:MeasureRef[@idRef='" + rowMeas[i].text + "']") != null)
            idArray.push(rowMeas[i].text);
        for (var i = 0; i < rowMeasTarget.length; i++)
          idArrayTarget.push(rowMeasTarget[i].text);

        var i = 0;
        var identical = idArrayTarget.length == idArray.length;
        while (identical && i < idArray.length) {
          identical &= idArray[i] == idArrayTarget[i];
          i++;
        }

        // only recreate layout if something in the target changed
        if (! identical) {

          // remove possible markings in template list
          jQuery(".bcdReportTemplateList a").removeClass("bcdSelected");

          // disable cube renderer on any change
          var layoutNode = bcdui.core.createElementWithPrototype( bcdui.wkModels.guiStatus, "/*/guiStatus:ClientSettings/cube:ClientLayout[@cubeId ='"+ args.cubeId+"']" );
          layoutNode.setAttribute("disableClientRefresh","true");
          // and generate layout
          bcdui.component.cube.configuratorDND._controlModelToCubeLayout(args.cubeId);
        }
      }
    });

    return cubeBucketModelId;
  },

  /**
   * convert internal layout data to (guiStatus) cube:Layout
   * @private
   */
  _controlModelToCubeLayout : function(cubeId) {

    var cubeBucketModelId = jQuery(".bcd_" + cubeId + "_dnd").data("cubeBucketModelId");
    var cubeTargetId = cubeBucketModelId;
    var cubeTargetXPathRoot = bcdui.component.cube.configuratorDND._CUBE_TEMP.xPathRootWidget;
    var tempModel = cubeBucketModelId;
    var tempModelXPathRoot = bcdui.component.cube.configuratorDND._CUBE_TEMP.xPathRootLayout;
    var targetModelId = jQuery(".bcd_" + cubeId + "_dnd").data("targetModelId");
    var cubeLayoutRoot = "/cube:Layout[@cubeId='" + cubeId + "']";

    // clean temporary layout first
    bcdui.core.removeXPath(bcdui.factory.objectRegistry.getObject(tempModel).getData(), tempModelXPathRoot + cubeLayoutRoot);

    var destination = bcdui.core.createElementWithPrototype(bcdui.factory.objectRegistry.getObject(tempModel).getData(), tempModelXPathRoot);
    //copy source layout to temp if it exists
    var source = bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectSingleNode("/*" + cubeLayoutRoot);
    if (source != null)
      destination.appendChild(source.cloneNode(true));
    // since we only want a skeleton (but with possible hideAllTotal, TopN, hide/exclude etc attributes, we remove dims and measureRefs (user defined dm:Measure survive)
    bcdui.core.removeXPath(bcdui.factory.objectRegistry.getObject(tempModel).getData(), tempModelXPathRoot + cubeLayoutRoot + "/cube:Dimensions/*");
    bcdui.core.removeXPath(bcdui.factory.objectRegistry.getObject(tempModel).getData(), tempModelXPathRoot + cubeLayoutRoot + "/cube:Measures/*/*[name()!='dm:Measure']");

    // now insert measures and dims into temp layout based on ordering from collectable targets
    // by doing this, all attributes and childs (VDMs) are taken over
    var colDims = bcdui.factory.objectRegistry.getObject(cubeTargetId).getData().selectNodes(cubeTargetXPathRoot + "/ColDim/@id");
    var rowDims = bcdui.factory.objectRegistry.getObject(cubeTargetId).getData().selectNodes(cubeTargetXPathRoot + "/RowDim/@id");
    var colMeas = bcdui.factory.objectRegistry.getObject(cubeTargetId).getData().selectNodes(cubeTargetXPathRoot + "/ColMes/@id");
    var rowMeas = bcdui.factory.objectRegistry.getObject(cubeTargetId).getData().selectNodes(cubeTargetXPathRoot + "/RowMes/@id");

    for (var i = 0; i < rowDims.length; i++) {
      var dim = bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectSingleNode("/*" + cubeLayoutRoot + "/cube:Dimensions/*/dm:LevelRef[@bRef='" + rowDims[i].text + "']");
      dim = dim != null ? dim : bcdui.factory.objectRegistry.getObject(cubeBucketModelId).getData().selectSingleNode("/*/cube:Dimensions/dm:LevelRef[@bRef='" + rowDims[i].text + "']");
      if (dim != null) {
        var destination = bcdui.factory.objectRegistry.getObject(tempModel).getData().selectSingleNode(tempModelXPathRoot + cubeLayoutRoot + "/cube:Dimensions/cube:Rows");
        destination = destination != null ? destination : bcdui.core.createElementWithPrototype(bcdui.factory.objectRegistry.getObject(tempModel).getData(), tempModelXPathRoot + cubeLayoutRoot + "/cube:Dimensions/cube:Rows");
        destination.appendChild(dim.cloneNode(true));
      }
    }
    for (var i = 0; i < colDims.length; i++) {
      var dim = bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectSingleNode("/*" + cubeLayoutRoot + "/cube:Dimensions/*/dm:LevelRef[@bRef='" + colDims[i].text + "']");
      dim = dim != null ? dim : bcdui.factory.objectRegistry.getObject(cubeBucketModelId).getData().selectSingleNode("/*/cube:Dimensions/dm:LevelRef[@bRef='" + colDims[i].text + "']");
      if (dim != null) {
        var destination = bcdui.factory.objectRegistry.getObject(tempModel).getData().selectSingleNode(tempModelXPathRoot + cubeLayoutRoot + "/cube:Dimensions/cube:Columns");
        destination = destination != null ? destination : bcdui.core.createElementWithPrototype(bcdui.factory.objectRegistry.getObject(tempModel).getData(), tempModelXPathRoot + cubeLayoutRoot + "/cube:Dimensions/cube:Columns");
        destination.appendChild(dim.cloneNode(true));
      }
    }
    for (var i = 0; i < colMeas.length; i++) {
      var mes = bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectSingleNode("/*" + cubeLayoutRoot + "/cube:Measures/*/dm:MeasureRef[@idRef='" + colMeas[i].text + "']");
      mes = mes != null ? mes : bcdui.factory.objectRegistry.getObject(cubeBucketModelId).getData().selectSingleNode("/*/cube:Measures/dm:MeasureRef[@idRef='" + colMeas[i].text + "']");
      if (mes != null) {
        var destination = bcdui.factory.objectRegistry.getObject(tempModel).getData().selectSingleNode(tempModelXPathRoot + cubeLayoutRoot + "/cube:Measures/cube:RowDims");
        destination = destination != null ? destination : bcdui.core.createElementWithPrototype(bcdui.factory.objectRegistry.getObject(tempModel).getData(), tempModelXPathRoot + cubeLayoutRoot + "/cube:Measures/cube:RowDims");
        destination.appendChild(mes.cloneNode(true));
      }
    }
    for (var i = 0; i < rowMeas.length; i++) {
      var mes = bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectSingleNode("/*" + cubeLayoutRoot + "/cube:Measures/*/dm:MeasureRef[@idRef='" + rowMeas[i].text + "']");
      mes = mes != null ? mes : bcdui.factory.objectRegistry.getObject(cubeBucketModelId).getData().selectSingleNode("/*/cube:Measures/dm:MeasureRef[@idRef='" + rowMeas[i].text + "']");
      if (mes != null) {
        var destination = bcdui.factory.objectRegistry.getObject(tempModel).getData().selectSingleNode(tempModelXPathRoot + cubeLayoutRoot + "/cube:Measures/cube:AllDims");
        destination = destination != null ? destination : bcdui.core.createElementWithPrototype(bcdui.factory.objectRegistry.getObject(tempModel).getData(), tempModelXPathRoot + cubeLayoutRoot + "/cube:Measures/cube:AllDims");
        destination.appendChild(mes.cloneNode(true));
      }
    }

    // force triggering other cubeTargetId listeners by cleaning and rebuilding layout
    bcdui.core.removeXPath(bcdui.factory.objectRegistry.getObject(targetModelId).getData(), "/*" + cubeLayoutRoot);

    var source = bcdui.factory.objectRegistry.getObject(tempModel).getData().selectSingleNode(tempModelXPathRoot + cubeLayoutRoot);
    source = source != null ? source : bcdui.core.createElementWithPrototype(bcdui.factory.objectRegistry.getObject(tempModel).getData(), tempModelXPathRoot + cubeLayoutRoot);
    var destination = bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectSingleNode("/*");
    destination.appendChild(source.cloneNode(true));

    // optionally limit measures/dimensions
    var doRedisplay = bcdui.component.cube.configuratorDND._limitDimsAndMeasures(cubeId);

    // do some special rules cleanup
    doRedisplay |= bcdui.component.cube.configuratorDND._cleanUp(cubeId);

    bcdui.factory.objectRegistry.getObject(targetModelId).fire();

    // in case cleanup did something, we need to redisplay our connectables
    if (doRedisplay)
      bcdui.component.cube.configuratorDND.reDisplay(cubeId);
  },
  
  /**
   * limits the number of measures and dimensions
   * into account
   * @private
   */
  _limitDimsAndMeasures : function(cubeId) {

    var doRedisplay = false;
    var maxDimensions = 9; // More is not supported by Chrome
    var maxMeasures  = -1;

    // limit measures/dimensions if required
    if (maxDimensions || maxMeasures) {
      var dimOk = false;
      var msrOk = false;
      var promptMsr = false;
      var promptDim = false;

      var targetModelId = jQuery(".bcd_" + cubeId + "_dnd").data("targetModelId");
      var cubeLayoutRoot = "/cube:Layout[@cubeId='" + cubeId + "']";
      var targetModelDoc = bcdui.factory.objectRegistry.getObject(targetModelId).getData();

      while ((! dimOk) || (! msrOk)) {
        // count only unique measures since during dragNdrop, this function is called in states where source and destination contain the same item
        var dimensions = jQuery.makeArray(targetModelDoc.selectNodes("/*" + cubeLayoutRoot + "/cube:Dimensions/*/dm:LevelRef/@bRef")).map(function(e){return e.text;});
        var measures = jQuery.makeArray(targetModelDoc.selectNodes("/*" + cubeLayoutRoot + "/cube:Measures/*/dm:MeasureRef/@idRef")).map(function(e){return e.text;});
        var numberOfDimensions = dimensions.filter(function(e, idx){return dimensions.indexOf(e) == idx}).length
        var numberOfMeasures = measures.filter(function(e, idx){return measures.indexOf(e) == idx}).length

        // dimensions limit only if we also got coldims
        if (targetModelDoc.selectNodes("/*" + cubeLayoutRoot + "/cube:Dimensions/cube:Columns/dm:LevelRef/@bRef").length == 0)
          dimOk = true
        else if (maxDimensions != -1 && numberOfDimensions > maxDimensions) {
          doRedisplay = true;
          if (! promptDim) {
            alert(
              bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_MaxDimensions"}) +
              " " + maxDimensions + "\n" +
              bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_MaxReduce"})
            );
            promptDim = true;
          }
          if (targetModelDoc.selectSingleNode("/*" + cubeLayoutRoot + "/cube:Dimensions/cube:Rows/dm:LevelRef") != null)
            bcdui.core.removeXPath(targetModelDoc, "/*" + cubeLayoutRoot + "/cube:Dimensions/cube:Rows/dm:LevelRef[position()=last()]");
          else
            bcdui.core.removeXPath(targetModelDoc, "/*" + cubeLayoutRoot + "/cube:Dimensions/cube:Columns/dm:LevelRef[position()=last()]");
        }
        else
          dimOk = true;

        if (maxMeasures != -1 && numberOfMeasures > maxMeasures) {
          doRedisplay = true;
          if (! promptMsr) {
            alert(
              bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_MaxMeasures"}) +
              " " + maxMeasures + "\n" +
              bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_MaxReduce"})
            );
            promptMsr = true;
          }
          if (targetModelDoc.selectSingleNode("/*" + cubeLayoutRoot + "/cube:Measures/cube:AllDims/dm:MeasureRef") != null)
            bcdui.core.removeXPath(targetModelDoc, "/*" + cubeLayoutRoot + "/cube:Measures/cube:AllDims/dm:MeasureRef[position()=last()]");
          else
            bcdui.core.removeXPath(targetModelDoc, "/*" + cubeLayoutRoot + "/cube:Measures/cube:RowDims/dm:MeasureRef[position()=last()]");
        }
        else
          msrOk = true;
      }
    }   
    return doRedisplay;
  },

  /**
   * convert (guiStatus) cube:Layout to internal layout data
   * @private
   */
  _cubeLayoutToControlModel : function(cubeId) {

    var cubeBucketModelId = jQuery(".bcd_" + cubeId + "_dnd").data("cubeBucketModelId");
    var cubeTargetId = cubeBucketModelId;
    var cubeTargetXPathRoot = bcdui.component.cube.configuratorDND._CUBE_TEMP.xPathRootWidget;
    var targetModelId = jQuery(".bcd_" + cubeId + "_dnd").data("targetModelId");
    var cubeLayoutRoot = "/cube:Layout[@cubeId='" + cubeId + "']";

    // transform target model data to in-between model
    var colDims = bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectNodes("/*" + cubeLayoutRoot + "/cube:Dimensions/cube:Columns/dm:LevelRef/@bRef");
    var rowDims = bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectNodes("/*" + cubeLayoutRoot + "/cube:Dimensions/cube:Rows/dm:LevelRef/@bRef");
    var colMeas = bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectNodes("/*" + cubeLayoutRoot + "/cube:Measures/cube:RowDims/dm:MeasureRef/@idRef");
    var rowMeas = bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectNodes("/*" + cubeLayoutRoot + "/cube:Measures/cube:AllDims/dm:MeasureRef/@idRef");

    bcdui.core.removeXPath(bcdui.factory.objectRegistry.getObject(cubeTargetId), cubeTargetXPathRoot);
    for (var i = 0; i < rowDims.length; i++)
      if (bcdui.factory.objectRegistry.getObject(cubeBucketModelId).getData().selectSingleNode("/*/cube:Dimensions/dm:LevelRef[@bRef='" + rowDims[i].text + "']") != null)
        bcdui.core.createElementWithPrototype(bcdui.factory.objectRegistry.getObject(cubeTargetId), cubeTargetXPathRoot + "/RowDim[@id='" + rowDims[i].text + "']");

    for (var i = 0; i < colDims.length; i++)
      if (bcdui.factory.objectRegistry.getObject(cubeBucketModelId).getData().selectSingleNode("/*/cube:Dimensions/dm:LevelRef[@bRef='" + colDims[i].text + "']") != null)
        bcdui.core.createElementWithPrototype(bcdui.factory.objectRegistry.getObject(cubeTargetId), cubeTargetXPathRoot + "/ColDim[@id='" + colDims[i].text + "']");

    for (var i = 0; i < colMeas.length; i++)
      if (bcdui.factory.objectRegistry.getObject(cubeBucketModelId).getData().selectSingleNode("/*/cube:Measures/dm:MeasureRef[@idRef='" + colMeas[i].text + "']") != null)
        bcdui.core.createElementWithPrototype(bcdui.factory.objectRegistry.getObject(cubeTargetId), cubeTargetXPathRoot + "/ColMes[@id='" + colMeas[i].text + "']");

    for (var i = 0; i < rowMeas.length; i++)
      if (bcdui.factory.objectRegistry.getObject(cubeBucketModelId).getData().selectSingleNode("/*/cube:Measures/dm:MeasureRef[@idRef='" + rowMeas[i].text + "']") != null)
        bcdui.core.createElementWithPrototype(bcdui.factory.objectRegistry.getObject(cubeTargetId), cubeTargetXPathRoot + "/RowMes[@id='" + rowMeas[i].text + "']");

    bcdui.factory.objectRegistry.getObject(cubeTargetId).fire();

    setTimeout(function(){bcdui.component.cube.configuratorDND._markGroupingDimensions(cubeId);});
  },

  /**
   * Used for initial filling but can also be used to reinitialize bucket model (e.g. after hiding selectable measures)
   * @param {string}  cubeBucketModelId  The id of the cubeBucketModel
   * @param {string}  configId           The id of the used configuration
   */
  fillBucketModel : function(cubeBucketModelId, configId) {

    if (typeof bcdui.factory.objectRegistry.getObject(cubeBucketModelId) != "undefined") {

      // clean possibly existing nodes first
      bcdui.core.removeXPath(bcdui.factory.objectRegistry.getObject(cubeBucketModelId).getData(), "/*/*");

      var dimensionParent = bcdui.core.createElementWithPrototype(bcdui.factory.objectRegistry.getObject(cubeBucketModelId), "/*/cube:Dimensions");
      var measureParent = bcdui.core.createElementWithPrototype(bcdui.factory.objectRegistry.getObject(cubeBucketModelId), "/*/cube:Measures");

      // take either all dimensions from cubeConfig or dimensionsAndMeasures
      var levelRefList = bcdui.factory.objectRegistry.getObject(configId).getData().selectNodes("/*/cube:Dimensions/dm:LevelRef");
      if (levelRefList.length == 0)
        levelRefList = bcdui.factory.objectRegistry.getObject(configId).getData().selectNodes("//dm:Dimensions/dm:LevelRef");
      for (var l = 0; l < levelRefList.length; l++)
        dimensionParent.appendChild(levelRefList[l].cloneNode(true));

      // take either all measureRefs from cubeConfig or all measures from dimensionsAndMeasures
      var measureRefList = bcdui.factory.objectRegistry.getObject(configId).getData().selectNodes("/*/cube:MeasuresRefs/dm:MeasureRef");
      if (measureRefList.length != 0) {
        for (var m = 0; m < measureRefList.length; m++)
          measureParent.appendChild(measureRefList[m].cloneNode(true));
      } else {
        // generate measureRefs out of measures
        var measureList = bcdui.factory.objectRegistry.getObject(configId).getData().selectNodes("//dm:Measures/dm:Measure");
        for (var m = 0; m < measureList.length; m++) {
          var idRef = measureList[m].getAttribute("id");
          var caption = measureList[m].getAttribute("caption");
          caption = caption == null ? "" : caption;
          bcdui.core.createElementWithPrototype(bcdui.factory.objectRegistry.getObject(cubeBucketModelId), "/*/cube:Measures/dm:MeasureRef[@idRef='" + idRef + "' and @caption='" + caption + "']");
        }
      }

      // take over captions if not present
      var dims = dimensionParent.selectNodes("dm:LevelRef[not(@caption) or @caption='']");
      for (var d = 0; d < dims.length; d++) {
        var caption = bcdui.factory.objectRegistry.getObject(configId).getData().selectSingleNode("//dm:Dimensions/dm:LevelRef[@bRef='" + dims[d].getAttribute("bRef") + "']/@caption");
        caption = caption == null ? "" : caption.text;
        if (caption != "")
          dims[d].setAttribute("caption", caption);
      }
      var meas = measureParent.selectNodes("dm:MeasureRef[not(@caption) or @caption='']");
      for (var m = 0; m < meas.length; m++) {
        var caption = bcdui.factory.objectRegistry.getObject(configId).getData().selectSingleNode("//dm:Measures/dm:Measure[@id='" + meas[m].getAttribute("idRef") + "']/@caption");
        caption = caption == null ? "" : caption.text;
        if (caption != "")
          meas[m].setAttribute("caption", caption);
      }
    }

    return cubeBucketModelId;
  },

  /**
   * Refreshes the cube drag'n drop area
   * This is e.g. necessary when a template is applied or the layout is cleaned
   * or a client sided cube action is applied and you want to have e.g. icons being
   * refreshed in the dnd area, or you have some custom options which remove measures
   * dimensions on special rules and the dnd area needs to be in sync with the changes  
   * @param {string}  cubeId  The id of the linked cube
   */
  reDisplay : function(cubeId) {

    bcdui.component.cube.configuratorDND._cubeLayoutToControlModel(cubeId);

    // force other targetId Listeners to run on a redisplay of data
    // this is e.g. needed to rerender the cube when cumulate attributes were set via context menu
    var targetModelId = jQuery(".bcd_" + cubeId + "_dnd").data("targetModelId");
    var cubeLayoutRoot = "/cube:Layout[@cubeId='" + cubeId + "']";

    var destination = bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectSingleNode("/*" + cubeLayoutRoot);

    // take pseudo attribute bcdRedisplay and increase it by one
    var r = destination != null ? destination.getAttribute("bcdRedisplay") : null;
    r = r == null || isNaN(parseInt(r, 10)) ? 0 : parseInt(r, 10) + 1;

    destination = destination != null ? destination : bcdui.core.createElementWithPrototype(bcdui.factory.objectRegistry.getObject(targetModelId).getData(), "/*" + cubeLayoutRoot);

    // ensure that we do trigger an event by setting the new value of bcdRedisplay
    destination.setAttribute("bcdRedisplay", "" + r);
    bcdui.factory.objectRegistry.getObject(targetModelId).fire();
  },

  /**
   * basic box item renderer which adds one class (last wins) depending on some dimension/measure attributes
   * @private
   */
  _itemRenderer: function(args) {
    var cubeId = jQuery("#" + args.id).closest("*[bcdCubeId]").attr("bcdCubeId");
    var targetModelId = jQuery(".bcd_" + cubeId + "_dnd").data("targetModelId");
    var cubeBucketModelId = jQuery(".bcd_" + cubeId + "_dnd").data("cubeBucketModelId");
    var cubeLayoutRoot = "/cube:Layout[@cubeId='" + cubeId + "']";
    var customClass = "";
    var dim = bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectSingleNode("/*" + cubeLayoutRoot + "/cube:Dimensions/*/dm:LevelRef[@bRef='" + args.value + "']");
    dim = dim != null ? dim : bcdui.factory.objectRegistry.getObject(cubeBucketModelId).getData().selectSingleNode("/*/cube:Dimensions/dm:LevelRef[@bRef='" + args.value + "']");
    if (dim != null) {
      if (dim.selectSingleNode("./cube:VDM") != null) customClass = "bcdVdm";
      if (dim.getAttribute("sort") == "ascending") customClass = "bcdSortAsc";
      if (dim.getAttribute("sort") == "descending") customClass = "bcdSortDesc";
    }
    var mes = bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectSingleNode("/*" + cubeLayoutRoot + "/cube:Measures/*/dm:MeasureRef[@idRef='" + args.value + "']");
    mes = mes != null ? mes : bcdui.factory.objectRegistry.getObject(cubeBucketModelId).getData().selectSingleNode("/*/cube:Measures/dm:MeasureRef[@idRef='" + args.value + "']");
    if (mes != null) {
      if (mes.getAttribute("cumulateRow") != null) customClass = "bcdRowCumulate";
      if (mes.getAttribute("cumulateCol") != null) customClass = "bcdColCumulate";
      if (mes.getAttribute("cumulateRow") != null && mes.getAttribute("cumulateCol") != null) customClass = "bcdRowColCumulate";
    }

    return "<li class='ui-selectee " + customClass + "' bcdValue='" + args.value + "' bcdPos='" + args.position + "' bcdLoCase='" + args.caption.toLowerCase() + "' title='" + args.caption + "'><span class='bcdItem'>" + args.caption + "</span></li>";
  },

  // some special rules to remove cube attributes like sort, cumulate, exclude, hides or not inner vdms
  /**
   * @private
   */
  _cleanUp : function (cubeId) {

    var targetModelId = jQuery(".bcd_" + cubeId + "_dnd").data("targetModelId") || "guiStatus";
    var targetModel = bcdui.factory.objectRegistry.getObject(targetModelId);
    var cubeLayoutRoot = "/cube:Layout[@cubeId='" + cubeId + "']";
    var gotColDimensions = targetModel.queryNodes("/*" + cubeLayoutRoot + "/cube:Dimensions/cube:Columns/dm:LevelRef").length > 0;
    var gotRowDimensions = targetModel.queryNodes("/*" + cubeLayoutRoot + "/cube:Dimensions/cube:Rows/dm:LevelRef").length > 0;
    var gotVDM = targetModel.queryNodes("/*" + cubeLayoutRoot + "/cube:Dimensions/*/dm:LevelRef/cube:VDM").length > 0;
    var layoutRoot =  "/*/cube:Layout[@cubeId='" + cubeId + "']";
    var doRedisplay = false;

    // remove 'cumulateCol' when no rowDimension is available anymore
    if (! gotRowDimensions) {
      var nodes = targetModel.queryNodes(layoutRoot + "/cube:Measures/*/dm:MeasureRef[@cumulateCol]");
      for (var n = 0; n < nodes.length; n++)
        nodes[n].removeAttribute("cumulateCol");
      if (nodes.length > 0)
        doRedisplay = true;
    }

    // remove 'cumulateRow' when no colDimension is available anymore
    if (! gotColDimensions) {
      var nodes = targetModel.queryNodes(layoutRoot + "/cube:Measures/*/dm:MeasureRef[@cumulateRow]");
      for (var n = 0; n < nodes.length; n++)
        nodes[n].removeAttribute("cumulateRow");
      if (nodes.length > 0)
        doRedisplay = true;
    }
    
    // remove simple 'sort' when VDM is available
    if (gotVDM) {
      var nodes = targetModel.queryNodes(layoutRoot + "/cube:Measures/*/dm:MeasureRef[@sort]");
      for (var n = 0; n < nodes.length; n++) {
        nodes[n].removeAttribute("sort");
        doRedisplay = true;
      }
    }

    // remove sortColDims in RowDims
    var nodes = targetModel.queryNodes(layoutRoot + "/cube:Measures/cube:RowDims/dm:MeasureRef[@sortColDims]");
    for (var n = 0; n < nodes.length; n++) {
      nodes[n].removeAttribute("sort");
      nodes[n].removeAttribute("sortColDims");
      nodes[n].removeAttribute("sortColDimsBRefs");
      var manualSort = (targetModel.read(layoutRoot + "/@manualSort", "false") == "true");
      if (manualSort)
        targetModel.query(layoutRoot).removeAttribute("manualSort");
    }
    if (nodes.length > 0)
      doRedisplay = true;

    // remove sortColDims in AllDims when col dimlevels changed
    var nodes = targetModel.queryNodes(layoutRoot + "/cube:Measures/cube:AllDims/dm:MeasureRef[@sortColDims]");
    for (var n = 0; n < nodes.length; n++) {
      var bRefs = jQuery.makeArray(targetModel.queryNodes(layoutRoot + "/cube:Dimensions/cube:Columns/dm:LevelRef")).map(function(e) {return e.getAttribute("bRef");});
      bRefs = bRefs.join("|");
      if (bRefs != nodes[n].getAttribute("sortColDims")) {
        nodes[n].removeAttribute("sort");
        nodes[n].removeAttribute("sortColDims");
        nodes[n].removeAttribute("sortColDimsBRefs");
        doRedisplay = true;
        var manualSort = (targetModel.read(layoutRoot + "/@manualSort", "false") == "true");
        if (manualSort)
          targetModel.query(layoutRoot).removeAttribute("manualSort");
      }
    }

    // remove obsolete sortBy
    var nodes = targetModel.queryNodes(layoutRoot + "/cube:Dimensions/*/dm:LevelRef[@sortBy]");
    for (var n = 0; n < nodes.length; n++) {
      var sortBy = nodes[n].getAttribute("sortBy");
      if (targetModel.getData().selectSingleNode(layoutRoot + "/cube:Measures/*/dm:MeasureRef[@idRef='" + sortBy + "']") == null) {
        nodes[n].removeAttribute("sortBy");
        nodes[n].removeAttribute("sort");
        doRedisplay = true;
      }
    }

    var isSameBoxDim = bcdui.widgetNg.connectable._isSameBoxMovement(cubeId + "_dims");

    // remove obsolete hide (specific)
    var nodes = targetModel.queryNodes(layoutRoot + "/cube:Hide/f:Filter/f:Or/f:Expression");
    for (var n = 0; n < nodes.length; n++) {
      if (! isSameBoxDim || targetModel.getData().selectSingleNode(layoutRoot + "/cube:Dimensions/*[dm:LevelRef[@bRef='" + nodes[n].getAttribute("bRef") + "']]") == null)
        bcdui.core.removeXPath(targetModel.getData(), layoutRoot + "/cube:Hide/f:Filter/f:Or[f:Expression[@bRef='" + nodes[n].getAttribute("bRef") + "']]");
    }

    // remove obsolete hide (all)
    var nodes = targetModel.queryNodes(layoutRoot + "/cube:Hide/f:Filter/f:Expression");
    for (var n = 0; n < nodes.length; n++)
      if (targetModel.getData().selectSingleNode(layoutRoot + "/cube:Dimensions/*/dm:LevelRef[@bRef='" + nodes[n].getAttribute("bRef") + "']") == null)
        bcdui.core.removeXPath(targetModel.getData(), layoutRoot + "/cube:Hide/f:Filter/f:Expression[@bRef='" + nodes[n].getAttribute("bRef") + "']");

    // remove obsolete exclude
    var nodes = targetModel.queryNodes("/*/f:Filter/f:Or[@type='bcdCubeExclude_" + cubeId + "']");
    for (var n = 0; n < nodes.length; n++) {
      var node = nodes[n];
      var exclBRef = node.getAttribute("exclBRef") || "";
      var exp = node.selectNodes("f:Expression");
      var isColumnExclusion = (targetModel.getData().selectSingleNode(layoutRoot + "/cube:Dimensions/cube:Columns/dm:LevelRef[@bRef='" + exclBRef + "']") != null);

      for (var e = 0; e < exp.length; e++) {
        var bRef= exp[e].getAttribute("bRef");

        // remove it when it doesn't appear in the selected dimensions at all
        if (targetModel.getData().selectSingleNode(layoutRoot + "/cube:Dimensions/*/dm:LevelRef[@bRef='" + bRef + "']") == null)
          bcdui.core.removeXPath(targetModel.getData(), "/*/f:Filter/f:Or[@type='bcdCubeExclude_" + cubeId + "' and f:Expression[@bRef='" + bRef + "']]");
        else {
          // or if we got a column dimension exclusion and you moved them to a row (or vice versa), we remove the full OR-node if it contains
          // invalid row/col combinations
          var dimIsColumn = (targetModel.getData().selectSingleNode(layoutRoot + "/cube:Dimensions/cube:Columns/dm:LevelRef[@bRef='" + bRef + "']") != null);
          if ((dimIsColumn && ! isColumnExclusion) || (!dimIsColumn && isColumnExclusion))
            bcdui.core.removeXPath(targetModel.getData(), "/*/f:Filter/f:Or[@type='bcdCubeExclude_" + cubeId + "' and f:Expression[@bRef='" + bRef + "']]");
        }
      }
    }
    // and the single "exclude all"
    var nodes = targetModel.queryNodes("/*/f:Filter/f:Expression[@type='bcdCubeExclude_" + cubeId + "']");
    for (var n = 0; n < nodes.length; n++) {
      var node = nodes[n];
      var exclBRef = node.getAttribute("exclBRef") || "";
      var bRef = node.getAttribute("bRef") || "";
      var isColumnExclusion = (targetModel.getData().selectSingleNode(layoutRoot + "/cube:Dimensions/cube:Columns/dm:LevelRef[@bRef='" + exclBRef + "']") != null);
      // remove it when it doesn't appear in the selected dimensions at all
      if (targetModel.getData().selectSingleNode(layoutRoot + "/cube:Dimensions/*/dm:LevelRef[@bRef='" + bRef + "']") == null)
        bcdui.core.removeXPath(targetModel.getData(), "/*/f:Filter/f:Expression[@type='bcdCubeExclude_" + cubeId + "' and @bRef='" + bRef + "']");
      else {
        // or if we got a column dimension exclusion and you moved them to a row (or vice versa), we remove the full OR-node if it contains
        // invalid row/col combinations
        var dimIsColumn = (targetModel.getData().selectSingleNode(layoutRoot + "/cube:Dimensions/cube:Columns/dm:LevelRef[@bRef='" + bRef + "']") != null);
        if ((dimIsColumn && ! isColumnExclusion) || (!dimIsColumn && isColumnExclusion))
          bcdui.core.removeXPath(targetModel.getData(), "/*/f:Filter/f:Expression[@type='bcdCubeExclude_" + cubeId + "' and @bRef='" + bRef + "']");
      }
    }

    // remove empty excludes
    bcdui.core.removeXPath(targetModel.getData(), "/*/f:Filter/f:Or[@type='bcdCubeExclude_" + cubeId + "' and not(f:Expression)]");

    // remove possible "now-not-innermost-anymore-vdms" (not grouping editor ones)
    var dimensions = targetModel.queryNodes(layoutRoot + "/cube:Dimensions/cube:Columns/dm:LevelRef");
    for (var d = 0; d < dimensions.length - 1; d++) {
      if (bcdui.core.removeXPath(dimensions[d], "./cube:VDM/calc:Calc") > 0)
        doRedisplay = true;
      if (dimensions[d].selectSingleNode("./cube:VDM/*") == null)
        if (bcdui.core.removeXPath(dimensions[d], "./cube:VDM") > 0)
          doRedisplay = true;
    }
    var dimensions = targetModel.queryNodes(layoutRoot + "/cube:Dimensions/cube:Rows/dm:LevelRef");
    for (var d = 0; d < dimensions.length - 1; d++) {
      if (bcdui.core.removeXPath(dimensions[d], "./cube:VDM/calc:Calc") > 0)
        doRedisplay = true;
      if (dimensions[d].selectSingleNode("./cube:VDM/*") == null)
        if (bcdui.core.removeXPath(dimensions[d], "./cube:VDM") > 0)
          doRedisplay = true;
    }

    // after cleanup, also update the marks for the dimensions for GroupManager
    bcdui.component.cube.configuratorDND._markGroupingDimensions(cubeId);

    return doRedisplay;
  },
  
  /**
   * Generates a default layout for the cube drag'n drop area
   * @private
   */
  _generateDefaultLayout : function() {
    // 960 grid based layout with possible horizontal flip
    var dndDirectionTargetLeft = bcdui.config.settings.bcdui.component.dnd.targetLeft == null ? true : bcdui.config.settings.bcdui.component.dnd.targetLeft;
    var targetArea = "" +
      "<div class='grid_3 omega bcdCurrentRowDimensionList" + (dndDirectionTargetLeft ? " alpha" : "") + "'></div>" +
      "<div class='grid_3 omega bcdCurrentColMeasureList'></div>" +
      "<div class='grid_3 omega'>" +
      "  <div class='bcdCurrentColDimensionList'></div>" +
      "  <div class='bcdCurrentMeasureList'></div>" +
      "</div>";
    var sourceArea = ""+
      "<div class='grid_5 omega" + (dndDirectionTargetLeft ? "" : " alpha") + "' >" +
      "  <div class='bcdHeader'>" + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_Dimensions"}) + "</div>" +
      "  <div class='bcdDimensionList'></div>" +
      "</div>" +
      "<div class='grid_5 omega'>" +
      "  <div class='bcdHeader'>" + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_Measures"}) + "</div>" +
      "  <div class='bcdMeasureList'></div>" +
      "</div>";
    var template = "" +
      " <div class='container_24 bcdCubeDndMatrix'>" +
      "   <div class='grid_24'>" +
          (dndDirectionTargetLeft ? targetArea : sourceArea) +
          (dndDirectionTargetLeft ? sourceArea : targetArea) +
      "   </div>" +
      " </div>";
  
    // insert pseudo classes for translated dnd background texts
    jQuery('<style>' +
      '.bcdCurrentColDimensionList ul:after { content: "' + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_ColDimensions"}) + '"; }' +
      '.bcdCurrentRowDimensionList ul:after { content: "' + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_RowDimensions"}) + '"; }' +
      '.bcdCurrentColMeasureList ul:after { content: "' + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_ColMeasures"}) + '"; }' +
      '.bcdCurrentMeasureList ul:after { content: "' + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_RowMeasures"}) + '"; }' +
    '</style>').appendTo('head');

    return template;
  }

  // Extension Points
  /**
   * @private
   */
  , _addGroupManagerContextMenu : function(){}

  /**
   * @private
   */
  , _markGroupingDimensions : function(){}

});
