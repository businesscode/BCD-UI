package de.businesscode.bcdui.wrs.load;

import java.util.Set;

import de.businesscode.bcdui.binding.BindingSet;
import de.businesscode.bcdui.binding.StandardBindingSet;
import de.businesscode.bcdui.binding.exc.BindingException;

public interface WrqBindingSet extends BindingSet {

  String getSqlAlias();
  
  SQLStatementWithParams getSubjectFilterExpression(WrqInfo wrqInfo) throws BindingException; 
    
  /**
   * All non-virtual BindingSets that were used at the end, BindingGroups are being resolved to the actually used BindingSets
   * @return
   */
  Set<StandardBindingSet> getResolvedBindingSets();

}
