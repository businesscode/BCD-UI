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
 * @fileoverview
 * The implementation of a color provider
 *
 */

bcdui.util.namespace("bcdui.component.chart",{});  // Making sure our namespace exists

/*
 * =====================================================================
 * ColorProvider
 */
bcdui.component.chart.ColorProvider = bcdui._migPjs._classCreate( null,
/**
 * @lends bcdui.component.chart.ColorProvider.prototype
 */
{
  /**
   * Constructor of bcdui.component.chart.ColorProvider, called by prototype.
   * @class
   *   This class represents a color provider;
   *   format see "chartDefinition.xsd".
   * @constructs
   * @private
   */
  initialize: function()
  {
    this.colors = new Array();
    this.baseColors = new String();
    this.rgbBaseColors = ["red","green","yellow","blue","purple","teal","gray"];
    this.wellKnownRgbColors = new Array();
    this.wellKnownRgbColors.red = "#f00000";
    this.wellKnownRgbColors.green = "#008000";
    this.wellKnownRgbColors.yellow = "#f0f000";
    this.wellKnownRgbColors.blue = "#0000f0";
    this.wellKnownRgbColors.purple = "#800080";
    this.wellKnownRgbColors.teal = "#008080";
    this.wellKnownRgbColors.gray = "#808080";
  },

  /**
   *  appends computed/existed colors as Color nodes into defDoc under "\/*\/Computed/Colors/Color",
   *  needed for legendRenderer
   * @param map with
   *   <ul>
   *     <li>doc, chart definition document</li>
   *     <li>targetNode, node in definition document</li>
   *   </ul>
   */
  appendColors: function(args){
    for(var c=0; c<this.colors.length; c++)
    {
      var colNode = bcdui.core.browserCompatibility.appendElementWithPrefix(args.targetNode, "chart:Color", false);
      colNode.appendChild(args.doc.createTextNode( this.getColor(c)));
      colNode.setAttribute("rgb", this.getColorAsRGB(c));
    }
  },


  /**
   * @param index
   */
  getColor: function( index )
  {
    return this.colors[index] != null ? this.colors[index] : "#000000";
  },

  /**
   * @param index
   */
  getColorAsRGB: function( index )
  {
    index = ((index*1) % Math.round(this.colors.length)); // can be used to scamble colors
    var resColStr = "rgb(";
    var col = new String();
    col = "" + this.getColor(index);

    if( this.wellKnownRgbColors[col] != null )// gets hex value of the color
      col = this.wellKnownRgbColors[col];
    if( col.substring(0, 1) == '#'){// translate hexadecimal to RGB color
      var rgbArr = this.hexColorToRgb(col);
      resColStr += rgbArr.red;
      resColStr += ",";
      resColStr +=  rgbArr.green;
      resColStr +=  ",";
      resColStr += rgbArr.blue;
      resColStr += ")";
    }
    else if( isFinite(col)){
      resColStr += ( (col >> 16)+","+(( col >>8)&255)+","+( col & 255)+")" );
    }
    else{
      resColStr += (col + ")");
    }
    return resColStr;
  },

  /**
   * @param index
   * @private
   */
  _toDecimal: function(hexSub)
  {
     var res=null;
     if(hexSub == "A")
        res = 10;
     else
     if(hexSub == "B")
        res = 11;
     else
     if(hexSub == "C")
        res = 12;
     else
     if(hexSub == "D")
        res = 13;
     else
     if(hexSub == "E")
        res = 14;
     else
     if(hexSub == "F")
        res = 15;
     else
        res = eval(hexSub);
     return res;
  },

  /**
   * translate hexadecimal color to RGB array
   * @param hexDigits
   * @return {Object} \{red: red, green: green, blue: blue\}
   */
  hexColorToRgb: function (hexDigits)
  {
    if( hexDigits.substring(0,1) == '#')// delete #
      hexDigits = hexDigits.substring(1, hexDigits.length);
    hexDigits = hexDigits.toUpperCase();
    var a = this._toDecimal(hexDigits.substring(0, 1));
    var b = this._toDecimal(hexDigits.substring(1, 2));
    var c = this._toDecimal(hexDigits.substring(2, 3));
    var d = this._toDecimal(hexDigits.substring(3, 4));
    var e = this._toDecimal(hexDigits.substring(4, 5));
    var f = this._toDecimal(hexDigits.substring(5, 6));
    var red = (a * 16) + b;
    var green = (c * 16) + d;
    var blue = (e * 16) + f;
    return {red: red, green: green, blue: blue};
  }

} ); // ColorProvider

