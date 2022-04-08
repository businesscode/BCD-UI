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
package de.businesscode.bcdui.wrs.load;

import java.io.StringReader;
import java.util.AbstractMap;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;

import javax.xml.transform.Transformer;
import javax.xml.transform.dom.DOMResult;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamSource;

import org.apache.commons.io.IOUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.subject.Subject;
import org.apache.shiro.web.util.WebUtils;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.BindingSet.SECURITY_OPS;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.StandardBindingSet;
import de.businesscode.bcdui.wrs.IRequestOptions;
import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.jdbc.DatabaseCompatibility;
import de.businesscode.util.xml.SecureXmlFactory;

/**
 * Takes a Wrq and generates SQL from it
 */
public class Wrq2Sql implements ISqlGenerator
{
  protected final Bindings bindings;         // We are not using Bindings.getInstance() to allow running in a batch program
  protected int effectiveMaxRows = -1;
  protected int clientProvidedMaxRows = Integer.MAX_VALUE;
  protected WrqQueryBuilder wrqQueryBuilder;
  protected final Document requestDoc;
  
  // Stylesheet for Grouping Set conversion
  protected static String wrqTransformGrs2UnionXsltStatic;
  static {
    try {
      wrqTransformGrs2UnionXsltStatic = IOUtils.toString(Wrq2Sql.class.getResourceAsStream("wrqTransformGrs2Union.xslt"), "UTF-8");
    } catch (Throwable e) {
      LogManager.getLogger(Wrq2Sql.class).fatal("wrqTransformGrs2Union.xslt not found");
    }
  }
  
  /**
   * We are initialized for each wrq:WrqRequest.
   * @param options
   */
  public Wrq2Sql(IRequestOptions options)
      throws Exception
  {
    super();
    bindings = options.getBindings();
    
    // Is it an empty request?
    Document requestDoc = options.getRequestDoc();
    this.requestDoc = requestDoc;
    if( requestDoc == null
        || requestDoc.getElementsByTagNameNS(StandardNamespaceContext.WRSREQUEST_NAMESPACE, "Select").getLength() == 0
        || requestDoc.getDocumentElement() == null
        || requestDoc.getDocumentElement().getFirstChild() == null ) {
      return;
    }

    // Let's find out, how many rows the user requested. Note, this may be more than allowed
    NodeList selectElems = requestDoc.getElementsByTagNameNS(StandardNamespaceContext.WRSREQUEST_NAMESPACE, "Select");
    int rowStart = 1, rowEnd = Integer.MAX_VALUE;
    try{ rowStart = Integer.parseInt( ((Element)selectElems.item(0)).getAttribute("rowStart")); if( rowStart < 0 ) rowStart = 1; } catch(Exception e){};
    try{ rowEnd = Integer.parseInt( ((Element)selectElems.item(0)).getAttribute("rowEnd")); if( rowEnd < 0 ) rowEnd = Integer.MAX_VALUE;} catch(Exception e){}
    clientProvidedMaxRows = rowEnd - rowStart + 1;

    // Special case
    // For backward compatibility and to avoid running each statement with a limit because of the global set row limit
    // If we have a) a single Select in Wrq and it has b) rowEnd>0 but c) no rowStart>1, we handle that when streaming the result, not in SQL
    effectiveMaxRows = options.getMaxRows();
    if( selectElems.getLength() == 1 && rowEnd >= 0 && rowStart <=1 ) {
      effectiveMaxRows = Math.min( rowEnd, options.getMaxRows() );  // We can ignore rowStart as it is <= 1
    }

    // This is modifying the Wrq when it uses Grouping SETs but they are not supported by the current database
    try {
      // We need the database source to clarify which database dialect to apply
      // We just take the one from the first non-virtual BindingSet we find
      Element firstBindingSet = (Element)requestDoc.getDocumentElement().getElementsByTagNameNS(StandardNamespaceContext.WRSREQUEST_NAMESPACE, "BindingSet").item(0);
      BindingSet firstSbs = bindings.get(firstBindingSet.getFirstChild().getTextContent().trim(), Collections.emptySet());
      String jdbcResourceName = firstSbs.getJdbcResourceName();
      
      // Here we implement a work-around for GROUPING SETs and convert them into GROUP BY with UNION
      // And we convert @rowStart and @rowEnd into a subselect with limit on ROW_NUMBER if @rowStart > 1
      boolean wrqHasGroupingSets = requestDoc.getElementsByTagNameNS(StandardNamespaceContext.WRSREQUEST_NAMESPACE, "GroupingSets").getLength() > 0;
      boolean dbSupportsGroupingSets = DatabaseCompatibility.getInstance().dbSupportsGroupingSets(jdbcResourceName);
      if( wrqHasGroupingSets && !dbSupportsGroupingSets ) {
        DOMSource source = new DOMSource(requestDoc.getDocumentElement());
        StreamSource styleSource = new StreamSource(new StringReader(wrqTransformGrs2UnionXsltStatic) );
        Transformer transformer = SecureXmlFactory.newTransformerFactory().newTransformer(styleSource);
        DOMResult result = new DOMResult();
        transformer.transform(source, result);
        requestDoc = (Document)result.getNode();
      }

    } catch(Exception e) {
      throw new RuntimeException("Unable to generate select statement.", e);
    }
    
    wrqQueryBuilder = new WrqQueryBuilder(this, bindings, requestDoc.getDocumentElement());
    
    // Are we allowed to read all used BindingSets? Will throw otherwise
    Subject subject = null;
    try { subject = SecurityUtils.getSubject(); } catch (Exception e) {/* no shiro at all */}
    if (subject != null && WebUtils.isHttp(subject)) {
      wrqQueryBuilder.assurePermittedOnAllResolvedBindingSets(SECURITY_OPS.read);
    }
  }

