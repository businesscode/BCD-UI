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
DROP TABLE IF EXISTS bcd_db_properties CASCADE;
CREATE TABLE bcd_db_properties
(
  scope VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(64) NULL,
  value VARCHAR(255) NOT NULL,
  PRIMARY KEY(scope, name)
);

-- i18n
DROP TABLE IF EXISTS BCD_I18N CASCADE;
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
DROP TABLE IF EXISTS bcd_log_access;
CREATE TABLE bcd_log_access
(
   LOG_TIME         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   SESSION_ID       VARCHAR(64),
   PAGE_HASH        VARCHAR(64),
   REQUEST_HASH     VARCHAR(64),
   REQUEST_URL      VARCHAR(2000),
   BINDINGSET_NAME  VARCHAR(255),
   REQUEST_XML      TEXT,
   ROW_COUNT        INTEGER,
   VALUE_COUNT      INTEGER,
   RS_START_TIME    BIGINT,
   RS_END_TIME      BIGINT,
   WRITE_DURATION   INTEGER,
   EXECUTE_DURATION INTEGER
);

DROP TABLE IF EXISTS bcd_log_error;
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

DROP TABLE IF EXISTS bcd_log_login;
CREATE TABLE bcd_log_login
(
   LOG_TIME     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   SESSION_ID   VARCHAR(64),
   USER_AGENT   VARCHAR(1000),
   REMOTE_ADDR  VARCHAR(40),
   USER_NAME    VARCHAR(128),
   LOGIN_RESULT VARCHAR(32),
   SESSION_EXP_TIME  TIMESTAMP DEFAULT NULL
);

DROP TABLE IF EXISTS bcd_log_page;
CREATE TABLE bcd_log_page
(
   LOG_TIME     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   SESSION_ID   VARCHAR(64),
   PAGE_HASH    VARCHAR(64),
   REQUEST_URL  VARCHAR(4000),
   GUI_STATUS   VARCHAR(27000)
);

DROP TABLE IF EXISTS bcd_log_pageperformance;
CREATE TABLE bcd_log_pageperformance
(
   LOG_TIME     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   SESSION_ID   VARCHAR(64),
   PAGE_HASH    VARCHAR(64),
   REQUEST_HASH VARCHAR(64),
   DURATION     INTEGER,
   ADD_INFO     VARCHAR(256),
   REQUEST_URL  VARCHAR(4000),
   GUI_STATUS   VARCHAR(27000),
   LOG_NAME     VARCHAR(64)
);

DROP TABLE IF EXISTS bcd_log_session;
CREATE TABLE bcd_log_session
(
   LOG_TIME     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   SESSION_ID   VARCHAR(64),
   USER_AGENT   VARCHAR(1000),
   REMOTE_ADDR  VARCHAR(40),
   USER_NAME    VARCHAR(128),
   LOGIN_RESULT VARCHAR(32),
   SESSION_EXP_TIME TIMESTAMP DEFAULT NULL
);

DROP TABLE IF EXISTS bcd_log_sql;
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

-- security
DROP TABLE IF EXISTS bcd_sec_user;
CREATE TABLE bcd_sec_user
(
  user_id     VARCHAR(128) NOT NULL,
  user_login  VARCHAR(128) NOT NULL,
  name        VARCHAR(128) NOT NULL,
  password    VARCHAR(128) NOT NULL,
  password_salt    VARCHAR(64) NOT NULL,
  is_disabled VARCHAR(64),
  PRIMARY KEY (user_id),
  UNIQUE(user_login)
);

DROP TABLE IF EXISTS bcd_sec_user_roles;
CREATE TABLE bcd_sec_user_roles
(
   user_id         VARCHAR(128) NOT NULL,
   user_role       VARCHAR(64)  NOT NULL,
   PRIMARY KEY (user_id,  user_role)
);

DROP TABLE IF EXISTS bcd_sec_user_settings;
CREATE TABLE bcd_sec_user_settings
(
   user_id         VARCHAR(128) NOT NULL,
   right_type      VARCHAR(64)  NOT NULL,
   right_value     VARCHAR(64)  NOT NULL,
   PRIMARY KEY (user_id, right_type, right_value)
);

DROP TABLE IF EXISTS bcd_sec_role_settings;
CREATE TABLE bcd_sec_role_settings (
  role_name varchar(64) NOT NULL,
  right_type varchar(64) NOT NULL,
  right_value varchar(64),
  PRIMARY KEY(role_name, right_type, right_value)
);

CREATE OR REPLACE VIEW bcd_sec_user_roles_settings AS
-- in addition resolves roles to settings
SELECT
  user_id,
  right_type,
  right_value
