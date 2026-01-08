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
  /**
   * @inheritDoc
   */
  getCode() { return "NULL"; }
  /**
   * @inheritDoc
   */
  getDescription() { return "[NullStatus]"; }
  /**
   * @inheritDoc
   */
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
  /**
   * @inheritDoc
   */
  getCode() { return "L0"; }
  /**
   * @inheritDoc
   */
  getDescription() { return "[InitializedStatus]"; }
  /**
   * @inheritDoc
   */
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
  /**
   * @inheritDoc
   */
  getCode() { return "L1"; }
  /**
   * @inheritDoc
   */
  getDescription() { return "[LoadingStatus]"; }
  /**
   * @inheritDoc
   */
  equals(status) { return status instanceof bcdui.core.status.LoadingStatus; }
};

/**
 * A status that is reached as soon as the executable object got its main URL from its URL data provider.
 * @extends bcdui.core.Status
 */
bcdui.core.status.URLAvailableStatus = class extends bcdui.core.Status
{
  constructor() {super();}
  /**
   * @inheritDoc
   */
  getCode() { return "L2"; }
  /**
   * @inheritDoc
   */
  getDescription() { return "[URLAvailableStatus]"; }
  /**
   * @inheritDoc
   */
  equals(status) { return status instanceof bcdui.core.status.URLAvailableStatus; }
};

/**
 * This status indicates that the main data document of the executable object finished loading.
 * @extends bcdui.core.Status
 */
bcdui.core.status.LoadedStatus = class extends bcdui.core.Status

{
  constructor() {super();}
  /**
   * @inheritDoc
   */
  getCode() { return "L3"; }
  /**
   * @inheritDoc
   */
  getDescription() { return "[LoadedStatus]"; }
  /**
   * @inheritDoc
   */
  equals(status) { return status instanceof bcdui.core.status.LoadedStatus; }
};

/**
 * An generic error status which is reached when loading an XML document has failed.
 * @extends bcdui.core.Status
 */
bcdui.core.status.LoadFailedStatus = class extends bcdui.core.Status

{
  constructor() {super();}
  /**
   * @inheritDoc
   */
  getCode() { return "F0"; }
  /**
   * @inheritDoc
   */
  getDescription() { return "[LoadFailedStatus]"; }
  /**
   * @inheritDoc
   */
  equals(status) { return status instanceof bcdui.core.status.LoadFailedStatus; }
};

/**
 * This status is active while data is being sent to the server.
 * @extends bcdui.core.Status
 */
bcdui.core.status.SavingStatus = class extends bcdui.core.Status
{
  constructor() {super();}
  /**
   * @inheritDoc
   */
  getCode() { return "S0"; }
  /**
   * @inheritDoc
   */
  getDescription() { return "[SavingStatus]"; }
  /**
   * @inheritDoc
   */
  equals(status) { return status instanceof bcdui.core.status.SavingStatus; }
};

/**
 * This status is reached after data has been sent to the server.
 * @extends bcdui.core.Status
 */
bcdui.core.status.SavedStatus = class extends bcdui.core.Status
{
  constructor() {super();}
  /**
   * @inheritDoc
   */
  getCode() { return "S1"; }
  /**
   * @inheritDoc
   */
  getDescription() { return "[SavedStatus]"; }
  /**
   * @inheritDoc
   */
  equals(status) { return status instanceof bcdui.core.status.SavedStatus; }
};

/**
 * An error status indicating that a save operation has failed.
 * @extends bcdui.core.Status
 */
bcdui.core.status.SaveFailedStatus = class extends bcdui.core.Status
{
  constructor() {super();}
  /**
   * @inheritDoc
   */
  getCode() { return "SF0"; }
  /**
   * @inheritDoc
   */
  getDescription() { return "[SaveFailedStatus]"; }
  /**
   * @inheritDoc
   */
  equals(status) { return status instanceof bcdui.core.status.SaveFailedStatus; }
};


/**
 * This status is used by the TransformationChain to signal that the chain document has finished loading.
 * @extends bcdui.core.Status
 */
