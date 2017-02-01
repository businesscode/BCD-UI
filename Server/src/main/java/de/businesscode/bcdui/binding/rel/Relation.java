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
package de.businesscode.bcdui.binding.rel;

import java.util.ArrayList;
import java.util.List;

import javax.xml.xpath.XPath;
import javax.xml.xpath.XPathConstants;
import javax.xml.xpath.XPathExpressionException;

import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import de.businesscode.bcdui.binding.BindingAliasMap;
import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.binding.rel.impl.AbstractColumn;
import de.businesscode.bcdui.binding.rel.impl.AbstractConstrain;
import de.businesscode.bcdui.binding.rel.impl.BooleanConstraintImpl;
import de.businesscode.bcdui.binding.rel.impl.CombinedConstraintImpl;
import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.XPathUtils;

/**
 * The class represents the right table of an SQL JOIN with condition and possible return columns
 */
public class Relation {

  public static enum TYPE {
    inner, leftOuter
  }
  private BindingSet rightBindingSet;
  private String rightBindingSetName;

  private BindingSet leftBindingSet;
  private String leftBindingSetName;

  private TYPE type = TYPE.leftOuter;

  private List<Imports> imports;
  private Condition condition;
  private boolean initChildren = false;
  private String id;
  private volatile String statement;


  /**
   * Relation
   */
  public Relation() {
  }

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
   */
  public BindingSet getLeftBindingSet() {
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
    return initChildren;
  }

