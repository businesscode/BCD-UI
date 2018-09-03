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
 * @namespace bcdui.component.cube.configurator
 */
bcdui.util.namespace("bcdui.component.cube.configurator",
/** @lends bcdui.component.cube.configurator */
{

  /**
   * Central dispatcher for changes updating the cube appearance
   * Calls actual function by name
   * Must not be called if the layout has changed in a way that a client-side redisplay is not possible
   * @private
   */
  _dispatchContextMenuCubeClientRefresh: function( actionId, targetModelId, cubeId, args  )
  {
    if( actionId && targetModelId && cubeId && bcdui.factory.objectRegistry.getObject(targetModelId) &&
        typeof bcdui.component.cube.configurator[actionId] == "function" )
    {
      var disNode = bcdui.wkModels.guiStatus.getData().selectSingleNode( "/*/guiStatus:ClientSettings//cube:ClientLayout[@cubeId ='"+ cubeId +"']/@disableClientRefresh" );
      if( disNode && "true" == disNode.nodeValue ) {
        bcdui.widget.showModalBox({ title: "Please press apply to apply all changes first", modalBoxType: bcdui.widget.modalBoxTypes.warning});
      } else {
        var doUpdateStatusModel = bcdui.component.cube.configurator[args.actionId]( targetModelId, cubeId, args );
        var statusModelId = bcdui.factory.objectRegistry.getObject(cubeId).statusModel.id;
        var reDisplayId = jQuery("#" + cubeId + "_dnd").data("targetModelId");
        if (doUpdateStatusModel && statusModelId != targetModelId) { // eventually apply changes to statusModel, too
          bcdui.component.cube.configurator[args.actionId]( statusModelId, cubeId, args );
          if (statusModelId != reDisplayId)
            bcdui.factory.objectRegistry.getObject(statusModelId).fire();
        }
        if (targetModelId != reDisplayId)
          bcdui.factory.objectRegistry.getObject(targetModelId).fire();

        // redisplay cube
        bcdui.component.cube.configuratorDND.reDisplay(cubeId); // this fires reDisplayId
      }
    } else
      bcdui.widget.showModalBox({ title: "Action not possible", modalBoxType: bcdui.widget.modalBoxTypes.warning});

    return;
  },

  // Toggle totals
  toggleHideTotals: function( targetModelId, cubeId, args )
  {
    var dims = bcdui.factory.objectRegistry.getObject( targetModelId ).getData().selectSingleNode("//cube:Layout[@cubeId ='"+ cubeId +"']/cube:Dimensions");
    if( "true"==dims.getAttribute("hideTotals") )
      dims.setAttribute("hideTotals","false");
    else
      dims.setAttribute("hideTotals","true");
    return true;
  },

  // Show totals
  showTotals: function( targetModelId, cubeId, args )
  {
    var dims = bcdui.factory.objectRegistry.getObject( targetModelId ).getData().selectSingleNode("//cube:Layout[@cubeId ='"+ cubeId +"']/cube:Dimensions");
    dims.setAttribute("hideTotals","false");

    // also remove all hidden single totals (remove parent if it's within a and or or)
    bcdui.core.removeXPath(bcdui.factory.objectRegistry.getObject( targetModelId ).getData(), "//cube:Layout[@cubeId ='"+ cubeId +"']/cube:Hide/f:Filter/*[f:Expression[@value='1']]");
    // remove single ones
    bcdui.core.removeXPath(bcdui.factory.objectRegistry.getObject( targetModelId ).getData(), "//cube:Layout[@cubeId ='"+ cubeId +"']/cube:Hide/f:Filter/f:Expression[@value='1']");
    return true;
  },

  // Hide totals
  hideTotals: function( targetModelId, cubeId, args )
  {
    var dims = bcdui.factory.objectRegistry.getObject( targetModelId ).getData().selectSingleNode("//cube:Layout[@cubeId ='"+ cubeId +"']/cube:Dimensions");
    dims.setAttribute("hideTotals","true");
    return true;
  },

  // manual sort toggle when clicking on header
  setColumnSort: function( targetModelId, cubeId, args ){

    var targetModel = bcdui.factory.objectRegistry.getObject(targetModelId);
    var colIdent = bcdui.factory.objectRegistry.getObject("bcdColIdent").value;
    var idRef = args.isDim ? bcdui.component.cube.configurator._getDimensionId("bcdColIdent") : bcdui.component.cube.configurator._getMeasureId("bcdColIdent");

    if (idRef != null) {

      // mark manualSort
      targetModel.query("//cube:Layout[@cubeId ='"+ cubeId +"']").setAttribute("manualSort", "" + (args.direction != null));

      // remove all sorts
      jQuery.makeArray(targetModel.queryNodes("//cube:Layout[@cubeId ='"+ cubeId +"']/cube:*/cube:*/*[self::dm:LevelRef|self::dm:MeasureRef|self::dm:Measure][@sort]")).forEach(function(e){
        e.removeAttribute("sort");
        e.removeAttribute("sortBy");
      });

      // and set new one
      bcdui.component.cube.configurator._setCubeItemAttribute( targetModelId, cubeId, args.isDim, 'sort', args.direction );

      // in case of a colDim Measure, we also write sortColDims
      if (! args.isDim && colIdent.indexOf("|") != -1) {
        var bRefs = jQuery.makeArray(targetModel.queryNodes("//cube:Layout[@cubeId ='"+ cubeId +"']/cube:Dimensions/cube:Columns/dm:LevelRef")).map(function(e) { return e.getAttribute("bRef"); }).join("|");
        bcdui.component.cube.configurator._setCubeItemAttribute( targetModelId, cubeId, args.isDim, 'sortColDimsBRefs', bRefs);
        bcdui.component.cube.configurator._setCubeItemAttribute( targetModelId, cubeId, args.isDim, 'sortColDims', colIdent.substring(0, colIdent.lastIndexOf('|')));
      }
    }
    return true;
  },

  // Sort measure
  setSortMeasure: function( targetModelId, cubeId, args )
  {
    var targetModel = bcdui.factory.objectRegistry.getObject(targetModelId);
    var colIdent = bcdui.factory.objectRegistry.getObject("bcdColIdent").value;
    bcdui.component.cube.configurator._setCubeItemAttribute( targetModelId, cubeId, false, 'sort', args.direction );

    // in case of a colDim Measure, we also write sortColDims
    if (colIdent.indexOf("|") != -1) {
      var bRefs = jQuery.makeArray(targetModel.queryNodes("//cube:Layout[@cubeId ='"+ cubeId +"']/cube:Dimensions/cube:Columns/dm:LevelRef")).map(function(e) { return e.getAttribute("bRef"); }).join("|");
      bcdui.component.cube.configurator._setCubeItemAttribute(targetModelId, cubeId, false, 'sortColDimsBRefs', bRefs);
      bcdui.component.cube.configurator._setCubeItemAttribute(targetModelId, cubeId, false, 'sortColDims', colIdent.substring(0, colIdent.lastIndexOf('|')));
    }
    return true;
  },

  // Sort dim by measure
  setSortDimByMeasure: function( targetModelId, cubeId, args )
  {

    bcdui.factory.objectRegistry.getObject(targetModelId).query("//cube:Layout[@cubeId ='"+ cubeId +"']").setAttribute("manualSort", "false");

    if (! args.clear) {

      // remove all sorts
      jQuery.makeArray(bcdui.factory.objectRegistry.getObject(targetModelId).queryNodes("//cube:Layout[@cubeId ='"+ cubeId +"']/cube:*/cube:*/*[self::dm:LevelRef|self::dm:MeasureRef|self::dm:Measure][@sort]")).forEach(function(e){
        e.removeAttribute("sort");
        e.removeAttribute("sortBy");
      });

      bcdui.component.cube.configurator._setCubeItemAttribute( targetModelId, cubeId, true, 'sort',   args.direction,  args.colDimId );
      bcdui.component.cube.configurator._setCubeItemAttribute( targetModelId, cubeId, true, 'sortBy', args.sortBy,     args.colDimId );
    }
    else{
      bcdui.component.cube.configurator._setCubeItemAttribute( targetModelId, cubeId, true, 'sort',   null,  args.colDimId  );
      bcdui.component.cube.configurator._setCubeItemAttribute( targetModelId, cubeId, true, 'sortBy', null,  args.colDimId  );
    }
    return true;
  },

  // Cumulate row or column
  setCumulate: function( targetModelId, cubeId, args )
  {
    if( args.clear )
    { // Clear any kind of cumulation of this measure
      bcdui.component.cube.configurator._setCubeItemAttribute( targetModelId, cubeId, false, 'cumulateCol', null );
      bcdui.component.cube.configurator._setCubeItemAttribute( targetModelId, cubeId, false, 'cumulateRow', null );
    } else {
      bcdui.component.cube.configurator._setCubeItemAttribute( targetModelId, cubeId, false, args.isRow ? 'cumulateRow' : 'cumulateCol', 'cumulate' );
    }
    return true;
  },

  showThisTotals: function( targetModelId, cubeId, args )
  {
    var bRef1 = (args.levelId == "bcdAll") ? "" : "[@bRef='"+args.levelId+"']";
    var bRef2 = (args.levelId == "bcdAll") ? "" : "='"+args.levelId+"'";

    // unhide hidden total values
    jQuery.makeArray(["//cube:Layout[@cubeId ='"+cubeId+"']/cube:Hide/f:Filter/*" + bRef1,
      "/*/f:Filter/*[@type='bcdCubeExclude_"+cubeId+"' and @exclBRef" + bRef2 + "]"]).forEach(
     function(xpath){
       var nodes = bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectNodes(xpath);
       for( var hN=0; hN<nodes.length; hN++ ) {
         if (nodes.item(hN).selectNodes("./f:Expression/@value[contains(., '')]").length == nodes.item(hN).selectNodes("./f:Expression/@value").length)
           nodes.item(hN).parentNode.removeChild(nodes.item(hN));
       }
     });

    // check if chosen dimension needs a total attribute, add it and force a server sided refresh
    var dimNode = bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectSingleNode("//cube:Layout[@cubeId ='"+cubeId+"']/cube:Dimensions/*/dm:LevelRef[@bRef='" + args.levelId + "']");
    if (dimNode != null) {
      if (dimNode.getAttribute("total") == null) {
        bcdui.component.cube.configurator._setCubeItemAttributeIdRef( targetModelId, cubeId, args.levelId, true, "total", "trailing");
        var layoutNode = bcdui.core.createElementWithPrototype( bcdui.wkModels.guiStatus, "/*/guiStatus:ClientSettings/cube:ClientLayout[@cubeId ='"+ cubeId+"']" );
        layoutNode.setAttribute("disableClientRefresh","true");
        return false;
      }
    }
    return true;
  },

  /**
   * Hides (client side filter) the occurrences of a selected dimension member, i.e. for example all values for a country
   * Results in cube:Layout/cube:Hide/f:Filter expressions
   */
  hideDimMember: function( targetModelId, cubeId, args )
  {
    //------------------------------------------
    // showAll clears all hide and exclude(!) settings, affecting the level
    if( args.showAll == true ) {
      
      var bRef1 = (args.levelId == "bcdAll") ? "" : "[@bRef='"+args.levelId+"']";
      var bRef2 = (args.levelId == "bcdAll") ? "" : "='"+args.levelId+"'";
      
      jQuery.makeArray(["//cube:Layout[@cubeId ='"+cubeId+"']/cube:Hide/f:Filter/*" + bRef1,
          "/*/f:Filter/*[@type='bcdCubeExclude_"+cubeId+"' and @exclBRef" + bRef2 + "]"]).forEach(
         function(xpath){
           var nodes = bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectNodes(xpath);
           for( var hN=0; hN<nodes.length; hN++ )
             nodes.item(hN).parentNode.removeChild(nodes.item(hN));
         });
    }
    //-------------------------------------------
    // all means all occurrences of the value (if it is nested within another dimension, it will appear multiple times)
    else if( args.all == true ) {
      var obj = bcdui.component.cube.configurator._getDimMemberValueAndCaption(targetModelId, cubeId, args);
      var value = obj.value;
      var caption = obj.caption;
      var layoutNode = bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectSingleNode("//cube:Layout[@cubeId ='"+cubeId+"']");
      // standard case for hide all occurrences, just what the affected level, ignore the rest
      if( ! args.total && (value!="1" || ! args.outerLevelId)) {
        var filterNode = bcdui.core.createElementWithPrototype(layoutNode, "/cube:Hide/f:Filter");
        var expressionNode = bcdui.core.browserCompatibility.appendElementWithPrefix(filterNode, "f:Expression");
        expressionNode.setAttribute("bRef", args.levelId);
        expressionNode.setAttribute("op", '!=');
        if (caption)
          expressionNode.setAttribute("caption", caption);
        if(value)
          expressionNode.setAttribute("value", value);
      }
      // This will hide exactly one level of totals. Thus, we must only hide those, where the next outer dim is not total
      else {
        value = args.total ? "1" : value;
        var filterNode = bcdui.core.createElementWithPrototype(layoutNode, "/cube:Hide/f:Filter");
        var orNode = bcdui.core.browserCompatibility.appendElementWithPrefix(filterNode,"f:Or");
        orNode.setAttribute("bRef", args.levelId);
        var expressionNode = bcdui.core.browserCompatibility.appendElementWithPrefix(orNode, "f:Expression");
        expressionNode.setAttribute("bRef", args.levelId);
        expressionNode.setAttribute("op", '!=');
        expressionNode.setAttribute("value", value);
        expressionNode = bcdui.core.browserCompatibility.appendElementWithPrefix(orNode, "f:Expression");
        expressionNode.setAttribute("bRef", args.outerLevelId);
        expressionNode.setAttribute("op", '=');
        expressionNode.setAttribute("value", value);
      }
    }
    //-------------------------------------------
    // This will only hide the one occurrence, i.e. it will also take the values of outer dimensions into account
    else {
      var dataModel = bcdui.factory.objectRegistry.getObject(cubeId).getPrimaryModel();
      var layoutNode = bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectSingleNode("//cube:Layout[@cubeId ='"+cubeId+"']");
      var filterNode = bcdui.core.createElementWithPrototype(layoutNode, "/cube:Hide/f:Filter");
      var orNode = bcdui.core.browserCompatibility.appendElementWithPrefix(filterNode,"f:Or");
      orNode.setAttribute("bRef", args.levelId);
      if( args.isColDim ) {
        // Take care for col dimensions
        var colDimLevelIds = dataModel.getData().selectSingleNode("/wrs:Wrs/wrs:Header/wrs:Columns/@colDimLevelIds").nodeValue.split("|");
        var colDims = bcdui.wkModels.bcdColIdent.value.split("|");
        var captionNode = dataModel.getData().selectSingleNode("/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[@id='" + bcdui.wkModels.bcdColIdent.value + "']/@caption");
        for( var l=0; l<colDimLevelIds.length; l++) { // making the level itself and more outer levels part of the decision
          var expressionNode = bcdui.core.browserCompatibility.appendElementWithPrefix(orNode, "f:Expression");
          expressionNode.setAttribute("bRef", colDimLevelIds[l]);
          expressionNode.setAttribute("op", '!=');
          if(colDims[l])
            expressionNode.setAttribute("value", colDims[l]);
          if (captionNode != null) {
            var caption = captionNode.text.split("|");
            expressionNode.setAttribute("caption", caption[l]);
          }
          if( colDimLevelIds[l]==args.levelId ) // Ignore more inner levels
            break;
        }
      } else {
        // Take care for row dimensions
        var row = dataModel.getData().selectSingleNode("/wrs:Wrs/wrs:Data/wrs:R[@id='"+bcdui.wkModels.bcdRowIdent.value+"']");
        var rowDims = dataModel.getData().selectNodes("/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[@dimId]");
        for( var l=0; l<rowDims.length; l++) { // making the level itself and more outer level part of the decision
          var expressionNode = bcdui.core.browserCompatibility.appendElementWithPrefix(orNode, "f:Expression");
          expressionNode.setAttribute("bRef", rowDims.item(l).getAttribute("id") );
          expressionNode.setAttribute("op", '!=');
          value = row.selectSingleNode("wrs:C["+(l+1)+"]").text;
          if(value)
            expressionNode.setAttribute("value", value);
          else
            expressionNode.setAttribute("value", "0");
          if (row.selectSingleNode("wrs:C["+(l+1)+"]/@caption") != null)
            expressionNode.setAttribute("caption", row.selectSingleNode("wrs:C["+(l+1)+"]/@caption").text);
          if( rowDims.item(l).getAttribute("id")==args.levelId ) // Ignore more inner levels
            break;
        }
      }
    }
    return true;
  },

  /**
   * Excludes (server side filter) the occurrences of a selected dimension member, i.e. for example all values for a country
   * Results in f:Filter expressions
   */
  excludeDimMember: function( targetModelId, cubeId, args )
  {
    var obj = bcdui.component.cube.configurator._getDimMemberValueAndCaption(targetModelId, cubeId, args);
    var value = obj.value;
    var caption = obj.caption;

    //-------------------------------------------
    // Exclude all occurrences of the value (if it is nested within another dimension, it will appear multiple times)
    if( args.all==true ) {
      // To exclude null ([Empty]), simple leave the @value in the Expression empty
      if( value == "0" || value==null ) { // Careful, the first is UTF-= character &#xE0F0;
        var filterNode = bcdui.core.createElementWithPrototype( bcdui.factory.objectRegistry.getObject(targetModelId), "/*/f:Filter");
        var expressionNode = bcdui.core.browserCompatibility.appendElementWithPrefix(filterNode, "f:Expression");
        expressionNode.setAttribute("bRef", args.levelId);
        expressionNode.setAttribute("op", '<>');
        expressionNode.setAttribute("type", "bcdCubeExclude_"+cubeId);
        expressionNode.setAttribute("exclBRef", args.levelId);
      }
      // To exclude a value, we say "<> the value" but do explicitly allow null, otherwise they disappear as well
      else {
        var filterNode = bcdui.core.createElementWithPrototype( bcdui.factory.objectRegistry.getObject(targetModelId), "/*/f:Filter");
        var orNode = bcdui.core.browserCompatibility.appendElementWithPrefix(filterNode, "f:Or");
        orNode.setAttribute("type", "bcdCubeExclude_"+cubeId);
        orNode.setAttribute("exclBRef", args.levelId);
        var expressionNode = bcdui.core.browserCompatibility.appendElementWithPrefix(orNode, "f:Expression");
        expressionNode.setAttribute("bRef", args.levelId);
        expressionNode.setAttribute("op", '<>');
        expressionNode.setAttribute("value", value);
        if (caption)
          expressionNode.setAttribute("caption", caption);
        expressionNode = bcdui.core.browserCompatibility.appendElementWithPrefix(orNode, "f:Expression");
        expressionNode.setAttribute("bRef", args.levelId);
        expressionNode.setAttribute("op", '=');
      }
    }
    //-------------------------------------------
    // Otherwise, we need to include the more outer levels into the filter
    else {
      var dataModel = bcdui.factory.objectRegistry.getObject(cubeId).getPrimaryModel();
      var filterNode = bcdui.core.createElementWithPrototype( bcdui.factory.objectRegistry.getObject(targetModelId), "/*/f:Filter");
      var orNode = bcdui.core.browserCompatibility.appendElementWithPrefix(filterNode, "f:Or");
      orNode.setAttribute("type", "bcdCubeExclude_"+cubeId);
      orNode.setAttribute("exclBRef", args.levelId);
      if( args.isColDim ) {
        // Take care for col dimensions
        var colDimLevelIds = dataModel.getData().selectSingleNode("/wrs:Wrs/wrs:Header/wrs:Columns/@colDimLevelIds").nodeValue.split("|");
        var colDims = bcdui.wkModels.bcdColIdent.value.split("|");
        var captionNode = dataModel.getData().selectSingleNode("/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[@id='" + bcdui.wkModels.bcdColIdent.value + "']/@caption");
        for( var l=0; l<colDimLevelIds.length; l++) { // making the level itself and more outer levels part of the decision
          var expressionNode = bcdui.core.browserCompatibility.appendElementWithPrefix(orNode, "f:Expression");
          expressionNode.setAttribute("bRef", colDimLevelIds[l]);
          expressionNode.setAttribute("op", '!=');
          if(colDims[l]!="0")
            expressionNode.setAttribute("value", colDims[l]);
          if (captionNode != null) {
            var caption = captionNode.text.split("|");
            expressionNode.setAttribute("caption", caption[l]);
          }
          // To exclude a value, we say "<> the value" but do explicitly allow null, otherwise they disappear as well
          // Exception, if we should include null (value==null), we do not allow null
          if(colDims[l]!="0") {
            expressionNode = bcdui.core.browserCompatibility.appendElementWithPrefix(orNode, "f:Expression");
            expressionNode.setAttribute("bRef", colDimLevelIds[l]);
            expressionNode.setAttribute("op", '=');
          }
          // Ignore more inner levels
          if( colDimLevelIds[l]==args.levelId )
            break;
        }
      } else {
        // Take care for row dimensions
        var row = dataModel.getData().selectSingleNode("/wrs:Wrs/wrs:Data/wrs:R[@id='"+bcdui.wkModels.bcdRowIdent.value+"']");
        var rowDims = dataModel.getData().selectNodes("/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[@dimId]");
        for( var l=0; l<rowDims.length; l++) { // making the level itself and more outer level part of the decision
          var expressionNode = bcdui.core.browserCompatibility.appendElementWithPrefix(orNode, "f:Expression");
          expressionNode.setAttribute("bRef", rowDims.item(l).getAttribute("id") );
          expressionNode.setAttribute("op", '!=');
          value = row.selectSingleNode("wrs:C["+(l+1)+"]").text;
          expressionNode.setAttribute("value", value);
          if (row.selectSingleNode("wrs:C["+(l+1)+"]/@caption") != null)
            expressionNode.setAttribute("caption", row.selectSingleNode("wrs:C["+(l+1)+"]/@caption").text);
          // To exclude a value, we say "<> the value" but do explicitly allow null, otherwise they disappear as well
          // Exception, if we should include null (value==null), we do not allow null
          if(!!value.trim()) {
            expressionNode = bcdui.core.browserCompatibility.appendElementWithPrefix(orNode, "f:Expression");
            expressionNode.setAttribute("bRef", rowDims.item(l).getAttribute("id") );
            expressionNode.setAttribute("op", '=');
          }
          // Ignore more inner levels
          if( rowDims.item(l).getAttribute("id")==args.levelId )
            break;
        }
      }
    }
    return true;
  },

  /**
   * Internal helper to the one dim member value and caption for exclude and hide matching the clicked header row
   * @private
   */
  _getDimMemberValueAndCaption: function(targetModelId, cubeId, args)
  {
    var value = null;
    var caption = null;

    var dataModel = bcdui.factory.objectRegistry.getObject(cubeId).getPrimaryModel();
    if( args.isColDim ) {
      // If we have to hide a col dim, we get the value (id) from the pipe delimited bcdColIdent
      var colDimLevelIds = dataModel.getData().selectSingleNode("/wrs:Wrs/wrs:Header/wrs:Columns/@colDimLevelIds").nodeValue.split("|");
      var captionNode = dataModel.getData().selectSingleNode("/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[@id='" + bcdui.wkModels.bcdColIdent.value + "']/@caption");

      for( var l=0; l<colDimLevelIds.length; l++) { // search for the right level l
        if(colDimLevelIds[l]==args.levelId)
          break;
      }
      if(l<colDimLevelIds.length) {
        if (captionNode != null)
          caption = captionNode.text.split("|")[l];
        value = bcdui.wkModels.bcdColIdent.value.split("|")[l];
      }
    } else {
      // If we have to hide a row dim, we get the value (id) from the Wrs
      var row = dataModel.getData().selectSingleNode("/wrs:Wrs/wrs:Data/wrs:R[@id='"+bcdui.wkModels.bcdRowIdent.value+"']");
      var colPos = dataModel.getData().selectSingleNode("/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[@id='"+args.levelId+"']/@pos").nodeValue;
      value = row.selectSingleNode("wrs:C["+colPos+"]").text;

      if (row.selectSingleNode("wrs:C["+colPos+"]/@caption") != null)
        caption = row.selectSingleNode("wrs:C["+colPos+"]/@caption").text;

      if( "1"==row.selectSingleNode("wrs:C["+colPos+"]").getAttribute("bcdGr") )
        value = "1";
      else if(value=="")
        value = "0";
    }
    return {value: value, caption: caption};
  },

  /**
   * Helper
   * @private
   */
  _getMeasureId: function(ident){
    var rowIdent = bcdui.factory.objectRegistry.getObject(ident).value;
    if (rowIdent != null && rowIdent != ""){
      var posPipe = rowIdent.lastIndexOf('|');
      if (posPipe > 0){
        return rowIdent.slice(posPipe+1);
      }else{
        return rowIdent;
      }
    }
    return null;
  },
  /**
   * Helper
   * @private
   */
  _getDimensionId: function(ident){
    var rowIdent = bcdui.factory.objectRegistry.getObject(ident).value;
    if (rowIdent != null && rowIdent != ""){
      var posPipe = rowIdent.indexOf('|');
      if (posPipe > 0){
        return rowIdent.slice(0, posPipe);
      }else{
        return rowIdent;
      }
    }
    return null;
  },
  /**
   * sets an attribute in cube:layout dimension or measure identified by id to given value
   * if the value == null the attribute will be removed, this is for clear sorting i.e.
   * @private
   * @param htmlElement
   * @param isDimension
   * @param idRef
   * @param attributeName
   * @param attributeValue
   */
  _setCubeItemAttribute: function( targetModelId, cubeId, isDimension, attribute, value , levelId )
  {
     var idRef =  levelId || bcdui.component.cube.configurator._getMeasureId("bcdColIdent");
     bcdui.component.cube.configurator._setCubeItemAttributeIdRef( targetModelId, cubeId, idRef, isDimension, attribute, value);
  },

  /**
   * @private
   */
  _setCubeItemAttributeIdRef: function( targetModelId, cubeId, idRef, isDimension, attribute, value )
  {
    var xpath;
    if ( isDimension ){
      xpath = "/*/cube:Layout[@cubeId ='"+ cubeId +"']/cube:Dimensions/*/dm:LevelRef[@bRef = '"+ idRef + "']";
    }else{
      xpath = "/*/cube:Layout[@cubeId ='"+ cubeId +"']/cube:Measures/*/*[(self::dm:MeasureRef and (@idRef = '"+idRef+"' or @bRef = '"+idRef+"')) or (self::dm:Measure and @id = '"+idRef+"')]";
    }
    var node = bcdui.factory.objectRegistry.getObject( targetModelId).getData().selectSingleNode(xpath);
    if (node){
      if (value != null){
        node.setAttribute(attribute, value);
      }else{
        node.removeAttribute(attribute);
      }
    }
    else {
      bcdui.log.isDebugEnabled() && bcdui.log.debug(xpath + " not found in " + targetModelId );
    }
  },

  /**
   * returns unique @id attribute for targetModelXPath
   * @private
   * */
  _getUniqueMeasureId: function(cubeId, targetModelId){
    var targetModelXPath = "/*/cube:Layout[@cubeId ='"+ cubeId +"']/cube:Measures/*/dm:Measure";
    for (var i = 0; i < 100; i++) {
      var tmpId = "m_calc_" + i;
      if (bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectSingleNode(targetModelXPath + "[@id='" + tmpId + "']") == null)
        return tmpId;
    }
  },

  /**
   * returns unique @id attribute for targetModelXPath
   * @private
   * */
  _getUniqueDimCalcId: function(cubeId, targetModelId, targetModelXPath){
    targetModelXPath = "/*/cube:Layout[@cubeId ='"+ cubeId +"']/cube:Dimensions/*/dm:LevelRef/cube:VDM";
    for (var i = 0; i < 100; i++) {
      var tmpId = "d_calc_" + i;
      if (bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectSingleNode(targetModelXPath + "[@id='" + tmpId + "']") == null)
        return tmpId;
    }
  },

  /**
   * Adding row measure for cube (opening calcNode editor and put formula to cube model)
   * @private
   * @param cubeId
   * @param targetModelId
   * @param targetModelXpath
   */
  _addMeasure: function( cubeId, targetModelId, targetModelXPath, dialogCaption, isEditMode){
    // preparing variablesModel

    var cubeBucketModelId = jQuery(".bcd_" + cubeId + "_dnd").data("cubeBucketModelId") || targetModelId;

    var tempOptionsModel = bcdui.factory.objectRegistry.getObject(bcdui.factory.createStaticModel( {
      id: "temp_opt_model_" + (new Date()).valueOf(),
      data: "<Root><Options></Options></Root>"
    }));

    // build up autocompletion options
    var nodes = null;
    var e = tempOptionsModel.getData().selectSingleNode("//Options");

    // add measurerefs
    bcdui.core.createElementWithPrototype(e, "Option[@bcdSeparator='true' and @value='' and @caption='------ Measures ------']");
    nodes = bcdui.factory.objectRegistry.getObject(cubeBucketModelId).getData().selectNodes("/*//cube:Measures//dm:MeasureRef");
    var metaDataModel = bcdui.factory.objectRegistry.getObject(cubeId).getConfigModel();
    var serverAggrs = [];
    jQuery.each(bcdui.widget.formulaEditor.Parser.op_info, function(eachIdx, eachValue){ if(eachValue.isAgg) serverAggrs.push(eachValue.opName);} )
    for (var j = 0; j < nodes.length; j++){
      var node = nodes[j];
      var value = node.getAttribute("idRef");
      if (value == null)
        value = node.getAttribute("bRef") || "";
      var caption = node.getAttribute("caption") || "";
      if (caption == "")
        caption = metaDataModel.read("/*/dm:Measures/dm:Measure[@id='" + value + "']/@caption", "");

      // To prevent user calc editor from creating nested aggregations, we need to find out whether a measure itself is already containing an aggregation
      var wrqNodes = metaDataModel.getData().selectNodes("/*/dm:Measures/dm:Measure[@id='"+value+"']/*[local-name()='Calc']//wrq:*");
      var containsAgg = "false";
      jQuery.each(wrqNodes, function( eachIdx, eachValue ) { if(jQuery.inArray((eachValue.localName||eachValue.baseName),serverAggrs)) containsAgg = "true"; } );

      bcdui.core.createElementWithPrototype(e, "Option[@value='" + value.replace(/"/g,'&quote;').replace(/'/g,"&#39;") + "' and @caption='" + caption.replace(/"/g,'&quote;').replace(/'/g,"&#39;") + "' and @type-name='NUMERIC' and @containsAgg='"+containsAgg+"']");

      var subTotalCaption = bcdui.wkModels.bcdI18nModel.getData().getElementsByTagName("bcd_SubTotal").length > 0 ? bcdui.wkModels.bcdI18nModel.getData().getElementsByTagName("bcd_SubTotal")[0].text : "(subTotal)";
      var totalCaption = bcdui.wkModels.bcdI18nModel.getData().getElementsByTagName("bcd_Total").length > 0 ? bcdui.wkModels.bcdI18nModel.getData().getElementsByTagName("bcd_Total")[0].text : "(total)";

      // add special options for total and subtotal
      // it's special char followed by 1 or 2 (subtotal, total) PIPE referenced measure id PIPE C or R (column total or row total)
      bcdui.core.createElementWithPrototype(e, "Option[@value='"+bcdui.core.magicChar.measureSTC+"|" + value.replace(/"/g,'&quote;').replace(/'/g,"&#39;") + "' and @caption='" + caption.replace(/"/g,'&quote;').replace(/'/g,"&#39;") + " [SubTotalOfCol]' and @type-name='NUMERIC' and @containsAgg='true']");
      bcdui.core.createElementWithPrototype(e, "Option[@value='"+bcdui.core.magicChar.measureGTC+"|" + value.replace(/"/g,'&quote;').replace(/'/g,"&#39;") + "' and @caption='" + caption.replace(/"/g,'&quote;').replace(/'/g,"&#39;") + " [TotalOfCol]' and @type-name='NUMERIC' and @containsAgg='true']");
      bcdui.core.createElementWithPrototype(e, "Option[@value='"+bcdui.core.magicChar.measureSTR+"|" + value.replace(/"/g,'&quote;').replace(/'/g,"&#39;") + "' and @caption='" + caption.replace(/"/g,'&quote;').replace(/'/g,"&#39;") + " [SubTotalOfRow]' and @type-name='NUMERIC' and @containsAgg='true']");
      bcdui.core.createElementWithPrototype(e, "Option[@value='"+bcdui.core.magicChar.measureGTR+"|" + value.replace(/"/g,'&quote;').replace(/'/g,"&#39;") + "' and @caption='" + caption.replace(/"/g,'&quote;').replace(/'/g,"&#39;") + " [TotalOfRow]' and @type-name='NUMERIC' and @containsAgg='true']");
    }

    // add dimensions
    bcdui.core.createElementWithPrototype(e, "Option[@bcdSeparator='true' and @value='' and @caption='------ Dimensions ------']");
    nodes = bcdui.factory.objectRegistry.getObject(cubeBucketModelId).getData().selectNodes("/*//cube:Dimensions//dm:LevelRef");
    for (var j = 0; j < nodes.length; j++){
      var node = nodes[j];
      var value = node.getAttribute("bRef") || "";
      var caption = node.getAttribute("caption") || "";
      if (caption == "")
        caption = metaDataModel.read("/*/dm:Dimensions/dm:LevelRef[@bRef='" + value + "']/@caption", "");
      bcdui.core.createElementWithPrototype(e, "Option[@value='" + value.replace(/"/g,'&quote;').replace(/'/g,"&#39;") + "' and @caption='" + caption.replace(/"/g,'&quote;').replace(/'/g,"&#39;") + "' and @type-name='VARCHAR']");
    }
    var optionsModelXpath = "$" + tempOptionsModel.id + "//Root/Options/Option/@caption";
    var optionsModelRelativeValueXPath = "../@value";

    // Preparing temp target model
    var elem = bcdui.core.createElementWithPrototype(bcdui.factory.objectRegistry.getObject(targetModelId).getData().cloneNode(true), targetModelXPath);

    if (elem.selectSingleNode("./calc:Calc") == null)
      bcdui.core.createElementWithPrototype(elem, "/calc:Calc");
    var tempModel = bcdui.factory.createStaticModel( {
      id: "temp_cube_model_" + (new Date()).valueOf(),
      data: "<Root>" + (elem != null ? new XMLSerializer().serializeToString(elem) : "<Model></Model>") + "</Root>"
    });
    var uniqueOptionsModelXpath = '/cube:CubeConfiguration//dm:Measure/@caption';
    var tempTargetModelXPath = "/Root/*";
    bcdui.component.userCalcEditor.showUserCalcEditor({
        targetModelXPath: "$" + bcdui.factory.objectRegistry.getObject(tempModel).id + tempTargetModelXPath
      , optionsModelXPath: optionsModelXpath
      , optionsModelRelativeValueXPath: optionsModelRelativeValueXPath
      , uniqueOptionsModelXpath:  uniqueOptionsModelXpath
      , dialogCaption: dialogCaption
      , isFormatOptionsVisible : true
      , isEditMode: isEditMode
      , skipServerSidedFunctions: false
      , successCallBack: function(){

        var generatedNodes = bcdui.factory.objectRegistry.getObject(tempModel).getData().selectSingleNode(tempTargetModelXPath);
        bcdui.component.cube.configurator._putCalcNodeToModel(generatedNodes, targetModelId, targetModelXPath);

        // inform statusModel about change
        var statusModelId = bcdui.factory.objectRegistry.getObject(cubeId).statusModel.id;
        if (statusModelId != targetModelId)
          bcdui.component.cube.configurator._putCalcNodeToModel(generatedNodes, statusModelId, targetModelXPath);

        
        var reDisplayId = jQuery("#" + cubeId + "_dnd").data("targetModelId");
        var guiStatusFired = false;

        // eventually disable cube
        if (bcdui.component.cube.configurator._checkIsDirty(cubeId, generatedNodes, targetModelId)) {
          var layoutNode = bcdui.core.createElementWithPrototype( bcdui.wkModels.guiStatus, "/*/guiStatus:ClientSettings/cube:ClientLayout[@cubeId ='"+ cubeId+"']" );
          layoutNode.setAttribute("disableClientRefresh","true");
          if ("guiStatus" != reDisplayId) { // don't fire twice eventually
            bcdui.wkModels.guiStatus.fire();
            guiStatusFired = true;
          }
        }

        // fire status/target (avoid identical models to get fired twice)
        if (targetModelId != reDisplayId) {
          if (targetModelId != "guiStatus" || (targetModelId == "guiStatus" && ! guiStatusFired))
            bcdui.factory.objectRegistry.getObject(targetModelId).fire();
        }
        if (statusModelId != reDisplayId && statusModelId != targetModelId) {
          if (statusModelId != "guiStatus" || (statusModelId == "guiStatus" && ! guiStatusFired))
            bcdui.factory.objectRegistry.getObject(statusModelId).fire();
        }

        // redisplay cube
        bcdui.component.cube.configuratorDND.reDisplay(cubeId); // this fires reDisplayId
      }
    });
  },

  /**
   * checking isDirty flag for formula
   * if existing ValueRef node with ref to node not presented in layout
   * @param cubeId
   * @param nodes - generated xml nodes
   * @param targetModelId
   * @private
   */
  _checkIsDirty: function( cubeId, nodes, targetModelId){

    if (nodes == null) return false;

    var targetModel = bcdui.factory.objectRegistry.getObject(targetModelId);
    var metaDataModel = bcdui.factory.objectRegistry.getObject(cubeId).getConfigModel();
    var layoutModelXPath = "/*/cube:Layout[@cubeId ='"+ cubeId +"']/cube:Measures/";
    var layoutNodes = nodes.selectNodes("//*/calc:ValueRef");
    for (var i = 0; i < layoutNodes.length; i++){
      var idRef = layoutNodes[i].getAttribute("idRef");
      if (idRef != null){
        // in case of a 'total' we look for the idRef stored behind the pipe
        if (idRef.indexOf('') != -1)
          idRef = idRef.substring(idRef.indexOf('|') + 1);
        var refNode = targetModel.getData().selectSingleNode(layoutModelXPath + "*/*[@idRef='" + idRef + "']");
        if (refNode == null)
          return true;
        // check if referenced measure is server sided
        else if (metaDataModel.getData().selectSingleNode("/*/dm:Measures/dm:Measure[@id='" + idRef + "']//wrq:*") != null)
          return true;
      }
    }

    // check if a calc with a server sided measure was added, if yes, we need to hit apply
    var measureId = nodes.getAttribute("id");
    return (targetModel.getData().selectSingleNode(layoutModelXPath + "*/dm:Measure[@id='" + measureId + "']//wrq:*") != null);
  },

  /**
   * adds generated calc nodes to model
   * @param nodes - generated xml nodes
   * @param targetModelId
   * @param targetModelXPath
   * @private
   */
  _putCalcNodeToModel: function(nodes, targetModelId, targetModelXPath){
    var targetModel = bcdui.factory.objectRegistry.getObject(targetModelId);
    var elem = bcdui.core.createElementWithPrototype(targetModel.getData(), targetModelXPath);
    var e = elem.parentNode;
    e.removeChild(elem);
    e.appendChild(nodes.cloneNode(true));
  },

  /**
   * adding row measure for cube (opening calcNode editor and put formula to cube model)
   * @param targetModelId
   * @param cubeId
   * @param args \{ row, col \}
   */
  addRowMeasure: function( targetModelId, cubeId, args ){
    // getting unique identifier for new measure
    var targetModelXPath = "/*/cube:Layout[@cubeId ='"+ cubeId +"']/cube:Measures/cube:RowDims/dm:Measure";
    var measureId = bcdui.component.cube.configurator._getUniqueMeasureId(cubeId, targetModelId);
    // Preparing target model xPath
    targetModelXPath += "[@id='" + measureId + "']";
    bcdui.component.cube.configurator._addMeasure(cubeId, targetModelId, targetModelXPath, 'Add a measure depending on row dimensions only', false);
    return false;
  },

  /**
   * adding column measure for cube (opening calcNode editor and put formula to cube model)
   * @param targetModelId
   * @param cubeId
   * @param args \{ row, col \}
   */
  addColumnMeasure: function( targetModelId, cubeId, args ){
    // getting unique identifier for new column
    var targetModelXPath = "/*/cube:Layout[@cubeId ='"+ cubeId +"']/cube:Measures/cube:AllDims/dm:Measure";
    var measureId = bcdui.component.cube.configurator._getUniqueMeasureId(cubeId, targetModelId);
    // Preparing target model xPath
    targetModelXPath += "[@id='" + measureId + "']";
    bcdui.component.cube.configurator._addMeasure(cubeId, targetModelId, targetModelXPath, 'Add a measure depending all dimensions', false);
    return false;
  },

  /**
   * opening calcNode editor for edit current formula
   * @param targetModelId
   * @param cubeId
   * @param args { calcId }
   */
  editUserMeasure: function( targetModelId, cubeId, args ){
    var targetModelXPath = "/*/cube:Layout[@cubeId ='"+ cubeId +"']/cube:Measures/*/dm:Measure[@id='" + args.calcId + "']";
    bcdui.component.cube.configurator._addMeasure(cubeId, targetModelId, targetModelXPath, 'Modify calculation', true);
    return false;
  },

  /**
   * deleting userCalc node from measures
   * @param targetModelId
   * @param cubeId
   * @param args { calcId }
   */
  deleteUserMeasure: function( targetModelId, cubeId, args ){
    var xPath = "/*/cube:Layout[@cubeId ='"+ cubeId +"']/cube:Measures/*/dm:Measure[@id='" + args.calcId + "']";
    var node = bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectSingleNode(xPath);
    if (node)
      node.parentNode.removeChild(node);
    return true;
  }
  
});
