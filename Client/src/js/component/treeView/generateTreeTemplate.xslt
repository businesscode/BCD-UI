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
<!--
  Template for generateTree.xslt
  -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:rnd="http://www.businesscode.de/schema/bcdui/renderer-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:generator="urn(bcd-xsltGenerator)"
  >

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="yes"/>

  <xsl:param name="guiStatus"/>
  <xsl:param name="bcdControllerVariableName"/>
  <!--
    enables autoexpand of single elements on a level
   -->
  <xsl:param name="enableAutoexpand" select="'false'"/>
  <!--
    enables auto expand of all levels. 1 means nothing expanded, high numbers mean "all"
   -->
  <xsl:param name="autoExpandToLevel" select="0"/>

  <!-- If found, the parent/child hierarchy is derived from this information -->
  <xsl:variable name="parentChildColIdx" select="number(/*/wrs:Header/wrs:Columns/wrs:C[wrs:A[@id='parentId']]/@pos)"/>

  <generator:Keys/>

  <xsl:template match="/">
    <wrs:Wrs>
      <xsl:copy-of select="/*/wrs:Header"/>
      <wrs:Data>
        <xsl:apply-templates select="/*/wrs:Data" mode="start"/>
      </wrs:Data>
    </wrs:Wrs>
  </xsl:template>


  <xsl:template match="wrs:Data" mode="start">
    <xsl:choose>

      <!-- case a): we are parentId controlled -->
      <xsl:when test="$parentChildColIdx">
        <xsl:for-each select="wrs:R[not(wrs:C[$parentChildColIdx]/@parentId)]">
          <xsl:variable name="pos" select="position()"/>
          <xsl:apply-templates select="." mode="parentChildCol">
            <xsl:with-param name="allAncestorsVisible" select="true()"/>
            <xsl:with-param name="pos" select="$pos"/>
          </xsl:apply-templates>
        </xsl:for-each>
      </xsl:when>

      <!-- case b): we are dimension controlled -->
      <xsl:otherwise>
        <xsl:variable name="r1" select="wrs:R[count(. | key('level-1',wrs:C[1])[1]) = 1]"/>
        <xsl:apply-templates select="$r1" mode="group-1">
          <xsl:with-param name="allAncestorsVisible" select="true()"/>
        </xsl:apply-templates>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- 
  	a) Handling of rows in case we are parentId controlled 
  	-->
  <xsl:template match="wrs:R" mode="parentChildCol">
    <xsl:param name="allAncestorsVisible"/>
    <xsl:param name="parentLevelId"/>
  
    <xsl:variable name="childRows" select="key('childRows',wrs:C[$parentChildColIdx])"/>
    <xsl:variable name="levelId" select="concat($parentLevelId,wrs:C[$parentChildColIdx])"/>
    <xsl:variable name="guiStatus_expanded" select="$guiStatus/*/rnd:TreeView[@idRef = $bcdControllerVariableName]/rnd:Exp[. = $levelId]"/>
    <xsl:variable name="auto_expand" select="count(./wrs:Level) &lt; 2 and $enableAutoexpand = 'true'"/>
    <xsl:variable name="is_expanded" select="$guiStatus_expanded or $auto_expand or $autoExpandToLevel > count(ancestor-or-self::wrs:Level)"/>
    <wrs:Level>
      <xsl:attribute name="levelId"><xsl:value-of select="$levelId"/></xsl:attribute>
      <xsl:attribute name="rowCount">1</xsl:attribute>
      <xsl:attribute name="isVisible"><xsl:value-of select="$allAncestorsVisible"/></xsl:attribute>
      <xsl:attribute name="caption">
        <xsl:choose>
          <xsl:when test="string(wrs:C[$parentChildColIdx]/@caption)"><xsl:value-of select="wrs:C[$parentChildColIdx]/@caption"/></xsl:when>
          <xsl:otherwise><xsl:value-of select="wrs:C[$parentChildColIdx]"/></xsl:otherwise>
        </xsl:choose>
      </xsl:attribute>

      <xsl:copy>
        <xsl:copy-of select="@*"/>
        <xsl:apply-templates select="*" mode="parentChildCol"/>
      </xsl:copy>

      <xsl:for-each select="$childRows">
        <xsl:apply-templates select="." mode="parentChildCol">
          <xsl:with-param name="allAncestorsVisible" select="$allAncestorsVisible and $is_expanded"/>
          <xsl:with-param name="parentLevelId" select="concat($levelId,'___')"/>
        </xsl:apply-templates>
      </xsl:for-each>
    </wrs:Level>

  </xsl:template>

  <!-- Per default just copy -->
  <xsl:template match="node()|@*" mode="parentChildCol">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*" mode="parentChildCol"/>
    </xsl:copy>
  </xsl:template>



  <!-- 
  	b) Handling of rows in case we are dimension controlled 
  	-->

  <generator:Group/>

  <xsl:template match="wrs:R" mode="item">
    <xsl:copy-of select="."/>
  </xsl:template>

</xsl:stylesheet>