"use strict";

  /* User Messages Editor */
jQuery.extend(bcdui.widget, {
  
  messagesEditor : function(args) {

    args.targetHtml = args.targetHTMLElementId = bcdui.util._getTargetHtml(args, "messages_");

    // referenced editor in grid needs a fixed renderer id
    // renderer renders the ckEditor/textarea and the buttons 
    bcdui.factory.objectRegistry.deRegisterObject("bcdHtmlEditorRenderer");
    new bcdui.core.Renderer({ id: "bcdHtmlEditorRenderer", chain: bcdui.contextPath + "/bcdui/js/widget/messages/render.xslt" });

    // the grid
    new bcdui.component.grid.Grid({
      targetHtml: "#" + args.targetHtml
    , config: new bcdui.core.SimpleModel({url: bcdui.contextPath+"/bcdui/js/widget/messages/gridConfiguration.xml"})
    // let's have text instead of html for message tooltip (default tooltip takes @mappedCaption as an optional overwrite)
    , tooltipChain: [function(doc, args) {
      if (args.bcdColIdent == "message") {
        const grid = bcdui.factory.objectRegistry.getObject(args.gridInstanceId);
        if (grid) {
          // extract pure html bcdBody part, convert it to text and limit it to 60 chars
          const index = grid.wrsHeaderMeta[args.bcdColIdent].pos;
          const value = grid.gridModel.read("/*/wrs:Data/wrs:M[@id='" + args.bcdRowIdent + "']/wrs:O[position()='" + index + "']");
          let txt = "";
          const match = bcdui.component.grid.GridEditor.bcduiHtmlEditor.getRegEx().exec(value);
          if (match)
            txt = jQuery("<div>" + match[1] + "</div>").text().substring(0, 60);
          doc.selectSingleNode("/*/wrs:Data").setAttribute("mappedCaption", txt.length == 60 ? txt + "..." : txt);
        }
      }
      return doc;
    }, bcdui.contextPath+"/bcdui/js/component/grid/gridTooltip.xslt"]

    // basic validation for validTo > validFrom
    , validationChain: function(doc, args) {
        const validFromIdx = args.bcdGridModel.selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C[@id='valid_from']/@pos").text;
        const validToIdx = args.bcdGridModel.selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C[@id='valid_to']/@pos").text;
        jQuery.makeArray(args.bcdGridModel.selectNodes("/*/wrs:Data/wrs:*/wrs:C["+validToIdx+"]")).forEach(function(e) {
          const validFrom = e.selectSingleNode("../wrs:C["+validFromIdx+"]").text;
          const validTo = e.text;
          if (validFrom && validTo && validFrom > validTo) {
            bcdui.core.createElementWithPrototype(doc, "/*/wrs:Wrs/wrs:Data/wrs:R[wrs:C[1]='" + e.parentNode.getAttribute("id") + "' and wrs:C[2]='valid_from' and wrs:C[3]='Range Error']");
            bcdui.core.createElementWithPrototype(doc, "/*/wrs:Wrs/wrs:Data/wrs:R[wrs:C[1]='" + e.parentNode.getAttribute("id") + "' and wrs:C[2]='valid_to' and wrs:C[3]='Range Error']");
          }
        });
        return doc;
      }.bind(this)

      // prefill new rows with hidden id, information severity and current date as valid from
      , afterAddRow: function(args) {
          args.rowNode.selectSingleNode("wrs:C[" + args.headerMeta.message_id.pos +"]").text = bcdui.util.getUuid();
          args.rowNode.selectSingleNode("wrs:C[" + args.headerMeta.severity.pos +"]").text = "3";
          args.rowNode.selectSingleNode("wrs:C[" + args.headerMeta.valid_from.pos +"]").text = new Date().toISOString().substring(0,10);
        }

      // exchange validFrom with validTo if validTo is < validFrom
      , hotArgs: {
        afterChange: function(changes, source) {
          if (source != "edit" && source != "CopyPaste.paste")
            return;
          const validFromIdx = parseInt(this.wrsHeaderMeta["valid_from"].pos, 10);
          const validToIdx = parseInt(this.wrsHeaderMeta["valid_to"].pos, 10);
          changes.forEach(function(e) {
            if (e[1].prop == "valid_from" || e[1].prop == "valid_to") {
              const validFrom = this.hotInstance.getDataAtCell(e[0], validFromIdx - 1);
              const validTo = this.hotInstance.getDataAtCell(e[0], validToIdx - 1);
              if (validFrom && validTo && validFrom > validTo) {
                this.hotInstance.setDataAtCell(e[0], validFromIdx - 1, validTo);
                this.hotInstance.setDataAtCell(e[0], validToIdx - 1, validFrom);
              }
            }
          }.bind(this))
        }
      }
    });
  }
});
