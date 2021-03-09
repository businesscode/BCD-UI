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
package de.businesscode.bcdui.binding.generators;

import static de.businesscode.util.StandardNamespaceContext.BINDINGS_NAMESPACE;
import static de.businesscode.util.StandardNamespaceContext.WRS_NAMESPACE;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Map;

import javax.xml.transform.TransformerException;
import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpressionException;

import org.apache.log4j.Level;
import org.apache.log4j.Logger;
import org.w3c.dom.DOMException;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NamedNodeMap;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.BindingUtils;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.StandardBindingSet;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.binding.rel.Relation;
import de.businesscode.bcdui.binding.subjectFilter.SubjectFilters;
import de.businesscode.bcdui.binding.write.WriteProcessingCallbackFactory;
import de.businesscode.bcdui.binding.write.WriteProcessingCallbackParams;
import de.businesscode.bcdui.subjectsettings.config.Security;
import de.businesscode.bcdui.subjectsettings.config.Security.Operation;
import de.businesscode.bcdui.toolbox.config.BareConfiguration;
import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.Utils;
import de.businesscode.util.XPathUtils;
import de.businesscode.util.jdbc.wrapper.BcdSqlLogger;

/**
 *  Parses a binding xml and creates an in-memory BindingSet
 */
public class ReadBindingSet implements Runnable {
  private final Logger log = Logger.getLogger(getClass());

  protected Document bindingDoc;
  protected String fileName;
  protected Map<String, Collection<StandardBindingSet>> bindingMap;
  protected StandardNamespaceContext nsContext;

  /**
   * Parses a binding xml and creates an in-memory BindingSet
   * @param bindingDoc
   * @param fileName
   * @param bindingMap
   */
  public ReadBindingSet(Document bindingDoc, String fileName, Map<String, Collection<StandardBindingSet>> bindingMap) {
    this.bindingDoc = bindingDoc;
    this.fileName   = fileName;
    this.bindingMap = bindingMap;
    nsContext = StandardNamespaceContext.getInstance();
  }

  public void run() {
    try {
      BcdSqlLogger.setLevel(Level.TRACE);
      parseBindingDocument(bindingDoc,fileName, bindingMap);
    } catch (Exception e) {
      log.error("error while parsing BindingSet file " + fileName, e);
    } finally {
      BcdSqlLogger.reset();
    }
  }

