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
  This does derive a chart definition from a Wrs in a generic way
  Support the following situations:
  1) One Measure and one row plus one col dimension= col dimension, row dimension determines the series.
  2) One Measure and two row-dimensions. Categories = Outer dimension, inner dimension determines the series.
  3) One Measure and two col-dimensions. Categories = Outer dimension, inner dimension determines the series.
  4) Multiple Measures and one row dim. Each measure becomes a series. Allows bar, line, point and area (pie in case of 1 measure)
  5) Multiple Measures and one col dim. Each measure becomes a series. Allows bar, line, point and area (pie in case of 1 measure)

  All other combinations do currently lead to an empty chart

  Input is the Wrs, parameter are
  - title
  - types, space separated chart types (BARCHART etc) per series

  TODO select one of multiple measures, further chart types (marimecko, scattered, gauge)
  -->

<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:chart="http://www.businesscode.de/schema/bcdui/charts-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">

  <xsl:param name="title"/>
  <xsl:param name="chartPreSettings" select="/.."/> <!-- This allows overwriting defaults of the from-Wrs-generated chart -->
  <xsl:param name="bcdInputModelId"/>
  <xsl:param name="cubeConfig" select="/*[1=0]"/>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:key name="headerColsUnit" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@unit" />
  <xsl:key name="headerValueId" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@valueId" />
  <xsl:key name="headerColsIdFirstPart" match="/*/wrs:Header/wrs:Columns/wrs:C" use="substring-before(@id,'|')" />
  <xsl:key name="headerColsIdSecondPart" match="/*/wrs:Header/wrs:Columns/wrs:C" use="substring-after(@id,'|')" />
  <xsl:key name="rowDimensionCell" match="/*/wrs:Data/wrs:R/wrs:C" use="." />

  <xsl:variable name="units" select="/*/wrs:Header/wrs:Columns/wrs:C[generate-id(.) = generate-id(key('headerColsUnit', @unit))]"/>
  <xsl:variable name="valueIds" select="/*/wrs:Header/wrs:Columns/wrs:C[generate-id(.) = generate-id(key('headerValueId', @valueId))]"/>

  <!-- Units in cases where each row gives a series
    We append a dummy '' to the unit determination to deal with data having @unit not set. They would otherwise miss in our list
    -->
  <xsl:key name="rowSeriesUnits" match="/*/wrs:Data/wrs:R/wrs:C[2]" use="concat(@unit,'')" />
  <xsl:variable name="rowSeriesDistinctUnits" select="/*/wrs:Data/wrs:R/wrs:C[2][generate-id(.) = generate-id(key('rowSeriesUnits', concat(@unit,'')))]"/>

  <xsl:variable name="gotEmptyUnits" select="boolean(/*/wrs:Header/wrs:Columns/wrs:C[not(@dimId) and not(@unit)])"/>
  <xsl:variable name="unitOffset">
    <xsl:choose>
      <xsl:when test="$gotEmptyUnits">1</xsl:when>
      <xsl:otherwise>2</xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:variable name="unitCount">
    <xsl:choose>
      <xsl:when test="$gotEmptyUnits"><xsl:value-of select="number(1 + count($units))"/></xsl:when>
      <xsl:otherwise><xsl:value-of select="number(count($units))"/></xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:variable name="unit1">
    <xsl:choose>
      <xsl:when test="$gotEmptyUnits"></xsl:when>
      <xsl:otherwise><xsl:value-of select="$units[1]/@unit"/></xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:variable name="unit2" select="$units[$unitOffset]/@unit"/>


  <xsl:variable name="mesCountUnit1">
    <xsl:choose>
      <xsl:when test="$gotEmptyUnits"><xsl:value-of select="count(/*/wrs:Header/wrs:Columns/wrs:C[not(@unit) and generate-id(.) = generate-id(key('headerValueId', @valueId))])"/></xsl:when>
      <xsl:otherwise><xsl:value-of select="count(/*/wrs:Header/wrs:Columns/wrs:C[@unit = $units[1]/@unit and generate-id(.) = generate-id(key('headerValueId', @valueId))])"/></xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:variable name="mesCountUnit2">
    <xsl:choose>
      <xsl:when test="$unitCount &gt; 1"><xsl:value-of select="count(/*/wrs:Header/wrs:Columns/wrs:C[@unit = $units[$unitOffset]/@unit and generate-id(.) = generate-id(key('headerValueId', @valueId))])"/></xsl:when>
      <xsl:otherwise>0</xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:variable name="mesCaptionUnit1">
    <xsl:choose>
      <xsl:when test="$mesCountUnit1 = 1 and $gotEmptyUnits"><xsl:value-of select="/*/wrs:Header/wrs:Columns/wrs:C[not(@unit) and generate-id(.) = generate-id(key('headerValueId', @valueId))]/@caption"/></xsl:when>
      <xsl:when test="$mesCountUnit1 = 1 and $unitCount = 1"><xsl:value-of select="/*/wrs:Header/wrs:Columns/wrs:C[@unit = $units[1]/@unit and generate-id(.) = generate-id(key('headerValueId', @valueId))]/@caption"/></xsl:when>
    </xsl:choose>
  </xsl:variable>
  <xsl:variable name="mesCaptionUnit2">
    <xsl:choose>
      <xsl:when test="$mesCountUnit2 = 1 and $unitCount &gt; 1"><xsl:value-of select="/*/wrs:Header/wrs:Columns/wrs:C[@unit = $units[1]/@unit and generate-id(.) = generate-id(key('headerValueId', @valueId))]/@caption"/></xsl:when>
      <xsl:otherwise><xsl:value-of select="$mesCaptionUnit1"/></xsl:otherwise>
    </xsl:choose>
  </xsl:variable>

  <xsl:variable name="forceAxisY1" select="$cubeConfig//dm:Measures/dm:Measure[@yAxis='1']/@yAxis"/>
  <xsl:variable name="forceAxisY2" select="$cubeConfig//dm:Measures/dm:Measure[@yAxis='2']/@yAxis"/>

  <xsl:variable name="xValueType">
    <xsl:choose>
      <xsl:when test="$chartPreSettings/*/chart:XAxis/chart:XValues">XValues</xsl:when>
      <xsl:otherwise>Categories</xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:variable name="xValueTypeAttr" select="$chartPreSettings/*/chart:XAxis/chart:XValues/@type"/>

  <xsl:template match="/">
    <chart:Chart title="{$title}" xmlns:chart="http://www.businesscode.de/schema/bcdui/charts-1.0.0">
      <xsl:apply-templates select="node()|@*"/>
    </chart:Chart>
  </xsl:template>

  <!--

    One measure and one row plus one col dim
    - Each row dim member leads to a series with the col dim as values
    - The unit of each series is derived from its first value

   -->
   <xsl:template match="/wrs:Wrs[count(wrs:Header/wrs:Columns/wrs:C[@dimId]) = 1 and string-length(wrs:Header/wrs:Columns/@colDimLevelIds) > 0 and string-length(substring-after(wrs:Header/wrs:Columns/@colDimLevelIds, '|')) = 0]">

    <xsl:if test="count($valueIds)=1">
        <xsl:variable name="totalColumn" select="wrs:Header/wrs:Columns/wrs:C[starts-with(@id,'&#xE0F0;1')]/@pos"/>
        <xsl:variable name="validColPosExpr">
          <xsl:choose>
            <xsl:when test="number($totalColumn)">position()>1 and position()!=<xsl:value-of select="$totalColumn"/></xsl:when>
            <xsl:otherwise>position()>1</xsl:otherwise>
          </xsl:choose>
        </xsl:variable>

        <chart:XAxis caption="{wrs:Header/wrs:Columns/@colDimLevelCaptions}">
          <xsl:copy-of select="$chartPreSettings/*/chart:XAxis/@*"/>
          <xsl:element name="{$xValueType}" namespace="http://www.businesscode.de/schema/bcdui/charts-1.0.0">
            <xsl:if test="$xValueTypeAttr">
              <xsl:attribute name="type"><xsl:value-of select="$xValueTypeAttr"/></xsl:attribute>
            </xsl:if>
            <xsl:attribute name="modelId"><xsl:value-of select="$bcdInputModelId"/></xsl:attribute>
            <xsl:attribute name="nodes">/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[position() > 1 and not(contains(@id,'&#xE0F0;1'))]/@caption</xsl:attribute>
          </xsl:element>
        </chart:XAxis>

        <xsl:choose>
          <xsl:when test="$rowSeriesDistinctUnits[1]/@unit">
            <chart:YAxis1 unit="{$rowSeriesDistinctUnits[1]/@unit}" caption="{wrs:Header/wrs:Columns/wrs:C[1]/@caption}">
              <xsl:copy-of select="$chartPreSettings/*/chart:YAxis1/@*"/>
            </chart:YAxis1>
            <xsl:if test="$chartPreSettings/*/chart:YAxis2 or $rowSeriesDistinctUnits[2]">
              <chart:YAxis2 unit="{$rowSeriesDistinctUnits[2]/@unit}" caption="{wrs:Header/wrs:Columns/wrs:C[1]/@caption}">
                <xsl:copy-of select="$chartPreSettings/*/chart:YAxis2/@*"/>
              </chart:YAxis2>
            </xsl:if>
          </xsl:when>
          <xsl:otherwise>
            <chart:YAxis1 count="{count($rowSeriesDistinctUnits)}" unit="{wrs:Header/wrs:Columns/wrs:C[2]/@unit}" caption="{substring-after(wrs:Header/wrs:Columns/wrs:C[2]/@caption, '|')}">
              <xsl:copy-of select="$chartPreSettings/*/chart:YAxis1/@*"/>
            </chart:YAxis1>
          </xsl:otherwise>
        </xsl:choose>

        <chart:Series>
          <xsl:for-each select="wrs:Data/wrs:R[not(wrs:C[1]/@bcdGr=1)]">
            <chart:Series caption="{wrs:C[1]/@caption | wrs:C[1]}">
              <!-- All values of a series always have the same unit, so we can ask the unit of the first actual value, if its not found in the header -->
              <xsl:variable name="yAxis1Or2">
                <xsl:choose>
                  <xsl:when test="concat(./wrs:C[2]/@unit,'')=concat($rowSeriesDistinctUnits[1]/@unit,'')">1</xsl:when>
                  <xsl:otherwise>2</xsl:otherwise>
                </xsl:choose>
              </xsl:variable>
              <xsl:attribute name="yAxis1Or2"><xsl:value-of select="$yAxis1Or2"/></xsl:attribute>
              <xsl:copy-of select="$chartPreSettings/*/chart:Series/*[not(@yAxis1Or2) or @yAxis1Or2=$yAxis1Or2]/@*"/>
              <chart:YData modelId="{$bcdInputModelId}" nodes="/wrs:Wrs/wrs:Data/wrs:R[{position()}]/wrs:C[{$validColPosExpr}]"/>
            </chart:Series>
          </xsl:for-each>
        </chart:Series>
        <xsl:copy-of select="$chartPreSettings/*/chart:Stacked"/>
        <xsl:copy-of select="$chartPreSettings/*/chart:SeriesColors"/>
        <xsl:copy-of select="$chartPreSettings/*/chart:EChartOptions"/>

    </xsl:if>
  </xsl:template>
  
  <xsl:template name="colorLookup">
    <xsl:param name="measureId"/>
    <xsl:value-of select="$cubeConfig//dm:Measures/dm:Measure[@id=$measureId]/@color"/>
  </xsl:template>

  <!--

    Only one row dim (and no col dim), one or more measures

   -->
  <xsl:template match="/wrs:Wrs[count(wrs:Header/wrs:Columns/wrs:C[@dimId]) = 1 and string-length(wrs:Header/wrs:Columns/@colDimLevelIds) = 0]">

      <!-- get predicates for valid rows (all but the total row, which is excluded) -->
      <xsl:variable name="totalRow" select="wrs:Data/wrs:R[wrs:C[@bcdGr=1]]/@id"/>
      <xsl:variable name="validRowExpr">
        <xsl:choose>
          <xsl:when test="$totalRow">[@id!='<xsl:value-of select="$totalRow"/>']</xsl:when>
        </xsl:choose>
      </xsl:variable>

      <chart:XAxis caption="{wrs:Header/wrs:Columns/wrs:C[@dimId]/@caption}">
        <xsl:copy-of select="$chartPreSettings/*/chart:XAxis/@*"/>
          <xsl:element name="{$xValueType}" namespace="http://www.businesscode.de/schema/bcdui/charts-1.0.0">
            <xsl:if test="$xValueTypeAttr">
              <xsl:attribute name="type"><xsl:value-of select="$xValueTypeAttr"/></xsl:attribute>
            </xsl:if>
            <xsl:attribute name="modelId"><xsl:value-of select="$bcdInputModelId"/></xsl:attribute>
            <xsl:variable name="pos" select="number(wrs:Header/wrs:Columns/wrs:C[@dimId]/@pos)"/>
            <xsl:attribute name="nodes"><xsl:value-of select="concat('/wrs:Wrs/wrs:Data/wrs:R', $validRowExpr, '/wrs:C[', $pos, ']')"/></xsl:attribute>
          </xsl:element>
      </chart:XAxis>

      <chart:YAxis1 unit="{$unit1}" caption="{$mesCaptionUnit1}">
        <xsl:copy-of select="$chartPreSettings/*/chart:YAxis1/@*"/>
      </chart:YAxis1>

      <xsl:if test="$chartPreSettings/*/chart:YAxis2 or $unitCount &gt; 1 or $forceAxisY2 != ''">
        <chart:YAxis2 unit="{$unit2}" caption="{$mesCaptionUnit2}">
          <xsl:copy-of select="$chartPreSettings/*/chart:YAxis2/@*"/>
        </chart:YAxis2>
      </xsl:if>

      <chart:Series>
        <xsl:choose>
          <xsl:when test="$forceAxisY1 != '' and $forceAxisY2 != ''">
            <xsl:for-each select="wrs:Header/wrs:Columns/wrs:C[@valueId]">
              <xsl:variable name="id" select="@id"/>
              <xsl:variable name="yForce" select="$cubeConfig//dm:Measures/dm:Measure[@id=$id]/@yAxis"/>
              <chart:Series caption="{current()/@caption}" yAxis1Or2="{$yForce}">
                <xsl:copy-of select="$chartPreSettings/*/chart:Series/chart:Series[position()=$yForce]/@*"/>
                <chart:YData modelId="{$bcdInputModelId}" nodes="/wrs:Wrs/wrs:Data/wrs:R{$validRowExpr}/wrs:C[{current()/@pos}]"/>
              </chart:Series>
            </xsl:for-each>
          </xsl:when>
          <xsl:when test="$gotEmptyUnits">
            <xsl:for-each select="wrs:Header/wrs:Columns/wrs:C[@valueId and not(@unit)]">
              <chart:Series caption="{current()/@caption}" yAxis1Or2="1">
                <xsl:copy-of select="$chartPreSettings/*/chart:Series/*[not(@yAxis1Or2) or @yAxis1Or2='1']/@*"/>
                <chart:YData modelId="{$bcdInputModelId}" nodes="/wrs:Wrs/wrs:Data/wrs:R{$validRowExpr}/wrs:C[{current()/@pos}]"/>
              </chart:Series>
            </xsl:for-each>
          </xsl:when>
          <xsl:otherwise>
            <xsl:for-each select="wrs:Header/wrs:Columns/wrs:C[@valueId and @unit = $units[1]/@unit]">
              <chart:Series caption="{current()/@caption}" yAxis1Or2="1">
                <xsl:copy-of select="$chartPreSettings/*/chart:Series/*[not(@yAxis1Or2) or @yAxis1Or2='1']/@*"/>
                <chart:YData modelId="{$bcdInputModelId}" nodes="/wrs:Wrs/wrs:Data/wrs:R{$validRowExpr}/wrs:C[{current()/@pos}]"/>
              </chart:Series>
            </xsl:for-each>
          </xsl:otherwise>
        </xsl:choose>
        <xsl:if test="$unitCount &gt; 1 and not($forceAxisY1 != '' and $forceAxisY2 != '')">
          <xsl:for-each select="wrs:Header/wrs:Columns/wrs:C[@valueId and @unit = $units[$unitOffset]/@unit]">
            <chart:Series caption="{current()/@caption}" yAxis1Or2="2">
              <xsl:copy-of select="$chartPreSettings/*/chart:Series/*[@yAxis1Or2='2']/@*"/>
              <chart:YData modelId="{$bcdInputModelId}" nodes="/wrs:Wrs/wrs:Data/wrs:R{$validRowExpr}/wrs:C[{current()/@pos}]"/>
            </chart:Series>
          </xsl:for-each>
        </xsl:if>

      </chart:Series>
      
      <chart:SeriesColors>
        <xsl:choose>
          <xsl:when test="$forceAxisY1 != '' and $forceAxisY2 != ''">
            <xsl:for-each select="wrs:Header/wrs:Columns/wrs:C[@valueId]">
              <xsl:variable name="id" select="@id"/>
              <xsl:variable name="yForce" select="$cubeConfig//dm:Measures/dm:Measure[@id=$id]/@yAxis"/>
              <chart:Color><xsl:call-template name="colorLookup"><xsl:with-param name="measureId" select="$id"/></xsl:call-template></chart:Color>
            </xsl:for-each>
          </xsl:when>
          <xsl:when test="$gotEmptyUnits">
            <xsl:for-each select="wrs:Header/wrs:Columns/wrs:C[@valueId and not(@unit)]">
              <xsl:variable name="id" select="@id"/>
              <chart:Color><xsl:call-template name="colorLookup"><xsl:with-param name="measureId" select="$id"/></xsl:call-template></chart:Color>
            </xsl:for-each>
          </xsl:when>
          <xsl:otherwise>
            <xsl:for-each select="wrs:Header/wrs:Columns/wrs:C[@valueId and @unit = $units[1]/@unit]">
              <xsl:variable name="id" select="@id"/>
              <chart:Color><xsl:call-template name="colorLookup"><xsl:with-param name="measureId" select="$id"/></xsl:call-template></chart:Color>
            </xsl:for-each>
          </xsl:otherwise>
        </xsl:choose>
        <xsl:if test="$unitCount &gt; 1 and not($forceAxisY1 != '' and $forceAxisY2 != '')">
          <xsl:for-each select="wrs:Header/wrs:Columns/wrs:C[@valueId and @unit = $units[$unitOffset]/@unit]">
            <xsl:variable name="id" select="@id"/>
            <chart:Color><xsl:call-template name="colorLookup"><xsl:with-param name="measureId" select="$id"/></xsl:call-template></chart:Color>
          </xsl:for-each>
        </xsl:if>
      </chart:SeriesColors>

      <xsl:copy-of select="$chartPreSettings/*/chart:Stacked"/>
      <xsl:copy-of select="$chartPreSettings/*/chart:SeriesColors"/>
      <xsl:copy-of select="$chartPreSettings/*/chart:EChartOptions"/>

  </xsl:template>

  <!--

    Only one col dim (and no row dim), one or more measures

   -->
  <xsl:template match="/wrs:Wrs[count(wrs:Header/wrs:Columns/wrs:C[@dimId]) = 0 and string-length(wrs:Header/wrs:Columns/@colDimLevelIds) > 0 and string-length(substring-after(wrs:Header/wrs:Columns/@colDimLevelIds, '|')) = 0]">

      <xsl:variable name="totalColumn">
        <xsl:choose>
          <xsl:when test="wrs:Header/wrs:Columns/wrs:C[starts-with(@id,'&#xE0F0;1')]/@pos">
            <xsl:value-of select="wrs:Header/wrs:Columns/wrs:C[starts-with(@id,'&#xE0F0;1')]/@pos"/>
          </xsl:when>
          <xsl:otherwise>0</xsl:otherwise>
        </xsl:choose>
      </xsl:variable>

      <chart:XAxis caption="{wrs:Header/wrs:Columns/@colDimLevelCaptions}">
        <xsl:copy-of select="$chartPreSettings/*/chart:XAxis/@*"/>
        <xsl:element name="{$xValueType}" namespace="http://www.businesscode.de/schema/bcdui/charts-1.0.0">
          <xsl:if test="$xValueTypeAttr">
            <xsl:attribute name="type"><xsl:value-of select="$xValueTypeAttr"/></xsl:attribute>
          </xsl:if>
          <xsl:for-each select="/*/wrs:Header/wrs:Columns/wrs:C[not(contains(@id,'&#xE0F0;1')) and generate-id(.) = generate-id(key('headerColsIdFirstPart', substring-before(@id,'|')))]">
            <chart:Value><xsl:value-of select="substring-before(@caption,'|')"/></chart:Value>
          </xsl:for-each>
        </xsl:element>
      </chart:XAxis>

      <chart:YAxis1 unit="{$unit1}" caption="{substring-after($mesCaptionUnit1, '|')}">
        <xsl:copy-of select="$chartPreSettings/*/chart:YAxis1/@*"/>
      </chart:YAxis1>

      <xsl:if test="$chartPreSettings/*/chart:YAxis2 or $unitCount &gt; 1 or $forceAxisY2 != ''">
        <chart:YAxis2 unit="{$unit2}" caption="{substring-after($mesCaptionUnit2, '|')}">
          <xsl:copy-of select="$chartPreSettings/*/chart:YAxis2/@*"/>
        </chart:YAxis2>
      </xsl:if>

      <chart:Series>
        <xsl:choose>
          <xsl:when test="$forceAxisY1 != '' and $forceAxisY2 != ''">
            <xsl:for-each select="wrs:Header/wrs:Columns/wrs:C[not(contains(@id,'&#xE0F0;1')) and generate-id(.) = generate-id(key('headerColsIdSecondPart', substring-after(@id,'|')))]">
              <xsl:variable name="id" select="substring-after(@id, '|')"/>
              <xsl:variable name="yForce" select="$cubeConfig//dm:Measures/dm:Measure[@id=$id]/@yAxis"/>
              <chart:Series caption="{substring-after(current()/@caption, '|')}" yAxis1Or2="{$yForce}">
                <xsl:copy-of select="$chartPreSettings/*/chart:Series/chart:Series[position()=$yForce]/@*"/>
                <chart:YData>
                  <xsl:for-each select="/*/wrs:Data/wrs:R/wrs:C[position() &lt; $totalColumn and position() = /*/wrs:Header/wrs:Columns/wrs:C[substring-after(@id,'|')=$id]/@pos]">
                    <chart:Value><xsl:value-of select="."/></chart:Value>
                  </xsl:for-each>
                </chart:YData>
              </chart:Series>
            </xsl:for-each>
          </xsl:when>
          <xsl:when test="$gotEmptyUnits">
            <xsl:for-each select="wrs:Header/wrs:Columns/wrs:C[not(contains(@id,'&#xE0F0;1')) and not(@unit) and generate-id(.) = generate-id(key('headerColsIdSecondPart', substring-after(@id,'|')))]">
            <xsl:variable name="id" select="substring-after(@id, '|')"/>
              <chart:Series caption="{substring-after(current()/@caption, '|')}" yAxis1Or2="1">
                <xsl:copy-of select="$chartPreSettings/*/chart:Series/*[not(@yAxis1Or2) or @yAxis1Or2='1']/@*"/>
                <chart:YData>
                  <xsl:for-each select="/*/wrs:Data/wrs:R/wrs:C[position() &lt; $totalColumn and position() = /*/wrs:Header/wrs:Columns/wrs:C[substring-after(@id,'|')=$id]/@pos]">
                    <chart:Value><xsl:value-of select="."/></chart:Value>
                  </xsl:for-each>
                </chart:YData>
              </chart:Series>
            </xsl:for-each>
          </xsl:when>
          <xsl:otherwise>
            <xsl:for-each select="wrs:Header/wrs:Columns/wrs:C[not(contains(@id,'&#xE0F0;1')) and @unit = $units[1]/@unit and generate-id(.) = generate-id(key('headerColsIdSecondPart', substring-after(@id,'|')))]">
            <xsl:variable name="id" select="substring-after(@id, '|')"/>
              <chart:Series caption="{substring-after(current()/@caption, '|')}" yAxis1Or2="1">
                <xsl:copy-of select="$chartPreSettings/*/chart:Series/*[not(@yAxis1Or2) or @yAxis1Or2='1']/@*"/>
                <chart:YData>
                  <xsl:for-each select="/*/wrs:Data/wrs:R/wrs:C[position() &lt; $totalColumn and position() = /*/wrs:Header/wrs:Columns/wrs:C[substring-after(@id, '|')=$id]/@pos]">
                    <chart:Value><xsl:value-of select="."/></chart:Value>
                  </xsl:for-each>
                </chart:YData>
              </chart:Series>
            </xsl:for-each>
          </xsl:otherwise>
        </xsl:choose>
        <xsl:if test="$unitCount &gt; 1 and not($forceAxisY1 != '' and $forceAxisY2 != '')">
          <xsl:for-each select="wrs:Header/wrs:Columns/wrs:C[not(contains(@id,'&#xE0F0;1')) and @unit = $units[$unitOffset]/@unit and generate-id(.) = generate-id(key('headerColsIdSecondPart', substring-after(@id,'|')))]">
            <xsl:variable name="id" select="substring-after(@id, '|')"/>
            <chart:Series caption="{substring-after(current()/@caption, '|')}" yAxis1Or2="2">
              <xsl:copy-of select="$chartPreSettings/*/chart:Series/*[@yAxis1Or2='2']/@*"/>
              <chart:YData>
                <xsl:for-each select="/*/wrs:Data/wrs:R/wrs:C[position() &lt; $totalColumn and position() = /*/wrs:Header/wrs:Columns/wrs:C[substring-after(@id, '|')=$id]/@pos]">
                  <chart:Value><xsl:value-of select="."/></chart:Value>
                </xsl:for-each>
              </chart:YData>
            </chart:Series>
          </xsl:for-each>
        </xsl:if>

      </chart:Series>

      <chart:SeriesColors>
        <xsl:choose>
          <xsl:when test="$forceAxisY1 != '' and $forceAxisY2 != ''">
            <xsl:for-each select="wrs:Header/wrs:Columns/wrs:C[not(contains(@id,'&#xE0F0;1')) and generate-id(.) = generate-id(key('headerColsIdSecondPart', substring-after(@id,'|')))]">
              <xsl:variable name="id" select="substring-after(@id, '|')"/>
              <xsl:variable name="yForce" select="$cubeConfig//dm:Measures/dm:Measure[@id=$id]/@yAxis"/>
              <chart:Color><xsl:call-template name="colorLookup"><xsl:with-param name="measureId" select="$id"/></xsl:call-template></chart:Color>
            </xsl:for-each>
          </xsl:when>
          <xsl:when test="$gotEmptyUnits">
            <xsl:for-each select="wrs:Header/wrs:Columns/wrs:C[not(contains(@id,'&#xE0F0;1')) and not(@unit) and generate-id(.) = generate-id(key('headerColsIdSecondPart', substring-after(@id,'|')))]">
              <xsl:variable name="id" select="substring-after(@id, '|')"/>
              <chart:Color><xsl:call-template name="colorLookup"><xsl:with-param name="measureId" select="$id"/></xsl:call-template></chart:Color>
            </xsl:for-each>
          </xsl:when>
          <xsl:otherwise>
            <xsl:for-each select="wrs:Header/wrs:Columns/wrs:C[not(contains(@id,'&#xE0F0;1')) and @unit = $units[1]/@unit and generate-id(.) = generate-id(key('headerColsIdSecondPart', substring-after(@id,'|')))]">
              <xsl:variable name="id" select="substring-after(@id, '|')"/>
              <chart:Color><xsl:call-template name="colorLookup"><xsl:with-param name="measureId" select="$id"/></xsl:call-template></chart:Color>
            </xsl:for-each>
          </xsl:otherwise>
        </xsl:choose>
        <xsl:if test="$unitCount &gt; 1 and not($forceAxisY1 != '' and $forceAxisY2 != '')">
          <xsl:for-each select="wrs:Header/wrs:Columns/wrs:C[not(contains(@id,'&#xE0F0;1')) and @unit = $units[$unitOffset]/@unit and generate-id(.) = generate-id(key('headerColsIdSecondPart', substring-after(@id,'|')))]">
              <xsl:variable name="id" select="substring-after(@id, '|')"/>
            <chart:Color><xsl:call-template name="colorLookup"><xsl:with-param name="measureId" select="$id"/></xsl:call-template></chart:Color>
          </xsl:for-each>
        </xsl:if>
      </chart:SeriesColors>


      <xsl:copy-of select="$chartPreSettings/*/chart:Stacked"/>
      <xsl:copy-of select="$chartPreSettings/*/chart:SeriesColors"/>
      <xsl:copy-of select="$chartPreSettings/*/chart:EChartOptions"/>

  </xsl:template>

  <!--

    One measure and two row dims, no col dims

   -->
  <xsl:template match="/wrs:Wrs[count(wrs:Header/wrs:Columns/wrs:C[@dimId]) = 2 and string-length(wrs:Header/wrs:Columns/@colDimLevelIds) = 0]">
    <xsl:if test="count($valueIds)=1">

      <chart:XAxis caption="{wrs:Header/wrs:Columns/wrs:C[@dimId]/@caption}">
        <xsl:copy-of select="$chartPreSettings/*/chart:XAxis/@*"/>
        <xsl:element name="{$xValueType}" namespace="http://www.businesscode.de/schema/bcdui/charts-1.0.0">
          <xsl:if test="$xValueTypeAttr">
            <xsl:attribute name="type"><xsl:value-of select="$xValueTypeAttr"/></xsl:attribute>
          </xsl:if>
          <xsl:for-each select="/*/wrs:Data/wrs:R[not(wrs:C[@bcdGr=1])]/wrs:C[generate-id(.) = generate-id(key('rowDimensionCell', .)) and position()=1]">
            <chart:Value><xsl:value-of select="."/></chart:Value>
          </xsl:for-each>
        </xsl:element>
      </chart:XAxis>

      <chart:YAxis1 unit="{wrs:Header/wrs:Columns/wrs:C[@valueId]/@unit}" caption="{wrs:Header/wrs:Columns/wrs:C[@valueId]/@caption}">
        <xsl:copy-of select="$chartPreSettings/*/chart:YAxis1/@*"/>
      </chart:YAxis1>

      <chart:Series>
        <xsl:for-each select="/*/wrs:Data/wrs:R[not(wrs:C[@bcdGr=1])]/wrs:C[generate-id(.) = generate-id(key('rowDimensionCell', .)) and position()=2]">
          <xsl:variable name="dim2" select="."/>
          <chart:Series yAxis1Or2="1" caption="{@caption | .}">
            <xsl:copy-of select="$chartPreSettings/*/chart:Series/*[not(@yAxis1Or2) or @yAxis1Or2='1']/@*"/>
            <chart:YData>
              <xsl:for-each select="/*/wrs:Data/wrs:R[not(wrs:C[@bcdGr=1])]/wrs:C[generate-id(.) = generate-id(key('rowDimensionCell', .)) and position()=1]">
                <xsl:variable name="dim1" select="."/>
                <chart:Value>
                  <xsl:value-of select="/*/wrs:Data/wrs:R[wrs:C[1]=$dim1 and wrs:C[2]=$dim2]/wrs:C[3]"/>
                </chart:Value>
              </xsl:for-each>
            </chart:YData>
          </chart:Series>
        </xsl:for-each>
      </chart:Series>

      <xsl:copy-of select="$chartPreSettings/*/chart:Stacked"/>
      <xsl:copy-of select="$chartPreSettings/*/chart:SeriesColors"/>
      <xsl:copy-of select="$chartPreSettings/*/chart:EChartOptions"/>

    </xsl:if>
  </xsl:template>

  <!--

    One measure and two col dims, no row dims

   -->
  <xsl:template match="/wrs:Wrs[count(wrs:Header/wrs:Columns/wrs:C[@dimId]) = 0 and string-length(wrs:Header/wrs:Columns/@colDimLevelIds) > 0 and string-length(substring-after(wrs:Header/wrs:Columns/@colDimLevelIds, '|')) > 0 and string-length(substring-after(substring-after(wrs:Header/wrs:Columns/@colDimLevelIds, '|'), '|')) = 0]">
    <xsl:if test="count($valueIds)=1">

        <chart:XAxis caption="{substring-before(wrs:Header/wrs:Columns/@colDimLevelCaptions, '|')}">
          <xsl:copy-of select="$chartPreSettings/*/chart:XAxis/@*"/>
          <chart:Categories>
            <xsl:for-each select="/*/wrs:Header/wrs:Columns/wrs:C[not(contains(@id,'&#xE0F0;1')) and generate-id(.) = generate-id(key('headerColsIdFirstPart', substring-before(@id,'|')))]">
              <chart:Value><xsl:value-of select="substring-before(@caption,'|')"/></chart:Value>
            </xsl:for-each>
          </chart:Categories>
        </chart:XAxis>

        <chart:YAxis1 unit="{wrs:Header/wrs:Columns/wrs:C[@valueId]/@unit}" caption="{wrs:Header/wrs:Columns/wrs:C[@valueId]/@caption}">
          <xsl:copy-of select="$chartPreSettings/*/chart:YAxis1/@*"/>
        </chart:YAxis1>

        <chart:Series>
          <xsl:for-each select="/*/wrs:Header/wrs:Columns/wrs:C[not(contains(@id,'&#xE0F0;1')) and generate-id(.) = generate-id(key('headerColsIdSecondPart', substring-after(@id,'|')))]">
            <xsl:variable name="dim2" select="substring-before(substring-after(@id, '|'), '|')"/>
            <chart:Series yAxis1Or2="1" caption="{substring-before(substring-after(@caption, '|'), '|')}">
              <xsl:copy-of select="$chartPreSettings/*/chart:Series/*[not(@yAxis1Or2) or @yAxis1Or2='1']/@*"/>
              <chart:YData>
                <xsl:for-each select="/*/wrs:Header/wrs:Columns/wrs:C[not(contains(@id,'&#xE0F0;1')) and generate-id(.) = generate-id(key('headerColsIdFirstPart', substring-before(@id,'|')))]">
                  <xsl:variable name="dim1" select="substring-before(@id, '|')"/>
                  <xsl:variable name="pos" select="/*/wrs:Header/wrs:Columns/wrs:C[starts-with(@id, concat($dim1, '|', $dim2, '|'))]/@pos"/>
                  <chart:Value>
                     <xsl:value-of select="/*/wrs:Data/wrs:R/wrs:C[position()=$pos]"/>
                  </chart:Value>
                </xsl:for-each>
              </chart:YData>
            </chart:Series>
          </xsl:for-each>
        </chart:Series>

        <xsl:copy-of select="$chartPreSettings/*/chart:Stacked"/>
        <xsl:copy-of select="$chartPreSettings/*/chart:SeriesColors"/>
        <xsl:copy-of select="$chartPreSettings/*/chart:EChartOptions"/>

    </xsl:if>
  </xsl:template>
  
  <!--
    Only measures, no dims, only one unit
   -->
   <xsl:template match="/wrs:Wrs[count(wrs:Header/wrs:Columns/wrs:C[@dimId]) = 0 and string-length(wrs:Header/wrs:Columns/@colDimLevelIds) = 0]">
   
     <chart:XAxis caption="{wrs:Header/wrs:Columns/@caption}">
       <xsl:copy-of select="$chartPreSettings/*/chart:XAxis/@*"/>
       <chart:Categories>
         <xsl:for-each select="/*/wrs:Header/wrs:Columns/wrs:C/@caption">
           <chart:Value><xsl:value-of select="."/></chart:Value>
         </xsl:for-each>
       </chart:Categories>
     </chart:XAxis>

      <chart:YAxis1 unit="{$unit1}" caption="{$mesCaptionUnit1}">
        <xsl:copy-of select="$chartPreSettings/*/chart:YAxis1/@*"/>
      </chart:YAxis1>

      <xsl:if test="$chartPreSettings/*/chart:YAxis2 or $unitCount &gt; 1 or $forceAxisY2 != ''">
        <chart:YAxis2 unit="{$unit2}" caption="{$mesCaptionUnit2}">
          <xsl:copy-of select="$chartPreSettings/*/chart:YAxis2/@*"/>
        </chart:YAxis2>
      </xsl:if>

      <chart:Series>
        <xsl:choose>
          <xsl:when test="$forceAxisY1 != '' and $forceAxisY2 != ''">
            <xsl:for-each select="wrs:Header/wrs:Columns/wrs:C[not(contains(@id,'&#xE0F0;1')) and generate-id(.) = generate-id(key('headerValueId', @id))]">
              <xsl:variable name="id" select="@id"/>
              <xsl:variable name="yForce" select="$cubeConfig//dm:Measures/dm:Measure[@id=$id]/@yAxis"/>
              <chart:Series caption="{current()/@caption}" yAxis1Or2="{$yForce}">
                <xsl:copy-of select="$chartPreSettings/*/chart:Series/chart:Series[position()=$yForce]/@*"/>
                <chart:YData>
                  <xsl:for-each select="/*/wrs:Data/wrs:R/wrs:C[position() and position() = /*/wrs:Header/wrs:Columns/wrs:C[@id=$id]/@pos]">
                    <chart:Value><xsl:value-of select="."/></chart:Value>
                  </xsl:for-each>
                </chart:YData>
              </chart:Series>
            </xsl:for-each>
          </xsl:when>
          <xsl:when test="$gotEmptyUnits">
            <xsl:for-each select="wrs:Header/wrs:Columns/wrs:C[not(contains(@id,'&#xE0F0;1')) and not(@unit) and generate-id(.) = generate-id(key('headerValueId', @id))]">
              <xsl:variable name="id" select="@id"/>
              <chart:Series caption="{current()/@caption}" yAxis1Or2="1">
                <xsl:copy-of select="$chartPreSettings/*/chart:Series/*[not(@yAxis1Or2) or @yAxis1Or2='1']/@*"/>
                <chart:YData>
                  <xsl:for-each select="/*/wrs:Data/wrs:R/wrs:C[position() and position() = /*/wrs:Header/wrs:Columns/wrs:C[@id=$id]/@pos]">
                    <chart:Value><xsl:value-of select="."/></chart:Value>
                  </xsl:for-each>
                </chart:YData>
              </chart:Series>
            </xsl:for-each>
          </xsl:when>
          <xsl:otherwise>
            <xsl:for-each select="wrs:Header/wrs:Columns/wrs:C[not(contains(@id,'&#xE0F0;1')) and @unit = $units[1]/@unit and generate-id(.) = generate-id(key('headerValueId', @id))]">
              <xsl:variable name="id" select="@id"/>
              <chart:Series caption="{current()/@caption}" yAxis1Or2="1">
                <xsl:copy-of select="$chartPreSettings/*/chart:Series/*[not(@yAxis1Or2) or @yAxis1Or2='1']/@*"/>
                <chart:YData>
                  <xsl:for-each select="/*/wrs:Data/wrs:R/wrs:C[position() and position() = /*/wrs:Header/wrs:Columns/wrs:C[@id=$id]/@pos]">
                    <chart:Value><xsl:value-of select="."/></chart:Value>
                  </xsl:for-each>
                </chart:YData>
              </chart:Series>
            </xsl:for-each>
          </xsl:otherwise>
        </xsl:choose>
        <xsl:if test="$unitCount &gt; 1 and not($forceAxisY1 != '' and $forceAxisY2 != '')">
          <xsl:for-each select="wrs:Header/wrs:Columns/wrs:C[not(contains(@id,'&#xE0F0;1')) and @unit = $units[$unitOffset]/@unit and generate-id(.) = generate-id(key('headerValueId', @id))]">
            <xsl:variable name="id" select="@id"/>
            <chart:Series caption="{current()/@caption}" yAxis1Or2="2">
              <xsl:copy-of select="$chartPreSettings/*/chart:Series/*[@yAxis1Or2='2']/@*"/>
              <chart:YData>
                <xsl:for-each select="/*/wrs:Data/wrs:R/wrs:C[position() and position() = /*/wrs:Header/wrs:Columns/wrs:C[@id=$id]/@pos]">
                  <chart:Value><xsl:value-of select="."/></chart:Value>
                </xsl:for-each>
              </chart:YData>
            </chart:Series>
          </xsl:for-each>
        </xsl:if>

      </chart:Series>

      <chart:SeriesColors>
        <xsl:choose>
          <xsl:when test="$forceAxisY1 != '' and $forceAxisY2 != ''">
            <xsl:for-each select="wrs:Header/wrs:Columns/wrs:C[not(contains(@id,'&#xE0F0;1')) and generate-id(.) = generate-id(key('headerValueId', @id))]">
              <xsl:variable name="id" select="@id"/>
              <xsl:variable name="yForce" select="$cubeConfig//dm:Measures/dm:Measure[@id=$id]/@yAxis"/>
              <chart:Color><xsl:call-template name="colorLookup"><xsl:with-param name="measureId" select="$id"/></xsl:call-template></chart:Color>
            </xsl:for-each>
          </xsl:when>
          <xsl:when test="$gotEmptyUnits">
            <xsl:for-each select="wrs:Header/wrs:Columns/wrs:C[not(contains(@id,'&#xE0F0;1')) and not(@unit) and generate-id(.) = generate-id(key('headerValueId', @id))]">
              <xsl:variable name="id" select="@id"/>
              <chart:Color><xsl:call-template name="colorLookup"><xsl:with-param name="measureId" select="$id"/></xsl:call-template></chart:Color>
            </xsl:for-each>
          </xsl:when>
          <xsl:otherwise>
            <xsl:for-each select="wrs:Header/wrs:Columns/wrs:C[not(contains(@id,'&#xE0F0;1')) and @unit = $units[1]/@unit and generate-id(.) = generate-id(key('headerValueId', @id))]">
              <xsl:variable name="id" select="@id"/>
              <chart:Color><xsl:call-template name="colorLookup"><xsl:with-param name="measureId" select="$id"/></xsl:call-template></chart:Color>
            </xsl:for-each>
          </xsl:otherwise>
        </xsl:choose>
        <xsl:if test="$unitCount &gt; 1 and not($forceAxisY1 != '' and $forceAxisY2 != '')">
          <xsl:for-each select="wrs:Header/wrs:Columns/wrs:C[not(contains(@id,'&#xE0F0;1')) and @unit = $units[$unitOffset]/@unit and generate-id(.) = generate-id(key('headerValueId', @id))]">
            <xsl:variable name="id" select="@id"/>
            <chart:Color><xsl:call-template name="colorLookup"><xsl:with-param name="measureId" select="$id"/></xsl:call-template></chart:Color>
          </xsl:for-each>
        </xsl:if>
      </chart:SeriesColors>

       <xsl:copy-of select="$chartPreSettings/*/chart:Stacked"/>
       <xsl:copy-of select="$chartPreSettings/*/chart:SeriesColors"/>
       <xsl:copy-of select="$chartPreSettings/*/chart:EChartOptions"/>

  </xsl:template>

</xsl:stylesheet>