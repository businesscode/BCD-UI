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
package de.businesscode.bcdui.wrs.load;

import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.SortedSet;
import java.util.TreeSet;

import javax.xml.xpath.XPathExpressionException;

import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import de.businesscode.bcdui.wrs.load.WrqGroupBy2Sql.GroupBy.GroupingFct;
import de.businesscode.bcdui.wrs.load.WrqGroupBy2Sql.GroupBy.GroupingFct.GroupingSet;
import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.jdbc.DatabaseCompatibility;

/**
 * Parses a wrq:WrsRequest//wrq:Grouping element and returns a sql GROUP BY [GROUPING SET] expression
 * Initially taken from WrsSqlGenerator. For older change history, see there
 */
public class WrqGroupBy2Sql
{
  private final WrqInfo wrqInfo;
  private GroupBy groupBy = null;

  public WrqGroupBy2Sql(WrqInfo wrqInfo) throws XPathExpressionException
  {
    this.wrqInfo = wrqInfo;
  }

  public boolean hasTotals() {
    return !groupBy.groupingFcts.isEmpty();
  }

  /**
   * @return GROUP BY clause or empty String
   * Initially taken from WrsSqlGenerator. For older change history see there
   */
  protected StringBuffer generateGroupingClause(List<Element> boundVariables  )
      throws Exception
  {
    StringBuffer sql = new StringBuffer();

    // Loop over Grouping's child nodes, can be columns or grouping functions
    groupBy = new GroupBy(wrqInfo);
    String sep = "";

    // MySql only knows a custom "WITH ROLLUP" expression appended to GROUP BY. It does not support ANSI GROUPING SETS nor ROLLUP
    // It is less fine grained that what wrq:Grouping supports, but better than nothing for now
    if( !groupBy.groupingFcts.isEmpty() && DatabaseCompatibility.getInstance().dbOnlyKnowsWithRollup(wrqInfo.getResultingBindingSet()) ) 
    {
      // We need to make sure the group by columns are in the order of the select columns to get the right (sub)totals.
      // Order matters here, since MySql does not support columns in ROLLUP as ANSI does
      // The ANSI oriented wrq:Grouping does not tell us the order and may even asked for slightly different (sub)totals
      // This is the best we can do for now
      LinkedHashSet<String> selectedBRefs = wrqInfo.getFullSelectListBRefs();
      for( Iterator<String>bRefIt = selectedBRefs.iterator(); bRefIt.hasNext(); ) {
        String biId = bRefIt.next();
        if( wrqInfo.getGroupingBRefs().contains(biId) ) {
          WrqBindingItem bi = wrqInfo.getAllBRefs().get(biId);
          sql.append( sep+bi.getQColumnExpression() );
          sep = ", ";
        }
      }
      return new StringBuffer(" GROUP BY ").append( sql ).append(" WITH ROLLUP ");
    }

    // ANSI (sub)total calculations
    // Column children are just printed as their column expressions. They become part of each grouping set
    for( Iterator<String> bRefIt = groupBy.bRefs.iterator(); bRefIt.hasNext(); ) {
      WrqBindingItem bi = wrqInfo.getAllBRefs().get(bRefIt.next());
      if( bi.hasAColumReference() ) { // Complete constant expressions are not allowed in group-by for some databases, skip them here
        sql.append( sep+bi.getQColumnExpression() );
        sep = ", "; // From now on, prepend a colon
      }
    }

    for( Iterator<GroupingFct> gBfIt = groupBy.groupingFcts.iterator(); gBfIt.hasNext(); )
    {
      GroupingFct groupingFct = gBfIt.next();

      // Print grouping a function with its child columns and sets
      // The following line prevents SQL injection by only allowing predefined strings here
      String groupingFunctionName = GroupByFunctions.valueOf(groupingFct.name).toString();

      // Nicer to collects distinct columns sets (works at least if in same order, but that should be mostly be)
      SortedSet<String> sets = new TreeSet<String>();
      for( Iterator<String> bRefIt = groupingFct.bRefs.iterator(); bRefIt.hasNext(); ) {
        WrqBindingItem bi = wrqInfo.getAllBRefs().get(bRefIt.next()); 
        if( bi.hasAColumReference() )
          sets.add(bi.getQColumnExpression());
      }

      for( Iterator<GroupingSet> gSfIt = groupingFct.groupingSets.iterator(); gSfIt.hasNext(); )
      {
        StringBuffer setColumns = new StringBuffer();
        GroupingSet groupingSet = gSfIt.next();
        for( Iterator<String> bRefIt = groupingSet.bRefs.iterator(); bRefIt.hasNext(); ) {
          WrqBindingItem bi = wrqInfo.getAllBRefs().get(bRefIt.next());
          if( setColumns.length()>0 )
            setColumns.append(", ");
          if( bi.hasAColumReference() )
            setColumns.append(bi.getQColumnExpression());
        }
        sets.add(" ( "+setColumns+" ) ");
      }
      if( !sets.isEmpty() ) {
        sql.append( sep+groupingFunctionName+" ( ");
        Iterator<String> setIt = sets.iterator();
        String setSep = "";
        while( setIt.hasNext() ) {
          sql.append( setSep+setIt.next() );
          setSep = ", ";
        }
        sql.append(" ) ");
        sep = ", ";
      }
    } // end grouping function
    if( sql.length()>0 )
      return new StringBuffer(" GROUP BY ").append( sql );
    else
      return new StringBuffer();
  }

