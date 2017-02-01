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

package de.businesscode.bcdui.web.clientLogging;

import java.io.IOException;
import java.io.Writer;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentLinkedQueue;


/**
 *
 * This singleton string queue is used with {@link FrontendQueueAppender} and
 * its consumer
 *
 * FIXME optimization needed: aging should be added, so content is dropped after some time
 *
 */
class SingletonStringQueue extends ConcurrentLinkedQueue<String> {
  private static final long serialVersionUID = 1L;
  private static final Map<String, SingletonStringQueue> queueMap = new HashMap<String, SingletonStringQueue>();

  public static SingletonStringQueue getInstance(String key){
    SingletonStringQueue queue = queueMap.get(key);

    if(queue == null) {
      synchronized(queueMap){
        queue = queueMap.get(key);
        if(queue == null){
          queue = new SingletonStringQueue();
        }
        queueMap.put(key, queue);
      }
    }

    return queue;
  }

  public synchronized void flush(Writer w) throws IOException {
    String s;
    while((s=poll()) != null){
      w.append(s);
    }
  }
}
