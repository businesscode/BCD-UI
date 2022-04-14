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
package de.businesscode.bcdui.wrs.export;

import java.io.IOException;
import java.io.Writer;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpression;
import javax.xml.xpath.XPathExpressionException;

import com.opencsv.CSVWriter;
import com.opencsv.ResultSetHelper;
import com.opencsv.ResultSetHelperService;
import de.businesscode.bcdui.wrs.load.AbstractDataWriter;
import de.businesscode.bcdui.wrs.load.IDataWriter;
import de.businesscode.bcdui.wrs.load.WrsBindingItem;
import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.XPathUtils;

public abstract class CsvDataWriter extends AbstractDataWriter implements IDataWriter {

  private CSVWriter writer;

  private final XPathExpression csvSeparatorExpr;
  private final XPathExpression csvQuoteCharacterExpr;
  private final XPathExpression csvHeaderExpr;

  public CsvDataWriter() {
    super();
    try {
      XPath xp = XPathUtils.newXPath();
      StandardNamespaceContext nsContext = StandardNamespaceContext.getInstance();
      //
      String wrq = nsContext.getXMLPrefix(StandardNamespaceContext.WRSREQUEST_NAMESPACE);
      //
      csvSeparatorExpr = xp.compile("/" + wrq + "WrsRequest/" + wrq + "Header/"+ wrq + "CsvExport/@separator");
      csvQuoteCharacterExpr = xp.compile("/" + wrq + "WrsRequest/" + wrq + "Header/"+ wrq + "CsvExport/@quoteCharacter");
      csvHeaderExpr = xp.compile("/" + wrq + "WrsRequest/" + wrq + "Header/"+ wrq + "CsvExport/@header");
    }
    catch (XPathExpressionException e) {
      throw new RuntimeException("Cannot initialize class. Wrong XPath", e); // it's a bug
    }
  }

  /**
   * getLazyStream
   *
   * This method called only once.
   *
   * @return the output stream. <br>
   * @throws Exception
   */
  protected abstract Writer getLazyStream() throws Exception;

  /**
   * @return the writer
   */
  private CSVWriter getWriter() {
    if (writer == null) {
      try {
        char separator = getCsvSeparator().charAt(0);
        char quotechar = (getCsvQuoteCharacter().length() == 0) ? CSVWriter.NO_QUOTE_CHARACTER : getCsvQuoteCharacter().charAt(0);
        writer = new CSVWriter(getLazyStream(), separator, quotechar, quotechar, "\n");
        // Sadly, we cannot user 'sep=' as first line here as it breakes Excel's BOM recognition and this non-latin characters.
        //
        ResultSetHelper helper = new ResultSetHelperService() {
          @Override
          public String[] getColumnNames(ResultSet rs) throws SQLException {
            String csvHeader = getCsvHeader();
            if ("none".equals(csvHeader)) {
              return null; // no header
            }
            if ("raw".equals(csvHeader)) {
              return super.getColumnNames(rs); // column names from resultSet
            }
            //
            Collection<WrsBindingItem> bindingItems;
            try {
              bindingItems = getGenerator().getSelectedBindingItems();
            }
            catch (Exception e) {
              throw new RuntimeException("Unable to get the column names.", e);
            }
            if ("id".equals(csvHeader)) {
              List<String> names = new ArrayList<String>();
              for (WrsBindingItem item : bindingItems) {
                names.add(item.getId());
              }
              return names.toArray(new String[names.size()]);
            }
            if ("caption".equals(csvHeader)) {
              List<String> names = new ArrayList<String>();
              for (WrsBindingItem item : bindingItems) {
                if (item.getCaption() != null && item.getCaption().trim().length() > 0) {
                  names.add(item.getCaption());
                }
                else {
                  names.add(item.getId());
                }
              }
              return names.toArray(new String[names.size()]);
            }
            return null; // no header
          }

          /**
           * @return the column values without attributes.
           */
          @Override
          public String[] getColumnValues(ResultSet rs) throws SQLException, IOException {
            String[] values = super.getColumnValues(rs);
            //
            rowCounter++;
            //
            List<String> result = new ArrayList<String>();
            try {
              for (WrsBindingItem item : getGenerator().getSelectedBindingItems()) {
                result.add(values[item.getColumnNumber() - 1]);
              }
            } catch (Exception e) {
                throw new RuntimeException("Unable to get the column values.", e);
            }
            return (String[]) result.toArray(new String[result.size()]);
          }
        };
        writer.setResultService(helper);
      }
      catch (Exception e) {
        throw new RuntimeException("Unable to get the output stream.", e);
      }
    }
    return writer;
  }

  /**
   * @see de.businesscode.bcdui.wrs.load.AbstractDataWriter#write()
   */
  @Override
  protected void write() throws Exception {
    if (getResultSet() != null) {
      getWriter().writeAll(getResultSet(), true);
    }
  }

  /**
   * @see de.businesscode.bcdui.wrs.load.IDataWriter#close()
   */
  @Override
  public void close() throws Exception {
    // don't use lazy getter here!!
    if (this.writer != null) {
      this.writer.close();
    }
  }

  // =======================================================================================

  /**
   * @return the csvSeparator
   */
  private String getCsvSeparator() {
    String csvSeparator = null;
    // read from request
    if (getRequestDocRoot() != null) {
      try {
        csvSeparator = (String) csvSeparatorExpr.evaluate(getRequestDocRoot(), XPathConstants.STRING);
      }
      catch (XPathExpressionException e) {
        throw new RuntimeException("Wrong XPath", e); // it's a bug
      }
    }
    if (csvSeparator == null || csvSeparator.trim().length() == 0) {
      csvSeparator = ";"; // xsd-default
    }
    if (csvSeparator.equals("\\t")) {
      csvSeparator = "\t";
    }
    return csvSeparator;
  }

  /**
   * @return the csvQuoteCharacter
   */
  private String getCsvQuoteCharacter() {
    String csvQuoteCharacter = null;
    // read from request
    if (getRequestDocRoot() != null) {
      try {
        csvQuoteCharacter = (String) csvQuoteCharacterExpr.evaluate(getRequestDocRoot(), XPathConstants.STRING);
      }
      catch (XPathExpressionException e) {
        throw new RuntimeException("Wrong XPath", e); // it's a bug
      }
    }
    if (csvQuoteCharacter == null) {
      csvQuoteCharacter = ""; // xsd-default
    }
    return csvQuoteCharacter;
  }

  /**
   * @return the csvHeader
   */
  private String getCsvHeader() {
    String csvHeader = null;
    // read from request
    if (getRequestDocRoot() != null) {
      try {
        csvHeader = (String) csvHeaderExpr.evaluate(getRequestDocRoot(), XPathConstants.STRING);
      }
      catch (XPathExpressionException e) {
        throw new RuntimeException("Wrong XPath", e); // it's a bug
      }
    }
    if (csvHeader == null || csvHeader.trim().length() == 0) {
      csvHeader = "none"; // xsd-default
    }

    return csvHeader;
  }

}
