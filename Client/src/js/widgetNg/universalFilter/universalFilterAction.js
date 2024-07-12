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


bcdui.widgetNg.universalFilter.ActionHandler = class {

  constructor() {
    this.contextMenuActionHandler = new bcdui.widgetNg.universalFilter.ContextMenuAction();
  }
}

bcdui.widgetNg.universalFilter.ContextMenuAction = class {

  constructor() {
    this.actionMap = {
      combine: this._combine
    , edit: this._edit
    , delete: this._delete
    };
  }
  
  click(args) {
    // bcdactionid is lowercase here, since it was added via attributes collect loop
    if (typeof this.actionMap[args.bcdactionid] == "function")
      this.actionMap[args.bcdactionid](args);
    else if (args.bcdactionid)
      throw "clicked contextMenu action not available: " + args.bcdactionid;
  }

  _combine(args) {
    jQuery(args.bcdEventSourceElement).trigger("bcdui:universalFilter:combine");
  }
  _edit(args) {
    jQuery(args.bcdEventSourceElement).trigger("bcdui:universalFilter:edit");
  }
  _delete(args) {
    jQuery(args.bcdEventSourceElement).trigger("bcdui:universalFilter:delete");
  }
}
