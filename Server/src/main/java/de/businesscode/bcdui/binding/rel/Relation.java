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
package de.businesscode.bcdui.binding.rel;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpressionException;

import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.BindingItemFromRel;
import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.binding.rel.impl.AbstractConstrain;
import de.businesscode.bcdui.binding.rel.impl.BooleanConstraintImpl;
import de.businesscode.bcdui.binding.rel.impl.CombinedConstraintImpl;
import de.businesscode.bcdui.binding.rel.impl.IsLikeConstraintImpl;
import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.XPathUtils;

/**
 * Relations are defined for a BindingSet in its config file. They are transparent to the client
 * The related BindingSet is automatically joined, if one of its items is requested while the main BindingSet is queried
 * Often this will be joined reference data tables
 */
public class Relation {
  
  public static enum TYPE {
    inner, leftOuter, rightOuter
  }
  
  // Parked here during reading of BindingSets
  // Evaluated only later during first access since only when we know the referenced BindingSet was also read
  NodeList importItemNodes = null;
  NodeList constraintNodes = null;
  NodeList conditionNode   = null;
   
  private BindingSet rightBindingSet;
  private String rightBindingSetName;

  private BindingSet leftBindingSet;
  private String leftBindingSetName;

  private TYPE type = TYPE.leftOuter;

  // Import items are read lazy because only later we know the source BindingSet was also read
  private List<BindingItemFromRel> imports = null;
  private Condition condition;
  private String id;

  // This postfix is unique for the table: "_rel"+idx, when this is the relation at index idx for its main BindingSet
  private final String tableAliasPostfix;

  // In case of DefaultImport bRefs are not listed but all bRef are imported with this prefix.
  // For explicit Imports list, there is no prefix but names re given explicitly on each element
  // This being not null (but empty is valid) also serves as marker that we are a default import
  private String  defaultImportBRefPrefix = null;

  /**
   * getLeftBindingSetName
   *
   * @return
   */
  public String getLeftBindingSetName() {
    return leftBindingSetName;
  }

  /**
   * setLeftBindingSetName
   *
   * @param pLeftBindingSetName
   */
  public void setLeftBindingSetName(String pLeftBindingSetName) {
    this.leftBindingSetName = pLeftBindingSetName;
  }

  /**
   * getLeftBindingSet
   *
   * @return
   * @throws BindingException 
   */
  public BindingSet getLeftBindingSet() throws BindingException {
    if( leftBindingSet==null ) leftBindingSet = Bindings.getInstance().get(leftBindingSetName, Collections.emptySet());
    return leftBindingSet;
  }

  /**
   * setLeftBindingSet
   *
   * @param pLeftBindingSet
   */
  public void setLeftBindingSet(BindingSet pLeftBindingSet) {
    this.leftBindingSet = pLeftBindingSet;
    setLeftBindingSetName(this.leftBindingSet.getName());
  }

  /**
   * getId
   *
   * @return
   */
  public String getId() {
    return id;
  }

  /**
   * setId
   *
   * @param pname
   */
  public void setId(String pname) {
    this.id = pname;
  }

  /**
   * isInitImportItems
   *
   * @return
   */
  public boolean isInitImportItems() {
    return imports != null;
  }

  /**
   * Constructor
   *
   * @param relationElement
   * @param pLeftBindingSetName
   * @throws XPathExpressionException
   * @throws BindingException
   */
  public Relation(Element relationElement, String pLeftBindingSetName, int idx) throws XPathExpressionException, BindingException {

    this.tableAliasPostfix = "_rel"+idx;

    String typeAttr = relationElement.getAttribute("type");
    if (typeAttr != null && typeAttr.length() > 0)
      type = TYPE.valueOf(typeAttr);

    setLeftBindingSetName(pLeftBindingSetName);
    initRelation(relationElement);
    setId(getRightBindingSetName());
  }

  /**
   *
   * Constructor
   *
   * @param relationElement
   * @param pLeftBindingSet
   * @throws XPathExpressionException
   * @throws BindingException
   */
  public Relation(Element relationElement, BindingSet pLeftBindingSet, int idx) throws XPathExpressionException, BindingException {
    this( relationElement, pLeftBindingSet.getName(), idx );
  }

