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
/**
 * @file BCD-UI bootstrapping
 */

/**
 * Which js files are to be loaded for BCD-UI
 */
bcdui.bcduiCeFiles =
// JSON-PART-FOR-BUILD
{
  "groups": [
    {
      "id": "3rdParty",
      "required": "mandatory",
      "files": [
          "/js/3rdParty/modernizr.js"
        , "/js/3rdParty/log4javascript/log4javascript.js"
        , "/js/3rdParty/jquery.js"
        , "/js/3rdParty/jquery-ui.js"
        , "/js/3rdParty/doT/doT.js"
        , "/js/3rdParty/jquery.blockUI.js"
        , "/js/3rdParty/nouislider.js"
        , "/js/3rdParty/d3-format.js"
      ]
    },
    {
      "id": "bcduiUtil",
      "required": "mandatory",
      "files": [
          "/js/nonmodules/util/typedefs.js"
        , "/js/nonmodules/util/utilPackage.js"
        , "/js/nonmodules/util/datetimePackage.js"
        , "/js/nonmodules/util/clipboardPackage.js"
        , "/js/nonmodules/util/urlPackage.js"
        , "/js/nonmodules/util/xmlPackage.js"
        , "/js/nonmodules/jison/bcdui_util_xml_filterExpressionParser.js"
        , "/js/nonmodules/util/bcdJQueryPlugins.js"
      ]
    },
    {
      "id": "bcduiCore",
      "required": "mandatory",
      "files": [
          "/js/nonmodules/bcdui.js"
        , "/js/nonmodules/settings.js"
        , "/js/nonmodules/core/corePackage.js"
        , "/js/nonmodules/core/statusHandling.js"
        , "/js/nonmodules/factory/objectRegistry.js"
        , "/js/nonmodules/log/logPackage.js"
        , "/js/nonmodules/core/abstractExecutable.js"
        , "/js/nonmodules/core/dataProvider.js"
        , "/js/nonmodules/core/browserCompatibility.js"
        , "/js/nonmodules/core/extendedBrowserCompatibility.js"
        , "/js/nonmodules/core/commonStatusObjects.js"
        , "/js/nonmodules/core/dataProviders.js"
        , "/js/nonmodules/core/transformators.js"
        , "/js/nonmodules/core/xmlLoader.js"
        , "/js/nonmodules/log/backendEventsPoller.js"
        , "/js/nonmodules/log/clientEventsPublisher.js"
        , "/js/nonmodules/core/abstractUpdatableModel.js"
        , "/js/nonmodules/core/simpleModel.js"
        , "/js/nonmodules/core/staticModel.js"
        , "/js/nonmodules/core/autoModel.js"
        , "/js/nonmodules/core/transformationChain.js"
        , "/js/nonmodules/core/event/eventPackage.js"
        , "/js/nonmodules/core/compression/compressionPackage.js"
        , "/js/nonmodules/factory/factoryPackage.js"
        , "/js/nonmodules/i18n/i18n.js"
        , "/js/nonmodules/i18n/i18nPackage.js"
        , "/js/nonmodules/core/lifecycle/lifecyclePackage.js"
        , "/js/nonmodules/core/lifecycle/autoRefresh.js"
        , "/js/nonmodules/wrs/wrsUtilPackage.js"
      ],
      "css": [
        "/js/3rdParty/jquery-ui.css",
        "/theme/css/allStyles.css"
      ]
    },
    {
      "id": "bcduiWidget",
      "required": "mandatory",
      "files": [
          "/js/nonmodules/widget/pageEffects.js"
        , "/js/nonmodules/widget/widgetPackage.js"
        , "/js/nonmodules/widget/detachedEvent.js"
        , "/js/nonmodules/widget/mouseTracker.js"
        , "/js/nonmodules/widget/xmlDataUpdateListener.js"
        , "/js/nonmodules/widgetNg/widgetUtils.js"
        , "/js/nonmodules/widgetNg/bcduiWidget.js"
        , "/js/nonmodules/widget/inputField/inputFieldPackage.js"
        , "/js/nonmodules/widget/singleSelect/singleSelectPackage.js"
        , "/js/nonmodules/widget/multiSelect/multiSelectPackage.js"
        , "/js/nonmodules/widget/dimensionChooser/dimensionChooserPackage.js"
        , "/js/nonmodules/widget/formulaEditor/formulaEditorPackage.js"
        , "/js/nonmodules/widget/formulaEditor/formulaParser.js"
        , "/js/nonmodules/widget/periodChooser/periodChooserPackage.js"
        , "/js/nonmodules/widget/periodChooser/popcalendar.js"
        , "/js/nonmodules/widget/notification/notificationsWidgetPackage.js"
        , "/js/nonmodules/widget/detailView/detailViewPackage.js"
        , "/js/nonmodules/widget/menu/menu.js"
        , "/js/nonmodules/widget/visualizeXml/visualizeXml.js"
        , "/js/nonmodules/widget/contextMenu/contextMenuPackage.js"
        , "/js/nonmodules/widget/tab/tabPackage.js"
        , "/js/nonmodules/widget/effects/effectsPackage.js"
        , "/js/nonmodules/widgetNg/capabilityPackage.js"
        , "/js/nonmodules/widgetNg/commons.js"
        , "/js/nonmodules/widgetNg/validators.js"
        , "/js/nonmodules/widgetNg/widgetPackage.js"
        , "/js/nonmodules/widgetNg/widgetImpl.js"
        , "/js/nonmodules/widgetNg/button/buttonPackage.js"
        , "/js/nonmodules/widgetNg/input/inputPackage.js"
        , "/js/nonmodules/widgetNg/inputLookup/inputLookupPackage.js"
        , "/js/nonmodules/widgetNg/dateInput/dateInputPackage.js"
        , "/js/nonmodules/widgetNg/textArea/textAreaPackage.js"
        , "/js/nonmodules/widgetNg/pasteList/pasteListPackage.js"
        , "/js/nonmodules/widgetNg/checkbox/checkboxPackage.js"
        , "/js/nonmodules/widgetNg/suggestInput/suggestInputPackage.js"
        , "/js/nonmodules/widgetNg/singleSelect/singleSelectPackage.js"
        , "/js/nonmodules/widgetNg/connectable/connectablePackage.js"
        , "/js/nonmodules/widgetNg/sideBySideChooser/sideBySideChooserPackage.js"
        , "/js/nonmodules/widgetNg/chipsChooser/chipsPackage.js"
        , "/js/nonmodules/widgetNg/universalFilter/universalFilterPackage.js"
        , "/js/nonmodules/widgetNg/universalFilter/contextMenuResolver.js"
        , "/js/nonmodules/widgetNg/slider/sliderPackage.js"
        , "/js/nonmodules/widgetNg/slider/typedSliders.js"
        , "/js/nonmodules/widgetNg/quickEdit/quickEditPackage.js"
        , "/js/nonmodules/widgetNg/comment/commentPackage.js"
        , "/js/nonmodules/widgetNg/label/labelPackage.js"
        , "/js/nonmodules/widgetNg/multiCheck/multiCheckPackage.js"
        , "/js/nonmodules/widgetNg/login/loginPackage.js"
      ]
    },
    {
      "id": "bcduiChart",
      "required": "backCompatibility",
      "files": [
          "/js/nonmodules/component/chart/chartPackage.js"
        , "/js/nonmodules/component/chart/chart.js"
        , "/js/nonmodules/component/chart/drawer.js"
        , "/js/nonmodules/component/chart/colorProvider.js"
        , "/js/nonmodules/component/chart/XmlChart.js"
      ],
      "buildFolders": [
        "/js/nonmodules/component/chart"
      ]
    },
    {
      "id": "bcduiChart2",
      "required": "optional",
      "files": [
          "/js/nonmodules/component/chart/chartPackage.js"
        , "/js/3rdParty/echarts.js"
        , "/js/nonmodules/component/chart/chartEchart.js"
      ],
      "buildFolders": [
        "/js/nonmodules/component/chart"
      ]
    },
    {
      "id": "bcduiCube",
      "required": "backCompatibility",
      "files": [
          "/js/nonmodules/component/cube/cubeCreate.js"
        , "/js/nonmodules/component/cube/cubeConfigurator/contextMenuResolver.js"
        , "/js/nonmodules/component/cube/cubeConfigurator/cubeConfigurator.js"
        , "/js/nonmodules/component/cube/cubeConfigurator/cubeConfiguratorDND.js"
        , "/js/nonmodules/component/cube/expandCollapseCells.js"
        , "/js/nonmodules/component/cube/templateManager/templateManager.js"
        , "/js/nonmodules/component/cube/rankingEditor/rankingEditor.js"
        , "/js/nonmodules/component/cube/summaryDisplay/summaryDisplay.js"
      ],
      "buildFolders": [
          "/js/nonmodules/component/cube"
        , "/js/nonmodules/component/cube/templateManager"
        , "/js/nonmodules/component/cube/rankingEditor"
        , "/js/nonmodules/component/cube/summaryDisplay"
      ]
    },
    {
      "id": "bcduiCubeInlineChart",
      "required": "optional",
      "files": [
          "/js/nonmodules/component/cube/inlineChart/inlineChart.js"
        , "/js/3rdParty/echarts.js"
        , "/js/nonmodules/component/chart/chartEchart.js"
      ],
      "buildFolders": [
          "/js/nonmodules/component/cube/inlineChart"
        , "/js/nonmodules/component/chart"
      ]
    },
    {
      "id": "bcduiFar",
      "required": "optional",
      "files": [              
         "/js/nonmodules/component/far/configurator/farConfigurator.js"
        ,"/js/component/far/contextMenuResolver.js"
        ,"/js/nonmodules/component/far/farModel.js"
        ,"/js/nonmodules/component/far/far.js"
        ,"/js/nonmodules/component/far/create.js"
      ],
      "buildFolders": [
        "/js/nonmodules/component/far"
      ]
    },
    {
      "id": "bcduiExport",
      "required": "backCompatibility",
      "files": [
          "/js/nonmodules/component/exports/pdfExport.js"
        , "/js/nonmodules/component/exports/exportsPackage.js"
        , "/js/3rdParty/fileSaver/fileSaver.js" 
      ],
      "buildFolders": [
        "/js/nonmodules/component/exports"
      ]
    },
    {
      "id": "bcduiScorecard",
      "required": "backCompatibility",
      "files": [
          "/js/nonmodules/component/scorecard/scorecardModel.js"
        , "/js/nonmodules/component/scorecard/scorecardCreate.js"
        , "/js/nonmodules/component/scorecard/contextMenuResolver.js"
        , "/js/nonmodules/component/scorecard/scorecardConfigurator.js"
        , "/js/nonmodules/component/scorecard/bcdAspects.js"
        , "/js/nonmodules/component/cube/templateManager/templateManager.js"
        , "/js/nonmodules/component/cube/rankingEditor/rankingEditor.js"
        , "/js/nonmodules/component/cube/summaryDisplay/summaryDisplay.js"
      ],
      "buildFolders": [
          "/js/nonmodules/component/scorecard"
        , "/js/nonmodules/component/cube"
        , "/js/nonmodules/component/cube/templateManager"
        , "/js/nonmodules/component/cube/rankingEditor"
        , "/js/nonmodules/component/cube/summaryDisplay"
      ]
    },
    {
      "id": "bcduiTreeView",
      "required": "backCompatibility",
      "files": [
        "/js/nonmodules/component/treeView/treeViewPackage.js"
      ],
      "buildFolders": [
        "/js/nonmodules/component/treeView"
      ]
    },
    {
      "id": "bcduiGrid",
      "required": "optional",
      "files": [
          "/js/3rdParty/numbro.js"
        , "/js/3rdParty/handsontable.js"
        , "/js/nonmodules/component/grid/gridCreate.js"
        , "/js/nonmodules/component/grid/gridEditor.js"
        , "/js/nonmodules/component/grid/contextMenuResolver.js"
      ],
      "css": [
        "/js/3rdParty/handsontable.css"
      ],
      "buildFolders": [
        "/js/nonmodules/component/grid"
      ]
    },
    {
      "id": "bcduiMessagesEditor",
      "required": "optional",
      "files": [
          "/js/3rdParty/handsontable.js"
        , "/js/3rdParty/ckeditor/ckeditorPackage/ckeditor.js"
        , "/js/3rdParty/ckeditor/ckeditor_jqueryPlugin.js"
        , "/js/nonmodules/component/grid/gridCreate.js"
        , "/js/nonmodules/component/grid/gridEditor.js"
        , "/js/nonmodules/component/grid/contextMenuResolver.js"
        , "/js/nonmodules/widget/messages/bcduiHtmlEditor.js"
        , "/js/nonmodules/widget/messages/messagesEditor.js"
        , "/js/nonmodules/widget/messages/messagesViewer.js"
      ],
      "css": [
        "/js/3rdParty/handsontable.css"
      ],
      "buildFolders": [
        "/js/nonmodules/component/grid"
      , "/js/nonmodules/widget/messages"
      ]
    },
    {
      "id": "bcduiMessagesViewer",
      "required": "mandatory",
      "files": [
        "/js/nonmodules/widget/messages/messagesViewer.js"
      ],
      "buildFolders": [
        "/js/nonmodules/widget/messages"
      ]
    },
    {
      "id": "bcduiDocUpload",
      "required": "optional",
      "files": [
        "/js/nonmodules/component/docUpload/docUploadCreate.js"
      ],
      "buildFolders": [
        "/js/nonmodules/component/docUpload"
      ]
    },
    {
      "id": "bcduiTree",
      "required": "optional",
      "files": [
        "/js/nonmodules/component/tree/treeCreate.js"
      , "/js/nonmodules/component/tree/contextMenuResolver.js"
      ],
      "buildFolders": [
        "/js/nonmodules/component/tree"
      ]
    },
    {
      "id": "bcduiUserCalcEditor",
      "required": "backCompatibility",
      "files": [
        "/js/nonmodules/component/userCalcEditor/userCalcEditorPackage.js"
      ],
      "buildFolders": [
        "/js/nonmodules/component/userCalcEditor"
      ]
    },
    {
      "id": "bcduiTextNavigation",
      "required": "backCompatibility",
      "files": [
        "/js/nonmodules/component/textNavigation/textNavigation.js"
      ]
    },
    {
      "id": "bcduiCustomElement",
      "required": "mandatory",
      "browserCompatibility": "mandatory",
      "files": [
          "/js/nonmodules/core/customElements.js"
        , "/js/nonmodules/widget/customElements.js"
        , "/js/nonmodules/widgetNg/customElements.js"
        , "/js/nonmodules/component/chart/customElements.js"
        , "/js/nonmodules/component/cube/customElements.js"
        , "/js/nonmodules/component/scorecard/customElements.js"
        , "/js/nonmodules/component/far/customElements.js"
      ]
    }
  ]
};
// JSON-PART-FOR-BUILD

