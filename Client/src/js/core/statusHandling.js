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
 * This file contains all basic classes for status handling.
 */

bcdui.core.Status = bcdui._migPjs._classCreate( null,
/**
 * @lends bcdui.core.Status.prototype
 */
{

  /**
   * @classdesc
   * An abstract base class, representing a Status.
   * See {@link bcdui.core.status} for concrete sub classes.
   * @abstract
   *
   * @constructs
   */
  initialize: function() {},

  /**
   * @return {String} A short code for the Status which can be used for debugging.
   */
  getCode: function()
    {
      throw Error("Abstract method: bcdui.core.Status.getCode");
    },

  /**
   * @return {String} A longer description of the Status.
   */
  getDescription: function()
    {
      throw Error("Abstract method: bcdui.core.Status.getDescription");
    },

  /**
   * Test the status for logical equivalence to another status object. Usually
   * this function should test if the target status is of the same class as
   * this status.
   * @return {boolean} True, if the specified status object represents the same
   * logical status as the current one.
   */
  equals: function(/* Status */ status)
    {
      throw Error("Abstract method: bcdui.core.Status.equals");
    },

  /**
   * @return {String} A debug string summarizing this status object.
   */
  toString: function() {
      return "[Status (" + this.getCode() + "): " + this.getDescription() + "]";
    }
}); // Create class: bcdui.core.Status


bcdui.core.StatusEvent = bcdui._migPjs._classCreate( null,
/**
 * @lends bcdui.core.StatusEvent.prototype
 */
{

  /**
   * @classdesc
   * Represents a status event thrown to status listeners of {@link bcdui.core.DataProvider DataProviders}, 
   * see {@link bcdui.core.AbstractExecutable#removeStatusListener} and {@link bcdui.core.StatusListener}
   *   
   * @constructs
   * @description
   * The constructor creating a new StatusEvent object.
   * @param {Object}            args          - This parameter map must contain two properties:
   * @param {Object}            args.source   - The object the status transition happened
   * @param {bcdui.core.Status} argsnewStatus - The new status of the source object
   */
  initialize: function(/* object */ args)
    {
      if (typeof args.status == "undefined")
        throw Error("Parameter Map must contain \"status\" attribute");
      if (args.status instanceof bcdui.core.Status) {
        this.status = args.status;
      } else {
        throw Error("Attribute \"status\" must be of type bcdui.core.Status");
      }

      if (typeof args.source == "undefined")
        throw Error("Parameter Map must contain \"source\" attribute");
      // We deactivate the type check when BCDUI 3 is used, because when the source is an
      // extended model it is not an instance of AbstractExecutable, however it can be used
      // as DataProvider as well.
      if (args.source instanceof bcdui.core.AbstractExecutable) {
        this.source = args.source;
      } else {
        throw Error("Attribute \"source\" must be of type bcdui.core.AbstractExecutable");
      }
    },

  /**
   * Getter for the object that made the status transition.
   * @return {object} The causer of the event.
   */
  getSource: function() {
      return this.source;
    },

  /**
   * @return {Status} The new status of the source object.
   */
  getStatus: function() {
      return this.status;
    },

  /**
   * @return {String} A summary of the status event.
   */
  toString: function()
    {
      return "[Status Event: " + this.status.getDescription() + " on Source: " + this.source + "]";
    }
}); // Create class: bcdui.core.StatusEvent


bcdui.core.StatusListener = bcdui._migPjs._classCreate( null,
/**
 * @lends bcdui.core.StatusListener.prototype
 */
{
  /**
   * @classdesc
   * An interface that status listeners must implement.
   * A StatusListener is informed by DataProviders (more precisely by {@link bcdui.core.AbstractExecutable AbstractExecutables}) about status changes, becoming ready is the most important.
   * 
   * @constructs
   */
  initialize: function() {},

  /**
   * This method is called when the status transition the listener is registered
   * for occurs.
   * @param statusEvent The status event belonging to the status transition. This
   * object must not be modified, because it is shared among all listeners.
   */
  handleStatusEvent: function(/* StatusEvent */ statusEvent)
    {
      throw Error("Abstract method: bcdui.core.StatusListener.handleStatusEvent");
    }

}); // Create class: bcdui.core.StatusListener
