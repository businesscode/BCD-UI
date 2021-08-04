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
      
      var finalBRefs = "comment_text lastUpdate updatedBy" + (this.options.addBRefs ? " " + this.options.addBRefs : "");
      finalBRefs = finalBRefs.split(" ").filter(function(e) { return e != "" && e != "scope"  && e != "instance"; });
      finalBRefs = finalBRefs.filter(function(e, idx){return finalBRefs.indexOf(e) == idx}); // make unique

      // our config holds sope, instance and the actual data model
      var config = {
        scope: this.options.scope, instance: this.options.instance, onBeforeSave: this.options.onBeforeSave,
        commentModel: new bcdui.core.AutoModel({ 
          bindingSetId: "bcd_comment"
        , bRefs: finalBRefs.join(" ")
        , filterElement: bcdui.util.xml.parseFilterExpression("scope='"+this.options.scope+"' and instance='"+this.options.instance+"'")
        , orderByBRefs: "lastUpdate-"
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
      this.element.on("click", ".edit", function() { jQuery(this).parent().next().toggle(); });
      this.element.on("click", ".bcdButton", function(){

        // show/hide input field row
        jQuery(this).closest(".bcdComment").find(".addRow").toggle();
        var conf = jQuery(this).closest(".bcdComment").parent().data("_config_");
        var value = jQuery(this).closest(".bcdComment").find("input").val() || "";
        var model = conf.commentModel;

        // add scope and instance columns in header and add a new prefilled row
        if (conf && model && value) {

          // remove entered value
          jQuery(this).closest(".bcdComment").find("input").val("");

          var lastPos = model.queryNodes("/*/wrs:Header/wrs:Columns/wrs:C").length + 1;
          bcdui.core.createElementWithPrototype(model.getData(), "/*/wrs:Header/wrs:Columns/wrs:C[@id='scope' and @pos='"+lastPos+"' and @nullable='1' and @type-name='VARCHAR']");
          bcdui.core.createElementWithPrototype(model.getData(), "/*/wrs:Header/wrs:Columns/wrs:C[@id='instance' and @pos='"+(lastPos + 1)+"' and @nullable='1' and @type-name='VARCHAR']");

          bcdui.wrs.wrsUtil.insertRow({model: model, propagateUpdate: false, rowStartPos:1, rowEndPos:1, insertBeforeSelection: true, setDefaultValue: false, fn: function(){
            bcdui.wrs.wrsUtil.setCellValue(model, 1, "comment_text", value);
            bcdui.wrs.wrsUtil.setCellValue(model, 1, "scope", conf.scope);
            bcdui.wrs.wrsUtil.setCellValue(model, 1, "instance", conf.instance);

            // undo changes in case onBeforeSave is specified and returns false 
            if (config.onBeforeSave && typeof config.onBeforeSave == "function")
              if (! config.onBeforeSave(model)) {
                model.execute(true);
                return;
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
          var comment_text_idx = config.commentModel.read("/*/wrs:Header/wrs:Columns/wrs:C[@id='comment_text']/@pos", "");
          var lastUpdate_idx = config.commentModel.read("/*/wrs:Header/wrs:Columns/wrs:C[@id='lastUpdate']/@pos", "");
          var updatedBy_idx = config.commentModel.read("/*/wrs:Header/wrs:Columns/wrs:C[@id='updatedBy']/@pos", "");
          var rows = Array.from(doc.selectNodes("/*/wrs:Data/wrs:R"));
          if (rows.length == 0)
            jQuery("<div>"+(bcdui.i18n.syncTranslateFormatMessage({msgid: "bcd_Comment_No_Comments"}) || "No Comments")+"</div>").appendTo(this.element.find(".bcdComment .commentTable"));
          else {
            rows.forEach(function(r) {
              var comment = r.selectSingleNode("wrs:C["+comment_text_idx+"]").text;
              var lastUpdate = r.selectSingleNode("wrs:C["+lastUpdate_idx+"]").text;
              var updatedBy = r.selectSingleNode("wrs:C["+updatedBy_idx+"]").text;
              jQuery("<div class='commentContainer'><div class='row head'><div class='col icon ts'>" + lastUpdate + "</div><div class='col icon user'>" + updatedBy + "</div></div><div class='row body'><div class='col'>" + comment + "</div></div></div>").appendTo(this.element.find(".bcdComment .commentTable"));
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
        this.element.find(".addRow").hide();
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
      var add = opts.readonly ? "" : "<div class='row titleRow'><div class='col'>"+title+"</div><div title='"+addTxt+"'class='col icon edit'></div></div><div class='row addRow'><div class='col'><input class='form-control' maxlength='256' placeholder='"+placeholder+"'></input></div><div class='col add'><span class='bcdButton'><a>" + addTxt + "</a></span></div></div>";
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
