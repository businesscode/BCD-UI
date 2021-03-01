/*
  Copyright 2010-2017 BusinessCode GmbH, Germany

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
/**
 * A namespace for the BCD-UI notifications widget.
 * @namespace bcdui.widget.notifications
 */
bcdui.util.namespace("bcdui.widget.notifications",
/** @lends bcdui.widget.notifications */
{});

bcdui.widget.notifications.Notificator = class
/** @lends bcdui.widget.notifications.Notificator.prototype */
{
  /**
   * @classdesc
   * Notificator component displaying user notifications
   * @constructs
   * @param {Object} args - Parameter object
   * @param {integer} [args.retainMessagesNumber=5]   number of messages to retain in viewable area
   * @param {boolean} [args.attachMouseHandler=false] if true, the mousehover/unhover will close the box
   * @param {integer} [args.autoHideMs=0]             if greater 0, the box will autohide after that amount of ms, otherwise the box has to be closed manually
   */
   constructor(args) {
    //console.info("init", args);
    this.options = jQuery.extend({
      retainMessagesNumber : 5,
      attachMouseHandler : false,  /* if true , the mousehover/unhover will close the box */
      autoHideMs : 0               /* if greater 0, the box will autohide after that amount of ms, otherwise the box has to be closed manually */
    }, args);

    // we simulate stack by LIFO
    this.messageQueue = [];

    // our container ( either reuse or create ), the .contentContainer must be populated with .html()
    if(this.options.targetHtmlElementId){
      this.contentContainer = this.container = jQuery("#" + this.options.targetHtmlElementId).hide();
    }else{
      this.container = jQuery("<div class='bcd-widget-notificator-container'><span class='bcd-widget-notificator-container-closer'>&#160;</span></div>").hide().appendTo( document.body );
      this.contentContainer = jQuery("<div/>").appendTo( this.container );
    }

    // bind mouse over/out to take over control over auto-hide
    if(this.options.attachMouseHandler){
      this.container
      .off()
      .hover(function(){
        this.showNotificationBar();
      }.bind(this), function(){
        this.hideNotificationBar();
      }.bind(this));
    }
    this.container.find(".bcd-widget-notificator-container-closer").click(this.hideNotificationBar.bind(this));
  }

  /**
   * adds a message to notificator and displays notificator if appropriate
   *
   * @param {string} message       The message you want to display
   * @param {string} [type=INFO]   The type of the message, use WARN or INFO
   * @param {string} [anchorId]    If given the message will contain a link to that anchor)
   */
  addMessage(message, type, anchorId) {
    //console.info("add message", {message:message, type:type});

    // queue message
    this.messageQueue.push({
      timeString : new Date().toLocaleTimeString(),
      message : message,
      type : ( type || "INFO" ).toLowerCase(),
      link : anchorId?"<a href='#"+anchorId+"'>\u2191</a>&#160;":""
    });

    // truncate queue
    while ( this.messageQueue.length > this.options.retainMessagesNumber ) {
      this.messageQueue.shift();
    }

    // render
    this.displayNotificationBar();
  }

  /**
   * removes all messages and hides notification window
   */
   removeAllMessages() {
    this.messageQueue = [];
    this.hideNotificationBar();
  }

  /**
   * displays notification bar rendering messages in the queue
   */
  displayNotificationBar(){
    //console.info("displayNoficiationBar", this.messageQueue);

    // clear previous timeout
    window.clearTimeout( this.barTimeout );

    // message rendering template
    var messageTpl = doT.compile([
      "<div class='bcd-notification-container'>",
      "{{~it.messages:message:index}}",
      "<ul>",
      "<li>",
        "<span class='bcd-notification-msg-time bcd-notification-{{=message.type}}'>{{=message.timeString}}</span>",
        "<span>{{=message.link}}{{=message.message}}</span>",
      "</li>",
      "</ul>",
      "{{~}}",
      "</div>"
    ].join(""));

    // html rendering, LIFO
    var html = messageTpl( { messages : this.messageQueue.slice().reverse() } );

    {
      var deployAutoHide = function(){
        // handle auto timeout
        if(this.options.autoHideMs){
          this.barTimeout = window.setTimeout(this.hideNotificationBar.bind(this), this.options.autoHideMs);
        }
      }.bind(this);
      // attach to HTMLDOM and ensure visibility
      this.contentContainer.html( html );
      this.showNotificationBar(deployAutoHide);
    }
  }

  /**
   * hides notification bar
   */
  hideNotificationBar(cbFunc){
    this.container.fadeOut({ duration:500, complete:cbFunc });
  }

  /**
   * shows notification bar
   */
  showNotificationBar(cbFunc){
    // clear previous timeout
    window.clearTimeout( this.barTimeout );
    this.container.fadeIn({ duration:200, complete:cbFunc });
  }
};
