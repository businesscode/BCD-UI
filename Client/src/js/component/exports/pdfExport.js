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
 *   This file contains the class definition of the PDFExport class.
 */

bcdui.util.namespace("bcdui.component.exports");

bcdui.component.exports.PDFExport = class
/**
 * @lends bcdui.component.exports.PDFExport.prototype
 */
{

  /**
   * The ID of the export form when no form is specified in the constructor.
   * @constant
   * @private
   */
  _defaultFormId = "defaultPDFExportForm";

  /**
   * The content of the dynamically created export form.
   * @constant
   * @private
   */
  _defaultFormContent =
      '<input type="hidden" name="htmlString"/>' +
      '<input type="hidden" name="orientation"/>' +
      '<input type="hidden" name="dimension"/>' +
      '<input type="hidden" name="format" value="pdf"/>' +
      '<input type="hidden" name="basePath" value="."/>' +
      '<input type="hidden" name="pageHash"/>' +
      '<input type="hidden" name="fileName"/>' +
      '<input type="hidden" name="htmlWidth"/>';

  /**
   * The HTML template for CSS includes.
   * @constant
   * @private
   */
  _cssIncludeTemplate =  doT.template(
      '<link rel="stylesheet" type="text/css" href="{{=it.cssUrl}}"> </link>\n');

  /**
   * The template for the whole HTML page sent to the conversion Servlet.
   * @constant
   * @private
   */
  _htmlPageTemplate= doT.template(
      '<html><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/><title>{{=it.title}}</title>{{=it.css}}</head><body>{{=it.content}}</body></html>');

  /**
   * Creates a new PDFExport instance.
   * @class
   *   Exporter for PDF/JPG/PNG/BMP/GIF format using the HTML2PDF conversion Servlet.
   *   This Servlet is usually registered under "/bcdui/servlets/HTML2PDFServlet".
   *   For Excel export using "/bcdui/servlets/HTML2ExcelServlet"
   *
   * @constructs
   * @param args The constructor argument map offers the following properties:
   *   <ul>
   *     <li>rootElement: {(HTMLElement|HTMLElement[]|String)} The HTML element to be exported either
   *         given as the element itself or its HTML ID. In the latter case the element
   *         does not need to exist before the execute() method is called.
   *         OR a space separated list of ids OR an array with ids or elements or a mixture,
   *         which are then included in the export in the given order.</li>
   *     <li>form: {HTMLElement? | String?} The HTML Form element used for sending the
   *         export request to the server. 
   *         It must use POST because the logic is restricted to POST due to security considerations.
   *         If omitted an appropriate Form is created by this class.</li>
   *     <li>css: {Array?) An array of URLs containing CSS files to be loaded by the
   *         server.</li>
   *     <li>orientationLandscape: {Boolean?} Set this flag to true to make the PDF
   *         appear in landscape page orientation. The default value is "false".</li>
   *     <li>dimension: {String?} Output size, like LETTER or A5. The default value
   *         is "A4".</li>
   *     <li>format: {String?} This can be "pdf", "jpg", "png", "gif", "bmp" to determine the output type.
   *         The default value is "pdf".</li>
   *     <li>title: {String?} The title of the HTML fragment sent to the server.
   *         This is for future use.</li>
   *     <li>htmlWidth: {String?} Determines the scaling. That width in px is scaled to fill the full width of the selected dimension.
   *         For example if the widh of the div you export is with is 500px and dimension is A5, then in the output the content of that
   *         width is scaled to the width of A5. Default is the width of the (first) args.rootElement.</li>
   *     <li>fileName: {String?} Name of the file send by the server as the response.</li>
   *   </ul>
   * @private
   */
  constructor(/* Object */ args)
    {
      args = bcdui.factory._xmlArgs( args, bcdui.factory.validate.core._schema_PDFExport_args);
      bcdui.factory.validate.jsvalidation._validateArgs(args, bcdui.factory.validate.core._schema_PDFExport_args);

      // for backwards compat we default to pdf
      this.servletBaseUrl = args.servletBaseUrl || bcdui.component.exports._html2PdfServletUrl;
      this.mode = args.mode || "PdfOrImage";
      this.fileName = args.fileName || "";

      /**
       * An array of URLs containing CSS files to be loaded by the server.
       * @type Array
       */
      this.css = [];
      if( args.css && Array.isArray(args.css) )
        this.css = args.css;
      else if( args.css && bcdui.util.isString(args.css) )
        this.css = args.css.split(" ");

      /**
       * The title of the HTML fragment sent to the server.
       * @type String
       */
      this.title = "Report";
      this.title = args.title || this.title;

      /**
       * The output format for the conversion servlet.
       * @type String
       * @default pdf
       */
      this.format = "pdf";
      this.format = args.format || this.format;

      /**
       * The HTML element(s) to be exported.
       * @type HTMLElement
       */
      this.rootElementArray = null;
      if( bcdui.util.isString(args.rootElement) )
        this.rootElementArray = args.rootElement.split(" ");
      else if( ! Array.isArray(args.rootElement) )
        this.rootElementArray = [args.rootElement];
      else
        this.rootElementArray = args.rootElement;

      this.htmlWidth = args.htmlWidth ? args.htmlWidth : parseInt(bcdui._migPjs._$(this.rootElementArray[0]).css("width"), 10);

      /**
       * True, if the orientation is landscape and false otherwise.
       * @type Boolean
       * @default false
       */
      this.orientationLandscape = false; // For Eclipse / JSDoc
      this.orientationLandscape = args.orientationLandscape ? true : false;

      /**
       * Output size
       * @type String
       * @default A4
       */
      this.dimension = "A4";
      this.dimension = args.dimension ? args.dimension : this.dimension;

      /**
       * The form sending the data to the servlet.
       * @type HTMLElement
       */
      this.form = null;

      if (args.form) {
        this.form = args.form;
      } else {
        this._createForm(this._defaultFormId);
      }
    }

  /**
   * Dynamically creates an HTML Form to send the request for the PDF document to
   * the server. The reference to the form is stored in the member variable "form".
   * The form then gets the specified formId, but if there is already a form with
   * this ID it does not create a new form, but takes this form.
   * @private
   * @param formId The ID of the new form. If there is already an element with this
   * ID this element is taken.
   */
  _createForm(/* String */ formId)
    {
      // Take already existing form if possible
      if (this.form = bcdui._migPjs._$(formId).get(0)) return;

      // Create new form
      this.form = document.createElement("form");
      this.form.id = formId;
      this.form.style.display = "none";
      this.form.method = "POST";
      this.form.action = this.servletBaseUrl + (this.fileName ? "/"+this.fileName : "" );
      this.form.target = "_blank";
      document.body.appendChild(this.form);
      this.form.innerHTML = this._defaultFormContent;
    }

  /**
   * Converts the array of CSS file URLs (in this.css) into one string that can be
   * put into the HTML head section to load these CSS files.
   * @return {String} An HTML fragment containing Link elements for all CSS files.
   * @private
   */
  _generateCSSLinkElements()
    {
      return jQuery.makeArray(this.css).reduce(
        function(str, cssUrl) {
          return str + this._cssIncludeTemplate({cssUrl: cssUrl});
        }.bind(this), "");
    }

  /**
   * Executes the export by putting the appropriate content in the Export HTML Form.
   * Usually it opens a new window with the PDF/JPG/PNG/GIF/BMP. It calls the methods "onBeforeSend"
   * and "onAfterSend" in the respective places so that the user can extend this class
   * to provide some custom logic on these events.
   */
  execute()
    {
      var formElement = bcdui._migPjs._$(this.form).get(0);
      if (formElement == null)
        throw Error("Internal error, form element (" + this.form + ") for PDF export not found.");

      // prepend navpath
      var navPathTable = bcdui.component.exports._generateNavPathTable();
      if (navPathTable != null) {
        this.rootElementArray.unshift(navPathTable);
      }
        
      // Lets loop over the elements to be included and collect their content
      var fullHTML = bcdui.component.exports._html2String(this.rootElementArray);    

      // Generate full HTML page
      fullHTML = this._htmlPageTemplate({
          title: this.title
        , css: this._generateCSSLinkElements()
        , content: fullHTML
      });

      // Insert data into form
      formElement.elements['htmlString'].value = fullHTML;
      formElement.elements['orientation'].value = this.orientationLandscape ? "landscape" : "portrait";
      formElement.elements['dimension'].value = this.dimension;
      formElement.elements['format'].value = this.format;
      formElement.elements['basePath'].value = location.pathname.substring(bcdui.config.contextPath.length);
      formElement.elements['pageHash'].value = bcdui.config.frame.pageHash; // for tracking
      formElement.elements['fileName'].value = this.fileName;
      formElement.elements['htmlWidth'].value = this.htmlWidth;

      // Send data
      // Date param is workaround for caching issue on ff;
      formElement.action = this.servletBaseUrl + (this.fileName ? "/"+this.fileName : "" ) + "?id="+ new Number(new Date()).toString();
      this.onBeforeSend();
      formElement.submit();
      this.onAfterSend();
    }

  /**
   * An event handler function which can be used in sub-classes to intercept the
   * data (inside this.form) right before it is sent to the server. The implementation
   * in this class does not do anything.
   * @event
   */
  onBeforeSend()
    {
    }

  /**
   * An event handler function which can be used in sub-classes to do some cleanup
   * after the request has been sent to the server. The implementation in this class
   * does not do anything.
   * @event
   */
  onAfterSend()
    {
    }
};
