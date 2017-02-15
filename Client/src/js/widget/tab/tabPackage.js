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
bcdui.core.HTML2XMLDataProvider = bcdui._migPjs._classCreate(bcdui.core.DataProvider,
    /**
     * @lends bcdui.core.HTML2XMLDataProvider.prototype
     */
    {

      /**
       * @constructs
       * @extends bcdui.core.DataProvider
       * @param {Object} args
       * @param {String} args.id
       * @param {String} args.name
       * @param {(String|HTMLElement)} args.idOrElement
       *
       */
      initialize: function(/* object */ args)
      {
          bcdui.log.isTraceEnabled() && bcdui.log.trace("HTML2XMLDataProvider init");
          bcdui.core.DataProvider.call( this, {
            id: args.id,
            name: args.name
          });

          this.waitingForUncomittedChanges = new bcdui.core.status.WaitingForUncomittedChanges();
          this.transformedStatus = new bcdui.core.status.TransformedStatus();

          this.doc = null;
          this.idOrElement = args.idOrElement;
      },

      /**
       * @private
       */
      _createModelDocument:function()
      {
        bcdui.log.isTraceEnabled() && bcdui.log.trace("this.idOrElement:"+this.idOrElement);
        var rElement = bcdui._migPjs._$(this.idOrElement);
        this.doc = bcdui.core.browserCompatibility.newDOMDocument();
        var root = this.doc.createElement("Items");
        var tabId =  "tab_" + (rElement.get(0).id || bcdui.factory.objectRegistry.generateTemporaryIdInScope("tab_"));
        root.setAttribute("id", tabId);
        root.setAttribute("defaultVisibleId", (rElement.attr("defaultVisibleId")==null || rElement.attr("defaultVisibleId") == "")?"FIRST":rElement.attr("defaultVisibleId"));


        this.doc.appendChild(root);

        rElement.children().each(function(i, element) {// all children of idOrElement
          var e = this.doc.documentElement.appendChild(this.doc.createElement("Item"));
          e.setAttribute("id", "tab_"+element.id);
          e.setAttribute("caption", (element.getAttribute("caption")==null)?"":element.getAttribute("caption"));
          e.setAttribute("enabled", (element.getAttribute("enabled")==null)?"":element.getAttribute("enabled"));
          e.setAttribute("toolTip", (element.getAttribute("toolTip")==null)?"":element.getAttribute("toolTip"));
          e.setAttribute("onclick", (element.getAttribute("onclick")==null)?"":element.getAttribute("onclick"));
        }.bind(this));

      },

      /**
       * @private
       */
      _executeImpl: function()
        {
          this._createModelDocument();
          var newStatus = this._uncommitedWrites ? this.waitingForUncomittedChanges : this.getReadyStatus();
          this.setStatus(newStatus);
        },

      getData: function()
        {
          return this.doc;
        },

      /**
       * @return {status}
       */
      getReadyStatus: function()
        {
          return this.transformedStatus;
        }
    }
);


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
 */
