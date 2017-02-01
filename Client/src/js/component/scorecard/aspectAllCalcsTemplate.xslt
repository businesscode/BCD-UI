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
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:bcdxml="http://www.businesscode.de/schema/bcdui/bcdxml-1.0.0"
  xmlns:generator="urn(bcd-xsltGenerator)" exclude-result-prefixes="generator">

  <!--
    This stylesheet combines all aspect calcs used by a concrete scorecard into one xslt, which is then exected
  -->

  <xsl:output method="xml" encoding="UTF-8" indent="no"/>

  <xsl:param name="sccDefinition"/>

  <xsl:param name="aspectIds"/>

  <xsl:variable name="aspectIdsNormalized" select="concat(' ',normalize-space($aspectIds),' ')"/>
  <xsl:variable name="dropAggrs" select="boolean($sccDefinition/*/scc:Internal/scc:AspectAllCalcs/@dropAggrs='true')"/>
  <xsl:variable name="dimCount"  select="count(/*/wrs:Header/wrs:Columns/wrs:C[@dimId])"/>
  <xsl:variable name="kpiStartPos"  select="number(/*/wrs:Header/wrs:Columns/@bcdKpiStartPos)"/>

  <!-- Only here to prevent these namespaces from being repeatedly noted in IE at lower levels -->
  <xsl:template match="wrs:Wrs">
    <wrs:Wrs xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0" 
             xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0" xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0">
      <xsl:copy-of select="@*"/>
      <xsl:apply-templates select="*"/>
    </wrs:Wrs>
  </xsl:template>

  <xsl:template match="wrs:R">
    <wrs:R>
      <xsl:apply-templates select="@*|wrs:C[not($dropAggrs) or position()&lt;=$dimCount or position()&gt;=$kpiStartPos]"/>
      <generator:Calcs/>
    </wrs:R>
  </xsl:template>

  <xsl:template match="wrs:Columns">
    <wrs:Columns>
      <xsl:apply-templates select="@*"/>

      <!-- We keep the dimension columns in all cases, the aggr columns may go -->
      <xsl:choose>
        <xsl:when test="$dropAggrs">
          <xsl:for-each select="wrs:C[position()&lt;=$dimCount or position()&gt;=$kpiStartPos]">
            <xsl:copy>
              <xsl:apply-templates select="@*"/>
              <xsl:attribute name="pos"><xsl:value-of select="position()"/></xsl:attribute>
              <xsl:apply-templates select="node()"/>
            </xsl:copy>
          </xsl:for-each>
        </xsl:when>
        <xsl:otherwise>
          <xsl:apply-templates select="@*|wrs:C"/>
        </xsl:otherwise>
      </xsl:choose>

      <xsl:variable name="colCount" select="count(wrs:C[not($dropAggrs) or position()&lt;=$dimCount or position()&gt;=$kpiStartPos])"/>

      <xsl:variable name="kpiCount" select="count($sccDefinition/*/scc:Kpis/scc:Kpi)"/>
      <xsl:for-each select="$sccDefinition/*/scc:Aspects/scc:Aspect[contains($aspectIdsNormalized,concat(' ',@id,' ')) and (calc:Calc/* or scc:chooseCalc)]">
        <xsl:variable name="aspectIdx"      select="position()-1"/>
        <xsl:variable name="aspectCaption"  select="@caption"/>
        <xsl:variable name="aspectId"       select="@id"/>
        <xsl:variable name="aspect"         select="."/>
        <!-- We check, which aspects _we_ will create before the current aspect, i.e. those, where Calc does not just declare a result, for example an aspect with a JsProcFct is not handled here (and its Calc has no child) -->
        <xsl:variable name="precedingAspCalcs" select="count(preceding-sibling::scc:Aspect[contains($aspectIdsNormalized,concat(' ',@id,' '))]/*[local-name(.)='Calc' or local-name(.)='chooseCalc'][*])"/>
        <xsl:variable name="cntThisAspCalcs" select="count(calc:Calc | scc:chooseCalc)"/>
        <xsl:for-each select="$sccDefinition/*/scc:Kpis/scc:Kpi">
          <xsl:variable name="kpi" select="."/>
          <xsl:variable name="kpiIdx" select="position()-1"/>
          <xsl:for-each select="$aspect/calc:Calc | $aspect/scc:chooseCalc">
            <xsl:variable name="propertyId"><xsl:if test="$cntThisAspCalcs>1"><xsl:value-of select="concat('.',@id)"/></xsl:if></xsl:variable>
            <xsl:variable name="propertyCap"><xsl:if test="$cntThisAspCalcs>1"><xsl:value-of select="concat('|',@caption)"/></xsl:if></xsl:variable>
            <wrs:C pos="{$colCount + $precedingAspCalcs*$kpiCount + $kpiIdx*$cntThisAspCalcs + position()}"
               id="{concat('asp_',$aspectId,'_',$kpi/@id,$propertyId)}"
               caption="{concat($aspectCaption,'|',$kpi/@caption,$propertyCap)}" >
              <xsl:copy-of select="$kpi/@type-name"/><xsl:copy-of select="@type-name"/> <!-- calc data type wins over KPI, which is default -->
              <xsl:copy-of select="$kpi/@scale"/><xsl:copy-of select="@scale"/>
              <xsl:copy-of select="$kpi/@unit"/><xsl:copy-of select="@unit"/>
            </wrs:C>
          </xsl:for-each>
        </xsl:for-each>
      </xsl:for-each>
    </wrs:Columns>
  </xsl:template>

  <xsl:template match="@*|node()">
    <xsl:copy><xsl:apply-templates select="@*|node()"/></xsl:copy>
  </xsl:template>

</xsl:stylesheet>