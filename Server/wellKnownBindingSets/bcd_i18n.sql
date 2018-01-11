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
DROP TABLE BCD_I18N CASCADE CONSTRAINTS;
CREATE TABLE BCD_I18N
(
   I18N_KEY    VARCHAR2(255 Char),
   I18N_LANG   VARCHAR2(255 Char),
   I18N_VALUE  VARCHAR2(255 Char),
   PRIMARY KEY(I18N_KEY, I18N_LANG)
);

-- PostgreSql
DROP TABLE BCD_I18N CASCADE;
CREATE TABLE BCD_I18N
(
   I18N_KEY    VARCHAR(255),
   I18N_LANG   VARCHAR(255),
   I18N_VALUE  VARCHAR(255),
   PRIMARY KEY(I18N_KEY, I18N_LANG)
);
