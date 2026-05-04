/*
  Copyright 2010-2023 BusinessCode GmbH, Germany

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
   * The object registry is a class that tracks registration of BCD-UI objects by
   * their id. It also offers methods to wait for the registration of one or more
   * objects so that the dependencies can be managed more easily.
   * <p/>
   * Use the singleton {@link bcdui.factory.objectRegistry} for registering
    */
  bcdui.factory.ObjectRegistry = class
{
  /**
   * @description
   * This class should not be instantiated directly, because there is already a
   * singleton instance at {@link bcdui.factory.objectRegistry} (note the lower case 'o'), which is used by
   * the factory methods.
   */
  constructor()
    {
      // Collects all registered objects
      this.objectMap = {};

      // Running page-global id for entries in _listeners
      this._runningListenerId = 0;

      /**
       * This is used to register waiters for yet unregistered objects. Each entry maps one object id being waited for to listeners in _listeners
       * Each entry maps an id of an not-yet-registered object being waited for to a map listing entries in _listeners
       * @private
       */
      this._objectIdToListenerIdMap = {};

      /**
       * This is used to register waiters for yet unregistered objects, each entry is one callback waiting for pending ids.
       * Each entry in this map maps a generated id of the form "L"+runningGlobalId to an object of the form { pending: length, fn: fn },
       * telling us that fn is to be called once pending becomes 0
       * pending is decreased each time an object waited for here is registered, see also _objectIdToListenerIdMap
       * @private
       */
      this._listeners = {};
    }

  /**
   * Retrieves a DataProvider from the ObjectRegistry by the provided id.
   * Use this if you need access from JavaScript to objects, which where created via XSLT, XAPI or JSP.
   * 
   * @param {string|SymLink} id - The object to be resolved from the registry.
   * @return {bcdui.core.DataProvider} The object registered under the id or null if no such object exists.
   */
  getObject(id) {
    if( !id )
      return undefined; // Will not work for the caller, but makes it easier to locate the error
    if (id.refId && bcdui.util.isString(id.refId)) {
      return this.objectMap[id.refId];
    }
    if (bcdui.util.isString(id))
      return this.objectMap[id] || undefined;
    return id;
  }

  /**
   * Get a new page-unique id. Use this if you don't car about the id's value but need a unique one.
   * @static
   */
  generateTemporaryId( givenId ) {
    return bcdui.core._generateTemporaryId(givenId);
  }

  /**
   * Get a new page-unique id for a certain scope, i.e. prefix. The prefix makes it easier to debug.
   * @static
   */
  generateTemporaryIdInScope(scope) {
    return bcdui.core._generateTemporaryIdInScope(scope);
  }

  /**
   * Helper, allowing to call functions getting object ids and a callback function in two ways
   * Either one argument with reference properties (id or ids) and a property fn
   * or two arguments, first containing a single reference or an array of it, the second the callback
   * Each reference in turn can be a string id, or a reference object
   * @private
   */
  _extractFunctionAndIdsFromArgs(args, argsX, keepObjects) {
    let ids = null;
    let fn = null;
    if (bcdui.util.isFunction(argsX)) {
      fn = argsX;
      ids = args;
    } else {
      fn = args.fn;
      ids = args.ids || args.id;
    }
    if( !Array.isArray(ids) )
      ids = [ ids ];

    ids = ids.filter(function(a) { return a != null; });

    for (let i = 0; i < ids.length; ++i) {
      if (bcdui.util.isString(ids[i].id) && bcdui.util.isFunction(ids[i].getData) && ! keepObjects)
        ids[i] = ids[i].id;
      else if (bcdui.util.isString(ids[i].refId))
        ids[i] = ids[i].refId;
    }
    return { ids: ids, fn: fn };
  }

  /**
   * Waits until one or more ids are registered (but not necessarily ready) and then calls a JavaScript function. If they
   * are already registered the JavaScript function will be called immediately.
   * <p/>
   * Use this if you need access from JavaScript to objects, which where created via XSLT, XAPI or JSP.
   *
   * See {@link bcdui.factory.objectRegistry.withReadyObjects withReadyObjects()}
   *
   * @param {(Object|string[]|string)} args1 This can either be a parameter object or an array of id
   * strings or a single id. The format of the parameter object is as follows
   *   <ul>
   *     <li>ids: {string[]|string} The array of ids that must be registered before the callback
   *               function is called.</li>
   *     <li>fn: {Function} The function to be called when the ids are registered.</li>
   *   </ul>
   * @param {function} args2 - If the first parameter is not a parameter object, then
   * this is the callback function that is called as soon as the requested ids are registered.
   */
  withObjects(args1, args2) {
    var args = this._extractFunctionAndIdsFromArgs(args1, args2);
    // If a model is given more than once, we still only need to wait once for it
    // This is especially important since there will only be one entry for this id and this listener combination in _objectIdToListenerIdMap
    var ids = args.ids.reduce(function(a, b) { return typeof b !== "undefined" && b !== null && a.indexOf(b) === -1 ? a.concat(b) : a; }, []);

    ids = ids.filter(function(id) { return typeof this.objectMap[id] == "undefined"; }, this); // Let only those ids survive, which are not yet registered
    if (ids.length == 0) {
      // We call this async, possible because we do not rely on any state here and assume objects being waited for are seldom deregistered
      // Advantage is that runtime behavior is same (async) independent of racing conditions in object registering
      setTimeout( args.fn );
      return;
    }

    // Each id in ids is now a not yet registered id for which args.fn is waiting for
    // For the callback we make an entry in _listeners, also holding the number of ids being waited for
    var newListenerId = "L" + this._runningListenerId++;
    this._listeners[newListenerId] = { pending: ids.length, fn: args.fn };
    // And for each id we make an entry in _objectIdToListenerIdMap, which maps this id to its listeners (i.e. entries in _listeners)
    ids.forEach(function(id) {
      var listenerIdMap = this._objectIdToListenerIdMap[id];
      if (typeof listenerIdMap == "undefined") {
        listenerIdMap = {};
        this._objectIdToListenerIdMap[id] = listenerIdMap;
      }
      listenerIdMap[newListenerId] = newListenerId;
    }, this);
  }

  /**
   * Removes a DataProvider from the object registry.
   * <p/>
   * Use this if you need access from XSLT, XAPI or JSP to objects created via JavaScript.
   * 
   * @param {bcdui.core.DataProvider} obj The DataProvider to be removed from the registry.
   */
  deRegisterObject(obj) {
    var objId = bcdui.util.isString(obj) ? obj : obj.id;
    if (objId == ""){
      throw new Error("An object's mandatory id is empty");
    }
    delete this.objectMap[objId];
  }

  /**
   * Registers a new object in the object registry by its unique id property.
   * Pending listeners can be informed on that event. Additionally it creates
   * a JavaScript variable with the name of the object id and the object as
   * value.
   * <p/>
   * Use this if you need access from XSLT, XAPI or JSP to objects created via JavaScript.
   * 
   * @param {bcdui.core.DataProvider} obj The DataProvider to be registered.
   */
  registerObject(obj) {
    var objId = obj.id;
    if (objId == "")
      throw new Error("An object's mandatory id is empty");
    if ( this.objectMap[objId] && this.objectMap[objId] !== obj)
      throw new Error("Duplicate object id: " + objId);
    this.objectMap[objId] = obj;

    var listenerMap = this._objectIdToListenerIdMap[objId];
    if (typeof listenerMap != "undefined") {
      var readyListenerIds = [];
      var readyListenerFunctions = [];
      for (var listenerId in listenerMap) {
        var l = this._listeners[listenerId];
        if (--l.pending == 0) {
          readyListenerIds.push(listenerId);
          readyListenerFunctions.push(l.fn);
        }
      };
      delete this._objectIdToListenerIdMap[objId];
      readyListenerIds.forEach(function(listenerId) { delete this._listeners[listenerId]; }, this);
      setTimeout(function() { readyListenerFunctions.forEach(function(rlf){rlf()}); });
    }
  }

  /**
   * Waits until the specified DataProvider ids are registered and reach their ready states.
   * Then it calls the specified callback function. Please note that it also works when the
   * data providers are already in their ready state; then the callback is called immediately.
   * Note that it will also execute the DataProviders it waits fir, if they are not yet ready.
   * The interface is identical to the {@link bcdui.factory.objectRegistry.withObjects withObjects()} function.
   * 
   * @param {(Object|string[]|string)} args1 - The parameter object or the object ids.
   * @param {function}               args2 - The callback function if argsOrIds is an array.
   * @param {boolean}                skipExecute - do not execute the non-ready dataproviders
   * @static
   */
  withReadyObjects(args1, args2, skipExecute) {
    var args = bcdui.factory.objectRegistry._extractFunctionAndIdsFromArgs(args1, args2, true);
    args.ids = args.ids.reduce(function(a, b) { return typeof b !== "undefined" && b !== null && a.indexOf(b) === -1 ? a.concat(b) : a; }, []);  // Even for objects provided here twice, we only need to wait once
    var ids = args.ids;
    skipExecute = typeof skipExecute != "undefined" ? skipExecute : false;
    if( ! args.fn )
      throw new Error( "In withReadyObjects for ids: ["+ids.toString()+"] is the callback fn missing.");
    // We wait until all ids (if given as strings only) are registered (not necessary ready()).
    // JS objects we do not need to wait for the registry, they never may be registered but become ready.
    // Note, fn is always called async, so the browser gets some freedom here and have we less timing dependent behavior (consistently async)
    bcdui.factory.objectRegistry.withObjects({
      ids: ids.filter(function(id){return typeof id === "string"}),
      fn: function( args, skipExecute ) {
        // Now all are registered
        var objects = args.ids.map(bcdui.factory.objectRegistry.getObject.bind(bcdui.factory.objectRegistry));
        var readyFunction = args.fn;
        var nonReadyObjects = objects.filter(function(dataProvider) { return !dataProvider.isReady(); });
        var readyCount = nonReadyObjects.length;
        if (readyCount == 0) {
          // If all are ready, call the function (without async setTimeout() to prevent some getting not-ready in between)
          readyFunction();
        } else {
          // If not, we execute the non-ready ones and wait for one (random) to then run the check again
          if( !skipExecute ) {
            nonReadyObjects.forEach(function(obj) {
              setTimeout( obj.execute.bind(obj) );
            });
          }
          var anyObj = nonReadyObjects[0];
          anyObj.addStatusListener({
            status: anyObj.getReadyStatus(),
            onlyOnce: true,
            listener: function( args ) {
              bcdui.factory.objectRegistry.withReadyObjectsNoExecute( args );
            }.bind( undefined, args, skipExecute )
          });
        }
      }.bind( undefined, args, skipExecute )
    });
  }

  /**
   * Waits until the specified DataProvider ids are registered and reach their ready states.
   * Then it calls the specified callback function. Please note that it also works when the
   * data providers are already in their ready state; then the callback is called immediately.
   * It does not execute the DataProviders it waits for, it waits until somebody else executes it.
   * The interface is identical to the {@link bcdui.factory.objectRegistry.withObjects} function.
   * 
   * @param {(Object|string[]|string)} args1 - The parameter object or the object ids.
   * @param {function}               args2 - The callback function if argsOrIds is an array.
   */
  withReadyObjectsNoExecute(args1, args2) {
    bcdui.factory.objectRegistry.withReadyObjects(args1, args2, true);
  }

  /**
   * @return {Array<bcdui.core.StatusListener>} The array of ids some listeners are waiting for, but which are
   * not yet registered.
   * @private
   */
  _getWaitingIds() {
    return Object.keys(this._objectIdToListenerIdMap).sort();
  }

  /**
   * @return {Array<string>} The array of ids which are currently registered at this object
   * registry.
   * @private
   */
  _getRegisteredIds() {
    return Object.keys(this.objectMap).sort();
  }

  /**
   * @return {string} A string describing the current state of the object registry.
   */
  toString() {
    return "[ObjectRegistry. Waiting IDs: [" +
        this._getWaitingIds().join(", ") + "], Registered IDs: [" +
        this._getRegisteredIds().join(", ") + "] ]";
  }

};

/**
 * This is a singleton object of type ({@link bcdui.factory.ObjectRegistry}) where instances of {@link bcdui.core.DataProvider}
 * can be registered by their globally unique id. It allows listeners to wait for these registrations so that they can safely access
 * these objects no matter which time they are created at. Therefore it plays a vital role in the development of robust code and for
 * the creation of a higher abstraction layer like JSP markup.
 * @constant
 * @type {bcdui.factory.ObjectRegistry}
 */
bcdui.factory.objectRegistry = new bcdui.factory.ObjectRegistry();
