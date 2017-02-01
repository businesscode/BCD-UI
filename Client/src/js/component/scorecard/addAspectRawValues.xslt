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
  xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0"
  xmlns:guiStatus="http://www.businesscode.de/schema/bcdui/guiStatus-1.0.0"
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:key name="colHeadByPos" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@pos" />
  <xsl:key name="colHeadById"  match="/*/wrs:Header/wrs:Columns/wrs:C" use="@id" />
  
  <xsl:variable name="aspDef" select="$sccDefinition/*/scc:Aspects/scc:Aspect[@id='bcdRawValues']"/>

  <xsl:param name="sccDefinition"/>

  <xsl:template match="/">
    <xsl:copy>
      <xsl:apply-templates select="@*|node()"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="wrs:Columns">
    <xsl:copy>
      <xsl:copy-of select="@*"/>
      <xsl:copy-of select="wrs:C"/>
      <xsl:variable name="startPos" select="count(wrs:C)"/>
      <xsl:for-each select="$sccDefinition/*/scc:Kpis/scc:Kpi">
        <wrs:C pos="{$startPos + position() * 2 - 1}" id="{concat('asp_bcdRawValues_',@id,'.i')}" scale="{$aspDef/calc:Calc[1]/@scale}" type-name="NUMERIC"/>
        <wrs:C pos="{$startPos + position() * 2}"     id="{concat('asp_bcdRawValues_',@id,'.t')}" scale="{$aspDef/calc:Calc[2]/@scale}" type-name="NUMERIC"/>
      </xsl:for-each>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="wrs:R">
    <xsl:copy>
      <xsl:copy-of select="@*"/>
      <xsl:copy-of select="wrs:C"/>
      <xsl:variable name="row" select="."/>
      <xsl:for-each select="$sccDefinition/*/scc:Kpis/scc:Kpi">
        <xsl:variable name="kpiDef" select="."/>
        <xsl:variable name="aggr">
          <xsl:choose>
            <xsl:when test="$kpiDef/@aggr"><xsl:value-of select="$kpiDef/@aggr"/></xsl:when>
            <xsl:otherwise>bcdSum</xsl:otherwise>
          </xsl:choose>
        </xsl:variable>
          <xsl:for-each select="$row">
            <xsl:choose>
              <xsl:when test="$kpiDef/calc:Calc/calc:Div[count(calc:ValueRef)= 2]">
                <wrs:C><xsl:value-of select="wrs:C[number(key('colHeadById',concat('agg_',$aggr,'_',$kpiDef/@id, '.i'))/@pos)]"/></wrs:C>
                <wrs:C><xsl:value-of select="wrs:C[number(key('colHeadById',concat('agg_',$aggr,'_',$kpiDef/@id, '.t'))/@pos)]"/></wrs:C>
              </xsl:when>
              <xsl:otherwise>
                <wrs:C><wrs:null/></wrs:C>
                <wrs:C><wrs:null/></wrs:C>
              </xsl:otherwise>
            </xsl:choose>
            </xsl:for-each>
      </xsl:for-each>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="@*|node()">
    <xsl:copy>
      <xsl:apply-templates select="@*|node()"/>
    </xsl:copy>
  </xsl:template>

</xsl:stylesheet>