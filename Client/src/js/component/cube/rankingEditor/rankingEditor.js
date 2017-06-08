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

bcdui.util.namespace("bcdui.component.cube.rankingEditor",
/** @lends bcdui.component.cube.rankingEditor */
{
  /**
   * @private
   */
  _rankingUrl: bcdui.config.jsLibPath+"component/cube/rankingEditor/rendering.xslt",

  /**
   * @private
   */
  _renderRankingArea: function(args) {
    return (args.isRanking ? "<div id='bcdUpDown_Ranking_{{=it.id}}' class='bcdUpDown_Ranking'></div>" + 
        "<div id='bcdUpDownBody_Ranking_{{=it.id}}'>" + 
          "<div id='bcdDndRankingDiv_{{=it.id}}'></div>" +
        "</div>" : "");
  },

  /**
   * @private
   */
  _initRanking: function(args, targetModelId) {}
});