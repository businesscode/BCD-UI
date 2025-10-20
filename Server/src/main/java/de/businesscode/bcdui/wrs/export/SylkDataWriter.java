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
package de.businesscode.bcdui.wrs.export;

import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpression;
import javax.xml.xpath.XPathExpressionException;

import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.wrs.IRequestOptions;
import de.businesscode.bcdui.wrs.export.ExcelSylkTemplate.ColumnMapping;
import de.businesscode.bcdui.wrs.load.AbstractDataWriter;
import de.businesscode.bcdui.wrs.load.IDataWriter;
import de.businesscode.bcdui.wrs.load.WrsBindingItem;
import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.XPathUtils;

public abstract class SylkDataWriter extends AbstractDataWriter implements IDataWriter {
  private PrintWriter PrintWriter;
  private String applicationURL;
  private String addInfo = null;

  public SylkDataWriter() {
    super();
  }
  
  public void setAddInf(IRequestOptions options) {
    try {
      XPath xp = XPathUtils.newXPath();
      StandardNamespaceContext nsContext = StandardNamespaceContext.getInstance();
      //
      String wrq = nsContext.getXMLPrefix(StandardNamespaceContext.WRSREQUEST_NAMESPACE);
      //
      XPathExpression addInfoXPath = xp.compile("/" + wrq + "WrsRequest/" + wrq + "Header/"+ wrq + "SylkExport/" + wrq + "AddHeaderInfo");
      addInfo = (String) addInfoXPath.evaluate(options.getRequestDoc(), XPathConstants.STRING);
    }
    catch (XPathExpressionException e) {
      throw new RuntimeException("Cannot initialize class. Wrong XPath", e); // it's a bug
    }
  }

  /**
   * @return the applicationURL
   */
  public final String getApplicationURL() {
    return applicationURL;
  }
  
  /**
   * @return the additional information
   */
  public final String getAddInfo() {
    return addInfo;
  }

  /**
   * @param applicationURL
   *          the applicationURL to set
   */
  public final void setApplicationURL(String applicationURL) {
    this.applicationURL = applicationURL;
  }

  /**
   * @param addInfo
   *          the applicationURL to set
   */
  public final void setAddInfo(String addInfo) {
    this.addInfo = addInfo;
  }

  /**
   * getLazyStream
   *
   * This method called only once.
   *
   * @return the output stream. <br>
   * @throws Exception
   */
  protected abstract PrintWriter getLazyStream() throws Exception;

  /**
   * @return the PrintWriter
   */
  private PrintWriter getPrintWriter() {
    if (PrintWriter == null) {
      try {
        PrintWriter = getLazyStream();
      }
      catch (Exception e) {
        throw new RuntimeException("Unable to get the output stream.", e);
      }
    }
    return PrintWriter;
  }

  /**
   * @see de.businesscode.bcdui.wrs.load.AbstractDataWriter#write()
   */
  @Override
  protected void write() throws Exception {
    if (getResultSet() != null) {
      List<ColumnMapping> columnsMapping = getColumnsMapping();
      ExcelSylkTemplate sylk = new ExcelSylkTemplate(getResultSetMetaData(), 0, columnsMapping);
      // sylk.setHttpHeadersMap(getHTTPHeadersMap(columns)); // TODO isHiperLink in binding????
      sylk.setApplicationURL(getApplicationURL());
      sylk.setAddInfo(getAddInfo());
      sylk.setHttpHeader("Generic excel export");
      //
      this.rowCounter =  sylk.writeStandardTable(getPrintWriter(), getResultSet(), 1000);

    }
  }

  /**
   * getColumnsMapping
   *
   * @return
   * @throws Exception
   */
  private List<ColumnMapping> getColumnsMapping() throws Exception {
    List<ColumnMapping> columnsMapping = new ArrayList<ColumnMapping>();
    Collection<WrsBindingItem> selectedBindingItems = getGenerator().getSelectedBindingItems();
    for (WrsBindingItem bindingItem : selectedBindingItems) {

      int wrsAColumn = -1;
      if( bindingItem.hasWrsAAttributes()) {
        for (WrsBindingItem wrsA : bindingItem.getWrsAAttributes()) {
          if ("bcdSylkUrl".equals(wrsA.getWrsAName())) {
            wrsAColumn = wrsA.getColumnNumber();
          }
        }
      }

      String columnCaption = bindingItem.getAttribute(Bindings.captionAttribute, bindingItem.getId());
      String dbColumnName = bindingItem.getAlias();
      String decimals = null;
      if (bindingItem.getJDBCColumnScale() != null) {
        decimals = bindingItem.getJDBCColumnScale().toString();
      }
      //
      ColumnMapping columnMapping = new ColumnMapping(columnCaption, dbColumnName, decimals, wrsAColumn);
      columnsMapping.add(columnMapping);
    }
    return columnsMapping;
  }

  /**
   * @see de.businesscode.bcdui.wrs.load.IDataWriter#close()
   */
  @Override
  public void close() throws Exception {
    // don't use lazy getter here!!
    if (this.PrintWriter != null) {
      this.PrintWriter.flush();
    }
  }

  // =======================================================================================

}
