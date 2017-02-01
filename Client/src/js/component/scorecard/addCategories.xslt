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
  A) Does prepend one column where category type or mark the kpi cell (depends on @asKpiAttributes). 
  Categories group KPIs. /*/scc:Layout/scc:CategoryTypeRefs/ does say which category types are to be shown
  The category types are assigned to KPIs in /scc:Kpis/scc:Kpi/scc:Categories, where each attribute name is a type and its value is the value
  /*/scc:CategoryTypes holds the definitions
  B) Does turn /scc:Layout/@parentKpiType="typename" into wrs:C/@parentId at the bcd_kpi_id column
  -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:param name="sccDefinition"/>
  <xsl:param name="bcdI18nModel" select="/*[0=1]"/>

  <xsl:key name="colHeadByPos" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@pos" />

  <xsl:variable name="categoryColTypes"      select="$sccDefinition/*/scc:Layout/scc:CategoryTypeRefs/*[not(@asKpiAttribute='true')]"/>
  <xsl:variable name="categoryColTypeCount"  select="count($categoryColTypes)"/>
  <xsl:variable name="categoryAttrTypes"     select="$sccDefinition/*/scc:Layout/scc:CategoryTypeRefs/*[@asKpiAttribute='true']"/>
  <xsl:variable name="categoryAttrTypeCount" select="count($categoryAttrTypes)"/>

  <xsl:variable name="categoryTypeElements" select="$sccDefinition/*/scc:CategoryTypes/scc:CategoryType"/>

  <xsl:variable name="kpiIdColumnId">bcd_kpi_id</xsl:variable>
  <xsl:variable name="kpiIdColumnIndex" select="number(/*/wrs:Header/wrs:Columns/wrs:C[@id = $kpiIdColumnId]/@pos)"/>

  <!-- Optionally we also want to define a parent-kpi hierarchy -->
  <xsl:variable name="parentKpiType" select="$sccDefinition/*/scc:Layout/scc:KpiRefs/@parentKpiType"/>

  <xsl:template match="/">
    <xsl:choose>
      <xsl:when test="($categoryColTypeCount = 0 and $categoryAttrTypeCount = 0) or not($categoryTypeElements)">
        <xsl:copy-of select="*"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>


  <!-- 
    As leading columns 
    -->
  <xsl:template match="node()|@*">
    <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>
  </xsl:template>

  <xsl:template match="wrs:Columns">
    <xsl:copy>
      <xsl:apply-templates select="@*"/>
      <xsl:for-each select="$categoryColTypes">
        <xsl:variable name="categoryType" select="@idRef"/>
        <xsl:variable name="categoryTypeElement" select="$categoryTypeElements[@id = $categoryType]"/>
        <wrs:C id="{$categoryType}" pos="{position()}" dimId="{concat('bcdCategory_',$categoryType)}">
          <xsl:attribute name="caption">
            <xsl:choose>
              <xsl:when test="$categoryTypeElement/@caption">
                <xsl:value-of select="$categoryTypeElement/@caption"/>
              </xsl:when>
              <xsl:otherwise>
                <xsl:value-of select="$categoryType"/>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:attribute>
        </wrs:C>
      </xsl:for-each>
      <xsl:apply-templates select="*"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="wrs:Columns/wrs:C">
    <xsl:copy>
      <xsl:apply-templates select="@*"/>
      <xsl:attribute name="pos"><xsl:value-of select="@pos + $categoryColTypeCount"/></xsl:attribute>
      <xsl:if test="$parentKpiType and @id='bcd_kpi_id'">
        <wrs:A id="parentId" name="parentId" caption="{$bcdI18nModel/*/bcd_sc_ParentKpi}"/>
      </xsl:if>
      <xsl:apply-templates select="*"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="wrs:R">
    <xsl:variable name="kpiId" select="wrs:C[$kpiIdColumnIndex]"/>
    <xsl:variable name="kpiElement" select="$sccDefinition/*/scc:Kpis/scc:Kpi[@id = $kpiId]"/>
    <xsl:copy>
      <xsl:apply-templates select="@*"/>

      <!-- Add one column for each category type -->
      <xsl:for-each select="$categoryColTypes">
        <xsl:variable name="categoryType" select="@idRef"/>
        <xsl:variable name="categoryTypeElement" select="$categoryTypeElements[@id = $categoryType]"/>
        <xsl:variable name="categoryValue" select="$kpiElement/scc:Categories/@*[local-name() = $categoryType]"/>
        <xsl:variable name="categoryValueElement" select="$categoryTypeElement/*[@id = $categoryValue] | $categoryTypeElement/scc:UnknownCategory[not($categoryTypeElement/*[@id = $categoryValue])]"/>
        <wrs:C id="{$categoryValueElement/@id}"
               order="{count($categoryValueElement/preceding-sibling::*) + 1}">
          <xsl:copy-of select="$categoryValueElement/@bcdTranslate"/>
          <xsl:choose>
            <xsl:when test="$categoryValueElement/@caption">
              <xsl:value-of select="$categoryValueElement/@caption"/>
            </xsl:when>
            <xsl:otherwise>
              <xsl:value-of select="$categoryValueElement/@id"/>
            </xsl:otherwise>
          </xsl:choose>
        </wrs:C>
      </xsl:for-each>

      <!-- All other columns -->
      <xsl:apply-templates select="*"/>
    </xsl:copy>
  </xsl:template>


  <!-- 
    Add categories as  attributes and @parentId to bcd_kpi_id
    -->
  <xsl:template match="wrs:R/wrs:C[key('colHeadByPos', position())/@dimId='bcd_kpi_id']">
    <xsl:variable name="kpiElement" select="$sccDefinition/*/scc:Kpis/scc:Kpi[@id = current()]"/>
    <xsl:copy>
      <xsl:apply-templates select="@*"/>

      <!-- category attributes -->
      <xsl:for-each select="$categoryAttrTypes">
        <xsl:variable name="categoryType" select="@idRef"/>
        <xsl:variable name="categoryTypeElement" select="$categoryTypeElements[@id = $categoryType]"/>
        <xsl:variable name="categoryValue" select="$kpiElement/scc:Categories/@*[local-name() = $categoryType]"/>
        <xsl:variable name="categoryValueElement" select="$categoryTypeElement/*[@id = $categoryValue] | $categoryTypeElement/scc:UnknownCategory[not($categoryTypeElement/*[@id = $categoryValue])]"/>
        <xsl:attribute name="{$categoryType}"><xsl:value-of select="$categoryValueElement/@id"/></xsl:attribute>
      </xsl:for-each>

      <!-- parentKpi -->
      <xsl:variable name="parentKpi" select="$kpiElement/scc:ParentKpis/@*[name()=$parentKpiType]"/>
      <xsl:if test="$parentKpi">
        <xsl:attribute name="parentId"><xsl:value-of select="$parentKpi"/></xsl:attribute>
      </xsl:if>

      <xsl:apply-templates select="node()"/>
    </xsl:copy>
  </xsl:template>

</xsl:stylesheet>
