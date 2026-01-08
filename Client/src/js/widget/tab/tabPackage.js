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
 * @extends bcdui.core.DataProvider
 */
bcdui.core.HTML2XMLDataProvider = class extends bcdui.core.DataProvider
    {

      /**
       * @constructs
       * @extends bcdui.core.DataProvider
       * @param {Object} args
       * @param {string} args.id
       * @param {string} args.name
       * @param {(string|HtmlElement)} args.idOrElement
       *
       */
      constructor(args)
      {
          bcdui.log.isTraceEnabled() && bcdui.log.trace("HTML2XMLDataProvider init");
          super( {
            id: args.id,
            name: args.name
          });

          this.waitingForUncomittedChanges = new bcdui.core.status.WaitingForUncomittedChanges();
          this.transformedStatus = new bcdui.core.status.TransformedStatus();

          this.doc = null;
          this.idOrElement = args.idOrElement;
      }

      /**
       * @private
       */
      _createModelDocument()
      {
        bcdui.log.isTraceEnabled() && bcdui.log.trace("this.idOrElement:"+this.idOrElement);
        var rElement = bcdui._migPjs._$(this.idOrElement);
        if (rElement.length == 0)
          return;
        this.doc = bcdui.core.browserCompatibility.newDOMDocument();
        var root = this.doc.createElement("Items");
        var tabId =  "tab_" + (rElement.get(0).id || bcdui.factory.objectRegistry.generateTemporaryIdInScope("tab_"));
        root.setAttribute("id", tabId);
        root.setAttribute("defaultVisibleId", (rElement.attr("defaultVisibleId")==null || rElement.attr("defaultVisibleId") == "")?"FIRST":rElement.attr("defaultVisibleId"));


        this.doc.appendChild(root);

        rElement.children().each(function(i, element) {// all children of idOrElement
          jQuery(element).addClass("bcdTabItem");
          var e = this.doc.documentElement.appendChild(this.doc.createElement("Item"));
          e.setAttribute("id", "tab_"+element.id);
          e.setAttribute("caption", (element.getAttribute("caption")==null)?"":element.getAttribute("caption"));
          e.setAttribute("enabled", (element.getAttribute("enabled")==null)?"":element.getAttribute("enabled"));
          e.setAttribute("toolTip", (element.getAttribute("toolTip")==null)?"":element.getAttribute("toolTip"));
          e.setAttribute("onclick", (element.getAttribute("onclick")==null)?"":element.getAttribute("onclick"));
        }.bind(this));

      }

      /**
       * @private
       */
      _executeImpl()
        {
          this._createModelDocument();
          var newStatus = this._uncommitedWrites ? this.waitingForUncomittedChanges : this.getReadyStatus();
          this.setStatus(newStatus);
        }

      /**
       * @inheritDoc
       */
      getData()
        {
          return this.doc;
        }

      /**
       * @inheritDoc
       */
      getReadyStatus()
        {
          return this.transformedStatus;
        }
    };


/**
 * XSLT creates ul li li /ul for TABs
 * gets as parameter root html element where are content DIVs/HTML elements defined
 * parsed the HTML element to get count of Tabs, captions, references to content elements, may be some defult settings (width, height, position ...)
 *
 * sample:
 * <div id="myTabs">
 *   <div id="one_content"> </div>
 *   <div id="two_content"> </div>
 *   <div id="tree_content"> </div>
 * </div>
 *
 * than after parsing creates such UL
 * <ul id="tab_myTabs">
 *   <li id="tab_one_content"></li>
 *   <li id="tab_two_content"></li>
 *   <li id="tab_tree_content"></li>
 * </ul>
 *
 */
/**
 * A namespace for the BCD-UI tab widget.
 * @namespace bcdui.widget.tab
 * @private
 */