  @Override
  public SQLStatementWithParams getSelectStatement() {
    if( wrqQueryBuilder != null ) {
      return wrqQueryBuilder.getSelectStatement();
    } else {
      return null;
    }
  }

  /*
   * ISqlGenerator interface trivial functions
   */
  @Override
  public String getDbSourceName() {
    return wrqQueryBuilder.getJdbcResourceName();
  }
  /**
   * This is the binding sets / groups named in the Wrq
   * @see de.businesscode.bcdui.wrs.load.ISqlGenerator#getRequestedBindingSetNames()
   */
  public Set<Map.Entry<String,String>> getRequestedBindingSetNames() {
    HashSet<Entry<String, String>> requestedBindingSets = new HashSet<Map.Entry<String,String>>();
    if( requestDoc!=null ) {
      NodeList bsNl = requestDoc.getElementsByTagNameNS(StandardNamespaceContext.WRSREQUEST_NAMESPACE, "BindingSet");
      for( int n=0; n<bsNl.getLength(); n++ ) requestedBindingSets.add( new AbstractMap.SimpleImmutableEntry<>(bsNl.item(n).getTextContent(), ((Element)bsNl.item(n)).getAttribute("alias")) );
    }
    return requestedBindingSets;
  }
  @Override
  public Set<StandardBindingSet> getResolvedBindingSets() {
    if( wrqQueryBuilder != null ) return wrqQueryBuilder.getResolvedBindingSets();
    else return new HashSet<>();
  }
  @Override
  public List<WrsBindingItem> getSelectedBindingItems() throws Exception
  {
    if( wrqQueryBuilder != null ) return wrqQueryBuilder.getSelectedBindingItems();
    else return new LinkedList<>();
  }
  @Override
  public int getMaxRows()
  {
    return effectiveMaxRows;
  }
  @Override
  public int getClientProvidedMaxRows() { return clientProvidedMaxRows; };
  @Override
  public boolean isEmpty() {
    return (getSelectStatement() == null);
  }

}