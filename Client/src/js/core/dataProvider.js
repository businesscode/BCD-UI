/*
  Copyright 2010-2025 BusinessCode GmbH, Germany

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


/**
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
 */
export const bcduiExport_DataProvider = bcdui.core.DataProvider = class extends bcdui.core.AbstractExecutable
{
  /**
   * @description
   * Calls the initializer of {@link bcdui.core.AbstractExecutable} and additionally sets
   * the name property. This property is filled from the "args" parameter
   * map or set to the "id" if there is no "args.name" value in the map.
   * <p>
   *   In contrast to the id property the name does not need to be globally unique,
   *   Instead, it should be unique within the scope it is used for. For example
   *   if the data provider is passed to a {@link bcdui.core.TransformationChain} the name should
   *   be unique for within this TransformationChain object.
   * </p>
   * @param {object} args
   */
  constructor(args)
    {
      var bcdPreInit = args ? args.bcdPreInit : null;
      super(jQuery.extend(args, {
        bcdPreInit: function() {
          if (bcdPreInit)
            bcdPreInit.call(this);

            this.saveOptions = args.saveOptions;
      }}))



      /**
       * flag to monitor write/remove operations after last fire
       * @private
       */
      this._uncommitedWrites = false;

      /**
       * The name of the data provider. It must not be unique in contrast to the
       * id.
       * @type {string}
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
       * @type {Array<bcdui.core.StatusListener>}
       * @private
       */
      this.dataModificationListeners = [];
      /**
       * @private
       */
      this._currentGeneratedListenerId = 0;
      
      /**
       * @constant
       * @private
       */
      this.savingStatus = new bcdui.core.status.SavingStatus();
      /**
       * @constant
       * @type {bcdui.core.Status}
       * @example
       * if( model.getStatus() === model.savedStatus )
       *   ...
       */
      this.savedStatus = new bcdui.core.status.SavedStatus();
      /**
       * @constant
       * @type {bcdui.core.Status}
       */
      this.saveFailedStatus = new bcdui.core.status.SaveFailedStatus();

      // attach save handling only when we really have a dp which is able to save (simpleModel, autoModel, etc.)
      // especially NOT bcdui.core._ModelBeingUpdated
      if (this.saveOptions)
        this.addStatusListener(this._statusTransitionHandlerDp.bind(this));
    }

  /**
   * @inheritDoc
   */
  getClassName() {return "bcdui.core.DataProvider";}

  /**
   * @param statusEvent
   * @private
   */
  _statusTransitionHandlerDp(/* StatusEvent */ statusEvent)
    {
      if (statusEvent.getStatus().equals(this.savingStatus)) {
        /*
         * Start the save operation. At the present time we allow saving only to the
         * same URL we loaded data from.
         */
        this._save();
      } else if (statusEvent.getStatus().equals(this.savedStatus)) {
        /*
         * When the data has been successfully saved we can return to the
         * model's ready state again.
         */
        var newStatus = this._uncommitedWrites ? this.waitingForUncomittedChanges : this.getReadyStatus();
        this.setStatus(newStatus);
      }
    }

    /**
     * Sends the current data to the original URL
     */
    sendData(args)
      {
        if (this.status.equals(this.savingStatus)) {
          bcdui.log.warn("sendData skipped, because the model is already in saving state.");
          return;
        }
        if (!this.status.equals(this.getReadyStatus())) {
          throw Error("Cannot send data when the model is not in ready state.");
        }
        this.sendDataArgs = args;
        this.setStatus(this.savingStatus);
      }

    /**
     * @private
     */
    _save()
      {
        if (! this.saveOptions || !this.saveOptions.urlProvider)
          throw Error("Cannot send data due to missing save options.");

        var saveUrl = this.saveOptions.urlProvider.getData();
        /*
         * Remove unnecessary parameters from URL.
         */
        saveUrl = saveUrl.replace(/^([^?]+).*$/, "$1");
        var p = {
          url: saveUrl,
          doc: this.dataDoc,
          onSuccess: function(domDocument) {

            // a customn onSuccess call will be triggered on the next ready state (either reload or saved -> ready)
            if (this.saveOptions.onSuccess) 
              this.onReady({ onSuccess: this.saveOptions.onSuccess.bind(this), onlyFuture: true, onlyOnce: true });

            // dirty model will become clean by saving it (and so we reach ready state)
            this._uncommitedWrites = false;

            // in case of a reload we only want to generate 1 ready status event
            // this.setStatus(this.savedStatus); would generate one and the reload finish will generate another one
            // to avoid this, we set the initializedStatus directly (without the event firing in the function).
            //  We need to set it since execute requires it to change into loading state
            if (this.saveOptions.reload) {
              this.status = this.initializedStatus;
              this.execute(true);
            }
            else
              this.setStatus(this.savedStatus); // otherwise we set it 'normally' with firing events

          }.bind(this),
          onFailure: function(msg) {
            bcdui.log.error({id: this.id, message: "BCD-UI: Failed saving model: '"+this.id+"', '"+msg+"'"});
            this.setStatus(this.saveFailedStatus);
            if (this.saveOptions.onFailure)
              this.saveOptions.onFailure();
          }.bind(this),
          onWrsValidationFailure: function(rwsValidationResult) {
            bcdui.log.warn("wrs validation failure");
            this.dataDoc.selectSingleNode("wrs:Wrs/wrs:Header").appendChild(this.dataDoc.importNode(rwsValidationResult, true));
            var newStatus = this._uncommitedWrites ? this.waitingForUncomittedChanges : this.getReadyStatus();
            this.setStatus(newStatus);
            if (this.saveOptions.onWrsValidationFailure)
              this.saveOptions.onWrsValidationFailure();
          }.bind(this)
        };

        // transform model if saveChain is provided or wrs model is used or dp is not a simple model
        var mw = null;
        var saveChain = [];
        if (this.saveOptions && this.saveOptions.saveChain) {
          if (Array.isArray(this.saveOptions.saveChain))
            saveChain = this.saveOptions.saveChain;
          else
            saveChain.push(this.saveOptions.saveChain);
        }
        // if wrs dp, we add a cleanup chain step
        if (this.getData().selectSingleNode && this.query("/*/wrs:Data") != null) {
          // get rid of wrs:R rows to reduce data for saving and order data for avoiding key constraint issues
          // this is done in js since Chrome/Edge got a XSLT limitation (text content of a node can be 10MB max)
          const prepareToPost = function(doc, args) {
            const newDoc = bcdui.core.browserCompatibility.cloneDocument(doc);
            bcdui.core.removeXPath(newDoc, "/*/wrs:Data/wrs:*", false);
            const dataRoot = newDoc.selectSingleNode("/*/wrs:Data");
            Array.from(doc.selectNodes("/*/wrs:Data/wrs:D")).forEach(function(row) { dataRoot.appendChild(row.cloneNode(true)); });
            Array.from(doc.selectNodes("/*/wrs:Data/wrs:M")).forEach(function(row) { dataRoot.appendChild(row.cloneNode(true)); });
            Array.from(doc.selectNodes("/*/wrs:Data/wrs:I")).forEach(function(row) { dataRoot.appendChild(row.cloneNode(true)); });
            return newDoc;
          };
          saveChain.push(prepareToPost);
        }
        // to use it as wrapper inputModel, we need the current model in ready state, so we take its data into a temporary staticModel 
        if (saveChain.length > 0) {
          var sendModel = new bcdui.core.StaticModel({data: this.serialize()});
          mw = new bcdui.core.ModelWrapper({chain: saveChain, parameters: this.saveOptions.saveParameters, inputModel: sendModel});
        }
        else if (this.type != "bcdui.core.SimpleModel")
          mw = new bcdui.core.StaticModel({data: this.serialize()});

        // if we use a wrapper, we need to wait for readiness
        if (mw) {
          mw.onceReady({
            executeIfNotReady: true
          , onSuccess: function() {
              p.doc = mw.getData();  // do not forget to use the new document

              // if we got a WRS model but nothing to post, skip posting
              if (p.doc.selectSingleNode) {
                if (p.doc.selectSingleNode("/*/wrs:Data") != null && p.doc.selectSingleNode("/*/wrs:Data/wrs:*") == null)
                  p.onSuccess(p.doc);
                else
                  bcdui.core.xmlLoader.post(p);
              }
              else {
                jQuery.ajax({
                  method:  (this.sendDataArgs && this.sendDataArgs.method) || "POST",
                  mimeType: this.mimeType,
                  contentType: this.mimeType,
                  url : p.url,
                  data: mw.serialize(),
                  success : p.onSuccess,
                  error : p.onFailure
                });
              }
            }.bind(this)
          , onFailure: function() {
              bcdui.log.error({id: this.id, message: "BCD-UI: Failed transforming save model: '" + this.id});
              this.setStatus(this.saveFailedStatus);
            }.bind(this)
          });
        }
        // otherwise we can post the data directly
        else {
          if (this.getData().selectSingleNode)
            bcdui.core.xmlLoader.post(p);
          else {
            jQuery.ajax({
              method:  (this.sendDataArgs && this.sendDataArgs.method) || "POST",
              mimeType: this.mimeType,
              contentType: this.mimeType,
              url : p.url,
              data: this.serialize(),
              success : p.onSuccess,
              error : p.onFailure
            });
          }
        }
      }

  /**
   * @private
   */
  _generateModificationListenerId()
    {
      return "listener" + this._currentGeneratedListenerId++;
    }

  /**
   * @private
   */
  _extractIdFromModificationListener(/* Function|Object */ listener)
    {
      if (listener.getId && bcdui.util.isFunction(listener.getId)) {
        return listener.getId();
      } else if (typeof listener.id != "undefined") {
        return listener.id;
      }
      return null;
    }

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
    fire() {
      this._uncommitedWrites = false;
      this._fire(false);
    }

  /**
   * Getter for the name of the data provider. This name is for example used
   * to set parameters names of a {@link bcdui.core.TransformationChain}.
   * @return {string} The name of the data provider. This name should be unique
   * within the scope it is used and is usually not globally unique (as the id).
   */
  getName()
    {
      return this.name;
    }

  /**
   * Access to the data of this DataProvider for read and modification access
   * @return {*} The data provided by the specific sub-class.
   * @abstract
   */
  getData()
    {
      // To be overwritten by the concrete subclass
      throw Error("Abstract method: bcdui.core.DataProvider.getData");
    }

  /**
   * Convenience method for debugging showing data in a prompt for copy-and-paste
   */
  promptData()
  {
    if(this.getReadyStatus()!=this.getStatus())
      prompt(this.id,"Data provider is not yet ready");
    else if( this.getData().selectSingleNode )
      prompt(this.id,new XMLSerializer().serializeToString(this.getData()));
    else if( typeof this.getData() === "object" )
      prompt(this.id, JSON.stringify(this.getData()) );
    else
      prompt(this.id,this.getData());
  }

  /**
   * Useful for debugging.
   * @return {string} A short string summary of this object.
   */
  toString()
    {
      return "[bcdui.core.DataProvider: id = " + this.id + ", name = " + this.name + "]";
    }

  /**
   * @return {string} Human readable message, which DataProviders, this DataProvider depends on, are not currently in ready state
   */
  debugIsWaitingFor()
    {
      var message = "Dataprovider '"+this.id+"' is waitig for ";
      if( this.dataproviders )
        message += this.dataproviders.filter(function(e){return ! e.getStatus().equals( this.getReadyStatus() )}).map(function(e){return e.id});
      else
        message += "no data provider";
      return message + " to become ready.";
    }

  /**
   * @return {string} Human readable message about the current state state
   */
  debugStatus()
    {
      var message = "Dataprovider '"+this.id+"' is in state '"+this.getStatus().toString()+"'";
      if( this.getStatus().equals( this.getReadyStatus() ) )
        message += ", which is the ReadyStatus";
      else
        message += ". ReadyState would be '"+this.getReadyStatus().toString()+"'";
      return message;
    }

  /**
   * transforms a xpath string with placeholders. A value with an apostrophe gets translated into a concat statement.
   * @param {string} xPath - xPath pointing to value (can include dot template placeholders which get filled with the given fillParams)
   * @param {Object} [fillParams] - array or object holding the values for the dot placeholders in the xpath. Values with "'" get 'escaped' with a concat operation to avoid bad xpath expressions
   * @return {string} final xPath with filled in values for possibly existing placeholders 
   * @private
   */
  _getFillParams(fillParams, xPath){
    return bcdui.util.interpolateXPath(fillParams, xPath);
  }

  /**
   * Reads the string value from a given xPath (or optionally return default value).
   * @param {string} xPath - xPath pointing to value (can include dot template placeholders which get filled with the given fillParams)
   * @param {Object} [fillParams] - array or object holding the values for the dot placeholders in the xpath. Values with "'" get 'escaped' with a concat operation to avoid bad xpath expressions 
   * @param {string} [defaultValue] - default value in case xPath value does not exist
   * @return {string} text value stored at xPath (or null if no text was found and no defaultValue supplied)
   */
  read(xPath, fillParams, defaultValue) {
    var def = (typeof fillParams == "string") ? fillParams : defaultValue;
    if (this.getData() == null) return (def === undefined ? null : def);
    return bcdui.wrs.wrsUtil.read(this.getData(), xPath, fillParams, defaultValue);
  }

  /**
   * gets a column id pos map of the current wrs based doc
   * @return {Object} object holding the column position for each wrs header column c element 
   * @private
   */
   _getColumnPosByBRef() {
    let columnPosByBRef = {};
    const headerCols = Array.from(this.queryNodes("/*/wrs:Header/wrs:Columns/wrs:C"));
    headerCols.forEach(function (e) { columnPosByBRef[e.getAttribute("id")] = parseInt((e.getAttribute("pos") || "0")), 10; });
    if (headerCols.length == 0)
      throw Error("data provider "+this.id+" is not WRS based or has no header columns");
    return columnPosByBRef;
  }

  /**
   * read the data from a wrs, filter via xpath and return data as an object array
   * @param {string[]} columns - positive list of column
   * @param {Object} xPathTemplate - xPath template which is used for reading (filtered) data (can have {{=it.}}) object references) 
   * @param {string} templateObj   - object holding the values for the placeholders in the xPathTemplate
   * @return {Array<Object>} holding objects with the read data
   * @private
   */
  _getDataFromTemplate(columns, xPathTemplate, templateObj) {
    const columnPosByBRef = this._getColumnPosByBRef();
    return Array.from(this.queryNodes(xPathTemplate, templateObj)).map(function(row) {
      let rowObj = {};
      columns.forEach(function(c) {
        if (c == "bcdRowId")
          rowObj["bcdRowId"] = row.getAttribute("id");
        else if (typeof columnPosByBRef[c] != "undefined") {
          rowObj[c] = row.selectSingleNode("wrs:C["+columnPosByBRef[c]+"]").text || "";
          if (rowObj[c] == "" && row.selectSingleNode("wrs:C["+columnPosByBRef[c]+"]/wrs:null") != null)
            rowObj[c] = null;
        }
        else
          bcdui.log.warn("illegal column " + c + " requested in " + this.id);
      });
      return rowObj;
    });
  }

  /**
   * generate a filter xpath
   * @param {Object} filter - object holding requested filter conditions, e.g. { country: 'DE', flag: true } 
   * @return {string} wrs row filter condition as an xpath
   * @private
   */
  _buildXPathTemplate(filter) {
    const columnPosByBRef = this._getColumnPosByBRef();
    let xPaths = [];
    for (let c in filter) {
      if (typeof columnPosByBRef[c] != "undefined") {
          xPaths.push(
            (filter[c] === null)
            ? "wrs:C["+columnPosByBRef[c]+"]/wrs:null"
            : "wrs:C["+columnPosByBRef[c]+"]='{{=it." + c + "}}'"
          );
      }
      else
        bcdui.log.warn("illegal column " + c + " requested in " + this.id);
    }

    return (xPaths.length == 0 ? "" : "[" + xPaths.join(" and ") + "]");
  }

  /**
   * inserts a new row in the wrs data, values given as object
   * @param {Object}  args             - parameter bag
   * @param {Object}  args.values      - object holding cell values which should be inserted, e.g. { country: 'DE', flag: true }
   * @param {boolean} [args.rmi=true]  - use wrs:I syntax when this is true, otherwise wrs:R is used, rmi=true also prefills default values
   * @param {boolean} [args.fire=true] - lets the listeners know, that the update was finished
   * @return {string} row id of newly inserted row
   */
  tblInsert(args) {
    args = args || {};
    const values = args.values || {};
    const rmi = args.rmi === false ? false : args.rmi || true;
    const doFire = args.fire === false ? false : args.fire || true;
    const columnCount = this.queryNodes("/*/wrs:Header/wrs:Columns/wrs:C").length;
    if (columnCount == 0)
      throw Error("data provider "+this.id+" is not WRS based or has no header columns");
    const prefix = (rmi ? "I" : "R");
    let newIdCount = this.queryNodes("/*/wrs:Data/wrs:*").length + 1;
    while (this.query("/*/wrs:Data/wrs:" + prefix + "[@id='" + prefix + newIdCount + "']") != null)
      newIdCount++;
    const newId = prefix + newIdCount;
    bcdui.core.createElementWithPrototype(this.getData(), "/*/wrs:Data/wrs:" + prefix + "[@id='" + newId + "']/wrs:C[" + columnCount + "]");
    this.tblUpdate({rmi: rmi, fire: doFire, rowId: newId, values: values});
    return newId;
  }

  /**
   * updates wrs rows with given data. Either a single row (via rowId) or single/multiple ones (via filter)
   * @param {Object}  args             - parameter bag
   * @param {Object}  args.values      - object holding cell values which should be used for updating, e.g. { country: 'DE', flag: true }
   * @param {Object}  [args.filter]    - object holding cell values which should be used for selecting the rows for update, e.g. { country: 'DE', flag: true }
   * @param {boolean} [args.rmi=true]  - use wrs:M syntax when this is true, otherwise row columns element name is not touched
   * @param {boolean} [args.fire=true] - lets the listeners know, that the update was finished
   * @param {string}  [args.rowId]     - id specifying row which should be updated (or use filter)
   * @return {number} count of updated rows
   */
  tblUpdate(args) {
    args = args || {};
    const filter = args.filter || {};
    const values = args.values || {};
    const rmi = args.rmi === false ? false : args.rmi || true;
    const doFire = args.fire === false ? false : args.fire || true;
    const columnPosByBRef = this._getColumnPosByBRef();
    const rowIds = args.rowId
      ? [args.rowId]
      : Array.from(this.queryNodes(this._getFillParams(filter, "/*/wrs:Data/wrs:*" + this._buildXPathTemplate(filter) + "/@id"))).map(function(r) { return r.text || ""}).filter(function(f) { return f != ""; });

    rowIds.forEach(function(rowId) {
      const rowNode = this.query("/*/wrs:Data/wrs:*[@id='{{=it.rowId}}']", {rowId: rowId});
      if (rowNode != null) {
        for (let v in values) {
          if (typeof columnPosByBRef[v] != "undefined") {
            if (rmi)
              bcdui.wrs.wrsUtil.setCellValue(this.getData(), rowId, columnPosByBRef[v], values[v]);
            else {
              let node = rowNode.selectSingleNode("wrs:C["+columnPosByBRef[v]+"]");
              if (node != null) {
                if (values[v] === null) {
                  node.text = "";
                  bcdui.core.browserCompatibility.appendElementWithPrefix(node, "wrs:null");
                }
                else
                  node.text = values[v];
              }
            }
          }
          else
            bcdui.log.warn("illegal column " + v + " requested in " + this.id);
        }
      }
      else
        bcdui.log.warn("illegal row " + rowId + " requested in " + this.id);
    }.bind(this));

    if (doFire) this.fire;

    return rowIds.length;
  }

  /**
   * updates wrs rows with given data. Either a single row (via rowId) or single/multiple ones (via filter)
   * @param {Object}  args             - parameter bag
   * @param {Object}  [args.filter]    - object holding cell values which should be used for selecting the rows for update, e.g. { country: 'DE', flag: true }
   * @param {boolean} [args.rmi=true]  - use wrs:M syntax when this is true, otherwise row columns element name is not touched
   * @param {boolean} [args.fire=true] - lets the listeners know, that the update was finished
   * @param {string}  [args.rowId]     - id specifying row which should be deleted (or use filter) 
   * @return {number} count of removed rows
   */
  tblDelete(args) {
    args = args || {};
    const filter = args.filter || {};
    const rmi = args.rmi === false ? false : args.rmi || true;
    const doFire = args.fire === false ? false : args.fire || true;
    const xPathTpl = args.rowId
      ? this._getFillParams({rowId: args.rowId}, "/*/wrs:Data/wrs:*[@id='{{=it.rowId}}']")
      : this._getFillParams(filter, "/*/wrs:Data/wrs:*" + this._buildXPathTemplate(filter));
    const c = bcdui.core.removeXPath(this.getData(), xPathTpl, rmi)
    if (doFire) this.fire;
    return c;
  }

  /**
   * returns an array of requested data
   * @param {Object}  args            - parameter bag
   * @param {Object}  [args.filter]   - object holding cell values which should be used for selecting the rows for update, e.g. { country: 'DE', flag: true }
   * @param {Array<string>}   [args.columns]  - string array of requested columns, if not given, all columns are returned
   * @return {Array<Object>} Array of objects holding the requested data
   */
  tblSelect(args){
    args = args || {};
    const filter = args.filter || {}
    const columns = args.columns || Array.from(this.queryNodes("/*/wrs:Header/wrs:Columns/wrs:C")).map(function (e) { return e.getAttribute("id"); });
    return this._getDataFromTemplate(columns, "/*/wrs:Data/wrs:*" + this._buildXPathTemplate(filter), filter);
  }

  /**
   * returns one object representing the filtered data (either filter or rowId). In case of multiple filter matches, the first one is returned
   * @param {Object}  args                 - parameter bag
   * @param {Object}        [args.filter]  - object holding cell values which should be used for selecting the rows for update, e.g. { country: 'DE', flag: true }
   * @param {string}        [args.rowId]   - rowId of row which should be queried (or use filter)
   * @param {Array<string>} [args.columns] - string array of requested columns, if not given, all columns are returned
   * @return {Object} Array  of objects holding the requested data
   */
  tblSelectRow(args){
    args = args || {};
    if (args.rowId) {
      const columns = args.columns || Array.from(this.queryNodes("/*/wrs:Header/wrs:Columns/wrs:C")).map(function (e) { return e.getAttribute("id"); });
      return this._getDataFromTemplate(columns, "/*/wrs:Data/wrs:*[@id='{{=it.rowId}}']", {rowId: args.rowId})[0];
    }
    return this.tblFetchAll(args)[0];
  }

  /**
   * Set a value to on a certain xPath and create the xPath where necessary. 
   * This combines Element.evaluate() for a single node with creating the path where necessary. 
   * It will prefer extending an existing start-part over creating a second one.
   * After the operation the xPath (with the optional value) is guaranteed to exist (pre-existing or created or extended) and the addressed node is returned.
   * 
   * @param {string}  xPath        - xPath pointing to the node which is set to the value or plain xPath to be created if not there.
   *    It tries to reuse all matching parts that are already there. If you provide for example "/n:Root/n:MyElem/@attr2" and there is already "/n:Root/n:MyElem/@attr1", then "/n:Root/n:MyElem" will be "re-used" and get an additional attribute attr2.
   *    Many expressions are allowed, for example "/n:Root/n:MyElem[@attr1='attr1Value']/n:SubElem" is also ok.
   *    By nature, some xPath expressions are not allowed, for example using '//' or "/n:Root/n:MyElem/[@attr1 or @attr2]/n:SubElem" is obviously not unambiguous enough and will throw an error.
   *    This method is Wrs aware, use for example '/wrs:Wrs/wrs:Data/wrs:*[2]/wrs:C[3]' as xPath and it will turn wrs:R[wrs:C] into wrs:M[wrs:C and wrs:O], see Wrs format.
   *    (can include dot template placeholders which get filled with the given fillParams)
   * @param {Object} [fillParams] - array or object holding the values for the dot placeholders in the xpath. Values with "'" get 'escaped' with a concat operation to avoid bad xpath expressions
   *     Example: bcdui.wkModels.guiStatus.write("/guiStatus:Status/guiStatus:ClientSettings/guiStatus:Test[@caption='{{=it[0]}}' and @caption2='{{=it[1]}}']", ["china's republic", "drag\"n drop"])
   * @param {string}  [value]      - Optional value which should be written, for example to "/n:Root/n:MyElem/@attr" or with "/n:Root/n:MyElem" as the element's text content.
   *    If not provided, the xPath contains all values like in "/n:Root/n:MyElem[@attr='a' and @attr1='b']" or needs none like "/n:Root/n:MyElem" 
   * @param {boolean} [fire=false] - If true a fire is triggered to inform data modification listeners
   * @return {DomNode} The xPath's node or null if dataProvider isn't ready
   */
  write(xPath, fillParams, value, fire) {
    if (this.getData() == null)
      return null;
    this._uncommitedWrites = true;

    const resultElement = bcdui.wrs.wrsUtil.write(this.getData(), xPath, fillParams, value);
    const doFire = (typeof fillParams == "boolean") ? fillParams : typeof value == "boolean" ? value : fire;

    if (doFire) 
      this.fire();

    return resultElement;
  }

  /**
   * Deletes data at a given xPath from the model
   * @param {string} xPath - xPath pointing to the value
   * @param {Object} [fillParams] - array or object holding the values for the dot placeholders in the xpath. Values with "'" get 'escaped' with a concat operation to avoid bad xpath expressions 
   * @param {boolean} [fire=false] - if true a fire is triggered to notify data modification listener
   */
  remove(xPath, fillParams, fire) {
    if (this.getData() == null) return;

    this._uncommitedWrites = true;

    var f = (typeof fillParams == "boolean") ? fillParams : fire;
    var x = this._getFillParams(fillParams, xPath);

    bcdui.core.removeXPath(this.getData(), x);
    if (f) this.fire();
  }

  /**
   * Reads a single node from a given xPath
   * @param {string} xPath - xPath to query 
   * @param {Object} [fillParams] - array or object holding the values for the dot placeholders in the xpath. Values with "'" get 'escaped' with a concat operation to avoid bad xpath expressions 
   * @return {DomNode|null} single node or null if query fails
   */
  query(xPath, fillParams) {
    if (this.getData() == null) return null;
    var x = this._getFillParams(fillParams, xPath);
    return this.getData().selectSingleNode(x);
  }
  
  /**
   * Get node list from a given xPath
   * @param {string} xPath - xPath to query 
   * @param {Object} [fillParams] - array or object holding the values for the dot placeholders in the xpath. Values with "'" get 'escaped' with a concat operation to avoid bad xpath expressions 
   * @return {Array<DomNode>} node list or empty list if query fails
   */
  queryNodes(xPath, fillParams) {
    if (this.getData() == null) return [];
    var x = this._getFillParams(fillParams, xPath);
    return this.getData().selectNodes(x);
  }

  /**
   * Serialize dataprovider's data if available
   * @return {string} String containing the serialized data
   */
  serialize() {
    if (this.getData() == null)
      return null;
    if (this.getData().selectSingleNode)
      return new XMLSerializer().serializeToString(this.getData());
    else if (typeof this.getData() == "string")
      return this.getData();
    else if (typeof this.getData() == "object")
      return JSON.stringify(this.getData());
  }

  /**
   * Removes a data listener via its id or listener object / function.
   */

   /**
   * @typedef {object} RemoveDataListenerParam
   * @property {string} [id] - listener id
   * @property {string} [callback] - listener function
   */
  /**
   * @param {(string|function|RemoveDataListenerParam)} listenerObject - Either a listener function or id or a parameter map {@link RemoveDataListenerParam}. Listeners are added with onChange()
  */
  removeDataListener(listenerObject) {

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
  }

  /**
   * Adds a data listener to the DataProvider which can be triggered when the data (XML
   * document) is changed. The listener offers two options: It can either be fired on
   * any change or on a change in a specific XPath result.
   * Note that no uniqueness check is done before adding the listener so it is possible to add the same listener twice or more times.
   * /
   /**
   * @typedef {object} OnChangeParam
   * @property {function} callback - function to be called after changes
   * @property {string}   [trackingXPath] - xPath to monitor for changes
   * @property {boolean}  [onlyOnce=false] - fire on each change or only once  (higher priority than listenerObject's onlyOnce)
   * @property {string}   [id] - listener id (only needed for removeDataListener usability)
   */
   /**
   * @param {(function|OnChangeParam)} listenerObject - Either a function to be called after changes or a parameter map {@link OnChangeParam}. Listeners can be removed with removeDataListener()
   * @param {string}   [trackingXPath] - xPath to monitor to monitor for changes
  */
  onChange(listenerObject, trackingXPath) {

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
  }

  /**
   * @private
   */
  _fire(causedByReadyStatus) {

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

  }

  /**
   * this function is executed on .fireBeforeModelUpdate
   * @private
   */
  _initTrackingXPathListener(listener) {
    listener.oldData = this._hashValueForListener(listener.trackingXPath);
  }
  
  /**
   * this function is executed on .fireAfterModelUpdate
   * @private
   */
  _trackingXPathListener(listener, target) {
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
  }

  /**
   * creates a simple hash of given xPath value (as string) using following algorithm:
   *
   * 1) in case stringValue is less than 96 characters - return that value
   * 2) otherwise compute hash
   *
   * @return {string} hash value, null in case stringValue was null or empty string in case stringValue was empty
   * @private
   */
  _hashValueForListener(xPath){

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

  /**
   * @param {bcdui.core.Status} args
   */
  setStatus( args) {
    var stat = bcdui.core.AbstractExecutable.prototype.setStatus.call(this, args);

    // we do send a fire in case we reached a ready status
    // we need to rely on the returned object since calling this.getStatus() might
    // return a state beyond 'stat.newStatus'
    if (stat.oldStatus != stat.newStatus && stat.newStatus == this.getReadyStatus()) {
      this._fire(true); 
    }
  }

  /**
   * True, if DataProvider is ready and there are no uncommitted write transactions,
   * see {@link bcdui.core.AbstractExecutable#isReady isReady()} and {@link bcdui.core.DataProvider#onChange fire()}.
   * @returns {boolean}
   */
  isClean() {
    return (! this._uncommitedWrites && this.isReady());
  }

  /**
   * For backward compatibility only
   * @returns {boolean}
   * @private
   */
  isClear() { return this.isClean(); }

  /**
   * asynchronously fetch data for this data provider.
   *
   * @return {Promise<bcdui.core.DataProvider>} resolving once data has been loaded, first argument is this instance
   * @example
   * new bcdui.core.SimpleModel("data.xml").fetchData().then((dp)=>{ console.info(dp.getData()); })
   */
  fetchData() {
    return new Promise(function(resolve) {
      resolve = resolve.bind(undefined, this); // resolve passing 'this' as argument

      if (this._uncommitedWrites) { // if has pending writes, wait till .fire() via onChange listener
        this.onChange({
          callback : resolve,
          onlyOnce : true
        });
      } else if (this.isReady()) { // if ready, resolve instantly
        resolve();
      } else { // else, resolve via .onReady
        this.onceReady({
          onSuccess : resolve,
          executeIfNotReady : true
        });
      }
    }.bind(this));
  }
}; // Create class: bcdui.core.DataProvider
