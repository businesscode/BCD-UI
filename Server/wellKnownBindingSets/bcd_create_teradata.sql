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

-- i18n
DROP TABLE BCD_I18N CASCADE CONSTRAINTS;
CREATE TABLE BCD_I18N
(
   I18N_KEY    VARCHAR(255),
   I18N_LANG   VARCHAR(255),
   I18N_VALUE  VARCHAR(255),
   PRIMARY KEY(I18N_KEY, I18N_LANG)
);

-- identifier
CREATE TABLE BCD_IDENTIFIER (
  SCOPE VARCHAR(255) PRIMARY KEY,
  LASTID INTEGER DEFAULT 1
);

-- logging
DROP TABLE bcd_log_access;
CREATE MULTISET TABLE bcd_log_access
(
   LOG_TIME         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   SESSION_ID       VARCHAR(64),
   PAGE_HASH        VARCHAR(64),
   REQUEST_HASH     VARCHAR(64),
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

DROP TABLE bcd_log_login;
CREATE MULTISET TABLE bcd_log_login
(
   LOG_TIME     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   SESSION_ID   VARCHAR(64),
   USER_AGENT   VARCHAR(1000),
   REMOTE_ADDR  VARCHAR(40),
   USER_NAME    VARCHAR(128),
   LOGIN_RESULT VARCHAR(32),
   SESSION_EXP_TIME  TIMESTAMP DEFAULT NULL
);

DROP TABLE bcd_log_page;
CREATE MULTISET TABLE bcd_log_page
(
   LOG_TIME     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   SESSION_ID   VARCHAR(64),
   PAGE_HASH    VARCHAR(64),
   REQUEST_URL  VARCHAR(4000),
   GUI_STATUS   VARCHAR(27000)
);

drop table bcd_log_pageperformance;
CREATE MULTISET TABLE bcd_log_pageperformance
(
   LOG_TIME     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   SESSION_ID   VARCHAR(64),
   PAGE_HASH    VARCHAR(64),
   REQUEST_HASH VARCHAR(64),
   REQUEST_URL  VARCHAR(4000),
   DURATION     INTEGER,
   ADD_INFO     VARCHAR(256),
   GUI_STATUS   VARCHAR(27000),
   LOG_NAME     VARCHAR(64)
);

DROP TABLE bcd_log_session;
CREATE MULTISET TABLE bcd_log_session
(
   LOG_TIME     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   SESSION_ID   VARCHAR(64),
   USER_AGENT   VARCHAR(1000),
   REMOTE_ADDR  VARCHAR(40),
   SESSION_EXP_TIME TIMESTAMP DEFAULT NULL
);

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

-- tiny url
DROP TABLE bcd_tinyurl_control;
CREATE SET TABLE bcd_tinyurl_control, FALLBACK, NO BEFORE JOURNAL, NO AFTER JOURNAL, CHECKSUM = DEFAULT, DEFAULT MERGEBLOCKRATIO
(
  tiny_url VARCHAR(33),
  long_url CLOB,
  creation_dt DATE NOT NULL,
  last_used_dt DATE NOT NULL
)
UNIQUE PRIMARY INDEX ( tiny_url );

-- cache
DROP TABLE bcd_cache_scope;
CREATE  TABLE bcd_cache_scope
(
  scope                  VARCHAR(256) NOT NULL UNIQUE,
  scope_last_modified    TIMESTAMP,
  earliest_next_modified TIMESTAMP,
  expires_min_offset_sec INTEGER
);
