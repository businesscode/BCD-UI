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
package de.businesscode.bcdui.web.servlets;

import java.io.IOException;
import java.io.InputStream;

import javax.servlet.ServletContext;

import org.apache.commons.io.IOUtils;
import org.apache.commons.vfs.FileObject;
import org.apache.commons.vfs.FileSystemException;
import org.apache.log4j.Logger;

import de.businesscode.bcdui.vfs.provider.database.VFSManagerFactory;
import de.businesscode.bcdui.web.servlets.StaticResourceServlet.Resource;
import de.businesscode.bcdui.web.servlets.StaticResourceServlet.ResourceProvider;
import net.sf.ehcache.Cache;

/**
 * a thread safe {@link ResourceProvider} which provides a resource from VFS
 *
 */
public class VfsResourceProvider implements StaticResourceServlet.ResourceProvider {
  private Logger log = Logger.getLogger(getClass());

  public VfsResourceProvider() {

  }

  @Override
  public Resource getResource(ServletContext context, String fullyQualifiedPath) {
    try {
      Resource res = null;
      // we expect that BcdUiApplicationContextListener is active in current application
      // and has activated VFS catalog
      Cache vfsCache = VFSManagerFactory.getVFSCache();
      if (vfsCache != null && vfsCache.isElementInMemory(fullyQualifiedPath)) {
        log.trace("try to fetch resource from VFS: " + fullyQualifiedPath);
        FileObject vFile = VFSManagerFactory.getManager().resolveFile("sql:" + fullyQualifiedPath);
        if (vFile != null && vFile.isReadable()) {
          res = new VfsResource(fullyQualifiedPath, vFile);
        }
      }

      return res;
    } catch (FileSystemException fse) {
      throw new RuntimeException("failed to fetch resrouce from VFS", fse);
    }
  }

  /**
   * represents a single resource to VFS
   */
  public static class VfsResource implements Resource {
    private Logger log = Logger.getLogger(getClass());

    /**
     * The (unprocessed) path of the resource request.
     */
    private final String path;

    /**
     * virtual file object
     */
    private final FileObject fileObject;

    protected VfsResource(String pathPr, FileObject fileObjectPr) {
      this.path = pathPr;
      this.fileObject = fileObjectPr;
    }

    @Override
    public String getPath() {
      return path;
    }

    @Override
    public boolean notFound() {
      return (fileObject == null);
    }

    @Override
    public Long getLastModified() throws IOException {
      return fileObject.getContent().getLastModifiedTime();
    }

    @Override
    public byte[] getData() throws IOException {
      try (InputStream is = fileObject.getContent().getInputStream()) {
        return IOUtils.toByteArray(is);
      } finally {
        try {
          fileObject.close();
        } catch (Exception e) {
          log.warn("failed to close FileObject", e);
        }
      }
    }
  }
}