  public String getRightBindingSetName() {
    return rightBindingSetName;
  }

  /**
   * initializes all children of relation
   *
   * @param relationElement
   * @throws XPathExpressionException
   * @throws BindingException
   */
  public void initRelation(Element relationElement) throws XPathExpressionException, BindingException {

    String tmp = relationElement.getAttribute("rightBindingSet");
    if (tmp.length() == 0)
      throw new BindingException("The Relation of " + this.getLeftBindingSetName() + " BindingSet must contain @rightBindingSet");

    setRightBindingSetName(tmp);

    XPath xPath = XPathUtils.newXPathFactory().newXPath();
    StandardNamespaceContext nsContext = StandardNamespaceContext.getInstance();
    xPath.setNamespaceContext(nsContext);
    String xPathNS = nsContext.getXMLPrefix(StandardNamespaceContext.BINDINGS_NAMESPACE);

    //
    NodeList defaultImports = (NodeList) xPath.evaluate(xPathNS + "DefaultImports", relationElement, XPathConstants.NODESET);

    // Default import imports all BindingItems with a prefix
    if (defaultImports != null && defaultImports.getLength() > 0) {
      if (defaultImports.getLength() > 1)
        throw new BindingException("Only one DefaultImports element is allowed.");
      String prefix = ((Element) defaultImports.item(0)).getAttribute("prefix");
      // in this case we can't init ImportItem of the Relation
      // we must do it by calling the Relation
      defaultImportBRefPrefix = prefix;
    } 
    
    // Otherwise the elements are listed explicitly
    else {

      NodeList importsNode = (NodeList) xPath.evaluate(xPathNS + "Imports", relationElement, XPathConstants.NODESET);

      // <Imports>
      if (importsNode != null && importsNode.getLength() > 0) {
        if (importsNode.getLength() > 1)
          throw new BindingException("Only one Imports element is allowed.");

        defaultImportBRefPrefix = null;

        importItemNodes = (NodeList) xPath.evaluate(xPathNS + "ImportItem", importsNode.item(0), XPathConstants.NODESET);
      }
    }

    // Evaluated later
    conditionNode = (NodeList) xPath.evaluate(xPathNS + "Condition", relationElement, XPathConstants.NODESET);

  }

