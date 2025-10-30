/*
  Copyright 2010-2025 BusinessCode GmbH, Germany

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

import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Stream;

import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpression;
import javax.xml.xpath.XPathExpressionException;

import de.businesscode.util.jdbc.DatabaseCompatibility;
import org.w3c.dom.Attr;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.binding.exc.BindingNotFoundException;
import de.businesscode.bcdui.wrs.load.modifier.Modifier;
import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.XPathUtils;

/**
 * The worker companion of a SqlFromSubSelect. There is a 1:1 relationship between SqlFromSubSelect and WrqInfo
 * Collects knowledge about a single Select in a Wrq.
 * Understands the XM and acts as a POJOe worker for the more high-level SqlFromSubSelect class.
 * There is one WrqQueryBuilder per overall Wrq but one WrqInfo per Select. i.e., different ones on each level if there are sub-selects.
 * Initially taken from WrsSqlGenerator. For older change history see there
 */
public class WrqInfo
{
  private Element selectElem;
  private final Bindings bindings; // Not using Bindings.getInstance() but a parameter to allow using us in batch mode!
  
  private int columnNumber = 1;
  // The effective BindingSet, includes evaluation of a BindingSetGroup to find the right one
  private WrqBindingSet resultingBindingSet;
  // Maps all wrs:C/@bRef-@aggr and wrs:A @bRef-@aggr combinations to a BindingSetWithMetadata
  // This includes the select list of the ResultSet and all other places
  private Map<String,WrqBindingItem> allBRefAggrs;
  // Maps all wrs:C/@bRef and wrs:A @bRef combinations to a BindingSetWithMetadata (ignoring the @aggr)
  // This includes the select list of the ResultSet and all other places
  // These are allBFRefs that are referenced and come from and are resolved by our select
  private Map<String,WrqBindingItem> allBRefs;
  // These are above allBRefs plus those that are referenced in out select but resolved else where in the context.
  // For example, BindingItems in our Filter clause that belong to outer selects (i.e., we are a correlated sub-select)
  private Map<String,WrqBindingItem> allOuterContextBRefs;
  // Lists all wrs:C/@bRef and wrs:A/@bRef
  // This is to determine the tables (BindingSets) needed for the statement
  private Set<String> allRawBRefs;
  // All wrs:C/@bRef-@aggr and wrs:A/@bRef-@aggr combinations of the select list to a BindingSetWithMetadata
  // These are only those needed as the result of the ResultSet, the user selected once plus Grouping and Other
  private LinkedHashSet<String> fullSelectListBRefs;
  // All wrs:C/@bRef-@aggr and wrs:A/@bRef-@aggr combinations of the select list to a BindingSetWithMetadata
  // Does only include those asked for by the user explicitly
  private LinkedHashSet<String> userSelectListBRefs;
  // Each selected wrs:C element. this is also the only place where identical @bRef/@aggr combinations are listed twice
  // Each entry knows its wrs:C attributes but they are not listed here
  private LinkedList<WrqBindingItem> wrsCOnlySelectListBRefs;
  // Contains all bRefs which are part of the requested group-by
  private Set<String> groupingBRefs;
  private Set<String> havingBRefs;
  private LinkedHashSet<String> orderingBRefs = new LinkedHashSet<String>();
  // Keeps track of the virtual dimension members. Maps a bRef to a map of new names (i.e. content) of the data to the values mapped to this new name
  private Map<String,Map<String,Set<String>>> vdms = new HashMap<>();
  // This indicates whether this request uses a Grouping Function, for example grouping sets
  private boolean reqHasGroupingFunction = false;
  // If a bRef from select clause was mapped to a virtual binding item due to wrq:Calc, we note the mapping here
  private Map<String,String> virtualBRefs;
  private boolean reqHasGroupBy = false;

  int aliasCounter     = 1;
  int virtualBiCounter = 1;

  // Context for our query as we are created for each individual
  protected final SqlFromSubSelect currentSelect;

  private WrqGroupBy2Sql wrqGroupBy2Sql = null;

