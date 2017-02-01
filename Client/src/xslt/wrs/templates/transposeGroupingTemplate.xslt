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
  xmlns="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:generator="urn(bcd-xsltGenerator)">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>
  <!-- (NodeSet) As parameter or as default or specific parameter set from parameter model-->
  <xsl:param name="paramSet" select="$paramModel//xp:TransposeGrouping[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>

  <!--
    (Integer) The number of columns in the grouping. The grouping columns must be
    the first columns in the wrs. All other columns are considered to be data/value
    columns.
   -->
  <xsl:param name="groupingColumnCount" select="$paramSet/xp:GroupingColumnCount"/>

  <!--
    (Integer) The (1-based) index of the column to be transposed. This column must be
    a grouping column so the value must be less or equal to $groupingColumnCount.
   -->
  <xsl:param name="transposedColumnNo" select="$paramSet/xp:TransposedColumnNo"/>

  <xsl:variable name="numGroupingColumnCount" select="number($groupingColumnCount)"/>
  <xsl:variable name="numTransposedColumnNo" select="number($transposedColumnNo)"/>

  <!-- Generates transposeKey, dimensionKey  -->
  <generator:Keys/>

  <xsl:variable name="transposeColumnValues" select="/*/wrs:Data/wrs:R[generate-id() = generate-id(key('transposeKey', wrs:C[$numTransposedColumnNo]))]/wrs:C[$numTransposedColumnNo]"/>

  <xsl:variable name="emptyBlock">
    <xsl:for-each select="/*/wrs:Data/*[1]/wrs:C[position() > $numGroupingColumnCount]">
      <C><null/></C>
    </xsl:for-each>
  </xsl:variable>

  <xsl:template match="node()|@*">
    <xsl:copy><xsl:apply-templates select="node()|@*"/></xsl:copy>
  </xsl:template>

  <xsl:template match="wrs:Data">
    <xsl:copy>
      <xsl:apply-templates select="@*"/>
      <generator:ForEach select="wrs:R[generate-id(.) = generate-id(key('dimensionKey', __DIMENSION_KEY__ ))]">
        <xsl:variable name="currentCells" select="wrs:C"/>
        <xsl:copy>
          <xsl:apply-templates select="@*"/>
          <xsl:apply-templates select="wrs:C[position() &lt;= $numGroupingColumnCount and position() != $numTransposedColumnNo]"/>
          <xsl:for-each select="$transposeColumnValues">
            <xsl:sort select="."/>
            <generator:DataRowVariable/>
            <xsl:choose>
              <xsl:when test="$dataRow"><xsl:apply-templates select="$dataRow/wrs:C[position() > $numGroupingColumnCount]"/></xsl:when>
              <xsl:otherwise><xsl:copy-of select="$emptyBlock"/></xsl:otherwise>
            </xsl:choose>
          </xsl:for-each>
        </xsl:copy>
      </generator:ForEach>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="wrs:Columns">
    <xsl:copy>
      <xsl:apply-templates select="@*"/>

      <!-- Add prefix for caption to non-removed grouping so that it fits better into
           the standard cube naming scheme. -->
      <xsl:for-each select="wrs:C[position() &lt;= $numGroupingColumnCount and position() != $numTransposedColumnNo]">
        <xsl:copy>
          <xsl:apply-templates select="@*"/>
          <xsl:attribute name="caption">
            <xsl:choose>
              <xsl:when test="@caption">
                <xsl:value-of select="concat(@caption, '|', @caption)"/>
              </xsl:when>
              <xsl:otherwise>
                <xsl:value-of select="concat(@id, '|', @id)"/>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:attribute>
          <xsl:copy-of select="wrs:A"/>
        </xsl:copy>
      </xsl:for-each>

      <xsl:variable name="headerCols" select="wrs:C[position() > $numGroupingColumnCount]"/>
      <xsl:variable name="headerColCount" select="count($headerCols)"/>
      <xsl:for-each select="$transposeColumnValues">
        <xsl:sort select="."/>
        <xsl:variable name="prefix" select="."/>
        <xsl:variable name="offset" select="(position() - 1) * $headerColCount + $numGroupingColumnCount - 1"/>
        <xsl:for-each select="$headerCols">
          <xsl:copy>
            <xsl:apply-templates select="@*"/>
            <xsl:attribute name="pos"><xsl:value-of select="$offset + position()"/></xsl:attribute>
            <xsl:attribute name="id"><xsl:value-of select="concat($prefix, '.', @id)"/></xsl:attribute>
            <xsl:attribute name="caption">
              <xsl:choose>
                <xsl:when test="@caption">
                  <xsl:value-of select="concat($prefix, '|', @caption)"/>
                </xsl:when>
                <xsl:otherwise>
                  <xsl:value-of select="concat($prefix, '|', @id)"/>
                </xsl:otherwise>
              </xsl:choose>
            </xsl:attribute>
          </xsl:copy>
        </xsl:for-each>
      </xsl:for-each>
    </xsl:copy>
  </xsl:template>
</xsl:stylesheet>
