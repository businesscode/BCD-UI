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

import com.jcraft.jsch.ChannelSftp;
import com.jcraft.jsch.JSch;
import com.jcraft.jsch.Session;
import com.jcraft.jsch.SftpATTRS;

import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.Bindings;
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
  private String DOWNLOAD_FOLDER;
  private String SFTP_HOST;
  private String SFTP_PWD;
  private String SFTP_USER;
  private String DOWNLOAD_PAGE;
  private int SFTP_PORT = 22;
  
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
    
    DOWNLOAD_FOLDER = (String)config.getInitParameter("downloadFolder");
    DOWNLOAD_PAGE = (String)config.getInitParameter("downloadPage");

    SFTP_HOST = (String)config.getInitParameter("sftpHost");
    SFTP_PWD = (String)config.getInitParameter("sftpPwd");
    SFTP_USER = (String)config.getInitParameter("sftpUser");
    try {
      SFTP_PORT = Integer.parseInt(config.getInitParameter("sftpPort"));
    }
    catch(Exception e) {
      if (config.getInitParameter("sftpPort") != null)
        log.warn("Parameter sftpPort for "+getServletName()+" could not be parsed");
    }

    if (DOWNLOAD_FOLDER == null)
      log.error("Parameter downloadFolder for "+getServletName()+" is missing");

  }

