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

"use strict";

var widgetBaseEditor = Handsontable.editors.TextEditor.prototype.extend();

// init is called on handsontable creation, we mainly only generate a targetModel here  and provide two standard functions
widgetBaseEditor.prototype.init = function() {

  // default manifestData call for widgetNgs, using _bcduiWidget to get the jQuery widget instances and calling the widget's manifestValue function
  this.manifestValue = function() {
    var widgetEl = jQuery("#" + this.objectId);
    if (widgetEl.length > 0) {
      var widgetInstance = widgetEl._bcduiWidget();
      if (widgetInstance != null && widgetInstance.manifestValue)
        widgetInstance.manifestValue();  
    }
  };

  // cleanup routine when widget should be destroyed. Should at least kill the container and the written xpath (so no garbage exists for next call)  
  this.destroyWidget = function() {
    jQuery("#" + this.objectId).remove();
  };

  // let's first call the standard texteditor init
  Handsontable.editors.TextEditor.prototype.init.apply(this, arguments);

  // create targetModel for widget, needs to be registered for widget use
  this.targetModel = new bcdui.core.StaticModel("<guiStatus:Status xmlns:f=\"" + bcdui.core.xmlConstants.namespaces.f + "\" xmlns:guiStatus=\"" + bcdui.core.xmlConstants.namespaces.guiStatus + "\"/>");
  bcdui.factory.objectRegistry.registerObject(this.targetModel);
  this.targetModel.execute();
};

// prepare is called on each cell activation. Should set the concrete functions for this cell type and the target xpath
widgetBaseEditor.prototype.prepare = function(row, col, prop, td, originalValue, cellProperties) {

  // let's first call the standard texteditor prepare
  Handsontable.editors.TextEditor.prototype.prepare.apply(this, arguments);

  if (!this.objectId)      throw new Error("objectId not defined");
  if (!this.cssPath)       throw new Error("cssPath not defined");
  if (!this.createWidget)  throw new Error("createWidget not defined");
  if (!this.prepareLayout) throw new Error("prepareLayout not defined");

  // generic targetXPath
  this.targetModelXPath = "/*/f:Filter/f:Expression[@bRef='" + this.objectId +"' and @op='=']/@value";
};

// opens a cell editor
widgetBaseEditor.prototype.open = function () {

  // hide bcdui flyovers while the widget is open
  jQuery("#bcdTooltipDiv").css({"visibility" : "hidden"});
  jQuery("#bcdContextMenuDiv").css({"visibility" : "hidden"});
  jQuery(".htBorders").css({"visibility" : "hidden"});

  // partly disable handsontable key event handling and mouseclicks for some well known bcd singletons (bcdCalendar, bcdAutocompletionBox)
  this.instance.addHook("beforeKeyDown", killEvents);
  jQuery("#bcdSingletonHolder").on("mousedown", killEvents);

  // create widget container if it does not exist yet (this happens when it was scrolled outside of viewport)
  if (jQuery("#" + this.objectId).length == 0) {
    jQuery("#" + this.objectId).remove();
    this.instance.rootElement.appendChild(jQuery("<div style='position:absolute';display:none' class='bcdGridEditor' id='" + this.objectId + "'></div>").get(0));

    // create widget, take widget parameters from cell properties, use a fixed targetModelXPath
    this.widgetParams = this.cellProperties.editorParameter;

    this.gotGridReferences = false;

    // when we got grid cell references in optionsModelXPath, resolve them
    if (this.widgetParams["optionsModelXPath"] && this.widgetParams["optionsModelXPath"].indexOf("$grid") != -1) {
      
      this.gotGridReferences = true;

      // we need to deep clone the editorParameters to not replace the original xpath 
      this.widgetParams = jQuery.extend(true, {}, this.cellProperties.editorParameter);

      // handle grid row dependencies (find belonging cell in gridModel and replace placeholder with it)
      this.widgetParams["optionsModelXPath"] = this.instance.getBCDUIGrid()._resolveRowDependency({rowId: this.instance.getSourceData()[this.row].r.getAttribute("id"), xPath: this.widgetParams["optionsModelXPath"]});
    }

    // set our fixed targetModelXPath and create widget
    this.widgetParams["targetModelXPath"] = "$" + this.targetModel.id + this.targetModelXPath;
    this.createWidget(this.widgetParams);

    // let's overwrite the texteditor internal holder/input with out widget and reposition field
    jQuery("#" + this.objectId).addClass("handsontableInputHolder");
    jQuery(this.cssPath).addClass("handsontableInput");

    // remember old textarea element
    this.TEXTAREA_BAK = this.TEXTAREA;
    this.TEXTAREA_PARENT_BAK = this.TEXTAREA_PARENT;

    // use ours
    this.TEXTAREA = jQuery(this.cssPath).get(0);
    this.TEXTAREA_PARENT = jQuery("#" + this.objectId).get(0);
    this.textareaStyle = this.TEXTAREA.style;
    this.textareaParentStyle = this.TEXTAREA_PARENT.style;
    this.prepareLayout();
  }

  // reposition widget
  this.refreshDimensions();

  // widget can signal "done", so we need to finish editing when targetModel changed
  var self = this;
  this.targetModel.onChange({onlyOnce: true, targetModelXPath: this.targetModelXPath, callback: function(){
    self.instance.getActiveEditor().finishEditing();
  }})
};

