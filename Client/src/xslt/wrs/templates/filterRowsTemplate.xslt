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
      <xsl:when test="count($filters/*[@condition='isempty' or @condition='isnotempty' or text() != '' or name(.)='f:Or']) &gt; 0">
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
    
    <!-- either you have a $filters/*[@bRef]/text() to specify a (textnode) filter for given bRef -->
    <!-- or you specify a condition $filters/*[@bRef and @condition='startsWith']/text() to specify a (textnode) filter for given bRef with a filter method selection e.g. starts with -->
    <!-- or you specify a filter list $filters/f:Or[@id]/f:Expression which is used for an unsigned identical match -->

      <xsl:for-each select="$filters/*[@condition='isempty' or @condition='isnotempty' or text() != '' or name(.)='f:Or']"><!-- loop over all filters -->
        <xsl:variable name="bRef">
          <xsl:choose>
            <xsl:when test="name(.)='f:Or'"><xsl:value-of select="@id"/></xsl:when>
            <xsl:otherwise><xsl:value-of select="@bRef"/></xsl:otherwise>
          </xsl:choose>
        </xsl:variable>
        <xsl:variable name="condition" select="@condition"/>
        <xsl:variable name="fValue" select="translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')"/>
        <xsl:variable name="useItemList" select="boolean(name(.)='f:Or')"/>
        <xsl:variable name="itemListCount" select="count(./f:Expression)"/>
        <xsl:variable name="itemListRoot" select="."/>

        <xsl:for-each select="$row/../../../*"><!-- Wrs -->
          <xsl:variable name="wrsPos"><xsl:value-of select="key('getHeaderColById',$bRef)/@pos"/></xsl:variable>

          <xsl:variable name="value">
            <xsl:choose>
              <xsl:when test="$row/wrs:C[number($wrsPos)][not(null)]/@bcdGr='1'">&#xE0F1;</xsl:when> <!-- write special char for a total cell -->
              <xsl:otherwise><xsl:value-of select="$row/wrs:C[number($wrsPos)][not(null)]"/></xsl:otherwise>
            </xsl:choose>
          </xsl:variable>
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

          <xsl:variable name="comparableValueLowValue" select="translate($comparableValue, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz')"/>

          <xsl:choose>
            <xsl:when test="$useItemList and $itemListCount=0"></xsl:when> <!-- no items set, so show all -->
            <xsl:when test="$useItemList">
              <xsl:if test="not($itemListRoot/f:Expression[@op='=' and @bRef=$bRef and boolean(translate(@value, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ&#xE0F0;', 'abcdefghijklmnopqrstuvwxyz')=$comparableValueLowValue)])">f</xsl:if> <!-- beware of the e0f0 to empty replace -->
            </xsl:when>
            <xsl:otherwise>
              <xsl:choose>
                <xsl:when test="$condition='endswith'   and not(substring($comparableValueLowValue, string-length($comparableValueLowValue) - string-length($fValue) + 1) = $fValue)">f</xsl:when>
                <xsl:when test="$condition='isempty'    and $comparableValueLowValue != ''">f</xsl:when>
                <xsl:when test="$condition='isnotempty' and not($comparableValueLowValue != '')">f</xsl:when>
                <xsl:when test="$condition='isequal'    and not($comparableValueLowValue = $fValue)">f</xsl:when>
                <xsl:when test="$condition='isnotequal' and not($comparableValueLowValue != $fValue)">f</xsl:when>
                <xsl:when test="$condition='startswith' and not(starts-with($comparableValueLowValue, $fValue))">f</xsl:when>
                <xsl:when test="$condition='contains'   and not(contains($comparableValueLowValue, $fValue))">f</xsl:when>
                <xsl:when test="not($condition)         and not(contains($comparableValueLowValue, $fValue))">f</xsl:when>
              </xsl:choose>
            </xsl:otherwise>
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
