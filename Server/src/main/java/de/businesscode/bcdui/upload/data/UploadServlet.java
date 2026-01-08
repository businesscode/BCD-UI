/*
  Copyright 2010-2024 BusinessCode GmbH, Germany
  All rights reserved.
  For terms of license, please contact BusinessCode GmbH, Germany
*/
package de.businesscode.bcdui.upload.data;

import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.util.jdbc.Closer;
import java.sql.Connection;
import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.MultipartConfig;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.Part;

import org.apache.commons.io.IOUtils;
import org.apache.shiro.SecurityUtils;

import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.subjectsettings.SecurityHelper;
import de.businesscode.bcdui.upload.data.steps.IUploadStep;
import de.businesscode.bcdui.upload.data.steps.Upload2TargetBs;
import de.businesscode.bcdui.upload.data.steps.UploadBindingItemValidate;
import de.businesscode.bcdui.upload.data.steps.UploadCleanup;
import de.businesscode.bcdui.upload.data.steps.UploadErrorDownload;
import de.businesscode.bcdui.upload.data.steps.UploadHeuristic;
import de.businesscode.bcdui.upload.data.steps.UploadNormalization;
import de.businesscode.bcdui.upload.data.steps.UploadToRowCol;
import de.businesscode.sqlengine.SQLEngine;
import java.sql.PreparedStatement;

/**
 * Entry point for all data data upload related steps, supports POST and PUT
 * Add custom steps in web.xml in the following format:
 * &lt;init-param>
     &lt;param-name>Steps&lt;/param-name>
     &lt;param-value>
       MY_STEP_NAME: de.my.package.ClassName;
       MY_STEP_NAME2: de.my.package.ClassName2;
     &lt;/param-value>&lt;
   &lt;/init-para -->
   Such Steps
 *  - need a Constructor getting (UploadControl uc, String userId)
 *  - implement IUploadStep
 *  - if writing, call UploadControl#addStepResult() at the end of their process()
 */
@MultipartConfig
public class UploadServlet extends HttpServlet
{
  public static final String PARAM_NAME_UPLOADID   = "bcdUploadId";
  public static final String PARAM_NAME_STEPS      = "bcdUploadSteps";
  public static final String PARAM_NAME_TARGETBS   = "bcdUploadTargetBs";
  public static final String PARAM_NAME_DELETE     = "bcdUploadDelete";
  public static final String PARAM_STEPS_SEPARATOR = ",";
  public static final String INIT_PARAM_STEPS      = "Steps";
  public static final String PART_FILENAME         = "bcdUploadfile"; // To be used as file selector input's id in the HTML form
  public static final String PARAM_NAME_FILENAME   = "filename";

  protected static final String ANONYMOUS_ID  = "ANONYMOUS";  // User id if used without Apache Shiro login
  protected Map<String,Class<? extends IUploadStep>> stepImpls = new HashMap<>();

  private static final long serialVersionUID = 2308461522449326659L;