// set input field focus to start typing
widgetBaseEditor.prototype.focus = function() {
  jQuery(this.cssPath).focus();
};

// close editor, should cleanup hooks and widget (not when it is just scrolled outside viewport tdOutside=true)
widgetBaseEditor.prototype.close = function(tdOutside) {

  // kill widget unless it's not just hidden by out-of-viewport scroll
  if (! tdOutside) {
    this.destroyWidget();

    // make bcdui flyovers visible again
    jQuery("#bcdTooltipDiv").css({"visibility" : "visible"});
    jQuery("#bcdContextMenuDiv").css({"visibility" : "visible"});
    jQuery(".htBorders").css({"visibility" : "visible"});
  }

  // enable handsontable key / mouse event handling again
  jQuery("#bcdSingletonHolder").off("mousedown");
  this.instance.removeHook('beforeKeyDown', killEvents);

  // restore old textarea (since e.g. copy/paste listeners are connected)
  this.TEXTAREA = this.TEXTAREA_BAK;
  this.TEXTAREA_PARENT = this.TEXTAREA_PARENT_BAK;
};

// keyboard press hook
function killEvents(event) {

  // disable nearly all key events for handsontable while widget is open
  switch (event.keyCode) {
    case Handsontable.helper.KEY_CODES.ENTER: {
      if (this.getActiveEditor().objectId == "bcduiSimpleTextarea")  // allow ENTER for textareas for new rows
        event.stopImmediatePropagation();
      break;
    }
    case Handsontable.helper.KEY_CODES.ESCAPE:
    case Handsontable.helper.KEY_CODES.TAB:
      break;
    default:
      event.stopImmediatePropagation();
  }
}

// straight forward writer to take over data from grid into widget 
widgetBaseEditor.prototype.setValue = function(value) {
  if (value != null)
    bcdui.core.createElementWithPrototype(this.targetModel.getData(), this.targetModelXPath, false).text = value;
  else
    bcdui.core.removeXPath(this.targetModel.getData(), this.targetModelXPath);
};

// straight forward reader to take over widget selected value into grid
widgetBaseEditor.prototype.getValue = function() {
//get current value from widget by calling updateValue
  this.manifestValue();
  return this.targetModel.read(this.targetModelXPath, "");
};


/* ***************************************************************************************************************** */
/* Input Widget */
/* ***************************************************************************************************************** */
var bcduiInput = widgetBaseEditor.prototype.extend();
bcduiInput.prototype.prepare = function(row, col, prop, td, originalValue, cellProperties) {

  this.objectId = "bcdInput";
  this.cssPath  = "#" + this.objectId + " input";

  this.createWidget = function(widgetParams) {
    var args = jQuery.extend({targetHtml: this.objectId},widgetParams);
    bcdui.widgetNg.createInput(args)
  };

  this.prepareLayout = function() {
    /* nothing to do, use handsontable implementation */
  };

  // call base class
  widgetBaseEditor.prototype.prepare.apply(this, arguments);
};



