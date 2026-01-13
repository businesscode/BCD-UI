/*
  Copyright 2010-2025 BusinessCode GmbH, Germany

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
   * @param {string} str String to be stripped
   * @returns {string}
   * @private
   */
  stripTags: function(str) { return str.replace(/<\w+(\s+("[^"]*"|'[^']*'|[^>])+)?>|<\/\w+>/gi, '') ;},

  /**
   * Logic derived from PrototypeJs library to remove <script> tags from a string.
   * @param {string} str - String to be stripped
   * @returns {string}
   * @private
   */
  stripScripts: function(str) { return str.replace(new RegExp('<script[^>]*>([\\S\\s]*?)<\/script>', 'img'), ''); },

  /**
   * Logic derived from PrototypeJs library to "Parses a URI-like query string and returns an object composed of parameter/value pairs".
   * @param {string} url - URL with the parameters
   * @param {string} separator
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
   * @param {HtmlElement} element - The element which is moved to the cloned position
   * @param {HtmlElement} source - The element of which the position is cloned
   * @param args
   * @returns {DomElement} The moved target element
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
      if (jQuery(document.documentElement).get(0) != parent)
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
   * @param {HtmlElement} element
   * @returns {Object} Object with properties 'left' and 'top'
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
   * @param {HtmlElement} element
   * @returns {object} Object with properties 'left' and 'top'
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
  
  _reverseEntityMap : {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    '&quot;': '"',
    '&#39;': "'",
    '&#x2f;': "/"
  },

  /**
   * 
   * @param {string} string - Value to be unescaped
   * @returns {string} unescaped string 
   */
  unescapeHtml : function(string) {
    
    var s = string;
    for (var i in bcdui.util._reverseEntityMap)
      s = s.replaceAll(i, bcdui.util._reverseEntityMap[i]);
    return s;
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
   * 
   * @param {string} string - Value to be encoded
   * @returns {string} encoded string 
   */
  encodeURI : function(string) {
    let encode = decodeURI(string) == string ? encodeURI(string) : string;
    return encode.replaceAll("'", "%27");
  },

  /**
   * 
   * @param {string} string - Value to be decoded
   * @returns {string} dencoded string 
   */
  decodeURI : function(string) {
    let decode = "";
    try { decode = decodeURI(string); }
    catch(e) { decode = string; }
    return decode;
  },
  
  /**
   * A convenience function creating a namespace if it does not already exist and
   * adding some extensions to it.
   * @param {string} namespace - The namespace to be returned.
   * @param {Object} [extensions] - The members to be added to the namespace.
   * @return {Object} The namespace denoted by the "namespace" argument.
   * @private
   */

  namespace : function(namespace, extensions) {
    var components = namespace.split(".");
    var ns= components.reduce( function( previousValue, currentValue, index, array ) {
      if( !previousValue[currentValue] )
        previousValue[currentValue] = {};
      return previousValue[currentValue];
    }, window );
    return jQuery.extend( ns, extensions || {} );
  },

  /**
   * Parses function literal.
   *
   * @param {string|function}   jsFuncStr   JS function literal or JS function
   *
   * @return {function} a function or null if jsFuncStr is empty/null
   * @throws Error in case jsFuncStr is set to other type
   *
   * @private
   */
  _toJsFunction : function(jsFuncStr){
    if(jsFuncStr === undefined || jsFuncStr === null){
      return jsFuncStr;
    }
    var type = typeof jsFuncStr;

    if(type === "function"){
      return jsFuncStr;
    }

    if(type == "string"){
      jsFuncStr = jsFuncStr.trim();
      if(!jsFuncStr){
        return null;
      }
      if((/^[$A-Z_](\.?[0-9A-Z_$])*$/i).test(jsFuncStr)){ // a JS variable or reference in dotted notation
        var func = bcdui.util._getJsObjectFromString(jsFuncStr);
        if(!bcdui.util.isFunction(func)){
          throw `provided jsFuncStr '${jsFuncStr}' is not a function`;
        }
        return func;
      }
      if (bcdui.config.unsafeEval)
	      return eval( "(function(){" + jsFuncStr + "})" );
		  else    
    	  throw `provided jsFuncStr '${jsFuncStr}' is not a function name. Don't provide a function call with parameters here.`;
    }

    throw "unsupported type: " + type + ",jsFuncStr provided is neither a function nor a string";
  },

  /**
   * Get a JS object given via a string
   *
   * @param {string}  jsRef object name
   * @returns the found object or null
   * @private
   * */
  _getJsObjectFromString: function(objName, dontThrow) {
    const obj = objName.split(".").reduce(function(fkt, f) { return fkt && fkt[f]; }, window);
    if (dontThrow)
      return obj;
    else if (! obj)
      throw "not an object: " + objName;
    else
      return obj;
  },

  /**
   * Execute a JS function given via a string
   *
   * @param {string}  jsRef Function with parameters as string, either comma separated (e.g. alert, hello world) or function alert('hello world');
   * @param {object}  bindContext context for function bind
   * @param {array}   addParams additional optional parameter objects
   * @private
   * */
  _executeJsFunctionFromString : function(jsFuncStr, bindContext, addParams) {
    const match = jsFuncStr.match(/([\w\.]+)\((.*)\)/);
    const paramString = (match && match.length == 3) ? match[1].trim() + "," + match[2].replace(/["'`]/g, "").trim() : jsFuncStr || "";
    const fktParam = paramString.split(",").map((e) => e.trim()).filter((f) => f != "");
    let ok = false;
    if (fktParam.length != 0) {
      let scope = window;
      const obj = fktParam[0].split(".").reduce(function(fkt, f) {
        scope = fkt;
        return fkt && fkt[f]
      }, window);

      if (typeof obj == "function") {
        // we found the function, so call it with the parameters (or optionally only return it)
        const finalParams = [(bindContext || scope)].concat(fktParam.slice(1).concat((addParams || [])));
        const fkt = obj.bind(...finalParams);
        ok = true;
        return fkt();
      }
    }
    if (!ok)
      throw "not a function: " + jsFuncStr;
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
   * @param {string}                  [options.snapTo="beginning"]      snapTo can have the following values: 'beginning': put the scrollTo-target on the top of container.
   *  'nearest': snap the element to the nearest edge of the container.
   * 
   * @return {boolean} - true if the container has been scrolled
   * 
   * @private
   */
  _scrollTo : function(container, scrollTo, options){
    options = Object.assign({
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
  },

  /**
   * Find a single element in HTML, sets an id if not there and returns the id.
   * Also understands deprecated args.targetHTMLElementId and args.targetHtmlElementId instead instead of args.targetHtml and ids without leading '#' for backward compatibility
   * @param {Object} args Parameter Object
   * @param {string|HtmlElement|jQuery} args.targetHtml A CSS selector, or a plain HtmlElement or a jQuery element list. If there are multiple matching elements, the id of the first is used.
   * @param {boolean} [args.doReturnElement=false]  Return an element instead of the ID, is only compatible when using args.targetHtml
   * @returns {string|element} The id of the targetHtml or the element if args.doReturnElement=true
   * @private
   */
  _getTargetHtml: function(args, scope, doReturnElement) {
    // either take deprecated provided Ids
    var id = args.targetHTMLElementId || args.targetHtmlElementId;
    if (!id) {
      
      // For a plain word, we assume, always means an id not all matching tags. Even if no leading '#' is set.
      if (typeof args.targetHtml == "string" && args.targetHtml.match(/^#?[\w:-_]+$/)) {
        var _el = jQuery(args.targetHtml.startsWith("#") ? args.targetHtml : "#" + args.targetHtml);
        if (_el.length > 0){
          if(doReturnElement){
            return _el[0];
          }else{
            return _el.attr("id"); // return ID without #
          }
        }
      }

      //  is dom or jquery element or jquery selector?
      var jqEl = jQuery(args.targetHtml);
      if (jqEl.length > 0) {
        // take its id
        if (jqEl.first().attr("id")) {
          id = jqEl.first().attr("id")
        }
        // or generate one by using its id
        else if (args.id) {
          id = args.id + "_tE";
          jqEl.first().attr("id", id)
        }
        // or a totally new one from scope
        else {
          id = bcdui.factory.objectRegistry.generateTemporaryIdInScope(scope||"") + "_tE";
          jqEl.first().attr("id", id)
        }
        if(doReturnElement === true){
          return jqEl[0];
        }
      }
      else
        throw Error("targetHtml missing for '" + (args.id || scope) + "'" );
    } else if(doReturnElement) { // we've got id via deprecated API, doReturnElement must not be defined here
      throw "Error, .doReturnElement must not be set here.";
    }
    return id;
  },

  /**
   * sends a HTTP request using HTML form submit
   *
   * {string} url                   the url to call
   * {object} [args]                optional arguments
   * {string} [args.method=get]     request method
   * {string} [args.target=_blank]  the target
   * {string} [args.enctype=application/x-www-form-urlencoded]  the enctype
   * {object} [args.parameters]     object map with parameters to send
   */
  _sendFormRequest : function(url, args){
    args = Object.assign({
      method : "get",
      target : "_blank",
      enctype: "application/x-www-form-urlencoded"
    }, args);

    var formEl = jQuery("<form style='display:none' accept-charset='utf8'></form>").appendTo(document.body);

    formEl.attr("action", url);
    formEl.attr("method", args.method);
    formEl.attr("enctype", args.enctype);

    args.target && formEl.attr("target", args.target);

    if(args.parameters){
      Object.keys(args.parameters).forEach(function(k){
        jQuery("<input type='hidden'></input>")
        .appendTo(formEl)
        .attr("name", k)
        .val(args.parameters[k]);
      });
    }
    formEl.submit();
    formEl.remove(); // wont execute in case target=self
  },

  /**
   * create a div container and append to body, if such an element with given id is not found in DOM,
   * initially the element is set to display:none. Can be used for singleton containers.
   *
   * @param {string}  id  Id of a container to create
   * @param {boolean} [show=false]  true if element should not be hidden
   * @return {object} jQuery object with craeted (or located) element.
   *
   * @private
   */
  getSingletonElement : function(id, show){
    var el = document.getElementById(id);
    if(!el){
      var hide = show === true ? "" : " style='display:none'";
      jQuery(document.body).prepend(el = jQuery("<div id='" + id + "'" + hide + "></div>"));
    }
    return jQuery(el);
  },

  /**
   * Custom element creation helper.
   *
   * @param {string}    elementName     The name of the custom element to create, must adhere to custom element standards.
   * @param {function}  createdCallback The function which is called on the element once it is attached to the document, the context is set to the element.
   */
  createCustomElement : function(elementName, createdCallback) {
    if(!elementName){
      throw "elementName param required";
    }
    if(!createdCallback && !bcdui.util.isFunction(createdCallback)){
      throw "createdCallback param required";
    }
    var newTag = function() {
      return Reflect.construct(HTMLElement, [], newTag);
    };
    newTag.prototype = Object.create(HTMLElement.prototype, {
      attachedCallback : {
        value : function(){
          // Our components are not prepared to be created twice, but on the other hand we can only create them after we are attached since we need the parameters
          // To prevent a re-creation in case of them being moved in the DOM tree, we only do this step the first time we are attached
          if(!this.__created){
            this.__created = true;
            createdCallback.apply(this);
          }
        }
      }
    });
    newTag.prototype.connectedCallback = newTag.prototype.attachedCallback;
    newTag.prototype.constructor = newTag;
    window.customElements.define(elementName, newTag);

  },
  math : {
    /**
     * rounds a number to given scale
     *
     * @param {number} num - the number
     * @param {number} [scale=0] - the scale
     */
    round : (num, scale) => {
      if((scale = scale || 0) > 0){
        scale = Math.pow(10, scale);
      } else {
        scale = 1;
      }
      return Math.round( num * scale + Number.EPSILON ) / scale;
    } 
  },

  /**
   * Generates a new UUID
  * @return {string} uuid
  */
   getUuid : () => {
    // https://gist.github.com/jed/982883
    var b = function (a) { return a ? (a ^ Math.random() * 16 >> a / 4).toString(16) : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, b) };
    return b();
  },

  /**
   * sets a subject preference
   * @param {string}    name     The name of the subjectSetting
   * @param {string}    value    The value of for the subjectSetting specified by the name parameter. Can be a comma-separated value list
   * @param {function}  callback The function which is called after a successful call of the subjectPreferences servlet
  */
  setSubjectPreference: (name, value, callback) => {
    var success = callback || function(){};
    jQuery.ajax({
      method: "POST",
      url : bcdui.contextPath + "/bcdui/servlets/SubjectPreferences?value="+bcdui.util.encodeURI(value)+"&name=" + bcdui.util.encodeURI(name),
      success : success
    });
  },

  /**
   * returns an object map holding information for a binding's items (id, description and type)
   * @param {string}    bindingSetId The id of the binding set
   * @param {string|Array<string>}    bRefs    requested binding items. Can be a comma-separated value list or an array
   * @param {function}  callback The function which is called after a successful call of the BindingInfo servlet and returns the collected data
  */
  getBindingInfo: (bindingSetId, bRefs, callback) => {

    let captionMap = {};
    const success = callback || function(){};
    const bindingItems = typeof bRefs == "string" ? bindingItems : Array.isArray(bRefs) ? bRefs.join(",") : "";

    if (!bindingSetId) {
      success(captionMap);
      return;
    }

    const b = new bcdui.core.ModelWrapper({
      inputModel: new bcdui.core.SimpleModel({url: bcdui.contextPath + "/bcdui/servlets/BindingInfo?bindingSetId=" + encodeURI(bindingSetId) + "&bRefs=" + encodeURI(bindingItems)})
    , chain:
      function(doc) {
        Array.from(doc.selectNodes("/*/b:C")).forEach(function(c) {

          let caption = c.getAttribute("caption") || "";
          if (bcdui.i18n.isI18nKey(caption)) {
            caption = bcdui.i18n.syncTranslateFormatMessage({msgid: caption.substring(1)}) || caption;
            c.setAttribute("caption", bcdui.util.escapeHtml(caption));
          }

          const descriptioNode = c.selectSingleNode("b:Description");
          let description = (descriptioNode != null ? descriptioNode.text : "");
          if (descriptioNode && bcdui.i18n.isI18nKey(description)) {
            description = bcdui.i18n.syncTranslateFormatMessage({msgid: description.substring(1)}) || description;
            descriptioNode.text = bcdui.util.escapeHtml(description);
          }
          captionMap[c.getAttribute("id")] = {caption: c.getAttribute("caption"), description: description, typeName: c.getAttribute("typeName") || ""};
        });
        return doc;
      }
    });
    b.onceReady(function() { success(captionMap); });
    b.execute();
  },

  /**
   * transforms a xpath string with placeholders. A value with an apostrophe gets translated into a concat statement.
   * @param {string} xPath - xPath pointing to value (can include dot template placeholders which get filled with the given fillParams)
   * @param {Object} [fillParams] - array or object holding the values for the dot placeholders in the xpath. Values with "'" get 'escaped' with a concat operation to avoid bad xpath expressions
   * @return {string} final xPath with filled in values for possibly existing placeholders 
   */
  interpolateXPath: (fillParams, xPath) => {
    var xPathClean = xPath.replace(/\*/g, "\uE0F3"); // replace * with some utf8 char, so we can have xPaths with *
    var x = xPathClean;
    var concat = false;
    if (typeof fillParams == "object") {
      var obj = {};
      for (var p in fillParams) {
        if (typeof fillParams[p] == "string") {
          var gotApos = fillParams[p].indexOf("'") != -1;
          concat |= gotApos;
          obj[p] = gotApos ? "Xconcat('" + fillParams[p].replace(/'/g, `', "'", '`) + "', ''X)" : fillParams[p];
        }
      }
      x = doT.template(xPathClean)(obj);
    }
    
    // remove possibly existing outer quotes/apostrophe around the inserted concat to make a valid xPath expression
    if (concat)
      x = x.replace(/('|\")*(\s)*Xconcat\('/g, "concat('").replace(/, ''X\)(\s)*('|\")*/g, ", '')");
    return x.replace(/\uE0F3/g, "*"); // don't forget to replace the utf8 char back to *
  }
}

//Dummy implementation in case validation is not loaded
//This is overwritten with real functionality if apiValidate package is loaded
if( typeof bcdui.factory === "undefined" || typeof bcdui.factory.validate === "undefined"  || typeof bcdui.factory.validate.jsvalidation === "undefined"  ) {
  bcdui.factory = bcdui.factory || new Object();
  bcdui.factory.validate = bcdui.factory.validate || new Object();
  bcdui.factory.validate.jsvalidation = bcdui.factory.validate.jsvalidation || new Object();
  bcdui.factory.validate.component = bcdui.factory.validate.component || new Object();
  bcdui.factory.validate.core = bcdui.factory.validate.core || new Object();
  bcdui.factory.validate.widget = bcdui.factory.validate.widget || new Object();
  
  /**
  * This is overwritten with real functionality if apiValidate package is loaded
  * @private
  */
  bcdui.factory.validate.jsvalidation._validateArgs = function() { return; };
}
