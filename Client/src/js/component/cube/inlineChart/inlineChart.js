/*
  Copyright 2010-2023 BusinessCode GmbH, Germany

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
 * A namespace for the BCD-UI component cube. Denfined in cubeCreate.js
 */

bcdui.component.cube.inlineChart = Object.assign(bcdui.component.cube.inlineChart,
/** @lends bcdui.component.cube.inlineChart */
{
  _init: function(args) {

    // add css class for easier styling
    jQuery(args.targetHtml).addClass("bcdInlineChart");

    // the data is the cubeModel (inputModel of the cube), we can't use the cube itself since it's not ready yet
    const dataModel = bcdui.factory.objectRegistry.getObject(args.cubeId).getPrimaryModel();

    // number of dimensions
    const dimCount = dataModel.queryNodes("/*/wrs:Header/wrs:Columns/wrs:C[@dimId]").length;

    // determine min and max values (without totals) for each unit type for all non total measures
    let minMaxPerUnit = {};
    let columnUnits = [];
    let firstUnit = null;
    let secondUnit = null;
    // prepare minMaxPerUnit and unit per column (columUnits)
    Array.from(dataModel.queryNodes("/*/wrs:Header/wrs:Columns/wrs:C[@valueId and not(contains(@id, '\uE0F0'))]")).forEach(function(e) {
      const unit = "" + e.getAttribute("unit"); // 'null' is ok, we only need some string, even for not defined unit 

      // remember first and second unit (we only support 2 axis)
      if (firstUnit == null)
        firstUnit = unit;
      else if (secondUnit == null && unit != firstUnit)
        secondUnit = unit;
  
      minMaxPerUnit[unit] = {min: Infinity, max: -Infinity, rowMinMax: {}}
      columnUnits[parseInt(e.getAttribute("pos"), 10)] = unit;
    });

    columnUnits.forEach(function(unit, i) {

      // in innerDim mode, we need to look differently for min/max values and we onbly have 1 unit (since we only got 1 measure)
      const innerRowDimMode = dataModel.query("/*/wrs:Data/wrs:R/wrs:Dim/wrs:Value") != null;

      // also generate min/max values per row, so we can optionally switch from global to per-row scaling, so we run over all non total rows
      Array.from(dataModel.queryNodes("/*/wrs:Data/wrs:R[not(wrs:C[@bcdGr='1'])]")).forEach(function(row) {
        const rowId = row.getAttribute("id");

        // init min/max for Row
        minMaxPerUnit[unit].rowMinMax[rowId] = minMaxPerUnit[unit].rowMinMax[rowId] || {min: Infinity, max: -Infinity};

        // now run over data
        const data = innerRowDimMode
        ? Array.from(row.selectNodes("wrs:Dim/wrs:Value[" + (i - dimCount) + "]"))
        : Array.from(row.selectNodes("wrs:C[" + i + "]"));
        data.forEach(function(e) {
          const value = parseFloat(e.text);
          if (value < minMaxPerUnit[unit].min) minMaxPerUnit[unit].min = value; 
          if (value > minMaxPerUnit[unit].max) minMaxPerUnit[unit].max = value;
          if (value < minMaxPerUnit[unit].rowMinMax[rowId].min) minMaxPerUnit[unit].rowMinMax[rowId].min = value; 
          if (value > minMaxPerUnit[unit].rowMinMax[rowId].max) minMaxPerUnit[unit].rowMinMax[rowId].max = value;
        });

        // +/-1 1% for per-row min/max
        minMaxPerUnit[unit].rowMinMax[rowId].min = minMaxPerUnit[unit].rowMinMax[rowId].min - (minMaxPerUnit[unit].rowMinMax[rowId].min * 1.0 / 100.0);
        minMaxPerUnit[unit].rowMinMax[rowId].max = minMaxPerUnit[unit].rowMinMax[rowId].max + (minMaxPerUnit[unit].rowMinMax[rowId].max * 1.0 / 100.0);          
      });

      // +/-1 1% for global min/max
      minMaxPerUnit[unit].min = minMaxPerUnit[unit].min - (minMaxPerUnit[unit].min * 1.0 / 100.0);
      minMaxPerUnit[unit].max = minMaxPerUnit[unit].max + (minMaxPerUnit[unit].max * 1.0 / 100.0);
    });

    // hide measure table header since various measures won't be side by side while in the graph they are vertically aligned 
    jQuery(args.targetHtml).find("thead tr[bcdRowIdent='bcdMeasureHeader']").hide();
    // hide also possible row measure header cells
    jQuery(args.targetHtml).find("thead tr .bcdMeasure").hide();

    // determine width for cell chart (either 100% if we got only 1 cell, or width of 1st one)
    const firstChartCell = jQuery(args.targetHtml).find("tbody tr").first().find("td.bcdChartCell").first();
    const cellWidth = firstChartCell.next("td.bcdChartCell").length > 0 ? firstChartCell.outerWidth() + "px" : "100%";     

    // add a chart per row/cell
    jQuery(args.targetHtml).find("tbody tr td.bcdChartCell").each(function(i,e) {

      const cell = jQuery(e);

      // set fixed width for chart
      cell.css("width", cellWidth);

      const rowId = cell.parent().attr("bcdRowIdent");
      
      // get min/max values for max 2 axis/units
      const min1 = (args.minMaxRow ? minMaxPerUnit[firstUnit].rowMinMax[rowId].min : minMaxPerUnit[firstUnit].min) || 0;
      const max1 = (args.minMaxRow ? minMaxPerUnit[firstUnit].rowMinMax[rowId].max : minMaxPerUnit[firstUnit].max) || 0;
      const min2 = minMaxPerUnit[secondUnit] ? (args.minMaxRow ? minMaxPerUnit[secondUnit].rowMinMax[rowId].min : minMaxPerUnit[secondUnit].min) || 0 : 0;
      const max2 = minMaxPerUnit[secondUnit] ? (args.minMaxRow ? minMaxPerUnit[secondUnit].rowMinMax[rowId].max : minMaxPerUnit[secondUnit].max) || 0 : 0;

      let echartOptions = {
        title: { show: false }
        , yAxis: [
          { show: false, min: min1, max: max1 }
        , { show: false, min: min2, max: max2 }]
        , xAxis: [ { show: false } ]
        , series:[ {label: {show: false}} ]
        , grid: { containLabel: false, show: false, width: "100%", height: "100%", left: 0, top: 4, right: 0, bottom: 4 }
      };

      // in case of PIECHART, we need a slightly different fly over to show the section names correctly
      if (args.chartType1 == "PIECHART") {
        const tooltipUnit = firstUnit == "null" ? "" : firstUnit;
        echartOptions["tooltip"] = echartOptions["tooltip"] || {};
        echartOptions["tooltip"].formatter = function(paramsIn, ticket, callback) {
          let res = "<table><tr><th colspan='100' style='text-align:center'>- " + paramsIn.seriesName + " -</th></tr>";
          if (paramsIn.data && paramsIn.data.value) {
            res += "<tr><td><span style='font-size: 250%; vertical-align: text-bottom; color:" + paramsIn.color + "'>&#x2022;</span>" + paramsIn.data.name + "</td>";
            res += "<td>&nbsp;</td>";
            res += "<td style='text-align: right'>";
            res += (tooltipUnit === "%"
            ? d3.format(".3~p")(paramsIn.data.value)
            : (Math.abs(paramsIn.data.value)>=1 || Math.abs(paramsIn.data.value)<0.0001
              ? d3.format(".3~s")(paramsIn.data.value)
              : d3.format(".3~f")(paramsIn.data.value))
              + tooltipUnit)
            ;
            res += "</td>";
          }
          res += "</tr></table>";
          return res;
        };
      }

      // finally add the chart
      new bcdui.component.chart.ChartEchart({
        targetHtml: cell.get(0)
      , config: new bcdui.core.ModelWrapper({
          chain: bcdui.contextPath + "/bcdui/js/component/cube/inlineChart/inlineChart.xslt"
        , inputModel: dataModel
        , parameters: {
            rowId: rowId
          , chartType1: args.chartType1 || ""
          , chartType2: args.chartType2 || ""
          , chartColumn: cell.prevAll("td.bcdChartCell").length + 1
          }
        })
      , options: echartOptions
      });
    });
  }
});