/* ***************************************************************************************************************** */
/* Single Select Widget */
/* ***************************************************************************************************************** */
var bcduiSingleSelect = widgetBaseEditor.prototype.extend();
bcduiSingleSelect.prototype.prepare = function(row, col, prop, td, originalValue, cellProperties) {

  this.objectId      = "bcdSingleSelect";
  this.cssPath       = "#" + this.objectId + " select";
  
  this.createWidget = function(widgetParams) {
    var args = jQuery.extend({targetHtml: this.objectId},widgetParams);
    bcdui.widgetNg.createSingleSelect(args)
  };
  
  this.prepareLayout = function() {
    // make select as wide as cell
    var width = Handsontable.dom.outerWidth(this.TD);
    this.TEXTAREA.style.minWidth = width + 'px';
  };

  // call base class
  widgetBaseEditor.prototype.prepare.apply(this, arguments);
};



/* ***************************************************************************************************************** */
/* inputField Widget */
/* ***************************************************************************************************************** */
var bcduiInputField = widgetBaseEditor.prototype.extend();
bcduiInputField.prototype.prepare = function(row, col, prop, td, originalValue, cellProperties) {

  this.objectId      = "bcdInputField";
  this.cssPath       = "#" + this.objectId + " input";
  
  this.createWidget = function(widgetParams) {
    var args = jQuery.extend({targetHtml: this.objectId},widgetParams);
    bcdui.widget.createInputField(args);
  };
  
  this.manifestValue = function() {
    var widgetEl = jQuery("#" + this.objectId + " input");
    if (widgetEl.length > 0)
      bcdui.widget.inputField._writeDataToXML(widgetEl.get(0).id, false);
  };
  
  this.destroyWidget = function() {
    jQuery("#bcdAutoCompletionBox").hide();  // close a possible open autocomplete box
    jQuery("#" + this.objectId).remove();
  };
  
  this.prepareLayout = function() {
    /* nothing to do, use handsontable implementation */
    /* Note: if you want to prevent a slight right overlay of the drop down box, you might want to adjust the style via css
     * or a more complex overwrite of handsontable texteditor's refreshDimensions and autoResize is required.
     * */
  };

  // call base class
  widgetBaseEditor.prototype.prepare.apply(this, arguments);
};



/* ***************************************************************************************************************** */
/* periodChooser Widget */
/* ***************************************************************************************************************** */
var bcduiPeriodChooser = widgetBaseEditor.prototype.extend();

bcduiPeriodChooser.prototype.init = function() {

  // move calendar from head to body (if not done yet)
  if( jQuery("#bcdCalendar").parent()[0].nodeName == "HEAD" ) {
    var bcdHolder = bcdui.util.getSingletonElement("bcdSingletonHolder", true);
    jQuery(bcdHolder).prepend(jQuery("#bcdCalendar"));
  }

  widgetBaseEditor.prototype.init.apply(this, arguments);
}

bcduiPeriodChooser.prototype.prepare = function(row, col, prop, td, originalValue, cellProperties) {

  this.objectId      = "bcduiPeriodChooser";
  this.cssPath       = "#" + this.objectId + " > span";
  
  this.createWidget = function(widgetParams) {
    var args = jQuery.extend({targetHtml: this.objectId},widgetParams);
    bcdui.widget.createPeriodChooser(args);
  };
  
  this.manifestValue = function() {};
  
  this.destroyWidget = function() {
    jQuery("#bcdCalendar").hide();  // close a possible open popupcalendar
    jQuery("#" + this.objectId).remove();
    bcdui.core.removeXPath(this.targetModel.getData(), "/*/f:Filter/f:Expression[@bRef='" + this.objectId + "']");
  };
  
  this.prepareLayout = function() {
    /* nothing to do, use handsontable implementation */
  };
  
  // call base class
  widgetBaseEditor.prototype.prepare.apply(this, arguments);
};


/* ***************************************************************************************************************** */
/* Simple Text Input */
/* ***************************************************************************************************************** */
var bcduiSimpleInput = widgetBaseEditor.prototype.extend();
bcduiSimpleInput.prototype.prepare = function(row, col, prop, td, originalValue, cellProperties) {

  this.objectId = "bcduiSimpleInput";
  this.cssPath  = "#" + this.objectId + " input";
  this.value = "";

  this.createWidget = function(widgetParams) {
    var args = jQuery.extend({targetHtml: this.objectId},widgetParams);
    var html = "<input";
    html += args.maxlength ? " maxlength='" + args.maxlength + "'" : "";
    html += "></input>"
    jQuery("#" + this.objectId).append(html);
    jQuery("#" + this.objectId + " input").val(this.value);
  };

  this.setValue = function(value) {this.value = value;};
  this.getValue = function() {return jQuery(this.cssPath).val();};
  this.prepareLayout = function() {};

  // call base class
  widgetBaseEditor.prototype.prepare.apply(this, arguments);
};


