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
package de.businesscode.bcdui.web.servlets;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.net.URLConnection;
import java.nio.file.FileSystemException;
import java.util.Arrays;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.servlet.ServletConfig;
import javax.servlet.ServletContext;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import org.apache.commons.io.IOUtils;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;

import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.vfs.provider.database.DatabaseFileSystemConfigBuilder;
import de.businesscode.util.SOAPFaultMessage;

/**
 * This class enables the use of the database-backed virtual file system and jar files as source for seemingly static resources.
 * Normal static files are located on the filesystem within the webapps root, put there when the server extracts the app.war file.
 * Static files are requested by /appContext/some/path/someFile.txt for example.
 * This class makes files under such an address available, which really come from the database or a jar (and classpath in general) within the app.war instead.
 * Main usage is the virtual file system and making BCD-UI static files like js and xslt available from bcd-ui-core.jar within app.war.
 * The search order is: First vfs, then file system (on server this is normal file from the war), then jar files.
 * Note: Since vfs caches the file list from the database (not the actual content), a lookup in vfs is no performance hit.
 *
 * {@code
 *  <servlet>
 *    <servlet-name>staticResourceServlet</servlet-name>
 *    <servlet-class>de.businesscode.web.StaticResourceServlet</servlet-class>
 *    <init-param>
 *      <param-name>vfsFileExtensions</param-name> <!-- Extensions that can be overwritten in vfs -->
 *      <param-value>xml txt vfsxml pdf png gif jpg jpeg svg doc docx xls xlsx csv zip</param-value>
 *    </init-param>
 *  </servlet>
 *  <!-- Add any URL for the virtual file system here -->
 *  <servlet-mapping>
 *    <servlet-name>bcdui4.StaticResourceServlet</servlet-name>
 *    <url-pattern>/bcdui/*</url-pattern>
 *    <url-pattern>/vfs/*</url-pattern>
 *    <url-pattern>*.vfsxml</url-pattern>
 *  </servlet-mapping>
 * }
 */
public class StaticResourceServlet extends HttpServlet {
  private static final long serialVersionUID = -2307432233792320807L;
  static Logger log = LogManager.getLogger(StaticResourceServlet.class);

  /**
   * All classpath resource lookups get this prefix.
   */
  public static final String classPathPrefix = "";

  static final String LIBRARY_PREFIX       = "/"+BCDUIConfig.LIB_ROOT_FOLDER_NAME+"/";
  static final int    LIBRARY_PREFIX_LENGTH = LIBRARY_PREFIX.length();

  /**
   * if overridden source folder exist
   */
  static boolean existOverridden=false;
  static String bcduiOverwriteDefaultFolderName="bcduiOverwrite";
  private String bcduiOverwriteFolderName=bcduiOverwriteDefaultFolderName;
  private final String bcduiOverwriteFolderInitParamName="bcduiOverwriteFolderName";
  /**
   * file extensions to be served from VFS
   */
  static String[] vfsFileExtensions={"xml","txt"};//default values
  /**
   * init parameter name to set VFS file extensions
   */
  private String vfsFileExtensionsInitParamName="vfsFileExtensions";
  
  // For removal of bcduiApiStubs removal
  private final Pattern patternImportBcduiApiStubs     = Pattern.compile("^import \\{bcdui\\} from [^;]+bcduiApiStubs\\.js.; *$");
  private final int patternImportBcduiApiStubsSearchLen = 1000;

  @Override
  public void init(ServletConfig config) throws ServletException {
    super.init(config);

    if(getInitParameter(bcduiOverwriteFolderInitParamName) != null){
      bcduiOverwriteFolderName = getInitParameter(bcduiOverwriteFolderInitParamName);
    }
    if(getInitParameter(vfsFileExtensionsInitParamName) != null){// override default values
      vfsFileExtensions = getInitParameter(vfsFileExtensionsInitParamName).split(" ");
    }
    Arrays.sort(vfsFileExtensions);// for binary searching

    existOverridden = config.getServletContext().getRealPath( "/"+bcduiOverwriteFolderName) != null;
  }

  /**
   * Implementation of GET requests.
   */
  @Override
  protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {

    // entry the resource resolving
    Resource resource = StaticResourceProvider.fetchResource(getServletContext(), req);
    if (resource.notFound()) {
      // Because MSXML6 XHR hangs on 404 and the fact that we want to allow optional includes,
      // we may need to send an http-OK here in the form of a SOAP fault, which is detected by the client
      // Obviously this only works for resources under control of this Servlet, but
      // 1) Setting a 404 jsp error page for tomcat would not allow to include the response in bcdui.jar
      // 2) At the end this is a workaround for MSXML6+non-required includes, which only makes sense for vfs anyway
      // Missing .js.map is no issue, happens when debug view is opened in explorer but map not provided in distribution
      if( !req.getRequestURI().endsWith(".js.map") )
        SOAPFaultMessage.writeSOAPFaultToHTTPResponse(req, resp, null, "Not Found: "+req.getRequestURI());
      return;
    }

    String contentType = getServletContext().getMimeType(resource.getPath());
    if (contentType != null) {
      resp.setContentType(contentType);
    }

    byte[] data = resource.getData();

    // Remove import {bcdui} from "bcduiApiStubs.js" from js files
    if( req.getRequestURI().endsWith(".js") ) {
      String asString = new String(Arrays.copyOfRange(data, 0, patternImportBcduiApiStubsSearchLen));
      Matcher matcher = patternImportBcduiApiStubs.matcher(asString);
      if( matcher.find() ) Arrays.fill(data, matcher.start(), matcher.end(), (byte)' ');
    }

    resp.setContentLength(data.length);
    resp.getOutputStream().write(data);
  }

