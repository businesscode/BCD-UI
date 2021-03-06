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

/**
 * Initial status status indicating that the status of the respective executable object has not yet been set, the object was just created.
 * Usually the object will change to InitializedStatus immediately.
 * @extends bcdui.core.Status 
 */
bcdui.core.status.NullStatus = class extends bcdui.core.Status

{
  constructor() {super();}
  getCode() { return "NULL"; }
  getDescription() { return "[NullStatus]"; }
  equals(status) { return status instanceof bcdui.core.status.NullStatus; }
};

/**
 * This status is reached as soon as the executable object has been initialized. 
 * This is the standard stable status after object creation. DataProviders are now waiting for execute()
 * @extends bcdui.core.Status
 */
bcdui.core.status.InitializedStatus = class extends bcdui.core.Status

{
  constructor() {super();}
  getCode() { return "L0"; }
  getDescription() { return "[InitializedStatus]"; }
  equals(status) { return status instanceof bcdui.core.status.InitializedStatus; }
};

/**
 * This class is active while the executable object is waiting for its document to be loaded.
 * As soon as the server response is complete, the status will switch.
 * @extends bcdui.core.Status
 */
bcdui.core.status.LoadingStatus = class extends bcdui.core.Status

{

  constructor() {super();}
  getCode() { return "L1"; }
  getDescription() { return "[LoadingStatus]"; }
  equals(status) { return status instanceof bcdui.core.status.LoadingStatus; }
};

/**
 * A status that is reached as soon as the executable object got its main URL from its URL data provider.
 * @extends bcdui.core.Status
 */
bcdui.core.status.URLAvailableStatus = class extends bcdui.core.Status

{
  constructor() {super();}
  getCode() { return "L2"; }
  getDescription() { return "[URLAvailableStatus]"; }
  equals(status) { return status instanceof bcdui.core.status.URLAvailableStatus; }
};

/**
 * This status indicates that the main data document of the executable object finished loading.
 * @extends bcdui.core.Status
 */
bcdui.core.status.LoadedStatus = class extends bcdui.core.Status

{
  constructor() {super();}
  getCode() { return "L3"; }
  getDescription() { return "[LoadedStatus]"; }
  equals(status) { return status instanceof bcdui.core.status.LoadedStatus; }
};

/**
 * An generic error status which is reached when loading an XML document has failed.
 * @extends bcdui.core.Status
 */
bcdui.core.status.LoadFailedStatus = class extends bcdui.core.Status

{
  constructor() {super();}
  getCode() { return "F0"; }
  getDescription() { return "[LoadFailedStatus]"; }
  equals(status) { return status instanceof bcdui.core.status.LoadFailedStatus; }
};

/**
 * This status is active while data is being sent to the server.
 * @extends bcdui.core.Status
 */
bcdui.core.status.SavingStatus = class extends bcdui.core.Status

{
  constructor() {super();}
  getCode() { return "S0"; }
  getDescription() { return "[SavingStatus]"; }
  equals(status) { return status instanceof bcdui.core.status.SavingStatus; }
};

/**
 * This status is reached after data has been sent to the server.
 * @extends bcdui.core.Status
 */
bcdui.core.status.SavedStatus = class extends bcdui.core.Status

{
  constructor() {super();}
  getCode() { return "S1"; }
  getDescription() { return "[SavedStatus]"; }
  equals(status) { return status instanceof bcdui.core.status.SavedStatus; }
};

/**
 * An error status indicating that a save operation has failed.
 * @extends bcdui.core.Status
 */
bcdui.core.status.SaveFailedStatus = class extends bcdui.core.Status

{
  constructor() {super();}
  getCode() { return "SF0"; }
  getDescription() { return "[SaveFailedStatus]"; }
  equals(status) { return status instanceof bcdui.core.status.SaveFailedStatus; }
};


/**
 * This status is used by the TransformationChain to signal that the chain document has finished loading.
 * @extends bcdui.core.Status
 */
bcdui.core.status.ChainLoadedStatus = class extends bcdui.core.Status

{
  constructor() {super();}
  getCode() { return "MW-1"; }
  getDescription() { return "[ChainLoadedStatus]"; }
  equals(status) { return status instanceof bcdui.core.status.ChainLoadedStatus; }
};

