/*
  Copyright 2010-2024 BusinessCode GmbH, Germany

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
package de.businesscode.bcdui.web.servlets;

import java.io.IOException;

import jakarta.servlet.ServletConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;

import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingException;
import org.apache.commons.text.StringEscapeUtils;
import org.apache.commons.vfs2.FileSystemException;
import de.businesscode.bcdui.cache.CacheFactory;

/**
 *  Servlet to manage cache settings (VFS, Bindings): delete, reload
 **/
public class CacheManager extends HttpServlet {
  private static final long serialVersionUID = 1L;
  private final String actionParameterName = "action";
  private final String refreshAllAction="refreshAll";
  private final String refreshVFSAction = "refreshVFS";
  private final String regenerateAction="regenerateBindings";

  private final Logger log = LogManager.getLogger(getClass());
  private String callBackClass; // comma separated list of allowed names

 @Override
 public void init(ServletConfig config) throws ServletException {
      super.init(config);
      //
      this.callBackClass = config.getInitParameter("AFTERREFRESH_CALLBACK_CLASS");
      if (this.callBackClass != null) {
        log.debug("Configured with init parameter: " + this.callBackClass);
      }
    }


  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
  resp.setContentType("text/xml");
  resp.setCharacterEncoding("UTF-8");

    String action = req.getParameter(actionParameterName);
    String returnMessage = action + " was succesful";
    try{
      String msg = performAction(action);
      if(msg != null){
        returnMessage = msg;
        log.warn(returnMessage);
      } else {
        log.debug(returnMessage);
      }
    }
    finally{
      resp.getWriter().write("<cache>"+StringEscapeUtils.escapeXml11(returnMessage)+"</cache>");
      resp.getWriter().close();
    }
  }

  /**
   * performance an action and returns possible action response
   * 
   * @param action to perform
   * @return null if action succeeds or error response
   * @throws BindingException
   * @throws FileSystemException
   */
  protected String performAction(String action) throws ServletException {
    try {
      if (refreshVFSAction.equals(action)) {
        refreshVFS();
        executeCallBack(action);
      }
      else if(refreshAllAction.equals(action)){
        refreshAll();
        executeCallBack(action);
      }
      else if(regenerateAction.equals(action)){
        regenerateBindings();
        executeCallBack(action);
      }
      else
        return "unknown action:" + action + " valid values :" + refreshAllAction + " " + regenerateAction;
    } catch (FileSystemException | BindingException be) {
      throw new ServletException(be);
    }
    return null;
  }

  @Override
  protected void doPost(HttpServletRequest req, HttpServletResponse resp)
      throws ServletException, IOException {
    doGet(req, resp);
  }

  /**
   *
   * refreshAll caches and reloads Bindings, VFS
   *
   * @throws BindingException
   * @throws FileSystemException
   */
  protected void refreshAll() throws BindingException, ServletException {
    // reload Bindings
    regenerateBindings();
  }

  private void regenerateBindings() throws BindingException{
    Bindings.clear();
    Bindings.getInstance();
    log.trace("regenerated bindings");
  }

  protected void refreshVFS() throws FileSystemException, BindingException {
    CacheFactory.clearVFScache();
    CacheFactory.registerVFSCatalog();
    log.trace("refreshed vfs");
  }
  
  /**
   * if this.callBackClass is configured invoke the refresh() Method of the fresh created instance
   * if the class can't be instanciated it wont be tried again.
   */
  protected void executeCallBack(String action) {
  if (this.callBackClass != null){
    Class<?> c = null;
    try {
     c = Class.forName(this.callBackClass);
       Object o = c.newInstance();
     ((ICacheCallBack)  o).refresh(action);
    } catch (Exception e) {
    log.debug("The call back class can't be found: " + this.callBackClass);
    this.callBackClass = null;
    }
  }
  }
}


