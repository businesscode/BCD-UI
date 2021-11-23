/*
  Copyright 2010-2021 BusinessCode GmbH, Germany

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
package de.businesscode.bcdui.web.wrs;

import java.util.stream.Collectors;

import javax.servlet.http.HttpServletRequest;

import org.w3c.dom.Document;

import de.businesscode.bcdui.logging.LogEventBase;
import de.businesscode.bcdui.wrs.IRequestOptions;
import de.businesscode.bcdui.wrs.load.DataLoader;
import de.businesscode.bcdui.wrs.load.IDataWriter;
import de.businesscode.bcdui.wrs.load.ISqlGenerator;

/**
 * This bean contains all information about the log-event
 */
public class WrsAccessLogEvent extends LogEventBase{

  private static final long serialVersionUID = 3561315599141005246L;
  public static final String ACCESS_TYPE_WRS = "WRS";
  public static final String ACCESS_TYPE_SYLK = "SYLK";
  public static final String ACCESS_TYPE_CVS = "CVS";
  public static final String ACCESS_TYPE_XLS = "XLS";
  //
  private String accessType;
  private HttpServletRequest request;
  private String bindingSetName;
  private Document requestDoc;
  private long executeDuration;
  private long writeDuration;
  private long rsStartTime;
  private long rsEndTime;
  private int rowCount;
  private int columnCount;

  /**
   * Create new log-event and fill it with all information from the parameters.
   *
   * @param accessType
   *          - one of WRS, SYLK, CVS
   * @param request
   * @param options
   * @param generator
   * @param loader
   * @param writer
   */
  public WrsAccessLogEvent(String accessType, HttpServletRequest request, IRequestOptions options, ISqlGenerator generator, DataLoader loader, IDataWriter writer) {
    this(accessType, request, 
        String.join( ",", generator.getResolvedBindingSets().stream().map(bs->bs.getName()).collect(Collectors.toSet()) ), 
        options.getRequestDoc(), loader.getExecuteDuration(), loader.getWriteDuration(), loader.getRsStartTime(), loader.getRsEndTime(), writer.getRowCount(), writer.getColumnsCount());
  }

  /**
   * @param accessType
   * @param request
   * @param bindingSetName
   * @param requestDoc
   * @param executeDuration
   * @param writeDuration
   * @param rowCount
   * @param columnCount
   */
  public WrsAccessLogEvent(String accessType, HttpServletRequest request, String bindingSetName, Document requestDoc, long executeDuration, long writeDuration, long rsStartTime, long rsEndTime, int rowCount, int columnCount) {
    super();
    setAccessType(accessType);
    setRequest(request);
    setBindingSetName(bindingSetName);
    setRequestDoc(requestDoc);
    setExecuteDuration(executeDuration);
    setWriteDuration(writeDuration);
    setRsStartTime(rsStartTime);
    setRsEndTime(rsEndTime);
    setRowCount(rowCount);
    setColumnCount(columnCount);
  }

  /**
   * @return the accessType
   */
  public String getAccessType() {
    return accessType;
  }

  /**
   * @return the request
   */
  public HttpServletRequest getRequest() {
    return request;
  }

  /**
   * @return the bindingSetName
   */
  public String getBindingSetName() {
    return bindingSetName;
  }

  /**
   * @return the requestDoc
   */
  public Document getRequestDoc() {
    return requestDoc;
  }

  /**
   * @return the executeDuration
   */
  public long getExecuteDuration() {
    return executeDuration;
  }

  /**
   * @return the writeDuration
   */
  public long getWriteDuration() {
    return writeDuration;
  }

  /**
   * @return the rsStartTime
   */
  public long getRsStartTime() {
    return rsStartTime;
  }

  /**
   * @return the rsEndTime
   */
  public long getRsEndTime() {
    return rsEndTime;
  }

  /**
   * @return the rowCount
   */
  public int getRowCount() {
    return rowCount;
  }

  /**
   * @return the columnCount
   */
  public int getColumnCount() {
    return columnCount;
  }

  /**
   * @return the resultSet values count
   */
  public int getValueCount() {
    return getRowCount() * getColumnCount();
  }

  /**
   * @param accessType
   *          the accessType to set
   */
  private void setAccessType(String accessType) {
    this.accessType = accessType;
  }

  /**
   * @param request
   *          the request to set
   */
  private void setRequest(HttpServletRequest request) {
    this.request = request;
  }

  /**
   * @param bindingSetName
   *          the bindingSetName to set
   */
  private void setBindingSetName(String bindingSetName) {
    this.bindingSetName = bindingSetName;
  }

  /**
   * @param requestDoc
   *          the requestDoc to set
   */
  private void setRequestDoc(Document requestDoc) {
    this.requestDoc = requestDoc;
  }

  /**
   * @param executeDuration
   *          the executeDuration to set
   */
  private void setExecuteDuration(long executeTime) {
    this.executeDuration = executeTime;
  }

  /**
   * @param writeDuration
   *          the writeDuration to set
   */
  private void setWriteDuration(long writeTime) {
    this.writeDuration = writeTime;
  }

  /**
   * @param rsStartTime
   *          the rsStartTime to set
   */
  private void setRsStartTime(long rsStartTime) {
    this.rsStartTime = rsStartTime;
  }

  /**
   * @param rsEndTime
   *          the rsEndTime to set
   */
  private void setRsEndTime(long rsEndTime) {
    this.rsEndTime = rsEndTime;
  }

  /**
   * @param rowCount
   *          the rowCount to set
   */
  private void setRowCount(int rowCount) {
    this.rowCount = rowCount;
  }

  /**
   * @param columnCount
   *          the columnCount to set
   */
  private void setColumnCount(int columnCount) {
    this.columnCount = columnCount;
  }

  /**
   * @see java.lang.Object#toString()
   */
  @Override
  public String toString() {
    return getAccessType()+"-Access. " + getBindingSetName();
  }

  @Override
  public String getFormattedMessage() {
    return toString();
  }

}
