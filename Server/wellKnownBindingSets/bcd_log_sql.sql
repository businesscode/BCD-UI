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
DROP TABLE bcd_log_sql CASCADE CONSTRAINTS;
CREATE TABLE bcd_log_sql
(
   LOG_TIME       TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
   SESSION_ID     VARCHAR2(64) DEFAULT NULL,
   PAGE_HASH      VARCHAR2(64) DEFAULT NULL,
   REQUEST_HASH   VARCHAR2(64) DEFAULT NULL,
   DURATION_MS    NUMBER(11,0) NOT NULL,
   ROWS_AFFECTED  NUMBER(19) DEFAULT NULL,
   JDBC_METHOD    VARCHAR2(32),
   SQL            CLOB
);

-- Teradata
drop table bcd_log_sql;
CREATE MULTISET TABLE bcd_log_sql
(
   LOG_TIME       TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
   SESSION_ID     VARCHAR(64) DEFAULT NULL,
   PAGE_HASH      VARCHAR(64) DEFAULT NULL,
   REQUEST_HASH   VARCHAR(64) DEFAULT NULL,
   DURATION_MS    INTEGER NOT NULL,
   ROWS_AFFECTED  INTEGER DEFAULT NULL,
   JDBC_METHOD    VARCHAR(32),
   "SQL"          CLOB
);

-- SQLServer
drop table bcd_log_sql;
CREATE TABLE bcd_log_sql
(
   LOG_TIME       DATETIME DEFAULT CURRENT_TIMESTAMP,
   SESSION_ID     VARCHAR(64) DEFAULT NULL,
   PAGE_HASH      VARCHAR(64) DEFAULT NULL,
   REQUEST_HASH   VARCHAR(64) DEFAULT NULL,
   DURATION_MS    INTEGER NOT NULL,
   ROWS_AFFECTED  INTEGER DEFAULT NULL,
   JDBC_METHOD    VARCHAR(32),
   "SQL"          VARCHAR(MAX)
);

-- PostgreSQL
DROP TABLE bcd_log_sql CASCADE;
CREATE TABLE bcd_log_sql
(
   LOG_TIME       TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
   SESSION_ID     VARCHAR(64) DEFAULT NULL,
   PAGE_HASH      VARCHAR(64) DEFAULT NULL,
   REQUEST_HASH   VARCHAR(64) DEFAULT NULL,
   DURATION_MS    NUMERIC(11,0) NOT NULL,
   ROWS_AFFECTED  NUMERIC(19) DEFAULT NULL,
   JDBC_METHOD    VARCHAR(32),
   SQL            TEXT
);
