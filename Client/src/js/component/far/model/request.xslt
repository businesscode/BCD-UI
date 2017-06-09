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
  xmlns="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0"
  xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:far="http://www.businesscode.de/schema/bcdui/far-1.0.0"
  xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  >
  <!--
  
  input:  far enhanced configuration
  output: Wrq 

   -->

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" />

  <xsl:param name="statusModel"/>
  <xsl:param name="componentId"/>
  
  <xsl:variable name="configuration" select="/far:Configuration[@id = $componentId]"/>
  <xsl:variable name="layout" select="$configuration/far:Layout"/>
  <xsl:variable name="dimensionsMeasures" select="$layout/far:Columns/*"/>
  <xsl:variable name="dimensions" select="$layout/far:Columns/dm:LevelRef"/>
  <xsl:variable name="sorting.items" select="$layout/far:Ordering/*"/>
  <xsl:variable name="maxRows" select="$configuration/far:MaxRows"/>

  <xsl:key name="measureById" match="/*/far:Measures/dm:Measure" use="@id" />
  <xsl:key name="levelRefByBref" match="/*/far:Dimensions/dm:LevelRef" use="@bRef" />

  <xsl:template match="/*">
    <WrsRequest>
      <!-- currently, we at least require dimension selected -->
      <xsl:if test="$dimensions">
        <Select>
          <xsl:if test="$maxRows">
            <xsl:attribute name="rowEnd"><xsl:value-of select="$maxRows"/></xsl:attribute>
          </xsl:if>
          <Columns>
            <xsl:apply-templates select="$dimensionsMeasures" mode="asWrqC">
              <xsl:with-param name="hasCaption" select="true()"/>
            </xsl:apply-templates>
          </Columns>
          <From>
            <xsl:copy-of select="wrq:BindingSet"/>
          </From>
          <!-- Extended filters are expected to work an aggregated level, we handle them in the having part -->
          <f:Filter>
            <xsl:copy-of select="$statusModel//f:Filter/*[not(self::f:And[@id=$componentId])]"/>
          </f:Filter>
          <Grouping>
            <xsl:apply-templates select="$dimensions" mode="asWrqC"/>
          </Grouping>
          <!-- always ensure ordering -->
          <Ordering>
            <xsl:choose>
              <xsl:when test="$sorting.items">
                <xsl:apply-templates select="$sorting.items" mode="asOrderBy"/>
              </xsl:when>
              <xsl:otherwise>
                <xsl:apply-templates select="$dimensionsMeasures" mode="asOrderBy"/>
              </xsl:otherwise>
            </xsl:choose>
          </Ordering>
          <Having>
            <xsl:copy-of select="$statusModel//f:Filter/f:And[@id=$componentId]"/>
          </Having>
        </Select>
      </xsl:if>
    </WrsRequest>
  </xsl:template>

  <xsl:template match="dm:LevelRef" mode="asWrqC">
  <xsl:param name="hasCaption" select="false()"/>
    <C bRef="{@bRef}">
      <xsl:if test="$hasCaption">
        <xsl:variable name="levelRef" select="key('levelRefByBref',@bRef)"/>
        <xsl:attribute name="caption"><xsl:value-of select="$levelRef/@caption"/></xsl:attribute>
      </xsl:if>
    </C>
  </xsl:template>
  <xsl:template match="dm:MeasureRef" mode="asWrqC">
    <!-- 
      to support measure-only we have to enforce aggregation
      on wrq-level but same time we want be able to
      to suppress explicit aggregation on binding-item level,
      i.e. in case the column-expression contains an aggr. already.
     -->
    <xsl:variable name="measure" select="key('measureById',@idRef)"/>
    <!-- support for Measure/@bRef (default aggregation from binding-item applies) -->
    <xsl:choose>
      <xsl:when test="$measure/@bRef">
        <C
          bRef="{$measure/@bRef}"
          caption="{$measure/@caption}"/>
      </xsl:when>
      <xsl:otherwise>
        <!-- support for Measure/Calc: currently supported calc:ValueRef only -->
        <xsl:variable name="bRef" select="$measure/calc:Calc/calc:ValueRef/@idRef"/>
        <xsl:variable name="aggr" select="$measure/calc:Calc/calc:ValueRef/@aggr"/>
        <C
          bRef="{$bRef}"
          caption="{$measure/@caption}">
          <!-- if not provided, default aggregation from binding-item applies -->
          <xsl:if test="$aggr">
            <xsl:attribute name="aggr"><xsl:value-of select="$aggr"/></xsl:attribute>
          </xsl:if>
        </C>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template match="dm:LevelRef" mode="asOrderBy">
    <xsl:variable name="order" select="substring-before(@sort,'ending')"/>
    <C bRef="{@bRef}" order="{concat(substring('asc',0,1 div string-length($order)),$order)}"/>
  </xsl:template>
  <xsl:template match="dm:MeasureRef" mode="asOrderBy">
    <xsl:variable name="measure" select="key('measureById',@idRef)"/>
    <xsl:variable name="order" select="substring-before(@sort,'ending')"/>
    <C
      bRef="{concat(substring($measure/@bRef,0,1 div string-length($measure/calc:Calc/calc:ValueRef/@idRef)), $measure/calc:Calc/calc:ValueRef/@idRef)}"
      order="{concat(substring('asc',0,1 div string-length($order)),$order)}"/>
  </xsl:template>

</xsl:stylesheet>