/* ***************************************************************************************************************** */
/* Simple Textarea Input */
/* ***************************************************************************************************************** */
var bcduiSimpleTextarea = widgetBaseEditor.prototype.extend();
bcduiSimpleTextarea.prototype.prepare = function(row, col, prop, td, originalValue, cellProperties) {

  this.objectId = "bcduiSimpleTextarea";
  this.cssPath  = "#" + this.objectId + " textarea";
  this.value = "";

  this.createWidget = function(widgetParams) {
    var args = jQuery.extend({targetHtml: this.objectId},widgetParams);
    var html = "<textarea";
    html += args.maxlength ? " maxlength='" + args.maxlength + "'" : "";
    html += "></textarea>"
    jQuery("#" + this.objectId).append(html);
    jQuery("#" + this.objectId + " textarea").val(this.value);
  };

  this.setValue = function(value) {this.value = value;};
  this.getValue = function() {return jQuery(this.cssPath).val();};
  this.prepareLayout = function() {};

  // call base class
  widgetBaseEditor.prototype.prepare.apply(this, arguments);
};

/* ***************************************************************************************************************** */
/* Simple Numeric Input */
/* ***************************************************************************************************************** */
var bcduiSimpleNumericInput = widgetBaseEditor.prototype.extend();
bcduiSimpleNumericInput.prototype.prepare = function(row, col, prop, td, originalValue, cellProperties) {

  this.objectId = "bcduiSimpleNumericInput";
  this.cssPath  = "#" + this.objectId + " input";
  this.value = "";

  this.createWidget = function(widgetParams) {
    var args = jQuery.extend({targetHtml: this.objectId},widgetParams);
    var html = "<input type='number'";
    html += args.maxlength ? " maxlength='" + args.maxlength + "'" : "";
    html += args.max ? " max='" + args.max + "'" : "";
    html += args.min ? " min='" + args.min + "'" : "";
    html += "></input>"
    jQuery("#" + this.objectId).append(html);
    jQuery("#" + this.objectId + " input").val(this.value);
  };
  
  this.setValue = function(value) {this.value = value;};
  this.getValue = function() {return jQuery(this.cssPath).val();};
  this.prepareLayout = function() {};

  // call base class
  widgetBaseEditor.prototype.prepare.apply(this, arguments);
};

/* ***************************************************************************************************************** */
/* Simple Drop Down */
/* ***************************************************************************************************************** */
var bcduiSimpleDropDown= widgetBaseEditor.prototype.extend();

