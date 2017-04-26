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
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:generator="urn(bcd-xsltGenerator)">
<!--
   Generates the following variables

     $headerColsNum
     $headerOffsetValue
     $bcdControllerVariableName
     $dim{1,2,3...}Numeric
 -->

<generator:VariablesForHeader xmlns:generator="urn(bcd-xsltGenerator)"/>

<!-- A pipe-separated sorted list of column index mappings which can be used to determine
     which column has which index after sorting. Maps ...|newPos:oldPos|.. -->
<xsl:variable name="columnOrderingList">
  <xsl:value-of select="'|'"/>
  <xsl:for-each select="/*/wrs:Header/wrs:Columns/wrs:C[not($boolHideTotals) or not(contains(@id,'&#xE0F0;1'))]">
    <generator:SortCols/>
    <xsl:value-of select="concat(position(), ':', @pos, '|')"/>
  </xsl:for-each>
</xsl:variable>

<!-- The reversed version of the "columnOrderingList" variable. -->
<generator:OnlyIfColSpan>
  <xsl:variable name="columnOrderingListReversed">
    <xsl:value-of select="'|'"/>
    <xsl:for-each select="/*/wrs:Header/wrs:Columns/wrs:C[not($boolHideTotals) or not(contains(@id,'&#xE0F0;1'))]">
      <xsl:sort select="string-length(substring-before($columnOrderingList, concat(':', @pos, '|')))" data-type="number" order="descending"/>
      <xsl:value-of select="concat(@pos, '|')"/>
    </xsl:for-each>
  </xsl:variable>
</generator:OnlyIfColSpan>

<!--
  Generates variables for colspan:

     $colSpanLevel{1,2,3...}
 -->
<generator:ColSpanVariables/>

<xsl:template match="@*|node()">
  <xsl:copy><xsl:apply-templates select="@*|node()"/></xsl:copy>
</xsl:template>

<!--
  Generates one single header cell in a header row.
 -->
<xsl:template match="wrs:Header/wrs:Columns/wrs:C">
  <xsl:param name="name"/>
  <xsl:param name="isTotal"/>
  <xsl:param name="level"/>
  <xsl:param name="isInnerMostDim"/>
  <xsl:param name="isMeasure"/>
  <xsl:param name="colSpan" select="1"/>
  <xsl:param name="rowSpan" select="1"/>
  <xsl:param name="extraStartColSpan" select="0"/>
  <xsl:param name="hideDimHeaderCaptions" select="false()"/>
  <xsl:if test="not(number($colSpan) = 0) and not(number($rowSpan) = 0)">
    <th bcdColIdent="{@id}">
      <xsl:variable name="cssClass">
        <xsl:if test="@dimId and $hideDimHeaderCaptions">bcdEmpty</xsl:if>
        <xsl:if test="contains(@id,'&#xE0F0;1')"> bcdTotal</xsl:if>
        <xsl:if test="@bcdVdm and $isInnerMostDim"> bcdVdm</xsl:if>
        <xsl:if test="$isMeasure and @bcdVmeas"> bcdVmeas</xsl:if>
        <xsl:choose>
          <xsl:when test="$isMeasure and @bcdRowCumulate and @bcdColCumulate"> bcdRowColCumulate</xsl:when>
          <xsl:when test="$isMeasure and @bcdRowCumulate"> bcdRowCumulate</xsl:when>
          <xsl:when test="$isMeasure and @bcdColCumulate"> bcdColCumulate</xsl:when>
        </xsl:choose>
      </xsl:variable>
      <xsl:attribute name="class"><xsl:value-of select="$cssClass"/></xsl:attribute>
      <xsl:if test="@type-name">
        <xsl:attribute name="jdbccolumntypename"><xsl:value-of select="@type-name"/></xsl:attribute>
      </xsl:if>
      <xsl:choose>
        <xsl:when test="not(preceding-sibling::wrs:C) and $colSpan + $extraStartColSpan != 1 ">
          <xsl:attribute name="colspan"><xsl:value-of select="$colSpan + $extraStartColSpan"/></xsl:attribute>
        </xsl:when>
        <xsl:when test="$colSpan != 1">
          <xsl:attribute name="colspan"><xsl:value-of select="$colSpan"/></xsl:attribute>
        </xsl:when>
      </xsl:choose>
      <xsl:if test="$rowSpan != 1">
        <xsl:attribute name="rowspan"><xsl:value-of select="$rowSpan"/></xsl:attribute>
      </xsl:if>
      <xsl:choose>
        <!-- In case of xp:OnlyMeasureForTotal, our top-most total cell spans down including the measures, we show the measure name -->
        <xsl:when test="@dimId and $hideDimHeaderCaptions">&#160;</xsl:when>
        <xsl:when test="$isTotal and $rowSpan>1 and $onlyMeasureForTotal">
          <xsl:variable name="startMeasurName">
            <xsl:call-template name="lastIndexOf">
              <xsl:with-param name="s" select="@caption"/>
              <xsl:with-param name="c" select="'|'"/>
            </xsl:call-template>
          </xsl:variable>
          <xsl:value-of select="substring(@caption,$startMeasurName+1)"/>
        </xsl:when>
        <!-- Other cases -->
        <xsl:otherwise>
          <xsl:choose>
            <xsl:when test="string-length($name)">
              <xsl:if test="starts-with($name,'&#xE0FF;')"><xsl:attribute name="bcdTranslate"><xsl:value-of select="substring-after($name,'&#xE0FF;')"/></xsl:attribute></xsl:if>
              <xsl:call-template name="renderHeaderColumnToken">
                <xsl:with-param name="name" select="$name"/>
                <xsl:with-param name="headerCell" select="."/>
                <xsl:with-param name="level" select="$level"/>
                <xsl:with-param name="isTotal" select="$isTotal"/>
              </xsl:call-template>
            </xsl:when>
            <xsl:when test="$isTotal"><xsl:attribute name="bcdTranslate">bcd_Total</xsl:attribute></xsl:when>
            <xsl:otherwise><xsl:attribute name="bcdTranslate">bcd_EmptyDimmember</xsl:attribute></xsl:otherwise>
          </xsl:choose>
        </xsl:otherwise>
      </xsl:choose>
    </th>
  </xsl:if>
