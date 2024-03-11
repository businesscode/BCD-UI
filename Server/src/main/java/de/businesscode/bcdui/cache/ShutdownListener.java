/*
  Copyright 2010-2024 BusinessCode GmbH, Germany

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
package de.businesscode.bcdui.cache;

import net.sf.ehcache.CacheManager;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import jakarta.servlet.ServletContextEvent;
import jakarta.servlet.ServletContextListener;

import java.util.List;

public class ShutdownListener implements ServletContextListener {

    private static final Logger log = LogManager.getLogger(ShutdownListener.class);

    public void contextInitialized(ServletContextEvent servletContextEvent) {}

    public void contextDestroyed(ServletContextEvent servletContextEvent) {
        List knownCacheManagers = CacheManager.ALL_CACHE_MANAGERS;
        if (log.isDebugEnabled()) {
          log.debug("Shutting down " + knownCacheManagers.size() + " CacheManagers.");
        }
        while (!knownCacheManagers.isEmpty()) {
            ((CacheManager) CacheManager.ALL_CACHE_MANAGERS.get(0)).shutdown();
        }
    }
}
