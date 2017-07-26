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
 * ScorecardConfigurator Widget Implementation as jQuery Widget
 */
(function(){
  jQuery.widget("bcdui.bcduiScorecardConfiguratorNg", jQuery.bcdui.bcduiWidget, {
 
    _getCreateOptions : function(){
      return bcdui.component.scorecard.impl.readParams.scorecardConfigurator(this.element[0]);
    },

    /**
     * @private
     */
    _validateOptions : function(){
      bcdui.component.scorecard.impl.validateParams.scorecardConfigurator(this.options);
    },

    _create : function(){
      this._super();

      var args = this.options;

			// in case of allowing row aspects, we add the object to our main array
      if (args.rowAspect) {
        bcdui.component.scorecardConfigurator._DND_OBJECTS.push(
         { parent: "scc:RowAspectRefs", configParent: "scc:RowAspectRefs", fullBucketItem: "scc:AspectRefs/scc:AspectRef", bucketParent: "scc:AspectRefs", bucketItem: "scc:AspectRef", bucketId: "idRef", configId: "id", dndObject: "RowAspects", generator: "scc:Aspects/scc:Aspect", kpiObject: "scc:AspectKpi", generatorOption: "skip"}
        );
      }

      args.scorecardId = args.scorecard.id;
      args.targetHtml =  this.element.attr("id");
      args.targetModel = args.targetModel || bcdui.wkModels.guiStatus;
      args.config = args.config || new bcdui.core.SimpleModel({url: "dimensionsAndKpis.xml"});

      bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.component._schema_createScorecardConfigurator_args);

      // start rendering when configuration and scorecard is ready
      bcdui.factory.objectRegistry.withReadyObjects([args.config, args.scorecard], function() {

        var layoutModelId = args.scorecard.getConfigModel().read("//scc:Layout[@scorecardId ='"+ args.scorecardId +"']/@layoutModel", null);
        var layout = layoutModelId ? bcdui.factory.objectRegistry.getObject(layoutModelId) : args.targetModel

        // render default layout if required (dnd area, blinds and apply button)
        if (args.isDefaultHtmlLayout) {

					// row aspects need a slightly bigger default layout          
          var cClass = args.rowAspect ? "bcdScorecardDndBlindBig" : "bcdScorecardDndBlind";
          var template = "<div class='"+cClass+"'>" +
          "<div id='bcdUpDown_{{=it.id}}' class='bcdUpDown'></div>" + 
          "<div id='bcdUpDownBody_{{=it.id}}'>";
          [bcdui.component.cube.templateManager._renderTemplateArea, bcdui.component.scorecardConfigurator._renderDndArea, bcdui.component.cube.rankingEditor._renderRankingArea, bcdui.component.scorecardConfigurator._renderApplyArea].forEach(function(e) {if (typeof e == "function") template += e(args);});
          template += "</div>";
          [bcdui.component.cube.summaryDisplay._renderSummaryArea].forEach(function(e) {if (typeof e == "function") template += e(args);});
          template += "</div>";

          var defTemplate = jQuery(doT.template(template)({id:args.scorecardId, rowAspect : args.rowAspect}));
          jQuery("#" + args.targetHtml).append(defTemplate);

          args.templateTargetHtmlElementId = "bcdDndTemplateDiv_" + args.scorecardId;
          args.rankingTargetHtmlElementId = "bcdDndRankingDiv_" + args.scorecardId;
          args.summaryTargetHtmlElementId = "bcdDndSummaryDiv_" + args.scorecardId;

          if (jQuery("#" + args.targetHtml).hasClass("bcdOuterBlindOpen") || jQuery("#" + args.targetHtml).hasClass("bcdOuterBlindOpenClosed")) {
            bcdui.widget.createBlindUpDownArea({
              id: "bcdBlindUpDown_" + args.scorecardId
            , targetHtml: "bcdUpDown_" + args.scorecardId
            , bodyIdOrElement:"bcdUpDownBody_" + args.scorecardId
            , caption: bcdui.i18n.TAG + "bcd_Sc_Blind_Definition"
            , defaultState: jQuery("#" + args.targetHtml).hasClass("bcdOuterBlindOpen") ? "open": "closed"
            });
          }
          
          // optionally add a blind for the dnd area when classes bcdDndBlindOpen/bcdDndBlindClosed are specified
          if (jQuery("#" + args.targetHtml).hasClass("bcdDndBlindOpen") || jQuery("#" + args.targetHtml).hasClass("bcdDndBlindClosed")) {
            bcdui.widget.createBlindUpDownArea({
              id: "bcdBlindUpDown_Dnd_" + args.scorecardId
            , targetHtml: "bcdUpDown_Dnd_" + args.scorecardId
            , bodyIdOrElement:"bcdUpDownBody_Dnd_" + args.scorecardId
            , caption: bcdui.i18n.TAG + "bcd_Sc_Blind_Layout"
            , defaultState: jQuery("#" + args.targetHtml).hasClass("bcdDndBlindOpen") ? "open": "closed"
            });
          }

          bcdui.widgetNg.createButton({caption: "Apply", onClickAction: args.applyFunction || bcdui.core.lifecycle.applyAction, targetHtml: "bcdDndApplyButton_" + args.scorecardId});
        }

        var bucketModelId = bcdui.component.scorecardConfigurator._initDnd(args);

        var contextMenu = new bcdui.core.ModelWrapper({
          chain: bcdui.contextPath + "/bcdui/js/component/scorecard/dndContextMenu.xslt"
        , inputModel: bcdui.wkModels.guiStatus
        , parameters: { scorecardId: args.scorecardId, bcdColIdent: bcdui.wkModels.bcdColIdent, bcdRowIdent: bcdui.wkModels.bcdRowIdent, sccConfig: args.config }
        });
        bcdui.widget.createContextMenu({refreshMenuModel: true, targetHtml: args.targetHtml, inputModel: contextMenu, identsWithin: args.targetHtml});
        
        bcdui.widget.createTooltip({
            targetHtml: args.targetHtml
          , url: bcdui.contextPath + "/bcdui/js/component/scorecard/dndTooltip.xslt"
          , inputModel: args.targetModel
          , identsWithin: args.targetHtml
          , parameters: { scorecardId: args.scorecardId, bcdColIdent: bcdui.wkModels.bcdColIdent, bcdRowIdent: bcdui.wkModels.bcdRowIdent, scConfig: args.config }
        });
        
        if (args.isRanking)
          bcdui.component.cube.rankingEditor._initRanking(args, args.targetModel.id, bucketModelId);

        if( args.isTemplate  ) {

          if (args.isDefaultHtmlLayout) {
            bcdui.widget.createBlindUpDownArea({
              id: "bcdBlindUpDown_Template_" + args.scorecardId
              ,targetHTMLElementId: "bcdUpDown_Template_" + args.scorecardId
              ,bodyIdOrElement:"bcdUpDownBody_Template_" + args.scorecardId
              ,caption: bcdui.i18n.TAG + "bcd_Sc_Blind_Templates"
              ,defaultState: "open"
            });
          }

          // template editor requires a registered metaDataModel
          if (typeof bcdui.factory.objectRegistry.getObject(args.scorecard.getConfigModel().id) == "undefined")
            bcdui.factory.objectRegistry.registerObject(args.scorecard.getConfigModel());

          var templateRenderer = new bcdui.core.Renderer({
            chain: bcdui.component.cube.templateManager._templateUrl,
            inputModel: args.targetModel,
            targetHtml: args.templateTargetHtmlElementId,
            parameters:{
              metaDataModel:   args.scorecard.getConfigModel(),
              metaDataModelId: args.scorecard.getConfigModel().id,
              reportName:      args.reportName,
              hasUserEditRole: args.hasUserEditRole
                               || (bcdui.config.clientRights && bcdui.config.clientRights.bcdScorecardTemplateEdit
                                 &&    (bcdui.config.clientRights.bcdScorecardTemplateEdit.indexOf("*") != -1
                                     || bcdui.config.clientRights.bcdScorecardTemplateEdit.indexOf(args.scorecardId) != -1 )),
              targetModelId:   args.targetModel.id,
              objectId:        args.scorecardId
            }
          });
          args.scorecard.getConfigModel().onChange(function() {templateRenderer.execute()}, "/*/scc:Layouts");
        }
        
        if ( args.showSummary ){
          
          if (args.isDefaultHtmlLayout) {
            bcdui.widget.createBlindUpDownArea({
              id: "bcdBlindUpDown_Summary_" + args.scorecardId
              ,targetHTMLElementId: "bcdUpDown_Summary_" + args.scorecardId
              ,bodyIdOrElement:"bcdUpDownBody_Summary_" + args.scorecardId
              ,caption: bcdui.i18n.TAG + "bcd_Sc_Blind_Settings"
              ,defaultState: "open"
            });
          }
          
          var summaryRenderer = new bcdui.core.Renderer({
            chain: bcdui.component.cube.summaryDisplay._summaryUrl,
            inputModel: args.targetModel,
            targetHtml: args.summaryTargetHtmlElementId,
            parameters:{
              dndOptionsModel: args.scorecard.getConfigModel(),
              guiStatus:       bcdui.wkModels.guiStatus,
              objectId:        args.scorecardId
            }
          });

          args.targetModel.onChange(function() {summaryRenderer.execute(true)}, "/*/scc:Layout");

          // since disableClientRefresh flag is always stored in guiStatus (targetModel above does not have to be guiStatus)
          // we need to have a second listener here which rerenders the summary
          bcdui.wkModels.guiStatus.onChange(function() {summaryRenderer.execute(true)}, "/*/guiStatus:ClientSettings//scc:ClientLayout[@cubeId ='" + args.scorecardId + "']/@disableClientRefresh");
        }

        // scorecard redisplay listener, greys out scorecard
        // either listens to scorecard configurator targetmodel or given layoutModel
        layout.onChange({
          trackingXPath: "//scc:Layout[@scorecardId ='"+ args.scorecardId +"']"
          , callback: function() {
            // enhancedConfig's input model is the scorecard config model, we need to ensure
            // that both are ready, otherwise you get a refresh which is one step out of sync
            // Indicate that the scorecard is currently working and disable context menu as it would work on vanishing HTML elements (producing errors)

            var targetHtmlElement = jQuery(args.scorecard.getTargetHTMLElement()).children().first().get(0);
            if (targetHtmlElement && ! jQuery("#bcdScorecardHide" + args.scorecardId).length > 0) {
              var div = jQuery("<div class='bcdScorecardHide' title='" + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_PressApplyFirst"}) + "' id='" + "bcdScorecardHide" + args.scorecardId + "'></div>");
              div.css({position: "absolute", width: targetHtmlElement.offsetWidth + "px", height: targetHtmlElement.offsetHeight + "px"});
              div.get(0).oncontextmenu = function(event) {event = event || window.event; event.stopPropagation(); return false;};
              div.insertBefore(targetHtmlElement);
            }
          }
        });
      });
    },

    /**
     * @private
     */
    _destroy: function() {
      this._super();

      var htmlElementId = this.options.id;
      var el = jQuery(htmlElementId);

      if(el.length > 0){
        el.off()
        el.data("_args_",   null);
        el.data("_config_", null);
      }
    }
  });
}());


