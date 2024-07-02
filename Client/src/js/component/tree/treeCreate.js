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
/**
 * This namespace contains functionality directly related to BCD-UI tree
 * @namespace bcdui.component.tree
 */
"use strict"; 

/**
 * Creates a tree front end based on a configuration
 * @extends bcdui.core.Renderer  
*/
bcdui.component.tree.Tree = class extends bcdui.core.Renderer
{
  /**
  * @param args The parameter map contains the following properties:
  * @param {targetHtmlRef}           args.targetHtml                                        - A reference to the HTML DOM Element where to put the output
  * @param {bcdui.core.DataProvider} [args.config=./treeConfiguration]                      - The model containing the tree configuration data. If it is not present a SimpleModel with the url  './treeConfiguration.xml' is created.
  * @param {bcdui.core.DataProvider} [args.statusModel=bcdui.wkModels.guiStatus]            - StatusModel (default is 'guiStatus'), containing the filters as /SomeRoot/f:Filter and used to store tree expand/collapse status
  * @param {string}                  [args.id]                                              - The object's id, needed only when later accessing via id.
  * @param {boolean}                 [args.persistent=true]                                 - Tree expand/collapse status is stored
  * @param {(boolean|string)}        [args.contextMenu=false]                               - If true, tree's default context menu is used, otherwise provide the url to your context menu xslt here.
  * @param {Object}                  [args.parameters]                                      - An object, where each property holds a DataProvider, used as a transformation parameters.
   */
  constructor(args) {

    var id = args.id || bcdui.factory.objectRegistry.generateTemporaryIdInScope("tree");
    var targetHtml = args.targetHtml = args.targetHTMLElementId = bcdui.util._getTargetHtml(args, "tree_");
    var statusModel = args.statusModel || bcdui.wkModels.guiStatus;
    var config = args.config;
    if (! config) {
      config = new bcdui.core.SimpleModel( { url: "treeConfiguration.xml" } );
    }
    var enhancedConfiguration = new bcdui.core.ModelWrapper({
      inputModel: config
      , chain: function(doc, args){
        // add some identifier to the single node
        var q = 0;
        jQuery.makeArray(doc.selectNodes("//*[local-name()='Node' or local-name()='Root']")).forEach(function(e){
          e.setAttribute("bcdNodeId", "L" + (q++));
        });
        return doc;
      }
      , parameters: {statusModel: statusModel }
    });
    
    var rendererParams = args.parameters || {};
    // the actual renderer
    var bcdPreInit = args ? args.bcdPreInit : null;
    super({
      id: id,
      inputModel: enhancedConfiguration,
      targetHtml: targetHtml,
      parameters: jQuery.extend(rendererParams, {statusModel: statusModel}),
      bcdPreInit: function(){
        if (bcdPreInit)
          bcdPreInit.call(this);
        this.chain = this._render.bind(this);
        this.enhancedConfiguration = enhancedConfiguration;
        this.statusModel = statusModel;
      }
    });

    this.id = id;
    this.targetHtml = targetHtml;
    this.config = config;
    this.rendererParams = rendererParams;

    this.persistent = true;
    if (args.persistent === false)
      this.persistent = false;

    this.enhancedConfiguration.onceReady(function(){

      // create the context menu, prepare contextmenu injects the right used treeDataModel
      if( !!args.contextMenu && args.contextMenu !== 'false' && args.contextMenu !== false ) {
        var contextMenuUrl = args.contextMenu === true || args.contextMenu === 'true' ? bcdui.config.jsLibPath+"component/tree/contextMenu.xslt" : args.contextMenu;
        var bcdPageAccess = " " + ((bcdui.config.clientRights && bcdui.config.clientRights.bcdPageAccess) || []).reduce(function(a, b) { return a + " " + b;},[]) + " ";
        var prepareContextMenu = function(doc, args) {
          var target = jQuery("#bcdContextMenuDiv").attr("bcdEventSourceElementId");
          bcdui.factory.objectRegistry.getObject(args.treeId + "_treeDataModel").value = target != null ? bcdui.factory.objectRegistry.getObject(jQuery("#" + target).closest("table").attr("bcdNodeModelId")).getData() : null;
          return doc;
        };
        this.contextMenu = new bcdui.core.ModelWrapper({ chain: [prepareContextMenu, contextMenuUrl], inputModel: this.statusModel,
          parameters: {
            bcdRowIdent: bcdui.wkModels.bcdRowIdent
          , bcdColIdent: bcdui.wkModels.bcdColIdent
          , treeDefinition: this.enhancedConfiguration
          , treeDataModel : new bcdui.core.ConstantDataProvider({id: this.id + "_treeDataModel", name: "treeDataModel", value: null})
          , bcdPageAccess: bcdPageAccess
          , treeId: this.id
          , gotExport: "" + (typeof bcdui.component.exports != "undefined")
          }
        });
        bcdui.widget.createContextMenu({ targetRendererId: this.id, refreshMenuModel: true, tableMode: true, inputModel: this.contextMenu });
      }

      // add a row hover effect
      jQuery("#" + this.targetHtml).on("mouseenter", "tr", function (event) {jQuery(this).addClass("highlight");});
      jQuery("#" + this.targetHtml).on("mouseleave", "tr", function (event) {jQuery(this).removeClass("highlight");});

      // add export event handler
      jQuery("#" + this.targetHtml).on("treeActions:fullDataExport", function(evt){
        bcdui.component.exports.exportToExcelTemplate({ inputModel: bcdui.factory.objectRegistry.getObject(jQuery(evt.target).closest("table").attr("bcdNodeModelId")) });
      });

      // add click listeners for the expand/collapse buttons
      jQuery("#" + this.targetHtml).on("click", "i", function(event) {

        var table = jQuery(event.target).closest("table");
        var row = jQuery(event.target).closest("tr");
        var rowId = row.attr("bcdRowIdent");
        var tree = bcdui.factory.objectRegistry.getObject(table.attr("bcdTreeId"));
        var nodeModel = bcdui.factory.objectRegistry.getObject(table.attr("bcdNodeModelId"));
        var nodeId = table.attr("bcdNodeId");

        var rowValue = "";

        // when the tree is persistent, we need to store a kind of key information (wrs dimId values for the row)
        if (tree.persistent) {
          rowValue = table.closest(".bcdTreeRow").data("rowValue") || "";
          jQuery.makeArray(nodeModel.queryNodes("/*/wrs:Header/wrs:Columns/wrs:C[@dimId]")).forEach(function(e) {
            rowValue += ((rowValue == "" ? "" : bcdui.core.magicChar.separator) + nodeModel.read("/*/wrs:Data/wrs:R[@id='" + rowId + "']/wrs:C[position()='"+e.getAttribute("pos")+"']", ""));
          });
        }

        // expand or collapse?
        if (jQuery(event.target).hasClass("bcdExpand")) {

          // remember open node status in statusModel
          if (tree.persistent)
            tree.statusModel.write("/*/guiStatus:Tree[@id='" + tree.id + "']/guiStatus:Node[@id='"+nodeId+"' and .='{{=it[0]}}']", [rowValue], null, true);

          // change icon
          jQuery(event.target).removeClass("bcdExpand").addClass("bcdCollapse");

          // did we already load and render the data, if yes, simple show it again
          if (row.next(".bcdTreeRow").length > 0) {
            row.next(".bcdTreeRow").show();
          }
          else {
            // otherwise render (and load) next nodes
            var colspan = row.find("th,td").length;
            var subNodes = tree.enhancedConfiguration.queryNodes("//*[@bcdNodeId='"+nodeId+"']/tree:Node");
            for (var n = 0; n < subNodes.length; n++) {

              // insert a new row into parent tree for our sub elements
              row = jQuery("<tr class='bcdTreeRow'><th colspan='" + colspan + "'><div class='bcdTreeInner'></div></th></tr>").insertAfter(row);

              // remember current rowValue if we want to make the tree persistent
              if (tree.persistent)
                row.data("rowValue", rowValue);

              // and render it...
              tree._renderNextNode({ root: subNodes[n], targetHtml: jQuery(row).find("th > div").get(0), parentNodeModel: nodeModel, rowId: rowId });
            }
          }

          // show all tree rows for this node
          var nextRowShow = row.next("tr");
          while (nextRowShow.hasClass("bcdTreeRow")) {
            nextRowShow.show();
            nextRowShow = nextRowShow.next("tr");
          }
        }
        // collapse is a simple hide
        else {

          // remove open node status in statusModel        
          if (tree.persistent)
            tree.statusModel.remove("/*/guiStatus:Tree[@id='" + tree.id + "']/guiStatus:Node[@id='" + nodeId + "' and .='{{=it[0]}}']", [rowValue], true);

          // change icon
          jQuery(event.target).removeClass("bcdCollapse").addClass("bcdExpand");

          // hide all tree rows for this node
          var nextRowHide = row.next("tr");
          while (nextRowHide.hasClass("bcdTreeRow")) {
            nextRowHide.hide();
            nextRowHide = nextRowHide.next("tr");
          }
        }
      });

    }.bind(this));
    this.enhancedConfiguration.execute();
  }

  _render(doc, args)
    {
      // start the recursive rendering
      this._renderNextNode({targetHtml: this.targetHtml});
      return doc;
    }

  _renderNextNode(args)
    {
      var root = args.root || this.enhancedConfiguration.query("/*/tree:Root");
      var nodeId = root.getAttribute("bcdNodeId")

      var wrqNode = root.selectSingleNode("wrq:WrsRequest");
      if (wrqNode != null) {

        var remFilters = "";

        // construct node filters for current node by taking the node's filter translation into account
        var nodeFilters = {};
        if (args.parentNodeModel) {

          var addFilters = "";
          jQuery.makeArray(root.selectNodes("dm:TypeTranslations/dm:FT")).forEach(function(f) {
            if ((f.getAttribute("remove") || "") != "") {
              if (remFilters != "")
                remFilters += " ";
              remFilters += f.getAttribute("remove") || "";
            }
            else {
              if (addFilters != "")
                addFilters += " ";
              addFilters += f.getAttribute("from") || "";
              if (f.getAttribute("to") != null)
                addFilters += "|" + f.getAttribute("to");
            }
          });
          var row = args.parentNodeModel.query("/*/wrs:Data/wrs:R[@id='" + args.rowId + "']");
          if (addFilters != "" && row != null) {
            var bRefs = addFilters.trim().split(" ");
            bRefs.forEach(function(b) {
              var alias = b.split("|");
              var sourceBRef = alias[0];
              var targetBRef = alias.length > 1 ? alias[1] : alias[0];
              var column = args.parentNodeModel.read("/*/wrs:Header/wrs:Columns/wrs:C[@id='" + sourceBRef + "']/@pos", "");
              if (column != "") {
                var value = row.selectSingleNode("wrs:C[position()='" + column + "']").text;
                nodeFilters[targetBRef] = bcdui.util.escapeHtml(value);
              }
            });
          }
        }

        // and add inherited filters
        var inheritFilters = jQuery(args.targetHtml).closest(".bcdTree").closest(".bcdTreeRow").data("nodeFilters")

        if (inheritFilters) {

          // kill requested remove filters from FT
          var bRefs = remFilters.trim().split(" ");
          bRefs.forEach(function(b) {
            delete inheritFilters[b];
          });

          nodeFilters = Object.assign(nodeFilters, inheritFilters);
        }

        // store node filters (current and inherited ones)
        jQuery(args.targetHtml).closest(".bcdTreeRow").data("nodeFilters", nodeFilters);

        // take over node's wrq
        var nodeModel = new bcdui.core.SimpleModel({
          url: new bcdui.core.RequestDocumentDataProvider({
            requestModel: new bcdui.core.ModelWrapper({
              inputModel: new bcdui.core.StaticModel({data: new XMLSerializer().serializeToString(wrqNode)})
            , chain: this._addRequestFilters
            , parameters: {statusModel: this.statusModel, targetHtml: args.targetHtml}
            })
          })
        });
        bcdui.factory.objectRegistry.registerObject(nodeModel);
        
        // render data using default htmlBuilder (enhanceHtml just for calling bcdOnLoad to add the buttons)
        var targetElement = (typeof args.targetHtml == "string" ? jQuery("#" + args.targetHtml) : jQuery(args.targetHtml)).get(0);
        
        var params = {
          /* htmlBuilder specific */
            sortRows:false
          , sortColumns:false
          , makeRowSpan: false
          , makeColSpan: false
        };

        var renderer = new bcdui.core.Renderer({
            targetHtml: targetElement
          , inputModel: nodeModel
          , chain: root.getAttribute("rendererChain") || bcdui.contextPath + "/bcdui/xslt/renderer/htmlBuilder.xslt"
          , postHtmlAttachProcess: function(treeId, nodeModelId, nodeId, jsFunct, element, pId) {

              var table = jQuery(element).find(".bcdReport").addBack(".bcdReport");
              
              // add tree class
              table.addClass("bcdTree");

              // add nodeModelId and nodeId to element so we can reuse it in the click handler
              table.attr("bcdNodeModelId", nodeModelId);
              table.attr("bcdNodeId", nodeId);
              table.attr("bcdTreeId", treeId);
  
              // add buttons if the current node got a subnode
              var tree = bcdui.factory.objectRegistry.getObject(treeId);
              var gotSubNodes = tree.enhancedConfiguration.query("//*[@bcdNodeId='"+nodeId+"']/tree:Node") != null;
              if (gotSubNodes) {
                table.find("tbody > tr").each(function(i, e) {
                  jQuery(e).find("th").first().prepend("<i class='bcdExpand'></i>");
                });
              }
              if (jsFunct)
                bcdui.util._stringToJsFunction(jsFunct, null, [element]);

            }.bind(this, this.id, nodeModel.id, nodeId, root.getAttribute("postHtmlAttachProcess"))
          , parameters: jQuery.extend(params, this.rendererParams)
        });

        // if the renderer is done, we check if one or more of the tree rows should be opened
        if (this.persistent) {

          renderer.onceReady(function(nodeId, nodeModel, targetHtml) {

            // get stored values
            var oNodes = this.statusModel.queryNodes("/*/guiStatus:Tree[@id='"+this.id+"']/guiStatus:Node[@id='"+nodeId+"']");
            var openNodes = jQuery.makeArray(oNodes).map(function(e) { return e.text; });
            if (openNodes.length > 0) {

              // for key building, we also need the upper node values (as prefix)
              var upperRowValue = jQuery(targetHtml).closest(".bcdTreeRow").data("rowValue") || "";

              // we got open nodes for this node, so run through all rows and check which one to open
              // by rebuilding the 'key' and comparing it to the ones in this node
              // get stored upper value
              var rows = nodeModel.queryNodes("/*/wrs:Data/wrs:R");
              for (var r = 0; r < rows.length; r++) {
                var rowValue = upperRowValue;
                jQuery.makeArray(nodeModel.queryNodes("/*/wrs:Header/wrs:Columns/wrs:C[@dimId]")).forEach(function(e) {
                  var cValue = rows[r].selectSingleNode("wrs:C[position()='"+e.getAttribute("pos")+"']");
                  cValue = cValue == null ? "" : cValue.text;
                  rowValue += ((rowValue == "" ? "" : bcdui.core.magicChar.separator) + cValue);
                });
                // row should be open, so we open it by 'clicking' on it
                var index = openNodes.indexOf(rowValue);
                if (index != -1) {
                  var anchor = jQuery(typeof targetHtml == "string" ? "#" + targetHtml : targetHtml).find(".bcdTree tbody tr[bcdrowident='"+rows[r].getAttribute("id")+"'] th i");
                  // mark status node as valid
                  oNodes[index].setAttribute("found", "true");
                  jQuery(anchor).click();
                }
              }
            }

            // remove all non valid nodes
            var rem = bcdui.core.removeXPath(this.statusModel.getData(), "/*/guiStatus:Tree[@id='"+this.id+"']/guiStatus:Node[@id='"+nodeId+"' and not(@found)]", false);
            jQuery.makeArray(oNodes).forEach(function(e) {
              e.removeAttribute("found");
            });
            if (rem > 0)
              this.statusModel.fire();

          }.bind(this, nodeId, nodeModel, args.targetHtml));
        }
      }
    }

  /**
   * node model wrapper chain function create or append f:Filter node in wrq request by
   * taking all filters from statusModel and the stored node filters
   * @private
   */
  _addRequestFilters(doc, args)
    {
      // create f:Filter if not present
      var filterNode = doc.selectSingleNode("/*/wrq:Select/f:Filter");
      filterNode = (filterNode == null) ? bcdui.core.createElementWithPrototype(doc, "/*/wrq:Select/f:Filter") : filterNode;

      // take over statusModel filters
      jQuery.makeArray(args.statusModel.selectNodes("/*/f:Filter/*")).forEach(function(e) {
        filterNode.appendChild(e.cloneNode(true));
      });

      // add node filters
      if (args.targetHtml) {
        var nodeFilters = jQuery(args.targetHtml).closest(".bcdTreeRow").data("nodeFilters");
        for (var e in nodeFilters) {
          bcdui.core.createElementWithPrototype(filterNode, "f:Expression[@bRef='" + e + "' and @op='=']/@value").text = nodeFilters[e];
        }
      }
      return doc;
    }
    
    getClassName() {return "bcdui.component.tree.Tree";}
}

