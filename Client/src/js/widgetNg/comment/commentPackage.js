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

(function(){
  jQuery.widget("bcdui.bcduiCommentNg", jQuery.bcdui.bcduiWidget,
    /** @lends bcdui.bcduiCommentNg */
  {

    _getCreateOptions : function(){
      return bcdui.widgetNg.impl.readParams.comment(this.element[0]);
    },

    _validateOptions : function(){
      bcdui.widgetNg.impl.validateParams.comment(this.options);
    },

    _create : function(){
      this._super();
      bcdui.log.isTraceEnabled() && bcdui.log.trace("creating comment widget with config ");

      // avoid rendering while attaching children
      this.element.hide();

      var commentBox = this._createCommentBox();
      
      var finalBRefs = "comment_text bcdUpdateStamp bcdUpdateBy instance scope" + (this.options.addBRefs ? " " + this.options.addBRefs : "");
      finalBRefs = finalBRefs.split(" ").filter(function(e) { return e != ""; });
      finalBRefs = finalBRefs.filter(function(e, idx){return finalBRefs.indexOf(e) == idx}); // make unique

      this._renderCell = function(row, meta, rowData) {
        return jQuery("<div class='commentContainer'><div class='row head'><div class='col icon ts'>" + rowData["bcdUpdateStamp"] + "</div><div class='col icon user'>" + rowData["bcdUpdateBy"] + "</div></div><div class='row body'><div class='col'>" + rowData["comment_text"] + "</div></div></div>");
      };

      this._updateRow =  function(keyColumn, keyValue, value) {
        var conf = jQuery(this.element).data("_config_");
        var model = new bcdui.core.StaticModel(new XMLSerializer().serializeToString(conf.commentModel.getData()));
        model.execute();

        if (conf.excludeBRefs.length > 0)
          bcdui.wrs.wrsUtil.deleteColumns(model, conf.excludeBRefs);
        
        const keyPos = model.read("/*/wrs:Header/wrs:Columns/wrs:C[@isKey='true' and @id='"+keyColumn + "']/@pos", "");
        if (!keyPos)
          throw new Error("missing key column: " + keyColumn);

        bcdui.core.removeXPath(model.getData(), "/*/wrs:Data/wrs:*[wrs:C[position()="+keyPos+" and .!= '"+keyValue+ "']]", false);
        const row = model.queryNodes("/*/wrs:Data/wrs:*");
        if (row.length != 1)
          return;
        const rowId = row[0].getAttribute("id");
        if (rowId) {
          const oldValue = (bcdui.wrs.wrsUtil.getCellValue(model, rowId, "comment_text") || "").trim();
          if (oldValue == value.trim())
            return;
          bcdui.wrs.wrsUtil.setCellValue(model, rowId, "comment_text", value.trim());
          setTimeout(function(){jQuery.blockUI({message: bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_Wait"})})});
          bcdui.wrs.wrsUtil.postWrs({
            wrsDoc: model.getData()
          , onSuccess: function() { setTimeout(jQuery.unblockUI); config.commentModel.execute(true);}
          , onFailure: function() { setTimeout(jQuery.unblockUI); config.commentModel.execute(true);}
          , onWrsValidationFailure: function() { setTimeout(jQuery.unblockUI); config.commentModel.execute(true);}
          });
        }
      };

      // our config holds sope, instance and the actual data model
      var config = {
          scope: this.options.scope
        , instance: this.options.instance
        , updateRow: this._updateRow.bind(this)
        , excludeBRefs: this.options.excludeBRefs ? this.options.excludeBRefs.split(" ") : [] 
        , onBeforeSave: this.options.onBeforeSave
        , renderComment: this.options.renderComment || this._renderCell
        , commentModel: new bcdui.core.AutoModel({ 
          bindingSetId: this.options.bindingSetId || "bcd_comment"
        , bRefs: finalBRefs.join(" ")
        , filterElement: bcdui.wrs.wrsUtil.parseFilterExpression("scope='"+this.options.scope+"' and instance='"+this.options.instance+"'")
        , orderByBRefs: this.options.orderByBRefs || "bcdUpdateStamp-"
        , filterBRefs: this.options.filterBRefs
        , saveOptions: {
          // after saving, we unblock the ui and reload the model and of course refresh the vfs
            onSuccess: function() { setTimeout(jQuery.unblockUI);}
          , onFailure: function() { setTimeout(jQuery.unblockUI);}
          , onWrsValidationFailure: function() { setTimeout(jQuery.unblockUI);}
          , reload: true
        }
      })}

      this.element.data("_config_", config);

      // handle label creation after appending control
      this._createLabel(commentBox.attr("id"));

      // attach to DOM
      this.element.append(commentBox);

      // readd events
      this.element.off("click");
      if (! this.options.alwaysShowAdd) {
        this.element.on("click", ".bcdShowAddArea", function() { jQuery(this).parent().next().toggle(); });
        jQuery(this.element).find(".bcdShowAddArea").show();
        jQuery(this.element).find(".addRow").hide();
      }
      else {
        jQuery(this.element).find(".bcdShowAddArea").hide();
        jQuery(this.element).find(".addRow").show();
      }

      const self = this;
      this.element.on("click", ".bcdAddComment", function(){

        // show/hide input field row
        if (! self.options.alwaysShowAdd)
          jQuery(this).closest(".bcdComment").find(".addRow").toggle();

        var conf = jQuery(this).closest(".bcdComment").parent().data("_config_");
        var value = jQuery(this).closest(".bcdComment").find("input").val() || "";
        var model = conf.commentModel;

        // add scope and instance columns in header and add a new prefilled row
        if (conf && model && value) {

          // remove entered value
          jQuery(this).closest(".bcdComment").find("input").val("");
          
          if (conf.excludeBRefs.length > 0)
            bcdui.wrs.wrsUtil.deleteColumns(model, conf.excludeBRefs);

          bcdui.wrs.wrsUtil.insertRow({model: model, propagateUpdate: false, rowStartPos:1, rowEndPos:1, insertBeforeSelection: true, setDefaultValue: false, fn: function(){
            bcdui.wrs.wrsUtil.setCellValue(model, 1, "comment_text", value);
            bcdui.wrs.wrsUtil.setCellValue(model, 1, "scope", conf.scope);
            bcdui.wrs.wrsUtil.setCellValue(model, 1, "instance", conf.instance);

            // undo changes in case onBeforeSave is specified and returns false 
            if (config.onBeforeSave && typeof config.onBeforeSave == "function") {
              if (! config.onBeforeSave(model)) {
                model.execute(true);
                return;
              }
            }

            setTimeout(function(){jQuery.blockUI({message: bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_Wait"})})});
            model.sendData();
          }.bind(this)});
        }
      });

      // actual renderer, render cards per entry
      var tableRenderer = new bcdui.core.Renderer({
        targetHtml: this.element.find(".bcdComment .commentTable")
      , inputModel: config.commentModel
      , chain: function(doc, args) {
          this.element.find(".bcdComment .commentTable").empty();
          let rows = Array.from(doc.selectNodes("/*/wrs:Data/wrs:R"));
          if (rows.length == 0)
            jQuery("<div class='bcdEmpty'>"+(bcdui.i18n.syncTranslateFormatMessage({msgid: "bcd_Comment_No_Comments"}) || "No Comments")+"</div>").appendTo(this.element.find(".bcdComment .commentTable"));
          else {
            let meta = bcdui.wrs.wrsUtil.generateWrsHeaderMeta(doc);
            const rowData = {}
            rows.forEach(function(r) {
              for (let col in meta)
                rowData[col] = bcdui.util.escapeHtml(r.selectSingleNode("wrs:C["+meta[col].pos+"]").text || "");
              const html = config.renderComment(r, meta, rowData);
              if (jQuery(html).length > 0)
                jQuery(html).appendTo(this.element.find(".bcdComment .commentTable"));
            }.bind(this));
          }
          return doc;
      }.bind(this)});

      // rerender when comment model was saved
      tableRenderer.onceReady(function() {
        config.commentModel.onReady(function() {
          tableRenderer.execute(true);
        }.bind(this));
      }.bind(this));

      // display constructed container
      this.element.show();

      // limit comment table's height to outer container height
      setTimeout(function() {
        var outerHeight = this.element.parent().outerHeight();
        outerHeight -= this.element.find(".titleRow").outerHeight() || 0;
        outerHeight -= this.element.find(".addRow").outerHeight() || 0;
        this.element.find(".commentTable").css("overflow", "auto");
        this.element.find(".commentTable").css("height", outerHeight + "px");
      }.bind(this));
    },
    
    _createCommentBox: function(){

      var opts = this.options;
      var caption = opts.caption || "";
      var title = caption.indexOf(bcdui.i18n.TAG) == 0 ? bcdui.i18n.syncTranslateFormatMessage({msgid:caption}) : caption;

      var rights = bcdui.config.clientRights && bcdui.config.clientRights.bcdComment ? "|" + bcdui.config.clientRights.bcdComment.join("|") + "|" : "";
      if (!(rights.indexOf("|*|") != -1 || rights.indexOf("|" + opts.scope + "|") != -1))
        opts.readonly = true;

      // outer widget container, in case of readonly, the input field is not rendered

      var placeholder = bcdui.util.escapeHtml(bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_Comment_Placeholder"}) || "Enter Comment");
      var addTxt = bcdui.util.escapeHtml(bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_Comment_Add"}) || "Add");
      var add = opts.readonly ? "" : "<div class='row titleRow'><div class='col'>"+title+"</div><div title='"+addTxt+"'class='col icon edit bcdShowAddArea'></div></div><div class='row addRow'><div class='col'><input class='form-control' maxlength='256' placeholder='"+placeholder+"'></input></div><div class='col add'><button class='bcdAddComment bcdButton btn-primary'>" + addTxt + "</button></div></div>";
      var el = jQuery("<div class='bcdComment'>"+add+"<div class='row'><div class='col commentTable'></div></div></div>");

      el.attr("id","comment_" + opts.id);
      el.find("input").attr("tabindex", opts.tabindex);
      el.find("input").attr("autofocus", opts.autofocus);
      el.find("input").attr("readonly", opts.readonly);
      if(opts.disabled){
        el.find("input").attr("disabled","disabled");
        el.find("input").addClass("bcdDisabled");
        el.find("a").attr("disabled","disabled");
        el.find("a").addClass("bcdDisabled");
      }

      return el;
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
 * A namespace for the BCD-UI pasteList widget.
 * @namespace bcdui.widgetNg.comment
 * @private
 */
bcdui.widgetNg.comment = Object.assign(bcdui.widgetNg.comment,
/** @lends bcdui.widgetNg.comment */
{
  /**
   * @private
   */
  init: function(htmlElement){
    bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui comment widget adapter init");
    jQuery(htmlElement).bcduiCommentNg();
  }
});
