/*
  Copyright 2010-2025 BusinessCode GmbH, Germany

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
 * It supports a login form as well as OAuth login
 * To Support cookies SameSite=strict, we work with a popup for OAUth login opened by the a tags below
 *
 * It requires the body form to be provided by the project like this:
     <bcd-loginng>
       <form class="bcd__login-form">
         <div class="container">
           <!-- Login form -->
           <section>
             <!-- username -->
             <div class="form-group">
               <label for="input-field-username">Username:</label>
               <div class="input-group">
                 <div class="input-group-prepend">
                   <div class="input-group-text">
                     <i class="fas fa-user"></i>
                   </div>
                 </div>
                 <input type="text" class="form-control" id="input-field-username" name="username" autofocus></input>
               </div>
             </div>

             <!-- password -->
             <div class="form-group">
               <label for="input-field-passwd">Password:</label>
               <div class="input-group">
                 <div class="input-group-prepend">
                   <div class="input-group-text">
                     <i class="fas fa-lock"></i>
                   </div>
                 </div>
                 <input type="password" class="form-control" id="input-field-passwd" name="password"></input>
               </div>
             </div>

             <!-- rememberMe -->
             <div class="form-group">
               <input type="checkbox" class="" id="input-check-rememberme" name="rememberMe"></input>
               <label for="input-check-rememberme">Remember me</label>
             </div>

             <!-- actions -->
             <div class="form-group role-login">
               <button class="btn btn-primary w-100 role-login-action"> Login </button>
               <!-- // TODO disable temporarily
                 <a href="#" class="text-link">Forgot password?</a>
                -->
             </div>
           </section>

           <!-- OAuth -->
           <section>
             <div class="bcd__login-divider">
               <span>OR</span>
             </div>
             <div class="form-group">
               <a href="#" bcdOauthProviderId="google" class="btn btn--google-login"> Login with Google </a>
             </div>
             <div class="form-group">
               <a href="#" bcdOauthProviderId="azure" class="btn btn--microsoft-login"> Login with Microsoft </a>
             </div>
           </section>
         </div>
       </form>
     </bcd-loginng>
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

      // Login form handling
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

      // OAuth popup handling (we use popup to support cookie SamSite=strict)
      // Each a with attribute bcdOauthProviderId will trigger the auth flow with a popup
      jQuery("form a[bcdOauthProviderId]").each( (idx, btn) => {
          const providerId = btn.getAttribute("bcdOauthProviderId");
          const width = 600, height = 500;
          const left = window.screenX + (window.outerWidth - width) / 2;
          const top = window.screenY + (window.outerHeight - height) / 2;
          const params = `width=${width},height=${height},left=${left},top=${top}`;
          btn.onclick = window.open.bind(null, `./oauth?oauth-provider-id=${providerId}`, "oauthPopup", params);
        }
      );

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
  },

  /**
   * To support OAuth flow with cookie SameSite strict, we work with a client-site redirect here
   * which is triggered from within the popup by a script send from OAuthAuthenticatingFilter on login success
   * This way we get the cookie and stay in the successfully validated session
   * @param redirectUrl
   */
  oAuthLoginOnSuccess: function(redirectUrl) {
    window.location.href = redirectUrl;
  }

});
