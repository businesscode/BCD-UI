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
package de.businesscode.bcdui.vfs.web;

import java.io.IOException;
import java.io.InputStream;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.text.MessageFormat;
import java.util.Arrays;
import java.util.Collection;
import java.util.LinkedList;

import javax.servlet.ServletConfig;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.sql.DataSource;

import net.sf.ehcache.Cache;
import net.sf.ehcache.Element;

import org.apache.commons.dbutils.QueryRunner;
import org.apache.commons.dbutils.handlers.ScalarHandler;
import org.apache.commons.fileupload.FileItemIterator;
import org.apache.commons.fileupload.FileItemStream;
import org.apache.commons.fileupload.servlet.ServletFileUpload;
import org.apache.log4j.Logger;

import de.businesscode.bcdui.cache.CacheFactory;
import de.businesscode.bcdui.toolbox.config.BareConfiguration;
import de.businesscode.bcdui.web.wrs.SOAPFaultMessage;
import de.businesscode.sqlengine.SQLEngine;
import de.businesscode.util.jdbc.Closer;

/**
 * implements following REST API to upload binary data using file streaming API of apache commons-fileupload,
 * see http://commons.apache.org/proper/commons-fileupload/streaming.html
 *
 * accepting POST for INSERT/UPDATE streams and DELETE for deleting them
 *
 * configuration (via servlet parameter):
 *
 * folder-name: abstract name which is used as prefix for all incoming file-names,
 * read documentation on {@link #doPost(HttpServletRequest, HttpServletResponse)} and {@link #doDelete(HttpServletRequest, HttpServletResponse)} for more information and exception handling.
 *
 *
 */
public class VFSServlet extends HttpServlet {
  private static final long serialVersionUID = 1L;
  private static final String CONFIG_FOLDER_NAME = "folder-name";
  protected Logger logger = Logger.getLogger(getClass());

  private String folderName;

  /**
   * read configs here
   * @param config
   * @throws ServletException
   */
  @Override
  public void init(ServletConfig config) throws ServletException {
    super.init(config);

    this.folderName = config.getInitParameter(CONFIG_FOLDER_NAME);

    if(folderName==null||folderName.isEmpty()){
      folderName = "";
    }

    if(!folderName.endsWith("/")){
      folderName = folderName.concat("/");
    }

    if(logger.isDebugEnabled()){
      logger.debug("folderName: " + folderName);
    }
  }

  /**
   * for custom exception handling, see {@link #doPost(HttpServletRequest, HttpServletResponse)} and {@link #doDelete(HttpServletRequest, HttpServletResponse)} documentation
   *
   * @param req
   * @param resp
   * @throws ServletException
   * @throws IOException
   */
  @Override
  protected void service(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
    try{
      super.service(req, resp);
    } catch (CustomException pe){
      logger.error("custom exception catched", pe);
      handleException(req, resp, pe);
    }
  }

  /**
   * TODO
   * API: pathInfo contains identifier (path) to delete delimited via space
   *
   * not implemented yet
   */
  @Override
  protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
    String urisToDelete = req.getPathInfo();

    if(logger.isDebugEnabled()){
      logger.debug("delete uris: "+urisToDelete);
    }

