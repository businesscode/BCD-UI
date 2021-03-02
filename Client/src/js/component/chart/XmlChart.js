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
 * Extends the JS implementation of the Chart class allowing an XML definition model as input
 *
 */
bcdui.util.namespace("bcdui.component.chart",{});  // Making sure our namespace exists

/*
 * ========================================================
 * XmlChart
 */
bcdui.component.chart.XmlChart = class extends bcdui.component.chart.Chart
/**
 * @lends bcdui.component.chart.XmlChart.prototype
 */
{
  /**
   * @classdesc
   * Implements XML-definition interface. Extends the JS implementation of the
   * Chart class allowing an XML definition model as input.
   * 
   * @constructs
   * @description
   * Constructor of bcdui.component.XmlChart, called by prototype.
   * @extends bcdui.component.chart.Chart
   * @param {Object} args Parameter object
   * @param {targetHtmlRef}           args.targetHtml                       - Where to place the chart
   * @param {bcdui.core.DataProvider} args.config                           - Definition if the chat according to Model with the chart definition according to XSD http://www.businesscode.de/schema/bcdui/charts-1.0.0
   * @param {boolean}                 [args.suppressInitialRendering=false] - If true, the renderer does not initially auto execute but waits for an explicit execute
   * @param {string}                  [args.id]                             - Page unique id for used in declarative contexts. If provided, the chart will register itself
   * @param {boolean}                 [args.showAxes=true]                  - If false, no axes will be shown
   * @param {string}                  [args.title]                          - Title
   * @param {boolean}                 [args.suppressInitialRendering=false] - As every renderer, charts will execute and output itself automatically and their parameters after creation. This can be suppressed here.
   * @param {number}                  [args.width]                          - Overwrite the chart's auto-width derived from targetHtml
   * @param {number}                  [args.height]                         - Overwrite the chart's auto-height derived from targetHtml
   */
  constructor(args)
  { 
    super(args);
    this.type = this._getClassName();
    this.chartDefModel = args.config || args.metaDataModel;
  }

  /**
   * @private
   */
  _getAttributeOrDefault(element, attributeName, defaultValue) {
    if (element == null) return defaultValue;
    var value = element.getAttribute(attributeName);
    if (value == null) return defaultValue;
    if (typeof(defaultValue) == "number") return parseFloat(value);
    return value;
  }

  /**
   * Interpret the xml definition document and initialize all values
   * @private
   */
  _initValues()
  {
    bcdui.component.chart.Chart.prototype._initValues.call(this);

    this.defDoc = this.chartDefModel.getData();
    var titleNode = this.defDoc.selectSingleNode("/chart:Chart/@title");
    if( titleNode!=null )
      this.title = titleNode.nodeValue;
    var effectNode = this.defDoc.selectSingleNode("/chart:Chart/@effect");
    if( effectNode!=null )
      this.effect = effectNode.nodeValue;

    // User overwritten defaults
    var showAxesNode = this.defDoc.selectSingleNode("/chart:Chart/@showAxes");
    if( showAxesNode!=null )
      this.showAxes = showAxesNode.nodeValue=="true" ? true : false;
    var showAxesCaptionsNode = this.defDoc.selectSingleNode("/chart:Chart/@showAxesCaptions");
    this.showAxesCaptions = (showAxesCaptionsNode && showAxesCaptionsNode.nodeValue=="false") ? false : true;

    // TODO: implement validation the definition document vs. XSD before draw chart
    var xAxisNodes = this.defDoc.selectNodes("/*/chart:XAxis/*");
    if( xAxisNodes == null ||xAxisNodes.length == 0){// doesn't draw without xAxis
      this.chartsDrawn = false;
      var tn = bcdui.core.createElementWithPrototype( this.defDoc, "/*/chart:Computed/chart:ChartsDrawn");
      tn.text = ""+this.chartsDrawn;
      return false;
    }

    var plotAreaElement = this.defDoc.selectSingleNode("/*/chart:PlotArea");
    this.plotArea.margin = {
        left:   this._getAttributeOrDefault(plotAreaElement, "marginLeft",   40),
        right:  this._getAttributeOrDefault(plotAreaElement, "marginRight",  10),
        bottom: this._getAttributeOrDefault(plotAreaElement, "marginBottom", 20),
        top:    this._getAttributeOrDefault(plotAreaElement, "marginTop",    10) };

    this._setDefDoc( this.defDoc);
    //--------------------
    // x-axis definition
    var xAxisElem = this.defDoc.selectSingleNode("/*/chart:XAxis");
    var xAxisAttr = new Array();
    this._attrToArray(xAxisAttr, xAxisElem);
    this._dataToArray(xAxisAttr, xAxisElem.selectSingleNode("chart:Categories"));
    this._dataToArray(xAxisAttr, xAxisElem.selectSingleNode("chart:XValues"));
    this.setXAxis(xAxisAttr);
    if( xAxisElem.selectSingleNode("*").getAttribute("sourceDocJS") != null)
    {
      this._cleanXAxisValues();
      this._appendXAxisValues();
    }

    //--------------------
    // y-axis1 definition
    var yAxis1Elem = this.defDoc.selectSingleNode("/*/chart:YAxis1");
    var yAxis1Attr = new Array();
    this._attrToArray(yAxis1Attr, yAxis1Elem);
    this.setYAxis1(yAxis1Attr);

    //--------------------
    // y-axis2 definition
    var yAxis2Elem = this.defDoc.selectSingleNode("/*/chart:YAxis2");
    var yAxis2Attr = new Array();
    this._attrToArray(yAxis2Attr, yAxis2Elem);
    if(yAxis2Attr) this.setYAxis2(yAxis2Attr);

    //--------------------
    // Add series
    var seriesElems = this.defDoc.selectNodes("/*/chart:Series/chart:Series");
    for( var s=0; s<seriesElems.length; s++ ) {
      var sElem = seriesElems.item(s);
      var sAttr = new Array();
      this._attrToArray(sAttr, sElem);
      this._dataToArray(sAttr, sElem.selectSingleNode("chart:XValues"));
      this._dataToArray(sAttr, sElem.selectSingleNode("chart:YData"));
      this._dataToArray(sAttr, sElem.selectSingleNode("chart:Colors"));
      this.addSeries( sAttr );
      if( sElem.selectSingleNode("chart:YData").getAttribute("sourceDocJS") != null )// the data were loaded from another source model
      {
        sAttr.seriesInd = s+1;
        this._cleanSeriesYDataValues({seriesInd: s+1});
        this._appendSeriesYDataValues(sAttr);
      }
    }

    //--------------------
    // Stacked
    var stackedElem = this.defDoc.selectSingleNode("/*/chart:Stacked");
    if(stackedElem != null) {
      var stackedAttr = new Array();
      this._attrToArray(stackedAttr, stackedElem);
      this.setStacked(stackedAttr);
    }

    // colors
    var colorProvider = null;
    var colorsNode = this.defDoc.selectSingleNode("/*/chart:SeriesColors");
    if( seriesElems == null || seriesElems.length == 0){}// no series - no colors, let colorProvider be null
    // try to read @rgb from Series, in this case all colors must be defined at Series nodes
    else if( seriesElems != null && seriesElems[0].getAttribute("rgb") != null && seriesElems[0].getAttribute("rgb").length > 0){
      var cols = new Array();
      for(var c=0; c<seriesElems.length; c++) {
        cols.push( seriesElems.item(c).getAttribute("rgb"));
      }
      colorProvider = new bcdui.component.chart.SeriesColorProvider(cols);
    }
    else if( colorsNode == null){// we take default base colors
      if( this.seriesArray[0].chartType==this.GAUGECHART
          || this.seriesArray[0].chartType==this.PIECHART
          || this.seriesArray[0].chartType==this.SCATTEREDCHART ) {
        var values = this.xAxis.categoriesGiven ?  this.xAxis.categories : this.xAxis.xValues;
        colorProvider = new bcdui.component.chart.TypeColorProviderBaseColors({count: values.length, baseColors: this.seriesArray[0].baseColors});
      } else
        colorProvider = new bcdui.component.chart.TypeColorProviderBaseColors({count: this.seriesArray.length, baseColors: null});
    }
    else
    {
      var colors = colorsNode.selectNodes("chart:Color");
      var provType = colorsNode.selectSingleNode("chart:ProviderType");
      var extDoc = colorsNode.selectSingleNode("chart:ExternalDoc");
      var isBaseColors = colorsNode.selectSingleNode("chart:AutoBaseColors");
      if ( isBaseColors != null){
        var colStr = "";
        for(var c=0; c<colors.length; c++) {
          if( c > 0) colStr += " ";
          colStr += colors[c].text;
        }
        colorProvider = new bcdui.component.chart.TypeColorProviderBaseColors(this.seriesArray.length, (colStr != "" ? colStr : null) );
      }
      else if( colors != null && colors.length > 0){ // this is the most common case, colors directly defined with values
        var colArray = new Array();
        for(var c=0; c<colors.length; c++) {
          colArray.push(colors[c].text);
        }
        colorProvider = new bcdui.component.chart.TypeColorProviderFixedList(colArray);
      }
      else if( provType != null && provType.text != '' ){
        eval(" colorProvider = new " + provType.text + "();");
      }
      else if ( extDoc != null){
        var res = new Array();
        this._dataToArray(res, extDoc);
        colors = res["ExternalDoc"];
        var colArray = new Array();
        for(var c=0; c<colors.length; c++) {
          colArray.push(colors[c].text);
        }
        colorProvider = new bcdui.component.chart.TypeColorProviderFixedList(colArray);
      }
    }

    this.colorProvider = colorProvider;

    // needed for legend, in case of auto colors or if @rgb doesn't set at Series node,
    // thus legend read the color from this place.
   if( this.colorProvider){
      this.colorProvider.appendColors( {targetNode:this._cleanColors(), doc:this.defDoc});
   }

    // set RGB colors directly into series objects
    for( var i=0; i< this.seriesArray.length; i++ ) {
      var series = this.seriesArray[i];
      series.rgb = this.colorProvider.getColorAsRGB(i);
    }

    var width  = this.defDoc.selectSingleNode("/*/@width");
    if( width ) this.width = width.text;
    var height = this.defDoc.selectSingleNode("/*/@height");
    if( height ) this.height = height.text;
  }

  /**
   * redisplays the chart with the same values
   * @private
   */
  _draw(overwriteTarget )
  {
    var rVal = bcdui.component.chart.Chart.prototype._draw.call(this, overwriteTarget);
    if ( rVal < 0)// the chart was not drawn
      this.chartsDrawn = false;
    else
      this.chartsDrawn = true;

    // for legend
    var tn = bcdui.core.createElementWithPrototype( this.defDoc, "/*/chart:Computed/chart:ChartsDrawn");
    tn.text = ""+this.chartsDrawn;
  }

  /**
   * Deletes color nodes from defDoc
   * @private
   */
  _cleanColors() {
    var targetNode = this.defDoc.selectSingleNode("/*/chart:Computed/chart:Colors");
    if( targetNode == null) targetNode = bcdui.core.createElementWithPrototype( this.defDoc, "/*/chart:Computed/chart:Colors");
    else bcdui.core.removeXPath(this.defDoc, "/*/chart:Computed/chart:Colors/chart:Color"); // clean model
    return targetNode;
  }

  /**
   * Setter for chart definition document
   * @param doc
   * @private
   */
  _setDefDoc(doc) {
    this.defDoc = doc;
  }

  /**
   * Appends Value nodes into defDoc, if another model contains the data
   * @private
   */
  _appendXAxisValues(){
    if( this.defDoc != null ){
      var targetNode = null;
      var xpath = "/*/chart:XAxis/"
        + ( this.xAxis.categoriesGiven == true ? "chart:Categories" : "chart:XValues");

      targetNode = this.defDoc.selectSingleNode(xpath);
      var values = this.xAxis.categoriesGiven ?  this.xAxis.categories : this.xAxis.xValues;
      for(var val=0; val < values.length; val++) {
        targetNode.appendChild( this.defDoc.createElement("Value")).appendChild(this.defDoc.createTextNode(values[val]));
      }
    }
  }

  /**
   * Cleans XAxis Node, deletes children Value nodes
   * @return count of removed nodes or null
   * @private
   */
  _cleanXAxisValues(){
    if( this.defDoc != null ){
      var xpath = "/*/chart:XAxis/"
        + ( this.xAxis.categoriesGiven == true ? "chart:Categories" : "chart:XValues") + "/chart:Value";

      return ;//bcdui.core.removeXPath(this.defDoc, xpath);
    }
    return null;
  }

  /**
   * Cleans Series YData Node, deletes children Value nodes
   * @param map with
   *  <ul>
   *     <li>seriesInd, index of series to be removed</li>
   *  </ul>
   * @return count of removed nodes or null
   * @private
   */
  _cleanSeriesYDataValues(args){
    if( this.defDoc != null ){
      var xpath = "/*/chart:Series/chart:Series[" + args.seriesInd + "]/chart:YData/chart:Value";
      return; // bcdui.core.removeXPath(this.defDoc, xpath);
    }
    return null;
  }

  /**
   * Cleans Series YData Node, deletes children Value nodes
   * @param map with
   *  <ul>
   *    <li>yData</li>
   *    <li>seriesInd, index of series to be removed</li>
   *  </ul>
   * @return count of removed nodes or null
   * @private
   */
  _appendSeriesYDataValues(args){
    if( this.defDoc != null ){
      var targetNode = null;
      var xpath = "/*/chart:Series/chart:Series[" + args.seriesInd + "]/chart:YData";
      targetNode = this.defDoc.selectSingleNode(xpath);
      for(var val=0; val < args.yData.length; val++) {
        targetNode.appendChild( this.defDoc.createElement("chart:Value")).appendChild(this.defDoc.createTextNode(args.yData.item(val).text));
      }
    }
  }

  /**
   * Converts each attribute name-value pair into a property with the name and value at the result Array
   * @private
   */
  _attrToArray ( result, elem ) {
    if( !elem ) return;
    for( var a=0; a<elem.attributes.length; a++ ) {
      var argName = this._xmlElemNameToArgName(elem.attributes[a].nodeName);
      var arg = elem.attributes[a].nodeValue;
      if( isFinite(arg) )
        result[argName] = parseFloat(arg);
      else if( arg=="true" )
        result[argName] = true;
      else if( arg=="false" )
        result[argName] = false;
      else
        result[argName] = arg;
    }
    return result;
  }

  /**
   * @private
   */
  _dataToArray ( result, elem ) {
    if( !elem ) return;
    var argName = this._xmlElemNameToArgName(elem.nodeName);
    if( elem!=null && elem.getAttribute("sourceDoc")!=null && elem.getAttribute("nodes")!=null )
      result[argName] = this.defDoc.selectNodes(elem.getAttribute("nodes"));
    else if( elem!=null && elem.getAttribute("sourceDocJS")!=null && elem.getAttribute("nodes")!=null ) {
      var doc = bcdui.factory.objectRegistry.getObject(elem.getAttribute("sourceDocJS"));
      result[argName] = doc.selectNodes(elem.getAttribute("nodes"));
    } else if( elem!=null && elem.getAttribute("modelId")!=null && elem.getAttribute("nodes")!=null ) {
      var doc = bcdui.factory.objectRegistry.getObject(elem.getAttribute("modelId"));
      result[argName] = doc.getData().selectNodes(elem.getAttribute("nodes"));
    } else if( elem!=null )
      result[argName] = elem.selectNodes("chart:Value");
    return;
  }

  /**
   * @private
   */
  _xmlElemNameToArgName (name) {
    var withoutPrefix = name.split(":");
    if( withoutPrefix.length==2 )
      withoutPrefix = withoutPrefix[1];
    else
      withoutPrefix = withoutPrefix[0];
    return withoutPrefix.substring(0,1).toLowerCase()+withoutPrefix.substring(1);
  }

  /**
   * @param statusEvent
   * @private
   */
 _statusTransitionHandler(/* StatusEvent */statusEvent) {

    // We need to wait for the metadata model and all models it refers to
    if (statusEvent.getStatus().equals(this.loadingStatus)) {
      
      // Wait until the metaDataModel is available and create the chart for the targetHTMLElement
      bcdui.factory.objectRegistry.withReadyObjects({
        ids: this.chartDefModel,
        fn: function()
        {
          var modelIds = this.chartDefModel.getData().selectNodes("//@modelId");
          var objects = new Array(); // Check, which models we depend on
          for( var i=0; i<modelIds.length; i++ ){
            objects.push(modelIds.item(i).text);
          }
          bcdui.factory.objectRegistry.withReadyObjects({ ids:objects,
            // Everything is there, let's proceed drawing the chart
            fn: function() {
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
            }.bind( this )
          })
        }.bind( this )
      })
    }
  }

  
  /**
   * @return definition DOM document
   */
  getData(){
    return this.defDoc;
  }

  /**
   * @return model that render to
   */
  getPrimaryModel(){
    return this.chartDefModel;
  }

} ; // Create class: bcdui.component.chart.XmlChart
