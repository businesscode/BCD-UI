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
-- Default tables for BCD-UI 4.0 tiny url support
-- Feel free to adjust table and column names
-- Only BindingSet BindingItem ids are fix for BCD-UI 4.0

-- TERADATA
DROP TABLE bcd_tinyurl_control;
CREATE SET TABLE bcd_tinyurl_control, FALLBACK, NO BEFORE JOURNAL, NO AFTER JOURNAL, CHECKSUM = DEFAULT, DEFAULT MERGEBLOCKRATIO
(
  tiny_url VARCHAR(33),
  long_url CLOB,
  creation_dt DATE NOT NULL,
  last_used_dt DATE NOT NULL
)
UNIQUE PRIMARY INDEX ( tiny_url );


-- ORACLE
DROP TABLE bcd_tinyurl_control;
CREATE TABLE bcd_tinyurl_control
(
  tiny_url VARCHAR2(33) NOT NULL,
  long_url CLOB,
  creation_dt DATE NOT NULL,
  last_used_dt DATE NOT NULL
);
ALTER TABLE bcd_tinyurl_control ADD CONSTRAINT PK_bcd_TINYURL_CONTROL PRIMARY KEY (tiny_url);

-- SQLServer
DROP TABLE bcd_tinyurl_control;
CREATE TABLE bcd_tinyurl_control
(
  tiny_url VARCHAR(33) NOT NULL,
  long_url VARCHAR(MAX),
  creation_dt DATE NOT NULL,
  last_used_dt DATE NOT NULL
);