  /**
   *
   * parses Binding DOM Document and puts BindigSet into Binding Map
   *
   * @param bindingDoc
   * @param fileName
   * @throws XPathExpressionException
   * @throws IOException
   * @throws BindingException
   * @throws NoSuchFieldException
   * @throws IllegalAccessException
   * @throws SecurityException
   * @throws IllegalArgumentException
   * @throws DOMException 
   * @throws ClassNotFoundException 
   */
  protected void parseBindingDocument(Document bindingDoc, String fileName, Map<String, Collection<StandardBindingSet>> bindingMap) throws XPathExpressionException, IOException, BindingException, IllegalArgumentException, SecurityException, IllegalAccessException, NoSuchFieldException, ClassNotFoundException, DOMException
  {
    // Check schema. We expect files with BindingGroup BindingSet and BindingInclude
    // The first two will be known to the system but BindingInclude is not usable stand-alone but is to be
    // used via xi:include for cleaner organization. If we have a file containing a BindingInclude, we just skip it here.
    if (!BINDINGS_NAMESPACE.equals(bindingDoc.getDocumentElement().getNamespaceURI()))
      throw new BindingException("The binding document should use schema " + BINDINGS_NAMESPACE + " File:" + fileName
          +"\nused is:" + bindingDoc.getDocumentElement().getNamespaceURI());
    if ("BindingSet".equals(bindingDoc.getDocumentElement().getLocalName())) {
      String bsName = bindingDoc.getDocumentElement().getAttribute("id");
      if( bindingMap.containsKey(bsName) )
        throw new BindingException("Duplicate definition found for BindingSet '"+bsName+"'");
      StandardBindingSet bs = new StandardBindingSet(bsName);
      bindingMap.put(bsName, Collections.singleton(bs));
      // We either have a simple table/view name in the @table attribute or a DerivedTableExpression child node with room for a more complex definition for a derived table
      NodeList dtes = bindingDoc.getDocumentElement().getElementsByTagNameNS(BINDINGS_NAMESPACE, "DerivedTableExpression");
      String tableName = null;
      if( dtes.getLength()==1 )
        tableName = "("+dtes.item(0).getTextContent().replaceAll("\\s\\s+", " ")+")";
      else
        tableName = bindingDoc.getDocumentElement().getAttribute("table");
      bs.setTableName(tableName);
      String dbSourceName = bindingDoc.getDocumentElement().getAttribute("dbSourceName");
      if (dbSourceName != null) {
        bs.setDbSourceName(dbSourceName);
      }
      String allowSelectAllColumns = bindingDoc.getDocumentElement().getAttribute("allowSelectAllColumns");
      if ("true".equals(allowSelectAllColumns)) {
        bs.setAllowSelectAllColumns(true);
      }

      XPath xPath = XPathUtils.newXPathFactory().newXPath();
      xPath.setNamespaceContext(nsContext);
      String xPathNS = nsContext.getXMLPrefix(BINDINGS_NAMESPACE);

      NodeList biSet = (NodeList) xPath.evaluate("/" + xPathNS + "BindingSet//" + xPathNS + "C", bindingDoc, XPathConstants.NODESET);

      // Loop over and create the BindingItems. At the same time prepare the column-list for the test-statement
      StringBuffer stmtStr = new StringBuffer("SELECT ");
      StringBuffer gbStmtStr = new StringBuffer();
      boolean groupByNeeded = false;
      String sep = " ";
      ArrayList<BindingItem> bItems = new ArrayList<BindingItem>();
      for (int bi = 0; bi < biSet.getLength(); bi++) {
        Element bindingItemElem = (Element) biSet.item(bi);
        BindingItem bindingItem = createBindingItem(bindingItemElem, bs);
        bs.putItem(bindingItem);
        
        // Set bnd:BindingSet/bnd:C/@skipStartupRead=true to skip the reading here. All values are default then (like VARCHAR), except given in bs:BindingSet/bs:C 
        if( !"true".equals(bindingItemElem.getAttribute("skipStartupRead") )) {

          stmtStr.append(sep).append(bindingItem.getQColumnExpression());
          sep = ", ";
  
          // In the special case of @aggr="none", there is an aggregation expected in the BindingItem's column expression
          // For these, we need a dummy group by over all other columns. When there is no @aggr="none", we can drop this.
          if( ! "none".equals(bindingItem.getAggr()) ) {
            // Pure constant expressions (i.e. such that do not refer to a column) must not be part of group by (in sqlserver)
            if( BindingUtils.splitColumnExpression(bindingItem.getQColumnExpression(), bindingItem.isColumnQuoting(), bs).size()>1 ) {
              if( gbStmtStr.length() > 0 )
                gbStmtStr.append(", ");
              gbStmtStr.append(bindingItem.getQColumnExpression());
            }
          } else {
            groupByNeeded = true;
          }

          bItems.add(bindingItem);
        }
        
      }

      // We do a select on the table with all binding items to get their data types and also to check correctness
      // Their types derived from the request will only be used if not overwritten by the user in the definition
      stmtStr.append(" FROM ").append(tableName).append(" ").append(bs.getAliasName()).append(" WHERE 1=0 ");
      if( groupByNeeded )
        stmtStr.append(" GROUP BY ").append(gbStmtStr);
      Connection con = null;
      PreparedStatement pstmt = null;
      Statement stmt = null;
      ResultSet rs = null;
      try {
        log.trace("Initial check for BindingSet: '"+bs.getName()+"', at "+(dbSourceName.isEmpty()?"default":dbSourceName));

        // Don't use de.businesscode.bcdui.toolbox.Configuration instance here to avoid cyclic dependencies (Configuration itself uses Bindings to get parameters from database, etc)
        con = BareConfiguration.getInstance().getUnmanagedDataSource(dbSourceName).getConnection();
        pstmt = con.prepareStatement(stmtStr.toString());
        ResultSetMetaData rsmd = null;
        try {
          rsmd = pstmt.getMetaData();
        } catch (Exception ee) {
          // ojdbc14 does not support preparedStmt getMetaData
          stmt = con.createStatement();
          rs = stmt.executeQuery(stmtStr.toString());
          rsmd = rs.getMetaData();
        };

        // Loop over the BindingItems we just test-loaded from the database and set yet undefined attributes
        for (int pos= 1; pos <= bItems.size(); pos++) {

          BindingItem bi = bItems.get(pos-1);
          if(!bi.isDefinedJDBCDataType())
            bi.setJDBCDataType(rsmd.getColumnType(pos));
          if(bi.getJDBCColumnDisplaySize()==null)
            bi.setJDBCColumnDisplaySize(rsmd.getColumnDisplaySize(pos));
          if(bi.getJDBCColumnScale()==null){
            int scale= rsmd.getScale(pos);
            /* bugfix (oracle: returns -127 in case of non-applicable scale, breaks JDBC spec): caused issue in Sylk creator / de.businesscode.bcdui.wrs.export.ExcelSylkTemplate */
            if(scale<0)scale=0;
            bi.setJDBCColumnScale(scale);
          }if(bi.getJDBCNullable()==null)
            bi.setJDBCNullable(rsmd.isNullable(pos));
          if(bi.getJDBCSigned()==null)
            bi.setJDBCSigned(rsmd.isSigned(pos));
        }
      } catch (Exception e) {
        // Mostly this will be non-existing columns or invalid column expressions
        // We log these, but we continue to see whether there are more errors
        log.error("BindingSet '"+bsName+"': "+e);
      } finally {
        try {
          if(rs!=null) rs.close();
          if(stmt!=null)stmt.close();
          if(pstmt!=null)pstmt.close();
          if(con!=null)con.close();
        } catch( Exception e) {
          log.error(e,e);
        }
      }

      // Parse WrqModifiers
      final NodeList wrqModifiers = (NodeList) xPath.evaluate("/" + xPathNS + "BindingSet//" + xPathNS + "WrqModifiers/" + xPathNS + "WrqModifier/@className", bindingDoc, XPathConstants.NODESET);
      for( int i=0; i<wrqModifiers.getLength(); i++ )
      {
        bs.addWrqModifier(wrqModifiers.item(i).getNodeValue());
      }
      
      {
        // parse SubjectSettings
        // we need to search BindingSet// because when SubjectSettings are in an included file, there is an extra BindingInclude level in between
        final Node subjectSettings = (Node) xPath.evaluate("/" + xPathNS + "BindingSet//" + xPathNS + "SubjectSettings", bindingDoc, XPathConstants.NODE);
        if(subjectSettings != null){

          // parse subject filters
          {

            Node subjectFiltersNode = (Node) xPath.evaluate(xPathNS + "SubjectFilters", subjectSettings, XPathConstants.NODE);
            if(subjectFiltersNode != null){
              bs.setSubjectFilters(SubjectFilters.parse(subjectFiltersNode));
            }
          }

          // parse Security
          {
            NodeList opSet = (NodeList) xPath.evaluate(xPathNS + "Security/" + xPathNS + "Operation", subjectSettings, XPathConstants.NODESET);

            if(opSet!=null&&opSet.getLength()>0){
              Security sec = new Security();
              for (int i=0;i<opSet.getLength();i++) {
                Element elem = (Element) opSet.item(i);
                Security.Operation op = new Security.Operation();
                sec.getOperation().add(op);

                op.setName(elem.getAttribute("name").trim());
                op.setPermission(elem.getAttribute("permission").trim());
              }
              bs.setSecurity(sec);
              if(log.isTraceEnabled()){
                StringBuilder sb = new StringBuilder();
                sb.append("operations# " + sec.getOperation().size());
                for(Operation op : sec.getOperation()){
                  sb.append(" op: ");
                  sb.append(op.getName());
                  sb.append("; perm: ");
                  sb.append(op.getPermission());
                }
                log.trace("Security set for the binding " + bs.getName() + ", " + sb.toString());
              }
            }
          }
        }
      }

      {// relations
        NodeList relations = (NodeList) xPath.evaluate("/" + xPathNS + "BindingSet//" + xPathNS + "Relation", bindingDoc, XPathConstants.NODESET);
        if (relations != null && relations.getLength() > 0) {
          for (int rel = 0; rel < relations.getLength(); rel++) {
            Relation cRel = new Relation((Element) relations.item(rel), bs);
            cRel.setId(cRel.getRightBindingSetName() + "_" + rel);
            bs.addRelation(cRel);
          }
        }
      }

      { // WriteProcessing
        NodeList preProcessStylesheets = (NodeList) xPath.evaluate("/" + xPathNS + "BindingSet//" + xPathNS + "WriteProcessing/" + xPathNS + "PreProcessStylesheets/" + xPathNS + "PreProcessStylesheet", bindingDoc, XPathConstants.NODESET);
        if (preProcessStylesheets != null) {
          for (int i = 0; i < preProcessStylesheets.getLength(); i++) {
            // TODO impl
          }
        }

        // Listeners
        NodeList callbacks = (NodeList) xPath.evaluate("/" + xPathNS + "BindingSet//" + xPathNS + "WriteProcessing/" + xPathNS + "Callbacks/" + xPathNS + "Callback", bindingDoc, XPathConstants.NODESET);
        if(callbacks != null && callbacks.getLength()>0){
          if(log.isDebugEnabled()){
            log.debug("callbacks found: " + Integer.toString(callbacks.getLength()));
          }
          for (int i = 0; i < callbacks.getLength(); i++) {
            Element callbackEl = (Element)callbacks.item(i);
            try {
              WriteProcessingCallbackFactory fac = new WriteProcessingCallbackFactory(callbackEl.getAttribute("class"));
              // read params
              fac.setParams(WriteProcessingCallbackParams.parse(callbackEl));
              // attach
              bs.getWriteProcessing().addWriteProcessingCallbackFactory(fac);
            } catch (ClassNotFoundException e) {
              throw new BindingException("failed to register WriteProcessing callback", e);
            }
          }
        }
      }
    }
  }

