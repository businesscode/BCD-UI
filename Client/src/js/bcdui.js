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
 * @file Manages set up of client logging and provides essentials API into window.bcdui context
 */

/**
 * @global
 * @namespace
 */
var bcdui = bcdui || new Object();

jQuery.extend( bcdui, 
/** @lends bcdui */
{
    /**
     * Information useful for debugging
     * @namespace
     * @private
     */
    debug: 
    {
      // Maintain currently executing abstractExecutables. Called from setStatus();
      currExecutingIds : new Array(),
      /**
       * @private
       */
      _addCurrExecuting: function( abstractExecutableId ) {
        if( bcdui.debug.currExecutingIds.indexOf(abstractExecutableId) === -1 )
          bcdui.debug.currExecutingIds.push(abstractExecutableId);
      },
      /**
       * @private
       */
      _removeCurrExecuting: function( abstractExecutableId ) {
        var idx = bcdui.debug.currExecutingIds.indexOf(abstractExecutableId);
        if( idx !== -1 ) {
          bcdui.debug.currExecutingIds.splice( idx, 1 );
          if( bcdui.debug.currExecutingIds.length === 0 )
            bcdui.debug._callOnZeroCurrExecuting();
        }
      },

      /** Default page load measuring
       * @private
       */
      _firstTimeNoCurrExecuting: -1,
      /**
       * @private
       */
      _callOnZeroCurrExecuting: function() {
        bcdui.debug._firstTimeNoCurrExecuting = new Date().getTime() - bcdui.logging.pageStartTs;
        bcdui.debug._customCallOnZeroCurrExecuting();
      },
      /**
       * @private
       */
      _customCallOnZeroCurrExecuting: function() {
        // Dummy, overwrite if needed.
      },

      /** Maintain total execution time of all transformation processors
       * @private
       */
      _totalProcessorExecutionTime: {},

      /**
       * @private
       */
      _addProcessorExecutionTime: function( id, time ) {
        var old = bcdui.debug._totalProcessorExecutionTime[id];
        bcdui.debug._totalProcessorExecutionTime[id] = (old||0) + time;
      }
    },

    /**
     * Information about the current page instance
     * @namespace
     * @private
     */
    frame : {
      /**
       * Unique id of the current page invocation provided by the server. Useful for debugging
       */
      pageHash: ""
    },

    /**
     * default error handler which handles callback errors
     * @private
     */
    _loadingErrorHandler : function(e){
      bcdui.log.error("Error occurred while executing callback",e);
    },

    /**
     * reconfigures loggers level, is called after the isDebug flag has changed,
     * currently the isDebug flag enables verbose logging on TRACE level for
     * all appenders, so all log records are sent out to the server,
     *
     * in non-debug mode the logger works on WARN level
     * @private
     */
    _reconfigureLoggerLevel : function(/*log4javascript.Level*/ logLevel){
      bcdui.log.trace("reconfiguring logger");
      // in debug mode -> takes from
      if(bcdui.isDebug) {
        if(logLevel)
          bcdui.log.setLevel(logLevel);
        else
          bcdui.log.setLevel(log4javascript.Level.ALL);
      }else {
        bcdui.log.setLevel(log4javascript.Level.WARN);
      }
    },

    /**
     * set up logger, we maintain only one logger
     */
    log: (function(){
      var log = log4javascript.getLogger("bcdui");

      // serizalizes all objects via JSON.stringify() in given array and returns the array, the original array is modified
      var serializeObjects = function(messagesArray){
        if(messagesArray){
          for(var i=0,imax=messagesArray.length; i<imax;i++){
            if(typeof messagesArray[i] == "object"){
              messagesArray[i] = JSON.stringify(messagesArray[i]);
            }
          }
        }
        return messagesArray;
      };

      /**
       * creates a special console appender for log4javascript logging system,
       * new instance is returned depended on the browser used.
       */
      log4javascript._bcdui_createConsoleAppender = function(){
        var appender = null;
        var reFormat = true;

        if (bcdui.config) {

          if(bcdui.config.clientLogAppenderJSClassName){
            appender = eval("new " + bcdui.config.clientLogAppenderJSClassName + "()");
          }
          //attach special appender if we have a console and is not IE (BrowserConsoleAppender does not support IE)
          else if(typeof console != "undefined" && !bcdui.browserCompatibility.isIE){
            appender = new log4javascript.BrowserConsoleAppender();
          }
          else{
            appender = new log4javascript.PopUpAppender();
            reFormat=false;
          }

          if(reFormat){
           /*
            * override default formatter as we want simple string messages to be logged
            * as such and not as array of objects
            * We print the time since the last log and the time since the start of the page upfront
            */
            var _oldFormatRef = appender.getLayout().format;
            log.applicationStartTs = bcdui.logging.pageStartTs || new Date().getTime(); // pageStartTs is normally set by init.tag
            log.lastLogDate = log.applicationStartTs;
            appender.getLayout().format = function(loggingEvent){
              serializeObjects(loggingEvent.messages);
              if(loggingEvent.messages.length == 1){
                var ts = new Date().getTime();
                var tsStr = new String(("     "+(ts-log.lastLogDate)).slice(-5)+" "+((ts-log.applicationStartTs)/1000).toFixed(3)+": ");
                log.lastLogDate = ts;
                var msg = tsStr + loggingEvent.messages[0];
                bcdui.logging.console += msg+"\n";  // lightweight "appender" for bcdui.logging.console variable :-)
                return msg;
               } else {
                 return _oldFormatRef(loggingEvent);
               }
            };
          }

          // set log level from clientLog.properties
          appender.setThreshold(log4javascript.Level[bcdui.config.clientLogLevel||"ALL"]||log4javascript.Level.ALL);
        }

        return appender;
      },

      /**
       * @private
       */
      log4javascript._bcdui_createBCDUIPopupAppender = function(){
        var appender = null;

        if (bcdui.config) {

          // inner class BCD appender listeners on LEVEL.ERROR
          function BCDAppender(args) {
            this.isEmailCreated=false;
            this.bufferedMessage="";
            this.errorMessageCaption = (args && args.errorMessageCaption) ? args.errorMessageCaption : "An error occurred";
            this.emailContact        = (args && args.emailContact)        ? args.emailContact        : "Your local technical support";
            this.emailContactCC      = (args && args.emailContactCC)      ? args.emailContactCC      : "";
            this.subject             = (args && args.emailSubject)        ? args.emailSubject        : "An error occurred";
            this.emailBodyText       = (args && args.emailBodyText)       ? args.emailBodyText       : "Please copy/paste the detail information content here and give a short description of what you did.";
            this.emailAction         = "bcdui.log._getBCDAppender()._createEmailHref();this.onmouseover=''";
            this.emailMessageLine    = (args && args.emailMessageLine1)   ? args.emailMessageLine1   : "Please provide a short description of what you did prior to the error by clicking the following email link.";
            this.emailMessageLink    = "<a href='#' onmouseover=\"this.href=" + this.emailAction + "\">" + ((args && args.emailMessageLink) ? args.emailMessageLink : "Send email to technical support team") + "</a>";
            this.separator           = (this.emailContact.indexOf("?") >= 0 ? "&" : "?");
          };

          BCDAppender.prototype = new log4javascript.Appender();
          BCDAppender.prototype.toString = function(){return "BCDAppender";};
          BCDAppender.prototype.layout = new log4javascript.SimpleLayout();
          BCDAppender.prototype.append = function(loggingEvent) {
            serializeObjects(loggingEvent.messages);
            var formattedMessage = this.getLayout().format(loggingEvent);
            if (this.getLayout().ignoresThrowable())
              formattedMessage += loggingEvent.getThrowableStrRep();
            this.bufferedMessage += formattedMessage;
            this._showErrorModalbox();
          };

          /** shows Modalbox with errorMessages and set debug variables (only 1st error)
           * @private
           */

          BCDAppender.prototype._showErrorModalbox=function(){
            if (this.bufferedMessage && typeof bcdui.debug.lastErrorUrl == "undefined") {
              bcdui.debug.lastErrorUrl = location.href;
              bcdui.debug.lastErrorUnpackedGz = bcdui._unpackGuiStatusGz(this.bufferedMessage);
              bcdui.debug.lastErrorMessage = this.bufferedMessage;

              var addInfo = '<div class="bcdSysErrorBody"><p>--- Please copy/paste the text below into your email ---</p><br><center><textarea id="sysError" cols="80" rows="10">' + this._getDetailMessage() + '</textarea></center></div>';

              // If we call bcdui.widget.showModalBox too early, we will get a ModalBox related error instead of the real error
              bcdui.core.ready( function() {
                bcdui.widget.showModalBox({
                  title: this.errorMessageCaption
                  , message: "<div class='bcdSysError'>" + this.emailMessageLine + "<br/>" + this.emailMessageLink + addInfo + "</div>"
                  , modalBoxType: bcdui.widget.modalBoxTypes.plainText
                  , position: {my: "center center", at: "center center"}
                , height: 330
                , width: 570
                , resizeable: false
                });
                jQuery("#sysError").select()
              }.bind(this));
            }
          };

          /**
           * @private
           */
          BCDAppender.prototype._getDetailMessage = function() {
            var msg = "\n" + new Date().toISOString();
            msg += "\n" + navigator.userAgent;
            msg += "\n\n" + location.href;
            msg += "\n\n" + this.bufferedMessage;
            return msg;
          },

          /**
           * creates HREF to send email with error messages in email body
           * @private
           */
          BCDAppender.prototype._createEmailHref=function(){
            var res = "mailto:" + this.emailContact + this.separator + "subject=" + encodeURIComponent(this.subject + " #"+bcdui.config.frame.pageHash);
            if (this.emailContactCC != null && this.emailContactCC.length > 0)
              res += "&cc=" + encodeURIComponent(this.emailContactCC);
            res += "&body=" + encodeURIComponent(this.emailBodyText);

            // mailto protocol content is of limited size
            return res.length > 450 ? res.substring(0, 450) + ".." : res;
          };

          appender = new BCDAppender();

          // No interest in TRACE or INFO in none-debug mode
          appender.setThreshold(log4javascript.Level.ERROR);
        }
        return appender;
      };

      log._bcdui_consoleAppender    = log4javascript._bcdui_createConsoleAppender();
      log._bcdui_bcduiPopupAppender = log4javascript._bcdui_createBCDUIPopupAppender();

      // append console appender only in debug case
      if (bcdui.config && bcdui.config.isDebug)
        log.addAppender(log._bcdui_consoleAppender);

      log.addAppender(log._bcdui_bcduiPopupAppender);

      /** projects know the popup appender as BCDAppender
       * @private
       */
      log._getBCDAppender = function(){return this._bcdui_bcduiPopupAppender;};

      return log;
    })(),

    /**
     * Context path of the current webapp
     * @constant
     * @type {string}
     */
    contextPath        : "/",

    /**
     * Is debug mode enabled?
     * @constant
     * @type {boolean}
     */
    isDebug : false,

    /**
     * Sets debug mode flag
     * @param {boolean} isDebugEnabled
     */
    _setIsDebug : function(sw) {
      this.isDebug = sw;
    },

    /**
     * @return {string} Context path of the current webapp to resolve relative URLs
     */
    getContextPath : function() {
      return this.contextPath;
    },


    /**
     * @private
     */
    _setContextPath : function(url){
      this.contextPath = url;
    },


    /**
     * translates given uri string or array into array of urls
     *
     * @param uri array of uris or a string
     * @private
     * @return array of strings (urls)
     */
    _uriToUrl : function(uri){
      //if an uri is a string we convert into array
      if(typeof uri == "string"){
        uri = [uri];
      }

      var url=[];
      var _uri;

      for(var i=0;i<uri.length;i++){
        url.push(this.getModuleUrl(uri[i]));
      }

      this.log.trace("translated uri2url: ["+uri+"] - ["+url+"]");
      return url;
    },

    /**
     * extract and uncompresses the guiStatusGZ part from a given input string
     * @param url holding a guiStatusGz part
     * @private
     * @return unpacked guiStatus as string
     */
    _unpackGuiStatusGz : function(url) {
      var unpackedGz = "";
      var gz = url.indexOf("guiStatusGZ=") != -1 ? url.substring(url.indexOf("guiStatusGZ=") + 12) : "";
      var gzMatch = gz.match(/^[\w\-]+/);
      if (gzMatch != null && gzMatch.length > 0) {
        if (gzMatch[0].charAt(0) == "x" || gzMatch[0].charAt(0) == "z") {
          var gzModel = bcdui.core.compression.uncompressDOMDocument(gzMatch[0]);
          gzModel.execute();
          unpackedGz = new XMLSerializer().serializeToString(gzModel.getData());
        }
        else {
          var response = jQuery.ajax({
            type: "GET",
            async: false,
            url:  bcdui.contextPath + bcdui.core.compression._zipLetURL + "?data=" + gzMatch[0]
          });
          if (response && response.responseText)
            unpackedGz = response.responseText;
        }
      }
      return unpackedGz;
    },

    /**
     * Migration helpers to get rid of PrototypeJs
     * @private
     */
    _migPjs: {
      
      /**
       * This helper migrates PrototypeJs like class definitions to new ECMA5 type Object.create()
       * It limits the need of code changes during this process in BCD-UI
       * 1) It converts simple properties to property descriptors needed by Object.create()
       * 2) initialize() becomes the new classes constructor
       * New class definitions should use the plain Object.create() approach from MDN directly instead of this migration helper
       * @private
       */
      _classCreate: function( parent, properties )
      {
        var propertiesWithDesc = {};
        var constructor = null;
        for( var p in properties ) {
          if( p === "initialize" )
            constructor = properties[p];
          // User did provide proper property descriptions according to ECMA5
          else if( typeof properties[p] !== "undefined" && properties[p] !== null && typeof properties[p].value !== "undefined" ) {
            propertiesWithDesc[p] = properties[p];
            console.log("Found a plain value with 'value': "+p);
          }
          // Defaults for pre-ECMA5 setup
          else if( typeof properties[p] !== "undefined" )
            propertiesWithDesc[p] = { value: properties[p], writable: true, configurable: true, enumerable: true };
        }
        if( constructor === null ) {
          constructor = function( args ) {
            parent.call( this, args ); 
          }
        };
        constructor.prototype = Object.create( !!parent ? parent.prototype : {}, propertiesWithDesc );
        return constructor;
      },

      /**
       * @private
       */
      _$: function(element) {
        if (typeof element == "string" && element.length > 0 && element[0] != "#") {
          if (bcdui.config.debug && element.match(/\"|\#|\$|\%|\&|\'|\(|\)|\*|\+|\,|\.|\/|\:|\;|\<|\=|\>|\?|\@|\[|\\|\]|\^|\`|\{|\||\}|\~/g) != null && typeof console)
            console.error("bad character in element id: " + element);
          element = "#" + element;
        }

        var jq = jQuery(element);

        if (bcdui.config.debug && jq.length > 1)
          console.error("jq selector matches more than 1 item: " + element);

        return jq.first();
      }
    }
});

/**
 * auto-setup in case bcdui.js was injected from within frame.tag
 */
if(typeof bcdui.config != "undefined") {
  //expose to all
  bcdui._setContextPath(bcdui.config.contextPath);
  bcdui.frame = bcdui.config.frame;

  bcdui.config.isDebug && bcdui._setIsDebug(true);
  bcdui._reconfigureLoggerLevel(log4javascript.Level[bcdui.config.clientLogLevel||"ALL"]||log4javascript.Level.ALL);
}


// start marker for BCD-UI lib load
bcdui.log.isDebugEnabled() && bcdui.log.debug("BCD-UI lib just started loading");

/**
 * @typedef {url|js-function|Array.<(url|js-function)>|bcdui.core.DataProvider} chainDef
 * @description
 * Defines the transformation steps of a transformation chain, like {@link bcdui.core.ModelWrapper} or {@link bcdui.core.Renderer}.
 * <br/>Can be: url | function | Array<(url|function)> | bcdui.core.DataProvider
 * <br/>You can provide
 * <ul>
 *   <li>A single DataProvider, holding a chain definition following XML Schema 'chain-1.0.0.xsd'. Or
 *   <li>A single string holding the url of an xslt document (*.xslt) or a doT.js file (*.dott). Or
 *   <li>A javascript transformator function, representing a transformation. Such a function gets two parameters, data, like a DOM or JSON, whatever DataProvider.getData() returns
 *       and a parameter object, which maps parameter names to the actual parameters. It can return a new data object or modify the one, which was its input.
 *       It it does not return anything, its (modified) input doc is used as return default. Or
 *   <li>An array of such strings and functions in the order they are to be executed. In this case, the output of the n-th transformation becomes the input of n+1.
 * </ul>
 * @example <caption>These are all valid values for a chainDef:</caption>
 * "myStylesheet.xslt"                         // An <b>url</b> pointing to an *.xslt or a *.dott file
 * ["myTrans.dott", jsTrans]                   // An <b>array</b> of transformators, can be urls (doT.js or xslt) and js functions
 * new bcdui.core.StaticModel(...)             // A <b>DataProvider subclass</b>, providing an xml chain definition according to chain-1.0.0.xsd
 * function jsTrans(doc, params) {             // A <b>js function</b>, expecting a data object (DOM or JSON)
 *   var n = doc.getElementById('someId');
 *   n.setAttribute('someAttr', params.newValue);
 * }
 */



/**
 * @typedef {string} i18nToken
 * @description
 * A string value which is either taken as-is or an i18n key-marker as proposed by
 * <br/>We use xE0FF prefix to separate an i18n token from a plain string. This marker is available via bcdui.i18n.TAG
 * For i18n keys, see messages.xml or binding set bcd_i18n
 * @example
 * caption = "data"       // Treats value 'data' literal
 * caption = "\uE0FFdata" // Treats value 'data' as an i18n-key
 */


/**
 * @typedef {string|HTMLElement|jQuery} targetHtmlRef
 * @description
 * Any reference to an existing HTML element: Can be a DOM element, a jQuery list, a css selector or a plain id of an element.
 * <br/>If jQuery returns a list with multiple matches, the first member is used. These are all valid examples:
 * @example
 * document.getElementById("myId").firstChild      // Any plain <b>DOM element</b>
 * jQuery('#myElementId') &bull; jQuery('ul li:first')  // A <b>jQuery</b> list, first one is used
 * 'ul li:first'                                   // A <b>css selector</b>, first match is used
 * 'myElementId'                                   // Treated as an <b>element id</b> if its just letters (id without #)
 */

/**
 * @typedef {string} modelXPath
 * @description
 * Provide an XPath, which can be used to use nodes from, can point to an attribute or a full subtree.
 * Start the XPath with $someModelId, make sure that you create this {@link bcdui.core.DataProvider} with an explicit id.
 * Default for this is $guiStatus, which is always auto-registered.
 * <br/>Note: You can also build quite complex XPaths and refer to further registered models via '$myModelId' in predicates, see second example.
 * @example
 * $guiStatus/guiStatus:Status/guiStatus:MyNode                                     // A string with a simple XPath
 * $modelId/f:Filter/f:Filters[$guiStatus/guiStatus:Status/guiStatus:MyNodes/@attr] // A string with a more complex XPath, using multiple models
 */

/**
 * @typedef {string} xPath
 * @description
 * Provide an XPath, which can be used to use nodes from, can point to an attribute or a full subtree.
 * <br/>Note: must not contain model references.
 * @example
 * /guiStatus:Status/guiStatus:MyNode                                     // A string with a simple XPath
 */

/**
 * @typedef {string} writableModelXPath
 * @description
 * Provide an XPath, which can be used to append nodes to. In most cases the path will be created if it does not exist,
 * reusing as much as possible. See {@link bcdui.core.createElementWithPrototype}
 * Start the XPath with $dataProviderId, make sure that you create this {@link bcdui.core.DataProvider} with an explicit id.
 * Default for this is $guiStatus, which is always auto-registered.
 * Be aware that the model's data changes, if it is a ModelWrapper, the next execute() would of course overwrite the change.
 * <br/>You can also build complex XPaths and refer to further models via '$dataProviderId' in predicates.
 * @example
 * /guiStatus:Status/guiStatus:MyNode                                               // Default is $guiStatus
 * $modelId/f:Filter/f:Filters[$guiStatus/guiStatus:Status/guiStatus:MyNodes/@attr] // A string with a more complex XPath, using multiple models
 */
