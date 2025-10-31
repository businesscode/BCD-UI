/*
  Copyright 2010-2025 BusinessCode GmbH, Germany

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

bcdui.component.grid.GridEditor = bcdui.component.grid.GridEditor || {};
bcdui.component.grid.GridRenderer = bcdui.component.grid.GridRenderer || {};
bcdui.component.grid.GridEditor.bcduiHtmlEditor = Handsontable.editors.BaseEditor.prototype.extend();

bcdui.component.grid.GridEditor.bcduiHtmlEditor.prototype.prepare = function() {
  Handsontable.editors.BaseEditor.prototype.prepare.apply(this, arguments);

  const params = this.cellProperties.editorParameter;
  
  if (!params.rendererId) throw new Error("rendererId not defined");
  if (!params.targetModelId) throw new Error("targetModelId not defined");
  if (!params.targetModelXPath) throw new Error("targetModelXPath not defined");

  const grid = this.instance.getBCDUIGrid();
  const gridModel = grid != null ? grid.gridModel : null;
  this.ckEditor = params.ckEditor != "false";
  this.targetModelXPath = params.targetModelXPath;
  this.targetModel = bcdui.factory.objectRegistry.getObject(params.targetModelId);
  if (typeof this.targetModel == "undefined")
    throw new Error("targetModel not defined");
  this.title = params.title || (gridModel ? gridModel.read("/*/wrs:Header/wrs:Columns/wrs:C[@pos='" + (this.cellProperties.prop.colIdx + 1) + "']/@caption", "") : "");
  this.title = bcdui.i18n.syncTranslateFormatMessage({msgid: this.title}) || this.title;
  this.renderer = bcdui.factory.objectRegistry.getObject(params.rendererId);
};

bcdui.component.grid.GridEditor.bcduiHtmlEditor.prototype.focus = function() {/* nothing to focus but needed */}

bcdui.component.grid.GridEditor.bcduiHtmlEditor.prototype.open = function() {

  // kill key / mouse events for handsontable
  this.instance.addHook("beforeKeyDown", this.stopEvents);
  const bcdHolder = bcdui.util.getSingletonElement("bcdSingletonHolder", true);
  jQuery(bcdHolder).on("mousedown", this.stopEvents);
  
  this.backupData = this.targetModel.read(this.targetModelXPath, "");

  // build up dialog
  jQuery(".bcdCkEditorContainer").remove(); // ckEditor container
  jQuery(".bcduiHtmlEditor").remove(); // renderer below
  jQuery("body").append("<div style='display:none' class='bcduiHtmlEditor' title='" + this.title + "'>" +
        "<div class='bcdLoadContainer'></div>" +
        "<div class='bcdControls' bcdRendererId='"+this.instance.getBCDUIGrid().id+"'>" +
          "<bcd-buttonng bcdActionId='heTakeData' caption='" + bcdui.i18n.TAG + "bcd_Ctrl_Ok' onClickAction='bcdui.component.grid.gridButtonAction'></bcd-buttonng>" +
          "<bcd-buttonng bcdActionId='heClear' caption='" + bcdui.i18n.TAG + "bcd_Ctrl_Clear' onClickAction='bcdui.component.grid.gridButtonAction'></bcd-buttonng>" +
          "<bcd-buttonng bcdActionId='heCancel' caption='" + bcdui.i18n.TAG + "bcd_Ctrl_Cancel' onClickAction='bcdui.component.grid.gridButtonAction'></bcd-buttonng>" +
        "</div>" +
      "</div>");
  jQuery(".bcduiHtmlEditor").data("instance", this); // remember instance for button use

  // and set target div of the renderer
  this.renderer.setTargetHtml(jQuery(".bcduiHtmlEditor .bcdLoadContainer").get(0));

  this.renderer.onceReady(function() {
    // data loaded, translate and show data
    bcdui.i18n.syncTranslateHTMLElement({elementOrId: jQuery(".bcduiHtmlEditor").get(0)});
    jQuery(".bcduiHtmlEditor").show();

    // and make it a dialog
    jQuery(".bcduiHtmlEditor").dialog({closeOnEscape: false, height: "auto", width: "auto", modal: false, resizable: false, draggable: true, closeText: "\u2716", position: { my: 'center', at: 'center' }
      , create: function() { 
          jQuery(".bcdOverlay").remove();
          jQuery("body").append("<div class='ui-widget-overlay ui-front bcdOverlay' style='z-index: 20000;'></div>");
          jQuery("body").addClass("bcdNoScroll");
        }
      , close: function() {
          bcdui.component.grid.GridEditor.bcduiHtmlEditor.cancelData(jQuery(".bcduiHtmlEditor").get(0));
        }
      , beforeClose: function() {
          jQuery("body").removeClass("bcdNoScroll");
          jQuery(".bcdOverlay").remove();
        }
    });

    // kill key / mouse events for handsontable also for dialogs/overlays
    const self = this;
    jQuery(".bcduiHtmlEditor").parent().on("mousedown", self.stopEvents);
    jQuery(".bcdOverlay").on("mousedown", self.stopEvents);
    
  }.bind(this));

  // and finally start custom renderer
  this.renderer.execute(true);
}

