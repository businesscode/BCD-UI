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
package de.businesscode.bcdui.vfs.provider.database;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.sql.Blob;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.Arrays;

import net.sf.ehcache.Element;

import org.apache.commons.io.IOUtils;
import org.apache.commons.vfs.FileName;
import org.apache.commons.vfs.FileObject;
import org.apache.commons.vfs.FileSystemException;
import org.apache.commons.vfs.FileType;
import org.apache.commons.vfs.impl.VirtualFileName;
import org.apache.commons.vfs.provider.AbstractFileObject;
import org.apache.logging.log4j.Level;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.cache.CacheFactory;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.web.filters.RequestLifeCycleFilter;
import de.businesscode.sqlengine.SQLEngine;
import de.businesscode.util.jdbc.Closer;
import de.businesscode.util.jdbc.DatabaseCompatibility;
import de.businesscode.util.jdbc.wrapper.BcdSqlLogger;



/**
 *  Representer for a File object, is not threadsafe
 *
 **/
public class DatabaseFileObject extends AbstractFileObject {

  private final Logger log = LogManager.getLogger(getClass());
  private final DatabaseFileSystem fileSystem;

  private final FileName fileName;
  private DatabaseFileSystemConfigBuilder cfgBuilder;
  private BindingSet bindingSet;
  private Boolean isReadable=null;
  
  private static final String BCDVIRTUALFILESYSTEM = "bcd_virtualFileSystem";

  /**
   * Constructor
   */
  protected DatabaseFileObject(FileName name, final DatabaseFileSystem fs) {
    super(name, fs);

    this.fileSystem = fs;
    this.fileName = name;
    try {
      cfgBuilder = (DatabaseFileSystemConfigBuilder)this.fileSystem.getFileSystemManager().getFileSystemConfigBuilder("sql");
    }
    catch (FileSystemException e) {
      log.error("FileSystemException occurred by getting DatabaseFileSystemConfigBuilder", e);
    }
  }

  private static final String innerSQL =
  " ( SELECT $k.path-, $k.resourceClob-, $k.resourceBlob-, $k.isServer-, ROW_NUMBER() OVER (PARTITION BY $k.path- ORDER BY $k.isServer- DESC ) C FROM $k.getPlainTableName()" +
  " ) Q WHERE C=1 AND ($k.isServer- = 1 OR ($k.isServer- = 0 AND UPPER($k.path-) NOT LIKE '/WEB-INF/%'))";

  private static final String mainBindingSQL =
  " #set( $k = $bindings." + BCDVIRTUALFILESYSTEM + " ) "+
  " SELECT $k.path-, $k.resourceClob-, $k.resourceBlob- FROM " + innerSQL + " AND $k.path- = ?";

  private static final String getChildrenSQL =
  " #set( $k = $bindings." + BCDVIRTUALFILESYSTEM + " ) "+
  " SELECT $k.path- FROM " + innerSQL + " AND $k.path- like ?";

  @Override
  /**
   * will be called more that one time, before getInputStream
   */
  public boolean isReadable() throws FileSystemException {
    if(isReadable != null) return isReadable;

    Connection connection = null;
    ConnectionContainer conCont = null;

    boolean gotBinding = true;
    try {conCont = obtainConnection(); connection = conCont.connection;} catch (Exception ex) {
      gotBinding  = false;
    }

    boolean is = false;

    if (gotBinding) {

      PreparedStatement stmt=null;
      ResultSet rs=null;

      try {
        BcdSqlLogger.setLevel(Level.TRACE);
        String sql = new SQLEngine().transform(mainBindingSQL);
        stmt = connection.prepareStatement(sql);
        stmt.setString(1, this.fileName.getPath());

        log.trace("isReadable():" + sql + " param: " + this.fileName.getPath());

        rs = stmt.executeQuery();
        // register readable file in VFS cache
        is = rs.next();
        if (is)
          CacheFactory.getVFSCache().put(new Element(getName().getPath(), getName().getPath()));
      }
      catch (Exception e) {
        throw new FileSystemException(e);
      }
      finally{
        BcdSqlLogger.reset();
        Closer.closeAllSQLObjects(rs, stmt);
        conCont.close();
      }
    }

    isReadable = is;
    return is;
  }

  @Override
  protected long doGetContentSize() throws Exception {
    throw new Exception("doGetContentSize not implemented");
  }