  /**
   * Receives an data upload file and creates an entry in bcd_dataupload_control
   * @param request
   * @param response
   * @throws ServletException
   */
  protected void service(HttpServletRequest request, HttpServletResponse response) throws ServletException {

    final String userId = getUserId();

    String stepsParam = "";
    String uploadId = null;
    String deleteUploadId = null;
    String targetBs = null;
    String fileName = null;
    final UploadControl uc;
    InputStream is = null;
    
    try {
      // Multipart request
      if(request.getContentType() != null && request.getContentType().contains("multipart/form-data")) {
        // Check for steps to be executed
        Part stepsPart = request.getPart(PARAM_NAME_STEPS);
        if(stepsPart != null )
          stepsParam = IOUtils.toString(stepsPart.getInputStream(), StandardCharsets.UTF_8);

        // Check, if an upload Id is given
        Part uploadIdPart = request.getPart(PARAM_NAME_UPLOADID);
        if(uploadIdPart != null )
          uploadId = IOUtils.toString(uploadIdPart.getInputStream(), StandardCharsets.UTF_8);

        // Check, if targetBs are given
        Part targetBsPart = request.getPart(PARAM_NAME_TARGETBS);
        if(targetBsPart != null )
          targetBs = IOUtils.toString(targetBsPart.getInputStream(), StandardCharsets.UTF_8);

        // Load the Blob, init a upload control
        Part filePart = request.getPart(PART_FILENAME);
        if(filePart != null) {
          fileName = getMultipartParam(filePart, PARAM_NAME_FILENAME);
          is = filePart.getInputStream();
        }

        // delete data or a given id
        Part deletePart = request.getPart(PARAM_NAME_DELETE);
        if(deletePart != null )
          deleteUploadId = IOUtils.toString(deletePart.getInputStream(), StandardCharsets.UTF_8);

      }
      // Plain HTTP parameter
      else {
        uploadId = request.getParameter(PARAM_NAME_UPLOADID);
        targetBs = request.getParameter(PARAM_NAME_TARGETBS);
        stepsParam = request.getParameter(PARAM_NAME_STEPS);
        deleteUploadId = request.getParameter(PARAM_NAME_DELETE);
      }

      if(deleteUploadId == null && uploadId == null && fileName == null && is == null) {
        response.sendError(HttpServletResponse.SC_BAD_REQUEST);
        throw new ServletException("Upload failed getting HTTP paramaters");
      }

    } catch(IOException ex) {
      throw new ServletException("Upload failed getting HTTP paramaters", ex);
    }

    try {

      if (deleteUploadId != null) {
        try {
          deleteById(deleteUploadId);
          UploadControlSteps steps = new UploadControlSteps(uploadId);
          steps.writeStepsResponse(response.getWriter(), uploadId);
          return;
        }
        catch (Exception e) {
          throw new ServletException("Delete failed.", e);
        }
      }

      // New upload or continuing an existing one?
      else if(uploadId == null && fileName != null && is != null) {
        uc = new UploadControl(userId, fileName, targetBs, is);
        uploadId = uc.getUploadId();
      } else {
        uc = new UploadControl(uploadId);
      }

      // Download errors or execute list of steps?
      final List<String> stepIds = Arrays.asList(stepsParam.split(PARAM_STEPS_SEPARATOR));
      stepIds.replaceAll(String::trim);
      PrintWriter writer = response.getWriter();
      if(UploadErrorDownload.STEP_ID.equals(stepIds.get(0))) {
        response.setContentType("text/csv; charset=UTF-8");
        UploadErrorDownload ued = new UploadErrorDownload(uc, writer);
        ued.process();
      } else {
        response.setContentType("text/xml; charset=UTF-8");
        // The let's process all requested steps
        for (String stepId : stepIds) {
          try {
            Class<? extends IUploadStep> stepImplClass = stepImpls.get(stepId);
            final IUploadStep stepImpl;
            try {
              stepImpl = stepImplClass.getConstructor(UploadControl.class, String.class).newInstance(uc, userId);
            } catch (Exception ex ) {
              throw new UploadException(stepId, UploadException.Reason.FAILED_INSTANTIATE_STEP, ex);
            }
            stepImpl.setParams(request.getParameterMap());
            stepImpl.process();
          } catch(SQLException | IOException ex) {
            throw new UploadException(stepId, UploadException.Reason.SQL_IO_EXCEPTION, ex);
          }
        }
      }
      uc.close();
      UploadControlSteps steps = new UploadControlSteps(uploadId);
      steps.writeStepsResponse(writer, uploadId);

    } catch(UploadException e) {
      throw new ServletException("Upload failed. Step: " + e.stepId, e);
    } catch(SQLException | IOException e) {
      throw new ServletException("Upload failed.", e);
    }
  }