  /**
   *
   * @param bindingItemElem
   * @return new BindingItem
   * @throws IOException
   * @throws NoSuchFieldException
   * @throws IllegalAccessException
   * @throws SecurityException
   * @throws IllegalArgumentException
   */
  protected BindingItem createBindingItem(Element bindingItemElem, StandardBindingSet pBindingSet) throws IOException, IllegalArgumentException, SecurityException, IllegalAccessException, NoSuchFieldException {
    try {
      NodeList columnElements = bindingItemElem.getElementsByTagNameNS(BINDINGS_NAMESPACE, "Column");
      String column = columnElements.item(0).getTextContent().trim();
      BindingItem bItem = null;

      String name = bindingItemElem.getAttribute("id");

      boolean columnQuoting = false;
      if (bindingItemElem.hasAttribute("columnQuoting")) {
        columnQuoting = bindingItemElem.getAttribute("columnQuoting").equals("true") ? true : false;
      }

      if (bindingItemElem.hasAttribute("type")) {
        bindingItemElem.getAttribute("type");
      }

      bItem = new BindingItem(name, column, columnQuoting, pBindingSet);
      if (bindingItemElem.hasAttribute(Bindings.jdbcDataTypeNameAttribute)) {
        bItem.setJDBCDataTypeName(bindingItemElem.getAttribute(Bindings.jdbcDataTypeNameAttribute));
      }
      if (bindingItemElem.hasAttribute(Bindings.jdbcColumnDisplaySizeAttribute)) {
        bItem.setJDBCColumnDisplaySize(Integer.valueOf(bindingItemElem.getAttribute(Bindings.jdbcColumnDisplaySizeAttribute)));
      }
      if (bindingItemElem.hasAttribute(Bindings.jdbcColumnScaleAttribute)) {
        bItem.setJDBCColumnScale(Integer.valueOf(bindingItemElem.getAttribute(Bindings.jdbcColumnScaleAttribute)));
      }
      if (bindingItemElem.hasAttribute(Bindings.jdbcSignedAttribute)) {
        bItem.setJDBCSigned(Boolean.valueOf(bindingItemElem.getAttribute(Bindings.jdbcSignedAttribute)));
      }
      if (bindingItemElem.hasAttribute(Bindings.jdbcNullableAttribute)) {
        bItem.setJDBCNullable(Integer.valueOf(bindingItemElem.getAttribute(Bindings.jdbcNullableAttribute)));
      }
      if (bindingItemElem.getAttribute(Bindings.keyAttributeName).length() > 0)
        bItem.setKey(Boolean.parseBoolean(bindingItemElem.getAttribute(Bindings.keyAttributeName)));
      else
        bItem.setKey(false);

      if (bindingItemElem.getAttribute(Bindings.readOnlyAttributeName).length() > 0)
        bItem.setReadOnly(Boolean.parseBoolean(bindingItemElem.getAttribute(Bindings.readOnlyAttributeName)));
      else
        bItem.setReadOnly(false);
      if (bindingItemElem.getAttribute(Bindings.aggrAttribute).length() > 0)
        bItem.setAggr(bindingItemElem.getAttribute(Bindings.aggrAttribute));

      // References
      NodeList nList = bindingItemElem.getElementsByTagNameNS(WRS_NAMESPACE, "References");
      if (nList.getLength() > 0) {
        bItem.setReferences(Utils.serializeElement((Element) nList.item(0)));
        nList = null;
      }

      // DisplayFormat
      nList = bindingItemElem.getElementsByTagNameNS(BINDINGS_NAMESPACE, "DisplayFormat");
      if (nList.getLength() > 0) {
        bItem.setDisplayFormat(Utils.serializeElement((Element) nList.item(0)));
        nList = null;
      }

      // caption
      String caption = bindingItemElem.getAttribute("caption");
      bItem.setCaption(caption);

      // escapeXML
      if (bindingItemElem.getAttribute(Bindings.escapeXmlAttributeName).length() > 0)
        bItem.setEscapeXML(Boolean.parseBoolean(bindingItemElem.getAttribute(Bindings.escapeXmlAttributeName)));
      else
        bItem.setEscapeXML(true);

      // custom attributes
      NamedNodeMap atts = bindingItemElem.getAttributes();
      for(int i=0,imax=atts.getLength();i<imax;i++){
        Node att = atts.item(i);
        if(att.getNodeType() != Node.ATTRIBUTE_NODE){
          continue;
        }
        if(StandardNamespaceContext.CUST_NAMESPACE.equals(att.getNamespaceURI())){
          bItem.getCustomAttributesMap().put(att.getLocalName(), att.getNodeValue());
          pBindingSet.setHasCustomItem(true);
        }
      }

      return bItem;
    }
    catch (TransformerException te) {
      throw new IOException("error caught while processing BindingSet #" + pBindingSet.getName(), te);
    }
  }
}
