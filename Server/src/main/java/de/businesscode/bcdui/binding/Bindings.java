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
package de.businesscode.bcdui.binding;

import java.io.File;
import java.io.IOException;
import java.util.Collection;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.xpath.XPathExpressionException;

import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;
import org.w3c.dom.Document;
import org.xml.sax.SAXException;

import de.businesscode.bcdui.binding.exc.AmbiguousBindingSetException;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.binding.exc.BindingSetNotFoundException;
import de.businesscode.bcdui.binding.generators.ReadBindingSet;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.toolbox.Configuration.OPT_CLASSES;
import de.businesscode.bcdui.toolbox.config.BareConfiguration;
import de.businesscode.bcdui.wrs.load.modifier.Modifier;
import de.businesscode.util.xml.SecureXmlFactory;

/**
 * A singleton container class for all the bindings defined in the application. These <br>
 * bindings are defined in static XML files under "/WEB-INF/bcdui/bindings" and read <br>
 * as soon as the first access to the getInstance method occurs. In non-debug mode <br>
 * the bindings are cached so that the files are read only once. <br>
 *
 * Don't use de.businesscode.bcdui.toolbox.Configuration instance here to avoid cyclic dependencies (Configuration itself uses Bindings to get parameters from database, etc),
 * Instead use the static BareConfiguration.getInstance() to read static configuration
 */
public class Bindings {
  protected static final int MAX_PARALLEL_THREADS = 8;
  protected static final int MAX_WAIT_MINS = 10;

  private static final String defaultBindingsPath = "bindings";

  protected static Bindings bindings = null;
  protected Map<String, Collection<StandardBindingSet>> warBindingMap;

  private final Logger log = LogManager.getLogger(getClass());

  public static final String escapeXmlAttributeName = "escapeXML";
  public static final String keyAttributeName = "isKey";
  public static final String jdbcDataTypeCodeAttribute = "type";
  public static final String jdbcDataTypeNameAttribute = "type-name";
  public static final String jdbcColumnDisplaySizeAttribute = "display-size";
  public static final String jdbcColumnScaleAttribute = "scale";
  public static final String jdbcSignedAttribute = "signed";
  public static final String jdbcNullableAttribute = "nullable";
  public static final String readOnlyAttributeName = "isReadOnly";
  public static final String aggrAttribute = "aggr";

  /**
   * a special method for internal usage to resolve cyclic dependencies, if your class is using Bindings (i.e. to write to database)
   * and the Binding itself directly or transitively depends on your class. If this method returns FALSE, then calling {@link #getInstance()}
   * will end-up in a dead-lock in case your class is also used during Binding initialization process.
   *
   * @return
   */
  public static boolean isInitialized() {
    return bindings != null;
  }

  /**
   * Bindings
   */
  protected Bindings() throws BindingException {
    warBindingMap = new ConcurrentHashMap<String, Collection<StandardBindingSet>>();
    initWarMap();
  }

  /**
  /* EnterpriseEdition has a more powerful BindigSet reader
   * @throws BindingException
   */
  protected void initWarMap()  throws BindingException {
    warBindingMap = readBindings(ReadBindingSet.class);
  }

  /**
   * to use the method - Bindings must be first loaded by calling getInstance(String directory) or getInstance(HttpServletRequest request).
   *
   *
   * Method getInstance
   *
   * @return
   * @throws BindingException
   */
  public static synchronized Bindings getInstance() throws BindingException
  {
    if( Bindings.bindings==null ) {
      try {
        Bindings.bindings = (Bindings) Configuration.getClassoption(OPT_CLASSES.BINDINGS).newInstance();
      } catch (Exception e) {
        throw new BindingException("No valid Bindings class found", e);
      }
    }
    return bindings;
  }


  /**
   * Start of folder recursion
   * @param rbs
   * @return
   * @throws BindingException
   */
  protected Map<String, Collection<StandardBindingSet>> readBindings( Class<? extends ReadBindingSet> rbs ) throws BindingException {
    ExecutorService es = Executors.newFixedThreadPool(MAX_PARALLEL_THREADS);
    Map<String, Collection<StandardBindingSet>> newBindingMap = new ConcurrentHashMap<String, Collection<StandardBindingSet>>();
    try {
      String bindingsFolder = BareConfiguration.getInstance().getConfigurationParameter(Configuration.CONFIG_FILE_PATH_KEY)+File.separator+defaultBindingsPath;
      readBindings(bindingsFolder, es, rbs, newBindingMap);
      // we allow the parsing (and the test query) to run in parallel
      // Lets wait for all to complete as our client may need any of these
      es.shutdown();
      if( !es.awaitTermination(MAX_WAIT_MINS, TimeUnit.MINUTES) )
        throw new BindingException("Timeout during reading of binding definitions");
    } catch (Exception e) {
      throw new BindingException(e.getMessage(),e);
    }
    return newBindingMap;
  }

