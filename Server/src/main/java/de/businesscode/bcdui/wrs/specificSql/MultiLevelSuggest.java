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
package de.businesscode.bcdui.wrs.specificSql;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.LinkedList;
import java.util.List;
import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpression;
import javax.xml.xpath.XPathExpressionException;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.wrs.IRequestOptions;
import de.businesscode.bcdui.wrs.load.BindingItemWithMetaData;
import de.businesscode.bcdui.wrs.load.SQLStatementWithParams;
import de.businesscode.bcdui.wrs.load.BindingItemAttribute;
import de.businesscode.sqlengine.SQLEngine;
import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.XPathUtils;

/**
 * Receives a Dimension definition and a string with space separated search words
 * Supports '/' as level separators
 */
public class MultiLevelSuggest extends AbstractSqlGenerator
{
  private final XPath xp = XPathUtils.newXPathFactory().newXPath();
  private final Element wrq; // Root of the query doc
  private final List<String> selectList = new LinkedList<String>();
  boolean useCaption = false;

  /**
   * We are initialized for each request
   * @param options
   * @throws Exception
   */
  public MultiLevelSuggest(IRequestOptions options)
      throws Exception
  {
    super();
    wrq = options.getRequestDoc().getDocumentElement();

    //--------------------------------------
    // Read parts of search expression. A levelSeparator triggers going one search level down
    // Which search level applies to which data levels(!) depends on its position and the number search levels in relation to the number of data levels
    // First lets split by levels
    String levelSeparator = null;
    String filter = "";
    NodeList filterNodes = wrq.getElementsByTagNameNS( StandardNamespaceContext.WRSREQUEST_NAMESPACE, "SearchExpression" );
    if( filterNodes.getLength()>0 ) {
      Element elem = (Element)filterNodes.item(0);
      if( elem.getAttribute("value") != null )
        filter = elem.getAttribute("value");
      useCaption = "true".equals( elem.getAttribute("useCaption") );
      levelSeparator = elem.getAttribute("levelSeparator").isEmpty() ? null : elem.getAttribute("levelSeparator");
      if( "\\.[]{}()*+-?^$|".contains(levelSeparator) )
        levelSeparator = "\\"+levelSeparator;
    }

    // Read the hierarchy of each level (i.e. evaluate the <Requires> information of each level)
    ArrayList<Level> dataLevels = new ArrayList<Level>();
    NodeList levelNodes = wrq.getElementsByTagName("Level");
    for( int l=0; l<levelNodes.getLength(); l++ ) {
      Level hierarchy = new Level((Element)levelNodes.item(l));
      dataLevels.add(hierarchy);
    }
    final int numOfDataLevels = dataLevels.size();

    // Each element holds the search word for a search level as defined by levelSeparator or only string if levelSeparator is not given
    ArrayList<String> searchLevelsString = levelSeparator != null
        ? new ArrayList<String>( Arrays.asList((" "+filter+" ").split(levelSeparator)) ) : new ArrayList<String>( Arrays.asList(" "+filter+" ") );

    if( searchLevelsString.size() >  numOfDataLevels )
      searchLevelsString = new ArrayList<String>( Arrays.asList(" "+filter.replaceAll(levelSeparator+"[^ "+levelSeparator+"]*", " ")+" ") );

    // Each search level is now split by word
    ArrayList<ArrayList<String>> searchLevels = new ArrayList<ArrayList<String>>();
    for( String lF: searchLevelsString ) {
      ArrayList<String> searchWordsOfOneLevel = new ArrayList<String>( Arrays.asList(lF.split(" |,")) );
      searchWordsOfOneLevel.replaceAll(String::trim);
      searchWordsOfOneLevel.removeIf(String::isEmpty);
      if( !filter.trim().isEmpty() )
        searchLevels.add(searchWordsOfOneLevel);
    }
    final int numOfSearchLevels = searchLevels.size();

    String wrqBindingSetId = ((Element)wrq.getElementsByTagName("Dimension").item(0)).getAttribute("bindingSet");
    StringBuffer sqlSB = new StringBuffer( "#set( $k = $bindings."+wrqBindingSetId+" )" );

    // Read each level and UNION all levels together, order is controlled by selectList
    for( int currentDataLevel=0; currentDataLevel<numOfDataLevels; currentDataLevel ++)
    {
      Level dataLevel = dataLevels.get(currentDataLevel);

      if( dataLevel.bRefs.size() < numOfSearchLevels )
        continue;

      // Select list
      sqlSB.append("\nSELECT ");

      // Read the data as individual fields
      boolean isFirst = true;
      Iterator<String> sLIt = selectList.iterator();
      while( sLIt.hasNext() )
      {
        String bRef = sLIt.next();

        final String sqlBRef = dataLevel.bRefs.contains(bRef) ? "$k."+bRef : " NULL ";
        sqlSB.append("\n  CAST (").append(sqlBRef).append(" AS VARCHAR(256)) AS ").append(bRef);

        if( isFirst ) {
          sqlSB.append(", '").append(dataLevel.caption).append("' as multiLevelCaption");
          isFirst = false;
        }

        if( useCaption ) {
          sqlSB.append(", ");
          final String sqlCaptionBRef = dataLevel.bRefs.contains(bRef) ? "$k."+getCaptionBRef(bRef) : " NULL ";
          sqlSB.append("CAST (").append(sqlCaptionBRef).append(" AS VARCHAR(256)) AS ").append(getCaptionBRef(bRef));
        }

        if( sLIt.hasNext() )
          sqlSB.append(", ");
      }
      sqlSB.append("\n  FROM $k.tableName ");

      // WHERE, search for all search words in the bRefs belonging to this level
      sqlSB.append("\n  WHERE $k.").append(dataLevel.bRefs.get(dataLevel.bRefs.size()-1)).append(" IS NOT NULL ");

      // All filters are applied, but not to each column, see below
      for( int searchLevelIdx = 0; searchLevelIdx < numOfSearchLevels; searchLevelIdx++ )
      {
        // Loop over the search words of a user-level, i.e. between / and /
        Iterator<String> searchWordsIt = searchLevels.get(searchLevelIdx).iterator();

        while( searchWordsIt.hasNext() )
        {
          sqlSB.append(" AND (");
          String searchWord = searchWordsIt.next();

          // We do not search all search levels expression in each data level
          // If for example there is one more search level to come, we do not search the last data level for this last-but-one search level
          // If for example there are still search-level defined by the user, we do not check the last two bRefs but leave them for the lower levels
          // We start at the same data level index as the search level is reached
          // We stop when there are as many data levels as still search levels to come
          int maxFilterLevel = Math.min((dataLevel.bRefs.size()-1) - ((numOfSearchLevels-1) - searchLevelIdx), currentDataLevel);
          for( int k=searchLevelIdx; k<= maxFilterLevel; k++ ) {
            if( filter.length() <= 2 )
              sqlSB.append(" LOWER($k.").append(getCaptionBRef(dataLevel.bRefs.get(k))).append(") = '").append(searchWord.toLowerCase()).append("' ");
            else
              sqlSB.append(" ' '||LOWER($k.").append(getCaptionBRef(dataLevel.bRefs.get(k))).append(") like '% ").append(searchWord.toLowerCase()).append("%' ");
            if( k < maxFilterLevel )
              sqlSB.append(" OR ");
          }
          sqlSB.append(")");
        }
      }

      // GROUP BY bRefs of this level
      sqlSB.append("\n  GROUP BY ");
      Iterator<String> levelBRefs = dataLevel.bRefs.iterator();
      while( levelBRefs.hasNext() ) {
        String bRef = levelBRefs.next();
        sqlSB.append(" $k.").append(bRef);
        if( useCaption ) {
          sqlSB.append(", ");
          sqlSB.append(" $k.").append(getCaptionBRef(bRef));
        }
        if( levelBRefs.hasNext() )
          sqlSB.append(", ");
      }

      // If the filter is empty, we only return the first given level
      if( numOfSearchLevels == 0 )
        break;

      // Connect to next level
      if( currentDataLevel<dataLevels.size()-1 )
        sqlSB.append("\nUNION ALL");
    };

    // Convert the bcdui-sql into a plain sql with BindingSet and BindingItems translated to table/view and columns
    SQLEngine sqlE = new SQLEngine();
    String sql = sqlE.transform(sqlSB.toString());
    resultingBindingSet = sqlE.getResultingBindingSets().iterator().next();

    // The select list contains each level exactly once
    int colNr = 1;
    for( int selC = 0; selC < selectList.size(); selC++ ) {
      BindingItemWithMetaData bi = new BindingItemWithMetaData( resultingBindingSet.get(selectList.get(selC)), null, null);
      bi.setColumnNumber(colNr++);
      selectedBindingItems.add( bi );

      if( selC == 0 ) {
        BindingItemWithMetaData captionBi = new BindingItemWithMetaData(new BindingItem("multiLevelCaption", "bcdDummy_multiLevelCaption", false, resultingBindingSet), null, null);
        BindingItemAttribute captionBiWrsAttr = new BindingItemAttribute("multiLevelCaption", captionBi, null, null);
        captionBiWrsAttr.setColumnNumber(colNr++);
        bi.addWrsAAttribute(captionBiWrsAttr);
      }

      // Possibly we should also send the captions (as wrs:A)
      if( useCaption ) {
        BindingItemWithMetaData captionBi = new BindingItemWithMetaData(new BindingItem("caption", getCaptionBRef(selectList.get(selC)), false, resultingBindingSet), null, null);
        BindingItemAttribute captionBiWrsAttr = new BindingItemAttribute("caption", captionBi, null, null);
        captionBiWrsAttr.setColumnNumber(colNr++);
        bi.addWrsAAttribute(captionBiWrsAttr);
      }
    }

    selectStatementWithParams = new SQLStatementWithParams( sql , new LinkedList<Element>(), resultingBindingSet);
  }

