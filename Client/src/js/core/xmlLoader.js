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
 * This file contains definition of the xmlLoader class. It also registers the Singleton
 * instance of this class as "xmlLoader" in the "bcdui.core" namespace.
 *
 */

bcdui.core.XMLLoader = class
/**
 * @lends bcdui.core.XMLLoader.prototype
 */
{
  /**
   * @classdesc
   *   Encapsulation of all XML related functions such as the XML transfer from and to
   *   the server, XML document creation and XSLT processing.
   * 
   * @constructs
   * @private
   */
  constructor()
  {
  }

  /**
   * Sets the xml:base attribute of the document element of the doc provided as
   * argument.
   * @param doc The XML document the xml:base attribute should be set on.
   * @param base The value of the xml:base attribute.
   * @private
   */
  _setXMLBase(/* XMLDocument */ doc, /* string */ base)
    {
      if (doc == null || doc.documentElement == null) return;
      doc.documentElement.setAttribute("xml:base", bcdui.util.url.extractFolderFromURL(base));
    }

  /**
   * This function returns an XPointer with the "xpointer()" scheme if the passed
   * xPointer uses the element() scheme. For exampel the xpointer "element(myId)"
   * is translated to "xpointer(id('myId'))".
   * @param xPointer An XPointer string which may begin with "element(".
   * @return Either the input string or the element() scheme transformed into the
   * xpointer() scheme.
   * @private
   */
  _translateXIncludeElementSchemeToXPointer(/* string */ xPointer)
    {
      if (xPointer == null) return xPointer;
      xPointer.trim();
      if (xPointer.substr(0, 8) != "element(") return xPointer;
      var ptr = xPointer.substring(8, xPointer.length - 1);
      var pos = ptr.indexOf("/");
      if (pos < 0) {
        return "xpointer(id('" + ptr + "'))";
      } else if (pos > 0) {
        ptr = "id('" + ptr.substr(0, pos) + "')" + ptr.substr(pos);
      }
      return "xpointer(" + ptr.replace(new RegExp("/(\\d+)", "g"), "/*[$1]") + ")";
    }

  /**
   * Finds the elements identified by a specific XPointer within the provided
   * XML document. This function is used for XInclude resolution to select the
   * elements that replace the XInclude after loading.
   * @param doc The document the xPointer is applied on.
   * @param xPointer An xPointer selecting elements out of a document. If it
   * is null it is considered to be equal to "element(/1)".
   * @return {Array} The list of elements matching the xPointer.
   * @private
   */
  _getDataFromXPointer(/* XMLDocument */ doc, /* string? */ xPointer)
    {
      if (xPointer == null || !xPointer.trim()) return Array.from(doc.selectNodes("/*"));
      xPointer = this._translateXIncludeElementSchemeToXPointer(xPointer);
      if (xPointer.substr(0, 9) == "xpointer(") {
        xPointer = xPointer.substring(9, xPointer.length - 1);
      }
      if (!xPointer.trim() || xPointer == "/") {
        xPointer = "/*";
      }
      return Array.from(doc.selectNodes(xPointer));
    }

  /**
   * A function that is called when an XInclude has been loaded an needs to be inserted into
   * the hosting document. Therefore this function evaluates the (optional) XPointer of the
   * XInclude and inserts the respective elements into the "xincludeDoc" at the place marked
   * by the "xinclude" element. Finally it deletes the XInclude from its doc (which is NOT
   * the xincludeDoc!).
   * Attention: Elements of undeclared namespace in the included document will inherit the host documents'
   * default namespace if there is one. Sample: HTML tags without namespace xi:included in an XSLT variable body
   * would become (invalid) xslt elements. Thus: Always declare namespaces in documents to be included
   * @param {XMLElement} The XInclude to be replaced with its result.
   * @param {XMLDocument} xincludeDoc The XML document loaded from the href denoted by the XInclude.
   * @param {String} xincludeUrl The absolute URL the xincludeDoc has been loaded from. This is only for debugging.
   * @param {Function?} preProcessFkt An optional callback which is executed on the content (each individual element) which is about to be included
   * @private
   */
  _replaceXIncludeWithResult( /* object */ args )
    {
      var xinclude = args.xinclude;
      var xincludeDoc = args.xincludeDoc;
      var xincludeUrl = args.xincludeUrl;
      var preProcessFkt = args.preProcessFkt;

      if (xincludeDoc == null) return;

      if (bcdui.core.debug) {
        // Debug comment
        var xpointer = xinclude.getAttribute("xpointer");
        var comment = "XInclude loaded from URL: " + xincludeUrl + (xpointer == null ? "" : ("\nwith XPointer: " + xpointer));
        if (comment.indexOf("--") > 0) {
          // The string "--" is invalid in an XML comment so we need to
          // replace it with tilde characters
          comment = comment.replace(/-/g, "~");
        }
      }

      var elements = this._getDataFromXPointer(xincludeDoc, xpointer);
      if (elements.length == 1) {
        /*
         * We must make a replace if there is only one node, because we want to allow
         * an xinclude element as document element as well. Since there can only be one
         * single document element we cannot append the results first and then remove
         * the old include element.
         */
        if( preProcessFkt )
          elements[0] = preProcessFkt(elements[0]);
        xinclude.parentNode.replaceChild(elements[0].cloneNode(true), xinclude)
      } else {
        elements.forEach(function(element) {
          if (bcdui.core.debug) {
            xinclude.parentNode.insertBefore(xinclude.ownerDocument.createComment(comment), xinclude);
          }
          if( preProcessFkt )
            element = preProcessFkt(element);
          xinclude.parentNode.insertBefore(element.cloneNode(true), xinclude);
        });
        xinclude.parentNode.removeChild(xinclude);
      }
    }

  /**
   * @private
   */
  _processSingleBcdIncludeWithNestedRequestDoc(/* XMLElement */ bcdInclude, /* Function */ fn)
    {
      var firstElementChild = bcdInclude.selectSingleNode("*");
      var nestedStatusDoc = bcdui.core.browserCompatibility.newDOMDocument();
      nestedStatusDoc.appendChild(firstElementChild.cloneNode(true));
      bcdInclude.removeChild(firstElementChild);
      this._processAllIncludes( {doc: nestedStatusDoc, onSuccess: function(doc)
        {
          bcdui.core.compression.compressDOMDocument(doc, function(compressedString) {
            bcdInclude.setAttribute("href", bcdui.core.setUrlParameter(
                bcdInclude.getAttribute("href"), "guiStatusGZ", compressedString));
            fn();
          }.bind(this));
        }.bind(this)
      } );
    }

  /**
   * @private
   */
  _processBcdIncludesWithNestedRequestDoc(/* NodeList */ bcdIncludes, /* Function */ fn)
    {
      var counter = bcdIncludes.length;
      for (var i = 0; i < bcdIncludes.length; ++i) {
        this._processSingleBcdIncludeWithNestedRequestDoc(bcdIncludes.item(i), function() {
          if (--counter == 0) {
            fn();
          }
        });
      }
    }

  /**
   * @private
   * @param {String}      xPath
   * @param {XMLDocument} doc
   * @param {function}    onSuccess
   * @param {function?}   onFailure Optional, called with a message as param, otherwise, an exception is thrown
   */
  _processAllBcdIncludes( /* Object */ args )
    {
      var bcdIncludesWithNestedRequestDoc = args.doc.selectNodes(args.xPath);
      if (bcdIncludesWithNestedRequestDoc.length == 0) return false;
      this._processBcdIncludesWithNestedRequestDoc(bcdIncludesWithNestedRequestDoc, function() {
        this._processAllIncludes( {doc: args.doc, onSuccess: args.onSuccess, onFailure: args.onFailure} );
      }.bind(this));
      return true;
    }

  /**
   * This function (recursively) resolves all XIncludes and bcdxml:includes found in
   * the document and calls the function "onSuccess" when all XIncludes are resolved and
   * inserted in the document. The callback function gets the combined document as
   * parameter. To load nested XInclude element this function uses the "load" function.
   * If no XInclude is found it directly calls the "onSuccess" function with "doc" as argument.
   * @param {XMLDocument} doc The XML document the XIncludes should be processed on.
   * @param {Function?} onSuccess An optional callback which is executed after successful operation
   * @param {Function?} onFailure Optional, called with a message as param, otherwise, an exception is thrown
   * @param {Function?} preProcessFkt An optional callback which is executed on the content (each individual element) which is about to be included
   * and inserted into the "doc". It gets the document as parameter.
   * @private
   */
  _processAllIncludes( /* object */ args )
    {
      var doc = args.doc;
      var preProcessFkt = args.preProcessFkt;
      /*
       * We must only resolve the top-level bcdIncludes, because nested ones are resolved by the
       * _processAllBcdIncludes method itself.
       */
      if (this._processAllBcdIncludes( { xPath: "//bcdxml:include[* and not(ancestor::bcdxml:include)]",
                                         doc: doc, onSuccess: args.onSuccess, onFailure: args.onFailure } ) )
        return;

      var xincludes = doc.selectNodes("//xi:include | //bcdxml:include");
      var xincludeCount = xincludes.length;
      if (xincludeCount > 0) {
        Array.from(xincludes).forEach(function(xinclude) {
          var xincludeUrl = bcdui.util.url.resolveURLWithXMLBase(xinclude, xinclude.getAttribute("href"));
          this.load({
            url: xincludeUrl,
            onSuccess: function(xincludeDoc) {
              this._processAllIncludes( { doc: xincludeDoc, onFailure: args.onFailure, onSuccess: function() {
                this._replaceXIncludeWithResult( {xinclude: xinclude, xincludeDoc: xincludeDoc, xincludeUrl: xincludeUrl, preProcessFkt: preProcessFkt } );
                if (--xincludeCount == 0) {
                  args.onSuccess(doc);
                }
              }.bind(this), preProcessFkt: preProcessFkt } );
            }.bind(this),
            onFailure: function(transport) {
              // Include may be optional
              if( xinclude.namespaceURI=="http://www.businesscode.de/schema/bcdui/bcdxml-1.0.0"
                  && xinclude.getAttribute("isRequired")=="false"  ) {
                if (--xincludeCount == 0) {
                  args.onSuccess(doc);
                }
              } else { // If not optional: standard behavior
                if( args.onFailure )
                  args.onFailure("xinclude, '" + xincludeUrl + "' could not be resolved.");
                else {
                  bcdui.log.error("BCD-UI: xinclude, '" + xincludeUrl + "' could not be resolved.");
                  throw Error("BCD-UI: xinclude, '" + xincludeUrl + "' could not be resolved.");
                }
              }
            }.bind(this)
          });
        }, this);
      } else {
        args.onSuccess(doc);
      }
    }

  /**
   * @param xmlElement
   * @returns {string}
   * @private
   */
  _getText(xmlElement)
    {
      if (xmlElement == null) return "";
      var textNodes = xmlElement.selectNodes(".//text()");
      var result = "";
      for (var i = 0; i < textNodes.length; ++i) {
        var value = textNodes.item(i).nodeValue;
        if (value != null) result += value;
      }
      return result;
    }

  /**
   * checks the given document for a SOAP Fault envelope and returns
   * either NULL (if no fault envelope found) or the result object with following properties:
   *
   * <ul>
   *  <li>errorText{String}: code and reason as described by soap fault</li>
   *  <li>wrsValidationResultNode{Node}: reference to the wrs:ValidationResult element, if any</li>
   * </ul>
   *
   * Parameters to the function:
   *
   * @param {Object} args The parameter map must contain:
   *   <ul>
   *     <li>doc: {XMLDocument}</li>
   *   </ul>
   * @return null or result object (read above)
   * @private
   */
  _checkForSOAPFault( /* Object */ args )
    {
      if (args.doc == null) return null;
      var faultElements = args.doc.selectNodes("/env:Envelope/env:Body/env:Fault");
      if (faultElements == null || faultElements.length == 0) return null;
      var faultElement = faultElements.item(0);
      var result = {};

      result.errorText = "[" + this._getText(faultElement.selectSingleNode("env:Code")) + "] " + this._getText(faultElement.selectSingleNode("env:Reason"));
      result.wrsValidationResultNode = args.doc.selectSingleNode("/env:Envelope/env:Body/env:Fault/env:Detail/*/wrs:ValidationResult");

      return result;
    }

  /**
   * Asynchronously loads an XML document from a URL and executes a function when
   * it is finished or fails. The loading is done with a HTTP GET request and it
   * resolves all xincludes found in the document.
   * @param {Object} args The parameter map must contain:
   *   <ul>
   *     <li>url: {String} The URL the XML document comes from.</li>
   *     <li>onSuccess: {Function} A function called when the request has finished
   *         loading. This function gets the XML document as argument.</li>
   *     <li>onFailure: {Function?} Optional, called with the transport object as param, otherwise, an exception is thrown</li>
   *     <li>onComplete: {Function?} Optional, after onSuccess and onFailure</li>
   *     <li>method: {String?} An optional http method, default is GET
   *     <li>skipSoapFault: {boolean?} An optional, if true, no default Soap fault handling is done
   *   </ul>
   */
  load(/* object */ args)
    {
      var traceLoadStart = bcdui.log.isTraceEnabled() ? (new Date().getTime()-bcdui.log.applicationStartTs) : 0;

      // translate context path relative urls
      if (args.url.startsWith("bcduicp://"))
        args.url = bcdui.config.contextPath + "/" + args.url.substring(10);

      // We need access to the original responseXML but the one jQuery returns is only a parsed DOM of respnseText (see jQuery.ajaxSettings.converters)
      // a) The original responseXML preserves the documents baseURI, which is important for relative paths for import / include, the parsed one does not have it
      // b) In case of IE / Egde we have wrapped XHR to return a XSLT+XPath capable document and not the 'native' one since IE10
      // Thats why we keep track of xhr here
      var xhr = bcdui.core.browserCompatibility.jQueryXhr();
      var xhrFactory = function() { return xhr };
      
      jQuery.ajax({
            method: args.method||"GET",
            contentType: "application/xml",
            dataType: "text",  // Suppress jQuery XML-parsing, see comment on responseXML above
            url : args.url,
            headers : { "X-BCD.pageHash"    : (bcdui.frame.pageHash||""),
                        "X-BCD.requestHash" : (bcdui.frame.pageHash||"")+"."+Math.round(Math.random()*1000) },
            xhr: xhrFactory,
            success : function (response, successCode, jqXHR) {

              // Use the low-level responseXML, not response, see comment above
              response = xhr.responseXML
              jqXHR.responseXML = xhr.responseXML;

              // Usually we wait for the document in parallel to doing stuff on the client
              // Here we detect whether the waiting for the server could not be used for other activities
              // In these cases it may be worth it (if possible) to trigger the load earlier
              if( bcdui.log.isTraceEnabled() && (new Date().getTime() - bcdui.log.lastLogDate > 100 ) )
                bcdui.log.warn("Client probably lost "+(new Date().getTime()-bcdui.log.lastLogDate)+"ms when waiting for a server response without being able to use the time. Consider triggering the load earlier and delay other tasks (was triggered "+(traceLoadStart/1000)+"). Url: "+args.url);

              // It seems that firefox (10-17) executes async http requests sync in case the loaded resources are cached
              // In these cases, we can experience a "too much recursion" error, which we prevent  here by enforcing async behaviour
              var deferred = function(dataDoc, jqXHR) {
                if(!dataDoc && jqXHR.responseText){
                  if(typeof console)console.error("failed to parse XML",{
                    url:args.url
                  });
                  throw "failed to parse XML";
                }
                var soapFaultResult =  args.skipSoapFault ? 0 : this._checkForSOAPFault( {doc: dataDoc} );
                if( !soapFaultResult ) {
                  this._setXMLBase(dataDoc, bcdui.util.url.translateRelativeURL(location.href, args.url));
                  this._processAllIncludes( {doc: dataDoc, onSuccess: args.onSuccess, onFailure: args.onFailure} );
                } else if (bcdui.util.isFunction(args.onFailure)) {
                  args.onFailure("BCD-UI: loading '"+args.url+"' failed.");
                }
              }.bind(this, response, jqXHR);

              // redirect in case of a session timeout (the returned url is different to the requested one, response contains the login html page) 
              var resource = args.url.substring(args.url.lastIndexOf("/") + 1);
              var rUrl = xhr.responseURL || xhr.url;
              if (rUrl.indexOf(resource) == -1) {
                bcdui.widget.showModalBox({titleTranslate: "bcd_SessionTimeout", messageTranslate: "bcd_SessionTimeoutMessage", onclick: function() {window.location.href = window.location.href;}});
                return;
              }

              setTimeout(deferred);
            }.bind(this),
            error: function(jqXHR, textStatus, errorThrown) {

              // test for C00CE00D error code which corresponds to an element used but not declared in the DTD/Schema
              // we can use this to detect a session timeout where the login page (html) is loaded for a differently requested filetype
              // FF & Chrome will run into success in this case
              if (xhr.domDocument && xhr.domDocument.msxmlImpl && xhr.domDocument.msxmlImpl.parseError && xhr.domDocument.msxmlImpl.parseError.errorCode == -1072898035) {
                bcdui.widget.showModalBox({titleTranslate: "bcd_SessionTimeout", messageTranslate: "bcd_SessionTimeoutMessage", onclick: function() {window.location.href = window.location.href;}});
                return;
              }

              if (bcdui.util.isFunction(args.onFailure)) {
                // Use the low-level responseXML, see comment above
                jqXHR.responseXML = xhr.responseXML;
                args.onFailure("BCD-UI: loading '"+args.url+"' failed.", jqXHR, textStatus, errorThrown);
              }
            },
            complete: function( jQXhr, textStatus ) {
              if (bcdui.util.isFunction(args.onComplete)) {
                // Use the low-level responseXML, see comment above
                jqXHR.responseXML = xhr.responseXML;
                args.onComplete( jQXhr );
              }
            }
          });
    }

  /**
   * Asynchronous post operation sending an XML document to the server and getting
   * another XML document back. Like the "load" function it executes a function when
   * it is finished or fails. It also resolves XIncludes on the document returned,
   * but these includes are loaded via GET.
   * @param {Object} args The parameter map must contain:
   *   <ul>
   *     <li>url: {String} The URL the XML document comes from.</li>
   *     <li>isSync: {Boolean} Set to FALSE / TRUE to enable sync/async request. Default is FALSE.</li>
   *     <li>doc: {XMLDocument} The document to be posted to the server.</li>
   *     <li>onSuccess: {Function} A function called when the request has finished
   *         loading. This function gets the XML document as argument.</li>
   *     <li>onFailure: {Function?} Optional, called with the transport object as param, otherwise, an exception is thrown</li>
   *     <li>onComplete: {Function?} Optional, after onSuccess and onFailure</li>
   *     <li>onWrsValidationFailure: {Function?} Optional, called with the wrs:ValidationResult element as param in case wrs validation failure, otherwise, an exception is thrown</li>
   *     <li>skipSoapFault: {boolean?} An optional, if true, no default Soap fault handling is done
   *   </ul>
   */
  post(/* object */ args)
    {
      var xhr = bcdui.core.browserCompatibility.jQueryXhr();
      var xhrFactory = function() { return xhr };
      jQuery.ajax({
            method: "POST",
            contentType: "application/xml",
            dataType: "text",  // Suppress jQuery XML-parsing, see comment on responseXML above
            async: args.isSync == null ? true : !args.isSync,
            url : args.url,
            headers : {
              "X-BCD.pageHash" : (bcdui.frame.pageHash||""),
              "X-BCD.requestHash" : (bcdui.frame.pageHash||"")+"."+Math.round(Math.random()*1000)
            },
            data: new XMLSerializer().serializeToString(args.doc),
            xhr: xhrFactory,
            success : function(dataDoc, successCode, jqXHR) {
              // Use the low-level responseXML, see comment above
              jqXHR.responseXML = xhr.responseXML;

              if (!bcdui.browserCompatibility.isIE) {
                /*
                 * On IE the response.getHeader function does not yet work.
                 */
                if (jqXHR.getResponseHeader("Content-Length") == 0) {
                  bcdui.log.warn("Got empty response: This may lead to 'Kein Element gefunden' Exception in FireFox");
                  if (bcdui.util.isFunction(args.onSuccess)) {
                    args.onSuccess(null);
                  }
                  return;
                }
                var contentType = jqXHR.getResponseHeader("Content-Type");
                if (contentType == null) {
                  bcdui.log.warn("No content type in response of: " + args.url);
                } else if (!contentType.indexOf("/xml") < 0) {
                  bcdui.log.warn("Unexpected content type \"" + contentType + "\" for XML request: " + args.url);
                }
              }
              var dataDoc = jqXHR.responseXML;
              var soapFaultResult = args.skipSoapFault ? 0 : this._checkForSOAPFault( {doc: dataDoc} );
              if( !soapFaultResult ) {
                this._setXMLBase(dataDoc, bcdui.util.url.translateRelativeURL(location.href, args.url));
                this._processAllIncludes( {doc: dataDoc, onSuccess: args.onSuccess } );
              } else if (soapFaultResult.wrsValidationResultNode != null  && bcdui.util.isFunction(args.onWrsValidationFailure) ) {
                args.onWrsValidationFailure(soapFaultResult.wrsValidationResultNode);
              } else if (bcdui.util.isFunction(args.onFailure)) {
                args.onFailure("Posting '"+args.url+"' failed." + soapFaultResult.errorText );
              }
            }.bind(this),
            error: function(jqXHR, textStatus, errorThrown) {

              // test for C00CE00D error code which corresponds to an element used but not declared in the DTD/Schema
              // we can use this to detect a session timeout where the login page (html) is loaded for a differently requested filetype
              // FF & Chrome will run into success in this case
              if (xhr.domDocument && xhr.domDocument.msxmlImpl && xhr.domDocument.msxmlImpl.parseError && xhr.domDocument.msxmlImpl.parseError.errorCode == -1072898035) {
                bcdui.widget.showModalBox({titleTranslate: "bcd_SessionTimeout", messageTranslate: "bcd_SessionTimeoutMessage", onclick: function() {window.location.href = window.location.href;}});
                return;
              }

              if (bcdui.util.isFunction(args.onFailure)) {
                // Use the low-level responseXML, see comment above
                jqXHR.responseXML = xhr.responseXML;
                args.onFailure("Posting '"+args.url+"' failed.", jqXHR, textStatus, errorThrown);
              }
            },
            complete: function( jQXhr, textStatus ) {
              if (bcdui.util.isFunction(args.onComplete)) {
                // Use the low-level responseXML, see comment above
                jqXHR.responseXML = xhr.responseXML;
                args.onComplete( jQXhr );
              }
            }
          });
    }


  /**
   * If we have created an XML via XSLT, BCD provides several extra functionality being executed here
   * generated XMLs and XSLTs get their base-path adjusted from the generated to their own address
   * xi:include bcdxml:include are applied
   * browser dependent namespaces issues are addressed
   * If the result is again an XSLT, this is applied to the input again and so on until no XSLT is generated anymore
   * resultDoc: The document to take care for
   * args:
   * <ul>
   *  <li>processor: transformator used to create resultDoc, for output type</li>
   *  <li>stylesheetURL: url of the to create resultDoc, for base path adjustment</li>
   *  <li>xslt: from transformationChain.chain.phases.xslt</li>
   *  <li>onSuccess</li>
   *  <li>onFailure TODO handling</li>
   * </ul>
   */
  _asyncTransformToXMLPostProcess( /* Object */ args, /* Document */ resultDoc )
    {
      // We do not care about XML featues if this is a html document
      if( args.processor.outputFormat==="html" ) {
        args.onSuccess(resultDoc);
        return;
      }
      // Maybe a bcdxml:XsltNop (with media type xslt) was generated, we indicate null output -> input is reused by transformation chain.
      if( resultDoc.selectSingleNode("/*").nodeName==="bcdxml:XsltNop" ) {
        args.onSuccess(null);
        return;
      }

      /*
       * We may set the xml:base of the generated document, which is used for resolving relative import/include paths
       * 1) If not expicitely given (via bcdxml:base), the baseURI of the generating stylesheet becomes the generated xml's baseURI
       * 2) The baseURI of the generated doc may be given explicitely via bcdxml:base.
       * This can be done for example when generating a stylesheet with a template xslt.
       * The generating stylesheet may have a different base than the template, but paths in the template are relative to the template.
       * Then we can set the bcdxml:base of the generated stylesheet to the templates' path,
       * this will then be relative to the generating xslt which in turn can be relative, we need to "add" the paths
       * And the path of the generating document in turn is relative to the carrier page.
       * Sadly, if we do set xml:base directly in the generated document, it is dropped by the browser's parser, so we workaround (park) it in bcdxml:base
       */
      if( args.stylesheetURL ) {
        var xmlBase = args.stylesheetURL;
        if( resultDoc.documentElement.getAttribute("bcdxml:base") ) {
          xmlBase = bcdui.util.url.extractFolderFromURL(args.stylesheetURL)+resultDoc.documentElement.getAttribute("bcdxml:base");
          // extractFolderFromURL returns a URL including the contextPath (if its an absolute one), we trim it here
          if(xmlBase.startsWith(bcdui.getContextPath()+"/")){
            xmlBase=xmlBase.replace(bcdui.getContextPath(),"");
          }
          xmlBase = bcdui.util.url.resolveToFullURLPathWithCurrentURL(xmlBase);
        }
        this._setXMLBase(resultDoc,xmlBase);
      }

      /*
       * Resolve includes
       */
      this._processAllIncludes( { doc: resultDoc, onFailure: args.onFailure, onSuccess: function(result) {

        /*
         * Recusively apply XSLT until we get the final non-XSLT output
         * _handleGeneratedXslt may call us again for the same args.xslt
         */
        if( args.processor.outputFormat==="xslt" )
          bcdui.core.xmlLoader._handleGeneratedXslt( result, args );

        /*
         * leave XSLT recusion
         */
        else
          args.onSuccess(result);

        }.bind(this) 
      } );
    }

    /**
     * @return {Hashmap} The array of top-level attributes (incl namespace declarations).
     * @private
     */
    _getDocumentElementAttributes(/* String */ serializedDoc)
    {
      var matches = serializedDoc.match("<([^:]+:)?\\w+\\s+([^>]+)>");
      if( !matches )
        return {};
      var attributes = (matches[2] + " ").split(/["']( |\n|\/ $)/); // '/ $' happens in case of an empty element <../>, the space between / and $ is the one added in this line
      return attributes.reduce( function(map, val) { if (val) { var p = val.indexOf("="); if(p!=-1) map[val.substr(0, p).trim()] = val.substr(p+2); } return map;}, {} );
    }


  /**
   * Handles relative paths of xsl:import, xsl:include and global variables using document function
   * It can change them from a value relative to the documents xml:base to a different base = baseURL
   * Happens for example if a included file had paths relative to its position (xml:base) but is now in a
   * file with a different position. The hrefs should then be relative to the new postion (=baseURL)
   * An absolute path is expected to begin below the contextPath
   * @param {XMLDocument} The document to work on
   * @param (String) baseUrl, the new base URL to which all relative href in the doc should be calculated.
   * @private
   */
  _translateRelativeXSLImportUrlsToAbsolute(/* XMLDocument */ doc, /* String */ baseURL)
    {
      var imports = doc.selectNodes("/*/xsl:import | /*/xsl:include");
      baseURL = bcdui.util.url.resolveToFullURLPathWithCurrentURL(baseURL);
      for (var i = 0; i < imports.length; ++i) {
        var imp = imports.item(i);
        var href = imp.getAttribute("href");
        imp.setAttribute("href", bcdui.util.url.resolveURLWithXMLBase(imp, href));
      }
      var docFkts = Array.from(doc.selectNodes("/xsl:stylesheet//xsl:*[starts-with(@select, \"document('\") and not(starts-with(@select, \"document('')\"))]"));
      var documentFunctionFinder = new RegExp("^document\\('([^']+)'\\)");
      docFkts.forEach( function( docFktVar ) {
        var select = docFktVar.getAttribute("select");
        var matches = documentFunctionFinder.exec(select);
        if (matches != null && matches.length > 1) {
          select = select.replace(matches[1],bcdui.util.url.resolveURLWithXMLBase(docFktVar, matches[1]));
          docFktVar.setAttribute("select",select);
        }
      } );
    }

  /**
   * Executes an XSLT transformation until it either produces HTML or an XML or any other type
   * document which is not XSLT. To make this function work it is required to set the "media-type" of the
   * "xsl:output" element correctly. Since the function cannot inspect the XML document
   * of the processor provided it needs to know if the (first) processor creates HTML.
   * Therefore the "isHTML" argument needs to be set, based on the XSLT the "processor"
   * argument encapsulates.
   * doc: The document to take care for
   * args:
   * <ul>
   *  <li>processor: transformator used to create doc, for output type</li>
   *  <li>stylesheetURL: url of the to create doc, for base path adjustment</li>
   *  <li>xslt: from transformationChain.chain.phases.xslt</li>
   *  <li></li>
   * </ul>
   * @private
   */
    _handleGeneratedXslt( doc, args ) 
    {
      if( !doc.selectSingleNode("/*[local-name()='stylesheet']") )
        throw Error("Mediatype 'xslt' for non-stylesheet given in a genereated document by '"+args.stylesheetURL+"'");
      
      doc = bcdui.core.browserCompatibility.cleanupGeneratedXslt( {processor: args.processor, doc: doc} );
  
      /*
       * For generated xslts, fix up the URLs used by xsl:import / xsl:include, because the new document
       * does not have a base URI. An absolute path is expected to begin below the contextPath
       */
      if( args.stylesheetURL )
        this._translateRelativeXSLImportUrlsToAbsolute(doc, args.stylesheetURL.replace(bcdui.getContextPath(),""));
      else
        this._translateRelativeXSLImportUrlsToAbsolute(doc, location.href.replace(new RegExp("^([^?#]+/)[^?#/]*.*$"), "$1"));
    
      // For debugging purposes
      if( bcdui.isDebug ) {
        args.xslt.intermediateDocuments = args.intermediateDocumentsDoExtend ? args.xslt.intermediateDocuments : new Array();
        args.xslt.intermediateDocuments.push( doc );
      }

      // Apply the just generated XSLT and recurse into postpocessing (possible applying a generated XML output and so on)
      bcdui.core.browserCompatibility.asyncCreateXsltProcessor( { callerDebug: " generated xslt of "+args.stylesheetURL, model: doc, isGenerated: true, callBack: function(newProcessor) {
        var traceXsltProcTime = Date.now();
        newProcessor.transform( { input: args.sourceDoc, parameters: args.params, callBack: function(result) {
            traceXsltProcTime = Date.now() - traceXsltProcTime;
            bcdui.debug._addProcessorExecutionTime( args.transformationChain.id, traceXsltProcTime );
            if( !result ) {
              bcdui.log.error("ERROR during xslt transfomation "+(args.stylesheetURL)+", "+args.transformationChain.id);
            }
            if( bcdui.log.isTraceEnabled() ) {
              var inputAsString = new XMLSerializer().serializeToString(args.sourceDoc);
              bcdui.log.trace("Finished transformation to "+newProcessor.outputFormat+" "+(traceXsltProcTime)+"ms "+(args.stylesheetURL)+", input:"+(inputAsString.length/1000).toFixed(1)+"k, "+args.transformationChain.id);
            }
            this._asyncTransformToXMLPostProcess( jQuery.extend({}, args, {processor: newProcessor, intermediateDocumentsDoExtend: true }), result );
          }.bind(this)
        });
      }.bind(this) });
        
      return;
    }
    
};  // Create class: bcdui.core.XMLLoader

/**
 * The singleton xmlLoader instance.
 * @constant
 * @type bcdui.core.XMLLoader
 * @private
 */
bcdui.core.xmlLoader = new bcdui.core.XMLLoader();