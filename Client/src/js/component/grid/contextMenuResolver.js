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
bcdui.component.grid.resolveContextMenu = function(args) {

    const actionMap = {

      cellRestore: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("gridActions:cellRestore", {columnId: args.bcdColIdent, rowId: args.bcdRowIdent } );
      },
      rowAddAbove: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("gridActions:rowAdd", {columnId: args.bcdColIdent, rowId: args.bcdRowIdent, mode: 'above' } );
      },
      rowAddTop: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("gridActions:rowAdd", {columnId: args.bcdColIdent, rowId: args.bcdRowIdent, mode: 'top' } );
      },
      rowAddBelow: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("gridActions:rowAdd", {columnId: args.bcdColIdent, rowId: args.bcdRowIdent, mode: 'below' } );
      },
      rowAddBottom: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("gridActions:rowAdd", {columnId: args.bcdColIdent, rowId: args.bcdRowIdent, mode: 'bottom' } );
      },
      rowDuplicate: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("gridActions:rowDuplicate", {columnId: args.bcdColIdent, rowId: args.bcdRowIdent } );
      },
      rowRestore: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("gridActions:rowRestore", {columnId: args.bcdColIdent, rowId: args.bcdRowIdent } );
      },
      rowRestoreSelected: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("gridActions:rowRestoreSelected", {} ); 
      },
      rowDelete: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("gridActions:rowDelete", {columnId: args.bcdColIdent, rowId: args.bcdRowIdent } );
      },
      rowDeleteSelected: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("gridActions:rowDeleteSelected", {} );
      },
      fullDataExport: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("gridActions:fullDataExport");
      },
      sortAscending: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("gridActions:columnSort", {columnId: args.bcdColIdent, direction: "ascending" } );
      },
      sortDescending: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("gridActions:columnSort", {columnId: args.bcdColIdent, direction: "descending" } );
      },
      clearSorting: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("gridActions:columnSort", {columnId: args.bcdColIdent, direction: null} );
      },
      copy: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("gridActions:copy", {} );
      },
      paste: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("gridActions:paste", {} );
      },
      pasteAsNewRows: function(args) {
        jQuery(args.bcdEventSourceElement).trigger("gridActions:pasteAsNewRows", {} );
      }
    };

    if (typeof actionMap[args.bcdAction] == "function")
      actionMap[args.bcdAction](args);
    else if (args.bcdAction)
      throw "clicked contextMenu action not available: " + args.bcdAction;
}
