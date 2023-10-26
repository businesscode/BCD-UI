/*
  Copyright 2010-2023 BusinessCode GmbH, Germany

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

//Allowing precise performance measurement
bcdui.logging = bcdui.logging || new Object();
bcdui.logging.console = "Start "+new Date()+"\n";
bcdui.logging.pageStartTs = new Date().getTime();

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
        , "/js/3rdParty/log4javascript.js"
        , "/js/3rdParty/jquery.js"
        , "/js/3rdParty/jquery-ui.js"
        , "/js/3rdParty/doT.js"
        , "/js/3rdParty/jquery.blockUI.js"
        , "/js/3rdParty/nouislider.js"
        , "/js/3rdParty/d3-format.js"
      ]
    },
    {
      "id": "bcduiUtil",
      "required": "mandatory",
      "files": [
          "/js/util/typedefs.js"
        , "/js/util/utilPackage.js"
        , "/js/util/datetimePackage.js"
        , "/js/util/clipboardPackage.js"
        , "/js/util/urlPackage.js"
        , "/js/util/xmlPackage.js"
        , "/js/jison/bcdui_util_xml_filterExpressionParser.js"
        , "/js/util/bcdJQueryPlugins.js"
      ]
    },
    {
      "id": "bcduiCore",
      "required": "mandatory",
      "files": [
          "/js/bcdui.js"
        , "/js/settings.js"
        , "/js/core/corePackage.js"
        , "/js/core/statusHandling.js"
        , "/js/factory/objectRegistry.js"
        , "/js/log/logPackage.js"
        , "/js/core/abstractExecutable.js"
        , "/js/core/dataProvider.js"
        , "/js/core/browserCompatibility.js"
        , "/js/core/extendedBrowserCompatibility.js"
        , "/js/core/commonStatusObjects.js"
        , "/js/core/dataProviders.js"
        , "/js/core/transformators.js"
        , "/js/core/xmlLoader.js"
        , "/js/log/backendEventsPoller.js"
        , "/js/log/clientEventsPublisher.js"
        , "/js/core/abstractUpdatableModel.js"
        , "/js/core/simpleModel.js"
        , "/js/core/staticModel.js"
        , "/js/core/autoModel.js"
        , "/js/core/transformationChain.js"
        , "/js/core/event/eventPackage.js"
        , "/js/core/compression/compressionPackage.js"
        , "/js/factory/factoryPackage.js"
        , "/js/i18n/i18n.js"
        , "/js/i18n/i18nPackage.js"
        , "/js/core/lifecycle/lifecyclePackage.js"
        , "/js/core/lifecycle/autoRefresh.js"
        , "/js/wrs/wrsUtilPackage.js"
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
          "/js/widget/widgetPackage.js"
        , "/js/widget/detachedEvent.js"
        , "/js/widget/mouseTracker.js"
        , "/js/widget/xmlDataUpdateListener.js"
        , "/js/widgetNg/widgetUtils.js"
        , "/js/widgetNg/bcduiWidget.js"
        , "/js/widget/inputField/inputFieldPackage.js"
        , "/js/widget/singleSelect/singleSelectPackage.js"
        , "/js/widget/multiSelect/multiSelectPackage.js"
        , "/js/widget/dimensionChooser/dimensionChooserPackage.js"
        , "/js/widget/formulaEditor/formulaEditorPackage.js"
        , "/js/widget/formulaEditor/formulaParser.js"
        , "/js/widget/periodChooser/periodChooserPackage.js"
        , "/js/widget/periodChooser/popcalendar.js"
        , "/js/widget/notification/notificationsWidgetPackage.js"
        , "/js/widget/detailView/detailViewPackage.js"
        , "/js/widget/menu/menu.js"
        , "/js/widget/visualizeXml/visualizeXml.js"
        , "/js/widget/contextMenu/contextMenuPackage.js"
        , "/js/widget/tab/tabPackage.js"
        , "/js/widget/effects/effectsPackage.js"
        , "/js/widget/pageEffects.js"
        , "/js/widgetNg/capabilityPackage.js"
        , "/js/widgetNg/commons.js"
        , "/js/widgetNg/validators.js"
        , "/js/widgetNg/widgetPackage.js"
        , "/js/widgetNg/widgetImpl.js"
        , "/js/widgetNg/button/buttonPackage.js"
        , "/js/widgetNg/input/inputPackage.js"
        , "/js/widgetNg/inputLookup/inputLookupPackage.js"
        , "/js/widgetNg/dateInput/dateInputPackage.js"
        , "/js/widgetNg/textArea/textAreaPackage.js"
        , "/js/widgetNg/pasteList/pasteListPackage.js"
        , "/js/widgetNg/checkbox/checkboxPackage.js"
        , "/js/widgetNg/suggestInput/suggestInputPackage.js"
        , "/js/widgetNg/singleSelect/singleSelectPackage.js"
        , "/js/widgetNg/connectable/connectablePackage.js"
        , "/js/widgetNg/sideBySideChooser/sideBySideChooserPackage.js"
        , "/js/widgetNg/chipsChooser/chipsPackage.js"
        , "/js/widgetNg/universalFilter/universalFilterPackage.js"
        , "/js/widgetNg/slider/sliderPackage.js"
        , "/js/widgetNg/slider/typedSliders.js"
        , "/js/widgetNg/quickEdit/quickEditPackage.js"
        , "/js/widgetNg/comment/commentPackage.js"
        , "/js/widgetNg/label/labelPackage.js"
        , "/js/widgetNg/multiCheck/multiCheckPackage.js"
      ]
    },
    {
      "id": "bcduiChart",
      "required": "backCompatibility",
      "files": [
          "/js/component/chart/chartPackage.js"
        , "/js/component/chart/chart.js"
        , "/js/component/chart/drawer.js"
        , "/js/component/chart/colorProvider.js"
        , "/js/component/chart/XmlChart.js"
      ],
      "buildFolders": [
        "/js/component/chart"
      ]
    },
    {
      "id": "bcduiChart2",
      "required": "optional",
      "files": [
          "/js/component/chart/chartPackage.js"
        , "/js/3rdParty/echarts.js"
        , "/js/component/chart/chartEchart.js"
      ],
      "buildFolders": [
        "/js/component/chart"
      ]
    },
    {
      "id": "bcduiCube",
      "required": "backCompatibility",
      "files": [
          "/js/component/cube/cubeCreate.js"
        , "/js/component/cube/cubeConfigurator/cubeConfigurator.js"
        , "/js/component/cube/cubeConfigurator/cubeConfiguratorDND.js"
        , "/js/component/cube/expandCollapseCells.js"
        , "/js/component/cube/templateManager/templateManager.js"
        , "/js/component/cube/rankingEditor/rankingEditor.js"
        , "/js/component/cube/summaryDisplay/summaryDisplay.js"
      ],
      "buildFolders": [
          "/js/component/cube"
        , "/js/component/cube/templateManager"
        , "/js/component/cube/rankingEditor"
        , "/js/component/cube/summaryDisplay"
      ]
    },
    {
      "id": "bcduiCubeInlineChart",
      "required": "optional",
      "files": [
          "/js/component/cube/inlineChart/inlineChart.js"
        , "/js/3rdParty/echarts.js"
        , "/js/component/chart/chartEchart.js"
      ],
      "buildFolders": [
          "/js/component/cube/inlineChart"
        , "/js/component/chart"
      ]
    },
    {
      "id": "bcduiFar",
      "required": "optional",
      "files": [              
        "/js/component/far/configurator/farConfigurator.js"
        ,"/js/component/far/farModel.js"
        ,"/js/component/far/far.js"
        ,"/js/component/far/create.js"
      ],
      "buildFolders": [
        "/js/component/far"
      ]
    },
    {
      "id": "bcduiExport",
      "required": "backCompatibility",
      "files": [
          "/js/component/exports/pdfExport.js"
        , "/js/component/exports/exportsPackage.js"
        , "/js/3rdParty/fileSaver.js" 
      ],
      "buildFolders": [
        "/js/component/exports"
      ]
    },
    {
      "id": "bcduiScorecard",
      "required": "backCompatibility",
      "files": [
          "/js/component/scorecard/scorecardModel.js"
        , "/js/component/scorecard/scorecardCreate.js"
        , "/js/component/scorecard/scorecardConfigurator.js"
        , "/js/component/scorecard/bcdAspects.js"
        , "/js/component/cube/templateManager/templateManager.js"
        , "/js/component/cube/rankingEditor/rankingEditor.js"
        , "/js/component/cube/summaryDisplay/summaryDisplay.js"
      ],
      "buildFolders": [
        "/js/component/scorecard"
        , "/js/component/cube"
        , "/js/component/cube/templateManager"
        , "/js/component/cube/rankingEditor"
        , "/js/component/cube/summaryDisplay"
      ]
    },
    {
      "id": "bcduiTreeView",
      "required": "backCompatibility",
      "files": [
        "/js/component/treeView/treeViewPackage.js"
      ],
      "buildFolders": [
        "/js/component/treeView"
      ]
    },
    {
      "id": "bcduiGrid",
      "required": "optional",
      "files": [
          "/js/3rdParty/handsontable.js"
        , "/js/component/grid/gridCreate.js"
        , "/js/component/grid/gridEditor.js"
      ],
      "css": [
        "/js/3rdParty/handsontable.css"
      ],
      "buildFolders": [
        "/js/component/grid"
      ]
    },
    {
      "id": "bcduiMessagesEditor",
      "required": "optional",
      "files": [
          "/js/3rdParty/handsontable.js"
        , "/js/3rdParty/ckeditor/ckeditorPackage/ckeditor.js"
        , "/js/3rdParty/ckeditor/ckeditor_jqueryPlugin.js"
        , "/js/component/grid/gridCreate.js"
        , "/js/component/grid/gridEditor.js"
        , "/js/widget/messages/bcduiHtmlEditor.js"
        , "/js/widget/messages/messagesEditor.js"
        , "/js/widget/messages/messagesViewer.js"
      ],
      "css": [
        "/js/3rdParty/handsontable.css"
      ],
      "buildFolders": [
        "/js/component/grid"
      , "/js/widget/messages"
      ]
    },
    {
      "id": "bcduiMessagesViewer",
      "required": "mandatory",
      "files": [
        "/js/widget/messages/messagesViewer.js"
      ],
      "buildFolders": [
        "/js/widget/messages"
      ]
    },
    {
      "id": "bcduiDocUpload",
      "required": "optional",
      "files": [
        "/js/component/docUpload/docUploadCreate.js"
      ],
      "buildFolders": [
        "/js/component/docUpload"
      ]
    },
    {
      "id": "bcduiTree",
      "required": "optional",
      "files": [
        "/js/component/tree/treeCreate.js"
      ],
      "buildFolders": [
        "/js/component/tree"
      ]
    },
    {
      "id": "bcduiUserCalcEditor",
      "required": "backCompatibility",
      "files": [
        "/js/component/userCalcEditor/userCalcEditorPackage.js"
      ],
      "buildFolders": [
        "/js/component/userCalcEditor"
      ]
    },
    {
      "id": "bcduiTextNavigation",
      "required": "backCompatibility",
      "files": [
        "/js/component/textNavigation/textNavigation.js"
      ]
    },
    {
      "id": "bcduiCustomElement",
      "required": "mandatory",
      "browserCompatibility" : {
        "isIE8":    false
      },
      "files": [
          "/js/core/customElements.js"
        , "/js/widget/customElements.js"
        , "/js/widgetNg/customElements.js"
        , "/js/component/chart/customElements.js"
        , "/js/component/cube/customElements.js"
        , "/js/component/scorecard/customElements.js"
        , "/js/component/far/customElements.js"
      ]
    }
  ]
};
// JSON-PART-FOR-BUILD

// build browser compatibility matrix
bcdui.browserCompatibility = (function(){
    var ua = navigator.userAgent;
    var isOpera = Object.prototype.toString.call(window.opera) == '[object Opera]';
    var isInternetExplorer = (!!window.attachEvent && !isOpera) || ua.indexOf('Trident') != -1;
    var tridentVersion = null;
    var msIEversion = null;
    var tridentArray = navigator.userAgent.match(/Trident\/[0-9.]+/g);
    var msIEArray = navigator.userAgent.match(/MSIE [0-9.]+/g);
    if (tridentArray != null && tridentArray.length > 0)
      tridentVersion = 4 + parseFloat(tridentArray[0].replace(/Trident\//g, ""));
    if (msIEArray != null && msIEArray.length > 0)
       msIEversion = parseFloat(msIEArray[0].replace(/MSIE/g, ""));

    return {
      isIE:             isInternetExplorer,
      isMsEdge:         ua.indexOf(' Edge/') !== -1,
      isChromiumEdge:   ua.indexOf(" Edg/")  !== -1,
      isOpera:          isOpera,
      isWebKit:         ua.indexOf('AppleWebKit/') > -1 && ua.indexOf(' Edge/') === -1, // Note: This is also true for Chromium Edge
      isGecko:          ua.indexOf('Gecko') > -1 && ua.indexOf('KHTML') === -1 && ua.indexOf('Trident') === -1,
      isMobileSafari:   /Apple.*Mobile/.test(ua),
      isIE8:            isInternetExplorer && parseInt(navigator.userAgent.substring(navigator.userAgent.indexOf("MSIE")+5))== 8,
      ieVersion:        msIEversion != null && msIEversion < tridentVersion ? msIEversion : tridentVersion // IE (emulated) version
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