bcdui.component.grid.GridEditor.bcduiHtmlEditor.prototype.close = function() {
  // restore event handling
  this.instance.removeHook('beforeKeyDown', this.stopEvents);
  jQuery("#bcdSingletonHolder").off("mousedown");
  jQuery(".bcduiHtmlEditor").parent().off("mousedown");
  jQuery(".bcdOverlay").off("mousedown");
}

bcdui.component.grid.GridEditor.bcduiHtmlEditor.prototype.setValue = function(value) {
  if (value != null)
    bcdui.core.createElementWithPrototype(this.targetModel.getData(), this.targetModelXPath, false).text = value;
  else
    bcdui.core.removeXPath(this.targetModel.getData(), this.targetModelXPath);
}

bcdui.component.grid.GridEditor.bcduiHtmlEditor.prototype.getValue = function() {
  return this.targetModel.read(this.targetModelXPath, "");
};

bcdui.component.grid.GridEditor.bcduiHtmlEditor.prototype.stopEvents = function(event) {
  event.stopImmediatePropagation();
}

// button actions

bcdui.component.grid.GridEditor.bcduiHtmlEditor.clearData = function(element) {
  let self = jQuery(element).closest(".bcduiHtmlEditor").data("instance");
  self.targetModel.remove(self.targetModelXPath, true);
}

bcdui.component.grid.GridEditor.bcduiHtmlEditor.cancelData = function(element) {
  let self = jQuery(element).closest(".bcduiHtmlEditor").data("instance");
  // if close is triggered from takeData, do nothing
  if (self.closeFromTakeData) {
    delete self.closeFromTakeData;
    return;
  }

  // restore old data
  self.targetModel.write(self.targetModelXPath, self.backupData, true);
  setTimeout(function() {
    self.instance.getActiveEditor().finishEditing();
    jQuery(element).closest(".bcduiHtmlEditor").dialog("close");
  });
}

