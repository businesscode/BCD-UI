"use strict";

/* User Messages Viewer */
jQuery.extend(bcdui.widget, {

  /**
    * @param {Object} args The parameter map contains the following properties:
    * @param {(string|bcdui.core.RequestDocumentDataProvider)} [args.url] - optionally overwrite wrs servlet for getting data
    * @param {String} [args.bindingSetId] - optionally overwrite bindingSetId
    * @param {String} [args.dataStorage] - optionally use 'localStorage' or 'sessionStorage' to use browser cache instead of SubjectPreferences cookie
    * @param {String} [args.mode] - optionally use 'icon' together with args.targetHtml to render a clickable icon, defaults to displaying new messages in a popup immediatly
    * @param {String} [args.targetHtml] - optionally use this together with args.mode='icon', is not used otherwise
    * @param {String} [args.popupOnNew] - optionally use this together with args.mode='icon' to show new messages immediatly
   */
  messagesViewer: function(args) {
    // helper functions to store and fetch data, either from subjectPreferences or from local-/sessionStorage
    const dataStorage = args && args.dataStorage || "subjectPreferences";
    const dataSetter = dataStorage == "subjectPreferences" ? function(key, value) { bcdui.util.setSubjectPreference("bcdClient:" + key, value); } :
                       dataStorage == "localStorage"       ? function(key, value) { localStorage.setItem("bcdClient:" + key, value); }
                     /*dataStorage == "sessionStorage"*/   : function(key, value) { sessionStorage.setItem("bcdClient:" + key, value); };
    const dataGetter = dataStorage == "subjectPreferences" ? function(key) { return bcdui.config.clientRights[key] || ""; } :
                       dataStorage == "localStorage"       ? function(key) { return localStorage.getItem("bcdClient:" + key) || ""; }
                     /*dataStorage == "sessionStorage"*/   : function(key) { return sessionStorage.getItem("bcdClient:" + key) || ""; };

    let icon = null;
    let targetHtml = null;
    if (args && args.targetHtml && args.mode == "icon") {
      targetHtml = $("<div style='position:relative'><div>").appendTo(args.targetHtml);
      icon = $("<i class='statusNotReady'></i>").appendTo(targetHtml);
    }

    // get the current active data
    const data = new bcdui.core.AutoModel({
      bRefs: "severity message lastUpdate",
      bindingSetId: args && args.bindingSetId || "bcd_messages",
      filterElement: bcdui.wrs.wrsUtil.parseFilterExpression("is_valid = '1'"),
      orderByBRefs: "lastUpdate-",
      url: args && args.url || bcdui.core.webRowSetServletPath
    });

    data.onceReady(function() {

      // build up array with cleaned up messsage html, severity (used for title) and last update
      const severityIdx = data.getData().selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C[@id='severity']/@pos").text;
      const messageIdx = data.getData().selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C[@id='message']/@pos").text;
      const lastUpdateIdx = data.getData().selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C[@id='lastUpdate']/@pos").text;
      let maxLastUpdate = "";
      let messagesAll = [];
      Array.from(data.getData().selectNodes("/*/wrs:Data/wrs:R")).forEach(function(row) {
        const severity = row.selectSingleNode("wrs:C[" + severityIdx + "]").text;
        const message = row.selectSingleNode("wrs:C[" + messageIdx + "]").text;
        const lastUpdate = row.selectSingleNode("wrs:C[" + lastUpdateIdx + "]").text;
        const title = data.getData().selectSingleNode("/*/wrs:Header/wrs:Columns/wrs:C[" + severityIdx + "]//wrs:Data/wrs:R[wrs:C[position()=2 and .='" + severity + "']]/wrs:C[1]").text;
        const match = new RegExp(/<div id='bcdBody'>(.*)<\!\-\- end \-\->/g).exec(message);
        if (match) {
          messagesAll.push({ title: title, severity: severity, message: match[1], lastUpdate: lastUpdate });
          if (maxLastUpdate < lastUpdate) {
            maxLastUpdate = lastUpdate;
          }
        }
      });

      // use subjectPreferences to see if messages were hidden already. If not, check if there is an update in the loaded data, so you need to reshow them
      let lastSeen = dataGetter("MessagesTimeStamp");
      // we show user messages, only up to the stored MessagesTimeStamp, so if an update is done, you won't see the ones which you've closed before
      const messages = lastSeen ? messagesAll.filter(function(e) { return e.lastUpdate > lastSeen; }) : messagesAll;
      
      // helper function to display popup
      const nextCaption = bcdui.util.escapeHtml(bcdui.i18n.syncTranslateFormatMessage({ msgid: "bcd_Messages_Next" }) || "Next");
      const prevCaption = bcdui.util.escapeHtml(bcdui.i18n.syncTranslateFormatMessage({ msgid: "bcd_Messages_Prev" }) || "Prev");
      const closeCaption = bcdui.util.escapeHtml(bcdui.i18n.syncTranslateFormatMessage({ msgid: "bcd_Messages_Close" }) || "Close");
      const moreCaption = bcdui.util.escapeHtml(bcdui.i18n.syncTranslateFormatMessage({ msgid: "bcd_Messages_MoreUnread" }) || "There are more unread messages!");
      const noneCaption = bcdui.util.escapeHtml(bcdui.i18n.syncTranslateFormatMessage({ msgid: "bcd_Messages_None" }) || "There are currently no messages available.");
      const showPopup = function(msgs, timestamp) {
        // show popup message
        //jQuery(".bcdHtmlViewer").closest(".ui-dialog").remove();
        const dialog = jQuery("<div title='" + msgs[0].title + "'><div class='bcdHtmlViewer'>" + msgs[0].message + "</div><div class='bcdHtmlViewerFooter row'><div class='col'><span class='bcdAction bcdLeft bcdButton btn-primary'><a>" + prevCaption + "</a></span><span class='bcdCount'>1/" + msgs.length + "</span><span class='bcdAction bcdRight bcdButton btn-primary'><a>" + nextCaption + "</a></span></div><div class='col'><span class='bcdAction bcdClose bcdButton btn-primary'><a>" + closeCaption + "</a></div></div></div>");
        dialog.dialog({
          width: "auto",
          height: "auto",
          resizeable: false,
          closeOnEscape: false,
          
          close: function() {
            dialog.find(".bcdHtmlViewerFooter").off();
            // update subjectPreferences with latest update timestamp and flag that you've closed the messages
            dataSetter("MessagesTimeStamp", maxLastUpdate);
            lastSeen = maxLastUpdate;
            if (icon == null) {
              dataSetter("MessagesHide", "true");
            } else {
              targetHtml.find("span.notification").remove();
              icon.removeClass("fa-envelope").removeClass("fa-envelope-open").addClass("fa-envelope-open-text");
            }
            dialog.remove();
          },
          
          open: function() {
            const frame = dialog.parent();
            frame.find(".ui-dialog-titlebar").removeClass("bcdInformation bcdWarning bcdError");
            frame.find(".ui-dialog-titlebar").addClass("bcd" + msgs[0].title)
            
            // no close bar since we want to use the cancel button at the bottom
            frame.find(".ui-dialog-titlebar-close").hide();

            // only one message?, no footer
            if (msgs.length == 1) {
              frame.find(".bcdHtmlViewerFooter .bcdLeft").hide();
              frame.find(".bcdHtmlViewerFooter .bcdRight").hide();
              frame.find(".bcdHtmlViewerFooter .bcdCount").hide();
            }
            // disable prev button and close button
            else {
              frame.find(".bcdHtmlViewerFooter .bcdLeft").addClass("bcdDisabled");
              // if in icon mode, we need to check if next message has already been read
              if (icon == null) {
                frame.find(".bcdHtmlViewerFooter .bcdClose").addClass("bcdDisabled");
              } else if (msgs[1].lastUpdate > timestamp) {
                frame.find(".bcdHtmlViewerFooter .bcdClose").addClass("bcdDisabled");
                $("<span id='more' style='padding-left:1em'>" + moreCaption + "</span>").appendTo(frame.find(".bcdHtmlViewerFooter .bcdRight").parent());
              }
            }

            // reset css for sub elements
            frame.find('.bcdHtmlViewer *').addClass('bcdCssReset');

            // remember messages and page information to switch between them
            frame.find(".bcdHtmlViewerFooter").data("messages", msgs);
            frame.find(".bcdHtmlViewerFooter").data("page", 0);

            // handle prev/next message clicking
            frame.find(".bcdHtmlViewerFooter").on("click", ".bcdAction", function(event) {
              const target = jQuery(event.target).closest(".bcdAction");

              // no action on disabled
              if (target.hasClass("bcdDisabled")) return;

              // close button simply triggers dialog close  
              if (target.hasClass("bcdClose")) {
                dialog.dialog("close");
                return;
              }

              // handle prev/next button clicks
              const msg = frame.find(".bcdHtmlViewerFooter").data("messages");
              let page = frame.find(".bcdHtmlViewerFooter").data("page");

              if (target.hasClass("bcdLeft"))
                if (--page < 0) page = 0;
              if (target.hasClass("bcdRight"))
                if (++page == msg.length) page = msg.length - 1;

              // last page reached
              if (page == msg.length - 1) {
                frame.find(".bcdHtmlViewerFooter .bcdRight").addClass("bcdDisabled");
                frame.find(".bcdHtmlViewerFooter .bcdLeft").removeClass("bcdDisabled");

                // enable close when last page was reached
                frame.find(".bcdHtmlViewerFooter .bcdClose").removeClass("bcdDisabled");
                
                if (icon != null) frame.find(".bcdHtmlViewerFooter span#more").remove();
              }
              // first page reached                
              else if (page == 0) {
                frame.find(".bcdHtmlViewerFooter .bcdRight").removeClass("bcdDisabled");
                frame.find(".bcdHtmlViewerFooter .bcdLeft").addClass("bcdDisabled");
              }
              // somewhere in between
              else {
                frame.find(".bcdHtmlViewerFooter .bcdRight").removeClass("bcdDisabled");
                frame.find(".bcdHtmlViewerFooter .bcdLeft").removeClass("bcdDisabled");
                
                // in icon mode, we might have reached the last unread message
                if (icon != null && msg[page].lastUpdate <= timestamp) {
                  frame.find(".bcdHtmlViewerFooter span#more").remove();
                  frame.find(".bcdHtmlViewerFooter .bcdClose").removeClass("bcdDisabled");
                }
              }

              // remember current page
              frame.find(".bcdHtmlViewerFooter").data("page", page);

              // set message, current x/y page and title (based on severity)
              frame.find(".bcdHtmlViewer").html(msg[page].message);
              frame.find('.bcdHtmlViewer *').addClass('bcdCssReset');
              frame.find(".bcdHtmlViewerFooter .bcdCount").text("" + (page + 1) + "/" + msg.length);
              frame.find(".ui-dialog-title").text(msg[page].title);
              frame.find(".ui-dialog-titlebar").removeClass("bcdInformation bcdWarning bcdError");
              frame.find(".ui-dialog-titlebar").addClass("bcd" + msgs[page].title)
            });
          }
        });
      }
      
      if (icon == null) { // default mode
        if (messages.length > 0 && (maxLastUpdate > lastSeen || "true" != dataGetter("MessagesHide"))) {
          // (re)set SubjectPreferences
          dataSetter("MessagesHide", "false");

          showPopup(messages);
        }
      } else { // icon mode
        icon.removeClass("statusNotReady").addClass("fas").addClass("fa-regular");
        // update icon and display count of new messages
        if (messages.length > 0) {
          $("<span class='notification' style='position:absolute;right:50%;top:40%;font-weight:normal;padding:1px 8px;border-radius:50%;background-color:#E32119;color:white;pointer-events:none'>" + messages.length + "</span>").appendTo(targetHtml);
          icon.addClass("fa-envelope");
        } else icon.addClass(messagesAll.length > 0 ? "fa-envelope-open-text" : "fa-envelope-open");
        
        if (args.popupOnNew && messages.length > 0 && (maxLastUpdate > lastSeen || "true" != dataGetter("MessagesHide"))) {
          // (re)set SubjectPreferences
          dataSetter("MessagesHide", "false");

          showPopup(messages);
        }
        
        icon.on("click", function() {
          if (messagesAll.length == 0) {
            bcdui.widget.showModalBox({title:"Info", message: noneCaption, modalBoxType: bcdui.widget.modalBoxTypes.plainText});
          } else {
            showPopup(messagesAll, lastSeen);
          }
        })
      }
    });

    // force loading of data
    data.execute(true);
  }
});
