/*
  Copyright 2010-2018 BusinessCode GmbH, Germany

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
 * Custom BCD-UI utility functions provided as jQuery Plugins
 *
 * Common guidelines:
 * - all function start with a 'bcd' prefix
 */
(function() {
  /**
   * Custom BCD-UI utility functions provided as jQuery Plugins
   * @namespace jQuery.fn
   */

  /**
   * Scrolls the container to the target, this function must be called on a scrollable
   * container. Implementation is provided by bcdui.util._scrollTo()
   *
   * @param {object|element|string}  target  Target to scroll the container to, must be a level-1 child of the container. Can be a jQuery object,
   *  an Element or jQuery compatible selector.
   *
   * @param {object}                  [options]                         Options to apply, all the options are optional, valid options:
   * @param {string}                  [options.snapTo=beginning]        snapTo can have following values: 'beginning': put the scrollTo-target on the top of container.
   *                                                                    'nearest': snap the element to the nearest edge of the container.
   *
   * @returns {object} jQuery object
   */
  jQuery.fn.bcdScrollTo = function( target, options ) {
    return this.each(function(){
      var el=jQuery(this);
      bcdui.util._scrollTo( el, typeof target == "string" ? el.children(target) : jQuery(target), options );
    });
  };

  /**
   * Locates and wraps an element by its id
   *
   * @param {element|string}  idOrElement Either an element to wrap to jQuery object or an id (without '#')
   * @returns {object} jQuery object
   *
   * @static
   */
  jQuery.bcdFindById = function( idOrElement ) {
    if( !idOrElement ){
      return jQuery();
    }
    return jQuery(typeof idOrElement === "string" ? (idOrElement[0] === "#" ? idOrElement : ("#" + idOrElement) ) : idOrElement);
  };

  /**
   * jQuery BCD-UI bcdTranslate plugin
   * 
   * Translates element. In case i18n catalog is not loaded yet,
   * the translation is scheduled and runs as soon as the catalog is loaded.
   */
  jQuery.fn.bcdTranslate = function(){
    return this.each(function(){
      bcdui.i18n.syncTranslateHTMLElement({ elementOrId : this });
    });
  };

  /**
   * jQuery BCD-UI bcdLoad plugin
   *
   * like jQuery.load(), but evaluates 'bcdOnLoad' attributes in loaded fragments.
   */
  jQuery.fn.bcdLoad = function(url, cb){
    var self = this;
    return this.load(url, function(){
      self.find("[bcdonload]").each(function(i,e){
        bcdui.util._execJs(jQuery(e).attr("bcdonload"), e, true);
      });
      cb&&cb();
    });
  };

  /**
   * jQuery BCD-UI bcdRender plugin
   *
   * @param {object} bcdRendererArgs arguments to bcdui.core.Renderer
   */
  jQuery.fn.bcdRender = function(bcdRendererArgs){
    return this.each(function(){
      new bcdui.core.Renderer(jQuery.extend({}, bcdRendererArgs, {
        targetHtml : this
      }));
    });
  };
}());