bcdui.component.grid.GridEditor.bcduiHtmlEditor.takeData = function(element) {
  let self = jQuery(element).closest(".bcduiHtmlEditor").data("instance");
  self.closeFromTakeData = true;

  // don't allow illegal data 
  if (jQuery(".bcduiHtmlEditor .bcdInvalid").length > 0) {
    alert(bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_ApplyDenyMessage"}));
    return false;
  }

  if (self.ckEditor)
    jQuery("#bcdCkEditor").ckeditor("writeValue");

  setTimeout(function() {
    self.instance.getActiveEditor().finishEditing();
    jQuery(element).closest(".bcduiHtmlEditor").dialog("close");
  });
}

bcdui.component.grid.GridRenderer.bcduiHtmlRenderer = function(instance, td, row, col, prop, value, cellProperties, gridArgs) {
  if (!gridArgs)
   return td;

  // concentrate on the the bcdBody part only, convert it to text (max 60 chars)
  const itemsToString = function(items) {
    let txt = "";
    const match = bcdui.component.grid.GridEditor.bcduiHtmlEditor.getRegEx().exec(items);
    if (match)
      txt = jQuery("<div>" + match[1] + "</div>").text().substring(0, 60);
    return txt.length == 60 ? txt + "..." : txt;
  }
  jQuery(td).text(itemsToString(value));
  jQuery(td).html("<span class='bcdHtmlPreview'><a class='preview'></a></span>"+td.innerHTML+"<span></span>");
  jQuery(td).off("click");
  jQuery(td).on("click", ".preview", function() { bcdui.component.grid.GridRenderer.previewHtml(gridArgs.targetHtml, gridArgs.rowId); });
  return td;
};

bcdui.component.grid.GridRenderer.previewHtml = function(targetHtml, rowId) {

  jQuery(".bcdHtmlPreview").closest(".ui-dialog").remove();

  const hotInstance = jQuery("#" + targetHtml).find(".handsontable").handsontable("getInstance");
  if (hotInstance && hotInstance.getBCDUIGrid() && hotInstance.getBCDUIGrid().getPrimaryModel()) {
    const severityIdx = hotInstance.getBCDUIGrid().wrsHeaderMeta["severity"].pos;
    const messageIdx = hotInstance.getBCDUIGrid().wrsHeaderMeta["message"].pos;
    const severity = hotInstance.getBCDUIGrid().getPrimaryModel().read("/*/wrs:Data/*[@id='"+rowId+"']/wrs:C["+severityIdx+"]", "");
    const title = hotInstance.getBCDUIGrid().getPrimaryModel().read("/*/wrs:Header/wrs:Columns/wrs:C["+severityIdx+"]//wrs:Data/wrs:R[wrs:C[position()=2 and .='"+severity+"']]/wrs:C[1]", "");
    const match = bcdui.component.grid.GridEditor.bcduiHtmlEditor.getRegEx().exec(hotInstance.getBCDUIGrid().getPrimaryModel().read("/*/wrs:Data/*[@id='"+rowId+"']/wrs:C["+messageIdx+"]", ""));
    if (match)
      jQuery("<div title='"+title+"'><div class='bcdHtmlPreview'>" + match[1] + "</div></div>").dialog({
        width: "auto%"
      , height: "auto"
      , resizable: false
      , open: function() { jQuery('.bcdHtmlPreview *').addClass('bcdCssReset'); }});
  }
}

bcdui.component.grid.GridEditor.bcduiHtmlEditor.getRegEx = function() {
  return new RegExp(/<div id='bcdBody'>(.*)<\!\-\- end \-\->/g);
}

bcdui.component.grid.GridEditor.bcduiHtmlEditor.format_in = function(val){
  if(val){
    const match = bcdui.component.grid.GridEditor.bcduiHtmlEditor.getRegEx().exec(val);
    if (match)
      val = match[1];
  }
  return val;
}
bcdui.component.grid.GridEditor.bcduiHtmlEditor.format_out = function(val){
  return ("<!DOCTYPE HTML><html><head><meta charset='UTF-8'></meta></head><body><div id='bcdBody'>"+(val || "")+"<!-- end --></div></body></html>");
}

// ckeditor patch for grid use, stop mouse events on dialog container, so that they don't fire a grid editor close 
CKEDITOR.on( 'dialogDefinition', function( ev ) {
  let dialogDefinition = ev.data.definition;
  const self = ev.data.definition.dialog;

  if (!dialogDefinition.isPatched) {
    dialogDefinition.isPatched = true;

    const onShow = dialogDefinition.onShow;
    const onHide = dialogDefinition.onHide;
    dialogDefinition.onShow = function(){
      jQuery(".cke_dialog_container").on("mousedown", function(event){event.stopImmediatePropagation();});
      if (onShow)
        onShow.bind(self)();
    }.bind(self);
    dialogDefinition.onHide = function(){
      jQuery(".cke_dialog_container").off("mousedown");
      if (onHide)
        onHide.bind(self)();
    }.bind(self);
  }
});