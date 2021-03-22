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
/**
 * @fileoverview
 * The implementation of the Chart class.
 */

bcdui.util.namespace("bcdui.component.chart",{});  // Making sure our namespace exists


/**
 * This class represents a chart.
 * In many cases you use {@link bcdui.component.chart.XmlChart} and you have a config for the chart
 * @extends bcdui.core.DataProvider
 */
bcdui.component.chart.Chart = class extends bcdui.core.DataProvider
{
  //***********************************************
  // Constants for available chart types
  /**
   * @constant
   */
  LINECHART= 1;
  /**
   * @constant
   */
  AREACHART= 2;
  /**
   * @constant
   */
  BARCHART=  3;
  /**
   * @constant
   */
  PIECHART=  4;
  /**
   * @constant
   */
  SCATTEREDCHART= 5;
  /**
   * @constant
   */
  POINTCHART= 6;
  /**
   * @constant
   */
  GAUGECHART= 7;
  /**
   * @constant
   */
  MARIMEKKOCHART= 8;
  /**
   * @private
   * @constant
   */
  TYPEMAXINDEX= 8;

  /**
   * @param {Object} args - Parameter object:
   * @param {targetHtmlRef} args.targetHtml                       - Where to place the chart
   * @param {boolean}       [args.suppressInitialRendering=false] - If true, the renderer does not initially auto execute but waits for an explicit execute
   * @param {string}        [args.id]                             - Page unique id for used in declarative contexts. If provided, the chart will register itself
   * @param {boolean}       [args.showAxes=true]                  - If false, no axes will be shown
   * @param {string}        [args.title]                          - Title
   * @param {number}        [args.width]                          - Overwrite the chart's auto-width derived from targetHtml
   * @param {number}        [args.height]                         - Overwrite the chart's auto-height derived from targetHtml
   */
  constructor(args)
  {
    super(args);

    this.waitingForUncomittedChanges = new bcdui.core.status.WaitingForUncomittedChanges();
    this.initializedStatus = new bcdui.core.status.InitializedStatus();
    this.loadingStatus = new bcdui.core.status.LoadingStatus();
    this.transformedStatus = new bcdui.core.status.TransformedStatus();
    this.addStatusListener(this._statusTransitionHandler.bind(this));
    this.title           = args.title  || null;
    this.showToolTip  = this.optToolTip;
    this.showAxes     = args.showAxes ? args.showAxes : true; // may change in calc depending on chart type
    this.has2ndYAxis  = false;
    args.targetHTMLElementId = bcdui.util._getTargetHtml( args, "chart_" );

    if( args.targetHTMLElementId ) this.target = bcdui._migPjs._$(args.targetHTMLElementId).get(0);
    else this.target = bcdui._migPjs._$(args.targetHTMLIsParentOfId).get(0).parentNode;

    this.targetHtmlElement  = this.target;
    this.targetHTMLElementId = bcdui._migPjs._$(this.targetHtmlElement).get(0).id || bcdui.factory.objectRegistry.generateTemporaryIdInScope("chart_tE_");
    bcdui._migPjs._$(this.targetHtmlElement).get(0).id = this.targetHTMLElementId;

    // try to get width/height from various definitions
    if(args.width != null){
      this.width = args.width;
      bcdui._migPjs._$(this.target).css({width:args.width});
    }
    else{
      const _determineWidth=(el)=>{
        if(!el.length || !el.get(0).style)return null;
        return parseInt(el.attr("width"), 10) || parseInt(el.get(0).style.width, 10) || parseInt(el.css("width"), 10) || _determineWidth(el.parent());
      };
      this.width = _determineWidth(bcdui._migPjs._$(this.target));
    }

    if(args.height != null){
      this.height = args.height;
      bcdui._migPjs._$(this.target).css({height:args.height});
    }
    else {
      const _determineHeight=(el)=>{
        if(!el.length || !el.get(0).style)return null;
        return parseInt(el.attr("height"), 10) || parseInt(el.get(0).style.height, 10) || parseInt(el.css("height"), 10) || _determineHeight(el.parent());
      };
      this.height = _determineHeight(bcdui._migPjs._$(this.target));
    }
    if( ! args.suppressInitialRendering )
      this.execute();
    
  }

  getClassName() {return "bcdui.component.chart.Chart";}

  /**
   * initializes/computes some values
   * @param none
   * @private
   */
  _initValues(){
    // defaults
    this.barWidth       = 20;  // default, may scale with number of bars
    this.offset         = 25;  // space for axes
    this.scatteredMax   = 1/8; // size of biggest circle in scattered graphs compared to min(width,height) of chart

    // params
    this.showAxesCaptions = this.showAxes==true ? true : false;
    this.seriesArray     = new Array();
    this.xAxis           = { unit: "", caption: "x",  minValue: null, maxValue: null, scale: null, xValues: null, categories: null, categoriesGiven: false };
    this.yAxis1          = { unit: "", caption: "y1", minValue: null, maxValue: null, minValueUser: null, maxValueUser: null, scale: null, transScale: { transform: {}, scale: {} } };
    this.yAxis2          = { unit: "", caption: "y2", minValue: null, maxValue: null, minValueUser: null, maxValueUser: null, scale: null, transScale: { transform: {}, scale: {} } };
    this.origin          = { x: 0, y: 0 };
    this.numberOfBars    = 0;

    this.isLightBackground = true;
    var bgColor = jQuery(this.targetHtmlElement).parents().addBack().filter(function() {
      var color = jQuery(this).css('background-color');
      if(color != 'transparent' && color != 'rgba(0, 0, 0, 0)' && color != undefined) 
        return color; 
    }).last().css('background-color');
    if( jQuery.Color(bgColor).lightness() < 0.5 )
      this.isLightBackground = false;
    this.defaultLabelClass = this.isLightBackground ? "bcdChartTextDark" : "bcdChartTextLight";
    this.gridColor = this.isLightBackground ? "#DDD" : "#666";


    // This will hold per chart type and axis an TypeStackedInfo if that combination is to be stacked
    this.stackedInfo = new Array((this.TYPEMAXINDEX+1)*2);
    for( var si=0; si<this.stackedInfo.length; si++ ){
      this.stackedInfo[si] = null;
    }

    // Plot area is the space left for the chart itself
    // it is width and height reduced by space for legend, captions and a margin to allow bubbles to go beyond the core space for example
    // zero is != 0 if x=0 rep. y=0 is not identical to the lower left of the chart
    this.plotArea        = new Object();
    this.plotArea.margin = { left: 40, right:10, bottom: 10, top: 10 }; // starting at right, bottom of chart

    this.effect = "linearPlate";
    this.colorProvider = null;
    this.optToolTip = true;

    this.maxXCaptionChars = -1;
    this.maxBottomMarginPercentage = 33;

    this.has2ndYAxis = false;
  }

  /**
   * Defines x (horizontal) axis
   * @param {Object} args -  Parameter object
   * @param {number[]} [args.categories] - Distinct values, provide this or xValues
   * @param {number[]} [args.xValues]    - Values for continuous axis for x-y charts
   * @param {string}   [args.caption]    - Axis caption
   * @param {string}   [args.unit]       - Unit like € or sec. If '%', values are shown as percent. Use '% ' to show percent without dividing by 100
   * @param {string}   [args.layoutFlow] - css value
   */
  setXAxis( args )
  {
    if( args.categories ) {
      this.xAxis.categories = this._nodeSetOrArray2Array( {data:args.categories} ).dataAsArray;
      // Per convention, | separates levels in the header, here we only need the dim value (first part), not the measure
      if(typeof this.xAxis.categories[0] == "string" && this.xAxis.categories[0].split("|").length > 1) {
        var cats = this.xAxis.categories;
        for( var i=0; i<cats.length; i++)
          cats[i] = cats[i].split("|")[0];
      }
      this.xAxis.categoriesGiven = true;
    }
    if( args.xValues )
      this.xAxis.xValues    = this._nodeSetOrArray2Array( {data:args.xValues} ).dataAsArray;

    if(args.caption)     this.xAxis.caption     = args.caption;
    if(args.unit)        this.xAxis.unit        = args.unit;
    if(typeof args.scale != "undefined") axis.scale = args.scale;
    if(args.layoutFlow)  this.xAxis.layoutFlow  = args.layoutFlow;
    if( this.xAxis.unit == "%" && args.xValues )
      for( var i=0; i<this.xAxis.xValues.length; i++ )
        this.xAxis.xValues[i] = Math.round(this.xAxis.xValues[i]*100*10)/10; // 1 decimal digit precision
    this.xAxis.showGrid = args.showGrid==false ? false : true;
  }

  /**
   * Defines left y axis
   * @param {Object} args -  Parameter object
   * @param {string}   [args.caption]       - Axis caption
   * @param {string}   [args.unit]          - Unit like € or sec. If '%', values are shown as percent. Use '% ' to show percent without dividing by 100
   * @param {string}   [args.layoutFlow]    - css value
   * @param {numberic} [args.minValueUser]  - User set axis min value. Only used when below lowest actual value
   * @param {numberic} [args.maxValueUser]  - User set axis max value. Only used when above highest actual value
   * @param {boolean}  [args.showGrid=true] - If false, no horizontal grid is shown but only small lines next to the y-axis values
   */
  setYAxis1( args )
  {
    this._setYAxis( this.yAxis1, args );
    this.yAxis1.showGrid = args.showGrid==false ? false : true;
  }

  /**
   * Defines right y axis
   * @param {Object} args -  Parameter object
   * @param {string}   [args.caption]       - Axis caption
   * @param {string}   [args.unit]          - Unit like € or sec. If '%', values are shown as percent. Use '% ' to show percent without dividing by 100
   * @param {string}   [args.layoutFlow]    - css value
   * @param {numberic} [args.minValueUser]  - User set axis min value. Only used when below lowest actual value
   * @param {numberic} [args.maxValueUser]  - User set axis max value. Only used when above highest actual value
   */
  setYAxis2( args )
  {
    this._setYAxis( this.yAxis2, args );
  }

  /**
   * Internal helper for the two functions above
   * @private
   */
  _setYAxis( axis, args )
  {
    if(args.caption)     axis.caption      = args.caption;
    if(args.unit)        axis.unit         = args.unit;
    if(typeof args.scale != "undefined")   axis.scale = args.scale;
    if(args.layoutFlow)  axis.layoutFlow   = args.layoutFlow;
    if(typeof args.minValue != "undefined") axis.minValueUser = args.minValue;
    if(typeof args.maxValue != "undefined") axis.maxValueUser = args.maxValue;
  }

  /**
   * Adds a data series to the chart
   * @param {Object} args - Parameter object
   * @param {integer}           [args.yAxis1Or2]                - 1 for left and 2 for right axis
   * @param {numeric[]}         [args.yData]                    - Data array or provide yDataInfo
   * @param {nodeset}           [args.yDataInfo]                - XML nodeset with data
   * @param {numeric[]}         [args.sizeData]                 - 2nd value for scattered charts
   * @param {numeric[]}         [args.xValues]                  - For x-y charts
   * @param {(integer|string)}  [args.chartType]                - Either name or numeric value for chart type
   * @param {string}            [args.rgb]                      - Color
   * @param {string}            [args.dashstyle]                - Dash style
   * @param {string[]}          [args.baseColors]               - Colors defining the tones of the generated colors, for example in case of a pie chart
   * @param {string}            [args.caption]                  - Series caption
   * @param {numeric}           [args.width]                    - Line width</li>
   * @param {(function|string)} [args.onClick]                  - Either a function or the name of a function
   * @param {boolean}           [args.toSeriesPercentage=false] - If true, each value is represented by its percentage value of the full series.
   */
  addSeries( args )
  {
    var series = new Array();
    series.id = args.id;
    if( args.yAxis1Or2 == 2 )
      series.yAxis1Or2 = 2;
    else
      series.yAxis1Or2 = 1;
    var v = this._nodeSetOrArray2Array( {data:args.yData, dataInfo:args.yDataInfo} );
    series.yData = v.dataAsArray;
    series.yDataInfo = v.dataInfoAsArray;
    series.chartType  = isFinite(args.chartType) ? args.chartType : this[args.chartType];
    series.chartType  = series.chartType || ((series.yAxis1Or2 == 1 ? this.yAxis1 : this.yAxis2).unit == "%" ? this.LINECHART : this.BARCHART);
    series.rgb        = args.rgb;
    series.dashstyle  = args.dashstyle;
    series.baseColors = args.baseColors;
    series.caption    = args.caption;
    series.width      = args.width;
    series.alignWithBarSeries = args.alignWithBarSeries;
    series.disableSeriesPercent = args.disableSeriesPercent;
    series.showPoints = typeof args.showPoints!="undefined" ? args.showPoints : true;
    if(args.width)
      series.width = args.width;

    if( typeof args.onClick!="undefined" ) {
      if( typeof args.onClick=="function" )
        series.onClick = args.onClick;
      else if( typeof window[args.onClick]=="function" )
        series.onClick = window[args.onClick];
    }

    if(args.xValues)
      series.xValues = this._nodeSetOrArray2Array( {data:args.xValues} ).dataAsArray;
    if(args.colors)
      series.colors  = this._nodeSetOrArray2Array( {data:args.colors} ).dataAsArray;

    if(args.toSeriesPercentage)
      series.toSeriesPercentage = true;
    else
      series.toSeriesPercentage = false;

    this.seriesArray.push(series);
  }

  /**
   * Define series as being stacked
   * @param {Object} args - map with
   * @param {integer}          args.axis             - 1 for left axis 2 for right one</li>
   * @param {(integer|string)} args.chartType        - Either name or numeric value for chart type
   * @param {boolean}          [args.asPercent]      - Each series is calculated to its percentage of the sum if all series and shown as *100'%'
   * @param {boolean}          [args.isStacked=true] - Whether to stack or not
   */
  setStacked( args )
  {
    if( args.isStacked && args.isStacked==false )
      return;

    var chartTypeValue = isFinite(args.chartType) ? args.chartType : this[args.chartType];
    if( this.stackedInfo[chartTypeValue * 2 + args.axis-1]==null ) {
      this.stackedInfo[chartTypeValue * 2 + args.axis-1] = new Array();

      this.stackedInfo[chartTypeValue * 2 + args.axis-1].asPercent = (args.asPercent && (args.asPercent==true || args.asPercent=="true"));

      // This is the place where we count stacked bars
      if( chartTypeValue==this.BARCHART )
        this.numberOfBars += 1;
    }
    return;
  }


  /**
   * Draw the chart. Can be called repeatedly and is guaranteed not to change th internal state of the chart
   * Be sure to call calc() upfront at least once.
   * Use execute() for normal operations, which takes care of all initializations
   *
   * @param targetHtmlElement Will clear its content and insert the chart
   * @private
   */
  _draw( targetHtmlElement )
  {
    bcdui.log.isDebugEnabled() && bcdui.log.debug("Chart '"+this.id+"': drawing of all "+this.seriesArray.length+" series started");

    // addAttr and tooltipCb are used for the fly-over of the charts
    var addAttr = { chartId: this.id,
                    xAxis: this.xAxis.caption,   xAxisUnit:  this.xAxis.unit,
                    yAxis1: this.yAxis1.caption, yAxis1Unit: this.yAxis1.unit,
                    yAxis2: this.yAxis2.caption, yAxis2Unit: this.yAxis2.unit };
    var tooltipCb = (this.showToolTip && this.showToolTip==false) ? null : this._createToolTipCb;

    this.drawer = new bcdui.component.chart.SVGDrawer( {doc:document, transform:{ x: this.plotArea.margin.left, y: this.height-this.plotArea.margin.bottom }, scale:{ x: 1, y: -1 }, addAttr: addAttr, createToolTipCb: tooltipCb, width: this.width, height: this.height  } );

    // Some re-initialization steps
    this._drawCalc();

    // Draw from background to top:
    bcdui.log.isDebugEnabled() && bcdui.log.debug("Chart '"+this.id+"': drawing grid");
    this._drawGrid();

    // AREA, BAR
    bcdui.log.isDebugEnabled() && bcdui.log.debug("Chart '"+this.id+"': drawing series and grid ...");
    for( var i=0; i< this.seriesArray.length; i++ ) {
      var series = this.seriesArray[i];
      this.drawer.setTransScale( series.yAxis.transScale );
      switch(series.chartType) {
        case this.AREACHART:
          this._drawLineSeries(series);
          break;
        case this.BARCHART:
        case this.MARIMEKKOCHART:
          this._drawBarSeries(series);
          break;
      }
    }

    // Main axes
    this._drawGridMainAxes();

    // Pie, scattered, gauge
    for( var i=0; i< this.seriesArray.length; i++ ) {
      var series = this.seriesArray[i];
      switch(series.chartType) {
        case this.PIECHART:
          this.drawer.setTransScale( series.yAxis.transScale );
          this._drawPie(series);
          break;
        case this.GAUGECHART:
          this.drawer.setTransScale( series.yAxis.transScale );
          this._drawGauge(series);
          break;
        case this.SCATTEREDCHART:
          if( this.seriesArray.length!=2 || this.seriesArray[0].yAxis1Or2+this.seriesArray[1].yAxis1Or2 != 3 ) {
            var msg = "Scattered chart '"+this.id+"' needs one series for y1 and one for y2";
            bcdui.log.error(msg);
            throw new Error(msg);
          }
          var y    = this.seriesArray[0].yAxis1Or2==1 ? this.seriesArray[0] : this.seriesArray[1];
          var size = this.seriesArray[1].yAxis1Or2==2 ? this.seriesArray[1] : this.seriesArray[0];
          this.drawer.setTransScale( y.yAxis.transScale );
          this._drawScatteredSeries(y,size);
          break;
      }
    }

    // Line, Point
    for( var i=0; i< this.seriesArray.length; i++ ) {
      var series = this.seriesArray[i];
      this.drawer.setTransScale( series.yAxis.transScale );
      switch(series.chartType) {
        case this.LINECHART:
        case this.POINTCHART:
          this._drawLineSeries(series);
          break;
      }
    }

    targetHtmlElement.innerHTML = "";
    targetHtmlElement.appendChild(this.drawer.getResult());
    var drawer = this.drawer;
    if( drawer.rootElem.createToolTipCb ) {
      jQuery(targetHtmlElement).find("svg *").on("mouseover", function(e){drawer._showToolTip(this, e)});
      jQuery(targetHtmlElement).find("svg *").on("mousemove", function(e){drawer._moveToolTip(this, e)});
      jQuery(targetHtmlElement).find("svg *").on("mouseout",  function(e){drawer._hideToolTip(this, e)});
    }

    bcdui.log.isDebugEnabled() && bcdui.log.debug("Chart '"+this.id+"': done");
    return 1;// state is OK
  }

  /**
   * While the "big" calc method is only to be called once per chart instance,
   * this drawCalc is to be called for each draw-ing attempt
   *
   * @private
   */
  _drawCalc() {
    for( var i=0; i< this.seriesArray.length; i++ ) {
      var series = this.seriesArray[i];
      var stackedInfo = this.stackedInfo[series.chartType*2+series.yAxis1Or2-1];
      if( stackedInfo!=null )
        for( var s=0; s<series.yData.length; s++ )
          stackedInfo.sumSoFar[s] = stackedInfo.sum[s];
    }
  }

  /**
   * Helper for number formatting
   * @private
   */
  _formatNumber1000S(nStr,scale){
    nStr += '';
    var x = nStr.split('.');
    var x1 = x[0];
    var x2 = x[1];
    if( isFinite(scale) && x.length > 1 )
      x2 = x2.substring(0,scale);
    x2 = (x2 && x2.length > 0) ? '.' + x2 : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1))
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
    return x1 + x2;
  }

  /**
   * @private
   */
  _getMaxXScaledValue()
  {
    var xGrid;
    if( this.hasMarimekkoChart )
      xGrid = { width: 20, minValue: 0, maxValue: 101, cutNumberCaptionAt: false, readMag: 0 };
    else if( this.xAxis.categoriesGiven ) {
      xGrid = { width: 1, minValue: 0, maxValue: this.xAxis.categories.length};
    } else
      xGrid = this._autoGrid( {axisLength:(this.xAxis.maxValue-this.xAxis.minValue), minValue:this.xAxis.minValue, maxValue:this.xAxis.maxValue, scale:this.xAxis.scale} );

    var maxScale = "";
    var numberText = "";

    for( var x=xGrid.minValue;  x<xGrid.maxValue; x+=xGrid.width ) {
      if( !this.xAxis.categoriesGiven && x==0 )
        continue;
      if( this.xAxis.categoriesGiven && ! this.hasMarimekkoChart )
        numberText = this.xAxis.categories[x/xGrid.width];
      else {
        numberText = xGrid.cutNumberCaptionAt ? (x/Math.pow(10,xGrid.readMag)).toFixed(xGrid.cutNumberCaptionAt) : (x/Math.pow(10,xGrid.readMag));
        numberText = this._formatNumber1000S(numberText,this.xAxis.scale);
        if(this.hasMarimekkoChart)
          numberText += "%";
        else
          numberText += this.xAxis.unit;
      }

      if (numberText.length > maxScale.length)
        maxScale = numberText;
    }

    return maxScale;
  }

  /**
   * @private
   */
  _getMaxYScaledValue(axis, chartType)
  {
    var plotAreaHeight = this.height-this.plotArea.margin.bottom-this.plotArea.margin.top;
    if( plotAreaHeight < 1 ){
      bcdui.log.warn("Chart '"+this.id+"' has no space to draw");
    }
    var axisTransScaleScaleY = (chartType == this.PIECHART || chartType == this.GAUGECHART) ? -1 : - plotAreaHeight / Math.abs((axis.maxValue-axis.minValue));
    var yGrid = this._autoGrid( {axisLength:(plotAreaHeight)/Math.abs(axisTransScaleScaleY), minValue:axis.minValue, maxValue:axis.maxValue, scale:axis.scale} );
    var maxScale = "";
    var isMain = true;
    for (var y=yGrid.minValue; y<=yGrid.maxValue; y+=yGrid.width) {
      isMain = !isMain;
      if( isMain && y!=0 && y<axis.maxValue*1.1 ) {
        var numberText = "" + (yGrid.cutNumberCaptionAt ? (y/Math.pow(10,yGrid.readMag)).toFixed(yGrid.cutNumberCaptionAt) : (y/Math.pow(10,yGrid.readMag)));
        if (numberText.length > maxScale.length)
          maxScale = numberText;
      }
    }

    // in case we have a magnitude, we need to check if this creates a bigger value
    if( yGrid.readMag > 0 ) {
      var numberText = "" + this._formatNumber1000S(Math.pow(10,yGrid.readMag),axis.scale);
      if (numberText.length > maxScale.length)
        maxScale = numberText;
    }

    return maxScale;
  }

  /**
   * Adjust values based on series information
   * @private
   */
  _calc()
  {
    // Some checks whether we can draw a chart
    if( this.seriesArray.length==0 )
      return false;
    if ( !isFinite(this.width) || this.width == 0 || !isFinite(this.height) || this.height == 0 ) {
      bcdui.log.isDebugEnabled() && bcdui.log.debug("Chart '"+this.id+"': Width and height of chart "+this.id+" must be set and > 0");
      return false;
    }

    // Setting some defaults
    for( var i=0; i< this.seriesArray.length; i++ ) {
      var series = this.seriesArray[i];

      // Some series chart types determine global chart properties, find them here
      if( series.chartType == this.PIECHART || series.chartType == this.GAUGECHART )
        this.showAxes = false;
      if( this.showAxes== false ) // can also be true independent of above condition from outside
        this.showAxesCaptions = false;
      this.hasScatteredChart = series.chartType == this.SCATTEREDCHART;
      this.hasMarimekkoChart = series.chartType == this.MARIMEKKOCHART;
    }

    //----------------------
    // If x is not given in terms of categories, calculate x-axis min, max
    // otherwise set "categories" as the values
    // XValues holds for x-y charts the x values, for a chart with category the position
    if( this.xAxis.categories && !this.xAxis.xValues && !this.hasMarimekkoChart ) {
      this.xAxis.xValues = new Array();
      for( var i=0; i<this.xAxis.categories.length; i++ )
        this.xAxis.xValues.push(i+0.5);  // place values in the middle of the grid
      this.xAxis.maxValue = this.xAxis.categories.length;
    } else if( this.xAxis.xValues ) {
      this.xAxis.minValue = this.xAxis.maxValue = NaN;
      this.xAxis.sum = 0;
      for( var i=0; i<this.xAxis.xValues.length; i++ ) {
        var val = this.xAxis.xValues[i];
        if( !isFinite(val) )
          continue;
        this.xAxis.sum += val;
        if( !isFinite(this.xAxis.minValue) || val < this.xAxis.minValue ) this.xAxis.minValue = val;
        if( !isFinite(this.xAxis.maxValue) || val > this.xAxis.maxValue ) this.xAxis.maxValue = val;
      }
      if( !this.xAxis.categories )
        this.xAxis.categories = this.xAxis.xValues;
    }

    //----------------------
    // Loop over all series and determine global min/max for both y axes
    for( var s=0; s<this.seriesArray.length; s++ )
    {
      var series = this.seriesArray[s];

      // "Apply" % unit on the y-values
      if( (series.yAxis1Or2==1 && this.yAxis1.unit == "%") || (series.yAxis1Or2==2 && this.yAxis2.unit == "%") )
        for( var i=0; i<series.yData.length; i++ )
          series.yData[i] = Math.round(series.yData[i]*10000)/100;

      // If this series does not have xValues, take the ones from the "global" xAxis
      // Each series can have its own XValues in a x-y chart
      // We do also apply % unit to the XValues if necessary and determine the min and max values
      if( ! series.xValues ) {
        series.xValues = this.xAxis.xValues;
        series.xCategories = this.xAxis.categories;
      }
      else {
        this.xAxis.minValue = this.xAxis.maxValue = NaN;
        series.xCategories = series.xValues;
        for( var i=0; i<series.xValues.length; i++ ) {
          var val = series.xValues[i];
          if( !isFinite(val) )
            continue;
          if( !isFinite(this.xAxis.minValue) || val < this.xAxis.minValue ) this.xAxis.minValue = val;
          if( !isFinite(this.xAxis.maxValue) || val > this.xAxis.maxValue ) this.xAxis.maxValue = val;
        }
      }

      // Determine number of bar series
      if( series.chartType == this.BARCHART || series.chartType == this.MARIMEKKOCHART ) {
        var stackedInfo = this.stackedInfo[series.chartType*2+series.yAxis1Or2-1];
        if( stackedInfo!=null ) {
          // Since this is used to place bars of differen series next to each other, and we want then all on the same place in the stacked case,
          // This is just 0 for all BAR series.
          this.seriesArray[s].barChartIndex = 0;
        } else {
          this.seriesArray[s].barChartIndex = this.numberOfBars;
          this.numberOfBars += 1;
        }
      }

      //------------------------------------------
      // Loop over values of one series, store min, max and info for stacked charts
      // Series belongs to axis 1:
      if( series.yAxis1Or2==1 )
        series.yAxis = this.yAxis1;
      else {
        series.yAxis = this.yAxis2;
        this.has2ndYAxis = true;
      }

      var stackedInfo = this.stackedInfo[series.chartType*2+series.yAxis1Or2-1];
      if( stackedInfo!=null && !stackedInfo.sum ) {
        stackedInfo.sum      = new Array(series.yData.length);
        stackedInfo.sumSoFar = new Array(series.yData.length);
        for( var i=0; i<series.yData.length; i++ )
          stackedInfo.sum[i] = 0;
      }
      series.yAxis1Sum = 0;
      for( var i=0; i<series.yData.length; i++ ) {
        var val = series.yData[i];
        if( !isFinite(val) )
          continue;
        series.yAxis1Sum += val;
      }
      if( series.toSeriesPercentage==true ) {
        for( var i=0; i<series.yData.length; i++ ) {
          if( !isFinite(series.yData[i]) )
            continue;
          series.yDataInfo[i] += "("+series.yData[i]+")";
          if(series.yAxis1Sum==0)
            series.yData[i] = 0;
          else
            series.yData[i] = Math.round(series.yData[i]/series.yAxis1Sum*10000)/100;
        }
      }

      // Determine global min max for the y axis the series belongs to
      if( series.yAxis.minValue==null )
        series.yAxis.maxValue = series.yAxis.minValue = NaN;
      for( var i=0; i<series.yData.length; i++ ) {
        var val = series.yData[i];
        if( !isFinite(val) )
          continue;
        if( !isFinite(series.yAxis.minValue) || val < series.yAxis.minValue ) series.yAxis.minValue = val;
        if( !isFinite(series.yAxis.maxValue) || val > series.yAxis.maxValue ) series.yAxis.maxValue = val;
        if( stackedInfo!=null ) stackedInfo.sum[i] += val;
      }

      // In case of stacked charts the min/max needs to be adjusted
      for( var i=0; i<this.stackedInfo.length; i++ ) {
        if( i%2 == 0 && this.stackedInfo[i]!=null && this.stackedInfo[i].sum ) {
          for( var v=0; v<series.yData.length; v++ ) {
            if( this.stackedInfo[i].sum[v] < this.yAxis1.minValue ) this.yAxis1.minValue = this.stackedInfo[i].sum[v];
            if( this.stackedInfo[i].sum[v] > this.yAxis1.maxValue ) this.yAxis1.maxValue = this.stackedInfo[i].sum[v];
          }
        } else if( this.stackedInfo[i]!=null && this.stackedInfo[i].sum ) {
          for( var v=0; v<series.yData.length; v++ ) {
            if( this.stackedInfo[i].sum[v] < this.yAxis2.minValue ) this.yAxis2.minValue = this.stackedInfo[i].sum[v];
            if( this.stackedInfo[i].sum[v] > this.yAxis2.maxValue ) this.yAxis2.maxValue = this.stackedInfo[i].sum[v];
          }
        }
      }
    }

    // In a Marimekko chart, xValues scale to 100%
    // If no xValues are provided, we calculate the relative widths of the stacks from the totals of the stacks' content
    if( this.hasMarimekkoChart ) {
      this.xAxis.minValue = 0;
      this.xAxis.maxValue = 100;
      if( !this.xAxis.xValues ) {
        this.xAxis.xValues = new Array();
        var allSum = 0;
        var stackedInfo = this.stackedInfo[this.MARIMEKKOCHART*2];
        for( var i=0; i<this.xAxis.categories.length; i++ )
          allSum += stackedInfo.sum[i];
        for( var i=0; i<this.xAxis.categories.length; i++ ) {
          this.xAxis.xValues[i] = stackedInfo.sum[i]*100/allSum;
          var xValue = stackedInfo.sum[i]>10 ? Math.round(stackedInfo.sum[i]) : stackedInfo.sum[i].toPrecision(3);
          this.xAxis.categories[i] += " "+xValue+this.xAxis.unit;
        }
      } else {
        for( var i=0; i<this.xAxis.xValues.length; i++ ) {
          this.xAxis.categories[i] += " "+this.xAxis.xValues[i]+this.xAxis.unit;
          this.xAxis.xValues[i] = this.xAxis.xValues[i]*100/this.xAxis.sum;
        }
      }
      this.xAxis.sum = 100;
    }

    // If user did not define a minimum or maximum, we use the min/max values of the axis
    // In the latter case, for min we prefer 0 if that does not much expand the y axis by more than a third
    // Beside that we extend the axis in the latter case by 10% beyond the extreme values
    [this.xAxis, this.yAxis1, this.yAxis2].forEach( function(axis) {
        if( axis===this.yAxis2 && !this.has2ndYAxis )
          return;
        if( axis.minValueUser!=null &&  (axis.minValue===null || !isFinite(axis.minValue) || axis.minValueUser <  axis.minValue))
          axis.minValue = axis.minValueUser;
        if( axis.maxValueUser!=null &&  (axis.maxValue===null || !isFinite(axis.maxValue) || axis.maxValueUser >  axis.maxValue))
          axis.maxValue = axis.maxValueUser;
        if( typeof axis.categoriesGiven == "undefined" || !axis.categoriesGiven ) {
          if (axis.minValue===null || !isFinite(axis.minValue)) {
            if (axis.maxValue===null || !isFinite(axis.maxValue)) {
              bcdui.log.warn("Chart '"+this.id+"': not a single valid value for axis "+axis.caption+" found.");
              if( axis===this.yAxis2) {
                this.has2ndYAxis = false;
                return
              }
              axis.minValue=0;
            } else
              axis.minValue=axis.maxValue - Math.abs(axis.maxValue)*0.05;
          }
          if (axis.maxValue===null || !isFinite(axis.maxValue))
            axis.maxValue = axis.minValue + Math.abs(axis.minValue)*0.05;
          if( axis.maxValue!=axis.minValue ) {
            var offset = (axis.maxValue-axis.minValue)*((series.chartType!=this.GAUGECHART) ? 0.1 : 0);
            axis.minValue -= offset;
            axis.maxValue += offset;
          } else {
            axis.minValue -= Math.abs(axis.minValue)*0.05;
            axis.maxValue += Math.abs(axis.maxValue)*0.05;
          }
        }
        if ( (axis.maxValue-axis.minValue)/axis.minValue > 3 )
          axis.minValue = 0;
        if( axis.minValue==0 && axis.minValue==axis.maxValue ) {
          axis.minValue = 0;
          axis.maxValue = 5;
        }
      }, this );

    // For gauge charts we extent the categories so that the needle is within the gauge
    if( series.chartType==this.GAUGECHART ) {
      if( this.seriesArray[0].yAxis.minValue < this.xAxis.minValue )
        this.xAxis.minValue = this.xAxis.xValues[0] = this.xAxis.categories[0]
           = Math.floor(this.seriesArray[0].yAxis.minValue);
      if( this.seriesArray[0].yAxis.maxValue > this.xAxis.maxValue )
        this.xAxis.maxValue = this.xAxis.xValues[this.xAxis.categories.length-1]
           = this.xAxis.categories[this.xAxis.categories.length-1]
           = Math.ceil(this.seriesArray[0].yAxis.maxValue*1.02);
      this.seriesArray[0].xValues = this.xAxis.xValues;
      this.seriesArray[0].xCategories = this.xAxis.categories;
    }

    // If we have stacked series and should show them as percent, scale the axis from 0-100
    for( var ct=1; ct<=this.TYPEMAXINDEX; ct++ ) {
      if( this.stackedInfo[ct*2]!=null && this.stackedInfo[ct*2].asPercent==true ) {
        this.yAxis1.minValue = 0;
        this.yAxis1.maxValue = 100;
        this.yAxis1.asPercent = true;
      }
      if( this.stackedInfo[ct*2+1]!=null && this.stackedInfo[ct*2+1].asPercent==true ) {
        this.yAxis2.minValue = 0;
        this.yAxis2.maxValue = 100;
        this.yAxis2.asPercent = true;
      }
    }

    //---------------------------------------------
    // Depending on the axes define plot area
    if( this.xAxis.minValue < 0 )
      this.plotArea.margin.left -= 30;
    if( this.showAxesCaptions == true && !(this.yAxis1.minValue < 0) )
      this.plotArea.margin.bottom += 15;
    if( this.has2ndYAxis == true && !this.hasScatteredChart )
      this.plotArea.margin.right += 30;
    if( this.hasMarimekkoChart ) {
      this.plotArea.margin.left -= 10;
      this.plotArea.margin.right += 20;
    }
    if( this.showAxes==false ) {
      if( series.chartType == this.PIECHART || series.chartType == this.GAUGECHART )
        this.plotArea.margin = { left: 20, right: 20, bottom: 12, top: 13 };
      else
        this.plotArea.margin = { left: 0, right: 0, bottom: 0, top: 0 };
    }
    if( this.title!=null && this.title!="" && this.showAxes!=false )
      this.plotArea.margin.top += 14;

    var maxValue1 = this._getMaxYScaledValue(this.yAxis1, series.chartType);

    // set left margin depending on max length shown on axis and unit
    var max = 3 + (6 * maxValue1.length); // 3px takes text between right end and axis, 6px average number width
    var unit = (this.yAxis1.asPercent || this.yAxis1.unit=="%") ? "%" : this.yAxis1.unit;
    max += 10 * unit.length; // % symbol is approx. 10px
    if (this.xAxis.minValue >= 0 && this.showAxes && max > this.plotArea.margin.left)
      this.plotArea.margin.left = max;

    if (this.has2ndYAxis == true) {

      var maxValue2 = this._getMaxYScaledValue(this.yAxis2, series.chartType);

      // set right margin depending on max length shown on axis and unit
      max = 3 + (6 * maxValue2.length); // 3px takes text between left end and axis, 6px average number width
      unit = (this.yAxis2.asPercent || this.yAxis2.unit=="%") ? "%" : this.yAxis2.unit;
      max += 10 * unit.length; // % symbol is approx. 10px
      if (this.showAxes && max > this.plotArea.margin.right)
        this.plotArea.margin.right = max;
    }

    this.plotArea.width  = this.width-this.plotArea.margin.left-this.plotArea.margin.right;

    var defaulMarginBottom = this.plotArea.margin.bottom;

    // We can enforce vertical labels for the x-Axis if the lables would otherwise overlap
    var maxXLableLength = this._getMaxXScaledValue().length;

    if(maxXLableLength*6 > (this.plotArea.width / (this.xAxis.xValues.length)) && ! this.xAxis.layoutFlow && this.showAxes )
      this.xAxis.layoutFlow = "vertical-ideographic";
    if( this.xAxis.layoutFlow=="vertical-ideographic" )
      this.plotArea.margin.bottom += maxXLableLength*6; // 6 is assumed to be the average letter width

    // for bottom margin we allow only a maximum of x %
    // and define a maximum number of characters to be printed
    var curCaptionPercentage = 100 * (this.plotArea.margin.bottom - defaulMarginBottom) / (this.height - this.plotArea.margin.top);
    var maxAllowedPixel = (this.height - this.plotArea.margin.top) / (100 / this.maxBottomMarginPercentage);

    // 11 px = "..."
    if (curCaptionPercentage > this.maxBottomMarginPercentage) {
      this.plotArea.margin.bottom = maxAllowedPixel;
      this.maxXCaptionChars = (maxAllowedPixel - defaulMarginBottom) / 6;
    }

    this.plotArea.height = this.height-this.plotArea.margin.bottom-this.plotArea.margin.top;


    //--------------------------------------------
    // Adjust bar width and space left and right to prevent overlapping with some heuristic to prevent too wide boxes if there are only few
    if( this.xAxis.categories )
      this.barWidth = Math.min( this.plotArea.width / ( this.xAxis.categories.length*(this.numberOfBars+1) ), jQuery(window).innerWidth()/25 );

    //--------------------------------------------
    // x-axis scaling
    if( this.xAxis.categoriesGiven && !this.hasMarimekkoChart )
      this.xAxis.scale = this.plotArea.width / (this.xAxis.xValues.length);
    else
      this.xAxis.scale = this.plotArea.width / (this.xAxis.maxValue-this.xAxis.minValue);

    // Scale factors
    // For x-axis they are the same, but for y, each y-axis has its own scaling and transform
    if( series.chartType == this.PIECHART || series.chartType == this.GAUGECHART ) {
      this.yAxis1.transScale.scale.x = 1;
      this.yAxis1.transScale.scale.y = -1;
      this.yAxis1.transScale.transform.x = this.plotArea.width/2 + this.plotArea.margin.left;
      this.yAxis1.transScale.transform.y = this.plotArea.height/2 + this.plotArea.margin.top;
      if( series.chartType == this.GAUGECHART )
        this.yAxis1.transScale.transform.y = this.plotArea.height + this.plotArea.margin.top;
    } else {
      this.yAxis1.transScale.scale.x = this.xAxis.scale;
      this.yAxis1.transScale.scale.y = - this.plotArea.height / Math.abs((this.yAxis1.maxValue-this.yAxis1.minValue));
      this.yAxis1.transScale.transform.x = this.plotArea.margin.left - this.xAxis.scale*this.xAxis.minValue;
      this.yAxis1.transScale.transform.y = this.plotArea.height + this.plotArea.margin.top - this.yAxis1.transScale.scale.y*this.yAxis1.minValue;

      this.yAxis2.transScale.scale.x = this.yAxis1.transScale.scale.x;
      this.yAxis2.transScale.scale.y = - this.plotArea.height / Math.abs((this.yAxis2.maxValue-this.yAxis2.minValue));
      this.yAxis2.transScale.transform.x = this.yAxis1.transScale.transform.x;
      this.yAxis2.transScale.transform.y = this.plotArea.height + this.plotArea.margin.top - this.yAxis2.transScale.scale.y*this.yAxis2.minValue;
    }
    if( this.hasScatteredChart )
      this.yAxis2.transScale.scale.x = this.yAxis2.transScale.scale.y *= 0.5;

    return true;
  }

  /**
   * return will hold
   * width: a value n*10^m with n in (1,2.5,5) and m an integer both such, that it is closed to 10 segments
   * (means 0.5 for 7 or 20 for 500 for example)
   * minValue: value to start with so that minValue+n*width will be 0
   * length: number steps along axisLength when stepsize gridWidth
   * @param args {Object}
   * @param args.axisLength
   * @param args.minValue
   * @private
   */
  _autoGrid( args )
  {
    var gridWidth = 1;
    var magnitude = Math.floor(Math.log(args.axisLength)/Math.log(10));
    var scaledLength = (args.axisLength)/Math.pow(10,(magnitude));
    var gridWidth = 1;
    if( Math.abs(scaledLength-1)>Math.abs(scaledLength-2.5) )
      gridWidth = 2.5;
    if( Math.abs(scaledLength-2.5)>Math.abs(scaledLength-5) )
      gridWidth = 5;
    if( Math.abs(scaledLength-7.5)>Math.abs(scaledLength-10) )
      gridWidth = 10;
    gridWidth *= Math.pow(10,(magnitude-1));

    // in case we only want to show integer values (scale = 0) we need to adjust
    // the gridWidth to avoid in-between steps
    if (args.scale == 0 && gridWidth < 0.5)
      gridWidth = 0.5;

    var minValue = Math.floor((args.minValue+gridWidth)/gridWidth)*gridWidth;

    // readable magnitude: 3 (1000) or 6 (1000000)
    var readMag = (Math.abs(args.maxValue)<1) ? 0 : ((Math.floor(Math.log(Math.abs(args.maxValue))/Math.log(10) / 3 )) * 3);

    // Workaround for JS precision issue (99.98 + 0.01 = 99.99000000000001)
    // For non-Integers, we will cut the precision of the axis caption at the precision of the width (only showing relevant number of digits)
    // Exception: If the last digit of width and the last digit of minValue are both 5, we drop the last digit,
    // because it will always be 0 since only every second grid gets a caption
    var widthLastDigit = (""+gridWidth).substring((""+gridWidth).length-1);
    var minLastDigit   = (""+minValue).substring((""+minValue).length-1);
    var cutNumberCaptionAt = null;
    if( gridWidth!=Math.round(gridWidth) ) {
      cutNumberCaptionAt = (""+gridWidth).split('.')[1].length;
    if( widthLastDigit==5 && minLastDigit==5 )
      cutNumberCaptionAt -= 1;
    }

    var autoGrid = { width: gridWidth, minValue: minValue, maxValue: args.maxValue, readMag: readMag, cutNumberCaptionAt: cutNumberCaptionAt };
    return autoGrid;
  }

  /**
   * Draw the background grid
   * @private
   */
  _drawGrid()
  {
    // title
    if( this.title!=null ) {
      var isGp = (this.seriesArray[0].chartType == this.PIECHART || this.seriesArray[0].chartType == this.GAUGECHART);
      this.drawer.setTransScale( this.yAxis1.transScale );
      this.drawer.text( { text: this.title, align: "middle",
                          x: (!isGp ? ((this.width/2-this.plotArea.margin.left)/this.xAxis.scale-Math.abs(this.xAxis.minValue))
                                      : (-this.width/5)),
                          y: (-10+this.yAxis1.transScale.transform.y)/Math.abs(this.yAxis1.transScale.scale.y),
                          cssClass: "bcdChartTitle "+this.defaultLabelClass } );
    }

    // Rest is not just not needed, but dangerous since not all values used here are initialized in this case
    if( !this.showAxes )
      return;

    // Position of the two main-axis captions, which scale with yAxis 1 (left-y and x)
    var mainAxisCaptionYPos = this.yAxis1.minValue - ( (this.yAxis1.minValue<0) ? -(15/this.yAxis1.transScale.scale.y)
                                                                                : (this.plotArea.margin.bottom-8)/Math.abs(this.yAxis1.transScale.scale.y) );

    //-----------------
    // Draw left (1.) y grid
    if( this.yAxis1.layoutFlow!="suppress" )
    {
      this.drawer.setTransScale( this.yAxis1.transScale );
      var yGrid = this._autoGrid( {axisLength:this.plotArea.height/Math.abs(this.yAxis1.transScale.scale.y), minValue:this.yAxis1.minValue, maxValue:this.yAxis1.maxValue, scale:this.yAxis1.scale} );
      var isMain = true;
      var x = this.xAxis.minValue<=0 ? -2/Math.abs(this.yAxis1.transScale.scale.x) : this.xAxis.minValue;
      var unit = (this.yAxis1.asPercent || this.yAxis1.unit=="%") ? "%" : "";
      var y1GridXStart = this.xAxis.minValue-5/this.yAxis1.transScale.scale.x;
      var y1GridXEnd   = this.yAxis1.showGrid ? this.xAxis.minValue+this.plotArea.width/this.yAxis1.transScale.scale.x
                                                : this.xAxis.minValue+5/this.yAxis1.transScale.scale.x;

      // Y1 axis values plus horizontal grid lines
      for( var y=yGrid.minValue; y<=yGrid.maxValue; y+=yGrid.width ) {
        isMain = !isMain;
        if(!isMain)
          continue;
        this.drawer.line( { points : [ [y1GridXStart,y],[y1GridXEnd,y] ], rgb : isMain ? this.gridColor : this.gridColor, shapeRendering: "crispEdges" } );
        if( isMain && y!=0 && y<this.yAxis1.maxValue*1.1 )
        {
          var numberText = yGrid.cutNumberCaptionAt ? (y/Math.pow(10,yGrid.readMag)).toFixed(yGrid.cutNumberCaptionAt) : (y/Math.pow(10,yGrid.readMag));
          this.drawer.text( { cssClass: this._getCssClass({axisName: "YAxis", axisCssClass: this.yAxis1.cssClass})+" "+this.defaultLabelClass
                            , align: "end"
                              , text : numberText+unit
                            , x: x-2/Math.abs(this.yAxis1.transScale.scale.x)
                            , y: y-5/Math.abs(this.yAxis1.transScale.scale.y) } );
        }
      }

      // Magnitude
      if( yGrid.readMag > 0 )
        this.drawer.text( { text : "'"+this._formatNumber1000S(Math.pow(10,yGrid.readMag),this.yAxis1.scale), cssClass: this.defaultLabelClass,
                            x: this.xAxis.minValue-this.plotArea.margin.left/Math.abs(this.yAxis1.transScale.scale.x), y: y-yGrid.width*0.8 } );

      // Y1 caption at the bottom
      if(this.showAxesCaptions!=false) {
        var caption = this.yAxis1.caption + (this.yAxis1.unit!="" ? " ["+this.yAxis1.unit+"]" : "");
        this.drawer.text( { text: caption
          , x: this.xAxis.minValue - (this.plotArea.margin.left-4)/Math.abs(this.yAxis1.transScale.scale.x)
          , y: mainAxisCaptionYPos
          , align: "start"
          , cssClass: this.id+"YAxisCaption "+this.defaultLabelClass
       });
      }
    }

    //-----------------
    // Draw right (2.) y grid
    if( this.has2ndYAxis && ! this.hasScatteredChart && this.yAxis2.layoutFlow!="suppress" )
    {
      this.drawer.setTransScale( this.yAxis2.transScale );
      yGrid = this._autoGrid( {axisLength:this.plotArea.height/Math.abs(this.yAxis2.transScale.scale.y), minValue:this.yAxis2.minValue, maxValue:this.yAxis2.maxValue, scale:this.yAxis2.scale} );
      var unit = (this.yAxis2.asPercent || this.yAxis2.unit=="%") ? "%" : "";
      var y2GridXEnd = this.xAxis.maxValue+4/Math.abs(this.yAxis2.transScale.scale.x);

      // Y2 axis values plus small horizontal helper lines (instead of grid)
      for( var y=yGrid.minValue; y<=yGrid.maxValue; y+=yGrid.width ) {
        isMain = !isMain;
        if(!isMain)
          continue;
        this.drawer.line( { points : [ [this.xAxis.maxValue,y], [y2GridXEnd,y] ], shapeRendering: "crispEdges", rgb: this.gridColor } );

        var numberText = yGrid.cutNumberCaptionAt ? (y/Math.pow(10,yGrid.readMag)).toFixed(yGrid.cutNumberCaptionAt) : (y/Math.pow(10,yGrid.readMag));
        if( isMain )
          this.drawer.text( { cssClass: this._getCssClass({axisName: "2ndYaxis", axisCssClass: this.yAxis2.cssClass})+" "+this.defaultLabelClass
                            , text : numberText+unit
                            , x: this.xAxis.maxValue+8/Math.abs(this.yAxis2.transScale.scale.x)
                            , y: y-5/Math.abs(this.yAxis2.transScale.scale.y) } );
      }

      var extraCaptionsX = this.xAxis.maxValue+16/Math.abs(this.yAxis2.transScale.scale.x);
      // Magnitude
      if( yGrid.readMag > 0 )
        this.drawer.text( { text : "'"+this._formatNumber1000S(Math.pow(10,yGrid.readMag),this.yAxis2.scale), cssClass: this.defaultLabelClass,
                            x: extraCaptionsX, y: y-yGrid.width*0.8 } );

      // Y2 axis it self plus axis caption at the bottom
      if(this.showAxesCaptions!=false) {
        var mainAxisCaptionY2Pos = this.yAxis2.minValue - ( (this.yAxis2.minValue<0) ? -(15/this.yAxis2.transScale.scale.y)
                                                                                     : (this.plotArea.margin.bottom-8)/Math.abs(this.yAxis2.transScale.scale.y) );
        var caption = this.yAxis2.caption + (this.yAxis2.unit!="" ? " ["+this.yAxis2.unit+"]" : "");
        this.drawer.text( { text: caption
          , x: this.xAxis.maxValue + (this.plotArea.margin.right-4)/Math.abs(this.yAxis1.transScale.scale.x)
          , y: mainAxisCaptionY2Pos
          , align: "end"
          ,cssClass: this.id+"2ndYAxisCaption "+this.defaultLabelClass
        });
      }
    }

    // Caption of third dimension for scattered chart
    if( this.hasScatteredChart && this.showAxesCaptions!=false  ) {
      this.drawer.setTransScale( this.yAxis1.transScale );
      var caption = "Size: "+this.yAxis2.caption + (this.yAxis2.unit!="" ? " ["+this.yAxis2.unit+"]" : "");
      this.drawer.text( { text: caption, x: (this.xAxis.maxValue), y: mainAxisCaptionYPos, align: "end", cssClass: this.defaultLabelClass });
    }

    //-----------------
    // Draw x grid
    if( this.xAxis.layoutFlow!="suppress" )
    {
      this.drawer.setTransScale( this.yAxis1.transScale );
      var xGrid = null;
      var shift = 0;
      if( this.hasMarimekkoChart )
        xGrid = { width: 20, minValue: 0, maxValue: 101, cutNumberCaptionAt: false, readMag: 0 };
      else if( this.xAxis.categoriesGiven ) {
        xGrid = { width: 1, minValue: 0, maxValue: this.xAxis.categories.length};
        shift = xGrid.width/2;
      } else
        xGrid = this._autoGrid( {axisLength:(this.xAxis.maxValue-this.xAxis.minValue), minValue:this.xAxis.minValue, maxValue:this.xAxis.maxValue, scale:this.xAxis.scale} );
      var y = Math.max(0,this.yAxis1.minValue)-15/Math.abs(this.yAxis1.transScale.scale.y);
      var xGridYStart = this.yAxis1.minValue-5/Math.abs(this.yAxis1.transScale.scale.y);
      var xGridYEnd   = this.xAxis.showGrid ? this.plotArea.height/Math.abs(this.yAxis1.transScale.scale.y)+this.yAxis1.minValue
                                              : this.yAxis1.minValue+5/Math.abs(this.yAxis1.transScale.scale.y);

      // Values and vertical grid lines
      var everyNthCaption = 1;
      if(this.xAxis.categoriesGiven)
        everyNthCaption = Math.ceil(25 * this.xAxis.categories.length / this.plotArea.width);
      var nth = 0;
      for( var x=xGrid.minValue;  x<xGrid.maxValue; x+=xGrid.width ) {
        if( !this.xAxis.categoriesGiven && x==0 && this.yAxis1.minValue <= 0 ) // no caption on  x-y charts where the axes intersect (too busy)
          continue;
        if( !this.xAxis.categoriesGiven )
          this.drawer.line( { points : [ [x,xGridYStart], [x,xGridYEnd] ], rgb : this.gridColor, shapeRendering: "crispEdges"  } );
        var caption = "";
        if( this.xAxis.categoriesGiven && ! this.hasMarimekkoChart )
          caption = this.xAxis.categories[x/xGrid.width];
        else {
          var numberText = xGrid.cutNumberCaptionAt ? (x/Math.pow(10,xGrid.readMag)).toFixed(xGrid.cutNumberCaptionAt) : (x/Math.pow(10,xGrid.readMag));
          caption = this._formatNumber1000S(numberText,this.xAxis.scale);
          if(this.hasMarimekkoChart)
            caption += "%";
          else
            caption += this.xAxis.unit;
        }

        if (this.maxXCaptionChars != -1 && caption.length > this.maxXCaptionChars) {
          caption = caption.substring(0, this.maxXCaptionChars) + ".";
        }

        if(nth % everyNthCaption == 0 ) {
          this.drawer.text( { text : caption,
                            align: "middle",
                            cssClass:this._getCssClass({suff: caption, axisName: "XAxis", axisCssClass: this.xAxis.cssClass})+"  "+this.defaultLabelClass,
                            x: x+shift,
                            y: y,
                            layoutFlow: this.xAxis.layoutFlow } );
        }
        nth++;
      }

      // X axis caption at the bottom
      if(this.showAxesCaptions == true) {
        var caption = this.xAxis.caption + (this.xAxis.unit!="" ? " ["+this.yAxis.unit+"]" : "");
        this.drawer.text( { align: "middle", text: caption, x: this.xAxis.minValue+this.plotArea.width/2/Math.abs(this.yAxis1.transScale.scale.x), y: mainAxisCaptionYPos,
                            cssClass: this.id+"XAxisCaption "+this.defaultLabelClass });
      }
    }
  }


  /**
   * returns concatenated css class name(s) of current element
   * like: chartXAxis trendDivTypeChartXAxis26
   * @param args {Object}
   * @param args.suff         - suffix of cssClassName
   * @param args.axisName     - X or Y axis
   * @param args.axisCssClass - default cssClass of the axis
   * @private
   */
  _getCssClass(args)
  {
    var cssClass = "chart" + args.axisName;
    if( args.axisCssClass != null && args.axisCssClass != '') cssClass += " " + args.axisCssClass;
    cssClass += " chart" + args.axisName + (args.suff ? "_"+args.suff : "");
    return cssClass;
  }

  /**
   * @member bcdui.component.Chart
   * @private
   */
  _drawGridMainAxes()
  {
    if( !this.showAxes )
      return;

    var y = this.yAxis1.minValue>0 ? this.yAxis1.minValue : 0;

    // Draw the 2 or 3 main axes
    this.drawer.setTransScale( this.yAxis1.transScale );
    var x1 = this.xAxis.minValue-5/Math.abs(this.yAxis1.transScale.scale.x);
    var x2 = this.xAxis.maxValue;
    this.drawer.line( { addAttr: { axisX12: "x" }, rgb: this.gridColor, shapeRendering: "crispEdges",
                        points : [ [x1,y], [x2,y] ] } );
    this.drawer.setTransScale( this.yAxis1.transScale );
    if( ! this.xAxis.categoriesGiven ) { // Show y12 vertical axis lines only for XY charts to indiacte x=0
      this.drawer.line({
        addAttr: {axisX12: "1"}, rgb: this.gridColor, shapeRendering: "crispEdges",
        points: [[Math.max(0, this.xAxis.minValue), this.yAxis1.minValue], [Math.max(0, this.xAxis.minValue), this.yAxis1.maxValue]]
      });
      if (this.has2ndYAxis && !this.hasScatteredChart) {
        this.drawer.setTransScale(this.yAxis2.transScale);
        this.drawer.line({
          addAttr: {axisX12: "2"}, rgb: this.gridColor, shapeRendering: "crispEdges",
          points: [[this.xAxis.maxValue, this.yAxis2.minValue], [this.xAxis.maxValue, this.yAxis2.maxValue]]
        });
      }
    }
  }

  /**
   * Draw a line or area for a data series
   * @param series
   * @private
   */
  _drawLineSeries( series )
  {
    var isArea = series.chartType==this.AREACHART;
    var points = new Array();

    var stackedInfo = this.stackedInfo[series.chartType*2+(series.yAxis1Or2-1)];

    //-----------------------
    // Line part of line / area, the (sensitive) points are being done below
    if( series.chartType==this.AREACHART || series.chartType==this.LINECHART )
    {
      if( isArea )
        points.push( [ series.xValues[0], Math.max(0,series.yAxis.minValue) ] );

      for( var i=0; i < series.xValues.length; i++ ) {
        if( !isFinite(series.xValues[i]) || !isFinite(series.yData[i]) )
          continue;
        var yData = series.yData[i];
        var asPercentScaling = 1;
        if( stackedInfo!=null ) {
          yData = stackedInfo.sumSoFar[i];
          if( stackedInfo.asPercent && stackedInfo.sum[i]!=0 )
            asPercentScaling = series.yAxis.maxValue/stackedInfo.sum[i];
        }

        points.push( [ series.xValues[i], yData*asPercentScaling ] );
      }

      // Close area between line and xAxis in case of area series
      if( isArea )
        points.push( [ series.xValues[series.xValues.length-1], Math.max(0,series.yAxis.minValue) ] );

      // Draw line part of series
      if( !series.colors )
        this.drawer.line( { points : points, isFilled : isArea, rgb: series.rgb, dashstyle: series.dashstyle,
                          onClick: series.onClick, effect: isArea ? this.effect : null,
                          addAttr: { series: series.caption },
                          width: series.width ? series.width : "1px" } );
      else { // Need to be individual shapes to allow different colors
        for( var i=1; i < series.xValues.length; i++ ) {
          var p = new Array();
          p.push ( points[i-1] );
          p.push ( points[i] );
          this.drawer.line( { points : p, isFilled : isArea, rgb: series.colors[i], dashstyle: series.dashstyle,
            onClick: series.onClick, effect: isArea ? this.effect : null,
            addAttr: { series: series.caption },
            width: series.width ? series.width : "1px" } );
        }
      }
    }

    //-----------------------
    // We do this now so that the points are above the line and area more mouse sensitive
    if( !series.showPoints )
      return;

    var newWidth = isFinite(series.width) && series.width > 5 ? series.width : 5;
    var markerSizeX = newWidth/this.xAxis.scale;
    var markerSizeY = newWidth/series.yAxis.transScale.scale.y;
    for( var i=0; i < series.xValues.length; i++ )
    {
      if( !isFinite(series.xValues[i]) || !isFinite(series.yData[i]) )
        continue;

      var yData = series.yData[i];
      var asPercentScaling = 1;
      if( stackedInfo!=null ) {
        yData = stackedInfo.sumSoFar[i];
        stackedInfo.sumSoFar[i] -= series.yData[i];
        if( stackedInfo.asPercent && stackedInfo.sum[i]!=0 )
          asPercentScaling = series.yAxis.maxValue/stackedInfo.sum[i];
      }

      // In combination with non-stacked bar charts, points can be aligned with the individual bars of a series in a group
      var x = series.xValues[i];
      if( series.alignWithBarSeries ) {
        var barSeries = this.seriesArray.find(function(e){return e.id==series.alignWithBarSeries});
        var barGroupLeft = (this.xAxis.scale-this.barWidth*this.numberOfBars)/2;
        if( barSeries ) {
          x = i+((barSeries.barChartIndex*this.barWidth)+this.barWidth/2+barGroupLeft)/this.xAxis.scale;
          markerSizeX = (series.width<=1 ? series.width*this.barWidth / this.xAxis.scale : markerSizeX);
        }
      }

      var color = series.colors ? series.colors[i] : series.rgb;
      this.drawer.box(  { width:   markerSizeX,
                          height:  markerSizeY,
                          x:       x - markerSizeX/2,
                          y:       yData*asPercentScaling - markerSizeY/2,
                          rgb:     color, stroke: series.chartType==this.AREACHART ? "#000" : "",
                          onClick: series.onClick,
                          addAttr: { series: series.caption, valueX: series.xCategories[i],
                                     valueY: this._formatNumber1000S(series.yData[i],series.yAxis.scale), yAxis1Or2: series.yAxis1Or2,
                                     asPercent: (!series.disableSeriesPercent && stackedInfo!=null ? (series.yData[i]/stackedInfo.sum[i]) : "") } } );
    }
  }

  /**
   * Draw a bar series (including marimekko)
   * @param series
   * @private
   */
  _drawBarSeries( series )
  {
    var points = "";
    var barGroupLeft = (this.xAxis.scale-this.barWidth*this.numberOfBars)/2;
    var stackedInfo = this.stackedInfo[series.chartType*2+(series.yAxis1Or2-1)];

    for( var i=0; i < this.xAxis.xValues.length; i++ )
    {
      if( !isFinite(series.yData[i]) )
        continue;

      var asPercentScaling = 1;
      var yData = series.yData[i];
      var height = yData;
      if( stackedInfo!=null ) {
        yData = stackedInfo.sumSoFar[i];
        stackedInfo.sumSoFar[i] -= series.yData[i];
        if( stackedInfo.asPercent && stackedInfo.sum[i]!=0 )
          asPercentScaling = series.yAxis.maxValue/stackedInfo.sum[i];
        height = yData-stackedInfo.sumSoFar[i];
      }

      // Marimekko charts are identical to stacked bar charts, but the width of each stack
      // depends on the x-axis value
      var valueXCaption = series.xCategories[i];
      var stackWidth = this.barWidth/this.xAxis.scale;
      var stackX     = i+((series.barChartIndex*this.barWidth)+barGroupLeft)/this.xAxis.scale;
      if( series.chartType==this.MARIMEKKOCHART ) {
        stackWidth = (this.xAxis.xValues[i]/this.xAxis.sum)*this.plotArea.width/this.xAxis.scale;
        var xSumSoFar = 0;
        for( var s=0; s<i; s++ )
          xSumSoFar += this.xAxis.xValues[s];
        stackX = this.xAxis.sum==0 ? 0 : (xSumSoFar/this.xAxis.sum)*this.plotArea.width/this.xAxis.scale;
        valueXCaption += "&nbsp;&nbsp;"+Math.round(this.xAxis.xValues[i]*100/this.xAxis.sum)+"%";
      }

      var color = series.colors ? series.colors[i] : series.rgb;
      this.drawer.box(  { width:   stackWidth,
                          height:  Math.abs(height)*asPercentScaling-Math.max(0,series.yAxis.minValue),
                          x:       stackX,
                          y:       Math.max(0,yData)*asPercentScaling,
                          rgb:     color, effect: this.effect,
                          onClick: series.onClick,
                          addAttr: { series: series.caption, valueX: valueXCaption,
                                     valueY: this._formatNumber1000S(series.yData[i],series.yAxis.scale), yAxis1Or2: series.yAxis1Or2,
                                     asPercent: (!series.disableSeriesPercent && stackedInfo!=null ? (series.yData[i]/stackedInfo.sum[i]) : "") } } );
    }
  }

  /**
   * Draw a pie chart
   * @param series
   * @private
   */
  _drawPie( series )
  {
    var angle  = 0;
    var radius = this.plotArea.width < this.plotArea.height ? (this.plotArea.width)/2-this.plotArea.margin.left : (this.plotArea.height)/2-this.plotArea.margin.bottom;
    for( var i=0; i < this.xAxis.xValues.length; i++ )
    {
      if( !isFinite(series.yData[i]) )
        continue;

      var angleDelta = 0;
      if(series.yAxis1Sum!=0)
        angleDelta = series.yData[i]/series.yAxis1Sum*2*Math.PI;
      this.drawer.arc( { x: 0, y: 0, radius: radius,
                         start: angle, end: angle+angleDelta,
                         rgb: this.colorProvider.getColorAsRGB(i), effect: this.effect,
                         onClick: series.onClick,
                         addAttr: { series: series.caption, valueX: this.xAxis.categories[i],
                                    valueY: this._formatNumber1000S(series.yData[i],series.yAxis.scale), yAxis1Or2: series.yAxis1Or2,
                                    asPercent: !series.disableSeriesPercent ? series.yData[i]/series.yAxis1Sum : "" }
                      } );

      // Labels
      if( this.xAxis.layoutFlow!="suppress" && angleDelta>0.05 ) {
        this.drawer.line( { points: [ [Math.sin(Math.PI-(angle+angleDelta/2))*radius,      -Math.cos(Math.PI-(angle+angleDelta/2))*radius],
                                      [Math.sin(Math.PI-(angle+angleDelta/2))*(radius+10), -Math.cos(Math.PI-(angle+angleDelta/2))*(radius+10)] ],
                            rgb: this.gridColor } );
        this.drawer.text( { text : this.xAxis.categories[i], align: "middle", cssClass: this.defaultLabelClass,
                            x: Math.sin(Math.PI-(angle+angleDelta/2))*(radius+18),
                            y: -Math.cos(Math.PI-(angle+angleDelta/2))*(radius+18)-5 } );
      }
      angle += angleDelta;
    }
  }

  /**
   * Draw a gauge chart
   * @param series
   * @private
   */
  _drawGauge( series )
  {
    var angle  = -Math.PI/2;
    var range = this.xAxis.maxValue-this.xAxis.minValue;
    var radius = this.plotArea.width < this.plotArea.height ? (this.plotArea.width)-this.plotArea.margin.left : (this.plotArea.height)-this.plotArea.margin.bottom;
    var lastValid = this.xAxis.minValue;
    for( var i=0; i < this.xAxis.xValues.length; i++ )
    {
      if( !isFinite(series.xValues[i]) )
        continue;

      var angleDelta;
      if( i>0 ) {
        angleDelta = (series.xValues[i]-lastValid)/range*Math.PI;
        this.drawer.arc( { x: 0, y: 0, radius: radius, percWidth: 0.5,
                           start: angle, end: angle+angleDelta,
                           rgb: this.colorProvider.getColorAsRGB(i-1), effect: this.effect,
                           stroke: this.colorProvider.getColorAsRGB(i-1),
                           onClick: series.onClick,
                           addAttr: { series: series.caption, valueX: lastValid+"-"+this.xAxis.xValues[i] }
                         } );
      } else
        angleDelta = 0;

      // Labels
      if( this.xAxis.layoutFlow!="suppress" ) {
        this.drawer.line( { points: [ [Math.sin(Math.PI-(angle+angleDelta))*radius,     -Math.cos(Math.PI-(angle+angleDelta))*radius],
                                      [Math.sin(Math.PI-(angle+angleDelta))*(radius+5), -Math.cos(Math.PI-(angle+angleDelta))*(radius+5)] ],
                            rgb: this.gridColor } );
        if( i==0 || angleDelta>0.1 )
          this.drawer.text( { text : this.xAxis.categories[i]+" "+this.xAxis.unit, align: "middle", cssClass: this.defaultLabelClass,
            x: Math.sin(Math.PI-(angle+angleDelta))*(radius+20),
            y: -Math.cos(Math.PI-(angle+angleDelta))*(radius+10) } );
      }
      lastValid = series.xValues[i];
      angle += angleDelta;
    }
    // Pointer
    for( var i=0; i < series.yData.length; i++ ) {
      var angle = (series.yData[i]-this.xAxis.minValue)/range*Math.PI-Math.PI/2;
      this.drawer.line( { points: [ [-2, 0], [Math.sin(Math.PI-angle)*(radius-15), -Math.cos(Math.PI-angle)*(radius-15)], [2, 0] ],
                          rgb: this.gridColor,
                          linecap: "round", isFilled: true,
                          addAttr: { valueX: series.yData[i], series: series.caption }
                        } );
    }
    this.drawer.circle( { x:0, y:0, radius: 2, rgb: this.gridColor } );
  }

  /**
   * Draw a scattered chart
   * @param series
   * @private
   */
  _drawScatteredSeries( y, size )
  {
    var radiusFactor = size.yAxis.transScale.scale.y / y.yAxis.transScale.scale.y; // drawer uses yAxis1.scale, but for size we need yAxis2.scale
    for( var i=0; i < y.xValues.length; i++ ) {
      if( !isFinite(y.xValues[i]) || !isFinite(y.yData[i]) || !isFinite(size.yData[i]) )
        continue;

      this.drawer.circle( { x:       y.xValues[i],
                            y:       y.yData[i],
                            radius:  size.yData[i]*radiusFactor,
                            rgb:     this.colorProvider.getColorAsRGB(i), effect: this.effect,
                            onClick: y.onClick,
                            addAttr: { series: y.caption, valueX: y.xCategories[i],
                                       valueY: this._formatNumber1000S(y.yData[i]), yAxis1Or2: y.yAxis1Or2,
                                       valueSize: this._formatNumber1000S(size.yData[i]) } } );

    }
  }

  /**
   * Convert an XML doc to a js array
   * @param {Object} args
   * @param args.data - data doc or array of values
   * @param args.dataInfo - doc or array of values
   * @param args.doParseValues - if true, treat values as float
   * @private
   */
  _nodeSetOrArray2Array( args )
  {
    var doParse = typeof args.doParseValues == "undefined" ? true : ("" + args.doParseValues) == "true";

    var isXML = (typeof args.data.push == "undefined");
    if( !isXML && args.dataInfo && args.dataInfo.push )
      return {dataAsArray: args.data, dataInfoAsArray: args.dataInfo} ;
    var dataAsArray = (isXML ? new Array() : args.data);
    var dataInfoAsArray = new Array();
    var otherCaption = null, emptyDimMemberCaption = null;
    if( isXML ) {
      otherCaption = bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_OtherDimmember"}) || "[n/a]";
      emptyDimMemberCaption = bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_EmptyDimmember"}) || "[n/a]";
    }
    for( var i=0; i<args.data.length; i++ ) {
      var dataInfo = "";
      if( isXML ) {
        var v = args.data.item(i).parentNode;
        if( v && v.getAttribute("valueAddInfo") != null )
          dataInfo = v.getAttribute("valueAddInfo");
        if( args.data.item(i).nodeType == 1 ) {
          if("1" == args.data.item(i).getAttribute("bcdOt") )
            dataAsArray.push(otherCaption);
          else if((args.data.item(i).firstChild == null || args.data.item(i).firstChild.nodeValue == null) && "0" == args.data.item(i).getAttribute("bcdGr") )
            dataAsArray.push(emptyDimMemberCaption);
          else if (args.data.item(i).firstChild == null) {
            dataAsArray.push("[n/a]");
          } else {
            dataAsArray.push(doParse && isFinite(args.data.item(i).firstChild.nodeValue) ? parseFloat(args.data.item(i).firstChild.nodeValue) : args.data.item(i).firstChild.nodeValue);
          }
        } else
          dataAsArray.push(doParse && isFinite(args.data.item(i).nodeValue) ? parseFloat(args.data.item(i).nodeValue) : args.data.item(i).nodeValue);
      }
      dataInfoAsArray.push( dataInfo );
    }
    return {dataAsArray: dataAsArray, dataInfoAsArray: dataInfoAsArray} ;
  }

  
  /**
   * Draw the chart's tooltip as a static function to be used as a call back by the drawer
   * @param target - the root element of the svg chart
   * @param src - the element originally firing the event, for example a box
   * @private
   */
  _createToolTipCb(target,src)
  {
    if( ! src.getAttribute("series") && ! src.getAttribute("axisX12") )
      return null;

    var yAxis1Or2 = src.getAttribute("yAxis1Or2");

    var toolTip = "<table class='bcdTooltip'>";

    // render axis tooltip
    if( src.getAttribute("axisX12") != null) {
      toolTip += "<tbody>";
      if("x" == src.getAttribute("axisX12"))
        toolTip += "<tr><th>X-axis:</th><td>" + target.getAttribute("xAxis") + (target.getAttribute("xAxisUnit") != "" ? " [" + target.getAttribute("xAxisUnit") + "]" : "") + "</td></tr>";
      else if( "1" == src.getAttribute("axisX12"))
        toolTip += "<tr><th>Y-axis:</th><td>" + target.getAttribute("yAxis1") + (target.getAttribute("yAxis1Unit") != "" ? " [" + target.getAttribute("yAxis1Unit") + "]" : "") + "</td></tr>";
      else if( "2" == src.getAttribute("axisX12"))
        toolTip += "<tr><th>Y-axis right:</th><td>" + target.getAttribute("yAxis2") + (target.getAttribute("yAxis2Unit")!="" ? " [" + target.getAttribute("yAxis2Unit") + "]" : "") + "</td></tr>";
      toolTip += "</tbody>";
    }
    // render series tooltip
    else if (yAxis1Or2 == null && src.getAttribute("valueSize") == null && src.getAttribute("valueX") == null) {
      toolTip += "<tbody>";
      toolTip += "<tr><th>Series:</th><td>" + src.getAttribute("series") + "</td></tr>";
      toolTip += "</tbody>";
    }
    // render series value tooltip
    else {
      toolTip += "<thead><tr><th colspan='2'>Series: " + src.getAttribute("series")+"</th></tr></thead>";
      toolTip += "<tbody>";
      if( yAxis1Or2!=null ) {
        toolTip += "<tr><th>" + target.getAttribute("yAxis" + yAxis1Or2) + ":</th><td>" + src.getAttribute("valueY") + target.getAttribute("yAxis" + yAxis1Or2 + "Unit");
        if( src.getAttribute("asPercent") != null && src.getAttribute("asPercent") != "" )
          toolTip += "&nbsp;&nbsp;&nbsp;" + Math.round(src.getAttribute("asPercent") * 1000) / 10 + "%";
        toolTip += "</td></tr>";
      }
      if( src.getAttribute("valueSize")!= null )
        toolTip += "<tr><th>" + target.getAttribute("yAxis2") + ":</th><td>" + src.getAttribute("valueSize") + target.getAttribute("yAxis2Unit") + "</td></tr><tr>";
      if( src.getAttribute("valueX")!= null )
        toolTip += "<tr><th>" + target.getAttribute("xAxis") + ":</th><td>" + src.getAttribute("valueX") + target.getAttribute("xAxisUnit") + "</td></tr><tr>";
      toolTip += "</tbody>";
      toolTip += "</table>";
    }
    return toolTip;
  }

  /**
   * Debugging function showing a text for this class.
   * @return {string} A summary of the class.
   */
  toString()
  {
    return "[bcdui.component.Chart: " + this.id + "]";
  }

  /**
   * impl of execute method
   * @private
   */
  _executeImpl()
  {
    this.setStatus(this.loadingStatus);
  }
  /**
   * Not implemented for Chart
   * @return null
   */
  getData()
  {
    return null;
  }

  /**
   * @inheritdoc
   */
  getReadyStatus()
  {
    return this.transformedStatus;
  }

  /**
   * @param statusEvent {StatusEvent}
   * @private
   */
 _statusTransitionHandler(statusEvent)
 {
    if (statusEvent.getStatus().equals(this.loadingStatus)) {
      this._initValues();
      var doDraw = this._calc();
      if( doDraw )
        this._draw( this.targetHtmlElement );
      else{
        var msg = bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_EmptyChart"}) || "[No Data]";
        this.targetHtmlElement.innerHTML = "<div class='bcdEmptyChart'><span>"+msg+"</span></div>";

      }
      var newStatus = this._uncommitedWrites ? this.waitingForUncomittedChanges : this.getReadyStatus();
      this.setStatus(newStatus);
    }
  }

  /**
   * Not implemented for Chart
   * @return null
   */
  getPrimaryModel(){
    return null;
  }

  /*
   These are inherited from DataProvider but do not apply to Renderer and its children
   Cleanest would be a mixin instead for optionally XML providing DataProviders only
   */
  /** @private */
  read()
  {}
  /** @private */
  query()
  {}
  /** @private */
  queryNodes()
  {}
  /** @private */
  remove()
  {}
  /** @private */
  write()
  {}

}; // Create class: bcdui.component.Chart


