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


bcdui.component.scorecard.ActionHandlerDnd = class {

  constructor() {
    this.contextMenuActionHandler = new bcdui.component.scorecard.ContextMenuActionDnd();
  }
}

bcdui.component.scorecard.ContextMenuActionDnd = class {

  constructor() {
    this.actionMap = {
      hideTotals:     this._hideTotals
    , showTotals:     this._showTotals
    , sortAscending:  this._sortAscending
    , sortDescending: this._sortDescending
    , clearSorting:   this._clearSorting
    };
  }

  click(args) {
    // bcdactionid is lowercase here, since it was added via attributes collect loop
    if (typeof this.actionMap[args.bcdactionid] == "function")
      this.actionMap[args.bcdactionid](args);
    else if (args.bcdactionid)
      throw "clicked contextMenu action not available: " + args.bcdactionid;
  }

  _hideTotals(args) {
    bcdui.component.scorecardConfigurator._hideTotals(args.scorecardid);
  }

  _showTotals(args) {
    bcdui.component.scorecardConfigurator._showTotals(args.scorecardid);
  }

  _sortAscending(args) {
    bcdui.component.scorecardConfigurator._sortAspect(args.scorecardid, "ascending", "");
  }

  _sortDescending(args) {
    bcdui.component.scorecardConfigurator._sortAspect(args.scorecardid, "descending", "");
  }

  _clearSorting(args) {
    bcdui.component.scorecardConfigurator._sortAspect(args.scorecardid, "", "");
  }
}
