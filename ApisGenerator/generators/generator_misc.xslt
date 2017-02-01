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
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:exslt="http://exslt.org/common"
>

  <xsl:import href="../../Client/src/xslt/stringUtil.xslt"/>

  <!-- *****************
    printRow template which also removes obsolete whitespacing
    -->

  <xsl:template name="printRowsNormalize">
    <xsl:param name="content" />
    <xsl:param name="indent"/>
    <xsl:param name="emptyRowsSoFar" select="true()" />
    <xsl:variable name="row" select="substring-before(concat($content, '&#10;'), '&#10;')"/>
    <xsl:variable name="rest" select="substring-after($content, '&#10;')" />
    <xsl:if test="normalize-space($row) != '' or not($emptyRowsSoFar)">
      <xsl:value-of select="concat($indent, normalize-space($row), '&#10;')"/>
    </xsl:if>
    <xsl:if test="string-length(normalize-space($rest)) > 0">
      <xsl:call-template name="printRowsNormalize">
        <xsl:with-param name="content" select="$rest" />
        <xsl:with-param name="indent" select="$indent" />
        <xsl:with-param name="emptyRowsSoFar" select="$emptyRowsSoFar and normalize-space($row) = ''"/>
      </xsl:call-template>
    </xsl:if>
  </xsl:template>

  <!-- *****************
    adds a prefix to a given string and fixes camelCase for this given string (first pos) 
    -->

  <xsl:template name="addPrefix">
    <xsl:param name="name"/>
    <xsl:param name="prefix" select="'bcd'"/>
    <xsl:value-of select="concat($prefix,translate(substring($name,1,1),'abcdefghijklmnopqrstuvwxyz','ABCDEFGHIJKLMNOPQRSTUVWXYZ'),substring($name,2))"/>
  </xsl:template>


  <!-- *****************
    This mainly flattens API inheritance for easier processing
    -->
  <xsl:variable name="normalizedApiString">
    <BcdObjects>
      <xsl:for-each select="/*/WorkingDraft/BcdObjects/BcdObject">
        <xsl:copy>
          <xsl:copy-of select="@*"/>
          <Api>
            <xsl:apply-templates select="/*/WorkingDraft/BcdAPI/Api[@name=current()/@implements]" mode="normalizedApi"/>
          </Api>
        </xsl:copy>
      </xsl:for-each>
    </BcdObjects>
  </xsl:variable>
  <xsl:variable name="normalizedApi" select="exslt:node-set($normalizedApiString)"/>

  <!-- *****************
    Helper for normalizedApi, flatten Api hierarchy
    -->
  <xsl:template match="Api" mode="normalizedApi">
    <xsl:attribute name="name"><xsl:value-of select="@name"/></xsl:attribute>
    <xsl:attribute name="type"><xsl:value-of select="@type"/></xsl:attribute>
    <xsl:attribute name="alias"><xsl:value-of select="@alias"/></xsl:attribute>
    <extends><xsl:value-of select="@extends"/></extends>
    <xsl:apply-templates select="/*/WorkingDraft/BcdAPI/Api[contains(concat(' ',current()/@extends,' '),concat(' ',@name,' '))]" mode="normalizedApi"/>
    <xsl:apply-templates select="node()" mode="normalizedApi"/>
  </xsl:template>

  <xsl:template match="@*|node()" mode="normalizedApi">
    <xsl:copy><xsl:apply-templates select="@*|node()" mode="normalizedApi"/></xsl:copy>
  </xsl:template>

</xsl:stylesheet>