protected void doGet(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
  
    boolean doDownload = request.getParameter("download") != null || DOWNLOAD_PAGE == null || DOWNLOAD_PAGE.isEmpty();
    
    String uuid = request.getPathInfo();
    uuid = uuid.substring(1);

    if (!doDownload) {
      boolean gotParam = DOWNLOAD_PAGE.contains("?");
      boolean absolute = DOWNLOAD_PAGE.toLowerCase().startsWith("http://") || DOWNLOAD_PAGE.toLowerCase().startsWith("https://");
      response.sendRedirect((absolute ? "" : request.getContextPath()) + DOWNLOAD_PAGE + (gotParam ? "&" : "?") + "uuid=" + uuid);
      return;
    }

    try {
      DownloadInfo d = readFile(request.getPathInfo().substring(1));
      if (d.id != null) {
        updateFileCount(d);

        // either do sftp download or file download from local place
        if (SFTP_HOST != null && SFTP_PWD != null && SFTP_USER != null && !SFTP_HOST.isEmpty() && !SFTP_PWD.isEmpty() && !SFTP_USER.isEmpty())
          downloadFileSFTP(d, response, SFTP_USER, SFTP_PWD, SFTP_HOST, SFTP_PORT);
        else
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
      "   $k.id_" +
      " , $k.uuid_" +
      " , $k.create_stamp_" +
      " , $k.file_name_" +
      " , $k.report_name_" +
      " , $k.download_link_" +
      " , $k.download_count_" +
      " , $k.last_download_" +
      " FROM $k.getPlainTableName()" +
      " WHERE" +
      "   $k.uuid_ = ?";
  
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
      "   $k.last_download_ = ?" +
      ",  $k.download_count_ = $k.download_count_ + 1" +
      " WHERE" +
      "   $k.uuid_ = ?";
  
  private DownloadInfo updateFileCount(DownloadInfo d) throws Exception {
    PreparedStatement stmt = null;
    Connection connection = getControlConnection();
    ResultSet rs =  null;
    try{
      String sql = getTransformSQL(updateFileCountSQL);
      stmt = connection.prepareStatement(sql);
      java.util.Date today = new java.util.Date();
      stmt.setTimestamp(1, new java.sql.Timestamp(today.getTime()));
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
      "   $k.uuid_" +
      " FROM $k.getPlainTableName()" +
      " WHERE" +
      "   $k.create_stamp_ < ?";
  
  private void cleanUpFiles() throws Exception {
    PreparedStatement stmt = null;
    Connection connection = getControlConnection();
    ResultSet rs =  null;
    try{
      String sql = getTransformSQL(cleanUpFilesSQL);
      
      final Calendar cal = Calendar.getInstance();
      cal.add(Calendar.DATE, CLEARDAYS_FILES * -1);

      stmt = connection.prepareStatement(sql);
      stmt.setTimestamp(1, new java.sql.Timestamp(cal.getTime().getTime())) ;
      rs = stmt.executeQuery();
      ArrayList<String> uuids = new ArrayList<>();
      while(rs.next())
        uuids.add(rs.getString("uuid"));

      String downloadFolder = DOWNLOAD_FOLDER;
      if (downloadFolder.endsWith("/") || downloadFolder.endsWith("\\"))
        downloadFolder = downloadFolder.substring(0, downloadFolder.length() - 1);

      for (String uuid : uuids) {
        try {
          Files.delete(new File(downloadFolder + File.separator + uuid).toPath());
        }
        catch (IOException e) {
          log.info("Deletion of " + uuid + " failed. Possibly still in stats but removed already");
        }
      }

    }finally{
      Closer.closeAllSQLObjects(rs, stmt, connection);
    }
  }

  private final String cleanUpStatsSQL=
      " #set( $k = $bindings." + BCDFILESDOWNLOAD + " ) " +
      " DELETE FROM $k.getPlainTableName() WHERE $k.create_stamp_ < ?";

  private void cleanUpStats() throws Exception {
    PreparedStatement stmt = null;
    Connection connection = getControlConnection();
    ResultSet rs =  null;
    try{
      final Calendar cal = Calendar.getInstance();
      cal.add(Calendar.DATE, CLEARDAYS_STATS * -1);

      stmt = connection.prepareStatement(getTransformSQL(cleanUpStatsSQL));
      stmt.setTimestamp(1, new java.sql.Timestamp(cal.getTime().getTime())) ;
      rs = stmt.executeQuery();

    }finally{
      Closer.closeAllSQLObjects(rs, stmt, connection);
    }
  }

  private void downloadFile(DownloadInfo d, HttpServletResponse response) {

    FileInputStream inStream = null;
    OutputStream outStream = null;
    
    String downloadFolder = DOWNLOAD_FOLDER;
    if (downloadFolder.endsWith("/") || downloadFolder.endsWith("\\"))
      downloadFolder = downloadFolder.substring(0, downloadFolder.length() - 1);
    
    try {
  
      File downloadFile = new File(downloadFolder + File.separator + d.uuid);
      inStream = new FileInputStream(downloadFile);
  
      String mimeType = "application/octet-stream";
      response.setContentType(mimeType);
      response.setContentLength((int) downloadFile.length());
  
      String headerKey = "Content-Disposition";

      String fileName = d.file_name.replaceAll("[\\\\/:*?\"<>|]", "_");
      String headerValue = String.format("attachment; filename=\"%s\"", fileName);
      response.setHeader(headerKey, headerValue);
  
      outStream = response.getOutputStream();
      byte[] buffer = new byte[4096];
      int bytesRead = -1;
      while ((bytesRead = inStream.read(buffer)) != -1) { outStream.write(buffer, 0, bytesRead); }
    }
    catch (IOException e) {
      log.error("Download of " + d.uuid + " failed.", e);
    }
    finally {
      try {
        if (inStream != null)
          inStream.close();
        if (outStream != null)
          outStream.close();
      }
      catch (IOException e) {
        log.warn("can't close download in/out stream", e);
      }
    }
  }
  
  private void downloadFileSFTP(DownloadInfo d, HttpServletResponse response, String username, String password, String host, int port) {
    Session     session = null;
    ChannelSftp channel = null;
    OutputStream outStream = null;

    String sourceFile = DOWNLOAD_FOLDER;
    if (sourceFile.endsWith("/") || sourceFile.endsWith("\\"))
      sourceFile = sourceFile.substring(0, sourceFile.length() - 1);
    sourceFile += "/" + d.uuid;

    try {
      outStream = response.getOutputStream();

      session = (new JSch()).getSession(username, host, port);
      session.setPassword( password );
      session.setConfig("StrictHostKeyChecking", "no");
      session.setTimeout(20000);
      session.connect();
      channel = (ChannelSftp) session.openChannel("sftp");
      channel.connect();

      String mimeType = "application/octet-stream";
      response.setContentType(mimeType);

      SftpATTRS attr = channel.lstat(sourceFile);
      response.setContentLength((int) attr.getSize());
  
      String headerKey = "Content-Disposition";
      String fileName = d.file_name.replaceAll("[\\\\/:*?\"<>|]", "_");
      String headerValue = String.format("attachment; filename=\"%s\"", fileName);
      response.setHeader(headerKey, headerValue);

      channel.get( sourceFile, outStream );

   } catch( Exception e ) {
     log.error("Download of " + d.uuid + " failed.", e);
   }
    finally {
      try {
        if (outStream != null) {
          outStream.close();
          outStream = null;
        }
      }
      catch (IOException e) {log.error("Download of " + d.uuid + " failed.", e);}
      if( channel != null ) {
         channel.disconnect();
         channel = null;
      }
      if( session != null ) {
         session.disconnect();
         session = null;
      }
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
