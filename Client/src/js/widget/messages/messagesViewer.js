"use strict";

  /* User Messages Viewer */
jQuery.extend(bcdui.widget, {

  messagesViewer : function() {

    // get the current active data
    const data = new bcdui.core.AutoModel({bRefs: "severity message lastUpdate", bindingSetId: "bcd_messages", filterElement: bcdui.wrs.wrsUtil.parseFilterExpression("is_valid = '1'"), orderByBRefs: "lastUpdate-" });

    data.onceReady(function() {

      // build up array with cleaned up messsage html, severity (used for title) and last update
      const severityIdx = data.getData().selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C[@id='severity']/@pos").text;
      const messageIdx = data.getData().selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C[@id='message']/@pos").text;
      const lastUpdateIdx = data.getData().selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C[@id='lastUpdate']/@pos").text;
      let maxLastUpdate = "";
      let messages = [];
      Array.from(data.getData().selectNodes("/*/wrs:Data/wrs:R")).forEach(function(row) {
        const severity = row.selectSingleNode("wrs:C["+severityIdx+"]").text;
        const message = row.selectSingleNode("wrs:C["+messageIdx+"]").text;
        const lastUpdate = row.selectSingleNode("wrs:C["+lastUpdateIdx+"]").text;
        const title = data.getData().selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C["+severityIdx+"]//wrs:Data/wrs:R[wrs:C[position()=2 and .='"+severity+"']]/wrs:C[1]").text;
        const match = new RegExp(/<div id='bcdBody'>(.*)<\!\-\- end \-\->/g).exec(message);
        if (match) {
          messages.push({title: title, severity: severity, message: match[1], lastUpdate: lastUpdate});
          if (maxLastUpdate < lastUpdate) {
            maxLastUpdate = lastUpdate;
          }
        }
      });

      // use subjectPreferences to see if messages were hidden already. If not, check if there is an update in the loaded data, so you need to reshow them
      if ("true" != (bcdui.config.clientRights.MessagesHide || "") || maxLastUpdate > (bcdui.config.clientRights.MessagesTimeStamp || "")) {

        // we show user messages, only up to the stored MessagesTimeStamp, so if an update is done, you won't see the ones which you've closed before
        if ((bcdui.config.clientRights.MessagesTimeStamp || "")) {
          messages = messages.filter(function(e) {
            return e.lastUpdate >= maxLastUpdate;
          });
        }

        // we have something to show..
        if (messages.length > 0) {

          // (re)set SubjectPreferences
          bcdui.util.setSubjectPreference("bcdClient:MessagesHide", "false");

          // show popup message
          jQuery(".bcdHtmlViewer").closest(".ui-dialog").remove();
          const nextCaption = bcdui.util.escapeHtml(bcdui.i18n.syncTranslateFormatMessage({msgid: "bcd_Messages_Next"}) || "Next");
          const prevCaption = bcdui.util.escapeHtml(bcdui.i18n.syncTranslateFormatMessage({msgid: "bcd_Messages_Prev"}) || "Prev");
          const closeCaption = bcdui.util.escapeHtml(bcdui.i18n.syncTranslateFormatMessage({msgid: "bcd_Messages_Close"}) || "Close");
          jQuery("<div title='"+messages[0].title+"'><div class='bcdHtmlViewer'>" + messages[0].message + "</div><div class='bcdHtmlViewerFooter row'><div class='col'><span class='bcdAction bcdLeft bcdButton btn-primary'><a>"+prevCaption+"</a></span><span class='bcdCount'>1/"+messages.length+"</span><span class='bcdAction bcdRight bcdButton btn-primary'><a>"+nextCaption+"</a></span></div><div class='col'><span class='bcdAction bcdClose bcdButton btn-primary'><a>"+closeCaption+"</a></div></div></div>").dialog({
              width: "auto"
            , height: "auto"
            , resizeable: false
            , closeOnEscape: false
  
            , close: function() {
                jQuery(".bcdHtmlViewerFooter").off();
                // update subjectPreferences with latest update timestamp and flag that you've closed the messages
                bcdui.util.setSubjectPreference("bcdClient:MessagesTimeStamp", maxLastUpdate);
                bcdui.util.setSubjectPreference("bcdClient:MessagesHide", "true");
              }

            , open: function() {

              // no close bar since we want to use the cancel button at the bottom
              jQuery(".bcdHtmlViewer").closest(".ui-dialog").find(".ui-dialog-titlebar-close").hide();

              // only one message?, no footer
              if (messages.length == 1) {
                jQuery(".bcdHtmlViewerFooter .bcdLeft").hide();
                jQuery(".bcdHtmlViewerFooter .bcdRight").hide();
                jQuery(".bcdHtmlViewerFooter .bcdCount").hide();
              }
              // disable prev button and close button
              else {
                jQuery(".bcdHtmlViewerFooter .bcdLeft").addClass("bcdDisabled");
                jQuery(".bcdHtmlViewerFooter .bcdClose").addClass("bcdDisabled");
              }

              // reset css for sub elements
              jQuery('.bcdHtmlViewer *').addClass('bcdCssReset');
  
              // remember messages and page information to switch between them
              jQuery(".bcdHtmlViewerFooter").data("messages", messages);
              jQuery(".bcdHtmlViewerFooter").data("page", 0);
  
              // handle prev/next message clicking
              jQuery(".bcdHtmlViewerFooter").on("click", ".bcdAction", function(event) {
  
                const target = jQuery(event.target).closest(".bcdAction");

                // no action on disabled
                if (target.hasClass("bcdDisabled"))
                  return;

                // close button simply triggers dialog close  
                if (target.hasClass("bcdClose")) {
                  jQuery(".bcdHtmlViewer").parent().dialog("close");
                  return;
                }

                // handle prev/next button clicks
                const msg = jQuery(".bcdHtmlViewerFooter").data("messages");
                let page = jQuery(".bcdHtmlViewerFooter").data("page");

                if (target.hasClass("bcdLeft"))
                  if (--page < 0) page = 0;
                if (target.hasClass("bcdRight"))
                  if (++page == msg.length) page = msg.length -1;

                // last page reached
                if (page == msg.length - 1) {
                  jQuery(".bcdHtmlViewerFooter .bcdRight").addClass("bcdDisabled");
                  jQuery(".bcdHtmlViewerFooter .bcdLeft").removeClass("bcdDisabled");
  
                  // enable close when last page was reached
                  jQuery(".bcdHtmlViewerFooter .bcdClose").removeClass("bcdDisabled");
                }
                // first page reached                
                else if (page == 0) {
                  jQuery(".bcdHtmlViewerFooter .bcdRight").removeClass("bcdDisabled");
                  jQuery(".bcdHtmlViewerFooter .bcdLeft").addClass("bcdDisabled");
                }
                // somewhere in between
                else {
                  jQuery(".bcdHtmlViewerFooter .bcdRight").removeClass("bcdDisabled");
                  jQuery(".bcdHtmlViewerFooter .bcdLeft").removeClass("bcdDisabled");
                }

                // remember current page
                jQuery(".bcdHtmlViewerFooter").data("page", page);

                // set message, current x/y page and title (based on severity)
                jQuery(".bcdHtmlViewer").html(msg[page].message);
                jQuery('.bcdHtmlViewer *').addClass('bcdCssReset');
                jQuery(".bcdHtmlViewerFooter .bcdCount").text("" + (page+1) + "/" + msg.length);
                jQuery(".bcdHtmlViewer").closest(".ui-dialog").find(".ui-dialog-title").text(msg[page].title);
              }); 
            }});
          }
        }
    });

    // force loading of data
    data.execute(true);
  }
});
