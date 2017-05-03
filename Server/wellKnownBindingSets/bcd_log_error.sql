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
DROP TABLE bcd_log_error CASCADE CONSTRAINTS;
CREATE TABLE bcd_log_error
(
   LOG_TIME     TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
   SESSION_ID   VARCHAR2(64),
   PAGE_HASH    VARCHAR2(64),
   REQUEST_HASH VARCHAR2(64),
   REQUEST_URL  VARCHAR2(2000 Char),
   LOG_LEVEL    VARCHAR2(10 Char)    NULL,
   MESSAGE      CLOB                 NULL,
   STACK_TRACE  CLOB                 NULL,
   REVISION     VARCHAR2(30 Char)    NULL
);

-- Teradata
DROP TABLE bcd_log_error;
CREATE MULTISET TABLE bcd_log_error
(
   LOG_TIME     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   SESSION_ID   VARCHAR(64)    NULL,
   PAGE_HASH    VARCHAR(64)    NULL,
   REQUEST_HASH VARCHAR(64)    NULL,
   REQUEST_URL  VARCHAR(2000)  NULL,
   LOG_LEVEL    VARCHAR(10)    NULL,
   MESSAGE      CLOB           NULL,
   STACK_TRACE  CLOB           NULL,
   REVISION     VARCHAR(30)    NULL
);

-- SQLServer
DROP TABLE bcd_log_error;
CREATE TABLE bcd_log_error
(
   LOG_TIME     DATETIME DEFAULT CURRENT_TIMESTAMP,
   SESSION_ID   VARCHAR(64)    NULL,
   PAGE_HASH    VARCHAR(64)    NULL,
   REQUEST_HASH VARCHAR(64)    NULL,
   REQUEST_URL  VARCHAR(2000)  NULL,
   LOG_LEVEL    VARCHAR(10)    NULL,
   MESSAGE      VARCHAR(MAX)   NULL,
   STACK_TRACE  VARCHAR(MAX)   NULL,
   REVISION     VARCHAR(30)    NULL
);
   

-- Postgres
DROP TABLE bcd_log_error;
CREATE TABLE bcd_log_error
(
   LOG_TIME     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   SESSION_ID   VARCHAR(64)    NULL,
   PAGE_HASH    VARCHAR(64)    NULL,
   REQUEST_HASH VARCHAR(64)    NULL,
   REQUEST_URL  VARCHAR(2000)  NULL,
   LOG_LEVEL    VARCHAR(10)    NULL,
   MESSAGE      VARCHAR(64000) NULL,
   STACK_TRACE  VARCHAR(64000) NULL,
   REVISION     VARCHAR(30)    NULL
);