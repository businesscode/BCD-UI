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
 * defined backend events poller, which checks collects log events at backend
 * and propagates them into client logging subsystem
 *
 * DEFAULT threshold: WARN
 *
 */
(function(){
  //interim error raising solution,later just throw new error obbject instead of
  //calling this function
  function error(msg){
    bcdui.log.error(msg);
    throw new Error(msg);
  }

  //special logger so that these events are recognized and not handled locally
  var log = log4javascript.getLogger("bcdui.backendEventLogger");
  log.setAdditivity(false); //dont propagate to parents handlers
  log.setLevel(log4javascript.Level.ALL);
  log.addAppender(bcdui.log._bcdui_consoleAppender); //use console handler from parent

  /**
   * takes a map of params:
   * @param pollingIntervalMs (default 10000)
   * @param url
   * @param threshold of type log4javascript.Level (default log4javascript.Level.ALL)
   */
  function TypeBackendEventsPoller(config){
    config = config||{};
    this.config = config;

    config.pollingIntervalMs = config.pollingIntervalMs||10000;
    config.threshold = config.threshold||log4javascript.Level.ALL;

    if(!config.url){
      error("url required");
    }

    log.setLevel(config.threshold);

    this.pollingTimeout=null;
    bcdui.core.xmlConstants.namespaces.log4j = "log4j";
  }

  /**
   * set threshold for polling logging event levels,
   * @param threshold of type log4javascript.Level
   */
  TypeBackendEventsPoller.prototype.setThreshold = function(threshold){
    this.config.threshold = threshold;
  }

  /**
   * propagates given document to the logging subsystem
   */
  TypeBackendEventsPoller.prototype.propagate = function(doc){
    var $$ = {};

    $$.logEvents = [];  //push/filter locally
    $$.events = doc.selectNodes("//log4j:event");
    if($$.events.length > 0){
      for(var x=0;x<$$.events.length;x++){
        $$.ev = $$.events[x];
        $$.level = eval("log4javascript.Level." + $$.ev.getAttribute("level").toUpperCase());
        if(! $$.level || $$.level.level < this.config.threshold.level)continue;
        $$.message = $$.ev.getAttribute("logger") + ": " + $$.ev.selectSingleNode("log4j:message").firstChild.nodeValue;
        $$.logEvents.push({level:$$.level, message:$$.message});
      }
    }

    if($$.logEvents.length > 0){
      log.group("backend event queue - threshold: " + this.config.threshold.name + ", items: " + $$.logEvents.length, false);
      for(var x=0;x<$$.logEvents.length;x++){
        $$.ev = $$.logEvents[x];
        eval("log." + $$.ev.level.name.toLowerCase()).call(log,$$.ev.message);
      }
      log.groupEnd();
    }
  }

  TypeBackendEventsPoller.prototype.fetchLoggingEvents = function(){
    var self = this;
    jQuery.ajax({
      method: "GET",
      contentType: "text/xml",
      url: this.config.url,
      success: function(response, statusTest, jqXHR) {
        self.propagate(jqXHR.responseXML);
      },
      error: function(){
        bcdui.log.warn("failed to fetch logging events");
      },
      complete: function(){
        self.schedulePoll();
      }
    });
  }

  /**
   * schedules a polling
   */
  TypeBackendEventsPoller.prototype.schedulePoll = function(){
    var self = this;
    this.pollingTimeout = window.setTimeout(function(){
      TypeBackendEventsPoller.prototype.poll.call(self);
    },this.config.pollingIntervalMs);
  }

  /**
   * clears polling timeout and fetches logging events
   */
  TypeBackendEventsPoller.prototype.poll = function(){
    window.clearTimeout(this.pollingTimeout);
    this.fetchLoggingEvents();
  }

  TypeBackendEventsPoller.prototype.deploy = function(){
    this.poll();

    bcdui.log.group("TypeBackendEventsPoller deploy");
      bcdui.log.isTraceEnabled() && bcdui.log.trace("TypeBackendEventsPoller deployed with config");
      bcdui.log.isTraceEnabled() && bcdui.log.trace(this.config);
    bcdui.log.groupEnd();
  }

  bcdui.log.TypeBackendEventsPoller = TypeBackendEventsPoller;
})();

//in DEBUG: set up set up backend logging events poller to push them into client logging subsystem
if(bcdui.isDebug){// deactivate ?
  new bcdui.log.TypeBackendEventsPoller({
    url : bcdui.log.BACKEND_LOGGING_TRANSCEIVER_URL
  }).deploy();
}
