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
package de.businesscode.bcdui.vfs.provider.database;

import org.xml.sax.InputSource;
import org.w3c.dom.Document;
import java.io.InputStream;
import java.io.StringReader;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.Arrays;

import net.sf.ehcache.Element;

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
import de.businesscode.bcdui.web.wrs.RequestOptions;
import de.businesscode.bcdui.wrs.IRequestOptions;
import de.businesscode.bcdui.wrs.load.DataLoader;
import de.businesscode.bcdui.wrs.load.Wrq2Sql;
import de.businesscode.sqlengine.SQLEngine;
import de.businesscode.util.jdbc.Closer;
import de.businesscode.util.jdbc.wrapper.BcdSqlLogger;
import de.businesscode.util.xml.SecureXmlFactory;



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

  private static final String mainBindingSQL =
  " #set( $k = $bindings." + BCDVIRTUALFILESYSTEM + " ) "+
  " SELECT $k.path-, $k.resourceClob-, $k.resourceBlob- FROM $k.getPlainTableName() WHERE $k.path- = ?";

  private static final String getChildrenSQL =
  " #set( $k = $bindings." + BCDVIRTUALFILESYSTEM + " ) "+
  " SELECT $k.path- FROM $k.getPlainTableName() WHERE $k.path- like ?";

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
        stmt.setString(1, this.fileName.getPathDecoded());

        log.trace("isReadable():" + sql + " param: " + this.fileName.getPathDecoded());

        rs = stmt.executeQuery();
        // register readable file in VFS cache
        is = rs.next();
        if (is)
          CacheFactory.getVFSCache().put(new Element(getName().getPathDecoded(), getName().getPathDecoded()));
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
    String reqSql = "<WrsRequest xmlns=\"http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0\" xmlns:f=\"http://www.businesscode.de/schema/bcdui/filter-1.0.0\"><Select><Columns><C bRef=\"path\"/><C bRef=\"resourceClob\"/><C bRef=\"resourceBlob\"/></Columns><From><BindingSet>bcd_virtualFileSystem</BindingSet></From><f:Filter><f:Expression bRef=\"path\" op=\"=\" value=\""+ this.fileName.getPathDecoded()+"\"/></f:Filter></Select></WrsRequest>";
    StringReader strReader = new StringReader(reqSql);
    Document doc = SecureXmlFactory.enableNamespaceAware(SecureXmlFactory.newDocumentBuilderFactory()).newDocumentBuilder().parse(new InputSource(strReader));
    IRequestOptions options = new RequestOptions(-1);
    options.setRequestDoc(doc);
    VFSDataWriter dataWriter = new VFSDataWriter(){};
    DataLoader loader = new DataLoader(options, new Wrq2Sql(options), dataWriter);
    loader.run();
    return dataWriter.getInputStream();
  }

  @Override
  protected FileType doGetType() throws Exception {
    if(fileName != null){
      if(fileName.getExtension() != null && ! fileName.getExtension().isEmpty())
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
          log.warn("The original file is not a folder, thus no children, filePath:" + this.fileName.getPathDecoded());
          return chs;
        }

        String path = this.fileName.getPathDecoded();
        path = path + FileName.SEPARATOR + "*";
        path = path.replaceAll("\\*", "%");

        stmt = connection.prepareStatement(new SQLEngine().transform(getChildrenSQL));
        stmt.setString(1, path);
        rs = stmt.executeQuery();

        ArrayList<DatabaseFileObject> list = new ArrayList<>();

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
    ArrayList<String> chPaths = new ArrayList<>();
    if(clds != null){
      for (int i = 0; i < clds.length; i++) {
        chPaths.add( clds[i].getName().getPathDecoded());
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
    BindingSet bs  = Bindings.getInstance().get(BCDVIRTUALFILESYSTEM, new ArrayList<>());
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
