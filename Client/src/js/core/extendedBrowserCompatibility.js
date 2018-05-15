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
//-----------------------------------------------------------------------------
//BEGIN: Implementation of Gecko functions
//-----------------------------------------------------------------------------
if (bcdui.browserCompatibility.isGecko) {
  /**
   * Helper to support namespace-alias for Gecko
   */
  bcdui.core.browserCompatibility.cleanupGeneratedXslt = function( args )
  {
    var serializedDoc = new XMLSerializer().serializeToString(args.doc);

    /*
     * 1. Workaround for Gecko xsl:namespace-alias. It is not implemented in the browser, so we do it here
     * Main use case is XSLT generation with xslt. xsl-elements to appear in the result xslt can be written
     * in xslt with the aliased namespace, which is here changed to the right one.
     */
    var nsAliasNodes = jQuery(args.processor.xslt.documentElement.selectNodes("/*/xsl:namespace-alias"));
    var replaces = new Object();
    if( nsAliasNodes.length>0 ) {
      nsAliasNodes.each(
          function( nsAliasNodeIdx, nsAliasNode ) {
            replaces[nsAliasNode.getAttribute("stylesheet-prefix")] = nsAliasNode.getAttribute("result-prefix");
          }
      );
      Object.keys(replaces).forEach( function(replace) {
          var regExp = new RegExp( "<"+replace+":", "g");
          serializedDoc = serializedDoc.replace( regExp, "<"+replaces[replace]+":" );
          regExp = new RegExp( "</"+replace+":", "g");
          serializedDoc = serializedDoc.replace( regExp, "</"+replaces[replace]+":" );
        }
      );
    }

    /*
     * 2. Workaround for FF, because it does not copy the namespaces which are only used in XPath select attributes.
     * We add the declarations here
     */
    serializedDoc = this._addDefaultNamespacesToDocumentElement(serializedDoc);
    var doc = new DOMParser().parseFromString(serializedDoc, "text/xml");
    return doc;
  };

  /**
   * Make the transformX interface async
   */
  XSLTProcessor.prototype.transformToFragmentOrig = XSLTProcessor.prototype.transformToFragment;
  XSLTProcessor.prototype.transformToDocumentOrig = XSLTProcessor.prototype.transformToDocument;
  XSLTProcessor.prototype.transform = function( args )
  {
    for (var x in args.parameters)
      this.addParameter(x, args.parameters[x]);

    if( this.outputFormat === "html" )
      args.callBack( this.transformToFragment(args.input, document) );
    else
      args.callBack( this.transformToDocumentOrig(args.input) );
  };
}
//-----------------------------------------------------------------------------
//END: Implementation of Gecko functions
//-----------------------------------------------------------------------------



