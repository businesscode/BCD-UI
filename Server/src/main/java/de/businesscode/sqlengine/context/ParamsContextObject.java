/*
  Copyright 2010-2023 BusinessCode GmbH, Germany

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
package de.businesscode.sqlengine.context;

import java.util.List;
import java.util.Map;
import java.util.Vector;

/**
 * This is the velocity context object, that represents param
 * substitution by one or many placeholders.
 *
 */
public class ParamsContextObject {
   public final String defaultSeparator = ",";
   public final String defaultPlaceholder = "?";
   private final String separator;
   private final String placeholder;
   private Map<String,Integer> multiplicities;
   private final List<String> requestedKeys = new Vector<String>();

   /**
    * using defaults, separator ',' substitute '?'
    */
   public ParamsContextObject(Map<String,Integer> multiplicity) {
      this.separator = defaultSeparator;
      this.placeholder = defaultPlaceholder;
      this.multiplicities = multiplicity;
   }

   /**
    *
    * @param placeholder another substitute instead of default '?'
    */
   public ParamsContextObject(String placeholder, String separator, Map<String, Integer> multiplicity) {
      this.separator = separator;
      this.placeholder = placeholder;
      this.multiplicities = multiplicity;
   }

   /**
    * getter for Velocity
    * stores requested key
    * @return constant placeholder, or separated lists of those
    */
   public Object get(String key) {
      Integer nr;

      // default if called without mutliplicities
      nr = (null == multiplicities) ? Integer.valueOf(1) : multiplicities.get(key);
      // actual no hit is error
      if(null == nr){
         return null;
      }
      requestedKeys.add(key);

      return buildSeparatedPlaceholdersList(nr.intValue());
   }

   /**
    * return
    * @param nr
    * @return nr placeholders separated by separators
    */
   private String buildSeparatedPlaceholdersList(int nr) {
      StringBuilder s = new StringBuilder();
      for (int i=0; i< nr; ++i) {
         if (i>0) {s.append(separator);}
         s.append(placeholder);
      }
      return s.toString();
   }

   /**
    *
    * @return List of keys requested keys
    */
   public List<String> getRequestedKeys() {
      return requestedKeys;
   }

   /**
    * getter
    */
   public String getPlaceholder() {
      return placeholder;
   }

   /**
    * @return placeholder and requestedKeys as one String
    */
   public String toString() {
      return placeholder + ":" + requestedKeys;
   }

}
