/*
  Copyright 2010-2024 BusinessCode GmbH, Germany

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
 * Login Form Widget
 */
(function(){
  jQuery.widget("bcdui.bcduiLoginNg", jQuery.bcdui.bcduiWidget,
    /** @lends bcdui.bcduiLoginNg */
    {
    version : "1",

    /**
     * @private
     */
    _getCreateOptions : function(){
      return Object.assign({}, this.options, bcdui.widgetNg.impl.readParams.login(this.element[0]));
    },

    /**
     * @private
     */
    _validateOptions : function(){
      bcdui.widgetNg.impl.validateParams.login(this.options);
    },

    /**
     * initializes the widget according to the API
     * @private
     */
    _create : function() {
      this._super();
      bcdui.log.isTraceEnabled() && bcdui.log.trace("creating login");
      
      if(!jQuery("body[bcd-login]").length){
        this.element.empty();
        throw new Error("Please, add 'bcd-login' attribute to <body> element.");
      }
      
      // allow deferred init
      jQuery(document).ready(() => {
        if(!this.element.has("form").length){
          this.element.empty().html("<div>widget init error, read console!</div>")
          throw new Error(`bcd-loginng: this widget currently adds behaviour only and expects layout to be provided already in the body, minimum requirement is: <form><input name="username"><input name="password"><span class="role-login-message-err"></span><button class="role-login-action">login</button></form>`);
        }
        this._init();
      });
    },

    /**
     * deferred init function
     * @private
     */
    _init: function(){

      const loginForm = this.element.find("form");

      loginForm
      .on("submit", () => {
        // suppress submission, is handled in JS/XHR
        return false;
      }).on("click",".role-login-action", () => { // handle form submission, also executed upon form SUBMIT event, even if submission not allowed due to CORS
        loginForm.trigger("bcd-login"); //
        return false;
      }).on("bcd-login", () => {
        if(loginForm._bcd_login_pending){
          return true;
        }
        loginForm._bcd_login_pending = true;

        window.setTimeout(() => {
          jQuery("input[name=username]").val(jQuery("input[name=username]").val().toLowerCase());

          this.doLogin();

          delete loginForm._bcd_login_pending;
        }, 100);

        return true;
      });

      window.setTimeout(()=>{loginForm.find("input").first().focus()},50); // autofocus (does not work in sandbox)
    },

    doLogin: function() {
      const loginForm = this.element.find("form");

      // both must be set
      if([loginForm.find("input[name=username]"),loginForm.find("input[name=password]")].filter(e => !e.val().trim()).length)return;

      const lockForm = (isLock) => {
        loginForm.find(":input").prop("readonly", isLock);
      }

      const setErrorMessage = (i18nKey) => {
        loginForm.find(".role-login-message-err").attr("bcdtranslate", i18nKey);
        loginForm.bcdTranslate();
      }

      lockForm(true);

      jQuery.ajax({
        method: "post",
        url: loginForm.prop("action"),
        data: loginForm.serialize()
      }).done((data, textStatus, jqXHR) => {

        const successUrl = jqXHR.getResponseHeader("X-BCD.Location");
        const isLoginScreen = data?.indexOf("bcd-login") >= 0;
        const redirect = (url) => {
          loginForm.empty().html("<div class='bcdLoading'>&#160;</div>");
          window.location = url;
        };

        if(!!successUrl){ // login successful, redirect
          redirect(successUrl);
        } else {
          if(!isLoginScreen) { // in edge situations it may happen, that we already are logged in (i.e. session in separate tab), in this case the backend will just reply with a 301 and succeeds after all with any other than login screen
            redirect(bcdui.contextPath);
          } else {
            setErrorMessage("bcd_failed_login_attempt");
          }
        }
      }).fail(() => {
        setErrorMessage("bcd_failed_login_attempt");
      }).always(() => {
        lockForm(false);
      });
    },

    /**
     * @private
     */
    _destroy: function() {
      this._super();
      // actually confusing but listeners check this status to stop
      this.isDestroyed = true;
      bcdui.log.isTraceEnabled() && bcdui.log.trace("destroying login");
    }
  });
}());

/**
 * For creation @see {@link bcdui.widgetNg.createLogin}
 * @namespace bcdui.widgetNg.login
 */
bcdui.widgetNg.login = Object.assign(bcdui.widgetNg.login,
/** @lends bcdui.widgetNg.login */
{
  /**
   * @private
   */
  init: function(htmlElement){
    bcdui.log.isTraceEnabled() && bcdui.log.trace("bcdui login widget adapter init");
    jQuery(htmlElement).bcduiLoginNg();
  },

  /**
   * @param {string} id targetHtml of widget
   * @param {function} callback to be called with generated caption
   * @return {string} NavPath information via callback for widget
   */
  getNavPath: function(id, callback) {
    var e = jQuery.bcdFindById(id).get(0);
    if (e) {
      bcdui.widget._getCaptionFromWidgetElement(e, function(value) {
        callback(id, value);
      });
      return;
    }
    callback(id, "");
  }
});
