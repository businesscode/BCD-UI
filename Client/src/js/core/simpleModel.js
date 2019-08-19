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
 * @fileoverview
 * The file containing the implementation of the SimpleModel class.
 *
 */
bcdui.core.SimpleModel = bcdui._migPjs._classCreate(bcdui.core.AbstractUpdatableModel,
/**
 * @lends bcdui.core.SimpleModel.prototype
 */
{

  /**
   * @classdesc
   * <p>
   *   This class represents the standard case of a model where the loaded from a specified URL. Its document can be accessed
   *   via {@link bcdui.core.SimpleModel#getData myModel.getData()}. Javascript and {@link bcdui.core.Modelupdater Modelupdaters} can modify the data.
   *   Data loading is triggered by {@link bcdui.core.AbstractExecutable#execute myModel.execute()}
   * </p>
   * @extends bcdui.core.AbstractUpdatableModel
   *
   * @constructs
   * @description
   * The constructor of the model takes only one property besides the mandatory
   * "id" property (defined in AbstractExecutable) in its args parameter map namely
   * the "url" property. It specifies the URL the XML document represented by this
   * model should be loaded from.
   * The parameter isAutoRefresh=true forces a reload if the DataProvider has changed.
   * @param {string|object}                                 args - A url for the data <p/>or an argument map containing the following elements:
   * @param {string|bcdui.core.RequestDocumentDataProvider} args.url                   - A string with the URL or a RequestDocumentDataProvider providing the request. See {@link bcdui.core.RequestDocumentDataProvider RequestDocumentDataProvider} for an example.
   * @param {string}                                        [args.uri]                 - uri extension as a suffix to .url to tag requests, must not start with '/'. This parameter is ineffective if .url is provided.
   * @param {string}                                        [args.id]                  - Globally unique id for used in declarative contexts
   * @param {boolean}                                       [args.isAutoRefresh=false] - If true, each change of args.urlProvider triggers a reload of the model
   * @param {string}                                        [args.mimeType=auto]       - Mimetype of the expected data. If "auto" or none is given it is derived from the url
   * @param {Object}                                        [args.saveOptions]         - An object, with the following elements
   * @param {chainDef}                                      [args.saveOptions.saveChain]              - The definition of the transformation chain
   * @param {Object}                                        [args.saveOptions.saveParameters]         - An object, where each property holds a DataProvider, used as a transformation parameters.
   * @param {boolean}                                       [args.saveOptions.reload=false]           - Useful especially for models of type SimpleModel for refreshing from server after save
   * @param {function}                                      [args.saveOptions.onSuccess]              - Callback after saving (and optionally reloading) was successfully finished
   * @param {function}                                      [args.saveOptions.onFailure]              - Callback on failure, is called if error occurs
   * @param {function}                                      [args.saveOptions.onWrsValidationFailure] - Callback on serverside validate failure, if omitted the onFailure is used in case of validation failures
   * @param {bcdui.core.DataProvider}                       [args.saveOptions.urlProvider]            - dataprovider holding the request url (by default taken from the args.url)
   *  If not text/plain, (derived or via mimeType), the data is parsed.
   *  <table>
   *    <tr><th>"auto"</th><th>mimeType</th><th>Result</th></tr>
   *    <tr><td>*.json</td><td>"application/json"</td><td>are turned into a js object</li>
   *    <tr><td>*.js</td><td>"application/javascript"</td><td>are loaded and executed</li>
   *    <tr><td>*.xml, .xsl, .xslt</td><td>"application/xml", "application/xslt+xml"</td><td>are parsed into DOM</li>
   *  </table>
   *  All other content are just loaded as plain text.
   * @example
   * // Load plain content and use it in a renderer
   * var bookModel = new bcdui.core.SimpleModel( "../docs/allBooks.xml" );
   * var renderer  = new bcdui.core.Renderer({ targetHtml: "booksDiv", chain: "renderer.xslt", inputModel: bookModel });
   * @example
   * // Load a model using a Wrs request document from Wrs servlet
   * var myModel = new bcdui.core.SimpleModel({ id  : "myModel", url : new bcdui.core.RequestDocumentDataProvider({ url: "requestDoc.xml"}) });
   * myModel.execute();
   *
   */
  initialize: function(args)
    {
      var isLeaf = ((typeof this.type == "undefined")  ? "" + (this.type = "bcdui.core.SimpleModel" ): "") != "";

      this.saveOptions = args.saveOptions || {};
      this.saveOptions.saveChain = this.saveOptions.saveChain || args.saveChain;                // args.saveChain for backwards compatibility
      this.saveOptions.saveParameters = this.saveOptions.saveParameters || args.saveParameters; // args.saveParameters for backwards compatibility

      if( typeof args === "string" ) {
        args = { url: args };
      }

      args.saveOptions = this.saveOptions;

      // User defined (enforced) mimeType. If not given, it will be derived before loading via best-guess from the then-known url
      this.mimeType = !!args.mimeType ? args.mimeType : undefined;
      
      this.urlProvider = null;
      if (typeof args.url == "string" || typeof args.url == "undefined") {

        if (typeof args.url == "undefined" || !args.url.trim().length)
          args.url = bcdui.core.webRowSetServletPath;

        if(args.uri){
          args.url += "/" + args.uri;
        }
        this.saveOptions.urlProvider = this.urlProvider = args.saveOptions.urlProvider || new bcdui.core.ConstantDataProvider({ name: "url", value: args.url });
        bcdui.core.AbstractUpdatableModel.call(this,args);
      } else {
        this.saveOptions.urlProvider = this.urlProvider = args.saveOptions.urlProvider || args.url;
        bcdui.core.AbstractUpdatableModel.call(this,args);
        // in case of isAutoRefresh listen to changes of urlProvider and
        // reload model
        if ( args.isAutoRefresh ){
          this.urlProvider.setIsAutoRefresh(true);
          bcdui.factory.addDataListener({
            idRef: this.urlProvider ,
            listener: function() {
               // this forces the model to reload if the request model changes
               // while model is executed already
               this.setStatus(this.loadingStatus);
               this.execute(true);
            }.bind(this)
          });
        }
        this.urlProvider.execute();
      }

      /* Status objects */

      this.waitingForUncomittedChanges = new bcdui.core.status.WaitingForUncomittedChanges();

      /**
       * The model was created but no {@link bcdui.core.SimpleModel#execute myModel.execute()} was called explicitly or by a DataProvider or Renderer, having this as an input.
       * @constant
       */
      this.initializedStatus = new bcdui.core.status.InitializedStatus();
      /**
       * @constant
       * @private
       */
      this.loadingStatus = new bcdui.core.status.LoadingStatus();
      /**
       * @constant
       * @private
       */
      this.urlAvailableStatus = new bcdui.core.status.URLAvailableStatus();
      /**
       * @constant
       * @private
       */
      this.loadedStatus = new bcdui.core.status.LoadedStatus();
      /**
       * @constant
       * @private
       */
      this.loadFailedStatus = new bcdui.core.status.LoadFailedStatus();
      /**
       * Indicating the model is ready for access. Check via {@link bcdui.core.SimpleModel#isReady myModel.isReady()}
       * @constant
       */
      this.transformedStatus = new bcdui.core.status.TransformedStatus();

      /* These stati are considered as ready stati for modelUpdaters running on this model. */
      this._readyStatiForModelUpdates = [ this.loadedStatus,
                                          this.transformedStatus,
                                          this._refreshingModelUpdatersStatus,
                                          this._refreshingModelUpdatersStatusCausedByExecute];

      this.dataDoc = null;
      this.addStatusListener(this._statusTransitionHandler.bind(this));

      this.setStatus(this.initializedStatus);

      if (isLeaf)
        this._checkAutoRegister();
    },

  /**
   * @private
   */
  _getTheStateBeforeRefreshingModelUpdatersStatus: function()
    {
      return this.loadedStatus;
    },

  /**
   * @private
   */
  _statusTransitionHandler: function(/* StatusEvent */ statusEvent)
    {
      if (statusEvent.getStatus().equals(this.loadingStatus)) {
        /*
         * Before the actual data loading can take place we need to assure
         * that the data url is available from the urlProvider.
         */
        this._synchronizedStatusTransition(this.urlAvailableStatus, [ this.urlProvider ]);
      } else if (statusEvent.getStatus().equals(this.urlAvailableStatus)) {
        /*
         * The loading should begin.
         */
        this._load();
      } else if (statusEvent.getStatus().equals(this.loadedStatus)) {
        /*
         * Now that the loading has finished we can advance to the model updater
         * refresh phase.
         */
        this.setStatus(this._refreshingModelUpdatersStatusCausedByExecute);
      } else if (statusEvent.getStatus().equals(this._refreshingModelUpdatersStatusCausedByExecute)) {
        /*
         * If we reach this state (via execute) we apply all the modelUpdaters in order.
         */
        this._applyModelUpdaters(true);
      } else if (statusEvent.getStatus().equals(this._refreshingModelUpdatersStatus)) {
        /*
         * If we reach this state (via fire) we apply all the modelUpdaters in order. The
         * non-auto-updating modelUpdaters are skipped if they have been executed once.
         */
        this._applyModelUpdaters(false);
      }
    },

  /**
   * Helper to derive via best-guess the mimetype from a url
   * Later this could be derived from the mime-type of the HTTP response header, but for now we need to know the loader upfront
   * @private
   */
  _deriveMimeType: function( args )
  {
    var pathParts = args.url.split(/\#|\?|;/)[0].split("/");
    var pathEnd = pathParts[pathParts.length-1];
    var mimeType;

    // Mime-types per file type
    if( pathEnd == "WrsServlet" || pathEnd.endsWith(".xml") || pathEnd.endsWith(".vfsxml") )
      mimeType = "application/xml";
    else if( pathEnd.endsWith(".xsl") || pathEnd.endsWith(".xslt") )
      mimeType = "application/xslt+xml";
    else if( pathEnd.endsWith(".json") )
      mimeType = "application/json";
    else if( pathEnd.endsWith(".js") )
      mimeType = "text/javascript";

    // No known file-type, mime-types per convention
    else if( pathEnd.indexOf(".")==-1 )
      mimeType = "application/xml";
    else
      mimeType = "text/plain";
    return mimeType + "; charset=UTF-8";
  },
    
  /**
   * @private
   */
  _load: function()
    {
      var loadUrl = this.urlProvider.getData();

      // We need to decide whether we load XML or plain text (text/JSON/dott etc)
      // One could try to only differ the processing when the answer-mimeType is known, but we did we do many manipulations on XML loading already, 
      // including non-native MSXML, encapsulate MSXML to look like native and so on, that that was postponed
      if( typeof this.mimeType === "undefined" || this.mimeType === "auto" )
        this.mimeType = this._deriveMimeType( { url: loadUrl } );
      this.isXml = this.mimeType.indexOf("xml") !== -1 || this.mimeType.indexOf("xsl") !== -1;

      // XML to be loaded (will also trigger resolve include, document(), relative load paths etc)
      if( this.isXml )
      {
        if (this.urlProvider.method == "POST") {
          bcdui.core.xmlLoader.post({
            url: this.urlProvider.modelURL,
            doc: this.urlProvider.requestModel.dataDoc,
            onSuccess: function(domDocument) {
              this.dataDoc = domDocument;
              this._uncommitedWrites = false;
              this.setStatus(this.loadedStatus);
            }.bind(this),
            onFailure: function(msg, jqXHR, textStatus, errorThrown) {
              bcdui.log.error("BCD-UI: Failed loading model: '"+this.id+"', '"+msg+"'");
              this.dataDoc = null;
              this.lastFailureStatus = {msg: msg, jqXHR: jqXHR, textStatus: textStatus, errorThrown: errorThrown};
              this.setStatus(this.loadFailedStatus);
            }.bind(this)
          });
        }
        else {
          bcdui.core.xmlLoader.load({
            url: loadUrl,
            onSuccess: function(domDocument) {
              this.dataDoc = domDocument;
              this._uncommitedWrites = false;
              this.setStatus(this.loadedStatus);
            }.bind(this),
            onFailure: function(msg, jqXHR, textStatus, errorThrown) {
              bcdui.log.error("BCD-UI: Failed loading model: '"+this.id+"', '"+msg+"'");
              this.dataDoc = null;
              this.lastFailureStatus = {msg: msg, jqXHR: jqXHR, textStatus: textStatus, errorThrown: errorThrown};
              this.setStatus(this.loadFailedStatus);
            }.bind(this)
          });
        }
      } 

      // Non-xml
      else 
      {
        jQuery.ajax({
          mimeType: this.mimeType,
          contentType: this.mimeType,
          url : loadUrl,
          success : function (data, successCode, jqXHR) {
            this.dataDoc = data;
            this._uncommitedWrites = false;
            this.setStatus(this.loadedStatus);                
          }.bind(this),
          error : function(jqXHR, textStatus, errorThrown) {

              // test for C00CE00D error code which corresponds to an element used but not declared in the DTD/Schema
              // we can use this to detect a session timeout where the login page (html) is loaded for a differently requested filetype
              // FF & Chrome will run into success in this case
              if (jqXHR.domDocument && jqXHR.domDocument.msxmlImpl && jqXHR.domDocument.msxmlImpl.parseError && jqXHR.domDocument.msxmlImpl.parseError.errorCode == -1072898035) {
                bcdui.widget.showModalBox({titleTranslate: "bcd_SessionTimeout", messageTranslate: "bcd_SessionTimeoutMessage", onclick: function() {window.location.href = window.location.href;}});
                return;
              }

            bcdui.log.error("BCD-UI: Failed loading model: '"+this.id+"', '"+textStatus+"' / '"+errorThrown+"'");
            this.dataDoc = null;
            this.setStatus(this.loadFailedStatus);
          }.bind(this)
        });
      }
    },

  /**
   * The SimpleModel reaches its ready status when the XML document has been
   * loaded from the URL and the optional model updates have run. The document
   * can then be retrieved with the "getDataDoc" method.
   * <p>
   *  The status transitions of the class are as follows:          </p>
   *                                                               <p style="padding-left: 10px"><table><tr><td rowspan="10">&nbsp;</td><td style="border: 3px double black; text-align: center" colspan="2">
   *      {@link bcdui.core.status.InitializedStatus InitializedStatus}  </td><td style="padding-left: 20px">
   *          All variables have been initialized.
   *                                                               </td></tr><tr><td>&nbsp;</td><td style="border-left: 1px solid black">&nbsp;</td><td></td></tr><tr><td style="border: 1px solid black; text-align: center" colspan="2">
   *  <i> Loading </i>                                             </td><td style="padding-left: 20px">
   *          If it is not ready execute URL data provider
   *          (<i>execute</i>).
   *                                                               </td></tr><tr><td>&nbsp;</td><td style="border-left: 1px solid black">&nbsp;</td><td></td></tr><tr><td style="border: 1px solid black; text-align: center" colspan="2">
   *      URLAvailable                                             </td><td style="padding-left: 20px">
   *          The URL data provider is ready, start loading data.
   *                                                               </td></tr><tr><td>&nbsp;</td><td style="border-left: 1px solid black">&nbsp;</td><td></td></tr><tr><td style="border: 1px solid black; text-align: center" colspan="2">
   *      Loaded                                                   </td><td style="padding-left: 20px">
   *          The data has been loaded from the URL.
   *                                                               </td></tr><tr><td>&nbsp;</td><td style="border-left: 1px solid black">&nbsp;</td><td></td></tr><tr><td style="border: 1px solid black; text-align: center" colspan="2">
   *      RefreshingModelUpdaters                                  </td><td style="padding-left: 20px">
   *          ModelUpdaters are currently running.
   *                                                               </td></tr><tr><td>&nbsp;</td><td style="border-left: 1px solid black">&nbsp;</td><td></td></tr><tr><td rowspan="5" style="padding: 5px 0px 5px 5px"><div style="height: 6em; width: 0.5em; border-left: 1px solid black; border-top: 1px solid black; border-bottom: 1px solid black">&nbsp;</div></td><td style="border: 3px double black; text-align: center" colspan="2">
   *  <b>{@link bcdui.core.status.TransformedStatus TransformedStatus}</b></td><td style="padding-left: 20px">
   *          All model updaters have run. (<b>ready</b>)
   *                                                               </td></tr><tr><td>&nbsp;</td><td style="border-left: 1px solid black">&nbsp;</td><td></td></tr><tr><td style="border: 1px solid black; text-align: center" colspan="2">
   *      Saving                                                   </td><td style="padding-left: 20px">
   *          The posting of data will start.
   *                                                               </td></tr><tr><td>&nbsp;</td><td style="border-left: 1px solid black">&nbsp;</td><td></td></tr><tr><td style="border: 1px solid black; text-align: center" colspan="2">
   *      {@link bcdui.core.status.SavedStatus SavedStatus}        </td><td style="padding-left: 20px">
   *          The data has been posted to the server.
   *
   * </td></tr></table></p>
   * @return {bcdui.core.Status} The ready state of the document.
   */
  getReadyStatus: function()
    {
      return this.transformedStatus;
    },

  /**
   * Returns the list of status objects indicating that something has failed.
   * @return {Array} The array of failure {@link bcdui.core.Status} objects.
   */
  getFailedStatus: function()
    {
      return [ this.loadFailedStatus, this.saveFailedStatus ];
    },

  /**
   * The implementation of the model loading process. It just sets the status,
   * because the actual loading is done in the _statusTransitionHandler function.
   * @private
   */
  _executeImpl: function()
    {
      if (this.status.equals(this.initializedStatus) || this.status.equals(this.getReadyStatus()) || this.status.equals(this.savedStatus)) {
        this.setStatus(this.loadingStatus);
      }
    },

  /**
   * @inheritdoc
   */
  getData: function()
    {
      return this.dataDoc;
    },

  /**
   * Debugging function showing a text for this model.
   * @return {string} A summary of the model.
   */
  toString: function(args)
    {
      var msg = "[bcdui.core.SimpleModel: " + this.id;
      if( args && args.verbosity > 0 )
        msg += (this._modelUpdaters.length?(this._modelUpdaters.length/1000).toFixed(1)+"k, model updaters ":"") + ", url: " + (this.urlProvider.isReady()?this.urlProvider.getData():"");
      return msg + "]";
    }
}); // Create class: bcdui.core.SimpleModel
