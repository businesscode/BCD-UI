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
   * @constant
   * @private
   */
  _bcdExportFormId: "bcdExportForm",


  /**
   * Produces a WYSIWYG pdf export of a windows.document subtree, needs pdf extension, part of EnterpriseEdition
   * @param {Object} args The parameter map contains the following properties:
   * @param {(string|HTMLElement)}  args.rootElement                  - The id of or the root element itself
   * @param {string}                [args.fileName=report.pdf]         - The name of the returned pdf
   * @param {string[]|string}       [args.css]                        - An array or space separated list of URLs containing CSS files to be used, relative the the current page.
   * This allows using different styling on export than on the page. You can also use an bcdPdfStyle for inline style only to be applied on export.
   * Absolute paths starting with '/' are relative to the context path. Use more specific rule precedence. (css precedence based on later declaration is not supported).
   * Local css are being cached.
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
   * @param {string}                [args.fileName=export(_timestamp).xsl] - The name of the returned Excel document
   * @param {string[]|string}       [args.css]                        - An array or space separated list of URLs containing CSS files to be used, relative the the current page.
   * This allows using different styling on export than on the page. You can also use an bcdPdfStyle for inline style only to be applied on export.
   * Absolute paths starting with '/' are relative to the context path. Use more specific rule precedence. (css precedence based on later declaration is not supported).
   * Local css are being cached.
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
        if (navPathTarget)
          args.rootElement.push(jQuery("<table><tr><td>" + jQuery("#" + navPathTarget).text() + "</td></tr><tr></tr></table>").get(0));
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
   * Produces a WYSIWYG image export of a windows.document subtree, needs pdf extension, part of EnterpriseEdition
   * @param {Object} args The parameter map contains the following properties:
   * @param {(string|HTMLElement)}  args.rootElement                  - The id of or the root element itself
   * @param {string}                [args.fileName=report.format]     - The name of the returned image
   * @param {string}                [format=png]                      - Image format, supported are 'jpg', 'png', 'bmp' or 'gif'
   * @param {string[]|string}       [args.css]                        - An array or space separated list of URLs containing CSS files to be used, relative the the current page.
   * This allows using different styling on export than on the page. You can also use an bcdPdfStyle for inline style only to be applied on export.
   * Absolute paths starting with '/' are relative to the context path. Use more specific rule precedence. (css precedence based on later declaration is not supported).
   * Local css are being cached.
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
    args.type = args.type === "sylk" ? "slk" : args.type; // Most installations will only understand slk as file extension for Excel. Sylk is for backward compatibility

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
    else {

      // We need a form, if it is not there, create one
      var exportForm = jQuery("#" + this._bcdExportFormId).get(0);
      if( ! exportForm ) {
        exportForm = document.createElement("form");
        exportForm.setAttribute("id",this._bcdExportFormId);
        var input = document.createElement("input");
        input.setAttribute("type","hidden");
        input.setAttribute("id","bcdExportFormGuiStatusGZ");
        input.setAttribute("name","guiStatusGZ");
        exportForm.appendChild(input);
        document.getElementsByTagName("body")[0].appendChild(exportForm);
      }

      // Make sure, Wrq is ready then send the request
      jQuery.blockUI({ message : bcdui.i18n.syncTranslateFormatMessage({msgid:"bcd_Report_ExportStarted"}), timeout: 2000, fadeOut:  1500 });
      bcdui.factory.objectRegistry.withReadyObjects( args.wrq, function() 
      {
        var filNameAttr = bcdui.factory.objectRegistry.getObject(args.wrq).getData().selectSingleNode("/wrq:WrsRequest/@bcdFileName");
        args.fileName = args.fileName || ( filNameAttr ? filNameAttr.nodeValue : null );
        if (! args.fileName) {
          var fileName = bcdui.component.exports._getFileNameFromNavPath();
          if (fileName)
            args.fileName = fileName + "_" + bcdui.component.exports._getExportTimeStamp() + "." + (args.type=="csv" ? "csv" : "xls");
        }
        args.fileName = (args.fileName ? args.fileName : (args.type=="csv" ? "export_" + bcdui.component.exports._getExportTimeStamp() + ".csv" : "export_" + bcdui.component.exports._getExportTimeStamp() + ".xls"));
        exportForm.setAttribute("action", (args.type=="csv" ?   bcdui.contextPath+"/bcdui/servlets/CsvServlet/"+args.fileName
            : bcdui.contextPath+"/bcdui/servlets/SylkServlet/"+args.fileName) );

        // write navPath information as AddHeaderInfo if available 
        var root = bcdui.wkModels.bcdNavPath.query("/*");
        if (root && root.getAttribute("targetId") != null) {
          var target = root.getAttribute("targetId");
          if (jQuery("#" + target).length > 0)
            var addInfo = jQuery("#" + target).text();
            addInfo += " - " + bcdui.i18n.syncTranslateFormatMessage({msgid: "bcd_Report_AddFilters" });
            bcdui.factory.objectRegistry.getObject(args.wrq).write("/wrq:WrsRequest/wrq:Header/wrq:SylkExport/wrq:AddHeaderInfo", addInfo, true);
        }

        if( bcdui.factory.objectRegistry.getObject(args.wrq).getData().selectSingleNode("/wrq:WrsRequest")==null ) {
          var messageGeneric = bcdui.i18n.syncTranslateFormatMessage({msgid: "bcd_Report_NoExport" });
          var message;
          var messageNode = bcdui.factory.objectRegistry.getObject(args.wrq).query("//@message");
          if( messageNode ) {
            message = bcdui.i18n.syncTranslateFormatMessage({msgid: messageNode.nodeValue });
            var messageArg1 = bcdui.factory.objectRegistry.getObject(args.wrq).query("//@messageArg1");
            message = bcdui.i18n.formatMessage( message, [messageArg1 ? messageArg1.nodeValue : null] );
          }
          bcdui.widget.showModalBox({
            title: messageGeneric,
            message: message ? message : messageGeneric,
            modalBoxType: bcdui.widget.modalBoxTypes.warning
          });
          return;
        }

        bcdui.core.compression.compressDOMDocument(bcdui.factory.objectRegistry.getObject(args.wrq).getData(), function(modelObjectGZ) {
          if (modelObjectGZ != null) {
            document.getElementById("bcdExportFormGuiStatusGZ").value = modelObjectGZ;
            exportForm.submit();
          }
        }, function(modelObjectGZ, message){
          // although failed, try to recover if compression succeeded with warning
          if (modelObjectGZ) {
            document.getElementById("bcdExportFormGuiStatusGZ").value = modelObjectGZ;
            exportForm.submit();
          } else {
            bcdui.isDebug&&window["console"]&&console.error("failed to compress guiStatus",{
              modelObjectGZ : modelObjectGZ,
              message       : message
            });
          }
        }, false, true);
      });  
    }
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