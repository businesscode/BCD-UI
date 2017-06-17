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
package de.businesscode.bcdui.wrs.save;

import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.servlet.ServletContext;
import javax.servlet.http.HttpServletRequest;

import org.apache.log4j.Logger;
import org.apache.log4j.MDC;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.subject.Subject;
import org.w3c.dom.Document;

import de.businesscode.bcdui.subjectsettings.SecurityHelper;
import de.businesscode.bcdui.web.filters.RequestLifeCycleFilter;
import de.businesscode.bcdui.web.servlets.ZipLet;
import de.businesscode.bcdui.web.wrs.HttpRequestOptions;
import de.businesscode.bcdui.wrs.IRequestOptions;
import de.businesscode.util.Utils;

/**
 * this bean is target of evaluation in WRS updates,
 * is not thread-safe and this bean is used on per-request level
 *
 *
 */
public class DefaultColumnValueBean implements ServerSideValueBean {
  private String sessionId = null;
  private String pageHash = null;
  private String requestHash = null;
  private Document refererGuiStatusDoc = null;
  private String refererUrl = null;
  private String userName = null, userLogin = null, userId = null;
  private Logger log;
  private Date creationStamp = new Date();
  private final String creationStampString;

  public DefaultColumnValueBean(IRequestOptions requestOptions, Logger log){
    this.log = log;
    if(requestOptions instanceof HttpRequestOptions){
      HttpRequestOptions httpOptions = (HttpRequestOptions) requestOptions;
      HttpServletRequest request = ((HttpRequestOptions)requestOptions).getHttpRequest();
      this.sessionId = httpOptions.getSessionId();
      this.refererUrl = request.getHeader("referer");
      this.refererGuiStatusDoc = parseGuiStatusDoc(this.refererUrl, httpOptions.getServletCtx(), request);
    }
    this.pageHash = (String)MDC.get(RequestLifeCycleFilter.MDC_KEY_BCD_PAGEHASH);
    this.requestHash = (String)MDC.get(RequestLifeCycleFilter.MDC_KEY_BCD_REQUESTHASH);

    try{
      Subject subject = SecurityUtils.getSubject();
      this.userName = this.userLogin = SecurityHelper.getUserLogin(subject);
      this.userId = SecurityHelper.getUserId(subject);
    }catch(Exception e){
      ;// swallow
    }
    this.creationStampString = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(creationStamp);
  }

  private Document parseGuiStatusDoc(String refUrl, ServletContext servletCtx, HttpServletRequest request) {
    try {
      String guiStatusGZ = getGuiStatusParam(refUrl);
      if(guiStatusGZ == null){
        return null;
      }
      return ZipLet.decodeAndDecompressToXMLWithXInclude(guiStatusGZ, servletCtx, (HttpServletRequest) request);
    } catch (Exception e) {
      log.error("failed to parse refererGuiStatus", e);
      return null;
    }
  }

  private String getGuiStatusParam(String refUrl) {
    if(refUrl != null && refUrl.contains("guiStatusGZ")){
      Matcher m = Pattern.compile("(guiStatusGZ=[^&?]*)").matcher(refUrl);
      if(m.find()){
        String[] params = m.group().split("=");
        if ( params.length > 1 ) {
          return params[1];
        }
      }
    }
    return null;
  }

  /**
   * url initiated the call
   *
   * @return
   */
  public String getRefererUrl() {
    return refererUrl;
  }

  /**
   *
   * @return the username the user has authenticated with or null
   */
  @Override
  public String getUserName() {
    return userName;
  }

  public String getRefererGuiStatusDoc() {
    if(refererGuiStatusDoc == null)return null;

    try {
      return Utils.serializeElement(refererGuiStatusDoc);
    } catch(Exception e) {
      log.error("failed to serialize refererGuiStatusDoc", e);
      return null;
    }
  }

  public String getPageHash() {
    return pageHash;
  }
  
  public String getRequestHash() {
    return requestHash;
  }

  @Override
  public String getSessionId(){
    return this.sessionId;
  }

  public Date getDate(){
    return new Date();
  }

  public Date getSqlDate(){
    return new java.sql.Date(System.currentTimeMillis());
  }

  public Timestamp getSqlTimestamp() {
    return new Timestamp(System.currentTimeMillis());
  }

  @Override
  public String getCreationStamp() {
    return creationStampString;
  }

  @Override
  public String getUserLogin() {
    return userLogin;
  }

  @Override
  public String getUserId() {
    return userId;
  }

  @Override
  public String generateUuid() {
    return UUID.randomUUID().toString();
  }
}