bcduiSimpleDropDown.prototype.prepare = function(row, col, prop, td, originalValue, cellProperties) {

  var params = cellProperties.editorParameter;

  this.objectId = "bcduiSimpleDropDown";
  this.cssPath  = "#" + this.objectId + " select";
  this.value = "";
  this.filterOptionsFunct = params.filterOptionsFunct ? params.filterOptionsFunct.split(".").reduce( function( fkt, f ) { return fkt[f] }, window ) : null;
  this.distinctOptions = params.distinctOptions === "true";

  this.createWidget = function(widgetParams) {
    var args = jQuery.extend({targetHtml: this.objectId},widgetParams);

    // build up code/caption list only once (unless no gridReferences are used)
    if (typeof this.optionsArray == "undefined")
      this.optionsArray = {};

    if (this.gotGridReferences || typeof this.optionsArray[col] == "undefined") {
      this.optionsArray[col] = new Array();
      if (args.optionsModelXPath) {
        var m = bcdui.factory._extractXPathAndModelId(args.optionsModelXPath);
        var valueXPath = m.xPath + (args.optionsModelRelativeValueXPath ? "/" + args.optionsModelRelativeValueXPath : "");
        var optionsModel = bcdui.factory.objectRegistry.getObject(m.modelId);
        var valueArr = jQuery.makeArray(optionsModel.getData().selectNodes(valueXPath)).map(function(e) { return e.nodeValue || e.text; });
        var ppp=0;
        this.optionsArray[col] = jQuery.makeArray(optionsModel.getData().selectNodes(m.xPath)).map(function(e) { return [e.nodeValue || e.text, valueArr[ppp++]]; });
      }
    }

    // support isSortOptions for sorting
    if (args.isSortOptions === "true") {
      this.optionsArray[col] = this.optionsArray[col].sort(function(a,b){
        return (a[0] > b[0] ? 1 : -1);
      })
    }

    // support filtered values so only not-used values are shown
    var usedIds = (args.filterOptions === "true") ? jQuery.makeArray(this.instance.getBCDUIGrid().gridModel.queryNodes("/*/wrs:Data/wrs:*[local-name()!='D']/wrs:C[position()=" + (col + 1) + "]")).map(function(e){ return e.text; }) : [];
    
    // support filtered values via user filterFunction, function is called with optionsArray for current column and has to return an array with valid ids
    if (this.filterOptionsFunct && this.instance.getBCDUIGrid()) {
      var gridArgs = this.instance.getBCDUIGrid()._getGridModelValues(row, col, originalValue);
      usedIds = this.filterOptionsFunct(this.instance, td, row, col, prop, originalValue, cellProperties, gridArgs, this.optionsArray[col]);
    }

    var distinctKeys = {};
    // build select and options
    var html = "<select>";
    this.optionsArray[col].forEach(function(e) {
      var key = e[1] + bcdui.core.magicChar.separator + e[0];

      if (!this.distinctOptions || (this.distinctOptions && typeof distinctKeys[key] == "undefined")) {
  
        if (this.filterOptionsFunct) {
          if (usedIds.indexOf(e[1]) != -1) { // show only ids which the filter function returned
            html += "<option value='" + e[1] + "'" + (this.value == e[1] ? " selected" : "") + ">" + e[0] + "</option>";
            distinctKeys[key]=1;
          }
        }
        else if (args.filterOptions === "true") {
          if (usedIds.indexOf(e[1]) == -1 || this.value == e[1] || (e[1] == "" && args.allowEmpty === "true")) { // show only not usedIds and current value
            html += "<option value='" + e[1] + "'" + (this.value == e[1] ? " selected" : "") + ">" + e[0] + "</option>";
            distinctKeys[key]=1;
          }
        }
        else {
          html += "<option value='" + e[1] + "'" + (this.value == e[1] ? " selected" : "") + ">" + e[0] + "</option>";
          distinctKeys[key]=1;
        }
      }
    }.bind(this));
    html += "</select>"

    jQuery("#" + this.objectId).append(html);
    jQuery("#" + this.objectId + " select").val(this.value);
  };

  this.prepareLayout = function() {
    // make select as wide as cell
    var width = Handsontable.dom.outerWidth(this.TD);
    this.TEXTAREA.style.minWidth = width + 'px';
  };

  this.getValue = function() {return jQuery(this.cssPath).val();};
  this.setValue = function(value) {this.value = value;};

  // call base class
  widgetBaseEditor.prototype.prepare.apply(this, arguments);
};

/* ***************************************************************************************************************** */
/* suggest input Widget */
/* ***************************************************************************************************************** */
var bcduiSuggestInput = widgetBaseEditor.prototype.extend();
bcduiSuggestInput.prototype.prepare = function(row, col, prop, td, originalValue, cellProperties) {

  this.objectId      = "bcduiSuggestInput";
  this.cssPath       = "#" + this.objectId + " input";

  this.createWidget = function(widgetParams) {
    var args = jQuery.extend({targetHtml: this.objectId},widgetParams);
    bcdui.widgetNg.createSuggestInput(args);
  };

  this.prepareLayout = function() {
    /* nothing to do, use handsontable implementation */
  };

  // call base class
  widgetBaseEditor.prototype.prepare.apply(this, arguments);

};

/* ***************************************************************************************************************** */
/* status model editor */
/*
 * opens a modal dialog and runs a custom renderer in it. The statusModel information is stored in the grid
 * Since the statusModel is reused per row/cell, it gets cleared/replaced/modified, so do no reuse it from outside
 * Use initStatusModel function to do some initialization work on the cleared model
 * 
 * rendererId - custom renderer id with no given targetHtml each time a cell of this type is opened
 * statusModelId - writes the xml data of the given statusModel in the cell and renders (by default) a navpath separated text
 * [xmlToString] - custom function which transfers the data into a string which is rendered
 * [title] - title used for dialog box, by default it takes the column title
 * [gridModelDpId] - custom constant dataprovider which gets updated with the gridModel id
 * [gridModelRowIdDpId] - custom constant dataprovider which gets updated with the edited row id
 */
