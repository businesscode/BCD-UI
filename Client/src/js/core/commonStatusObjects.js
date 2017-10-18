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
 *
 * This file contains the status objects required by the BCD-U library.
 */

/**
 * A namespace containing a set of status classes used by the BCD-UI system. They are
 * used by the subclasses of the {@link bcdui.core.AbstractExecutable AbstractExecutable} to implement their status
 * system. See {@link bcdui.core.AbstractExecutable#getStatus getStatus()}.
 * </P>
 * The statuses are useful during debugging, if parts of the page do not get ready. Normally, 
 * after loading and processing, all AbstractExecutable reach {@link bcdui.core.AbstractExecutable#isReady .isReady()}  === true, if everything is OK.
 * It depends on the exact concrete subclass of AbstractExecutable, which of the statuses below means successful final, i.e. isReady(). 
 * You can retrieve this final-success status via {@link bcdui.core.AbstractExecutable#getReadyStatus .getReadyStatus()} of the subclass.
 * @namespace bcdui.core.status
 */
bcdui.core.status = bcdui.core.status || {};

bcdui.core.status.NullStatus = bcdui._migPjs._classCreate(bcdui.core.Status,
/**
 * @lends bcdui.core.status.NullStatus.prototype
 */
{
  /**
   * @classdesc
   * Initial status status indicating that the status of the respective executable object has not yet been set, the object was just created.
   * Usually the object will change to InitializedStatus immediately.
   * @extends bcdui.core.Status
   * 
   * @constructs
   */
  initialize: function() {},
  getCode: function() { return "NULL"; },
  getDescription: function() { return "[NullStatus]"; },
  equals: function(status) { return status instanceof bcdui.core.status.NullStatus; }
});

bcdui.core.status.InitializedStatus = bcdui._migPjs._classCreate(bcdui.core.Status,
/**
 * @lends bcdui.core.status.InitializedStatus.prototype
 */
{
  /**
   * @classdesc
   * This status is reached as soon as the executable object has been initialized. 
   * This is the standard stable status after object creation. DataProviders are now waiting for execute()
   * @extends bcdui.core.Status
   * 
   * @constructs
   */
  initialize: function() {},
  getCode: function() { return "L0"; },
  getDescription: function() { return "[InitializedStatus]"; },
  equals: function(status) { return status instanceof bcdui.core.status.InitializedStatus; }
});

bcdui.core.status.LoadingStatus = bcdui._migPjs._classCreate(bcdui.core.Status,
/**
 * @lends bcdui.core.status.LoadingStatus.prototype
 */
{
  /**
   * @classdesc
   * This class is active while the executable object is waiting for its document to be loaded.
   * As soon as the server response is complete, the status will switch.
   * @extends bcdui.core.Status
   * 
   * @constructs
   */
  initialize: function() {},
  getCode: function() { return "L1"; },
  getDescription: function() { return "[LoadingStatus]"; },
  equals: function(status) { return status instanceof bcdui.core.status.LoadingStatus; }
});

bcdui.core.status.URLAvailableStatus = bcdui._migPjs._classCreate(bcdui.core.Status,
/**
 * @lends bcdui.core.status.URLAvailableStatus.prototype
 */
{
  /**
   * @classdesc
   * A status that is reached as soon as the executable object got its main URL from its URL data provider.
   * @extends bcdui.core.Status
   * 
   * @constructs
   */
  initialize: function() {},
  getCode: function() { return "L2"; },
  getDescription: function() { return "[URLAvailableStatus]"; },
  equals: function(status) { return status instanceof bcdui.core.status.URLAvailableStatus; }
});

bcdui.core.status.LoadedStatus = bcdui._migPjs._classCreate(bcdui.core.Status,
/**
 * @lends bcdui.core.status.LoadedStatus.prototype
 */
{
  /**
   * @classdesc
   * This status indicates that the main data document of the executable object finished loading.
   * @extends bcdui.core.Status
   * 
   * @constructs
   */
  initialize: function() {},
  getCode: function() { return "L3"; },
  getDescription: function() { return "[LoadedStatus]"; },
  equals: function(status) { return status instanceof bcdui.core.status.LoadedStatus; }
});

