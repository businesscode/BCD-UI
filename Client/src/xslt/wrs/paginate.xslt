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
  xmlns:bcdxml="http://www.businesscode.de/schema/bcdui/bcdxml-1.0.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0">

  <!--
    Drop rows of input WRS, see xp:Paginate
    -->

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" />

  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>
  <!-- (NodeSet) As parameter or as default or specific parameter set from parameter model-->
  <xsl:param name="paramSet" select="$paramModel//xp:Paginate[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>

  <!-- Individual parameters -->
  <!-- (Integer) size of one page and
       (Integer) number of page to be kept (starting at 1) -->
  <xsl:param name="pageSize"   select="$paramSet/xp:PageSize"/>
  <xsl:param name="pageNumber">
    <xsl:choose>
      <xsl:when test="$paramSet/xp:PageNumber"><xsl:value-of select="$paramSet/xp:PageNumber"/></xsl:when>
      <xsl:otherwise>1</xsl:otherwise>
    </xsl:choose>
  </xsl:param>
  <xsl:param name="addRowCounter" select="translate($paramSet/xp:AddRowCounter,'0false','')"/>
  
  <xsl:variable name="impl.addRowCounter" select="boolean($addRowCounter)"/>
  <xsl:variable name="impl.pageNumber" select="normalize-space($pageNumber)"/>

  <xsl:variable name="y2">
    <xsl:choose>
      <xsl:when test="$impl.pageNumber = 'all'"><xsl:value-of select="count(/wrs:Wrs/wrs:Data/wrs:*)"/></xsl:when>
      <xsl:otherwise><xsl:value-of select="number($pageSize) * number($impl.pageNumber)"/></xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:variable name="y1">
   <xsl:choose>
      <xsl:when test="$impl.pageNumber = 'all'">1</xsl:when>
      <xsl:otherwise><xsl:value-of select="number($y2) - number($pageSize) + 1"/></xsl:otherwise>
    </xsl:choose>
  </xsl:variable>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
       check there is something to do
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="/">
    <xsl:choose>
      <!-- if one of params is NaN then we skip processing -->
      <xsl:when test="$y2 + $y1 != $y2 + $y1">
        <bcdxml:XsltNop/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:apply-templates/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
       recursive copy
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="node()|@*">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>
    </xsl:copy>
  </xsl:template>

  <!-- rewrite if row counter requested -->
  <xsl:template match="/wrs:Wrs/wrs:Header/wrs:Columns">
    <xsl:choose>
      <xsl:when test="$impl.addRowCounter"><!-- add row counter, rewrite @pos on wrs:C -->
        <xsl:copy>
          <xsl:copy-of select="@*|*[not(self::wrs:C)]"/>
          <wrs:C pos="1" id="bcd_Report_RowCounterCaption" type-name="NUMERIC" caption="&#xE0FF;bcd_Report_RowCounterCaption"/>
          <xsl:for-each select="wrs:C">
            <xsl:copy>
              <xsl:attribute name="pos" select="position() + 1"/>
              <xsl:copy-of select="@*[not(name() = 'pos')]|*"/>
            </xsl:copy>
          </xsl:for-each>
        </xsl:copy>
      </xsl:when>
      <xsl:otherwise><!-- clone, as-is -->
        <xsl:copy-of select="."/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
       filter rows
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="/wrs:Wrs/wrs:Data">
    <xsl:copy>
      <xsl:copy-of select="@*"/>
      <xsl:choose>
        <xsl:when test="$impl.addRowCounter">
          <xsl:apply-templates select="*[position() >= $y1 and $y2 >= position()]" mode="addRowCounter"/>
        </xsl:when>
        <xsl:otherwise>
          <xsl:copy-of select="*[position() >= $y1 and $y2 >= position()]"/>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:copy>
  </xsl:template>

  <!-- row with row counter -->
  <xsl:template match="wrs:*" mode="addRowCounter">
    <xsl:variable name="rowCount" select="position() + $y1 - 1"/>
    <xsl:copy>
      <xsl:copy-of select="@*"/>
      <xsl:choose>
        <xsl:when test="self::wrs:M">
          <wrs:C><xsl:value-of select="$rowCount"/></wrs:C>
          <wrs:O><xsl:value-of select="$rowCount"/></wrs:O>
        </xsl:when>
        <xsl:otherwise>
          <wrs:C><xsl:value-of select="$rowCount"/></wrs:C>
        </xsl:otherwise>
      </xsl:choose>
      <xsl:copy-of select="*"/>
    </xsl:copy>
  </xsl:template>

</xsl:stylesheet>
