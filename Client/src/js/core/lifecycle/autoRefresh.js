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
 * Support for auto-refreshing a {bcdui.core.DataProvider} in the background and detecting, if new data is available.<br/>
 * After trying to reload every periodSec, args.modifiedIf to see, if new data was sent.<br/>
 * * If the server sent an 'expires' header in the future, our re-load attempts will not even go to the server but be
 * fullfilled from the cache.<br/>
 * * If the server sent a 304, we keep using the latest data sent from server.<br/>
 * Both is supported for example by DataRefreshedFilter for example.
 * Once new data was received from the server, args.onModified will be executed.
 * @example
 * let arModel = myCube.getPrimaryModel().getPrimaryModel();
 * new bcdui.core.lifecycle.AutoRefresh({ model: arModel });
 */
bcdui.core.lifecycle.AutoRefresh = class
{
  /**
   * @constructs
   * @param {bcdui.core.DataProvider} args.model       - Model to monitor for updates by calling execute(true) and checking with modifiedIf
   * @param {number} [args.periodSec=300]              - Period in sec how often to query the server
   * @param {boolean|function} [args.activeIf=true]    - Boolean or function to determine whether we should check for model updates, queries all periodSec. Also see strategies below
   * @param {boolean|function} [args.modifiedIf=...strategy.modifiedIf.wrsTs] - Function called (with the current AutoRefresh as param) to check whether model was updated. Also see strategies below
   * @param {function} [args.onModified=...strategy.onModified.applyAction]   - Function called (with the current AutoRefresh as param) when new model data is available. Also see strategies below
   */
  constructor(args) {
    if(typeof args.activeIf !== "function" && !args.activeIf) return;

    this.model = args.model;
    this.periodSec = args.periodSec || 300;
    this.isActiveArg = typeof args.activeIf === "undefined" ? true : args.activeIf;
    this.modifiedIf = typeof args.modifiedIf !== "undefined" ? args.modifiedIf : bcdui.core.lifecycle.AutoRefresh.strategy.modifiedIf.wrsTs;
    this.onModified = args.onModified || bcdui.core.lifecycle.AutoRefresh.strategy.onModified.ApplyAction;

    this.model.onceReady( function() {
      this.lastTs = this.model.read("/*/@ts");
      this.interval = setInterval(this._refresh.bind(this), this.periodSec*1000);
    }.bind(this));
  }

  /**
   * Check whether we are active and if so re-load the model.
   * If the server sent new data (args.modifiedIf), call this.onModified()
   * @private
   */
  _refresh() {

    // Are (still) active?
    if(!this.isActive()) return;

    // If data did change, reload page
    this.model.onReady({ onlyOnce: true, onlyFuture: true, onSuccess: function() {
      if( this.modifiedIf(this) ) this.onModified();
    }.bind(this) });

    // Read new(?) data
    this.model.execute(true);
  }

  /**
   * Check whether we are still active according to args.activeIf
   */
  isActive() {
    if( !this.isActiveArg ) return false;
    if(typeof this.isActiveArg === "function" && !this.isActiveArg(this)) return false;
    return true;
  }


  /**
   * x Pre-defined strategies for activeIf and onModified arguments of AutoRefresh
   * @name bcdui.core.lifecycle.AutoRefresh.strategy
   * @property {Object} activeIf - Predefined callbacks for args.activeIf
   * @property {function} activeIf.bcdIsAutoRefreshInFilter
   *    True if bRef 'bcdIsAutoRefresh' is part of f:Filter of the requestModel of an args.model being a SimpleModel
   * @property {Object} modifiedIf - Predefined callbacks for args.modifiedIf
   * @property {function} modifiedIf.wrsTs - Check on /&ast;/@ts
   * @property {Object} onModified - Predefined callbacks for args.onModified
   * @property {function} onModified.applyAction - Reload page if modification is found
   * @static
   * @example
   * new bcdui.core.lifecycle.AutoRefresh({
   *   model: arModel,
   *   activeIf: bcdui.core.lifecycle.AutoRefresh.strategies.activeIf.bcdIsAutoRefreshInFilter
   * });
   */
  static strategy = {
    /**
     * Predefined strategies to determine if we are currently active
     */
    activeIf: {
      /** Active if bcdIsAutoRefresh is part of the f:Filter if model is a SimpleModel */
      bcdIsAutoRefreshInFilter: function(autoRefresh) {
        let requestModel = autoRefresh.model.urlProvider.requestModel;
        return requestModel.query("/*/wrq:Select/f:Filter/f:Expression[@bRef='bcdIsAutoRefresh']") != null;
      }
    },
    /**
     * Predefined strategies to check for data updates
     */
    modifiedIf: {
      /** Check on /&ast;/@ts */
      wrsTs: function(autoRefresh) {
        let wasLastTs = autoRefresh.lastTs;
        let newTs = autoRefresh.model.read("/*/@ts");
        autoRefresh.lastTs = newTs;
        return newTs > wasLastTs;
      }
    },
    /**
     * Predefined strategies to react on detected fresh data
     */
    onModified: {
      applyAction: function() {
        /** Page reload */
        bcdui.core.lifecycle.applyAction();
      }
    }
  };
}

