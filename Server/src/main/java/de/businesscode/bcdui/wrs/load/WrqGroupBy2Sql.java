/*
  Copyright 2010-2021 BusinessCode GmbH, Germany

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

/**
 * Parses a wrq:WrsRequest//wrq:Grouping element and returns a sql GROUP BY [GROUPING SET] expression
 * Initially taken from WrsSqlGenerator. For older change history, see there
 */
public class WrqGroupBy2Sql
{
  private final WrqInfo wrqInfo;
  private GroupBy groupBy = null;

  public WrqGroupBy2Sql(WrqInfo wrqInfo)
  {
    this.wrqInfo = wrqInfo;
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

    // ANSI (sub)total calculations
    // Column children are just printed as their column expressions. They become part of each grouping set
    for( Iterator<String> bRefIt = groupBy.bRefs.iterator(); bRefIt.hasNext(); ) {
      WrqBindingItem bi = wrqInfo.getAllBRefs().get(bRefIt.next());
      if( bi.hasAColumnReference() ) { // Complete constant expressions are not allowed in group-by for some databases, skip them here
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
        if( bi.hasAColumnReference() )
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
          if( bi.hasAColumnReference() )
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
