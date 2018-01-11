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

DROP TABLE bcd_db_properties CASCADE CONSTRAINTS;
CREATE TABLE bcd_db_properties
(
  scope VARCHAR2(32) NOT NULL,
  name VARCHAR2(255) NOT NULL,
  "type" VARCHAR2(64) NULL,
  "value" VARCHAR2(255) NOT NULL
);


-- MS SQL Server

DROP TABLE bcd_db_properties CASCADE CONSTRAINTS;
CREATE TABLE bcd_db_properties
(
  scope VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  "type" VARCHAR(64) NULL,
  "value" VARCHAR(255) NOT NULL
);
-- PostgreSQL
DROP TABLE bcd_db_properties CASCADE CONSTRAINTS;
CREATE TABLE bcd_db_properties
(
  scope VARCHAR(32) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(64) NULL,
  value VARCHAR(255) NOT NULL
);
