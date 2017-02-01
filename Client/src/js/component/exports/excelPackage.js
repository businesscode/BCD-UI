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
 * The namespace for the Excel export functions.
 * @namespace bcdui.component.exports.excel
 * @private
 */
bcdui.util.namespace("bcdui.component.exports.excel", 
/** @lends bcdui.component.exports.excel */
{
  /**
   * Use {@link bcdui.component.exports.exportWysiwygAsExcel} instead
   * @param {Object} args The argument map offering the following properties
   *   <ul>
   *     <li>sourceElementOrId: HTML element or its ID to export into excel, mandatory</li>
   *     <li>sheetName: Excel sheet name</li>
   *     <li>jdbcColumnTypeNames: JDBC column type names according to BindingSet format</li>
   *   </ul>
   * @private
   */
  exportHTMLElement:function(args){
    var xXporter = new bcdui.component.exports.excel.Excel();
    xXporter.exportHTMLdoc(
      { sourceElementOrId:args.sourceElementOrId
       , sheetName:args.sheetName
       , jdbcColumnTypeNames:args.jdbcColumnTypeNames
      }
    );
  },

  /**
   * @constant
   * @private
   */
  bcdExportFormId: "bcdExportForm",

  /**
   * Use {@link bcdui.component.exports.detailExport} instead!
   * Uses SylkServlet or CsvServlet export servlets to privide the data of a WrsRequest, the response opens asynchronously in an extra window
   * @param {Object} args The argument map with the following properties
   * @param {(string|bcdui.core.DataProvider)} args.wrq                         - Model containing the wrs request according to XSD http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0
   * @param {string}                           [args.type=slk ]                 - Can be "slk" or "csv"
   * @param {string}                           [args.fileName=export.(csv|xsl)] - Name of the response file, depending on type, can also be provided via /wrq:WrsRequest/@bcdFileName from within the request
   * @private
   */
  detailExport: function( args ) {

    args.type = args.type === "sylk" ? "slk" : args.type; // Most installations will only understand slk as file extension for Excel, sylk is for backward compatibility
    
    // We need a form, if it is not there, create one
    var exportForm = bcdui._migPjs._$(this.bcdExportFormId).get(0);
    if( ! exportForm ) {
      exportForm = bcdui._migPjs._$(document.createElement("form")).get(0);
      exportForm.setAttribute("id",this.bcdExportFormId);
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
        target = root.getAttribute("targetId");
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
});