  /**
   * Local helper
   * @param bRef
   * @return
   */
  private String getCaptionBRef( String bRef )
  {
    if( useCaption && bRef.endsWith("_code") )
      return bRef.substring(0, bRef.length()-5) + "_caption";
    else if( useCaption )
      return bRef+ "_caption";
    else
      return bRef;
  }

  @Override
  public int getMaxRows() {
    return 256;
  }

  /**
   * Object structure mirroring the level information
   * Each level knows a list levels required by it from top to down, derived recursively from the "requires" information in the dim document
   */
  class Level
  {
    final String caption;
    ArrayList<String> bRefs = new ArrayList<String>();

    Level( Element leaf ) throws XPathExpressionException
    {
      caption = leaf.getAttribute("caption");
      prependRequredBRef( leaf );
    }

    private void prependRequredBRef( Element elem ) throws XPathExpressionException
    {
      String bRef = elem.getAttribute("bRef");

      // Maintain the global select list
      if( !selectList.contains(bRef) )
        selectList.add(bRef);

      // Maintain this level
      bRefs.add(0, bRef);
      NodeList requires = elem.getElementsByTagName("Requires");
      if( requires.getLength()>0 ) {
        XPathExpression requiredXpathExpr = xp.compile("/*/Dimension/Level[@id='"+((Element)requires.item(0)).getAttribute("idRef")+"']");
        Element required = (Element)requiredXpathExpr.evaluate(wrq, XPathConstants.NODE);
        prependRequredBRef(required);
      }
    }
  }
}