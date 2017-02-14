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
/**
 * @namespace bcdui.component.scorecard.configuratorDND
 */
bcdui.util.namespace("bcdui.component.scorecard.configuratorDND",
/** @lends bcdui.component.scorecard.configuratorDND */
{
  /**
   * @private
   */
  _SCORECARD_TEMP : {
      xPathRootWidget : "/*/WidgetTarget"
    , xPathRootLayout : "/*/TempLayout"
  },

  /**
   * @private
   */
  _DND_OBJECTS: [
      { parent: "scc:Dimensions/scc:Rows", fullConfigItem: "dm:Dimensions/dm:LevelRef", fullBucketItem: "scc:Dimensions/dm:LevelRef", bucketParent: "scc:Dimensions", bucketItem:"dm:LevelRef", bucketId:"bRef", configId:"bRef", generator: undefined, dndObject: "RowDimensions", kpiObject: "scc:LevelKpi"}
    , { parent: "scc:KpiRefs", fullConfigItem: "scc:KpiRefs/scc:KpiRef", fullBucketItem: "scc:KpiRefs/scc:KpiRef", bucketParent: "scc:KpiRefs", bucketItem: "scc:KpiRef", bucketId: "idRef", configId: "id", dndObject: "Kpis", generator: "scc:Kpis/scc:Kpi", kpiObject: undefined}
    , { parent: "scc:AspectRefs", fullConfigItem: "scc:AspectRefs/scc:AspectRef", fullBucketItem: "scc:AspectRefs/scc:AspectRef", bucketParent: "scc:AspectRefs", bucketItem: "scc:AspectRef", bucketId: "idRef", configId: "id", dndObject: "Aspects", generator: "scc:Aspects/scc:Aspect", kpiObject: "scc:AspectKpi", includeDefault: true}
    , { parent: "scc:CategoryTypeRefs", fullConfigItem: "scc:CategoryTypeRefs/scc:CategoryTypeRef", fullBucketItem: "scc:CategoryTypeRefs/scc:CategoryTypeRef", bucketParent: "scc:CategoryTypeRefs", bucketItem: "scc:CategoryTypeRef", bucketId: "idRef", configId: "id", dndObject: "Categories", generator: "scc:CategoryTypes/scc:CategoryType", kpiObject: undefined}
  ],

  init : function(args) {

    // let's create our bucket model to hold the dnd master data
    var scBucketModelId = args.scorecardId + "_bcd_dnd" + "_scorecard_bucket";

    // at least create the root node for clientRefresh Handling
    bcdui.core.createElementWithPrototype( bcdui.wkModels.guiStatus, "/*/guiStatus:ClientSettings/scc:ClientLayout[@scorecardId ='"+ args.scorecardId+"']" );

    bcdui.factory.createStaticModel({
      id: scBucketModelId,
      data: '<Root xmlns="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0" xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0" xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0" xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0" xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0" xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0" xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0" xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"></Root>'
    });
    bcdui.factory.objectRegistry.getObject(scBucketModelId).execute(); // we're static, we're synchron...

    var defAspectModel = bcdui.factory.objectRegistry.getObject("bcdDefAspects_" + args.scorecardId); 
    
    bcdui.component.scorecard.configuratorDND.fillBucketModel(scBucketModelId, args.metaDataModelId, defAspectModel);

    // and initialize controls
    var scTargetId = scBucketModelId;
    var scTargetXPathRoot = bcdui.component.scorecard.configuratorDND._SCORECARD_TEMP.xPathRootWidget;

    // add category checkbox if we got categories (and a place to put the checkbox)
    if (bcdui.factory.objectRegistry.getObject(scBucketModelId).queryNodes("/*/scc:CategoryTypeRefs/scc:CategoryTypeRef").length > 0
        && jQuery("#" + args.targetHtml + " .bcdDNDCategory").length > 0) {
      bcdui.widgetNg.createCheckbox({targetHtml: "#" + args.targetHtml + " .bcdDNDCategory > span", targetModelXPath: "$" + scTargetId + scTargetXPathRoot + "/Category"});
      jQuery("#" + args.targetHtml + " .bcdDNDCategory").show();
    }

    // remember bucket and targetModelId for refresh function
    jQuery("#" + args.targetHtml).addClass("bcd_"+ args.scorecardId + "_dnd");
    jQuery("#" + args.targetHtml).attr("bcdScorecardId", args.scorecardId);
    jQuery(".bcd_" + args.scorecardId + "_dnd").data("targetModelId", args.targetModelId);
    jQuery(".bcd_" + args.scorecardId + "_dnd").data("scBucketModelId", scBucketModelId);

    // initially transform scorecard layout into in-between-model for connectables
    bcdui.component.scorecard.configuratorDND._scorecardLayoutToControlModel(args.scorecardId);

    var inputArgs = {
      optionsModelXPath: "$" + scBucketModelId + "/*/scc:Dimensions/dm:LevelRef/@caption"
    , optionsModelRelativeValueXPath: "../@bRef"
    , targetHtml: "#" + args.targetHtml + " .bcdScDimensionList"
    , scope: args.scorecardId + "_dims"
    , unselectAfterMove: true
    , generateItemHtml: "bcdui.component.scorecard.configuratorDND._itemRenderer"
    };
    bcdui.widgetNg.createConnectable(inputArgs);
    var inputArgs = {
      targetHtml: "#" + args.targetHtml + " .bcdCurrentScRowDimensionList"
    , targetModelXPath: "$" + scTargetId + scTargetXPathRoot + "/RowDimensions/@id"
    , isDoubleClickTarget: true
    , scope: args.scorecardId + "_dims"
    , unselectAfterMove: true
    , generateItemHtml: "bcdui.component.scorecard.configuratorDND._itemRenderer"
    };
    bcdui.widgetNg.createConnectable(inputArgs);


    var inputArgs = {
      optionsModelXPath: "$" + scBucketModelId + "/*/scc:KpiRefs/scc:KpiRef/@caption"
    , optionsModelRelativeValueXPath: "../@idRef"
    , targetHtml: "#" + args.targetHtml + " .bcdKpiList"
    , scope: args.scorecardId + "_kpi"
    , unselectAfterMove: true
    };
    bcdui.widgetNg.createConnectable(inputArgs);
    var inputArgs = {
      targetHtml: "#" + args.targetHtml + " .bcdCurrentKpiList"
    , targetModelXPath: "$" + scTargetId + scTargetXPathRoot + "/Kpis/@id"
    , isDoubleClickTarget: true
    , scope: args.scorecardId + "_kpi"
    , unselectAfterMove: true
    };
    bcdui.widgetNg.createConnectable(inputArgs);


    var inputArgs = {
      optionsModelXPath: "$" + scBucketModelId + "/*/scc:AspectRefs/scc:AspectRef/@caption"
    , optionsModelRelativeValueXPath: "../@idRef"
    , targetHtml: "#" + args.targetHtml + " .bcdAspectList"
    , scope: args.scorecardId + "_asp"
    , unselectAfterMove: true
    , generateItemHtml: "bcdui.component.scorecard.configuratorDND._itemRenderer"
    };
    bcdui.widgetNg.createConnectable(inputArgs);
    var inputArgs = {
      targetHtml: "#" + args.targetHtml + " .bcdCurrentAspectList"
    , targetModelXPath: "$" + scTargetId + scTargetXPathRoot + "/Aspects/@id"
    , isDoubleClickTarget: true
    , scope: args.scorecardId + "_asp"
    , unselectAfterMove: true
    , generateItemHtml: "bcdui.component.scorecard.configuratorDND._itemRenderer"
    };
    bcdui.widgetNg.createConnectable(inputArgs);


    // and our listener to generate the layout on any control layout change
    bcdui.factory.addDataListener({
      idRef: scTargetId,
      trackingXPath: scTargetXPathRoot,
      listener: function() {
        
        // check if target model really changed
        var scBucketModelId = jQuery(".bcd_" + args.scorecardId + "_dnd").data("scBucketModelId");
        var scLayoutRoot = "/scc:Layout[@scorecardId='" + args.scorecardId + "']";
        var scTargetXPathRoot = bcdui.component.scorecard.configuratorDND._SCORECARD_TEMP.xPathRootWidget;
        var targetModel = bcdui.factory.objectRegistry.getObject(jQuery(".bcd_" + args.scorecardId + "_dnd").data("targetModelId"));
        var scTargetModel = bcdui.factory.objectRegistry.getObject(scBucketModelId);
        var scBucketModel = bcdui.factory.objectRegistry.getObject(scBucketModelId);
        var idArray = new Array();
        var idArrayTarget = new Array();

        // category checkbox handling, either copy all or remove all categories
        bcdui.core.removeXPath(scTargetModel.getData(), scTargetXPathRoot + "/Categories");
        if (scTargetModel.read(scTargetXPathRoot + "/Category", "0") == "1") {
          jQuery.makeArray(scBucketModel.queryNodes("//scc:CategoryTypeRef")).forEach(function(e) {
            bcdui.core.createElementWithPrototype(scTargetModel.getData(), scTargetXPathRoot + "/Categories[@id='" + e.getAttribute("idRef")+"']");
          });
        };

        // target layout item with parent, bucket item with parent, item identifier, connectable item
         bcdui.component.scorecard.configuratorDND._DND_OBJECTS.forEach(function(o) {
           jQuery.makeArray(targetModel.queryNodes("/*" + scLayoutRoot + "/" + o.parent + "/*")).forEach(function(i) {
            var id = i.getAttribute(o.bucketId);
            if (i.nodeName == o.kpiObject)
              idArray.push("bcdKpi");
            else if (scBucketModel.query("/*/" + o.fullBucketItem + "[@" + o.bucketId + "='" + id + "']") != null)
              idArray.push(id);
          });
          jQuery.makeArray(scTargetModel.queryNodes(scTargetXPathRoot + "/" + o.dndObject + "/@id")).forEach(function(i){
            idArrayTarget.push(i.text);
          });
        });

        // so we compare the dnd area internal with the external representation model (on idRef value level and order)
        var i = 0;
        var identical = idArrayTarget.length == idArray.length  // we only need to continue if we got the same amount of values;
        while (identical && i < idArray.length) {
          identical &= idArray[i] == idArrayTarget[i]  // also compare the order/values themsel;
          i++;
        }

        // only recreate layout if something in the target changed
        if (! identical) {
          // disable scorecard renderer on any change
          var layoutNode = bcdui.core.createElementWithPrototype( bcdui.wkModels.guiStatus, "/*/guiStatus:ClientSettings/scc:ClientLayout[@scorecardId ='"+ args.scorecardId+"']" );
          layoutNode.setAttribute("disableClientRefresh","true");
          // and generate layout
          bcdui.component.scorecard.configuratorDND._controlModelToScorecardLayout(args.scorecardId);
        }
      }
    });

    return scBucketModelId;
  },

  /**
   * convert internal layout data to (guiStatus) scc:Layout
   * @private
   */
  _controlModelToScorecardLayout : function(scorecardId) {
    var scBucketModelId = jQuery(".bcd_" + scorecardId + "_dnd").data("scBucketModelId");
    var scBucketModel = bcdui.factory.objectRegistry.getObject(scBucketModelId);

    var scTargetId = scBucketModelId;
    var scTargetXPathRoot = bcdui.component.scorecard.configuratorDND._SCORECARD_TEMP.xPathRootWidget;
    var scTargetModel = bcdui.factory.objectRegistry.getObject(scTargetId);

    var tempModelId = scBucketModelId;
    var tempModelXPathRoot = bcdui.component.scorecard.configuratorDND._SCORECARD_TEMP.xPathRootLayout;
    var tempModel = bcdui.factory.objectRegistry.getObject(tempModelId);

    var targetModelId = jQuery(".bcd_" + scorecardId + "_dnd").data("targetModelId");
    var targetModel = bcdui.factory.objectRegistry.getObject(targetModelId);

    var scLayoutRoot = "/scc:Layout[@scorecardId='" + scorecardId + "']";
    
    // clean temporary layout first
    tempModel.remove(tempModelXPathRoot + scLayoutRoot);

    var destination = tempModel.write(tempModelXPathRoot);
    //copy source layout to temp if it exists
    var source = bcdui.factory.objectRegistry.getObject(targetModelId).getData().selectSingleNode("/*" + scLayoutRoot);
    if (source != null)
      destination.appendChild(source.cloneNode(true));

    // only keep a skeleton of parent nodes
    tempModel.remove(tempModelXPathRoot + scLayoutRoot + "/*/*");

    // now insert kpiRefs, aspectRefs, etc into temp layout based on ordering from collectable targets
    bcdui.component.scorecard.configuratorDND._DND_OBJECTS.forEach(function(o) {
     jQuery.makeArray(scTargetModel.queryNodes(scTargetXPathRoot + "/" + o.dndObject + "/@id")).forEach(function(i) {
       var item  = targetModel.query("/*" + scLayoutRoot + "/" + o.parent + "/" + o.bucketItem + "[@" + o.bucketId + "='" + i.text + "']");
       item = item != null ? item : scBucketModel.query("/*/" + o.fullBucketItem + "[@" + o.bucketId + "='" + i.text + "']");
       if (item != null) {
         var destination = tempModel.query(tempModelXPathRoot + scLayoutRoot + "/" + o.parent);
         // if destination does not yet exist, create it
         destination = destination != null ? destination : tempModel.write(tempModelXPathRoot + scLayoutRoot + "/" + o.parent);
         // special translation for kpi related notes
         if (item.getAttribute(o.bucketId) == "bcdKpi")
           tempModel.write(tempModelXPathRoot + scLayoutRoot + "/" + o.parent + "/" + o.kpiObject);
         else
           destination.appendChild(item.cloneNode(true));
       }
     });
   });

    // force triggering other scTargetId listeners by cleaning and rebuilding layout
    targetModel.remove("/*" + scLayoutRoot);
    var source = tempModel.query(tempModelXPathRoot + scLayoutRoot);
    source = source != null ? source : tempModel.write(tempModelXPathRoot + scLayoutRoot);
    var destination = targetModel.query("/*");
    destination.appendChild(source.cloneNode(true));
    tempModel.fire();
    targetModel.fire();
  },
  
  /**
   * convert (guiStatus) scc:Layout to internal layout data
   * @private
   */
  _scorecardLayoutToControlModel : function(scorecardId) {

    var scLayoutRoot = "/scc:Layout[@scorecardId='" + scorecardId + "']";
    var scTargetXPathRoot = bcdui.component.scorecard.configuratorDND._SCORECARD_TEMP.xPathRootWidget;

    var scBucketModelId = jQuery(".bcd_" + scorecardId + "_dnd").data("scBucketModelId");
    var scTargetId = scBucketModelId;
    
    var targetModel = bcdui.factory.objectRegistry.getObject(jQuery(".bcd_" + scorecardId + "_dnd").data("targetModelId"));
    var scBucketModel = bcdui.factory.objectRegistry.getObject(scBucketModelId);
    var scTargetModel = bcdui.factory.objectRegistry.getObject(scTargetId);

    // transform target model data to in-between model
    scTargetModel.remove(scTargetXPathRoot);

    bcdui.component.scorecard.configuratorDND._DND_OBJECTS.forEach(function(o) {
      jQuery.makeArray(targetModel.queryNodes("/*" + scLayoutRoot + "/" + o.parent + "/*")).forEach(function(i){
        var id = i.getAttribute(o.bucketId);
        // generate entry as long as it is part of the bucket
        if (scBucketModel.query("/*/" + o.fullBucketItem + "[@" + o.bucketId + "='" + id + "']") != null)
          scTargetModel.write(scTargetXPathRoot + "/" + o.dndObject + "[@id='" + id + "']");
        // special translation for kpi related notes
        if (i.nodeName == o.kpiObject)
          scTargetModel.write(scTargetXPathRoot + "/" + o.dndObject + "[@id='bcdKpi']");
      });
    });
    
    // init category checkbox
    var gotCats = targetModel.queryNodes("/*" + scLayoutRoot + "/scc:CategoryTypeRefs/scc:CategoryTypeRef").length > 0;
    scTargetModel.write(scTargetXPathRoot + "/Category", gotCats ? "1" : "0");

    scTargetModel.fire();
  },

  /**
   * Used for initial filling but can also be used to reinitialize bucket model (e.g. after hiding selectable measures)
   * @param {string}  scBucketModelId  The id of the scBucketModel
   * @param {string}  configId           The id of the used configuration
   */
  fillBucketModel : function(scBucketModelId, configId, defAspectModel) {
    var configModel = bcdui.factory.objectRegistry.getObject(configId);
    var scBucketModel = bcdui.factory.objectRegistry.getObject(scBucketModelId);

    if ( typeof configModel != "undefined" && typeof scBucketModel != "undefined") {

      // clean possibly existing nodes first
      scBucketModel.remove("/*/*");

      // add <scc:LevelKpi/> as dm:LevelRef[@bRef='bcdKpi'] at first position (so it's always available)
      scBucketModel.write("/*/scc:Dimensions/dm:LevelRef[@bRef='bcdKpi' and @caption='KPI']");
      // add <scc:AspectKpi/> as scc:AspectRef[@idRef='bcdKpi'] at first position (so it's always available)
      scBucketModel.write("/*/scc:AspectRefs/scc:AspectRef[@idRef='bcdKpi' and @caption='KPI Value']");

      // generate ref items in bucket model. Either by taking existing refs from config
      // or generating the refs from the data
      bcdui.component.scorecard.configuratorDND._DND_OBJECTS.forEach(function(o) {
        var refList = o.fullConfigItem ? jQuery.makeArray(configModel.queryNodes("/*/" + o.fullConfigItem)) : [];
        if (refList.length != 0) {
          var parent = scBucketModel.write("/*/" + o.bucketParent);
          refList.forEach(function(r) { parent.appendChild(r.cloneNode(true)); });
        } else if (o.generator) {
          // generate refs out of data
          var datList = jQuery.makeArray(configModel.queryNodes("//" + o.generator));
          datList.forEach(function(d) {
            var idRef = d.getAttribute("id");
            var caption = d.getAttribute("caption");
            caption = caption == null ? "" : caption;
            scBucketModel.write("/*/" + o.fullBucketItem + "[@idRef='" + idRef + "' and @caption='" + caption + "']");
          });
        }

        // for aspects you may want to generate the bcdDefault ones, too 
        if (typeof defAspectModel != "undefined" && o.includeDefault && o.generator) {
          // generate refs out of data
          var datList = jQuery.makeArray(defAspectModel.queryNodes("//" + o.generator));
          datList.forEach(function(d) {
            var idRef = d.getAttribute("id");
            var caption = d.getAttribute("caption");
            caption = caption == null ? "" : caption;
            scBucketModel.write("/*/" + o.fullBucketItem + "[@idRef='" + idRef + "' and @caption='" + caption + "']");
          });
        }
      });

      // fill up empty or missing caption attributes in bucket data from config data (or id)
      bcdui.component.scorecard.configuratorDND._DND_OBJECTS.forEach(function(o) {
        jQuery.makeArray(scBucketModel.queryNodes("/*/" + o.fullBucketItem + "[not(@caption) or @caption='']")).forEach(function(b) {
          var caption = configModel.read("//" + o.generator + "[@" + o.configId + "='" + b.getAttribute(o.bucketId) + "']/@caption", "");
          if (caption == "") {
            caption = b.getAttribute(o.bucketId) || "";
            if (caption != "")
              caption = caption.startsWith("bcd") ? caption.substring(3) : caption;
          }
          caption = (caption == "" ? "N/A" : caption);
          b.setAttribute("caption", caption);
        });
      });

      scBucketModel.fire();
    }

    return scBucketModelId;
  },

  /**
   * basic box item renderer which adds one class
   * @private
   */
  _itemRenderer: function(args) {
    var scoreCardId = jQuery("#" + args.id).closest("*[bcdScorecardId]").attr("bcdScorecardId");
    var customClass = args.value == "bcdKpi" ? "bcdKpi" : "";
    return "<li class='ui-selectee " + customClass + "' bcdValue='" + args.value + "' bcdPos='" + args.position + "' bcdLoCase='" + args.caption.toLowerCase() + "' title='" + args.caption + "'><span class='bcdItem'>" + args.caption + "</span></li>";
  },
  
  /**
   * Generates a default layout for the scorecard drag'n drop area
   * @private
   */
  _generateDefaultLayout : function() {
    // 960 grid based layout with possible horizontal flip
    var dndDirectionTargetLeft = bcdui.config.settings.bcdui.component.dnd.targetLeft || true;
    var targetArea = "" +
      "<div class='grid_3 omega bcdCurrentKpiList" + (dndDirectionTargetLeft ? " alpha" : "") + "'></div>" +
      "<div class='grid_3 omega'>" +
      "  <div class='bcdCurrentScRowDimensionList" + (dndDirectionTargetLeft ? " alpha" : "") + "'></div>" +
      "  <div class='bcdCurrentAspectList'></div>" +
      "</div>";
    var sourceArea = ""+
      "<div class='grid_5 omega" + (dndDirectionTargetLeft ? "" : " alpha") + "'>" +
      "  <div class='bcdHeader'>" + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_Kpis"}) + "</div>" +
      "  <div class='bcdKpiList'></div>" +
      "</div>" +
      "<div class='grid_5 omega'>" +
      "  <div class='bcdHeader'>" + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_Dimensions"}) + "</div>" +
      "  <div class='bcdScDimensionList'></div>" +
      "  <div class='bcdHeader'>" + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_Aspects"}) + "</div>" +
      "  <div class='bcdAspectList'></div>" +
      "</div>";
    var template = "" +
      " <div class='container_24 bcdScorecardDndMatrix'>" +
      "   <div class='grid_24'>" +
          (dndDirectionTargetLeft ? targetArea : sourceArea) +
          (dndDirectionTargetLeft ? sourceArea : targetArea) +
      "   </div>" +
      "   <div style='display: none;' class='grid_24 bcdDNDCategory'><span></span><span>" + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_Categories"}) + "</span></div>"
      " </div>";
  
    // insert pseudo classes for translated dnd background texts
    jQuery('<style>' +
      '.bcdCurrentScRowDimensionList ul:after { content: "' + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_RowDimensions"}) + '"; }' +
      '.bcdCurrentKpiList ul:after { content: "' + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_Kpis"}) + '"; }' +
      '.bcdCurrentAspectList ul:after { content: "' + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_Aspects"}) + '"; }' +
    '</style>').appendTo('head');
    
    return template;
  }  
});
