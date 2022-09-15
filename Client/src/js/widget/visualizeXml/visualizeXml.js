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
if( typeof bcdui=="undefined" )
    bcdui = {};

/**
 * Utility package for raw data visualization used for debugging purposes.
 * @namespace bcdui.widget.visualizeXml
 */
bcdui.widget.visualizeXml =
/** @lends bcdui.widget.visualizeXml */ 
{

  /**
   * @private
   */
  _visualizeXml_CollapsSign : '',

  /**
   * @private
   */
  _getClassName: function( elem ) {
    if( elem && elem.className )
      return elem.className;
    else if( elem && elem.getAttribute)
      return elem.getAttribute("class");
    else
      return "";
  },

  /**
   * @private
   */
  _setClassName: function( elem, classname ) {
    if( elem.className )
      elem.className = classname;
    else
      elem.setAttribute("class",classname);
  },

  /**
   * @private
   */
  _f: function(e){
     if (bcdui.widget.visualizeXml._getClassName(e)=="visXml_ci") {
       if (e.firstChild.nodeValue.indexOf("\n")>0) _fix(e,"visXml_cb");
     }
     if (bcdui.widget.visualizeXml._getClassName(e)=="visXml_di") {
       if (e.firstChild.nodeValue.indexOf("\n")>0) _fix(e,"visXml_db");
     } e.id="";
  },

  /**
   * @private
   */
  _fix: function(e,cl){
    bcdui.widget.visualizeXml._setClassName(e,cl);
    e.style.display="";
    var j=e.parentNode.firstChild;
    bcdui.widget.visualizeXml._setClassName(j,"visXml_c");
    var k=j.firstChild;
    k.style.visibility="visible";
    k.href="#";
  },

  /**
   * @private
   */
  _ch: function(e) {
    var mark=e.firstChild.firstChild;
    mark = e.getElementsByTagName("A")[0];
    if( !mark.firstChild )
      mark.appendChild(document.createTextNode(''));
    mark = mark.firstChild;
    if (mark.nodeValue.match(/\+$/)) {
      mark.nodeValue = bcdui.widget.visualizeXml._visualizeXml_CollapsSign;
      for (var i=1;i<e.childNodes.length;i++) {
        e.childNodes.item(i).style.display="";
      }
    }
    else {
      mark.nodeValue=mark.nodeValue.substring(0,mark.nodeValue.length-1)+"+";
      for (var i=1;i<e.childNodes.length;i++) {
        e.childNodes.item(i).style.display="none";
      }
    }
  },

  /**
   * @private
   */
  _ch2: function(e) {
    var mark=e.firstChild.firstChild;
    mark = e.getElementsByTagName("A")[0];
    if( !mark.firstChild )
      mark.appendChild(document.createTextNode(''));
    mark = mark.firstChild;
    var contents=e.childNodes.item(1);
    if (mark.nodeValue.match(/\+$/)) {
      mark.nodeValue = mark.nodeValue.substring(0,mark.nodeValue.length-1)+ (bcdui.widget.visualizeXml._visualizeXml_CollapsSign.length!=0?bcdui.widget.visualizeXml._visualizeXml_CollapsSign:" ");
      if (bcdui.widget.visualizeXml._getClassName(contents)=="visXml_db"||bcdui.widget.visualizeXml._getClassName(contents)=="visXml_cb") {
        contents.style.display="";
      }
      else {
        contents.style.display="none";
      }
    }
    else {
      mark.nodeValue=mark.nodeValue.substring(0,mark.nodeValue.length-bcdui.widget.visualizeXml._visualizeXml_CollapsSign.length)+"+";
      contents.style.display="none";
    }
  },

  /**
   * @private
   */
  _handleClick: function(evt) {
    var e = jQuery(evt.target).get(0);
    if (bcdui.widget.visualizeXml._getClassName(e)!="visXml_c") {
      e=e.parentNode;
      if (bcdui.widget.visualizeXml._getClassName(e)!="visXml_c") {
        return;
      }
    }
    e=e.parentNode;
    if (bcdui.widget.visualizeXml._getClassName(e)=="visXml_e") {
      bcdui.widget.visualizeXml._ch(e);
    }
    if (bcdui.widget.visualizeXml._getClassName(e)=="visXml_k") {
      bcdui.widget.visualizeXml._ch2(e);
    }
  },

  /**
   * Visualiazes data of a model / data provider
   *
   * @param {object}                  args                The argument map containing the following elements:
   * @param {targetHtmlRef}           args.targetHtml     Id of the html element where to show the output.
   * @param {boolean}                 [args.initialCollapse=false] Initially collapses all nodes (except root) 
   * @param {string}                  [args.title]        Title of the content box; if not provided, the title is set to the ID of the visualized model.
   * @param {string}                  [args.idRef]        Id of the model to be visualized
   * @param {bcdui.core.DataProvider} [args.inputModel]   Instead of an id, the model can be provided directly
   * @param {boolean}                 [args.isAutoRefresh=true] Automatically redraw when model changes
   * @param {string}                  [args.stylesheetUrl=/bcdui/js/widget/visualizeXml/visualizeXmlCaller.xslt] renderer stylesheet
   */
  visualizeModel: function(args) 
  {
    args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.core._schema_visualizeModel_args);
    args.targetHtml = args.targetHTMLElementId = bcdui.util._getTargetHtml(args, "visualizeModel_");
    bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.core._schema_visualizeModel_args);
    var isAutoRefresh = typeof args.isAutoRefresh != "undefined" ? args.isAutoRefresh : true;
    var id = bcdui.factory.objectRegistry.generateTemporaryIdInScope("visualizeModel_");
    var stylesheetUrl = args.stylesheetUrl || (bcdui.contextPath + "/bcdui/js/widget/visualizeXml/visualizeXmlCaller.xslt");

    args.title = args.title || args.idRef || args.inputModel.id;
    jQuery("#" + args.targetHTMLElementId).append("<b>" + args.title + "</b>");
    jQuery("#" + args.targetHTMLElementId).append('<pre style="display:none" id="' + id + '" class="bcdVisualizeXml" onClick="bcdui.widget.visualizeXml._handleClick(jQuery.event.fix(event))"></pre>');

    bcdui.factory.objectRegistry.withReadyObjects(args.idRef || args.inputModel, function() {
      var model = bcdui.factory.objectRegistry.getObject(args.idRef || args.inputModel);
      var renderer = new bcdui.core.Renderer({ targetHtml: id, chain: stylesheetUrl, inputModel: model });

      // optional initial collapse all subnodes
      renderer.onceReady(function() {
        if (args.initialCollapse)
          jQuery(jQuery("#" + args.targetHtml).find("a").splice(1)).click();
        jQuery("#" + args.targetHtml).find("pre").show();
      });

      if (isAutoRefresh)
        model.onChange(renderer.execute.bind(renderer));
    });
  }
}