  /**
   * Optional group by functions
   */
  private enum GroupByFunctions {
    ROLLUP      ( "ROLLUP" ),
    GROUPINGSETS( "GROUPING SETS" );

    protected String name;
    private GroupByFunctions( String p ) {
      this.name = p;
    }
    public String toString() {
      return name;
    }
  }

  /**
   * Java structure representing the GROUP BY information
   */
  class GroupBy
  {
    protected final LinkedHashSet<String> bRefs = new LinkedHashSet<String>();
    protected final LinkedHashSet<GroupingFct> groupingFcts = new LinkedHashSet<GroupingFct>();

    // XML wrq:Wrq constructor
    protected GroupBy( WrqInfo wrqInfo ) throws XPathExpressionException
    {
      NodeList childNodes = wrqInfo.getGroupingChildNode();
      for (int i = 0; i <childNodes.getLength(); i++) {
        Element elem = (Element)childNodes.item(i);

        if( elem.getLocalName().equals("C") )
          bRefs.add(elem.getAttribute("bRef"));
        else
          groupingFcts.add( new GroupingFct(elem) );
      }
    }

    class GroupingFct
    {
      protected String name;
      protected final LinkedHashSet<String> bRefs = new LinkedHashSet<String>();
      protected final LinkedHashSet<GroupingSet> groupingSets = new LinkedHashSet<GroupingSet>();

      // XML wrq:Wrq constructor
      protected GroupingFct( Element elem )
      {
        name = elem.getLocalName().toUpperCase();
        for( int col=0; col<elem.getChildNodes().getLength(); col++ ) {
          if( elem.getChildNodes().item(col).getNodeType()!=Node.ELEMENT_NODE )
            continue;
          Element child = (Element)elem.getChildNodes().item(col);

          if( child.getLocalName().equals("C") )
            bRefs.add( ((Element)child).getAttribute("bRef") );
          else if( child.getLocalName().equals("Set") )
            groupingSets.add( new GroupingSet(child) );
        }
      }

      protected class GroupingSet
      {
        protected final LinkedHashSet<String> bRefs = new LinkedHashSet<String>();

        // XML wrq:Wrq constructor
        protected GroupingSet( Element elem )
        {
          NodeList children = elem.getElementsByTagNameNS(StandardNamespaceContext.WRSREQUEST_NAMESPACE, "C");
          for(int c=0; c<children.getLength(); c++ )
            bRefs.add(((Element)children.item(c)).getAttribute("bRef"));
        }
      }
    }
  }
}
