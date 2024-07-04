/*
  Copyright 2010-2024 BusinessCode GmbH, Germany

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


bcdui.component.cube.configurator.ActionHandler = class {

    constructor() {
    this.contextMenuActionHandler = (typeof bcdui.component.cube.configurator.ContextMenuActionEnterprise != "undefined")
      ? new bcdui.component.cube.configurator.ContextMenuActionEnterprise() 
      : new bcdui.component.cube.configurator.ContextMenuAction();
  }
}


bcdui.component.cube.configurator.ContextMenuAction = class {

  constructor() {

    this.actionMap = {
        hideColDim           : this._hideColDim
      , hideAllColDim        : this._hideAllColDim
      , excludeColDim        : this._excludeColDim
      , excludeAllColDim     : this._excludeAllColDim
      , showAllColDim        : this._showAllColDim

      , hideRowDim           : this._hideRowDim
      , hideAllRowDim        : this._hideAllRowDim
      , excludeRowDim        : this._excludeRowDim
      , excludeAllRowDim     : this._excludeAllRowDim
      , showAllRowDim        : this._showAllRowDim

      , addColumnMeasure     : this._addColumnMeasure
      , addRowMeasure        : this._addRowMeasure
      , editUserMeasure      : this._editUserMeasure
      , deleteUserMeasure    : this._deleteUserMeasure

      , reportExport         : this._reportExport
      , toggleAllTotals      : this._toggleAllTotals
      , showAllHidden        : this._showAllHidden

      , sortAscending        : this._sortAscending
      , sortDescending       : this._sortDescending
      , clearSorting         : this._clearSorting

      , clearSortDimByMeas   : this._clearSortDimByMeas
      , sortDimByMeas        : this._sortDimByMeas

      , cumulateRow          : this._cumulateRow
      , cumulateCol          : this._cumulateCol
      , clearCumulation      : this._clearCumulation

      , hideTotal            : this._hideTotal
      , showTotal            : this._showTotal
      , hideGrandTotal       : this._hideGrandTotal
      , showGrandTotal       : this._showGrandTotal

      , detailExport         : this._detailExport
    };
  }
  
  click(args) {
    // bcdactionid is lowercase here, since it was added via attributes collect loop
    if (typeof this.actionMap[args.bcdactionid] == "function")
      this.actionMap[args.bcdactionid](args);
    else if (args.bcdactionid)
      throw "clicked contextMenu action not available: " + args.bcdactionid;
  }

  _hideColDim(args) {
    const levelId = jQuery(args.bcdEventSourceElement).closest("tr").attr("levelId");
    if (jQuery(args.bcdEventSourceElement).get(0).firstChild)
      jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: levelId, isColDim: true, all: false } );
  }

  _hideAllColDim(args) {
    const levelId = jQuery(args.bcdEventSourceElement).closest("tr").attr("levelId");
    if (jQuery(args.bcdEventSourceElement).get(0).firstChild)
      jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: levelId, isColDim: true, all: true } );
  }

  _excludeColDim(args) {
    const levelId = jQuery(args.bcdEventSourceElement).closest("tr").attr("levelId");
    if (jQuery(args.bcdEventSourceElement).get(0).firstChild)
      jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"excludeDimMember", levelId: levelId, isColDim: true, all: false } );
  }

  _excludeAllColDim(args) {
    const levelId = jQuery(args.bcdEventSourceElement).closest("tr").attr("levelId");
    if (jQuery(args.bcdEventSourceElement).get(0).firstChild)
      jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"excludeDimMember", levelId: levelId, isColDim: true, all: true } );
  }

  _showAllColDim(args) {
    const levelId = jQuery(args.bcdEventSourceElement).closest("tr").attr("levelId");
    jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: levelId, showAll: true } );
  }

  _hideRowDim(args) {
    const levelId = args.bcdColIdent;
    jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: levelId, isColDim: false, all: false } );
  }

  _hideAllRowDim(args) {
    const levelId = args.bcdColIdent;
    jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: levelId, isColDim: false, all: true} );
  }

  _excludeRowDim(args) {
    const levelId = args.bcdColIdent;
      jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"excludeDimMember", levelId: levelId, isColDim: false, all: false } );
  }

  _excludeAllRowDim(args) {
    const levelId = args.bcdColIdent;
    jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"excludeDimMember", levelId: levelId, isColDim: false, all: true } );
  }

  _showAllRowDim(args) {
    const levelId = args.bcdColIdent;
    jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: levelId, totalId: args.totalid, showAll: true} );
  }

  _addColumnMeasure(args) {
    jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", { actionId: 'addColumnMeasure' });
  }

  _addRowMeasure(args) {
    jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", { actionId: 'addRowMeasure' });
  }

  _editUserMeasure(args) {
    jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", { actionId: 'editUserMeasure', calcId: args.calcid});
  }

  _deleteUserMeasure(args) {
    jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", { actionId: 'deleteUserMeasure', calcId: args.calcid});
  }

  _reportExport(args) {
    jQuery(args.bcdEventSourceElement).trigger("cubeActions:reportExport");
  }

  _toggleAllTotals(args) {
    jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"toggleHideTotals"} );
  }

  _showAllHidden(args) {
    jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: "bcdAll", showAll: true} );
  }

  _sortAscending(args) {
    jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh",{ actionId: 'setColumnSort', isDim: args.isdim, direction: "ascending"});
  }

  _sortDescending(args) {
    jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh",{ actionId: 'setColumnSort', isDim: args.isdim, direction: "descending"});
  }

  _clearSorting(args) {
    jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh",{ actionId: 'setColumnSort', isDim: args.isdim, direction: null});
  }

  _clearSortDimByMeas(args) {
    jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", 
      args.iscoldim == "true"
      ? {actionId:"setSortDimByMeasure", clear: true, colDimId: jQuery(args.bcdEventSourceElement).closest('tr').attr('levelId')}
      : {actionId:"setSortDimByMeasure", clear: true}
    );
  }

  _sortDimByMeas(args) {
    jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh",
      args.iscoldim == "true"
      ? {actionId: "setSortDimByMeasure", direction: args.direction, sortBy: args.sortby, colDimId: jQuery(args.bcdEventSourceElement).closest('tr').attr('levelId')}
      : {actionId: "setSortDimByMeasure", direction: args.direction, sortBy: args.sortby}
    );
  }

  _cumulateCol(args) {
    jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"setCumulate", isRow: true});
  }

  _cumulateRow(args) {
    jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"setCumulate", clear: true});
  }

  _clearCumulation(args) {
    jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"setCumulate", clear: true});
  }

  _hideTotal(args) {
    if (args.iscoldim == "true") {
      let levelNode = jQuery(args.bcdEventSourceElement).closest("tr");
      let levelId = levelNode.attr("levelId");
      if (levelId == null) {
        levelNode = levelNode.prev();
        if (levelNode.length > 0)
          levelId = levelNode.attr("levelId");
      }
      let outerLevelId = null;
      const outerLevel = levelNode.prevAll("tr");
      if (outerLevel)
        outerLevelId = outerLevel.attr("levelId");
      jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: levelId, outerLevelId: outerLevelId, isColDim: true, all: true, total: true } );
    }
    else
      jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: args.levelid, outerLevelId: args.outerlevelid, isColDim: false, all: true, total: true} );
  }

  _showTotal(args) {
    if (args.iscoldim == "true")
      jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"showThisTotals", levelId: args.levelid} );
    else
      jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"showThisTotals", levelId: args.levelid} );
  }

  _hideGrandTotal(args) {
    jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: args.levelid, outerLevelId: null, isColDim: false, all: true, total: true} );
  }

  _showGrandTotal(args) {
    jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"showThisTotals", levelId: args.levelid} );
  }

  _detailExport(args) {
    jQuery(args.bcdEventSourceElement).trigger("cubeActions:detailExport", {bcdRowIdent: args.bcdRowIdent, bcdColIdent: args.bcdColIdent} );
  }
}
