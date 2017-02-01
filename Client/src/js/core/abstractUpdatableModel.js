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
 * Declares bcdui.core.AbstractUpdatableModel and some private helpers
 */

bcdui.core.AbstractUpdatableModel = bcdui._migPjs._classCreate(bcdui.core.DataProvider,
/**
 * @lends bcdui.core.AbstractUpdatableModel.prototype
 */
{

  /**
   * @classdesc
   *   This is the base class for Model classes which support the usage of {@link bcdui.core.ModelUpdater ModelUpdaters}.
   *   Model updaters are executed on each data modification event.
   * @extends bcdui.core.DataProvider
   * @abstract
   * 
   * @constructs
   * @description 
   * This class is abstract and not meant to be instantiated directly
   */
  initialize: function(args)
    {
      var isLeaf = ((typeof this.type == "undefined")  ? "" + (this.type = "bcdui.core.AbstractUpdatableModel" ): "") != "";

      /**
       * The modelUpdaters attached to this class. The elements of the array are of the
       * type "ModelUpdaterReference".
       * @type Array
       * @private
       */
      this._modelUpdaters = [];

      /**
       * @private
       */
      this._modelUpdatersThatWillBeAddedSoon = {};

      /**
       * A boolean value that becomes "true" as soon as there is a modelUpdate which
       * can make an auto update.
       * @type Boolean
       * @private
       */
      this._hasAutoUpdateModelUpdater = false;
      
      this.waitingForUncomittedChanges = new bcdui.core.status.WaitingForUncomittedChanges();

      /**
       * A status object representing the status when the modelUpdaters are executed (via fire).
       * @constant
       * @private
       */
      this._refreshingModelUpdatersStatus = new bcdui.core.status.RefreshingModelUpdaters();
      /**
       * A status object representing the status when the modelUpdaters are executed (via execute).
       * @constant
       * @private
       */
      this._refreshingModelUpdatersStatusCausedByExecute = new bcdui.core.status.RefreshingModelUpdatersCausedByExecute();

      /**
       * Must be set by sub-classes to the list of status objects that are considered to be
       * ready states for model updaters.
       * @private
       */
      this._readyStatiForModelUpdates = [];

      bcdui.core.DataProvider.call( this, args);

      if (isLeaf)
        this._checkAutoRegister();
    },

  /**
   * This function can be called directly to announce that a model updater will be added
   * soon. As long as there are model updates that are announced, but not yet added the
   * model will not become ready. This function is useful when we do not know the time of
   * declaration of the model updater yet, for example when the model tag and the
   * modelUpdater tag are executed in an unknown order due to their internal dependencies.
   * @param {String} id The model updated id that will be added later with _addModelUpdater.
   * @private
   */
  _waitForModelUpdaterToBeAdded: function(/* String */ id)
    {
      this._modelUpdatersThatWillBeAddedSoon[id] = true;
    },

  /**
   * @private
   */
  _applyModelUpdaters: function(fromExecute, /* Integer? */ currentUpdaterNo)
    {
      if (this._modelUpdaters.length == 0) {
        /*
         * When there are no model updaters we can directly go to the
         * ready status.
         * Must be synchronous (at least for static models without model updaters) because their execute is guaranteed to be sync
         */
        var newStatus = this._uncommitedWrites ? this.waitingForUncomittedChanges : this.getReadyStatus();
        this.setStatus(newStatus);
      } else if (typeof currentUpdaterNo == "undefined") {
        /*
         * On the first call we start with the first model updater.
         */
        this._applyModelUpdaters(fromExecute, 0);
      } else if (currentUpdaterNo == this._modelUpdaters.length) {
        /*
         * We reached the final model updater.
         */
        var newStatus = this._uncommitedWrites ? this.waitingForUncomittedChanges : this.getReadyStatus();
        this.setStatus(newStatus);
      } else if (! fromExecute && this.hasBeenExecutedBefore && !this._modelUpdaters[currentUpdaterNo].autoUpdate) {
        /*
         * Skip non-auto-updating ModelUpdaters if they are ready.
         */
        bcdui.log.isTraceEnabled() && bcdui.log.trace("Skipped non-auto-updating ModelUpdater: " + this._modelUpdaters[currentUpdaterNo]);
        this._applyModelUpdaters(fromExecute, currentUpdaterNo + 1);
      } else {
        /*
         * Run the next model updater in the list.
         */

       var updater = this._modelUpdaters[currentUpdaterNo].updater;
        updater.onReady({ 
          onlyOnce: true,
          onSuccess: function() {
            // take over result and call next updater
            this.dataDoc = updater.getData();
            this._applyModelUpdaters(fromExecute, currentUpdaterNo + 1);
          }.bind(this)
        });
        updater.execute();
      }
    },

  /**
   * Must be provided by implementing class to help it deciding when the model can be executed.
   * @abstract
   * @private
   */
  _getTheStateBeforeRefreshingModelUpdatersStatus: function()
    {
      return null;
    },

  _fire: function(causedByReadyStatus)
    {
      if (! causedByReadyStatus) {
        if (this.isReady() || this.status instanceof bcdui.core.status.WaitingForUncomittedChanges) {
          this.setStatus(this._refreshingModelUpdatersStatus);
        }
      }
      else {
        if (this.isReady()) {
          bcdui.core.DataProvider.prototype._fire.call(this, true);
        }
      }
    },

  /**
   * This event function is called each time a modelUpdater is added. It
   * can be used by implementing classes to deal with for example pending model
   * updaters to be added.
   * @private
   */
  _modelUpdaterAdded: function()
    {
      // To be implemented by sub-classes
    },

  /**
   * Adds a transformation to the list of model updaters which transform the model
   * XML before it is ready.
   * @param updater The transformation that should run on the model XML before it
   * reaches its ready state.
   * @private
   */
  _addModelUpdater: function(/* TransformationChain */ updater, /* Boolean? */ autoUpdate)
    {
      if (typeof updater == "undefined" || updater == null)
        throw Error("Must provide an updater for _addModelUpdater");
      if (!bcdui.util.isFunction(updater.getData))
        throw Error("A model updater must be a data provider (model id: " + this.id + ", updater: " + updater + ")");
      if (!bcdui.util.isFunction(updater.setPrimaryModel))
        throw Error("Model updater must offer setPrimaryModel method");
      if (typeof updater.targetHTMLElementId != "undefined" &&
          updater.targetHTMLElementId != null &&
          !!updater.targetHTMLElementId.trim()) {
        bcdui.log.warn("Added a model updater to the model " + this.id + " which has a targetHTMLElementId set: " + updater);
      }
      updater.setPrimaryModel(new bcdui.core._ModelBeingUpdated({ source: this, name: this.name, readyStatiForModelUpdates: this._readyStatiForModelUpdates }));
      var updaterReference = new bcdui.core.ModelUpdaterReference(updater, autoUpdate);
      this._hasAutoUpdateModelUpdater = this._hasAutoUpdateModelUpdater || updaterReference.autoUpdate;
      this._modelUpdaters.push(updaterReference);
      delete this._modelUpdatersThatWillBeAddedSoon[updater.id];
      this._modelUpdaterAdded();
    }

}); // Create class: bcdui.core.AbstractUpdatableModel


