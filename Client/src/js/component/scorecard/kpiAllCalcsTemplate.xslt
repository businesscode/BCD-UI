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
  xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0"
  xmlns="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
  xmlns:generator="urn(bcd-xsltGenerator)" exclude-result-prefixes="generator">

  <!--
    This adds a column in each row for each kpi to be calculated
    And also one per kpi per aspect with WrqModifier (i.e. applying KPI calcs to these aspects)
    -->

  <xsl:output method="xml" indent="no" version="1.0" encoding="UTF-8"/>

  <xsl:param name="sccDefinition"/>
  <xsl:param name="refAspWrqWithModifier"/>

  <xsl:variable name="dimCount"  select="count(/*/wrs:Header/wrs:Columns/wrs:C[@dimId])"/>
  <xsl:variable name="dropAggrs" select="boolean($sccDefinition/*/scc:Internal/scc:KpiAllCalcs/@dropAggrs='true')"/>

  <!-- Writing the top-most node as a literal, prevents repetition of namespace def. on lower nodes written as literals -->
  <xsl:template match="/wrs:Wrs">
    <wrs:Wrs>
      <xsl:apply-templates select="@*"/>
      <xsl:apply-templates/>
    </wrs:Wrs>
  </xsl:template>

  <!-- Each row is copied to output including the already existing cells, then the new cells are appended -->
  <xsl:template match="wrs:R">
    <wrs:R>
      <xsl:choose>
        <xsl:when test="$dropAggrs">
          <xsl:apply-templates select="@*|wrs:C[position()&lt;=$dimCount]"/>
        </xsl:when>
        <xsl:otherwise>
          <xsl:apply-templates select="@*|wrs:C"/>
        </xsl:otherwise>
      </xsl:choose>
      <generator:Calcs/>
    </wrs:R>
  </xsl:template>

  <!-- Each column of the input is preserved, then the new cells are appended -->
  <xsl:template match="wrs:Columns">
    <xsl:variable name="kpiStartPos" select="count(wrs:C[@dimId or not($dropAggrs)])+1"/>
    <wrs:Columns bcdKpiStartPos="{$kpiStartPos}">

      <!-- We keep the dimension columns in all cases, the aggr columns may go -->
      <xsl:apply-templates select="@*|wrs:C[@dimId or not($dropAggrs)]"/>

      <!-- First we calc the kpis themselves -->
      <xsl:for-each select="$sccDefinition/*/scc:Kpis/scc:Kpi">
        <wrs:C pos="{$kpiStartPos -1 + position()}"
           id="{concat('kpi_',@id)}"
           caption="{concat('Performance|',@caption)}">
          <xsl:copy-of select="calc:Calc/@type-name"/>
          <xsl:copy-of select="calc:Calc/@scale"/>
          <xsl:copy-of select="calc:Calc/@unit"/>
        </wrs:C>
      </xsl:for-each>
      <!-- Then we apply the KPI calculation to each aspect with a WrqModifier -->
      <xsl:variable name="kpiCount" select="count($sccDefinition/*/scc:Kpis/scc:Kpi)"/>
      <xsl:for-each select="$refAspWrqWithModifier/*/scc:Aspect[@type='wrqModifier']">
        <xsl:variable name="thisAspStartPos" select="$kpiStartPos+$kpiCount*position()"/> <!-- OK to start with 1 because we had the kpis already -->
        <xsl:variable name="aspect" select="."/>
        <xsl:for-each select="$sccDefinition/*/scc:Kpis/scc:Kpi">
          <wrs:C pos="{$thisAspStartPos - 1 + position()}"
             id="{concat('asp_',$aspect/@id,'_kpi_',./@id)}"
             caption="{concat($aspect/@caption,'|',./@caption)}">
            <xsl:copy-of select="calc:Calc/@type-name"/>
            <xsl:copy-of select="calc:Calc/@scale"/>
            <xsl:copy-of select="calc:Calc/@unit"/>
          </wrs:C>
        </xsl:for-each>
      </xsl:for-each>
    </wrs:Columns>
  </xsl:template>

  <!-- We preserve the input mostly 1:1, just adding columns -->
  <xsl:template match="@*|node()">
    <xsl:copy><xsl:apply-templates select="@*|node()"/></xsl:copy>
  </xsl:template>

</xsl:stylesheet>