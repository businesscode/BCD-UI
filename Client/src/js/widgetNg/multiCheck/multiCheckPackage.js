/*
  Copyright 2010-2023 BusinessCode GmbH, Germany

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

(function(){
  jQuery.widget("bcdui.bcduiMultiCheckNg", jQuery.bcdui.bcduiWidget,
    /** @lends bcdui.bcduiMultiCheckNg */
  {
    _getCreateOptions : function(){
      return bcdui.widgetNg.impl.readParams.multiCheck(this.element[0]);
    },

    _validateOptions : function(){
      bcdui.widgetNg.impl.validateParams.multiCheck(this.options);
    },

    _create : function(){
      this._super();
      bcdui.log.isTraceEnabled() && bcdui.log.trace("creating multiCheck widget with config ");

      // avoid rendering while attaching children
      this.element.hide();
      
      this.switchTargetModelXPath = "/*/guiStatus:ClientSettings/guiStatus:MultiCheck[@id=\"" + this.options.id + "\"]/guiStatus:ShowEnabledOnly";
      
      this.i18nPleaseSelect = bcdui.util.escapeHtml(bcdui.i18n.syncTranslateFormatMessage({msgid: "bcd_singleSelect_please_select"}) || "Please select...");
      this.i18nPleaseType = bcdui.util.escapeHtml(bcdui.i18n.syncTranslateFormatMessage({msgid: "bcd_chipsChooser_please_type"}) || "Please start typing...");
      this.i18nSelectAll = bcdui.util.escapeHtml(bcdui.i18n.syncTranslateFormatMessage({msgid: "bcd_widget_multiCheck_selectAll"}) || "Check All");
      this.i18nClearAll = bcdui.util.escapeHtml(bcdui.i18n.syncTranslateFormatMessage({msgid: "bcd_widget_multiCheck_clearAll"}) || "Uncheck All");
      this.i18nSelectVisible = bcdui.util.escapeHtml(bcdui.i18n.syncTranslateFormatMessage({msgid: "bcd_widget_multiCheck_selectVisible"}) || "Check Shown");
      this.i18nClearVisible = bcdui.util.escapeHtml(bcdui.i18n.syncTranslateFormatMessage({msgid: "bcd_widget_multiCheck_clearVisible"}) || "Uncheck Shown");
      this.i18nShowSelectedOnly = bcdui.util.escapeHtml(bcdui.i18n.syncTranslateFormatMessage({msgid: "bcd_widget_multiCheck_showSelectedOnly"}) || "Show selected only");

      let multiCheckBox = this._createMultiCheckBox();

      const optionsConfig = bcdui.factory._extractXPathAndModelId(this.options.optionsModelXPath);
      const targetConfig = bcdui.factory._extractXPathAndModelId(this.options.targetModelXPath);
      this.config = {
        targetModelXPath: targetConfig.xPath
      , instance: this
      , optionsModelXPath: optionsConfig.xPath
      , optionsModelRelativeValueXPath: this.options.optionsModelRelativeValueXPath
      , optionsModelRelativeParentXPath: this.options.optionsModelRelativeParentXPath
      };

      this.element.data("_config_", this.config);
      
      this.options.wildcard = this.options.wildcard || "startswith";
      this.keypressSelector = this.options.wildcard == "startswith" ? "^=" : this.options.wildcard == "contains" ? "*=" : "$=";

      // handle label creation after appending control
      this._createLabel(multiCheckBox.attr("id"));

      // attach to DOM
      this.element.append(multiCheckBox);

      bcdui.wkModels.guiStatus.onChange(function() {
        if (this.config.instance.internalSwitch)
          delete this.config.instance.internalSwitch;
        else {
          const targetHtml = jQuery(this.options.targetHtml);
          targetHtml.find(".bcdSearch input").val("");
          const allItems = targetHtml.find(".bcdItems").find("[bcdLoCase]");
          allItems.removeClass("bcdHideItem bcdShowItem");
          allItems.parent().removeClass("bcdHideParent");
          
          const enable = bcdui.wkModels.guiStatus.read(this.switchTargetModelXPath, "0") == "1";
          if (enable) {
            const selectedItems = Array.from(targetHtml.find(".bcdItems").find("input:checked")).map(function(e) { return jQuery(e).parent().attr("bcdloCase"); });
            targetHtml.find(".bcdItems").find("[bcdLoCase]").each(function(i, e) {
              jQuery(e).addClass(selectedItems.indexOf(jQuery(e).attr("bcdLoCase")) == -1 ? "bcdHideItem" : "bcdShowItem");
            });
            targetHtml.find(".bcdItems").find(".bcdParent").each(function(i, e) {
              if (jQuery(e).find(".bcdShowItem").length == 0) {
                jQuery(e).addClass("bcdHideParent");
              }
            });
          }
        }
      }.bind(this), this.switchTargetModelXPath);

      // fill if target and options are ready
      const dphOption = new bcdui.core.DataProviderHolder();
      const dphTarget = new bcdui.core.DataProviderHolder();

      bcdui.factory.objectRegistry.withReadyObjects([dphOption, dphTarget], function() {
        this._fillMultiCheckBox(this.config);
      }.bind(this));

      // initial rendering
      bcdui.factory.objectRegistry.withReadyObjects(optionsConfig.modelId, function() {

        this.config.optionsModel = bcdui.factory.objectRegistry.getObject(optionsConfig.modelId);

        dphOption.setSource(new bcdui.core.StaticModel("<Empty/>"));

        // listen on optionsModel changes      
        this.config.optionsModel.onChange(function() {
          // reset hide/show part
          jQuery(this.options.targetHtml).find(".bcdHeader  i").removeClass("bcdUp").addClass("bcdDown");
          jQuery(this.options.targetHtml).find(".bcdLower").hide();
          // and rebuild inner part 
          this._fillMultiCheckBox(this.config);
        }.bind(this));

      }.bind(this));

      // add change handler which detects clicks on input fields
      bcdui.factory.objectRegistry.withReadyObjects(targetConfig.modelId, function() {

        this.config.targetModel = bcdui.factory.objectRegistry.getObject(targetConfig.modelId);

        dphTarget.setSource(new bcdui.core.StaticModel("<Empty/>"));

        // listen on external targetModel changes
        this.config.targetModel.onChange(
          function() {
            if (this.config.instance.internal)
              delete this.config.instance.internal;
            else {
              const available = Array.from(this.config.targetModel.queryNodes(this.config.targetModelXPath)).map(function(e) { return e.text; });
              Array.from(jQuery(this.options.targetHtml).find(".bcdItems input")).forEach(function(item) {
                const ticked = (available.indexOf(this.sortedOptions[item.getAttribute("id").split("_")[1]].id) != -1);
                item.checked = ticked;
              }.bind(this));
              bcdui.widgetNg.multiCheck._update(this.options.targetHtml)
            }
          }.bind(this)
          , this.config.targetModelXPath);

        // readd events
        this.element.off("click");
        this.element.on("click", ".bcdHeader", function(event) {
          jQuery(event.target).closest(".bcdMultiCheck").find(".bcdHeader i").toggleClass("bcdUp bcdDown");
          jQuery(event.target).closest(".bcdMultiCheck").find(".bcdLower").toggle(); 
        });
        this.element.find(".bcdSearch").off("click");
        this.element.find(".bcdSearch").on("click", ".bcdClear", function(event) {
          jQuery(event.target).parent().find("input").val("");
          setTimeout(markItem);
        });

        const self = this;

        this.element.find(".bcdItems").off("click");
        this.element.find(".bcdItems").on("click", "input:visible", function(event) {
          const targetHtml = jQuery(event.target).closest(".bcdMultiCheck").parent();
          if (! event.ctrlKey)
            jQuery(event.target).closest("li").find("ul").find("input:visible").prop('checked', event.target.checked);
          self.internal = true;
          bcdui.widgetNg.multiCheck._update(targetHtml);
        });
        
        const targetHtml = jQuery(this.element);

        let hideTimeout = null;
        targetHtml.off("mouseenter");
        targetHtml.on("mouseenter", function() {
          if (hideTimeout != null) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
          }
        });
        targetHtml.off("mouseleave");
        targetHtml.on("mouseleave", function() {
          if (hideTimeout != null)
            clearTimeout(hideTimeout);
          hideTimeout = setTimeout(function() {
            jQuery(this.options.targetHtml).find(".bcdHeader i").removeClass("bcdUp").addClass("bcdDown");
            jQuery(this.options.targetHtml).find(".bcdLower").hide();
          }.bind(this), 1000);
        }.bind(this));
        
        
        const inputField = targetHtml.find(".bcdSearch input");
        inputField.off("keypress");
        inputField.keydown(function(event) {
          // DEL and BACKSPACE should also update the keypress functionality
          if (event.keyCode == 8 || event.keyCode == 46)
            setTimeout(markItem);
          if (event.keyCode == 27) {
            inputField.val("");
            setTimeout(markItem);
          }
        });

        const markItem = function() {
          if (bcdui.wkModels.guiStatus.read(this.switchTargetModelXPath, "0") == "1") {
            this.internalSwitch = true;
            bcdui.wkModels.guiStatus.write(this.switchTargetModelXPath, "0", true);
          }
          const iValue = inputField.val().toLowerCase().trim();
          const allItems = targetHtml.find(".bcdItems").find("[bcdLoCase]");
          allItems.removeClass("bcdHideItem bcdShowItem");
          allItems.parent().removeClass("bcdHideParent");
          const selectedItems = Array.from(targetHtml.find(".bcdItems").find("[bcdLoCase" + self.keypressSelector + "'" + iValue.replace(/&#39;/g, "'").replace(/'/g, "\uE0F0") + "']")).map(function(e) { return jQuery(e).attr("bcdloCase"); });
          if (selectedItems.length > 0 || iValue.length > 0) {
            targetHtml.find(".bcdItems").find("[bcdLoCase]").each(function(i, e) {
              jQuery(e).addClass(selectedItems.indexOf(jQuery(e).attr("bcdLoCase")) == -1 ? "bcdHideItem" : "bcdShowItem");
            });
          }
          targetHtml.find(".bcdItems").find(".bcdParent").each(function(i, e) {
            if (jQuery(e).find(".bcdShowItem").length == 0) {
              jQuery(e).addClass("bcdHideParent");
            }
          });
        }.bind(this);

        inputField.keypress(function() { setTimeout(markItem); });

        // finally show constructed container
        this.element.show();

      // set autofocus after display
      if(this.options.autofocus)
        this.element.focus();

      }.bind(this));
    },
    
    /**
     * @private
     */
    _fillMultiCheckBox: function(config){
      jQuery(this.options.targetHtml).find(".bcdItems").empty();

      // get data from optionsModel
      const available = Array.from(this.config.targetModel.queryNodes(this.config.targetModelXPath)).map(function(e) { return e.text; });
      const ids = [];
      this.sortedOptions = Array.from(this.config.optionsModel.queryNodes(config.optionsModelXPath)).map(function(node) {
        const caption = node.nodeValue || node.text;
        let parent = config.optionsModelRelativeParentXPath ? node.selectSingleNode(config.optionsModelRelativeParentXPath) : null;
        let value = config.optionsModelRelativeValueXPath ? node.selectSingleNode(config.optionsModelRelativeValueXPath) : null;
        value = (value != null)
          ? value.nodeValue || value.text
          : caption;
        ids.push(value);
        return { id: value, caption: bcdui.util.escapeHtml(caption), parentId: parent != null ? parent.text : "", selected: available.indexOf(value) != -1 };
      }).map(function(e) {
          // set childs with not exsiting parents to root
          if (ids.indexOf(e.parentId) == -1)
            e.parentId = "";
          return e;
      });

      // optionally sort it by caption
      if (this.options.doSortOptions) {
        this.sortedOptions.sort(function(a,b){
          const x = a.caption.toLowerCase()
          const y = b.caption.toLowerCase();
          return x < y ? -1 : x > y ? 1 : 0;
        });
      }

      // remember index in sortedOptions for later lookup in multiCheck 
      this.sortedOptions.forEach(function(e,i ) {e.index = i; });

      // function to build up a multiCheck tree on the data array
      const buildMultiCheck = function(data) {
        let multiCheck = [];
        let parents = {};
        data.forEach(function(item) {
          parents[item.id] = parents[item.id] || [];
          item["childs"] = parents[item.id];
          item.parentId ? (parents[item.parentId] = parents[item.parentId] || []).push(item) : multiCheck.push(item);
        });
        return multiCheck;
      };

      // renders a single tree item plus all its children as li/ul
      const renderTree = function(item, id) {
        const curId = id + "_" + item.index;
        const checked = item.selected ? " checked " : "";
        const itemHtml = "<span bcdLoCase='"+item.caption.toLowerCase().replace(/&#39;/g, "'").replace(/'/g, "\uE0F0")+"'><input type='checkbox' id='"+curId+"'"+checked+"><label for='"+curId+"'>" + item.caption + "</label></span>";
        let childHtml = "<ul>";
        item.childs.forEach(function(child) {
          childHtml += renderTree(child, id);
        });
        childHtml += "</ul>";
        const childClass = item.childs.length > 0 ? " class='bcdParent'" : "";
        return "<li"+childClass+">" + (item.childs.length > 0 ? itemHtml + childHtml : itemHtml) + "</li>";
      };

      // render the tree
      let html = "<ul>";
      const id = bcdui.factory.objectRegistry.generateTemporaryIdInScope("cb");
      buildMultiCheck(this.sortedOptions).forEach(function(item) { html += renderTree(item, id); });
      html += "</ul>";
      jQuery(this.options.targetHtml).find(".bcdItems").append(html);

      // initially update XML
      bcdui.widgetNg.multiCheck._update(this.options.targetHtml);
    },

    /**
     * @private
     */
    _createMultiCheckBox: function(){
      const header = "<div class='bcdHeader form-control'><span class='bcdCount'></span><i class='bcdDown'></i></i></div>";
      const search = "<div class='bcdSearch'><span class='bcdSearchCount'><input placeholder='"+this.i18nPleaseType+"' class='form-control' type='text'></input></span><i class='bcdClear'></i><i class='bcdFind'></i></div>";
      const footer = "<div class='bcdFooter'><bcd-checkboxNg label='"+this.i18nShowSelectedOnly+"' targetModelXPath='"+this.switchTargetModelXPath+"' skin='switch'></bcd-checkboxNg><bcd-buttonNg caption='"+this.i18nSelectVisible+"' onClickAction='bcdui.widgetNg.multiCheck._tick(this, true, false)'></bcd-buttonNg><bcd-buttonNg caption='"+this.i18nClearVisible+"' onClickAction='bcdui.widgetNg.multiCheck._tick(this, false, false)'></bcd-buttonNg><bcd-buttonNg caption='"+this.i18nSelectAll+"' onClickAction='bcdui.widgetNg.multiCheck._tick(this, true, true)'></bcd-buttonNg><bcd-buttonNg caption='"+this.i18nClearAll+"' onClickAction='bcdui.widgetNg.multiCheck._tick(this, false, true)'></bcd-buttonNg><span></div>";
      return jQuery("<div class='bcdMultiCheck'" + (this.options.disabled ? " disabled" : "") + " tabindex='" + (this.options.tabIndex ? this.options.tabIndex : "1") + "' id='multiCheck_" + this.options.id + "'>"+header+"<div style='display:none' class='bcdLower form-control'>"+search+"<div class='bcdItems'></div>"+footer+"</div></div>");
    },

    /**
     * @private
     */
    _destroy: function() {
      this._super();
      this.element.off().data("_config_", null);
    }
  });
}());