  @Override
  protected void doPost(HttpServletRequest req, HttpServletResponse resp)
      throws ServletException, IOException {
    doGet(req, resp);
  }

  /**
   * provider interface to resolve a {@link IResource}
   */
  public static interface ResourceProvider {
    /**
     * fetches a Resource
     * @param context
     * @param fullyQualifiedPath
     * @return {@link Resource} as pointed to by fullyQualifiedPath or null if resource was not found
     */
    Resource getResource(ServletContext context, String fullyQualifiedPath);
  }
  
  /**
   * resource abstract descriptor implementing API to the content
   */
  public static interface Resource {
    /**
     * @return True, if this resource object points to a non-existent resource.
     */
    public boolean notFound();
    /**
     * @return The non-null, fully qualified resource request path.
     */
    public String getPath();
    /**
     * @return The last modification timestamp of the resource. is NULL if resource does not exist
     */
    public Long getLastModified() throws IOException;
    /**
     * Completely reads the resource data from the file system or
     * classpath.
     * @return The resource data.
     */
    public byte[] getData() throws IOException;
  }
  
  /**
   * a static resource provider singleton
   */
  public static class StaticResourceProvider implements ResourceProvider {
    private final static ResourceProvider vfsResrouceProvider = Configuration.getClassInstance(Configuration.OPT_CLASSES.VFSRESOURCEPROVIDER, new Class<?>[]{});
    private static StaticResourceProvider instance;
    public synchronized static StaticResourceProvider getInstance(){
      if(instance == null){
        instance = new StaticResourceProvider();
      }
      return instance;
    }
    private BindingSet virtualFileSystemBindingSet = null;
    private StaticResourceProvider(){
      try {
        virtualFileSystemBindingSet = Bindings.getInstance().get(DatabaseFileSystemConfigBuilder.bindingSetId
            , Arrays.asList(
                DatabaseFileSystemConfigBuilder.pathBindingSetItemId
                ,DatabaseFileSystemConfigBuilder.resourceBlobBindingSetItemId
                ,DatabaseFileSystemConfigBuilder.bindingItemIdResourceClob
            )
        );
      } catch (BindingException e) {
        log.info("Did not find the bindingSet for VFS: " + DatabaseFileSystemConfigBuilder.bindingSetId +" - no VFS is activated");
      }
    }
    /**
     * Gets the resource specified in the request URI.
     * @param context The servlet context used to locate the files if it is a file resource.
     * @param request The requested resource.
     * @return The resource which is always non-null. Use the notFound() method to test if
     * the resource has been found.
     * @throws FileSystemException
     */
    private static Resource fetchResource(ServletContext context, HttpServletRequest request) {
      // This attribute is defined in the Java Servlet Specification section 8.3.1
      // It will be set when the static source is included with c:import.
      String includeServletPath = (String) request.getAttribute("javax.servlet.include.request_uri");
      String path = (includeServletPath == null) ? request.getRequestURI() : includeServletPath;
      path = path.substring(request.getContextPath().length());

      // since 6.0.33 Tomcat doesn't filter out the ;JSESSIONID from requestURI, so we need to do that manually
      HttpSession session = request.getSession(false);
      if (session != null) {
        String token = ";jsessionid=" + session.getId();
        String fixedPath = path;
        int jSessionIdPosition = -1;
        while ((jSessionIdPosition = fixedPath.indexOf(token)) != -1) {
         fixedPath = fixedPath.substring(0, jSessionIdPosition) + fixedPath.substring(jSessionIdPosition + token.length());
        }
        path = fixedPath;
      }

      // Debug logging
      if(log.isTraceEnabled()) {
        if (includeServletPath == null) {
          log.trace("fetching resource from path: " + path);
        } else {
          log.trace("fetching resource from included path: " + path);
        }
      }

      return getInstance().getResource(context, path);
    }

    /**
     * try to fetch resource from overridden source folder
     */
    private static Resource fetchOverriddenResource(ServletContext context, String fullyQualifiedPath){
      Resource res = null;
      File overwriteFile = new File( context.getRealPath( "/"+bcduiOverwriteDefaultFolderName+"/" + fullyQualifiedPath.substring( LIBRARY_PREFIX_LENGTH  ) ) );
      if( overwriteFile.exists() ) {
        log.trace( "fetching overridden resource from file system: " + overwriteFile.getAbsolutePath());
        res = new LocalResource( fullyQualifiedPath, overwriteFile, null );
      }
      return res;
    }

