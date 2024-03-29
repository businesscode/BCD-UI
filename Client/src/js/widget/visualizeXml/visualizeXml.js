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
  _f: function(e){
     if (jQuery(e).hasClass("visXml_ci")) {
       if (e.firstChild.nodeValue.indexOf("\n")>0) _fix(e,"visXml_cb");
     }
     if (jQuery(e).hasClass("visXml_di")) {
       if (e.firstChild.nodeValue.indexOf("\n")>0) _fix(e,"visXml_db");
     } e.id="";
  },

  /**
   * @private
   */
  _fix: function(e,cl){
    jQuery(e).addClass(cl);
    e.style.display="";
    const j = e.parentNode.firstChild;
    jQuery(j).addClass("visXml_c");
    const k = j.firstChild;
    k.style.visibility="visible";
    k.href="#";
  },

  /**
   * @private
   */
  _ch: function(e) {
    const mark = e.getElementsByTagName("A")[0];
    const doCollapse = jQuery(mark).hasClass("bcdExpand");
    jQuery(mark).toggleClass("bcdCollapse bcdExpand");
    for (let i = 1; i < e.childNodes.length; i++)
      e.childNodes.item(i).style.display = doCollapse ? "" : "none";
  },

  /**
   * @private
   */
  _ch2: function(e) {
    const mark = e.getElementsByTagName("A")[0];
    const contents = e.childNodes.item(1);
    const doCollapse = jQuery(mark).hasClass("bcdExpand");
    jQuery(mark).toggleClass("bcdCollapse bcdExpand");
    contents.style.display = doCollapse && (jQuery(contents).hasClass("visXml_db") || jQuery(contents).hasClass("visXml_cb")) ? "" : "none";
  },

  /**
   * @private
   */
  _handleClick: function(evt) {
    let e = jQuery(evt.target).get(0);
    if (!jQuery(e).hasClass("visXml_c")) {
      e = e.parentNode;
      if (!jQuery(e).hasClass("visXml_c")) {
        return;
      }
    }
    e = e.parentNode;
    if (jQuery(e).hasClass("visXml_e"))
      bcdui.widget.visualizeXml._ch(e);
    if (jQuery(e).hasClass("visXml_k"))
      bcdui.widget.visualizeXml._ch2(e);
  },

  /**
   * Visualiazes data of a model / data provider
   *
   * @param {object}                  args                The argument map containing the following elements:
   * @param {targetHtmlRef}           args.targetHtml     Id of the html element where to show the output.
   * @param {string}                  [args.title]        Title of the content box; if not provided, the title is set to the ID of the visualized model.
   * @param {string}                  [args.idRef]        Id of the model to be visualized
   * @param {bcdui.core.DataProvider} [args.inputModel]   Instead of an id, the model can be provided directly
   * @param {boolean}                 [args.isAutoRefresh=true] Automatically redraw when model changes
   * @param {string}                  [args.stylesheetUrl=/bcdui/js/widget/visualizeXml/visualizeXmlCaller.xslt] renderer stylesheet
   * @param {function}                [args.onReady]      onReady function for renderer
   * @example
   * // Load, transform and visualize a model
   * let sm = new bcdui.core.SimpleModel("input.xml");
   * let mw = new bcdui.core.ModelWrapper({inputModel: sm, chain: "transformer.xslt"});
   * bcdui.widget.visualizeXml.visualizeModel({targetHtml: "testOutput", inputModel: mw, title: "Transformed Output"});
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
    jQuery("#" + args.targetHTMLElementId).append('<pre id="' + id + '" class="bcdVisualizeXml" onClick="bcdui.widget.visualizeXml._handleClick(jQuery.event.fix(event))"></pre>');

    bcdui.factory.objectRegistry.withReadyObjects(args.idRef || args.inputModel, function() {
      var model = bcdui.factory.objectRegistry.getObject(args.idRef || args.inputModel);
      var renderer = new bcdui.core.Renderer({ targetHtml: id, chain: stylesheetUrl, inputModel: model });
      
      if (typeof args.onReady == "function")
        renderer.onReady(args.onReady.bind(renderer));

      if (isAutoRefresh)
        model.onChange(renderer.execute.bind(renderer));
    });
  }
}