FROM bcd_sec_user_settings

UNION ALL

SELECT
  u.user_id user_id,
  rs.right_type right_type,
  rs.right_value right_value
FROM
  BCD_SEC_USER u
  INNER JOIN BCD_SEC_USER_ROLES ur ON (u.user_id = ur.user_id)
  INNER JOIN BCD_SEC_ROLE_SETTINGS rs ON (rs.role_name = ur.user_role)
;

-- tiny url
DROP TABLE IF EXISTS bcd_tinyurl_control CASCADE;
CREATE TABLE bcd_tinyurl_control
(
  tiny_url VARCHAR(33) NOT NULL PRIMARY KEY,
  long_url TEXT,
  creation_dt DATE NOT NULL,
  last_used_dt DATE NOT NULL
);

-- vfs
DROP TABLE IF EXISTS bcd_virtualFileSystem CASCADE;
CREATE TABLE bcd_virtualFileSystem
(
   path           VARCHAR(1024) NOT NULL,
   resource_clob  TEXT,
   resource_blob  BYTEA,
   is_server      INTEGER NOT NULL,
   updated_by     VARCHAR(128),
   last_update    TIMESTAMP,
   bcd_userId     VARCHAR(64),
   scope          VARCHAR(255),
   instance       VARCHAR(255),
   meta_data      TEXT,
   required       INTEGER,
   acknowledged   INTEGER,
   CONSTRAINT bcd_virtual_file_system_pk UNIQUE(path, is_server, bcd_userId)
);

-- cache
DROP TABLE IF EXISTS bcd_cache_scope;
CREATE  TABLE bcd_cache_scope
(
  scope                  VARCHAR(256) NOT NULL UNIQUE,
  scope_last_modified    TIMESTAMP,
  earliest_next_modified TIMESTAMP,
  expires_min_offset_sec INTEGER
);

-- comment
DROP TABLE IF EXISTS bcd_comment;
CREATE TABLE bcd_comment
(
   scope             VARCHAR(256),
   instance_id       VARCHAR(256),
   text              VARCHAR(256),
   last_modified_at  timestamp,
   last_modified_by  VARCHAR(256)
);

-- data uploader
DROP TABLE IF EXISTS  bcd_dataupload_control;
CREATE TABLE bcd_dataupload_control
(
   upload_id          varchar(128)    NOT NULL,
   ts                 timestamp       NOT NULL,
   source_name        varchar(128)    NOT NULL,
   user_id            varchar(128)    NOT NULL,
   user_comment       varchar(4000),
   file_blob          bytea           NOT NULL,
   column_count       integer,
   row_count          integer,
   decimal_separator  char(1),
   has_header_row     char(1),
   date_format        varchar(16),
   delimiter          char(1),
   column_startings   varchar(256),
   encoding           varchar(20),
   quote_char         varchar(1),
   sheet_name         varchar(64),
   sheet_range        varchar(64),
   target_bs          varchar(256),
   mapping            text
);

DROP TABLE IF EXISTS bcd_dataupload_controlstep;
CREATE TABLE bcd_dataupload_controlstep
(
   upload_id   varchar(128)    NOT NULL,
   ts          timestamp       NOT NULL,
   user_id     varchar(128)    NOT NULL,
   step        varchar(128)    NOT NULL,
   rc          integer         NOT NULL,
   rc_message  varchar(4000)
);

