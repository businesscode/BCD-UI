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
bcdui.util.namespace("bcdui.component",
/** @lends bcdui.component */
{
  /**
   * From JS use new bcdui.component.far.FarModel() instead. This is for JSP etc.
   * @private
   */
  createFarModel: function(args){
    args.id = args.id || bcdui.factory.objectRegistry.generateTemporaryIdInScope("bcd-component-farmodel");
    bcdui.factory._syncAndNormalize(["statusModel", "config"], args, function(args){
      new bcdui.component.far.FarModel(args);
    });
  },

  /**
   * From JS use new bcdui.component.far.Far() instead. This is for JSP etc.
   * @private
   */
  createFar: function(args){
    bcdui.factory._syncAndNormalize(["statusModel", "config"], args, function(args){
      new bcdui.component.far.Far(args);
    });
  }
});