/* ***************************************************************************************************************** */

var bcduiStatusModelEditor = Handsontable.editors.BaseEditor.prototype.extend();

bcduiStatusModelEditor.prototype.prepare = function(row, col, prop, td, originalValue, cellProperties) {
  Handsontable.editors.BaseEditor.prototype.prepare.apply(this, arguments);

  // set renderer/statusModel and title based from current column
  var params = this.cellProperties.editorParameter;
  
  if (!params.statusModelId) throw new Error("statusModelId not defined");
  if (!params.rendererId) throw new Error("rendererId not defined");

  var statusModelId = params.statusModelId;
  var rendererId = params.rendererId;
  var grid = this.instance.getBCDUIGrid();
  var gridModel = grid != null ? grid.gridModel : null;
  this.title = params.title || (gridModel ? gridModel.read("/*/wrs:Header/wrs:Columns/wrs:C[@pos='" + (this.cellProperties.prop.colIdx + 1) + "']/@caption", "") : "");
  this.statusModel = bcdui.factory.objectRegistry.getObject(statusModelId);
  this.renderer = bcdui.factory.objectRegistry.getObject(rendererId);
  this.printFunct = params.xmlToString ? params.xmlToString.split(".").reduce( function( fkt, f ) { return fkt[f] }, window ) : null;

  // set gridModel and rowId to constant dataproviders if available
  var rowIdx = this.instance.toPhysicalRow(row);
  var r = this.instance.getSourceDataAtRow(rowIdx);
  if (r && gridModel != null) {
    this.rowId = r.r.getAttribute("id");
    if (params.gridModelDpId && typeof bcdui.factory.objectRegistry.getObject(params.gridModelDpId) != "undefined")
      bcdui.factory.objectRegistry.getObject(params.gridModelDpId).value = gridModel.id;
    if (params.gridModelRowIdDpId && typeof bcdui.factory.objectRegistry.getObject(params.gridModelRowIdDpId) != "undefined")
      bcdui.factory.objectRegistry.getObject(params.gridModelRowIdDpId).value = this.rowId;
  }
};

bcduiStatusModelEditor.prototype.focus = function() {/* nothing to focus but needed */}

bcduiStatusModelEditor.prototype.open = function() {

  // kill key / mouse events for handsontable
  this.instance.addHook("beforeKeyDown", this.stopEvents);
  var bcdHolder = bcdui.util.getSingletonElement("bcdSingletonHolder", true);
  jQuery(bcdHolder).on("mousedown", this.stopEvents);

  // backup NavPath and clear it to only grab the current values later on
  this.backupNavPath = bcdui.wkModels.bcdNavPath.serialize();
  bcdui.core.removeXPath(bcdui.wkModels.bcdNavPath.getData(), "/*/*");

  // remember old status data
  this.backupData = this.statusModel.serialize();

  // build up dialog
  jQuery(".bcdStatusModelEditor").remove();
  jQuery("body").append("<div style='display:none' class='bcdStatusModelEditor' title='" + this.title + "'>" +
        "<div class='bcdLoadContainer'></div>" +
        "<div class='bcdControls'>" +
          "<bcd-buttonng caption='" + bcdui.i18n.TAG + "bcd_Ctrl_Ok' onClickAction='bcduiStatusModelEditor.takeData(this)'></bcd-buttonng>" +
          "<bcd-buttonng caption='" + bcdui.i18n.TAG + "bcd_Ctrl_Clear' onClickAction='bcduiStatusModelEditor.clearData(this)'></bcd-buttonng>" +
          "<bcd-buttonng caption='" + bcdui.i18n.TAG + "bcd_Ctrl_Cancel' onClickAction='bcduiStatusModelEditor.cancelData(this)'></bcd-buttonng>" +
        "</div>" +
      "</div>");
  jQuery(".bcdStatusModelEditor").data("instance", this); // remember instance for button use

  // and set target div of the renderer
  this.renderer.setTargetHtml(jQuery(".bcdStatusModelEditor .bcdLoadContainer").get(0));

  this.renderer.onceReady(function(e) {
    // data loaded, translate and show data
    bcdui.i18n.syncTranslateHTMLElement({elementOrId: jQuery(".bcdStatusModelEditor").get(0)});
    jQuery(".bcdStatusModelEditor").show();

    // and make it a dialog
    jQuery(".bcdStatusModelEditor").dialog({closeOnEscape: false, height: "auto", width: "auto", modal: true, resizable: false, draggable: true, closeText: "\u2716", position: { my: 'center', at: 'center' }
      , create: function() { jQuery("body").css({ overflow: 'hidden' });}
      , close: function() {bcduiStatusModelEditor.cancelData(jQuery(".bcdStatusModelEditor").get(0));}
      , beforeClose: function() {jQuery("body").css({ overflow: 'inherit'});}
    });

    // kill key / mouse events for handsontable also for dialogs/overlays
    var self = this;
    jQuery(".bcdStatusModelEditor").parent().on("mousedown", self.stopEvents);
    jQuery(".ui-widget-overlay").on("mousedown", self.stopEvents);
    
  }.bind(this));

  // and finally start custom renderer
  this.renderer.execute(true);
}

