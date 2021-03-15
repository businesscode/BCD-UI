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
 * The implementation of the Drawer class.
 *
 */

bcdui.util.namespace("bcdui.component.chart",{});  // Making sure our namespace exists

/*
 * =====================================================================
 * SVGVMLDrawer
 */
bcdui.component.chart.SVGVMLDrawer = class
/**
 * @lends bcdui.component.chart.SVGVMLDrawer.prototype
 */
{

  /**
   * @constant
   * @private
   */
  VML= 0;

  /**
   * @constant
   * @private
   */
  SVG= 1;

  /**
   * @classdesc
   * This class represents a base class for SVG and VML Drawers, which have the same interface.
   * @abstract
   *
   * @constructs
   * Constructor of bcdui.component.chart.SVGVMLDrawer, called by prototype. 
   * Instantiate {@link bcdui.component.chart.SVGDrawer} concrete subclass
   * @param {Object} args - parameter Object
   * @param {Object} [args.scale=x:1,y:1] - Default is no scaling \{ x: 1, y: 1\}
   * @param {Object} [args.transform]     - Default is no shifting \{ x: 0, y: 0 \}
   * @private
   */
  constructor(args)
  {
    if( args.scale )
      this.scale = args.scale;
    else
      this.scale = { x: 1, y: 1};
    if( args.transform )
      this.transform = args.transform;
    else
      this.transform = { x: 0, y: 0 };
  }

  /**
   * Set transform and scale
   * @param {Object} args - parameter Object
   * @param {Object} [args.scale=x:1,y:1] - Default is no scaling \{ x: 1, y: 1\}
   * @param {Object} [args.transform]     - Default is no shifting \{ x: 0, y: 0 \}
   */
  setTransScale(args)
  {
    if( args.scale )
      this.scale = args.scale;
    else
      this.scale = { x: 1, y: 1};
    if( args.transform )
      this.transform = args.transform;
    else
      this.transform = { x: 0, y: 0 };
  }

  /**
   * _hideToolTip
   * @private
   */
  _hideToolTip (element, event) {
    jQuery("#bcdChartToolTip").hide();
  }

  /**
   * The function moves the tooltip if it exist
   * @param event
   * @private
   */
  _moveToolTip (element, event) {
    var div = document.getElementById("bcdChartToolTip");
    if (! div)
      return;
    if (jQuery(div).is(":visible"))
      bcdui.widget._flyOverPositioning({event: event, htmlElement: div, positionUnderMouse: false});
  }

  /**
   * The function shows the tooltip if it exist
   * @param {Event} event
   * @private
   */
  _showToolTip (element, event) {
    var root = jQuery(element).closest("svg").get(0);
    var text = (root && root.createToolTipCb != null) ? root.createToolTipCb(root, window.event ? window.event.srcElement : event.target) : null;
    if (text == null) {
      this._hideToolTip(element, event);
      return;
    }
    var div = bcdui.util.getSingletonElement("bcdChartToolTip").get(0);
    div.innerHTML = text;
    bcdui.widget._flyOverPositioning({event: event, htmlElement: div, positionUnderMouse: false});
  }

  /**
   * Calculate the physical x pos from a logical one
   * @param xLogical
   * @private
   */
  _xPx( xLogical ) {
    var val = this.transform.x+xLogical*this.scale.x;
    return !isFinite(val) ? 0+this.transform.x : val;
  }

  /**
   * Calculate the physical y pos from a logical one
   * @param yLogical
   * @private
   */
  _yPx( yLogical ) {
    var val = yLogical*this.scale.y+this.transform.y;
    return !isFinite(val) ? 0+this.transform.y : val;
  }

  /**
   * Sets cursor to 'pointer', is used as listener pointer
   * @private
   */
  _setCursorToPointer() {
    document.body.style.cursor = 'pointer';
  }

  /**
   * Sets cursor to 'default', is used as listener pointer
   * @private
   */
  _setCursorToDefault() {
    document.body.style.cursor = 'default';
  }

  /**
   * wrapped the function because of PDF export in IE with VML
   * @private
   */
  _addEventListener(args) {
    !!(window.SVGSVGElement) ? bcdui._migPjs._$(args.element).on(args.type, args.listener) : args.element.attachEvent(args.type, args.listener);
  }

  /**
   * Returns the a DOM element containing the SVG drawing
   * @returns {Element} Returns the a DOM element containing the VML or SVG drawing
   */
  getResult()
  {
    return this.rootElem;
  }

}; // End SVGVMLDrawer


