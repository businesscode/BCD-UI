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
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:param name="sccDefinition"/>

  <xsl:variable name="colCategories" select="$sccDefinition/*/scc:Layout/scc:Dimensions/scc:Columns/scc:LevelKpi"/>
  <xsl:variable name="nonKpiCount" select="count(/*/wrs:Header/wrs:Columns/wrs:C[not(@catOrder)])"/>

  <xsl:template match="node()|@*">
    <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>
  </xsl:template>

  <!-- sort by category order and rebuild pos attribute-->
  <xsl:template match="wrs:Columns">
    <wrs:Columns>
      <xsl:copy-of select="@*"/>
      <!-- keep all non kpi data -->
      <xsl:copy-of select="wrs:C[position() &lt;= $nonKpiCount]"/>
      <xsl:for-each select="wrs:C[position() &gt; $nonKpiCount]">
        <xsl:sort select="@catOrder"/>
        <wrs:C>
          <xsl:copy-of select="@*[name()!='pos' and name()!='catOrder']"/>
          <xsl:attribute name="pos"><xsl:value-of select="position() + $nonKpiCount"/></xsl:attribute>
          <xsl:apply-templates select="*"/>
        </wrs:C>
      </xsl:for-each>
    </wrs:Columns>
  </xsl:template>

  <!-- rebuild data following new ordering -->
  <xsl:template match="wrs:R">
    <xsl:variable name="row" select="."/>
    <wrs:R>
      <xsl:copy-of select="@*"/>
      <xsl:copy-of select="$row/wrs:C[position() &lt;= $nonKpiCount]"/>
      <xsl:for-each select="/*/wrs:Header/wrs:Columns/wrs:C[position() &gt; $nonKpiCount]">
        <xsl:sort select="@catOrder"/>
        <xsl:copy-of select="$row/wrs:C[position()=current()/@pos]"/>
      </xsl:for-each>
    </wrs:R>
  </xsl:template>

</xsl:stylesheet>
