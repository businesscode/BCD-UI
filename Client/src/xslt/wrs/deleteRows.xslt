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
  xmlns:xi="http://www.w3.org/2001/XInclude"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0">
  <!--
    A stylesheet deleting a range of rows from a WRS. This is achieved by either
    creating the appropriate wrs:D elements from wrs:R/wrs:M or deleting wrs:I rows
    directly.
  -->

  <xsl:import href="include/rowRangeParams.xslt"/>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" />

  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>
  <!-- (NodeSet) As parameter or as default or specific parameter set from parameter model-->
  <xsl:param name="paramSet" select="$paramModel//xp:DeleteRows[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>
  <!--
    (Integer) maybe used for generation the unique row-id.
    -->
  <xsl:param name="transactionsNumber" select="number(concat(0,/wrs:Wrs/wrs:Header/wrs:TransactionsNumber))"/>

  <xsl:template match="node()|@*">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="wrs:Header">
    <xsl:copy>
      <xsl:copy-of select="@*"/>
      <wrs:TransactionsNumber><xsl:value-of select="$transactionsNumber + 1"/></wrs:TransactionsNumber>
      <xsl:copy-of select="*[name() != 'TransactionsNumber']"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="wrs:Data">
    <xsl:copy>
      <xsl:apply-templates select="@*"/>
      <xsl:for-each select="wrs:*">
        <xsl:choose>
          <xsl:when test="position() >= $y1 and $y2 >= position()">
            <xsl:apply-templates select="." mode="deleteRow"/>
          </xsl:when>
          <xsl:otherwise>
            <xsl:copy>
              <xsl:apply-templates select="node()|@*"/>
            </xsl:copy>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:for-each>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="wrs:I" mode="deleteRow"/>

  <xsl:template match="wrs:R | wrs:D" mode="deleteRow">
    <wrs:D>
      <xsl:apply-templates select="node()|@*"/>
    </wrs:D>
  </xsl:template>

  <xsl:template match="wrs:M" mode="deleteRow">
    <wrs:D>
      <xsl:apply-templates select="@*"/>
      <xsl:for-each select="wrs:O">
        <wrs:C>
          <xsl:apply-templates select="node()|@*"/>
        </wrs:C>
      </xsl:for-each>
    </wrs:D>
  </xsl:template>

</xsl:stylesheet>