/*
 * =====================================================================
 * SeriesColorProvider
 */
bcdui.component.chart.SeriesColorProvider = bcdui._migPjs._classCreate(bcdui.component.chart.ColorProvider,
/**
 * @lends bcdui.component.chart.SeriesColorProvider.prototype
 */
{
  /**
   * Constructor of bcdui.component.chart.SeriesColorProvider, called by prototype.
   * @class
   *   This class represents a color provider;
   *   format see "chartDefinition.xsd".
   * @extends bcdui.component.chart.ColorProvider
   * @constructs
   * @param colorsAsRgb
   * @private
   */
  initialize: function(colorsAsRgb)
  {
    bcdui.component.chart.ColorProvider.call(this);
    this.colors = colorsAsRgb;
  },

  /**
   * @param index
   */
  getColorAsRGB: function( index ) {
    return this.getColor(index);
  }
} ); // SeriesColorProvider



/*
 * =====================================================================
 * TypeColorProviderFixedList
 */
bcdui.component.chart.TypeColorProviderFixedList = bcdui._migPjs._classCreate(bcdui.component.chart.ColorProvider,
/**
 * @lends bcdui.component.chart.TypeColorProviderFixedList.prototype
 */
{

  /**
   * Constructor of bcdui.component.chart.TypeColorProviderFixedList, called by prototype.
   * @class
   *   This class represents a color provider;
   *   format see "chartDefinition.xsd".
   * @extends bcdui.component.chart.ColorProvider
   * @constructs
   * @param colorArray
   * @private
   */
  initialize: function(colorArray)
  {
    bcdui.component.chart.ColorProvider.call(this);
    this.colors = colorArray;
  }
} ); // TypeColorProviderFixedList

/*
 * =====================================================================
 * TypeColorProviderBaseColors
 */
bcdui.component.chart.TypeColorProviderBaseColors = bcdui._migPjs._classCreate(bcdui.component.chart.ColorProvider,
/**
 * @lends bcdui.component.chart.TypeColorProviderBaseColors.prototype
 */
{
  /**
   * Constructor of bcdui.component.chart.TypeColorProviderBaseColors, called by prototype.
   * @class
   *   This class represents a color provider;
   *   format see "chartDefinition.xsd".
   * @extends bcdui.component.chart.ColorProvider
   * @constructs
   * @param map with
   *   <ul>
   *     <li>count, how many colors are to be constructed from the base colors</li>
   *     <li>baseColors, space serarated list of base colors</li>
   *   </ul>
   * @private
   */
  initialize: function(args) {
    bcdui.component.chart.ColorProvider.call(this);

    if( args.baseColors ) {
      this.baseColors = args.baseColors;
    } else {
      this.baseColors = this.rgbBaseColors[0];
      for( i=1; i<this.rgbBaseColors.length-1; i++ )
        this.baseColors += " " + this.rgbBaseColors[i];
    }

    var cols = this.baseColors.split(" ");
    var isFirstColor = true;
    // computes next nearly color from each selectedBase color,
    // depends on number of series,
    // result is an integer number of color.
    if( args.count > cols.length){
      var perBaseColor = args.count / cols.length + args.count % cols.length;
      for( bc = 1; bc <= 7; bc++ ) {
       if( this.baseColors.search(this.rgbBaseColors[bc-1]) == -1 )
         continue;
       for( i = 1; i <= perBaseColor; i++ ) {
          var color = (200/perBaseColor*i+ 55)  *(bc & 1);
          color = color << 8;
          color += (200/perBaseColor*i+55)     *(bc/2 & 1) ;
          color = color << 8;
          color += (200/perBaseColor*i+ 55)     *(bc/4 & 1) ;
          this.colors.push( color );
        }
        if( isFirstColor == true )
          perBaseColor -= args.count % cols.length;
        isFirstColor = false;
      }
    }
    else
    {
      for(var col=0; col< cols.length; col++) {
        this.colors.push( this.wellKnownRgbColors[cols[col]] );
      }
    }
  }
} ); // TypeColorProviderBaseColors
