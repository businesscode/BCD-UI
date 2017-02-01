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
  This stylesheet transposes a single column of a WRS from rows to columns. Therefore
  the WRS must have at least one grouping column and all grouping columns must be the
  first n columns of the WRS.
 -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:generator="urn(bcd-xsltGenerator)">
  <!--
    This stylesheet transposes a single column of a WRS from rows to columns. Therefore
    the WRS must have at least one grouping column and all grouping columns must be the
    first n columns of the WRS.
   -->

  <xsl:import href="../stringUtil.xslt"/>


  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" media-type="text/xslt"/>

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


  <xsl:variable name="groupingColumns" select="/*/wrs:Header/wrs:Columns/wrs:C[number(@pos) &lt;= number($groupingColumnCount)]/@pos"/>
  <xsl:variable name="groupingColumnsWithoutTransposed" select="/*/wrs:Header/wrs:Columns/wrs:C[number(@pos) &lt;= number($groupingColumnCount) and number(@pos) != number($transposedColumnNo)]/@pos"/>

  <xsl:variable name="transposeTemplate" select="document('templates/transposeGroupingTemplate.xslt')"/>

  <xsl:template match="/">
    <xsl:apply-templates select="$transposeTemplate/*" mode="generateXSLT"/>
  </xsl:template>

  <xsl:template match="node()|@*" mode="generateXSLT">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*" mode="generateXSLT"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="generator:Keys" mode="generateXSLT">
    <xsl:element name="key" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">fullKey</xsl:attribute>
      <xsl:attribute name="match">/*/wrs:Data/wrs:*</xsl:attribute>
      <xsl:attribute name="use">
        <xsl:call-template name="constructWrsKeyExpression">
          <xsl:with-param name="columns" select="$groupingColumns"/>
        </xsl:call-template>
      </xsl:attribute>
    </xsl:element>
    <xsl:element name="key" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">transposeKey</xsl:attribute>
      <xsl:attribute name="match">/*/wrs:Data/wrs:*</xsl:attribute>
      <xsl:attribute name="use">wrs:C[<xsl:value-of select="$transposedColumnNo"/>]</xsl:attribute>
    </xsl:element>
    <xsl:if test="$groupingColumnsWithoutTransposed">
      <xsl:element name="key" namespace="http://www.w3.org/1999/XSL/Transform">
        <xsl:attribute name="name">dimensionKey</xsl:attribute>
        <xsl:attribute name="match">/*/wrs:Data/wrs:*</xsl:attribute>
        <xsl:attribute name="use">
          <xsl:call-template name="constructWrsKeyExpression">
            <xsl:with-param name="columns" select="$groupingColumnsWithoutTransposed"/>
          </xsl:call-template>
        </xsl:attribute>
      </xsl:element>
    </xsl:if>
  </xsl:template>

  <xsl:template match="generator:DataRowVariable" mode="generateXSLT">
    <!--            <xsl:variable name="dataRow" select="key('fullKey', concat($prefix, ., $suffix))"/>-->
    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">dataRow</xsl:attribute>
      <xsl:attribute name="select">
        <xsl:text>key('fullKey', </xsl:text>
        <xsl:call-template name="constructWrsKeyExpression">
          <xsl:with-param name="columns" select="$groupingColumns"/>
          <xsl:with-param name="cellVariable">$currentCells</xsl:with-param>
        </xsl:call-template>
        <xsl:text>)</xsl:text>
      </xsl:attribute>
    </xsl:element>
  </xsl:template>

  <xsl:template match="generator:ForEach" mode="generateXSLT">
    <xsl:element name="for-each" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="select">
        <xsl:choose>
          <xsl:when test="$groupingColumnCount > 1">
            <xsl:call-template name="replaceString">
              <xsl:with-param name="str" select="@select"/>
              <xsl:with-param name="find">__DIMENSION_KEY__</xsl:with-param>
              <xsl:with-param name="replacement">
                <xsl:call-template name="constructWrsKeyExpression">
                  <xsl:with-param name="columns" select="$groupingColumnsWithoutTransposed"/>
                </xsl:call-template>
              </xsl:with-param>
            </xsl:call-template>
          </xsl:when>
          <xsl:otherwise>
            <xsl:value-of select="'wrs:R[1]'"/>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:attribute>
      <xsl:apply-templates mode="generateXSLT"/>
    </xsl:element>
  </xsl:template>

  <xsl:template name="constructWrsKeyExpression">
    <xsl:param name="columns"/>
    <xsl:param name="cellVariable" select="''"/>
    <xsl:variable name="separator">, '|', </xsl:variable>
    <xsl:choose>
      <xsl:when test="not($columns)">''</xsl:when>
      <xsl:when test="count($columns) = 1 and $cellVariable"><xsl:value-of select="'.'"/></xsl:when>
      <xsl:when test="count($columns) = 1">wrs:C[<xsl:value-of select="$columns"/>]</xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="'concat('"/>
        <xsl:for-each select="$columns">
          <xsl:if test="position() > 1"><xsl:value-of select="$separator"/></xsl:if>
          <xsl:choose>
            <xsl:when test="$cellVariable and number(.) = $transposedColumnNo">
              <xsl:value-of select="'.'"/>
            </xsl:when>
            <xsl:when test="$cellVariable and number(.) != $transposedColumnNo">
              <xsl:value-of select="concat($cellVariable, '[', ., ']')"/>
            </xsl:when>
            <xsl:otherwise>
              <xsl:value-of select="concat('wrs:C[', ., ']')"/>
            </xsl:otherwise>
          </xsl:choose>
        </xsl:for-each>
        <xsl:value-of select="')'"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

</xsl:stylesheet>