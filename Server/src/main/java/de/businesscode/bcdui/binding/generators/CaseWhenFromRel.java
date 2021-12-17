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

import java.io.StringWriter;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Map;

import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import javax.xml.xpath.XPathExpressionException;

import org.apache.log4j.Level;
import org.apache.log4j.Logger;
import org.w3c.dom.Comment;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.StandardBindingSet;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.binding.rel.ImportItem;
import de.businesscode.bcdui.binding.rel.Relation;
import de.businesscode.bcdui.toolbox.config.BareConfiguration;
import de.businesscode.util.jdbc.Closer;
import de.businesscode.util.jdbc.wrapper.BcdSqlLogger;
import de.businesscode.util.xml.SecureXmlFactory;

/**
 * This class is used to convert suitable bnd:Relation nodes from a BindingSet to CASE expressions.
 * If a relation with attribute bnd:Relation/@toCaseExpression=true is found, the actual values of the relation are read from database and converted into a case statement for the join column
 * Result is a BindingSet DOM document, where bnd:Column expressions with CASE replace the original (and removed) join bnd:Relation
 * This result is then handed over to the regular BindingSet parsing (our parent class's run())
 */
public class CaseWhenFromRel extends ReadBindingSet {
  private final Logger log = Logger.getLogger( getClass());

  public CaseWhenFromRel( Document bindingDoc, String fileName, Map<String, Collection<StandardBindingSet>> bindingMap) {
    super( bindingDoc, fileName, bindingMap);
  }

  @Override
  public void run() {
    try{
      BcdSqlLogger.setLevel(Level.TRACE);
      // Replaces suitable Relation nodes from instance variable bindingDoc with CASE expressions.
      if (convert())
        super.run();
    } finally{
      BcdSqlLogger.reset();
    }
  }