  /**
   *
   * @return userId (or a predefined string {@link #ANONYMOUS_ID}) if no user is known
   */
  protected String getUserId() {
    final String userId = SecurityHelper.getUserId(SecurityUtils.getSubject());
    return userId == null ? ANONYMOUS_ID : userId;
  }

  /**
   * Retrieve the filename of the data upload file from http header
   * @param part
   * @param paramName
   * @return
   */
  protected String getMultipartParam(final Part part, final String paramName) {
    if(part == null)
      return null;
    final String[] partHeaders = part.getHeader("content-disposition").split(";");
    for (String content: partHeaders) {
      if (content.trim().startsWith(paramName)) {
        return content.substring( content.indexOf('=') + 1).trim().replace("\"", "");
      }
    }
    return null;
  }

  @Override
  public void init() throws ServletException {
    super.init();
    stepImpls.put("BCD_UPLOAD_CLEANUP",       UploadCleanup.class);
    stepImpls.put("BCD_UPLOAD_TO_ROWCOL",     UploadToRowCol.class);
    stepImpls.put("BCD_UPLOAD_HEURISTIC",     UploadHeuristic.class);
    stepImpls.put("BCD_UPLOAD_NORMALIZATION", UploadNormalization.class);
    stepImpls.put("BCD_UPLOAD_BIVALIDATE",    UploadBindingItemValidate.class);
    stepImpls.put("BCD_UPLOAD_2TARGETBS",     Upload2TargetBs.class);
    String userSteps = getInitParameter(INIT_PARAM_STEPS);
    if(userSteps == null)
      return;
    for(String mapping: userSteps.split(";")) {
      if(mapping.split(":").length == 2){
        try {
          Class<? extends IUploadStep> clazz = Class.forName(mapping.split(":")[1].trim()).asSubclass(IUploadStep.class);
          stepImpls.put(mapping.split(":")[0].trim(), clazz );
        } catch(Exception ex) {
          throw new ServletException("Upload cation "+mapping.split(":")[1].trim()+" not found");
        }
      }
    }
  }

  public static String getTransformSQL(String sql){
    String fe = new SQLEngine().transform(sql);
    return fe;
  }

  public static Connection getControlConnection() throws Exception{
    BindingSet bs  = Bindings.getInstance().get("bcd_dataupload_control", new ArrayList<String>());
    Connection con = Configuration.getInstance().getManagedConnection(bs.getJdbcResourceName());
    return con;
  }

  private void deleteById(String uploadId) throws Exception{
    PreparedStatement stm1 = null;
    PreparedStatement stm2 = null;
    PreparedStatement stm3 = null;
    PreparedStatement stm4 = null;
    try {
      String delSQL1 = " #set( $k = $bindings.bcd_dataupload_control ) delete from $k.getPlainTableName() WHERE $k.uploadId_ = ?";
      String delSQL2 = " #set( $k = $bindings.bcd_dataupload_controlstep ) delete from $k.getPlainTableName() WHERE $k.uploadId_ = ?";
      String delSQL3 = " #set( $k = $bindings.bcd_dataupload_rowcol ) delete from $k.getPlainTableName() WHERE $k.uploadId_ = ?";
      String delSQL4 = " #set( $k = $bindings.bcd_dataupload_validation ) delete from $k.getPlainTableName() WHERE $k.uploadId_ = ?";
      Connection con = getControlConnection();
      stm1 = con.prepareStatement(getTransformSQL(delSQL1));
      stm1.setString(1, uploadId);
      stm1.execute();

      stm2 = con.prepareStatement(getTransformSQL(delSQL2));
      stm2.setString(1, uploadId);
      stm2.execute();

      stm3 = con.prepareStatement(getTransformSQL(delSQL3));
      stm3.setString(1, uploadId);
      stm3.execute();

      stm4 = con.prepareStatement(getTransformSQL(delSQL4));
      stm4.setString(1, uploadId);
      stm4.execute();
    }
    finally {
      Closer.closeAllSQLObjects(stm1,stm2,stm3,stm4);
    }
  }
}
