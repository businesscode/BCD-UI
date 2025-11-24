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
 * This source addresses differences in XSLT handling between render engines
 * - Gecko (FireFox)
 * - Webkit (Safari, Chrome, Edge, Opera)
 * - Blink (Chrome, Edge, Opera)
 * Because Blink is a fork of Webkit (which is a fork of KDE btw), they share some common workarounds and for Chrome and Edge isWebkit is also true
 * Mainly:
 * - Webkit never supported document() function, xsl:import or parameters being node-sets.
 *   Both limitations are worked around by inserting their source into the XSLT in a variable and make them usable with node-set(var)
 *   Because those documents can be xslt and in turn make use of it, it is done recursively
 * - Gecko does not support xsl:namespace-alias and also stopped supporting document() in May 2025, but still supports parameters being node-sets
 *   While it may support xsl:import, because we need to handle document() in imported xslt as well, we also have to handle xsl:import for Firefox as well.
 * - Mobile Webkit, Blink browsers from smaller documents, this mechanism can be limited to insert a wrs:Wrs/wrs:Header and not the wrs:Data,
 *   if the using xslt is maked with bcdxml:wrsHeaderIsEnough
 */


if (!bcdui.config.useSaxonJs) {

//-----------------------------------------------------------------------------
//BEGIN: Webkit and Gecko overwrites (in reality this is all browsers)
//-----------------------------------------------------------------------------
if (bcdui.browserCompatibility.isWebKit || bcdui.browserCompatibility.isGecko) {
  /**
   * This namespace contains implementations that apply to all versions of WebKit (Google Chrome) and Edge.
   * @namespace
   * @private
   */
  bcdui.core.browserCompatibility.fixXslt = {

    /**
     * Internal counter to make unique variable names used for inserting external documents
     */
    tempId: 0,

    /**
     * Generate a unique temporary id for document function replacements
     */
    newTempId: function()
      {
        return "__document_function__" + (++bcdui.core.browserCompatibility.fixXslt.tempId);
      },


    /**
     * Helper for browsers, which do not support XSLT's document() function, xsl:import, xsl:include and node-sets for parameters
     * For document fkt, import and node-set parameters, the content of these three is instead embedded in the host xslt's source
     * in an artificial variable and accessed via node-set(). xsl:include is not implemented
     * The embedding itself is done via xi:includes generated as replacements for these.
     * Only parameters are updated before each transformation, document() content is not
     * In addition needed and done in case of XSLT-generates XSLT:
     * - To allow XSLT be a child of xsl:variable, the embedded XSLT gets a namespace http://www.w3.org/1999/XSL/Transform/webkitTemp
     * - AVT expressions a={$e} are escaped wir double brackets
     * - The namespace which is turned into the standard one during XSLT generation via a special template, the brackets are done automatically
     * Keep in mind: as the content is inserted into the host document, elements from undeclared default namespaces will
     * inherit the host documents default namespace, for example HTML tags of undeclared namespace would become xsl elements
     * if the generated XSLT has xslt as the default namespace, which often happens. Thus: always declare HTML namespaces as well for Chrome

     * @param {Object}      args - An argument map containing the following elements:
     * @param {DomDocument} args.model The XSLT document the XSLTProcessor instance should be
     * @param {function}    args.callBack The callback function executed when the processor has been created. It takes the processor instance as argument
     * @param {boolean}     args.isGenerated is generated XSLT
    */
    asyncCreateXsltProcessor: function( args )
    {
      var domDocument = args.model;
      var fn = args.callBack;

      // We need to prepare the host xslt by
      // - adding exsl namespace for use of node-set()
      // - adding a dummy variable for http://www.w3.org/1999/XSL/Transform/webkitTemp
      // - adding a template for http://www.w3.org/1999/XSL/Transform/webkitTemp stuff becoming http://www.w3.org/1999/XSL/Transform (just in case we include an xslt)
      domDocument = bcdui.core.browserCompatibility.fixXslt._addDefaultNamespaceAttributesToDocumentElement(domDocument,['xsl']);
      domDocument.documentElement.setAttributeNS("http://www.w3.org/1999/XSL/Transform/webkitTemp", "xslTmp:dummy", "dummy");
      if( domDocument.selectSingleNode("/*/xsl:output[@media-type='text/xslt']")!=null
          && domDocument.selectSingleNode("/*/xsl:template[@match='xslTmp:*' and @mode='generateXSLT']")==null ) {
        // Firefox (v140) xslt import strangely fails if a prefix is used in an attribute even if it is added to the document root before with a dummy attribute
        // if we create the element with createElementNS, setAttribute. This parse attempt works.
        let template = new DOMParser().parseFromString("<xsl:template xmlns:xsl='http://www.w3.org/1999/XSL/Transform' xmlns:xslTmp='http://www.w3.org/1999/XSL/Transform/webkitTemp'  match='xslTmp:*' mode='generateXSLT'/>","text/xml").documentElement;
        var element = domDocument.createElementNS(bcdui.core.xmlConstants.namespaces.xsl, "element");
        element.setAttribute("name","{local-name()}");
        element.setAttribute("namespace",bcdui.core.xmlConstants.namespaces.xsl);
        var applyTemplates = domDocument.createElementNS(bcdui.core.xmlConstants.namespaces.xsl, "apply-templates");
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
                  bcdui.core.removeXMLBase(doc);
                  proc.importStylesheet(doc);
                  proc.xslt = doc; // used for debugging and for determining parameters and for webkit to merge params in
                  proc.outputFormat = bcdui.core.browserCompatibility.extractMetaDataFromStylesheetDoc( doc );
                } catch(e) {
                  bcdui.log.error({id: null, message: "BCD-UI: Internal stylesheet error ("+e+"). Stylesheet: "+new XMLSerializer().serializeToString(doc)});
                  throw e;
                }
                fn(proc);
              }.bind(this) );
          }.bind(this) );
      return;
    },

    /**
     * This is a helper to solve the problem that browsers do not support xsl document function.
     * Don't use this directly, use createXsltProcessor instead
     * Replaces the document function with the help of exslt:node-set(), merging the content into the
     * host xslt into a variable (xslt content gets a different namespace) and having another variable
     * getting that via node-set() and replacing document('url')/ by $data_something/
     * @param {DomDocument} doc The document to work on
     * @param {Function} fn Function to call after finishing (this is asynchronous as we actually load the documents
     * which are addressed in the document function and what they include
     * @private
     */
    _replaceDocumentFunctions: function(doc,fn )
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
                var variable = doc.createElementNS(bcdui.core.xmlConstants.namespaces.xsl, "variable");
                variable.setAttribute("name", "data_"+id);
                baseElement.parentNode.insertBefore(variable, baseElement);

                var xiInclude = doc.createElementNS(bcdui.core.xmlConstants.namespaces.xi, "include");
                xiInclude.setAttribute("href", mapping[id]);
                variable.appendChild(doc.createComment(" Replacement for document function on \""+mapping[id]+"\" "));
                variable.appendChild(xiInclude);

                // Firefox (v140) xslt import strangely fails if a prefix is used in an attribute even if it is added to the document root before with a dummy attribute
                // if the create the element with createElementNS, setAttribute. This parse attempt works.
                let variableNodeSet = new DOMParser().parseFromString(`<xsl:variable xmlns:xsl='${bcdui.core.xmlConstants.namespaces.xsl}' xmlns:exslt='${bcdui.core.xmlConstants.namespaces.exslt}' name='${id}' select='exslt:node-set($data_${id})'/>`,"text/xml").documentElement;
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
     * This is a helper to solve the problem that browsers do not support xsl import function.
     * Don't use this directly, use createXsltProcessor instead
     * @param {DomDocument} doc The document to work on
     * @param {Function} fn callback after finishing
     * @private
     */
    _replaceXSLImport: function( doc,  fn )
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
        // same for "/A/B" and "B". Also, templates having same @match but different @name are not imported
        // xsl:apply-imports is not supported at all
        // Knowing this it is possible to write a proper working import

        // Find templates which have conflicting predecessors ((same match OR same name) AND same mode)
        // and only keep the latest, which is the one of the importing stylesheet or the one of the latest imported one
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
  } /* bcdui.core.browserCompatibility.fixXslt */

  /**
   * Asynchronous creation of an XSLTProcessor object from a DOM document.
   * @param {DomDocument} domDocument The XSLT document the XSLTProcessor instance should be
   * created from.
   * @param {Function} fn The callback function executed when the processor has been created. It
   * takes the processor instance as argument.
   */
  bcdui.core.browserCompatibility.asyncCreateXsltProcessor = bcdui.core.browserCompatibility.fixXslt.asyncCreateXsltProcessor;


  /**
   * As an optimization, specifically for Android/iOS mobiles,
   * we only use the wrs:Header of a document as input for the processor, if the stylesheet says, it is enough.
   * Can be done by setting /xsl:Stylesheet/@bcdxml:wrsHeaderIsEnough="true"
   */
  XSLTProcessor.prototype.transformToDocumentOrig = XSLTProcessor.prototype.transformToDocument;
  XSLTProcessor.prototype.transformToFragmentOrig = XSLTProcessor.prototype.transformToFragment;
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
    newXMLDoc = this.transformToDocumentOrig(sourceDoc);
    return newXMLDoc;
  };
}
//-----------------------------------------------------------------------------
// END overwrites Webkit and Gecko
//-----------------------------------------------------------------------------


