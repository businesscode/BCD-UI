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

-- db properties
DROP TABLE bcd_db_properties;
CREATE TABLE bcd_db_properties
(
  scope VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  "type" VARCHAR(64) NULL,
  "value" VARCHAR(255) NOT NULL,
  PRIMARY KEY(scope, name)
);


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
DROP TABLE bcd_log_access CASCADE CONSTRAINTS;
CREATE TABLE bcd_log_access
(
   LOG_TIME         DATETIME DEFAULT CURRENT_TIMESTAMP,
   SESSION_ID       VARCHAR(64),
   PAGE_HASH        VARCHAR(64),
   REQUEST_HASH     VARCHAR(64),
   REQUEST_URL      VARCHAR(2000),
   BINDINGSET_NAME  VARCHAR(255),
   REQUEST_XML      NVARCHAR(MAX),
   ROW_COUNT        INTEGER,
   VALUE_COUNT      INTEGER,
   RS_START_TIME    BIGINT,
   RS_END_TIME      BIGINT,
   WRITE_DURATION   INTEGER,
   EXECUTE_DURATION INTEGER
);

DROP TABLE bcd_log_error CASCADE CONSTRAINTS;
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

DROP TABLE bcd_log_login CASCADE CONSTRAINTS;
CREATE TABLE bcd_log_login
(
   LOG_TIME     DATETIME DEFAULT CURRENT_TIMESTAMP,
   SESSION_ID   VARCHAR(64),
   USER_AGENT   VARCHAR(1000),
   REMOTE_ADDR  VARCHAR(40),
   USER_NAME    VARCHAR(128),
   LOGIN_RESULT VARCHAR(32),
   SESSION_EXP_TIME  DATETIME DEFAULT NULL
);

DROP TABLE bcd_log_page CASCADE CONSTRAINTS;
CREATE TABLE bcd_log_page
(
   LOG_TIME     DATETIME DEFAULT CURRENT_TIMESTAMP,
   SESSION_ID   VARCHAR(64),
   PAGE_HASH    VARCHAR(64),
   REQUEST_URL  VARCHAR(4000),
   GUI_STATUS   NVARCHAR(MAX)
);

DROP TABLE bcd_log_pageperformance CASCADE CONSTRAINTS;
CREATE TABLE bcd_log_pageperformance
(
   LOG_TIME     DATETIME DEFAULT CURRENT_TIMESTAMP,
   SESSION_ID   VARCHAR(64),
   PAGE_HASH    VARCHAR(64),
   REQUEST_HASH VARCHAR(64),
   DURATION     INTEGER,
   ADD_INFO     VARCHAR(256),
   REQUEST_URL  VARCHAR(4000),
   GUI_STATUS   NVARCHAR(MAX),
   LOG_NAME     VARCHAR(64)
);

DROP TABLE bcd_log_session CASCADE CONSTRAINTS;
CREATE TABLE bcd_log_session
(
   LOG_TIME     DATETIME DEFAULT CURRENT_TIMESTAMP,
   SESSION_ID   VARCHAR(64),
   USER_AGENT   VARCHAR(1000),
   REMOTE_ADDR  VARCHAR(40),
   SESSION_EXP_TIME DATETIME DEFAULT NULL
);

DROP TABLE bcd_log_sql CASCADE CONSTRAINTS;
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

-- security
DROP TABLE BCD_SEC_USER;
CREATE TABLE BCD_SEC_USER
(
  user_id     VARCHAR(128),
  user_login  VARCHAR(128),
  name        VARCHAR(128),
  password    VARCHAR(128),
  password_salt    VARCHAR(64),
  is_disabled VARCHAR(64),
  PRIMARY KEY (user_id),
  UNIQUE(user_login)
);

DROP TABLE bcd_sec_user_roles;
CREATE TABLE bcd_sec_user_roles
(
   user_id         VARCHAR(128) NOT NULL,
   user_role       VARCHAR(64)  NOT NULL,
   PRIMARY KEY (user_id,  user_role)
);

DROP TABLE bcd_sec_user_settings;
CREATE TABLE bcd_sec_user_settings
(
   user_id         VARCHAR(128) NOT NULL,
   right_type      VARCHAR(64)  NOT NULL,
   right_value     VARCHAR(64)  NOT NULL,
   PRIMARY KEY (user_id, right_type, right_value)
);

-- tiny url
DROP TABLE bcd_tinyurl_control;
CREATE TABLE bcd_tinyurl_control
(
  tiny_url VARCHAR(33) NOT NULL,
  long_url VARCHAR(MAX),
  creation_dt DATE NOT NULL,
  last_used_dt DATE NOT NULL
);
ALTER TABLE bcd_tinyurl_control ADD CONSTRAINT PK_bcd_TINYURL_CONTROL PRIMARY KEY (tiny_url);

-- vfs
-- A primary key (bcd_virtual_file_system_pk) may only be 900 bytes long, we limit path for that
DROP TABLE bcd_virtualFileSystem CASCADE CONSTRAINTS;
CREATE TABLE bcd_virtualFileSystem
(
   path           VARCHAR(850) NOT NULL,
   resource_clob  NVARCHAR(MAX),
   resource_blob  VARBINARY(MAX),
   is_server      INTEGER NOT NULL,
   updated_by     VARCHAR(128),
   last_update    DATETIME,
   bcd_userId     VARCHAR(64),
   CONSTRAINT bcd_virtual_file_system_pk UNIQUE (path, is_server, bcd_userId)
);

-- cache
DROP TABLE bcd_cache_scope;
CREATE  TABLE bcd_cache_scope
(
  scope                  VARCHAR(256) NOT NULL UNIQUE,
  scope_last_modified    TIMESTAMP,
  earliest_next_modified TIMESTAMP,
  expires_min_offset_sec INTEGER
);