bcdui.core.status.LoadFailedStatus = bcdui._migPjs._classCreate(bcdui.core.Status,
/**
 * @lends bcdui.core.status.LoadFailedStatus.prototype
 */
{
  /**
   * @classdesc
   * An generic error status which is reached when loading an XML document has failed.
   * @extends bcdui.core.Status
   * 
   * @constructs
   */
  initialize: function() {},
  getCode: function() { return "F0"; },
  getDescription: function() { return "[LoadFailedStatus]"; },
  equals: function(status) { return status instanceof bcdui.core.status.LoadFailedStatus; }
});

bcdui.core.status.SavingStatus = bcdui._migPjs._classCreate(bcdui.core.Status,
/**
 * @lends bcdui.core.status.SavingStatus.prototype
 */
{
  /**
   * @classdesc
   * This status is active while data is being sent to the server.
   * @extends bcdui.core.Status
   * 
   * @constructs
   */
  initialize: function() {},
  getCode: function() { return "S0"; },
  getDescription: function() { return "[SavingStatus]"; },
  equals: function(status) { return status instanceof bcdui.core.status.SavingStatus; }
});


bcdui.core.status.SavedStatus = bcdui._migPjs._classCreate(bcdui.core.Status,
/**
 * @lends bcdui.core.status.SavedStatus.prototype
 */
{
  /**
   * @classdesc
   * This status is reached after data has been sent to the server.
   * @extends bcdui.core.Status
   * 
   * @constructs
   */
  initialize: function() {},
  getCode: function() { return "S1"; },
  getDescription: function() { return "[SavedStatus]"; },
  equals: function(status) { return status instanceof bcdui.core.status.SavedStatus; }
});

bcdui.core.status.SaveFailedStatus = bcdui._migPjs._classCreate(bcdui.core.Status,
/**
 * @lends bcdui.core.status.SaveFailedStatus.prototype
 */
{
  /**
   * @classdesc
   * An error status indicating that a save operation has failed.
   * @extends bcdui.core.Status
   * 
   * @constructs
   */
  initialize: function() {},
  getCode: function() { return "SF0"; },
  getDescription: function() { return "[SaveFailedStatus]"; },
  equals: function(status) { return status instanceof bcdui.core.status.SaveFailedStatus; }
});


bcdui.core.status.ChainLoadedStatus = bcdui._migPjs._classCreate(bcdui.core.Status,
/**
 * @lends bcdui.core.status.ChainLoadedStatus.prototype
 */
{
  /**
   * @classdesc
   * This status is used by the TransformationChain to signal that the chain document has finished loading.
   * @extends bcdui.core.Status
   * 
   * @constructs
   */
  initialize: function() {},
  getCode: function() { return "MW-1"; },
  getDescription: function() { return "[ChainLoadedStatus]"; },
  equals: function(status) { return status instanceof bcdui.core.status.ChainLoadedStatus; }
});


bcdui.core.status.WaitingForParametersStatus = bcdui._migPjs._classCreate(bcdui.core.Status,
/**
 * @lends bcdui.core.status.WaitingForParametersStatus.prototype
 */
{
  /**
   * @classdesc
   * A status which is active as long as a transformation is waiting for its parameter DataProviders to become ready.
   * If a transformation remains too long in this status, one of its, check why its paramaters or input model did not become ready.
   * @extends bcdui.core.Status
   * 
   * @constructs
   */
  initialize: function() {},
  getCode: function() { return "MW-2"; },
  getDescription: function() { return "[WaitingForParametersStatus]"; },
  equals: function(status) { return status instanceof bcdui.core.status.WaitingForParametersStatus; }
});


bcdui.core.status.TransformingStatus = bcdui._migPjs._classCreate(bcdui.core.Status,
/**
 * @lends bcdui.core.status.TransformingStatus.prototype
 */
{
  /**
   * @classdesc
   * The status indicating that an (XSLT) transformation is currently being executed.
   * @extends bcdui.core.Status
   * 
   * @constructs
   */
  initialize: function() {},
  getCode: function() { return "MW-3"; },
  getDescription: function() { return "[TransformingStatus]"; },
  equals: function(status) { return status instanceof bcdui.core.status.TransformingStatus; }
});