bcdui.widget.tab = Object.assign(bcdui.widget.tab,
/** @lends bcdui.widget.tab */
{
    /**
     * @param {Object} args
     * @param {Object} args.id:                  - tab id
     * @param {Object} args.rendererUrl          - URL to renderer xslt stylesheet
     * @param {Object} args.rendererId           - renderer id
     * @param {Object} args.handlerJsClassName   - Tab menu handler variable name, default bcdui.widget.tab
     * @param {Object} args.targetHTMLElementId  - target where HTML content to paste to
     * @param {Object} args.idOrElement          - id of/or HTML element where tabs are defined
     * @param {Object} args.isPersistent         - use guiStatus:PersistentSettings or guiStatus:ClientSettings
     * @private
     *
     */
    init:function(args)
    {

      var settingsNode = args.isPersistent ? "PersistentSettings" : "ClientSettings";
      
      var dataProvider = new bcdui.core.HTML2XMLDataProvider( {
        id:          args.id + "_innerModel"
      , name:        args.id + "_innerModel"
      , idOrElement:  bcdui._migPjs._$(args.idOrElement).get(0)
      });
      dataProvider.execute();

      // read settings from GUIstatus doc, if exists XPath - takes it, if no - set default to visible
      var tabId = dataProvider.getData().selectSingleNode("/Items/@id").nodeValue;
      var guiStatusTabXPath = "/*/guiStatus:" + settingsNode + "/Selected/Tab[@id = '" + tabId +"']";

      // register listener which shows/hides the selected tab
      bcdui.wkModels.guiStatus.onChange({
          onlyOnce: false
        , trackingXPath: guiStatusTabXPath
        , callback: bcdui.widget.tab._syncActiveTab.bind(undefined, tabId, args.targetHTMLElementId, args.idOrElement, settingsNode)
      });

      // determine activeTab (either from guiStatus or (initially from model with items defaultVisibleId attribute)
      var xpath = guiStatusTabXPath + "/Active[text() != '']";
      var activeTab = bcdui.wkModels.guiStatus.read(xpath, "");
      if (activeTab == "") {
        var contId = dataProvider.getData().selectSingleNode("/Items/@defaultVisibleId").nodeValue;
        if(contId && contId == "FIRST") {
          contId = dataProvider.getData().selectSingleNode("/Items/Item[1]/@id").nodeValue;
          contId = contId.replace('tab_',''); // thus we have tabId here
        }
        if (contId)
          activeTab = "tab_" + contId;
      }
      // in case we have an active tab, initially show/hide single (not yet initialized) containers and set active Tab in guiStatus
      if (activeTab != "") {
        jQuery.makeArray(dataProvider.queryNodes("/Items/Item/@id")).forEach(function(container) {
          var conId = jQuery("#" + container.nodeValue.replace('tab_', ''));
          if (container.nodeValue != activeTab)
            conId.hide();
          else
            conId.show();
        });
      }

      // create tabs menu renderer
      var _rendererUrl = (args.rendererUrl) ? args.rendererUrl : "/bcdui/js/widget/tab/tab.xslt";
      var _handlerVariableName = (args.handlerJsClassName)?args.handlerJsClassName:"bcdui.widget.tab";
      var renderer = new bcdui.core.Renderer({
          id: ("bcdRenderer_" + args.id)
        , chain: bcdui.util.url.resolveToFullURLPathWithCurrentURL(_rendererUrl)
        , inputModel: dataProvider
        , parameters: { contextPath: bcdui.contextPath, handlerVariableName: _handlerVariableName, settingsNode: settingsNode }
        , targetHtml: args.targetHTMLElementId
      });
      // initially sync
      renderer.onceReady(function(){
        bcdui.core.createElementWithPrototype(bcdui.wkModels.guiStatus.getData(), guiStatusTabXPath + "/Active").text = activeTab;
        bcdui.widget.tab._syncActiveTab(tabId, args.targetHTMLElementId, args.idOrElement, settingsNode);
      });
    },

    /**
     * displays active tab according to guiStatus setting
     * @private
     */
    _syncActiveTab : function(tabId, targetHTMLElementId, defTabId, settingsNode){
      
      var activeTab = bcdui.wkModels.guiStatus.read("/*/guiStatus:"+settingsNode+"/Selected/Tab[@id = '" + tabId+"']/Active", "");
      // an existing client settings entry does not necessarily mean the object exists already
      if (activeTab == "" || jQuery("#" + activeTab).length == 0)
        return;

      // set/remove active css class
      var tabs = jQuery("#" + activeTab).closest("ul").find(" > li a");
      tabs.removeClass("bcdActive");
      jQuery("#" + activeTab).addClass("bcdActive");

      tabs.each(function(i,e) {
        var conId = e.id.replace('tab_','');
        if (jQuery(e).hasClass("bcdActive")) {
          jQuery("#" + conId).show();
          jQuery("#" + conId).trigger("bcd:widget.tab.show");
        }
        else {
          jQuery("#" + conId).hide();
          jQuery("#" + conId).trigger("bcd:widget.tab.hide");
        }
      });
    },

    /**
     * A click on a tab happened, remember id in guiStatus 
     */
    handleTabAction:function(event, settingsNode) {
      var e = jQuery(event.target);
      var elId = e.attr("id");
      var xpath= "/*/guiStatus:"+settingsNode+"/Selected/Tab[@id='" + e.attr("parentId") + "']/Active";
      if (bcdui.wkModels.guiStatus.read(xpath, elId) == elId)
        return null;// clicked on the same tab
      bcdui.wkModels.guiStatus.write(xpath, elId, true);
    },

    /**
     * Set default parameters
     * @param {HtmlElement} htmlElement The element the tab is based on.
     * @private
     */
    _adjustDefaultParameters: function(HTMLElement) {}
  }
);// end of namespace
