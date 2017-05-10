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
   * @private
   */
  _templateUrl: bcdui.config.jsLibPath+"component/cube/templateManager/rendering.xslt",

  /**
   * @private
   */
  _renderTemplateArea: function(args) {
    return (args.isTemplate ? "<div id='bcdUpDown_Template_{{=it.id}}' class='bcdUpDown_Template'></div>" + 
        "<div id='bcdUpDownBody_Template_{{=it.id}}'>" + 
          "<div id='bcdDndTemplateDiv_{{=it.id}}'></div>" +
        "</div>" : "");
  },

  /**
   * applyUserTemplate
   * @private
   */
  _applyUserTemplate: function( objectId, id, element ) {

    // highlight selected item 
    jQuery(".bcdReportTemplateList a").removeClass("bcdSelected");
    jQuery(element).addClass("bcdSelected");

    var metaDataModel = bcdui.component.cube.templateManager._getOptionsModel();
    var idAttr = metaDataModel.getData().selectSingleNode("/*/cube:Layouts/cube:Layout[@cubeId='"+objectId+ "']") != null ? "@cubeId" : "@scorecardId";
    var ns = idAttr == "@cubeId" ? "cube:" : "scc:";
    var template  = metaDataModel.getData().selectSingleNode("/*/*[local-name()='Layouts']/*[local-name()='Layout' and " + idAttr + " = '"+objectId+"' and @id='"+ id +"']");
    if (template != null) {
      // copy data
      var targetModel = bcdui.component.cube.templateManager._getTargetModel();
      bcdui.core.removeXPath(targetModel.getData(), "/*/*[local-name()='Layout' and " + idAttr + " ='"+objectId+"']" );
      targetModel.getData().selectSingleNode("/*").appendChild(template.cloneNode(true));

      // avoid double firing in case of targetModel == guiStatus and flag "no client refresh possible"
      var layoutNode = bcdui.core.createElementWithPrototype( bcdui.wkModels.guiStatus, "/*/guiStatus:ClientSettings/" + ns + "ClientLayout[" + idAttr + " ='"+ objectId+"']" );
      layoutNode.setAttribute("disableClientRefresh","true");

      // avoid double/triple firing in case of targetModel == guiStatus or refresh target  == targetModel
      var refreshTargetModelId = jQuery("#" + objectId + "_dnd").data("targetModelId");
      
      // fire guiStatus only when it's not identical to template Target or refreshingCube Target
      // since then it gets fired later down below
      if (targetModel.id != "guiStatus" && refreshTargetModelId != "guiStatus")
        bcdui.wkModels.guiStatus.fire();

      // fire template Target only if it's handled automatically by reDisplay
      if (targetModel.id != refreshTargetModelId)
        targetModel.fire();

      if (idAttr == "@cubeId")
        bcdui.component.cube.configuratorDND.reDisplay(objectId, true); // fires refreshTargetModelId
      else
        bcdui.component.scorecardConfigurator.reDisplay(objectId, true); // fires refreshTargetModelId
    }
  },

  /**
   * Removes the current layout
   * @param {string}  objectId    The id of the linked object (cube or scorecard)
   */
   clearLayout: function(objectId) {
    // remove data
    var targetModel = bcdui.component.cube.templateManager._getTargetModel();
    var idAttr = targetModel.getData().selectSingleNode("/*/cube:Layout[@cubeId ='"+objectId+"']") != null ? "@cubeId" : "@scorecardId";
    var ns = idAttr == "@cubeId" ? "cube:" : "scc:";

    bcdui.core.removeXPath(targetModel.getData(), "/*/*[local-name()='Layout' and "+idAttr+" ='"+objectId+"']" );

    // avoid double firing in case of targetModel == guiStatus and flag "no client refresh possible"
    var layoutNode = bcdui.core.createElementWithPrototype( bcdui.wkModels.guiStatus, "/*/guiStatus:ClientSettings/" + ns + "ClientLayout["+idAttr+" ='"+ objectId+"']" );
    layoutNode.setAttribute("disableClientRefresh","true");

    // avoid double/triple firing in case of targetModel == guiStatus or refresh target  == targetModel
    var refreshTargetModelId = jQuery("#" + objectId + "_dnd").data("targetModelId");
    
    // fire guiStatus only when it's not identical to template Target or refreshingCube Target
    // since then it gets fired later down below
    if (targetModel.id != "guiStatus" && refreshTargetModelId != "guiStatus")
      bcdui.wkModels.guiStatus.fire();

    // fire template Target only if it's handled automatically by reDisplay
    if (targetModel.id != refreshTargetModelId)
      targetModel.fire();

    if (idAttr == "@cubeId")
      bcdui.component.cube.configuratorDND.reDisplay(objectId, true); // fires refreshTargetModelId
    else
      bcdui.component.scorecardConfigurator.reDisplay(objectId, true); // fires refreshTargetModelId

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
    return bcdui.factory.objectRegistry.getObject(jQuery('.bcdReportTemplates').attr("bcdTargetModelId"));
  },

  /**
   * reads the attribute from template html elements
   * @private
  */
  _getOptionsModel: function(){
    return bcdui.factory.objectRegistry.getObject(jQuery('.bcdReportTemplates').attr("bcdMetaDataModelId"));
  }
});