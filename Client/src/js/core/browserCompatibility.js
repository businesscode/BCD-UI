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
 * <p>
 *
 * This namespace contains XML-related functions to make the BCD-UI library
 * work on different browsers' XML implementation. These functions deal with
 * the following issues:
 *                                                                             <dl><dt>
 *   XML Document creation                                                     </dt><dd><p>
 *         Factory functions for creating XML documents, parsing and
 *         serialization and creating XSLT processors.
 *                                                                             </p></dd><dt>
 *   XML Manipulation + IE API Compatibilty                                    </dt><dd><p>
 *         The Mozilla / Webkit XML classes are augmented so that they
 *         implement the IE-compatible interface. Then the users can
 *         focus on this API only.
 *                                                                             </p></dd><dt>
 *   Namespace handling                                                        </dt><dd><p>
 *         Align the handling of XML namespaces and prefixes so that
 *         the well-known BCD-UI prefixes as well as user prefixes can
 *         be used in the JavaScript API.
 *                                                                             </p></dd></dl></p><p>
 * </p>
 * @namespace
 */
bcdui.core.browserCompatibility = {

    /**
     * @return {string} URI for a given prefix
     */
    resolveNamespace: function(prefix)
      {
        return bcdui.core.xmlConstants.namespaces[prefix] || bcdui.core.nsResolvableArray[prefix];
      },

    /**
     * @return {Document} A new DOM document
     */
    newDOMDocument: function()
      {
        return document.implementation.createDocument(null, null, null);
      },

    /**
     * @param {Document} doc - To be cloned
     * @return {Document} A clone of the given DOM document
     */
    cloneDocument: function(doc){
      if( ! doc.nodeType )
        return JSON.parse(JSON.stringify(doc)) // TODO: test
      return doc == null ? null : doc.cloneNode(true);
    },

    /**
     * Parses given xml string and creates a DOMDocument out of it.
     * @param {string} serializedDoc A serialized XML document.
     * @param {string} msg Optional for better error message.
     * @return {DOMDocument} The DOMDocument parsed from the serialized document string.
     */
    createDOMFromXmlString: function(serializedDoc,msg)
      {
        var parser = new DOMParser();
        serializedDoc = this._addDefaultNamespacesToDocumentElement(serializedDoc);
        var doc = parser.parseFromString(serializedDoc, "text/xml");
        var errorNode;
        if( errorNode = doc.selectSingleNode("//*[local-name()='parsererror']") )
          throw new Error("Failed parsing"+(msg ? msg : "")+". Content's first 100 characters: '"+serializedDoc.substring(0,100)+"'. Error: (" + errorNode.textContent + ")");
        return doc;
      },

      /**
       * removes obsolete namespace declarations and moves used ones to the root element
       * @param doc The document (doc or string) which should be cleaned
       * @returns {String} The serialized and namespace-cleaned representation of the doc
       */
    removeObsoleteNS: function(serializedDoc)
      {
      if (typeof serializedDoc == "string") {
        for (var prefix in bcdui.core.xmlConstants.namespaces) {
          var pattern = new RegExp(" xmlns:" + prefix + "=\"" + bcdui.core.xmlConstants.namespaces[prefix] + "\"", "g");
          serializedDoc = serializedDoc.replace(pattern, "");
        }
        // add needed well known ones (on root)
        serializedDoc = bcdui.core.browserCompatibility._addDefaultNamespacesToDocumentElement(serializedDoc);
        return serializedDoc;
      }
      else
        return this.removeObsoleteNS(new XMLSerializer().serializeToString(serializedDoc));
      },

    /**
     * Creates a new element whose name can contain a well-known prefix (like "wrs")
     * and appends it to the specified target element. This function should be used
     * rather than createElementNS, because the latter is not available on the
     * Internet Explorer.
     * @param doc The document the element should be created for.
     * @param name The element name which may contain a well-known prefix.
     * @returns {XMLElement} The new XMLElement.
     */
    appendElementWithPrefix: function(/* XMLElement */ targetElement, /* String */ name, /* Boolean? */ insertBeforeTargetElement)
      {
        var doc = targetElement.ownerDocument;
        if (typeof doc == "undefined") doc = targetElement;
        if (name.indexOf(":") <= 0) {
          if (insertBeforeTargetElement) {
            return targetElement.parentNode.insertBefore(doc.createElement(name), targetElement);
          }
          return targetElement.appendChild(doc.createElement(name));
        }
        var nameParts = name.split(":");
        var prefix = nameParts[0];
        var namespaceURI = bcdui.core.xmlConstants.namespaces[prefix];
        if (insertBeforeTargetElement) {
          return targetElement.parentNode.insertBefore(doc.createElementNS(namespaceURI, name), targetElement);
        }

        return targetElement.appendChild(doc.createElementNS(namespaceURI, name));
      },

    /**
     * Asynchronous creation of an XSLTProcessor object from a DOM document.
     * @param {XMLDocument} domDocument The XSLT document the XSLTProcessor instance should be
     * created from.
     * @param {Function} fn The callback function executed when the processor has been created. It
     * takes the processor instance as argument.
     */
    asyncCreateXsltProcessor: function( args )
    {
      var domDocument = args.model;
      var fn = args.callBack;
      bcdui.core.removeXMLBase(domDocument);
      var proc = new XSLTProcessor();
      try {
        bcdui.core.browserCompatibility.preXslImportByProc(domDocument);
        proc.importStylesheet(domDocument);
        proc.xslt = domDocument;
        proc.outputFormat = bcdui.core.browserCompatibility.extractMetaDataFromStylesheetDoc( domDocument );
      } catch(e) {
        var xml = new XMLSerializer().serializeToString(domDocument);
        var styleSheetPos = xml.indexOf('stylesheet');
        var afterStyleSheet = xml.substring(styleSheetPos+10);
        var fragment = xml.substring(0,styleSheetPos+10)+" ... >"+afterStyleSheet.substring(afterStyleSheet.indexOf('<')-1).substring(1,500)+" ..."
        var msg = "asyncCreateXsltProcessor(): "+ (args.callerDebug ? " '"+args.callerDebug+"', ":"")+ "'" +e.message+"'";
        msg += " DOM document: " + (domDocument?("\n"+fragment):"domDocument is null");
        bcdui.log.error(msg);
      }
      setTimeout(fn.bind(undefined,proc));
      return;
    },

    /*
     * Dummy
     */
    cleanupGeneratedXslt: function( args ) { return args.doc; },
    
    extractMetaDataFromStylesheetDoc: function( xslt ) 
    {
      var output = xslt.selectSingleNode("/*/xsl:output");
      if(!output){
        window["console"]&&console.error("xsl:output element not found", xslt);
        throw "xsl:output required but not found";
      }

      // To avoid issues with character sets
      if( bcdui.log.isDebugEnabled() && "UTF-8" != output.getAttribute("encoding") )
        bcdui.log.warn("The XSLT transformation should have an xsl:output/@encoding=UTF-8 to avoid character set issues "+xslt.URL);

      return output.getAttribute("media-type")==="text/xslt" ? "xslt" : output.getAttribute("method")==="html" ? "html" : "xml";       
    },

    preXslImportByProc: function(domDocument) {
      var importNodes = domDocument.selectNodes("/*/xsl:import[starts-with(@href,'bcduicp://')]");
      for( var iN = 0; iN <importNodes.length; iN++ )
        importNodes.item(iN).setAttribute("href", bcdui.config.contextPath + "/" + importNodes.item(iN).getAttribute("href").substring(10) );
    },

    jQueryXhr: jQuery.ajaxSettings.xhr 
};