    /**
     * Gets the resource associated with a specific path.
     * @param context The servlet context used to locate the files if it is a file resource.
     * @param fullyQualifiedPath The full path (without the context path) to the resource,
     * beginning with "/".
     *
     * searching ordering:
     * 1. DB (virtual file system)
     * 2. HD Filesystem
     *      |
     *      2a. in bcdui overridden folder -&gt; bcdui sourcen
     *      2b. in filesystem -&gt; bcdui or report/...
     * 3. JAR
     *
     *
     * @return The resource which is always non-null. Use the notFound() method to test if
     * the resource has been found.
     * @throws FileSystemException
     */
    @Override
    public Resource getResource(ServletContext context, String fullyQualifiedPath) {
      Resource res = null;
      //----
      String ext = fullyQualifiedPath.substring(fullyQualifiedPath.lastIndexOf('.')+1);
      if(vfsResrouceProvider != null && virtualFileSystemBindingSet != null
          && Arrays.binarySearch(vfsFileExtensions, ext) >= 0 ){// contains supported extension

        res = vfsResrouceProvider.getResource(context, fullyQualifiedPath);
      }
      //----
      if (context.getRealPath(fullyQualifiedPath) != null && res == null) {// file found in fileSystem, either get it from original or from overridden bcdui folder

        //check if path of type "/bcdui/..."
        if( existOverridden && fullyQualifiedPath.startsWith( LIBRARY_PREFIX ) ) {
          log.trace("try to fetch resource from overridden folder: " + fullyQualifiedPath);
          res = fetchOverriddenResource(context, fullyQualifiedPath);
        }

        if (res == null) {// else static sources from file system
          File file = new File(context.getRealPath(fullyQualifiedPath));
          if (file.exists()) {
            log.trace("fetching resource from file system: " + file.getAbsolutePath());
            res = new LocalResource(fullyQualifiedPath, file, null);
          }
        }
      }
      //---- at last look into jars
      if(res == null){// resolve from classPath(JAR)
        String classPathSource = classPathPrefix + fullyQualifiedPath;
        URL url = Resource.class.getResource(classPathSource);

        if (url == null) {
          log.trace("resource not found: " + fullyQualifiedPath);
        }
        res = new LocalResource(fullyQualifiedPath, null, url);
        log.trace("fetching resource from classpath: " + classPathSource);
      }

      return res;
    }
  }

  /**
   * This class represents one single resource which is either a file on the
   * file system or a URL from the classpath. Please note that a resource which
   * could not be located results is also represented by a Resource object, but
   * the notFound() method will return true. This is useful, because a not-found
   * resource has also a lookup path so the getPath() method works also in this
   * case.
   */
  public static class LocalResource implements Resource {

    /**
     * This is the classpath URL of the resource or null if it is a file resource.
     */
    private URL url = null;

    /**
     * The connection belonging to the url if this is a classpath resource and it
     * has already been opened.
     */
    private URLConnection con = null;

    /**
     * The file in case of a file resource.
     */
    private File file = null;

    /**
     * The (unprocessed) path of the resource request.
     */
    private String path = null;

    /**
     * Constructs a resource which is
     *   1) An empty resource if file and url are null,
     *   2) A file resource if file is not null and url is null,
     *   3) A classpath resource if file is null and url is not.
     * The constructor cannot be invoked directly; instead one of the factory methods
     * fetchResource(...) must be used.
     * @param path The original path of the resource request. It must not be null.
     * @param file The reference to the file if this is a file resource. This can be null.
     * @param url The URL of the classpath resource. This can be null.
     */
    protected LocalResource(String path, File file, URL url) {
      this.path = path;
      this.file = file;
      this.url = url;
      if (file != null && url != null) {
        throw new RuntimeException("A resource must either be a file OR a classpath resource.");
      }
    }

    @Override
    public String getPath() {
      return path;
    }

    @Override
    public boolean notFound() {
      return ( (url == null && file == null ) || ( file != null &&  file.isDirectory()));
    }

    @Override
    public Long getLastModified() throws IOException {
      Long lm=null;
      if (file != null){
        lm = file.lastModified();
      }
      else if (con == null){
        con = url.openConnection();
        lm = con.getLastModified();
      }
      return lm;
    }

    @Override
    public byte[] getData() throws IOException {
      InputStream is = null;
      try {
        if (file == null && url == null) {
          throw new IOException("Resource \"" + path + "\" not found.");
        }

        if (file == null && url != null) {
          if (con == null){
            con = url.openConnection();
          }
          is = con.getInputStream();
        }
        else
          is = new FileInputStream(file);

        return IOUtils.toByteArray(is);

      } finally {
        try {
          if(is!=null)is.close();
        } catch (Exception ex) {
          log.warn("failed to close stream", ex);
        }
      }
    }
  }
}
