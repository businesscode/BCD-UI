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
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:xi="http://www.w3.org/2001/XInclude"
  xmlns:generator="urn(bcd-xsltGenerator)">
  <!--
    This template copies a rectangular selection (colStartPos,rowStartPos)-(colEndPos,rowEndPos) from a wrs
    document and creates a CSV text from it. The output of the stylesheet is
    an XML document with a root node <Data>...</Data> containing the CSV data
    as text.
   -->

  <xsl:import href="include/rowRangeParams.xslt"/>
  <xsl:import href="include/colRangeParams.xslt"/>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" media-type="text/xslt"/>

  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>

  <xsl:variable name="paramSet" select="$paramModel//xp:Copy[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>

  <!--
    (String) The character separating each column (usually TAB for CSV).
   -->
  <xsl:param name="columnSeparator" select="$paramSet/xp:ColumnSeparator"/>

  <!--
    (String) The character delimiting each row (usually ENTER for CSV).
   -->
  <xsl:param name="rowSeparator" select="$paramSet/xp:RowSeparator"/>

  <xsl:variable name="copyTemplate" select="document('templates/copyTemplate.xslt')"/>
  <xsl:variable name="columnsWithCaptionValueReferences" select="/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[$x2 >= @pos and @pos >= $x1 and wrs:References/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[2]]"/>

  <xsl:template match="/">
    <xsl:apply-templates select="$copyTemplate/*" mode="generateXSLT"/>
  </xsl:template>

  <xsl:template match="generator:wrs-C-WithReferencesTemplate" mode="generateXSLT">
    <xsl:variable name="body" select="*"/>
    <xsl:for-each select="$columnsWithCaptionValueReferences">
      <xsl:element name="template" namespace="http://www.w3.org/1999/XSL/Transform">
        <xsl:attribute name="match">wrs:C[<xsl:value-of select="@pos"/>]</xsl:attribute>
        <xsl:element name="variable" namespace="http://www.w3.org/1999/XSL/Transform">
          <xsl:attribute name="name">value</xsl:attribute>
          <xsl:attribute name="select">key('captionLookupForCol<xsl:value-of select="@pos"/>', .)</xsl:attribute>
        </xsl:element>
        <xsl:apply-templates select="$body" mode="generateXSLT"/>
      </xsl:element>
    </xsl:for-each>
  </xsl:template>

  <xsl:template match="generator:Keys" mode="generateXSLT">
    <xsl:comment>Generated Keys</xsl:comment>
    <xsl:for-each select="$columnsWithCaptionValueReferences">
      <xsl:element name="key" namespace="http://www.w3.org/1999/XSL/Transform">
        <xsl:attribute name="name">captionLookupForCol<xsl:value-of select="@pos"/></xsl:attribute>
        <xsl:attribute name="match">/wrs:*/wrs:Header/wrs:Columns/wrs:C[<xsl:value-of select="@pos"/>]/wrs:References/wrs:Wrs/wrs:Data/wrs:*/wrs:C[1]</xsl:attribute>
        <xsl:attribute name="use">following-sibling::wrs:C[1]</xsl:attribute>
      </xsl:element>
    </xsl:for-each>
  </xsl:template>

  <xsl:template match="node()|@*" mode="generateXSLT">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*" mode="generateXSLT"/>
    </xsl:copy>
  </xsl:template>

</xsl:stylesheet>