  /**
   *
   * Method resolveConstraint
   *
   * @param constraintNode
   * @param parentConstraint
   * @return
   * @throws XPathExpressionException
   * @throws Exception
   */
  private AbstractConstrain resolveConstraint(Element constraintNode, AbstractConstrain parentConstraint) throws BindingException, XPathExpressionException {
    AbstractConstrain curConstraint = null;
    NodeList constrChildNodes = (NodeList) XPathUtils.newXPathFactory().newXPath().compile("*").evaluate(constraintNode, XPathConstants.NODESET);

    if (constrChildNodes == null || constrChildNodes.getLength() == 0)
      return null;

    Element curElement = (Element) constrChildNodes.item(0);

    if (curElement == null)
      return null;

    boolean negate = Boolean.parseBoolean(constraintNode.getAttribute("negate"));
    // <IsEqual>
    // boolean
    String bindingSetName;
    if (constraintNode.getLocalName().equals("IsEqual") ||
        constraintNode.getLocalName().equals("IsLike") ||
        constraintNode.getLocalName().equals("LT") ||
        constraintNode.getLocalName().equals("LE") ||
        constraintNode.getLocalName().equals("GT") ||
        constraintNode.getLocalName().equals("GE")
        ) {
      // only 2 BindingItemRef
      if(constraintNode.getLocalName().equals("IsEqual")) curConstraint = new BooleanConstraintImpl(BooleanConstraintImpl.BooleanConstraint.EQ,negate);
      else if(constraintNode.getLocalName().equals("IsLike")) curConstraint = new IsLikeConstraintImpl(IsLikeConstraintImpl.BooleanConstraint.ISLIKE,negate, constraintNode.getAttribute("prependToSecond"), constraintNode.getAttribute("appendToSecond"));
      else if (constraintNode.getLocalName().equals("LT")) curConstraint = new BooleanConstraintImpl(BooleanConstraintImpl.BooleanConstraint.LT,negate);
      else if (constraintNode.getLocalName().equals("LE")) curConstraint = new BooleanConstraintImpl(BooleanConstraintImpl.BooleanConstraint.LE,negate);
      else if (constraintNode.getLocalName().equals("GT")) curConstraint = new BooleanConstraintImpl(BooleanConstraintImpl.BooleanConstraint.GT,negate);
      else if (constraintNode.getLocalName().equals("GE")) curConstraint = new BooleanConstraintImpl(BooleanConstraintImpl.BooleanConstraint.GE,negate);

      // Per default the first is left, the second is searched on the right side
      String side = curElement.getAttribute("side");
      if( "".equals(side) || "left".equals(side) ) {
        String nameA = curElement.getAttribute("name");
        curConstraint.addColumn(getLeftBindingSet().get(nameA));

        curElement = (Element) constrChildNodes.item(1);
        String nameB = curElement.getAttribute("name");
        curConstraint.addColumn(new BindingItemFromRel(rightBindingSet.get(nameB), this, nameB, null));
      } 
      else if( "right".equals(side) ) {
        String nameA = curElement.getAttribute("name");
        curConstraint.addColumn(rightBindingSet.get(nameA));

        curElement = (Element) constrChildNodes.item(1);
        String nameB = curElement.getAttribute("name");
        curConstraint.addColumn(new BindingItemFromRel(leftBindingSet.get(nameB), this, nameB, null));
      }
    }
    else if (constraintNode.getLocalName().equals("IsNull")) {
      curConstraint = new BooleanConstraintImpl(BooleanConstraintImpl.BooleanConstraint.ISNULL, negate);

      bindingSetName = getBindingItemRefBindingSetName(curElement.getAttribute("side"));
      BindingSet bs = Bindings.getInstance().get(bindingSetName, Collections.emptySet());
      String name = curElement.getAttribute("name");
      curConstraint.addColumn(new BindingItemFromRel(bs.get(name), this, name, null));

    }// combined with recursion
    else if (constraintNode.getLocalName().equals("And")) {
      curConstraint = new CombinedConstraintImpl((negate ? CombinedConstraintImpl.CombinedConstraint.ANDNOT : CombinedConstraintImpl.CombinedConstraint.AND), negate);
      for (int i = 0; i < constrChildNodes.getLength(); i++) {
        AbstractConstrain child = resolveConstraint((Element) constrChildNodes.item(i), curConstraint);
        if (child != null)
          curConstraint.addChildConstraint(child);
      }
    }
    else if (constraintNode.getLocalName().equals("Or")) {
      curConstraint = new CombinedConstraintImpl((negate ? CombinedConstraintImpl.CombinedConstraint.ORNOT : CombinedConstraintImpl.CombinedConstraint.OR), negate);

      for (int i = 0; i < constrChildNodes.getLength(); i++) {
        AbstractConstrain child = resolveConstraint((Element) constrChildNodes.item(i), curConstraint);
        if (child != null)
          curConstraint.addChildConstraint(child);
      }
    }

    return curConstraint;
    // </IsEqual>
  }

  /**
   *
   * Method getBindingItemRefBindingSet
   *
   * @param pLeftOrRightSide
   * @return
   */
  private String getBindingItemRefBindingSetName(String pLeftOrRightSide) {
    return (pLeftOrRightSide.equals("left") ? this.leftBindingSetName : this.rightBindingSetName);
  }

