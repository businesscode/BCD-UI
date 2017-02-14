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
// Global configuration settings of BCD-UI
// This is merged with bcdui/conf/settings.json optionally provided per project
bcdui.config.settings = jQuery.extend( true,
  {
    bcdui: {
      component: {
          exports: {
            // Allowed: "slk" | "csv" | "xlsx"
            detailExportDefaultFormat: "slk"
          }
        , cube: {
            maxDimensions: 9
          , maxMeasures: -1
        }
        , dnd: {
          targetLeft: true
        }
      }
    }
  },
  bcdui.config.settings
);
