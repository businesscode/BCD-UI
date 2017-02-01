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
package de.businesscode.bcdui.wrs.save.event;


import java.sql.Connection;

public class SaveEvent {

  private SaveEventState eventState;
  private Connection connection;

  /**
   * @param connectionPr
   * @param eventStatePr
   */
  public SaveEvent(Connection connectionPr, SaveEventState eventStatePr) {
    super();
    this.connection = connectionPr;
    this.eventState = eventStatePr;
  }

  public SaveEventState getEventState() {
    return eventState;
  }

  public Connection getConnection() {
    return connection;
  }
}
