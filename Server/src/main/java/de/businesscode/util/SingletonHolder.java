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

import java.util.LinkedList;
import java.util.List;

import de.businesscode.bcdui.web.BcdUiApplicationContextListener;

/**
 * <p>
 * this singleton-holder helper should be used in container environments to prevent class loader leaking, implementation currently does not use java's
 * WeakReferences or SoftReferences to reference the instances, rather is uses strong references via Maps keyed by the class-name string. We could use
 * WeakReference which would be garbage collected properly, but this is against the usual Singleton idea to save start-up costs, as it would cause to re-create
 * such costly "singletons" many times during container webapp lifecycle. If the singletons are managed by this holder, it is ensured, that all singleton
 * references are dropped once the webapp is shut down. The {@link BcdUiApplicationContextListener} takes care of this and calls {@link #clear()} method.
 * </p>
 * <p>
 * usage example:
 * </p>
 * 
 * <pre>
 * class MySingleton {
 *   private static SingletonHolder&lt;MySingleton&gt; holder = new SingletonHolder&lt;&gt;() {
 *     createInstance() {
 *       return new MySingleton();
 *     }
 *   }.init(); // optionally, otherwise the instantiation would be lazy
 * 
 *   static MySingleton getInstance() {
 *     return holder.get();
 *   }
 * }
 * </pre>
 * <p>
 * Future note: this implementation *can* be extended to support native SoftReferences or WeakReferences i.e. via a constructor switch or subclsses which would
 * maybe suit more the non-costly singletons being re-created and cleaned-up many times during typical webapp lifecycle.
 * </p>
 * 
 * @since 4.5.6
 */
public abstract class SingletonHolder<T> {
  // track to enable explicit cleanup
  private static final List<SingletonHolder<?>> holders = new LinkedList<SingletonHolder<?>>();

  private T instance;

  /**
   * implement to return an instance of type T
   * 
   * @return
   */
  abstract protected T createInstance();

  /**
   * @return instance of type T
   */
  public T get() {
    /*
     * TODO: we could also switch to double-checked locking to gain slightly more peformance
     * by resigning the synchronized method
     */
    synchronized (holders) {

      if (instance == null) {
        instance = createInstance();
        holders.add(this);
      }

      return instance;
    }
  }

  /**
   * calls {@link #get()} to obtain an instance eagerly, otherwise will create instance lazily on a first {@link #get()} call
   * 
   * @return
   */
  public SingletonHolder<T> init() {
    get();
    return this;
  }

  /**
   * calling THIS method clears all references to singleton instances allowing GC to collect them
   * causing to re-create instances on next access.
   */
  public synchronized static void clear() {
    synchronized (holders) {
      for (SingletonHolder<?> holder : holders) {
        holder.instance = null;
      }
      holders.clear();
    }
  }
}
