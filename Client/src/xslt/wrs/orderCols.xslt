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
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:bcdxml="http://www.businesscode.de/schema/bcdui/bcdxml-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0">

  <!--
    (re)order and drop columns of input WRS, see xp:OrderCols
    -->

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" />

  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>
  <!-- (NodeSet) As parameter or as default or specific parameter set from parameter model-->
  <xsl:param name="paramSet" select="$paramModel//xp:OrderCols[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>

  <!-- Individual parameters -->
  <!-- (Node) wrs:Header/wrs:Columns element containing new columns and their order on output -->
  <xsl:param name="colsOrder" select="$paramSet/wrs:Columns"/>

  <xsl:variable name="doc" select="/*"/>
  <xsl:variable name="wrsColCount" select="count(/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C)"/>

  <xsl:key use="@id" name="getHeaderColById" match="/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C"/>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    root template
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="/*">
    <xsl:choose>
      <xsl:when test="count($colsOrder/*) &gt; 1">
        <xsl:copy><xsl:apply-templates select="@*|node()" mode="ordering"/></xsl:copy>
      </xsl:when>
      <xsl:otherwise>
        <bcdxml:XsltNop/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    root template for ordering
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="node()|@*" mode="ordering">
    <xsl:copy><xsl:apply-templates select="node()|@*" mode="ordering"/></xsl:copy>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    ordering Columns
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="/wrs:Wrs/wrs:Header/wrs:Columns" mode="ordering">
    <xsl:variable name="wrsCols" select="."/>
    <xsl:copy>
      <xsl:for-each select="$colsOrder/*">
        <xsl:variable name="newPos" select="position()"/>
        <xsl:variable name="curCol" select="."/>
        <wrs:C>
          <xsl:attribute name="pos"><xsl:value-of select="$newPos"/></xsl:attribute>
          <xsl:variable name="srcNode" select="$wrsCols/wrs:C[@id=$curCol/@id]"/>
          <xsl:copy-of select="$srcNode/@*[name() != 'pos']"></xsl:copy-of>
          <xsl:copy-of select="$srcNode/*"></xsl:copy-of>
        </wrs:C>
      </xsl:for-each>
    </xsl:copy>
  </xsl:template>

  <!-- match ValidationResult (so wrs:Data match is not applied here) -->

  <xsl:template match="wrs:ValidationResult" mode="ordering">
    <xsl:copy-of select="."/>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    ordering Data/*
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="wrs:Data/*" mode="ordering">

    <xsl:copy>
      <xsl:copy-of select="@*"/>
      <xsl:variable name="wrsCols" select="*"/>
      <!-- column iterator -->
      <xsl:for-each select="$colsOrder/*">
        <xsl:variable name="colItem" select="."/>
        <!-- force context-switch here for key() lookup -->
        <xsl:for-each select="$doc">
          <xsl:variable name="colItemPos" select="number(key('getHeaderColById', $colItem/@id)/@pos)"/>
          <xsl:copy-of select="$wrsCols[self::wrs:C][$colItemPos]"/>
          <xsl:copy-of select="$wrsCols[self::wrs:O][$colItemPos]"/>
      </xsl:for-each>
      </xsl:for-each>
    </xsl:copy>

  </xsl:template>


  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    text()
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="text()" mode="ordering"></xsl:template>


</xsl:stylesheet>
