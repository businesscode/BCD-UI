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
 * Container file for the AbstractExecutable class.
 */

bcdui.core.AbstractExecutable = bcdui._migPjs._classCreate( null,
/**
 * @lends bcdui.core.AbstractExecutable.prototype
 */
{

  /**
   * @classdesc
   * The abstract executable class is a base class for asynchronous operating status-based classes in BCD-UI library. It offers a basic set of
   * methods that these classes share. Most methods deal with status handling, transitions, listeners and synchronization.
   * @abstract
   *
   * @constructs
   * @description 
   * The constructor which must be called by all sub-classes. It initializes the listeners, status and id fields.
   * This class is abstract and not meant to be instantiated directly
   * @param {Object} [args] Parameter object
   * @param {string} [args.id] A unique id for declarative contexts
   * @throws Error An Error is thrown if id is not unique, i.e. an object with the same id is already registered.
   */
  initialize: function(/* object */ args)
    {
      var isLeaf = ((typeof this.type == "undefined")  ? "" + (this.type = "bcdui.core.AbstractExecutable" ): "") != "";
    
      /**
       * A globally unique id of the object. DataProviders do also register themselves at {@link bcdui.factory.objectRegistry} when an id is provided to the constructor. 
       * This id is only needed in declarative contexts, like jsp or, when a DataProvider is accessed in a xPath like <bcd-input targetModelId="$myModelId/ns:Root/ns:MyValue"/>.
       * If not provided in the constructor, an id is set but the object is not automatically registered.
       * @type {string}
       * @constant
       */
      this.id = "";
      this._doRegister = false;
      if (typeof args != "undefined" && typeof args.id != "undefined") {
        this.id = "" + args.id;
        // id is given, do register object
        this._doRegister = true;
      } else {
        // id is not given, generate temporary one but do not register object
        this.id = bcdui.core._generateTemporaryId();
      }

      /**
       * the debug context, only available in case bcdui.isDebug is true
       * @private
       */
      if(bcdui.isDebug){
        this.debug = args.debug;
      }

      /**
       * The listeners assigned to this class. This array is controlled
       * by various status listener functions such ass "addStatusListener".
       * @type {Object}
       * @private
       */
      this.listeners = { };

      /**
       * The undefined status.
       * @type {bcdui.core.status.NullStatus}
       * @constant
       * @private
       */
      this.nullStatus = new bcdui.core.status.NullStatus();

      /**
       * The current status of the object. This variable should not be used
       * directly. Instead the getStatus method and the status listener
       * mechanism should be used.
       * @type Status
       * @private
       */
      this.status = this.nullStatus;

      /**
       * There listeners of the nullStatus get all status events. We initialize
       * the listeners map with this global scope.
       * @private
       */
      this.listeners[this.nullStatus.getCode()] = [];

      /**
       * This array contains a list of objects with a "timestamp" and a "status"
       * field. It is cleared on each execute operation.
       * @type Array
       * @private
       */
      this.statusTransitionTiming = [];

      /**
       * A flag that will be set to true as soon as the ready or failed state is
       * reached once.
       * @type Boolean
       * @private
       */
      this.hasBeenExecutedBefore = false;
      
      if (isLeaf)
        this._checkAutoRegister();
    },

    /**
     * Register object in case an id was given at initialization
     * @private
     */
    _checkAutoRegister: function() {
     if (this._doRegister)
       bcdui.factory.objectRegistry.registerObject(this);
   },

  /**
   * Auxiliary function for the status listener functions. This function extracts
   * an array of status objects the listener should be attached to.
   * @param args The args param can either be a Status object, undefined, an
   * array of Status objects or a map with the key "status" holding an array
   * of Status objects.
   * @return Array An array of status objects extracted from the argument map.
   * @private
   */
  _extractStatusListFromArgs: function(/* object */ args)
    {
      if (typeof args == "object") {
        if (args instanceof bcdui.core.Status) {
          return [ args ];
        }
        if (typeof args.status == "undefined") {
          return [ this.nullStatus ];
        }
        if (Array.isArray(args.status)) {
          return args.status;
        }
        if (typeof args.status == "object" && args.status instanceof bcdui.core.Status) {
          return [ args.status ];
        }
        throw Error("Argument \"status\" in map must be of type bcdui.core.Status");
      } else {
        return [ this.nullStatus ];
      }
    },

  /**
   * Counter-part of the "_extractStatusListFromArgs" function which is responsible
   * for extracting the listener from the args object. It is also used by the status
   * functions.
   * @param args The args can either be a {@link bcdui.core.StatusListener StatusListener} object, a function or a
   * parameter map with a "listener" property holding a StatusListener or function.
   * @return {Function|bcdui.core.StatusListener} The listener taken from the args.
   * @throws Error An error is thrown when no status listener can be extracted.
   * @private
   */
  _extractListenerObjectOrFunctionFromArgs: function(/* object */ args)
    {
      var listener = args;
      if (typeof args == "object") {
        if (((typeof args.listener == "object") && (args.listener instanceof bcdui.core.StatusListener))
            || typeof args.listener == "function") {
          listener = args.listener;
        } else if (!(args instanceof bcdui.core.StatusListener)) {
          throw Error("Paramater map must contain a listener attribute of type bcdui.core.StatusListener.");
        }
      } else if (typeof args != "function") {
        throw Error("Argument must be of type bcdui.core.StatusListener");
      }
      return listener;
    },

  /**
   * Removes the specified listener from the listeners map.
   * @param listener The listener to be removed. This can either be a function or
   * a StatusListener object.
   * @param statusCode The status code the listener is assigned to.
   * @private
   */
  _removeStatusListenerFromCodeMapping: function(/* StatusListener|function */ listener, /* Status */ statusCode)
    {
      if (typeof this.listeners[statusCode] == "undefined") return;
      this.listeners[statusCode] = this.listeners[statusCode].filter(function(item) {
        return item.listener !== listener;
      });
    },

  /**
   * Adds a status listener to this object which will be informed in case of status
   * transitions. The status listener must listen to either one specific event or
   * all events.
   * Call {@link bcdui.core.AbstractExecutable#removeStatusListener removeStatusListener()} to remove the listener.
   * @param {(function|object)} args - Either a function executed on all status transitions <p/>or a parameter map with the following properties:
   * @param {(function|bcdui.core.StatusListener)} args.listener - A function or StatusListener object representing the listener action.
   * @param {bcdui.core.Status=} args.status - The status it should listen to. 
   *   If it is missing the listener is executed on all status transitions, otherwise it is executed when the status is set to the specified status.
   * @param {boolean} [args.onlyOnce=false] - A boolean variable indicating that the listener should be automatically removed after it has been executed. 
   */
  addStatusListener: function(/* function|StatusListener|object */ args)
    {
      var listener = this._extractListenerObjectOrFunctionFromArgs(args);
      this._extractStatusListFromArgs(args).forEach(function(status) {
        if (typeof this.listeners[status.getCode()] == "undefined") {
          this.listeners[status.getCode()] = [];
        }
        this.listeners[status.getCode()].push({ "listener": listener, "status": status, "onlyOnce": args["onlyOnce"] == true } );
      }, this);
    },

  /**
   * Removes the provided status listener from this instance, added via {@link bcdui.core.AbstractExecutable#addStatusListener addStatusListener()} before.
   * @param {Object} args The listener to be removed. This can either be a function or a {@link bcdui.core.StatusListener StatusListener} or a parameter map. In the latter case the map
   *   can contain the following fields
   * @param {function|bcdui.core.StatusListener} args.listener - A function <p/>or StatusListener object representing the listener action.
   * @param {bcdui.core.Status}                  args.status   - The status this listener is listening to. 
   *   If it is missing the it is assumed that the listener belongs to the global scope.
   */
  removeStatusListener: function(/* function|StatusListener|object */ args)
    {
      var listener = this._extractListenerObjectOrFunctionFromArgs(args);
      this._extractStatusListFromArgs(args).forEach(function(status) {
        if (status.equals(this.nullStatus)) {
          for (var statusCode in this.listeners) {
            this._removeStatusListenerFromCodeMapping(listener, statusCode);
          };
        } else {
          this._removeStatusListenerFromCodeMapping(listener, status.getCode());
        }
      }, this);
    },

  /**
   * Fires a status event to the responsible listeners.
   * @param args The args parameter map must either be an instance of the
   * Status object or a parameter map containing a "status" property holding
   * a Status object.
   * @private
   */
  _fireStatusEvent: function(/* Status */ args)
    {
      if (typeof args == "object") {
        var status = null;
        if (args instanceof bcdui.core.Status) {
          status = args;
        } else if (typeof args.status != "undefined") {
          status = args.status;
        } else {
          throw Error("Argument must be of type bcdui.core.Status");
        }
        var statusEvent = new bcdui.core.StatusEvent({
          "status": status,
          "source": this
        });

        // Per convention, listeners to nullStatus want to listen to all status events
        var listeners = [];
        var originalListeners = this.listeners[this.nullStatus.getCode()];
        var offset = 0;
        for (var idx = 0; idx < originalListeners.length; ++idx) {
          listeners.push(originalListeners[idx]);
          originalListeners[idx - offset] = originalListeners[idx];
          if (originalListeners[idx].onlyOnce) {
            ++offset;
          }
        }
        // And there are listener which only listen for a specified status
        originalListeners.length -= offset;
        originalListeners = this.listeners[status.getCode()];
        if (Array.isArray(originalListeners)) {
          offset = 0;
          for (var idx = 0; idx < originalListeners.length; ++idx) {
            if (originalListeners[idx].status.equals(status)) {
              listeners.push(originalListeners[idx]);
            }
            originalListeners[idx - offset] = originalListeners[idx];
            if (originalListeners[idx].onlyOnce) {
              ++offset;
            }
          }
          originalListeners.length -= offset;
        }

        var firingId = this.id;

        // We call the listeners here async, to prevent browser freezing as much as possible
        // We call the first one last because usually we ourself are our first listener and calling us first
        // would mean going to the next status before calling the external listeners for the current status.
        // Note that due to setTimeout() it is not guaranteed that the order is kept 100%
        var reversedListeners = listeners.slice(0).reverse();
        if( reversedListeners.length>1 )  // Do not push an undefined into list in case there is none (==0). and there is not need to shift if there is only one (==1)
          reversedListeners.push(reversedListeners.shift());
        var isReadyStatus = this.getReadyStatus().equals(status);
        reversedListeners.forEach(function(lst) {
          try {
            if( isReadyStatus && reversedListeners.length>1 ) {
              if (typeof lst.listener == "function") setTimeout( lst.listener.bind(undefined,statusEvent) );
              else setTimeout( lst.listener.handleStatusEvent.bind(undefined,statusEvent) );
            } else {
              if (typeof lst.listener == "function") lst.listener(statusEvent);
              else lst.listener.handleStatusEvent(statusEvent);
            }
          } catch(e) {
            var msg = "";
            if( e.stack )
              msg = e.stack.substring(0,500)
            else
              msg = "Error:" + e.message;
            bcdui.log.error(msg+"\n(In a listener for: '"+firingId+"', on status event: '"+status+"') ");
            window["console"] && console.error && console.error(msg, e);
          }
        });
      } else {
        throw Error("Argument must be of type bcdui.core.Status");
      }
    },

  /**
   * Makes a transition from the current status to the new status if they
   * are not equal. After the status is changed it fires the status event
   * to the registered listeners.<p/>
   * Usually this method will only be called by the library but you can use it to re-trigger an action. For available statuses and their effect, see the concrete class,
   * @param {bcdui.core.Status} args Either a Status object or a parameter map with a property
   * "status" holding a Status object.
   */
  setStatus: function(/* Status */ args)
    {
      var oldStatus = this.status;
      var status = this._extractStatusListFromArgs(args)[0];
      if (!this.nullStatus.equals(status) && !this.status.equals(status)) {
        if( bcdui.log.isDebugEnabled() && this.getReadyStatus().equals(status) ) {
          var logMsg = "Ready "+this.toString({verbosity:1});
          if( this.getData() && ! this.targetHTMLElementId ) // Wrapper with data
            logMsg += ((this.getData().nodeType ? new XMLSerializer().serializeToString(this.getData()).length : this.getData().length) /1000).toFixed(1)+"k";
          bcdui.log.isDebugEnabled() && bcdui.log.debug(logMsg);
        }
        this.status = status;
        var obj = { status: status, timestamp: new Date().getTime() };
        this.statusTransitionTiming.push(obj);
        this._fireStatusEvent({ "status": status, "oldStatus": oldStatus });
        obj.timestampAfterEventHandling = new Date().getTime();
        this.hasBeenExecutedBefore = this.hasBeenExecutedBefore || this.isReady() || this.hasFailed();
        if( this.isReady() ) {
          bcdui.debug._removeCurrExecuting( this.id );
        } else if( this.status !== this.nullStatus && this.status !== this.initializedStatus ) {
          bcdui.debug._addCurrExecuting( this.id );
        }
      }
      return {oldStatus: oldStatus, newStatus: status};
    },

  /**
   * Getter for the status of this object. See {@link bcdui.core.status} for possible return values.
   * @return {bcdui.core.Status} The current status.
   */
  getStatus: function()
    {
      return this.status;
    },

  /**
   * Tests if the current state is the readyStatus. This status is the same
   * status as returned by "getReadyStatus".
   * @return {boolean} True, if the object is ready.
   */
  isReady: function()
    {
      return this.status.equals(this.getReadyStatus());
    },

  /**
   * Tests if the object has reached a failure status. These status codes are
   * returned by the "getFailedStatus" method.
   * @return {boolean} True, if the object's process has failed.
   */
  hasFailed: function()
    {
      var failedStati = this.getFailedStatus();
      if (!Array.isArray(failedStati)) failedStati = [ failedStati ];
      return failedStati.some(function(failedStatus) { return this.status.equals(failedStatus); }, this);
    },

  /**
   * Getter for the ready status of the instance. This status is a final state
   * defined by each sub-class which is reached when the process has finished
   * normally.
   * @return {bcdui.core.Status} The status object indicating that the process belonging
   * to this class is finished.
   * @abstract
   */
  getReadyStatus: function()
    {
      throw Error("Abstract method: bcdui.core.AbstractExecutable.getReadyStatus");
    },

  /**
   * Getter for the list of error statuses of this class. This implementation returns an
   * empty list.
   * @abstract
   * @return {bcdui.core.Status[]} The status objects corresponding to failures in the object's
   * process.
   */
  getFailedStatus: function()
    {
      return [];
    },

  /**
   * Loops over all status publishers and tests if the isReady function returns
   * true.
   * @return {boolean} True, if all statusPublishers are ready.
   * @private
   */
  _areAllReady: function(/* array */ statusPublishers)
    {
      return statusPublishers.every(function(statusPublisher) {
        return statusPublisher.isReady();
      });
    },

  /**
   * A utility function potentially asynchronously waiting until all
   * "dependentStatusPublishers" objects are ready. Then it sets the status
   * to the provided one.
   * @param newStatus The new status to be set as soon as all publishers are
   * ready.
   * @param dependentStatusPublishers The array of status publishers that
   * are required to be ready before the status change happens.
   * @private
   */
  _synchronizedStatusTransition: function(/* Status */ newStatus, /* array */ dependentStatusPublishers, /* Function? */ failureCallback)
    {
      if (this._areAllReady(dependentStatusPublishers)) {
        this.setStatus(newStatus);
      } else {
        var waitingCounter = 0;
        var traceWaitingFor = traceExecutedSync = "";  // log messages
        dependentStatusPublishers.forEach(function(statusPublisher) {
          if (!statusPublisher.isReady()) {
            ++waitingCounter;

            statusPublisher.execute(); // Sync status publishers are handled here with low overhead

            if (!statusPublisher.isReady()) {
              traceWaitingFor += statusPublisher.id+", ";
              statusPublisher.addStatusListener({
                status: statusPublisher.getReadyStatus(),
                onlyOnce: true,
                listener: function() {
                  if (--waitingCounter == 0) {
                    if (this.hasFailed()) {
                      bcdui.log.warn("Skipping further processing, beacuse loading has already failed.");
                    } else {
                      this.setStatus(newStatus);
                    }
                  }
                }.bind(this)
              });
              if (typeof failureCallback != "undefined") {
                var failedStati = statusPublisher.getFailedStatus();
                (Array.isArray(failedStati) ? failedStati : [ failedStati ]).forEach(function(failedStatus) {
                  statusPublisher.addStatusListener({
                    status: failedStatus,
                    onlyOnce: true,
                    listener: failureCallback
                  });
                }, this);
              }
            } else {
              if (--waitingCounter == 0) {
                if (this.hasFailed()) {
                  bcdui.log.warn("Skipping further processing, beacuse loading has already failed.");
                } else {
                  this.setStatus(newStatus);
                }
              } else
              traceExecutedSync += statusPublisher.id+", ";
            }
          }
        }.bind(this));
        if( bcdui.log.isTraceEnabled() && traceWaitingFor || traceExecutedSync )
          bcdui.log.isTraceEnabled() && bcdui.log.trace(this.toString() + (traceWaitingFor ? "; is waiting for "+traceWaitingFor : "") + (traceExecutedSync? "; did execute sync "+traceExecutedSync : "") );
      }
    },

  /**
   * @abstract
   * @return {string} Debug string with this class and its id.
   */
  toString: function()
    {
      return "[Abstract Executable: " + this.id + "]";
    },

  /**
   * Executes the process implemented by the concrete sub-class.
   * @param {boolean} [doesRefresh=true] Set this parameter to "false" if this method should do
   * nothing when the object is already in the ready status. The default is "true"
   * meaning that the process is re-started when it is currently ready.
   */
  execute: function(/* boolean? */ doesRefresh)
    {
      // The actual process is implemented in the "_executeImpl" method so that the "execute" method should normally not be overridden in sub-classes.
      if (doesRefresh == false && this.getStatus().equals(this.getReadyStatus())) {
        // nothing
      } else {
        this.statusTransitionTiming = [];
        var obj = { status: this.status, timestamp: new Date().getTime() };
        this.statusTransitionTiming.push(obj);
        this._executeImpl();
      }
    },
    
    /**
     * Add callback to abstractExecutable which is triggered exactly once when ready state is reached
     * 
     * Please note: the callback routines are always called asynchronously (even if ready state is already given)
     * @param {(function|Object)} listenerObject - Either a function to be called on ready status (i.e. onSuccess)<p/>or a parameter map with the following properties:
     * @param {function} listenerObject.onSuccess - callback function which is called when {@link bcdui.core.AbstractExecutable} is or gets ready
     * @param {function} [listenerObject.onFailure] - callback function which is called when {@link bcdui.core.AbstractExecutable} gets into failed status
     * @param {boolean}  [listenerObject.executeIfNotReady=false] - do execute {@link bcdui.core.AbstractExecutable} if it's not ready
     * 
     */
    onceReady: function(listenerObject)
     {
       var onSuccess = function(){};
       if (bcdui.util.isFunction(listenerObject))
         onSuccess = listenerObject;
       else if (listenerObject.onSuccess)
         onSuccess = listenerObject.onSuccess;

       this.onReady({
           executeIfNotReady: listenerObject.executeIfNotReady || false
         , onlyOnce         : true
         , onlyFuture       : false
         , onFailure        : listenerObject.onFailure || null
         , onSuccess        : onSuccess
       });
     },
    
  /**
   * Add callback to abstractExecutable which is triggered when ready state is reached
   * 
   * Please note: the callback routines are always called asynchronously (even if ready state is already given)
   * @param {(function|Object)} listenerObject - Either a function to be called on ready status (i.e. onSuccess)<p/>or a parameter map with the following properties:
   * @param {function} listenerObject.onSuccess - callback function which is called when {@link bcdui.core.AbstractExecutable} is or gets ready
   * @param {function} [listenerObject.onFailure] - callback function which is called when {@link bcdui.core.AbstractExecutable} gets into failed status
   * @param {boolean}  [listenerObject.onlyOnce=false] - call callback only once or on each ready state
   * @param {boolean}  [listenerObject.onlyFuture=false] - only future ready states will trigger the callback. Per default the callback is called immediately (but async), if the AbstractExecutable is already in ready state
   * @param {boolean}  [listenerObject.executeIfNotReady=false] - do execute {@link bcdui.core.AbstractExecutable} if it's not ready
   * 
   */
  onReady: function(listenerObject)
    {
      var executeIfNotReady = false;
      var onlyOnce = false;
      var onlyFuture = false;
      var onSuccess = function(){};
      var onFailure = null;

      if (! bcdui.util.isFunction(listenerObject)) {
        executeIfNotReady = listenerObject.executeIfNotReady || executeIfNotReady;
        onlyOnce          = listenerObject.onlyOnce || onlyOnce;
        onlyFuture        = listenerObject.onlyFuture || onlyFuture;
        onFailure         = listenerObject.onFailure || onFailure;
        onSuccess         = listenerObject.onSuccess || onSuccess;
      }
      else
        onSuccess = listenerObject;

      var hitOnce = false;

      // a direct trigger is needed since the to-be-added listener will only fire on upcoming executes
      if (this.isReady() && ! onlyFuture) {
        setTimeout(onSuccess.bind(this));
        hitOnce = true;
      }
      if (onFailure && this.hasFailed() && ! onlyFuture) {
        setTimeout(onFailure.bind(this));
        hitOnce = true;
      }

      // don't add listener if onlyOnce is required (and happened above already)
      if (!onlyOnce || !hitOnce) {
        this.addStatusListener({
          status: this.getReadyStatus(),
          onlyOnce: onlyOnce,
          listener: onSuccess.bind(this)
        });
        if (onFailure) {
          this.addStatusListener({
           status: this.getFailedStatus(),
           onlyOnce: onlyOnce,
           listener: onFailure.bind(this)
         });
        }
      }

      // on request, execute
      if (executeIfNotReady)
        this.execute();
    },

  /**
   * The implementation of the process represented by the class (e.g. loading a model
   * or executing a transformation). This method is abstract and must be overridden
   * in sub-classes. Usually it should be asynchronous.
   * @private
   */
  _executeImpl: function()
    {
      throw Error("Abstract method: bcdui.core.AbstractExecutable._executeImpl");
    }

}); // Create class: bcdui.core.AbstractExecutable