  /**
   * getCondition
   *
   * @return
   * @throws XPathExpressionException 
   * @throws BindingException 
   */
  public Condition getCondition() throws BindingException {

    try {
      // <Condition>
      if( condition == null && conditionNode != null && conditionNode.getLength() > 0) {
        this.condition = new Condition();
  
        NodeList constraintNodes = (NodeList) XPathUtils.newXPathFactory().newXPath().compile("*").evaluate(conditionNode.item(0), XPathConstants.NODESET);
        // resolve all constraints
        if (constraintNodes != null && constraintNodes.getLength() > 0) {
          for (int con = 0; con < constraintNodes.getLength(); con++) {
            // because of comments or text values in DOM
            if (constraintNodes.item(con).getNodeType() == Node.ELEMENT_NODE) {
              AbstractConstrain cons = resolveConstraint((Element) constraintNodes.item(con), null);
              if (cons != null)
                this.condition.setConstraint(cons);
            }
          }
        }// end of constraints
      }
      // </Condition>
    } catch (XPathExpressionException e) {
      throw new BindingException("Condition of Relation "+getId()+" for BindingSet "+leftBindingSetName+" could not be found ", e);
    }
    
    return condition;
  }

  /**
   *
   * Method setCondition
   *
   * @param pcondition
   */
  public void setCondition(Condition pcondition) {
    this.condition = pcondition;
  }

  /**
   *
   * Method getType
   *
   * @return
   */
  public TYPE getType() {
    return type;
  }

  /**
   *
   * Method setType
   *
   * @param ptype
   */
  public void setType(TYPE ptype) {
    this.type = ptype;
  }

  /**
   *
   * Method getSourceBindingSet
   *
   * @return
   * @throws BindingException
   */
  public BindingSet getSourceBindingSet() {
    if (rightBindingSet == null) {
      Bindings bs;
      try {
        bs = Bindings.getInstance();
        rightBindingSet = bs.get(getRightBindingSetName(), Collections.emptyList());
      } catch (BindingException e) {
        rightBindingSet = null;
      }
    }
    return rightBindingSet;
  }

  /**
   *
   * Method setSourceBindingSet
   *
   * @param psourceBindingSet
   */
  public void setSourceBindingSet(BindingSet psourceBindingSet) {
    this.rightBindingSet = psourceBindingSet;
  };

  /**
   *
   * Method isLeftOuter
   *
   * @return
   */
  public boolean isLeftOuter() {
    return (this.type.equals(TYPE.leftOuter));
  }

  /**
   *
   * Method isRightOuter
   *
   * @return
   */
  public boolean isRightOuter() {
    return (this.type.equals(TYPE.rightOuter));
  }

  /**
   * returns statement created by own condition
   *
   * @return
   */
  public String getConditionStatement(String mainTableAlias, boolean isForJoinToCaseWhen) throws BindingException {
    return getCondition().getConditionStatement( mainTableAlias, isForJoinToCaseWhen );
  }

  /**
   * gets join string
   *
   * @return
   */
  public String getJoinAsString() {
    String str;
    if (isLeftOuter())
      str = " LEFT OUTER JOIN ";
    else if (isRightOuter()) 
      str = " RIGHT OUTER JOIN ";
    else
      str = " INNER JOIN ";
    return str;
  }


  /**
   * getImportItems
   *
   * @return
   * @throws BindingException
   */
  public List<BindingItemFromRel> getImportItems() throws BindingException {
    
    // Usually we just return what we have 
    if( imports != null ) {
      return imports;
    }

    // After application startup, read the imports once.
    // This is done lazy on the first request as during construction of the Relation the related BindingSet may not yes be available
    // depending on the order in which the BindingSets are read
    else {
      synchronized(this) {
        imports = new ArrayList<BindingItemFromRel>();
  
        // All items with a prefix
        if( defaultImportBRefPrefix != null ) {
          BindingSet bs = getSourceBindingSet();
          for( BindingItem bi: bs.getBindingItems() ) {
            BindingItemFromRel bfr = new BindingItemFromRel( bi, this, defaultImportBRefPrefix+bi.getId(), null );
            imports.add(bfr);
          }
        } 
        
        // Individually listed and named items
        // TODO support for <ImportItem caption="Team" bRef="accountTeam" asBRef="accountTeam"/> asBRef optional
        else if( importItemNodes != null ) {
          for (int imp = 0; imp < importItemNodes.getLength(); imp++) {
            Element importNodeEl = (Element) importItemNodes.item(imp);
            
            String importName = importNodeEl.getAttribute("name");
            String importCaption = importNodeEl.hasAttribute( "caption") ? importNodeEl.getAttribute( "caption") : null; 
            
            Element importFirstChild = (Element) importNodeEl.getElementsByTagName("BindingItemRef").item(0);// FirstChild();
            String refName = importFirstChild.getAttribute("name");
            
            BindingItemFromRel bfr = new BindingItemFromRel(getSourceBindingSet().get(refName), this, importName, importCaption);
            imports.add(bfr);
          }
        }
      }
      return imports;
    }
  }