</xsl:template>


<!-- Extension point for importing stylesheets to overwrite content of headers -->
<xsl:template name="renderHeaderColumnToken">
  <xsl:param name="name"/>
  <xsl:param name="headerCell"/>
  <xsl:param name="level"/>
  <xsl:param name="isTotal"/>
  <xsl:value-of select="$name"/>
</xsl:template>

<!-- 
  Creates the rows. Extra template to support overwriting match="wrs:Header/wrs:Columns" for generating custom rows for example 
-->
<xsl:template name="createHeaderRow">
  <xsl:param name="extraStartColSpan" select="0"/>
  <xsl:param name="hideDimHeaderCaptions" select="false()"/>
    <xsl:if test="$maxRowsExceeded">
      <tr><td colspan="999" style="text-align:left"><div class="bcdInfoBox"><span bcdTranslate="bcd_MaxRowsExceeded">Please note, not all values are displayed as the report exceeds the maximum size.</span></div></td></tr>
    </xsl:if>
    <generator:ForEachHeaderRowAndCol>
      <xsl:sort select="string-length(substring-before($columnOrderingList, concat(':', @pos, '|')))" data-type="number"/>
      <xsl:apply-templates select=".">
        <xsl:with-param name="name" select="$name"/>
        <xsl:with-param name="isTotal" select="$isTotal"/>
        <xsl:with-param name="level"   select="$level"/>
        <xsl:with-param name="isInnerMostDim" select="$isInnerMostDim"/>
        <xsl:with-param name="isMeasure" select="$isMeasure"/>
        <xsl:with-param name="extraStartColSpan" select="$extraStartColSpan"/>
        <xsl:with-param name="hideDimHeaderCaptions" select="$hideDimHeaderCaptions"/>
        <generator:OnlyIfColSpan>
          <xsl:with-param name="colSpan" select="$colSpan"/>
          <xsl:with-param name="rowSpan" select="$rowSpan"/>
        </generator:OnlyIfColSpan>
      </xsl:apply-templates>
    </generator:ForEachHeaderRowAndCol>
</xsl:template>

<!--
  Creates the header of the table (<thead/>)
 -->
<xsl:template match="wrs:Header/wrs:Columns">
  <xsl:param name="extraStartColSpan" select="0"/>
  <xsl:param name="hideDimHeaderCaptions" select="false()"/>
  <thead>
    <xsl:call-template name="createHeaderRow">
      <xsl:with-param name="extraStartColSpan" select="$extraStartColSpan"/>
      <xsl:with-param name="hideDimHeaderCaptions" select="$hideDimHeaderCaptions"/>
    </xsl:call-template>
  </thead>
</xsl:template>
</xsl:stylesheet>
