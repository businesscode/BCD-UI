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
bcdui.util.namespace("bcdui.component.chart",{});

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
 */
bcdui.component.chart.ChartEchart = class extends bcdui.core.Renderer {

  /**
   * @constructs
   * @param {Object} args - Parameter object:
   * @param {targetHtmlRef} args.targetHtml                       - Where to place the chart
   * @param {bcdui.core.DataProvider} args.config                 - Definition if the chat according to Model with the chart definition according to XSD http://www.businesscode.de/schema/bcdui/charts-1.0.0
   * @param {Object} args.options                                 - Options of ECharts, extending / being merged with the options deried from config
   */
  constructor(args)
  {
    args = jQuery.extend({parameters: {paramModel: args.config}}, args);
    super(args);
    this.config = args.config;
    this.userOptions = args.options || {};
  }

  /**
   * @private
   */
  _refresh()
  {
    // Update or brand new chart?
    let existInstance = echarts.getInstanceByDom( document.getElementById(this.targetHtml) );
    let myChart = existInstance || echarts.init(document.getElementById(this.targetHtml), null, {renderer: "svg"});

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
          return (val>=1||val<0.0001 ? d3Format2s(val) : d3Format2f(val)) + (unit||'');
        else if( prec===3 && unit==='%' )
          return d3Format3p(val);
        else
          return (val>=1||val<0.0001 ? d3Format3s(val) : d3Format3f(val)) + (unit||'');
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

    // X-axis in case of continuous numeric values
    let xValues = null;
    if( this.config.read("/*/chart:XAxis/chart:XValues") !== null ) {
      let xValuesModelId = this.config.read("/*/chart:XAxis/chart:XValues/@modelId");
      let xValuesModel = bcdui.factory.objectRegistry.getObject( xValuesModelId );
      let nodes = xValuesModel.queryNodes( this.config.read("/*/chart:XAxis/chart:XValues/@nodes") );
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
          axis.name = yAxisLabel + (yAxisUnit!==""?' ['+yAxisUnit+']':"");
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
    for( var s = 1, len = this.config.queryNodes("/*/chart:Series/chart:Series").length; s <= len; s++ )
    {
      // Read series properties
      let series = { bcdAttrs: {} };
      let axis1or2 = parseInt(this.config.read("/*/chart:Series/chart:Series["+s+"]/@yAxis1Or2",'1'));
      series.yAxisIndex = axis1or2 - 1;
      let unit = this.config.read("/*/chart:Stacked[@axis='"+axis1or2+"']/@asPercent") === 'true' ? '%' : this.config.read("/*/chart:YAxis"+axis1or2+"/@unit",'');
      series.bcdAttrs.unit = unit; // echarts does not know the concept of units
      let chartType = this.config.read("/*/chart:Series/chart:Series["+s+"]/@chartType");

      // If we detect BARCHARTHORIZONTAL, we make some adjustments to the axis, but treet it as BARCHART otherwise
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
      let seriesColor = this.config.read("/*/chart:Series/chart:Series["+s+"]/@rgb") || seriesColorList[s-1] || 'auto';
      series.itemStyle = { color: seriesColorList[s-1] };

      // Read data as an array.
      // Either nodes from a model given by id or in-lined. Also limit it to the number of x-axis values/categories and remove infinity values
      let model = bcdui.factory.objectRegistry.getObject( this.config.read("/*/chart:Series/chart:Series["+s+"]/chart:YData/@modelId") );
      var nodes;
      if( !!model )
        nodes = model.queryNodes( this.config.read("/*/chart:Series/chart:Series["+s+"]/chart:YData/@nodes") );
      else
        nodes = this.config.queryNodes("/*/chart:Series/chart:Series["+s+"]/chart:YData/chart:Value");
      nodes = Array.prototype.slice.call( nodes );
      nodes = nodes.slice(0, xCategories ? xCategories.length : xValues.length );
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
        series.detail = { formatter: getNumFormatter(3, unit), fontSize: "200%", offsetCenter: [0, '20%'] };
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
          opts.yAxis[0].min = series.data.reduce( (agg, v) => agg < v ? agg : v, Infinity ) * 0.9;
          opts.yAxis[0].max = series.data.reduce( (agg, v) => agg > v ? agg : v, -Infinity ) * 1.1;
        } else {
          let sizes = nodes;
          opts.series[0].data.forEach( (v, idx) => v.push(sizes[idx]) );
          let max = sizes.reduce( (agg, v) => agg > v ? agg : v );
          let fact = 50/(max*max);
          opts.series[0].symbolSize = function (data) { return data[2]*data[2] * fact; };
        }
        series.bcdAttrs.unit = [
          this.config.read("/*/chart:XAxis/@unit",''),
          this.config.read("/*/chart:YAxis1/@unit",''),
          this.config.read("/*/chart:YAxis2/@unit",'')
        ];
        opts.tooltip.trigger = "item";
        opts.toolbox.feature.dataZoom = {};

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
      opts.toolbox.feature.dataZoom = {};
    }
  

    // Tooltip
    // Several enhancements in terms of number formatting and including support for original values in case of stacked-as-percent charts
    opts.tooltip.formatter = function (paramsIn, ticket, callback) {
      let params = Array.isArray(paramsIn) ? paramsIn : [paramsIn];
      var res = "<table>";
      if( params[0].name )
        res += "<tr><th colspan='100' style='text-align:center'>- " + params[0].name + " -</th></tr>";
      for (var s = 0; s <params.length; s++) {
        let unit = opts.series[params[s].seriesIndex].bcdAttrs.unit;
        res += "<tr><td><span style='font-size: 250%; vertical-align: text-bottom; color:"+(params[s].color)+"'>&#x2022;</span>" + params[s].seriesName + "</td>";
        let values = Array.isArray(params[s].value) ? params[s].value : [params[s].value];
        for( var v=0; v< values.length; v++ ) {
          let thisUnit = Array.isArray(unit) ? unit[v] : unit;
          if( params[s].percent ) {
            res += "<td>&nbsp;</td>";
            res += "<td style='text-align: right'>" + getNumFormatter(3, '')(params[s].percent) + "%</td>";
          }
          res += "<td>&nbsp;</td>";
          res += "<td style='text-align: right'>" + getNumFormatter(3, thisUnit)(values[v]) + "</td>";
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
      else if( this.config.read("/*/chart:Series/chart:Series[@chartType='GAUGECHART']") === null )
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
            series.data[cat].value   = series.data[cat].value / sum;
          }
        }

        // We want the axis always be 0-100% in this case
        let sAxis12 = parseInt( this.config.read("/*/chart:Stacked[@asPercent='true']/@axis", '1') );
        opts.yAxis[sAxis12 - 1].min = 0;
        opts.yAxis[sAxis12 - 1].max = 1;
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
        if (source[key] instanceof Object) Object.assign(source[key], merge(target[key], source[key]))
      }

      // Join `target` and modified `source`
      Object.assign(target || {}, source);
      return target;
    };
    opts = merge(opts, this.userOptions);
    
    // Go
    myChart.setOption(opts, true);
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

};