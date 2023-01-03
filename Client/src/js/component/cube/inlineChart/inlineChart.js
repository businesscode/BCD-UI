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
 * A namespace for the BCD-UI component cube.
 * @namespace bcdui.component.cube
 */

bcdui.component.cube.inlineChart = Object.assign(bcdui.component.cube.inlineChart,
/** @lends bcdui.component.cube.inlineChart */
{
  _init: function(table, cubeId, chartType1, chartType2) {

    jQuery(table).addClass("bcdInlineChart");

    const dataModel = bcdui.factory.objectRegistry.getObject(cubeId).getPrimaryModel();
    const dimCount = dataModel.queryNodes("/*/wrs:Header/wrs:Columns/wrs:C[@dimId]").length;

    // determine min and max values (without totals) for each unit type for all non total measures
    let minMaxPerUnit = {};
    let columnUnits = [];
    let firstUnit = null;
    let secondUnit = null;
    Array.from(dataModel.queryNodes("/*/wrs:Header/wrs:Columns/wrs:C[@valueId and not(contains(@id, '\uE0F0'))]")).forEach(function(e) {
      const unit = "" + e.getAttribute("unit"); // 'null' is ok, we only need some string, even for not defined unit 
  
      // remember first and second unit (we only support 2 axis)
      if (firstUnit == null)
        firstUnit = unit;
      else if (secondUnit == null && unit != firstUnit)
        secondUnit = unit;
  
      minMaxPerUnit[unit] = {min: Infinity, max: -Infinity}
      columnUnits[parseInt(e.getAttribute("pos"), 10)] = unit;
    });

    columnUnits.forEach(function(unit, i) {
      if (unit) {
        let min = minMaxPerUnit[unit].min;
        let max = minMaxPerUnit[unit].max;
        // in innerDim mode, we need to look differently for min/max values and we onbly have 1 unit (since only got 1 measure)
        const data = dataModel.query("/*/wrs:Data/wrs:R/wrs:Dim/wrs:Value") != null
        ? Array.from(dataModel.queryNodes("/*/wrs:Data/wrs:R[not(wrs:C[@bcdGr='1'])]/wrs:Dim/wrs:Value[" + (i - dimCount) + "]"))
        : Array.from(dataModel.queryNodes("/*/wrs:Data/wrs:R[not(wrs:C[@bcdGr='1'])]/wrs:C[" + i + "]"));
        data.forEach(function(e) {
          if (parseFloat(e.text) < min) min = parseFloat(e.text); 
          if (parseFloat(e.text) > max) max = parseFloat(e.text);
        });

        // change min/max a bit for drawing all values (echart tends to skip values if they are near min/max)
        minMaxPerUnit[unit].min = min - (min * 1.0 / 100.0);
        minMaxPerUnit[unit].max = max + (max * 1.0 / 100.0);
      }
    });

    // hide measure table header since various measures won't be side by side while in the graph they are vertically aligned 
    jQuery(table).find("thead tr[bcdRowIdent='bcdMeasureHeader']").hide();

    // add a chart per row
    jQuery(table).find("tbody tr td").each(function(i,e) {
      new bcdui.component.chart.ChartEchart({
        targetHtml: jQuery(e).get(0)
      , config: new bcdui.core.ModelWrapper({
          chain: bcdui.contextPath+"/bcdui/js/component/cube/inlineChart/inlineChart.xslt"
        , inputModel: dataModel
        , parameters: {
            rowId: jQuery(e).parent().attr("bcdRowIdent")
          , chartType1: chartType1 || ""
          , chartType2: chartType2 || ""
          }
        })
      , options: {
          title: { show: false }
        , yAxis: [
          { show: false, min: minMaxPerUnit[firstUnit].min, max: minMaxPerUnit[firstUnit].max }
        , { show: false, min: minMaxPerUnit[secondUnit] && minMaxPerUnit[secondUnit].min || 0, max: minMaxPerUnit[secondUnit] && minMaxPerUnit[secondUnit].max || 0 }]
        , xAxis: [ { show: false } ]
        , grid: { containLabel: false, show: false, width: "100%", height: "100%", left: 0, top: 4, right: 0, bottom: 4 }
        }
      });
    });
  }
});
