/*
  Copyright 2010-2019 BusinessCode GmbH, Germany

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

//Workaround for IE <= 9
if( typeof location.origin == "undefined" ) {
  location.origin = location.protocol+"//"+location.hostname+(location.port?":"+location.port:"");
}

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
     "id": "_ecma6Polyfills",
     "required": "mandatory",
     "browserCompatibility" : {
       "isIE" : true
     },
     "files": [
          "/js/3rdParty/babel-polyfill.js"
     ]
    },
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
          "/js/util/utilPackage.js"
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
        , "/js/widgetNg/dateInput/dateInputPackage.js"
        , "/js/widgetNg/textArea/textAreaPackage.js"
        , "/js/widgetNg/checkbox/checkboxPackage.js"
        , "/js/widgetNg/suggestInput/suggestInputPackage.js"
        , "/js/widgetNg/singleSelect/singleSelectPackage.js"
        , "/js/widgetNg/connectable/connectablePackage.js"
        , "/js/widgetNg/sideBySideChooser/sideBySideChooserPackage.js"
        , "/js/widgetNg/universalFilter/universalFilterPackage.js"
        , "/js/widgetNg/slider/sliderPackage.js"
        , "/js/widgetNg/slider/typedSliders.js"
        , "/js/widgetNg/quickEdit/quickEditPackage.js"
      ]
    },
    {
      "id": "bcduiComponent",
      "required": "default",
      "files": [
        "/js/component/cube/templateManager/templateManager.js"
        , "/js/component/cube/rankingEditor/rankingEditor.js"
        , "/js/component/cube/summaryDisplay/summaryDisplay.js"
      ],
      "buildFolders": [
        "/js/component/cube/templateManager"
        , "/js/component/cube/rankingEditor"
        , "/js/component/cube/summaryDisplay"
      ]
      },
    {
      "id": "bcduiChart",
      "required": "default",
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
      "required": "default",
      "files": [
          "/js/component/cube/cubeCreate.js"
        , "/js/component/cube/cubeConfigurator/cubeConfigurator.js"
        , "/js/component/cube/cubeConfigurator/cubeConfiguratorDND.js"
        , "/js/component/cube/expandCollapseCells.js"
      ],
      "buildFolders": [
        "/js/component/cube"
      ]
    },
    {
      "id": "bcduiFar",
      "required": "default",
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
      "required": "default",
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
      "required": "default",
      "files": [
          "/js/component/scorecard/scorecardModel.js"
        , "/js/component/scorecard/scorecardCreate.js"
        , "/js/component/scorecard/scorecardConfigurator.js"
        , "/js/component/scorecard/bcdAspects.js"
      ],
      "buildFolders": [
        "/js/component/scorecard"
      ]
    },
    {
      "id": "bcduiTreeView",
      "required": "default",
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
      "id": "bcduiUserCalcEditor",
      "required": "default",
      "files": [
        "/js/component/userCalcEditor/userCalcEditorPackage.js"
      ],
      "buildFolders": [
        "/js/component/userCalcEditor"
      ]
    },
    {
      "id": "bcduiTextNavigation",
      "required": "default",
      "files": [
        "/js/component/textNavigation/textNavigation.js"
      ]
    },
    {
      "id": "_webComponentsLitePolyfill",
      "required": "mandatory",
      "browserCompatibility" : {
        "isOpera":  false,
        "isWebKit": false,
        "isIE8":    false
      },
      "files": [
        "/js/3rdParty/webcomponents-lite.js" 
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
      isOpera:          isOpera,
      isWebKit:         ua.indexOf('AppleWebKit/') > -1 && ua.indexOf(' Edge/') === -1,
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
// If bcdui.config.loadFiles is not set: All mandatory plus default
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

  // For Internet Explorer, ECMA6 files are transpiled to ECMA5, this is only done on file gouping
  // i.e., when merging all non-3rdParty files of a group into one
  var switchEs5 = bcdui.browserCompatibility.isIE;

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
        || ( bcdui.config.loadFiles.length === 0 && group.required === "default" )
        ) && isBrowserCompatible(group) ) {
      for (var f = 0; f < group.files.length; f++) {
        if( switchEs5 )
          group.files[f] = group.files[f].replace('.js', '-es5.js');
        document.write("<script type='text/javascript' src='" + bcdui.config.contextPath + "/bcdui" + group.files[f] + "'><\/script>");
      }
      for (var c = 0; group.css && c < group.css.length; c++)
        document.write("<link rel='stylesheet' type='text/css' href='" + bcdui.config.contextPath + "/bcdui" + group.css[c] + "'>");
    }
  }
  // and finally signal that all scripts are loaded 
  // IE8 loads the upper created scripts later so that the following bui loaded flagging only works for IE >8, therefore we check the object availability
  document.write("<script type='text/javascript'>bcdui && bcdui.log && bcdui.log.isDebugEnabled() && bcdui.log.debug('BCD-UI lib is fully loaded');<\/script>");
})();
