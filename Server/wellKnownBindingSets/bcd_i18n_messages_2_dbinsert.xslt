<?xml version="1.0" encoding="UTF-8"?>
<!--
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
-->
<!-- Input file is BCD-UI\src\js\bcdui\i18n\messages.xml -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">

  <xsl:output method="xml" indent="no"/>

  <xsl:param name="tableName">BCD_I18N</xsl:param>
  <xsl:param name="ddl.key">I18N_KEY</xsl:param>
  <xsl:param name="ddl.value">I18N_VALUE</xsl:param>
  <xsl:param name="ddl.lang">I18N_LANG</xsl:param>

  <!-- creates DML inserts from messages.xml: i.e. use eclipse to run this stylesheet on messages.xml in format (KEY,VALUE,LANG) -->
  <xsl:template match="/*/wrs:Data">
    <Ddl>
DELETE FROM <xsl:value-of select="$tableName"/> WHERE <xsl:value-of select="$ddl.key"/> LIKE 'bcd_%';&#10;
      <xsl:apply-templates/>
    </Ddl>
  </xsl:template>

  <xsl:template match="wrs:R">INSERT INTO <xsl:value-of select="$tableName"/> (<xsl:value-of select="$ddl.key"/>,<xsl:value-of select="$ddl.value"/>,<xsl:value-of select="$ddl.lang"/>) VALUES ('<xsl:value-of select="wrs:C[1]"/>','<xsl:value-of select="normalize-space(wrs:C[2])"/>','<xsl:value-of select="wrs:C[3]"/>');&#10;</xsl:template>

  <xsl:template match="text()"/>
</xsl:stylesheet>