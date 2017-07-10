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
  Adds cube specific logic to filterFromCell.xslt
  I.e. switching grouped dimension value information into single filters again
 -->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:exslt="http://exslt.org/common"
  xmlns:msxsl="urn:schemas-microsoft-com:xslt"
  xmlns:cube="http://www.businesscode.de/schema/bcdui/cube-2.0.0">

  <xsl:import href="../../../xslt/renderer/filterFromCell.xslt"/>
  <xsl:import href="../../../xslt/stringUtil.xslt"/>

  <msxsl:script language="JScript" implements-prefix="exslt">this['node-set'] = function (x) { return x; }</msxsl:script>

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:param name="cubeEnhancedConfiguration" select="/*[1=0]"/> <!-- Cube's internal enhanced configuration -->
  <xsl:param name="cubeOrigConfiguration" select="/*[1=0]"/> <!-- Cube's original configuration, with all measure definitions available -->
  
  <xsl:template match="node()|@*">
    <xsl:copy>
      <xsl:apply-templates select="node()|@*"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="f:Expression">

	<xsl:variable name="vdmDims" select="$cubeEnhancedConfiguration/*/cube:Layout/cube:Dimensions/*/dm:LevelRef[cube:VDM/cube:Map]"/>
    <xsl:variable name="bRef" select="@bRef"/>
    <xsl:variable name="value" select="@value"/>
    <xsl:variable name="op" select="@op"/>

    <!-- if current f:Expression is a grouping expression, re-translate the value to an OR filter -->
    <xsl:choose>
      <xsl:when test="$vdmDims/@bRef=$bRef and $vdmDims/cube:VDM/cube:Map/@to=$value">
        <f:Or>
          <xsl:variable name="fromStr">
            <xsl:call-template name="tokenize">
              <xsl:with-param name="string" select="$vdmDims/cube:VDM/cube:Map[@to=$value]/@from" />
              <xsl:with-param name="delimiter" select="'&#xe0f2;'" />
            </xsl:call-template>
          </xsl:variable>
          <xsl:variable name="fromTokens" select="exslt:node-set($fromStr)" />
          <xsl:for-each select="$fromTokens/wrs:Wrs/wrs:Data/wrs:R">
            <f:Expression bRef="{$bRef}" op="{$op}" value="{wrs:C}"/>
          </xsl:for-each>
        </f:Or>
      </xsl:when>
      <xsl:otherwise>
        <xsl:copy>
          <xsl:apply-templates select="node()|@*"/>
        </xsl:copy>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

</xsl:stylesheet>