/**
 * A status which is active as long as a transformation is waiting for its parameter DataProviders to become ready.
 * If a transformation remains too long in this status, one of its, check why its paramaters or input model did not become ready.
 * @extends bcdui.core.Status
 */
bcdui.core.status.WaitingForParametersStatus =class extends bcdui.core.Status

{
  constructor() {super();}
  getCode() { return "MW-2"; }
  getDescription() { return "[WaitingForParametersStatus]"; }
  equals(status) { return status instanceof bcdui.core.status.WaitingForParametersStatus; }
};

/**
 * The status indicating that an (XSLT) transformation is currently being executed.
 * @extends bcdui.core.Status
 */
bcdui.core.status.TransformingStatus = class extends bcdui.core.Status

{
  constructor() {super();}
  getCode() { return "MW-3"; }
  getDescription() { return "[TransformingStatus]"; }
  equals(status) { return status instanceof bcdui.core.status.TransformingStatus; }
};

/**
 * This status is activated when a transformation failed.
 * @extends bcdui.core.Status
 */
bcdui.core.status.TransformFailedStatus = class extends bcdui.core.Status

{
  constructor() {super();}
  getCode() { return "MW-8"; }
  getDescription() { return "[TransformFailedStatus]"; }
  equals(status) { return status instanceof bcdui.core.status.TransformFailedStatus; }
};

/**
 * This status is activated when a transformation is finished. A transformation is successfully finished in this status.
 * @extends bcdui.core.Status
 */
bcdui.core.status.TransformedStatus = class extends bcdui.core.Status

{
  constructor() {super();}
  getCode() { return "MW-4"; }
  getDescription() { return "[TransformedStatus]"; }
  equals(status) { return status instanceof bcdui.core.status.TransformedStatus; }
};

/**
 * An error state reached when the loading of the chain document has failed.
 * @extends bcdui.core.Status
 */
bcdui.core.status.ChainLoadingFailed = class extends bcdui.core.Status

{
  constructor() {super();}
  getCode() { return "F1"; }
  getDescription() { return "[ChainLoadingFailed]"; }
  equals(status) { return status instanceof bcdui.core.status.ChainLoadingFailed; }
};

/**
 * This error state is activated when one of the style sheets referenced in the chain document could not be loaded.
 * @extends bcdui.core.Status
 */
bcdui.core.status.ChainStylesheetLoadingFailed = class extends bcdui.core.Status

{
  constructor() {super();}
  getCode() { return "F2"; }
  getDescription() { return "[ChainStylesheetLoadingFailed]"; }
  equals(status) { return status instanceof bcdui.core.status.ChainStylesheetLoadingFailed; }
};

/**
 *   A status indicating that the model is executing the model updaters are auto-updating after
 *   their target model has changed.
 * @extends bcdui.core.Status
 */
bcdui.core.status.RefreshingModelUpdaters = class extends bcdui.core.Status

{
  constructor() {super();}
  getCode() { return "MU-1"; }
  getDescription() { return "[RefreshingModelUpdaters]"; }
  equals(status) { return status instanceof bcdui.core.status.RefreshingModelUpdaters; }
};

/**
 *   A status indicating that the model is executing the model updaters are auto-updating after
 *   their target model has been executed.
 * @extends bcdui.core.Status
 */
bcdui.core.status.RefreshingModelUpdatersCausedByExecute = class extends bcdui.core.Status

    {
      constructor() {super();}
      getCode() { return "MU-2"; }
      getDescription() { return "[RefreshingModelUpdatersCausedByExecute]"; }
      equals(status) { return status instanceof bcdui.core.status.RefreshingModelUpdatersCausedByExecute; }
    };

/**
 * This status is activated when there are outstanding writes on the dataprovider
 * @extends bcdui.core.Status
 */
bcdui.core.status.WaitingForUncomittedChanges = class extends bcdui.core.Status

    {
      constructor() {super();}
      getCode() { return "MW-5"; }
      getDescription() { return "[WaitingForUncomittedChanges]"; }
      equals(status) { return status instanceof bcdui.core.status.WaitingForUncomittedChanges; }
    };