// build browser compatibility matrix
bcdui.browserCompatibility = (function(){
  var ua = navigator.userAgent;
  /**
   * Gecko is a render engine of its own and used in FireFox
   * Webkit is used by Safari and itself a fork of KHTML
   * Blink, used by Chrome, Edge and Opera, is a fork of Webkit. Fixes for Webkit mostly also apply to Blink browsers
   */
  return {
    // Render engines used for polyfills, see (extended)browserCompatibility
    isGecko:          ua.indexOf('Gecko/') > -1, // FireFox
    isWebKit:         ua.indexOf('AppleWebKit/') > -1, // Chrome, MS Edge and Opera, Safari
    isBlink:          ua.indexOf('Chrome') > -1, // Chrome, Edge, Opera
    // Specific browsers, consider reacting on render engines above instead
    isFirefox:        ua.indexOf('Gecko/') > -1, // FireFox
    isSafari:         ua.indexOf('Macintosh') > -1, // Safari on MacOS
    isMobileSafari:   /Apple.*Mobile/.test(ua), // Safari on iOS
    isChrome:         ua.indexOf('Chrome') > -1 && ua.indexOf(' OPR/') === -1  && ua.indexOf(' Edg/') === -1, // Chrome
    isEdge:           ua.indexOf(' Edg/') > -1, // MS Edge
    isOpera:          ua.indexOf(' OPR/') > -1, // Opera
  }
})();

