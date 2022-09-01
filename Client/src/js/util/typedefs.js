/*
  Copyright 2010-2022 BusinessCode GmbH, Germany

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
 Packages of BCD-UI
 */
jQuery.extend( true, bcdui, {
  browserCompatibility: {},
  config: {},
  component: {
    chart: {},
    cube: { configurator: {}, configuratorDND: {}, rankingEditor: {}, summaryDisplay: {}, templateManager:{}, expandCollapse:{} },
    docUpload: {},
    exports: {},
    far: { enhancer:{}, farConfigurator:{} },
    grid:{},
    scorecard: { aspects: {} },
    scorecardConfigurator: {},
    textnavigation:{},
    tree:{},
    treeView:{},
    userCalcEditor:{}
  },
  core: {
    browserCompatibility: { ie: {} },
    event:{}
  },
  debug: {},
  factory: {},
  i18n: {},
  logging: {},
  subjectSettings: {},
  widget: { contextMenu: {}, detailView: {}, dimensionChooser:{}, effects: {}, formulaEditor: { Parser: {} }, inputField: {},
    menu: {}, multiSelect: {}, notifications: {}, periodChooser: {}, singleSelect: {}, tab: {}, pageEffects: {}
  },
  widgetNg: {
    commons: { balloon: {} },
    button: {}, checkbox: {}, comment:{}, connectable: {}, dateInput: {}, input: {}, label: {}, pasteList: {}, sideBySideChooser: {}, chipsChooser: {}, singleSelect: {},
    slider: {}, suggestInput: {}, textArea: {}, universalFilter: {},
    utils: { sorting: {} },
    validation: { validators: { general: {}, widget:{} } }
  },
  wrs:{ wrsUtil:{}, jsUtil:{} }
});

/**
 * @typedef {Number} integer
 * @description
 * Integer
 */
/**
 * @typedef {Object} enum
 * @description
 * Enumeration
 */
/**
 * @typedef {Object} DomDocument
 * @description
 * DomDocument
 */
/**
 * @typedef {Object} DomElement
 * @description
 * DomElement
 */
/**
 * @typedef {Object} DomAttribute
 * @description
 * DomAttribute
 */
/**
 * @typedef {Object} DomNodeSet
 * @description
 * A DomNodeSet
 */
/**
 * @typedef {Object} HtmlElement
 * @description
 * HtmlElement
 */
/**
 * @typedef {Object} SymLink
 * @description
 * Symlink
 */

/**
 * @typedef {url|Function|Array.<(url|Function)>|bcdui.core.DataProvider} chainDef
 * @description
 * Defines the transformation steps of a transformation chain, like {@link bcdui.core.ModelWrapper} or {@link bcdui.core.Renderer}.
 * <br/>Can be: url | function | Array<(url|function)> | bcdui.core.DataProvider
 * <br/>You can provide
 * <ul>
 *   <li>A single DataProvider, holding a chain definition following XML Schema 'chain-1.0.0.xsd'. Or
 *   <li>A single string holding the url of an xslt document (*.xslt) or a doT.js file (*.dott). Or
 *   <li>A javascript transformator function, representing a transformation. Such a function gets two parameters, data, like a DOM or JSON, whatever DataProvider.getData() returns
 *       and a parameter object, which maps parameter names to the actual parameters. It can return a new data object or modify the one, which was its input.
 *       It it does not return anything, its (modified) input doc is used as return default. Or
 *   <li>An array of such strings and functions in the order they are to be executed. In this case, the output of the n-th transformation becomes the input of n+1.
 * </ul>
 * @example <caption>These are all valid values for a chainDef:</caption>
 * "myStylesheet.xslt"                         // An <b>url</b> pointing to an *.xslt or a *.dott file
 * ["myTrans.dott", jsTrans]                   // An <b>array</b> of transformators, can be urls (doT.js or xslt) and js functions
 * new bcdui.core.StaticModel(...)             // A <b>DataProvider subclass</b>, providing an xml chain definition according to chain-1.0.0.xsd
 * function jsTrans(doc, params) {             // A <b>js function</b>, expecting a data object (DOM or JSON)
 *   var n = doc.getElementById('someId');
 *   n.setAttribute('someAttr', params.newValue);
 * }
 */



/**
 * @typedef {string} i18nToken
 * @description
 * A string value which is either taken as-is or an i18n key-marker as proposed by
 * <br/>We use xE0FF prefix to separate an i18n token from a plain string. This marker is available via bcdui.i18n.TAG
 * For i18n keys, see messages.xml or binding set bcd_i18n
 * @example
 * caption = "data"       // Treats value 'data' literal
 * caption = "\uE0FFdata" // Treats value 'data' as an i18n-key
 */


/**
 * @typedef {string|HtmlElement|jQuery} targetHtmlRef
 * @description
 * Any reference to an existing HTML element: Can be a DOM element, a jQuery object, a css selector or a plain id of an element.
 * The referenced element *must*  be attached to html document unless the reference itself is a DOM element.
 * <br/>If jQuery returns a list with multiple matches, the first member is used. These are all valid examples:
 * @example
 * document.getElementById("myId").firstChild      // Any plain <b>DOM element</b>
 * jQuery('#myElementId') &bull; jQuery('ul li:first')  // A <b>jQuery</b> list, first one is used
 * 'ul li:first'                                   // A <b>css selector</b>, first match is used
 * 'myElementId'                                   // Treated as an <b>element id</b> if its just letters (id without #)
 */

/**
 * @typedef {string} modelXPath
 * @description
 * Provide an XPath, which can be used to use nodes from, can point to an attribute or a full subtree.
 * Start the XPath with $someModelId, make sure that you create this {@link bcdui.core.DataProvider} with an explicit id.
 * Default for this is $guiStatus, which is always auto-registered.
 * <br/>Note: You can also build quite complex XPaths and refer to further registered models via '$myModelId' in predicates, see second example.
 * @example
 * $guiStatus/guiStatus:Status/guiStatus:MyNode                                     // A string with a simple XPath
 * $modelId/f:Filter/f:Filters[$guiStatus/guiStatus:Status/guiStatus:MyNodes/@attr] // A string with a more complex XPath, using multiple models
 */

/**
 * @typedef {string} xPath
 * @description
 * Provide an XPath, which can be used to use nodes from, can point to an attribute or a full subtree.
 * <br/>Note: must not contain model references.
 * @example
 * /guiStatus:Status/guiStatus:MyNode                                     // A string with a simple XPath
 */

/**
 * @typedef {string} writableModelXPath
 * @description
 * Provide an XPath, which can be used to append nodes to. In most cases the path will be created if it does not exist,
 * reusing as much as possible. See {@link bcdui.core.createElementWithPrototype}
 * Start the XPath with $dataProviderId, make sure that you create this {@link bcdui.core.DataProvider} with an explicit id.
 * Default for this is $guiStatus, which is always auto-registered.
 * Be aware that the model's data changes, if it is a ModelWrapper, the next execute() would of course overwrite the change.
 * <br/>You can also build complex XPaths and refer to further models via '$dataProviderId' in predicates.
 * @example
 * /guiStatus:Status/guiStatus:MyNode                                               // Default is $guiStatus
 * $modelId/f:Filter/f:Filters[$guiStatus/guiStatus:Status/guiStatus:MyNodes/@attr] // A string with a more complex XPath, using multiple models
 */
