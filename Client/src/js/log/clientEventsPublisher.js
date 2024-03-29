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
 * provides client events publisher
 *
 * DEFAULT threshold: WARN
 */
/**
 * @private
 */
(function _initDefaultAppenderAppender() {
  var $$ = {};
  bcdui.log.isTraceEnabled() && bcdui.log.trace("setting up clientEventsPublisher");

  //set up remote appender which propagates clients logging events to backend
  $$.appender = new log4javascript.AjaxAppender(bcdui.log.BACKEND_LOGGING_TRANSCEIVER_URL);
  $$.appender.setLayout(new log4javascript.PatternLayout());
  $$.appender.setThreshold(log4javascript.Level.ERROR);
  bcdui.log.addAppender($$.appender);

})();