bcdui.util.namespace("bcdui.widget.tab",
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
     *
     */
    init:function(args)
    {
      var dataProvider = new bcdui.core.HTML2XMLDataProvider(
          {
              id:          args.id + "_innerModel"
            , name:        args.id + "_innerModel"
            , idOrElement:  bcdui._migPjs._$(args.idOrElement).get(0)
          }
      );

      dataProvider.execute();
      // read settings from GUIstatus doc, if exists XPath - takes it, if no - set default to visible
      var tabId = dataProvider.getData().selectSingleNode("/Items/@id").nodeValue;
      var guiStatusTabXPath = "/*/guiStatus:ClientSettings/Selected/Tab[@id = '" + tabId +"']";

      /*
       * register listener
       */
      bcdui.factory.addDataListener({
        idRef: bcdui.wkModels.guiStatus.id,
        onlyOnce: false,
        side: "",
        trackingXPath: guiStatusTabXPath,
        listener: bcdui.widget.tab._syncActiveTab.bind(undefined,tabId)
      });

      var xpath= guiStatusTabXPath + "/Active[text() != '']";
      var aktiveTab = bcdui.wkModels.guiStatus.getData().selectSingleNode(xpath);
      aktiveTab = (aktiveTab == null?null:aktiveTab.text);
      if( ! aktiveTab )
      {
        var contId = dataProvider.getData().selectSingleNode("/Items/@defaultVisibleId").nodeValue;
        if(contId && contId == "FIRST")
        {
          contId = dataProvider.getData().selectSingleNode("/Items/Item[1]/@id").nodeValue;
          contId = contId.replace('tab_','');// thus we have tabId here
        }

        if( contId){
          aktiveTab = "tab_"+contId;
        }
      }

      if(aktiveTab){
        var containerids = dataProvider.getData().selectNodes("/Items/Item/@id");
        for ( var i=0; i<containerids.length; i++) {
          var container = containerids[i];
          var conId = container.nodeValue.replace('tab_','');
          if( container.nodeValue != aktiveTab){
            bcdui._migPjs._$(conId).hide();
          }
          else{
            bcdui._migPjs._$(conId).show();
          }
        }
      }
      else
        bcdui.log.isTraceEnabled() && bcdui.log.trace("aktiveTab:" +aktiveTab + " xpath:" + xpath);

      // create tabs menu render
      var _rendererUrl = (args.rendererUrl) ? args.rendererUrl : "/bcdui/js/widget/tab/tab.xslt";
      var _handlerVariableName = (args.handlerJsClassName)?args.handlerJsClassName:"bcdui.widget.tab";
      var _rendererOrRendererRefId = bcdui.factory.createRenderer({
        id: ("bcdRenderer_" + args.id)
        ,url: bcdui.util.url.resolveToFullURLPathWithCurrentURL(_rendererUrl)
        ,inputModel: dataProvider
        ,parameters: {contextPath:bcdui.contextPath
                    , handlerVariableName:_handlerVariableName
                    }
        ,targetHTMLElementId:args.targetHTMLElementId
      });

      if(aktiveTab){
        bcdui.factory.objectRegistry.withReadyObjects({
          ids: [ _rendererOrRendererRefId ],
          fn: function(){
            bcdui._migPjs._$(aktiveTab).addClass("bcdActive");
            bcdui.core.createElementWithPrototype(bcdui.wkModels.guiStatus.getData(),guiStatusTabXPath+"/Active" ).text=aktiveTab;
            bcdui.wkModels.guiStatus.fire();
          }
        });
      }
    },

    /**
     * displays active tab according to guiStatus setting
     * @private
     */
    _syncActiveTab : function(tabId){
      var activeTab = bcdui.wkModels.guiStatus.getData().selectSingleNode("/*/guiStatus:ClientSettings/Selected/Tab[@id = '" + tabId+"']/Active");
      if(activeTab != null){
        activeTab = activeTab.text;
      }else{
        return;
      }

      // an existing client settings entry does not necessarily mean the object exists already
      if (! bcdui._migPjs._$(activeTab).length > 0)
        return;

      var containerId = activeTab.replace( 'tab_', '' );

      // collect all tabs
      var tabids = [];
      var containerids = [];
      
      jQuery(jQuery(bcdui._migPjs._$(activeTab).parent().get(0)).parent().get(0)).find(" > li a").each(function(i, el) {
        tabids.push( el.id );
        containerids.push( el.id.replace( 'tab_', '' ) );
      }.bind(this));

      // set active tab menu point
      tabids.every( function( tab ) {
        bcdui._migPjs._$(tab).removeClass( 'bcdActive' );
        return true;
      } );


      bcdui._migPjs._$(activeTab).addClass( 'bcdActive' );
      // set active tab content container
      containerids.every( function( container ) {
        bcdui._migPjs._$(container).hide();
        return true;
      } );

      bcdui._migPjs._$(containerId).show();
    },

    /**
     * A click on a tab happened
     */
    handleTabAction:function(event){
      // get container id
      var element = event.target;
      var elId = element.getAttribute("id");
      var parentId = element.getAttribute("parentId");
      var xpath= "/*/guiStatus:ClientSettings/Selected/Tab[@id = '" + parentId+"']/Active";
      var curValue = bcdui.wkModels.guiStatus.getData().selectSingleNode(xpath);
      if( curValue && curValue.text == elId )
        return null;// clicked on the same tab

      bcdui.core.createElementWithPrototype(bcdui.wkModels.guiStatus.getData(), xpath).text=elId;
      bcdui.wkModels.guiStatus.fire();// after event
    },

    /**
     * Set default parameters
     * @param {HTMLElement} htmlElement The element the tab is based on.
     * @private
     */
    _adjustDefaultParameters: function(HTMLElement) {

    }
  }
);// end of namespace
