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
   scope          VARCHAR2(255),
   instance       VARCHAR2(255),
   meta_data      CLOB,
   CONSTRAINT bcd_virtual_file_system_pk UNIQUE (path, is_server, bcd_userId)
);

-- cache
DROP TABLE bcd_cache_scope;
CREATE  TABLE bcd_cache_scope
(
  scope                  VARCHAR2(256) NOT NULL UNIQUE,
  scope_last_modified    TIMESTAMP,
  earliest_next_modified TIMESTAMP,
  expires_min_offset_sec INTEGER
);

-- comment
DROP TABLE bcd_comment;
CREATE TABLE bcd_comment
(
   scope             VARCHAR2(256),
   instance_id       VARCHAR2(256),
   text              VARCHAR2(256),
   last_modified_at  timestamp,
   last_modified_by  VARCHAR2(256)
);

-- data uploader
DROP TABLE bcd_dataupload_control;
CREATE TABLE bcd_dataupload_control
(
   UPLOAD_ID         VARCHAR2(128) NOT NULL PRIMARY KEY,
   TS                TIMESTAMP(6)  NOT NULL,
   SOURCE_NAME       VARCHAR2(128) NOT NULL,
   USER_ID           VARCHAR2(128) NOT NULL,
   USER_COMMENT      VARCHAR2(4000 CHAR),
   FILE_BLOB         BLOB          NOT NULL,

   -- DATA FORMAT
   COLUMN_COUNT      INTEGER,
   ROW_COUNT      INTEGER,
   DECIMAL_SEPARATOR CHAR(1),
   HAS_HEADER_ROW    CHAR(1),
   DATE_FORMAT       VARCHAR(16),

   -- CSV imports
   DELIMITER         CHAR(1),
   COLUMN_STARTINGS  VARCHAR2(256),
   ENCODING          VARCHAR2(20),
   QUOTE_CHAR        VARCHAR2(1),

   -- Spreadsheet
   SHEET_NAME        VARCHAR2(64),
   SHEET_RANGE       VARCHAR2(64),

   -- Target BindingSet
   TARGET_BS         VARCHAR2(256),
   MAPPING           CLOB
);


DROP TABLE bcd_dataupload_controlstep;
CREATE TABLE bcd_dataupload_controlstep
(
   UPLOAD_ID         VARCHAR2(128)  NOT NULL,
   TS                TIMESTAMP(6)   NOT NULL,
   USER_ID           VARCHAR2(128) NOT NULL,
   STEP              VARCHAR2(128)  NOT NULL,
   RC                INTEGER        NOT NULL,
   RC_MESSAGE        VARCHAR2(4000 CHAR)
);


DROP TABLE bcd_dataupload_rowcol;
CREATE TABLE bcd_dataupload_rowcol
(
   UPLOAD_ID         VARCHAR2(128)  NOT NULL,
   ROW_NUMBER        INTEGER        NOT NULL,

   COL_1             VARCHAR2(4000 CHAR),
   COL_2             VARCHAR2(4000 CHAR),
   COL_3             VARCHAR2(4000 CHAR),
   COL_4             VARCHAR2(4000 CHAR),
   COL_5             VARCHAR2(4000 CHAR),
   COL_6             VARCHAR2(4000 CHAR),
   COL_7             VARCHAR2(4000 CHAR),
   COL_8             VARCHAR2(4000 CHAR),
   COL_9             VARCHAR2(4000 CHAR),
   COL_10            VARCHAR2(4000 CHAR),

   COL_11            VARCHAR2(4000 CHAR),
   COL_12            VARCHAR2(4000 CHAR),
   COL_13            VARCHAR2(4000 CHAR),
   COL_14            VARCHAR2(4000 CHAR),
   COL_15            VARCHAR2(4000 CHAR),
   COL_16            VARCHAR2(4000 CHAR),
   COL_17            VARCHAR2(4000 CHAR),
   COL_18            VARCHAR2(4000 CHAR),
   COL_19            VARCHAR2(4000 CHAR),
   COL_20            VARCHAR2(4000 CHAR),

   COL_21            VARCHAR2(4000 CHAR),
   COL_22            VARCHAR2(4000 CHAR),
   COL_23            VARCHAR2(4000 CHAR),
   COL_24            VARCHAR2(4000 CHAR),
   COL_25            VARCHAR2(4000 CHAR),
   COL_26            VARCHAR2(4000 CHAR),
   COL_27            VARCHAR2(4000 CHAR),
   COL_28            VARCHAR2(4000 CHAR),
   COL_29            VARCHAR2(4000 CHAR),
   COL_30            VARCHAR2(4000 CHAR),

   COL_31            VARCHAR2(4000 CHAR),
   COL_32            VARCHAR2(4000 CHAR),
   COL_33            VARCHAR2(4000 CHAR),
   COL_34            VARCHAR2(4000 CHAR),
   COL_35            VARCHAR2(4000 CHAR),
   COL_36            VARCHAR2(4000 CHAR),
   COL_37            VARCHAR2(4000 CHAR),
   COL_38            VARCHAR2(4000 CHAR),
   COL_39            VARCHAR2(4000 CHAR),
   COL_40            VARCHAR2(4000 CHAR),

   COL_41            VARCHAR2(4000 CHAR),
   COL_42            VARCHAR2(4000 CHAR),
   COL_43            VARCHAR2(4000 CHAR),
   COL_44            VARCHAR2(4000 CHAR),
   COL_45            VARCHAR2(4000 CHAR),
   COL_46            VARCHAR2(4000 CHAR),
   COL_47            VARCHAR2(4000 CHAR),
   COL_48            VARCHAR2(4000 CHAR),
   COL_49            VARCHAR2(4000 CHAR),
   COL_50            VARCHAR2(4000 CHAR),

   COL_51            VARCHAR2(4000 CHAR),
   COL_52            VARCHAR2(4000 CHAR),
   COL_53            VARCHAR2(4000 CHAR),
   COL_54            VARCHAR2(4000 CHAR),
   COL_55            VARCHAR2(4000 CHAR),
   COL_56            VARCHAR2(4000 CHAR),
   COL_57            VARCHAR2(4000 CHAR),
   COL_58            VARCHAR2(4000 CHAR),
   COL_59            VARCHAR2(4000 CHAR),
   COL_60            VARCHAR2(4000 CHAR),

   COL_61            VARCHAR2(4000 CHAR),
   COL_62            VARCHAR2(4000 CHAR),
   COL_63            VARCHAR2(4000 CHAR),
   COL_64            VARCHAR2(4000 CHAR),
   COL_65            VARCHAR2(4000 CHAR),
   COL_66            VARCHAR2(4000 CHAR),
   COL_67            VARCHAR2(4000 CHAR),
   COL_68            VARCHAR2(4000 CHAR),
   COL_69            VARCHAR2(4000 CHAR),
   COL_70            VARCHAR2(4000 CHAR)
);