  private boolean convert() {
    boolean converted = false;
    try {
      // Take all Relation nodes potentially qualified for a conversion to CASE expressions.
      NodeList relations = bindingDoc.getElementsByTagNameNS( BINDINGS_NAMESPACE, "Relation");
      if ( relations != null && relations.getLength() > 0) {
        for ( int i = 0, len = relations.getLength(); i < len; i++) {
          Relation rel = new Relation( (Element) relations.item( i), bindingDoc.getDocumentElement().getAttribute( "id"));
          if ( ( (Element) relations.item( i)).getAttribute( "toCaseExpression").equals( "true")) {
            // A Relation node can only be replaced when it is no 'inner join'.
            if ( rel.isLeftOuter() || rel.isRightOuter() ) {
              // If NULL, the configured default database will be used later.
              String dbSourceName = bindingDoc.getDocumentElement().getAttribute( "dbSourceName");

              // Only if the "right" table is populated the currently regarded Relation node is replaced by CASE expressions.
              // Furthermore, it is assumed that no table rows would have been multiplied by the join.
              StringBuffer stmtStr = new StringBuffer( "SELECT COUNT(*) FROM ").append( rel.getSourceBindingSet().getTableName());

              Connection con = null;
              Statement stmt = null;
              ResultSet   rs = null;

              try {
                con = BareConfiguration.getInstance().getUnmanagedDataSource( dbSourceName).getConnection();
                stmt = con.createStatement();
                rs = stmt.executeQuery( stmtStr.toString());

                rs.next();
                // Store the number of data values, ie, the number of WHEN branches of the CASE expression to be generated.
                int rows = rs.getInt( 1);

                // Only if the "right" table is populated the currently regarded Relation node is replaced by CASE expressions.
                if ( rows > 0) {
                  bindingDoc.getDocumentElement().setAttribute( "isGenerated", "true");

                  // Insert the original Relation node as a comment into the BindingSet.
                  Transformer t = SecureXmlFactory.newTransformerFactory().newTransformer();
                  t.setOutputProperty( OutputKeys.OMIT_XML_DECLARATION, "yes");
                  StringWriter sw = new StringWriter();
                  t.transform( new DOMSource( relations.item( i)), new StreamResult( sw));
                  // Creates a Comment node, even if the given string includes the "--" (double-hyphen) as
                  // part of the data and it does not need to be escaped or have its exception caught.
                  Comment comment = bindingDoc.createComment( sw.toString());
                  relations.item( i).getParentNode().insertBefore( comment, relations.item( i));

                  String bsName = rel.getSourceBindingSet().getName();
                  BindingSet bs = Bindings.getInstance().get( bsName);

                  // For each ImportItem of the Relation node a CASE expression is generated.
                  ArrayList<ImportItem> importItems = rel.getImportItems();
                  for ( ImportItem iItem : importItems) {
                    Element c = bindingDoc.createElementNS( BINDINGS_NAMESPACE, "C");
                    // The ImportItem always has exactly one child node.
                    Map<String, Object> attrs = bs.get( iItem.getChildColumnItem().get( 0).getName()).getAttributes();
                    for ( Map.Entry<String, Object> entry : attrs.entrySet()) {
                      c.setAttribute( entry.getKey(), entry.getValue().toString());
                    }
                    // It can be assumed that always exactly one Imports node per Relation node exist.
                    if ( !rel.getImports().get( 0).isDefautImport()) {
                      c.setAttribute( "id", iItem.getName());
                    }
                    Element col = bindingDoc.createElementNS( BINDINGS_NAMESPACE, "Column");

                    // Replace all columns from the "right" table in the join-condition by their values.
                    String condition = rel.getConditionStatement( bs.getAliasName());

                    // Remove all aliases of columns from the "left" table in the join-condition.
                    condition = condition.replaceAll( "t[\\d]+\\.", "");

                    // The following SQL statement returns the single WHEN branches of the CASE expression to be generated.
                    stmtStr = new StringBuffer( "SELECT 'WHEN ").append( condition.replace("''' ||", "#bcd#' ||").replace("|| '''", "|| '#bcd#")  );


                    boolean isNumeric = bs.get( iItem.getChildColumnItem().get( 0).getName()).isNumeric();
                    if ( isNumeric ) {
                      stmtStr.append( " THEN ' || ").append( bs.get( iItem.getChildColumnItem().get( 0).getName()).getColumnExpression()).append( " Q FROM ");
                    } else {
                      stmtStr.append( " THEN #bcd#' || ").append( bs.get( iItem.getChildColumnItem().get( 0).getName()).getColumnExpression()).append( " || '#bcd#' Q FROM ");
                    }
                    stmtStr.append( rel.getSourceBindingSet().getTableName());
                    stmtStr.append(" ORDER BY Q");

                    Closer.closeAllSQLObjects(rs);
                    rs = stmt.executeQuery( stmtStr.toString());

                    rs.next();
                    // Create the CASE expression from the result set. There is at least one WHEN branch.
                    StringBuffer case_expr = new StringBuffer( "CASE ").append( rs.getString( 1).replaceAll("'", "''").replaceAll("#bcd#", "'"));

                    while ( rs.next()) {
                      // After one hundred WHEN branches a new CASE expression is started. The first row
                      // is number 1, the second number 2, and so on.
                      if ( ( rs.getRow() % 100) == 1) {
                        case_expr.append( " ELSE CASE");
                      }
                      case_expr.append( " ").append( rs.getString( 1).replaceAll("'", "''").replaceAll("#bcd#", "'"));
                    }

                    for ( int j = 0; j <= ( ( rows - 1) / 100); j++) {
                      case_expr.append( " END");
                    }

                    // Add the newly created C node to the BindingSet.
                    col.setTextContent( case_expr.toString());
                    c.appendChild( col);
                    relations.item( i).getParentNode().insertBefore( c, relations.item( i));
                  }
                  // After CASE expressions were generated for all imported columns from the "right" table
                  // and added to the BindingSet, the Relation node can be removed from the BindingSet.
                  relations.item( i).getParentNode().removeChild( relations.item( i));
                  i--; len--;
                  converted = true;
                  // For debugging purposes the converted BindingSet is output to the console.
                  log.debug( "The Relation node with BindingSet " + rel.getRightBindingSetName() + " of file "
                      + fileName + " was replaced.");
                } else {
                  log.warn( "The Relation node with BindingSet " + rel.getRightBindingSetName() + " of file "
                      + fileName + " was not replaced, because the \"right\" table is empty.");
                }
              } catch ( Exception e) {
                log.warn( "The Relation node with BindingSet " + rel.getRightBindingSetName() + " of file "
                    + fileName + " was not replaced, because the number of data values could not be determined.");
              } finally {
                Closer.closeAllSQLObjects(rs,stmt,con);
              }
            } else {
              log.warn( "The Relation node with BindingSet " + rel.getRightBindingSetName()
                  + " of file " + fileName + " cannot be replaced, because it is an 'inner join'.");
            }
          }
        }
      }
    } catch ( BindingException e) { log.error( e, e); } catch ( XPathExpressionException e) { log.error( e, e); }
    return converted;
  }
}
