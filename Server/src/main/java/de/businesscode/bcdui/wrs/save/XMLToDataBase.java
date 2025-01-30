/*
  Copyright 2010-2023 BusinessCode GmbH, Germany

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
package de.businesscode.bcdui.wrs.save;

import java.lang.reflect.Field;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Types;
import java.text.MessageFormat;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import javax.xml.namespace.QName;
import javax.xml.stream.Location;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.events.Attribute;
import javax.xml.stream.events.Characters;
import javax.xml.stream.events.EndElement;
import javax.xml.stream.events.StartElement;
import javax.xml.stream.events.XMLEvent;
import javax.xml.stream.util.XMLEventConsumer;

import org.apache.logging.log4j.Logger;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.BindingSet.SECURITY_OPS;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.subjectFilter.Connective;
import de.businesscode.bcdui.binding.write.SubjectFilterOnWriteCallback;
import de.businesscode.bcdui.binding.write.WriteProcessingCallback;
import de.businesscode.bcdui.binding.write.WriteProcessingCallbackFactory;
import de.businesscode.bcdui.subjectsettings.SecurityException;
import de.businesscode.bcdui.wrs.IRequestOptions;
import de.businesscode.bcdui.wrs.save.event.ISaveEventListener;
import de.businesscode.bcdui.wrs.save.event.SaveEvent;
import de.businesscode.bcdui.wrs.save.event.SaveEventState;

public class XMLToDataBase implements XMLEventConsumer {

  private MessageFormat successMessage = new MessageFormat("Successfully modified {0} database row{0,choice,0#s|1#|1<s}.");

  protected Bindings bindings = null;
  private Connection usedConnection = null;
  private IRequestOptions options = null;
  private int maxBatchSize = 0;

  private IDelegate delegate = null;
  protected int currentColumnIndex = 0;
  private String rowElementName = null;

  private Logger logger = null;
  private int modifiedRowCount = 0;
  private int webRowSetsOpened = 0;
  private int webRowSetsClosed = 0;

  protected BindingSet bindingSet = null;
  protected ArrayList<BindingItem> columns = null;
  protected ArrayList<Integer> columnTypes = null;
  protected Collection<String> keyColumnNames = null;
  protected final ArrayList<String> columnValues = new ArrayList<String>();
  protected final ArrayList<String> updateValues = new ArrayList<String>();

  private DatabaseWriter databaseWriter = null;

  private TableNameSetter tableNameSetter = new TableNameSetter();
  private KeyColumnSetter keyColumnSetter = new KeyColumnSetter();
  private ColumnIndexSetter columnIndexSetter = new ColumnIndexSetter();
  private ColumnTypeSetter columnTypeSetter = new ColumnTypeSetter();

  private TextDelegate columnValueHandler = new ColumnValueHandler();
  private UpdateValueHandler updateValueHandler = new UpdateValueHandler();
  private ISaveEventListener listener;

  private StringBuilder characterDataBuffer = new StringBuilder();
  private boolean isDdebugMode = false;
  private final ServerSideValueBean columnValueBean;

  private QName isKey = new QName("isKey");
  private QName columnTypeName = new QName("type-name");
  private QName id = new QName("id");
  private QName pos = new QName("pos");
  private boolean textOccurred = false;

  private List<WriteProcessingCallback> writeProcessingCallbacks = new ArrayList<WriteProcessingCallback>();

  public XMLToDataBase(Bindings bindingsPr, IRequestOptions options, int maxBatchSizePr, Logger loggerPr, ISaveEventListener listenerPr, boolean isDebugModePr) {
    this.listener = listenerPr;
    this.bindings = bindingsPr;
    this.maxBatchSize = maxBatchSizePr;
    this.logger = loggerPr;
    this.options = options;
    this.isDdebugMode = isDebugModePr;
    this.columnValueBean = new DefaultColumnValueBean(options, loggerPr);
  }

  /**
   * @return the defaultConnection
   */
  private Connection getDefaultManagedConnection() throws Exception {
    return options.getManagedConnection(null);
  }

  @Override
  public void add(XMLEvent event) throws XMLStreamException {
    try {
      if (event.isStartElement()) {
        characterDataBuffer.setLength(0);
        StartElement evt = event.asStartElement();
        String elementName = evt.getName().getLocalPart();
        Attribute attr = null;
        boolean needsInit = false;
        if (elementName.equals("Wrs")) {
          databaseWriter = null;
          bindingSet = null;
          columns = new ArrayList<BindingItem>();
          columnTypes = new ArrayList<Integer>();
          keyColumnNames = new ArrayList<String>();
          webRowSetsOpened++;
        }
        else if (elementName.equals("BindingSet") && bindingSet == null) {
          delegate = tableNameSetter;
          needsInit = true;
        }
        else if (elementName.equals("C") && rowElementName == null) {// @pos + @id
          delegate = columnIndexSetter;
          needsInit = true;
          attr = evt.getAttributeByName(pos);

          Attribute attributeByName = evt.getAttributeByName(id);
          if (attributeByName != null) {
            String name = attributeByName.getValue();
            columns.add(bindingSet.get(name));
          }

          if (evt.getAttributeByName(columnTypeName) != null) {
            String fieldName = evt.getAttributeByName(columnTypeName).getValue();
            Field f = null;
            f = Types.class.getDeclaredField(fieldName);
            columnTypeSetter.init();
            columnTypeSetter.setText("" + f.getInt(f));
          } else {
            columnTypeSetter.init();
            columnTypeSetter.setText("" + Types.class.getDeclaredField("VARCHAR").getInt(Types.class.getDeclaredField("VARCHAR")));
          }
          if (evt.getAttributeByName(isKey) != null) {
            if (Boolean.parseBoolean(evt.getAttributeByName(isKey).getValue())) {
              keyColumnSetter.init();
              keyColumnSetter.setText(attributeByName.getValue());
            }
          }
        }
        else if (elementName.equals("M") || elementName.equals("I") || elementName.equals("D")) {
          currentColumnIndex = 0;
          rowElementName = elementName;
          beginRow();
          needsInit = true;
        }
        else if (elementName.equals("C") && rowElementName != null) {// updated value
          delegate = updateValueHandler;
          needsInit = true;
        }
        else if (elementName.equals("O") && rowElementName != null) {// original value
          delegate = columnValueHandler;
          needsInit = true;
        }
        else if (elementName.equals("null") && rowElementName != null) {
          // because of mixed content type
          // set null value into previous column
          delegate.setPreviosToNull();
          delegate = null;
        }
        if (delegate != null) {
          delegate.setElementName(elementName);
          if (needsInit)
            delegate.init();
          if (delegate instanceof AttributeDelegate && attr != null) {
            delegate.setText(attr.getValue() == null ? null : attr.getValue().trim().replace("\n", ""));
          }
        }
      }
      else if (event.isCharacters()) {
        Characters evt = event.asCharacters();
        textOccurred = true;
        if (delegate != null && !(delegate instanceof AttributeDelegate)) {
          // Workaround for Task 4636, because the StAX XML parser always
          // sends XML entities as separate events no matter what property
          // is set for the XMLInputFactory
          characterDataBuffer.append(evt.getData());
          delegate.setText(characterDataBuffer.toString().trim());
        }
      }
      else if (event.isEndElement()) {
        characterDataBuffer.setLength(0);
        EndElement evt = event.asEndElement();
        String elementName = evt.getName().getLocalPart();
        if (elementName.equals("Wrs")) {
          webRowSetsClosed++;
          endWebRowSet();
        }
        else if (elementName.equals("M") || elementName.equals("I") || elementName.equals("D")) {
          endRow(elementName);
          rowElementName = null;
        }
        else if (elementName.equals("Header")) {// end of header
          columnValues.clear();
          updateValues.clear();

          processEndHeader();
        }
        else if (delegate != null && delegate.isElement(elementName) && (elementName.equals("C") || elementName.equals("O")) && textOccurred) {
          delegate.setPreviosToNull();
        }
        if (delegate != null && delegate.isElement(elementName)) {
          delegate = null;
        }
      }
      if (webRowSetsOpened == webRowSetsClosed && webRowSetsOpened > 0) {
        if (isDdebugMode)
          logger.info(successMessage.format(new Object[] { modifiedRowCount }));
        else
          logger.info("Changes were successfully applied");
        webRowSetsOpened = 0;
        webRowSetsClosed = 0;
        modifiedRowCount = 0;
        endWebRowSet();
        return;
      }
    } catch (Exception ex) {
      // Try to close all statement objects.
      try {
        endWebRowSet();
      } catch (Exception e) {
        // As we are in a rollback situation, we do not need to track possible further exceptions
      }
      // Re-throw to trigger rollback
      throw new XMLStreamExceptionImpl("Exception occurred when writing a WRS document to database.", new LocationImpl(event.getLocation()), ex);
    }
  }

  /**
   * the header has been read, the bindingset and columns initialized,
   * here we check for WriteProcessing Callbacks, instatiate and initialize them and let process the header
   */
  private void processEndHeader() throws Exception {
    this.writeProcessingCallbacks.clear();

    // We derive the standard writing filter from SubjectSettings
    if( bindingSet.getSubjectFilters() != null) {
      Connective con = bindingSet.getSubjectFilters().getConnective();
      if( con.getElements().size() > 0 ) {
        WriteProcessingCallback cb = new SubjectFilterOnWriteCallback(con);
        this.writeProcessingCallbacks.add(cb);
        cb.setValueBean(columnValueBean);
        cb.setBindingSet(bindingSet);
        cb.initialize();
        cb.endHeader(columns, columnTypes, keyColumnNames);
      }
    }

    if(bindingSet.getWriteProcessing().hasCallbacks()){
      logger.debug("write processing callbacks found, delegating processEndHeader.");

      // These are the explicitly declared write callbacks
      for(WriteProcessingCallbackFactory cbf : bindingSet.getWriteProcessing().getCallbacksRO()){
        WriteProcessingCallback cb = cbf.createInstance();

        this.writeProcessingCallbacks.add(cb);

        cb.setValueBean(columnValueBean);
        cb.setBindingSet(bindingSet);
        cb.initialize();
        cb.endHeader(columns, columnTypes, keyColumnNames);
      }

    } else {
      logger.debug("NO write processing callbacks found");
    }
  }

  /**
   * the row has been read and values parsed, here we check if binding has defined
   * WriteProcessing and apply them
   */
  private void processEndRow(String rowElementName) throws Exception {
    logger.debug("write processing callbacks found, delegating processEndRow.");
    for(WriteProcessingCallback cb : this.writeProcessingCallbacks){
      cb.endDataRow(WriteProcessingCallback.ROW_TYPE.valueOf(rowElementName), updateValues, columnValues);
    }
  }

  /**
   *
   */
  private void beginRow() {
    columnValues.clear();
    updateValues.clear();
  }

  /**
   *
   */
  private void endRow(String rowElementNameParam) throws Exception {

    if(!this.writeProcessingCallbacks.isEmpty()) {
      // this will modify columns, columnTypes, columnValues and updateValues
      processEndRow(rowElementNameParam);
    }


    if (databaseWriter == null) {
      String dbSourceName = bindingSet.getJdbcResourceName();
      if (dbSourceName != null && !dbSourceName.equals(BindingSet.DEFAULT_DATABASE_SOURCENAME)) {
        usedConnection = options.getManagedConnection(dbSourceName);
      }
      Connection con = usedConnection != null ? usedConnection : getDefaultManagedConnection();

      databaseWriter = new DatabaseWriter(bindingSet, con, columns.toArray(new BindingItem[columns.size()]), columnTypes.toArray(new Integer[columnTypes.size()]), keyColumnNames, maxBatchSize);
      if (listener != null) {
        listener.actionPerformed(new SaveEvent(con, SaveEventState.StartSaving));
      }
    }
    else if(!this.writeProcessingCallbacks.isEmpty()) {
      // columns and columnTypes might have changed in the callback (e.g. wrs:I versus wrs:M), so we need to set the new ones
      // even if this is set per row, within databaseWrite, sql insert and modify generation will be only done once per type
      databaseWriter.updateColumnsAndTypes(columns.toArray(new BindingItem[columns.size()]), columnTypes.toArray(new Integer[columnTypes.size()]));
    }

    if (rowElementNameParam.equals("I")) {
      modifiedRowCount++;

      databaseWriter.insertRow(updateValues.toArray(new String[updateValues.size()]));

    }
    else if (rowElementNameParam.equals("M")) {
      modifiedRowCount++;

      databaseWriter.updateRow(columnValues.toArray(new String[columnValues.size()]), updateValues.toArray(new String[updateValues.size()]));

    }
    else if (rowElementNameParam.equals("D")) {
      modifiedRowCount++;

      databaseWriter.deleteRow(updateValues.toArray(new String[updateValues.size()]));

    }
  }

  /**
   *
   * Method endWebRowSet
   *
   * @throws SQLException
   */
  private void endWebRowSet() throws Exception {
    if (databaseWriter != null) {
      databaseWriter.finished();
      if (listener != null) {
        listener.actionPerformed(new SaveEvent(usedConnection != null ? usedConnection : getDefaultManagedConnection(), SaveEventState.EndSaving));
      }
      databaseWriter = null;
    }
  }

  protected interface IDelegate {
    public void setText(String text) throws Exception;
    public void setPreviosToNull() throws Exception;
    public void init();
    public void setElementName(String elementNamePar);
    public boolean isElement(String elementNamePar);
  }

  protected static abstract class TextDelegate implements IDelegate {
    private String elementName = null;
    @Override
    abstract public void setText(String text) throws Exception;

    @Override
    public void setPreviosToNull() throws Exception {
    };
    @Override
    public void init() {
    };
    @Override
    public void setElementName(String elementNamePar) {
      this.elementName = elementNamePar;
    }
    @Override
    public boolean isElement(String elementNamePar) {
      if (this.elementName == null || elementNamePar == null)
        return true;
      return this.elementName.equals(elementNamePar);
    }
  }
  protected static abstract class AttributeDelegate implements IDelegate {
    private String attrubuteName = null;
    @Override
    abstract public void setText(String text) throws Exception;
    @Override
    public void setPreviosToNull() throws Exception {
    }
    @Override
    public void init() {
    };

    public void setAttributeName(String elementNamePar) {
      this.attrubuteName = elementNamePar;
    }

    public boolean isAttribute(String attributeNamePar) {
      if (this.attrubuteName == null || attributeNamePar == null)
        return true;
      return this.attrubuteName.equals(attributeNamePar);
    }

    /**
     * @see de.businesscode.bcdui.wrs.save.XMLToDataBase.IDelegate#setElementName(java.lang.String)
     */
    @Override
    public void setElementName(String elementNamePar) {
    }

    /**
     * Method isElement
     *
     * @param elementNamePar
     * @return
     */
    @Override
    public boolean isElement(String elementNamePar) {
      return false;
    }
  }

  protected class TableNameSetter extends TextDelegate {
    @Override
    public void setText(String text) throws Exception {
      bindingSet = bindings.get(text);
      // apply WRITE security
      if(logger.isTraceEnabled()){
        logger.trace("check security for operation 'write'");
      }
      checkSecurity(bindingSet, BindingSet.SECURITY_OPS.write);
    }
  }

  /**
   * check that a binding may execute the given operation. Currently only the "write" operation is
   * supported. All other operations are not implemented and will end up in exception.
   *
   * @param bs to check
   * @param op to check if can be executed
   * @throws SecurityException
   */
  private void checkSecurity(BindingSet bs, BindingSet.SECURITY_OPS op) throws SecurityException{
    switch(op){
      case write:
        bs.assurePermissionDefined(SECURITY_OPS.write); // write permission must be defined on a BindingSet
        bs.assurePermitted(SECURITY_OPS.write); // check if write is permitted for subject
        break;
      default:
        throw new SecurityException("operation " + op.name() + " is not supported!");
    }
  }

  protected class KeyColumnSetter extends AttributeDelegate {
    @Override
    public void setText(String text) throws Exception {
      keyColumnNames.add(text);
    }
  }

  protected class ColumnIndexSetter extends AttributeDelegate {
    @Override
    public void setText(String text) throws Exception {
      currentColumnIndex = Integer.parseInt(text);
    }
  }
  protected class ColumnTypeSetter extends AttributeDelegate {
    @Override
    public void setText(String text) throws Exception {
      columnTypes.add(Integer.parseInt(text));
    }
  }
  protected class ColumnValueHandler extends TextDelegate {
    @Override
    public void init() {
    };
    @Override
    public void setText(String text) throws Exception {
      columnValues.add(((text == null || text.trim().length() == 0) ? null : text));
    }

    @Override
    public void setPreviosToNull() throws Exception {
      if (columnValues.size() > currentColumnIndex)
        columnValues.set(currentColumnIndex, null);
      else if (columnValues.size() < currentColumnIndex)
        columnValues.add(null);

    }
  }
  protected class UpdateValueHandler extends TextDelegate {
    @Override
    public void init() {
      currentColumnIndex++;
    };
    @Override
    public void setText(String text) throws Exception {
      updateValues.add(((text == null || text.trim().length() == 0) ? null : text));
    }

    @Override
    public void setPreviosToNull() throws Exception {
      if (updateValues.size() > currentColumnIndex)
        updateValues.set(currentColumnIndex, null);
      else if (updateValues.size() < currentColumnIndex)
        updateValues.add(null);
    }
  }

  protected class LocationImpl implements Location {
    String systemId;
    String publicId;
    int colNo;
    int lineNo;
    int charOffset;

    /**
     *
     * Constructor
     *
     * @param paramLocation
     */
    protected LocationImpl(Location paramLocation) {
      this.systemId = paramLocation.getSystemId();
      this.publicId = paramLocation.getPublicId();
      this.lineNo = paramLocation.getLineNumber();
      this.colNo = paramLocation.getColumnNumber();
      this.charOffset = paramLocation.getCharacterOffset();
    }

    @Override
    public int getCharacterOffset() {
      return this.charOffset;
    }
    @Override
    public int getColumnNumber() {
      return this.colNo;
    }
    @Override
    public int getLineNumber() {
      return this.lineNo;
    }
    @Override
    public String getPublicId() {
      return this.publicId;
    }
    @Override
    public String getSystemId() {
      return this.systemId;
    }
    @Override
    public String toString() {
      StringBuffer localStringBuffer = new StringBuffer();
      localStringBuffer.append("Line number = " + getLineNumber());
      localStringBuffer.append("\n");
      localStringBuffer.append("Column number = " + getColumnNumber());
      localStringBuffer.append("\n");
      localStringBuffer.append("System Id = " + getSystemId());
      localStringBuffer.append("\n");
      localStringBuffer.append("Public Id = " + getPublicId());
      localStringBuffer.append("\n");
      localStringBuffer.append("CharacterOffset = " + getCharacterOffset());
      localStringBuffer.append("\n");
      return localStringBuffer.toString();
    }
  }

  public class XMLStreamExceptionImpl extends XMLStreamException {

    public XMLStreamExceptionImpl(String msg, Location locationPr, Throwable th) {
      super(msg, locationPr, th);
      initCause(th);
    }
  }
}