/**
 * @private
 */
bcdui.core.ModelUpdaterReference = bcdui._migPjs._classCreate( null,
/**
 * @lends bcdui.core.ModelUpdaterReference.prototype
 */
{
  /**
   * @classdesc
   * <p>
   *   A reference object encapsulating a model updater which is a transformation
   *   chain object. Additionally it contains a flag indicating if the auto-update
   *   mode is applicable.
   * </p>
   * <p>
   *   This class is internally used by the {@link bcdui.core.AbstractUpdatableModel}
   *   class.
   * </p>

   * @constructs
   * @private
   */
  initialize: function(/* TransformationChain */ updater, /* Boolean? */ autoUpdate)
    {
      /**
       * The model updater object (transformation chain) being referenced by
       * this object.
       * @type bcdui.core.TransformationChain
       * @constant
       */
      this.updater = updater;

      /**
       * True, if the updater should be triggered automatically when the containing
       * model is executed again.
       * @type Boolean
       * @default true
       * @constant
       */
      this.autoUpdate = true;

      /**
       * @ignore
       */
      this.autoUpdate = (typeof autoUpdate == "undefined" || autoUpdate);
    }
});

bcdui.core._ModelBeingUpdated = bcdui._migPjs._classCreate(bcdui.core.DataProviderAlias,
/**
 * @lends bcdui.core._ModelBeingUpdated.prototype
 */
{
  /**
   * @classdesc
   * <p>
   *   This internal class is a wrapper for a {@link bcdui.core.DataProvider} derived class
   *   which slightly modifies its behavior in that it reports to be ready BEFORE its
   *   modelUpdaters have been executed. Normally the DataProvider would reach its
   *   ready state after that. However some DataProviders - especially in the
   *   of the modelUpdaters themselves - need access to the model a bit earlier.
   * </p>
   * @extends bcdui.core.DataProviderAlias
   *
   * @constructs
   * @override
   * @param {Object}                  args        - The argument map:
   * @param {bcdui.core.DataProvider} args.source - The data provider to be wrapped
   * @param {string}                  args.name:  - The new name of the data provider
   * @private
   */
  initialize: function(args)
    {
    var isLeaf = ((typeof this.type == "undefined")  ? "" + (this.type = "bcdui.core._ModelBeingUpdated" ): "") != "";

    this._readyStatiForModelUpdates = jQuery.makeArray(args.readyStatiForModelUpdates);
    bcdui.core.DataProviderAlias.call( this, args);

    if (isLeaf)
      this._checkAutoRegister();
  },

  /**
   * @private
   */
  _isSourceReadyStatus: function(/* Status */ status)
    {
      return this._readyStatiForModelUpdates.some(
          function(readyStatus) { return status.equals(readyStatus) });
    },

  toString: function()
    {
      return "[_ModelBeingUpdated for Model: " + this.source.id + "]";
    }
}); // Create class: bcdui.core._ModelBeingUpdated
