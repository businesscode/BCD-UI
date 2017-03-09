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

      // create target (as div before scorecard) in case it is not given at all
      if( !args.targetHtml) {
        var ccTarget = document.createElement("div");
        ccTarget.setAttribute("id",args.id+"Configurator");
        args.scorecard.getTargetHTMLElement().parentNode.insertBefore(ccTarget, args.scorecard.getTargetHTMLElement());
        args.targetHtml = args.id+"Configurator";
      }

      // take over defaults if needed
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
          
          var template = "<div class='bcdScorecardDndBlind'><div id='bcdUpDown_{{=it.id}}' class='bcdUpDown'></div><div id='bcdUpDownBody_{{=it.id}}'>";
          [bcdui.component.scorecardConfigurator._renderDndArea, bcdui.component.scorecardConfigurator._renderApplyArea].forEach(function(e) {if (typeof e == "function") template += e(args);});
          template += "</div></div>";

          jQuery("#" + args.targetHtml).append(jQuery(doT.template(template)({id:args.scorecardId})));

          bcdui.widget.createBlindUpDownArea({
            id: "bcdBlindUpDown_" + args.scorecardId
          , targetHtml: "bcdUpDown_" + args.scorecardId
          , bodyIdOrElement:"bcdUpDownBody_" + args.scorecardId
          , caption: "Report Definition"
          , defaultState: layout.query("/*/scc:Layout") == null ? "open": "closed"
          });

          bcdui.widgetNg.createButton({caption: "Apply", onClickAction: args.applyFunction || bcdui.core.lifecycle.applyAction, targetHtml: "bcdDndApplyButton_" + args.scorecardId});
        }

        bcdui.component.scorecardConfigurator._initDnd(args);

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

      bcdui.component.scorecardConfigurator.getNavPath(this.element.attr("id"), function(id, value) {
        bcdui.widget._linkNavPath(id, value);
      }.bind(this));
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
 * A namespace for the BCD-UI scorecardConfigurator widget.
 * @namespace bcdui.component.scorecardConfigurator
 * @private
 */