  // Here we collect all host variables in correct order (same as ? in generated statement), may be from wrq:Calc or f:Filter
  private SQLStatementWithParams fromSQLStatementWithParams = null;

  /**
   * Constructor from currentSelect as context and our wrq:Select element
   * @param currentSelect
   * @param selectElem
   * @throws Exception
   */
  public WrqInfo( SqlFromSubSelect currentSelect, Element selectElem ) throws Exception
  {
    try {
      xp = XPathUtils.newXPath();
      fromChildXpathExpr       =  xp.compile("./wrq:From/wrq:*");
      filterXpathExpr =           xp.compile("./f:Filter");
      groupByRootXpathExpr =      xp.compile("./wrq:Grouping");     // grouping columns or functions
      groupByChildrenXpathExpr =  xp.compile("./wrq:Grouping/wrq:*");     // grouping columns or functions
      groupByIndicatorXpathExpr=  xp.compile("./wrq:Grouping//wrq:Set | ./wrq:Grouping//wrq:C");     // indicates grouping query
      groupByFunctionXpathExpr =  xp.compile("./wrq:Grouping/wrq:*[not(self::wrq:C)]");  // grouping functions
      havingRootXpathExpr      =  xp.compile("./wrq:Having");  // having clause
      topNXPathExpr =             xp.compile("./wrq:TopNDimMembers");

      selectListCAXpathExpr =     xp.compile("./wrq:Columns//*[self::wrq:C | self::wrq:A]");
      groupingCXpathExpr    =     xp.compile("./wrq:Grouping//wrq:C");
      orderingCXpathExpr    =     xp.compile("./wrq:Ordering/wrq:C");

      selectListBidRefXpathExpr   = xp.compile("./wrq:Columns//*[not(wrq:Calc)]/@bRef      | .//*[local-name()='ValueRef' and not(wrq:Calc)]/@idRef");
      filterBidRefXpathExpr       = xp.compile("./f:Filter//f:Expression/@bRef             | ./f:Filter//f:Expression/@bRef2");
      // TODO this does not take wrq:Calcs properly in account when deciding on the default aggregation
      // A) It drops default aggregation for bRefs taking only part in wrq:Calc//wrq:Select in group by
      // B) It does apply default aggregation on identical wrq:Calc in group by and select list because it does not deep-compare Cals
      groupingBidRefXpathExpr     = xp.compile("./wrq:Grouping//wrq:C[not(wrq:Calc)]/@bRef | ./wrq:Grouping//*[local-name()='ValueRef' and not(wrq:Calc)]/@idRef");
      havingBidRefXpathExpr       = xp.compile("./wrq:Having//f:Expression//@bRef");
      orderingBidRefXpathExpr     = xp.compile("./wrq:Ordering/wrq:C[not(wrq:Calc)]/@bRef  | ./wrq:Ordering/*[local-name()='ValueRef' and not(wrq:Calc)]/@idRef");
      topNBidRefXPathExpr         = xp.compile("./wrq:TopNDimMembers//wrq:LevelRef/@bRef   | ./wrq:TopNDimMembers//*[local-name()='ValueRef' and not(wrq:Calc)]/@idRef");
      joinOnBidXPathExpr          = xp.compile("../../self::wrq:From//wrq:On/@left         | ../../self::wrq:From//wrq:On/@right");

      vdmXpathExpr                = xp.compile("./wrq:Vdms/wrq:Vdm[@bRef]/wrq:VdmMap[@to]");
    } catch (XPathExpressionException e) {
      throw new RuntimeException("Cannot initialize class. Wrong XPath", e); // it's a bug
    }
    this.bindings = currentSelect.getWrqQueryBuilder().getBindings(); // Not using Bindings.getInstance() to allow using us in batch mode!
    this.currentSelect = currentSelect;
    fromSQLStatementWithParams = new SQLStatementWithParams();

    // The caller can indicate an empty request by sending no request doc or an empty <wrq:WrsRequest/> root element
    // because it is very often much easier to use than preventing an empty request
    // (WrsDataWriter will for example return <wrs:Wrs>Empty</wrs:Wrs>)
    if( selectElem!=null && ((NodeList)fromChildXpathExpr.evaluate(selectElem, XPathConstants.NODESET)).getLength() >= 1 ) {
      this.selectElem = selectElem;
      try {
        if( !StandardNamespaceContext.WRSREQUEST_NAMESPACE.equals(this.selectElem.getNamespaceURI()) )
          throw new RuntimeException("Parse error, not a valid WrsRequest."); // can be namespace, can be anything
      } catch(Exception e) {
        throw new Exception("Error evaluating a WrsRequest.",e);
      }
      initMetaData();
    } else
      this.selectElem = null;
  }

