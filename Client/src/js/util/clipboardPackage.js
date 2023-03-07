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
 * This file contains the namespace declaration and the functions for manipulating the clipboard.
 *
 */

/**
 * This namespace contains the clipboard functions, objects and constants.
 * @namespace bcdui.util.clipboard
 */
bcdui.util.clipboard = 
/** @lends bcdui.util.clipboard */
{
    /**
     * The buffer for FireFox and Chorme, because they do not allow writing to
     * the windows clipboard.
     * @private
     */
    _buffer: "",

    /**
     * Copy
     * @param {string} data - Data to be copied to clipboard
     */
    copy: function(/* String */ data) {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText)
        navigator.clipboard.writeText(data);
      else {
        bcdui.util.clipboard._buffer = data;
      }
      bcdui.log.isTraceEnabled() && bcdui.log.trace("Copied to clipboard: " + data)
    },

    /**
     * Paste
     * @returns {Promise} - resolving with clipboard data
     */
    paste: function() {
      bcdui.log.isTraceEnabled() && bcdui.log.trace("Pasted from clipboard: " + data);
      return new Promise(function(resolve, reject) {
        var data;
        if (navigator && navigator.clipboard && navigator.clipboard.readText)
          resolve(navigator.clipboard.readText());
        else
          data = bcdui.util.clipboard._buffer;
        resolve(data)
      });
    },

    /**
     * Gets CSV data from the clipboard (or the provided data) and converts it to
     * XML according to the csv-1.0.0.xsd.
     * @param {string} [data] Optional parameter containing CSV data which should be converted
     * instead of the clipboard data. If omitted the CSV data is taken from the
     * clipboard.
     * @param {boolean} [emptyRowIfNoData=false] If true and there is no data to paste, an emtpy
     * row with one column is produced in the resulting XML, this is useful for
     * pasting as new rows, in case only empty-cells were previously copied to the
     * clipboard.
     */
    pasteCSVasXML: function( data, emptyRowIfNoData) {
      return new Promise(function(resolve, reject) {
        bcdui.util.clipboard.paste().then(value => {
          var plaintext = typeof data == "undefined" || data == null ? value : data;
          var serializedXml = "<?xml version='1.0'?><CSVData xmlns=\"" + bcdui.core.xmlConstants.namespaces.csv + "\">";
          if( plaintext != null && plaintext.length > 0){
            plaintext = bcdui.util.xml.quoteXMLString(plaintext.replace(/\r?\n$/,"") /*  delete the last \r\n */ );
            serializedXml += "<R><C>" + plaintext.replace(/\t/g,"</C><C>").replace(/\r?\n/g,"</C></R><R><C>") + "</C></R>";
          }else if(emptyRowIfNoData){
            serializedXml += "<R><C></C></R>";
          }
          serializedXml += "</CSVData>";
          resolve(serializedXml);
        })
      });
    },

    /**
     *  Cleans the current clipboard
     */
    clearData: function(){
      if (navigator && navigator.clipboard && navigator.clipboard.writeText)
        navigator.clipboard.writeText("");
      else{
        bcdui.util.clipboard._buffer="";
      }
    }
}; // namespace
