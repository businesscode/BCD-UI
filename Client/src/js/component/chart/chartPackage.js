/*
  Copyright 2010-2025 BusinessCode GmbH, Germany

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
/*
 * TODO
 * - make namespace aware
 * - remove need for formatNumber1000S
 * - provide samples for XSLT embedded, jsp, js
 * - clarify id handling
 * - clarify css
 * - clarify de-registering
 * - be listener on defmodel and data model
 * - remove dummy model for renderer
 * - "dataModel" still hard-coded
 * - legend not yet working
 */
/**
 * The chart package contains classes to draw charts and for drawing primitives like circles, lines and polylines in SVG,
 * see {@link bcdui.component.chart.SVGDrawer}.
 * You can define a chart with js calls with {@link bcdui.component.chart.Chart} 
 * as well as be providing a XML definition according to http://www.businesscode.de/schema/bcdui/charts-1.0.0 using {@link bcdui.component.chart.XmlChart}.
 * @namespace bcdui.component.chart
 */

bcdui.component.chart = Object.assign(bcdui.component.chart, 
/** @lends bcdui.component.chart */
{
  /**
   * Helper for creating a chart with controller from a jsp tag, internally instantiating XmlChart
   * @param {Object} args
   * @param args.id
   * @param args.metaDataModel
   * @param args.targetHtmlElementId
   * @private
   */
  createChart: function(args)
  {
    args.targetHtml = args.targetHTMLElementId = bcdui.util._getTargetHtml(args, "chart_");
    bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.component._schema_createChart_args);
    var id = bcdui.factory.objectRegistry.generateTemporaryId(args.id);

    var target = jQuery("#"+args.targetHtml);
    target.html(
      "<div id='"+id+"'"+
      "  config='"+(args.config||args.metaDataModel)+"'"+
      "  chartRendererId='"+id+"'"+
      "  targetHTMLElementId='"+args.targetHtml+"'>"+
      "</div>"
    );
    bcdui.component.chart.init( target.children("div").get(0) );
  },

  /**
   * Glue ware for constructing a chart HTML element based on an targetHTMLElement
   * waits for metaDataModel being available
   * @private
   */
  init: function( htmlElement )
  {
    const targetHTMLElement = htmlElement || this;
    
    jQuery("#" + targetHTMLElement.getAttribute("targetHTMLElementId")).addClass("bcdChart statusNotReady");

    // Wait until the metaDataModel is available and create the chart for the targetHTMLElement
    var metaDataModel = targetHTMLElement.hasAttribute("config") ? targetHTMLElement.getAttribute("config") : targetHTMLElement.getAttribute("metaDataModel");
    bcdui.factory.objectRegistry.withReadyObjects({
      ids: [metaDataModel],
      fn: function() {
        let constr = typeof bcdui.component.chart.ChartEchart === "undefined" ? bcdui.component.chart.XmlChart : bcdui.component.chart.ChartEchart;
        var chart = new constr(
            { id: targetHTMLElement.getAttribute("id"),
              targetHtml: targetHTMLElement.getAttribute("targetHTMLElementId"),
              config: bcdui.factory.objectRegistry.getObject(metaDataModel)
            }
        );
        jQuery("#" + targetHTMLElement.getAttribute("targetHTMLElementId")).removeClass("statusNotReady").addClass("statusReady");
      }
    });
  },

  /**
   * Create a legend for the chart, listing all series
   * @param {Object} args - Parameter object
   * @param {bcdui.core.DataProvider} args.inputModel          - Input model to renderer
   * @param {string}                  args.targetHtmlElementId - Target HTML element ID
   * @param {string}                  [args.id]                - Renderer ID
   * @param {string}                  [args.chartRendererId]   - ID of chart renderer
   * @param {string}                  [args.elementStyle]      - Style for legend HTML element
   * @return {bcdui.core.Renderer} renderer that creates legend renderer
   */
  createChartLegend: function(args){

    args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.component._schema_createChartLegend_args );
    args.targetHtml = args.targetHTMLElementId = bcdui.util._getTargetHtml(args, "chartLegend_");
    bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.component._schema_createChartLegend_args);

    var id = bcdui.factory.objectRegistry.generateTemporaryId(args.id);
    var params = {id:id};
    if(args.chartRendererId) params["chartRendererId"] = args.chartRendererId;
    if(args.elementStyle) params["elementStyle"] = args.elementStyle;
    if(args.targetHTMLElementId) params["targetHTMLElementId"] = args.targetHTMLElementId;

    var a = bcdui.factory.createRenderer(
      {
        id: id+"_ExecLegendRenderer"
        ,url: bcdui.util.url.resolveToFullURLPathWithCurrentURL("/bcdui/js/component/chart/legendStylesheet.xslt")
        ,inputModel: args.inputModel || bcdui.wkModels.guiStatus
        ,targetHTMLElementId: args.targetHTMLElementId
        ,parameters: params
      }
    );
    return a;
  },

  /**
   * Creates an ECharts chart from a Wrs, the chart type and series are derived from the Wrs, see configurationFromWrs.xslt for the supported layouts
   * The Wrs needs dimId and valueId in its header, as any WrsRequest response has, like a cube or a grouped AutoModel
   * Also available as JSP tag &lt;component:chartFromWrs&gt; and as HTML custom element &lt;bcd-chartFromWrs&gt;
   * @param {Object} args - Parameter object
   * @param {bcdui.core.DataProvider} args.inputModel              - The Wrs to show, like a cube or an AutoModel, an object or its id
   * @param {targetHtmlRef}           args.targetHtml              - Where to draw the chart, it needs a width and height set via inline style or CSS, as ECharts does not draw into an element without size.
   *                                                                 For &lt;bcd-chartFromWrs&gt; the custom element itself is the target
   * @param {string}                  [args.id]                    - Id of the chart renderer
   * @param {Object}                  [args.options]               - ECharts options, merged into the derived ones, like legend or grid, in JSP and XAPI given as JSON string
   * @param {boolean}                 [args.isAutoRefresh=false]   - If true, the chart is re-derived and redrawn each time the inputModel becomes ready again,
   *                                                                 like after a client-side cube action such as sorting or an AutoModel reload due to isAutoRefresh
   * @return {bcdui.component.chart.ChartEchart} the chart renderer, undefined if inputModel was given as id of a not yet registered object,
   *   in that case the chart is created once the object is registered
   * @example
   * bcdui.component.chart.createChartFromWrs({ inputModel: cube, targetHtml: "#myChart", isAutoRefresh: true });
   */
  createChartFromWrs: function(args)
  {
    args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.component._schema_createChartFromWrs_args );
    args.targetHtml = args.targetHTMLElementId = bcdui.util._getTargetHtml(args, "chartFromWrs_");
    bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.component._schema_createChartFromWrs_args);
    const isAutoRefresh = bcdui.factory._normalizeBoolean(args.isAutoRefresh, false);
    // JSP and XAPI pass options as JSON string
    if (typeof args.options === "string")
      args.options = args.options.trim() !== "" ? JSON.parse(args.options) : undefined;

    const create = function(inputModel) {
      const config = new bcdui.core.ModelWrapper({
        chain: bcdui.util.url.resolveToFullURLPathWithCurrentURL("/bcdui/js/component/chart/configurationFromWrs.xslt"),
        inputModel: inputModel
      });
      const chart = new bcdui.component.chart.ChartEchart({
        id: args.id,
        targetHtml: args.targetHtml,
        options: args.options,
        config: config
      });
      // Renderers and ModelWrappers do not follow their input by themselves, an input which is already ready is not re-executed
      if (isAutoRefresh) {
        inputModel.onReady({ onlyFuture: true, onSuccess: function() { config.execute(true); } });
        config.onReady({ onlyFuture: true, onSuccess: function() { chart.execute(true); } });
      }
      return chart;
    };

    // JSP and custom element pass the inputModel as id, which may be registered only later
    if (typeof args.inputModel === "string" || args.inputModel instanceof String) {
      const inputModelId = "" + args.inputModel;
      const inputModel = bcdui.factory.objectRegistry.getObject(inputModelId);
      if (inputModel)
        return create(inputModel);
      bcdui.factory.objectRegistry.withObjects(inputModelId, function() { create(bcdui.factory.objectRegistry.getObject(inputModelId)); });
      return undefined;
    }
    return create(args.inputModel);
  },


  /**
   * initialized legend renderer from given over HTML element that contains
   * all needed settings for legend renderer
   *
   * @param targetHTMLElement - Target Html Element
   * @private
   */
  initChartLegend: function( htmlElement ){
    
    const targetHTMLElement = htmlElement || this; 

    var chartRendererId = bcdui._migPjs._$(targetHTMLElement).attr("chartRendererId");
    var targetHTMLElementId = bcdui._migPjs._$(targetHTMLElement).attr("targetHTMLElementId");
    var legendRendererId = bcdui._migPjs._$(targetHTMLElement).attr("legendRendererId");
    if(! targetHTMLElementId){
      targetHTMLElementId = bcdui._migPjs._$(targetHTMLElement).get(0).id;
    }
    var params= jQuery.makeArray(bcdui._migPjs._$(targetHTMLElement).get(0).attributes).reduce(function(map, attr) { map[attr.name] = attr.value; return map; }, {});

    bcdui.factory.objectRegistry.withReadyObjects({
      ids:[chartRendererId]
      ,fn: function(){
        var chartRenderer = bcdui.factory.objectRegistry.getObject(chartRendererId);
        var inModel = chartRenderer.getPrimaryModel();

        // only if chart was drawn - draw legend too
        bcdui.factory.createRenderer({
          id: legendRendererId
          ,url: bcdui.util.url.resolveToFullURLPathWithCurrentURL("/bcdui/js/component/chart/legend.xslt")
          ,inputModel: inModel
          ,targetHTMLElementId: targetHTMLElementId
          ,parameters: params
        });
        
        bcdui.factory.objectRegistry.getObject(legendRendererId).onReady(function() {
          jQuery("#" + targetHTMLElementId).off("click");
          jQuery("#" + targetHTMLElementId).off("mouseover");
          jQuery("#" + targetHTMLElementId).off("mouseout");

          const clickAction = inModel.read("//chart:DrawSeriesLegend/@onClick", "");
          const mouseOverAction = inModel.read("//chart:DrawSeriesLegend/@onMouseOver", "");
          const mouseOutAction = inModel.read("//chart:DrawSeriesLegend/@onMouseOut", "");

          if (clickAction != "")
            jQuery("#" + targetHTMLElementId).on("click", ".bcdAction", function(event) {
              bcdui.util._executeJsFunctionFromString(clickAction, null, [event]);
          });
          if (mouseOverAction != "")
            jQuery("#" + targetHTMLElementId).on("mouseover", ".bcdAction", function(event) {
              bcdui.util._executeJsFunctionFromString(mouseOverAction, null, [event]);
          });
          if (mouseOutAction != "")
            jQuery("#" + targetHTMLElementId).on("mouseout", ".bcdAction", function(event) {
            bcdui.util._executeJsFunctionFromString(mouseOutAction, null, [event]);
          });
        });
      }
    });
    // thus we want redisplay legend all the time chart have been redisplayed
    bcdui.factory.addStatusListener({
      idRef: chartRendererId
      ,status: '.getReadyStatus()'
      ,onlyOnce: false
      ,listener: function() {
        var legendRenderer = bcdui.factory.objectRegistry.getObject(legendRendererId);
        if(legendRenderer ){
          var chartRenderer = bcdui.factory.objectRegistry.getObject(chartRendererId);
          legendRenderer.execute();
        }
        else {
          bcdui.log.warn("no legend renderer:" + legendRendererId);
        }
      }
    });
  }
}); // namespace

/**
 * For compatibility and consistency. All other components have their "create" method in component package directly
 * @private
 */
bcdui.component.createChart = bcdui.component.chart.createChart;
bcdui.component.createChartFromWrs = bcdui.component.chart.createChartFromWrs;

export const bcduiExport_createChartFromWrs = bcdui.component.chart.createChartFromWrs;