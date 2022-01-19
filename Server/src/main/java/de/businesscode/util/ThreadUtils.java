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
}