  protected boolean isEmpty()
  {
    return selectElem == null;
  }

  protected LinkedHashSet<String> getOrderingBRefs() {
    return orderingBRefs;
  }

  public LinkedHashSet<String> getFullSelectListBRefs() {
    return fullSelectListBRefs;
  }
  protected LinkedHashSet<String> getUserSelectListBRefs() {
    return userSelectListBRefs;
  }

  protected LinkedList<WrsBindingItem> getWrsCOnlySelectListBRefs() {
    LinkedList<WrsBindingItem> ret = new LinkedList<WrsBindingItem>();
    for(Iterator<WrqBindingItem> it = wrsCOnlySelectListBRefs.iterator(); it.hasNext(); )
      ret.add(it.next());
    return ret;
  }

  protected Element getFilterNode() throws XPathExpressionException {
    return (Element) filterXpathExpr.evaluate(selectElem, XPathConstants.NODE);
  }
  protected Element getGroupingNode() throws XPathExpressionException {
    return (Element) groupByRootXpathExpr.evaluate(selectElem, XPathConstants.NODE);
  }
  protected Element getHavingNode() throws XPathExpressionException {
    return (Element) havingRootXpathExpr.evaluate(selectElem, XPathConstants.NODE);
  }

  /**
   * Initializes internal data structures for s single wrq:Select
   * @throws Exception
   */
  protected void initMetaData() throws Exception
  {
    allBRefAggrs = new HashMap<String, WrqBindingItem>();
    allBRefs = new HashMap<String, WrqBindingItem>();
    allOuterContextBRefs = new HashMap<String, WrqBindingItem>();
    allRawBRefs = new HashSet<String>();
    fullSelectListBRefs = new LinkedHashSet<String>();
    userSelectListBRefs = new LinkedHashSet<String>();
    wrsCOnlySelectListBRefs = new LinkedList<WrqBindingItem>();
    groupingBRefs = new HashSet<String>();
    havingBRefs = new HashSet<String>();
    virtualBRefs = new HashMap<String, String>();

    // Let's check, whether we have a filter modifiers attached to the BindingSets (and BsGroup in EE) and apply them
    // Note, we have a chicken and egg problem here. To ask a BindingSet for its modifiers, 
    // we first have to know the requested BindingItems to get the right BindingSet in case the id references to a BindingSetGroup
    // But the modifier can change the set of required BindingItems determined in the next steps. We handle this as follows:
    // If there is a BindingSetGroup registered for the name, we take its modifiers, otherwise we get the direct BindingSet ones
    // We work on the immediate BindingSet children and the current filter (not touching any child, parent or sibling sub-selects)
    NodeList fromChildNl = ((NodeList)fromChildXpathExpr.evaluate(selectElem, XPathConstants.NODESET));
    Element firstFromChild = (Element)fromChildNl.item(0);
    Node directBsNode = firstFromChild;
    boolean didCloneForModifier = false;
    do {
      String modifierBindingSet = directBsNode.getTextContent().trim();
      if( "BindingSet".equals(directBsNode.getLocalName()) && bindings.getWrqModifiers( modifierBindingSet ).size() > 0 ) {
        // We create a private copy for us as the original document is returned to the client and the Modifier is local to us
        if( !didCloneForModifier ) {
          Document copiedWrq = DocumentBuilderFactory.newInstance().newDocumentBuilder().newDocument();
          copiedWrq.appendChild( copiedWrq.importNode(selectElem, true) );
          selectElem = copiedWrq.getDocumentElement();
          didCloneForModifier = true;
        }
        // Apply all Modifiers of the current BindingSet
        for (Class<? extends Modifier> modifier : bindings.getWrqModifiers( modifierBindingSet )) {
          modifier.getDeclaredConstructor().newInstance().process( selectElem );
        }
      }
    } while( (directBsNode = directBsNode.getNextSibling()) != null );


    // Read the vdm virtual dimension members, they will be applied by WrqBindingItem further down
    // We know from the xPath, that ../*/@bRef, @to and @from are not empty.
    // We indicate the 'rest' value via a from=null assigned to to
    NodeList vdmMapNodeList  = (NodeList) vdmXpathExpr.evaluate(selectElem, XPathConstants.NODESET);
    String vdmBRef = null;
    Map<String,Set<String>> mapping = null;
    for( int vm=0; vm<vdmMapNodeList.getLength(); vm++ ) {
      Element vdmMapElem = (Element)vdmMapNodeList.item(vm);

      // Let's see, whether we deal with a different bRef than before
      String tmp = ((Element)vdmMapElem.getParentNode()).getAttribute("bRef");
      if( !tmp.equals(vdmBRef) ) {
        vdmBRef = tmp;
        mapping = vdms.get( vdmBRef ) != null ? vdms.get( vdmBRef ) : new HashMap<String,Set<String>>();
        // Take care for the 'rest' mapping
        String rest = ((Element)vdmMapElem.getParentNode()).getAttribute("rest");
        if( ! rest.isEmpty() )
          mapping.put(rest, null);
      }

      // Split @from into individual values
      String fromParam = vdmMapElem.getAttribute("from");
      String toParam = vdmMapElem.getAttribute("to");
      Set<String> from = new HashSet<>();
      Stream.of(fromParam.split("\uE0F2")).forEach(from::add);
      mapping.put(toParam, from);

      vdms.put( vdmBRef, mapping );
    }

    NodeList selectedBidRefNlAll  = (NodeList) selectListBidRefXpathExpr.evaluate(selectElem, XPathConstants.NODESET);
    // We need to eliminate bIs belonging to a subselect instead of us, that is not possible with the XPath, hence the removeSubSel()
    List<Node> selectedBidRefNl   = removeSubSel(selectElem, selectedBidRefNlAll);
    NodeList filterBidRefNlAll    = (NodeList) filterBidRefXpathExpr.evaluate(selectElem, XPathConstants.NODESET);
    List<Node> filterBidRefNl     = removeSubSel(selectElem, filterBidRefNlAll);
    NodeList groupingBidRefNlAll  = (NodeList) groupingBidRefXpathExpr.evaluate(selectElem, XPathConstants.NODESET);
    List<Node> groupingBidRefNl   = removeSubSel(selectElem, groupingBidRefNlAll);
    NodeList havingBidRefNl       = (NodeList) havingBidRefXpathExpr.evaluate(selectElem, XPathConstants.NODESET);
    NodeList orderingBidRefNlAll  = (NodeList) orderingBidRefXpathExpr.evaluate(selectElem, XPathConstants.NODESET);
    List<Node> orderingBidRefNl   = removeSubSel(selectElem, orderingBidRefNlAll);
    NodeList selectedNlAll        = (NodeList) selectListCAXpathExpr.evaluate(selectElem, XPathConstants.NODESET);
    List<Node> selectedNl         = removeSubSel(selectElem, selectedNlAll);

    
    //-------------------------------------------------------------------
    // A) No bindingItem addressed, just select all items of the BindingSet
    if( selectedBidRefNl.size()==0 && filterBidRefNl.size()==0 && groupingBidRefNl.size()==0 
        && havingBidRefNl.getLength() == 0 && orderingBidRefNl.size()==0 && selectedNl.size() == 0)
    {
      // In this case allRawBRefs it output and filled with all BindingItems found in referenced BindingSets (if they allow *)
      resultingBindingSet = new WrqBindingSetFromTableReference(fromChildNl, currentSelect, allRawBRefs, true);
      selectAllBindingItems();
    }

    // B) Some bRef/idRef given
    else
    {
      NodeList groupingNl  = (NodeList) groupingCXpathExpr.evaluate(selectElem, XPathConstants.NODESET);
      NodeList orderingNl  = (NodeList) orderingCXpathExpr.evaluate(selectElem, XPathConstants.NODESET);
      NodeList topNBidRefNl = (NodeList) topNBidRefXPathExpr.evaluate(selectElem, XPathConstants.NODESET);
      NodeList joinOnBidRefNl = (NodeList) joinOnBidXPathExpr.evaluate(selectElem, XPathConstants.NODESET);

      for( int i=0; i<selectedBidRefNl.size(); i++ ) {
        allRawBRefs.add(selectedBidRefNl.get(i).getNodeValue());
      }
      for( int i=0; i<filterBidRefNl.size(); i++ )
        allRawBRefs.add(filterBidRefNl.get(i).getNodeValue());
      for( int i=0; i<groupingBidRefNl.size(); i++ ) {
        allRawBRefs.add(groupingBidRefNl.get(i).getNodeValue());
        groupingBRefs.add(groupingBidRefNl.get(i).getNodeValue());
      }
      for( int i=0; i<havingBidRefNl.getLength(); i++ ) {
        allRawBRefs.add(havingBidRefNl.item(i).getNodeValue());
        havingBRefs.add(havingBidRefNl.item(i).getNodeValue());
      }
      for( int i=0; i<orderingBidRefNl.size(); i++ )
        allRawBRefs.add(orderingBidRefNl.get(i).getNodeValue());
      for ( int i=0; i<topNBidRefNl.getLength(); i++ )
        allRawBRefs.add(topNBidRefNl.item(i).getNodeValue());
      for ( int i=0; i<joinOnBidRefNl.getLength(); i++ ) {
        String v = joinOnBidRefNl.item(i).getNodeValue();
        String wrqTableAlias = v.contains(".") ? v.split("\\.")[0] : "";
        //if( wrqTableAlias.equals(selectElem.getAttribute("alias")) ) allRawBRefs.add( v );
      }

      //-------------------------------------------------------------------
      // Create a virtual BindingSet from wrq:From
      resultingBindingSet = new WrqBindingSetFromTableReference(fromChildNl, currentSelect, allRawBRefs, selectedBidRefNl.size()==0);

      
      //-------------------------------------------------------------------
          // B.1.a Empty select list
      if( selectedBidRefNl.size()==0 && selectedNl.size() == 0 ) {
        selectAllBindingItems();
      }

      // B.1.b Select list given
      else
      {
        // Do we want to use aggregations for columns? This is the case if we have group-by columns 
        // or if indicated @bcdIsGrandTotal=true
        reqHasGroupBy = ((NodeList)groupByIndicatorXpathExpr.evaluate(selectElem, XPathConstants.NODESET)).getLength() > 0;
        reqHasGroupBy |= getGroupingNode() != null && "true".equals(((Element)getGroupingNode()).getAttribute("bcdIsGrandTotal"));
        reqHasGroupingFunction = ((NodeList)groupByFunctionXpathExpr.evaluate(selectElem, XPathConstants.NODESET)).getLength() > 0;
        WrqBindingItem lastWrqC = null;
        for( int i=0; i<selectedNl.size(); i++ )
        {
          Element cAElem = (Element)selectedNl.get(i);

          WrqBindingItem wrqBi = new WrqBindingItem(this, cAElem, "v"+(aliasCounter++), false, lastWrqC);

          // If we just created a virtual binding item, for example by having a wrq:Calc clause instead of a bRef, we keep track of it here for later use
          // because in filter expressions (where and having), we can only refer to bRef and not use wrq:Calc, we then take the definition from the select clause, if given
          if( ! wrqBi.getId().equals(cAElem.getAttribute("bRef")) )
            virtualBRefs.put(cAElem.getAttribute("bRef"), wrqBi.getId());

          String bRef_Aggr = wrqBi.getId()+(wrqBi.getAggr()==null ? "":" "+wrqBi.getAggr());

          // wrs:C go to selectList
          if( "C".equals(cAElem.getLocalName()) ) {
            lastWrqC = wrqBi;
            WrqBindingItem prevBiwmd = allBRefAggrs.get(bRef_Aggr);
            wrsCOnlySelectListBRefs.add(prevBiwmd!=null? prevBiwmd : wrqBi);
          }
          if( allBRefAggrs.get(bRef_Aggr)==null ) { // If it was already there, keep it as wrsCOnlySelectListBRefs is referencing it already
            allBRefAggrs.put(bRef_Aggr, wrqBi);
            allBRefs.put(wrqBi.getId(), wrqBi);
          }
          fullSelectListBRefs.add(bRef_Aggr);
          userSelectListBRefs.add(bRef_Aggr);

        }

        // Now let's see whether the column takes part in a grouping function (not just a plain group),
        // then lets create a @bcdGr = grouping(c) attribute for it to see whether it's value (if null) belongs to an aggregate
        for(Iterator<WrqBindingItem> it=wrsCOnlySelectListBRefs.iterator(); it.hasNext(); )
        {
          // TODO only for those taking part in grouping fct
          WrqBindingItem biWm = it.next();
          String bRef = biWm.getId();
          if( reqHasGroupingFunction && groupingBRefs.contains(bRef) ) {
            WrqBindingItem grBi = new WrqBindingItem(this, ISqlGenerator.BCD_WKATTRIBUTE_GROUPING, "GROUPING","isG"+biWm.getAlias(), biWm, null);
            fullSelectListBRefs.add(bRef+" GROUPING");
            allBRefAggrs.put(bRef+" GROUPING", grBi);
          }
        }
      }

      // B.2 Take care for BindingItems used in filtering
      for( int i=0; i<filterBidRefNl.size(); i++ )
      {
        Node fBiDRef = filterBidRefNl.get(i);
        String bRef = fBiDRef.getNodeValue();
        // Do not overwrite, needs to be consistent with entries from before done to the other lists
        // i.e. all lists need to point to the same WrqBindingItem instance, so when one is changed (like in TOPn), all change
        if( !allBRefs.containsKey(bRef)) {
          // A where clause of a sub-select may reference BindingItems of outer Selects, hence resolveBindingItemFromScope()
          BindingItem bi = resultingBindingSet.get(bRef);
          // Resolved by "us", i.e., our wrq:From clause
          if( bi != null ) {
            WrqBindingItem wrqBi = new WrqBindingItem(this, bRef, bi, "v"+(aliasCounter++), false);
            allBRefs.put(bRef, wrqBi);
          }
          // Resolved in some outer Select or CTE
          else {
            bi = currentSelect.resolveBindingItemFromScope(bRef);
            WrqBindingItem wrqBi = new WrqBindingItem(this, bRef, bi, "v"+(aliasCounter++), false);
            allOuterContextBRefs.put(bRef, wrqBi);
          }
        }
      }

      // B.3 Take care for BindingItems used in grouping
      for( int i=0; i<groupingNl.getLength(); i++ )
      {
        Element grElem = (Element)groupingNl.item(i);
        WrqBindingItem wrqBi = new WrqBindingItem(this, grElem, "v"+(aliasCounter++), false);
        if( !allBRefs.containsKey(wrqBi.getId())) {// Do not overwrite, needs to be consistent with entries from before
          allBRefs.put(wrqBi.getId(), wrqBi);
        }
      }

      // B.4 Take care for BindingItems used in having
      for( int i=0; i<havingBidRefNl.getLength(); i++ )
      {
        Node hBiDRef = havingBidRefNl.item(i);
        String bRef = hBiDRef.getNodeValue();
        if( !allBRefs.containsKey(bRef)) {// Do not overwrite, needs to be consistent with entries from before
          BindingItem bi = resultingBindingSet.get(bRef);
          WrqBindingItem wrqBi = new WrqBindingItem(this, bRef, bi, "v"+(aliasCounter++), false);
          allBRefs.put(bRef, wrqBi);
        }
      }

      // B.5 Take care for BindingItems used in ordering
      for( int i=0; i<orderingNl.getLength(); i++ )
      {
        Element orElem = (Element)orderingNl.item(i);
        boolean isDescending = ( "desc".equals(orElem.getAttribute("order")) );
        WrqBindingItem biWm = new WrqBindingItem(this, orElem, "v"+(aliasCounter++), false);
        String bRef_Aggr = biWm.getId()+(biWm.getAggr()==null ? "":" "+biWm.getAggr());
        orderingBRefs.add(bRef_Aggr);
        if( !allBRefAggrs.containsKey(bRef_Aggr)) {// Do not overwrite, needs to be consistent with entries from before
          biWm.setOrderByDescending(isDescending);
          allBRefs.put(biWm.getId(), biWm);
          allBRefAggrs.put(bRef_Aggr,biWm);
        }
        else
          allBRefAggrs.get(bRef_Aggr).setOrderByDescending(isDescending);
      }

    }
    // Now we need to assure the correct columnNumber for our users, i.e. it defines the position in the outer most select list
    // i.e. the position in the ResultSet
    for( String sl : fullSelectListBRefs ) {
      allBRefAggrs.get(sl).setColumnNumber(columnNumber++);
    }
    
    fromSQLStatementWithParams.append(resultingBindingSet.getSQLStatementWithParams());
  }