bcdui.util.namespace("bcdui.component.scorecardConfigurator",
/** @lends bcdui.component.scorecardConfigurator */
{
  init: function(htmlElement){
    bcdui.log.isDebugEnabled() && bcdui.log.debug("bcdui widget adapter init");
    jQuery(htmlElement).bcduiScorecardConfiguratorNg();
  },

  /**
   * returns NavPath information for widget via callback which is addressed by its targetHtmlId
   * @param {string} id targetHtmlElementId of widget
   */
  getNavPath: function(id, callback) {
    return callback(id, "");
  },
  
  /**
   * @private
   */
  _renderDndArea: function(args) {
    return "<div id='bcdDndMatrixDiv_{{=it.id}}'>" + bcdui.component.scorecardConfigurator._generateDefaultLayout() + "</div>";
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
      { parent: "scc:Dimensions/scc:Rows", configParent: "scc:Dimensions", fullBucketItem: "scc:Dimensions/dm:LevelRef", bucketParent: "scc:Dimensions", bucketItem:"dm:LevelRef", bucketId:"bRef", configId:"bRef", generator: "dm:Dimensions/dm:LevelRef", generatorClone: true, dndObject: "RowDimensions", kpiObject: "scc:LevelKpi", kpiObjectMustExist: true}
    , { parent: "scc:KpiRefs", configParent: "scc:KpiRefs", fullBucketItem: "scc:KpiRefs/scc:KpiRef", bucketParent: "scc:KpiRefs", bucketItem: "scc:KpiRef", bucketId: "idRef", configId: "id", dndObject: "Kpis", generator: "scc:Kpis/scc:Kpi", kpiObject: undefined}
    , { parent: "scc:AspectRefs", configParent: "scc:AspectRefs", fullBucketItem: "scc:AspectRefs/scc:AspectRef", bucketParent: "scc:AspectRefs", bucketItem: "scc:AspectRef", bucketId: "idRef", configId: "id", dndObject: "Aspects", generator: undefined, kpiObject: "scc:AspectKpi"}
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
    , optionsModelRelativeValueXPath: "../@bRef"
    , targetHtml: "#" + args.targetHtml + " .bcdScDimensionList"
    , scope: args.scorecardId + "_dims"
    , unselectAfterMove: true
    , generateItemHtml: bcdui.component.scorecardConfigurator._itemRenderer
    };
    bcdui.widgetNg.createConnectable(sourceArgs);
    var targetArgs = {
      targetHtml: "#" + args.targetHtml + " .bcdCurrentScRowDimensionList"
    , targetModelXPath: "$" + scBucket.id + scTargetXPathRoot + "/RowDimensions/@id"
    , isDoubleClickTarget: true
    , scope: args.scorecardId + "_dims"
    , unselectAfterMove: true
    , generateItemHtml: bcdui.component.scorecardConfigurator._itemRenderer
    };
    bcdui.widgetNg.createConnectable(targetArgs);

    // setup connectable source/target for kpis
    var sourceArgs = {
      optionsModelXPath: "$" + scBucket.id + "/*/scc:KpiRefs/scc:KpiRef/@caption"
    , optionsModelRelativeValueXPath: "../@idRef"
    , targetHtml: "#" + args.targetHtml + " .bcdKpiList"
    , scope: args.scorecardId + "_kpi"
    , unselectAfterMove: true
    };
    bcdui.widgetNg.createConnectable(sourceArgs);
    var targetArgs = {
      targetHtml: "#" + args.targetHtml + " .bcdCurrentKpiList"
    , targetModelXPath: "$" + scBucket.id + scTargetXPathRoot + "/Kpis/@id"
    , isDoubleClickTarget: true
    , scope: args.scorecardId + "_kpi"
    , unselectAfterMove: true
    };
    bcdui.widgetNg.createConnectable(targetArgs);

    // setup connectable source/target for aspects
    var sourceArgs = {
      optionsModelXPath: "$" + scBucket.id + "/*/scc:AspectRefs/scc:AspectRef/@caption"
    , optionsModelRelativeValueXPath: "../@idRef"
    , targetHtml: "#" + args.targetHtml + " .bcdAspectList"
    , scope: args.scorecardId + "_asp"
    , unselectAfterMove: true
    };
    bcdui.widgetNg.createConnectable(sourceArgs);
    var targetArgs = {
      targetHtml: "#" + args.targetHtml + " .bcdCurrentAspectList"
    , targetModelXPath: "$" + scBucket.id + scTargetXPathRoot + "/Aspects/@id"
    , isDoubleClickTarget: true
    , scope: args.scorecardId + "_asp"
    , unselectAfterMove: true
    };
    bcdui.widgetNg.createConnectable(targetArgs);


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
            bcdui.core.createElementWithPrototype(scTargetModel.getData(), scTargetXPathRoot + "/Categories[@id='" + e.getAttribute("idRef")+"']");
          });
        };

        // target layout item with parent, bucket item with parent, item identifier, connectable item
         bcdui.component.scorecardConfigurator._DND_OBJECTS.forEach(function(o) {
           jQuery.makeArray(args.targetModel.queryNodes("/*" + scLayoutRoot + "/" + o.parent + "/*")).forEach(function(i) {
            var id = i.getAttribute(o.bucketId);
            if (i.nodeName == o.kpiObject)
              idArray.push("bcdKpi");
            else if (scBucket.query("/*/" + o.fullBucketItem + "[@" + o.bucketId + "='" + id + "']") != null)
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
          var layoutNode = bcdui.core.createElementWithPrototype(bcdui.wkModels.guiStatus, "/*/guiStatus:ClientSettings/scc:ClientLayout[@scorecardId ='"+ args.scorecardId+"']" );
          layoutNode.setAttribute("disableClientRefresh","true");
          // and generate layout
          bcdui.component.scorecardConfigurator._controlModelToScorecardLayout(scBucket, args.targetModel, args.scorecardId);
        }
      }
    });
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
    tempModel.remove(tempModelXPathRoot + scLayoutRoot + "/*/*");

    // now insert kpiRefs, aspectRefs, etc into temp layout based on ordering from collectable targets
    bcdui.component.scorecardConfigurator._DND_OBJECTS.forEach(function(o) {
     jQuery.makeArray(scTargetModel.queryNodes(scTargetXPathRoot + "/" + o.dndObject + "/@id")).forEach(function(i) {
       var item  = targetModel.query("/*" + scLayoutRoot + "/" + o.parent + "/" + o.bucketItem + "[@" + o.bucketId + "='" + i.text + "']");
       item = item != null ? item : scBucket.query("/*/" + o.fullBucketItem + "[@" + o.bucketId + "='" + i.text + "']");
       if (item != null) {
         var destination = tempModel.query(tempModelXPathRoot + scLayoutRoot + "/" + o.parent);
         // if destination does not yet exist, create it
         destination = destination != null ? destination : tempModel.write(tempModelXPathRoot + scLayoutRoot + "/" + o.parent);

         // special translation for kpiObjects like scc:LevelKpi/etc
         if (item.getAttribute(o.bucketId) == "bcdKpi") {
           // special item got subnode (created during bucket fill) with actual object
           destination.appendChild(item.selectSingleNode("./*").cloneNode(true));
         }
         // all other nodes can simply be copied
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
      jQuery.makeArray(targetModel.queryNodes("/*" + scLayoutRoot + "/" + o.parent + "/*")).forEach(function(i){
        var id = i.getAttribute(o.bucketId);
        // generate entry as long as it is part of the bucket
        if (scBucket.query("/*/" + o.fullBucketItem + "[@" + o.bucketId + "='" + id + "']") != null)
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
        if (refList.length > 0 || kpiObjectNode != null) {
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
        else if (o.generator) {

          // in case we have a special item (e.g. LevelKpi), we add it as pseudo item
          if (o.kpiObject)
            scBucket.write("/*/" + o.fullBucketItem + "[@" + o.bucketId + "='bcdKpi' and @caption='KPI']/" + o.kpiObject);

          var datList = jQuery.makeArray(configModel.queryNodes("//" + o.generator));
          // either clone or generate refs out of data
          if (o.generatorClone) {
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
      });

      scBucket.fire();
    }
  },

  /**
   * basic box item renderer which adds one class
   * @private
   */
  _itemRenderer: function(args) {
    var customClass = args.value == "bcdKpi" ? "bcdLocked" : "";
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
      "   <div style='display: none;' class='grid_24 bcdDndCategory'><span></span><span>" + bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_Categories"}) + "</span></div>"
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