/**
 * A namespace for the BCD-UI scorecardConfigurator widget. For creation @see {@link bcdui.component.scorecard.createScorecardConfigurator}
 * @namespace bcdui.component.scorecardConfigurator
 */
bcdui.util.namespace("bcdui.component.scorecardConfigurator",
/** @lends bcdui.component.scorecardConfigurator */
{
  /**
   * @private
   */
  init: function(htmlElement){
    bcdui.log.isDebugEnabled() && bcdui.log.debug("bcdui widget adapter init");
    jQuery(htmlElement).bcduiScorecardConfiguratorNg();
  },
  
  /**
   * @private
   */
  _renderDndArea: function(args) {
    if (jQuery("#" + args.targetHtml).hasClass("bcdDndBlindOpen") || jQuery("#" + args.targetHtml).hasClass("bcdDndBlindClosed"))
      return "<div id='bcdUpDown_Dnd_{{=it.id}}' class='bcdUpDown'></div><div id='bcdUpDownBody_Dnd_{{=it.id}}'><div id='bcdDndMatrixDiv_{{=it.id}}'>" + bcdui.component.scorecardConfigurator._generateDefaultLayout(args) + "</div></div>";
    else
      return "<div id='bcdDndMatrixDiv_{{=it.id}}'>" + bcdui.component.scorecardConfigurator._generateDefaultLayout(args) + "</div>";
  },

  /**
   * @private
   */
  _renderApplyArea: function(args) {
    return "<div><span id='bcdDndApplyButton_{{=it.id}}'></span></div>";
  },
  
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
      { parent: "scc:Dimensions/scc:Rows", configParent: "scc:Dimensions", fullBucketItem: "scc:Dimensions/dm:LevelRef", bucketParent: "scc:Dimensions", bucketItem:"dm:LevelRef", bucketId:"bRef", configId:"bRef", generator: "dm:Dimensions/dm:LevelRef", generatorOption: "clone", dndObject: "RowDimensions", kpiObject: "scc:LevelKpi", kpiObjectMustExist: true}
    , { parent: "scc:Dimensions/scc:Columns", configParent: "scc:Dimensions", fullBucketItem: "scc:Dimensions/dm:LevelRef", bucketParent: "scc:Dimensions", bucketItem:"dm:LevelRef", bucketId:"bRef", configId:"bRef", generator: "dm:Dimensions/dm:LevelRef", generatorOption: "skip", dndObject: "ColDimensions", kpiObject: "scc:LevelKpi", kpiObjectMustExist: false}
    , { parent: "scc:KpiRefs", configParent: "scc:KpiRefs", fullBucketItem: "scc:KpiRefs/scc:KpiRef", bucketParent: "scc:KpiRefs", bucketItem: "scc:KpiRef", bucketId: "idRef", configId: "id", dndObject: "Kpis", generator: "scc:Kpis/scc:Kpi", kpiObject: undefined}
    , { parent: "scc:AspectRefs", configParent: "scc:AspectRefs", fullBucketItem: "scc:AspectRefs/scc:AspectRef", bucketParent: "scc:AspectRefs", bucketItem: "scc:AspectRef", bucketId: "idRef", configId: "id", dndObject: "Aspects", generator: "scc:Aspects/scc:Aspect", kpiObject: "scc:AspectKpi", generatorOption: "skip"}
    , { parent: "scc:CategoryTypeRefs", configParent: "scc:CategoryTypeRefs", fullBucketItem: "scc:CategoryTypeRefs/scc:CategoryTypeRef", bucketParent: "scc:CategoryTypeRefs", bucketItem: "scc:CategoryTypeRef", bucketId: "idRef", configId: "id", dndObject: "Categories", generator: "scc:CategoryTypes/scc:CategoryType", kpiObject: undefined}
  ],

  /**
   * @private
   */
  _initDnd : function(args) {

    // at least create the root node for clientRefresh Handling
    bcdui.core.createElementWithPrototype(bcdui.wkModels.guiStatus, "/*/guiStatus:ClientSettings/scc:ClientLayout[@scorecardId ='"+ args.scorecardId+"']");

    // let's create our bucket model to hold the dnd master data (build kpirefs out of kpis etc...)
    var scBucket = new bcdui.core.StaticModel({ data: '<Root xmlns="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0" xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0" xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0" xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0" xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0" xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0" xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0" xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"></Root>' });
    bcdui.factory.objectRegistry.registerObject(scBucket); // we need to register the model for widget-use
    scBucket.execute(); // we're static, we're synchron, so we can start filling the bucket
    bcdui.component.scorecardConfigurator._fillBucket(scBucket, args.config);

    // remember bucket and targetModelId for refresh function
    jQuery("#" + args.targetHtml).addClass("bcd_"+ args.scorecardId + "_dnd");
    jQuery("#" + args.targetHtml).attr("bcdScorecardId", args.scorecardId).attr("contextId", "scorecardDnd");
    jQuery(".bcd_" + args.scorecardId + "_dnd").data("targetModelId", args.targetModel.id);
    jQuery(".bcd_" + args.scorecardId + "_dnd").data("scBucketModelId", scBucket.id);

    // and initialize controls
    var scTargetXPathRoot = bcdui.component.scorecardConfigurator._SCORECARD_TEMP.xPathRootWidget;

    // add category checkbox if we got categories (and a place to put the checkbox)
    if (scBucket.queryNodes("/*/scc:CategoryTypeRefs/scc:CategoryTypeRef").length > 0
        && jQuery("#" + args.targetHtml + " .bcdDndCategory").length > 0) {
      bcdui.widgetNg.createCheckbox({targetHtml: "#" + args.targetHtml + " .bcdDndCategory > span", targetModelXPath: "$" + scBucket.id + scTargetXPathRoot + "/Category"});
      jQuery("#" + args.targetHtml + " .bcdDndCategory").show();
    }

    // initially transform scorecard layout into in-between-model for connectables
    bcdui.component.scorecardConfigurator._scorecardLayoutToControlModel(scBucket, args.targetModel, args.scorecardId);

    // setup connectable source/target for dimensions
    var sourceArgs = {
      optionsModelXPath: "$" + scBucket.id + "/*/scc:Dimensions/dm:LevelRef/@caption"
    , optionsModelRelativeValueXPath: "../@bcdId"
    , targetHtml: "#" + args.targetHtml + " .bcdScDimensionList"
    , scope: args.scorecardId + "_dims"
    , unselectAfterMove: true
    , generateItemHtml: bcdui.component.scorecardConfigurator._itemRenderer
    , extendedConfig: {noTooltip: true }
    };
    bcdui.widgetNg.createConnectable(sourceArgs);
    var targetArgs = {
      targetHtml: "#" + args.targetHtml + " .bcdCurrentScRowDimensionList"
    , targetModelXPath: "$" + scBucket.id + scTargetXPathRoot + "/RowDimensions/@id"
    , isDoubleClickTarget: true
    , scope: args.scorecardId + "_dims"
    , unselectAfterMove: true
    , generateItemHtml: bcdui.component.scorecardConfigurator._itemRenderer
    , extendedConfig: {noTooltip: true }
    };
    bcdui.widgetNg.createConnectable(targetArgs);
    var targetArgs = {
        targetHtml: "#" + args.targetHtml + " .bcdCurrentScColDimensionList"
      , targetModelXPath: "$" + scBucket.id + scTargetXPathRoot + "/ColDimensions/@id"
      , isDoubleClickTarget: false
      , scope: args.scorecardId + "_dims"
      , unselectAfterMove: true
      , generateItemHtml: bcdui.component.scorecardConfigurator._itemRenderer
      , extendedConfig: {noTooltip: true }
    };
    bcdui.widgetNg.createConnectable(targetArgs);

    // setup connectable source/target for kpis
    var sourceArgs = {
      optionsModelXPath: "$" + scBucket.id + "/*/scc:KpiRefs/scc:KpiRef/@caption"
    , optionsModelRelativeValueXPath: "../@bcdId"
    , targetHtml: "#" + args.targetHtml + " .bcdKpiList"
    , scope: args.scorecardId + "_kpi"
    , unselectAfterMove: true
    , generateItemHtml: bcdui.component.scorecardConfigurator._itemRenderer
    , extendedConfig: {noTooltip: true }
    };
    bcdui.widgetNg.createConnectable(sourceArgs);

    var targetArgs = {
      targetHtml: "#" + args.targetHtml + " .bcdCurrentKpiList"
    , targetModelXPath: "$" + scBucket.id + scTargetXPathRoot + "/Kpis/@id"
    , isDoubleClickTarget: true
    , scope: args.scorecardId + "_kpi"
    , unselectAfterMove: true
    , generateItemHtml: bcdui.component.scorecardConfigurator._itemRenderer
    , extendedConfig: {noTooltip: true }
    };
    bcdui.widgetNg.createConnectable(targetArgs);

    // setup connectable source/target for aspects
    var sourceArgs = {
      optionsModelXPath: "$" + scBucket.id + "/*/scc:AspectRefs/scc:AspectRef/@caption"
    , optionsModelRelativeValueXPath: "../@bcdId"
    , targetHtml: "#" + args.targetHtml + " .bcdAspectList"
    , scope: args.scorecardId + "_asp"
    , unselectAfterMove: true
    , generateItemHtml: bcdui.component.scorecardConfigurator._itemRendererAspects
    , extendedConfig: {noTooltip: true }
    };
    bcdui.widgetNg.createConnectable(sourceArgs);

    var targetArgs = {
      targetHtml: "#" + args.targetHtml + " .bcdCurrentAspectList"
    , targetModelXPath: "$" + scBucket.id + scTargetXPathRoot + "/Aspects/@id"
    , isDoubleClickTarget: true
    , scope: args.scorecardId + "_asp"
    , unselectAfterMove: true
    , extendedConfig: {noTooltip: true }
    , generateItemHtml: bcdui.component.scorecardConfigurator._itemRendererAspects
    };
    bcdui.widgetNg.createConnectable(targetArgs);

    if (args.rowAspect) {
      var targetArgs = {
        targetHtml: "#" + args.targetHtml + " .bcdCurrentAspectListRow"
      , targetModelXPath: "$" + scBucket.id + scTargetXPathRoot + "/RowAspects/@id"
      , isDoubleClickTarget: false
      , scope: args.scorecardId + "_asp"
      , unselectAfterMove: true
      , extendedConfig: {noTooltip: true }
      , generateItemHtml: bcdui.component.scorecardConfigurator._itemRendererAspects
      };
      bcdui.widgetNg.createConnectable(targetArgs);
    }

    // and our listener to generate the layout on any control layout change
    scBucket.onChange({
      trackingXPath : scTargetXPathRoot
    , callback : function() {

        // check if target model really changed
        var scLayoutRoot = "/scc:Layout[@scorecardId='" + args.scorecardId + "']";
        var scTargetXPathRoot = bcdui.component.scorecardConfigurator._SCORECARD_TEMP.xPathRootWidget;
        var scTargetModel = scBucket;
        var idArray = new Array();
        var idArrayTarget = new Array();

        // category checkbox handling, either copy all or remove all categories
        bcdui.core.removeXPath(scTargetModel.getData(), scTargetXPathRoot + "/Categories");
        if (scTargetModel.read(scTargetXPathRoot + "/Category", "0") == "1") {
          jQuery.makeArray(scBucket.queryNodes("//scc:CategoryTypeRef")).forEach(function(e) {
            bcdui.core.createElementWithPrototype(scTargetModel.getData(), scTargetXPathRoot + "/Categories[@id='" + e.getAttribute("idRef") + "|" + e.getAttribute("caption") + "']");
          });
        };

        // target layout item with parent, bucket item with parent, item identifier, connectable item
        bcdui.component.scorecardConfigurator._DND_OBJECTS.forEach(function(o) {

          // differ between row and common aspects
          var xPath = o.parent + "/*";
          if (o.parent == "scc:RowAspectRefs") xPath = "scc:AspectRefs/*[@isRow='true']";
          if (o.parent == "scc:AspectRefs")    xPath = "scc:AspectRefs/*[not(@isRow) or @isRow='false']";

          jQuery.makeArray(args.targetModel.queryNodes("/*" + scLayoutRoot + "/" + xPath)).forEach(function(i) {
            var id = (i.getAttribute(o.bucketId) || "") + "|" + (i.getAttribute("caption") || "");
            if (i.nodeName == o.kpiObject)
              idArray.push("bcdKpi|KPI" + o.dndObject);
            else if (scBucket.query("/*/" + o.fullBucketItem + "[@bcdId='" + id + "']") != null)
              idArray.push(id + o.dndObject);
          });

          jQuery.makeArray(scTargetModel.queryNodes(scTargetXPathRoot + "/" + o.dndObject + "/@id")).forEach(function(i){
            idArrayTarget.push(i.text + o.dndObject);
          });
        });

        // so we compare the dnd area internal with the external representation model (on idRef value level and order)
        var i = 0;
        var identical = idArrayTarget.length == idArray.length  // we only need to continue if we got the same amount of values;
        while (identical && i < idArray.length) {
          identical &= idArray[i] == idArrayTarget[i]  // also compare the order/values themselves;
          i++;
        }

        // only recreate layout if something in the target changed
        if (! identical) {

          // remove possible markings in template list
          jQuery(".bcdReportTemplateList a").removeClass("bcdSelected");

          // disable scorecard renderer on any change
          var layoutNode = bcdui.core.createElementWithPrototype(bcdui.wkModels.guiStatus, "/*/guiStatus:ClientSettings/scc:ClientLayout[@scorecardId ='"+ args.scorecardId+"']" );
          layoutNode.setAttribute("disableClientRefresh","true");
          // and generate layout
          bcdui.component.scorecardConfigurator._controlModelToScorecardLayout(scBucket, args.targetModel, args.scorecardId);
        }
      }
    });

    return scBucket.id;
  },

  /**
   * convert internal layout data to (guiStatus) scc:Layout
   * @private
   */
  _controlModelToScorecardLayout : function(scBucket, targetModel, scorecardId) {
    var scTargetXPathRoot = bcdui.component.scorecardConfigurator._SCORECARD_TEMP.xPathRootWidget;
    var scTargetModel = scBucket;
    var tempModelXPathRoot = bcdui.component.scorecardConfigurator._SCORECARD_TEMP.xPathRootLayout;
    var tempModel = scBucket;

    var scLayoutRoot = "/scc:Layout[@scorecardId='" + scorecardId + "']";
    
    // clean temporary layout first
    tempModel.remove(tempModelXPathRoot + scLayoutRoot);

    var destination = tempModel.write(tempModelXPathRoot);
    //copy source layout to temp if it exists
    var source = targetModel.query("/*" + scLayoutRoot);
    if (source != null)
      destination.appendChild(source.cloneNode(true));

    // only keep a skeleton of parent nodes
    tempModel.remove(tempModelXPathRoot + scLayoutRoot + "/*[name()!='scc:TopNDimMembers']/*");

    // now insert kpiRefs, aspectRefs, etc into temp layout based on ordering from collectable targets
    bcdui.component.scorecardConfigurator._DND_OBJECTS.forEach(function(o) {
      jQuery.makeArray(scTargetModel.queryNodes(scTargetXPathRoot + "/" + o.dndObject + "/@id")).forEach(function(i) {
        var split = i.text.split("|");
        var item = targetModel.query("/*" + scLayoutRoot + "/" + o.configParent + "//" + o.bucketItem + "[@" + o.bucketId + "='" + split[0] + "' and @caption='" + split[1] + "']");
        item = item != null ? item : scBucket.query("/*/" + o.fullBucketItem + "[@bcdId='" + i.text + "']");
        if (item != null) {
          var destination = tempModel.query(tempModelXPathRoot + scLayoutRoot + "/" + o.parent);
          // if destination does not yet exist, create it
          destination = destination != null ? destination : tempModel.write(tempModelXPathRoot + scLayoutRoot + "/" + o.parent);

          // special translation for kpiObjects like scc:LevelKpi/etc
          if (item.getAttribute(o.bucketId) == "bcdKpi") {
            // special item got subnode (created during bucket fill) with actual object
            var realNode = targetModel.query("/*" + scLayoutRoot + "/" + o.configParent + "//" + o.kpiObject + "[@" + o.bucketId + "='" + split[0] + "']");
            item = realNode || item.selectSingleNode("./*");
          }
          var clone = item.cloneNode(true);
          clone.removeAttribute("bcdId");
          destination.appendChild(clone);
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

    // generate rowAspectRefs as leading aspectRefs
    jQuery.makeArray(targetModel.getData().selectNodes("/*" + scLayoutRoot + "/scc:AspectRefs/scc:AspectRef")).forEach(function(e){
      e.removeAttribute("isRow");
    });
    var aspectRefsRoot = bcdui.core.createElementWithPrototype(targetModel.getData(), "/*" + scLayoutRoot + "/scc:AspectRefs");
    jQuery.makeArray(targetModel.queryNodes("/*" + scLayoutRoot + "/scc:RowAspectRefs/*")).reverse().forEach(function(e) {
      e.setAttribute("isRow", "true");
      aspectRefsRoot.insertBefore(e.cloneNode(true), aspectRefsRoot.childNodes && aspectRefsRoot.childNodes.length > 0 ? aspectRefsRoot.childNodes[0] : null);
    });
    bcdui.core.removeXPath(targetModel.getData(), "/*" + scLayoutRoot + "/scc:RowAspectRefs");

    // optionally limit measures/dimensions
    var doRedisplay = bcdui.component.scorecardConfigurator._limitDimensions(scorecardId);

    // do some special rules cleanup
    doRedisplay |= bcdui.component.scorecardConfigurator._cleanUp(scBucket, targetModel, scorecardId);

    targetModel.fire();

    // in case cleanup did something, we need to redisplay our connectables
    if (doRedisplay)
      bcdui.component.scorecardConfigurator.reDisplay(scorecardId);
  },
  
  /**
   * limits the number of dimensions
   * into account
   * @private
   */
  _limitDimensions: function(scorecardId) {

    var doRedisplay = false;
    var maxDimensions = 8; // More is not supported by Chrome

    // limit aspects/dimensions if required
    if (maxDimensions) {
      var dimOk = false;
      var promptDim = false;

      var targetModelId = jQuery(".bcd_" + scorecardId + "_dnd").data("targetModelId");
      var scorecardLayoutRoot = "/scc:Layout[@scorecardId='" + scorecardId + "']";
      var targetModelDoc = bcdui.factory.objectRegistry.getObject(targetModelId).getData();

      while (! dimOk) {
        // count only unique dimensions since during dragNdrop, this function is called in states where source and destination contain the same item
        var dimensions = jQuery.makeArray(targetModelDoc.selectNodes("/*" + scorecardLayoutRoot + "/scc:Dimensions/*/*")).map(function(e){
          return (e.nodeName == "scc:LevelKpi" ? "bcd_kpi" : e.getAttribute("bRef"));
        });
        var numberOfDimensions = dimensions.filter(function(e, idx){return dimensions.indexOf(e) == idx}).length

        if (maxDimensions != -1 && numberOfDimensions > maxDimensions) {
          doRedisplay = true;
          if (! promptDim) {
            alert(
              bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_MaxDimensions"}) +
              " " + maxDimensions + "\n" +
              bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_MaxReduce"})
            );
            promptDim = true;
          }
          if (targetModelDoc.selectSingleNode("/*" + scorecardLayoutRoot + "/scc:Dimensions/scc:Rows/dm:LevelRef") != null)
            bcdui.core.removeXPath(targetModelDoc, "/*" + scorecardLayoutRoot + "/scc:Dimensions/scc:Rows/dm:LevelRef[position()=last()]");
          else
            bcdui.core.removeXPath(targetModelDoc, "/*" + scorecardLayoutRoot + "/scc:Dimensions/scc:Columns/dm:LevelRef[position()=last()]");
        }
        else
          dimOk = true;
      }
    }
    return doRedisplay;
  },

  /**
   * cleanup some special rules
   * @private
   */
  _cleanUp : function(scBucket, targetModel, scorecardId) {
    
    var doRedisplay = false;
    var scLayoutRoot = "/scc:Layout[@scorecardId='" + scorecardId + "']";
    
    // remove topN and aspect sorts if we got a column kpi
    if (targetModel.query("/*" + scLayoutRoot + "/scc:Dimensions/scc:Columns/scc:LevelKpi") != null) {
      doRedisplay |= bcdui.core.removeXPath(targetModel.getData(), "/*" + scLayoutRoot + "/scc:TopNDimMembers") > 0;
      var nodes = targetModel.queryNodes("/*" + scLayoutRoot + "/scc:AspectRefs/*[@sort or @sortBy]");
      doRedisplay |= nodes.length > 0;
      for (var n = 0; n < nodes.length; n++) {
        nodes[n].removeAttribute("sort");
        nodes[n].removeAttribute("sortBy");
      }
    }

    // only allow RowAspectRefs when scc:LevelKpi is a row dimension
    if (targetModel.query("/*" + scLayoutRoot + "/scc:Dimensions/scc:Rows/scc:LevelKpi") == null)
      doRedisplay |= bcdui.core.removeXPath(targetModel.getData(), "/*" + scLayoutRoot + "/scc:AspectRefs/*[@isRow='true']") > 0;

    // only allow RowAspectRefs which are marked with rowAspect
    doRedisplay |= bcdui.core.removeXPath(targetModel.getData(), "/*" + scLayoutRoot + "/scc:AspectRefs/*[@isRow='true' and (not(@rowAspect) or @rowAspect='false')]") > 0;
    
    return doRedisplay;
  },

  /**
   * convert (guiStatus) scc:Layout to internal layout data
   * @private
   */
  _scorecardLayoutToControlModel : function(scBucket, targetModel, scorecardId) {

    var scLayoutRoot = "/scc:Layout[@scorecardId='" + scorecardId + "']";
    var scTargetXPathRoot = bcdui.component.scorecardConfigurator._SCORECARD_TEMP.xPathRootWidget;
    var scTargetModel = scBucket;

    // add scc:LevelKpi to selected row dimensions if it's not already available
    if (targetModel.query("/*" + scLayoutRoot + "/scc:Dimensions/*/scc:LevelKpi") == null) {
      var levelKpi = scBucket.query("/*/scc:Dimensions/dm:LevelRef[@bRef='bcdKpi']/*");
      if (levelKpi != null) {
        var dimRoot = bcdui.core.createElementWithPrototype(targetModel.getData(), "/*" + scLayoutRoot + "/scc:Dimensions/scc:Rows");
        if (dimRoot != null)
          dimRoot.appendChild(levelKpi.cloneNode(true));
      }
    }

    // transform target model data to in-between model
    scTargetModel.remove(scTargetXPathRoot);

    bcdui.component.scorecardConfigurator._DND_OBJECTS.forEach(function(o) {

      // differ between row and common aspects
      var xPath = o.parent + "/*";
      if (o.parent == "scc:RowAspectRefs") xPath = "scc:AspectRefs/*[@isRow='true']";
      if (o.parent == "scc:AspectRefs")    xPath = "scc:AspectRefs/*[not(@isRow) or @isRow='false']";

      jQuery.makeArray(targetModel.queryNodes("/*" + scLayoutRoot + "/" + xPath)).forEach(function(i){

        // ignore AspectRef in AspectRefs which also appear in rowAspectRefs
        var id = (i.getAttribute(o.bucketId) || "") + "|" + (i.getAttribute("caption") || "");
        // generate entry as long as it is part of the bucket
        if (scBucket.query("/*/" + o.fullBucketItem + "[@bcdId='" + id + "']") != null)
          scTargetModel.write(scTargetXPathRoot + "/" + o.dndObject + "[@id='" + id + "']");
        // special translation for kpi related notes
        if (i.nodeName == o.kpiObject)
          scTargetModel.write(scTargetXPathRoot + "/" + o.dndObject + "[@id='bcdKpi|KPI']");
      });
    });
    
    // init category checkbox
    var gotCats = targetModel.queryNodes("/*" + scLayoutRoot + "/scc:CategoryTypeRefs/scc:CategoryTypeRef").length > 0;
    scTargetModel.write(scTargetXPathRoot + "/Category", gotCats ? "1" : "0");
    
    scTargetModel.fire();
  },

  /**
   * Used for initial filling but can also be used to reinitialize bucket model (e.g. after hiding selectable measures)
   * @param {string}  scBucket The scorecard bucket model
   * @param {string}  configId      The id of the used configuration
   * @private
   */
  _fillBucket: function(scBucket, configModel) {

    if ( typeof configModel != "undefined" && typeof scBucket != "undefined") {

      // clean possibly existing nodes first
      scBucket.remove("/*/*");

      // generate ref items in bucket model.
      //
      // we either lookup in scc:Dimensions (scc:KpiRefs/scc:AspectRefs/etc) for existing items
      // if they do exist, we clone them.
      // Special handling for o.kpiObject (different node name): In this case create a pseudo entry
      // if the belonging kpiObject node does exist, we add it as subnode of the pseudo node.
      //
      // or we take the data from the configurator config. We either clone them (levelRef) or
      // generate references from the belonging items (Kpi -> KpiRef, etc)

      bcdui.component.scorecardConfigurator._DND_OBJECTS.forEach(function(o) {
      
        var refList = o.configParent ? jQuery.makeArray(configModel.queryNodes("/*/" + o.configParent + "/" + o.bucketItem)) : [];
        var kpiObjectNode = o.configParent && o.kpiObject ? configModel.query("/*/" + o.configParent + "/" + o.kpiObject) : null;

        // also avoid double lookup for RowAspects and ColDimensions
        if (o.dndObject != "RowAspects" && o.dndObject != "ColDimensions" && (refList.length > 0 || kpiObjectNode != null)) {
          var parent = scBucket.write("/*/" + o.bucketParent);
          // in case we have a special item (e.g. LevelKpi), we add it as pseudo item with the original node (with attributes and children) as subitem
          if (kpiObjectNode != null) {
            var obj = bcdui.core.createElementWithPrototype(parent, "./" + o.bucketItem + "[@" + o.bucketId + "='bcdKpi' and @caption='KPI']");
            obj.appendChild(kpiObjectNode.cloneNode(true));
            // take over caption
            var caption = obj.selectSingleNode("./" + o.kpiObject + "/@caption");
            if (caption != null)
              obj.setAttribute("caption", caption.text);
          }
          else if (o.kpiObjectMustExist) {
            scBucket.write("/*/" + o.fullBucketItem + "[@" + o.bucketId + "='bcdKpi' and @caption='KPI']/" + o.kpiObject);
          }
          // clone all other items
          refList.forEach(function(r) { parent.appendChild(r.cloneNode(true)); });
        }

        // no items found, so we generate references
        else if (o.generator && o.generatorOption != "skip") {

          // in case we have a special item (e.g. LevelKpi), we add it as pseudo item
          if (o.kpiObject)
            scBucket.write("/*/" + o.fullBucketItem + "[@" + o.bucketId + "='bcdKpi' and @caption='KPI']/" + o.kpiObject);

          var datList = jQuery.makeArray(configModel.queryNodes("//" + o.generator));
          // either clone or generate refs out of data
          if (o.generatorOption == "clone") {
            var parent = scBucket.write("/*/" + o.bucketParent);
            datList.forEach(function(r) { parent.appendChild(r.cloneNode(true)); });
          }
          else {
            datList.forEach(function(d) {
              var idRef = d.getAttribute("id");
              var caption = d.getAttribute("caption");
              caption = caption == null ? "" : caption;
              scBucket.write("/*/" + o.fullBucketItem + "[@idRef='" + idRef + "' and @caption='" + caption + "']");
            });
          }
        }
      });

      // fill up empty or missing caption attributes in bucket data from config data (or id)
      bcdui.component.scorecardConfigurator._DND_OBJECTS.forEach(function(o) {
        
        // special handling for AspectRefs, mark them with rowAspect attribute if the assigned scc:Aspect (or this scc:AspectKpi) got it set
        if (o.bucketItem == "scc:AspectRef") {
          jQuery.makeArray(scBucket.queryNodes("/*/" + o.fullBucketItem)).forEach(function(b) {
            if (b.getAttribute(o.bucketId) == "bcdKpi") {
              if (configModel.read("/*/scc:AspectRefs/scc:AspectKpi/@rowAspect", "false") == "true")
                b.setAttribute("rowAspect", "true");
            }
            else if (configModel.read("/*/scc:Aspects/scc:Aspect[@id='" + b.getAttribute(o.bucketId) + "']/@rowAspect", "false") == "true")
              b.setAttribute("rowAspect", "true");
          });
        }

        jQuery.makeArray(scBucket.queryNodes("/*/" + o.fullBucketItem + "[not(@caption) or @caption='']")).forEach(function(b) {
          var caption = configModel.read("//" + o.generator + "[@" + o.configId + "='" + b.getAttribute(o.bucketId) + "']/@caption", "");
          if (caption == "") {
            caption = b.getAttribute(o.bucketId) || "";
            if (caption != "")
              caption = caption.startsWith("bcd") ? caption.substring(3) : caption;
          }
          caption = (caption == "" ? "N/A" : caption);
          b.setAttribute("caption", caption);
        });

        jQuery.makeArray(scBucket.queryNodes("/*/" + o.bucketParent + "/*")).forEach(function(b) {
          var code = b.getAttribute(o.bucketId) || "";
          var caption = b.getAttribute("caption") || "";
          b.setAttribute("bcdId", (code == "bcdKpi") ? "bcdKpi|KPI" : code + "|" + caption);
        });
      });

      scBucket.fire();
    }
  },

  /**
   * Refreshes the scorecard drag'n drop area
   * This is e.g. necessary when a template is applied or the layout is cleaned
   * @param {string}  scorecardId  The id of the linked scorecard
   */
  reDisplay : function(scorecardId) {

    var targetModelId = jQuery(".bcd_" + scorecardId + "_dnd").data("targetModelId");
    var scBucketId = jQuery(".bcd_" + scorecardId + "_dnd").data("scBucketModelId");
    var targetModel = bcdui.factory.objectRegistry.getObject(targetModelId);
    var scBucket = bcdui.factory.objectRegistry.getObject(scBucketId);
    bcdui.component.scorecardConfigurator._scorecardLayoutToControlModel(scBucket, targetModel, scorecardId);

    // force other targetId Listeners to run on a redisplay of data
    var scorecardLayoutRoot = "/scc:Layout[@scorecardId='" + scorecardId + "']";

    var destination = targetModel.getData().selectSingleNode("/*" + scorecardLayoutRoot);

    // take pseudo attribute bcdRedisplay and increase it by one
    var r = destination != null ? destination.getAttribute("bcdRedisplay") : null;
    r = r == null || isNaN(parseInt(r, 10)) ? 0 : parseInt(r, 10) + 1;

    destination = destination != null ? destination : bcdui.core.createElementWithPrototype(targetModel.getData(), "/*" + scorecardLayoutRoot);

    // ensure that we do trigger an event by setting the new value of bcdRedisplay
    destination.setAttribute("bcdRedisplay", "" + r);
    targetModel.fire();
  },

  /**
   * basic box item renderer which adds one class
   * @private
   */
  _itemRenderer: function(args) {
    var customClass = args.value == "bcdKpi|KPI" ? "bcdTargetLocked" : "";
    var scorecardId = jQuery("#" + args.id).closest("*[bcdScorecardId]").attr("bcdScorecardId");
    var targetModel = bcdui.factory.objectRegistry.getObject(jQuery(".bcd_" + scorecardId + "_dnd").data("targetModelId"));
    return "<li bcdColIdent='dim' bcdRowIdent='" + args.value + "' contextId='bcdDim' class='ui-selectee " + customClass + "' bcdValue='" + args.value + "' bcdPos='" + args.position + "' bcdLoCase='" + args.caption.toLowerCase() + "'><span class='bcdItem'>" + args.caption + "</span></li>";
  },
  
  _itemRendererAspects: function(args) {
    var customClass = "";
    var scorecardId = jQuery("#" + args.id).closest("*[bcdScorecardId]").attr("bcdScorecardId");
    var targetModel = bcdui.factory.objectRegistry.getObject(jQuery(".bcd_" + scorecardId + "_dnd").data("targetModelId"));
    return "<li bcdColIdent='asp' bcdRowIdent='" + args.value + "' contextId='bcdAsp' class='ui-selectee" + customClass + "' bcdValue='" + args.value + "' bcdPos='" + args.position + "' bcdLoCase='" + args.caption.toLowerCase() + "'><span class='bcdItem'>" + args.caption + "</span></li>";
  },
  /**
   * Generates a default layout for the scorecard drag'n drop area
   * @private
   */
  _generateDefaultLayout : function(args) {
    // 960 grid based layout with possible horizontal flip
    var dndDirectionTargetLeft = bcdui.config.settings.bcdui.component.dnd.targetLeft == null ? true : bcdui.config.settings.bcdui.component.dnd.targetLeft;
    var grid = args.rowAspect ? "grid_4" : "grid_5";
    var targetArea = "" +
      "<div class='grid_3 omega bcdCurrentKpiList" + (dndDirectionTargetLeft ? " alpha" : "") + "'></div>" +
      "<div class='grid_3 omega bcdCurrentScRowDimensionList'></div>" +
      (args.rowAspect ? "<div class='grid_3 omega bcdCurrentAspectListRow'></div>" : "") +
      "<div class='grid_3 omega'>" +
      "  <div class='bcdCurrentScColDimensionList'></div>" +
      "  <div class='bcdCurrentAspectList'></div>" +
      "</div>";
    var sourceArea = ""+
      "<div class='" + grid + " omega" + (dndDirectionTargetLeft ? "" : " alpha") + "'>" +
      "  <div class='bcdHeader'>" + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_Kpis"}) + "</div>" +
      "  <div class='bcdKpiList'></div>" +
      "</div>" +
      "<div class='" + grid + " omega'>" +
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
      "   <div style='display: none;' class='grid_24 bcdDndCategory'><span></span><span>" + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_Categories"}) + "</span></div>" +
      " </div>";
  
    // insert pseudo classes for translated dnd background texts
    jQuery('<style>' +
      '.bcdCurrentScRowDimensionList ul:after { content: "' + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_RowDimensions"}) + '"; }' +
      '.bcdCurrentScColDimensionList ul:after { content: "' + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_ColDimensions"}) + '"; }' +
      '.bcdCurrentKpiList ul:after { content: "' + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_Kpis"}) + '"; }' +
      '.bcdCurrentAspectList ul:after { content: "' + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_Aspects"}) + '"; }' +
      '.bcdCurrentAspectListRow ul:after { content: "' + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_RowAspects"}) + '"; }' +
    '</style>').appendTo('head');
    
    return template;
  },

  /**
   * contextMenu function call to hide current dimension's totals by cleaning total attribute
   * @private
   */
  _hideTotals : function(scorecardId) {
    var dim = bcdui.wkModels.bcdRowIdent.getData() || "";
    bcdui.component.scorecardConfigurator._modify(scorecardId, {"total" : ""}, dim, 'dimension', false);
  },

  /**
   * contextMenu function call to show current dimension's totals by setting total attribute
   * @private
   */
  _showTotals : function(scorecardId) {
    var dim = bcdui.wkModels.bcdRowIdent.getData() || "";
    bcdui.component.scorecardConfigurator._modify(scorecardId, {"total" : "trailing"}, dim, 'dimension', false);
  },

  /**
   * contextMenu function call to sort aspects
   * @private
   */
  _sortAspect : function(scorecardId, direction) {
    var asp = bcdui.wkModels.bcdRowIdent.getData() || "";
    bcdui.component.scorecardConfigurator._modify(scorecardId, {"sort" : direction}, asp, 'aspect', true);
  },

  /**
   * general modify attributes routine which sets information at bucketitems and layout items
   * @private
   */
  _modify : function(scorecardId, attributes, id, type, clean) {

    var targetModel = bcdui.factory.objectRegistry.getObject(jQuery(".bcd_" + scorecardId + "_dnd").data("targetModelId"));
    var scBucketModel = bcdui.factory.objectRegistry.getObject(jQuery(".bcd_" + scorecardId + "_dnd").data("scBucketModelId"));
    var pre = type == "aspect" ? "scc:AspectRefs" : "scc:Dimensions";
    var doFire = false;

    var nodes = [];
    if (clean)
      nodes = nodes.concat(jQuery.makeArray(scBucketModel.queryNodes("/*/" + pre + "/*")));
    else
      nodes.push(scBucketModel.query("/*/" + pre + "/*[@bcdId='" + id + "']"));

    nodes.forEach(function(e) {
      var bucketNode = e;
      var layoutNodeName = bucketNode.childNodes.length > 0 ? bucketNode.childNodes[0].nodeName : bucketNode.nodeName;
      var layoutIdValue = "";
      var layoutIdName = "";
  
      if (bucketNode.getAttribute("idRef") != null) {
        layoutIdValue = bucketNode.getAttribute("idRef");
        layoutIdName = "idRef"
      }
      else if (bucketNode.getAttribute("bRef") != null) {
        layoutIdValue = bucketNode.getAttribute("bRef");
        layoutIdName = "bRef"
      }
      
      var x = pre == "scc:AspectRefs" ? "/*/" : "/*/*/";

      if (layoutIdName != "" && layoutIdValue != "") {
        var layoutNode = targetModel.query("/*/scc:Layout[@scorecardId='" + scorecardId + "']" + x + layoutNodeName + "[@" + layoutIdName + "='" + layoutIdValue + "']");
        if (layoutNode != null) {
          if (e.getAttribute("bcdId") == id) {
            // set actual values
            for (a in attributes) {
              if (attributes[a] == "")
                layoutNode.removeAttribute(a);
              else
                layoutNode.setAttribute(a, attributes[a]);
            }
          }
          // clean mode, remove all listed attributes for all nodes except the selected one
          else {
            for (a in attributes)
              layoutNode.removeAttribute(a);
          }

          var layoutNode = bcdui.core.createElementWithPrototype( bcdui.wkModels.guiStatus, "/*/guiStatus:ClientSettings/scc:ClientLayout[@scorecardId ='"+ scorecardId+"']" );
          layoutNode.setAttribute("disableClientRefresh","true");
          doFire = true;
        }
      }
    });
    if (doFire)
      bcdui.wkModels.guiStatus.fire();
  }
});
