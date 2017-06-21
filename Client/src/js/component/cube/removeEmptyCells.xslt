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
  Removes empty rows and columns in cube data
  -->
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xsla="http://www.w3.org/1999/XSL/Transform/Alias"
                xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0"
                xmlns:cube="http://www.businesscode.de/schema/bcdui/cube-2.0.0"
                xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
                xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
                xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
                xmlns:exslt="http://exslt.org/common"
                xmlns:msxsl="urn:schemas-microsoft-com:xslt"
                xmlns:bcdxml="http://www.businesscode.de/schema/bcdui/bcdxml-1.0.0"
                xmlns:generator="urn(bcd-xsltGenerator)">

  <msxsl:script language="JScript" implements-prefix="exslt">this['node-set'] = function (x) { return x; }</msxsl:script>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>
  <!-- (NodeSet) As parameter or as default or specific parameter set from parameter model-->
  <xsl:param name="paramSet" select="$paramModel//xp:RemoveEmptyCells[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>

  <xsl:variable name="ignoreCols">
    <!-- Ignore all positions, which are dimensions. This is also the default for all cases -->
    <xsl:for-each select="/*/wrs:Header/wrs:Columns/wrs:C[@dimId]">
      <xsl:value-of select="concat(' ',@pos,' ')"/>
    </xsl:for-each>
    <!-- Positions to be ignored can be given explicitly -->
    <xsl:value-of select="concat(' ',$paramSet/@ignorePos,' ')"/>
    <!-- List of valueIds to be ignores is given -->
    <xsl:if test="normalize-space($paramSet/@ignoreValueIds)">
      <xsl:variable name="ignoreValueIds" select="concat(' ',$paramSet/@ignoreValueIds,' ')"/>
      <xsl:for-each select="/*/wrs:Header/wrs:Columns/wrs:C[@valueId and contains($ignoreValueIds, concat(' ',@valueId,' '))]">
        <xsl:value-of select="concat(' ',@pos,' ')"/>
      </xsl:for-each>
    </xsl:if>
  </xsl:variable>

  <!-- Node-set with column @pos of all cols which have no data -->
  <xsl:variable name="emptyColumnsString">
    <EmptyColumns>
      <xsl:variable name="dimensionCount" select="count(/*/wrs:Header/wrs:Columns/wrs:C/@dimId)"/>
      <xsl:for-each select="/*/wrs:Header/wrs:Columns/wrs:C[position() > $dimensionCount]">
        <xsl:variable name="content">
          <xsl:value-of select="/*/wrs:Data/wrs:*/wrs:*[position()=current()/@pos and normalize-space(text())!='' and text()!='NaN']"/>
        </xsl:variable>
        <xsl:if test="normalize-space($content)=''">
          <Col><xsl:value-of select="@pos"/></Col>
        </xsl:if>
      </xsl:for-each>
    </EmptyColumns>
  </xsl:variable>
  <xsl:variable name="emptyColumns" select="exslt:node-set($emptyColumnsString)"/>

  <!-- We only run if requested, otherwise we create a XsltNop to indicate that our input is to be used as out output -->
  <xsl:template match="/*">
    <xsl:choose>
      <xsl:when test="$paramSet/@apply='rowCol'">
        <xsl:copy>
          <xsl:apply-templates select="@*|node()"/>
        </xsl:copy>
      </xsl:when>
      <xsl:otherwise>
        <bcdxml:XsltNop/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- Removing empty rows and columns -->
  <xsl:template match="wrs:R">
    <!-- Check, whether we have content in any cell (i.e. search the first, which has, skip cols listed in $ignoreCols -->
    <xsl:variable name="content">
      <xsl:value-of select="wrs:*[not(contains($ignoreCols,concat(' ',position(),' '))) and normalize-space(text()) and text()!='NaN']"/>
    </xsl:variable>
    <xsl:if test="normalize-space($content)">
      <wrs:R>
        <xsl:copy-of select="@*"/>
        <xsl:copy-of select="wrs:*[not(position()=$emptyColumns/*/Col)]"/>
      </wrs:R>
    </xsl:if>
  </xsl:template>

  <!-- Removing header for empty column -->
  <xsl:template match="wrs:Columns">
    <wrs:Columns>
      <xsl:copy-of select="@*"/>
      <xsl:for-each select="wrs:C[not(@pos=$emptyColumns/*/Col)]">
        <xsl:copy>
          <xsl:copy-of select="@*"/>
          <xsl:attribute name="pos">
            <xsl:value-of select="@pos - count($emptyColumns/*/Col[number(.) &lt; number(current()/@pos)])"/>
          </xsl:attribute>
          <xsl:copy-of select="*"/>
        </xsl:copy>
      </xsl:for-each>
    </wrs:Columns>
  </xsl:template>

  <xsl:template match="@*|node()">
    <xsl:copy>
      <xsl:apply-templates select="@*|node()" />
    </xsl:copy>
  </xsl:template>

</xsl:stylesheet>