//-----------------------------------------------------------------------------
//BEGIN: Implementation of XSLT document(), xsl:import for browser that lack support for it
//-----------------------------------------------------------------------------
if (bcdui.browserCompatibility.isWebKit || bcdui.browserCompatibility.isMsEdge) {
  /**
   * This namespace contains implementations that apply to all versions of WebKit (Google Chrome) and Edge.
   * @namespace
   * @private
   */
  bcdui.core.browserCompatibility.fixXslt = {
    /**
     * Adds dummy attributes of all well-known BCD-UI namespaces (beside those in except) to a document
     * This is useful if a namespace is only used within a XPath within a generated XSLT, such namespaces do not survive per se, 
     * i.e. the namespaces do not survive if not used except within xPaths
     * And also, if a document is cut out from another, like the aggregators in the scorecard, they do not contain all namespaces needed
     * @param {DOMDocument} doc - The XML document to add the namespaces on
     * @param {Array} except - Array of well-known prefixes whose namespaces are not to be added
     */
    _addDefaultNamespaceAttributesToDocumentElement: function(/* XMLDocument */ doc, /* Array */except )
    {
      for (var prefix in bcdui.core.xmlConstants.namespaces) {
        var uri = bcdui.core.xmlConstants.namespaces[prefix];
        if( !except || except.indexOf(prefix)==-1 ) {
          doc.documentElement.setAttributeNS(uri, prefix + ":dummy", "dummy")
        }
      }
    },

    tempId: 0,

    /**
     * Generate a unique temporary id for document function replacements
     */
    newTempId: function()
      {
        return "__document_function__" + (++bcdui.core.browserCompatibility.fixXslt.tempId);
      },


    /**
     * Helper for webkit browsers, which do not support XSLT's document() function, xsl:import, xsl:include and node-sets for parameters
     * The for document fkt, import and node-set paramters, the content of these three is instead embedded in the host xslt's source
     * in an artificial variable and accessed via node-set(). xsl:include is not implemented
     * The embedding itself is done via xi:includes generated as replacements for these.
     * Only parameters are updated before each transformation, document() content is not
     * In addition needed and done in case of XSLT-generates XSLT:
     * - To allow XSLT be a child of xsl:variable, the embedded XSLT gets a namespace http://www.w3.org/1999/XSL/Transform/webkitTemp
     * - AVT expressions a={$e} are escaped wir double brackets
     * - The namespace which is turned into the standard one during XSLT generation via a special template, the brackets are done automatically
     * Keep in mind: as the content is inserted into the host document, elements from undeclared default namespacees will
     * inherit the host documents default namespace, for example HTML tags of undeclared namespace would become xsl elements
     * if the generated XSLT has xslt as the default namespace, which often happens. Thus: always declare HTML namespaces as well for Chrome
     * @param {XMLDocument} domDocument The XSLT document
     * @param {Function} fn The callback function executed when the processor has been created. It
     */
    asyncCreateXsltProcessor: function( args )
    {
      var domDocument = args.model;
      var fn = args.callBack;

      // We need to prepare the host xslt by
      // - adding exsl namespace for use of node-set()
      // - adding a dummy variable for http://www.w3.org/1999/XSL/Transform/webkitTemp
      // - adding a template for http://www.w3.org/1999/XSL/Transform/webkitTemp stuff becoming http://www.w3.org/1999/XSL/Transform (just in case we include an xslt)
      if( args.isGenerated )
        bcdui.core.removeXMLBase(domDocument);
      bcdui.core.browserCompatibility.fixXslt._addDefaultNamespaceAttributesToDocumentElement(domDocument,['xsl']);
      domDocument.documentElement.setAttributeNS("http://www.w3.org/1999/XSL/Transform/webkitTemp", "xslTmp:dummy", "dummy");
      if( domDocument.selectSingleNode("/*/xsl:output[@media-type='text/xslt']")!=null
          && domDocument.selectSingleNode("/*/xsl:template[@match='xslTmp:*' and @mode='generateXSLT']")==null ) {
        var template = domDocument.createElementNS(bcdui.core.xmlConstants.namespaces.xsl, "xsl:template");
        template.setAttribute("match","xslTmp:*");
        template.setAttribute("mode","generateXSLT");
        var element = domDocument.createElementNS(bcdui.core.xmlConstants.namespaces.xsl, "xsl:element");
        element.setAttribute("name","{local-name()}");
        element.setAttribute("namespace",bcdui.core.xmlConstants.namespaces.xsl);
        var applyTemplates = domDocument.createElementNS(bcdui.core.xmlConstants.namespaces.xsl, "xsl:apply-templates");
        applyTemplates.setAttribute("select","node()|@*");
        applyTemplates.setAttribute("mode","generateXSLT");
        element.appendChild(applyTemplates);
        template.appendChild(element);
        var firstTemplate = domDocument.selectSingleNode("/*/xsl:template");
        firstTemplate.parentNode.insertBefore(template,firstTemplate.nextSibling);
        firstTemplate = null;
      }

      // Let's start with the top-level imports, they will be replaced by their content recursively
      bcdui.core.browserCompatibility.preXslImportByProc(domDocument);
      bcdui.core.browserCompatibility.fixXslt._replaceXSLImport(domDocument, function(doc)
          {
            // Then let resolve the document functions, no recursion here
            bcdui.core.browserCompatibility.fixXslt._replaceDocumentFunctions( domDocument, function(doc)
              {
                // OK, everything (beside parameters) is included, finally create the processor
                var proc = new XSLTProcessor();
                try {
                  // We need to re-import the xslt in MsEdge case anyway if params change, so we delay it here
                  if(!bcdui.browserCompatibility.isMsEdge)
                    proc.importStylesheet(doc);
                  proc.xslt = doc; // used for debugging and for determining parameters and for webkit to merge params in
                  proc.outputFormat = bcdui.core.browserCompatibility.extractMetaDataFromStylesheetDoc( doc );
                } catch(e) {
                  bcdui.log.error("BCD-UI: Internal stylesheet error ("+e+"). "+new XMLSerializer().serializeToString(doc));
                }
                fn(proc);
              }.bind(this) );
          }.bind(this) );
      return;
    },

    /**
     * This is a helper to solve the problem that webkit does not support xsl document function.
     * Don't use this directly, use createXsltProcessor instead
     * Replaces the document function with the help of exslt:node-set(), merging the content into the
     * host xslt into a variable (xslt content gets a different namespace) and having another variable
     * getting that via node-set() and replacing document('url')/ by $data_something/
     * @param {XMLDocument} doc The document to work on
     * @param {Function} fn Function to call after finishing (this is asynchronous as we actually load the documents
     * which are addressed in the document function and what they include
     * @private
     */
    _replaceDocumentFunctions: function(/* XMLDocument */ doc, /* Function */ fn )
    {
      // Resolve all standard includes, (keeping xslt namespace)
      bcdui.core.xmlLoader._processAllIncludes( { doc: doc, onSuccess: function(doc)
          {
            // Now take care for the documents loaded via document function
            var documentFunctionElements = jQuery(doc.selectNodes("/xsl:stylesheet//xsl:*[starts-with(@select, \"document('\") and not(starts-with(@select, \"document('')\"))]"));

            if (documentFunctionElements.length > 0)
            {
              var documentFunctionFinder = new RegExp("^document\\('([^']+)'\\)");
              var mapping = {};

              // Step 1: Replace occurrences of document function by an access to a variable generated in set 2
              documentFunctionElements.each(function(eIdx, e) {
                var selectAttribute = e.getAttribute("select");
                var matches = documentFunctionFinder.exec(selectAttribute);
                if (matches != null && matches.length > 1) {
                  var id = bcdui.core.browserCompatibility.fixXslt.newTempId(); // add marker __document_function__<id>
                  mapping[id] = bcdui.util.url.resolveURLWithXMLBase(
                      /* xmlElement */ e,
                      /* url */        matches[1]);
                  e.setAttribute("select", selectAttribute.replace(documentFunctionFinder, "$" + id));
                }
              });

              // Step 2: Insert xsl:variable elements for included documents and one with node-set() access to it
              var baseElement = doc.selectNodes("/xsl:stylesheet/xsl:*[self::xsl:param or self::xsl:variable or self::xsl:template]").item(0);
              for (var id in mapping) {
                var variable = doc.createElementNS(bcdui.core.xmlConstants.namespaces.xsl, "xsl:variable");
                variable.setAttribute("name", "data_"+id);
                baseElement.parentNode.insertBefore(variable, baseElement);

                var xiInclude = doc.createElementNS(bcdui.core.xmlConstants.namespaces.xi, "include");
                xiInclude.setAttribute("href", mapping[id]);
                variable.appendChild(doc.createComment(" Replacement for document function on \""+mapping[id]+"\": "));
                variable.appendChild(xiInclude);

                var variableNodeSet = doc.createElementNS(bcdui.core.xmlConstants.namespaces.xsl, "variable");
                variableNodeSet.setAttribute("name", id);
                variableNodeSet.setAttribute("select", "exslt:node-set($"+("data_"+id)+")");
                baseElement.parentNode.insertBefore(variableNodeSet, baseElement);
              }
              // Now resolve all generated include, make sure xslt is mapped to a temporary namespace to allow being child of xsl:variable
              // and to escape AVT (because this content ends within a xsl:variable and should be treated as non-xslt xml)
              bcdui.core.xmlLoader._processAllIncludes( {
                  doc: doc,
                  onSuccess: function(doc) {
                    fn(doc);
                  }.bind(this),
                  preProcessFkt: function( doc ) {
                    var xmlAsString = new XMLSerializer().serializeToString(doc);
                    xmlAsString = xmlAsString.replace(/http:\/\/www.w3.org\/1999\/XSL\/Transform/g, "http://www.w3.org/1999/XSL/Transform/webkitTemp");
                    xmlAsString = xmlAsString.replace(/=\"{([^\"]*)}\"/g,"=\"{{$1}}\""); // Escape AVT attribute value templates.
                    // Edge does not like embedded stylesheets with xsl prefix, even, if the namespace is set to something different that xslt
                    // Seems to be a bug, at least present in Windows 10 Edge preview, maybe #7240287, remove this workaround later when not longer necessary
                    if( bcdui.browserCompatibility.isMsEdge ) {
                      xmlAsString = xmlAsString.replace(/<xsl:/g,"<xslWt:");
                      xmlAsString = xmlAsString.replace(/<\/xsl:/g,"</xslWt:");
                      xmlAsString = xmlAsString.replace(/xmlns:xsl=/g,"xmlns:xslWt=");
                    }
                    return new DOMParser().parseFromString(xmlAsString,"text/xml").documentElement;
                  }
              } );
            }
            // Or no document() fkt found, just proceed
            else
              fn(doc);
          }.bind(this) } );
    },


    /**
     * This is a helper to solve the problem that webkit does not support xsl import function.
     * Don't use this directly, use createXsltProcessor instead
     * @param {XMLDocument} doc The document to work on
     * @param {Function} fn callback after finishing
     * @private
     */
    _replaceXSLImport: function(/* XMLDocument */ doc, /* function */ fn )
    {
      // Find all imports.
      var imports = jQuery.makeArray(doc.selectNodes("/xsl:stylesheet/xsl:import"));
      if (imports.length > 0)
      {
        imports.reverse(); // This way we preserve the order, we need to because "the latest wins" in import precedence
        var includes = [];

        // Step 1: Include xsl:param and xsl:variable elements
        imports.forEach(function(e) {
          // We need to put the xi:include on top level or on included level below variable if we are on second nesting level or deeper already
          var localOutput = e.selectSingleNode("../*[local-name()='output']");
          if( localOutput==null )
            localOutput = e.nextSibling;
          e.parentNode.removeChild(e);
          var includeElement = doc.createElementNS(bcdui.core.xmlConstants.namespaces.xi, "include");
          includes.push({localOutput: localOutput, href: e.getAttribute("href")});
          includeElement.setAttribute("href", e.getAttribute("href"));
          includeElement.setAttribute("xpointer", "xpointer(/xsl:stylesheet/*[not(local-name()='output') and not(local-name()='template')])");
          localOutput.parentNode.insertBefore(includeElement,localOutput.nextSibling);
          localOutput.parentNode.insertBefore(doc.createComment(" Start replacement for xsl:param and xsl:variable import on \""+e.getAttribute("href")+"\" \n"), includeElement);
          localOutput.parentNode.insertBefore(doc.createComment(" ... End replacement for xsl:param and xsl:variable import\n"), includeElement.nextSibling);
        });

        // Step 2: Include templates
        includes.forEach(function(include) {
          var includeElement = doc.createElementNS(bcdui.core.xmlConstants.namespaces.xi, "include");
          includeElement.setAttribute("href", include.href);
          includeElement.setAttribute("xpointer", "xpointer(/xsl:stylesheet/xsl:template)");
          // The include needs to come after the output, import is before
          include.localOutput.parentNode.insertBefore(includeElement,include.localOutput.nextSibling);
          include.localOutput.parentNode.insertBefore(doc.createComment(" Start replacement for xsl:template import on \""+include.href+"\" \n"), includeElement);
          include.localOutput.parentNode.insertBefore(doc.createComment(" ... End replacement for xsl:template import\n"), includeElement.nextSibling);
        });

        // Now resolve all generated includes, make sure xslt is mapped to a temporary namespace to allow being child of xsl:variable
        bcdui.core.xmlLoader._processAllIncludes( {
            doc: doc,
            onSuccess: function(doc) {
              bcdui.core.browserCompatibility.fixXslt._replaceXSLImport(doc,fn);
            }.bind(this),
            preProcessFkt: function( e ) { // make sure 2nd and higher level imports and document fkts have the right URL
              if( e.nodeName=="xsl:import" )
                e.setAttribute("href",bcdui.util.url.resolveURLWithXMLBase(e, e.getAttribute("href")));
              else if( e.getAttribute("select") && e.getAttribute("select").indexOf("document(")>-1 ) {
                var foundDocumentExpr = e.getAttribute("select").match(new RegExp("^document\\('([^']+)'\\).*"));
                var newDocumentExpr = e.getAttribute("select").replace(RegExp.$1,bcdui.util.url.resolveURLWithXMLBase(e,RegExp.$1));
                e.setAttribute("select",newDocumentExpr);
              }
              return e;
            }
        } );

      } else {
        // All imports resolved, now lets remove all conflicting variables and templates
        // Certain restrictions apply:
        // Templates we compare on string equality of the match clause only, thus conflicts of type "A | B" and "B|A" are not fixed here,
        // same for "/A/B" and "B". Also templaetes having same @match but different @name are not imported
        // xsl:apply-imports is not supported at all
        // Knowing this it is possible to write a proper working import

        // Find templates which have conflicting predecessors ((same match OR same name) AND same mode)
        // and only keep the latest, which is the one of the importind stylesheet or the one of the latested imported one
        var templatesWithConflicts = jQuery(doc.selectNodes("/*/xsl:template[@match=preceding-sibling::xsl:template/@match or @name=preceding-sibling::xsl:template/@name]"));
        templatesWithConflicts.each( function( templateIdx, template ) {
          var mode = template.getAttribute("mode");
          mode = mode ? "@mode='"+mode+"'" : "not(@mode)";
          var match = template.getAttribute("match");
          if( match ) {
            match = match.replace(/'/g,"&quot;");
            var conflictingTemplates = jQuery(template.selectNodes("preceding-sibling::xsl:template[@match='"+match+"' and "+mode+"]"));
            conflictingTemplates.each( function(ctIdx,ct) {
              ct.parentNode.removeChild(ct);
            });
          }
          var name = template.getAttribute("name");
          if( name ) {
            var conflictingTemplates = jQuery(template.selectNodes("preceding-sibling::xsl:template[@name='"+name+"' and "+mode+"]"));
            conflictingTemplates.each( function(ctIdx,ct) {
              ct.parentNode.removeChild(ct);
            });
          }
        });

        // Find global variables and global parameters which have conflicting predecessors (same name)
        // and only keep the latest, which is the one of the importind stylesheet or the one of the latested imported one
        var paramVarWithConflicts = jQuery(doc.selectNodes("/*/xsl:param[@name=preceding-sibling::xsl:param/@name or @name=preceding-sibling::xsl:variable/@name] | /*/xsl:variable[@name=preceding-sibling::xsl:param/@name or @name=preceding-sibling::xsl:variable/@name]"));
        paramVarWithConflicts.each( function( pVIdx, pV ) {
          var name = pV.getAttribute("name");
          var conflictingPVs = jQuery(pV.selectNodes("preceding-sibling::xsl:param[@name='"+name+"'] | preceding-sibling::xsl:variable[@name='"+name+"']"));
          conflictingPVs.each( function(cPvIdx,cPv) {
            cPv.parentNode.removeChild(cPv);
          });
        });

        // Stylesheet is complete now, let's proceed
        fn(doc);
      }
    }
  }; /* namespace bcdui.browserCompatibility.isWebKit */

  /**
   * Asynchronous creation of an XSLTProcessor object from a DOM document.
   * @param {XMLDocument} domDocument The XSLT document the XSLTProcessor instance should be
   * created from.
   * @param {Function} fn The callback function executed when the processor has been created. It
   * takes the processor instance as argument.
   */
  bcdui.core.browserCompatibility.asyncCreateXsltProcessor = bcdui.core.browserCompatibility.fixXslt.asyncCreateXsltProcessor;

  bcdui.core.browserCompatibility.cleanupGeneratedXslt = function( args )
  {
    /*
     * Workaround for Webkit, because it does not copy the namespaces which are only used in XPath select attributes.
     * We add the declarations here
     */
    var serializedDoc = new XMLSerializer().serializeToString(args.doc);
    serializedDoc = this._addDefaultNamespacesToDocumentElement(serializedDoc);
    var doc = new DOMParser().parseFromString(serializedDoc, "text/xml");
    return doc;
  };


  /**
   * As an optimization, specifically for Android/iOS mobiles, we only use the wrs:Header of a document as input for the processor, if the stylesheet says, it is enough.
   */
  XSLTProcessor.prototype.transformToDocumentOrig = XSLTProcessor.prototype.transformToDocument;
  XSLTProcessor.prototype.transformToDocument = function(sourceDoc)
  {
    var src = sourceDoc;
    var wrsHeaderIsEnough = this.xslt.selectSingleNode("/*/@bcdxml:wrsHeaderIsEnough");
    if( wrsHeaderIsEnough && wrsHeaderIsEnough.value=="true" && sourceDoc.selectSingleNode("/wrs:Wrs") ) {
      src = bcdui.core.browserCompatibility.createDOMFromXmlString("<wrs:Wrs xmlns:wrs='http://www.businesscode.de/schema/bcdui/wrs-1.0.0'/>");
      if( sourceDoc.selectSingleNode("/*/wrs:Header") )
        src.firstChild.appendChild(src.importNode(sourceDoc.selectSingleNode("/*/wrs:Header"),true));
    }
    var newXMLDoc;
    if( bcdui.browserCompatibility.isMsEdge ) {
      // Sometimes, XSLTProcessor of Edge (version 25) will return a Document instead of an XMLDocument as supposed by the spec. 
      // They should in theory behave the same (only have different algorithms), but in reality for Edge 25 Document we found many xPath bugs,
      // which we do not need to workaround having an XMLDocument (see removed parts in this commit). 
      // Also we need to attache selectSingleNode to XMLDocument.prototype only this way, which is cleaner.
      // Going this way via transformToFragment seems to enforce an XMLDocument.
      newXMLDoc = document.implementation.createDocument(null, null, null);
      var content = this.transformToFragmentOrig(sourceDoc,newXMLDoc);
      newXMLDoc.appendChild(content);
    } else {
      newXMLDoc = this.transformToDocumentOrig(sourceDoc);
    }
    return newXMLDoc;
  };
  /**
   * Make the transformX interface async
   */
  XSLTProcessor.prototype.transformToFragmentOrig = XSLTProcessor.prototype.transformToFragment;

  XSLTProcessor.prototype.transform = function( args )
  {
    for (var x in args.parameters)
      this.addParameter(x, args.parameters[x]);

    // Edge supports node-set, but in msxsl namespace only and even fails, if it finds our msxsl:script node-set definition as script
    // Last but not least, we need to re-import xslt if we changed its embedded paramaters (params of node type), Webkit seems to do this automatically
    // Because we do not refresh data loaded via document() for webkit in case of re-run anyway, we also do not handle that case here
    if( bcdui.browserCompatibility.isMsEdge && (this.wasAlreadyImported !== true || this.hasParamsWithNodeType === true ) ) {
      var msmlNodesetScipts = this.xslt.selectNodes("/*//msxsl:script[contains(text(),\"this['node-set']\")]");
      for( var i=0; i < msmlNodesetScipts.length; i++ )
        msmlNodesetScipts.item(i).parentNode.removeChild( msmlNodesetScipts.item(i) );
      var msmlNodesetCall = this.xslt.selectNodes("/*//@select[contains(.,'exslt:node-set')]");
      for( var i=0; i<msmlNodesetCall.length; i++ )
        msmlNodesetCall.item(i).nodeValue = msmlNodesetCall.item(i).nodeValue.replace(/exslt:node-set/g,"msxsl:node-set");
      this.importStylesheet(this.xslt);
      this.wasAlreadyImported = true;
    }
    
    if( this.outputFormat === "html" )
      args.callBack( this.transformToFragmentOrig(args.input, document) );
    else
      args.callBack( this.transformToDocument(args.input) );
  };

  /**
   * Because Webkit does not allow for objects (and DOM trees) to become a parameter, we do here physically embed the parameters
   * in the stylesheet as a variable with data_ prefix and let the parameter point to the node-set of it
   * If the param is a xslt, we also apply some escaping
   * variableAnchor is a plain xsl:variable but also overwrites the default namespace to empty. Otherwise a doc with elements without namespace(do not confuse with prefix-free but in default namespace) would inherit the host's default namespace.
   * @ignore
   */
  XSLTProcessor.prototype.variableAnchor = new DOMParser().parseFromString("<xsl:variable xmlns='' xmlns:xsl='"+bcdui.core.xmlConstants.namespaces.xsl+"'/>","text/xml").documentElement;
  XSLTProcessor.prototype.addParameter = function(name, value)
  {
    if( typeof value != "object" ) {
      this.setParameter(null, name, value);
    }

    // Webkit does not allow node-sets as parameters, we merge the nodeset into the XSLT source here
    // and access it later via node-set()
    else {
      var wrsHeaderIsEnough = this.xslt.selectSingleNode("/*/xsl:param[@name='"+name+"']/@bcdxml:wrsHeaderIsEnough");
      if( wrsHeaderIsEnough && wrsHeaderIsEnough.value=="true" && value.selectSingleNode("/wrs:Wrs") ) {
        var newValue = bcdui.core.browserCompatibility.createDOMFromXmlString("<wrs:Wrs xmlns:wrs='http://www.businesscode.de/schema/bcdui/wrs-1.0.0'/>");
        if( value.selectSingleNode("/*/wrs:Header") )
          newValue.firstChild.appendChild(newValue.importNode(value.selectSingleNode("/*/wrs:Header"),true));
        value = newValue;
      }

      var variable = this.xslt.selectSingleNode("//xsl:variable[@name='data_"+name+"']");
      // First time we come here need to create a variable to put the parameter node set below
      if( !variable ) {
        var param = this.xslt.selectSingleNode("/*/xsl:param[@name='"+name+"']");
        if( !param )
          return;
        bcdui.core.browserCompatibility.fixXslt._addDefaultNamespaceAttributesToDocumentElement(this.xslt,['xsl']); // mainly for exslt for node-set
        param.setAttribute("select","exslt:node-set($data_"+name+")"+(value.documentElement?"":"/*"));
        variable = XSLTProcessor.prototype.variableAnchor.cloneNode(true);
        variable.setAttribute("name", "data_"+name);
        param.parentNode.insertBefore(variable, param);
      }

      // Ok, we have a parameter of node-type and it is also declared in the stylesheet, so we need to set it
      this.hasParamsWithNodeType = true;

      // Every time: Clean variable content and put new.
      while( variable.childNodes.length )
        variable.removeChild(variable.firstChild);
      variable.appendChild(this.xslt.createComment(" BCD-UI Replacement for parameter "+name+" "));
      var startNode = value.documentElement || value;
      if( null==startNode.selectSingleNode("//*[namespace-uri()='"+bcdui.core.xmlConstants.namespaces.xsl+"']") ) {
        // non-xsl doc
        var importedNode = variable.ownerDocument.importNode(startNode,true); // clone the node deep
        variable.appendChild(importedNode);
      }
      else {
        // If the param is an xsl doc, we first fake its namespace and escape AVT expressions
        // It will be changed to original xsl namespace by a special template added above when generating the xslt output
        var xslAsString = new XMLSerializer().serializeToString(startNode);
        xslAsString = xslAsString.replace(/http:\/\/www.w3.org.1999.XSL.Transform/g, "http://www.w3.org/1999/XSL/Transform/webkitTemp");
        xslAsString = xslAsString.replace(/=\"{([^\"]*)}\"/g,"=\"{{$1}}\""); // Escape AVT attribute value templates.
        // Edge does not like embedded stylesheets with xsl prefix, even, if the namespace is set to something different that xslt
        // Seems to be a bug, at least present in Windows 10 Edge preview, maybe #7240287, remove this workaround later when not longer necessary
        if( bcdui.browserCompatibility.isMsEdge ) {
          xslAsString = xslAsString.replace(/<xsl:/g,"<xslWt:");
          xslAsString = xslAsString.replace(/<\/xsl:/g,"</xslWt:");
          xslAsString = xslAsString.replace(/xmlns:xsl=/g,"xmlns:xslWt=");
        }
        var xslAsDoc = new DOMParser().parseFromString(xslAsString,"text/xml");
        variable.appendChild(xslAsDoc.documentElement.cloneNode(true));
      }
    }
  };

}
//-----------------------------------------------------------------------------
// END: Implementation of XSLT document(), xsl:import
//-----------------------------------------------------------------------------


//-----------------------------------------------------------------------------
//BEGIN: Implementation of Webkit-specific functions
//-----------------------------------------------------------------------------
if (bcdui.browserCompatibility.isWebKit) {
  /**
   * This namespace contains implementations that apply to all versions of WebKit (Google Chrome).
   * @namespace
   * @private
   */
  bcdui.core.browserCompatibility.webKit = {
    /**
     * on WebKit: document.cloneNode(true) returns null, we fix it here
     *
     */
    cloneDocument: function(doc){
      if(doc==null){
        return null;
      }
      if( ! doc.nodeType )
        return bcdui.wrs.jsUtil.deepClone(doc);
      var newdoc = bcdui.core.browserCompatibility.newDOMDocument();
      newdoc.appendChild(doc.documentElement.cloneNode(true));
      return newdoc;
    }
  }
  /**
   * @ignore
   */
  bcdui.core.browserCompatibility.cloneDocument = bcdui.core.browserCompatibility.webKit.cloneDocument;
};
//-----------------------------------------------------------------------------
//END: Implementation of Webkit-specific functions
//-----------------------------------------------------------------------------


//-----------------------------------------------------------------------------
//BEGIN: Implementation of Webkit-specific functions
//-----------------------------------------------------------------------------


//-----------------------------------------------------------------------------
//START: Implementation of IE>8 specific functions
//-----------------------------------------------------------------------------
if ( bcdui.browserCompatibility.isIE)
{
  /*
   * XMLSerializer was introduced in IE9.
   * Sadly, it does not support MSXML documents, needed for xPath, so we need to overwrite serializeToString()
   * We need to say (node.msxmlImpl||node), because we may have an overwritten XMLDocument or a native node
   */
  XMLSerializer.prototype.serializeToString = function (node) {
    return (node.msxmlImpl||node).xml;
  };
}
//-----------------------------------------------------------------------------
//END: Implementation of IE>8 specific functions
//-----------------------------------------------------------------------------
