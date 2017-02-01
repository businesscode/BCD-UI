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
DROP TABLE bcd_log_access CASCADE CONSTRAINTS;
CREATE TABLE bcd_log_access
(
   LOG_TIME         TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
   SESSION_ID       VARCHAR2(32),
   PAGE_HASH        VARCHAR2(32),
   REQUEST_HASH     VARCHAR2(32),
   REQUEST_URL      VARCHAR2(2000 Char),
   BINDINGSET_NAME  VARCHAR2(255 Char),
   REQUEST_XML      CLOB,
   ROW_COUNT        NUMBER(22),
   VALUE_COUNT      NUMBER(22),
   RS_START_TIME    NUMBER(22),
   RS_END_TIME      NUMBER(22),
   WRITE_DURATION   NUMBER(22),
   EXECUTE_DURATION NUMBER(22)
);


-- Teradata
DROP TABLE bcd_log_access;
CREATE MULTISET TABLE bcd_log_access
(
   LOG_TIME         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   SESSION_ID       VARCHAR(32),
   PAGE_HASH        VARCHAR(32),
   REQUEST_HASH     VARCHAR(32),
   REQUEST_URL      VARCHAR(2000),
   BINDINGSET_NAME  VARCHAR(255),
   REQUEST_XML      CLOB,
   ROW_COUNT        INTEGER,
   VALUE_COUNT      INTEGER,
   RS_START_TIME    DECIMAL(22,0),
   RS_END_TIME      DECIMAL(22,0),
   WRITE_DURATION   INTEGER,
   EXECUTE_DURATION INTEGER

);

-- SQL Server
CREATE TABLE bcd_log_access
(
   LOG_TIME         DATETIME DEFAULT CURRENT_TIMESTAMP,
   SESSION_ID       VARCHAR(32),
   PAGE_HASH        VARCHAR(32),
   REQUEST_HASH     VARCHAR(32),
   REQUEST_URL      VARCHAR(2000),
   BINDINGSET_NAME  VARCHAR(255),
   REQUEST_XML      VARCHAR(MAX),
   ROW_COUNT        INTEGER,
   VALUE_COUNT      INTEGER,
   RS_START_TIME    BIGINT,
   RS_END_TIME      BIGINT,
   WRITE_DURATION   INTEGER,
   EXECUTE_DURATION INTEGER
);