//-----------------------------------------------------------------------------
//BEGIN: Implementation of MSXML-specific functions in all IE Browsers.
//-----------------------------------------------------------------------------
if (bcdui.browserCompatibility.isIE) {

  /**
   * Allows for quick testing of IE version, if not iE, this is simply undefined
   */
  bcdui.core.browserCompatibility.ieVersion = parseInt(navigator.userAgent.substring(navigator.userAgent.indexOf("MSIE")+5));
  if( isNaN(bcdui.core.browserCompatibility.ieVersion) )
    bcdui.core.browserCompatibility.ieVersion = parseFloat(navigator.userAgent.substring(navigator.userAgent.indexOf(" rv:")+4)); // IE 11

  /**
   * To be able to attach new functions like createElementNS to our XMLDocument, we need to wrap MSXML ActiceX objects here
   *
   * Sadly, we cannot provide legacy .xml, .text via implicit getter (defineProperty is not available in IE8).
   * Switching to an explicit function xml() or so is also no real option since we cannot provide that for MSXML elements
   * (unless we would proxy them all them) and often it is unknown whether we have an element (no proxy) or a document (is proxied).
   * So, just use standard XMLSerializer from now on.
   *
   * New native XML objects of MS do not support selectSingleNode() nor evaluate(), we still have to use MSXML, can't use document.implementation.createDocument(null,null,null);
   */
  bcdui.core.browserCompatibility.MSXMLDocumentWrapper = function ( doc) {
    this.msxmlImpl = doc || bcdui.core.browserCompatibility.ie.createMSObject("Msxml2.FreeThreadedDOMDocument");
    this.documentElement = this.msxmlImpl.documentElement;
    this.nodeType = this.msxmlImpl.nodeType;
  };
  bcdui.core.browserCompatibility.MSXMLDocumentWrapper.prototype.setProperty = function( prop, val ) { return this.msxmlImpl.setProperty( prop,val ) };
  bcdui.core.browserCompatibility.MSXMLDocumentWrapper.prototype.loadXML = function( val ) { var res = this.msxmlImpl.loadXML( val ); this.documentElement = this.msxmlImpl.documentElement; return res; };
  bcdui.core.browserCompatibility.MSXMLDocumentWrapper.prototype.load = function( url ) { var res =  this.msxmlImpl.load( url ); this.documentElement = this.msxmlImpl.documentElement; return res; };
  bcdui.core.browserCompatibility.MSXMLDocumentWrapper.prototype.appendChild = function( e ) { var res = this.msxmlImpl.appendChild( e ); this.documentElement = this.msxmlImpl.documentElement; return res; };
  bcdui.core.browserCompatibility.MSXMLDocumentWrapper.prototype.selectSingleNode = function( xPath ) { return this.msxmlImpl.selectSingleNode( xPath ); };
  bcdui.core.browserCompatibility.MSXMLDocumentWrapper.prototype.selectNodes = function( xPath ) { return this.msxmlImpl.selectNodes( xPath ); };
  bcdui.core.browserCompatibility.MSXMLDocumentWrapper.prototype.createElement = function( tag ) { return this.msxmlImpl.createElement( tag ); };
  bcdui.core.browserCompatibility.MSXMLDocumentWrapper.prototype.createAttribute = function( name ) { return this.msxmlImpl.createAttribute( name ); };
  bcdui.core.browserCompatibility.MSXMLDocumentWrapper.prototype.createTextNode = function( text ) { return this.msxmlImpl.createTextNode( text ); };
  bcdui.core.browserCompatibility.MSXMLDocumentWrapper.prototype.getElementsByTagName = function( tagName ) { return this.msxmlImpl.getElementsByTagName( tagName ); };
  bcdui.core.browserCompatibility.MSXMLDocumentWrapper.prototype.cloneNode = function( deep ) { return this.msxmlImpl.documentElement ? new bcdui.core.browserCompatibility.MSXMLDocumentWrapper( this.msxmlImpl.cloneNode(deep) ) : this.msxmlImpl.cloneNode( deep ); };
  bcdui.core.browserCompatibility.MSXMLDocumentWrapper.prototype.importNode = function( node, deep ) { return this.msxmlImpl.importNode( node, deep ); };

  // This is to support handling a plain doc similar to a bcd dataprovider. Similar means, fire events and so on is not dummied here
  bcdui.core.browserCompatibility.MSXMLDocumentWrapper.prototype.getData = function() { return this; };

  /**
   * Replacement for standard XMLSerializer
   * XMLSerializer was introduced in IE9.
   */
  if( typeof XMLSerializer == "undefined" )
  {
    XMLSerializer = function () {};
    XMLSerializer.prototype.serializeToString = function (node) {
      return (node.msxmlImpl||node).xml;
    };
  }

  /**
   * Provide a standard XSLTProcessor syntax for IE
   */
  if( typeof XSLTProcessor == "undefined" )
  {
    // Note, for unknown reasons, Webkit will overwrite its XSLTProcessor when stating function XSLTProcessor().. as regular code, even if inside this IE block.
    // For that reason we do eval here. Seems to be a bug in Webkit
    eval("window.XSLTProcessor = function() {};");
    XSLTProcessor.prototype.importStylesheet = function( xslt ) {
      this.outputFormat = bcdui.core.browserCompatibility.extractMetaDataFromStylesheetDoc( (xslt.msxmlImpl || xslt) );
      this.msxmlImpl_Xslt = bcdui.core.browserCompatibility.ie.createMSObject("Msxml2.XSLTemplate");
      this.msxmlImpl_Xslt.stylesheet = xslt.msxmlImpl || xslt;
      this.msxmlImpl_Proc = this.msxmlImpl_Xslt.createProcessor();
    };
    XSLTProcessor.prototype.addParameter = function(name, value) {
      this.msxmlImpl_Proc.addParameter( name, value.msxmlImpl || value );
    };
    XSLTProcessor.prototype.setStartMode = function( mode ) {
      this.msxmlImpl_Proc.setStartMode( mode );
    };
    XSLTProcessor.prototype.transformToDocument = function ( sourceDoc ) {
      this.msxmlImpl_Res = bcdui.core.browserCompatibility.ie.newIE_DOMDocument();
      this.msxmlImpl_Res.msxmlImpl.async = false;
      this.msxmlImpl_Proc.output = this.msxmlImpl_Res.msxmlImpl;
      this.msxmlImpl_Proc.input = sourceDoc.msxmlImpl;
      this.msxmlImpl_Proc.setStartMode("");
      this.msxmlImpl_Proc.transform();
      this.msxmlImpl_Res.documentElement = this.msxmlImpl_Res.msxmlImpl.documentElement;
      return this.msxmlImpl_Res;
    };
    XSLTProcessor.prototype.transformToFragment = function ( sourceDoc, owner, fn ) {
      this.msxmlImpl_Proc.input = sourceDoc.msxmlImpl;
      this.msxmlImpl_Proc.setStartMode("");
      this.msxmlImpl_Proc.transform();
      var fragment = document.createDocumentFragment();
      var dummy = document.createElement("dummy");
      dummy.innerHTML = this.msxmlImpl_Proc.output;
      for( var ch=0; ch<dummy.children.length; ch ++ )
        fragment.appendChild(dummy.children[ch]);
      return fragment;
    };
    XSLTProcessor.prototype.transform = function ( args ) {
      for (var x in args.parameters)
        this.addParameter(x, args.parameters[x]);
      if( this.outputFormat==="html" )
        args.callBack( this.transformToFragment( args.input, args.outputOwner ) );
      else
        args.callBack( this.transformToDocument( args.input ) );
    };
  }

  /**
   * This namespace contains implementations that apply to all versions of Internet Explorer.
   * @namespace
   */
  bcdui.core.browserCompatibility.ie = {

    /**
     * The ordered array of MSXML versions instantiated in the Internet Explorer.
     * These versions are tested one after another and the first working version
     * is returned.
     * @type Array
     * @constant
     * @private
     */
    msxmlVersions: [ "6.0" , "5.0", "4.0", "3.0" ],

    /**
     * The currently used MSXML version which is one of the versions supplied in
     * the {@link bcdui.core.browserCompatibility.ie.msxmlVersions} array.
     * @type String
     */
    currentMSXMLVersion: null,

    /**
     * @return {object} with a property for each known non-xml mime type: { "text/html": 1, "text/plain": 1, ...
     */
    nonXMLMimeTypes: { "text/html": 1, "text/plain": 1, "application/json": 1 },

    /**
     * @private
     */
    _createElementNSWorkaround_tempDoc: null,

    /**
     * Creates a new element whose name can contain a well-known prefix (like "wrs").
     * It uses createElement, because IE does not implement createElementNS. The element
     * is then appended to the specified target element.
     * @param doc The document the element should be created for.
     * @param name The element name which may contain a well-known prefix.
     * @returns {XMLElement} The new XMLElement.
     */
    appendElementWithPrefix: function(/* XMLElement */ targetElement, /* String */ name, /* Boolean? */ insertBeforeTargetElement)
      {
        var doc = targetElement.ownerDocument;
        if (typeof doc == "undefined") doc = targetElement;
        if (name.indexOf(":") <= 0) {
          if (insertBeforeTargetElement) {
            return targetElement.parentNode.insertBefore(doc.createElement(name), targetElement);
          }
          return targetElement.appendChild(doc.createElement(name));
        }
        var nameParts = name.split(":");
        var prefix = nameParts[0];
        var namespaceURI = bcdui.core.xmlConstants.namespaces[prefix];

        if (bcdui.core.browserCompatibility.ie._createElementNSWorkaround_tempDoc == null) {
          bcdui.core.browserCompatibility.ie._createElementNSWorkaround_tempDoc = bcdui.core.browserCompatibility.ie.newIE_DOMDocument();
          bcdui.core.browserCompatibility.ie._createElementNSWorkaround_tempDoc.async = false;
        }
        var xmlElementDecl = "<" + name + " xmlns:" + prefix + "=\"" + namespaceURI + "\"></" + name + ">";
        bcdui.core.browserCompatibility.ie._createElementNSWorkaround_tempDoc.loadXML(xmlElementDecl);
        if (insertBeforeTargetElement) {
          return targetElement.parentNode.insertBefore(bcdui.core.browserCompatibility.ie._createElementNSWorkaround_tempDoc.documentElement, targetElement);
        }
        return targetElement.appendChild(bcdui.core.browserCompatibility.ie._createElementNSWorkaround_tempDoc.documentElement);
      },

    /**
     * @private
     */
    createMSObject: function(id)
      {
        if (typeof bcdui.core.browserCompatibility.ie.currentMSXMLVersion == "undefined" ||
            !bcdui.core.browserCompatibility.ie.msxmlVersions.indexOf(bcdui.core.browserCompatibility.ie.currentMSXMLVersion)!==-1) {
          for (var i = 0; i < bcdui.core.browserCompatibility.ie.msxmlVersions.length; i++) {
            try {
              var object = new ActiveXObject(id + "." + bcdui.core.browserCompatibility.ie.msxmlVersions[i]);
              bcdui.core.browserCompatibility.ie.currentMSXMLVersion = bcdui.core.browserCompatibility.ie.msxmlVersions[i];
              return object;
              break;
            } catch (e) {
            }
          }
          bcdui.log.error("No msxml available.");
          return null;
        }
        return new ActiveXObject(id + "." + bcdui.core.browserCompatibility.ie.currentMSXMLVersion);
      },

    /**
     * @private
     */
    newIE_DOMDocument: function()
      {
        var domDocument = new bcdui.core.browserCompatibility.MSXMLDocumentWrapper();
        domDocument.setProperty("ForcedResync", false);
        try {
          domDocument.setProperty("SelectionLanguage", "XPath");
        } catch (e) {
        }
        try {
          domDocument.setProperty("ResolveExternals", true);
          domDocument.setProperty("ProhibitDTD", false);
          domDocument.setProperty("AllowDocumentFunction", true);
          domDocument.setProperty("AllowXsltScript", true);
        } catch (e) {
          // Works only in MSXML 6, needed to re-open restrictions which became effective in msxml6
        }

        bcdui.core.browserCompatibility.ie.setSelectionNamespaces(domDocument);

        return domDocument;
      },

    /**
     * @private
     */
    setSelectionNamespaces: function(/* XMLDocument */ domDocument)
      {
        var nsDef = "";
        var key;
        for (key in bcdui.core.xmlConstants.namespaces)
          if (typeof bcdui.core.xmlConstants.namespaces[key] != "function")
            nsDef += "xmlns:" + key + "='" + bcdui.core.xmlConstants.namespaces[key] + "' ";
        for (key in bcdui.core.nsResolvableArray)
          if (typeof bcdui.core.nsResolvableArray[key] != "function")
            nsDef += "xmlns:" + key + "='" + bcdui.core.nsResolvableArray[key] + "' ";
        domDocument.setProperty("SelectionNamespaces", nsDef);
      },

    /**
     * Sadly, new DOMParser().parseFromString() (IE9) does produce an XML document which is not aware of xPath,
     * so we need keep using MSXML and loadXML
     */
    createIE_DOMFromXmlString: function(serializedDoc)
      {
        try {
          var dom = bcdui.core.browserCompatibility.ie.newIE_DOMDocument();
          dom.msxmlImpl.async = false;
          serializedDoc = bcdui.core.browserCompatibility._addDefaultNamespacesToDocumentElement(serializedDoc);
          dom.loadXML(serializedDoc);
          if(dom.msxmlImpl.parseError.errorCode != 0){
            throw new Error("Reason: " + dom.msxmlImpl.parseError.reason);
          } else if(dom.documentElement == null) {
            throw new Error("Reason: unknown; result is null.");
          }
          return dom;
        } catch (e) {
          throw new Error("Failed to create de-serialize document: " +
             ((typeof e == 'object' && typeof e.message != 'undefined') ? e.message : e));
        }
      },

    /**
     * @private
     */
    setNamespacesForMSXMLDocument: function(domDoc)
      {
        var nsDef = "";
        for (var key in bcdui.core.xmlConstants.namespaces) {
          nsDef += "xmlns:" + key + "='" + bcdui.core.xmlConstants.namespaces[key] + "' ";
        }
        for (var key in this.nsResolvableArray) {
          nsDef += "xmlns:" + key + "='" + bcdui.core.nsResolvableArray[key] + "' ";
        }
        domDoc.setProperty("SelectionNamespaces", nsDef);
      },

    /**
     * @private
     */
      cloneDocument: function(doc) {
        if( doc=== null )
          return null;
        else if( ! doc.nodeType)
          return JSON.parse(JSON.stringify(doc));
        else 
          return new bcdui.core.browserCompatibility.MSXMLDocumentWrapper( (doc.msxmlImpl || doc).cloneNode(true) );
      }

  }; // bcdui.util.namespace bcdui.core.browserCompatibility.ie


  /**
   * Verify that enforced msxml version (via URL param) is available
   * @ignore
   */
  (function() {
    var msxmlParam = bcdui.core.getUrlParameter(location.href, "msxml");
    if (msxmlParam != null) {
      msxmlParam += ".0";
      if (bcdui.core.browserCompatibility.ie.msxmlVersions.some(function(v) { return v == msxmlParam; })) {
        bcdui.core.browserCompatibility.ie.msxmlVersions = [ msxmlParam ];
      } else {
        alert("Not supported msxml version: " + msxmlParam);
      }
    }
  })();

  /*
   * Re-assign the generic DOM functions to the IE specific ones.
   */
  /**
   * @ignore
   */
  bcdui.core.browserCompatibility.cloneDocument = bcdui.core.browserCompatibility.ie.cloneDocument;
  /**
   * @ignore
   */
  bcdui.core.browserCompatibility.newDOMDocument = bcdui.core.browserCompatibility.ie.newIE_DOMDocument;
  /**
   * @ignore
   */
  bcdui.core.browserCompatibility.createDOMFromXmlString = bcdui.core.browserCompatibility.ie.createIE_DOMFromXmlString;
  /**
   * @ignore
   */
  bcdui.core.browserCompatibility.appendElementWithPrefix = bcdui.core.browserCompatibility.ie.appendElementWithPrefix;

  bcdui.core.browserCompatibility.ie.XHRwithFreeThreadedDocuments = class
  /**
   * @lends bcdui.core.browserCompatibility.ie.XHRwithFreeThreadedDocuments.prototype
   */
  {

    /**
     * @constructs
     * @class
     *   A class implementing the XmlHttpRequest interface for Internet Explorer so that it
     *   always created "FreeThreadedDOMDocuments". The default IE implementation creates
     *   non free-threaded document which cannot be used to create an XSLT processor. This
     *   bug is worked around by this class.
     *
     * Sadly, we cannot switch to new (IE9) XMLHttpRequest. Because
     * A) The new native docs do not support Xpath and
     * b) By setting responseType = 'msxml-document' we can get MSXML docs instead of the native ones, having support for xPath,
     * but the version then is only IXMLDomDocument2, which is incompatible with Msxml2.XSLTemplate.6.0 (being IXMLDomDocument3),
     * XSLTProcessor will complain when using it as a parameter to a stylesheet.
     */
    constructor(args)
      {
        this.domDocument = null;
        this.xhr = null;
        this.url = "";
        this.method = "";
        this.async = true;
        this.readyState = -1;
        this.isHTML = false;
        this.xhr_reqHeaders = {};
      }

    _doReadyStateChange_xml()
      {
        this.readyState = this.domDocument.msxmlImpl.readyState;
        if (this.readyState == 4) {
          bcdui.core.browserCompatibility.ie.setNamespacesForMSXMLDocument(this.domDocument);
          this.domDocument.documentElement = this.domDocument.msxmlImpl.documentElement;
          this.responseXML = this.domDocument;
          this.status = 200;
          this.statusText = "OK";
          this.responseHeaders = {};
        }
        if (this.domDocument.msxmlImpl.parseError.errorCode != 0) {
          // The status must be set so that it is still handled as error.
          this.status = -1;
        }
        if (typeof this.onreadystatechange == "function") {
          this.onreadystatechange();
        }
      }

    _doReadyStateChange_noXML()
      {
        this.readyState = this.xhr.readyState;
        if (this.readyState == 4) {
          this.responseXML = new bcdui.core.browserCompatibility.MSXMLDocumentWrapper(this.xhr.responseXML);
          bcdui.core.browserCompatibility.ie.setNamespacesForMSXMLDocument(this.responseXML);
          this.responseText = this.xhr.responseText;
          this.status = this.xhr.status;
          this.statusText = this.xhr.statusText;
          this.responseHeaders = this.xhr.getAllResponseHeaders();
        }
        if (typeof this.onreadystatechange == "function") {
          this.onreadystatechange();
        }
      },

    open(method, url, async)
      {
        this.url = url;
        this.method = method || "GET";
        this.async = typeof async == "undefined" ? true : async;
      }

    setRequestHeader(key, value)
      {
        if (key != null && value != null && key.toLowerCase() == "accept") {
          this.isHTML = value.split(",").every(function(mimeType) { return mimeType.trim() in bcdui.core.browserCompatibility.ie.nonXMLMimeTypes });
        }
        this.xhr_reqHeaders[key] = value;
      }

    getAllResponseHeaders()
    {
      return this.responseHeaders;
    }
      
    send(postData)
      {
        /*
         * NON-xml data is processed with the normal XHR. Additionally the DOMDocument can only
         * do GET requests so we need to use XHR on POST requests.
         */
        if (this.isHTML || (typeof this.method != "undefined" && this.method.toLowerCase() != "get")) {
          this.xhr = bcdui.core.browserCompatibility.ie.createMSObject("Msxml2.XMLHTTP");
          this.xhr.onreadystatechange = this._doReadyStateChange_noXML.bind(this);
          this.xhr.open(this.method, this.url, this.async);
          for (var hdrName in this.xhr_reqHeaders) {
            this.xhr.setRequestHeader(hdrName, this.xhr_reqHeaders[hdrName])
          }
          this.xhr.send(postData==null?null:(postData.msxmlImpl||postData));
        } else {
          this.domDocument = bcdui.core.browserCompatibility.ie.newIE_DOMDocument();
          this.domDocument.URL = this.url;
          this.domDocument.msxmlImpl.onreadystatechange = this._doReadyStateChange_xml.bind(this);
          this.domDocument.load(this.url);
        }
      }
  };

  bcdui.core.browserCompatibility.jQueryXhr = function() { return new bcdui.core.browserCompatibility.ie.XHRwithFreeThreadedDocuments(); };
}
//-----------------------------------------------------------------------------
// END: Implementation of MSXML-specific functions in all IE Browsers.
//-----------------------------------------------------------------------------


