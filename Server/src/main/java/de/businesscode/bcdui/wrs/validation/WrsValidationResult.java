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
package de.businesscode.bcdui.wrs.validation;

import java.util.Collection;
import java.util.LinkedList;

import javax.xml.stream.XMLOutputFactory;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamWriter;

import de.businesscode.bcdui.wrs.save.exc.WrsValidationException;
import de.businesscode.util.StandardNamespaceContext;

/**
 * read more about validation handling in the documentation of {@link WrsValidationException},
 * this class mainly holds data required to be rendered by validationMessages.xslt template
 *
 *
 */
public class WrsValidationResult {
  public static class Record {
    final int colPos;
    final int rowPos;
    final String error;
    public Record(int rowPos, int colPos, String error) {
      super();
      this.colPos = colPos;
      this.rowPos = rowPos;
      this.error = error;
    }

    public int getColPos() {
      return colPos;
    }

    public String getError() {
      return error;
    }

    public int getRowPos() {
      return rowPos;
    }
  }
  /**
   * serializer for the {@link WrsValidationException}, creates web row set format compatible to wrs:ValidationResult
   */
  public static class Serializer {
    public void serialize(WrsValidationResult result, XMLStreamWriter xmlWriter){
      try {
        doSerialize(result, xmlWriter);
      } catch (Exception e) {
        throw new RuntimeException("failed during serialization", e);
      }
    }

    /**
     * <p>
     * creates Wrs validation result fragment (with no &lt;?xml pragma) according to wrs:ValidationResult,
     * default namespace is {@link StandardNamespaceContext#WRS_NAMESPACE}
     * </p>
     *
     * @param result
     * @param w writer to use
     * @throws Exception
     */
    private void doSerialize(WrsValidationResult result, XMLStreamWriter w) throws Exception {
      w.setPrefix(StandardNamespaceContext.WRS_PREFIX, StandardNamespaceContext.WRS_NAMESPACE);
      w.writeStartElement(StandardNamespaceContext.WRS_NAMESPACE, "ValidationResult");
      w.writeNamespace(StandardNamespaceContext.WRS_PREFIX, StandardNamespaceContext.WRS_NAMESPACE);

      w.writeStartElement(StandardNamespaceContext.WRS_NAMESPACE,"Wrs");

      w.writeStartElement(StandardNamespaceContext.WRS_NAMESPACE,"Header");
      w.writeStartElement(StandardNamespaceContext.WRS_NAMESPACE,"Columns");
      writeHeaderCol(w, "1", "RowId", "NUMERIC");
      writeHeaderCol(w, "2", "ColPos", "NUMERIC");
      writeHeaderCol(w, "3", "error", "VARCHAR");
      w.writeEndElement();
      w.writeEndElement();

      w.writeStartElement(StandardNamespaceContext.WRS_NAMESPACE,"Data");

      for(WrsValidationResult.Record record : result.getRecords()) {
        writeRecord(w, record);
      }

      w.writeEndElement(); // Data
      w.writeEndElement(); // Wrs

      w.writeEndElement(); // ValidationResult

      w.flush();
//      if(true)throw new RuntimeException("not implemented");
    }

    private void writeRecord(XMLStreamWriter w, Record record) throws XMLStreamException {
      w.writeStartElement(StandardNamespaceContext.WRS_NAMESPACE,"R");

      w.writeStartElement(StandardNamespaceContext.WRS_NAMESPACE,"C");
      w.writeCharacters(Integer.toString(record.getRowPos()));
      w.writeEndElement();

      w.writeStartElement(StandardNamespaceContext.WRS_NAMESPACE,"C");
      w.writeCharacters(Integer.toString(record.getColPos()));
      w.writeEndElement();

      w.writeStartElement(StandardNamespaceContext.WRS_NAMESPACE,"C");
      w.writeCharacters(record.getError());
      w.writeEndElement();

      w.writeEndElement(); //R
    }

    private void writeHeaderCol(XMLStreamWriter w, String attrPos, String attrId, String attrTypeName) throws XMLStreamException {
      w.writeStartElement(StandardNamespaceContext.WRS_NAMESPACE,"C");
      w.writeAttribute("pos", attrPos);
      w.writeAttribute("id", attrId);
      w.writeAttribute("type-name", attrTypeName);
      w.writeEndElement();
    }
  }

  /* ~~~~~~~~ members ~~~~~~~~~~~~ */
  Collection<Record> records = new LinkedList<WrsValidationResult.Record>();

  /**
   * adds a new validation failure record
   *
   * @param colPos
   * @param rowPos
   * @param error
   */
  public void addRecord(int rowPos, int colPos, String error){
    this.records.add(new Record(rowPos, colPos, error));
  }

  public Collection<Record> getRecords() {
    return records;
  }

  public void serializeTo(XMLStreamWriter streamWriter) {
    new Serializer().serialize(this, streamWriter);
  }

  public static void main(String[] args) throws Throwable {
    WrsValidationResult res = new WrsValidationResult();
    res.addRecord(1,1,"test");
    res.serializeTo(XMLOutputFactory.newInstance().createXMLStreamWriter(System.out));
  }
}