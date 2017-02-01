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
 * bcdui bootstrap code with all 3rd party essentials.
 *
 */

/**
 * @global
 * @namespace
 */
var bcdui = bcdui || new Object();

// Allowing precise performance measurement
bcdui.logging = bcdui.logging || new Object();
bcdui.logging.console = "Start "+new Date()+"\n";
bcdui.logging.pageStartTs = new Date().getTime();

// Workaround for IE <= 9
if( typeof location.origin == "undefined" ) {
  location.origin = location.protocol+"//"+location.hostname+(location.port?":"+location.port:"");
}

//~~~~~~~~~~~~~~~~~~ bcdui bootstrap ~~~~~~~~~~~~~~~~~~~~~

// Original form PrototypeJs plus our extensions
jQuery.extend( bcdui, {
  browserCompatibility: (function(){
    var ua = navigator.userAgent;
    var isOpera = Object.prototype.toString.call(window.opera) == '[object Opera]';
    var isInternetExplorer = (!!window.attachEvent && !isOpera) || ua.indexOf('Trident') != -1;
    var tridentVersion = null;
    var msIEversion = null;
    var tridentArray = navigator.userAgent.match(/Trident\/[0-9.]+/g);
    var msIEArray = navigator.userAgent.match(/MSIE [0-9.]+/g);
    if (tridentArray != null && tridentArray.length > 0)
      tridentVersion = 4 + parseFloat(tridentArray[0].replace(/Trident\//g, ""));
    if (msIEArray != null && msIEArray.length > 0)
       msIEversion = parseFloat(msIEArray[0].replace(/MSIE/g, ""));

    return {
      isIE:             isInternetExplorer,
      isMsEdge:         ua.indexOf(' Edge/') !== -1,
      isOpera:          isOpera,
      isWebKit:         ua.indexOf('AppleWebKit/') > -1 && ua.indexOf(' Edge/') === -1,
      isGecko:          ua.indexOf('Gecko') > -1 && ua.indexOf('KHTML') === -1 && ua.indexOf('Trident') === -1,
      isMobileSafari:   /Apple.*Mobile/.test(ua),
      isIE8:            isInternetExplorer && parseInt(navigator.userAgent.substring(navigator.userAgent.indexOf("MSIE")+5))== 8,
      ieVersion:        msIEversion != null && msIEversion < tridentVersion ? msIEversion : tridentVersion // IE (emulated) version
    }
  })()
});

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
      bcdui.log.error("Error occured while executing callback",e);
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
            this.errorMessageCaption = (args && args.errorMessageCaption) ? args.errorMessageCaption : "An error occured";
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
            var msg = bcdui.config.sessionId;
            msg += "\n" + new Date().toISOString();
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

jQuery.extend( bcdui.util, {
  /**
   * Find a single element in HTML, sets an id if not there and returns the id.
   * Also understands deprecated args.targetHTMLElementId and args.targetHtmlElementId instead instead of args.targetHtml and ids without leading '#' for backward compatibility
   * @param {Object} args Parameter Object
   * @param {string|HTMLElement|jQuery} args.targetHtml A CSS selector, or a plain HTMLElement or a jQuery element list. If there are multiple matching elements, the id of the first is used.
   * @returns The id of the targetHtml
   * @private
   */
  _getTargetHtml: function(args, scope) {
    // either take deprecated provided Ids
    var id = args.targetHTMLElementId || args.targetHtmlElementId;
    if (!id) {
      
      // For a plain word, we assume, always means an id not all matching tags. Even if no leading '#' is set.
      if (typeof args.targetHtml == "string" && args.targetHtml.match(/^#?[\w:-_]+$/)) {
        if (jQuery(args.targetHtml.startsWith("#") ? args.targetHtml : "#" + args.targetHtml).length > 0)
          return args.targetHtml.startsWith("#") ? args.targetHtml.substring(1) : args.targetHtml;
      }

      //  is dom or jquery element or jquery selector?
      if (jQuery(args.targetHtml).length > 0) {
        // take its id
        if (jQuery(args.targetHtml).first().attr("id")) {
          id = jQuery(args.targetHtml).first().attr("id")
        }
        // or generate one by using its id
        else if (args.id) {
          id = args.id + "_tE";
          jQuery(args.targetHtml).first().attr("id", id)
        }
        // or a totally new one from scope
        else {
          id = bcdui.factory.objectRegistry.generateTemporaryIdInScope(scope||"") + "_tE";
          jQuery(args.targetHtml).first().attr("id", id)
        }
      }
      else
        throw Error("targetHtml missing for '" + (args.id || scope) + "'" );
    }
    return id;
  }
});

// Dummy implementation in case validation is not loaded
// This is overwritten with real functionality if apiValidate package is loaded
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


// start marker for bui load
bcdui.log.isDebugEnabled() && bcdui.log.debug("BCDUI lib just started loading");