//Prepend to any already existing group definition, which may extend us
bcdui.bcduiFiles = bcdui.bcduiFiles || {};
if( typeof bcdui.bcduiFiles.groups != 'undefined' )
  bcdui.bcduiFiles.groups = bcdui.bcduiCeFiles.groups.concat(bcdui.bcduiFiles.groups);
else
  bcdui.bcduiFiles.groups = bcdui.bcduiCeFiles.groups;

// construct bcdui.config.loadFiles array
(function(){
  var scripts = document.getElementsByTagName("script");
  for (var s = 0; s < scripts.length; s++) {
    var src = scripts[s].getAttribute("src");
    if (src != null) {
      var idx = src.indexOf("bcduiLoadFiles=");
      if (idx != -1) {
        bcdui.config.loadFiles = src.substring(idx + "bcduiLoadFiles=".length);
        var idx2 = bcdui.config.loadFiles.indexOf("&");
        bcdui.config.loadFiles = idx2 != -1 ? bcdui.config.loadFiles.substring(0, idx2).split(",") : bcdui.config.loadFiles.split(",");
        break;
      }
    }
  }
})();

// Let's load all the js requested files. May come from a parameter bcduiLoadFiles when loading bcdui.js
// If bcdui.config.loadFiles is not set: All mandatory plus backCompatibility
// If bcdui.config.loadFiles is set: All mandatory plus listed ones 
bcdui.config.loadFiles = bcdui.config.loadFiles || [];
(function(){
  // apply trivalent compatibility matrix ( true, false, ignore )
  var isBrowserCompatible = function(group){
    // consider compatible if no matrix defined
    if (!group.browserCompatibility) {
      return true;
    }

    // consider compatible if all defined flags match
    for(var key in group.browserCompatibility){
      if (!bcdui.browserCompatibility[key] === group.browserCompatibility[key]){
        return false;
      }
    }

    return true;
  };

  for (var g = 0; g < bcdui.bcduiFiles.groups.length; g++) {
    var group = bcdui.bcduiFiles.groups[g];

    var indexOf = -1;
    for (var i = 0; i < bcdui.config.loadFiles.length; i++) {
      if (bcdui.config.loadFiles[i] == group.id) {
        indexOf = i;
      }
    }

    if( (group.required === "mandatory"
        || indexOf !== -1
        || ( bcdui.config.loadFiles.length === 0 && group.required === "backCompatibility" )
        ) && isBrowserCompatible(group) ) {
      for (var f = 0; f < group.files.length; f++) {

        document.write("<script type='text/javascript' src='" + bcdui.config.contextPath + "/bcdui" + group.files[f] + "'><\/script>");
      }
      for (var c = 0; group.css && c < group.css.length; c++)
        document.write("<link rel='stylesheet' type='text/css' href='" + bcdui.config.contextPath + "/bcdui" + group.css[c] + "'>");
    }
  }
  // and finally signal that all scripts are loaded 
  document.write("<script type='text/javascript'>bcdui.log.debug('BCD-UI lib is fully loaded');<\/script>");
})();