  /**
   * importsContainItem
   *
   * @param key
   * @return
   * @throws BindingException
   */
  public boolean importsContainItem(String key) throws BindingException {
    
    return getImportItems().stream().anyMatch( bfr -> bfr.getId().equalsIgnoreCase(key) );
  }

  /**
   * getImportItemByName
   *
   * @param key
   * @return null if not found
   * @throws BindingException
   */
  public BindingItemFromRel getImportItemByName(String key) throws BindingException {
  
    return getImportItems().stream().filter( bfr -> bfr.getId().equalsIgnoreCase(key) ).findFirst().orElse(null);
  }

  /**
   * getAllImportItemNames
   *
   * @return
   * @throws BindingException
   */
  public List<String> getAllImportItemNames() throws BindingException {
    if (getImportItems() == null)
      return null;
    
    return Arrays.asList( getImportItems().stream().map( bfr -> bfr.getId() ).toArray( String[]::new ) );
  }

  /**
   * builds SQL statement for the relation like: LEFT OUTER JOIN ...tableName ...aliasName ON ( ...here condition statement )
   */
  public String getRelationStatement(String mainTableAlias) throws BindingException {

    StringBuilder sql = new StringBuilder();
    sql.append(getJoinAsString());
    sql.append(" ").append(getSourceBindingSet().getTableReference());
    sql.append(" ").append(mainTableAlias).append(tableAliasPostfix); // relation alias
    sql.append(" ON ");
    sql.append(" ( ");
    sql.append( getConditionStatement(mainTableAlias, false) );
    sql.append(" ) ");

    return sql.toString();
  }

  /**
   * setRightBindingSetName
   *
   * @param pRightBindingSetName
   */
  protected void setRightBindingSetName(String pRightBindingSetName) {
    this.rightBindingSetName = pRightBindingSetName;
  }

  /**
   * @see java.lang.Object#toString()
   */
  @Override
  public String toString() {
    StringBuilder str = new StringBuilder("<Relation");
    str.append(" type='").append(getType()).append("'");
    str.append(" rightBindingSet='").append(getRightBindingSetName()).append("'");
    str.append(" >");

    String nodeName = (defaultImportBRefPrefix != null ? "DefaultImports" : "Imports");
    str.append("<").append(nodeName);
    if (defaultImportBRefPrefix != null)
      str.append(" prefix='").append(defaultImportBRefPrefix).append("'");
    str.append(">");

    str.append("<Imports>");
    if( defaultImportBRefPrefix != null ) {
      str.append("<DefaultImports/>");
    } else {
      try {
        for( BindingItemFromRel bfr: getImportItems() ) {
          str.append("<ImportItem caption=\""+bfr.getCaption()+"\" name=\""+bfr.getId()+"\">");
          str.append("<BindingItemRef name=\""+bfr.getReferencedBindingItem().getId()+"\" />");
          str.append("</ImportItem>");
        }
      } catch (BindingException e) {
        str.append("--- Error, items could not be determined ---");
      }
    }
    str.append("<(Imports>");

    try {
      if (getCondition() != null)
        str.append(getCondition().toString());
    } catch (BindingException e) {
      str.append("--- Error, Condition could not be determined ---");
    }

    str.append("</Relation>");
    return str.toString();
  }

  public String getTableAlias(String mainTableAlias) {
    return mainTableAlias+tableAliasPostfix;
  }
  
  public boolean isDefaultImport() {
    return defaultImportBRefPrefix != null;
  }
}
