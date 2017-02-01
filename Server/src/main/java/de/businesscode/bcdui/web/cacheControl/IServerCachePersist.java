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
package de.businesscode.bcdui.web.cacheControl;

import java.io.InputStream;
import java.io.OutputStream;

/**
 * This interface describes the methods for the server side cacing store.
 * Please implement this interface in order to provide custom store implementation.
 */
public interface IServerCachePersist {
    /**
     * Method clean<br>
     * remove all cache items from the store depends on prefix
     * @param prefix
     * @throws Exception
     */
    public void clean(String prefix) throws Exception;
    /**
     * Method getOutputStream
     * @param prefix
     * @param key
     * @return output stream for creating a new item depends on prefix and key. The OutputStream will be closed by caller
     * @throws Exception
     */
    public OutputStream getOutputStream(String prefix, String key) throws Exception;
    /**
     * Method getInputStream
     * @param prefix
     * @param key
     * @return input stream for reading item depends on prefix and key. The InputStream will be closed by caller
     * @throws Exception
     */
    public InputStream getInputStream(String prefix, String key)throws Exception;
    /**
     * Method dropItem<br>
     * drop a single item, this method is necessary for clean job in case of occurred exception
     * @param prefix
     * @param key
     * @throws Exception
     */
    public void dropItem(String prefix, String key) throws Exception;
    /**
     * Method isCached
     * @param prefix
     * @param key
     * @return true if the item depends on prefix and key available in the store
     * @throws Exception
     */
    public boolean isCached(String prefix, String key) throws Exception;
    /**
     * Method getLastModified
     * @param prefix
     * @param key
     * @return the long value represents the last modified timestamp in milliseconds
     * @throws Exception
     */
    public long getLastModified(String prefix, String key) throws Exception ;
}
