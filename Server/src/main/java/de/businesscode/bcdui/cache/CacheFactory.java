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
package de.businesscode.bcdui.cache;

import org.apache.commons.vfs.FileSystemException;

import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.vfs.provider.database.VFSManagerFactory;
import net.sf.ehcache.Cache;
import net.sf.ehcache.CacheManager;

/**
 * Cache factory to BCD-UI managed caches, (currently backed by ehCache v2). You can access the {@link CacheManager} via {@link #getCacheManager()}
 **/
public class CacheFactory {
  private static final String CACHE_ID_VFS = "de.businesscode.bcdui.vfs.DataBaseFileSystem";
  private static class CacheManagerHolder {
    static CacheManager defaultCacheManager = CacheManager.getInstance(); // re-use the default one 
  }

  /**
   * Constructor
   */
  private CacheFactory(){}


  /**
   * @return the default {@link CacheManager} configured by '/ehcache.xml' from given classpath.
   */
  public static CacheManager getCacheManager(){
    return CacheManagerHolder.defaultCacheManager;
  }


  /**
   * @return {@link Cache} for VFS entries. 
   */
  public static Cache getVFSCache(){
    getCacheManager().addCacheIfAbsent(CACHE_ID_VFS);
    return getCacheManager().getCache(CACHE_ID_VFS);
  }

  /**
   * removes all entries from VFS cache
   * if it not null is
   * returns true if only VFS cache has been removed elsewhere - false
   */
  public static boolean clearVFScache(){
    boolean rs = false;

    if(getVFSCache() != null){
      getVFSCache().removeAll();
      rs = true;
    }
    return rs;
  }

  /**
   * registers VFS catalog if and only if VFS is active
   */
  public static boolean registerVFSCatalog() throws FileSystemException, BindingException{
    boolean rs = false;
    if(VFSManagerFactory.isVFSactive())
    {
      VFSManagerFactory.registerCacheCatalog();
      rs =true;
    }
    return rs;
  }

}
