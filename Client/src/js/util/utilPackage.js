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
 * @namespace bcdui.util
 */
bcdui.util = 
/** @lends bcdui.util */
{

  /**
   * @private
   */
  isFunction: function(obj) { return Object.prototype.toString.call(obj) === '[object Function]' },

  /**
   * @private
   */
  isNumber:   function(obj) { return Object.prototype.toString.call(obj) === '[object Number]' },

  /**
   * @private
   */
  isString:   function(obj) { return Object.prototype.toString.call(obj) === '[object String]' },

  /**
   * Logic derived from PrototypeJs library to remove xml tags from a string.
   * @param {string} string - String to be stripped
   * @returns {string}
   * @private
   */
  stripTags: function(str) { return str.replace(/<\w+(\s+("[^"]*"|'[^']*'|[^>])+)?>|<\/\w+>/gi, '') ;},

  /**
   * Logic derived from PrototypeJs library to remove <script> tags from a string.
   * @param {string} string - String to be stripped
   * @returns {string}
   * @private
   */
  stripScripts: function(str) { return str.replace(new RegExp('<script[^>]*>([\\S\\s]*?)<\/script>', 'img'), ''); },

  /**
   * Logic derived from PrototypeJs library to "Parses a URI-like query string and returns an object composed of parameter/value pairs".
   * @param {string} url - URL with the parameters
   * @returns {string} An object with the parameters of the url as properties
   */
  toQueryParams: function(url, separator) {
    var match = url.trim().match(/([^?#]*)(#.*)?$/);
    if (!match) return { };

    return match[1].split(separator || '&').reduce( function(hash, pair) {
      if ((pair = pair.split('='))[0]) {
        var key = decodeURIComponent(pair.shift()),
            value = pair.length > 1 ? pair.join('=') : pair[0];

        if (value != undefined) value = decodeURIComponent(value);

        if (key in hash) {
          if (!Array.isArray(hash[key])) hash[key] = [hash[key]];
          hash[key].push(value);
        }
        else hash[key] = value;
      }
      return hash;
    }, {});
  },
        
  /**
   * Logic derived from PrototypeJs library clone the position of one element (source) to another
   * @param {HTMLElement} element - The element which is moved to the cloned position
   * @param {HTMLElement} source - The element of which the position is cloned
   * @returns The moved target element
   * @private
   */
  clonePosition: function(element, source, args) {
    var options = {
      setLeft:    (typeof args.setLeft != "undefined" ? args.setLeft : true),
      setTop:     (typeof args.setTop != "undefined" ? args.setTop : true),
      setWidth:   (typeof args.setWidth != "undefined" ? args.setWidth : true),
      setHeight:  (typeof args.setHeight != "undefined" ? args.setHeight : true),
      offsetTop:  (typeof args.offsetTop != "undefined" ? args.offsetTop : 0),
      offsetLeft: (typeof args.offsetLeft != "undefined" ? args.offsetLeft : 0)
    };

    var p = jQuery(source).offset();
    var delta = {top: 0, left: 0}, parent = null;

    if (jQuery(element).css('position') == 'absolute') {
      parent = jQuery(element).offsetParent().get(0);
      delta = jQuery(parent).offset();
    }
  
    if (parent == document.body) {
      delta.left -= document.body.offsetLeft;
      delta.top -= document.body.offsetTop;
    }
  
    if (options.setLeft)   element.style.left  = (p.left - delta.left + options.offsetLeft) + 'px';
    if (options.setTop)    element.style.top   = (p.top - delta.top + options.offsetTop) + 'px';
    if (options.setWidth)  element.style.width = jQuery(source).outerWidth() + 'px';
    if (options.setHeight) element.style.height = jQuery(source).outerHeight() + 'px';
    return element;
  },

  /**
   * Logic derived from PrototypeJs library to provide the offset of an element to its closed ancestor
   * @param {HTMLElement} element
   * @returns Object with properties 'left' and 'top'
   * @private
   */
  positionedOffset: function(element) {
    var mt = parseInt(jQuery(element).css('margin-top'), 10);
    var ml = parseInt(jQuery(element).css('margin-left'), 10);
    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
      if (element) {
        if (element.nodeName.toUpperCase() === 'BODY') break;
        if (jQuery(element).css('position') !== 'static') break;
      }
    } while (element);

    valueL -= isNaN(ml) ? 0 : ml;
    valueT -= isNaN(mt) ? 0 : mt;

    var offsetCoords = {left: valueL, top: valueT };
    return offsetCoords;
  },

  /**
   * Logic derived from PrototypeJs library to provide the offset of an element from the top left of document
   * @param {HTMLElement} element
   * @returns Object with properties 'left' and 'top'
   * @private
   */
  cumulativeOffset: function(element) {
    var valueT = 0, valueL = 0;
    if (element.parentNode) {
      do {
        valueT += element.offsetTop  || 0;
        valueL += element.offsetLeft || 0;
        element = element.offsetParent;
      } while (element);
    }
    var offsetCoords = {left: valueL, top: valueT }
    return offsetCoords;
  },
  
  /**
   * Constants for standard key event values
   * @namespace bcdui.util.Event
   */
  Event: {
      KEY_BACKSPACE: 8,
      KEY_TAB:       9,
      KEY_RETURN:   13,
      KEY_ESC:      27,
      KEY_LEFT:     37,
      KEY_UP:       38,
      KEY_RIGHT:    39,
      KEY_DOWN:     40,
      KEY_DELETE:   46,
      KEY_HOME:     36,
      KEY_END:      35,
      KEY_PAGEUP:   33,
      KEY_PAGEDOWN: 34,
      KEY_INSERT:   45
  },

  /** little helper to escape html specific chars
   * @private
   */
  _entityMap : {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2f;'
  },
  
  /**
   * 
   * @param {string} string - Value to be escaped
   * @returns {string} Escaped string 
   */
  escapeHtml : function(string) {
    return String(string).replace(/[&<>"'\/]/g, function (s) {
      return bcdui.util._entityMap[s];
    });
  },
  
  /**
   * A convenience function creating a namespace if it does not already exist and
   * adding some extensions to it.
   * @param {string} namespace - The namespace to be returned.
   * @param {Object} [extensions] - The members to be added to the namespace.
   * @return {Object} The namespace denoted by the "namespace" argument.
   * @private
   */

  namespace : function(/* string */ namespace, /* object? */ extensions) {
    var components = namespace.split(".");
    var ns= components.reduce( function( previousValue, currentValue, index, array ) {
      if( !previousValue[currentValue] )
        previousValue[currentValue] = {};
      return previousValue[currentValue];
    }, window );
    return jQuery.extend( ns, extensions || {} );
  },

  /**
   * Vertically scrolls the container to the given element. This function scrolls the container only in case
   * the target element is not visible, if the target is not fully visible (i.e. partly covered) it will snap
   * the container on the element according to given options.
   * 
   * This function is considered private as a subject to change to support full scrolling features:
   * -  vertical / horizontal scrolling
   * -  autoscrolling ancestor viewports, consider api: scrollTo(target), as such autodetect wrapping viewports and scroll them accordingly
   *    to make the target visible on the screen
   * 
   * @param {Object|Element|string}   container                         The scrollable container containing a level-1 child 'scrollTo'.
   * @param {Object|Element|string}   scrollTo                          Level-1 child of the container.
   * @param {Object}                  [options]                         Options to apply, all the options are optional, valid options:
   * @param {string}                  [options.snapTo=beginning]        snapTo can have following values: 'beginning': put the scrollTo-target on the top of container.
   *  'nearest': snap the element to the nearest edge of the container.
   * 
   * @return {boolean} - true if the container has been scrolled
   * 
   * @private
   */
  _scrollTo : function(container, scrollTo, options){
    options = jQuery.extend({
      // DEFAULTS
      snapTo : "beginning"
    }, options);
    container = jQuery(container);
    scrollTo = jQuery(scrollTo);
    if( !container.length || !scrollTo.length ){
      return;
    }
    // TODO: currently supporting level-1 children only but we can extend to support descendants too or even autoscroll with bottom-up viewport recognition
    if( scrollTo.parent().get(0) !== container.get(0) ){
      throw "cant scroll, since scrollTo element is not a level-1 child of given container";
    }
    // viewport size
    var viewPortOffset = container.offset();
    var viewPortHeight = container.height();
    var viewportStart = container.scrollTop();
    var viewportEnd = viewPortHeight + viewportStart;
    // scrollTo point within viewport
    var refPointTop = scrollTo.offset().top - viewPortOffset.top + viewportStart;
    var refPointBottom = refPointTop + scrollTo.outerHeight(true);

    // check visibility
    var isRefTopVisible = viewportStart <= refPointTop && refPointTop <= viewportEnd;
    var isRefBottomVisible = viewportStart <= refPointBottom && refPointBottom <= viewportEnd;
    var isRefVisible = isRefTopVisible && isRefBottomVisible;

    // define only if we have an option for it: if not 'beginning', assume 'nearest'
    var isRefPointTopInUpperHalf = options.snapTo == 'beginning' ? undefined : (refPointTop <= viewportStart + viewPortHeight / 2);

    // we only want to scroll to refPointTop if isRefPointTopInUpperHalf is true and this point is in upper half of container
    if( !isRefVisible && isRefPointTopInUpperHalf === undefined
        ||
        !isRefTopVisible && isRefPointTopInUpperHalf
      ){
      container.scrollTop(refPointTop);
      return true;
    }

    if( !isRefBottomVisible ){
      container.scrollTop( viewportStart + (refPointBottom - viewportEnd ) );
      return true;
    }

    return false;
  }
}