/**
 * A namespace for the BCD-UI multiCheckNg widget.
 * @namespace bcdui.widgetNg.multiCheck
 * @private
 */
bcdui.widgetNg.multiCheck = Object.assign(bcdui.widgetNg.multiCheck,
/** @lends bcdui.widgetNg.multiCheck */
{
  /**
   * @private
   */
  init: function(htmlElement){
    bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui multiCheck widget adapter init");
    jQuery(htmlElement).bcduiMultiCheckNg();
  },
  
  /**
   * @private
   */
  _tick: function(htmlElement, enable, all) {
    const targetHtml = jQuery(htmlElement).closest(".bcdMultiCheck").parent();
    const config = targetHtml.data("_config_");
    
    if (all) {
      jQuery(targetHtml).find(".bcdItems input").prop('checked', enable);
      const allItems = targetHtml.find(".bcdItems").find("[bcdLoCase]");
      targetHtml.find(".bcdSearch input").val("");
      allItems.removeClass("bcdHideItem bcdShowItem");
      allItems.parent().removeClass("bcdHideParent");
      bcdui.wkModels.guiStatus.write(config.instance.switchTargetModelXPath, "0", true);
    }
    else
      jQuery(targetHtml).find(".bcdItems input:visible").prop('checked', enable);

    bcdui.widgetNg.multiCheck._update(targetHtml);
  },

  /**
   * @private
   */
  _update: function(targetHtml) {
    const config = jQuery(targetHtml).data("_config_");

    let firstThree = [];    
    const tickedValues = Array.from(jQuery(targetHtml).find(".bcdItems input")).filter(function(item) { return item.checked; }).map(function(item, i) {
      const dataItem = config.instance.sortedOptions[item.getAttribute("id").split("_")[1]];
      if (i < 3)
        firstThree.push(bcdui.util.unescapeHtml(dataItem.caption));
      return dataItem.id;
    });

    let count = firstThree.join(", ") + (tickedValues.length > 3 ? " (+" + (tickedValues.length - 3) + ")" : "");
    count = tickedValues.length == 0 ? config.instance.i18nPleaseSelect : count;

    jQuery(targetHtml).find(".bcdCount").text(count);

    bcdui.core._syncMultipleValues(config.targetModel.getData(), config.targetModelXPath, tickedValues);
    config.targetModel.fire();
  }
});
