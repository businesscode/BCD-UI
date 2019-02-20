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
DROP TABLE bcd_db_properties CASCADE CONSTRAINTS;
CREATE TABLE bcd_db_properties
(
  scope VARCHAR2(32) NOT NULL,
  name VARCHAR2(255) NOT NULL,
  "type" VARCHAR2(64) NULL,
  "value" VARCHAR2(255) NOT NULL,
  PRIMARY KEY(scope, name)
);

-- i18n
DROP TABLE BCD_I18N CASCADE CONSTRAINTS;
CREATE TABLE BCD_I18N
(
   I18N_KEY    VARCHAR2(255 Char),
   I18N_LANG   VARCHAR2(255 Char),
   I18N_VALUE  VARCHAR2(255 Char),
   PRIMARY KEY(I18N_KEY, I18N_LANG)
);

-- identifier
CREATE TABLE BCD_IDENTIFIER (
  "SCOPE" VARCHAR2(255 CHAR) PRIMARY KEY,
  "LASTID" NUMBER(22,0) DEFAULT 1
);

-- logging
DROP TABLE bcd_log_access CASCADE CONSTRAINTS;
CREATE TABLE bcd_log_access
(
   LOG_TIME         TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
   SESSION_ID       VARCHAR2(64),
   PAGE_HASH        VARCHAR2(64),
   REQUEST_HASH     VARCHAR2(64),
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

DROP TABLE bcd_log_login CASCADE CONSTRAINTS;
CREATE TABLE bcd_log_login
(
   LOG_TIME     TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
   SESSION_ID   VARCHAR2(64),
   USER_AGENT   VARCHAR2(1000),
   REMOTE_ADDR  VARCHAR2(40) NULL,
   USER_NAME    VARCHAR2(128),
   LOGIN_RESULT VARCHAR2(32),
   SESSION_EXP_TIME  TIMESTAMP DEFAULT NULL
);

DROP TABLE bcd_log_page CASCADE CONSTRAINTS;
CREATE TABLE bcd_log_page
(
   LOG_TIME     TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
   SESSION_ID   VARCHAR2(64),
   PAGE_HASH    VARCHAR2(64),
   REQUEST_URL  VARCHAR2(4000),
   GUI_STATUS   CLOB
);

DROP TABLE bcd_log_pageperformance CASCADE CONSTRAINTS;
CREATE TABLE bcd_log_pageperformance
(
   LOG_TIME     TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
   SESSION_ID   VARCHAR2(64),
   PAGE_HASH    VARCHAR2(64),
   REQUEST_HASH VARCHAR2(64),
   REQUEST_URL  VARCHAR2(4000),
   DURATION     NUMBER(22),
   ADD_INFO     VARCHAR2(256),
   GUI_STATUS   CLOB,
   LOG_NAME     VARCHAR2(64)
);

DROP TABLE bcd_log_session CASCADE CONSTRAINTS;
CREATE TABLE bcd_log_session
(
   LOG_TIME     TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
   SESSION_ID   VARCHAR2(64),
   USER_AGENT   VARCHAR2(1000),
   REMOTE_ADDR  VARCHAR2(40) NULL,
   SESSION_EXP_TIME TIMESTAMP DEFAULT NULL
);

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

-- security
DROP TABLE BCD_SEC_USER;
CREATE TABLE BCD_SEC_USER
(
  user_id     VARCHAR2(128),
  user_login  VARCHAR2(128),
  name        VARCHAR2(128),
  password    VARCHAR2(128),
  password_salt    VARCHAR2(64),
  is_disabled VARCHAR2(64),
  PRIMARY KEY (user_id),
  UNIQUE(user_login)
);

DROP TABLE bcd_sec_user_roles;
CREATE TABLE bcd_sec_user_roles
(
   user_id        VARCHAR2(128) NOT NULL,
   user_role      VARCHAR2(64)  NOT NULL,
   PRIMARY KEY (user_id,  user_role)
);

DROP TABLE bcd_sec_user_settings;
CREATE TABLE bcd_sec_user_settings
(
   user_id         VARCHAR2(128) NOT NULL,
   right_type      VARCHAR2(64)  NOT NULL,
   right_value     VARCHAR2(64)  NOT NULL,
   PRIMARY KEY (user_id, right_type, right_value)
);

-- tiny url
DROP TABLE bcd_tinyurl_control;
CREATE TABLE bcd_tinyurl_control
(
  tiny_url VARCHAR2(33) NOT NULL,
  long_url CLOB,
  creation_dt DATE NOT NULL,
  last_used_dt DATE NOT NULL
);
ALTER TABLE bcd_tinyurl_control ADD CONSTRAINT PK_bcd_TINYURL_CONTROL PRIMARY KEY (tiny_url);

-- vfs
DROP TABLE bcd_virtualFileSystem CASCADE CONSTRAINTS;
CREATE TABLE bcd_virtualFileSystem
(
   path           VARCHAR2(1024) NOT NULL,
   resource_clob  CLOB,
   resource_blob  BLOB,
   is_server      INTEGER NOT NULL,
   updated_by     VARCHAR2(128),
   last_update    TIMESTAMP,
   bcd_userId     VARCHAR2(64),
   CONSTRAINT bcd_virtual_file_system_pk UNIQUE (path, is_server, bcd_userId)
);