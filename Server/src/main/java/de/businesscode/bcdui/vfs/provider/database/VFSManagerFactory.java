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

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

import net.sf.ehcache.Cache;
import net.sf.ehcache.Element;

import org.apache.commons.vfs.FileObject;
import org.apache.commons.vfs.FileSystem;
import org.apache.commons.vfs.FileSystemException;
import org.apache.commons.vfs.VFS;
import org.apache.commons.vfs.impl.StandardFileSystemManager;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.binding.exc.BindingSetNotFoundException;
import de.businesscode.bcdui.cache.CacheFactory;


public class VFSManagerFactory {
  private static final Logger log = LogManager.getLogger(VFSManagerFactory.class);
  private static StandardFileSystemManager fileSystemMng=null;
  private static final Set<FileSystem> fileSystemSet= new HashSet<FileSystem>();

  private VFSManagerFactory(){}


  /**
   * Method getVFSManager creates an instance of VFS manager and set configuration file
   */
  public static synchronized StandardFileSystemManager getManager() throws FileSystemException{
    if(fileSystemMng == null){
      StandardFileSystemManager mn = (StandardFileSystemManager)VFS.getManager();
      String[] schemes = mn.getSchemes();
      Arrays.sort(schemes);
      if(Arrays.binarySearch(schemes, "sql") < 0){// is used not from jar file
        String prefix = VFSManagerFactory.class.getResource(DatabaseFileSystemConfigBuilder.configFilePath).getPath().contains(".jar!") ? "jar:" : "file:";
        mn.setConfiguration(prefix+VFSManagerFactory.class.getResource(DatabaseFileSystemConfigBuilder.configFilePath).getPath());
        mn.init();
      }
      fileSystemMng = mn;
    }
    return fileSystemMng;
  }

  /**
   * reads all children of VFS in database
   */
  public static FileObject[] readAllChildren() throws FileSystemException{
    DatabaseFileObject fo = (DatabaseFileObject)getManager().resolveFile("sql:/*");
    return fo.getChildren();
  }

  /**
   * force-shutdown on the filesystem and the manager
   */
  public static synchronized void shutdown() {
    if(fileSystemMng != null) {
      if(log.isDebugEnabled())
        log.debug("shutting down VFS with filesystems: " + fileSystemSet.size());
      synchronized(fileSystemSet) {
        while(fileSystemSet.iterator().hasNext()){
          try {
            fileSystemMng.closeFileSystem(fileSystemSet.iterator().next());
          } catch (Exception e) {
            log.warn("failed to shutdown filesystem", e);
          }finally{
            fileSystemSet.clear();
          }
        }
      }
      try {
        fileSystemMng.close();
      } catch (Exception e) {
        log.warn("failed to close VFS manager", e);
      }finally{
        fileSystemMng = null;
      }
    }
  }

  /**
   * reads all DB files from VFS and registers files in catalog
   */
  public static Cache registerCacheCatalog() throws FileSystemException{
    FileObject[] fos = readAllChildren();
    synchronized(fileSystemSet) {
      // link to all file systems so we can shut them down
      fileSystemSet.clear();
      for(FileObject fo: fos){
        fileSystemSet.add(fo.getFileSystem());
      }
    }

    Cache ch = getVFSCache();
    for (int i = 0; i < fos.length; i++) {
      ch.put( new Element(fos[i].getName().getPath(),fos[i].getName().getPath()) );
    }

    log.trace("register DB VFS catalog for " + fos.length + " files");

    return ch;
  }


  /**
   * gets VFS cahe instance
   */
  public static Cache getVFSCache(){
    return CacheFactory.getVFSCache();
  }

  /**
   * if virtual file system is in current application active
   */
  public static boolean isVFSactive() throws BindingException {
    Bindings b;
    try {
      b = Bindings.getInstance();
      return (b.get(DatabaseFileSystemConfigBuilder.bindingSetId) != null);// virtual file system is active
    }
    catch (BindingSetNotFoundException e) {
      return false;  // Not found just means, not used. This is not an error
    }
  }

}
