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
 * Marimekko ignoring category width
 * Scattered chart Axis captions overlapping, name of 3. value missing
 * Make sure tooltip is always on screen
 * Center chart title
 * Sunburst: we only check for a group change in the inner most level, we should look all the way up
 * PDF export
 */

/**
 * Create a chart based on http://www.businesscode.de/schema/bcdui/charts-1.0.0 XML
 * @type {bcdui.component.chart.ChartEchart}
 * @extends bcdui.core.Renderer
 */
bcdui.component.chart.ChartEchart = class extends bcdui.core.Renderer {

  /**
   * @constructs
   * @param {Object} args - Parameter object:
   * @param {targetHtmlRef} args.targetHtml                       - Where to place the chart
   * @param {bcdui.core.DataProvider} args.config                 - Definition if the chart according to Model with the chart definition according to XSD http://www.businesscode.de/schema/bcdui/charts-1.0.0
   * @param {Object} args.options                                 - Options of ECharts, extending / being merged with the options deried from config
   */
  constructor(args)
  {
    args = Object.assign({parameters: {paramModel: args.config}}, args);
    super(args);
    this.config = args.config;
    this.userOptions = Object.assign(true, {}, bcdui.component.chart.ChartEchart.OPTIONS, args.options);
  }

  /**
   * creates a new instance bound to current targetHtml, any one-time inits are performed here.
   * @private
   */
  _createInstance(){
    this.instance = echarts.init(document.getElementById(this.targetHtml), null, {renderer: "canvas"});
    return this.instance;
  }

  /**
   * @private
   */
  _refresh()
  {
    // Update or brand new chart?
    let existInstance = echarts.getInstanceByDom( document.getElementById(this.targetHtml) );
    let myChart = existInstance || this._createInstance();

    if( this.config.read("/*/chart:Series/chart:Series[@chartType='SUNBURSTCHART']") === null )
      this._nonSunburst(myChart);
    else
      this._sunburst(myChart);

    var newStatus = this._uncommitedWrites ? this.waitingForUncomittedChanges : this.transformedStatus;
    this.setStatus(newStatus);
  }

  /**
   * All chart types exept sunburst
   * @private
   */
  _nonSunburst(myChart)
  {
    // Clean number formatting
    let d3Format2s = d3.format(".2~s");
    let d3Format2f = d3.format(".2~f");
    let d3Format2p = d3.format(".2~p");
    let numFormat2 = function(val,idx){ return val>=1||val<0.0001 ? d3Format2s(val) : d3Format2f(val) };
    let d3Format3s = d3.format(".3~s");
    let d3Format3f = d3.format(".3~f");
    let d3Format3p = d3.format(".3~p");
    let numFormat3 = function(val,idx){ return val>=1||val<0.0001 ? d3Format3s(val) : d3Format3f(val) };
    let getNumFormatter = function(prec, unit) {
      return function(val,idx){
        if( prec===2 && unit==='%' )
          return d3Format2p(val);
        else if ( prec===2 )
          return (Math.abs(val)>=1||Math.abs(val)<0.0001 ? d3Format2s(val) : d3Format2f(val)) + (unit||'');
        else if( prec===3 && unit==='%' )
          return d3Format3p(val);
        else
          return (Math.abs(val)>=1||Math.abs(val)<0.0001 ? d3Format3s(val) : d3Format3f(val)) + (unit||'');
      };
    };

    // Prepare chart switch to svg to support pdf export
    let title = this.config.read("/*/@title",'');
    let opts = {
        tooltip: {},
        grid: { bottom: "45px" },
        title: {
          left: "center",
          textStyle: {
            fontSize: 12,
            fontWeight: 100
          }
        },
        xAxis: {},
        yAxis: [],
        series: [],
        toolbox: {
          feature: {}
        }
       };

    // Chart title, put make it somewhat near the center
    opts.title.text = title;

    let showLegend = this.config.read("/*/@showLegend");
    if( showLegend ) {
      opts.legend = { type: "scroll" };
      opts.legend[showLegend] = 0;
      if( showLegend === "bottom" && this.config.read("/*/chart:XAxis/@caption") )
        opts.grid.bottom = "65px"
    }

    let toolipAxisPointer = this.config.read("/*/chart:Tooltip/@axisPointer");
    if( toolipAxisPointer )
      opts.tooltip.axisPointer = { type: toolipAxisPointer };

    
    // X-axis in case of categories
    let xCategories = null;
    if( this.config.read("/*/chart:XAxis/chart:Categories") !== null ) {
      let catModelId = this.config.read("/*/chart:XAxis/chart:Categories/@modelId");
      let catModel = bcdui.factory.objectRegistry.getObject( catModelId );
      var nodes;
      if( !!catModel )
        nodes = catModel.queryNodes( this.config.read("/*/chart:XAxis/chart:Categories/@nodes") );
      else
        nodes = this.config.queryNodes("/*/chart:XAxis/chart:Categories/chart:Value");

      if( this.config.read("/*/chart:Series/chart:Series[@chartType='PIECHART']") === null )
        opts.xAxis.data = Array.prototype.slice.call( nodes ).map( n => n.text );
      xCategories = Array.prototype.slice.call( nodes ).map( n => n.text );
    }

    // X-axis in case of continuous numeric values (also allow xValues on any series, e.g. polar chart here to see if data is available)
    let xValues = null;
    if( this.config.read("/*//chart:XValues") !== null ) {
      let xValuesModelId = this.config.read("/*//chart:XValues/@modelId");
      let xValuesModel = bcdui.factory.objectRegistry.getObject( xValuesModelId );
      let nodes = xValuesModel.queryNodes( this.config.read("/*//chart:XValues/@nodes") );
      xValues = Array.prototype.slice.call( nodes ).map((n)=>parseFloat(n.text));
    }
    opts.xAxis.name = this.config.read("/*/chart:XAxis/@caption", "");
    opts.xAxis.nameLocation = "middle";
    opts.xAxis.nameGap = 30;
    // If labels are rotated, move axis name a bit down
    let lf = -parseInt(this.config.read("/*/chart:XAxis/@layoutFlow","0"));
    if( lf ) {
      opts.xAxis.axisLabel = { rotate: lf };
      opts.xAxis.nameGap = 45;
    }

    if( this.config.query("/*/chart:XAxis/chart:DataZoom") !== null ) {
      let type = this.config.query("/*/chart:XAxis/chart:DataZoom/@type", "inside");
      opts.dataZoom = [{
          type: type,
          xAxisIndex: [0]
      }];
    }

    
    // Handle properties of Y-axis
    for(var a=1; a<=2; a++) {
      if( this.config.queryNodes("/*/chart:YAxis"+a).length > 0 ) {
        let axis = {};
        let yAxisLabel = this.config.read("/*/chart:YAxis"+a+"/@caption");
        let yAxisIsStackedPerc = this.config.read("/*/chart:Stacked[@axis='"+a+"']/@asPercent") === 'true';
        let yAxisUnit =  yAxisIsStackedPerc ? '%' : this.config.read("/*/chart:YAxis"+a+"/@unit","");
        if(yAxisLabel!==null)
          axis.name = yAxisLabel + (yAxisLabel != "" && yAxisUnit!==""?' ['+yAxisUnit+']':"");
        axis.axisLabel = { formatter: getNumFormatter(2, yAxisUnit) };
        axis.nameGap = 20;
        axis.bcdUnit = yAxisUnit;
        opts.yAxis.push(axis);
        if( this.config.query("/*/chart:YAxis"+a+"/chart:DataZoom") !== null ) {
          let type = this.config.query("/*/chart:YAxis"+a+"/chart:DataZoom/@type", "inside");
          opts.dataZoom = opts.dataZoom || [];
          opts.dataZoom.push({
            type: type,
            yAxisIndex: [(a-1)]
          });
        }
      }
    }

    // This explicitly sets one color per series
    let seriesColorList = Array.prototype.slice.call( this.config.queryNodes("/*/chart:SeriesColors/chart:Color") ).map((n)=>n.text);

    // Loop over series
    var axisMin = [Infinity, Infinity];
    var axisMax = [-Infinity, -Infinity];
    var boxplotData = [];
    for( var s = 1, len = this.config.queryNodes("/*/chart:Series/chart:Series").length; s <= len; s++ )
    {
      // Read series properties
      let series = { bcdAttrs: {} };
      let axis1or2 = parseInt(this.config.read("/*/chart:Series/chart:Series["+s+"]/@yAxis1Or2",'1'));
      series.yAxisIndex = axis1or2 - 1;
      let unit = this.config.read("/*/chart:Stacked[@axis='"+axis1or2+"']/@asPercent") === 'true' ? '%' : this.config.read("/*/chart:YAxis"+axis1or2+"/@unit",'');
      series.bcdAttrs.unit = unit; // echarts does not know the concept of units
      let chartType = this.config.read("/*/chart:Series/chart:Series["+s+"]/@chartType") || (unit == "%" ? "LINECHART" : "BARCHART");

      // If we detect BARCHARTHORIZONTAL, we make some adjustments to the axis, but treat it as BARCHART otherwise
      if(chartType == "BARCHARTHORIZONTAL") {
        chartType = "BARCHART";
        opts.yAxis[0].data = xCategories;
        opts.yAxis[0].type = "category";
        opts.yAxis[0].axisLabel.formatter = null;
        opts.xAxis.type = "value";
      }

      series.type = chartType.replace("CHART","").replace("AREA","LINE").replace("SCATTERED","SCATTER").replace("MARIMEKKO","BAR").toLowerCase();
      series.name = this.config.read("/*/chart:Series/chart:Series["+s+"]/@caption");

      // Set series' color. Can be local @rgb or from seriesColorList
      let seriesColor = this.config.read("/*/chart:Series/chart:Series["+s+"]/@rgb") || seriesColorList[s-1] || null;
      series.itemStyle = { color: seriesColor };

      // Read data as an array.
      // Either nodes from a model given by id or in-lined. Also limit it to the number of x-axis values/categories and remove infinity values
      let model = bcdui.factory.objectRegistry.getObject( this.config.read("/*/chart:Series/chart:Series["+s+"]/chart:YData/@modelId") );
      var nodes;
      if( !!model )
        nodes = model.queryNodes( this.config.read("/*/chart:Series/chart:Series["+s+"]/chart:YData/@nodes") );
      else
        nodes = this.config.queryNodes("/*/chart:Series/chart:Series["+s+"]/chart:YData/chart:Value");
      nodes = Array.prototype.slice.call( nodes );

      // cut down series to x/category values (except for boxplot)
      if (chartType != "BOXPLOT")
        nodes = nodes.slice(0, xCategories ? xCategories.length : xValues ? xValues.length : 0 );
      nodes = nodes.map( n => { let v = parseFloat(n.text); return isFinite(v) ? v : undefined } ); // echarts do not handle Infinity values well

      // Special handling gauge chart
      if( chartType==="GAUGECHART" ) {
        series.min = xValues[0];
        series.max = xValues[xValues.length -1];
        let diff = series.max - series.min;
        series.data = nodes.map( function(n){ return { value: n, name: series.name } } );
        let colors = xValues.slice(1).map( (n, idx) => [(n - series.min) / diff, seriesColorList[idx] ] );
        series.axisLine = { lineStyle: { color: colors } };
        series.splitNumber = 4;
        series.axisTick = { length: 0 };
        series.splitLine = { lineStyle: { color: "auto" } };
        series.detail = { formatter: getNumFormatter(3, unit), fontSize: "200%", offsetCenter: [0, '40%'] };
        opts.series.push(series);
        opts.axisLabel = { formatter: getNumFormatter(2, unit) };
        opts.xAxis = null;
        opts.yAxis = null;
        opts.tooltip.trigger = "item";
      }

      // Special handling pie chart
      else if( chartType==="PIECHART" ) {
        series.data = nodes.map( (n, idx) => { return {value: n, name: xCategories[idx]} } );
        opts.series.push(series);
        opts.xAxis = null;
        opts.yAxis = null;
        opts.tooltip.trigger = "item";
      }

      // Special handling pie scattered chart
      else if( chartType==="SCATTEREDCHART" ) {
        if( s===1 ) {
          series.data = nodes.map( n => [n] );
          opts.series.push(series);
          opts.yAxis[0].min = series.data.reduce( (agg, v) => agg < v ? agg : v[0], Infinity ) * 0.9;
          opts.yAxis[0].max = series.data.reduce( (agg, v) => agg > v ? agg : v[0], -Infinity ) * 1.1;
        } else {
          let sizes = nodes;
          opts.series[0].data.forEach( (v, idx) => v.push(sizes[idx]) );
          let max = sizes.reduce( (agg, v) => agg > v ? agg : v, -Infinity );
          let fact = 50/(max*max);
          opts.series[0].symbolSize = function (data) {
            var size = (data[2]*data[2] * fact);
            if (size != 0)
              size += 2;
            return size;
          };
        }
        series.bcdAttrs.unit = [
          this.config.read("/*/chart:XAxis/@unit",''),
          this.config.read("/*/chart:YAxis1/@unit",''),
          this.config.read("/*/chart:YAxis2/@unit",'')
        ];
        opts.tooltip.trigger = "item";
        if(this.config.query("/*//chart:DataZoom[1]") != null){
          opts.toolbox.feature.dataZoom = {};
        }
      }
      else if (chartType == "BOXPLOT" && nodes.length > 0) {

        let showOutliers = this.config.read("/*/chart:Series/chart:Series[@chartType='BOXPLOT']/@boxPlotOutliers",'false') == "true";
        
        // collect all series data before processing the chart via _prepareBoxplotData
        boxplotData.push(nodes);
        if (this.config.queryNodes("/*/chart:Series/chart:Series").length == s) {
          var data = this._prepareBoxplotData(boxplotData);
          opts.series = opts.series || [];
          opts.tooltip = opts.tooltip || {};
          while (opts.series.length < (showOutliers ? 2 : 1)) {
            opts.series.push({bcdAttrs: { unit: series.unit }});
          }
          opts.series[0].type = opts.series[0].type || "boxplot";
          opts.series[0].data = data.boxData;

          if (showOutliers) {
            opts.series[1].data = data.outliers;
            opts.series[1].type = opts.series[1].type || "scatter";
          }
        }
      }

      // polar chart handling
      else if (chartType === "POLARCHART" && nodes.length > 0) {

        let noGap = this.config.read("/*/chart:Series/chart:Series["+s+"]/@polarNoGap",'true') == "true";
        
        if( typeof opts.polar == "undefined" ) {
          opts.polar = opts.polar || {};
          opts.angleAxis = opts.angleAxis || {};
          opts.radiusAxis = opts.radiusAxis || {};
          opts.series = opts.series || [];
          opts.angleAxis.splitLine = opts.angleAxis.splitLine || {},
          opts.angleAxis.splitLine.show = true;
          opts.angleAxis.interval = 1;
          // either categories or x/y values
          if (this.config.read("/*/chart:XAxis/chart:Categories") !== null) {
            opts.angleAxis.type = "category";
            opts.angleAxis.data = opts.xAxis.data;
            opts.angleAxis.clockwise = false;
          }
          else
            opts.angleAxis.type = "value";
        }
        if (this.config.query("/*//chart:XValues") !== null) {
          // xValues per series
          if (this.config.query("/*/chart:Series/chart:Series["+s+"]/chart:XValues") != null) {
            let xValuesModelId = this.config.read("/*/chart:Series/chart:Series["+s+"]/chart:XValues/@modelId");
            let xValuesModel = bcdui.factory.objectRegistry.getObject( xValuesModelId );
            let xNodes = xValuesModel.queryNodes( this.config.read("/*/chart:Series/chart:Series["+s+"]/chart:XValues/@nodes") );
            let xValuesNew = Array.prototype.slice.call( xNodes ).map((n)=>parseFloat(n.text));
            if (noGap) {
              xValuesNew.push(xValuesNew[0]);
              nodes.push(nodes[0]);
            }
            nodes = nodes.map(function(e,i) { return [nodes[i], xValuesNew[i]]; });
          }
          // xValues via xAxis
          else {
            if (noGap) {
              xValues.push(xValues[0]);
              nodes.push(nodes[0]);
            }
            nodes = nodes.map(function(e,i) { return [nodes[i], xValues[i]]; });
          }
        }
        // we got categories
        else {
          if (noGap)
            nodes.push(nodes[0]);
        }

        var caption = this.config.read("/*/chart:Series/chart:Series["+s+"]/@caption");
        opts.series.push({ name: caption, coordinateSystem: 'polar', type: "line", data: nodes, bcdAttrs: { unit: series.unit } });
        opts.xAxis = null;
        opts.yAxis = null;
      }

      // Special handling radar chart
      // radar series are treated as one series with multiple data arrays by echarts, this also influences the tooltip
      else if( chartType==="RADARCHART" && nodes.length > 0 ) {
        let seriesData = {value: nodes.map( (n, idx) => { return n } ), name: series.name};
        let max = seriesData.value.reduce((a,v)=>Math.max(a,v),0) * 1.15;
        if( typeof opts.radar == "undefined" || typeof opts.radar.indicator == "undefined" ) {
          opts.radar = opts.radar || {};

          // enable radar scale labels
          this.scaleCount = 0;
          var self = this;
          opts.radar.axisLabel = { show: true
            , formatter: function(value, index) {
              return (index == self.scaleCount++ ? parseFloat(value).toFixed(1) : "");
            }
          };

          opts.radar.indicator = opts.xAxis.data.map((v,i)=>({name: ""+v, max: max}));
        } else if( !!opts.radar.indicator && max > opts.radar.indicator[0].max ) {
          for( var i = 0; i < opts.radar.indicator.length; i++ ) opts.radar.indicator[i].max = max; 
        }
        opts.series[0] = opts.series[0] || { type: "radar", data: [], bcdAttrs: { unit: series.unit } };
        opts.series[0].data.push( seriesData );
        opts.xAxis = null;
        opts.yAxis = null;
      }

      // For a waterfall bar chart, we simulate that with 3 stacked BARCHRT series
      else if( chartType==="BARCHART" && this.config.query("/*/chart:Series/chart:Series["+s+"]/chart:BarWaterfall")  && nodes.length > 0 ) {
        let seriesData = nodes.map( function(n) { return {value: n} } );
        series.stack = "stacked";
        let bottom = [0];
        // Create the three series, that define the layout
        // bottomSeries defines the bottom (how high the bar starts) and is invisible
        // upSeries represents all values >= 0 and is only visible for positive values
        // downSeries represents all values < 0 and is only visible for negative values
        let bottomSeries = JSON.parse(JSON.stringify(series));
        let upSeries = JSON.parse(JSON.stringify(series));
        let downSeries = JSON.parse(JSON.stringify(series));
        bottomSeries.data = [{value: 0, bcdTooltipSkip: true}];
        bottomSeries.itemStyle = { color: "rgb(0,0,0,0)" };
        upSeries.data = [{value: seriesData[0].value}];
        upSeries.itemStyle = { color: seriesColor };
        upSeries.label = { normal: { show: true, position: 'top'} };
        downSeries.data   = [{value: '-', bcdTooltipSkip: true}];
        let downColor = this.config.read("/*/chart:Series/chart:Series["+s+"]/chart:BarWaterfall/@downRgb");
        downSeries.itemStyle = { color: downColor || "rgb(200,0,0,255)" };
        downSeries.label = { normal: { show: true, position: 'bottom'} };
        var max = seriesData[0].value;
        let seriesUnit = opts.yAxis[0].bcdUnit;
        
        // For each value in our series, set the corresponding value in the three virual ones
        for(var i=1; i<seriesData.length; i++) {
          bottom.push( bottom[i-1] + seriesData[i-1].value );
          if( seriesData[i].value >= 0 ) {
            bottomSeries.data.push( {value: bottom[i], bcdTooltipSkip: true } );
            upSeries.data.push({value: seriesData[i].value, bcdLabelValues: [getNumFormatter(3,seriesUnit)(seriesData[i].value), getNumFormatter(3,seriesUnit)(bottom[i] + seriesData[i].value)]});
            downSeries.data.push( {value: '-', bcdTooltipSkip: true } );
            max = Math.max(max, bottom[i] + upSeries.data[i].value );
          } else {
            // If we have a negative value, we need to draw it as a positive one because otherwise it would be shown doen the x-axis.
            // But we make sure the negative one is shown in the tooltip
            bottomSeries.data.push( {value: bottom[i] + seriesData[i].value, bcdTooltipSkip:true } );
            upSeries.data.push( {value: '-', bcdTooltipSkip: true } );
            downSeries.data.push({value: -seriesData[i].value, bcdLabelValues: [getNumFormatter(3,seriesUnit)(seriesData[i].value), getNumFormatter(3,seriesUnit)(bottom[i] + seriesData[i].value)]});
            max = Math.max(max, bottom[i] );
          }
        }

        // maybe th user wants to add a "total" bar with the result at the end
        if( this.config.read("/*/chart:Series/chart:Series["+s+"]/chart:BarWaterfall/@showTotal") === "true" ) {
          bottomSeries.data.push( {value: 0, bcdTooltipSkip:true } );
          upSeries.data.push({value: bottom[i-1] + seriesData[i-1].value, bcdLabelValues: [getNumFormatter(3,seriesUnit)(seriesData[i-1].value), getNumFormatter(3,seriesUnit)(bottom[i-1] + seriesData[i-1].value)]});
          downSeries.data.push( {value: '-', bcdTooltipSkip: true } );
          opts.xAxis.data.push(bcdui.i18n.syncTranslateFormatMessage("bcd_Total"));
        }

        // Adjust the y axis height and add the 3 series
        opts.yAxis[0].max = max * 1.1;
        opts.series.push(bottomSeries);
        opts.series.push(upSeries);
        opts.series.push(downSeries);
      }

      // All other known chart types
      else {
        series.data = nodes.map( function(n) { return {value: n} } );
        
        opts.series.push(series);

        // Some special styling
        if( chartType==="MARIMEKKOCHART" )
          series.barCategoryGap = "5%";
        if( chartType==="AREACHART" )
          series.areaStyle = {};

        axisMin[axis1or2 - 1] = series.data.reduce( (agg, v) => agg < v.value ? agg : v.value, axisMin[axis1or2 - 1] );
        axisMax[axis1or2 - 1] = series.data.reduce( (agg, v) => agg > v.value ? agg : v.value, axisMax[axis1or2 - 1] );
        opts.tooltip.trigger = "axis";
      }
    }

    // If we have only a narrow band for % values in the series, like it is the case for ontime around 90-95, zoom in
    // Special handling for stacked as percentage further down below
    if( this.config.queryNodes("/*/chart:Series/chart:Series[@chartType='LINECHART' or @chartType='AREACHART' or @chartType='BARCHART' or @chartType='POINTCHART']").length > 0 ) {
      for( var a = 0; a < opts.yAxis.length; a++ ) {
        let axis = opts.yAxis[a];
        if( axis.bcdUnit === '%' && axisMax[a] - axisMin[a] < 0.2 ) {
          axis.min = Math.round(axisMin[a] * 50 * (axisMin[a] > 0 ? 0.95 : 1.05)) / 50;
          axis.max = Math.round(axisMax[a] * 50 * (axisMax[a] > 0 ? 1.05 : 0.95)) / 50;
        }
      }
      if(this.config.query("/*//chart:DataZoom[1]") != null){
        opts.toolbox.feature.dataZoom = {};
      }
    }


    // Tooltip
    // Several enhancements in terms of number formatting and including support for original values in case of stacked-as-percent charts
    opts.tooltip.formatter = function (paramsIn, ticket, callback) {
      var params = Array.isArray(paramsIn) ? paramsIn : [paramsIn];
      var seriesName = params[0].name;
      if( paramsIn.seriesType === "radar" ) {
        params = paramsIn.data.value.map((v,i)=>({value: v, seriesName: opts.radar.indicator[i].name, data: {}}));
      }
      var res = "<table>";
      if( seriesName )
        res += "<tr><th colspan='100' style='text-align:center'>- " + seriesName + " -</th></tr>";
      for (var s = 0; s <params.length; s++) {
        if( !!params[s].data.bcdTooltipSkip ) continue;
        let unit = (paramsIn.seriesType === "radar" || paramsIn.seriesType === "boxplot" ) ? opts.series[0].bcdAttrs.unit : opts.series[params[s].seriesIndex].bcdAttrs.unit;
        res += "<tr><td><span style='font-size: 250%; vertical-align: text-bottom; color:"+(params[s].color)+"'>&#x2022;</span>" + params[s].seriesName + "</td>";
        let values = Array.isArray(params[s].value) ? params[s].value : [params[s].value];
        for( var v=0; v< values.length; v++ ) {
          let thisUnit = Array.isArray(unit) ? unit[v] : unit;
          if( params[s].percent ) {
            res += "<td>&nbsp;</td>";
            res += "<td style='text-align: right'>" + getNumFormatter(3, '')(params[s].percent) + "%</td>";
          }
          res += "<td>&nbsp;</td>";
          if( params[s].data.bcdLabelValues ) {
            for( var lv = 0; lv < params[s].data.bcdLabelValues.length; lv++ ) {
              res += "<td style='text-align: right'>" + params[s].data.bcdLabelValues[lv] + "</td>";
              res += "<td>&nbsp;</td>";
            }
          } else {
            res += "<td style='text-align: right'>" + getNumFormatter(3, thisUnit)(values[v]) + "</td>";
          }
          if( params[s].data.bcdOrig ) {
            res += "<td>&nbsp;</td>";
            res += "<td style='text-align: right'>" + params[s].data.bcdOrig + "</td>";
          }
        }
        res += "</tr>";
      }
      res += "</table>";
      return res;
    };

    // When x-axis is not categories but continuous values, do some post-processing after having read all series
    if( xValues !== null ) {
      if( this.config.read("/*/chart:Series/chart:Series[@chartType='SCATTEREDCHART']") !== null )
        opts.series[0].data.forEach( (d, idx) => d.unshift(xValues[idx]) );
      else if( this.config.read("/*/chart:Series/chart:Series[@chartType='GAUGECHART']") === null && this.config.read("/*/chart:Series/chart:Series[@chartType='POLARCHART']") === null )
        opts.series[0].data = opts.series[0].data.map( function(d, idx) { return {value: [ xValues[idx], d.value ] }; } );
    }

    // Handle stacked series
    let stackedChartType = this.config.read("/*/chart:Stacked/@chartType");
    if( stackedChartType ) {
      // First lets find the series that should be stacked and mark them as to be stacked towards echarts
      let stackedSeriesIdxs = [];
      for( var s = 1, len = this.config.queryNodes("/*/chart:Series/chart:Series").length; s <= len; s++ ) {
        if( this.config.read("/*/chart:Series/chart:Series[position()="+s+"]/@chartType") === stackedChartType ) {
          stackedSeriesIdxs.push(s - 1);
          opts.series[s -1].stack = "stacked";
        }
      }

      // fill up missing data for stacked bars
      var maxData = 0;
      opts.series.forEach(function(s) {
        if (s.data.length > maxData)
          maxData = s.data.length;
      });
      opts.series.forEach(function(s) {
        for (var d = 0; d < maxData; d++) {
          if (! s.data[d] || isNaN(s.data[d].value))
            s.data[d] = {value: 0.0};
        }
      });

      // Maybe we want them to be stacked and turned into % of all values for a category
      if( this.config.read("/*/chart:Stacked/@asPercent") === 'true' ) {
        // Lets find the original unit of the stacked axis, later it will be %
        let stackedAxis = this.config.read("/*/chart:Stacked/@axis");
        let stackedUnit = this.config.read("/*/chart:YAxis"+stackedAxis+"/@unit");
        for(var cat = 0; cat < opts.series[stackedSeriesIdxs[0]].data.length; cat++) {
          var sum = 0;
          for(var ser = 0; ser < stackedSeriesIdxs.length; ser++)
            sum += opts.series[stackedSeriesIdxs[ser]].data[cat].value;
          for(var ser = 0; ser < stackedSeriesIdxs.length; ser++) {
            let series = opts.series[stackedSeriesIdxs[ser]];
            let nf = getNumFormatter(3, stackedUnit);
            series.data[cat].bcdOrig = nf( series.data[cat].value );
            series.data[cat].value = Math.floor(1000 * (series.data[cat].value / sum)) / 1000;
          }
        }

        // We want the axis always be 0-100% in this case
        let sAxis12 = parseInt( this.config.read("/*/chart:Stacked[@asPercent='true']/@axis", '1') );
        if( this.config.read("/*/chart:Stacked/@chartType") != "BARCHARTHORIZONTAL" ) {
          opts.yAxis[sAxis12 - 1].min = 0;
          opts.yAxis[sAxis12 - 1].max = 1;
        }
      }
      // For backward compatibility, we turn the stack upside-down
      for(var s=0, maxIdx = stackedSeriesIdxs.length - 1; s < maxIdx / 2; s++ ) {
        let tmp = opts.series[stackedSeriesIdxs[s]];
        opts.series[stackedSeriesIdxs[s]] = opts.series[stackedSeriesIdxs[maxIdx - s]];
        opts.series[stackedSeriesIdxs[maxIdx - s]] = tmp;
      }
    }

    // Handle series, where segments have an individual color
    for( var s = 1, len = this.config.queryNodes("/*/chart:Series/chart:Series").length; s <= len; s++ )
    {
      let elementColorsModelId = this.config.read("/*/chart:Series/chart:Series["+s+"]/chart:Colors/@modelId");
      if( elementColorsModelId !== null ) {
        let elementColorsModel = bcdui.factory.objectRegistry.getObject( elementColorsModelId );
        let elementColorNodes = elementColorsModel.queryNodes(this.config.read("/*/chart:Series/chart:Series["+s+"]/chart:Colors/@nodes"));
        let elementColors = Array.prototype.slice.call( elementColorNodes ).map( (n, idx) => n.text );
        opts.series[s-1].data = opts.series[s-1].data.map( (v, idx) => { v.itemStyle = { color: elementColors[idx] }; return v } );
      }
    }

    // Merge a `source` object to a `target` recursively
    const merge = (target, source) => {
      // Iterate through `source` properties and if an `Object` set property to merge of `target` and `source` properties
      for (let key of Object.keys(source)) {
        if (target[key] !== undefined && source[key] !== undefined && 
            (    (   source[key] instanceof String && ! target[key] instanceof String)
              || (! (source[key] instanceof String) &&   target[key] instanceof String)
              || (   source[key] instanceof Array  && ! target[key] instanceof Array)
              || (! (source[key] instanceof Array)  &&   target[key] instanceof Array)
            ))
            throw new Error("Merging invalid types: " + key);
        if (target[key] === undefined) target[key] = source[key];

        // do not merge possible dataproviders (contextMenu)
        if (source[key] instanceof Object && source[key].dataDoc)
          continue;

        if (source[key] instanceof Object && !(source[key] instanceof Function)) Object.assign(source[key], merge(target[key], source[key]));
      }

      // Join `target` and modified `source`
      Object.assign(target || {}, source);
      return target;
    };

    // echarts support multiple xAxis, so convert it an array now
    if (opts.xAxis) {
      var xAxis = opts.xAxis;
      opts.xAxis = new Array();
      opts.xAxis.push(xAxis);
    }

    // take over 2nd, 3rd etc categories as additional xaxis (or in case of BARCHARTHORIZONTAL yaxis)
    var addCategories = this.config.queryNodes("/*/chart:XAxis/chart:Categories[position() > 1]");
    for (var x = 0; x < addCategories.length; x++) {
      let catModelId = addCategories[x].getAttribute("modelId");
      let catModel = bcdui.factory.objectRegistry.getObject( catModelId );
      var nodes;
      if( !!catModel )
        nodes = catModel.queryNodes(addCategories[x].getAttribute("nodes"));
      else
        nodes = this.config.queryNodes("/*/chart:XAxis/chart:Categories/chart:Value");
      var data = [];
      jQuery.makeArray(nodes).forEach(function(e) {
        data.push(e.text);
      });
      if (addCategories[x].getAttribute("distinct") === "true") {
        data = data.filter(function(e, idx){return data.indexOf(e) == idx});s
      }
      if (this.config.query("//chart:Series[@chartType='BARCHARTHORIZONTAL']") != null)
        opts.yAxis.push({data: data});
      else
        opts.xAxis.push({data: data});
    }

    // merge user options
    opts = merge(opts, this.userOptions);

    // link contextMenu
    var customOnContextMenu = opts.on && opts.on.detailsmenu && opts.on.detailsmenu.chain && opts.on.detailsmenu.callback ? Object.assign({}, opts.on.detailsmenu) : null;

    if (customOnContextMenu != null) {
      delete opts.on.detailsmenu; // remove it to avoid event calling issues

      var bcdChartGotDetails = bcdui.factory.objectRegistry.getObject("bcdChartGotDetails");
      if (bcdChartGotDetails == null)
        bcdChartGotDetails = new bcdui.core.ConstantDataProvider({ id : "bcdChartGotDetails", name : "bcdChartGotDetails", value : "false" });

      var finalChain = [ function(doc, args) {
        if (args.targetHtml) {
          bcdui.factory.objectRegistry.getObject("bcdChartGotDetails").value = (""  + (typeof jQuery("#" + args.targetHtml).data("bcdChartGotDetails") != "undefined"));
          jQuery("#" + args.targetHtml).removeData("bcdChartGotDetails");
        }
        return doc;
      }];
      if (Array.isArray(customOnContextMenu.chain))
        finalChain = validationChain.concat(customOnContextMenu.chain);
      else
        finalChain.push(customOnContextMenu.chain);

      bcdui.widget.createContextMenu({
        targetRendererId : this
      , refreshMenuModel : true
      , tableMode : false
      , inputModel : new bcdui.core.ModelWrapper({
          chain : finalChain
        , parameters :  Object.assign(customOnContextMenu.parameters, {bcdChartGotDetails: bcdChartGotDetails, targetHtml: this.targetHtml})
        })
      });
      
      jQuery("#" + this.targetHtml).on("chart:contextMenu", function(evt, args) {
        var chartDetails = jQuery("#" + this.targetHtml).data("bcdChartdetails");
        if (typeof chartDetails != "undefined")
          customOnContextMenu.callback(chartDetails, args);
      }.bind(this));

      // add our detailsmapper as contextMenu
      opts.on.contextmenu = function(param, chart) {

        var xAxisUnit = chart.config.read("/*/chart:XAxis/@unit", "");
        var yAxis1Unit = chart.config.read("/*/chart:YAxis1/@unit", "");
        var yAxis2Unit = chart.config.read("/*/chart:YAxis2/@unit", "");
        var xAxisCaption = chart.config.read("/*/chart:XAxis/@caption", "");
        var yAxis1Caption = chart.config.read("/*/chart:YAxis1/@caption", "");
        var yAxis2Caption = chart.config.read("/*/chart:YAxis2/@caption", "");

        // collect models and xPaths
        var categoryModels = [];
        for( var s = 1, len = chart.config.queryNodes("/*/chart:XAxis/chart:Categories").length; s <= len; s++ ) {
          var xPath  = chart.config.read("/*/chart:XAxis/chart:Categories["+s+"]/@nodes", "");
          var modelId = chart.config.read("/*/chart:XAxis/chart:Categories["+s+"]/@modelId", "");
          if (chart.config.query("/*/chart:XAxis/chart:Categories["+s+"]/chart:Value") != null) {
            xPath = "/*/chart:XAxis/chart:Categories["+s+"]/chart:Value";
            modelId = chart.config.id;
            if (typeof bcdui.factory.objectRegistry.getObject(chart.config.id) == "undefined")
              bcdui.factory.objectRegistry.registerObject(chart.config);
          }
          if (modelId != "" && xPath != "")
            categoryModels[categoryModels.length] = {modelId: modelId, xPath: xPath}
        }
        var xAxisModels = [];
        for( var s = 1, len = chart.config.queryNodes("/*/chart:XAxis/chart:XValues").length; s <= len; s++ ) {
          var xPath  = chart.config.read("/*/chart:XAxis/chart:XValues["+s+"]/@nodes", "");
          var modelId = chart.config.read("/*/chart:XAxis/chart:XValues["+s+"]/@modelId", "");
          if (chart.config.query("/*/chart:XAxis/chart:XValues["+s+"]/chart:Value") != null) {
            xPath = "/*/chart:XAxis/chart:XValues["+s+"]/chart:Value";
            modelId = chart.config.id;
            if (typeof bcdui.factory.objectRegistry.getObject(chart.config.id) == "undefined")
              bcdui.factory.objectRegistry.registerObject(chart.config);
          }
          if (modelId != "" && xPath != "")
            xAxisModels[categoryModels.length] = {modelId: modelId, xPath: xPath}
        }
        var seriesXModels = [];
        var seriesYModels = [];
        for( var s = 1, len = chart.config.queryNodes("/*/chart:Series/chart:Series").length; s <= len; s++ ) {
          var caption = chart.config.read("/*/chart:Series/chart:Series["+s+"]/@caption", "");

          var xPath  = chart.config.read("/*/chart:Series/chart:Series["+s+"]/chart:XData/@nodes", "");
          var modelId = chart.config.read("/*/chart:Series/chart:Series["+s+"]/chart:XData/@modelId", "");
          if (chart.config.query("/*/chart:Series/chart:Series["+s+"]/chart:XData/chart:Value") != null) {
            xPath = "/*/chart:Series/chart:Series["+s+"]/chart:XData/chart:Value";
            modelId = chart.config.id;
            if (typeof bcdui.factory.objectRegistry.getObject(chart.config.id) == "undefined")
              bcdui.factory.objectRegistry.registerObject(chart.config);
          }
          if (modelId != "" && xPath != "")
            seriesXModels[seriesXModels.length] = {modelId: modelId, xPath: xPath, caption: caption}

          var xPath  = chart.config.read("/*/chart:Series/chart:Series["+s+"]/chart:YData/@nodes", "");
          var modelId = chart.config.read("/*/chart:Series/chart:Series["+s+"]/chart:YData/@modelId", "")
          if (chart.config.query("/*/chart:Series/chart:Series["+s+"]/chart:YData/chart:Value") != null) {
            xPath = "/*/chart:Series/chart:Series["+s+"]/chart:YData/chart:Value";
            modelId = chart.config.id;
            if (typeof bcdui.factory.objectRegistry.getObject(chart.config.id) == "undefined")
              bcdui.factory.objectRegistry.registerObject(chart.config);
          }
          if (modelId != "" && xPath != "")
            seriesYModels[seriesYModels.length] = {modelId: modelId, xPath: xPath, caption: caption}
        }

        // we either have categories or xValues and either xseries or yseries values
        var args = {
            rendererId: chart.id
          , targetHtml: chart.targetHtml
          , categories: categoryModels.length > 0 ? categoryModels : xAxisModels
          , series: seriesXModels.length > 0 ? seriesXModels : seriesYModels
          , seriesName: param.seriesName
          , x: []
          , y: []
        };

        // stacked bars funnily have a reverse ordering
        if (chart.config.query("//chart:Stacked") != null) {
          args.series = args.series.reverse();
        }

        var series = args.series[param.seriesIndex];
        var yModel = null;
        var gotTotal = chart.config.read("//chart:BarWaterfall/@showTotal", "") == "true";
        var isBoxPlot = chart.config.query("//chart:Series[@chartType='BOXPLOT']") != null;

        // collect y values
        // boxplot is special since it combines all series into one with a dataarray (min,max, etc)
        if (isBoxPlot) {

          // outliners
          if (param.seriesIndex == 1) {
            series = args.series[param.data[0]];
            var y = bcdui.factory.objectRegistry.getObject(series.modelId).queryNodes(series.xPath)[param.dataIndex];
            if (y != null) {
              var columnIndex = 1 + y.selectNodes("./preceding-sibling::wrs:C").length;
              yModel = {
                colIdent: bcdui.factory.objectRegistry.getObject(series.modelId).read("/*/wrs:Header/wrs:Columns/wrs:C[@pos='"+columnIndex+"']/@id", null)
              , rowIdent: y.parentNode ? y.parentNode.getAttribute("id") : null
              , modelId: series.modelId
              , value: param.data[1]
              }
              if (yModel.value != null) {
                args.y.push(yModel);
                args.seriesName = series.caption;  // take over series name from chose series
              }
            }
          }
          // non outliners
          else {
            series = args.series[param.dataIndex];
            var y = bcdui.factory.objectRegistry.getObject(series.modelId).queryNodes(series.xPath)[0];
            if (y != null) {
              var columnIndex = 1 + y.selectNodes("./preceding-sibling::wrs:C").length;
              yModel = {
                colIdent: bcdui.factory.objectRegistry.getObject(series.modelId).read("/*/wrs:Header/wrs:Columns/wrs:C[@pos='"+columnIndex+"']/@id", null)
              , rowIdent: null
              , modelId: series.modelId
              , value: param.data
              }
              if (yModel.value != null) {
                args.y.push(yModel);
                args.seriesName = series.caption;  // take over series name from chose series
              }
            }
          }
        }
        // waterfall has built up 3 series, so we take the y information from the param data value of the first series
        else if (chart.config.query("//chart:BarWaterfall") != null) {
          series = args.series[0];
          var y = bcdui.factory.objectRegistry.getObject(series.modelId).queryNodes(series.xPath)[param.dataIndex];
          var clickedTotal = (y == null && gotTotal);
          y = clickedTotal ? bcdui.factory.objectRegistry.getObject(series.modelId).queryNodes(series.xPath)[0] : y // take 1st entry (total column, which can't be found by index)
          if (y != null) {
            var columnIndex = 1 + y.selectNodes("./preceding-sibling::wrs:C").length;
            yModel = {
              colIdent: bcdui.factory.objectRegistry.getObject(series.modelId).read("/*/wrs:Header/wrs:Columns/wrs:C[@pos='"+columnIndex+"']/@id", null)
            , rowIdent: clickedTotal ? null : y.parentNode ? y.parentNode.getAttribute("id") : null
            , modelId: series.modelId
            , value: param.data.value
            }
            if (yModel.value != null)
              args.y.push(yModel);
          }
        }
        // let's take the standard...
        else {
          var y = bcdui.factory.objectRegistry.getObject(series.modelId).queryNodes(series.xPath)[param.dataIndex];
          if (y != null) {
            var columnIndex = 1 + y.selectNodes("./preceding-sibling::wrs:C").length;
            yModel = {
                colIdent: bcdui.factory.objectRegistry.getObject(series.modelId).read("/*/wrs:Header/wrs:Columns/wrs:C[@pos='"+columnIndex+"']/@id", null)
              , rowIdent: y.parentNode ? y.parentNode.getAttribute("id") : null
              , modelId: series.modelId
              , value: y.text
            }
            if (yModel.value != null)
              args.y.push(yModel);
          }
        }

        // collect x values
        for (var x = 0; x < args.categories.length; x++) {
          var xAxis = args.categories[x];
          var xModel = {};
          
          if (isBoxPlot) {
            var e = bcdui.factory.objectRegistry.getObject(xAxis.modelId).queryNodes(xAxis.xPath)[param.seriesIndex == 1 ? param.data[0] : param.dataIndex];
            var columnIndex = 1 + e.selectNodes("./preceding-sibling::wrs:C").length;
            xModel = {
                colIdent: bcdui.factory.objectRegistry.getObject(xAxis.modelId).read("/*/wrs:Header/wrs:Columns/wrs:C[@pos='"+columnIndex+"']/@id", null)
              , rowIdent: e.parentNode ? e.parentNode.getAttribute("id") : null
              , modelId: xAxis.modelId
              , value: e.text
            }
          }
          // when xAxis model matches current series model and we we have a wrs, we try to access the x value via rowId from the yValue
          else if (xAxis.modelId == series.modelId) {
            var yNode = bcdui.factory.objectRegistry.getObject(series.modelId).queryNodes(series.xPath)[param.dataIndex];
            var clickedTotal = (yNode == null && gotTotal);
            yNode = clickedTotal ? bcdui.factory.objectRegistry.getObject(series.modelId).queryNodes(series.xPath)[0] : yNode // take 1st entry (total column, which can't be found by index)
            if (yNode != null && yNode.parentNode != null && yNode.parentNode.getAttribute("id") != "") {
              var rowId = yNode.parentNode.getAttribute("id");
              jQuery.makeArray(bcdui.factory.objectRegistry.getObject(xAxis.modelId).queryNodes(xAxis.xPath)).forEach(function(e) {
                if (e.parentNode.getAttribute("id") == rowId) {
                  var columnIndex = 1 + e.selectNodes("./preceding-sibling::wrs:C").length;
                  xModel = {
                      colIdent: bcdui.factory.objectRegistry.getObject(xAxis.modelId).read("/*/wrs:Header/wrs:Columns/wrs:C[@pos='"+columnIndex+"']/@id", null)
                    , rowIdent: clickedTotal ? null : e.parentNode ? e.parentNode.getAttribute("id") : null
                    , modelId: xAxis.modelId
                    , value: e.text
                  }
                }
              });
            }
          }
          // otherwise we try param.name match or (e.g. for polar, param.data[1] match)
          if (xModel.value == null) {
            if (param.name || param.data.length == 2 ) {
              var e = bcdui.factory.objectRegistry.getObject(xAxis.modelId).query(xAxis.xPath + "[.='{{=it[0]}}']", [("" + (param.name || param.data[1]))]);
              if (e != null) {
                var columnIndex = 1 + e.selectNodes("./preceding-sibling::wrs:C").length;
                xModel = {
                    colIdent: bcdui.factory.objectRegistry.getObject(xAxis.modelId).read("/*/wrs:Header/wrs:Columns/wrs:C[@pos='"+columnIndex+"']/@id", null)
                  , rowIdent: e.parentNode ? e.parentNode.getAttribute("id") : null
                  , modelId: xAxis.modelId
                  , value: e.text
                }
              }
            }
          }
          if (xModel.value != null)
            args.x.push(xModel);
        }

        if (args.x.length > 0) {
          args.x[0].xAxisUnit = xAxisUnit;
          args.x[0].xAxisCaption = xAxisCaption;
        }
        if (args.y.length > 0) {
          args.y[0].yAxisUnit = yAxis1Unit;
          args.y[0].yAxisCaption = yAxis1Caption;
        }
        if (args.y.length > 1) {
          args.y[1].yAxisUnit = yAxis2Unit;
          args.y[1].yAxisCaption = yAxis2Caption;
        }

        if (customOnContextMenu && args.x.length > 0 && args.y.length > 0) {
          jQuery("#" + chart.targetHtml).data("bcdChartdetails", args);
          jQuery("#" + chart.targetHtml).data("bcdChartGotDetails", "true");
        }
        else {
          jQuery("#" + chart.targetHtml).removeData("bcdChartdetails");
          jQuery("#" + chart.targetHtml).removeData("bcdChartGotDetails");
        }
      };
    }
    
    // bind event handling, here we may want to extend the params with more valuable information like direct data link
    opts.on && Object.keys(opts.on).forEach(k => {
      this.instance.on(k, params => {
        opts.on[k](params, this);
        params.event.event.preventDefault();
        return false;
      });
    });

    // Go
    var foundData = false;
    for( var s = 0; s < opts.series.length; s++ ) {
      var seriesGotData = false;
      if(opts.series[s] && opts.series[s].data && opts.series[s].data.length > 0) {
        for (var d = 0; d < opts.series[s].data.length; d++) {
           var thisData = opts.series[s].data[d];
           if (
                  (typeof thisData.value != "undefined")
               || (thisData instanceof Array && thisData.length > 0 && typeof thisData[0] == "number")
               || (typeof thisData == "number")
              )
           {
             seriesGotData = true;
            foundData = true;
          }
        }
      }
      if (! seriesGotData) {
        // user might have merged in a null series, so we need to check for existance again
        if (! opts.series[s])
          opts.series[s] = {};
        opts.series[s].removeMe = true;
      }
    }

    // remove series which don't have data
    opts.series = opts.series.filter(function(e) { return typeof e.removeMe == "undefined"; });

    if( foundData ) {
      myChart.setOption(opts, true);
      bcdui.core.createElementWithPrototype( this.config, "/*/chart:Computed/chart:ChartsDrawn").text = "true";
    }
    else {
      let msg = bcdui.i18n.syncTranslateFormatMessage("bcd_EmptyChart");
      jQuery("#"+this.targetHtml).html("<div>"+opts.title.text+"</div><div style='margin-top:0.75em;font-size:0.75em'>"+msg+"</div>");
    }
  }

  /**
   * Implementation of sunburst charts on hierarchical data in a Wrs
   * @private
   */
  _sunburst(myChart)
  {
    // Prepare chart, switch to svg to support pdf export
    let opts = {
        title: {
          left: "center",
          textStyle: {
            fontSize: 12,
            fontWeight: 100
          }
        },
        tooltip: {},
        series: {
          type: 'sunburst',
          sort: null
        },
        detail: {}
    };

    // We want a meaningful labels and hide them when the area gets too small
    let unit = this.config.read("/*/chart:YAxis1/@unit");
    var clickedLevel = 0;
    myChart.on('click', function (args) {
      if( args.treePathInfo.length === 1 )
        clickedLevel--;
      else
        clickedLevel = args.treePathInfo.length - 1;
    });
    let labelFormatter = function (args) {
      let portion = args.value / args.treePathInfo[clickedLevel].value;
      if( portion > 0.05 )
        return args.name + "\n\n"  + args.value + " " + unit;
      if( portion > 0.01 )
        return args.name;
      return "";
    };

    // Chart title, put make it somewhat near the center
    opts.title.text = this.config.read("/*/@title",'');
    opts.title.left = "40%";

    // To turn a Wrs into a hierarchical structure
    let root = { children: [] };
    let childStack = [root];
    let model = bcdui.factory.objectRegistry.getObject( this.config.read("/*/chart:XAxis/chart:Categories/@modelId") );
    let dimNodes = this.config.read("/*/chart:XAxis/chart:Categories/@nodes") || "/*/wrs:Header/wrs:Columns/wrs:C[@dimId]";
    let nDims = model.queryNodes(dimNodes).length;
    let measureNode = this.config.read("/*/chart:Series/chart:Series/chart:YData/@nodes");
    let measureCol = measureNode ? parseInt(model.read(measureNode+"/@pos")) : nDims + 1;
    let totalDims = model.queryNodes("/*/wrs:Header/wrs:Columns/wrs:C[@dimId]").length;
    let rows = model.queryNodes("/*/wrs:Data/wrs:R[not(wrs:C[position()='"+nDims+"']/@bcdGr='1')" + (totalDims > nDims ? " and wrs:C[position()='"+(nDims+1)+"']/@bcdGr='1']" : "]"));
    let nRows = rows.length;

    // We assume the wrs:R to be sorted by dim and go one nested level deeper, if we have a group-change on the higher level
    for( var r = 0; r < nRows; r++ ) {
      let rowDims = Array.prototype.slice.call( rows.item(r).selectNodes("wrs:C[position()<="+nDims+"]")  ).map((n)=>n.text.trim());
      for( var rd = 0; rd < rowDims.length; rd++ ) {
        if( rd >= childStack.length-1 ) {
          let newChild = { name: rowDims[rd] };
          childStack[childStack.length-1].children = childStack[childStack.length-1].children || [];
          childStack[childStack.length-1].children.push( newChild );
          childStack.push( newChild );
        } else if( childStack[rd+1].name !== rowDims[rd] ) {
          let newChild = { name: rowDims[rd] };
          childStack.splice(rd+1);
          childStack[childStack.length-1].children = childStack[childStack.length-1].children || [];
          childStack[childStack.length-1].children.push( newChild );
          childStack.push( newChild );
        }
      }
      childStack[childStack.length-1].value = parseFloat(rows.item(r).selectSingleNode("wrs:C[position()="+measureCol+"]").text);
      childStack[childStack.length-1].bcdValue = 2;

      childStack[childStack.length-1].label = { formatter: labelFormatter };

    }
    opts.series.data = root.children;

    // Go
    myChart.setOption(opts);

  }


  /**
   * @private
   */
  _statusTransitionHandler(/* StatusEvent */ statusEvent)
  {
    if (statusEvent.getStatus().equals(this.waitingForParametersStatus) ) {

      // Add models listed as @modelIds in chart def to our dataProviders
      let modelIds = Array.prototype.slice.call( this.config.queryNodes("//@modelId") ).map((n)=>n.text).filter( (d, idx, modelIds) => { return modelIds.indexOf(d) === idx } );
      // Resolve model-ids to their js dataProviders
      bcdui.factory.objectRegistry.withObjects( modelIds, () => {
        let dps = modelIds.map( (id) => bcdui.factory.objectRegistry.getObject(id) );
        this.dataProviders = this.dataProviders.concat( dps );
        var that = this;
        this._synchronizedStatusTransition(this.transformingStatus, this.dataProviders.filter(function(dp){return !that.modelUpdaterTargetModel || dp.id !== that.modelUpdaterTargetModel.id}));
      });
    }
    else
      super._statusTransitionHandler(statusEvent);
  }


  /**
   * Export an EChart as PNG
   * @param targetHtml  - Html element where the chart is found
   * @param name        - File name: name+".png"
   * @static
   */
  static saveAsImage(targetHtml, name) {
    // use configuration item and data specified to show chart
    var link = document.createElement("a");
    link.setAttribute("download", "chart.png");

    let svg = document.getElementById(targetHtml).firstChild.firstChild;
    var svgData = new XMLSerializer().serializeToString(svg);

    var canvas = document.createElement( "canvas" );
    var svgSize = svg.getBoundingClientRect();
    canvas.width = svgSize.width;
    canvas.height = svgSize.height;
    var ctx = canvas.getContext( "2d" );

    var img = new Image();
    img.setAttribute( "src", "data:image/svg+xml;base64," + btoa( unescape(encodeURIComponent( svgData )) ) );
    img.onload = function() {
      ctx.drawImage( img, 0, 0 );
      link.setAttribute("href", canvas.toDataURL( "image/png" ));
      link.setAttribute("download", name+".png");
      link.click();
    };

  }
  
  /**
   * @private
   */
  _prepareBoxplotData (rawData, opt) {
    opt = opt || [];
    var boxData = [];
    var outliers = [];
    var axisData = [];
    var boundIQR = opt.boundIQR || 1.5;
    var useExtreme = boundIQR === 'none' || boundIQR === 0;
    opt.layout = opt.layout || 'horizontal';

    for (var i = 0; i < rawData.length; i++) {
        axisData.push(i + '');
        
        rawData[i] = rawData[i].map(function(e) { return (e == null ? 0 : e);});
        
        var ascList = rawData[i].slice().sort(function (a, b) {return a - b;});

        var Q1 = this._quantile(ascList, 0.25);
        var Q2 = this._quantile(ascList, 0.5);
        var Q3 = this._quantile(ascList, 0.75);
        var min = ascList[0];
        var max = ascList[ascList.length - 1];

        var bound = (boundIQR == null ? 1.5 : boundIQR) * (Q3 - Q1);

        var low = useExtreme
            ? min
            : Math.max(min, Q1 - bound);
        var high = useExtreme
            ? max
            : Math.min(max, Q3 + bound);

        boxData.push([low, Q1, Q2, Q3, high]);

        for (var j = 0; j < ascList.length; j++) {
            var dataItem = ascList[j];
            if (dataItem < low || dataItem > high) {
                var outlier = [i, dataItem];
                opt.layout === 'vertical' && outlier.reverse();
                outliers.push(outlier);
            }
        }
    }
    return {
        boxData: boxData,
        outliers: outliers,
        axisData: axisData
    };
  }

  /**
   * @private
   */
  _quantile(ascArr, p) {
      var H = (ascArr.length - 1) * p + 1,
          h = Math.floor(H),
          v = +ascArr[h - 1],
          e = H - h;
      return e ? v + e * (ascArr[h] - v) : v;
  }

  /**
   * @return definition DOM document
   */
  getData(){
    return this.config.getData();
  }

};