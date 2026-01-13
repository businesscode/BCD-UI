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
(function($){

  var htmlEvents = {
    /**
     * this event is triggered everytime the widget is ready rendering html content
     *
     * @private
     */
    contentRendered : "bcdui.bcduiUniversalFilterNg.events.contentRendered"
  };

  /**
   * pre-create elements
   * this is done outside of the jQuery widget since it seems that for IE11, such properties
   * are transformed from a node to a js object by jQuery. cloneNode (later on) would fail on a pure object
   */
  var TEMPLATE_ELEMENTS = {
    "f:And"         : (()=>bcdui.util.xml.parseDocument("<D><f:And/></D>").selectSingleNode("/*/*"))(),
    "f:Or"          : (()=>bcdui.util.xml.parseDocument("<D><f:Or/></D>").selectSingleNode("/*/*"))(),
    "f:Expression"  : (()=>bcdui.util.xml.parseDocument("<D><f:Expression/></D>").selectSingleNode("/*/*"))()
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

      this.instanceId = bcdui.factory.objectRegistry.generateTemporaryIdInScope("universalFilter");

      var targetSelector = this._getTargetSelector();

      // re-identify nodes in target everytime it changes
      targetSelector.onChange(function(){
        this._identifyNode(targetSelector.getDataProvider().getData(), targetSelector.xPath);
      }.bind(this), targetSelector.xPath);

      // create a descrete data provider
      this.targetDataProvider = new bcdui.core.DataProviderWithXPathNodes({
        xPath : this.options.targetModelXPath
      });

      const dph = new bcdui.core.DataProviderHolder();

      var cfg = bcdui.factory._extractXPathAndModelId(this.options.bRefOptionsModelXPath);
      cfg.optionsModelId = cfg.modelId;
      cfg.optionsModelXPath = cfg.xPath;
      cfg.element = this.element.get(0);
      cfg.optionsModelRelativeValueXPath = this.options.bRefOptionsModelRelativeValueXPath;
      var models = bcdui.widget._extractModelsFromModelXPath(this.options.bRefOptionsModelXPath);
      if (models) {
        const wrapperId = bcdui.widget._createWrapperModel(models, cfg, "widget/multiOptionsModelWrapper.xslt");
        this.options.bRefOptionsModelXPath = "$" + cfg.optionsModelId + cfg.optionsModelXPath;
        this.options.bRefOptionsModelRelativeValueXPath = cfg.optionsModelRelativeValueXPath;
        bcdui.factory.objectRegistry.withReadyObjects([wrapperId], function() {
          dph.setSource(new bcdui.core.StaticModel("<Empty/>"));
        });
      }
      else
        dph.setSource(new bcdui.core.StaticModel("<Empty/>"));

      bcdui.factory.objectRegistry.withReadyObjects([dph], function() {
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
        
        var _getAnchorElement = function(targetElement){ // helper for getting an anchor element for UI, usually it is the element rendering f:Expression
          var anchorElement = targetElement.closest("[data-node-id]");
          if(!anchorElement.length){
            // relocate to itself in case no closest data node reference found
            anchorElement = targetElement;
          }
          return anchorElement;
        };
        // attach and delegate events from the context menu
        this.element
        .on("bcdui:universalFilter:edit", function(event){
          var anchorElement = _getAnchorElement(jQuery(event.target));
          this._editElement( anchorElement.data("node-id"), anchorElement );
        }.bind(this))
        .on("bcdui:universalFilter:delete", function(event){
          this._deleteElement( jQuery(event.target).closest("[data-node-id]").data("node-id") );
        }.bind(this))
        .on("bcdui:universalFilter:combine", function(event){
          var anchorElement = _getAnchorElement(jQuery(event.target));
          this._combineElement( anchorElement.data("node-id"), anchorElement );
        }.bind(this));
  
        // init UI for creation of new filters
        this._initCreateUi();

      }.bind(this));

    },

    /**
     * creates internal status model and renderer + container for creation of new elements,
     * we will reuse them. We expose Event API on this.createUiElement to issue rendering:
     * event: bcdui:universalFilter:renderCreateUi
     * @private
     */
    _initCreateUi : function(){
      var self = this;
      // create and hide initially because our input has to be attached to dom prior creating renderer
      var uiElement = this.createUiElement = jQuery("<div class='" + this.options.cssClassPrefix + "creator-container'></div>").hide();
      this.createUiElement.appendTo(document.body); // has to be attached to DOM when calling Renderer

      var statusModel = this.statusModel = new bcdui.core.StaticModel({
        id    : bcdui.factory.objectRegistry.generateTemporaryIdInScope("bcdui_universalFilter_statusModel"), // for widgets
        data  : "<Status/>"
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
          xPath_value               : baseTargetModelXPath + "/Value",
          xPath_values              : baseTargetModelXPath + "/Values/Item" // for multi-input values
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
        chain       : this.options.inputRow.renderingChain || bcdui.config.libPath + "js/widgetNg/universalFilter/inputRendering.jstlit",
        inputModel  : this.statusModel,
        parameters  : jQuery.extend({}, createUiConfig, {
          widgetReferenceModel  : widgetReferenceModel, // put into depedency chain
          cssClassPrefix        : this.options.cssClassPrefix,
          bRefOptionsModelXPath : this.options.bRefOptionsModelXPath,
          bRefOptionsModelRelativeValueXPath : this.options.bRefOptionsModelRelativeValueXPath || "",
          instanceId            : this.instanceId
        }, this.options.inputRow.renderingChainParameters),
        suppressInitialRendering : true // just create, render initially
      });

      {
        // re-render operator portion everytime operator or bRef changes
        statusModel.onChange(()=>{
          if(uiElement.is(":visible")){
            createUiRenderer.execute({
              partialHtmlTargets : `${this.instanceId}_operator_container`
            });
          }
        }, "/*/Op|/*/bRef");
      }

      var cssClassPrefix = this.options.cssClassPrefix;
      this.createUiElement
      /*
       * expose API for rendering/displaying event for new/update
       *
       * args.anchorElement     : to pin the entry form to
       * args.targetNodeId      : optional node id of element to combine with, mandatory when updating
       * args.proposedJunction  : must be provided in case targetNodeId is set and NOT updating; [AND, OR]
       * args.op                : operator
       * args.value             : value
       * args.bRef              : bref
       * args.isUpdating        : if in editing mode
       */
      .on("bcdui:universalFilter:renderCreateUi", function(event, args){
        args.anchorElement.after(uiElement.empty());
        args.isUpdating = !!args.isUpdating;
        // cleanup and preset internal status model;
        {
          statusModel.remove("/*/*");
          statusModel.write("/*/isUpdating", args.isUpdating);
          args.targetNodeId     && statusModel.write("/*/ReferenceNodeId", args.targetNodeId);
          args.proposedJunction && statusModel.write("/*/Junction", args.proposedJunction);
          args.op               && statusModel.write("/*/Op", args.op);
          args.value            && statusModel.write("/*/Value", args.value);
          args.bRef             && statusModel.write("/*/bRef", args.bRef);
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
        createUiRenderer.execute();
        createUiRenderer.onReady(function() {
          jQuery(self.createUiElement).off("click");
          jQuery(self.createUiElement).on("click", ".bcdAction", function(event) {
            const el = jQuery(event.target).hasClass("bcdAction") ? jQuery(event.target) : jQuery(event.target).closest(".bcdAction");
            if (el.hasClass("add"))
              el.trigger('bcdui:universalFilter:add')
            if (el.hasClass("close"))
              el.trigger('bcdui:universalFilter:closeCreateUi');
          });
          revealUi();
        });
      })
      // trigger by create-ui
      .on("bcdui:universalFilter:closeCreateUi", function(event){
        uiElement.empty().hide();
      })
      // triggered by create-ui
      .on("bcdui:universalFilter:add", function(event){
        // args for _addExpression(), _updateExpression()
        var args = {
            targetNodeId    : statusModel.read("/*/ReferenceNodeId"),
            junction  : statusModel.read("/*/Junction","").toUpperCase(),
            bRef      : statusModel.read("/*/bRef","").replace(/</g,"&lt;"),
            op        : statusModel.read("/*/Op","")
        };

        // value is either single value or multi
        {
          const values = statusModel.queryNodes("/*/Values/*");
          if(values.length){
            args.value = $.makeArray(values).map((e)=>e.text);
          } else {
            args.value = [statusModel.read("/*/Value","")];
          }
        }

        if(!args.bRef || !args.op){
          // do nothing if missing input
          return;
        }
        // hide ui
        uiElement.trigger("bcdui:universalFilter:closeCreateUi");
        // add or update expression
        if(statusModel.read("/*/isUpdating","") == "true"){
          self._updateExpression(args);
        }else{
          self._addExpression(args);
        }
      }.bind(this))
      // triggered when rendering IN operator
      .on("bcdui:universalFilter:createMultiValueInput", function(event){
        if (self.statusModel.query("/Status/Op[.='in']") != null)
          self.createMultiValueInput(event.target);
        else {
          const targetModelXPath = event.target.getAttribute("targetModelXPath") || "";
          if (targetModelXPath != "")
            bcdui.widgetNg.createInput({targetModelXPath: targetModelXPath, targetHtml: event.target});
        }
      })
      .on("bcdui:universalFilter:createJunction", function(event){
        if (self.statusModel.query("/Status/isUpdating[.='true']") == null) {
          const targetModelXPath = event.target.getAttribute("targetModelXPath") || "";
          const optionsModelXPath = event.target.getAttribute("optionsModelXPath") || "";
          const optionsModelRelativeValueXPath = event.target.getAttribute("optionsModelRelativeValueXPath") || "";
          if (targetModelXPath != "" && optionsModelXPath != "" && optionsModelRelativeValueXPath != "")
            bcdui.widgetNg.createSingleSelect({optionsModelRelativeValueXPath: optionsModelRelativeValueXPath, optionsModelXPath: optionsModelXPath, targetModelXPath: targetModelXPath, targetHtml: event.target});
        }
      })
      ;
    },

    /**
     * creates a multi-input widget within targetElement,
     * currently does not rebuild from status
     */
    createMultiValueInput : function(targetElement){
      var widgetElement = jQuery(targetElement); // this is a proxy-widget element

      targetElement = jQuery(`<div class="${this.options.cssClassPrefix}multi-input-container"></div>`).appendTo(jQuery(targetElement).empty());
      var self = this;

      var context = {
        cnt : 0, // input counter
        targetModelXPathBase : targetElement.closest("[targetModelXPath]").attr("targetModelXPath"), // take from view
        nextTargetModelXPath : function(){
          return context.targetModelXPathBase + "[@cnt='" + (++context.cnt) + "']";
        }
      };

      var inputItemTemplateArgs = {
        targetModelXPath : context.nextTargetModelXPath()
        , apiAttrs : ""
      };

      {// collect other api-attrs
        const apiAttrs = ["validationFunction", "asyncValidationFunction", "class", "placeholder"]
        .filter((attrName) => !!widgetElement.attr(attrName))
        .map((attrName) => `${attrName}="${widgetElement.attr(attrName)}"`)
        .join(" ");

        if(apiAttrs){
          inputItemTemplateArgs.apiAttrs = apiAttrs;
        }
      }

      const inputItemTemplate = `<div class='${this.options.cssClassPrefix}multi-input-item'><bcd-inputng targetModelXPath="${inputItemTemplateArgs.targetModelXPath}" ${inputItemTemplateArgs.apiAttrs}></bcd-inputng><bcd-buttonng class='action-add' caption='+'></bcd-buttonng><bcd-buttonng class='action-remove' caption='-'></bcd-buttonng></div>`;
      targetElement
      .html(inputItemTemplate)
      .on("click", ".action-add", function(){
        const inputItemTemplateNext = `<div class='${self.options.cssClassPrefix}multi-input-item'><bcd-inputng targetModelXPath="${context.nextTargetModelXPath()}" ${inputItemTemplateArgs.apiAttrs}></bcd-inputng><bcd-buttonng class='action-add' caption='+'></bcd-buttonng><bcd-buttonng class='action-remove' caption='-'></bcd-buttonng></div>`;
        targetElement.append(jQuery(inputItemTemplateNext));
      })
      .on("click", ".action-remove", function(){
        const inputRow = jQuery(this).closest("div");
        const targetXPath = inputRow.find("[targetModelXPath]").attr("targetModelXPath").substr(self.statusModel.id.length + 1); // $modelId..
        // remove input
        inputRow.remove();
        // remove value from status model
        self.statusModel.remove(targetXPath, true);
      })
      ;
    },

    /**
     * updates f:Expression
     *
     * @param {object}  args arguments
     * @param {string}  args.targetNodeId Reference element to add expression to (or combine with), if not provided will simply append new expression to targetXPath element
     * @param {string}  [args.bRef] the new bRef 
     * @param {string}  [args.op] the new Operator
     * @param {string}  [args.value] the new Value
     *
     * @private
     */
    _updateExpression : function(args){
      if(!Array.isArray(args.value))throw ".value is not an array";
      var targetNode = this._getTargetNode(args.targetNodeId);

      // single update, or we replace by new entirely new expression
      if((args.op == "in" || args.op == "notIn") && args.value.length>1){
        // replace target
        targetNode.parentNode.replaceChild(this._createExpressionNode(args), targetNode);
      }else{
        // update bRef, op, value
        targetNode.setAttribute("bRef", args.bRef);
        targetNode.setAttribute("op", args.op);
        targetNode.setAttribute("value", args.value[0]);
      }

      this._getTargetSelector().getDataProvider().fire();
    },

    /**
     * create an expression node, usually f:Expression but not necessarily, as it supports multi-values, as such
     * depending on 'op' and number of values it also may return a predicate like f:Or for 'in' operator
     *
     * @param {object} args arguments
     * @param {string} args.bRef
     * @param {string} args.op
     * @param {string[]} args.value
     */
    _createExpressionNode : function(args){
      if(!Array.isArray(args.value)) throw ".value is not an array";
      if(!args.bRef) throw ".bRef missing";
      if(!args.op) throw ".op missing";
      var self = this;

      var fillExpressionNode = function(node, bRef, op, value){ // helper
        node.setAttribute("value", value); node.setAttribute("bRef", bRef); node.setAttribute("op", op); return node;
      };

      if(args.value.length > 1){ // multi-value
        if(args.op == "in" || args.op == "notIn"){
          // create f:Or/*f:And with f:Expresion/op = '=' for each value
          const fOrAnd = args.op == "in" ? TEMPLATE_ELEMENTS["f:Or"].cloneNode(false) : TEMPLATE_ELEMENTS["f:And"].cloneNode(false);
          const cmp = args.op == "in" ? "=" : "!=";
          args.value.forEach((v)=>{
            fOrAnd.appendChild(fOrAnd.ownerDocument.importNode( fillExpressionNode( TEMPLATE_ELEMENTS["f:Expression"].cloneNode(false), args.bRef, cmp, v ), false ));
          });
          return fOrAnd;
        } else {
          throw `Multi-value for op '${args.op}' is not supported`;
        }
      } else { // single value turns into single f:Expression
        return fillExpressionNode(TEMPLATE_ELEMENTS["f:Expression"].cloneNode(false), args.bRef, args.op, args.value[0]);
      }
    },

    /**
     * add exression or combine existing into our target model
     *
     * @param {object}  args
     * @param {string}  [args.targetNodeId] - Reference element to add expression to (or combine with), if not provided will simply append new expression to targetXPath element
     * @param {string}  [args.junction] - [AND, OR] Optional junction to apply with reference element 
     * @param {string}  [args.bRef] - bRef
     * @param {string}  [args.op] - Operator
     * @param {string[]}  [args.value] - Value: single or multiple (multiple to be combined into predicate And/Or depending on operator)
     *
     * @private
     */
    _addExpression : function(args){
      if(!Array.isArray(args.value))throw ".value is not an array";
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
      var newExpressionNode = this._createExpressionNode(args);

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
     * @param {string} nodeId to identify the node within target scope
     * @return {DomElement} from target identified by given nodeid, may return NULL no such node was found
     */
    _getTargetNode : function(nodeId){
      if(!nodeId) throw "Missing .nodeId";
      var selector = this._getTargetSelector();
      var dataProvider = selector.getDataProvider();
      var xPath = selector.xPath;

      return dataProvider.getData().selectSingleNode(`${xPath}/.//f:*[@${this.NODE_ID_ATTR} = '${nodeId}']`);
    },

    /**
     * edit an element via nodeId lookup
     *
     * @private
     */
    _editElement : function(nodeId, anchorElement){
      var refExpressionNode = this._getTargetNode(nodeId);

      if(!refExpressionNode.selectSingleNode("self::f:Expression"))throw "Not supported.";

      var args = { // args for :renderCreateUi event
        anchorElement     : anchorElement,
        targetNodeId      : nodeId,
        op                : refExpressionNode.getAttribute("op"),
        value             : refExpressionNode.getAttribute("value"),
        bRef              : refExpressionNode.getAttribute("bRef"),
        isUpdating        : true
      };

      // render ui
      this.createUiElement.trigger("bcdui:universalFilter:renderCreateUi", args);
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
}(jQuery));

/**
 * A namespace for the BCD-UI widget. For creation @see {@link bcdui.widgetNg.createUniversalFilter}
 * @namespace bcdui.widgetNg.universalFilter
 */
bcdui.widgetNg.universalFilter = Object.assign(bcdui.widgetNg.universalFilter,
/** @lends bcdui.widgetNg.button */
{
  /**
   * @param htmlElement
   * @private
   */
  init: function(htmlElement){ jQuery(htmlElement).bcduiUniversalFilterNg(); },
  /**
   * @param htmlElement
   * @private
   */
  _createJunction: function() { jQuery(this).trigger('bcdui:universalFilter:createJunction') },
  /**
   * @param htmlElement
   * @private
   */
  _createMultiValueInput: function() { jQuery(this).trigger('bcdui:universalFilter:createMultiValueInput') }
});