//-----------------------------------------------------------------------------
// BEGIN: Implementation of Specific functions in all non-IE Browsers.
// -----------------------------------------------------------------------------
if (!bcdui.browserCompatibility.isIE) {

  /**
   * @private
   */
  bcdui.browserCompatibility.BCDUINodeList = function(doc, baseNode, xPathExpression)
  {
    try {
      var nodeIterator = doc.evaluate(xPathExpression, baseNode, bcdui.core.browserCompatibility.resolveNamespace, 0, null);
    } catch( e ) {
      throw new Error("Invalid XPath: '"+xPathExpression+"'");
    }
    var node = null;
    this.length = 0;
    while ( (node = nodeIterator.iterateNext()) != null ) {
      this[this.length++] = node;
    }
  }

  /**
   * @private
   */
  bcdui.browserCompatibility.BCDUINodeList.prototype.item = function(index)
  {
    if (index < 0 || index >= this.length) return null;
    return this[index];
  }

  /**
   * @ignore
   */
  XSLTProcessor.prototype.addParameter = function(name, value)
  {
    this.setParameter(null, name, value);
  }

  XMLDocument.prototype.selectSingleNode = function(xPathExpression)
  {
    return this.evaluate(xPathExpression, this, bcdui.core.browserCompatibility.resolveNamespace, 0, null).iterateNext();
  }

  /**
   * @ignore
   */
  XMLDocument.prototype.selectNodes = function(xPathExpression)
  {
    return new bcdui.browserCompatibility.BCDUINodeList(this, this, xPathExpression);
  }

  /**
   * @ignore
   */
  XMLDocument.prototype.createNode = function(nodeType, nodeName, namespaceURI)
  {
    if (nodeType != 1) throw new Error("createNode: Cannot create nodes other than Element nodes");
    if (namespaceURI == null) throw new Error("createNode: Namespace URI must not be null");
    var name = nodeName;
    var pos = nodeName.indexOf(':');
    var prefix = "";
    if (pos > 0) {
      prefix = nodeName.substr(0, pos);
      name = nodeName.substr(pos + 1);
    }
    var result = this.createElementNS(namespaceURI, name);
    if (prefix != null && prefix != "") result.prefix = prefix;
    return result;
  }

  /**
   * This is to support handling a plain doc similar to a bcd dataprovider. Similar means, fire events and so on is not dummied here
   * @ignore
   */
  XMLDocument.prototype.getData = function() { return this; };

  /**
   * @ignore
   */
  Node.prototype.selectSingleNode = function(xPathExpression)
  {
    return (this.ownerDocument || this).evaluate(xPathExpression, this, bcdui.core.browserCompatibility.resolveNamespace, 0, null).iterateNext();
  }

  /**
   * @ignore
   */
  Node.prototype.selectNodes = function(xPathExpression)
  {
    return new bcdui.browserCompatibility.BCDUINodeList(this.ownerDocument || this, this, xPathExpression);
  }

  /**
   * @ignore
   */
  Element.prototype.selectNodes = Node.prototype.selectNodes;

  /**
   * @ignore
   */
  Element.prototype.selectSingleNode = Node.prototype.selectSingleNode;

  /**
   * @ignore
   */
  Attr.prototype.__defineGetter__("text", function()
  {
    return this.nodeValue;
  });

  /**
   * @ignore
   */
  Attr.prototype.__defineSetter__("text", function(txt)
    {
      this.nodeValue = txt;
    });

  /**
   * TODO: to recursiv and consistent with ie, am besten auch normalize fuer xml
   * @ignore
   */
  Element.prototype.__defineGetter__("text", function()
  {
    var result = "";
    var children = this.childNodes;
    for (var i = 0; i < children.length; ++i) {
      var node = children.item(i);
      if (node.nodeType == 3) {
        result = result + node.nodeValue;
      }
    }
    return result;
  });

  /**
   * @ignore
   */
  Element.prototype.__defineSetter__("text", function(txt)
    {
      //we emulate IE here, so remove all children and set textcontent
      while(this.firstChild!=null){
        this.removeChild(this.firstChild);
      }

      // Add the text
      this.appendChild(this.ownerDocument.createTextNode(txt));
    });
}
//-----------------------------------------------------------------------------
//END: Implementation of specific functions in all non-IE Browsers.
//-----------------------------------------------------------------------------

