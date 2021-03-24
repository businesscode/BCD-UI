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
bcdui.component.cube.summaryDisplay = Object.assign(bcdui.component.cube.summaryDisplay,
/** @lends bcdui.component.cube.summaryDisplay */
{
  /**
   * @private
   */
  _summaryUrl: bcdui.config.jsLibPath+"component/cube/summaryDisplay/rendering.xslt",

  /**
   * @private
   */
  _renderSummaryArea: function(args) {
    return (args.showSummary ? "<div id='bcdUpDown_Summary_{{=it.id}}' class='bcdUpDown_Summary'></div>" + 
        "<div id='bcdUpDownBody_Summary_{{=it.id}}'>" + 
          "<div id='bcdDndSummaryDiv_{{=it.id}}'></div>" +
        "</div>" : "")
  }
});