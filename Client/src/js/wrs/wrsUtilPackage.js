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
 * Utility functions for working with wrs:Wrs documents from JavaScript.
 * These are mainly JavaScript wrappers around XML library found a bcdui/xslt
 * @namespace bcdui.wrs.wrsUtil
 */
bcdui.util.namespace("bcdui.wrs.wrsUtil", 
/** @lends bcdui.wrs.wrsUtil */
{

  /** @private */
  _wrsValidationTransformationURL:bcdui.config.libPath + "xslt/validate/validateWrs.xslt",

  /** @private */
  _wrsValidationGlueTransformationURL:bcdui.config.libPath + "xslt/validate/validationGlue.xslt",

  /** @private */
  _wrsDeleteTransformationURL: bcdui.config.libPath + "xslt/wrs/deleteRows.xslt",

  /** @private */
  _wrsInsertRowTransformationURL: bcdui.config.libPath + "xslt/wrs/insertRow.xslt",

  /** @private */
  _wrsRestoreTransformationURL:  bcdui.config.libPath + "xslt/wrs/restore.xslt",

  /** @private */
  _wrsCopyTransformationURL: bcdui.config.libPath + "xslt/wrs/copy.xslt",

  /** @private */
  _wrsPasteTransformationURL: bcdui.config.libPath + "xslt/wrs/paste.xslt",

  /** @private */
  _wrsDuplicateRowsTransformationURL: bcdui.config.libPath + "xslt/wrs/duplicateRows.xslt",

  /** @private */
  _wrsPrepareToPostTransformationURL:bcdui.config.libPath + "xslt/wrs/prepareToPost.xslt",

  /** @private */
  _columnSeparator: "\t",

  /** @private */
  _rowSeparator: "\n",

  /** @private */
  _transactionsNumber: 0,

  /**
   * 1-based position of a row which is identified by its row-id
   *
   * @param {Object} args - Parameter object with the following properties
   * @param {(string|bcdui.core.DataProvider)} args.model - Id of a DataProvider or the DataProvider itself (dp must be ready)
   * @param {string}                           args.rowId - Row id of which to get the position
   * @returns {integer} Either position of a row in the document or -1 if no such row was found
   */
  getRowPositionByRowId: function(args){
    var doc = (typeof args.model == "string" ? bcdui.factory.objectRegistry.getObject(args.model) : args.model).dataDoc;
    var rowNode = doc.selectSingleNode("/*/wrs:Data/*[@id='"+args.rowId+"']");
    if(rowNode == null){
      return -1;
    }

    //count siblings
    var sibs=1;
    var ptr=rowNode;
    while((ptr = ptr.previousSibling)!=null){
      ++sibs;
    }
    return sibs;
  },

  /**
   * Save Wrs data of a {@link bcdui.core.DataProvider}
   * 
   * @param {Object} args - Parameter object with the following properties:
   * @param {(string|bcdui.core.DataProvider)} args.model          - DataProvider (or its id), holding the Wrs with wrs:R|I|M|D row and wrs:C|O column nodesto be saved
   * @param {boolean}                          [args.reload=false] - Useful especially for models of type SimpleModel for refreshing from server after save
   * @param {function}                         [args.onSuccess]    - Callback after saving (and optionally reloading) was successfully finished
   */
  saveModel: function(args){
    var model = (typeof (args.model || args.modelId) == "string") ? bcdui.factory.objectRegistry.getObject(args.model || args.modelId) : args.model;
    if (typeof(model) == "undefined")
      throw new Error("Model is required parameter");

    // Transform and clean Wrs before post, limit to wrs:D, wrs:M, wrs:I and bring them in that order
    var cleanupMw = new bcdui.core.ModelWrapper({
      chain: this._wrsPrepareToPostTransformationURL,
      inputModel: model
    });

    // Once the ModelWrapper with the cleaned, use a temporary SimpleModel for saving
    cleanupMw.onceReady({ executeIfNotReady: true, onSuccess: function() {

      // Create a temp model for sending the data, we do not touch our input
      var sendModel = new bcdui.core.SimpleModel({ url: args.url || model.urlProvider });
      sendModel.saveChain = model.saveChain;
      sendModel.saveParameters = model.saveParameters;
      sendModel.dataDoc = bcdui.core.browserCompatibility.cloneDocument( cleanupMw.getData() );
      sendModel.setStatus( sendModel.getReadyStatus() );

      // In case we want a reload our input, prepare the handler here
      if( args.reload === true ) {
        // With reload: call onSuccess after reloading input model
        sendModel.addStatusListener({
          status: new bcdui.core.status.SavedStatus(),
          onlyOnce: true,
          listener: function () {
            model.onReady({ onSuccess: args.onSuccess, onlyFuture: true, onlyOnce: true });
            model.execute(true);
          }
        });
      } else {
        // No reload: call onSuccess after saving
        sendModel.onReady({ onSuccess: args.onSuccess, onlyFuture: true, onlyOnce: true });
      }

      // Save the data with the help of the temp model
      sendModel.sendData();
    }});
  },

  /**
   * Deleting rows (operation will change source model).
   * See {@link bcdui.wrs.wrsUtil.restore restore()} on how the change history is maintained.
   *
   * @param {Object} args - Parameter object with the following properties
   * @param {bcdui.core.DataProvider} args.model                   - Id of a DataProvider or the DataProvider itself (dp must be ready)
   * @param {integer}                 args.rowStartPos             - Delete rows from
   * @param {integer}                 [args.rowEndPos=rowStartPos] - Delete rows including to. By default is equal rowStartPos
   * @param {function}                [args.fn]                    - Callback function called after operation
   * @param {boolean}                 [args.propagateUpdate=true]  - If false, model is not fired
   */
  deleteRows: function(args){
    var model = (typeof (args.model || args.modelId) == "string") ? bcdui.factory.objectRegistry.getObject(args.model || args.modelId) : args.model;
    if (typeof(model) == "undefined")
      throw new Error("Model is required parameter");

    if (typeof args.rowStartPos == "undefined" || args.rowStartPos == null || args.rowStartPos < 1)
      throw new Error("rowStartPos is required parameter");
    if (typeof args.rowEndPos == "undefined" || args.rowEndPos == null || args.rowEndPos < args.rowStartPos)
      args.rowEndPos = args.rowStartPos;
    this.runStaticXSLT(
      /* model */                 model,
      /* transformationId */      "wrs_defaultDeleteRowTransformation",
      /* transformationUrl */     this._wrsDeleteTransformationURL,
      /* parameters */            {
                                    rowStartPos: args.rowStartPos,
                                    rowEndPos: args.rowEndPos,
                                    transactionsNumber:this._transactionsNumber++
                                  },
      /* fn */                   function(result) {
                                    model.dataDoc = result;
                                    if (!(args.propagateUpdate === false))
                                      model.fire();
                                    if (typeof args.fn != 'undefined')
                                      args.fn(result);
                                 }
    );
  },

  /**
   * Restore (operation will change source model).
   * Client side operations on Wrs keep a history, wrs:R turns into wrs:M for modified rows and wrs:D for deleted.
   * Changed columns change from wrs:C to wrs:O. This allows undoing such a change till the data is send to the server.
   * 
   * @param {Object} args - Parameter object with the following properties
   * @param {bcdui.core.DataProvider} args.model                   - Id of a DataProvider or the DataProvider itself (dp must be ready)
   * @param {integer}                 args.rowStartPos             - Restore rows from
   * @param {integer}                 [args.rowEndPos=rowStartPos] - Restore rows including to.
   * @param {integer}                 [args.colStartPos=1]         - Restore cols from
   * @param {integer}                 [args.colEndPos=colStartPos] - Restore cols including to.
   * @param {function}                [args.fn]                    - Callback function called after operation
   * @param {boolean}                 [args.propagateUpdate=true]  - If false, model is not fired
   */
  restore: function(args){
    var model = (typeof (args.model || args.modelId) == "string") ? bcdui.factory.objectRegistry.getObject(args.model || args.modelId) : args.model;
    if (typeof(model) == "undefined")
      throw new Error("Model is required parameter");

    if (typeof args.rowStartPos == "undefined" || args.rowStartPos == null || args.rowStartPos < 1)
      throw new Error("rowStartPos is required parameter");
    if (typeof args.colStartPos == "undefined" || args.colStartPos == null || args.colStartPos < 1)
      args.colStartPos = 1;
    if (typeof args.rowEndPos == "undefined" || args.rowEndPos == null || args.rowEndPos < args.rowStartPos)
      args.rowEndPos = args.rowStartPos;
    if (typeof args.colEndPos == "undefined" || args.colEndPos == null || args.colEndPos < args.colStartPos)
      args.colEndPos = args.colStartPos;

    this.runStaticXSLT(
      /* model */             model,
      /* transformationId */  "wrs_defaultRestoreTransformation",
      /* transformationUrl */ this._wrsRestoreTransformationURL,
      /* parameters */        {
                                colStartPos: args.colStartPos,
                                rowStartPos : args.rowStartPos,
                                colEndPos : args.colEndPos,
                                rowEndPos : args.rowEndPos,
                                transactionsNumber:this._transactionsNumber++
                              },
      /* fn */                function(result) {
                                model.dataDoc = result;
                                if (!(args.propagateUpdate === false))
                                  model.fire();
                                if (typeof args.fn != 'undefined')
                                  args.fn(result);
                              }
        );
  },
  
  /**
   * once new element is created (wrs:I, or wrs:C inside wrs:I or others) this function offers
   * various "repair" strategies, such as handling proper amount of wrs:C according to header, etc
   *
   * @param node - the created node (must be already attached into its document)
   *
   * @private
   */
  repairWrsNode: function(node){
    /*
     * if wrs:I is created (has no children) and wrs:Header is found we replicate wrs:C according
     * to header
     */
    var repairWrsI = function(node){
      if(node.childNodes.length == 0){
        var cols = node.parentNode.parentNode.selectNodes("wrs:Header/wrs:Columns/wrs:C").length;
        for(var i=0;i<cols;i++){
          bcdui.core.browserCompatibility.appendElementWithPrefix(node, "wrs:C");
        }
      }
    };
  
    if(node.nodeName == "wrs:I"){
      repairWrsI(node);
    }
  },

  /**
   * Creates the wrs:O elements based as copies of the wrs:C elements
   * @param wrsRow The row the wrs:O elements should be inserted at.
   * @return {XMLElement} The wrsRow element.
   * @private
   */
  createWrsONodes: function(wrsRow)
    {
      var columns = jQuery.makeArray(wrsRow.selectNodes("wrs:C"));
      for (var pos = 0; pos < columns.length; ++pos) {
        var wrsO_element = pos == columns.length - 1 ?
            bcdui.core.browserCompatibility.appendElementWithPrefix(wrsRow, "wrs:O") :
            bcdui.core.browserCompatibility.appendElementWithPrefix(columns[pos+1], "wrs:O", true);
        bcdui.util.xml.cloneElementContent(wrsO_element, columns[pos]);
      }
      return wrsRow;
    },

  /**
   * Copy (copies selected cells to clipboard, not changes source model)
   * 
   * @param {Object} args - Parameter object with the following properties
   * @param {bcdui.core.DataProvider} args.model                   - Id of a DataProvider or the DataProvider itself (dp must be ready)
   * @param {integer}                 args.rowStartPos             - Restore rows from
   * @param {integer}                 [args.rowEndPos=rowStartPos] - Restore rows including to.
   * @param {integer}                 [args.colStartPos=1]         - Restore cols from
   * @param {integer}                 [args.colEndPos=colStartPos] - Restore cols including to.
   * @param {function}                [args.fn]                    - Callback function called after operation
   */
  copy: function(args){
    var model = (typeof (args.model || args.modelId) == "string") ? bcdui.factory.objectRegistry.getObject(args.model || args.modelId) : args.model;
    if (typeof(model) == "undefined")
      throw new Error("Model is required parameter");

    if (typeof args.rowStartPos == "undefined" || args.rowStartPos == null || args.rowStartPos < 1)
      throw new Error("rowStartPos is required parameter");
    var selection = {
      colStartPos   : typeof args.colStartPos == "undefined" ? 1 : args.colStartPos,
      colEndPos     : typeof args.colEndPos == "undefined" ? 1 : args.colEndPos,
      rowStartPos   : args.rowStartPos,
      rowEndPos     : typeof args.rowEndPos == "undefined" ? args.rowStartPos : args.rowEndPos,
      clipboardData : new bcdui.core.StaticModel({ data : "<Empty/>" }),
      columnSeparator : this._columnSeparator,
      rowSeparator : this._rowSeparator,
      transactionsNumber : this._transactionsNumber++
    }
    this.runStaticXSLT(
      /* model */               model,
      /* transformationId */    "wrs_defaultCopyTransformation",
      /* transformationUrl */   this._wrsCopyTransformationURL,
      /* parameters */          selection,
      /* fn */                  function(result) {
                                  var firstChild = result.documentElement.firstChild;
                                  bcdui.util.clipboard.copy(firstChild == null ? "" : firstChild.nodeValue);
                                  if (typeof args.fn != 'undefined')
                                    args.fn(result);
                                }
        );
  },

  /**
   * paste (Paste data from clipboard. Changes source model)
   * 
   * @param {Object} args - Parameter object with the following properties
   * @param {bcdui.core.DataProvider} args.model                   - Id of a DataProvider or the DataProvider itself (dp must be ready)
   * @param {integer}                 args.rowStartPos             - Restore rows from
   * @param {integer}                 [args.rowEndPos=rowStartPos] - Restore rows including to.
   * @param {integer}                 [args.colStartPos=1]         - Restore cols from
   * @param {integer}                 [args.colEndPos=1]           - Restore cols including to.
   * @param {function}                [args.fn]                    - Callback function called after operation
   * @param {boolean}                 [args.propagateUpdate=true]  - If false, model is not fired
   */
  paste: function(args){
    var model = (typeof (args.model || args.modelId) == "string") ? bcdui.factory.objectRegistry.getObject(args.model || args.modelId) : args.model;
    if (typeof(model) == "undefined")
      throw new Error("Model is required parameter");

    if (typeof args.rowStartPos == "undefined" || args.rowStartPos == null || args.rowStartPos < 1)
      throw new Error("rowStartPos is required parameter");
    var selection = {
        colStartPos   : typeof args.colStartPos == "undefined" ? 1 : args.colStartPos,
        colEndPos     : typeof args.colEndPos == "undefined" ? 1 : args.colEndPos,
        rowStartPos   : args.rowStartPos,
        rowEndPos     : typeof args.rowEndPos == "undefined" ? args.rowStartPos : args.rowEndPos,
        clipboardData : new bcdui.core.DataProviderAlias( {
          name: "clipboardData", 
          source: new bcdui.core.StaticModel( { data : bcdui.util.clipboard.pasteCSVasXML() }) 
        }),
        columnSeparator : this._columnSeparator,
        rowSeparator : this._rowSeparator,
        transactionsNumber : this._transactionsNumber++
    }

    this.runStaticXSLT(
      /* model */               model,
      /* transformationId */    "wrs_defaultPasteTransformation",
      /* transformationUrl */   this._wrsPasteTransformationURL,
      /* parameters */          selection,
      /* fn */                  function(result) {
                                  model.dataDoc = result;
                                  if (!(args.propagateUpdate === false))
                                    model.fire();
                                  if (typeof args.fn != 'undefined')
                                    args.fn(result);
                                }
    );
  },

  /**
   * Paste data from clipboard as new rows. Changes source model
   * 
   * @param {Object} args - Parameter object with the following properties
   * @param {bcdui.core.DataProvider} args.model                   - Id of a DataProvider or the DataProvider itself (dp must be ready)
   * @param {integer}                 args.rowStartPos             - Restore rows from
   * @param {integer}                 [args.rowEndPos=rowStartPos] - Restore rows including to.
   * @param {integer}                 [args.colStartPos=1]         - Restore cols from
   * @param {integer}                 [args.colEndPos=1]           - Restore cols including to.
   * @param {function}                [args.fn]                    - Callback function called after operation
   * @param {boolean}                 [args.propagateUpdate=true]  - If false, model is not fired
   */
  pasteAsNewRows: function(args){
    var model = (typeof (args.model || args.modelId) == "string") ? bcdui.factory.objectRegistry.getObject(args.model || args.modelId) : args.model;
    if (typeof(model) == "undefined")
      throw new Error("Model is required parameter");

    if (typeof args.rowStartPos == "undefined" || args.rowStartPos == null || args.rowStartPos < 1)
      throw new Error("rowStartPos is required parameter");
    var selection = {
        colStartPos   : typeof args.colStartPos == "undefined" ? 1 : args.colStartPos,
        colEndPos     : typeof args.colEndPos == "undefined" ? 1 : args.colEndPos,
        rowStartPos   : args.rowStartPos,
        rowEndPos     : typeof args.rowEndPos == "undefined" ? args.rowStartPos : args.rowEndPos,
        clipboardData : new bcdui.core.DataProviderAlias( {
            name: "clipboardData", 
            source: new bcdui.core.StaticModel( { data : bcdui.util.clipboard.pasteCSVasXML() }) 
          }),
        columnSeparator : this._columnSeparator,
        rowSeparator    : this._rowSeparator,
        pasteAsNewRows  : 'true',
        transactionsNumber : this._transactionsNumber++
    }

    this.runStaticXSLT(
      /* model */               model,
      /* transformationId */    "wrs_defaultPasteTransformation",
      /* transformationUrl */   this._wrsPasteTransformationURL,
      /* parameters */          selection,
      /* fn */                  function(result) {
                                  model.dataDoc = result;
                                  if (!(args.propagateUpdate === false))
                                    model.fire();
                                  if (typeof args.fn != 'undefined')
                                    args.fn(result);
                                }
    );
  },

  /**
   * Helper to removes a row in the wrs format. Therefore the element must either be a
   * wrs:R, wrs:I, wrs:M or wrs:D element. wrs:I rows are simply removed, wrs:R rows become wrs:D, wrs:D rows remain untouched
   * 
   * @param {Element} row - The wrs row to be deleted.
   * @return {Boolean} True, if the element has been a valid wrs element
   * which is applicable for this function (wrs:R, wrs:I, wrs:M or wrs:D) or
   * false otherwise.
   * @private
   */
  deleteWrsRow: function(/* XMLElement */ element)
    {
      if (element.namespaceURI != bcdui.core.xmlConstants.namespaces.wrs) {
        return false;
      }
      var nodeName = element.baseName || element.localName;
      if (nodeName == "D") return true;
      if (nodeName == "I") {
        element.parentNode.removeChild(element);
        return true;
      }
      if (nodeName != "R" && nodeName != "M") {
        return false;
      }
      var isModifyRow = nodeName == "M";
      var newElement = bcdui.core.browserCompatibility.appendElementWithPrefix(element, "wrs:D", true);
      var elements = jQuery.makeArray(element.selectNodes("wrs:C")).concat(jQuery.makeArray(element.attributes));
      for (var pos = 0; pos < elements.length; ++pos) {
        var e = elements[pos];
        if (e.nodeType == 2) {
          /*
           * Workaround: Internet Explorer wrongfully returns namespace declarations
           *             (xmlns:myNs=...) as XML attributes.
           */
          if (e.nodeName != "xmlns:wrs"){
            newElement.setAttribute(e.nodeName, e.nodeValue);
          }
        } else if (isModifyRow && e.nodeType == 1) {
          var nextElement = bcdui.util.xml.nextElementSibling(e);
          if ((nextElement.baseName || nextElement.localName) == "O") {
            bcdui.util.xml.cloneElementContent(
                bcdui.core.browserCompatibility.appendElementWithPrefix(newElement, "wrs:C"),
                nextElement);
          } else {
            newElement.appendChild(e);
          }
        } else {
          newElement.appendChild(e);
        }
      }
      element.parentNode.removeChild(element);
      return true;
    },

  /**
   * @param {bcdui.core.DataProvider} model - Id of a DataProvider or the DataProvider itself (dp must be ready)
   * @param {Element|string}          row   - Row element or row-id to be duplicated
   * @param {boolean}                 [propagateUpdate=true] - If false, model is not fired
   * @param {function}                [fn]                   - Callback function called after operation
   */
  duplicateRow: function( model, row, propagateUpdate, fn ) {
    var row = bcdui.util.isString(row) ? model.query("/*/wrs:Data/wrs:*[@id='"+row+"']") : row;
    var pos = row.selectNodes("preceding-sibling::*").length + 1;
    bcdui.wrs.wrsUtil.duplicateRows({ model: model, rowStartPos: pos, propagateUpdate: propagateUpdate, fn: fn });
  },

  /**
   * Duplicate rows in Wrs. Fires fire
   * 
   * @param {Object} args - Parameter object with the following properties
   * @param {bcdui.core.DataProvider} args.model                        - Id of a DataProvider or the DataProvider itself (dp must be ready)
   * @param {integer}                 [args.rowStartPos]                - First row to be duplicated
   * @param {integer}                 [args.rowEndPos=rowStartPos]      - Last row to be duplicated
   * @param {function}                [args.fn]                         - Callback function called after operation
   * @param {boolean}                 [args.insertBeforeSelection=true]
   * @param {boolean}                 [args.propagateUpdate=true]  - If false, model is not fired
   */
  duplicateRows: function(args){
    var model = (typeof (args.model || args.modelId) == "string") ? bcdui.factory.objectRegistry.getObject(args.model || args.modelId) : args.model;
    if (typeof(model) == "undefined")
      throw new Error("Model is required parameter");

    if (typeof args.rowStartPos == "undefined" || args.rowStartPos == null || args.rowStartPos < 1)
      args.rowStartPos = "";
    if (typeof args.rowEndPos == "undefined" || args.rowEndPos == null || args.rowEndPos < args.rowStartPos)
      args.rowEndPos = args.rowStartPos;
    if (typeof args.insertBeforeSelection == "undefined")
      args.insertBeforeSelection = true;

    this.runStaticXSLT(
      /* model */               model,
      /* transformationId */    "wrs_defaultDuplicateRowsTransformation",
      /* transformationUrl */   this._wrsDuplicateRowsTransformationURL,
      /* parameters */          {
                                  rowStartPos: args.rowStartPos,
                                  rowEndPos: args.rowEndPos,
                                  insertBeforeSelection: args.insertBeforeSelection,
                                  transactionsNumber : this._transactionsNumber++
                                },
      /* fn */                  function(result) {
                                  model.dataDoc = result;
                                  if (!(args.propagateUpdate === false))
                                    model.fire();
                                  if (typeof args.fn != 'undefined')
                                    args.fn(result);
                                }
    );
  },

  /**
   * Copy all rows to CVS
   * 
   * @param {Object} args - Parameter object with the following properties
   * @param {bcdui.core.DataProvider} args.model                   - Id of a DataProvider or the DataProvider itself (dp must be ready)
   * @param {function}                [args.fn]                    - Callback function called after operation
   */
  copyAllRows2CSV: function(args)
    {
      var model = (typeof (args.model || args.modelId) == "string") ? bcdui.factory.objectRegistry.getObject(args.model || args.modelId) : args.model;
      if (typeof(model) == "undefined")
        throw new Error("Model is required parameter");

      var selection = {
         colStartPos: 1
        ,colEndPos: 1000000
        ,rowStartPos: 1
        ,rowEndPos: 1000000
        ,clipboardData: new bcdui.core.StaticModel({ data : "<Empty/>" })
        ,columnSeparator : ','
        ,rowSeparator:'\n'
      };

      this.runStaticXSLT(
        /* model */               model,
        /* transformationId */    "wrs_defaultCopyTransformation",
        /* transformationUrl */   this._wrsCopyTransformationURL,
        /* parameters */          selection,
        /* fn */                  function(result) {
                                    var firstChild = result.documentElement.firstChild;
                                    bcdui.util.clipboard.copy(firstChild == null ? "" : firstChild.nodeValue);
                                    if (typeof args.fn != 'undefined')
                                      args.fn(result);
                                  }
      );
    },

  /**
   * Inserting rows
   * 
   * @param {Object} args - Parameter object with the following properties
   * @param {bcdui.core.DataProvider} args.model                   - Id of a DataProvider or the DataProvider itself (dp must be ready)
   * @param {integer}                 [args.rowStartPos=1]         - Start
   * @param {integer}                 [args.rowEndPos=rowStartPos] - End
   * @param {function}                [args.fn]                    - Callback function called after operation
   * @param {boolean}                 [args.insertBeforeSelection=true]
   * @param {boolean}                 [args.propagateUpdate=true]  - If false, model is not fired
   */
  insertRow: function(args)
  {
    var model = (typeof (args.model || args.modelId) == "string") ? bcdui.factory.objectRegistry.getObject(args.model || args.modelId) : args.model;
    if (typeof(model) == "undefined")
      throw new Error("Model is required parameter");

    if (typeof args.rowStartPos == "undefined" || args.rowStartPos == null || args.rowStartPos < 1)
      args.rowStartPos = "";
    if (typeof args.rowEndPos == "undefined" || args.rowEndPos == null || args.rowEndPos < args.rowStartPos)
      args.rowEndPos = args.rowStartPos;
    if (typeof args.insertBeforeSelection == "undefined")
      args.insertBeforeSelection = true;
    if (typeof args.setDefaultValue == "undefined")
      args.setDefaultValue = true;

    this.runStaticXSLT(
      /* model */               model,
      /* transformationId */    "wrs_defaultInsertRowTransformation",
      /* transformationUrl */   this._wrsInsertRowTransformationURL,
      /* parameters */          {
                                  rowStartPos: args.rowStartPos,
                                  rowEndPos: args.rowEndPos,
                                  insertBeforeSelection: args.insertBeforeSelection,
                                  transactionsNumber: this._transactionsNumber++,
                                  setDefaultValue: args.setDefaultValue
                                },
      /* fn */                  function(result) {
                                  model.dataDoc = result;
                                  if (!(args.propagateUpdate === false))
                                    model.fire();
                                  if (typeof args.fn != 'undefined')
                                    args.fn(result);
                                }
    );
  },


  /**
   * method that makes one xslt transformation
   * @parameters
   *   (WRS Model)  model
   *   (String)     transformationId
   *   (String)     transformationUrl
   *   (Object)     parameters
   *   (Function)   fn - callback function
   * @private
   */
  runStaticXSLT: function(model, transformationId, transformationUrl, parameters, fn)
  {
   var transformation = bcdui.factory.objectRegistry.getObject(transformationId);

    if(transformation != null){
      bcdui.factory.objectRegistry.deRegisterObject(transformation);
    }
    var dataProviders = new Array();
    dataProviders.push(model);
    transformation = new bcdui.core.TransformationChain({
        id: transformationId,
        chain: transformationUrl,
        dataProviders: dataProviders
    });

    for (var name in parameters) {
      var value = parameters[name];
      if (typeof value != "undefined") {
        var dataProvider = value instanceof bcdui.core.DataProvider ? value : new bcdui.core.ConstantDataProvider({ name: name, value: value });
        transformation.addDataProvider(dataProvider);
      }
    }
    bcdui.core.reExecute(transformation, function() {
        fn(transformation.getData());
      }.bind(this), true);
  },

  /**
   * runs validation xslt against given model, you can access the result via returned trafo, see return section.
   * for one-time validation you can supply the callback function (fn parameter)
   * 
   * @param {Object} args - Parameter object with the following properties
   * @param {string}                    validationId                            - 'bcdValidationId' attribute in ValidationResult/Wrs yields this value
   * @param {(string|bcdui.core.DataProvider)} args.model                       - Id of a DataProvider or the DataProvider itself (dp must be ready)
   * @param {url}                       [args.stylesheetUrl=defauldValidation]  - URL to validation stylesheet, defaults to 'xslt/validate/validateWrs.xslt'
   * @param {bcdui.core.DataProvider[]} args.dataProviders                      - additional data providers as parameters
   * @param {function}                  [args.fn]                               - callback function called after validation done, gets object as parameter, containig properties: validationResult: the wrs:ValidationResult node of resulting transformation, may be null
   * 
   * @return  created transformation chain for the validation, it can be reused via bcdui.core.reExecute(_validatorTrafo, callBackFn);
   *          the data can be accessed via _validatorTrafo.getData() which returns wrs:ValidationResult or null or ValidationResult with empty wrs:Data
   */
  validateModel: function(args){
    args=args||{};
    
    var model = (typeof (args.model || args.modelId) == "string") ? bcdui.factory.objectRegistry.getObject(args.model || args.modelId) : args.model;
    if (typeof(model) == "undefined")
      throw new Error("Model is required parameter");

    var transformationId = "bcduiWrsUtilValidateTransformation_" + bcdui.factory.objectRegistry.generateTemporaryIdInScope("wrsUtilValidate");
    var transformation = bcdui.factory.objectRegistry.getObject(transformationId);

    if(transformation != null){
      bcdui.factory.objectRegistry.deRegisterObject(transformation);
    }
    var url = (args.stylesheetUrl ? args.stylesheetUrl : this._wrsValidationTransformationURL);

    if(!(url instanceof Array)){
      url = [url];
    }

    var dataProviders = new Array();
    dataProviders.push(model);
    if(args.dataProviders){
      dataProviders = dataProviders.concat(args.dataProviders);
    }
    transformation = new bcdui.core.TransformationChain({
        id: transformationId
        ,chain: url
        ,dataProviders: dataProviders.concat([
                                              new bcdui.core.ConstantDataProvider({ name:"standAlone", value:"true" }),
                                              new bcdui.core.ConstantDataProvider({ name:"bcdValidationId", value:args.validationId||"" })])
    });

    // -- execute validation
    bcdui.factory.reDisplay({
      idRef:transformationId
      ,fn:function(){
        args.fn&&args.fn({
          validationResult : transformation.dataDoc.selectSingleNode("//wrs:ValidationResult[wrs:Wrs/wrs:Data/wrs:*]")
        });
      }
    });

    return transformation;
  },

  /** @private */
  _INVALID_ROW_TEMPLATE : doT.compile('<R xmlns="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"><C>{{=it.rowId}}</C><C>{{=it.colId}}</C><C>{{=it.error}}</C></R>'),

  /**
   * Wrs validation which validates selected wrs:C against provided validation function
   * parameters:
   *
   * @param {Object} args - Parameter object with the following properties
   * @param {string}                              args.validationId           - the ID of this validator  
   * @param {(string|bcdui.core.DataProvider)}    args.model                  - Id of a DataProvider or the DataProvider itself (dp must be ready)
   * @param {function}                            args.cellValidation.func    - function taking args object with:
   *                                                                            'wrsC'        - the wrs:C element to validate
   *                                                                            'wrsHeaderC'  - the wrs:Header/wrs:Columns/wrs:C meta info element
   *                                                                            returns either NULL (valid) or { validationMessage:String }
   * @param {function}                            args.cellValidation.bRefSelector - function taking wrs:Header element and returns node-set of wrs:Columns/wrs:C to get validated
   * 
   * @return wrsDoc
   */
  wrsValidation : function(args){
    args=args||{cellValidation:{}};

    var model = (typeof (args.model || args.modelId) == "string") ? bcdui.factory.objectRegistry.getObject(args.model || args.modelId) : args.model;

    if(!args.wrsDoc && !model){
      throw "missing either wrsDoc or model property";
    }
    if(!args.cellValidation.func){
      throw "missing cellValidation.func property";
    }
    if(!args.cellValidation.bRefSelector){
      throw "missing cellValidation.bRefSelector property";
    }
    if(!args.validationId){
      throw "missing .validationId property";
    }
    var validationId = args.validationId;

    var wrsDoc = args.wrsDoc || model.getData();
    var wrs = null;

    if(wrsDoc.nodeType == 1 && wrsDoc.selectSingleNode(".[self::wrs:Wrs]")){ // is element
      wrs = wrsDoc;
      wrsDoc = wrsDoc.ownerDocument;
    } else {
      wrs = wrsDoc.selectSingleNode("/wrs:Wrs");
    }

    if(!wrs){
      return wrsDoc;
    }

    var wrsHeader = wrs.selectSingleNode("wrs:Header");

    var bRefNodes = args.cellValidation.bRefSelector(wrsHeader);
    if(!bRefNodes.length){
      return wrsDoc;
    }

    var itemByIdMap = {};
    var bRefs = [];
    // build item map and bRefs
    for(var i=0,imax=bRefNodes.length; i<imax; i++){
      var node = bRefNodes.item(i);
      var id=node.getAttribute("id");
      itemByIdMap[id] = node;
      bRefs.push(id);
    }

    // cleanup from previous validation
    bcdui.core.removeXPath(wrsDoc, "/wrs:Wrs/wrs:Header/wrs:ValidationResult/wrs:Wrs[@bcdValidationId='"+validationId+"']", false);

    var rowNodes = wrs.selectNodes("wrs:Data/wrs:*[not(self::wrs:D)]");

    if(!rowNodes.length){
      return wrsDoc;
    }

    var cache={
      colPosById : {}
    };

    /*
     * for every row
     */
    for(var i=0,imax=rowNodes.length; i<imax; i++){
      var rowNode = rowNodes.item(i);
      var rowId = rowNode.getAttribute("id");
      /*
       * validate wrs:C
       */
      bRefs.forEach(function(bRef){
        var pos = cache.colPosById[bRef]||bcdui.wrs.wrsUtil.getColPosById(wrs, bRef);
        cache.colPosById[bRef]=pos;
        var wrsC = rowNode.selectSingleNode("wrs:C["+pos+"]");
        if(wrsC){
          var validationResult = args.cellValidation.func({
            wrsC        : wrsC,
            wrsHeaderC  : itemByIdMap[bRef]
          });
          if(validationResult){
            // write wrs:ValidationResult
            var validationDataNode = bcdui.wrs.wrsUtil.getValidationResult(wrs, validationId, true).selectSingleNode("wrs:Data");

            // create invalid record identifier
            var invalidRowRecord = bcdui.core.browserCompatibility.createDOMFromXmlString(bcdui.wrs.wrsUtil._INVALID_ROW_TEMPLATE({
              rowId   : rowId,
              colId   : bRef,
              error   : validationResult.validationMessage
            }));

            // attach invalid row record
            validationDataNode.appendChild(wrsDoc.importNode(invalidRowRecord.documentElement,true));
          }
        }
      });
    }
    return wrsDoc;
  },

  /**
   * Generates metadata JS object from a Wrs document
   *
   * @param {document} wrsDoc - WRS Document to build a header from
   * @return {object} with { [column-id] : {object-with-attrs from wrs:Column/wrs:C} }
   */
  generateWrsHeaderMeta : function(wrsDoc){
    var map = {};
    var nodes = wrsDoc.selectNodes("/*/wrs:Header/wrs:Columns/wrs:C");

    for(var i=0,imax=nodes.length; i<imax; i++){
      var node = nodes.item(i);
      var attrMap = map[node.getAttribute("id")] = {};
      for(var a of Array.from(node.attributes)){
        attrMap[a.name] = a.value;
      }
    }

    return map;
  },

  /**
   * Convenience method to return error count in current document (possibly validated by validateWrs.xml)
   * @param {string|bcdui.core.DataProvider} wrs - Id of a DataProvider or the DataProvider itself (dp must be ready)
   * @return -2: if no validation has been performed, -1: if the data provider is not ready yet, otherwise the number of errors found is returned
   */
  getValidationErrorCount: function(wrs){
    if(!wrs)return -1;
    var dataProvider = null;
    if(bcdui.util.isString(wrs))
      dataProvider = bcdui.factory.objectRegistry.getObject(wrs);
    else if(wrs instanceof bcdui.core.DataProvider)
      dataProvider = wrs;
    if(dataProvider && !dataProvider.isReady())
      return -1;
    else{
      wrs = dataProvider == null ? wrs : dataProvider.getData();
      var vrNode = wrs.selectSingleNode("//wrs:Wrs/wrs:Header/wrs:ValidationResult"); //support multi-wrs
      return vrNode == null ? -2 : vrNode.selectNodes("*/wrs:Data/wrs:*").length; // support ValidationResult - multi-wrs
    }
  },

  /**
   * This transposes the inner-most @dim column column of a WRS from rows to columns.
   * This is faster using the XLST with the same name except for Webkit, where this is faster
   * 
   * @param {string|bcdui.core.DataProvider} input - Id of a DataProvider or the DataProvider itself (dp must be ready)
   * @returns {XMLDocument} The transposed document
   */
  transposeGrouping: function( input )
  {
    var dataProvider = null;
    if (bcdui.util.isString(input))
      dataProvider = bcdui.factory.objectRegistry.getObject(input);
    else if (input instanceof bcdui.core.DataProvider)
      dataProvider = input;
    input = dataProvider == null ? input : dataProvider.getData();

    var dimNodes = input.selectNodes("/*/wrs:Header/wrs:Columns/wrs:C[@dimId][not(position()=last())]");
    var dimNodesCnt = dimNodes.length;
    var dimCount = 1+dimNodesCnt; // Includes also the measure/kpi dim
    var measurePos = new Object();
    // Maps dims taking part in the output with their bcdGr to the full dims (with all helper attrs) and an array with the measures
    // in this arrray measurePos tells us wherer which measure is (we ony find out which are coming going through all rows)
    var all = new Object();
    var rows = input.selectNodes("/*/wrs:Data/wrs:R");
    var hasExtraAttrs = (0 != input.selectNodes("/*/wrs:Header/wrs:Columns/wrs:C[@dimId]/wrs:A[not(@name='bcdGr')]").length);
    for( var r=0; r<rows.length; r++) {
      // Get out dim values (only dims in terms of grouping and output, not measure/kpi dim, not other attributes)
      var newDims = "";
      var cols = rows.item(r).selectNodes("wrs:C");
      for( var c=0; c<dimNodesCnt; c++) {
        var col = cols.item(c);
        var bcdGrNode = col.getAttribute("bcdGr");
        newDims += "<C"+(bcdGrNode!=null?" bcdGr='"+bcdGrNode+"'":"");
        var fc = col.firstChild;
        newDims += (fc&&fc.nodeValue ? ">"+jQuery("<div/>").text(fc.nodeValue).html()+"</C>":"/>");
      }
      // Let's see whether we are the first with these values
      // We store the dims (with all attributes) and an array for the measures, filled by coming rows with the same dim
      var rowValues = all[newDims];
      if( !rowValues ) {
        var dimsWithAttr = null;
        // If there are attributes other than @bcdGr (like @order or @caption for example), we need a serialized version of the dims including these for output later
        // We do rely on the fact that they can not differ from one appearance of a dim member to another
        // In simple cases we just use the re-ones containing only @bcdGr for performance reasons
        if( hasExtraAttrs ) {
          dimsWithAttr = "";
          for( var c=0; c<dimNodesCnt; c++)
            dimsWithAttr += new XMLSerializer().serializeToString(cols.item(c));
        } else
          dimsWithAttr = newDims;
        rowValues = all[newDims] = { dims: dimsWithAttr, measures: [] };
      }
      // Each measure can come with multiple values per row.
      var measureValues = [];
      for( var c = dimNodesCnt+1; c<cols.length; c++) {
        var node = cols.item(c).firstChild;
        measureValues.push( node ? node.nodeValue : "");
      }
      // Store it at the right position for the measure (may be a new one)
      var measureId = cols.item(dimNodesCnt).firstChild.nodeValue;
      var mp = measurePos[measureId];
      if( typeof mp == "undefined" )
        measurePos[measureId] = (mp = Object.keys(measurePos).length);
      rowValues.measures[mp] = measureValues;
    }

    // Now build the doc
    var maxIdxMeasures = -Infinity;
    for( var p in measurePos )
      maxIdxMeasures = measurePos[p] > maxIdxMeasures ? measurePos[p] : maxIdxMeasures;
    var wrs = "<Wrs xmlns='http://www.businesscode.de/schema/bcdui/wrs-1.0.0'><Header>";
    wrs += "<BindingSet>"+input.selectSingleNode("/*/wrs:Header/wrs:BindingSet").firstChild.nodeValue+"</BindingSet>";
    wrs += "<Columns>";
    for( var c=0; c<dimNodesCnt; c++)
      wrs += new XMLSerializer().serializeToString(dimNodes.item(c));
    var valueNodes = input.selectNodes("/*/wrs:Header/wrs:Columns/wrs:C[@valueId]");
    var valueNodesCnt = valueNodes.length;
    for( var m=0; m<=maxIdxMeasures; m++ ) {
      var posStart = dimNodesCnt+m*valueNodes.length+1;
      for( var v=0; v<valueNodes.length; v++ ) {
        wrs += "<C pos='"+(posStart+v)+"'";
        for( var p in measurePos )
          if( measurePos[p] === m )
            break;
        var key = p;
        var item = valueNodes.item(v);
        wrs += ' id="'+(key+'.'+item.getAttribute('id'))+'"';
        wrs += ' caption="'+(key+'|'+item.getAttribute('caption'))+'"'; // todo if caption
        jQuery.makeArray(item.attributes).forEach(function(a){ if(a.nodeName!="id"&&a.nodeName!="caption"&&a.nodeName!="pos") wrs+= ' '+a.nodeName+'="'+a.nodeValue+'"'})
        wrs += "/>";
      }
    }
    wrs += "</Columns></Header><Data>";
    var rowId = 0;
    jQuery.each(all, function(idx,e) {
      wrs += "<R id='"+(rowId++)+"'>";
      wrs += e.dims;
      for( var m=0; m<=maxIdxMeasures; m++ ) {
        var measureValues = e.measures[m];
        for( var mV=0; mV<valueNodesCnt; mV++ ) {
          var meas = measureValues ? measureValues[mV] : null;
          if( meas )
            wrs += "<C>"+jQuery("<div/>").text(meas).html()+"</C>";
          else
            wrs += "<C/>";
        }
      };
      wrs += "</R>";
    });
    wrs += "</Data></Wrs>";
    var resultDoc = bcdui.core.browserCompatibility.createDOMFromXmlString( wrs );
    var dimNodesResult = resultDoc.selectNodes("/*/wrs:Header/wrs:Columns/wrs:C[@dimId][not(position()=last())]");
    var dimNodesResultCnt = dimNodesResult.length;
    for( var c=0; c<dimNodesResultCnt; c++) {
      var col = dimNodesResult.item(c);
      col.setAttribute("caption",col.getAttribute("caption")+"|"+col.getAttribute("caption"));
    }
    return resultDoc;
  },

  /**
   * get column position by id
   *
   * @param {string|bcdui.core.DataProvider} wrs - Id of a DataProvider or the DataProvider itself (dp must be ready)
   * @param {string}  id                         - The column-id wrs:C/@id
   *
   * @return {integer} 1-based column position from the header/pos attribute, 0 if no such column was found
   */
  getColPosById : function(wrs, id){

    var dataProvider = null;
    if (bcdui.util.isString(wrs))
      dataProvider = bcdui.factory.objectRegistry.getObject(wrs);
    else if (wrs instanceof bcdui.core.DataProvider)
      dataProvider = wrs;
    wrs = dataProvider == null ? wrs : dataProvider.getData().selectSingleNode("/*");

    var isWrs = (wrs.baseName||wrs.localName) == "Wrs";
    var wrsC = wrs.selectSingleNode( (!isWrs ? "*/" : "") + "wrs:Header/wrs:Columns/wrs:C[@id='"+id+"']");

    if(!wrsC){
      return 0;
    }

    return parseInt(wrsC.getAttribute("pos"),10);
  },

  /**
   * Get cell value
   *
   * @param {string|bcdui.core.DataProvider}  wrs         Id of a DataProvider or the DataProvider itself (dp must be ready)
   * @param {string|number}                   rowId       The row-id or 1-based position of row
   * @param {string|number}                   columnId    ID or 1-based position of column
   *
   * @return {string} Current cell value or null
   */
  getCellValue : function(wrs, rowId, columnId){
    var dataProvider = null;
    if (bcdui.util.isString(wrs))
      dataProvider = bcdui.factory.objectRegistry.getObject(wrs);
    else if (wrs instanceof bcdui.core.DataProvider)
      dataProvider = wrs;
    wrs = dataProvider == null ? wrs : dataProvider.getData().selectSingleNode("/*");

    var isWrs = (wrs.baseName||wrs.localName) == "Wrs";
    var wrsPos = bcdui.util.isString(columnId) ? bcdui.wrs.wrsUtil.getColPosById(wrs, columnId) : columnId;
    rowId = bcdui.util.isNumber(rowId) ? rowId : "@id='" + rowId + "'";
    var value = wrs.selectSingleNode((!isWrs ? "*/" : "") + "wrs:Data/*["+rowId+"]/wrs:C["+wrsPos+"][not(wrs:null)]");
    return value==null?null:value.text;
  },

  /**
   * get wrs:ValidationResult/wrs:Wrs element for given Wrs (optionally creates an empty one)
   * 
   * @param {string|bcdui.core.DataProvider} wrs - Id of a DataProvider or the DataProvider itself (dp must be ready)
   * @param {string}     validationId                        - validationId
   * @param {boolean}    doCreate                            - optional, in case no wrs:ValidationResult/wrs:Wrs exists, create one (empty)
   * 
   * @return {Node} wrs:ValidationResult/wrs:Wrs or NULL if none exists and doCreate=false
   */
  getValidationResult : function(wrs, validationId, doCreate){

    var dataProvider = null;
    if (bcdui.util.isString(wrs))
      dataProvider = bcdui.factory.objectRegistry.getObject(wrs);
    else if (wrs instanceof bcdui.core.DataProvider)
      dataProvider = wrs;
    wrs = dataProvider == null ? wrs : dataProvider.getData().selectSingleNode("/*");

    if(!validationId){
      throw "validationId missing";
    }
    var isWrs = (wrs.baseName||wrs.localName) == "Wrs";
    var wrsHeader = wrs.selectSingleNode((!isWrs ? "*/" : "") + "wrs:Header");
    var validationResultNode = wrsHeader.selectSingleNode("wrs:ValidationResult/wrs:Wrs[@bcdValidationId='"+validationId+"']");

    if(validationResultNode || !doCreate){
      return validationResultNode;
    }

    validationResultNode = bcdui.core.createElementWithPrototype(wrsHeader, "wrs:ValidationResult");

    // create empty wrs:ValidationResult and attach to wrsHeader
    var validationResultWrs = bcdui.core.browserCompatibility.createDOMFromXmlString('<Wrs xmlns="http://www.businesscode.de/schema/bcdui/wrs-1.0.0" bcdValidationId="'+validationId+'"><Header><Columns><C pos="1" id="RowId" type-name="NUMERIC"/><C pos="2" id="ColPos" type-name="NUMERIC"/><C pos="3" id="error" type-name="VARCHAR"/></Columns></Header><Data/></Wrs>');
    validationResultWrs = validationResultNode.appendChild(wrsHeader.ownerDocument.importNode(validationResultWrs.documentElement, true));

    return validationResultWrs;
  },

  /**
   * Replaces validationResult/Wrs document in the Wrs,
   * the validationDoc can be provided as NULL to remove the validationResult Wrs from previous validation;
   * the validationId is mandatory to provide to uniquelly identify the subject of validation.
   * 
   * @param {Element|Document}  wrsRootNode           - Wrs itself or an element containing Wrs (i.e. Wrs document)
   *                                                    where to replace the validation result in
   * @param {Element|Document}  validationResultNode  - wrs:ValidationResult (or container with it) containing wrs:Wrs element(s) (which obligatory is tagged with bcdValidationId attribute)
   *                                                    if NULL, then the possible existing validationResult is effectively removed from wrs document
   * @param {string}            validationId          - the validationId of the validation result Wrs to replace
   */
  replaceValidationResult : function(wrsRootNode, validationResultNode, validationId){
    if(!validationId){
      throw "validationId missing!";
    }
    if(validationResultNode === undefined){
      throw "validationDoc must not be undefined - null or non-null reference expected";
    }

    var wrsHeader = wrsRootNode.selectSingleNode((wrsRootNode.nodeType == 1 ? "" : "*/") + "wrs:Header");

    // remove probably existing validation result
    bcdui.core.removeXPath(wrsHeader, "wrs:ValidationResult/wrs:Wrs[@bcdValidationId='"+validationId+"']", false);
    bcdui.core.removeXPath(wrsHeader, "wrs:ValidationResult[not(wrs:Wrs)]");

    if(!validationResultNode){
      return;
    }

    // import only if available and has data invalid records
    var importValidationWrs = validationResultNode.selectSingleNode((validationResultNode.nodeType == 1 ? "" : "wrs:ValidationResult/") + "wrs:Wrs[@bcdValidationId='"+validationId+"' and wrs:Data/wrs:*]");
    if(importValidationWrs){
      // append new Wrs into wrs:ValidationResult
      bcdui.core.createElementWithPrototype(wrsHeader, "wrs:ValidationResult").appendChild(
        wrsHeader.ownerDocument.importNode(importValidationWrs, true)
      );
    }
  },

  /**
   * Sets cell value, both, the row and cell MUST exist in target model
   * This also changes wrs:R to wrs:M and clones wrs:C to wrs:O values.
   *
   * @param {string|bcdui.core.DataProvider}  wrs           Id of a DataProvider or the DataProvider itself (dp must be ready)
   * @param {string|number}                   rowId       The row-id or 1-based position of row
   * @param {string|number}                   columnId      ID or 1-based position of column
   * @param {string}                          [value=null]  If NULL then wrs:null node is appended to column
   *
   * @return true if value has been set, false otherwise
   */
  setCellValue : function(wrs, rowId, columnIdOrPos, value){
    var dataProvider = null;
    if (bcdui.util.isString(wrs))
      dataProvider = bcdui.factory.objectRegistry.getObject(wrs);
    else if (wrs instanceof bcdui.core.DataProvider)
      dataProvider = wrs;
    wrs = dataProvider == null ? wrs : dataProvider.getData().selectSingleNode("/*");

    var isWrs = (wrs.baseName||wrs.localName) == "Wrs";
    var wrsPos = bcdui.util.isString(columnIdOrPos) ? bcdui.wrs.wrsUtil.getColPosById(wrs, columnIdOrPos) : columnIdOrPos;
    rowId = bcdui.util.isNumber(rowId) ? rowId : "@id='" + rowId + "'";
    var wrsC = bcdui.core.createElementWithPrototype(wrs,(!isWrs ? "*/" : "") + "wrs:Data/*["+rowId+"]/wrs:C["+wrsPos+"]");
    if(!wrsC)return;
    if(value != null){
      // implicit String-cast
      wrsC.text = ""+value;
    } else {
      wrsC.text = "";
      // the only way to handle namespaces properly
      bcdui.core.browserCompatibility.appendElementWithPrefix(wrsC, "wrs:null");
    }
  },

  /**
   * Phsyically drops columns from Wrs
   * 
   * @param {Element}  wrsRootNode  - Pointing to wrs:Wrs
   * @param {string[]} colIdArray   - Array of column-ids to remove
   * 
   */
  deleteColumns : function(wrs, colIdArray){

    var dataProvider = null;
    if (bcdui.util.isString(wrs))
      dataProvider = bcdui.factory.objectRegistry.getObject(wrs);
    else if (wrs instanceof bcdui.core.DataProvider)
      dataProvider = wrs;
    wrs = dataProvider == null ? (wrs.documentElement||wrs) : dataProvider.getData().selectSingleNode("/*");

    var isWrs = (wrs.baseName||wrs.localName) == "Wrs";
    if(!isWrs)
      return;

    // associative array of original col positions built up from wrs:Header
    var posArray = [];
    var headerCols = wrs.selectNodes("wrs:Header/wrs:Columns/wrs:C");
    // build pos array, drop cols and rewrite @pos
    var posOffset=0;
    for(var i=0,imax=headerCols.length; i<imax; i++){
      var wrsC = headerCols.item(i);

      // rewrite @pos
      if(posOffset>0){
        wrsC.setAttribute("pos", i+1-posOffset);
      }

      if(colIdArray.indexOf(wrsC.getAttribute("id")) > -1){
        posArray.push(i+1);
        wrsC.parentNode.removeChild(wrsC);
        ++posOffset;
      }
    }

    // nothing found
    if(!posArray.length){
      return;
    }

    // drop data cols
    var posString = "|" + posArray.join("|") + "|";
    var deleteNodes=function(nodeSet){ // helper func
      for(var i=0,imax=nodeSet.length;i<imax;i++){
        var node=nodeSet.item(i);
        node.parentNode.removeChild(node);
      }
    }
    var predicate=`[ contains( '${posString}' ,concat('|',position(),'|') ) and position()=position() ]`; // BUI-890
    deleteNodes(wrs.selectNodes("wrs:Data/wrs:*/wrs:C" + predicate));
    deleteNodes(wrs.selectNodes("wrs:Data/wrs:*/wrs:O" + predicate));
  },

  /**
   * Deletes a row identified by id, also see {@link bcdui.wrs.wrsUtil.deleteWrsRow deleteWrsRow()}
   * 
   * @param {string|bcdui.core.DataProvider} model - Id of a DataProvider or the DataProvider itself (dp must be ready)
   * @param {string}                  rowId                   - Id of row to be deleted
   * @param {boolean}                 [propagateUpdate=false] - If true, fire after change
   *
   * @return true if given row has been modified and converted to wrs:D or false
   */
  deleteRow : function(model, rowId, propagateUpdate){
    var model = (typeof model == "string") ? bcdui.factory.objectRegistry.getObject(model) : model;

    propagateUpdate = !!(propagateUpdate||false); // default true
    var dataDoc = model.dataDoc;
    var rowNode = dataDoc.selectSingleNode("/*/wrs:Data/*[@id='"+rowId+"']");
    if(!rowNode)throw "not existent row with id " + rowId;
    if((rowNode.baseName||rowNode.localName) == "D"){
      return false;
    }

    var result;

    result = bcdui.wrs.wrsUtil.deleteWrsRow(rowNode);

    if(propagateUpdate){
      model.fire();
    }
    return result;
  },

  /**
   * delete rows identified by the column value(s)
   * 
   * @param {document|element}  wrs         the Wrs document
   * @param {number|string}     colIdOrPos  column id or position
   * @param {array}             values      array of string values to lookup
   */
  deleteRowByColumnValue : function(wrs, colIdOrPos, values){
    if(!Array.isArray(values)){
      values = [values];
    }

    if(values.length == 0){
      return;
    }

    var colPos = bcdui.util.isString(colIdOrPos) ? bcdui.wrs.wrsUtil.getColPosById(wrs, colIdOrPos) : colIdOrPos;
    
    // build string inset to apply contains() on
    var delim = bcdui.core.magicChar.separator;
    var inset = delim + values.join(delim) + delim;

    if(inset.indexOf("'") > -1){
      throw "Cannot complete operation, contains not allowed character: '";
    }

    var rowNodes = wrs.selectNodes("/*/wrs:Data/wrs:*[ not(self::D) and contains('" + inset + "', concat('"+delim+"', wrs:C["+colPos+"], '"+delim+"')) ]");

    for(var i=0,imax=rowNodes.length; i<imax; i++){
      bcdui.wrs.wrsUtil.deleteWrsRow(rowNodes.item(i));
    }
  },

  /**
   * Restores a wrs:D, wrs:M identified by id, also see {@link bcdui.wrs.wrsUtil.restore restore()}
   * 
   * @param {string|bcdui.core.DataProvider} model - Id of a DataProvider or the DataProvider itself (dp must be ready)
   * @param {string}                  rowId                   - Id of row to be deleted
   * @param {boolean}                 [propagateUpdate=false] - If true, fire after change
   *
   * @return true if given row has been restored or false if row is not wrs:M nor wrs:D
   */
  restoreRow : function(model, rowId, propagateUpdate){
    var model = (typeof model == "string") ? bcdui.factory.objectRegistry.getObject(model) : model;

    propagateUpdate = !!(propagateUpdate||false); // default true
    var dataDoc = model.dataDoc;
    var rowNode = dataDoc.selectSingleNode("/*/wrs:Data/*[@id='"+rowId+"']");
    if(!rowNode)throw "not existent row with id " + rowId;
    if(!rowNode.selectSingleNode("self::*[self::wrs:M or self::wrs:D]")){
      return false;
    }

    // M or D
    var wrsRowType = rowNode.baseName || rowNode.localName;

    // create wrs:R with rowId and attach to doc
    var wrsR = bcdui.core.browserCompatibility.appendElementWithPrefix(rowNode, "wrs:R", true);
    rowNode.removeAttribute("id"); // so we dont have same IDs on doc level
    wrsR.setAttribute("id", rowId);

    if(wrsRowType=="M"){
      // first attach wrs:C with wrs:O then attach wrs:R to doc
      var cols = rowNode.selectNodes("wrs:O");
      for(var i=0,imax=cols.length; i<imax; i++){
        bcdui.util.xml.cloneElementContent(
          bcdui.core.browserCompatibility.appendElementWithPrefix(wrsR, "wrs:C"),
          cols.item(i)
        );
      }
    } else {  // wrs:D
      // simply re-attach wrs:C
      var cols = rowNode.selectNodes("wrs:C");
      for(var i=0,imax=cols.length; i<imax; i++){
        wrsR.appendChild(cols.item(i));
      }
    }

    // remove rowNode
    rowNode.parentNode.removeChild(rowNode);
    if(propagateUpdate){
      model.fire();
    }
    return true;
  },

  /**
   * POSTs one or mode WRS documents to well known WrsServlet URL
   * Multiple document are handled by WrsServlet in one transaction,
   *
   * @param {(Object|XMLDocument|XMLDocument[])} args - Document(s) or a parameter object with the following properties
   * @param {document}                           args.wrsDoc                   - Document(s) or a parameter object with the following properties
   * @param {function}                           [args.onSuccess]              - Callback on success, is called after successful POST or if POST was not issued due to to changes in the document 
   * @param {function}                           [args.onFailure]              - Callback on failure, is called if error occurs
   * @param {function}                           [args.onWrsValidationFailure] - Callback on serverside validate failure, if omitted the onFailure is used in case of validation failures
   * @param {string}                             [args.uri]                    - An URI (i.e. SomeDoc) which is appended as pathInfo to WrsServlet
   *
   * you can also simply provide one argument: wrsDoc or array thereof, which is then POSTed
   */
  postWrs : function(args){
    if(args.documentElement || Array.isArray(args)){ // shorthand handling
      args = {
        wrsDoc : args
      }
    }
    args = jQuery.extend({
      uri : "",
      onFailure : function(msg){
        bcdui.log.fatal("failed to POST wrs: " + msg);
      },
      onSuccess : function(){}
    }, args);
    var url = bcdui.core.webRowSetServletPath + (args.uri ? "/" + args.uri : "");

    // handle array of docs
    if(Array.isArray(args.wrsDoc)){
      var docs = args.wrsDoc;
      args.wrsDoc = bcdui.core.browserCompatibility.createDOMFromXmlString("<MultiWrs/>");
      docs.forEach(function(doc){
        var targetWrsDoc = doc.selectSingleNode("/wrs:Wrs[wrs:Data/wrs:*[not(wrs:R)]]");
        if(targetWrsDoc){
          args.wrsDoc.documentElement.appendChild(
            args.wrsDoc.importNode(targetWrsDoc, true)
          );
        }
      });
    }
    // remove waste
    bcdui.core.removeXPath(args.wrsDoc, "//wrs:Wrs/wrs:Data/wrs:R", false);
    bcdui.core.removeXPath(args.wrsDoc, "//wrs:Wrs[not(wrs:Data/wrs:*)]", false);

    // dont do roundtrip in case we have no write operations (wrs:R were removed in step before)
    if(!args.wrsDoc.selectSingleNode("//wrs:Wrs[wrs:Data/wrs:*]")){
      setTimeout(args.onSuccess); // defer to keep compatibility
      return;
    }
    if(!args.onWrsValidationFailure){
      args.onWrsValidationFailure = args.onFailure;
    }
    bcdui.core.xmlLoader.post({
      url: url,
      doc: args.wrsDoc,
      onSuccess: args.onSuccess,
      onFailure: args.onFailure,
      onWrsValidationFailure: args.onWrsValidationFailure
    });
  },

  /**
   * factory function creating iterator,
   * used in getNextIdentifier() to deploy iteration function
   * 
   * @private
   */
  _nextIdentifierIterator : function(from, to){
    return function(callback, thisArg){
      for(var i=from;i<=to;i++){
        callback.call(thisArg||undefined, i, i-from, null);
      }
    }
  },

  /**
   * Retrieves next identifier from the server (async)
   *
   * @param {Object} args - Parameter object with the following properties
   * @param {string}   args.scope                   - The scope requested
   * @param {function} args.onSuccessCb             - The callback, receives following args
   * <ul>
   *  <li>scope           {string}    - Requested scope
   *  <li>isRange         {boolean}   - false if blockSize = 1, true otherwise
   *  <li>forEach:        {function}  - Helper iterating function, executing a passed function for each identifier; follows forEach() JS API spec; 
   *  <li>nextIdentifier  {integer}   - The next identifier; ONLY defined if isRange = false; otherwise undefined
   *  <li>firstIdentifier {integer}   - First identifier; ONLY defined if isRange = true; otherwise undefined
   *  <li>lastIdentifier  {integer}   - Last identifier; ONLY defined if isRange = true; otherwise undefined
   * </ul>
   * @param {integer}  [args.blockSize=1] - Number of identifiers to be retrieved
   * @param {function} [args.onErrorCb]   - An error callback
   */
  getNextIdentifier : function(args){
    if(!args.scope)throw ".scope missing";
    if(!args.onSuccessCb)throw ".onSuccessCb missing";
    if(!args.onErrorCb){
      args.onErrorCb = function(req,stat,err){
        if(typeof console != undefined && console.fatal){
          console.fatal("error",{req:req, stat:stat, err:err});
        }
        throw new Error("failed to getNextIdentifier from " + url);
      };
    }
    var blockSize = args.blockSize||1;
    if(blockSize<1){
      throw "blockSize must be >= 1 but defined " + blockSize;
    }
    var url = bcdui.contextPath + "/bcdui/servlets/WrsNextIdentifierServlet/" + args.scope;
    if(blockSize>1){
      url += "/" + blockSize;
    }
    jQuery.ajax({
      url : url,
      type:"POST",
      contentType : "text/plain",
      dataType : "text",
      data: "",
      success : function(data){
        var node = bcdui.core.browserCompatibility.createDOMFromXmlString(data).selectSingleNode("/*"); //wrs:NextIdentifier
        var blockSize = node.getAttribute("blockSize");
        if(blockSize){
          blockSize = parseInt(blockSize, 10);
        }
        var result = {
          scope : node.getAttribute("scope"),
          nextIdentifier : parseInt(node.text, 10),
          isRange : false
        }
        if(blockSize>1){
          result.isRange = true;
          result.blockSize = blockSize;
          result.lastIdentifier = result.nextIdentifier;
          result.firstIdentifier =  result.lastIdentifier - result.blockSize + 1;
          delete result.nextIdentifier;
        }
        // add iterator
        result.forEach = bcdui.wrs.wrsUtil._nextIdentifierIterator(result.nextIdentifier||result.firstIdentifier, result.lastIdentifier||result.nextIdentifier);
        args.onSuccessCb(result);
      },
      error : args.onErrorCb
    });
  }
});// end of package bcdui.wrs.wrsUtil


