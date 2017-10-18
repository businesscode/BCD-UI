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
 * Universal Filter Widget Implementation as jQuery Widget
 */
(function(){

  var htmlEvents = {
    /**
     * this event is triggered everytime the widget is ready rendering html content
     *
     * @private
     */
    contentRendered : "bcdui.bcduiUniversalFilterNg.events.contentRendered"
  };

  jQuery.widget("bcdui.bcduiUniversalFilterNg", jQuery.bcdui.bcduiWidget, {

    _getCreateOptions : function(){
      return bcdui.widgetNg.impl.readParams.universalFilter(this.element[0]);
    },

    _validateOptions : function(){
      bcdui.widgetNg.impl.validateParams.universalFilter(this.options);
    },

    /**
     * attribute to identify nodes
     * @private
     */
    NODE_ID_ATTR : "bcd-uni-filter-node-id",

    /**
     * mapping between junction and its f:Filter element
     *
     * @private
     */
    MAPPING_JUNCT_FILTER : {
      "AND" : "<f:And/>",
      "OR"  : "<f:Or/>"
    },

    /**
     * @private
     */
    htmlEvents : htmlEvents,

    /**
     * the default options
     */
    options : {
      defaultJunction : "AND",
      defaultOp       : "=",
      cssClassPrefix  : "bcd-unifilter-"
    },

    /**
     * The UI is renderered via a renderer, which is attached to changes on the targetModelXPath
     */
    _create : function(){
      this._super();
      this.element.addClass( this.options.cssClassPrefix + "widget" );

      var targetSelector = this._getTargetSelector();

      // re-identify nodes in target everytime it changes
      targetSelector.onChange(function(){
        this._identifyNode(targetSelector.getDataProvider().getData(), targetSelector.xPath);
      }.bind(this), targetSelector.xPath);

      // create a descrete data provider
      this.targetDataProvider = new bcdui.core.DataProviderWithXPathNodes({
        xPath : this.options.targetModelXPath
      });

      // attach main renderer
      var renderer = new bcdui.core.Renderer({
        targetHtml  : this.element,
        chain       : this.options.renderingChain || bcdui.config.libPath + "js/widgetNg/universalFilter/rendering.xslt", // internal API
        inputModel  : this.targetDataProvider,
        parameters  : jQuery.extend(true, {
          nodeIdAttribute : this.NODE_ID_ATTR,
          cssClassPrefix  : this.options.cssClassPrefix,
          bRefModel       : new bcdui.core.OptionsDataProvider({
            optionsModelXPath               : this.options.bRefOptionsModelXPath,
            optionsModelRelativeValueXPath  : this.options.bRefOptionsModelRelativeValueXPath
          })
        }, this.options.renderingChainParameters) // internal API
      });
      renderer.onReady(function(){
        // trigger translation after rendering
        bcdui.i18n.syncTranslateHTMLElement({elementOrId:this.element.get(0)});

        // trigger dom event
        this.element.trigger(this.htmlEvents.contentRendered);
      }.bind(this));

      // one time init
      renderer.onceReady(function(){
        // rendering update if target changes
        targetSelector.onChange(function(){
          this.createUiElement && this.createUiElement.detach();  // recycle
          renderer.execute();
        }.bind(this), targetSelector.xPath);
      }.bind(this));
      
      // attach context menu
      this.element.attr("contextId", "default"); // set context for context-menu 
      bcdui.widget.createContextMenu({
        targetHtmlElement : this.element,
        tableMode : false,
        refreshMenuModel : true,
        inputModel : new bcdui.core.SimpleModel({ url: bcdui.config.libPath + "js/widgetNg/universalFilter/contextMenu.xml"})
      });
      
      // attach and delegate events from the context menu
      this.element
      .on("bcdui:universalFilter:delete", function(event){
        this._deleteElement( jQuery(event.target).closest("[data-node-id]").data("node-id") );
      }.bind(this))
      .on("bcdui:universalFilter:combine", function(event){
        var target = jQuery(event.target);
        var anchorElement = target.closest("[data-node-id]");
        if(!anchorElement.length){
          // relocate to itself in case no closest data node reference found
          anchorElement = target;
        }
        this._combineElement( anchorElement.data("node-id"), anchorElement );
      }.bind(this));

      // init UI for creation of new filters
      this._initCreateUi();
    },

    /**
     * creates internal status model and renderer + container for craetion of new elements,
     * we will reuse them. We expose Event API on this.createUiElement to issue rendering:
     * event: bcdui:universalFilter:renderCreateUi
     * @private
     */
    _initCreateUi : function(){
      // create and hide initially because our input has to be attached to dom prior creating renderer
      var uiElement = this.createUiElement = jQuery("<div class='" + this.options.cssClassPrefix + "creator-container'></div>").hide();
      this.createUiElement.appendTo(document.body); // has to be attached to DOM when calling Renderer

      var statusModel = this.statusModel = new bcdui.core.StaticModel({
        id    : bcdui.factory.objectRegistry.generateTemporaryIdInScope("bcdui_universalFilter_statusModel"), // for widgets
        data  : "<Root/>"
      });

      // widgets get their references from here
      var widgetReferenceModel = new bcdui.core.SimpleModel({
        id  : bcdui.factory.objectRegistry.generateTemporaryId(), // for widgets
        url : bcdui.config.libPath + "js/widgetNg/universalFilter/widgetReferenceData.xml"
      });

      // base xpath to status
      var baseTargetModelXPath = "$" + this.statusModel.id + "/*";
      var baseOptionsModelXPath = "$" + widgetReferenceModel.id + "/*";
      // must be flat hierarchy to be compatbile with Renderer parameters
      var createUiConfig = {
          xPath_reference_junction  : baseOptionsModelXPath + "/Junction/Item",
          xPath_reference_op        : baseOptionsModelXPath + "/Op/Item",

          xPath_junction            : baseTargetModelXPath + "/Junction",
          xPath_bref                : baseTargetModelXPath + "/bRef",
          xPath_op                  : baseTargetModelXPath + "/Op",
          xPath_value               : baseTargetModelXPath + "/Value"
      };

      /*
       * internal API:
       * this.options.inputRow.renderingChain
       * this.options.inputRow.renderingChainParameters
       */
      if(!this.options.inputRow){
        this.options.inputRow = {}
      }
      var createUiRenderer = new bcdui.core.Renderer({
        targetHtml  : this.createUiElement,
        chain       : this.options.inputRow.renderingChain || bcdui.config.libPath + "js/widgetNg/universalFilter/inputRendering.dott",
        inputModel  : this.statusModel,
        parameters  : jQuery.extend({}, createUiConfig, {
          widgetReferenceModel  : widgetReferenceModel, // put into depedency chain
          cssClassPrefix        : this.options.cssClassPrefix,
          bRefOptionsModelXPath : this.options.bRefOptionsModelXPath,
          bRefOptionsModelRelativeValueXPath : this.options.bRefOptionsModelRelativeValueXPath || ""
        }, this.options.inputRow.renderingChainParameters),
        suppressInitialRendering : true // just create, render initially
      });

      var cssClassPrefix = this.options.cssClassPrefix;
      this.createUiElement
      /*
       * expose API for rendering/displaying event
       *
       * args.anchorElement     : to pin the entry form to
       * args.targetNodeId      : optional node id of element to combine with
       * args.proposedJunction  : must be provided in case targetNodeId is set; AND, OR
       */
      .on("bcdui:universalFilter:renderCreateUi", function(event, args){
        args.anchorElement.after(uiElement);
        // cleanup and preset internal status model; clear all but preset Junction and Op
        {
          statusModel.remove("/*/*");
          args.targetNodeId && statusModel.write("/*/ReferenceNodeId", args.targetNodeId);
          args.proposedJunction && statusModel.write("/*/Junction", args.proposedJunction);
          args.op && statusModel.write("/*/Op", args.op);
          statusModel.fire();
        }

        var revealUi = function(isVisible, uiElement){
          // visual effect: either show or hide junction depending on if we have a node id to combine with
          if(isVisible){
            uiElement.find("." + cssClassPrefix + "conj-container").show();
          } else {
            uiElement.find("." + cssClassPrefix + "conj-container").hide();
          }
          // finally make the ui visible
          uiElement.show();
        }.bind(null, !!args.targetNodeId, uiElement);
        createUiRenderer.onReady(revealUi);
        createUiRenderer.execute();
      })
      // trigger by create-ui
      .on("bcdui:universalFilter:closeCreateUi", function(event){
        uiElement.empty().hide();
      })
      // triggered by create-ui
      .on("bcdui:universalFilter:add", function(event){
        // args for _addExpression()
        var args = {
            targetNodeId    : statusModel.read("/*/ReferenceNodeId"),
            junction  : statusModel.read("/*/Junction","").toUpperCase(),
            bRef      : statusModel.read("/*/bRef","").replace(/</g,"&lt;"),
            op        : statusModel.read("/*/Op",""),
            value     : statusModel.read("/*/Value","")
        };
        if(!args.bRef || !args.op){
          // do nothing if missing input
          return;
        }
        // hide ui
        uiElement.detach();
        // add expression
        this._addExpression(args);
      }.bind(this))
      ;
    },

    /**
     * add exression or combine existing into our target model
     *
     * @param {object}  args
     * @param {string}  [args.targetNodeId] - Reference element to add expression to (or combine with), if not provided will simply append new expression to targetXPath element
     * @param {string}  [args.junction] - [AND, OR] Optional junction to apply with reference element 
     * @param {string}  [args.bRef] - bRef
     * @param {string}  [args.op] - Operator
     * @param {string}  [args.value] - Value
     *
     * @private
     */
    _addExpression : function(args){
      var targetSelector = this._getTargetSelector();
      var refFilterNode = targetSelector.valueNode();

      // may be null so create that
      if(!refFilterNode){
        refFilterNode = targetSelector.getDataProvider().write(targetSelector.xPath, "", true);
      }

      // if we have a reference to node (to combine), use it
      if(args.targetNodeId){
        refFilterNode = targetSelector.valueNode().selectSingleNode(".//*[@" + this.NODE_ID_ATTR + "='" + args.targetNodeId + "']");
        if(!refFilterNode){
          throw "No reference found.";
        }
      }

      // either our reference is f:Expression or a f:Junction
      var requestedJunction = args.junction || this.options.defaultJunction;
      var newExpressionNode = (function(){
        var node = bcdui.core.browserCompatibility.createDOMFromXmlString(
            doT
            .compile("<R><f:Expression bRef='{{=it.bRef}}'/></R>")
            (args)
        ).selectSingleNode("/*/*");
        node.setAttribute("value", args.value);
        node.setAttribute("op", args.op);
        return node;
      })();
      var nextFilterNode = refFilterNode.selectSingleNode("following-sibling::f:*");
      // need reference parent, either we have one (non-document node and beyond of targetModelXPath) or we chose self
      var refFilterParent = refFilterNode.parentNode.nodeName && jQuery.contains(targetSelector.valueNode(),refFilterNode) ? refFilterNode.parentNode : refFilterNode;

      // either parent junction = requested, then just add new expression
      if(args.targetNodeId && (refFilterParent.baseName||refFilterParent.localName).toUpperCase() == requestedJunction){
        refFilterParent.insertBefore(newExpressionNode, nextFilterNode);
      }else{
        if(!args.targetNodeId){
          refFilterNode.appendChild(newExpressionNode);
        } else {
          // create junction and move target element and append the new one
          var newJunctNode = bcdui.core.browserCompatibility.createDOMFromXmlString("<R>" + this.MAPPING_JUNCT_FILTER[requestedJunction] + "</R>").selectSingleNode("/*/*");
          newJunctNode = refFilterParent.insertBefore(newJunctNode, nextFilterNode);
          // move only if not root element
          refFilterNode.parentNode.nodeName && newJunctNode.appendChild(refFilterNode);
          // and the new one
          newJunctNode.appendChild(newExpressionNode);
        }
      }
      targetSelector.getDataProvider().fire();
    },

    /**
     * delete an element from target via nodeId lookup
     *
     * @private
     */
    _deleteElement : function(nodeId){
      var selector = this._getTargetSelector();
      var dataProvider = selector.getDataProvider();
      var xPath = selector.xPath;

      // remove node
      bcdui.core.removeXPath(dataProvider.getData(), xPath + "//*[@" + this.NODE_ID_ATTR + "='" + nodeId + "']", false);
      // remove empty junctions
      bcdui.core.removeXPath(dataProvider.getData(), xPath + "//f:*[ not(self::f:Expression) and not(.//f:Expression) ]", false);

      dataProvider.fire();
    },

    /**
     * delete elements by bRef reference
     * @param {array} bRefs Array of bRef (string) of items to remove
     *
     * @private
     */
    _deleteElementsByRef : function(bRefs){
      var selector = this._getTargetSelector();
      var dataProvider = selector.getDataProvider();
      var xPath = selector.xPath;

      // remove nodes (use pipe as separator, since its not allowed as bRef)
      bcdui.core.removeXPath(dataProvider.getData(), xPath + "/.//f:Expression[contains('|"+ bRefs.join("|") +"|', @bRef)]", false, false);
      // remove empty junctions
      bcdui.core.removeXPath(dataProvider.getData(), xPath + "/.//f:*[ not(self::f:Expression) and not(.//f:Expression) ]", false, false);

      dataProvider.fire();
    },

    /**
     * opens up an UI to configure new filter and combines it with given filter at nodeId
     *
     * @private
     */
    _combineElement : function(targetNodeId, anchorElement){
      var targetSelector = this._getTargetSelector();
      // we suggest a parent junction (in case we have one): And, Or
      var proposedJunctionElement = targetNodeId == null ? null : targetSelector.selectSingleNode(targetSelector.xPath + "/.//*[@" + this.NODE_ID_ATTR + "='" + targetNodeId + "']/parent::f:*[ self::f:And or self::f:Or ]");
      // render ui
      this.createUiElement.trigger("bcdui:universalFilter:renderCreateUi",{
        anchorElement     : anchorElement,
        proposedJunction  : (!!proposedJunctionElement ? (proposedJunctionElement.baseName||proposedJunctionElement.localName).toUpperCase() : "") || this.options.defaultJunction,
        targetNodeId      : targetNodeId,
        op                : this.options.defaultOp
      });
    },

    /**
     * uniquelly identifies nodes writing beyond targetXPath NODE_ID_ATTR on them
     * @private
     */
    _identifyNode : function(targetDoc, targetXPath){
      var cnt=0;
      jQuery.makeArray(
          targetDoc.selectNodes(targetXPath + "//f:*")
      ).forEach(function(node){
        node.setAttribute(this.NODE_ID_ATTR, ++cnt);
      }.bind(this));
      return targetDoc;
    }
  });

  // expose to Widget namespace
  jQuery.bcdui.bcduiUniversalFilterNg.htmlEvents = htmlEvents;
}());

/**
 * A namespace for the BCD-UI widget. For creation @see {@link bcdui.widgetNg.createUniversalFilter}
 * @namespace bcdui.widgetNg.universalFilter
 */
bcdui.util.namespace("bcdui.widgetNg.universalFilter",
/** @lends bcdui.widgetNg.button */
{
  /**
   * @param htmlElement
   * @private
   */
  init: function(htmlElement){
    jQuery(htmlElement).bcduiUniversalFilterNg();
  }
});
