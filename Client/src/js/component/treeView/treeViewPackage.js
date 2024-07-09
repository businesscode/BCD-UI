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
/**
 * This namespace contains the functions for expanding and collapsing tree nodes in the tree viewer.
 * @namespace bcdui.component.treeView
 */
bcdui.component.treeView = Object.assign(bcdui.component.treeView, 
/** @lends bcdui.component.treeView */
{
  
  _toggleAction: function() {
    const levelId = jQuery(this).closest("*[levelId]").attr("levelId") || "";
    const rendererId = jQuery(this).closest("*[rendererId]").attr("rendererId") || "";
    const isExpanded = (jQuery(this).closest("*[isExpended]").attr("isExpended") || "false") == "true";
    bcdui.component.treeView.expandCollapse(levelId, rendererId, ! isExpanded);
  },

  /**
   * @private
   */
  _expandedXPath: doT.template(('/*/rnd:TreeView[@idRef = "{{=it.rendererId}}"]/rnd:Exp[. = "{{=it.levelId}}"]')),

  /**
   * Expand or collapse a level for a treeView renderer
   * @param {string}  rendererId - Id of the treeView's renderer
   * @param {string}  levelId    - Which level to change
   * @param {boolean} isExpand   - True for expand, false for collapse
   */
  expandCollapse: function(levelId, /* string */ rendererId, /* boolean */ isExpand)
    {
    var args;
    if( typeof levelId === "string") // Lecacy interface;
      args = { rendererId: rendererId, levelId: levelId, isExpand: isExpand };
    else
      args = levelId;
      if( args.isExpand )
        bcdui.core.createElementWithPrototype(bcdui.wkModels.guiStatus.getData(), bcdui.component.treeView._expandedXPath( { rendererId: args.rendererId, levelId: args.levelId } ));
      else
        bcdui.core.removeXPath(bcdui.wkModels.guiStatus.getData(), bcdui.component.treeView._expandedXPath({ rendererId: args.rendererId, levelId: args.levelId }));
      bcdui.wkModels.guiStatus.fire();
    },

    /**
     * This function expands or collapses all levels of a treeView.
     * It relies on the @dimId and wrs:Data of the primary model of the renderer to calculate all levels
     * and sets the guiStatus accordingly.
     *
     * @param {Object}  args - The argument map containing the following elements:
     * @param {string}  args.rendererId - Id of the treeView's renderer
     * @param {boolean} args.isExpand   - True for expand, false for collapse
     */
    expandCollapseAll: function( args )
      {
        var renderer = jQuery("*[bcdRendererId='"+args.rendererId+"']").data("bcdRenderer");
        if( renderer==null )
          return;
  
        if( args.isExpand != false ) {
          var levelIds = renderer.getData().selectNodes("//wrs:Level/@levelId");
          for( var i = 0; i < levelIds.length; i++ )
            bcdui.core.createElementWithPrototype(bcdui.wkModels.guiStatus.getData(), bcdui.component.treeView._expandedXPath({rendererId: args.rendererId, levelId: levelIds.item(i).nodeValue }));
        } else {
          var expNodes = bcdui.wkModels.guiStatus.getData().selectNodes("/*/rnd:TreeView[@idRef = '"+args.rendererId+"']/rnd:Exp");
          for( var i = 0; i < expNodes.length; i++ )
            expNodes.item(i).parentNode.removeChild(expNodes.item(i));
        }
        bcdui.wkModels.guiStatus.fire();
      },


  /**
   * This handles registering (exactly one) listener per treeview on its status
   * We are called each time the renderer runs from the xslt (bcdOnload). Mainly this removes the need to make the treeview a component.
   * @private
   */
  _registerTreeViewListener: function( /* string */ controllerVariableName )
  {
    // We are called after each rendering, but we only need one listener per renderer
    if( !!bcdui.component.treeView._TreeViewListenerRegistry[controllerVariableName] )
      return;

    bcdui.component.treeView._TreeViewListenerRegistry[controllerVariableName] = true;
    bcdui.factory.addDataListener({
      idRef: bcdui.wkModels.guiStatus.id,
      onlyOnce: false,
      trackingXPath: "/*/rnd:TreeView[@idRef = '"+controllerVariableName+"']",
      listener: function() {
        jQuery("*[bcdRendererId='"+controllerVariableName+"']").data("bcdRenderer").execute(true);
      }
    });
  },
  
  /**
   * @private
   */
  _TreeViewListenerRegistry: {}
});