DROP TABLE bcd_dataupload_validation;
CREATE TABLE bcd_dataupload_validation
(
  UPLOAD_ID  VARCHAR2(128) NOT NULL,
  ROW_NUMBER INTEGER      NOT NULL,
  COL_NUMBER INTEGER      NOT NULL,
  SEVERITY   INTEGER      NOT NULL,
  MESSAGE    VARCHAR2(128) NOT NULL
);

CREATE OR REPLACE FUNCTION bcd_is_integer( p_str IN VARCHAR2 )
  RETURN INTEGER DETERMINISTIC PARALLEL_ENABLE
IS
  l_num NUMBER;
BEGIN
  l_num := to_number( p_str, '99G999G999D999999999' );
  RETURN 1;
EXCEPTION
  WHEN Others THEN
    RETURN 0;
END bcd_is_integer;

CREATE OR REPLACE FUNCTION bcd_is_number( p_str IN VARCHAR2 )
  RETURN INTEGER DETERMINISTIC PARALLEL_ENABLE
IS
  l_num NUMBER;
BEGIN
  l_num := to_number( p_str );
  RETURN 1;
EXCEPTION
  WHEN Others THEN
    RETURN 0;
END bcd_is_number;


CREATE OR REPLACE FUNCTION bcd_is_date( p_str IN VARCHAR2 )
  RETURN INTEGER DETERMINISTIC PARALLEL_ENABLE
IS
  l_num DATE;
BEGIN
  l_num := to_date( p_str );
  RETURN 1;
EXCEPTION
  WHEN Others THEN
    RETURN 0;
END bcd_is_date;


CREATE OR REPLACE FUNCTION bcd_is_timestamp( p_str IN VARCHAR2 )
  RETURN INTEGER DETERMINISTIC PARALLEL_ENABLE
IS
  l_num TIMESTAMP;
BEGIN
  l_num := to_date( p_str );
  RETURN 1;
EXCEPTION
  WHEN Others THEN
    RETURN 0;
END bcd_is_timestamp;


DROP TABLE BCD_FILES_DOWNLOAD;
CREATE TABLE BCD_FILES_DOWNLOAD
(
   ID              VARCHAR2(128 Byte),
   UUID            VARCHAR2(128 Byte),
   CREATE_STAMP    TIMESTAMP(6),
   FILE_NAME       VARCHAR2(256 Char),
   REPORT_NAME     VARCHAR2(256 Char),
   DOWNLOAD_LINK   VARCHAR2(1024 Char),
   DOWNLOAD_COUNT  NUMBER,
   LAST_DOWNLOAD   TIMESTAMP(6)
);

DROP TABLE BCD_MESSAGES;
CREATE TABLE BCD_MESSAGES
(
   MESSAGE_ID        VARCHAR2(36 Byte),
   SEVERITY          NUMBER,
   MESSAGE           CLOB,
   VALID_FROM        DATE,
   VALID_TO          DATE,
   ANON_ALLOWED      NUMBER DEFAULT 0,
   LAST_MODIFIED     TIMESTAMP(6),
   LAST_MODIFIED_BY  VARCHAR2(255 Byte)
);
