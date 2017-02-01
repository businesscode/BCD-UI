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
 * Well-known scorecard aspects
 * @namespace bcdui.component.scorecard.aspects
 * @private
 */
bcdui.component.scorecard.aspects = bcdui.component.scorecard.aspects || {};

/**
 * Use as aspect in a scorecard definition<p/>
 * Calculates linear regression if a  KPI and adds its value for to last period, for all other its zero.
 * bcdNormSlope does calculate percent of average value increase in a year
 * Limitation: Period must be the only dimension
 * Note: For IE pre 11 include Intl polyfill bcdui/js/3rdParty/intl/*
 * TODO neg kpis; with other dims as period; log processing time
 * @private
 */
bcdui.component.scorecard.aspects.bcdNormSlope = function( doc, parameters )
{
  return bcdui.component.scorecard.aspects.bcdSlope( doc, jQuery.extend( true, parameters, { noNormalize: true } ) )
}

/**
 * Use as aspect in a scorecard<p/>
 * @private
 */
bcdui.component.scorecard.aspects.bcdSlope = function( doc, parameters )
{
  "use strict";
  // Accepted parameters
  var sccDef      = parameters.sccDefinition;
  var doNormalize = parameters.noNormalize;
  var aspId       = doNormalize ? "bcdNormSlope" : "bcdSlope";
  var layoutAspCaptionNode = sccDef.selectSingleNode("/*/scc:Layout/scc:Aspects/scc:Aspect[@idRef='"+aspId+"']/@caption");
  var aspCaption = layoutAspCaptionNode ? layoutAspCaptionNode.nodeValue : sccDef.selectSingleNode("/*/scc:Aspects/scc:Aspect[@id='"+aspId+"']/@caption").nodeValue;

  // Find where the period columns are
  var periodYrDimPos = doc.selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C[@dimId and (@id='yr' or @id='cwyr')]/@pos");
  periodYrDimPos = periodYrDimPos ? periodYrDimPos.nodeValue : null;
  var periodDimPos = doc.selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C[@dimId and (@id='qr' or @id='mo' or @id='cw' or @id='dy')]/@pos").nodeValue;

  // Find xPath in a row where the kpis are (in document order)
  var kpiPercMul = [];
  var kpiHeadCols = doc.selectNodes("/*/wrs:Header/wrs:Columns/wrs:C[starts-with(@id,'kpi_')]");
  var kpiXPath = "wrs:C[";
  for( var k=0; k<kpiHeadCols.length; k++ ) {
    if( k>0 )
      kpiXPath += " or ";
    kpiXPath += "position()="+kpiHeadCols.item(k).getAttribute("pos");
    kpiPercMul.push( kpiHeadCols.item(k).getAttribute("unit") === "%" ? 100 : 1 );
  }
  kpiXPath += "]";

  //------------------------------------
  // Read kpi values per period, ordered by period
  var periods = [];  // All KPI values for one period
  var rows = doc.selectNodes("/*/wrs:Data/wrs:R");
  for( var r=0; r<rows.length; r++ ) {
    var row = rows.item(r);
    // Period may have a yr part or not
    var values = [];
    var valueNodes = row.selectNodes(kpiXPath);
    for( var v=0; v<valueNodes.length; v++ )
      values.push( valueNodes.item(v).text );
    var periodYr = periodYrDimPos ? row.selectSingleNode("wrs:C["+periodYrDimPos+"]").text : null;
    var periodType = doc.selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C["+periodDimPos+"]/@id").nodeValue;
    var period = row.selectSingleNode("wrs:C["+periodDimPos+"]").text;
    if ((periodType=="mo" || periodType=="cw" || periodType=="qr") && period.length==1)
      period = "0"+period;
    periods.push( { periodYr: periodYr, period: period, values: values, row: row } );
  }
  periods.sort(function(a,b){return a.periodYr > b.periodYr ||  (a.periodYr == b.periodYr && a.period > b.period) ? 1 : -1});

  //------------------------------------
  // Now apply the linear regression formula
  var sumX = 0, sumY = [], sumXX = 0, sumXY = [];
  for( var k=0; k<kpiHeadCols.length; k++ ) {
    sumY[k] = 0.0;
    sumXY[k] = 0.0;
  }
  for( var p=0; p<periods.length; p++ ) {
    sumX += (p+1);
    sumXX += (p+1)*(p+1);
    var periodValues = periods[p].values;
    for( var k=0; k<kpiHeadCols.length; k++ ) {
      var yVal = parseFloat(periodValues[k]);
      if( isNaN(yVal) )
        yVal = sumY / (k+1);
      sumY[k]  += yVal;
      sumXY[k] += yVal * (p+1);
    }
  }
  // Slopes in document order of 'kpi_' elements
  var numF = new Intl.NumberFormat('en-US');
  var kpiSlopes = [];
  for( var k=0; k<kpiHeadCols.length; k++ ) 
  {
    var slope = ((periods.length*sumXY[k] - sumX*sumY[k]) / (periods.length*sumXX - sumX*sumX));

    // Percent of average value increase in a year
    if( doNormalize ) {
      var periodFactor = 1;
      var periodType = doc.selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C["+periodDimPos+"]/@id").nodeValue
      switch (periodType) {
        case "dy":
          periodFactor = 365 / periods.length;
        case "cw":
          periodFactor = 52 / periods.length;
        case "mo":
          periodFactor = 12 / periods.length;
        case "qr":
          periodFactor = 4 / periods.length;          
      }
      kpiSlopes.push( numF.format( 100 * periodFactor * slope / (sumY[k]/periods.length) ) );
    }

    // y = slope * x + c
    else {
      var c = (sumY[k]/periods.length) - slope*(sumX/periods.length);
      kpiSlopes.push( { c: numF.format(c), slope: numF.format( slope ) } );
    }
  }

  //------------------------------------
  // Extend the header
  var headCols = doc.selectSingleNode("/*/wrs:Header/wrs:Columns");
  var pos = 1 + headCols.selectNodes("wrs:C").length;
  for( var k=0; k<kpiHeadCols.length; k++ ) {
    var propertyPostfix = doNormalize ? "" : ".slope";
    c = bcdui.core.browserCompatibility.appendElementWithPrefix( headCols, "wrs:C" );
    c.setAttribute("pos", pos++);
    c.setAttribute("id", "asp_"+aspId+"_"+kpiHeadCols.item(k).getAttribute("id").substring(4) + propertyPostfix );
    c.setAttribute("valueId", aspId+propertyPostfix);
    c.setAttribute("caption", aspCaption + "|" + kpiHeadCols.item(k).getAttribute("caption") );
    c.setAttribute("type-name", "NUMERIC");
    if( !doNormalize ) {
      c = bcdui.core.browserCompatibility.appendElementWithPrefix( headCols, "wrs:C" );
      c.setAttribute("pos", pos++);
      c.setAttribute("id", "asp_"+aspId+"_"+kpiHeadCols.item(k).getAttribute("id").substring(4)+".const");
      c.setAttribute("valueId", aspId+".c");
      c.setAttribute("caption", aspCaption + " const|" + kpiHeadCols.item(k).getAttribute("caption") );
      c.setAttribute("type-name", "NUMERIC");
    }
  }
  // Append the data
  var rows = doc.selectNodes("/*/wrs:Data/wrs:R");
  for( var r=0; r<rows.length; r++ ) {
    var row = rows.item(r);
    var isLastPeriodRow = row === periods[periods.length-1].row;
    for( var k=0; k<kpiHeadCols.length; k++ ) {
      // We only store the actual values in the row with the last period, other rows get empty wrs:C
      if( isLastPeriodRow ) {
        if( doNormalize ) {
          var slope = doc.createTextNode( kpiSlopes[k] );
          var c = bcdui.core.browserCompatibility.appendElementWithPrefix( row, "wrs:C" );
          c.appendChild(slope);
        } else {
          var slope = doc.createTextNode( kpiSlopes[k].slope );
          var c = bcdui.core.browserCompatibility.appendElementWithPrefix( row, "wrs:C" );
          c.appendChild(slope);
          var text = doc.createTextNode( kpiSlopes[k].c );
          c = bcdui.core.browserCompatibility.appendElementWithPrefix( row, "wrs:C" );
          c.appendChild(text);
        }
      } else {
        bcdui.core.browserCompatibility.appendElementWithPrefix( row, "wrs:C" );
        if( !doNormalize )
          bcdui.core.browserCompatibility.appendElementWithPrefix( row, "wrs:C" );
      }          
    }
  }

  return doc;
}