//-----------------------------------------------------------------------------
// BEGIN Webkit overwrites
//-----------------------------------------------------------------------------
if (bcdui.browserCompatibility.isWebKit) {

  /**
   * Adds dummy attributes of all well-known BCD-UI namespaces (beside those in except) to a document
   * This is useful if a namespace is only used within a XPath within a generated XSLT, such namespaces do not survive per se, 
   * i.e. the namespaces do not survive if not used except within xPaths
   * And also, if a document is cut out from another, like the aggregators in the scorecard, they do not contain all namespaces needed
   * @param {DomElement} doc - The XML document to add the namespaces on
   * @param {Array} except - Array of well-known prefixes whose namespaces are not to be added
   */
  bcdui.core.browserCompatibility.fixXslt._addDefaultNamespaceAttributesToDocumentElement = function(/* XMLDocument */ doc, except )
  {
    for (var prefix in bcdui.core.xmlConstants.namespaces) {
      var uri = bcdui.core.xmlConstants.namespaces[prefix];
      if( !except || except.indexOf(prefix)==-1 ) {
        doc.documentElement.setAttributeNS(uri, prefix + ":dummy", "dummy")
      }
    }
    return doc;
  };

  /*
   * Workaround for Webkit, because it does not copy the namespaces which are only used in XPath select attributes.
   * We add the declarations here
   */
  bcdui.core.browserCompatibility.cleanupGeneratedXslt = function( args )
  {
    var serializedDoc = new XMLSerializer().serializeToString(args.doc);
    serializedDoc = this._addDefaultNamespacesToDocumentElement(serializedDoc);
    var doc = new DOMParser().parseFromString(serializedDoc, "text/xml");
    return doc;
  };


  /**
   * Make the transformX interface async
   */
  XSLTProcessor.prototype.transformToFragmentOrig = XSLTProcessor.prototype.transformToFragment;

  XSLTProcessor.prototype.transform = function( args )
  {
    for (var x in args.parameters)
      this.addParameter(x, args.parameters[x]);

    if( this.outputFormat === "html" )
      args.callBack( this.transformToFragmentOrig(args.input, document) );
    else
      args.callBack( this.transformToDocument(args.input) );
  };

  /**
   * Because Webkit does not allow for objects (and DOM trees) to become a parameter, we do here physically embed the parameters
   * in the stylesheet as a variable with data_ prefix and let the parameter point to the node-set of it
   * If the param is a xslt, we also apply some escaping
   * variableAnchor is a plain xsl:variable but also overwrites the default namespace to empty. Otherwise, a doc with elements without namespace(do not confuse with prefix-free but in default namespace) would inherit the host's default namespace.
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
        this.xslt = bcdui.core.browserCompatibility.fixXslt._addDefaultNamespaceAttributesToDocumentElement(this.xslt,['xsl']); // mainly for exslt for node-set
        param.setAttribute("select","exslt:node-set($data_"+name+")"+(value.documentElement?"":"/*"));
        variable = XSLTProcessor.prototype.variableAnchor.cloneNode(true);
        variable.setAttribute("name", "data_"+name);
        param.parentNode.insertBefore(variable, param);
      }

      // Ok, we have a parameter of node-type, and it is also declared in the stylesheet, so we need to set it
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
        // If the param is a xsl doc, we first fake its namespace and escape AVT expressions
        // It will be changed to original xsl namespace by a special template added above when generating the xslt output
        var xslAsString = new XMLSerializer().serializeToString(startNode);
        xslAsString = xslAsString.replace(/http:\/\/www.w3.org.1999.XSL.Transform/g, "http://www.w3.org/1999/XSL/Transform/webkitTemp");
        xslAsString = xslAsString.replace(/=\"{([^\"]*)}\"/g,"=\"{{$1}}\""); // Escape AVT attribute value templates.
        var xslAsDoc = new DOMParser().parseFromString(xslAsString,"text/xml");
        variable.appendChild(xslAsDoc.documentElement.cloneNode(true));
      }
    }
  };

}
//-----------------------------------------------------------------------------
// END: Overwrites Webkit
//-----------------------------------------------------------------------------

//-----------------------------------------------------------------------------
// BEGIN: Implementation of Gecko specific overrides
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
  XSLTProcessor.prototype.transform = function( args )
  {
    for (var x in args.parameters)
      this.addParameter(x, args.parameters[x]);

    if( this.outputFormat === "html" ) {
      let out = this.transformToFragment(args.input, document);
      let outAsString = new XMLSerializer().serializeToString(out);

      // XMLSerializer might create a namespace with prefix (e.g. a0:) for HTML elements
      // <a0:div> etc. cause problems when accessing it with js/jQuery (e.g. jQuery(e).find("div"))
      // that's why we remove such prefixes. First, determine the prefix
      let htmlPrefix = outAsString.match(/xmlns\:(\w+)=\"http\:\/\/www\.w3\.org\/1999\/xhtml\"/);
      htmlPrefix = htmlPrefix != null && htmlPrefix.length > 1 ? htmlPrefix[1] : "";
      if (htmlPrefix) {
        // in case we have a prefix, remove all occurances
        const regEx = new RegExp("(<\/?)("+htmlPrefix+"\:)(\\w+)", "g");
        outAsString = outAsString.replace(regEx, "$1$3");
      }

      // Firefox requires the default namespace of the fragment to be set to xhtml
      // get rid of all default namespaces which can point to anything besides xhtml
      // replace them with an empty xmlns first, set the very first to xthml, then kill all remaining empty ones
      outAsString = outAsString.replace(/xmlns=("|')[^"']*("|')/g, "xmlns=''").replace(/xmlns=''/, "xmlns='http://www.w3.org/1999/xhtml'").replace(/ xmlns=''/g, "");

      // prevent an empty html output
      if (!outAsString.trim())
        outAsString = "<template xmlns='http://www.w3.org/1999/xhtml' bcdComment='this is an empty html'/>";
      out = new DOMParser().parseFromString(outAsString,"text/xml").documentElement;
      const fragment = document.createDocumentFragment();
      fragment.appendChild(out)
      args.callBack(fragment);
    }
    else {
      let result = this.transformToDocumentOrig(args.input);
      args.callBack( result );
    }
  };

  /**
   * Adds dummy attributes of all well-known BCD-UI namespaces (beside those in except) to a document
   * Gecko does not require this
   * @param {DomElement} doc - The XML document to add the namespaces on
   * @param {Array} except - Array of well-known prefixes whose namespaces are not to be added
   */
  bcdui.core.browserCompatibility.fixXslt._addDefaultNamespaceAttributesToDocumentElement = function(/* XMLDocument */ doc, except )
  {
    for (var prefix in bcdui.core.xmlConstants.namespaces) {
      var uri = bcdui.core.xmlConstants.namespaces[prefix];
      if( !except || except.indexOf(prefix)==-1 ) {
        doc.documentElement.setAttributeNS(uri, prefix + ":dummy", "dummy")
      }
    }
    // DOMException: An attempt was made to create or change an object in a way which is incorrect with regard to namespaces
    // In FireFox this error indicates that a prefix was used in an attribute like select="wrs:Data" which is not know to the document
    // Strangely FireFox (v140) will not recognize namespaces added via an attribute as it is done in the loop.
    // We need to parse it afterwards to make it happen. A similar effekt is mentioned above already 
    // So we parse a shallow copy, move over the children and then exchange the nodes
    let newDocElem = new DOMParser().parseFromString( new XMLSerializer().serializeToString(doc.documentElement.cloneNode(), "text/xml"), "text/xml" ).documentElement;
    while (doc.documentElement.firstChild) newDocElem.appendChild(doc.documentElement.firstChild);
    doc.replaceChild(newDocElem, doc.documentElement);
    return doc;
  }

}
//-----------------------------------------------------------------------------
//END: Implementation of Gecko functions
//-----------------------------------------------------------------------------


