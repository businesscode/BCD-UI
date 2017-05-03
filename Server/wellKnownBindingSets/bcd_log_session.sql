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
-- Oracle
DROP TABLE bcd_log_session CASCADE CONSTRAINTS;
CREATE TABLE bcd_log_session
(
   LOG_TIME     TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
   SESSION_ID   VARCHAR2(64),
   USER_AGENT   VARCHAR2(1000),
   REMOTE_ADDR  VARCHAR2(40) NULL,
   SESSION_EXP_TIME TIMESTAMP DEFAULT NULL
);

-- Teradata
DROP TABLE bcd_log_session;
CREATE MULTISET TABLE bcd_log_session
(
   LOG_TIME     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   SESSION_ID   VARCHAR(64),
   USER_AGENT   VARCHAR(1000),
   REMOTE_ADDR  VARCHAR(40)
   SESSION_EXP_TIME TIMESTAMP DEFAULT NULL
);

-- SQLServer
DROP TABLE bcd_log_session;
CREATE TABLE bcd_log_session
(
   LOG_TIME       DATETIME DEFAULT CURRENT_TIMESTAMP,
   SESSION_ID   VARCHAR(64),
   USER_AGENT   VARCHAR(1000),
   REMOTE_ADDR  VARCHAR(40)
   SESSION_EXP_TIME DATETIME DEFAULT NULL
);
