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
/**
 *
 * Utilities for working with DOM
 * @namespace
 */
bcdui.util.xml = 
/** @lends bcdui.util.xml */
{

    /**
     * Replaces the XML control characters in the specified string with the appropriate
     * pre-defined entities.
     * @param {string} xmlString - The string to be processed.
     * @return {string} The parameter with XML control characters replaced.
     */
    quoteXMLString: function(/* String */ xmlString)
      {
        if (typeof xmlString == "undefined") return null;
        if (!bcdui.util.isString(xmlString)) return null;
        return xmlString.replace(/&/g, "&amp;").replace(/</g, "&lt;");
      },

    /**
     * Copies all child elements and attributes from a source XML element to a target
     * XML element.
     * @param {Element} targetElement The element the content (child elements + attributes) of the
     * source element should be copied to.
     * @param {Element} sourceElement The source for the elements and attributes copied under the
     * target element.
     * @return {Element} The targetElement.
     */
    cloneElementContent: function(targetElement, sourceElement)
      {
        var childNodes = jQuery.makeArray(sourceElement.childNodes).concat(jQuery.makeArray(sourceElement.attributes));
        for (var pos = 0; pos < childNodes.length; ++pos) {
          if (childNodes[pos].nodeType == 2) { // attribute nodes
            if (childNodes[pos].nodeName.startsWith("xmlns:"))
              /*
               * Workaround: Internet Explorer wrongfully returns namespace declarations
               *             (xmlns:myNs=...) as XML attributes.
               */
              continue;
            targetElement.setAttribute(childNodes[pos].nodeName, childNodes[pos].nodeValue);
          } else
            targetElement.appendChild(childNodes[pos].cloneNode(true));
        }
        return targetElement;
      },

    /**
     * Computes which XML element is the next sibling of the given element. In contrast
     * to the nextSibling DOM function this function does only return an XML element (not
     * a comment, text node etc.) or null if there is no sibling element. If the function
     * is supported by the browser (e.g. FireFox) the native implementation is used. In
     * other browsers (e.g. Internet Explorer) it is computed here.
     * @return {Element} The element immediately following the specified element or
     * null if there is no such element.
     */
    nextElementSibling: function(/* XMLElement */ element)
      {
        if (typeof element.nextElementSibling != "undefined") return element.nextElementSibling;
        do {
          element = element.nextSibling;
        } while (element && element.nodeType != 1);
        return element;
      },

    previousElementSibling: function(element,count)
      {
        count = count || 1;
        while (count && element != null) {
          element = element.previousSibling;
          if (element && element.nodeType == 1) count--;
        }
        return element;
      },

    firstElementChild: function(element)
      {
        if (typeof element.firstElementChild != "undefined") return element.firstElementChild;
        element = element.firstChild;
        while (element != null && element.nodeType != 1) {
          element = element.nextSibling;
        }
        return element;
      },

    lastElementChild: function(element)
      {
      if (typeof element.lastElementChild != "undefined") return element.lastElementChild;
        element = element.lastChild;
        while (element != null && element.nodeType != 1) {
          element = element.previousSibling;
        }
        return element;
      },
      

  /**
   * Renames an XML element and optionally filters its child elements (which is
   * useful in conjunction with the wrs-Format).
   * @param {Element} element - The XML element to be renamed.
   * @param {sting} newName - The new name of the XML element.
   * @return {XMLElement} The renamed XML element.
   */
  renameElement: function(/* XMLElement */ element, /* String */ newName)
    {
      /*

       Firefox bug:
                      Unfortunately the native "renameNode" function does not
                      work in FireFox 3.6

                      Therefore we cannot use the native implementation


      if (element.ownerDocument && element.ownerDocument.renameNode) {
        var newNameParts = newName.split(":");
        var hasPrefix = newNameParts.length > 1;
        return element.ownerDocument.renameNode(
            element,
            hasPrefix ? bcdui.core.xmlConstants.namespaces[newNameParts[0]] : "",
            hasPrefix ? newNameParts[1]                                     : newNameParts[0]);
      }
      */
      var newElement = bcdui.core.browserCompatibility.appendElementWithPrefix(element, newName, true);
      bcdui.util.xml.cloneElementContent(newElement, element);
      element.parentNode.removeChild(element);
      return newElement;
    },
    
    /**
     * Removes XML elements from a DOM document. These XML elements are identified
     * with an XPath.
     * @param {document} doc - The document the XPath specified in the "path"
     * argument is evaluated on.
     * @param {writableModelXPath} path - The XPath pointing to the nodes to be removed.
     * @param {boolean} [enableWrsExtensions=true] Set this flag to "true" if the function should treat
     * wrs elements differently (like converting wrs:R to wrs:D instead of removing it).
     * It is "true" by default.
     * @param {boolean} [removeEmptyElements=false] A flag indicating if elements which do not contain any
     * content anymore should be removed. The default value is "false". This is for example
     * very useful when the path is something like /Items/Item/@value and the respective
     * Item elements need to be cleared as well.
     * @return {number} The number of removed nodes.
     */
    removeXPath: function(/* XMLDocument | DataProvider */ doc, /* String */ path, /* Boolean? */ enableWrsExtensions, /* Boolean? */ removeEmptyElements)
      {
        return bcdui.core.removeXPath(/* XMLDocument | DataProvider */ doc, /* String */ path, /* Boolean? */ enableWrsExtensions, /* Boolean? */ removeEmptyElements);
      },

    /**
     * <p>
     * This function works similar to selectSingleNode in that executes an XPath
     * on a DOMDocument or XML element and returns an XML element. However if the
     * element does not exists it creates XML elements on the XPath so that the XPath
     * returns an element afterwards. For example if the document contains only a root
     * element and the path is
     * <pre>
         /Root/Filter[@name = 'abc']/Item
     * </pre>
     * it does the following:
     * <ol>
     *   <li>create an element "Filter" under the root node,</li>
     *   <li>set an attribute "name" with content "abc" on it,</li>
     *   <li>create an Item under it,</li>
     *   <li>return the Item. So the XPath "/Root/Filter[@name = 'abc']/Item" can be
     *       regarded as an XML prototype that is created if the element does not
     *       exist.</li>
     * </ol>
     * </p>
     * <p>
     * Please note that this function accepts only a very limited set of
     * XPaths because otherwise the inversion of the XPath would be too complicated
     * to be computed. For example it is not allowed to specify "//" in the XPath
     * and the "or" conjunction cannot be used.
     * </p>
     * @param {Element} baseElement - The DOM document or the XML element the path is evaluated on.
     * @param {modelXPath} path - The XPath identifying the element to be retrieved or
     * created.
     * @param {boolean} [enableWrsExtensions=true] Set this flag to "true" if the function should treat
     * wrs elements differently (like converting wrs:R to wrs:M or creating wrs:I
     * elements). It is "true" by default.
     * @return {Element} The XML element to be found under the specified XPath.
     */
    createElementWithPrototype: function(/* XMLDocument | XMLElement | DataProvider */ baseElement, /* String */ path, /* Boolean? */ enableWrsExtensions)
      {
        return bcdui.core.createElementWithPrototype(/* XMLDocument | XMLElement | DataProvider */ baseElement, /* String */ path, /* Boolean? */ enableWrsExtensions);
      },
      
    /**
     * Determines the parent element of a node, no matter if it is an attribute node
     * or an element. It is quite useful especially for attribute nodes, because the
     * parentNode property does not work on them.
     * @return {Element} The parent element of the specified node.
     */
    getParentNode: function(/* XMLElement | XMLAttribute */ node)
      {
        if (node.nodeType == 2) {
           /*
           * Workaround: When the target node is an attribute its ancestor cannot be retrieved
           * with the parentNode attribute.
           */
          if (typeof node.ownerElement == "undefined") {
            /*
             * In Internet Explorer we cannot use "ownerElement".
             */
            return node.selectSingleNode("..");
          } else {
            /*
             * In FireFox we can use the "ownerElement" to get the parent element of an attribute.
             */
            return node.ownerElement;
          }
        }
        /*
         * We assume that parentNode is correct for non-attribute nodes.
         */
        return node.parentNode;
      }
}; // namespace