  /**
   * Read bindings from file system
   * @param bindingsFolder
   * @param es
   * @throws SAXException
   * @throws IOException
   * @throws ParserConfigurationException
   * @throws XPathExpressionException
   * @throws BindingException
   */
  private void readBindings(String bindingsFolder, ExecutorService es, Class<? extends ReadBindingSet> rbs, Map<String, Collection<StandardBindingSet>> newBindingMap)
      throws Exception {
    // Read the list of binding files
    File[] bindingFiles = (new File(bindingsFolder)).listFiles();
    //
    if (bindingFiles == null) {
      log.warn("Cannot read BCD-UI bindings from " + bindingsFolder + ". The path is not a directory.");
      return;
    }
    //
    DocumentBuilderFactory documentBuilderFactory = SecureXmlFactory.newDocumentBuilderFactory();
    documentBuilderFactory.setXIncludeAware(true);
    documentBuilderFactory.setNamespaceAware(true);

    // Read each file, each file gives a BindingSet
    for (int file = 0; file < bindingFiles.length; file++) {
      if (bindingFiles[file].isDirectory()) {
        readBindings(bindingFiles[file].getAbsolutePath(), es, rbs, newBindingMap);
        continue;
      }
      if (!bindingFiles[file].isFile() || !bindingFiles[file].canRead() || !bindingFiles[file].getName().toLowerCase().endsWith(".xml"))
        continue;
      Document bindingDoc = documentBuilderFactory.newDocumentBuilder().parse(bindingFiles[file]);
      if (bindingDoc == null || bindingDoc.getDocumentElement() == null)
        continue;

      // parsing or generating files
      // Real CDI, hopefully coming soon...
      es.execute(rbs.getConstructor(Document.class, String.class, Map.class).newInstance(bindingDoc, bindingFiles[file].getAbsolutePath(), newBindingMap));
    }
  }

  /**
   * Allows overwriting if there are multiple sources for BindingSets
   * @param bindingSetId
   * @return
   */
  protected Collection<StandardBindingSet> getBindingSetUnchecked( String bindingSetId ) {
    return warBindingMap.get(bindingSetId);
  }


  /**
   * Fetches the specified BindingSet. This method does not work with BindingSetGroups therefore it should not be used anymore.
   *
   * @param bindingSetId
   *          The id of the BindingSet to be returned.
   * @return The BindingSet registered under the id.
   * @throws BindingException
   * @deprecated This getter is deprecated because it prevents the BindingSetGroup feature from being totally transparent to the user.
   */
  @Deprecated
  public BindingSet get(String bindingSetId) throws BindingException {
    Collection<StandardBindingSet> result = getBindingSetUnchecked( bindingSetId );
    if (result == null) {
      throw new BindingSetNotFoundException(bindingSetId);
    }
    if (result.size() > 1) {
      throw new AmbiguousBindingSetException(bindingSetId, result.size());
    }
    return result.iterator().next();
  }

  /**
   * tells silently if one or more BindingSet exists, this method can be used for classes which feature availability depends on a Binding.
   *
   * @param bindingSetId
   * @return true if at least one binding-set exists which such name, false otherwise.
   */
  public boolean hasBindingSet(String bindingSetId){
    return getBindingSetUnchecked(bindingSetId) != null;
  }

  /**
   * EnterpriseEdition allows us to search for a "best-match" BindingSet here, which allows for deep optimizations at runtime
   * @param bindingSetId
   * @param items
   * @return
   * @throws BindingException
   */
  public BindingSet get(String bindingSetId, Collection<String> items) throws BindingException {
    return get(bindingSetId);
  }

  /**
   * clears the bindings so that getInstance() would return a new instance, reading BindingSets fresh
   */
  public static synchronized void clear(){
    Bindings.bindings = null;
  }


  /**
   * Potential extension point
   */
  public List<Class<? extends Modifier>> getWrqModifiers(String bindingSetId) throws BindingException {
    return new LinkedList<Class<? extends Modifier>>();
  }


  /**
   * Optional extension point
   */
  public void readDependentBindings() throws BindingException {
  }

  /**
   * Optional extension point
   */
  public void readAdditionalBindings() throws BindingException {
  }
}
