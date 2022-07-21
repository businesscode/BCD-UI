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
package de.businesscode.bcdui.toolbox;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.sqlengine.SQLEngine;
import de.businesscode.util.jdbc.Closer;

class DownloadInfo
{
  public String id;
  public String uuid;
  public Date create_stamp;
  public String file_name;
  public String report_name;
  public String download_link;
  public int download_count;
  public Date last_download;
};
 

public class DownloadServlet extends HttpServlet {
  private static final long serialVersionUID = 1L;

  private static final String BCDFILESDOWNLOAD= "bcd_files_download"; 
  private int CLEARDAYS_FILES = 14;
  private int CLEARDAYS_STATS = 60;
  private String DOWNLOADFOLDER;
  
  private static final Logger log = LogManager.getLogger(DownloadServlet.class);
  
  @Override
  public void init(ServletConfig config) throws ServletException {
    super.init(config);
    try {
      CLEARDAYS_FILES = Integer.parseInt(config.getInitParameter("clearDaysFiles"));
    }
    catch(Exception e) {
      if (config.getInitParameter("clearDaysFiles") != null)
        log.warn("Parameter clearDaysFiles for "+getServletName()+" could not be parsed");
    }
    try {
      CLEARDAYS_STATS = Integer.parseInt(config.getInitParameter("clearDaysStats"));
    }
    catch(Exception e) {
      if (config.getInitParameter("clearDaysStats") != null)
        log.warn("Parameter clearDaysStats for "+getServletName()+" could not be parsed");
    }
    try {
      DOWNLOADFOLDER = (String)config.getInitParameter("downloadFolder");
    }
    catch(Exception e) {
      if (config.getInitParameter("downloadFolder") != null)
        log.warn("Parameter downloadFolder for "+getServletName()+" could not be parsed");
    }
  
  }

protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
    try {

      String uuid = request.getPathInfo();
      uuid = uuid.substring(1);
      DownloadInfo d = readFile(request.getPathInfo().substring(1));
      if (d.id != null) {
        updateFileCount(d);
        downloadFile(d, response);
        cleanUpFiles();
        cleanUpStats();
      }
      
    } catch (Exception ex) {
      if (ex instanceof ServletException) throw (ServletException) ex;
      if (ex instanceof IOException) throw (IOException) ex;
      throw new ServletException(ex);
    }
  }
  
  
  private final String readFileSQL=
      " #set( $k = $bindings." + BCDFILESDOWNLOAD + " ) "+
      " SELECT" +
      "   $k.id-" +
      " , $k.uuid-" +
      " , $k.create_stamp-" +
      " , $k.file_name-" +
      " , $k.report_name-" +
      " , $k.download_link-" +
      " , $k.download_count-" +
      " , $k.last_download-" +
      " FROM $k.getPlainTableName()" +
      " WHERE" +
      "   $k.uuid- = ?";
  
  private DownloadInfo readFile(String uuid) throws Exception {
    PreparedStatement stmt = null;
    Connection connection = getControlConnection();
    ResultSet rs =  null;
    DownloadInfo d = new DownloadInfo();
    try{
      String sql = getTransformSQL(readFileSQL);
      stmt = connection.prepareStatement(sql);
      stmt.setString(1, uuid);
      rs = stmt.executeQuery();
      if (rs.next()) {
        d.id = rs.getString("ID");
        d.uuid = rs.getString("uuid");
        d.create_stamp = rs.getDate("create_stamp");
        d.file_name = rs.getString("file_name");
        d.report_name = rs.getString("report_name");
        d.download_link = rs.getString("download_link");
        d.download_count = rs.getInt("download_count");
        d.last_download = rs.getDate("last_download");
      }
    }finally{
      Closer.closeAllSQLObjects(rs, stmt, connection);
    }

    return d;
  }
  
  private final String updateFileCountSQL=
      " #set( $k = $bindings." + BCDFILESDOWNLOAD + " )"+
      " UPDATE $k.getPlainTableName()"+
      " SET" +
      "   $k.last_download- = ?" +
      ",  $k.download_count- = $k.download_count- + 1" +
      " WHERE" +
      "   $k.uuid- = ?";
  
  private DownloadInfo updateFileCount(DownloadInfo d) throws Exception {
    PreparedStatement stmt = null;
    Connection connection = getControlConnection();
    ResultSet rs =  null;
    try{
      String sql = getTransformSQL(updateFileCountSQL);
      stmt = connection.prepareStatement(sql);
      java.util.Date today = new java.util.Date();
      stmt.setDate(1, new java.sql.Date(today.getTime()));
      stmt.setString(2, d.uuid);
      stmt.execute();
    }finally{
      Closer.closeAllSQLObjects(rs, stmt, connection);
    }

    return d;
  }
  
  
  private final String cleanUpFilesSQL=
      " #set( $k = $bindings." + BCDFILESDOWNLOAD + " ) "+
      " SELECT" +
      "   $k.uuid-" +
      " FROM $k.getPlainTableName()" +
      " WHERE" +
      "   $k.create_stamp- < ?";
  
  private void cleanUpFiles() throws Exception {
    PreparedStatement stmt = null;
    Connection connection = getControlConnection();
    ResultSet rs =  null;
    try{
      String sql = getTransformSQL(cleanUpFilesSQL);
      
      final Calendar cal = Calendar.getInstance();
      cal.add(Calendar.DATE, CLEARDAYS_FILES * -1);

      stmt = connection.prepareStatement(sql);
      stmt.setDate(1, new java.sql.Date(cal.getTime().getTime())) ;
      rs = stmt.executeQuery();
      ArrayList<String> uuids = new ArrayList<>();
      while(rs.next())
        uuids.add(rs.getString("uuid"));

      String downloadFolder = DOWNLOADFOLDER;
      if (downloadFolder.endsWith("/") || downloadFolder.endsWith("\\"))
        downloadFolder = downloadFolder.substring(0, downloadFolder.length() - 1);

      for (String uuid : uuids) {
        Files.delete(new File(downloadFolder + File.separator + uuid).toPath());
      }

    }finally{
      Closer.closeAllSQLObjects(rs, stmt, connection);
    }
  }

  private final String cleanUpStatsSQL=
      " #set( $k = $bindings." + BCDFILESDOWNLOAD + " ) " +
      " DELETE FROM $k.getPlainTableName() WHERE $k.create_stamp- < ?";

  private void cleanUpStats() throws Exception {
    PreparedStatement stmt = null;
    Connection connection = getControlConnection();
    ResultSet rs =  null;
    try{
      final Calendar cal = Calendar.getInstance();
      cal.add(Calendar.DATE, CLEARDAYS_STATS * -1);

      stmt = connection.prepareStatement(getTransformSQL(cleanUpStatsSQL));
      stmt.setDate(1, new java.sql.Date(cal.getTime().getTime())) ;
      rs = stmt.executeQuery();

    }finally{
      Closer.closeAllSQLObjects(rs, stmt, connection);
    }
  }

  private void downloadFile(DownloadInfo d, HttpServletResponse response) {

    String downloadFolder = DOWNLOADFOLDER;
    if (downloadFolder.endsWith("/") || downloadFolder.endsWith("\\"))
      downloadFolder = downloadFolder.substring(0, downloadFolder.length() - 1);
    
    try {
  
      File downloadFile = new File(downloadFolder + File.separator + d.uuid);
      FileInputStream inStream = new FileInputStream(downloadFile);
  
      String mimeType = "application/octet-stream";
      response.setContentType(mimeType);
      response.setContentLength((int) downloadFile.length());
  
      String headerKey = "Content-Disposition";
      String headerValue = String.format("attachment; filename=\"%s\"", d.file_name);
      response.setHeader(headerKey, headerValue);
  
      OutputStream outStream = response.getOutputStream();
      byte[] buffer = new byte[4096];
      int bytesRead = -1;
      while ((bytesRead = inStream.read(buffer)) != -1) { outStream.write(buffer, 0, bytesRead); }
  
      inStream.close();
      outStream.close();
    }
    catch (IOException e) {
      log.error("Download of " + d.uuid + " failed.", e);
    }
  }
  

  private Connection getControlConnection() throws Exception{
    BindingSet bs  = Bindings.getInstance().get(BCDFILESDOWNLOAD, new ArrayList<String>());
    Connection con = Configuration.getInstance().getUnmanagedConnection(bs.getJdbcResourceName());
    return con;
  }

  private String getTransformSQL(String sql){
    String fe = new SQLEngine().transform(sql);
    return fe;
  }
  
}
