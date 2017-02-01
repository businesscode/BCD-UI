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
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" />

  <!-- Individual parameters -->
  <xsl:param name="rowStartPos" select="$paramSet/xp:RowStartPos"/>
  <xsl:param name="rowStartId"  select="$paramSet/xp:RowStartId"/>
  <xsl:param name="rowEndPos"   select="$paramSet/xp:RowEndPos"/>
  <xsl:param name="rowEndId"    select="$paramSet/xp:RowEndId"/>

  <!-- Calculate effective values -->
  <xsl:variable name="y1">
    <xsl:choose>
      <xsl:when test="number($rowStartPos)"><xsl:value-of select="number($rowStartPos)"/></xsl:when>
      <xsl:when test="$rowStartId"><xsl:value-of select="count(/*/wrs:Data/wrs:*[@id=$rowStartId]/preceding-sibling::*)+1"/></xsl:when>
      <xsl:otherwise><xsl:value-of select="number(1)"/></xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:variable name="y2">
    <xsl:choose>
      <xsl:when test="number($rowEndPos)"><xsl:value-of select="number($rowEndPos)"/></xsl:when>
      <xsl:when test="$rowEndId"><xsl:value-of select="count(/*/wrs:Data/wrs:*[@id=$rowEndId]/preceding-sibling::*)+1"/></xsl:when>
      <xsl:otherwise><xsl:value-of select="count(/*/wrs:Data/wrs:*)"/></xsl:otherwise>
    </xsl:choose>
  </xsl:variable>

</xsl:stylesheet>