bcdui.core.status.ChainLoadedStatus = class extends bcdui.core.Status
{
  constructor() {super();}
  /**
   * @inheritDoc
   */
  getCode() { return "MW-1"; }
  /**
   * @inheritDoc
   */
  getDescription() { return "[ChainLoadedStatus]"; }
  /**
   * @inheritDoc
   */
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
  /**
   * @inheritDoc
   */
  getCode() { return "MW-2"; }
  /**
   * @inheritDoc
   */
  getDescription() { return "[WaitingForParametersStatus]"; }
  /**
   * @inheritDoc
   */
  equals(status) { return status instanceof bcdui.core.status.WaitingForParametersStatus; }
};

/**
 * The status indicating that an (XSLT) transformation is currently being executed.
 * @extends bcdui.core.Status
 */
bcdui.core.status.TransformingStatus = class extends bcdui.core.Status
{
  constructor() {super();}
  /**
   * @inheritDoc
   */
  getCode() { return "MW-3"; }
  /**
   * @inheritDoc
   */
  getDescription() { return "[TransformingStatus]"; }
  /**
   * @inheritDoc
   */
  equals(status) { return status instanceof bcdui.core.status.TransformingStatus; }
};

/**
 * This status is activated when a transformation failed.
 * @extends bcdui.core.Status
 */
bcdui.core.status.TransformFailedStatus = class extends bcdui.core.Status
{
  constructor() {super();}
  /**
   * @inheritDoc
   */
  getCode() { return "MW-8"; }
  /**
   * @inheritDoc
   */
  getDescription() { return "[TransformFailedStatus]"; }
  /**
   * @inheritDoc
   */
  equals(status) { return status instanceof bcdui.core.status.TransformFailedStatus; }
};

/**
 * This status is activated when a transformation is finished. A transformation is successfully finished in this status.
 * @extends bcdui.core.Status
 */
bcdui.core.status.TransformedStatus = class extends bcdui.core.Status
{
  constructor() {super();}
  /**
   * @inheritDoc
   */
  getCode() { return "MW-4"; }
  /**
   * @inheritDoc
   */
  getDescription() { return "[TransformedStatus]"; }
  /**
   * @inheritDoc
   */
  equals(status) { return status instanceof bcdui.core.status.TransformedStatus; }
};

/**
 * An error state reached when the loading of the chain document has failed.
 * @extends bcdui.core.Status
 */
bcdui.core.status.ChainLoadingFailed = class extends bcdui.core.Status
{
  constructor() {super();}
  /**
   * @inheritDoc
   */
  getCode() { return "F1"; }
  /**
   * @inheritDoc
   */
  getDescription() { return "[ChainLoadingFailed]"; }
  /**
   * @inheritDoc
   */
  equals(status) { return status instanceof bcdui.core.status.ChainLoadingFailed; }
};

/**
 * This error state is activated when one of the style sheets referenced in the chain document could not be loaded.
 * @extends bcdui.core.Status
 */
bcdui.core.status.ChainStylesheetLoadingFailed = class extends bcdui.core.Status
{
  constructor() {super();}
  /**
   * @inheritDoc
   */
  getCode() { return "F2"; }
  /**
   * @inheritDoc
   */
  getDescription() { return "[ChainStylesheetLoadingFailed]"; }
  /**
   * @inheritdoc
   */
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
  /**
   * @inheritdoc
   */
  getCode() { return "MU-1"; }
  /**
   * @inheritdoc
   */
  getDescription() { return "[RefreshingModelUpdaters]"; }
  /**
   * @inheritdoc
   */
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
  /**
   * @inheritdoc
   */
  getCode() { return "MU-2"; }
  /**
   * @inheritdoc
   */
  getDescription() { return "[RefreshingModelUpdatersCausedByExecute]"; }
  /**
   * @inheritdoc
   */
  equals(status) { return status instanceof bcdui.core.status.RefreshingModelUpdatersCausedByExecute; }
};

/**
 * This status is activated when there are outstanding writes on the dataprovider
 * @extends bcdui.core.Status
 */
bcdui.core.status.WaitingForUncomittedChanges = class extends bcdui.core.Status
{
  constructor() {super();}
  /**
   * @inheritdoc
   */
  getCode() { return "MW-5"; }
  /**
   * @inheritdoc
   */
  getDescription() { return "[WaitingForUncomittedChanges]"; }
  /**
   * @inheritdoc
   */
  equals(status) { return status instanceof bcdui.core.status.WaitingForUncomittedChanges; }
};