bcdui.core.status.TransformFailedStatus = bcdui._migPjs._classCreate(bcdui.core.Status,
/**
 * @lends bcdui.core.status.TransformFailedStatus.prototype
 */
{
  /**
   * @classdesc
   * This status is activated when a transformation failed.
   * @extends bcdui.core.Status
   * 
   * @constructs
   */
  initialize: function() {},
  getCode: function() { return "MW-8"; },
  getDescription: function() { return "[TransformFailedStatus]"; },
  equals: function(status) { return status instanceof bcdui.core.status.TransformFailedStatus; }
});


bcdui.core.status.TransformedStatus = bcdui._migPjs._classCreate(bcdui.core.Status,
/**
 * @lends bcdui.core.status.TransformedStatus.prototype
 */
{
  /**
   * @classdesc
   * This status is activated when a transformation is finished. A transformation is successfully finished in this status.
   * @extends bcdui.core.Status
   * 
   * @constructs
   */
  initialize: function() {},
  getCode: function() { return "MW-4"; },
  getDescription: function() { return "[TransformedStatus]"; },
  equals: function(status) { return status instanceof bcdui.core.status.TransformedStatus; }
});


bcdui.core.status.ChainLoadingFailed = bcdui._migPjs._classCreate(bcdui.core.Status,
/**
 * @lends bcdui.core.status.ChainLoadingFailed.prototype
 */
{
  /**
   * @classdesc
   * An error state reached when the loading of the chain document has failed.
   * @extends bcdui.core.Status
   * 
   * @constructs
   */
  initialize: function() {},
  getCode: function() { return "F1"; },
  getDescription: function() { return "[ChainLoadingFailed]"; },
  equals: function(status) { return status instanceof bcdui.core.status.ChainLoadingFailed; }
});


bcdui.core.status.ChainStylesheetLoadingFailed = bcdui._migPjs._classCreate(bcdui.core.Status,
/**
 * @lends bcdui.core.status.ChainStylesheetLoadingFailed.prototype
 */
{
  /**
   * @classdesc
   * This error state is activated when one of the style sheets referenced in the chain document could not be loaded.
   * @extends bcdui.core.Status
   * 
   * @constructs
   */
  initialize: function() {},
  getCode: function() { return "F2"; },
  getDescription: function() { return "[ChainStylesheetLoadingFailed]"; },
  equals: function(status) { return status instanceof bcdui.core.status.ChainStylesheetLoadingFailed; }
});


bcdui.core.status.RefreshingModelUpdaters = bcdui._migPjs._classCreate(bcdui.core.Status,
/**
 * @lends bcdui.core.status.RefreshingModelUpdaters.prototype
 */
{
  /**
   * @classdesc
   *   A status indicating that the model is executing the model updaters are auto-updating after
   *   their target model has changed.
   * @extends bcdui.core.Status
   * 
   * @constructs
   */
  initialize: function() {},
  getCode: function() { return "MU-1"; },
  getDescription: function() { return "[RefreshingModelUpdaters]"; },
  equals: function(status) { return status instanceof bcdui.core.status.RefreshingModelUpdaters; }
});

bcdui.core.status.RefreshingModelUpdatersCausedByExecute = bcdui._migPjs._classCreate(bcdui.core.Status,
    /**
     * @lends bcdui.core.status.RefreshingModelUpdatersCausedByExecute.prototype
     */
    {
      /**
       * @classdesc
       *   A status indicating that the model is executing the model updaters are auto-updating after
       *   their target model has been executed.
       * @extends bcdui.core.Status
       * 
       * @constructs
       */
      initialize: function() {},
      getCode: function() { return "MU-2"; },
      getDescription: function() { return "[RefreshingModelUpdatersCausedByExecute]"; },
      equals: function(status) { return status instanceof bcdui.core.status.RefreshingModelUpdatersCausedByExecute; }
    });


bcdui.core.status.WaitingForUncomittedChanges = bcdui._migPjs._classCreate(bcdui.core.Status,
    /**
     * @lends bcdui.core.status.WaitingForUncomittedChanges.prototype
     */
    {
      /**
       * @classdesc
       * This status is activated when there are outstanding writes on the dataprovider
       * @extends bcdui.core.Status
       * 
       * @constructs
       */
      initialize: function() {},
      getCode: function() { return "MW-5"; },
      getDescription: function() { return "[WaitingForUncomittedChanges]"; },
      equals: function(status) { return status instanceof bcdui.core.status.WaitingForUncomittedChanges; }
    });