/**
 * Helper for js WRS format
 * @namespace bcdui.wrs.jsUtil
 */
bcdui.util.namespace("bcdui.wrs.jsUtil", 
/** @lends bcdui.wrs.jsUtil */
{

  /**
   * Format a wrs:C cell with a given wrs-header hC
   * @private
   */
  formatNum : function(c,hC)
  {
    var v = (c && c.t$!=undefined ? c.t$ : c);
    if( !hC || hC["type-name"]=="VARCHAR" )
      return v;

    var unit = hC.unit || (c ? c.unit : null) || "";
    if( unit==="%" )
      v *= 100;
    var res = parseFloat(v).toFixed(hC.scale);
    if( isNaN(res) || res==0 )
      return '';
    return res + unit;
  },

  /**
   * Only these elements become arrays when converting from XML to JS
   * @private
   */
  wrsArrayObjects: [ "R", "I", "M", "D", "C", "O", "A" ],
  
  /**
   * Convert a DOM to an js object
   * 
   * Conventions for non-Wrs:
   *  - For each element child, except the root, there will be an array. 
   *      obj.GuiStaus.Filters[0].Filter[1]
   *  - Each element itself is an object, text content becomes the property $t and attributes have their name as propertyname
   *      obj.GuiStaus.Filters[0].Filter[1].Expression[0].value
   *  - Textcontent of mixed content (an element has text and element childs) is only written of not blank. (Note, there is no mixed content in any of BCDUI defined XML.)
   *
   * Special conventions for Wrs:
   *  - Only the elements in wrsArrayObjects are represented as arrays
   *      obj.Wrs.Data.R[0].C[0].attrName
   *  - If a Data.R[n].C element has no attributes, its is not an object but just the plain value to represent data as compact as possible
   *      obj.Wrs.Data.R[1].C[1] but 
   *      obj.Wrs.Data.R[1].C[1].t$, if there are attributes obj.Wrs.Data.R[1].C[1].attrName
   *
   * TODO namespaces
   * @param   {XMLDocument} args - wrs:Wrs XML Document to be translated into a JavaScript object
   * @returns {Object}
   */
  domToJs: function( arg )
  {
    if( !arg.nodeType )
      return arg;

    arg = arg.documentElement || arg; // TODO handle multiple nodes
    var isWrs = (arg.localName||arg.baseName) === "Wrs";

    var createJsForElem = function( elem, parent, pos ) 
    {  // TODO: get elem.localName||elem.baseName ony once or use tagName
      var isWrsArrayObject = bcdui.wrs.jsUtil.wrsArrayObjects.indexOf((elem.localName||elem.baseName)) !== -1; // TODO: only if Wrs
      var res = null;

      var isComplex = !isWrs || elem.attributes.length || elem.childNodes.length > 1 || (elem.firstChild && elem.firstChild.nodeType == 1);
      if( isComplex )
      {
        res = {};

        if( elem.attributes ) {
          for( var a=0; a<elem.attributes.length; a++ )
            if( ! elem.attributes[a].nodeName.startsWith("xmlns") )
              res[elem.attributes[a].nodeName||elem.attributes[a].baseName] = elem.attributes[a].nodeValue;
        }
        
        var childElemCnt = 0;
        if( elem.childNodes ) { // TODO: not necessary
          var pos = 0;
          for( var child = elem.firstChild; child; child = child.nextSibling ) {
            if( child.nodeType!==1 )
              continue;
            createJsForElem(child, res, pos++ );
            childElemCnt++;
          }
        }

        if( !!elem.text.trim() ) // TODO get text only once
          res.$t = elem.text;

        if( !isWrsArrayObject ) {
          var prefix = bcdui.core.xmlConstants.revNamespaces[elem.namespaceURI];
          if( !!prefix )
            res.$ns = prefix;
          else
            res.$nsU = elem.namespaceURI; // For unknown namespaces
          res.$p = pos;
        }

      }

      else
        res = elem.text;

//    if( (elem.attributes && elem.attributes.length) && !childElemCnt )
//    else if ( !res || ((! elem.attributes || ! elem.attributes.length) && !childElemCnt) )
//    res = elem.text;

      if( (isWrs && ! isWrsArrayObject) || elem === arg ) {
        parent[(elem.localName||elem.baseName)] = res;
      } else {
        // Get the parent's array for the name if available, or assign a new empty one and get that one
        var array = (parent[elem.localName||elem.baseName] || (parent[elem.localName||elem.baseName]=[]));
        array.push(res);
      }
    }

    var result = {};
    createJsForElem( arg, result, 0);      
    
    return result;
  },

  /**
   * Converts a js object created with domToJs to an XML document
   * @param {Object} args - The JavaScript object following Wrs conventions, from which the XML document is to be created
   */
  jsToXml: function( arg )
  {
    var doc = bcdui.core.browserCompatibility.newDOMDocument();
    
    function convertElem( elemName, parentJ, parentX )
    {
      var elemJ = parentJ[elemName];
      var elemX = doc.createElementNS( parentJ[elemName].$ns, elemName );
      var childrenA = [];
      var childrenJ = Object.keys(elemJ);
      for( var k in childrenJ ) 
      {
        var prop = childrenJ[k];
        if( Array.isArray(elemJ[prop]) ) {
          for( var c in elemJ[prop] )
            if( typeof elemJ[prop][c] !== "function" )
              childrenA[elemJ[prop][c].$p] = { name: prop, vlaue: elemJ[prop][c] };
        }
        else if( typeof prop !== "function" && !prop.startsWith("$") )
          elemX.setAttribute(prop,elemJ[prop]);
      }
      for( var k in childrenA )
        if( typeof k !== "function" )
          convertElem( childrenA[k].name, elemJ ,elemX );

      parentX.appendChild(elemX);
    }
    convertElem( Object.keys(arg)[0], arg, doc );
    
    return doc;
  },
  
  /**
   * Deep clone of a JS object, does also clone elements in Arrays
   * Faster than (JSON stringify -> parse): 6x in Chrome 41, 1x in FF 36, 2x in IE9,11
   * @private
   */
  deepClone: function( o ) 
  {
      var newO,  i; 
      if (!o || typeof o !== 'object') {  
        return o; 
      }
    
      else if ( o.constructor === Array ) {
        newO = [];
        for (var i = 0; i < o.length; i += 1) {
          newO[i] = this.deepClone(o[i]);
        }
        return newO;
      }

      else {        
        newO = {};
        for (var i in o) {
          newO[i] = this.deepClone(o[i]);
        }
        return newO;
      }
  }

});
