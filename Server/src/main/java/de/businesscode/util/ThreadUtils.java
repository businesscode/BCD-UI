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
package de.businesscode.util;

import java.io.PrintWriter;
import java.lang.reflect.Field;

public class ThreadUtils {
  /**
   * looksup a first matching thread by regular expression
   * 
   * @param regex
   * @return
   */
  public static Thread getThreadByPattern(String regex) {
    ThreadGroup tg = Thread.currentThread().getThreadGroup();

    // get the root group
    while (tg.getParent() != null) {
      tg = tg.getParent();
    }

    Thread[] threads = new Thread[tg.activeCount()];
    tg.enumerate(threads);
    
    for(Thread t:threads){
      String name = t.getName();
      if(name != null && name.matches(regex)){
        return t;
      }
    }
    // no matching thread found
    return null;
  }
  
  /**
   * debugging utility: prints out all thread-locals
   * 
   * @param source
   * @param writer
   */
  public static void printThreadLocals(String source, PrintWriter writer) {
    try {
      Thread t = Thread.currentThread();
      StringBuilder sb = new StringBuilder("--- listing thread locals from " + t.getName() + "#" + t.getId() + " (source:"+source+") ---\n");
      
      Field field1 = Thread.class.getDeclaredField("threadLocals");
      field1.setAccessible(true);
      Object o1 = field1.get(t);
      Field field2 = o1.getClass().getDeclaredField("table");
      field2.setAccessible(true);
      Object[] o2 = (Object[]) field2.get(o1);
      for (Object temp : o2) {
          if (temp != null) {
              Field field3 = temp.getClass().getDeclaredField("value");
              field3.setAccessible(true);
              Object o3 = field3.get(temp);
              sb.append(o3);
          }
      }
      sb.append("\n--- --- ---\n");
      writer.append(sb.toString());
    } catch (Exception e) {
      throw new RuntimeException("failed to list thread-locals", e);
    }
  }
}