  /**
   * We filter selectedNlAll for those nodes that have no Select between them and the container as they belong to the sub-select, not us.
   * Usually this is Select/Columns/C/Calc/Div/Select or so.
   * It would be nicer if this could be done with the XPath constructing selectedNlAll, but it is not possible
   * @param container
   * @param selectedNlAll
   * @return
   */
  private List<Node> removeSubSel(Element container, NodeList selectedNlAll) {
    List<Node> cleanedList = new LinkedList<Node>();
    for(int i=0; i < selectedNlAll.getLength(); i++) {
      Node node = selectedNlAll.item(i);
      Node p = node instanceof Attr ? ((Attr)node).getOwnerElement() : node.getParentNode();
      while( p!= null && !p.isSameNode(container) && (!"SELECT".equals( p.getLocalName().toUpperCase() ) ) ) 
        p = p.getParentNode();
      if( p != null && p.isSameNode(container) )
        cleanedList.add(node);
    }
    return cleanedList;
  }

  /**
   * No binding items are explicitly given in select-clause, collect here all the BindingSet has to offer
   * @throws BindingException
   */
  protected void selectAllBindingItems() throws BindingException
  {
    if( !resultingBindingSet.isAllowSelectAllColumns() )
      throw new BindingException("The BindingSet " + getResultingBindingSet().getName() +" requires list of bindings items in Select clause, see bnd:BindingSet/@allowSelectAllColumns");

    // We need to keep in mind that in resultingBindingSet.getBindingItems() the id is not yet wrqAlias aware 
    Iterator<String> bitemsIt = resultingBindingSet.getBindingItemNames().iterator();
    while( bitemsIt.hasNext() ) {
      String bRef = bitemsIt.next();
      BindingItem bi = resultingBindingSet.get(bRef);
      WrqBindingItem biWm = new WrqBindingItem(this, bRef, bi, "v"+(aliasCounter++), !groupingBRefs.isEmpty() && !groupingBRefs.contains(bRef));
      String bRef_Aggr = biWm.getId()+(biWm.getAggr()==null ? "":" "+biWm.getAggr());
      allBRefAggrs.put(bRef_Aggr, biWm);
      allBRefs.put(biWm.getId(), biWm);
      fullSelectListBRefs.add(bRef_Aggr);
      userSelectListBRefs.add(bRef_Aggr);
      wrsCOnlySelectListBRefs.add(biWm);
    }
  }

