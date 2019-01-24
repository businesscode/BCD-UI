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
  Merges $statusModel//cube:Layout[@cubeId=$cubeId] into cube metaData
  -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:calc="http://www.businesscode.de/schema/bcdui/calc-1.0.0"
  xmlns:cube="http://www.businesscode.de/schema/bcdui/cube-2.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
  xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:param name="statusModel" select="/*[1=0]"/>
  <xsl:param name="cubeId"/>

  <xsl:variable name="doc" select="/"/>

  <!-- default copy -->
  <xsl:template match="@*|node()"><xsl:copy><xsl:apply-templates select="@*|node()"/></xsl:copy></xsl:template>
  
  <xsl:template match="/">
    <cube:CubeConfiguration>

      <!--
        there might be no layout in given cubeConfiguration, so we generate one and take over
        a possibly existing one (but we do prefer status model layout over metadata layout)
        a set merge!='true' attribute at the statusModel forbids merging, useful if you have e.g. a dynamic config model which modifies layout before sent to server
       -->
      <xsl:copy-of select="/*/*[not(self::cube:Layout)]"/>
      <cube:Layout>
        <xsl:attribute name="removeEmptyCells">rowCol</xsl:attribute>
        <xsl:copy-of select="/*/cube:Layout/@removeEmptyCells"/>
        <xsl:attribute name="expandCollapseCells">false</xsl:attribute>
        <xsl:copy-of select="/*/cube:Layout/@expandCollapseCells"/>
         <xsl:choose>
          <xsl:when test="$statusModel//cube:Layout[@cubeId=$cubeId]/* and (not($statusModel//cube:Layout[@cubeId=$cubeId]/@merge) or $statusModel//cube:Layout[@cubeId=$cubeId]/@merge='true')">
            <xsl:copy-of select="$statusModel//cube:Layout[@cubeId=$cubeId]/@*" />
            <xsl:apply-templates select="$statusModel//cube:Layout[@cubeId=$cubeId]/*"/>
          </xsl:when>
          <xsl:otherwise>
            <xsl:copy-of select="/*/cube:Layout/@*" />
            <xsl:apply-templates select="/*/cube:Layout/*"/>
          </xsl:otherwise> 
        </xsl:choose>
      </cube:Layout>

    </cube:CubeConfiguration>
  </xsl:template>

<!--
  to resolve valuerefs correctly, we need to take the information always from the input model
  i.e. always use $doc. Otherwise the template match might refer to the status model where
  just added valuerefs (e.g. from a calculation) cannot be resolved since the belonging measure
  definitions are stored in the input (metadata) model.
  This has to be done for standard calc:ValueRef and server sided calc's valueref values
 -->

  <xsl:template match="cube:Layout//calc:ValueRef|cube:Layout//wrq:ValueRef">

    <!-- determine possible needed prefix for total values -->
    <xsl:variable name="prefix">
      <xsl:choose>
        <xsl:when test="starts-with(@idRef,'&#xE0F0;')"><xsl:value-of select="substring-before(@idRef, '|')"/>|</xsl:when>
        <xsl:otherwise></xsl:otherwise>
      </xsl:choose>
    </xsl:variable>

    <!-- determine real idRef value (in case of total values, you need to remove the prefix) -->
    <xsl:variable name="idRef" select="substring-after(@idRef, $prefix)"/>

    <!-- resolve valueRef when needed -->
    <xsl:choose>
      <xsl:when test="$doc/*/dm:Measures/dm:Measure[@id=$idRef]/calc:Calc/*">
        <xsl:choose>
          <xsl:when test="self::wrq:ValueRef">
            <xsl:apply-templates select="$doc/*/dm:Measures/dm:Measure[@id=$idRef]/calc:Calc/*" mode="calc2wrq">
              <xsl:with-param name="prefix" select="$prefix"/>
            </xsl:apply-templates>
          </xsl:when>
          <xsl:otherwise>
            <xsl:apply-templates select="$doc/*/dm:Measures/dm:Measure[@id=$idRef]/calc:Calc/*" mode="resolve">
              <xsl:with-param name="prefix" select="$prefix"/>
            </xsl:apply-templates>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:when>
      <xsl:otherwise><xsl:copy-of select="."/></xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- default copy template for 2 modes with param -->
  <xsl:template match="@*|node()" mode="resolve">
    <xsl:param name="prefix" select="''"/>
    <xsl:copy><xsl:apply-templates select="@*|node()" mode="resolve"><xsl:with-param name="prefix" select="$prefix"/></xsl:apply-templates></xsl:copy>
  </xsl:template>
  <xsl:template match="@*|node()" mode="calc2wrq">
    <xsl:param name="prefix" select="''"/>
    <xsl:copy><xsl:apply-templates select="@*|node()" mode="calc2wrq"><xsl:with-param name="prefix" select="$prefix"/></xsl:apply-templates></xsl:copy>
  </xsl:template>

  <!-- add prefix to idref in case of total values -->
  <xsl:template match="@idRef" mode="calc2wrq">
    <xsl:param name="prefix" select="''"/>
    <xsl:attribute name="idRef"><xsl:value-of select="concat($prefix, .)"/></xsl:attribute>
  </xsl:template>
  <xsl:template match="@idRef" mode="resolve">
    <xsl:param name="prefix" select="''"/>
    <xsl:attribute name="idRef"><xsl:value-of select="concat($prefix, .)"/></xsl:attribute>
  </xsl:template>

  <!-- replace calc namespace with wrq namespace -->
  <xsl:template match="calc:*" mode="calc2wrq">
    <xsl:param name="prefix" select="''"/>
    <xsl:element name="{local-name()}" namespace="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0">
      <xsl:apply-templates select="@*|node()" mode="calc2wrq"><xsl:with-param name="prefix" select="$prefix"/></xsl:apply-templates>
    </xsl:element>
  </xsl:template>

</xsl:stylesheet>