/**
 * Adds all namespace declarations xmlns:wrs=.. and so on on text level to the root of the document
 * for which a (well-known) prefix is found in the document (including prefixes in attributes)
 * This is a workaround for
 * 1) An xsl is embedded in another document and extracted, serialized and used to create a new static model like scorecard aspects,
 * the serializers do not include namespace declarations then, which are only within attributes like match or select
 * 2) Same applies for gecko and webkit for xslt generation
 * @param (String) serializedDoc The doc to work on
 * @return {String} The serialized doc with the updated root element.
 * @private
 */
bcdui.core.browserCompatibility._addDefaultNamespacesToDocumentElement = function(/* String */ serializedDoc)
{
  // PrefixArray to hold all words, followed by : but not by :: (axes) or by :/ (url)
  var prefixArray = serializedDoc.match(/([\w-]+)(?=:(?!(:|\/)))/g);
  if(! prefixArray)
    return serializedDoc;
  prefixArray = prefixArray.reduce(function(a, b) { if(a.indexOf(b)===-1) a.push(b); return a; }, []);;

  var documentAttributes = bcdui.core.xmlLoader._getDocumentElementAttributes(serializedDoc);

  for (var nsName in bcdui.core.xmlConstants.namespaces) {
    if( prefixArray.indexOf(nsName) != -1 ) {
      documentAttributes["xmlns:" + nsName] = bcdui.core.xmlConstants.namespaces[nsName];
    }
    else
      delete documentAttributes["xmlns:"+nsName]; // get rid of all well-known but unused namespaces
  }
  var m = serializedDoc.match(/<([\w-]+:)?([\w-]+)\W/); // [1] will be the first prefix (or undefined), [2] will be the top level tag

  // New Root elem keeps name and prefix, gets its attributes back and gets all default namespaces on top
  var newElem = "<" + (m[1]||"") + m[2];
  for (var attrName in documentAttributes) {
    newElem += " " + attrName + "=\"" + documentAttributes[attrName] + "\"";
  }
  // Close the tag, treating empty tags and opening tags correctly
  var endOfRoot = serializedDoc.match(new RegExp("<" + (m[1]||"") + m[2] + "\\s*([^>]*)"))[0];
  newElem += endOfRoot.substring(endOfRoot.length-1) == "/" ? "/>" : ">";

  // Replace the first occurance of the tag
  return serializedDoc.replace(new RegExp("<" + (m[1]||"") + m[2] + "\\s*([^>]*)>"), newElem);
};
