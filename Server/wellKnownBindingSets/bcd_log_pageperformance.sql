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
DROP TABLE bcd_log_pageperformance CASCADE CONSTRAINTS;
CREATE TABLE bcd_log_pageperformance
(
   LOG_TIME     TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
   SESSION_ID   VARCHAR2(32),
   PAGE_HASH    VARCHAR2(32),
   REQUEST_HASH VARCHAR2(32),
   REQUEST_URL  VARCHAR2(4000),
   DURATION     NUMBER(22),
   ADD_INFO     VARCHAR2(256),
   GUI_STATUS   CLOB,
   LOG_NAME     VARCHAR2(64)
);

-- TeraData, Postgres
drop table bcd_log_pageperformance;
CREATE MULTISET TABLE bcd_log_pageperformance
(
   LOG_TIME     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   SESSION_ID   VARCHAR(32),
   PAGE_HASH    VARCHAR(32),
   REQUEST_HASH VARCHAR(32),
   REQUEST_URL  VARCHAR(4000),
   DURATION     INTEGER,
   ADD_INFO     VARCHAR(256),
   GUI_STATUS   VARCHAR(27000),
   LOG_NAME     VARCHAR(64)
);

-- SQLServer
drop table bcd_log_pageperformance;
CREATE TABLE bcd_log_pageperformance
(
   LOG_TIME     DATETIME DEFAULT CURRENT_TIMESTAMP,
   SESSION_ID   VARCHAR(32),
   PAGE_HASH    VARCHAR(32),
   REQUEST_HASH VARCHAR(32),
   DURATION     INTEGER,
   ADD_INFO     VARCHAR(256),
   REQUEST_URL  VARCHAR(4000),
   GUI_STATUS   VARCHAR(MAX),
   LOG_NAME     VARCHAR(64)
);
