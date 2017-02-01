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
  xmlns:generator="urn(bcd-xsltGenerator)"
>
  <xsl:import href="include/rowRangeParams.xslt"/>
  <xsl:import href="include/colRangeParams.xslt"/>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" />

  <xsl:param name="columnSeparator"/>
  <xsl:param name="rowSeparator"/>

  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>

  <xsl:variable name="paramSet" select="$paramModel//xp:Copy[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>

  <generator:Keys/>

  <xsl:template match="/">
    <Data>
      <xsl:for-each select="/wrs:Wrs/wrs:Data/wrs:*[position() >= $y1 and position() &lt;= $y2]">
        <xsl:if test="position() > 1">
          <xsl:value-of select="$rowSeparator"/>
        </xsl:if>
        <xsl:apply-templates select="."/>
      </xsl:for-each>
    </Data>
  </xsl:template>

  <xsl:template match="wrs:Data/wrs:*">
    <xsl:for-each select="wrs:C[position() >= $x1 and position() &lt;= $x2]">
      <xsl:if test="position() > 1">
        <xsl:value-of select="$columnSeparator"/>
      </xsl:if>
      <xsl:apply-templates select="."/>
    </xsl:for-each>
  </xsl:template>

  <xsl:template match="wrs:C">
    <xsl:value-of select="."/>
  </xsl:template>

  <generator:wrs-C-WithReferencesTemplate>
    <xsl:choose>
      <xsl:when test="$value"><xsl:value-of select="$value"/></xsl:when>
      <xsl:otherwise><xsl:value-of select="."/></xsl:otherwise>
    </xsl:choose>
  </generator:wrs-C-WithReferencesTemplate>

</xsl:stylesheet>