  /**
   * Usually, the aggregation is defined in the Wrq Element e for the column.
   * There are two cases where not: It is not given (select all, no explicit select list), or the attribute is simply not set.
   * Then we have this mechanism for default-aggregator, the returned aggregator can be trusted (i.e. no SQL injection can happen within this fkt)
   * 1) Wrq/Columns/C/@aggr
   * 2) BindingSet/BindingItem/@aggr
   * 3) MAX() or SUM() depending on the BindingItems data type
   * @param bi
   * @return
   */
  protected String getDefaultAggr( BindingItem bi )
  {
    String aggr = bi.getAggr();
    // Prevent SQL injection and fallback to default
    if( DatabaseCompatibility.getInstance().getAggrFktMapping(null).containsKey(aggr) )
      return aggr;
    else
      return WrqBindingItem.getDefaultAggr(bi.getJDBCDataType());
  }

  public Document getOwnerDocument() {
    return selectElem.getOwnerDocument();
  }

  public Element getSelectNode() {
    return selectElem;
  }

  public Map<String, WrqBindingItem> getAllBRefAggrs() {
    return allBRefAggrs;
  }
  public Map<String, WrqBindingItem> getAllBRefs() {
    return allBRefs;
  }
  public Map<String, String> getVirtualBRefs() {
    return virtualBRefs;
  }
  public Map<String, WrqBindingItem> getAllOuterContextBRefs() {
    return allOuterContextBRefs;
  }

