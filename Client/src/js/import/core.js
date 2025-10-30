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

import {_bcdTemplateLib} from "./3rdParty.js"

import "../../bcdui.js?mode=module"

import "./util.js"

import "../bcdui.js"
import "../settings.js"
import "../core/corePackage.js"
import "../core/statusHandling.js"
import "../factory/objectRegistry.js"
import "../log/logPackage.js"
import "../core/abstractExecutable.js"

import {
  bcduiExport_DataProvider as bcdDataProvider
} from "../core/dataProvider.js"

import "../core/browserCompatibility.js"
import "../core/extendedBrowserCompatibility.js"
import "../core/commonStatusObjects.js"

import {
  bcduiExport_AsyncJsDataProvider as bcdAsyncJsDataProvider
, bcduiExport_ConstantDataProvider as bcdConstantDataProvider
, bcduiExport_DataProviderAlias as bcdDataProviderAlias
, bcduiExport_DataProviderHolder as bcdDataProviderHolder
, bcduiExport_DataProviderHtmlAttribute as bcdDataProviderHtmlAttribute
, bcduiExport_DataProviderWithXPath as bcdDataProviderWithXPath
, bcduiExport_DataProviderWithXPathNodes as bcdDataProviderWithXPathNodes
, bcduiExport_JsDataProvider as bcdJsDataProvider
, bcduiExport_OptionsDataProvider as bcdOptionsDataProvider
, bcduiExport_PromptDataProvider as bcdPromptDataProvider
, bcduiExport_RequestDocumentDataProvider as bcdRequestDocumentDataProvider
, bcduiExport_StringDataProvider as bcdStringDataProvider
} from "../core/dataProviders.js"

import {
  bcduiExport_DotJsTransformator as bcdDotJsTransformator
, bcduiExport_JsTransformator as bcdJsTransformator
, bcduiExport_WebworkerTransformator as bcdWebworkerTransformator
} from "../core/transformators.js"

import "../core/xmlLoader.js"
import "../log/backendEventsPoller.js"
import "../log/clientEventsPublisher.js"
import "../core/abstractUpdatableModel.js"

import {
  bcduiExport_SimpleModel as bcdSimpleModel
} from "../core/simpleModel.js"

import {
  bcduiExport_StaticModel as bcdStaticModel
} from "../core/staticModel.js"

import {
  bcduiExport_AutoModel as bcdAutoModel
} from "../core/autoModel.js"

import {
  bcduiExport_Renderer as bcdRenderer
, bcduiExport_ModelUpdater as bcdModelUpdater
, bcduiExport_ModelWrapper as bcdModelWrapper
, bcduiExport_TransformationChain as bcdTransformationChain
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
  bcdAutoModel
, bcdDataProvider
, bcdModelUpdater, bcdModelWrapper, bcdRenderer, bcdTransformationChain
, bcdSimpleModel
, bcdStaticModel
, bcdDotJsTransformator, bcdWebworkerTransformator, bcdJsTransformator
, bcdAsyncJsDataProvider, bcdConstantDataProvider, bcdDataProviderAlias, bcdDataProviderHolder, bcdDataProviderHtmlAttribute, bcdDataProviderWithXPath, bcdDataProviderWithXPathNodes, bcdJsDataProvider, bcdOptionsDataProvider, bcdPromptDataProvider, bcdRequestDocumentDataProvider, bcdStringDataProvider
}; 