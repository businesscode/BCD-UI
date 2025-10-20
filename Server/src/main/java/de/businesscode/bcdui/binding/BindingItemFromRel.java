package de.businesscode.bcdui.binding;

import de.businesscode.bcdui.binding.exc.BindingNotFoundException;
import de.businesscode.bcdui.binding.rel.Relation;

/**
 * Represents a BindingItem coming form a BindingSet Relation
 */
public class BindingItemFromRel extends BindingItem {

  private final Relation relation;
  private final BindingItem referencedBindingItem;
  
  /**
   * @param src           - Corresponding BindingItem in related BindingSet
   * @param relation
   * @param id            - is with relation prefix when from a default import
   * @param importCaption - In a Relation we can overwrite the imported BindingItem's caption
   */
  public BindingItemFromRel(BindingItem src, Relation relation, String id, String importCaption) {
    super(src);
    this.relation = relation;
    this.referencedBindingItem = src;
    this.setId( id );
    if(importCaption != null) getGeneralAttributesMap().put(Bindings.captionAttribute, importCaption);
  }

  public Relation getRelation() {
    return relation;
  }

  public BindingItem getReferencedBindingItem() {
    return referencedBindingItem;
  }
 
  public String getQColumnExpression( String tableAlias ) {
    return super.getQColumnExpression( getTableAlias(tableAlias) );
  }

  
  /**
   * Returns the table alias of either the main table or the relation, depending on where the source BindingItem belongs to
   * @param mainTableAlias
   * @return
   * @throws BindingNotFoundException
   */
  public String getTableAlias(String mainTableAlias)  {
    String relBs = relation.getSourceBindingSet().getName();
    String biBs = referencedBindingItem.getBindingSet().getName();
    return relBs.equals(biBs) ? relation.getTableAlias(mainTableAlias) : mainTableAlias;
  }

}
