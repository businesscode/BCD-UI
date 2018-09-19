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
DROP TABLE bcd_virtualFileSystem CASCADE CONSTRAINTS;

-- Oracle
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


-- SQLServer
-- A primary key (bcd_virtual_file_system_pk) may only be 900 bytes long, we limit path for that
CREATE TABLE bcd_virtualFileSystem
(
   path           VARCHAR(850) NOT NULL,
   resource_clob  VARCHAR(MAX),
   resource_blob  VARBINARY(MAX),
   is_server      INTEGER NOT NULL,
   updated_by     VARCHAR(128),
   last_update    DATETIME,
   bcd_userId     VARCHAR(64),
   CONSTRAINT bcd_virtual_file_system_pk UNIQUE (path, is_server, bcd_userId)
);
-- PostgreSQL
CREATE TABLE bcd_virtualFileSystem
(
   path           VARCHAR(850) NOT NULL,
   resource_clob  TEXT,
   resource_blob  BYTEA,
   is_server      INTEGER NOT NULL,
   updated_by     VARCHAR(128),
   last_update    TIMESTAMP,
   bcd_userId     VARCHAR(64),
   CONSTRAINT bcd_virtual_file_system_pk UNIQUE(path, is_server, bcd_userId)
);