/************************
 * Glue-ware for declarative environments, not to be used directly
 */
bcdui.component = Object.assign(bcdui.component,
/** @lends bcdui.component */
{
  /**
   * Helper for jsp and XAPI and custom HTMLElements. First waits for all dependencies to be available
   * @param {targetHtmlRef}           args.targetHtml                                        - A reference to the HTML DOM Element where to put the output
   * @param {bcdui.core.DataProvider} [args.config=./treeConfiguration.xml]                  - The model containing the tree configuration data. If it is not present a SimpleModel with the url  './treeConfiguration.xml' is created.
   * @param {bcdui.core.DataProvider} [args.statusModel=bcdui.wkModels.guiStatus]            - StatusModel (default is 'guiStatusEstablished'), containing the filters as /SomeRoot/f:Filter
   * @param {string}                  [args.id]                                              - The object's id, needed only when later accessing via id.
   * @param {boolean}                 [args.persistent=true]                                 - Tree expand/collapse status is stored
   * @param {(boolean|string)}        [args.contextMenu=false]                               - If true, tree's default context menu is used, otherwise provide the url to your context menu xslt here.
   * @private
   */
  createTree: function( args )
  {
    args.id = args.id ? args.id : bcdui.factory.objectRegistry.generateTemporaryIdInScope("tree");
    bcdui.factory.objectRegistry.withObjects( [args.config, args.statusModel], function() {
      new bcdui.component.tree.Tree( {
        targetHtml:           bcdui.util._getTargetHtml(args, "grid_"),
        config:               bcdui.factory.objectRegistry.getObject(args.config),
        statusModel:          bcdui.factory.objectRegistry.getObject(args.statusModel),
        id:                   args.id,
        contextMenu:          args.contextMenu,
        persistent:           args.persistent
      });
    });
    return { refId: args.id, symbolicLink: true };
  }
});