  /**
   * Constructor
   *
   * @param relationElement
   * @param pLeftBindingSetName
   * @throws XPathExpressionException
   * @throws BindingException
   */
  public Relation(Element relationElement, String pLeftBindingSetName) throws XPathExpressionException, BindingException {
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
  public Relation(Element relationElement, BindingSet pLeftBindingSet) throws XPathExpressionException, BindingException {
    String typeAttr = relationElement.getAttribute("type");
    if (typeAttr != null && typeAttr.length() > 0)
      type = TYPE.valueOf(typeAttr);

    setLeftBindingSet(pLeftBindingSet);

    initRelation(relationElement);

    setId(getRightBindingSetName());
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

    if (defaultImports != null && defaultImports.getLength() > 0) {
      if (defaultImports.getLength() > 1)
        throw new BindingException("Only one DefaultImports element is allowed.");
      String prefix = ((Element) defaultImports.item(0)).getAttribute("prefix");
      // in this case we can't init ImportItem of the Relation
      // we must do it by calling the Relation
      if (this.imports == null)
        this.imports = new ArrayList<Imports>();
      Imports newImports = new Imports(this);
      newImports = new Imports(this);
      newImports.setPrefix(prefix);
      newImports.setDefautImport(true);
      this.imports.add(newImports);
    } else {

      NodeList importsNode = (NodeList) xPath.evaluate(xPathNS + "Imports", relationElement, XPathConstants.NODESET);

      // <Imports>
      if (importsNode != null && importsNode.getLength() > 0) {
        if (importsNode.getLength() > 1)
          throw new BindingException("Only one Imports element is allowed.");
        if (this.imports == null)
          this.imports = new ArrayList<Imports>();

        Imports newImports = new Imports(this);
        newImports = new Imports(this);
        newImports.setDefautImport(false);

        NodeList importItemNodes = (NodeList) xPath.evaluate(xPathNS + "ImportItem", importsNode.item(0), XPathConstants.NODESET);

        if (importItemNodes != null && importItemNodes.getLength() > 0) {
          for (int imp = 0; imp < importItemNodes.getLength(); imp++) {
            Element importNodeEl = (Element) importItemNodes.item(imp);
            ImportItem importItem = new ImportItem(importNodeEl.getAttribute("name"), this.rightBindingSetName);
            if ( importNodeEl.hasAttribute( "caption")) {
              importItem.setCaption( importNodeEl.getAttribute( "caption"));
            }
            Element importFirstChild = (Element) importNodeEl.getElementsByTagName("*").item(0);// FirstChild();
            String bindingSet = getBindingItemRefBindingSetName(importFirstChild.getAttribute("side"));
            AbstractColumn importItemChild = null;
            if (importFirstChild.getLocalName().equals("BindingItemRef")) {
              importItemChild = new BindingItemRef(importFirstChild.getAttribute("name"), bindingSet, this);

            }
            else if (importFirstChild.getLocalName().equals("Coalesce")) {
              importItemChild = new Coalesce(importNodeEl.getAttribute("name"), this.rightBindingSetName);

              // resolve coalesce children
              NodeList coalesceChildren = importFirstChild.getElementsByTagName("*");
              for (int cChld = 0; cChld < coalesceChildren.getLength(); cChld++) {
                Element cChild = (Element) coalesceChildren.item(cChld);
                AbstractColumn childColItem = null;
                if (cChild.getLocalName().equals("BindingItemRef")) {
                  bindingSet = getBindingItemRefBindingSetName(cChild.getAttribute("side"));
                  childColItem = new BindingItemRef(cChild.getAttribute("name"), bindingSet, this);
                }
                else if (cChild.getLocalName().equals("Value")) {
                  childColItem = new Value("", "", cChild.getTextContent());
                }
                importItemChild.addChildColumnItem(childColItem);
              }
            }

            importItem.addChildColumnItem(importItemChild);

            newImports.addImportItem(importItem);
          }

          // </Imports>
          initChildren = true;
        }
        imports.add(newImports);
      }
    }

    NodeList conditionNode = (NodeList) xPath.evaluate(xPathNS + "Condition", relationElement, XPathConstants.NODESET);

    // <Condition>
    if (conditionNode != null && conditionNode.getLength() > 0) {
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
        constraintNode.getLocalName().equals("LT") ||
        constraintNode.getLocalName().equals("LE") ||
        constraintNode.getLocalName().equals("GT") ||
        constraintNode.getLocalName().equals("GE")
        ) {
      // only 2 BindingItemRef
      if(constraintNode.getLocalName().equals("IsEqual")) curConstraint = new BooleanConstraintImpl(BooleanConstraintImpl.BooleanConstraint.EQ,negate);
      else if (constraintNode.getLocalName().equals("LT")) curConstraint = new BooleanConstraintImpl(BooleanConstraintImpl.BooleanConstraint.LT,negate);
      else if (constraintNode.getLocalName().equals("LE")) curConstraint = new BooleanConstraintImpl(BooleanConstraintImpl.BooleanConstraint.LE,negate);
      else if (constraintNode.getLocalName().equals("GT")) curConstraint = new BooleanConstraintImpl(BooleanConstraintImpl.BooleanConstraint.GT,negate);
      else if (constraintNode.getLocalName().equals("GE")) curConstraint = new BooleanConstraintImpl(BooleanConstraintImpl.BooleanConstraint.GE,negate);

      // Per default the first is left, the second is searched on the right side
      String side = curElement.getAttribute("side");
      if( "".equals(side) )
        side = "left";
      bindingSetName = getBindingItemRefBindingSetName(side);
      curConstraint.addColumn(new BindingItemRef(curElement.getAttribute("name"), bindingSetName, this));

      curElement = (Element) constrChildNodes.item(1);
      side = curElement.getAttribute("side");
      if( "".equals(side) )
        side = "right";
      bindingSetName = getBindingItemRefBindingSetName(side);
      curConstraint.addColumn(new BindingItemRef(curElement.getAttribute("name"), bindingSetName, this));

    }
    else if (constraintNode.getLocalName().equals("IsNull")) {
      curConstraint = new BooleanConstraintImpl(BooleanConstraintImpl.BooleanConstraint.ISNULL, negate);

      bindingSetName = getBindingItemRefBindingSetName(curElement.getAttribute("side"));
      curConstraint.addColumn(new BindingItemRef(curElement.getAttribute("name"), bindingSetName, this));

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
   *
   * Method getImports
   *
   * @return
   */
  public List<Imports> getImports() {
    return imports;
  }

  /**
   * getCondition
   *
   * @return
   */
  public Condition getCondition() {
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
  public BindingSet getSourceBindingSet() throws BindingException {
    if (rightBindingSet == null) {
      Bindings bs = Bindings.getInstance();
      rightBindingSet = bs.get(getRightBindingSetName());
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
   * returns statement created by own condition
   *
   * @return
   */
  public String getConditionStatement( String prepareCaseExpressionForAlias) throws BindingException {
    return getCondition().getConditionStatement( prepareCaseExpressionForAlias);
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
    else
      str = " INNER JOIN ";
    return str;
  }

  /**
   *
   * Method returns comma separated columns, that this relation can select
   *
   * @return
   * @throws BindingException
   */
  public String getImportsColumnsAsString() throws BindingException {
    List<Imports> imps = getImports();
    if (imps.size() == 1)
      return imps.get(0).getColumnsStatement();
    StringBuilder result = new StringBuilder();
    for (Imports imp : imps) {
      if (result.length() > 0)
        result.append(", \n");
      result.append(imp.getColumnsStatement());
    }
    return result.toString();
  }

  /**
   * getImportItems
   *
   * @return
   * @throws BindingException
   */
  public ArrayList<ImportItem> getImportItems() throws BindingException {
    List<Imports> imps = getImports();
    if (imps.size() == 1)
      return imps.get(0).getImportItems();
    ArrayList<ImportItem> result = new ArrayList<ImportItem>();
    for (Imports imp : imps) {
      result.addAll(imp.getImportItems());
    }
    return result;
  }

  /**
   * importsContainItem
   *
   * @param key
   * @return
   * @throws BindingException
   */
  public boolean importsContainItem(String key) throws BindingException {
    for (Imports imp : getImports()) {
      if (imp.containsItem(key))
        return true;
    }
    return false;
  }

  /**
   * getImportItemByName
   *
   * @param key
   * @return
   * @throws BindingException
   */
  public ImportItem getImportItemByName(String key) throws BindingException {
    for (Imports imp : getImports()) {
      if (imp.containsItem(key)) {
        return imp.getImportItemByName(key);
      }
    }
    return null;
  }

  /**
   * getAllImportItemNames
   *
   * @return
   * @throws BindingException
   */
  public ArrayList<String> getAllImportItemNames() throws BindingException {
    if (getImportItems() == null)
      return null;

    ArrayList<String> all = new ArrayList<String>();
    for (int i = 0; i < getImportItems().size(); i++) {
      all.add(getImportItems().get(i).getName());
    }

    return all;
  }

  /**
   * builds SQL statement for the relation like: LEFT OUTER JOIN ...tableName ...aliasName ON ( ...here condition statement )
   */
  public String getRelationStatement() throws BindingException {
    if (statement != null && statement.length() > 0)
      return statement;

    StringBuilder sql = new StringBuilder();
    sql.append(getJoinAsString());
    sql.append(" ").append(getSourceBindingSet().getTableName());
    sql.append(" ").append(BindingAliasMap.getAliasName(getId())); // relation alias
    sql.append(" ON ");
    sql.append(" ( ");
    sql.append( getConditionStatement( null));
    sql.append(" ) ");

    statement = sql.toString();
    return statement;
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

    str.append(getImports().toString());
    if (getCondition() != null)
      str.append(getCondition().toString());

    str.append("</Relation>");
    return str.toString();
  }

}