bcduiStatusModelEditor.prototype.close = function() {
  // restore event handling
  this.instance.removeHook('beforeKeyDown', this.stopEvents);
  jQuery("#bcdSingletonHolder").off("mousedown");
  jQuery(".bcdStatusModelEditor").parent().off("mousedown");
  jQuery(".ui-widget-overlay").off("mousedown");

  // restore original NavPath
  bcdui.wkModels.bcdNavPath.dataDoc = bcdui.util.xml.parseDocument(this.backupNavPath);
}

bcduiStatusModelEditor.prototype.setValue = function(value) {
  if (value != "") {
    try {
      this.statusModel.dataDoc = bcdui.util.xml.parseDocument(value);
    }
    catch (e) {
      this.statusModel.dataDoc = bcdui.util.xml.parseDocument(this.statusModel.serialize());
    }
  }
  else 
    bcdui.core.removeXPath(this.statusModel.getData(), "/*/*");
}

bcduiStatusModelEditor.prototype.getValue = function() {
  return this.statusModel.serialize();
};

bcduiStatusModelEditor.prototype.stopEvents = function(event) {
  event.stopImmediatePropagation();
}

// button actions

bcduiStatusModelEditor.clearData = function(element) {
  var self = jQuery(element).closest(".bcdStatusModelEditor").data("instance");
  self.statusModel.remove("/*/*", true);
}

bcduiStatusModelEditor.cancelData = function(element) {
  var self = jQuery(element).closest(".bcdStatusModelEditor").data("instance");
  // if close is triggered from takeData, do nothing
  if (self.closeFromTakeData) {
    delete self.closeFromTakeData;
    return;
  }

  // restore old data
  self.statusModel.dataDoc = bcdui.util.xml.parseDocument(self.backupData);
  self.instance.getActiveEditor().finishEditing();
  jQuery(element).closest(".bcdStatusModelEditor").dialog("close");
}

