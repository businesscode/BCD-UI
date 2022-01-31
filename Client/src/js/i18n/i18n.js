/*
  Copyright 2010-2022 BusinessCode GmbH, Germany

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
   *  The i18n registry.
   *  An XML island is used to produce a mapping from msgid to phrase,
   *  the phrase can optionally contain interpolation terms in the format
   *  ${name}. Each string in the application should be retrieved from
   *  this object using the 'translate' method with the msgid as argument,
   *  optionally called with a mapping (object) from name to value which
   *  will be used for the interpolation. Example:
   *  <p>
   *  We have the following XML:
   *  </p>
   *  <pre>
   *  &lt;Data>
   *    &lt;foo>bar&lt;/foo>
   *    &lt;someline>this is a ${type} line&lt;/someline>
   *  &lt;/Data>
   *  </pre>
   *  <p>
   *  we can create an MessageCatalog object like this:
   *  </p>
   *  <pre>
   *    var mc = new MessageCatalog({document:documentWithData});
   *    and can then make the following calls:
   *    mc.translate({msgid:'foo'}); # would result in 'bar'
   *    mc.translate({msgid:'someline'}, {'type': 'short'}); //  'this is a short line'
   *  </pre>
  */
bcdui.i18n.MessageCatalog = class
{
  /**
   * @param {Object} args Parameter object with property "document" with catalog
   * entries.
   * @private
   */
  constructor(args) {
    this.catalog = (!args)?null:args.document;
    if(this.catalog==null){
      throw new Error("bcdui.i18n.MessageCatalog initialized with no document");
    }
    this.isKeyNormalizedAttrName="isKeyNormalized";
    if(this.catalog != null){
      this.isKeyNormalized = this.catalog.documentElement.getAttribute(this.isKeyNormalizedAttrName) == 'true';
    }else{
      this.isKeyNormalized = false;
    }

    /* instead of checking for key normalization on each translation iteration we provide the fitting getter */
    if(this.isKeyNormalized){
      this._getMsgId = this._msgIdProxy_normalized;
    }else{
      this._getMsgId = this._msgIdProxy_asis;
    }
  }

  /**
   * @param {Object} args
   * @param args.msgid
   * @param args.interpolations
   * @return translated message or empty String if did not find
   */
  translate(args) {
    // in debug mode the default translation is the message so in case no key is available the developer knows whats missing
    var translated = bcdui.config.isDebug ? args.msgid : "";
    if(!args.msgid){
      return null;
    }
    var msgid = this._getMsgId(args.msgid);
    var nd = this.catalog.getElementsByTagName(msgid)[0];
    if(nd){
      translated = nd.nodeValue || nd.text || (nd.lastChild ? nd.lastChild.nodeValue : null) || "";
    }

    if (args.interpolations) {
      for (var id in args.interpolations) {
        var value = args.interpolations[id];
        var reg = new RegExp('\\\$\\\{' + id + '\\\}', 'g');
        translated = translated.replace(reg, value);
      };
    };
    return translated;
  }

  /**
   * @private
   */
  _msgIdProxy_normalized(msgid){
    return this._normalizeKey(msgid);
  }

  /**
   * @private
   */
  _msgIdProxy_asis(msgid){
    if(msgid && msgid.startsWith(bcdui.i18n.TAG)){
      return msgid.substring(1);
    }
    return msgid;
  }

  /**
   * normalizes the key, that is all chars except alphanumeric, _ and - are stripped off
   * @private
   */
  _normalizeKey(/*String*/ key){
    if(key.startsWith(bcdui.i18n.TAG)){
      key = key.substring(1);
    }
    return key.replace(/[^a-zA-Z_0-9-]/g, "");
  }
};

