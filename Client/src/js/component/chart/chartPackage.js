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
bcdui.util.namespace("bcdui.component.chart", 
/** @lends bcdui.component.chart */
{

  /**
   * Helper for creating a chart with controller from a jsp tag, interannly instantating XmlChart
   * @param id
   * @param metaDataModel
   * @param targetHtmlElementId
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
  init: function( targetHTMLElement )
  {
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
   * @param {Object} args - Paramater object
   * @param {bcdui.core.DataProvider} args.inputModel          - Input model to renderer
   * @param {string}                  args.targetHtmlElementId - Target HTML element ID
   * @param {string}                  [args.id]                - Renderer ID
   * @param {string}                  [args.chartRendererId]   - ID of chart renderer
   * @param {string}                  [args.elementStyle]      - Style for legend HTML element
   * @return renderer that creates legend renderer
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
        ,url: bcdui.util.url.resolveToFullURLPathWithCurrentURL("/bcdui/js/component/chart/legendTemplate.xslt")
        ,inputModel: args.inputModel || bcdui.wkModels.guiStatus
        ,targetHTMLElementId: args.targetHTMLElementId
        ,parameters: params
      }
    );
    return a;
  },


  /**
   * initialized legend renderer from given over HTML element that contains
   * all needed settings for legend renderer
   *
   * @param args: id                   -  renderer ID
   *               targetHTMLElementId  - target HTML element ID
   * @private
   */
  initChartLegend: function(targetHTMLElement ){

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