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
/**
 * @namespace bcdui.component.cube.templateManager
 */
bcdui.util.namespace("bcdui.component.cube.templateManager",
/** @lends bcdui.component.cube.templateManager */
{
  /**
   * applyUserTemplate
   * @private
   */
  _applyUserTemplate: function( cubeId, id ) {
    var metaDataModel = bcdui.component.cube.templateManager._getOptionsModel();
    var template  = metaDataModel.getData().selectSingleNode("/*/cube:Layouts/cube:Layout[@cubeId = '"+cubeId+"' and @id='"+ id +"']");
    if (template != null) {
      // copy data
      var targetModel = bcdui.component.cube.templateManager._getTargetModel();
      bcdui.core.removeXPath(targetModel.getData(), "/*/cube:Layout[@cubeId ='"+cubeId+"']" );
      targetModel.getData().selectSingleNode("/*").appendChild(template.cloneNode(true));

      // avoid double firing in case of targetModel == guiStatus and flag "no client refresh possible"
      var layoutNode = bcdui.core.createElementWithPrototype( bcdui.wkModels.guiStatus, "/*/guiStatus:ClientSettings/cube:ClientLayout[@cubeId ='"+ cubeId+"']" );
      layoutNode.setAttribute("disableClientRefresh","true");

      // avoid double/triple firing in case of targetModel == guiStatus or refresh target  == targetModel
      var refreshTargetModelId = jQuery("#" + cubeId + "_dnd").data("targetModelId");
      
      // fire guiStatus only when it's not identical to template Target or refreshingCube Target
      // since then it gets fired later down below
      if (targetModel.id != "guiStatus" && refreshTargetModelId != "guiStatus")
        bcdui.wkModels.guiStatus.fire();

      // fire template Target only if it's handled automatically by reDisplay
      if (targetModel.id != refreshTargetModelId)
        targetModel.fire();

      bcdui.component.cube.configuratorDND.reDisplay(cubeId, true); // fires refreshTargetModelId
    }
  },

  /**
   * Removes the current layout
   * @param {string}  cubeId    The id of the linked cube
   */
   clearLayout: function(cubeId) {
    // remove data
    var targetModel = bcdui.component.cube.templateManager._getTargetModel();
    bcdui.core.removeXPath(targetModel.getData(), "/*/cube:Layout[@cubeId ='"+cubeId+"']" );

    // avoid double firing in case of targetModel == guiStatus and flag "no client refresh possible"
    var layoutNode = bcdui.core.createElementWithPrototype( bcdui.wkModels.guiStatus, "/*/guiStatus:ClientSettings/cube:ClientLayout[@cubeId ='"+ cubeId+"']" );
    layoutNode.setAttribute("disableClientRefresh","true");

    // avoid double/triple firing in case of targetModel == guiStatus or refresh target  == targetModel
    var refreshTargetModelId = jQuery("#" + cubeId + "_dnd").data("targetModelId");
    
    // fire guiStatus only when it's not identical to template Target or refreshingCube Target
    // since then it gets fired later down below
    if (targetModel.id != "guiStatus" && refreshTargetModelId != "guiStatus")
      bcdui.wkModels.guiStatus.fire();

    // fire template Target only if it's handled automatically by reDisplay
    if (targetModel.id != refreshTargetModelId)
      targetModel.fire();

    bcdui.component.cube.configuratorDND.reDisplay(cubeId, true); // fires refreshTargetModelId

   },

  /**
   * @private
  */
  _toggleElement:  function(elementID) {
    if ( bcdui._migPjs._$(elementID).length > 0) jQuery("#" + elementID).slideToggle();
  },
  /**
   * reads the attribute from template html elements
   * @private
  */
  _getTargetModel: function(){
    return bcdui.factory.objectRegistry.getObject(  bcdui._migPjs._$('cubeTemplateManager').attr("bcdTargetModelId"));
  },

  /**
   * reads the attribute from template html elements
   * @private
  */
  _getOptionsModel: function(){
    return bcdui.factory.objectRegistry.getObject(  bcdui._migPjs._$('cubeTemplateManager').attr("bcdMetaDataModelId"));
  }
});