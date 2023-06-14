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
  /**
   * @private
   */
  jQuery.widget("bcdui.bcduiChipsChooserNg", jQuery.bcdui.bcduiWidget, {
    EVENT: {
      SYNC_WRITE : "bcd:widget.chipsChooser.sync_write",
      SYNC_READ : "bcd:widget.chipsChooser.sync_read"
    },

    /**
     * @private
     */
    _getCreateOptions : function(){
      return bcdui.widgetNg.impl.readParams.chipsChooser(this.element[0]);
    },

    /**
     * @private
     */
    _validateOptions : function(){
      bcdui.widgetNg.impl.validateParams.chipsChooser(this.options);
    },

    /**
     * @private
     */
    _lazyGetWrq : function () {
      if (this.wrqId)
        return bcdui.factory.objectRegistry.getObject(this.wrqId);

      const wrq = new bcdui.core.AutoModel(this.autoModelParams);
      bcdui.factory.objectRegistry.registerObject(wrq);
      this.wrqId = wrq.id;
      return wrq;
    },

    /**
     * @private
     */
    _create : function() {

      // in binding mode (dynamic sql data getter), we need both bindingSetId and a bRef
      if ((this.options.bindingSetId && ! this.options.bRefs) || (! this.options.bindingSetId && this.options.bRefs))
        throw new Error("bindingSetId and bRefs has to be specified.");

      // original allowUnknownTargetValue option indicates if you can enter whatever you want, so rememeber value
      this.allowUnknownTargetValue = this.options.allowUnknownTargetValue;
      
      // wrsDelimiter is also needed locally
      this.wrsInlineValueDelim = this.options.wrsInlineValueDelim || "/";

      // default lookup
      this.options.wildcard = this.options.wildcard || "startswith";

      // we may need to preload data, so we need dpHolders for setting readiness
      // after checking target and preloading options
      const optionsModelHolder = new bcdui.core.DataProviderHolder();
      const targetModelHolder = new bcdui.core.DataProviderHolder();

      // for binding mode, we need to prepare several things
      if (this.options.bindingSetId && this.options.bRefs) {

        // a cdp holding the current input
        const keyStroke = new bcdui.core.ConstantDataProvider({ name : "keyStroke", value : "" })
        bcdui.factory.objectRegistry.registerObject(keyStroke);
        this.keyStrokeId = keyStroke.id;

        // an (initial empty) options model
        const optionsModel = new bcdui.core.StaticModel("<Empty/>");
        bcdui.factory.objectRegistry.registerObject(optionsModel);
        this.optionsModelId = optionsModel.id;

        // either we have one bRef or 2 (caption code)
        const bRefs = this.options.bRefs.split(" ");
        this.options["optionsModelXPath"] = "$" + optionsModel.id + "/*/wrs:Data/wrs:R/wrs:C[1]"
        if (bRefs.length > 1)
          this.options["optionsModelRelativeValueXPath"] = "../wrs:C[2]";
        else
          delete this.options["optionsModelRelativeValueXPath"];

        // we need to enable allowUnknownTargetValue to support server sided selection in any way for connectables
        // since as soon as you enter something new, the previously optionsModel is gone and your target values would become invalid 
        this.options["allowUnknownTargetValue"] = true;

        // we need to write captions when code/caption is used (otherwise they would get lost) 
        this.options["writeCaptions"] = typeof this.options["optionsModelRelativeValueXPath"] != "undefined";

        // building up a wrq which is later on copied into the optionsModel
        this.filterModel = new bcdui.core.StaticModel("<Filter xmlns='http://www.businesscode.de/schema/bcdui/filter-1.0.0'><f:Expression op='like' ic='true' bRef='"+bRefs[0]+"' value='*'/></Filter>");
        bcdui.factory.objectRegistry.registerObject(this.filterModel);

        // take over all options to the automodel, so you can pass through options if you like
        this.autoModelParams = this.options;

        // however, some options need to be set on chipsChooser side 
        delete this.autoModelParams["id"];
        this.autoModelParams["isAutoRefresh"] = true;
        this.autoModelParams["isDistinct"] = true;
        this.autoModelParams["orderByBRefs"] = this.options.bRefs;
        if (this.options.preload)
          delete this.autoModelParams["maxRows"];
        else
          this.autoModelParams["additionalFilterXPath"] = "$" + this.filterModel.id + "/*/f:Expression";

        // in case targetModel already holds values, we need to load the data, otherwise
        // the connectables would not accept the given value
        const targetConfig = bcdui.factory._extractXPathAndModelId(this.options.targetModelXPath);
        const targetModel = bcdui.factory.objectRegistry.getObject(targetConfig.modelId);
        const isWRS = targetConfig.xPath.indexOf("wrs:") > -1;

        // ensure readiness of target
        targetModel.onceReady(function() {

          // get 1st target and caption (if available) value
          const targetNode = targetModel.query(targetConfig.xPath);
          let targetValue = "";
          let captionAttr = "";
          if (targetNode != null) {
            targetValue = targetNode.text;

            if (!isWRS) {
              captionAttr = (targetNode.nodeType === 2)
                ? (targetNode.ownerElement || targetNode.selectSingleNode("parent::*")).getAttribute("bcdCaption") || ""
                : (targetNode.getAttribute("bcdCaption") || "");
            }
            else {
              targetValue = (targetNode.text || "").split(this.wrsInlineValueDelim);
              targetValue = targetValue.length > 0 ? targetValue [0]: "";
              captionAttr = (targetNode.getAttribute("bcdCaption") || "").split(this.wrsInlineValueDelim);
              captionAttr = captionAttr.length > 0 ? captionAttr [0]: "";
            }
          }
          
          // if we have a value, we run the query
          if (targetValue != "") {

            const iValue = captionAttr || targetValue;

            // take over first found value into keyStroke provider
            bcdui.factory.objectRegistry.getObject(this.keyStrokeId).value = iValue;

            const wrq = this._lazyGetWrq();
             wrq.onceReady(function() {
              optionsModel.dataDoc = wrq.dataDoc;
              optionsModel.fire();

              this.preloaded = true;

              // signal readiness
              optionsModelHolder.setSource(bcdui.wkModels.guiStatus);
              targetModelHolder.setSource(bcdui.wkModels.guiStatus);
            }.bind(this));

            const filterValue = this.options.wildcard == "endswith" ? "*" + iValue : this.options.wildcard == "contains" ? "*" + iValue + "*" : iValue + "*";
            this.filterModel.write("/*/f:Expression/@value", filterValue, true);
         }
          else {
            // signal readiness
            optionsModelHolder.setSource(bcdui.wkModels.guiStatus);
            targetModelHolder.setSource(bcdui.wkModels.guiStatus);
          }
        }.bind(this));
        targetModel.execute();
      }
      else {
        // signal readiness
        optionsModelHolder.setSource(bcdui.wkModels.guiStatus);
        targetModelHolder.setSource(bcdui.wkModels.guiStatus);
      }

      this._super();

      const defPlaceHolder = (this.options.bindingSetId && ! this.options.preload) ? "bcd_chipsChooser_please_type" : "bcd_singleSelect_please_select";
      const placeHolder = bcdui.i18n.syncTranslateFormatMessage({msgid: this.options.placeholder || defPlaceHolder}) || this.options.placeholder;
      const template = "<div class='bcdChipChooser' id='{{=it.id}}'><div class='bcdUpper'></div><div class='bcdMiddle'><span class='bcdDown'><input class='form-control' placeholder='"+placeHolder+"' type='text'></input></span></div><div class='bcdLowerContainer'  style='display:none'><div class='bcdLower form-control'></div></div></div>";

      // add label
      this._createLabel(this.options.id);

      // append widget
      jQuery(this.element).append( doT.template(template)({ id: this.options.id }) );

      // close drop down after a second when mouse left target
      let hideTimeout = null;

      jQuery(this.element).off("mouseenter");
      jQuery(this.element).on("mouseenter", function() {
        if (hideTimeout != null) {
          clearTimeout(hideTimeout);
          hideTimeout = null;
        }
      });
      jQuery(this.element).off("mouseleave");
      jQuery(this.element).on("mouseleave", function() {
        if (hideTimeout != null)
          clearTimeout(hideTimeout);
        hideTimeout = setTimeout(function() {
          const lowerConnectable = jQuery(this.element).find(".bcdLower .bcdConnectable");
          if (lowerConnectable.is(":visible"))
            toggleBox(true);
        }.bind(this), 1000);
      }.bind(this));

      // trigger translation
      bcdui.i18n.syncTranslateHTMLElement({elementOrId:this.element.get(0)});

      // let's map attributes
      const args = {
            autofocus: this.options.autofocus
          , disabled:  this.options.disabled
          , displayBalloon: this.options.displayBalloon
          , doSortOptions: this.options.doSortOptions || true
          , hint: this.options.hint
          , onBeforeChange: this.options.onBeforeChange
          , onChange: this.options.onChange
          , scope: this.options.id
          , showLasso: true
          , unselectAfterMove: true
          , wrsInlineValueDelim: this.options.wrsInlineValueDelim
          , disableDrag: false
          , onItemMoved: this.options.onItemMoved
          , wildcard: this.options.wildcard
          , allowUnknownTargetValue: this.options.allowUnknownTargetValue
          , writeCaptions: this.options.writeCaptions
      }
      let sourceArgs = {
          optionsModelRelativeValueXPath: this.options.optionsModelRelativeValueXPath
        , optionsModelXPath: this.options.optionsModelXPath
        , targetHtml: this.element.find(".bcdLower")
        , onSelected: function() {
            // set inputbox to selected items
            const newValue = jQuery(this.element).find(".ui-selected").find(".bcdItem").map(function() { return jQuery(this).text(); }).get().join(";");
            jQuery(this.element).closest(".bcdChipChooser").find(".bcdMiddle input").val(newValue);
          }
          , generateItemHtml: function(args1) { return "<li class='ui-selectee' bcdValue='" + args1.value + "' bcdPos='" + args1.position + "' bcdLoCase='" + args1.caption.toLowerCase().replace(/&#39;/g, "'").replace(/'/g, "\uE0F0") + "' title='" + args1.caption + "'><span class='bcdItem'>" + args1.caption + "<i class='bcdCloseItem'></i></span></li>"; }
      }
      let targetArgs = {
          targetModelXPath: this.options.targetModelXPath
        , targetHtml: this.element.find(".bcdUpper")
        , dblClick: false
        , generateItemHtml: function(args1) { return "<li class='ui-selectee' bcdValue='" + args1.value + "' bcdPos='" + args1.position + "' bcdLoCase='" + args1.caption.toLowerCase().replace(/&#39;/g, "'").replace(/'/g, "\uE0F0") + "' title='" + args1.caption + "'><span class='bcdItem'>" + args1.caption + "<i class='bcdCloseItem'></i></span></li>"; }
        , generateItemHelperHtml: function(event, item) {
            const selectedItems = this.container.children('.ui-selected').not(".ui-sortable-placeholder").add(item);
            let caption = "<ul>";
            for (let i = 0; i < selectedItems.length && i < 5; i++)
              caption += "<li><span class='bcdItem'>" + jQuery(selectedItems[i]).find(".bcdItem").text() + "</span></li>";
            if (selectedItems.length > 5)
              caption += "<li>[...]</li>";
            caption += "</ul>";
            return jQuery(caption);
        }
      }

      // split targetModelXPath to plain information for easier reuse later on
      this.targetConfig = bcdui.factory._extractXPathAndModelId(this.options.targetModelXPath);

      // jQuery wildcard selector based on the options
      this.keypressSelector = this.options.wildcard == "startswith" ? "^=" : this.options.wildcard == "contains" ? "*=" : "$=";

      // let's create the connectables when target and (preloaded) options are available
      bcdui.factory.objectRegistry.withReadyObjects([optionsModelHolder, targetModelHolder], function() {
        sourceArgs = Object.assign(sourceArgs, args);
        targetArgs = Object.assign(targetArgs, args);
        bcdui.widgetNg.createConnectable(sourceArgs);
        bcdui.widgetNg.createConnectable(targetArgs);
      });

      // clone dblclick behaviour from connectables and make it available as click on closing icon
      jQuery(this.element).find(".bcdUpper").on("click", ".bcdCloseItem", function(event) {
        const selfConnectable = jQuery(event.target).closest("ul").parent()._bcduiWidget();
        let target = jQuery("[bcdScope='" + selfConnectable.options.scope + "'].bcdDblClkTarget");
        target = target.length > 0 ? target : selfConnectable._getScopedTargetContainers();
        const from = selfConnectable.container; // we filter on li in this function, so use the outer box as 'from'
        const to = (jQuery(from).hasClass("bcdSource")) ? target.first() : selfConnectable._getScopedSourceContainer();
        selfConnectable._moveSelectedItems(from, to);
      });

      const self = this;
      const inputField = jQuery(this.element).find(".bcdMiddle input");

      const toggleBox = function(doNotClean) {
        const lowerConnectable = jQuery(self.element).find(".bcdLower .bcdConnectable");
        lowerConnectable.closest(".bcdChipChooser").find(".bcdMiddle span").toggleClass("bcdUp bcdDown");
        lowerConnectable.closest(".bcdChipChooser").find(".bcdLowerContainer").toggle();

        // clean selection if box is closed
        if (!lowerConnectable.is(":visible")) {
          if (!doNotClean) {
            inputField.val("");
            lowerConnectable.find(".ui-selected").removeClass("ui-selected");
          }
        }
        // hide empty box (or initially load data in preload mode)
        else if (lowerConnectable.find("li").length == 0) {
          if (self.options.preload) {
            if (! self.preloaded) {
              lowerConnectable.parent().append("<div class='bcdLoading'></div>");
              lowerConnectable.hide();
              lowerConnectable.closest(".bcdLowerContainer").show();
              const optionsModel = bcdui.factory.objectRegistry.getObject(self.optionsModelId);
              const wrq = self._lazyGetWrq();
              wrq.onceReady(function() {
                optionsModel.dataDoc = wrq.dataDoc;
                optionsModel.fire();
                lowerConnectable.parent().find(".bcdLoading").remove();
                lowerConnectable.show();
              });
              wrq.execute();
            }
            self.preloaded = true;
          }
          else
            toggleBox(true);
        }
      };

      jQuery(this.element).find(".bcdMiddle").on("click", toggleBox );

      if (this.optionsModelId)      
        inputField.keypress(function() { setTimeout(function() { loadData(); } )});
      else
        inputField.keypress(function() { setTimeout(function() { markItem(); } )});

      inputField.keydown(function(event) {
        const upperConnectable = jQuery(self.element).find(".bcdUpper .bcdConnectable");
        const lowerConnectable = jQuery(self.element).find(".bcdLower .bcdConnectable");

        // DEL and BACKSPACE should also update the keypress functionality
        if (event.keyCode == 8 || event.keyCode == 46)
          setTimeout(function() { self.optionsModelId ? loadData() : markItem(); });

        // ESC cleans input/selection and closes lower part
        if (event.keyCode == 27) {
          if (lowerConnectable.is(":visible"))
            toggleBox();
        }
        else if (! lowerConnectable.is(":visible"))
          toggleBox();

        // handle up/down via connectable up/down
        const newValue = lowerConnectable._bcduiWidget()._handleUpDown(lowerConnectable, event);
        if (newValue.length > 0)
          inputField.val(newValue.join(";"));

        // ENTER takes over selected one and empties input field
        if (event.keyCode == 13) {
          event.preventDefault();
          
          // optionally write unknwon target values into targetModel
          if (self.allowUnknownTargetValue && lowerConnectable.find(".ui-selected").length == 0) {
            
            const targetModel = bcdui.factory.objectRegistry.getObject(self.targetConfig.modelId);
            const value = bcdui.util.escapeHtml(inputField.val());
            const isWRS = self.targetConfig.xPath.indexOf("wrs:") > -1;
            let isDupe = isWRS
              ? (self.wrsInlineValueDelim + targetModel.read(self.targetConfig.xPath) + self.wrsInlineValueDelim).indexOf(self.wrsInlineValueDelim + value + self.wrsInlineValueDelim) != -1
              : targetModel.query(self.targetConfig.xPath + "[.='"+value+"']")!=null;

            // don't insert dupes
            if (!isDupe) {

              if (isWRS) {
                const values = targetModel.query(self.targetConfig.xPath) != null ? targetModel.read(self.targetConfig.xPath).split(self.wrsInlineValueDelim) : [];
                values.push(value);
                const captions = targetModel.query(self.targetConfig.xPath) != null ? (targetModel.query(self.targetConfig.xPath).getAttribute("bcdCaption") || "").split(self.wrsInlineValueDelim) : [];
                captions.push(value);
                const inlineValue = (values||[]).join(self.wrsInlineValueDelim);
                const wrsNode = bcdui.core.createElementWithPrototype(targetModel.getData(), self.targetConfig.xPath);
                wrsNode.text = inlineValue;
                if (self.options.writeCaptions) {
                  const inlineCaptions = (captions||[]).join(self.wrsInlineValueDelim);
                  wrsNode.setAttribute("bcdCaption", inlineCaptions);
                }
                
              }
              else {

                bcdui.core.createElementWithPrototype(targetModel.getData(), self.targetConfig.xPath + "[. = '" + bcdui.core.magicChar.separator + "']");
                const n = targetModel.query(self.targetConfig.xPath + "[. = '" + bcdui.core.magicChar.separator + "']");
                if (n.nodeType === 2) {
                  (n.ownerElement || n.selectSingleNode("parent::*")).setAttribute(n.nodeName, value);
    
                  if (self.options.writeCaptions)
                    (n.ownerElement || n.selectSingleNode("parent::*")).setAttribute("bcdCaption", value);
                }
                else {
                  n.text = values[i];
                  if (self.options.writeCaptions)
                    n.setAttribute("bcdCaption", value);
                }
              }
              targetModel.fire();
            }
          }
          // or standard move of an options item
          else
            lowerConnectable._bcduiWidget()._moveSelectedItems(lowerConnectable, upperConnectable);

          // clear input after take over
          inputField.val("");

          // hide empty box
          if (lowerConnectable.is(":visible") && lowerConnectable.find("li").length == 0)
            toggleBox(true);
        }

        // TAB takes over selected lower part if available, otherwise standard tab
        if (event.keyCode == 9) {
          const newValue = lowerConnectable.find(".ui-selected").find(".bcdItem").map(function() { return jQuery(this).text(); }).get().join(";");
          if (newValue) {
            inputField.val(newValue);
            event.preventDefault();
            return false;
          }
          return true;
        }
      });

      let timeout = null;
      const loadData = function() {

        const iValue = inputField.val().toLowerCase();
        const keyStroke = bcdui.factory.objectRegistry.getObject(self.keyStrokeId);
        const lowerConnectable = jQuery(self.element).find(".bcdLower .bcdConnectable");

        // no value, simply show the last loaded one (if available)
        if (iValue == "" || keyStroke.value == iValue)
          return markItem();

        // we started a timeout already, kill it
        if (timeout != null) {
          clearTimeout(timeout);
          timeout = null;
        }

        // avoid reload if we only limit already loaded values
        // if wrq is not yet available, ignore it for now
        const wrq = (! self.wrqId) ? null : bcdui.factory.objectRegistry.getObject(self.wrqId);
        if (keyStroke.value.length != 0 && keyStroke.value.length <= iValue.length && iValue.startsWith(keyStroke.value) && wrq && wrq.queryNodes("/*/wrs:Data/wrs:R").length < self.options.rowEnd)
          return markItem();

        const optionsModel = bcdui.factory.objectRegistry.getObject(self.optionsModelId);

        if (self.options.preload && self.preloaded)
          return markItem();

        // start a new timeout
        timeout = setTimeout(function() {
          lowerConnectable.parent().append("<div class='bcdLoading'></div>");
          lowerConnectable.hide();
          lowerConnectable.closest(".bcdLowerContainer").show();

          // take over keystroke value
          keyStroke.value = iValue;

          const wrq = self._lazyGetWrq();
          wrq.onReady({onlyFuture: true, onlyOnce: true, onSuccess: function() {
            optionsModel.dataDoc = wrq.dataDoc;
            optionsModel.fire();
            lowerConnectable.parent().find(".bcdLoading").remove();
            lowerConnectable.show();
            if (optionsModel.query("/*/wrs:Data/wrs:R") == null)
              toggleBox(true);
            setTimeout(markItem);
          }});

          const filterValue = self.options.wildcard == "endswith" ? "*" + iValue : self.options.wildcard == "contains" ? "*" + iValue + "*" : iValue + "*";
          self.filterModel.write("/*/f:Expression/@value", filterValue, true);

        }, self.options.delay || 500);
      };

      const markItem = function() {
        const lowerConnectable = jQuery(self.element).find(".bcdLower .bcdConnectable");

        // open list if it's not visible (and not empty)
        if (! lowerConnectable.is(":visible") && lowerConnectable.find("li").length > 0)
          lowerConnectable.closest(".bcdLowerContainer").show();

        const iValue = inputField.val().toLowerCase();

        // an initial SPACE in inputField does not do anything besides opening the list
        if (iValue == " ") {
          inputField.val("");
          return;
        }

        // get matching items, could be multiple separated by ;
        const inputValues = iValue.split(";");
        let lastItem = null;
        inputValues.forEach(function(inputValue, i) {
          const iv = inputValue.trim();
          if (iv) {
            
            // initially clear all selections
            if (i == 0)
              lowerConnectable.find('.ui-selected').removeClass("ui-selected");

            // get 'starts with' items
            const items = lowerConnectable.find("[bcdLoCase" + self.keypressSelector + "'" + iv.replace(/&#39;/g, "'").replace(/'/g, "\uE0F0") + "']");
            
            // we only take the first matching item and mark it
            for (let i = 0; i < items.length; i++) {
              const item = jQuery(items.get(i));
              if (! item.hasClass("ui-selected")) {
                item.addClass("ui-selected");
                lastItem = item;
                break;
              }
            }
          }
        });
        // finally, if we had marked at least one item, scroll to it
        if (lastItem) {
          const offset = lowerConnectable.children(".ui-selectee").length > 0 ? lowerConnectable.children(".ui-selectee").first().position().top : 0;
          lowerConnectable.scrollTop(jQuery(lastItem).position().top - offset - (lowerConnectable.outerHeight() / 2));
        }
        // no match, remove any selection
        else
          lowerConnectable.find(".ui-selected").removeClass("ui-selected");
      };

      if (this.options.enableNavPath) {
        bcdui.widgetNg.chipsChooser.getNavPath(this.element.id, function(id, value) {
          bcdui.widget._linkNavPath(id, value);
        }.bind(this));
      }
    },

    /**
     * @private
     */
    _destroy: function() {
      this._super();
    }
  });
}());

/**
 * A namespace for the BCD-UI chipsChooser widget. For creation @see {@link bcdui.widgetNg.createChipsChooser}
 * @namespace bcdui.widgetNg.chipsChooser
 */
bcdui.widgetNg.chipsChooser = Object.assign(bcdui.widgetNg.chipsChooser,
/** @lends bcdui.widgetNg.chipsChooser */
{
  /**
   * onBeforeChange dir attribute value, can be used to identify the direction of the item move
   * @static
   */
  CHANGE_DIRECTION : {
      SRC_TO_TARGET : bcdui.widgetNg.connectable.CHANGE_DIRECTION.SRC_TO_TARGET
    , TARGET_TO_SRC : bcdui.widgetNg.connectable.CHANGE_DIRECTION.TARGET_TO_SRC
  },

   init: function(htmlElement){
    bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui chipsChooser widget adapter init");
    jQuery(htmlElement).bcduiChipsChooserNg();
  },

  /**
   * @param {string} id targetHtml of widget
   * @param {function} callback to be called with generated caption
   * @return {string} NavPath information via callback for widget
   */
  getNavPath: function(id, callback) {
    const e = jQuery.bcdFindById(id).get(0);
    if (e) {
      bcdui.widget._getCaptionFromWidgetElement(e, function(value) {
        callback(id, value);
      });
      return;
    }
    callback(id, "");
  }

});