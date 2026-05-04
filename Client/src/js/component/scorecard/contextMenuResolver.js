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
bcdui.component.scorecard.resolveContextMenu = function(args) {
  const actionMap = {
    drillToAnalysis: function(args) {
      jQuery(args.bcdEventSourceElement).trigger( "scorecardActions:drillToAnalysis", { bcdRowIdent: args.bcdRowIdent,  bcdColIdent: args.bcdColIdent, targetPage: args.targetPage });
    }
    , detailExport: function(args) {
      jQuery(args.bcdEventSourceElement).trigger( "scorecardActions:detailExport", { bcdRowIdent: args.bcdRowIdent,  bcdColIdent: args.bcdColIdent }); 
    }
    , reportExcelExport: function(args) {
      jQuery(args.bcdEventSourceElement).trigger("scorecardActions:reportExcelExport");
    }
  };
  if (typeof actionMap[args.bcdAction] == "function")
    actionMap[args.bcdAction](args);
  else if (args.bcdAction)
    throw "clicked contextMenu action not available: " + args.bcdAction;
};

bcdui.component.scorecard.resolveContextMenuDnd = function(args) {
  const actionMap = {
    hideTotals: function(args) {
      bcdui.component.scorecardConfigurator._hideTotals(args.scorecardId);
    },
    showTotals: function(args) {
      bcdui.component.scorecardConfigurator._showTotals(args.scorecardId);
    },
    sortAscending: function(args) {
      bcdui.component.scorecardConfigurator._sortAspect(args.scorecardId, "ascending", "");
    },
    sortDescending: function(args) {
      bcdui.component.scorecardConfigurator._sortAspect(args.scorecardId, "descending", "");
    },

    clearSorting: function(args) {
      bcdui.component.scorecardConfigurator._sortAspect(args.scorecardId, "", "");
    }
  };
  if (typeof actionMap[args.bcdAction] == "function")
    actionMap[args.bcdAction](args);
  else if (args.bcdAction)
    throw "clicked contextMenu action not available: " + args.bcdAction;
};