bcdui.i18n.HTMLTranslator = class
{
  /**
   * @constructs
   * @member bcdui.i18n.HTMLTranslator
   * @param {Object} args
   * @param {bcdui.i18n.MessageCatalog} args.catalog
   * @param {String} [args.translateAttrName]
   * @param {String} [args.translateAttrsAttrName]
   * @private
   */
  constructor(args) {
    if(!args||!args.catalog){
      throw new Error("bcdui.i18n.HTMLTranslator() not initialized properly: catalog not defined");
    }

    this.catalog = args.catalog;
    this.formatAttrName= "bcdFormat";
    this.translateAttrName= args.translateAttrName || "bcdTranslate";
    this.translateAttrsAttrName= args.translateAttrsAttrName || "bcdTranslateAttrs";
  }
  /**
   * translates the element and all its children having the translate attribute
   * @private
   * @param {Object} args
   * @param args.element  - element to translate
   * @param args.catalog  - catalog with i18n entries
   */
  translate(args) {
    var docel = typeof args.element === "string" ? document.getElementById(args.element) : args.element;
    if(docel && docel.nodeType===1 ){// because of TEXT_NODE, COMMENT_NODE and so on
      if (docel.nodeName.toUpperCase() == 'INPUT'){  // input field have a 'select' method that is different than prototype:select function
          this._handleNode(docel);
      }else{
        // enhance performance via for-loop (instead of using .each())
        var arr=jQuery(docel).find("*["+ this.translateAttrName + "],*["+ this.translateAttrName + "=''],*[" + this.translateAttrsAttrName+ "]").toArray();
        // also handle docel itself in case it is not the documentElement
        if(docel.parentNode) {
          arr.push(docel);
        }
        for(var i=0;i<arr.length;i++){
          this._handleNode(arr[i]);
        }
      }
    }
  }

  /**
   * @private
   */
  _handleNode(node) {
    if (node.nodeType != 1) {
      return;
    }

    try {
      var t = node.getAttribute(this.translateAttrName);
      if(t!=null){
        this._handle_i18ntranslate(node, t);
      }
    } catch(e) {};

    try {
      var a = node.getAttribute(this.translateAttrsAttrName);
      if(a!=null){
        this._handle_i18n_attributes(node, a);
      }
    } catch(e) {};

  }

  /**
   * translates HTML content of given over HTML node
   *
   * @param node
   * @param midstring
   * @private
   */
  _handle_i18ntranslate(node, midstring) {
    var mid;
    if (midstring.trim() != '') {
      mid = midstring;
    } else {
      mid = node.innerHTML;
    };

    var formatted = this.translateFormatMessage(mid);

    if(formatted)// in this case don't replace original inner HTML content
      node.innerHTML = formatted;
    // clean up
    node.removeAttribute(this.translateAttrName);
  }

  /**
   * translates and formats if needed the given over message id
   */
  translateFormatMessage(msgid){
    if(!msgid) return msgid;
    var oMsgId = msgid;// original message id
    msgid = msgid.trim();

    // -----
    // splits message Id by pipe token |
    // kpiValueMsgId|0.9895
    // we expect that in translated message stands "KPI Value {0,number,#0.00}"
    var isToFormate=false;
    var splits=[];
    if(msgid.indexOf("|")!==-1){
      isToFormate = true;
      splits = msgid.split("|");
      msgid = splits[0];
    }
    var translated = this.catalog.translate({msgid:msgid});
    var formatted = translated;
    if(isToFormate ){
      var vals = splits.filter(function(e){return e!== splits[0]});
      formatted = bcdui.i18n.formatMessage(translated, vals, bcdui.i18n.standardFormattingFunctions);
    }

    if(translated == ''){
      bcdui.log.isDebugEnabled() && bcdui.log.debug("not found original messageId:'" + oMsgId + "'");
    }

    return formatted;
  }

  /**
   * translates attributes
   *
   * @param node
   * @param attrstring
   * @private
   */
  _handle_i18n_attributes(node, attrstring) {
    var attrnames = attrstring.split(';');
    for (var i=0; i < attrnames.length; i++) {
      node.setAttribute(attrnames[i], this.catalog.translate({msgid:node.getAttribute(attrnames[i]).trim()}));
    };
    // clean up
    node.removeAttribute(this.translateAttrsAttrName);
  }
};// end of Class scope
