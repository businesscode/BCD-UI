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
  xmlns:bcdxml="http://www.businesscode.de/schema/bcdui/bcdxml-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">

  <!--
    excludes columns in WRS
   -->
  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>


  <xsl:param name="guiStatus"/>
  <xsl:param name="metaDataModel"/>

  <xsl:variable name="wrsColCount" select="count(/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C)"/>
  <xsl:variable name="excCols" select="$metaDataModel/*/Exclude/C"/>

  <xsl:key use="@pos" name="getHeaderColByPos" match="/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C"/>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    root template
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="/*">
    <xsl:choose>
      <xsl:when test="count($excCols) &gt; 0">
        <xsl:copy><xsl:apply-templates select="node()|@*" mode="exclude"/></xsl:copy>
      </xsl:when>
      <xsl:otherwise>
        <bcdxml:XsltNop/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    root template for exclude
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="node()|@*" mode="exclude">
    <xsl:copy><xsl:apply-templates select="node()|@*" mode="exclude"/></xsl:copy>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    exclude Columns
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="/wrs:Wrs/wrs:Header/wrs:Columns" mode="exclude">
    <xsl:variable name="wrsCols" select="."/>
    <xsl:copy>
      <xsl:copy-of select="@*"/>
      <xsl:for-each select="wrs:C[not(@id = $excCols/@bRef)]">
        <xsl:variable name="newPos" select="position()"/>
        <xsl:variable name="curCol" select="."/>
        <xsl:copy>
          <xsl:attribute name="pos"><xsl:value-of select="$newPos"/></xsl:attribute>
          <xsl:copy-of select="@*[name() != 'pos']"></xsl:copy-of>
          <xsl:copy-of select="*"/>
        </xsl:copy>
      </xsl:for-each>
    </xsl:copy>
  </xsl:template>


  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    exclude wrs:Data/*/wrs:C
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="/wrs:Wrs/wrs:Data/*/wrs:C" mode="exclude">
    <xsl:variable name="pos"><xsl:number/></xsl:variable>
    <xsl:if test="not( key('getHeaderColByPos', $pos)/@id = $excCols/@bRef)">
      <xsl:copy-of select="."/>
    </xsl:if>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    exclude wrs:Data/*/wrs:O
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="/wrs:Wrs/wrs:Data/*/wrs:O" mode="exclude">
    <xsl:variable name="pos"><xsl:number/></xsl:variable>
    <xsl:if test="not( key('getHeaderColByPos', $pos)/@id = $excCols/@bRef)">
      <xsl:copy-of select="."/>
    </xsl:if>
  </xsl:template>

</xsl:stylesheet>