  public Set<String> getAllRawBRefs() {
    return allRawBRefs;
  }

  public BindingItem getNoMetaDataBindingItem(String id) throws BindingNotFoundException
  {
    return resultingBindingSet.get(id);
  }

  public NodeList getGroupingChildNode() throws XPathExpressionException {
    return (NodeList)groupByChildrenXpathExpr.evaluate(selectElem, XPathConstants.NODESET);
  }

  public NodeList getTopNs() throws XPathExpressionException {
    return (NodeList) topNXPathExpr.evaluate(selectElem, XPathConstants.NODE);
  }
  public int getNextColumnNumber() {
    return columnNumber++;
  }
  public WrqBindingSet getResultingBindingSet()
  {
    return resultingBindingSet;
  }
  public Set<String> getGroupingBRefs()
  {
    return groupingBRefs;
  }
  public Set<String> getHavingBRefs()
  {
    return havingBRefs;
  }
  public boolean reqHasGroupingFunction() {
    return reqHasGroupingFunction;
  }
  public boolean reqHasGroupBy() {
    return reqHasGroupBy;
  }
  public void setReqHasGroupingFunction(Boolean reqHasGroupingFunction) {
    this.reqHasGroupingFunction = reqHasGroupingFunction;
  }
  /**
   * Convenience method
   * @return
   */
  public String getJdbcResourceName() {
    return getCurrentSelect().getWrqQueryBuilder().getJdbcResourceName();
  }

