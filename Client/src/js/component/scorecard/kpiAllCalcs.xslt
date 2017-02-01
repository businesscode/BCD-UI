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
  xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
  xmlns:generator="urn(bcd-xsltGenerator)"
  bcdxml:wrsHeaderIsEnough="true">

  <!--
      This adds a column in each row for each kpi to be calculated
    -->

  <!-- Our generic calculations to xPath resolver, extended by some templates below (the ones with mode="calc") -->
  <xsl:import href="../../../xslt/calculation/calculation.xslt"/>

  <xsl:output method="xml" media-type="text/xslt" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:param name="sccDefinition"/>
  <xsl:param name="refAspWrqWithModifier"/>

  <xsl:key name="lookupColumnByBindingItemId" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@id"/>
  <xsl:variable name="doc" select="/"/>

  <xsl:variable name="templateDoc" select="document('kpiAllCalcsTemplate.xslt')"/>

  <xsl:template match="/">
    <xsl:apply-templates select="$templateDoc" mode="generateXSLT"/>
  </xsl:template>

  <!-- Per default take all xsl:templates of our template doc -->
  <xsl:template match="@*|node()" mode="generateXSLT">
    <xsl:copy><xsl:apply-templates select="@*|node()" mode="generateXSLT"/></xsl:copy>
  </xsl:template>

  <!-- Loop over the KPIs and create turn the calcs expressions into wrs:C with xpath expressions realizing the calcs -->
  <xsl:template match="generator:Calcs" mode="generateXSLT">

    <!-- KPI calculation on kpi measures -->
    <xsl:for-each select="$sccDefinition/*/scc:Kpis/scc:Kpi">
      <xsl:apply-templates select="calc:Calc" mode="generateXSLT">
        <xsl:with-param name="kpiId" select="''"/>
      </xsl:apply-templates>
    </xsl:for-each>

    <!-- KPI calculation on asp measures (asp with WrqModifier) -->
    <xsl:for-each select="$refAspWrqWithModifier/*/scc:Aspect[@type='wrqModifier']">
      <xsl:variable name="aspect" select="."/>
      <xsl:for-each select="$sccDefinition/*/scc:Kpis/scc:Kpi">
        <xsl:apply-templates select="calc:Calc" mode="generateXSLT">
          <xsl:with-param name="kpiId" select="concat('asp_',$aspect/@id,'_')"/>
        </xsl:apply-templates>
      </xsl:for-each>
    </xsl:for-each>

  </xsl:template>

  <!-- Each calc:Calc becomes a cell in the output, using calculation.xslt, in turn calling calc:ValueRef below -->
  <xsl:template match="calc:Calc" mode="generateXSLT">
    <xsl:param name="kpiId"/>
    <wrs:C>
      <xsl:apply-templates select="." mode="calc">
        <xsl:with-param name="customId" select="$kpiId"/>
      </xsl:apply-templates>
    </wrs:C>
  </xsl:template>

  <!-- Each calc:ValueRef is turned into an access to the corresponding column -->
  <xsl:template match="calc:ValueRef[@idRef]" mode="calc">
    <xsl:param name="plain" select="false()"/>
    <xsl:param name="customId"/>
    <xsl:variable name="bindingItemId" select="concat($customId,'agg_',@idRef/ancestor-or-self::*[@aggr][1]/@aggr,'_',@idRef)"/>
    <xsl:variable name="colIndex">
      <xsl:for-each select="$doc">
        <xsl:value-of select="key('lookupColumnByBindingItemId', $bindingItemId)/@pos"/>
      </xsl:for-each>
    </xsl:variable>
    <xsl:choose>
      <xsl:when test="not($plain) and ancestor::calc:Calc[1]/@zeroIfNullOp='true'">
        <xsl:text>translate(number(</xsl:text><xsl:value-of select="concat('wrs:C[',number($colIndex),']')"/><xsl:text>), 'aN', '0')</xsl:text>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="concat('wrs:C[',number($colIndex),']')"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

</xsl:stylesheet>