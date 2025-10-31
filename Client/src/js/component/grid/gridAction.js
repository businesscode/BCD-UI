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


bcdui.component.grid.ActionHandler = class {

  constructor() {
    this.contextMenuActionHandler = new bcdui.component.grid.ContextMenuAction();
    this.buttonActionHandler = new bcdui.component.grid.ButtonMenuAction();
  }
}

bcdui.component.grid.ButtonMenuAction = class {
  constructor() {
    this.actionMap = {
        saveGrid:    this._saveGrid
      , resetGrid:   this._resetGrid
      , addRow:      this._addRow
      , smeTakeData: this._smeTakeData
      , smeClear:    this._smeClear
      , smeCancel:   this._smeCancel
      , heTakeData:  this._heTakeData
      , heClear:     this._heClear
      , heCancel:    this._heCancel
    };
  }

  click(args) {
    // bcdactionid is lowercase here, since it was added via attributes collect loop
    if (typeof this.actionMap[args.bcdactionid] == "function")
      this.actionMap[args.bcdactionid](args);
    else if (args.bcdactionid)
      throw "clicked button action not available: " + args.bcdactionid;
  }
  
  _saveGrid(args) {
    bcdui.factory.objectRegistry.getObject(args.bcdRendererId).actionSave();
  }
  _resetGrid(args) {
    bcdui.factory.objectRegistry.getObject(args.bcdRendererId).actionReset();
  }
  _addRow(args) {
    bcdui.factory.objectRegistry.getObject(args.bcdRendererId).actionAddRow();
  }

  _smeTakeData(args) {
    bcdui.component.grid.GridEditor.bcduiStatusModelEditor.takeData(args.htmlElement);
  }
  _smeClear(args) {
    bcdui.component.grid.GridEditor.bcduiStatusModelEditor.clearData(args.htmlElement);
  }
  _smeCancel(args) {
    bcdui.component.grid.GridEditor.bcduiStatusModelEditor.cancelData(args.htmlElement);
  }

  _heTakeData(args) {
    bcdui.component.grid.GridEditor.bcduiHtmlEditor.takeData(args.htmlElement);
  }
  _heClear(args) {
    bcdui.component.grid.GridEditor.bcduiHtmlEditor.clearData(args.htmlElement);
  }
  _heCancel(args) {
    bcdui.component.grid.GridEditor.bcduiHtmlEditor.cancelData(args.htmlElement);
  }
}

bcdui.component.grid.ContextMenuAction = class {

  constructor() {
    this.actionMap = {
        cellRestore:        this._cellRestore
      , rowAddAbove:        this._rowAddAbove
      , rowAddTop:          this._rowAddTop
      , rowAddBelow:        this._rowAddBelow
      , rowAddBottom:       this._rowAddBottom
      , rowDuplicate:       this._rowDuplicate
      , rowRestore:         this._rowRestore
      , rowRestoreSelected: this._rowRestoreSelected
      , rowDelete:          this._rowDelete
      , rowDeleteSelected:  this._rowDeleteSelected
      , fullDataExport:     this._fullDataExport
      , sortAscending:      this._sortAscending
      , sortDescending:     this._sortDescending
      , clearSorting:       this._clearSorting
      , copy:               this._copy
      , paste:              this._paste
      , pasteAsNewRows:     this._pasteAsNewRows
    };
  }
  
  click(args) {
    // bcdactionid is lowercase here, since it was added via attributes collect loop
    if (typeof this.actionMap[args.bcdactionid] == "function")
      this.actionMap[args.bcdactionid](args);
    else if (args.bcdactionid)
      throw "clicked contextMenu action not available: " + args.bcdactionid;
  }
  
  _cellRestore(args) {
    jQuery(args.bcdEventSourceElement).trigger("gridActions:cellRestore", {columnId: args.bcdColIdent, rowId: args.bcdRowIdent } );
  }
  _rowAddAbove(args) {
    jQuery(args.bcdEventSourceElement).trigger("gridActions:rowAdd", {columnId: args.bcdColIdent, rowId: args.bcdRowIdent, mode: 'above' } );
  }
  _rowAddTop(args) {
    jQuery(args.bcdEventSourceElement).trigger("gridActions:rowAdd", {columnId: args.bcdColIdent, rowId: args.bcdRowIdent, mode: 'top' } );
  }
  _rowAddBelow(args) {
    jQuery(args.bcdEventSourceElement).trigger("gridActions:rowAdd", {columnId: args.bcdColIdent, rowId: args.bcdRowIdent, mode: 'below' } );
  }
  _rowAddBottom(args) {
    jQuery(args.bcdEventSourceElement).trigger("gridActions:rowAdd", {columnId: args.bcdColIdent, rowId: args.bcdRowIdent, mode: 'bottom' } );
  }
  _rowDuplicate(args) {
    jQuery(args.bcdEventSourceElement).trigger("gridActions:rowDuplicate", {columnId: args.bcdColIdent, rowId: args.bcdRowIdent } );
  }
  _rowRestore(args) {
    jQuery(args.bcdEventSourceElement).trigger("gridActions:rowRestore", {columnId: args.bcdColIdent, rowId: args.bcdRowIdent } );
  }
  _rowRestoreSelected(args) {
    jQuery(args.bcdEventSourceElement).trigger("gridActions:rowRestoreSelected", {} ); 
  }
  _rowDelete(args) {
    jQuery(args.bcdEventSourceElement).trigger("gridActions:rowDelete", {columnId: args.bcdColIdent, rowId: args.bcdRowIdent } );
  }
  _rowDeleteSelected(args) {
    jQuery(args.bcdEventSourceElement).trigger("gridActions:rowDeleteSelected", {} );
  }
  _fullDataExport(args) {
    jQuery(args.bcdEventSourceElement).trigger("gridActions:fullDataExport");
  }
  _sortAscending(args) {
    jQuery(args.bcdEventSourceElement).trigger("gridActions:columnSort", {columnId: args.bcdColIdent, direction: "ascending" } );
  }
  _sortDescending(args) {
    jQuery(args.bcdEventSourceElement).trigger("gridActions:columnSort", {columnId: args.bcdColIdent, direction: "descending" } );
  }
  _clearSorting(args) {
    jQuery(args.bcdEventSourceElement).trigger("gridActions:columnSort", {columnId: args.bcdColIdent, direction: null} );
  }
  _copy(args) {
    jQuery(args.bcdEventSourceElement).trigger("gridActions:copy", {} );
  }
  _paste(args) {
    jQuery(args.bcdEventSourceElement).trigger("gridActions:paste", {} );
  }
  _pasteAsNewRows(args) {
    jQuery(args.bcdEventSourceElement).trigger("gridActions:pasteAsNewRows", {} );
  }
}
