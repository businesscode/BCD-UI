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
 * <p>
 * Export package is the API to the WYSIWYG and detail exports of BCD-UI
 * WYSIWYG can be pdf, excel or image
 * </p>
 * @namespace bcdui.component.exports
 */
bcdui.util.namespace("bcdui.component.exports",
/** @lends bcdui.component.exports */
{
  /**
   * @private
   */
  _html2PdfServletUrl: bcdui.contextPath + "/bcdui/servlets/Html2PdfServlet",
  /**
   * @private
   */
  _html2ExcelServletUrl: bcdui.contextPath + "/bcdui/servlets/Html2ExcelServlet",

  /**
   * Produces a WYSIWYG pdf export of a windows.document subtree
   * @param {Object} args The parameter map contains the following properties:
   * @param {(string|HTMLElement)}  args.rootElement                  - The id of or the root element itself
   * @param {string}                [args.fileName='report.pdf']      - The name of the returned pdf
   * @param {string[]}              [args.css]                        - An array with a list of URLs containing CSS files to be used, relative the the current page.
   * Absolute paths starting with '/' are relative to the context path. Use more specific rule precedence. (css precedence based on later declaration is not supported).
   * @param {boolean}               [args.orientationLandscape=false] - Set this flag to true to make the PDF appear in landscape page orientation
   * @param {string}                [args.dimension=A4]               - Physical dimension of the output like 'A5' or 'LETTER', default is A4.
   *
   * @example
   *   bcdui.component.exports.exportWysiwygAsPdf( { rootElement: "myReportDiv", css: ["/bcdui/theme/css/allStyles.css", "my.css"] } );
   */
  exportWysiwygAsPdf: function( args )
  {
    args.mode = "PdfOrImage";
    args.servletBaseUrl = args.servletBaseUrl || bcdui.component.exports._html2PdfServletUrl;
    args.fileName = args.fileName || "report.pdf";
    new bcdui.component.exports.PDFExport( args ).execute();
  },
  
  /**
   * generates a timestamp string
   * @private
  */
  _getExportTimeStamp: function() {
    return bcdui.util.datetime.formatDateTime(new Date).replace(/-/g, "").replace(/:/g, "").substring(0, 13);
  },
  
  /**
   * generates a fileName based on navpath title information
   * @private
  */
  _getFileNameFromNavPath: function() {
    var root = bcdui.wkModels.bcdNavPath.query("/*");
    var fileName = null;
    if (root && root.getAttribute("targetId") != null) {
      fileName = root.getAttribute("title");
    }
    return fileName ? fileName.replace(/(?:^|\s)\w/g, function(match) {return match.toUpperCase();}).replace(/\s/g, "") : null;
  },

  /**
   * Produces a WYSIWYG pdf export of a windows.document subtree
   * @param {Object} args The parameter map contains the following properties:
   * @param {(string|HTMLElement)}  args.rootElement                  - The id of or the root element itself
   * @param {string}                [args.fileName='export(_timestamp).xsl'] - The name of the returned Excel document
   * @param {string[]}              [args.css]                        - An array with a list of URLs containing CSS files to be used, relative the the current page.
   * Absolute paths starting with '/' are relative to the context path. Use more specific rule precedence. (css precedence based on later declaration is not supported).
   */
  exportWysiwygAsExcel: function( args )
  {
    args.mode = "Excel";
    args.servletBaseUrl = args.servletBaseUrl || bcdui.component.exports._html2ExcelServletUrl;

    if (! args.fileName) {

      // use navPath title if available and no fileName is given
      // also - when using navPath - prepend navPath html for export  
      var root = bcdui.wkModels.bcdNavPath.query("/*");
      if (root && root.getAttribute("targetId") != null) {
        var navPathTarget = root.getAttribute("targetId");
        var oldRoot = args.rootElement;
        args.rootElement = [];
        if (navPathTarget) {
          args.rootElement.push(navPathTarget);
          args.rootElement.push(jQuery("<table><tr></tr></table>").get(0));
        }
        if (typeof oldRoot == "string")      // html id
          args.rootElement.push(oldRoot);
        else if (jQuery(oldRoot).length > 0) // html element
          args.rootElement.push(oldRoot);
        else if (oldRoot.length > 0)         // array
          args.rootElement.concat(oldRoot);

        var fileName = bcdui.component.exports._getFileNameFromNavPath();
        if (fileName)
          args.fileName = fileName + "_" + bcdui.component.exports._getExportTimeStamp() + ".xls";
      }
    }

    args.fileName = args.fileName || "export_" + bcdui.component.exports._getExportTimeStamp() + ".xls";
    new bcdui.component.exports.PDFExport( args ).execute();
  },

  /**
   * Produces a WYSIWYG pdf export of a windows.document subtree
   * @param {Object} args The parameter map contains the following properties:
   * @param {(string|HTMLElement)}  args.rootElement                  - The id of or the root element itself
   * @param {string}                [args.fileName='report.format']   - The name of the returned image
   * @param {string}                [format=png]                      - Image format, supported are 'jpg', 'png', 'bmp' or 'gif'
   * @param {string[]}              [args.css]                        - An array with a list of URLs containing CSS files to be used, relative the the current page.
   * Absolute paths starting with '/' are relative to the context path. Use more specific rule precedence. (css precedence based on later declaration is not supported).
   * @param {boolean}               [args.orientationLandscape=false] - Set this flag to true to make the PDF appear in landscape page orientation
   * @param {string}                [args.dimension=A4]               - Physical dimension of the output like 'A5' or 'LETTER', default is A4.
   *
   * @example
   *   bcdui.component.exports.exportWysiwygAsImage( { rootElement: "myReportDiv, format: "gif" } );
   */
  exportWysiwygAsImage: function( args )
  {
    args.mode = "PdfOrImage";
    args.format = args.format || "png";
    args.servletBaseUrl = args.servletBaseUrl || bcdui.component.exports._html2PdfServletUrl;
    args.fileName = args.fileName || "export."+args.format;
    new bcdui.component.exports.PDFExport( args ).execute();
  },
  
  /**
   * Uses SylkServlet, CsvServlet or ExcelExportServlet export servlets to provide the data of a WrsRequest, the response opens asynchronously in an extra window
   * @param {Object} args The argument map with the following properties
   * @param {(string|bcdui.core.DataProvider)} args.wrq                         - Model containing the wrs request according to XSD http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0
   * @param {string}                           [args.type=slk]                  - Can be "slk" or "csv" or "xlsx". slk is efficient as csv and preserves numbers, use "xlsx" to preserve non-latin characters in addition
   * @param {string}                           [args.fileName=export_(timestamp).(csv|xls)] - Name of the response file, depending on type, can also be provided via /wrq:WrsRequest/@bcdFileName from within the request
   */
  detailExport: function( args ) 
  {
    args.type = args.type || bcdui.config.settings.bcdui.component.exports.detailExportDefaultFormat;
    args.type = args.type === "sylk" ? "slk" : args.type; // Most installations will only understand slk as file extension for Excel. sylk is for backward compatibility

    // We want xlsx and use server-side Excel creation
    if( args.type === "xlsx" ) {
      args.wrq.onReady( { executeIfNotReady: true, onSuccess: function() {
        var filNameAttr = null; //bcdui.factory.objectRegistry.getObject(args.wrq).getData().selectSingleNode("/wrq:WrsRequest/@bcdFileName");
        args.fileName = args.fileName || ( filNameAttr ? filNameAttr.nodeValue : null );
        if (! args.fileName) {
          var fileName = bcdui.component.exports._getFileNameFromNavPath();
          if (fileName)
            args.fileName = fileName + "_" + bcdui.component.exports._getExportTimeStamp() + "." + args.type;
        }
        args.fileName = args.fileName ? args.fileName : "export_" + bcdui.component.exports._getExportTimeStamp() + "." + args.type;
        bcdui.component.exports.exportToExcelTemplate( {inputModel: args.wrq, fileName: args.fileName} );
      }});
    } 
    // Export via sylk / csv servlet export by sending the Wrq
    else
      bcdui.component.exports.excel.detailExport( args );
  },
  
  /**
   * Uses ExcelExportServlet to export Wrs(s) into XLSX template
   * @param {Object} args The argument map with the following properties
   * @param {bcdui.core.DataProvider} [args.inputModel]                - containing wrs:WrsContainer with 1..n wrs:Wrs/wrq:WrsRequest elements, containing wrs:Header/rnd:Wrs2Excel defining target sheets
   * @param {string}                  [args.fileName=excelExport.xlsx] - URL name used as suffix, must end with .xlsx
   */
  exportToExcelTemplate: function( args )
  {
    var formId      = "bcdExcelTemplateExport-form";
    var servletPath = bcdui.config.contextPath + "/bcdui/servlets/ExcelExportServlet";
    
    // The form is a singleton
    var form = document.getElementById(formId);
    if (!form) {
      var el = jQuery(bcdui.component.exports.exportToExcelTemplateFormTpl({ id : formId }));
      el.appendTo(document.body);
      form = el.get(0);
    }

    // Execute the data, update the form's changing settings and POST to servlet
    jQuery.blockUI({ message : bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_Report_ExportStarted"}), timeout: 3000, fadeOut:  1500 });
    bcdui.factory.objectRegistry.withReadyObjects( args.inputModel, function() {
      form.elements["data"].value = args.inputModel.serialize();
      form.elements["pageHash"].value = bcdui.frame.pageHash||"";
      form.setAttribute("action", servletPath + "/" + (args.fileName || "excelExport.xlsx" ) );
      form.submit();
    });
  },
  exportToExcelTemplateFormTpl: doT.compile("<form id='{{=it.id}}' method='post'><input type='hidden' name='data' value=''/><input type='hidden' name='pageHash' value=''/></form>")
});