    FileDAO fileDao;
    try {
      fileDao = createFileDao(req);
      fileDao.delete(Arrays.asList(urisToDelete.split(" ")));
      fileDao.commit();
    } catch (CustomException e) {
      throw e;
    } catch (Exception e) {
      throw new IOException("an exception stopped us", e);
    }
  }

  /**
   * supports multipart encoded data,
   * multifile is NOT supported as the field-name is taken as uri (path),
   *
   * you may want to throw custom exception to process on client, you may do it throwing
   * {@link PostException} from here or one subprocessing method
   *
   */
  @Override
  protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
    if(logger.isTraceEnabled()){
      logger.trace("receiving data");
    }

    processSaveRequest(req);
  }

  /**
   * POST method exception handler, the default behaviour is to answer with http status PostException.httpStatusCode
   * and serialize exception as SOAP
   *
   * @param req
   * @param resp
   * @param pe
   */
  protected void handleException(HttpServletRequest req, HttpServletResponse resp, CustomException pe) throws ServletException {
    try {
      resp.sendError(pe.httpStatus,"FAIL");
      resp.setContentType("text/xml");
      resp.setCharacterEncoding("UTF-8");
      // we dont want to have cause sent to client
      CustomException nce = new CustomException(pe.httpStatus, pe.getMessage());
      SOAPFaultMessage sf = new SOAPFaultMessage(null, req.getRequestURL().toString(), nce);
      sf.writeTo(resp.getOutputStream());
    } catch (Exception e) {
      throw new ServletException("failed to serialize custom exception", e);
    }
  }

  /**
   * use streaming API
   *
   * @param req
   */
  private void processSaveRequest(HttpServletRequest req) throws IOException {
    ServletFileUpload upload = new ServletFileUpload();
    try {
      FileDAO fileDao = createFileDao(req);
      FileItemIterator itemIter = upload.getItemIterator(req);
      while(itemIter.hasNext()){
        FileItemStream item = itemIter.next();
        String name = item.getFieldName();

        if(name==null||name.isEmpty()){
          throw new IOException("no name for field provided");
        }

        boolean isFile = !item.isFormField();

        if(logger.isDebugEnabled()){
          logger.debug(String.format("processing item name '%s', is file: %s", name,Boolean.toString(isFile)));
        }

        if(isFile){
          processFileItem(item, fileDao);
        }else{
          processFieldItem(item, fileDao);
        }
      }
      fileDao.commit();

      updateDictionary(fileDao.getWrittenFiles());
    } catch (CustomException e) {
      throw e;
    } catch (Exception e) {
      throw new IOException("an exception stopped us", e);
    }
  }

  /**
   * updates the dictionary with files written, this one updates VFS cache
   *
   * @param writtenFiles
   */
  private void updateDictionary(Collection<String> writtenFiles) {
    if(logger.isDebugEnabled()){
      logger.debug("updating VFSCache with files written: " + writtenFiles);
    }
    Cache cache = CacheFactory.getVFSCache();
    for(String path : writtenFiles){
      cache.put(new Element(path, path));
    }
  }

  /**
   * create a DAO implementation for current request,
   * default is {@link JdbcFileDAO}
   *
   * @param req
   * @return
   * @throws Exception
   */
  protected FileDAO createFileDao(HttpServletRequest req) throws Exception {
    return new JdbcFileDAO(BareConfiguration.getInstance().getUnmanagedDataSource(null));
  }

  /**
   * processing file item
   * @param item
   * @param fileDao
   * @throws IOException
   */
  private void processFileItem(FileItemStream item, FileDAO fileDao) throws IOException {
    String fileUri = item.getFieldName();
    String fileName = item.getName();

    String toFileUri = generateTargetFileUri(fileUri);

    if(logger.isDebugEnabled()){
      logger.debug(String.format("uploading file '%s' as uri '%s' to destination '%s'", fileName, fileUri,toFileUri));
    }

    InputStream is = item.openStream();
    if(is != null && is.available()>0){
      fileDao.write(toFileUri, is);
    }else{
      if(logger.isDebugEnabled()){
        logger.debug("ignore empty file");
      }
    }
  }

  /**
   * creates a file uri which finally identifies the file in filesystem,
   * this implementation returns a string containing the configured folderName as a prefix
   *
   * @param fileUri
   * @return
   */
  private String generateTargetFileUri(String fileUri) {
    return folderName.concat(fileUri);
  }

  /**
   * processes field item (non-file), default implementation ignores it
   *
   * @param item
   * @param fileDao
   */
  protected void processFieldItem(FileItemStream item, FileDAO fileDao) {
    logger.warn("ignoring processing field item name " + item.getFieldName());
  }

  /**
   * abstraction to write into VFS, client has finally to call {@link #commit()}
   *
   *
   */
  public static interface FileDAO {
    /**
     * this method must not be called prior to {@link #commit()}
     *
     * @return collection of finally written files into filesystem with their absolute path
     */
    Collection<String> getWrittenFiles();
    /**
     * writes file
     *
     * @param uri
     * @param openStream
     */
    void write(String uri, InputStream openStream);
    /**
     * deletes uris
     * @param uris
     */
    void delete(Collection<String> uris);
    /**
     * for implementations with transaction handling
     */
    void commit();
  }

  /**
   * unfortunately we cant work with DatabaseFileSystem / DatabaseFileObject directly to store data,
   * so we do here lowlevel BLOB handling, works with bcd_virtualFileSystem binding-set
   *
   * NOT THREADSAFE
   *
   *
   */
  public static class JdbcFileDAO implements FileDAO {
    private static final String SQL_HAS_FILE = "#set($b = $bindings.bcd_virtualFileSystem) SELECT 1 FROM $b.plainTableName WHERE $b.path- = ?";
    private static final String SQL_UPDATE_FILE = "#set($b = $bindings.bcd_virtualFileSystem) UPDATE $b.plainTableName SET $b.resourceBlob- = ? WHERE $b.path- = ?";
    private static final String SQL_INSERT_FILE = "#set($b = $bindings.bcd_virtualFileSystem) INSERT INTO $b.plainTableName ($b.resourceBlob-,$b.path-,$b.isServer-) VALUES (?,?,0)";
    private static final String SQL_DELETE_FILES = "#set($b = $bindings.bcd_virtualFileSystem) DELETE FROM $b.plainTableName WHERE $b.isServer- = 0 AND $b.path- IN ({0})";
    private Logger log = Logger.getLogger(getClass());

    final private Connection con;
    final private Collection<String> filesWritten = new LinkedList<String>();

    public JdbcFileDAO(DataSource ds) {
      try {
        this.con = ds.getConnection();
        this.con.setAutoCommit(false);
      } catch (SQLException e) {
        throw new RuntimeException("failed to open connection", e);
      }
    }

    /**
     * connection used, must not be closed, must not change autocommit flag
     * @return
     */
    protected Connection getConnection() {
      return con;
    }

    @Override
    public void write(String uri, InputStream inputStream) {

      /*
       * either update or insert
       */
      SQLEngine en = new SQLEngine();
      QueryRunner qr = new QueryRunner(true);

      PreparedStatement ps = null;

      try {
        boolean hasFile = qr.query(con, en.transform(SQL_HAS_FILE), new ScalarHandler<Integer>(1), uri) != null;

        if(hasFile){
          if(log.isDebugEnabled()){
            log.debug("updating " + uri);
          }
          ps = con.prepareStatement(en.transform(SQL_UPDATE_FILE));
        }else{
          if(log.isDebugEnabled()){
            log.debug("inserting " + uri);
          }
          ps = con.prepareStatement(en.transform(SQL_INSERT_FILE));
        }

        try{
          ps.setBinaryStream(1, inputStream);
        }catch(AbstractMethodError ame){
          throw new SQLException("seems like your JDBC driver does not support this API: java.jdbc.PreparedStatement.setBinaryStream(int,InputStream), please update your JDBC driver", ame);
        }
        ps.setString(2, uri);

        ps.executeUpdate();

        filesWritten.add(uri);
      } catch (Exception e) {
        try {
          this.con.rollback();
        } catch (SQLException e1) {
          log.error("jdbc rollback failed", e1);
        } finally {
          Closer.closeAllSQLObjects(ps, con);
          ps=null;
        }
        if(e instanceof CustomException){
          throw (CustomException)e;
        }else{
          throw new RuntimeException(e);
        }
      } finally {
        Closer.closeAllSQLObjects(ps);
      }
    }

    @Override
    public void commit() {
      if(log.isDebugEnabled()){
        log.debug("commiting jdbc transaction");
      }

      try{
        this.con.commit();
      } catch (SQLException e) {
        throw new RuntimeException("failed to commit jdbc", e);
      }finally{
        Closer.closeAllSQLObjects(con);
      }
    }

    @Override
    public Collection<String> getWrittenFiles() {
      return filesWritten ;
    }

    @Override
    public void delete(Collection<String> uris) {
      if(log.isDebugEnabled()){
        log.debug("deleting uris: " + uris);
      }

      SQLEngine sqle = new SQLEngine();
      try {
        StringBuilder sb = new StringBuilder();
        for(String uri : uris){
          sb.append("'");
          sb.append(uri);
          sb.append("',");
        }
        sb.setLength(sb.length()-1);
        new QueryRunner(true).update(this.con, MessageFormat.format(sqle.transform(SQL_DELETE_FILES), sb.toString()) );
      } catch (SQLException e) {
        try {
          this.con.rollback();
        } catch (SQLException e1) {
          log.error("jdbc rollback failed", e1);
        } finally {
          Closer.closeAllSQLObjects(con);
        }
      }
    }
  }

  /**
   * a custom unchecked exception
   *
   *
   */
  protected static class CustomException extends RuntimeException {
    private static final long serialVersionUID = 1L;
    final int httpStatus;

    public CustomException(int httpStatus, String messageBody) {
      super(messageBody);
      this.httpStatus = httpStatus;
    }

    public CustomException(int httpStatus, Exception e) {
      super(e);
      this.httpStatus = httpStatus;
    }

    public CustomException(int httpStatus) {
      this.httpStatus = httpStatus;
    }
  }
}