  public SqlFromSubSelect getCurrentSelect() {
    return currentSelect;
  }

  public SQLStatementWithParams getSQLSelectWithParams() {
    return fromSQLStatementWithParams;
  }

  /**
   * Return the virtual dimension members for a bRef
   * @param bRef
   * @return
   */
  public Map<String,Set<String>> getVdm( String bRef ) {
    return vdms.get( bRef );
  }

  public WrqGroupBy2Sql getWrqGroupBy2Sql() {
    if( wrqGroupBy2Sql == null ) wrqGroupBy2Sql = new WrqGroupBy2Sql( this );
    return wrqGroupBy2Sql;
  }

  private final XPath xp;
  private final XPathExpression fromChildXpathExpr;
  private final XPathExpression filterXpathExpr;
  private final XPathExpression groupByRootXpathExpr;
  private final XPathExpression groupByChildrenXpathExpr;
  private final XPathExpression groupByIndicatorXpathExpr;
  private final XPathExpression groupByFunctionXpathExpr;
  private final XPathExpression havingRootXpathExpr;
  private final XPathExpression topNXPathExpr;

  private final XPathExpression selectListCAXpathExpr;
  private final XPathExpression groupingCXpathExpr;
  private final XPathExpression orderingCXpathExpr;

  private final XPathExpression selectListBidRefXpathExpr;
  private final XPathExpression filterBidRefXpathExpr;
  private final XPathExpression groupingBidRefXpathExpr;
  private final XPathExpression havingBidRefXpathExpr;
  private final XPathExpression orderingBidRefXpathExpr;
  private final XPathExpression topNBidRefXPathExpr;
  private final XPathExpression joinOnBidXPathExpr;

  private final XPathExpression vdmXpathExpr;

}