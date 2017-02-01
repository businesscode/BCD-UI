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

bcdui.util.namespace("bcdui.i18n", 
/** @lends bcdui.i18n */
{
  /**
   * A magic i18n token, which can prefix a string literal to tag it as an i18n-key rather than plain-text.
   * This is an incubating feature only.
   */
  TAG: "\uE0FF",

  /**
   * default model name
   * @private
   */
  _modelDefaultName:"bcdI18nModel",
/**
   * default request document
   * @private
   */
  _modelDefaultRequestDocument:bcdui.config.jsLibPath + "i18n/requestDoc.xml" ,
  /**
   * transformation stylesheet WRS format to i18n format
   * @private
   */
  _wrsTransform2I18nXSLT:bcdui.config.jsLibPath + "i18n/transformWrs.xslt" ,
  /**
   * URL to default static file
   * @private
   */
  _messagesXmlURL: bcdui.config.messagesXml,
  /**
   * @private
   */
  _isMessagesXmlStatic: bcdui.config.isMessagesXmlStatic,

  /**
   * checks if given string is a key
   * 
   * @returns true if given str is an i18n-key (starts with bcdui.i18n.TAG)
   * @private
   */
  isI18nKey : function(str){
    return str?str.charAt(0)==bcdui.i18n.TAG:false;
  },

  /**
   * initializes i18n module
   * @param args:
   *         modelId        - ID of i18n model
   *         initTranslate  -  immediately translation the whole HTML documents after loading, default true
   * @private
   */
  _initializeI18nModul:function(args){
    if(!args) args={};

    //array of functions to execute within _onTranslatorInitializedCb();
    this._onTranslatorInitFuncs = [];

    this.initTranslate = args.initTranslate == "true" ||  args.initTranslate == true;

    if(!args.modelId){
      // this._modelDefaultName is fixed , so the raw model (which is available only in default i18n bootstrapping) is fixed, too.
      args.modelId = "bcd_raw_" + this._modelDefaultName;
      var modelURL = null;
      if( this._isMessagesXmlStatic ){
        modelURL = this._messagesXmlURL + "?sessionHash=" + bcdui.config.sessionHash;
      }else{
        modelURL = new bcdui.core.RequestDocumentDataProvider({url: this._modelDefaultRequestDocument, modelURL : bcdui.core.webRowSetServletPathSessionCached + "/bcd_i18n.xml" });
      }

      var origModel = new bcdui.core.SimpleModel({ id:args.modelId ,url: modelURL});

      var stylesheetModelId = args.modelId+"_stylesheet";
      //
      //-------------------------------
      var str = '<TransformationChain xmlns="http://www.businesscode.de/schema/bcdui/chain-1.0.0"><Phase name="rendering">';
      str += '<Stylesheet jsFactoryExpression="bcdui.factory.objectRegistry.getObject(\''+stylesheetModelId+'\')"/>';
      str += "</Phase></TransformationChain>";
      var chainModel = new bcdui.core.StaticModel({
        id: bcdui.factory.objectRegistry.generateTemporaryId(args.modelId+"_chain")
        ,data: str
      });

      var stylesheet =
        "<xsl:stylesheet version=\"1.0\""+
        "  xmlns:xsl=\"http://www.w3.org/1999/XSL/Transform\""+
        "  xmlns:wrs=\"http://www.businesscode.de/schema/bcdui/wrs-1.0.0\">"+
        "  <xsl:output method=\"xml\" version=\"1.0\" encoding=\"UTF-8\" indent=\"no\"/>"+
        "  <xsl:key use=\"@id\" name=\"getPositionByName\" match=\"/wrs:*/wrs:Header/wrs:Columns/wrs:C\"></xsl:key>"+
        "  <xsl:template match=\"/*\">"+
        "     <xsl:variable name=\"replacedStr\">"+
        "      <xsl:for-each select=\"/wrs:*/wrs:Data/*/wrs:C[number(key('getPositionByName', 'key')/@pos)]\">"+
        "        <xsl:if test=\"string-length("+
        "          translate(."+
        "                    , 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789-'"+
        "                    , '')"+
        "          ) > 0\">x</xsl:if>"+
        "      </xsl:for-each>"+
        "     </xsl:variable>"+
        "    <Data format=\"bcdI18n\" isKeyNormalized=\"{string-length($replacedStr) > 0}\">"+
        "      <xsl:apply-templates select=\"*\"/>"+
        "    </Data>"+
        "  </xsl:template>"+
        "  <xsl:template match=\"wrs:C[number(key('getPositionByName', 'key')/@pos)]\">"+
        "    <!-- removes all none NMTOKENs -->"+
        "    <xsl:variable name=\"elName\" select=\"translate(., translate(., 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789-', ''), '')\"/>"+
        "    <xsl:if test=\"string-length($elName) &gt; 0\">"+
        "       <xsl:element name=\"{$elName}\">"+
        "         <xsl:attribute name=\"lang\"><xsl:value-of select=\"../wrs:C[number(key('getPositionByName', 'lang')/@pos)]\"/></xsl:attribute>"+
        "        <xsl:value-of select=\"../wrs:C[number(key('getPositionByName', 'value')/@pos)]\"/>"+
        "      </xsl:element>"+
        "     </xsl:if>"+
        "  </xsl:template>"+
        "  <xsl:template match=\"text()\"></xsl:template>"+
        "</xsl:stylesheet>";

      var stylesheetModel = bcdui.factory.createStaticModel({ id: stylesheetModelId ,data: stylesheet });
      
      bcdui.wkModels = bcdui.wkModels || new Object();

      bcdui.wkModels.bcdI18nModel = new bcdui.core.TransformationChain({
        id:this._modelDefaultName
        ,dataProviders:[origModel]
        ,chain:chainModel
      });
      args.modelId = this._modelDefaultName;
    }
    else{
      if(args.modelId != this._modelDefaultName){
        if(bcdui.config.isDebug)
          return new Error("the i18n model must be called:" + this._modelDefaultName);
        else
          bcdui.log.warn("the i18n model must be called:" + this._modelDefaultName);
      }
    }

    // load message catalog and the htmlTranslator
    if( this.initTranslate ) {
      bcdui.wkModels.bcdI18nModel.addStatusListener({
        status: bcdui.wkModels.bcdI18nModel.getReadyStatus()
        ,onlyOnce: true
        ,listener: function(){
            bcdui.core.ready(
                function(){
                  // translates the document.body
                  bcdui.i18n.translateHTMLElement();
                }
            );
        }.bind(this)
      });
    }

    bcdui.wkModels.bcdI18nModel.execute();
  },

  /**
   * @private
   */
  _getHtmlTranslator : function(){
    if(!this.htmlTranslator) {

      var createFunc = function(){
        if(!this.htmlTranslator){
          this.htmlTranslator = new bcdui.i18n.HTMLTranslator({catalog:new bcdui.i18n.MessageCatalog({document:bcdui.factory.objectRegistry.getObject(this._modelDefaultName).getData()})});
          this._onTranslatorInitializedCb();
        }
      }.bind(this);

      // defer only in case the model is not ready yet
      if(!bcdui.factory.objectRegistry.getObject(this._modelDefaultName).isReady()){
        bcdui.factory.objectRegistry.withReadyObjects(this._modelDefaultName, createFunc , false);
        return null;
      } else {
        createFunc();
      }

    }
    return this.htmlTranslator;
  },

  /**
   * this callback is called from _getHtmlTranslator(), if the translator has been initialized for the very first time,
   * so that this.htmlTranslator != null
   *
   * @private
   */
  _onTranslatorInitializedCb : function() {
    var func;
    while( func = this._onTranslatorInitFuncs.pop() ) {
      try{
        func();
      }catch(e){
        if(bcdui.isDebug){
          bcdui.log.warn("caught exception: " + e.message, e);
        }
      }
    }
  },

  /**
   *
   *  Translates HTML element and its children according to i18n model values,
   *  the method is asynchronous and "schedules" the translation
   *
   * @param {Object} args - Parameter object
   * @param {(HTMLElement|string)} args.elementOrId  - ID or HTML element to translate, default "document"
   * @param {string} [args.i18nModelId=bcdI18nModel] - model with i18n entries, default "bcdI18nModel"
   * @param {string} [args.display]                  - original css 'display' value of the HTML element to be set after translation
   * @returns translation time
   *
   */
  translateHTMLElement: function(args){
    if(!args) args = {};
    if(!args.i18nModelId) args.i18nModelId = this._modelDefaultName;
    if(this._getHtmlTranslator()){
      bcdui.i18n._translateHTMLElementImpl(args);
    }else{
      bcdui.factory.objectRegistry.withReadyObjects({ids: args.i18nModelId,fn:bcdui.i18n._translateHTMLElementImpl.bind(undefined,args)});
    }
  },

  /**
   * @private
   */
  _translateHTMLElementImpl : function(args){
    var model=bcdui.factory.objectRegistry.getObject(args.i18nModelId);
    if(model && model.getData()){
      if(!args.elementOrId){
        args.element=document.documentElement;
      }else{
        args.element = bcdui._migPjs._$(args.elementOrId).get(0);
      }
      bcdui.i18n._getHtmlTranslator().translate(args);
      if(args.display != null){
        if(bcdui._migPjs._$(args.element).get(0).style)
          bcdui._migPjs._$(args.element).get(0).style.display=args.display;
      }
    }
  },

  /**
   * Translates the given over HTML element or the whole document
   * without waiting for i18nModel, we rely on it being loaded and executed before before. If
   * the catalog is not initialized up to this moment (the catalog
   * initialization is asychronous) then NULL is returned in production
   * and an error is thrown in debug mode.
   *
   * @param {Object} args - Parameter object
   * @param {(HTMLElement|string)} args.elementOrId  - ID or HTML element to translate, default "document"
   * @param {Object}             [args.catalog]      - Catalog with i18n entries
   * @param {boolean}            [args.doDefer=true] - If true, in case at time of syncTranslateHTMLElement the catalog is not loaded yet, the translation is deferred and re-executed once catalog is loaded
   */
  syncTranslateHTMLElement: function(args){
      if(!args) args={};
      if(args.doDefer === undefined){
        args.doDefer = true;
      }

      if(this._getHtmlTranslator() == null){

        if (args.doDefer) {
          this._onTranslatorInitFuncs.push(function(){
            args.doDefer = false;
            this.syncTranslateHTMLElement(args);
          }.bind(this));
        }

        bcdui.log.warn("bcdui.i18n.syncTranslateHTMLElement() called to early. Catalog not initialized yet. Translation defered: " + args.doDefer);

        return null;
      }

      if(!args.elementOrId){
        args.element=document.documentElement;
      }else{
        args.element = typeof args.elementOrId === "string" ? document.getElementById(args.elementOrId) : args.elementOrId;
      }

      if(args.element && args.element.nodeType !== 3){ // no translation for TEXT_NODE
        this._getHtmlTranslator().translate(args);
      }
  },

  /**
   * @private
   */
  _messageFormatToJSPattern: /\{\s*(\d+)\s*(,\s*(\w*)\s*(,([^\}]*))?)?\}/g,

  /**
   * @private
   */
  _quotePattern: /"/g,

    /**
     * formats message
     * @parameter :
     *             message                                                      - String message
     *             [values]                                                     -  Array values to set
     *             [formattingFunctions=bcdui.i18n.standardFormattingFunctions] - Object  formating function
     * @example
     * bcdui.i18n.formatMessage( "Successfully updated {0} records in {1,number,#0.00} columns.", [ 3, 2 ] );
     */
  formatMessage: function(/* String */ message, /* Array */ values, /* Object */ formattingFunctions) {
    var msgTemp = message.replace(bcdui.i18n._quotePattern, "\\\"");
    var msg = msgTemp;
    var regEx = bcdui.i18n._messageFormatToJSPattern;
    var match = regEx.exec(msgTemp);
    formattingFunctions = formattingFunctions || bcdui.i18n.standardFormattingFunctions;

    // run through match capturing groups
    // index 1 = first param in {}, index 3 = 2nd, index 5 = 3rd with _messageFormatToJSPattern regex
    while (match != null) {
      var idx1 = match[1] && !isNaN(parseInt(match[1], 10)) ? parseInt(match[1], 10) : 0;
      var idx3 = match[3] || "";
      var idx5 = match[5] || "";

      // format value with given formatter and replace all original matches with value
      var f = (formattingFunctions[idx3]||formattingFunctions["UNKWON_FORMATTER"])(values, idx1, idx5, idx3);
      // esacpe possible regex chars
      var m = match[0].replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
      msg = msg.replace(new RegExp(m, 'g'), f);

      match = regEx.exec(msgTemp); // next match
    }
    return msg;
  },

  /**
   * Derived from DoJo library
   * @private
   */
  standardFormattingFunctions: {
     "": function(values, no, pattern, functionName){
      if (no < 0 || no >= values.length) {
        return "[ERROR: value # must be between 0 and " + (values.length - 1) + ", not " + no + "]";
      }
      return values[no];
     },
     /**
      * Derived from DoJo library
      * @private
      */
    "integer": function(values, no, pattern, functionName){
      if (no < 0 || no >= values.length) {
        return "[ERROR: value # must be between 0 and " + (values.length - 1) + ", not " + no + "]";
      }
      return parseInt(values[no], 10);
    },
    /**
     * Derived from DoJo library
     * @private
     */
    "UNKWON_FORMATTER": function(values, no, pattern, functionName){
      return "[UKNOWN FORMATTER: \"" + functionName + "\"]";
    },
    /**
     * Derived from DoJo library
     * @private
     */
    "number": function(values, no, pattern, functionName){
      if (no < 0 || no >= values.length) {
        return "[ERROR: value # must be between 0 and " + (values.length - 1) + ", not " + no + "]";
      }
      bcdui.log.warn("i18n JS API 'format-number' not implemented, return unformatted value");
      return values[no];
    },
   /**
    * Derived from DoJo library
    * Accepts a string formatted according to a profile of ISO8601 as defined by
    * [RFC3339](http://www.ietf.org/rfc/rfc3339.txt), except that partial input is allowed.
    * Can also process dates as specified [by the W3C](http://www.w3.org/TR/NOTE-datetime)
    * The following combinations are valid:
    * dates only
     *  | * yyyy
     * | * yyyy-MM
     * | * yyyy-MM-dd
     * times only, with an optional time zone appended
     * | * THH:mm
     * | * THH:mm:ss
     * | * THH:mm:ss.SSS
     *   and "datetimes" which could be any combination of the above
     *   @private
    */
    "dateTime": function(values, no, pattern, functionName){
      if (no < 0 || no >= values.length) {
        return "[ERROR: value # must be between 0 and " + (values.length - 1) + ", not " + no + "]";
      }
      bcdui.log.warn("i18n JS API 'format-dateTime' not implemented, return unformatted value");
      return values[no];
    },
    /**
     * Derived from DoJo library
     * EMPTY API BLOCK: not implemented, returns the value unformatted
     *
     * Accepts a string formatted according to a profile of ISO8601 as defined by
     * [RFC3339](http://www.ietf.org/rfc/rfc3339.txt), except that partial input is allowed.
     * Can also process dates as specified [by the W3C](http://www.w3.org/TR/NOTE-datetime)
     * The following combinations are valid:
     * dates only
      * | * yyyy
      * | * yyyy-MM
      * | * yyyy-MM-dd
      * times only, with an optional time zone appended
      * | * THH:mm
      * | * THH:mm:ss
      * | * THH:mm:ss.SSS
      *   and "datetimes" which could be any combination of the above
     *   @private
     */
    "date": function(values, no, pattern, functionName){
      if (no < 0 || no >= values.length) {
        return "[ERROR: value # must be between 0 and " + (values.length - 1) + ", not " + no + "]";
      }
      bcdui.log.warn("i18n JS API 'format-date' not implemented, return unformatted value");
      return values[no];
    }
  },

  /**
   * Translates and formats if needed the given message id.
   * The function should be used only if bcduiI18Model ready. If
   * the catalog is not initialized up to this moment (the catalog
   * initialization is asychronous) then NULL is returned in production
   * and an error is thrown in debug mode.
   *
   * @param  {(Object|string)} messageId - Object args with a property args.msgid, or the messageId itself
   * @returns {string} translated and formated message
   */
  syncTranslateFormatMessage:function(args){
    if(this._getHtmlTranslator() == null){
      bcdui.log.warn("bcdui.i18n.syncTranslateFormatMessage() called to early. Catalog not initialized yet");
      return null;
    }

    if( bcdui.util.isString(args) )
      args = { msgid: args };
    
    if(args.msgid){
      return this._getHtmlTranslator().translateFormatMessage(args.msgid);
    }else{
      return null;
    }
  }
});

bcdui.i18n._initializeI18nModul();

//Support email is configured via i18n (for example messages.xml)
//Cannot be done in logging module since that is setup before bcdui
bcdui.factory.objectRegistry.withReadyObjects("bcdI18nModel", function() {
  var emailContact = bcdui.wkModels.bcdI18nModel.getData().getElementsByTagName("bcd_ErrorEmailContactCcSubject")[0];
  if(bcdui.log && bcdui.log._getBCDAppender() && emailContact && emailContact.firstChild) {
   bcdui.log._getBCDAppender().emailContact =   emailContact.firstChild.nodeValue.split(":")[0];
   bcdui.log._getBCDAppender().emailContactCC = emailContact.firstChild.nodeValue.split(":")[1];
   bcdui.log._getBCDAppender().subject =        emailContact.firstChild.nodeValue.split(":")[2];
  }
});
