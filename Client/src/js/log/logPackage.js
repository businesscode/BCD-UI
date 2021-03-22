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
 * @namespace bcdui.logging
 */
bcdui.logging = bcdui.logging || new Object();

jQuery.extend( bcdui.logging,
  /** @lends bcdui.logging */
  {
    /**
     *
     * @return array with registered renderer-ids or null if none found
     * @private
     */
    _getRegisteredRendererIds: function(){
      var renderers = jQuery("[bcdrendererid]").map(function(idx,el){ return jQuery.attr(el, "bcdrendererid") });
      return renderers.length > 0 ? renderers.toArray() : null;
    },

    /**
     * Useful for performance testing.
     * <p/>
     * Sends a log message with the duration since start of page load to the server perf-log table, once a certain set of DataProviders or all current Renderers are ready
     * Use this for example to trace the duration from page loading start to the end of load of a major or all Renderers to be shown to the user.
     * <p/>
     * Well-known bindingSet bcd_log_pageperformance must be available for using this.
     * @param {Object} args - The parameter map containing
     * @param {string[]} args.idRef - Id(s) of DataProvider(s) to wait for, or wait for all renderers registered at the moment of {@link bcdui.core.ready}
     * @param {string} [args.logName=idRef] - If provided, this is the name for which the log is written. If not given, idRef is used
     * @param {string}  [args.addInfo] - Optionally any text that should be also logged
     * @param {function}  [args.jsCallback] - A callback function can be supplied which is triggered once the log has captured data.
     * The callback is called with a parameter object with a duration property, indicating the logged duration
     */
    logPage: function( args ) {
      /*
       * check if we want to wait for ALL renderers, in this case we
       * defer the execution, otherwise we execute instantly.
       */
      args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.core._schema_logPage_args);
      bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.core._schema_logPage_args);

      if(args.idRef == null || args.idRef == ""){
        bcdui.core.ready( bcdui.logging._logPage.bind(undefined,args) );
      }else{
        bcdui.logging._logPage(args);
      }
    },

    /**
     * the implemenetation of logPage
     * @private
     */
    _logPage: function( args ) {
      if(args.idRef == null || args.idRef == ""){
        // here we detect all currently available renderers and stick to them
        args.idRef = bcdui.logging._getRegisteredRendererIds();
        if(args.idRef == null){
          if(bcdui.isDebug){
            bcdui.log.error("no registered renderers found up to this point. nothing to wait for. nothing to log.");
          }
          return;
        }
        /*
         * if no logName given, it will simply be assigned all names
         */
        if(args.logName == null){
          args.logName = args.idRef.sort().join(" ");
        }
      }else if(args.idRef != "" && args.idRef.indexOf(" ")>-1){
        // check if args.idRef is not empy and contain spaces
        // in this case we convert it to an array according to bcdui.factory.objectRegistry.withReadyObjectsNoExecute API
        args.idRef = args.idRef.split(" ");
      }
      bcdui.factory.objectRegistry.withReadyObjectsNoExecute( args.idRef, function( args ) {
        // TODO load .xml only once and reuse (low prio, for cases where logging is used more than once on a page)
        var model = new bcdui.core.SimpleModel( { id: bcdui.factory.objectRegistry.generateTemporaryIdInScope("logPageWriter"), url: bcdui.config.jsLibPath+"log/logPage.xml" } );
        model.addStatusListener({
          status: model.getReadyStatus(),
          onlyOnce: true,
          listener: function( args, model ) {
            var duration = (new Date().getTime() - bcdui.logging.pageStartTs);
            var logName = args.logName || args.idRef;
            var addInfo = args.addInfo || "";
            var insertRow = model.getData().selectSingleNode("/*/wrs:Data/wrs:I");
            function setColVal(pos,val){
              insertRow.selectSingleNode("wrs:C["+pos+"]").text=val;
            }

            setColVal(1,logName);
            setColVal(2,duration);
            setColVal(3,addInfo);

            model.urlProvider.value = bcdui.core.webRowSetServletPath;
            if(args.jsCallback){
              try{
                args.jsCallback({duration:duration});
              }catch(e){
                if(bcdui.isDebug){
                  bcdui.log.error("error occurred in callback", e);
                }
              }
            }
            bcdui.wrs.wrsUtil.saveModel( { model: model } );
          }.bind(undefined,args, model)
        });
        model.execute();
      }.bind(undefined,args) );
    }
  });

/**
 * URL to the backend logging trasceiver to receive loggingEvents from and push them into
 * @private
 */
bcdui.log.BACKEND_LOGGING_TRANSCEIVER_URL = bcdui.contextPath + "/bcdui/servlets/FrontendLogTransceiver";