/*
 * =====================================================================
 * SVGDrawer
 */
bcdui.component.chart.SVGDrawer = class extends bcdui.component.chart.SVGVMLDrawer
/**
 * @lends bcdui.component.chart.SVGDrawer.prototype
 */
{
  /**
   * @class
   * A SVG drawer, drawing basic geometries
   * @extends bcdui.component.chart.SVGVMLDrawer
   * 
   * @constructs
   * @description
   * Constructor of bcdui.component.chart.SVGDrawer
   * @param {Object} args - Parameter object
   * @param {Document} args.doc               - Document for creating the SVG drawing
   * @param {Object}   [args.scale=x:1,y:1]   - Default is no scaling \{ x: 1, y: 1\}
   * @param {Object}   [args.transform]       - Default is no shifting \{ x: 0, y: 0 \}
   * @param {function} [args.createToolTipCb] - Call back getting the source element, returning the tool tip HTML</li>
   * @param {Object}   [args.addAttr]         - A set of additional string attributes to be attached to the root element</li>
   */
  constructor( args )
  {
    super( args );

    this.doc = args.doc;
    this.rootElem = this._createElementNS("svg");
    this.rootElem.setAttribute("xmlns","http://www.w3.org/2000/svg");
    this.rootElem.setAttribute("version","1.1");
    this.rootElem.setAttribute("width",args.width);
    this.rootElem.setAttribute("height",args.height);
    this.styleAttName = !!(window.SVGSVGElement) ? "style" : "css.style"; // "tunnel" css attribute for exporting SVG (for image/PDF) from IE<=8
    if( args.createToolTipCb ) {
      this.rootElem.createToolTipCb = args.createToolTipCb;
    }
    for( var attr in args.addAttr )
      this.rootElem.setAttribute(attr,args.addAttr[attr]);
    this.vectorType = this.SVG;

    // To keep track of reusable effect definitions
    this.knownEffects = new Object();
  }

  /**
   * Draw a SVG line
   * @param map with
   * @param {Object} args - Parameter object
   * @param {numeric[][]} args.points           - 2 dimensional array with x,y points, args.points[0][0] being the first one</li>
   * @param {string}      [args.effect]         - An effect to be used for areas. Possible values: linearGradient, radialPlate, linearRound, linearPlate
   * @param {string}      [args.rgb=black]      - Line color
   * @param {numeric}     [args.width=1]        - Line width
   * @param {boolean}     [args.isFilled=false] - Fill area
   * @param {function}    [args.onClick]        - On click callback
   * @param {Object}      [args.addAttr]        - A set of additional string attributes to be attached to the root element</li>
   */
  line( args )
  {
    if( !args.rgb )
      args.rgb = "rgb(0,0,0)";
    var elem = this._createElementNS("polyline");
    var points = "";
    for( var i=0; i< args.points.length; i++ ) {
      points += this._xPx(args.points[i][0])+", "+this._yPx(args.points[i][1]);
      if(i< args.points.length-1) points += ", ";
    }

    if( args.shapeRendering )
      elem.setAttribute("shape-rendering", args.shapeRendering);
    elem.setAttribute("points",points);
    var style =  ";stroke:" + (args.strokeRgb ? args.strokeRgb : args.rgb);
    style    += args.dashstyle ? ";stroke-dasharray:" +args.dashstyle : "";
    style    += args.width  ? ";stroke-width:" +args.width : "";
    var defId = this._addEffect(args.effect, args.rgb);
    style += args.isFilled ? ";fill:url(#"+defId+") "+args.rgb+";"+(args.opacity?"fill-opacity:"+args.opacity:"") : ";fill:none";
    style    += args.linecap ? ";stroke-linecap:" +args.linecap : "";
    elem.setAttribute(this.styleAttName,style);
    if( args.onClick ) {
      this._addEventListener({element:elem, type:"click", listener:args.onClick});
      this._addEventListener({element:elem, type:"mouseover", listener:this._setCursorToPointer});
      this._addEventListener({element:elem, type:"mouseout", listener:this._setCursorToDefault});
    }
    for( var attr in args.addAttr )
      elem.setAttribute(attr,args.addAttr[attr]);
    this.rootElem.appendChild(elem);
  }

  /**
   * Draw a SVG box
   * @param {Object} args - Parameter object
   * @param {numeric}     args.x                - Left
   * @param {numeric}     args.y                - Top
   * @param {numeric}     args.width            - Width
   * @param {numeric}     args.height           - Height
   * @param {string}      [args.effect]         - An effect to be used for areas. Possible values: linearGradient, radialPlate, linearRound, linearPlate
   * @param {string}      [args.rgb=black]      - Color
   * @param {boolean}     [args.isFilled=false] - Fill area
   * @param {function}    [args.onClick]        - On click callback
   * @param {Object}      [args.addAttr]        - A set of additional string attributes to be attached to the root element</li>
   */
  box( args )
  {
    if( !args.rgb )
      args.rgb = "rgb(0,0,0)";
    var elem = this._createElementNS("rect");
    elem.setAttribute("width" , new Number(this.scale.x*args.width).toString());
    elem.setAttribute("height", new Number(Math.abs(this.scale.y*args.height)).toString());

    elem.setAttribute("x" ,     new Number(this._xPx(args.x)).toString());
    elem.setAttribute("y" ,     new Number(this._yPx(args.y)).toString());
    var defId = this._addEffect(args.effect, args.rgb);
    elem.setAttribute(this.styleAttName,"fill:url(#"+defId+") "+args.rgb+";" + (args.stroke ? "stroke-width:0.5; stroke:"+args.stroke : "") );
    if( args.onClick ){
      this._addEventListener({element:elem, type:"click", listener:args.onClick});
      this._addEventListener({element:elem, type:"mouseover", listener:this._setCursorToPointer});
      this._addEventListener({element:elem, type:"mouseout", listener:this._setCursorToDefault});
    }
    for( var attr in args.addAttr )
      elem.setAttribute(attr,args.addAttr[attr]);
    this.rootElem.appendChild(elem);
  }

  /**
   * Draw a SVG arc
   * @param {Object} args - Parameter object
   * @param {numeric}     args.x                - Center
   * @param {numeric}     args.y                - Center
   * @param {numeric}     args.radius           - Radius
   * @param {numeric}     args.start            - Start
   * @param {numeric}     args.end              - End
   * @param {string}      [args.effect]         - An effect to be used for areas. Possible values: linearGradient, radialPlate, linearRound, linearPlate
   * @param {numeric}     [args.percWidth]      - Inner radius
   * @param {string}      [args.rgb=black]      - Fill color
   * @param {string}      [args.stroke=black]   - Border color
   * @param {boolean}     [args.isFilled=false] - Fill area
   * @param {function}    [args.onClick]        - On click callback
   * @param {Object}      [args.addAttr]        - A set of additional string attributes to be attached to the root element</li>
   */
  arc( args )
  {
    if( Math.cos(args.end)==Math.cos(args.start) )
      args.end *= 0.99999; // Otherwise SVG will not render an (almost) full circle
    if( !args.rgb )
      args.rgb = "rgb(0,0,0)";
    var x = this._xPx(args.x);
    var y = this._yPx(args.y);
    var elem = this._createElementNS("path");
    var radius = args.radius;
    var innerRadius = args.percWidth ? args.radius*(1-args.percWidth) : 0;

    var d = "M "+(x+Math.sin(args.start)*innerRadius)+" "+(y-Math.cos(args.start)*innerRadius)+" ";
    d += "L "+(x+Math.sin(args.start)*radius)+" "+(y-Math.cos(args.start)*radius)+" ";

    d += "A "+radius+" "+radius+" ";
    d += Math.abs(args.end-args.start)<Math.PI ? "1 0 1 " : "1 1 1 ";
    d += (x+Math.sin(args.end)*radius)+" "+(y-Math.cos(args.end)*radius)+" ";

    d += "L "+(x+Math.sin(args.end)*innerRadius)+" "+(y-Math.cos(args.end)*innerRadius)+" ";

    d += "A "+innerRadius+" "+innerRadius+" ";
    d += "0 0 0 ";
    d += (x+Math.sin(args.start)*innerRadius)+" "+(y-Math.cos(args.start)*innerRadius)+" ";

    d += "z ";
    elem.setAttribute("d", d);

    var defId = this._addEffect(args.effect, args.rgb);
    elem.setAttribute(this.styleAttName,"fill:url(#"+defId+") "+args.rgb+";" + (args.stroke ? "stroke-width:0.5; stroke:"+args.stroke : "") );
    if( args.onClick ){
      this._addEventListener({element:elem, type:"click", listener:args.onClick});
      this._addEventListener({element:elem, type:"mouseover", listener:this._setCursorToPointer});
      this._addEventListener({element:elem, type:"mouseout", listener:this._setCursorToDefault});
    }
    for( var attr in args.addAttr )
      elem.setAttribute(attr,args.addAttr[attr]);
    this.rootElem.appendChild(elem);
  }

  /**
   * Draw a SVG circle
   * @param {Object} args - Parameter object
   * @param {numeric}     args.x                - Center
   * @param {numeric}     args.y                - Center
   * @param {numeric}     args.radius           - Radius
   * @param {string}      [args.effect]         - An effect to be used for areas. Possible values: linearGradient, radialPlate, linearRound, linearPlate
   * @param {string}      [args.rgb=black]      - Color
   * @param {boolean}     [args.isFilled=false] - Fill area
   * @param {function}    [args.onClick]        - On click callback
   * @param {Object}      [args.addAttr]        - A set of additional string attributes to be attached to the root element</li>
   */
  circle( args )
  {
    if( !args.rgb )
      args.rgb = "rgb(0,0,0)";
    var elem = this._createElementNS("circle");
    elem.setAttribute("cx", this._xPx(args.x) );
    elem.setAttribute("cy", this._yPx(args.y) );
    elem.setAttribute("r",  args.radius);
    var defId = this._addEffect(args.effect, args.rgb);
    elem.setAttribute(this.styleAttName,"fill:url(#"+defId+") "+args.rgb+";" + (args.stroke ? "stroke-width:0.5; stroke:"+args.stroke : "") );
    if( args.onClick ){
      this._addEventListener({element:elem, type:"click", listener:args.onClick});
      this._addEventListener({element:elem, type:"mouseover", listener:this._setCursorToPointer});
      this._addEventListener({element:elem, type:"mouseout", listener:this._setCursorToDefault});
    }
    for( var attr in args.addAttr )
      elem.setAttribute(attr,args.addAttr[attr]);
    this.rootElem.appendChild(elem);
  }

  /**
   * Draw a SVG text
   * @param {Object} args - Parameter object
   * @param {numeric}     args.x                - Position
   * @param {numeric}     args.y                - Position
   * @param {string}      args.text             - The text
   * @param {string}      [args.cssClass]       - A css class to be used
   * @param {string}      [args.align]          - Possible values middle, end
   * @param {string}      [args.layoutFlow]     - A css value lie vertical-ideographic
   */
  text( args )
  {
    var elem = this._createElementNS("text");
    elem.appendChild( this.doc.createTextNode(args.text) );

    if( args.cssClass != null && args.cssClass != '')
    {
      if (!!(window.SVGSVGElement)) // "tunnel" css attribute for exporting SVG (for image/PDF) from IE<=8
        elem.setAttribute("class", args.cssClass);
      else
        elem.className = args.cssClass;
    }
    var x = new Number(this._xPx(args.x));
    var y = new Number(this._yPx(args.y));
    //if vertical layout was chosen, ignore the text anchor declaration
    if( args.layoutFlow && args.layoutFlow.indexOf("deg")!=-1 ) {
      x = new Number(this._xPx(args.x));
      y = new Number(this._yPx(args.y));
      elem.setAttribute("transform", "rotate("+args.layoutFlow.replace("deg","")+"," + x + "," + y + ")");
      x -= 5;
      y += 2;
    } else if( args.layoutFlow=="vertical-ideographic" ) {
      x = new Number(this._xPx(args.x));
      y = new Number(this._yPx(args.y));
      elem.setAttribute("transform", "rotate(90,"+ x +","+ y +")");
      x -= 9;
      y += 3;
    } else if(args.align == "middle"){
      elem.setAttribute(this.styleAttName,"text-anchor:middle");
    } else if(args.align == "end"){
      elem.setAttribute(this.styleAttName,"text-anchor:end");
    }
    // Note, we need to set them as strings. Otherwise in IE(!) they are not part of innerHTML. We use SVG in IE for image/pdf export
    elem.setAttribute("x" , x+"" );
    elem.setAttribute("y" , y+"" );
    this.rootElem.appendChild(elem);
  }

  /**
   * Draw an SVG image element
   * @param {Object} args - Parameter object
   * @param {numeric}     args.x                - Left
   * @param {numeric}     args.y                - Top
   * @param {numeric}     args.width            - Width
   * @param {numeric}     args.height           - Height
   * @param {string}      [args.href]           - The image
   * @param {function}    [args.onClick]        - On click callback
   * @param {Object}      [args.addAttr]        - A set of additional string attributes to be attached to the root element</li>
   */
  image( args )
  {
    if( typeof args.href == "undefined" )
      return;

    var elem = this._createElementNS("image");
    elem.setAttributeNS("http://www.w3.org/1999/xlink","href",args.href);
    elem.setAttribute("width" , new Number(args.width).toString());
    elem.setAttribute("height", new Number(args.height).toString());

    elem.setAttribute("x" ,     new Number(this._xPx(args.x)).toString());
    elem.setAttribute("y" ,     new Number(this._yPx(args.y)).toString());
    if( args.onClick ){
      this._addEventListener({element:elem, type:"click", listener:args.onClick});
      this._addEventListener({element:elem, type:"mouseover", listener:this._setCursorToPointer});
      this._addEventListener({element:elem, type:"mouseout", listener:this._setCursorToDefault});
    }
    for( var attr in args.addAttr )
      elem.setAttribute(attr,args.addAttr[attr]);
    this.rootElem.appendChild(elem);
  }

  /**
   * The function is usefull to create a SVG in IE to create PDF from it.
   * creates an element, depends on User client registers svg Namespace(Firefox) or not(IE).
   * @private
   */
  _createElementNS(elementName){
    var elem =  typeof this.doc.createElementNS == "function" ? this.doc.createElementNS("http://www.w3.org/2000/svg",elementName) : this.doc.createElement(elementName);
    return elem;
  }

  /**
   * The function adds some named effects to the SVG drawer
   * These effects are implemented in form of painting a white area with a gradient
   * @private
   */
  _addEffect(effect, color)
  {
    // SVG can define an effect once and just keep linking to it per use
    // If for this color and effect that is already the case return its id
    // Otherwise create it, keep it in mind and return the new id
    if( this.knownEffects[effect+"_"+color] )
      return this.knownEffects[effect+"_"+color];

    var id = Math.random();

    if( effect=="linearGradient" ) {
      var def = this._createElementNS("defs");
      var rg = this._createElementNS("linearGradient");
      def.appendChild(rg);
      rg.setAttribute("id",id);
      rg.setAttribute("r","0.495");
      rg.setAttribute("x1",0);
      rg.setAttribute("x2",0.75);
      rg.setAttribute("y1",1);
      rg.setAttribute("y2",0.75);
      var stop = this._createElementNS("stop");
      stop.setAttribute("offset","75%");
      stop.setAttribute(this.styleAttName,"stop-color:"+color+";stop-opacity:1");
      rg.appendChild(stop);
      stop = this._createElementNS("stop");
      stop.setAttribute("offset","100%");
      var lightNess = jQuery.Color(color).lightness();
      var lighterColor = jQuery.Color(color).lightness(lightNess*1.4).toRgbaString();
      stop.setAttribute(this.styleAttName,"stop-color:"+lighterColor+";stop-opacity:1");
      rg.appendChild(stop);
      this.rootElem.appendChild(def);
    }
    else if ( effect=="radialPlate" ) {
      var def = this._createElementNS("defs");
      var rg = this._createElementNS("radialGradient");
      def.appendChild(rg);
      rg.setAttribute("id",id);
      rg.setAttribute("cx",0.2);
      rg.setAttribute("cy",1);
      rg.setAttribute("fx",0);
      rg.setAttribute("fy",1);
      rg.setAttribute("r","1");
      var stop = this._createElementNS("stop");
      stop.setAttribute("offset","90%");
      var lightNess = jQuery.Color(color).lightness();
      var lighterColor = jQuery.Color(color).lightness(lightNess*1.4).toRgbaString();
      stop.setAttribute(this.styleAttName,"stop-color:"+lighterColor+";stop-opacity:1");
      rg.appendChild(stop);
      stop = this._createElementNS("stop");
      stop.setAttribute("offset","100%");
      stop.setAttribute(this.styleAttName,"stop-color:"+color+";stop-opacity:1");
      rg.appendChild(stop);
      this.rootElem.appendChild(def);
    }
    else if ( effect=="linearRound" ) {
      var def = this._createElementNS("defs");
      var rg = this._createElementNS("linearGradient");
      def.appendChild(rg);
      rg.setAttribute("id",id);
      rg.setAttribute("x1",0);
      rg.setAttribute("x2",1);
      rg.setAttribute("y1",1);
      rg.setAttribute("y2",1);
      var stop = this._createElementNS("stop");
      stop.setAttribute("offset","0%");
      stop.setAttribute(this.styleAttName,"stop-color:"+color+";stop-opacity:1");
      rg.appendChild(stop);
      stop = this._createElementNS("stop");
      stop.setAttribute("offset","50%");
      var lightNess = jQuery.Color(color).lightness();
      var lighterColor = jQuery.Color(color).lightness(lightNess*1.4).toRgbaString();
      stop.setAttribute(this.styleAttName,"stop-color:"+lighterColor+";stop-opacity:1");
      rg.appendChild(stop);
      stop = this._createElementNS("stop");
      stop.setAttribute("offset","100%");
      stop.setAttribute(this.styleAttName,"stop-color:"+color+";stop-opacity:1");
      rg.appendChild(stop);
      this.rootElem.appendChild(def);
    }
    else if ( effect=="linearPlate" ) {
      var def = this._createElementNS("defs");
      var rg = this._createElementNS("linearGradient");
      def.appendChild(rg);
      rg.setAttribute("id",id);
      rg.setAttribute("x1",0);
      rg.setAttribute("x2",0.8);
      rg.setAttribute("y1",0.8);
      rg.setAttribute("y2",0);
      var stop = this._createElementNS("stop");
      stop.setAttribute("offset","50%");
      stop.setAttribute(this.styleAttName,"stop-color:"+color+";stop-opacity:1");
      rg.appendChild(stop);
      stop = this._createElementNS("stop");
      stop.setAttribute("offset","100%");
      var lightNess = jQuery.Color(color).lightness();
      var lighterColor = jQuery.Color(color).lightness(lightNess*1.1).toRgbaString();
      stop.setAttribute(this.styleAttName,"stop-color:"+lighterColor+";stop-opacity:1");
      rg.appendChild(stop);
      this.rootElem.appendChild(def);
    }
    else {
      var def = this._createElementNS("defs");
      var rg = this._createElementNS("linearGradient");
      def.appendChild(rg);
      rg.setAttribute("id",id);
      var stop = this._createElementNS("stop");
      stop.setAttribute("offset","100%");
      stop.setAttribute(this.styleAttName,"stop-color:"+color+";stop-opacity:1");
      rg.appendChild(stop);
      this.rootElem.appendChild(def);
    }

    this.knownEffects[effect+"_"+color] = id;
    return id;
  }

}; // bcdui.component.chart.SVGDrawer