bcduiStatusModelEditor.takeData = function(element) {
  var self = jQuery(element).closest(".bcdStatusModelEditor").data("instance");
  self.closeFromTakeData = true;

  // don't allow illegal data 
  if (jQuery(".bcdStatusModelEditor .bcdInvalid").length > 0) {
    alert(bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_ApplyDenyMessage"}));
    return false;
  }

  // generate text data for the cell and close editor 
  bcdui.widget.getLiveNavPath(function(e){
    bcdui.core.createElementWithPrototype(self.statusModel.getData(), "/*/guiStatus:StatusModelEditorCaption").text = self.printFunct ? self.printFunct(self.statusModel) : e;
    self.instance.getActiveEditor().finishEditing();
    jQuery(element).closest(".bcdStatusModelEditor").dialog("close");
  }, "", bcdui.core.magicChar.separator);
}

// renders the data in statusmodel guiStatus:StatusModelEditorCaption textnode as lis (separated via bcdui.core.magicChar.separator)
bcdui.component.grid.bcduiStatusModelRenderer = function(instance, td, row, col, prop, value, cellProperties) {
  var v = "<ul>";
  var match = value.match(/<guiStatus:StatusModelEditorCaption[ a-zA-Z\:\.\/\"0-9\-\=]*>(.*)<\/guiStatus:StatusModelEditorCaption>/);
  if (match != null && match.length > 1) {
    match[1].split(bcdui.core.magicChar.separator).forEach(function(e) {
      v += "<li>" + e + "</li>"; 
    });
  }
  v +="</ul>";
  td.innerHTML = v;

  if (cellProperties.readOnly)
    jQuery(td).addClass("htDimmed");

  return td;
};


/* ***************************************************************************************************************** */
/* Drop Down with XML Model*/
/* ***************************************************************************************************************** */
var bcduiModelDropDown= widgetBaseEditor.prototype.extend();

bcduiModelDropDown.prototype.prepare = function(row, col, prop, td, originalValue, cellProperties) {

  this.objectId = "bcduiModelDropDown";
  this.cssPath  = "#" + this.objectId + " select";
  this.value = "";

  var params = cellProperties.editorParameter;
  if (!params.objectModelId) throw new Error("objectModelId not defined");
  var objectModelId = params.objectModelId;
  this.objectModel = bcdui.factory.objectRegistry.getObject(objectModelId);
  this.optionsModelXPath = "/*/*/@caption";
  this.optionsModelRelativeValueXPath = "../@id";

  this.createWidget = function(widgetParams) {
    var args = jQuery.extend({targetHtml: this.objectId},widgetParams);

    // build up code/caption list only once (unless no gridReferences are used)
    if (typeof this.optionsArray == "undefined")
      this.optionsArray = {};

    if (this.gotGridReferences || typeof this.optionsArray[col] == "undefined") {
      this.optionsArray[col] = new Array();
      var valueXPath = this.optionsModelXPath + "/" + this.optionsModelRelativeValueXPath;
      var valueArr = jQuery.makeArray(this.objectModel.getData().selectNodes(valueXPath)).map(function(e) { return e.nodeValue || e.text; });
      var ppp=0;
      this.optionsArray[col] = jQuery.makeArray(this.objectModel.getData().selectNodes(this.optionsModelXPath)).map(function(e) { return [e.nodeValue || e.text, valueArr[ppp++]]; });
    }

    // support isSortOptions for sorting
    if (args.isSortOptions === "true") {
      this.optionsArray[col] = this.optionsArray[col].sort(function(a,b){
        return (a[0] > b[0] ? 1 : -1);
      })
    }

    // support filtered values so only not-used values are shown
    var usedIds = (args.filterOptions === "true") ? jQuery.makeArray(this.instance.getBCDUIGrid().gridModel.queryNodes("/*/wrs:Data/wrs:*[local-name()!='D']/wrs:C[position()=" + (col + 1) + "]")).map(function(e){ return e.text; }) : [];

    // build select and options
    var html = "<select>";
    this.optionsArray[col].forEach(function(e) {
      if (args.filterOptions === "true") {
        if (usedIds.indexOf(e[1]) == -1 || this.value == e[1] || (e[1] == "" && args.allowEmpty === "true")) { // show only not usedIds and current value
          html += "<option value='" + e[1] + "'" + (this.value == e[1] ? " selected" : "") + ">" + e[0] + "</option>";
        }
      }
      else
        html += "<option value='" + e[1] + "'" + (this.value == e[1] ? " selected" : "") + ">" + e[0] + "</option>"; 
    }.bind(this));
    html += "</select>"

    jQuery("#" + this.objectId).append(html);
    jQuery("#" + this.objectId + " select").val(this.value);
  };

  this.prepareLayout = function() {
    // make select as wide as cell
    var width = Handsontable.dom.outerWidth(this.TD);
    this.TEXTAREA.style.minWidth = width + 'px';
  };

  this.getValue = function() {
    var node = this.objectModel.query("/*/*[@id='" + jQuery(this.cssPath).val() + "']");
    if (node != null)
      return new XMLSerializer().serializeToString(node);
    else
      return "<Empty/>";
  };
  this.setValue = function(value) {
    if (value != "") {
      try {
        var dataDoc = bcdui.util.xml.parseDocument(value);
        var id = dataDoc.selectSingleNode("/*/@id");
        id = id != null ? id.text : "";
        if (id != "")
          this.value = id;        
      }
      catch (e) { }
    }
  };

  // call base class
  widgetBaseEditor.prototype.prepare.apply(this, arguments);
};

bcdui.component.grid.bcduiModelDropDownRenderer = function(instance, td, row, col, prop, value, cellProperties) {
  var v = "";
  var match = value.match(/ caption=\"([^\"]*)\"| caption=\'([^\']*)\'/);
  if (match != null && match.length > 1) {
    v += match[1]; 
  }
  td.innerHTML = v;
  
  if (cellProperties.readOnly)
    jQuery(td).addClass("htDimmed");
  
  return td;
};
