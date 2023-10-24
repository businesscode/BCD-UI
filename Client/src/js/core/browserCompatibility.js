/*
  Copyright 2010-2022 BusinessCode GmbH, Germany

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
     * @return {DomDocument} A new DOM document
     */
    newDOMDocument: function()
      {
        return document.implementation.createDocument(null, null, null);
      },

    /**
     * @param {DomDocument} doc - To be cloned
     * @return {DomDocument} A clone of the given DOM document
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
     * @return {DomDocument} The DOMDocument parsed from the serialized document string.
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
     * @param {HtmlElement} targetElement The targetElement which is used for appending the new element.
     * @param {string} name The element name which may contain a well-known prefix.
     * @param {boolean} insertBeforeTargetElement Preprend instead of append element.
     * @returns {DomElement} The new XMLElement.
     */
    appendElementWithPrefix: function(/* HTMLElement */ targetElement, /* String */ name, /* Boolean? */ insertBeforeTargetElement)
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
     * @param {object}   args - An argument map containing the following elements:
     * @param {DomDocument} args.model The XSLT document the XSLTProcessor instance should be
     * @param {function} args.callBack The callback function executed when the processor has been created. It takes the processor instance as argument
     * @param {string}   args.callerDebug Additional (debug) information from the caller for logging 
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
// BEGIN: Implementation of Specific functions in all non-IE Browsers.
// -----------------------------------------------------------------------------

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
 * @param {String} serializedDoc The doc to work on
 * @return {String} The serialized doc with the updated root element.
 * @private
 */
bcdui.core.browserCompatibility._addDefaultNamespacesToDocumentElement = function(serializedDoc)
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