DROP TABLE IF EXISTS bcd_dataupload_rowcol;
CREATE TABLE bcd_dataupload_rowcol
(
   upload_id   varchar(128)    NOT NULL,
   row_number  integer         NOT NULL,
   col_1       varchar(4000),
   col_2       varchar(4000),
   col_3       varchar(4000),
   col_4       varchar(4000),
   col_5       varchar(4000),
   col_6       varchar(4000),
   col_7       varchar(4000),
   col_8       varchar(4000),
   col_9       varchar(4000),
   col_10      varchar(4000),
   col_11      varchar(4000),
   col_12      varchar(4000),
   col_13      varchar(4000),
   col_14      varchar(4000),
   col_15      varchar(4000),
   col_16      varchar(4000),
   col_17      varchar(4000),
   col_18      varchar(4000),
   col_19      varchar(4000),
   col_20      varchar(4000),
   col_21      varchar(4000),
   col_22      varchar(4000),
   col_23      varchar(4000),
   col_24      varchar(4000),
   col_25      varchar(4000),
   col_26      varchar(4000),
   col_27      varchar(4000),
   col_28      varchar(4000),
   col_29      varchar(4000),
   col_30      varchar(4000),
   col_31      varchar(4000),
   col_32      varchar(4000),
   col_33      varchar(4000),
   col_34      varchar(4000),
   col_35      varchar(4000),
   col_36      varchar(4000),
   col_37      varchar(4000),
   col_38      varchar(4000),
   col_39      varchar(4000),
   col_40      varchar(4000),
   col_41      varchar(4000),
   col_42      varchar(4000),
   col_43      varchar(4000),
   col_44      varchar(4000),
   col_45      varchar(4000),
   col_46      varchar(4000),
   col_47      varchar(4000),
   col_48      varchar(4000),
   col_49      varchar(4000),
   col_50      varchar(4000),
   col_51      varchar(4000),
   col_52      varchar(4000),
   col_53      varchar(4000),
   col_54      varchar(4000),
   col_55      varchar(4000),
   col_56      varchar(4000),
   col_57      varchar(4000),
   col_58      varchar(4000),
   col_59      varchar(4000),
   col_60      varchar(4000),
   col_61      varchar(4000),
   col_62      varchar(4000),
   col_63      varchar(4000),
   col_64      varchar(4000),
   col_65      varchar(4000),
   col_66      varchar(4000),
   col_67      varchar(4000),
   col_68      varchar(4000),
   col_69      varchar(4000),
   col_70      varchar(4000)
);

DROP TABLE IF EXISTS bcd_dataupload_validation;
CREATE TABLE bcd_dataupload_validation
(
   upload_id   varchar(128)   NOT NULL,
   row_number  integer        NOT NULL,
   col_number  integer        NOT NULL,
   severity    integer        NOT NULL,
   message     varchar(128)   NOT NULL,
   descr       varchar(255)
);


CREATE OR REPLACE FUNCTION bcd_is_number(text) RETURNS INTEGER AS $$
DECLARE x NUMERIC;
BEGIN
    x = $1::NUMERIC;
    RETURN 1;
EXCEPTION WHEN others THEN
    RETURN 0;
END;
$$
LANGUAGE plpgsql IMMUTABLE;


CREATE OR REPLACE FUNCTION bcd_is_integer(text) RETURNS INTEGER AS $$
DECLARE x INTEGER;
BEGIN
    x = $1::INTEGER;
    RETURN 1;
EXCEPTION WHEN others THEN
    RETURN 0;
END;
$$
LANGUAGE plpgsql IMMUTABLE;


-- Note: This will also accept a timestamp with time = 00:00:00, find a better way
CREATE OR REPLACE FUNCTION bcd_is_date(text) RETURNS INTEGER AS $$
DECLARE x DATE;
BEGIN
    x = $1::DATE;
    IF CAST( CAST(x AS DATE) AS TIMESTAMP) <> CAST($1 AS TIMESTAMP) THEN
      RETURN 0;
    ELSE
      RETURN 1;
    END IF;
EXCEPTION WHEN others THEN
    RETURN 0;
END;
$$
LANGUAGE plpgsql IMMUTABLE;


CREATE OR REPLACE FUNCTION bcd_is_timestamp(text) RETURNS INTEGER AS $$
DECLARE x TIMESTAMP;
BEGIN
    x = $1::TIMESTAMP;
    RETURN 1;
EXCEPTION WHEN others THEN
    RETURN 0;
END;
$$
LANGUAGE plpgsql IMMUTABLE;


-- geo
-- As admin login to right database; creates postgis in public schema, make sure public is in user's search path
-- CREATE EXTENSION postgis;
-- SHOW search_path;
-- ALTER USER "KEPDEMOGUI" SET search_path = "KEPDEMOGUI",public;
-- SELECT postgis_full_version();


DROP TABLE IF EXISTS BCD_FILES_DOWNLOAD;
CREATE TABLE BCD_FILES_DOWNLOAD
(
   ID              VARCHAR(128),
   UUID            VARCHAR(128),
   CREATE_STAMP    TIMESTAMP,
   FILE_NAME       VARCHAR(256),
   REPORT_NAME     VARCHAR(256),
   DOWNLOAD_LINK   VARCHAR(1024),
   DOWNLOAD_COUNT  integer,
   LAST_DOWNLOAD   TIMESTAMP
);

DROP TABLE IF EXISTS BCD_MESSAGES;
CREATE TABLE BCD_MESSAGES
(
   MESSAGE_ID        VARCHAR(36),
   SEVERITY          integer,
   MESSAGE           TEXT,
   VALID_FROM        DATE,
   VALID_TO          DATE,
   ANON_ALLOWED      integer DEFAULT 0,
   LAST_MODIFIED     TIMESTAMP,
   LAST_MODIFIED_BY  VARCHAR(255)
);
