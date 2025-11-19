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
  <!--
    Derives y1 and y2 variables from several parameter: colStart/End pos/id from parameter model / plain params
   -->

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" />

  <!-- Individual parameters -->
  <xsl:param name="paramSet"/>
  <xsl:param name="colStartPos" select="$paramSet/xp:ColStartPos"/>
  <xsl:param name="colStartId"  select="$paramSet/xp:ColStartId"/>
  <xsl:param name="colEndPos"   select="$paramSet/xp:ColEndPos"/>
  <xsl:param name="colEndId"    select="$paramSet/xp:ColEndId"/>

  <!-- Calculate effective values -->
  <xsl:variable name="x1">
    <xsl:choose>
      <xsl:when test="number($colStartPos)"><xsl:value-of select="number($colStartPos)"/></xsl:when>
      <xsl:when test="$colStartId"><xsl:value-of select="number(/*/wrs:Header/*/wrs:C[@id = $colStartId]/@pos)"/></xsl:when>
      <xsl:otherwise><xsl:value-of select="number(1)"/></xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:variable name="x2">
    <xsl:choose>
      <xsl:when test="number($colEndPos)"><xsl:value-of select="number($colEndPos)"/></xsl:when>
      <xsl:when test="$colEndId"><xsl:value-of select="number(/*/wrs:Header/*/wrs:C[@id = $colEndId]/@pos)"/></xsl:when>
      <xsl:otherwise><xsl:value-of select="number(/*/wrs:Header/*/wrs:C[last()]/@pos)"/></xsl:otherwise>
    </xsl:choose>
  </xsl:variable>

</xsl:stylesheet>
