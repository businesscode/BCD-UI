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
bcdui.component.cube.configurator.resolveContextMenu = function(args) {

    const actionMap = {

      hideColDim: function(args) {
        const levelId = jQuery(args.bcdEventSourceElement).closest("tr").attr("levelId");
        if (jQuery(args.bcdEventSourceElement).get(0).firstChild)
          jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: levelId, isColDim: true, all: false } );
      },

      hideAllColDim: function(args) {
        const levelId = jQuery(args.bcdEventSourceElement).closest("tr").attr("levelId");
        if (jQuery(args.bcdEventSourceElement).get(0).firstChild)
          jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: levelId, isColDim: true, all: true } );
      },

      excludeColDim: function(args) {
        const levelId = jQuery(args.bcdEventSourceElement).closest("tr").attr("levelId");
        if (jQuery(args.bcdEventSourceElement).get(0).firstChild)
          jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"excludeDimMember", levelId: levelId, isColDim: true, all: false } );
      },

      excludeAllColDim: function(args) {
        const levelId = jQuery(args.bcdEventSourceElement).closest("tr").attr("levelId");
        if (jQuery(args.bcdEventSourceElement).get(0).firstChild)
          jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"excludeDimMember", levelId: levelId, isColDim: true, all: true } );
      },

      showAllColDim: function(args) {
        const levelId = jQuery(args.bcdEventSourceElement).closest("tr").attr("levelId");
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: levelId, showAll: true } );
      },

      hideRowDim: function(args) {
        const levelId = args.bcdColIdent;
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: levelId, isColDim: false, all: false } );
      },

      hideAllRowDim: function(args) {
        const levelId = args.bcdColIdent;
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: levelId, isColDim: false, all: true} );
      },

      excludeRowDim: function(args) {
        const levelId = args.bcdColIdent;
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"excludeDimMember", levelId: levelId, isColDim: false, all: false } );
      },

      excludeAllRowDim: function(args) {
        const levelId = args.bcdColIdent;
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"excludeDimMember", levelId: levelId, isColDim: false, all: true } );
      },

      showAllRowDim: function(args) {
        const levelId = args.bcdColIdent;
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: levelId, totalId: args.totalId, showAll: true} );
      },

      addColumnMeasure: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", { actionId: 'addColumnMeasure' });
      },

      addRowMeasure: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", { actionId: 'addRowMeasure' });
      },

      editUserMeasure: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", { actionId: 'editUserMeasure', calcId: args.calcId});
      },

      deleteUserMeasure: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", { actionId: 'deleteUserMeasure', calcId: args.calcId});
      },

      reportExport: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:reportExport");
      },

      toggleAllTotals: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"toggleHideTotals"} );
      },

      showAllHidden: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: "bcdAll", showAll: true} );
      },

      sortAscending: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh",{ actionId: 'setColumnSort', isDim: args.isDim, direction: "ascending"});
      },

      sortDescending: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh",{ actionId: 'setColumnSort', isDim: args.isDim, direction: "descending"});
      },

      clearSorting: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh",{ actionId: 'setColumnSort', isDim: args.isDim, direction: null});
      },

      clearSortDimByMeas: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", 
          args.isColDim == "true"
          ? {actionId:"setSortDimByMeasure", clear: true, colDimId: jQuery(args.bcdEventSourceElement).closest('tr').attr('levelId')}
          : {actionId:"setSortDimByMeasure", clear: true}
        );
      },

      sortDimByMeas: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh",
          args.isColDim == "true"
          ? {actionId: "setSortDimByMeasure", direction: args.direction, sortBy: args.sortBy, colDimId: jQuery(args.bcdEventSourceElement).closest('tr').attr('levelId')}
          : {actionId: "setSortDimByMeasure", direction: args.direction, sortBy: args.sortBy}
        );
      },

      cumulateCol: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"setCumulate", isRow: true});
      },

      cumulateRow: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"setCumulate", clear: true});
      },

      clearCumulation: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"setCumulate", clear: true});
      },

      hideTotal: function(args) {
        if (args.isColDim == "true") {
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
          jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: args.levelId, outerLevelId: args.outerLevelId, isColDim: false, all: true, total: true} );
      },

      showTotal: function(args) {
        if (args.isColDim == "true")
          jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"showThisTotals", levelId: args.levelId} );
        else
          jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"showThisTotals", levelId: args.levelId} );
      },

      hideGrandTotal: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"hideDimMember", levelId: args.levelId, outerLevelId: null, isColDim: false, all: true, total: true} );
      },

      showGrandTotal: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", {actionId:"showThisTotals", levelId: args.levelId} );
      },

      detailExport: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:detailExport", {bcdRowIdent: args.bcdRowIdent, bcdColIdent: args.bcdColIdent} );
      },

      addRowCalculation: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", { actionId: 'addRowCalculation' });
      },

      addColumnCalculation: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", { actionId: 'addColumnCalculation' });
      },

      editUserCalc: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", { actionId: 'editUserCalc', calcId: args.calcId });
      },

      deleteUserCalc: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("cubeActions:contextMenuCubeClientRefresh", { actionId: 'deleteUserCalc', calcId: args.calcId });
      }
    };

    if (typeof actionMap[args.bcdAction] == "function")
      actionMap[args.bcdAction](args);
    else if (args.bcdAction)
      throw "clicked contextMenu action not available: " + args.bcdAction;
};


bcdui.component.cube.configurator.resolveContextMenuGroup = function(args) {
  const actionMap = {
    prepareGroupingEditor: function(args) {
      bcdui.component.cube.configuratorDND._prepareGroupingEditor(args.cubeId, args.dimType);
    }
  };
  if (typeof actionMap[args.bcdAction] == "function")
    actionMap[args.bcdAction](args);
  else if (args.bcdAction)
    throw "clicked contextMenu action not available: " + args.bcdAction;
};
