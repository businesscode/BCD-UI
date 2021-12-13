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
package de.businesscode.sqlengine;

import java.io.StringWriter;
import java.util.HashSet;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.AbstractMap;
import java.util.Set;
import java.util.Vector;
import java.util.stream.Collectors;

import org.apache.velocity.VelocityContext;
import org.apache.velocity.app.VelocityEngine;
import org.apache.velocity.runtime.log.NullLogChute;

import de.businesscode.bcdui.binding.BindingItem;
import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.StandardBindingSet;
import de.businesscode.sqlengine.context.BindingSetContextObject;
import de.businesscode.sqlengine.context.BindingsContextObject;
import de.businesscode.sqlengine.context.BindingsLookupContextObject;
import de.businesscode.sqlengine.context.ParamsContextObject;


/**
 * The SQL Engine can transform sql fragments containing references to BindingSets into pure sql, 
 * resolving table and column names
 * 
 * To resolve the given binding set/group names to the right concrete BindingSets first, it parses the given sql twice, 
 * - In phase 2 it will just collect the binding set name - binding item names combination,
 *   using BindingsLookupContextObject and BindingSetLookupContextObject
 * - In phase 2 it does then know the concrete BindingSet and BindingItem and can output the appropriate table and column names,
 *   using BindingsContextObject and BindingSetContextObject
 */
public class SQLEngine {
   private VelocityEngine velocityEngine;
   private Set<String> requestedBindingSets = new HashSet<String>();
   private Set<StandardBindingSet> resultingBindingSets = new HashSet<StandardBindingSet>();
   private final List<BindingItem> selectedBindigItemsInOrder = new LinkedList<BindingItem>();
   private final List<BindingItem> allBindigItemsInOrder = new LinkedList<BindingItem>();

   /**
    * Getter for a list of all BindindItems used in this sql and mentioned before the table name
    */
   public List<BindingItem> getSelectedBindigItemsInOrder() {
    return selectedBindigItemsInOrder;
  }

   /**
    * Getter for a list of all BindindItems used in this sql
    */
   public List<BindingItem> getAllBindigItemsInOrder() {
    return allBindigItemsInOrder;
  }

   /**
    * Get first index of selected BindingItem
    */
  public int getIndex(String bindingItem) {
    int index = 1;
    for(BindingItem bi: allBindigItemsInOrder) {
      if( bi.getId().equals(bindingItem)) {
        return index;
      }
      index++;
    }
    return -1;
  }

  /**
   * Getter for BindingSets which where chosen base on the BindingSet name and BindingItems
   */
  public Set<StandardBindingSet> getResultingBindingSets() {
    return resultingBindingSets;
  }

  /**
   * Getter for the BindingSet requested for this sql
   */
  public Set<Map.Entry<String,String>> getRequestedBindingSetNames() {
     return requestedBindingSets.stream().map(bs->new AbstractMap.SimpleImmutableEntry<>(bs, "")).collect(Collectors.toSet());
  }

  /**
    *
    */
   public SQLEngine() {
   }

   /**
    * transform
    *
    * @param sql
    * @return the transformed sql
    */
   public String transform(String sql) {
     return transform(sql, (Map<String, Object>) null);
   }

   /**
    * 
    * @param sql
    * @param additionalProps
    * @return
    */
   public String transform(String sql, Map<String, Object> additionalProps) {
      Bindings bindings;
      try {
         bindings = Bindings.getInstance();
      }
      catch (Exception e) {
         throw new RuntimeException("Unable to get the Bindings instance", e);
      }
      return transform(sql, bindings, additionalProps);
   }

   /**
    * transform
    *
    * @param sql
    * @param bindings
    * @return the transformed sql
    */
   public String transform(String sql, Bindings bindings) {
     return transform(sql, bindings, null);
   }
   
   /**
    * 
    * @param sql
    * @param bindings
    * @param additionalProps
    * @return
    */
   public String transform(String sql, Bindings bindings, Map<String, Object> additionalProps) 
   {
      // Phase 1 - lookup for used binding set name / binding item names combination
      BindingsLookupContextObject bindingsLookup = lookupBindingsReferences(sql);

      VelocityContext context = new VelocityContext();
      BindingsContextObject bindingsContextObject = new BindingsContextObject(bindings, bindingsLookup);
      context.put("bindings", bindingsContextObject);

      // Phase 2 - create the real SQL.
      // add additional props
      if(additionalProps != null){
        additionalProps.forEach((k,v) -> {
          context.put(k, v);
        });
      }
      StringWriter result = new StringWriter();
      getVelocityEngine().evaluate(context, result, "sql", sql);

      // Provide some information to our user
      Map<String, BindingSetContextObject> bindingMap = bindingsContextObject.getUsedBindings();
      bindingMap.keySet().stream().forEach( requestedBindingSets::add );
      bindingMap.values().stream().map( p->p.getBindingSet() ).forEach( resultingBindingSets::add );
      bindingMap.values().stream().map( p->p.getSelectedBindingItemsInOrder() ).flatMap(l->l.stream() ).forEach( selectedBindigItemsInOrder::add );
      bindingMap.values().stream().map( p->p.getAllBindingItemsInOrder() ).flatMap(l->l.stream() ).forEach( allBindigItemsInOrder::add );

      return result.toString();
   }

/**
 * simple transform parameters into multiplicities of actual question marks ('?')
 * and store the substituted unqualified names
 *
 * @param sql input string
 * @param substitutes List that will contain the substitutions. Unchecked for null.
 * @param multiplicities map the keywords to number of substitutions needed. If null,
 * number of substitutions is consistently 1
 * @param keyword pretext that is used for look up of values to transform. If null, 'params' is used.
 * @return the input string with occurences like '$params.some_name_or_other' substituted by '?'
 * (or by '?,?,?' depending on the multiplicity map) and the List of the 'some_name_or_other'
 * in the substitutes List.
 *
 */
   public String transformParams(
            String sql, final Map<String, Integer> multiplicities,
            String keyword, String separator,
            Vector<String> substitutes) {
      final String defaultKeyword = "params";
      if (null == keyword || keyword.isEmpty() ) {
         keyword = defaultKeyword;
      }

      VelocityContext context = new VelocityContext();
      ParamsContextObject mapToQuestionMark = new ParamsContextObject(multiplicities);
      context.put(keyword, mapToQuestionMark);

      StringWriter result = new StringWriter();
      getVelocityEngine().evaluate(context, result, "sql", sql);

      substitutes.addAll(mapToQuestionMark.getRequestedKeys());
      return result.toString();
   }


   /**
    * This is phase one -> derive the the binding set name / used binding items combination
    *
    * @param sql
    * @return not an transformed sql but a map with binding set name to BindingSetLookupContextObject, which is in essence
    * the combination mentioned above
    */
   private BindingsLookupContextObject lookupBindingsReferences(String sql) {
      VelocityContext context = new VelocityContext();
      BindingsLookupContextObject bindingsObject = new BindingsLookupContextObject();
      context.put("bindings", bindingsObject);
      //
      StringWriter result = new StringWriter();
      getVelocityEngine().evaluate(context, result, "sql", sql);
      //
      return bindingsObject;
   }

   /**
    * @return the velocityEngine
    */
   private VelocityEngine getVelocityEngine() {
      if (velocityEngine == null) {
         velocityEngine = new VelocityEngine();
         //
         // setup the velocityEngine
         //
         // logging
         velocityEngine.setProperty(VelocityEngine.RUNTIME_LOG_LOGSYSTEM, new NullLogChute()); // no logging
         //
         velocityEngine.init();
      }
      return velocityEngine;
   }
}
