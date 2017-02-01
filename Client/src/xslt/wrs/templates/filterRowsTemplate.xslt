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
  xmlns:guiStatus="http://www.businesscode.de/schema/bcdui/guiStatus-1.0.0"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:generator="urn(bcd-xsltGenerator)"
>
  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" />

  <xsl:param name="guiStatus"/>

  <generator:Keys />

  <generator:filters />

  <xsl:key name="getHeaderColById" match="/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C" use="@id"/>
  <xsl:key name="columnsWithCaptionValueReferences" match="/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[wrs:References/wrs:Wrs/wrs:Header/wrs:Columns/wrs:C[2]]" use="@pos"/>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    check if we have something do to here, we return NOP in case:
      $filters is empty node-set (variable is generated in outer XSLT)
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="/">
    <xsl:choose>
      <xsl:when test="count($filters/*[text() != '']) &gt; 0">
        <xsl:apply-templates/>
      </xsl:when>
      <xsl:otherwise>
        <bcdxml:XsltNop/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="node()|@*">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>
    </xsl:copy>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="/wrs:Wrs/wrs:Data/*">
    <xsl:variable name="row" select="."/>
    <xsl:variable name="validationRes"><!-- contains validation result of all filters -->
      <xsl:for-each select="$filters/*[text() != '']"><!-- loop over all filters -->
        <xsl:variable name="bRef" select="@bRef"/>
        <xsl:variable name="fValue" select="translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')"/>

        <xsl:for-each select="$row/../../../*"><!-- Wrs -->
          <xsl:variable name="wrsPos"><xsl:value-of select="key('getHeaderColById',$bRef)/@pos"/></xsl:variable>

          <xsl:variable name="value" select="$row/wrs:C[number($wrsPos)][not(null)]"/>
          <xsl:variable name="comparableValue">
            <xsl:choose>
              <xsl:when test="key('columnsWithCaptionValueReferences', $wrsPos)">
                <xsl:variable name="lookupValue" select="key(concat('captionLookupForCol', $wrsPos), $value)/wrs:C[1]"/>
                <xsl:choose>
                  <xsl:when test="$lookupValue"><xsl:copy-of select="$lookupValue/node()"/></xsl:when>
                  <xsl:otherwise><xsl:value-of select="$value"/></xsl:otherwise>
                </xsl:choose>
              </xsl:when>
              <xsl:when test="$value = ''"></xsl:when>
              <xsl:otherwise><xsl:value-of select="$value"/></xsl:otherwise>
            </xsl:choose>
          </xsl:variable>

          <xsl:choose>
            <xsl:when test="not(contains(
              translate($comparableValue, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')
              ,$fValue))">f</xsl:when>
          </xsl:choose>
        </xsl:for-each>
      </xsl:for-each>
    </xsl:variable>
    <xsl:choose>
      <xsl:when test="contains($validationRes, 'f')"></xsl:when>
      <xsl:otherwise>
        <xsl:copy>
          <xsl:apply-templates select="node()|@*"/>
        </xsl:copy>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

</xsl:stylesheet>
