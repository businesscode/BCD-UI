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

import "./3rdParty.js"

import "../../bcdui.js?mode=module"
import "../3rdParty/doT/doT.js"
import "./util.js"

import "../bcdui.js"
import "../settings.js"
import "../core/corePackage.js"
import "../core/statusHandling.js"
import "../factory/objectRegistry.js"
import "../log/logPackage.js"
import "../core/abstractExecutable.js"

import {
  bcduiExport_DataProvider as DataProvider
} from "../core/dataProvider.js"

import "../core/browserCompatibility.js"
import {
  bcduiExport_DotJsTransformator as DotJsTransformator
, bcduiExport_JsTransformator as JsTransformator
, bcduiExport_WebworkerTransformator as WebworkerTransformator
} from "../core/transformators.js"
// wrap extendedBrowserCompatibility for dynamic SaxonJs injection
import "./extendedBrowserCompatibility.js"
import "../core/commonStatusObjects.js"

import {
  bcduiExport_AsyncJsDataProvider as AsyncJsDataProvider
, bcduiExport_ConstantDataProvider as ConstantDataProvider
, bcduiExport_DataProviderAlias as DataProviderAlias
, bcduiExport_DataProviderHolder as DataProviderHolder
, bcduiExport_DataProviderHtmlAttribute as DataProviderHtmlAttribute
, bcduiExport_DataProviderWithXPath as DataProviderWithXPath
, bcduiExport_DataProviderWithXPathNodes as DataProviderWithXPathNodes
, bcduiExport_JsDataProvider as JsDataProvider
, bcduiExport_OptionsDataProvider as OptionsDataProvider
, bcduiExport_PromptDataProvider as PromptDataProvider
, bcduiExport_RequestDocumentDataProvider as RequestDocumentDataProvider
, bcduiExport_StringDataProvider as StringDataProvider
} from "../core/dataProviders.js"

import "../core/xmlLoader.js"
import "../log/backendEventsPoller.js"
import "../log/clientEventsPublisher.js"
import "../core/abstractUpdatableModel.js"

import {
  bcduiExport_SimpleModel as SimpleModel
} from "../core/simpleModel.js"

import {
  bcduiExport_StaticModel as StaticModel
} from "../core/staticModel.js"

import {
  bcduiExport_AutoModel as AutoModel
} from "../core/autoModel.js"

import {
  bcduiExport_Renderer as Renderer
, bcduiExport_ModelUpdater as ModelUpdater
, bcduiExport_ModelWrapper as ModelWrapper
, bcduiExport_TransformationChain as TransformationChain
} from "../core/transformationChain.js"

import "../core/event/eventPackage.js"
import "../core/compression/compressionPackage.js"
import "../factory/factoryPackage.js"
import "../i18n/i18n.js"
import "../i18n/i18nPackage.js"
import "../core/lifecycle/lifecyclePackage.js"
import "../core/lifecycle/autoRefresh.js"
import "../wrs/wrsUtilPackage.js"

import "../core/customElements.js"

//import bcduiCss from '../../theme/css/allStyles.css' with { type: 'css' };
//document.adoptedStyleSheets.push(bcduiCss);

export {
  AutoModel
, DataProvider
, ModelUpdater, ModelWrapper, Renderer, TransformationChain
, SimpleModel
, StaticModel
, DotJsTransformator, WebworkerTransformator, JsTransformator
, AsyncJsDataProvider, ConstantDataProvider, DataProviderAlias, DataProviderHolder, DataProviderHtmlAttribute, DataProviderWithXPath, DataProviderWithXPathNodes, JsDataProvider, OptionsDataProvider, PromptDataProvider, RequestDocumentDataProvider, StringDataProvider
}; 