//-----------------------------------------------------------------------------
//BEGIN: Adding support for SaxonJs based XSLT handling
//-----------------------------------------------------------------------------
}
else {

  // let's create an own (pseudo) XSLTProcessor
  window.XSLTProcessor = function XSLTProcessor() {}

  bcdui.core.browserCompatibility.asyncCreateXsltProcessor =  function( args ) {
    var fn = args.callBack;
    var proc = new XSLTProcessor();
    proc.outputFormat = "xml";
    
    // either we have a string which contains the sef.json and the original xslt url
    if (typeof args.model == "string") {
      proc.sefJson = args.model.split(bcdui.core.magicChar.separator)[0];
      proc.stylesheetURL = args.model.split(bcdui.core.magicChar.separator)[1];
    }
    // or we work on a generated xslt document
    else
      proc.stylesheetNode = args.model;

    setTimeout(fn.bind(undefined,proc));
  }
  

  /**
   * Determin transformation output formt (xslt, xml or html)
   * @param {Object} result EIther a saxonJS transformation result object or a document
   * @returns xslt, xml or html as a string
   */
  XSLTProcessor.prototype.determineOutputFormat = function(result) {
    let outputFormat = "xml";
    let isXSLT = false;

    // input was an xslt stylesheet document
    if (! result.stylesheetInternal) {
      let outputNode = result.selectSingleNode("/*/xsl:output");
      if (outputNode != null) {
        isXSLT |= (outputNode.getAttribute("media-type") === "text/xslt");
        outputFormat = outputNode.getAttribute("method");
      }
    }
    // otherwise check saxonJS internal structure for output parameters
    else {
      if (result.stylesheetInternal.C) {
        result.stylesheetInternal.C.forEach(function(c) {
          if (c.N == "output") {
            c.C.forEach(function(p) {
              if (p.name == "method")
                outputFormat = p.value;
              isXSLT |= (p.name == "media-type" && p.value == "text/xslt");               
            }.bind(this));
          }
        }.bind(this));
      }
    }
    return (outputFormat == "xml" && isXSLT) ? "xslt" : outputFormat;
  }

  XSLTProcessor.prototype.transformToDocument = function(sourceDoc)
  {
    // if no stylesheetNode is specified, we work on a 'standard' xslt transformation with an available sef.json file 
    if (!this.stylesheetNode) {
      const result =  SaxonJS.transform({
        stylesheetLocation: this.sefJson,
        sourceNode: sourceDoc,
        destination: "document",
        stylesheetParams: this.parameters
      });
      this.outputFormat = this.determineOutputFormat(result);
      
      // depending on the output we either return a fragment or a document
      // for HTML it might be useful to check if serializing the output and returning a string is better
      // in the htmlbuilder case (see below in the stylesheetNode trafo) attaching it to the HMTL dom tree causes rendering issues since it seems that the
      // standard (html) namespace is not correctly used in that case
      if (this.outputFormat == "html")
        return result.principalResult;
      else {
        const doc = bcdui.core.browserCompatibility.newDOMDocument();
        doc.append(result.principalResult);
        return doc;
      }
    }
    else {
      // stylesheetNode is prepared, bcduicp:// and relative urls were resolved and made absolute already
      // saxonJs needs to know a base URI for resolving uris in the sourceDoc, so we set xml:base to the application root 
      this.stylesheetNode.selectSingleNode("/*").setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:base", window.location.origin);
      const result = SaxonJS.transform({
        stylesheetLocation: bcdui.contextPath + "/bcdui/sef/xslt/xslt_transform.sef.json"
      , destination: "document"
      , sourceNode: sourceDoc // not really used here but required since saxonJS needs an input
      
      // parameters form the actual transformation
      , stylesheetParams: {
          sourceNode: sourceDoc
        , stylesheetNode: this.stylesheetNode
        , stylesheetParams: this.parameters
        }
      });
      this.outputFormat = this.determineOutputFormat(this.stylesheetNode);
      if (this.outputFormat == "html") {
        // need to serialize output here since attaching a document fragment here leads to weird rendering effects, most likely caused by
        // standard namespace issues of the fragment versus the outer html
        return new XMLSerializer().serializeToString(result.principalResult);
      }
      else {
        const doc = bcdui.core.browserCompatibility.newDOMDocument();
        doc.append(result.principalResult);
        return doc;
      }
    }
  }

  XSLTProcessor.prototype.transform = function( args ) {

    // remember parameters, currently no additional work on them since saxonJS works fine with all kind of types     
    this.parameters = args.parameters;
    args.callBack( this.transformToDocument(args.input) );
  };

  // add a XSLT matching rule to the first pos of ruleToTransformerMapping array
  bcdui.core.transformators.ruleToTransformerMapping.unshift(
    { test: function(rule){ return  typeof rule === "string" && rule.match(/\.xsl[t\;\?\#]?/) != null }, 
      info: {
       // sef.js files are json files so we load them with mime type json
       // generally we load the equally named .sef.json instead of the .xslt from the same location
       // for lib based xslt files, we switch to /bcdui/sef folder where the precompiled one are available
       ruleDp: function( rule, name ) { 
         let url = rule;
         url = url.replace("/bcdui/js/", "/bcdui/sef/js/");
         url = url.replace("/bcdui/xslt/", "/bcdui/sef/xslt/");
         url = url.replace(".xslt", ".sef.json");
         
         // provide the new url (maybe for later use, also remember the original xslt name, deliminated via separator)
         return new bcdui.core.ConstantDataProvider({ name: name, value: url + bcdui.core.magicChar.separator + rule});
       }, 
       ruleTf: function( args ) { bcdui.core.browserCompatibility.asyncCreateXsltProcessor(args); }
    }
  });
}

//-----------------------------------------------------------------------------
//END: Adding support for SaxonJs based XSLT handling
//-----------------------------------------------------------------------------