  @Override
  protected InputStream doGetInputStream() throws Exception {

    Connection connection = null;
    ConnectionContainer conCont = null;

    boolean gotBinding = true;
    try {conCont = obtainConnection(); connection = conCont.connection;} catch (Exception ex) {
      gotBinding  = false;
    }

    InputStream iStr=null;

    if (gotBinding) {

      PreparedStatement stmt=null;
      ResultSet rs=null;

      try {
        BcdSqlLogger.setLevel(Level.TRACE);
        String sql = new SQLEngine().transform(mainBindingSQL);
        stmt = connection.prepareStatement(sql);
        stmt.setString(1, this.fileName.getPath());

        log.trace("doGetInputStream():" + sql + " param: " + this.fileName.getPath());
        rs = stmt.executeQuery();
        if (rs.next()) {

          // First, try to use the clob content
          iStr = DatabaseCompatibility.getInstance().getClobInputStream(BCDVIRTUALFILESYSTEM, rs, 2);

          // Otherwise use the binary content
          // the rs.getBinaryStream() cannot be accessed after the rs/stmt were closed so we read the content and put it in an new Stream
          if (iStr == null){
            Blob blob = rs.getBlob(3);
            if (blob != null)
              iStr = new ByteArrayInputStream(IOUtils.toByteArray(blob.getBinaryStream()));
          }
        }
      }
      finally{
        BcdSqlLogger.reset();
        Closer.closeAllSQLObjects(rs, stmt);
        conCont.close();
      }
    }

    return iStr;
  }

  @Override
  protected FileType doGetType() throws Exception {
    if(fileName != null){
      if(fileName.getExtension() != null && fileName.getExtension() != "")
        return FileType.FILE;

      return FileType.FOLDER;
    }
    return null;
  }

  @Override
  /**
   * gets all children files from given over fileName(folder) or null
   *
   */
  public FileObject[] getChildren() throws FileSystemException {
    Connection connection = null;
    ConnectionContainer conCont = null;

    boolean gotBinding = true;
    try {conCont = obtainConnection(); connection = conCont.connection;} catch (Exception ex) {
      gotBinding  = false;
    }

    FileObject[] chs = null;

    if (gotBinding) {
      PreparedStatement stmt = null;
      ResultSet rs=null;

      try{
        BcdSqlLogger.setLevel(Level.TRACE);
        if(doGetType() != FileType.FOLDER){
          log.warn("The original file is not a folder, thus no children, filePath:" + this.fileName.getPath());
          return chs;
        }

        String path = this.fileName.getPath();
        path = path + FileName.SEPARATOR + "*";
        path = path.replaceAll("\\*", "%");

        stmt = connection.prepareStatement(new SQLEngine().transform(getChildrenSQL));
        stmt.setString(1, path);
        rs = stmt.executeQuery();

        ArrayList<DatabaseFileObject> list = new ArrayList<DatabaseFileObject>();

        while (rs.next()) {
          list.add( new DatabaseFileObject(
            new VirtualFileName("sql", rs.getString(1), FileType.FILE), this.fileSystem
          ));
        }

        chs = list.toArray(new FileObject[list.size()]);
      }
      catch (Exception e) {
        throw new RuntimeException(e);
      }
      finally{
        BcdSqlLogger.reset();
        Closer.closeAllSQLObjects(rs, stmt);
        conCont.close();
      }
    }

    return chs;
  }

  @Override
  /**
   * gets path of all children or empty array
   */
  protected String[] doListChildren() throws Exception {
    FileObject[] clds = getChildren();
    ArrayList<String> chPaths = new ArrayList<String>();
    if(clds != null){
      for (int i = 0; i < clds.length; i++) {
        chPaths.add( clds[i].getName().getPath());
      }
    }
    return chPaths.toArray(new String[chPaths.size()]);
  }

  public BindingSet getBindingSet() throws BindingException {
    if(this.bindingSet == null){
      this.bindingSet = Bindings.getInstance().get(
          cfgBuilder.getBindingSetId(),
          Arrays.asList(cfgBuilder.getBindingItemIdPath()
              , cfgBuilder.getBindingItemIdResourceClob()
              , cfgBuilder.getBindingItemIdResourceBlob()
              , cfgBuilder.getBindingItemIdIsServer()
              ));
    }
    return bindingSet;
  }

  /**
   * returns either a managed or unmanaged connection relying on the {@link RequestLifeCycleFilter#isThreadBoundToHttpRequest()}
   * method.
   *
   * @return {@link ConnectionContainer}
   * @throws Exception
   */
  protected ConnectionContainer obtainConnection() throws Exception {
    BindingSet bs  = Bindings.getInstance().get(BCDVIRTUALFILESYSTEM, new ArrayList<String>());
    Boolean isManaged = RequestLifeCycleFilter.isThreadBoundToHttpRequest();
    Connection con = isManaged ?
        Configuration.getInstance().getManagedConnection(bs.getDbSourceName()) :
        Configuration.getInstance().getUnmanagedConnection(bs.getDbSourceName());

    return new ConnectionContainer(con, isManaged);
  }

  /*
   * helper class
   */
  private static class ConnectionContainer {
    Connection connection;
    Boolean isManaged=false;
    public ConnectionContainer(Connection con, Boolean isManaged) {
      this.connection = con;
      this.isManaged = isManaged;
    }

    /**
     * close connetion, if required
     */
    public void close() {
      if(!isManaged)
        Closer.closeAllSQLObjects(connection);
    }
  }
}
