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

import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;

import de.businesscode.util.SingletonHolder;

/**
 *
 *          Class responisible for creating a semi-root logger and configuring
 *          it with the {@link FrontendLogRecordPublisher} in order to feed the
 *          queue.
 *
 */
public class FrontendLoggingFacility {
  private static SingletonHolder<Logger> holder = new SingletonHolder<Logger>() {
    @Override
    protected Logger createInstance() {
      Logger logger = LogManager.getRootLogger();
      if (logger instanceof org.apache.logging.log4j.core.Logger) // is always the case when log4j-core is on the classpath
        ((org.apache.logging.log4j.core.Logger) logger).addAppender(FrontendQueueAppender.createAppender());
      return logger;
    }
  };

  public static Logger getLogger() {
    return holder.get();
  }

  /**
   * if not already done - deploys the masterlogger which is receiving requests
   * and queuing them for the client
   */
  public static void deployLogger() {
    getLogger();
  }
}
