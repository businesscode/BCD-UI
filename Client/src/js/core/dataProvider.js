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
 * Container file for the DataProvider class.
 */


bcdui.core.DataProvider = bcdui._migPjs._classCreate( bcdui.core.AbstractExecutable,
/**
 * @lends bcdui.core.DataProvider.prototype
 */
{

  /**
   * @classdesc
   * A data provider is an abstract class on top of the {@link bcdui.core.AbstractExecutable},
   * extending it by data-related functions (like getName, getData, data modification events).
   * The name is filled with the id by default or set from the "name" argument.
   * getData() is abstract and must be provided by sub-classes.
   *
   * <br/>Most common implementations are:
   * {@link bcdui.core.StaticModel} &bull;
   * {@link bcdui.core.SimpleModel} &bull;
   * {@link bcdui.core.ModelWrapper}
   *
   * <br/>Further implementations:
   * {@link bcdui.core.AsyncJsDataProvider} &bull;
   * {@link bcdui.core.StringDataProvider} &bull;
   * {@link bcdui.core.DataProviderHtmlAttribute} &bull;
   * {@link bcdui.core.RequestDocumentDataProvider} &bull;
   * {@link bcdui.core.DataProviderWithXPathNodes} &bull;
   * {@link bcdui.core.DataProviderWithXPath} &bull;
   * {@link bcdui.core.DataProviderHolder} &bull;
   * {@link bcdui.core.DataProviderAlias} &bull;
   * {@link bcdui.core.ConstantDataProvider} &bull;
   * {@link bcdui.core.PromptDataProvider} &bull;
   *
   * @extends bcdui.core.AbstractExecutable
   * @abstract
   * 
   * @constructs
   * @description
   * Calls the initializer of {@link bcdui.core.AbstractExecutable} and additionally sets
   * the name property. This property is filled from the "args" parameter
   * map or set to the "id" if there is no "args.name" value in the map.
   * <p>
   *   In contrast to the id property the name does not need to be globally unique.
   *   Instead it should be unique within the scope it is used for. For example
   *   if the data provider is passed to a {@link bcdui.core.TransformationChain} the name should
   *   be unique for within this TransformationChain object.
   * </p>
   */
  initialize: function(/* object */ args)
    {
      var isLeaf = ((typeof this.type == "undefined")  ? "" + (this.type = "bcdui.core.DataProvider" ): "") != "";    
      
      bcdui.core.AbstractExecutable.call( this, args );

      /**
       * flag to monitor write/remove operations after last fire
       * @private
       */
      this._uncommitedWrites = false;

      /**
       * The name of the data provider. It must not be unique in contrast to the
       * id.
       * @type String
       * @private
       */
      this.name = "";

      if (typeof args.name == "undefined" || args.name == "" || args.name == null) {
        this.name = this.id;
      } else {
        this.name = args.name;
      }

      /**
       * The listeners to be informed when the data changes.
       * @type Array
       * @private
       */
      this.dataModificationListeners = [];
      /**
       * @private
       */
      this._currentGeneratedListenerId = 0;

      if (isLeaf)
        this._checkAutoRegister();
    },

  /**
   * @private
   */
  _generateModificationListenerId: function()
    {
      return "listener" + this._currentGeneratedListenerId++;
    },

  /**
   * @private
   */
  _extractIdFromModificationListener: function(/* Function|Object */ listener)
    {
      if (listener.getId && bcdui.util.isFunction(listener.getId)) {
        return listener.getId();
      } else if (typeof listener.id != "undefined") {
        return listener.id;
      }
      return null;
    },

  /**
   * This informs modification listeners, registered via {@link bcdui.core.DataProvider#onChange onChange(args)}, that a change set was completed
   * and data is consistent again.
   * @example
   * // Use of data modification events
   * var model = new bcdui.core.StaticModel({ data: { value: 3 } });
   * model.execute();
   * model.onChange( function(m) {
   *   console.log(m.getData().value);
   * });
   * model.getData().value ++;
   * model.fire(); // console prints '4'
   */
    fire: function() {
      this._uncommitedWrites = false;
      this._fire(false);
    },

  /**
   * Getter for the name of the data provider. This name is for example used
   * to set parameters names of a {@link bcdui.core.TransformationChain}.
   * @return {string} The name of the data provider. This name should be unique
   * within the scope it is used and is usually not globally unique (as the id).
   */
  getName: function()
    {
      return this.name;
    },

  /**
   * Access to the data of this DataProvider for read and modification access
   * @return {*} The data provided by the specific sub-class.
   * @abstract
   */
  getData: function()
    {
      // To be overwritten by the concrete subclass
      throw Error("Abstract method: bcdui.core.DataProvider.getData");
    },

  /**
   * Convenience method for debugging showing data in a prompt for copy-and-paste
   */
  promptData: function()
  {
    if(this.getReadyStatus()!=this.getStatus())
      prompt(this.id,"Data provider is not yet ready");
    else if( this.getData().selectSingleNode )
      prompt(this.id,new XMLSerializer().serializeToString(this.getData()));
    else if( typeof this.getData() === "object" )
      prompt(this.id, JSON.stringify(this.getData()) );
    else
      prompt(this.id,this.getData());
  },

  /**
   * Useful for debugging.
   * @return {string} A short string summary of this object.
   */
  toString: function()
    {
      return "[bcdui.core.DataProvider: id = " + this.id + ", name = " + this.name + "]";
    },

  /**
   * @return {string} Human readable message, which DataProviders, this DataProvider depends on, are not currently in ready state
   */
  debugIsWaitingFor: function()
    {
      var message = "Dataprovider '"+this.id+"' is waitig for ";
      if( this.dataproviders )
        message += this.dataproviders.filter(function(e){return ! e.getStatus().equals( this.getReadyStatus() )}).map(function(e){return e.id});
      else
        message += "no data provider";
      return message + " to become ready.";
    },

  /**
   * @return {string} Human readable message about the current state state
   */
  debugStatus: function()
    {
      var message = "Dataprovider '"+this.id+"' is in state '"+this.getStatus().toString()+"'";
      if( this.getStatus().equals( this.getReadyStatus() ) )
        message += ", which is the ReadyStatus";
      else
        message += ". ReadyState would be '"+this.getReadyStatus().toString()+"'";
      return message;
    },

  /**
   * transforms a xpath string with placeholders. A value with an apostrophe gets translated into a concat statement.
   * @param {string} xPath - xPath pointing to value (can include dot template placeholders which get filled with the given fillParams)
   * @param {Object} [fillParams] - array or object holding the values for the dot placeholders in the xpath. Values with "'" get 'escaped' with a concat operation to avoid bad xpath expressions
   * @return {string} final xPath with filled in values for possibly existing placeholders 
   * @private
   */
  _getFillParams: function(fillParams, xPath)
    {
      var x = xPath;
      var concat = false;
      if (typeof fillParams == "object") {
        var obj = {};
        for (var p in fillParams) {
          var gotApos = fillParams[p].indexOf("'") != -1;
          concat |= gotApos;
          obj[p] = gotApos ? "Xconcat('" + fillParams[p].replace(/'/g, `', "'", '`) + "', ''X)" : fillParams[p];
        }
        x = doT.template(xPath)(obj);
      }

      // remove possibly existing outer quotes/apostrophe around the inserted concat to make a valid xPath expression
      if (concat)
        x = x.replace(/('|\")*(\s)*Xconcat\('/g, "concat('").replace(/, ''X\)(\s)*('|\")*/g, ", '')");
      return x;
    },

  /**
   * Reads value from a given xPath (or optionally return default value)
   * @param {string} xPath - xPath pointing to value (can include dot template placeholders which get filled with the given fillParams)
   * @param {Object} [fillParams] - array or object holding the values for the dot placeholders in the xpath. Values with "'" get 'escaped' with a concat operation to avoid bad xpath expressions 
   * @param {string} [defaultValue] - default value in case xPath value does not exist
   * @return text value stored at xPath (or null if nothing found and no defaultValue supplied)
   */
  read: function(xPath, fillParams, defaultValue) {
    var def = (typeof fillParams == "string") ? fillParams : defaultValue;
    if (this.getData() == null) return (def === undefined ? null : def);
    var x = this._getFillParams(fillParams, xPath);
    var node = this.getData().selectSingleNode(x);
    return node != null ? node.text : (def === undefined ? null : def);
  },

  /**
   * Set a value to on a certain xPath and create the xPath where necessary. 
   * This combines Element.evaluate() for a single node with creating the path where necessary. 
   * It will prefer extending an existing start-part over creating a second one.
   * After the operation the xPath (with the optional value) is guaranteed to exist (pre-existing or created or extended) and the addressed node is returned.
   * 
   * @param {string}  xPath        - xPath pointing to the node which is set to the value value or plain xPath to be created if not there. 
   *    It tries to reuse all matching parts that are already there. If you provide for example "/n:Root/n:MyElem/@attr1" and there is already "/n:Root/n:MyElem@attr1", then ""/n:Root/n:MyElem" will be "re-used" and get a second attribute attr1.
   *    Many expressions are allowed, for example "/n:Root/n:MyElem[@attr1='attr1Value']/n:SubElem" is also ok.
   *    By nature, some xPath expressions are not allowed, for example using '//' or "/n:Root/n:MyElem/[@attr1 or @attr2]/n:SubElem" is obviously not unambiguous enough and will throw an error.
   *    This method is Wrs aware, use for example '/wrs:Wrs/wrs:Data/wrs:*[2]/wrs:C[3]' as xPath and it will turn wrs:R[wrs:C] into wrs:M[wrs:C and wrs:O], see Wrs format.
   *    (can include dot template placeholders which get filled with the given fillParams)
   * @param {Object} [fillParams] - array or object holding the values for the dot placeholders in the xpath. Values with "'" get 'escaped' with a concat operation to avoid bad xpath expressions
   *     Example: bcdui.wkModels.guiStatus.write("/guiStatus:Statu/guiStatus:ClientSettings/guiStatus:Test[@caption='{{=it[0]}}' and @caption2='{{=it[1]}}']", ["china's republic", "drag\"n drop"])
   * @param {string}  [value]      - Optional value which should be written, for example to "/n:Root/n:MyElem/@attr" or with "/n:Root/n:MyElem" as the element's text content.
   *    If not provided, the xPath contains all values like in "/n:Root/n:MyElem[@attr='a' and @attr1='b']" or needs none like "/n:Root/n:MyElem" 
   * @param {boolean} [fire=false] - If true a fire is triggered to inform data modification listeners
   * @return The xPath's node or null if dataProvider isn't ready
   */
  write: function(xPath, fillParams, value, fire) {
    if (this.getData() == null)
      return null;
    this._uncommitedWrites = true;

    var v = (typeof fillParams != "object") ? fillParams : typeof value != "undefined" ? value : null;
    var f = (typeof fillParams == "boolean") ? fillParams : typeof value == "boolean" ? value : fire;
    var x = this._getFillParams(fillParams, xPath);

    // At least we assure that the path exists, maybe we also set a value
    var newPath = bcdui.core.createElementWithPrototype(this.getData(), x);
    if( v != null )
      newPath.text = "" + v;
    if (f) 
      this.fire();
    return newPath;
  },

  /**
   * removes given xPath
   * @param {string} xPath - xPath pointing to value 
   * @param {Object} [fillParams] - array or object holding the values for the dot placeholders in the xpath. Values with "'" get 'escaped' with a concat operation to avoid bad xpath expressions 
   * @param {boolean} [fire=false] - if true a fire is triggered to notify data modification listener
   */
  remove: function(xPath, fillParams, fire) {
    if (this.getData() == null) return;

    this._uncommitedWrites = true;

    var f = (typeof fillParams == "boolean") ? fillParams : fire;
    var x = this._getFillParams(fillParams, xPath);

    bcdui.core.removeXPath(this.getData(), x);
    if (f) this.fire();
  },

  /**
   * Reads a single node from a given xPath
   * @param {string} xPath - xPath to query 
   * @param {Object} [fillParams] - array or object holding the values for the dot placeholders in the xpath. Values with "'" get 'escaped' with a concat operation to avoid bad xpath expressions 
   * @return single node or null if query fails
   */
  query: function(xPath, fillParams) {
    if (this.getData() == null) return null;
    var x = this._getFillParams(fillParams, xPath);
    return this.getData().selectSingleNode(x);
  },
  
  /**
   * Get node list from a given xPath
   * @param {string} xPath - xPath to query 
   * @param {Object} [fillParams] - array or object holding the values for the dot placeholders in the xpath. Values with "'" get 'escaped' with a concat operation to avoid bad xpath expressions 
   * @return node list or empty list if query fails
   */
  queryNodes: function(xPath, fillParams) {
    if (this.getData() == null) return [];
    var x = this._getFillParams(fillParams, xPath);
    return this.getData().selectNodes(x);
  },

  /**
   * Serialize dataprovider's data if available
   * @return String containing the serialized data
   */
  serialize: function() {
    return (this.getData() == null ? null : new XMLSerializer().serializeToString(this.getData()));
  },

  /**
   * Removes a data listener via its id or listener object / function.
   * @param {(string|function|Object)} listenerObject - Either a listener function or id <p/>or a parameter map with the following properties:
   * @param {string} [listenerObject.id] - listener id
   * @param {string} [listenerObject.callback] - listener function
  */
  removeDataListener: function(listenerObject) {

    if (bcdui.util.isFunction(listenerObject)) {
      this.removeDataListener({ callback: listenerObject });
      return;
    }

    if (bcdui.util.isString(listenerObject) && !!listenerObject.trim()) {
      this.removeDataListener({id: listenerObject});
    }

    var extractedId = this._extractIdFromModificationListener(listenerObject);

    this.dataModificationListeners = this.dataModificationListeners.filter(function(item) {
      if(!extractedId && (listenerObject.callback === item.listenerFunction || listenerObject.callback === item.callback)){ // match by listener function reference
        return false;
      }
      return (this._extractIdFromModificationListener(item) !== extractedId && (item !== listenerObject));
    }, this);
  },

  /**
   * Adds a data listener to the DataProvider which can be triggered when the data (XML
   * document) is changed. The listener offers two options: It can either be fired on
   * any change or on a change in a specific XPath result.
   * Note that no uniqueness check is done before adding the listener so it is possible to add the same listener twice or more times.
   * 
   * @param {(function|Object)} listenerObject - Either a function to be called after changes <p/>or a parameter map with the following properties:
   * @param {function} listenerObject.callback - function to be called after changes
   * @param {string}   [listenerObject.trackingXPath] - xPath to monitor for changes
   * @param {boolean}  [listenerObject.onlyOnce=false] - fire on each change or only once  (higher priority than listenerObject's onlyOnce)
   * @param {string}   [listenerObject.id] - listener id (only needed for removeDataListener usability)
   * @param {string}   [trackingXPath] - xPath to monitor to monitor for changes
  */
  onChange: function(listenerObject, trackingXPath) {

    // if we got a function, build up a listenerObject with the given values
    if( bcdui.util.isFunction(listenerObject)) {
      listenerObject = {
          callback: listenerObject
        , onlyOnce: false
        , trackingXPath: trackingXPath
      }
    }
    else {
      listenerObject.callback = listenerObject.callback || listenerObject.listener;
      listenerObject.onlyOnce = listenerObject.onlyOnce || false;
    }

    if (bcdui.util.isString(listenerObject.trackingXPath) && !!listenerObject.trackingXPath.trim()) {
      listenerObject.listenerFunction = listenerObject.callback; // remember original callback for _trackingXPathListener function
      listenerObject.callback = this._trackingXPathListener.bind(this, listenerObject); // encapsule hash calculator in callback
      this._initTrackingXPathListener(listenerObject); // initial hash calculation for trackingXPath
    }

    // set generated id if not yet available
    if (this._extractIdFromModificationListener(listenerObject) == null)
      listenerObject.id = this._generateModificationListenerId();

    // and finally add it
    this.dataModificationListeners.push(listenerObject);
  },

  /**
   * @private
   */
  _fire: function(causedByReadyStatus) {

    if (this.getStatus() instanceof bcdui.core.status.WaitingForUncomittedChanges) {
      this.setStatus(this.getReadyStatus());
      return;
    }
    // we don't execute the listener function if we're not ready
    // when the dp becomes ready, a fire is thrown anyway
    if (! this.isReady())
      return;

    // since callback might have added new listeners in between, we need to split up
    // execution and onlyOnce removal
    var old = this.dataModificationListeners;
    this.dataModificationListeners = this.dataModificationListeners.filter(function(listener) {
      return ! listener.onlyOnce; // remove onlyOnce listeners
    }, this);

    // execute all listeners (at least once)
    old.forEach(function(listener) {
      if (listener.callback && bcdui.util.isFunction(listener.callback))
        listener.callback(this, causedByReadyStatus);
    }.bind(this));

  },

  /**
   * this function is executed on .fireBeforeModelUpdate
   * @private
   */
  _initTrackingXPathListener: function(listener) {
    listener.oldData = this._hashValueForListener(listener.trackingXPath);
  },
  
  /**
   * this function is executed on .fireAfterModelUpdate
   * @private
   */
  _trackingXPathListener: function(listener, target) {
    var newData = this._hashValueForListener(listener.trackingXPath);

    // .oldData is initialized in _initTrackingXPathListener()
    if(newData != listener.oldData){
      listener.oldData = newData;
      try{
        listener.listenerFunction(target);
      }catch(e){
        (window["console"]?console:bcdui.log).warn("error occurred while executing listener-function:" + e.message, e);
      }
    }
  },

  /**
   * creates a simple hash of given xPath value (as string) using following algorithm:
   *
   * 1) in case stringValue is less than 96 characters - return that value
   * 2) otherwise compute hash
   *
   * @return string hash value, null in case stringValue was null or empty string in case stringValue was empty
   * @private
   */
  _hashValueForListener : function(xPath){

    if (this.getData() == null)
      return null;

    var stringValue = null;
    var nodes = this.getData().selectNodes(xPath);
    var isAttrPath = true;
    stringValue = "";
    for (var i = 0; i < nodes.length; ++i) {
      var item = nodes.item(i);
      var val = item.nodeType == 1 ? new XMLSerializer().serializeToString(item) : item.nodeValue;
      stringValue += val + "|";
      isAttrPath = isAttrPath && val == "" && item.nodeType == 2;
    }
    if (isAttrPath) {
      stringValue = "";
      for (var i = 0; i < nodes.length; ++i) {
        stringValue += nodes.item(i).value + "|";
      }
    }

    if(stringValue==null || stringValue=="" || stringValue.length < 97)
      return stringValue;

    var hash = 0;
    for (var chr, i = 0, len = stringValue.length; i < len; i++) {
      chr   = stringValue.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // 32bit integer
    }
    return "" + hash;
  }
  
  , setStatus: function(/* Status */ args) {
    var stat = bcdui.core.AbstractExecutable.prototype.setStatus.call(this, args);

    // we do send a fire in case we reached a ready status
    // we need to rely on the returned object since calling this.getStatus() might
    // return a state beyond 'stat.newStatus'
    if (stat.oldStatus != stat.newStatus && stat.newStatus == this.getReadyStatus()) {
      this._fire(true); 
    }
  },

  /**
   * True, if DataProvider is ready and there are no uncomitted write transactions,
   * see {@link bcdui.core.AbstractExecutable#isReady isReady()} and {@link bcdui.core.DataProvider#onChange fire()}.
   * @returns {boolean}
   */
  isClear: function() {
    return (! this._uncommitedWrites && this.isReady());
  }

}); // Create class: bcdui.core.DataProvider
