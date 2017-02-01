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
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:generator="urn(bcd-xsltGenerator)"
  >

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" media-type="text/xslt"/>

  <xsl:param name="guiStatus"/>
  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>

  <!-- (String?) XPath where are the filter values, like $guiStatus/*/guiStatus:ClientSettings/Grid[@id='myGrid']/Filter -->
  <xsl:param name="filtersXpath" select="$paramModel//xp:FilterXPath[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]/xp:Value"/>

  <xsl:variable name="filterTemplate" select="document('templates/filterRowsTemplate.xslt')"></xsl:variable>

  <xsl:variable name="columnsWithCaptionValueReferences" select="/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[wrs:References/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[2]]"/>


  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    check if we have something do to here, we return NOP in case:
    xp:FilterXPath is not defined
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="/">
    <xsl:choose>
      <xsl:when test="concat($filtersXpath,'')=''">
        <bcdxml:XsltNop/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:apply-templates select="$filterTemplate/*" mode="generateXSLT"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>


  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="node()|@*" mode="generateXSLT">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*" mode="generateXSLT"/>
    </xsl:copy>
  </xsl:template>


  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="generator:Keys" mode="generateXSLT">
    <xsl:comment>Generated Keys</xsl:comment>
    <xsl:for-each select="$columnsWithCaptionValueReferences">
      <xsl:element name="key" namespace="http://www.w3.org/1999/XSL/Transform">
        <xsl:attribute name="name">valueLookupForCol<xsl:value-of select="@pos"/></xsl:attribute>
        <xsl:attribute name="match">/wrs:*/wrs:Header/wrs:Columns/wrs:C[<xsl:value-of select="@pos"/>]/wrs:References/wrs:Wrs/wrs:Data/wrs:*/wrs:C[2]</xsl:attribute><!-- code -->
        <xsl:attribute name="use">preceding-sibling::wrs:C[1]</xsl:attribute><!-- caption -->
      </xsl:element>

      <xsl:element name="key" namespace="http://www.w3.org/1999/XSL/Transform">
        <xsl:attribute name="name">captionLookupForCol<xsl:value-of select="@pos"/></xsl:attribute>
        <xsl:attribute name="match">/wrs:*/wrs:Header/wrs:Columns/wrs:C[<xsl:value-of select="@pos"/>]/wrs:References/wrs:Wrs/wrs:Data/wrs:*</xsl:attribute>
        <xsl:attribute name="use">wrs:C[2]</xsl:attribute><!-- code -->
      </xsl:element>
    </xsl:for-each>
  </xsl:template>


  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="generator:filters" mode="generateXSLT">
    <xsl:comment>Generated filters XPath</xsl:comment>
    <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
      <xsl:attribute name="name">filters</xsl:attribute>
      <xsl:attribute name="select">
        <xsl:choose>
          <xsl:when test="string-length($filtersXpath) > 0"><xsl:value-of select="$filtersXpath"/></xsl:when>
          <xsl:otherwise>/*[1=0]</xsl:otherwise>
        </xsl:choose>
      </xsl:attribute>
    </xsl:element>
  </xsl:template>

</xsl:stylesheet>
