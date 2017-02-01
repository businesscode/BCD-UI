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
    xmlns:guiStatus="http://www.businesscode.de/schema/bcdui/guiStatus-1.0.0"
    xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0">
  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="yes"  />
  <xsl:param name="chooserId" />
  <xsl:param name="dimensionName" />
  <xsl:param name="guiStatus" />
  <xsl:variable name="SQ">'</xsl:variable>

  <xsl:template match="/">
    <Selections>
      <xsl:attribute name="id"><xsl:value-of select="$chooserId"/></xsl:attribute>
      <xsl:variable name="prefix">
        <xsl:choose>
          <xsl:when test="/*/f:Filter/f:And[@bcdDimension=concat($dimensionName, '_exclude')]/f:Or">&#43; </xsl:when>
          <xsl:otherwise></xsl:otherwise>
        </xsl:choose>
      </xsl:variable>
      <xsl:for-each select="/*/f:Filter/f:Or[@bcdDimension=$dimensionName]/f:And">
        <Selection>
          <Caption>
            <xsl:call-template name="string_builder">
              <xsl:with-param name="prefix" select="$prefix"/>
              <xsl:with-param name="data" select="."/>
              <xsl:with-param name="separator">|</xsl:with-param>
            </xsl:call-template>
          </Caption>
          <Value>
            <xsl:call-template name="removal_xpath">
              <xsl:with-param name="exclude" select="false()"/>
              <xsl:with-param name="data" select="."/>
            </xsl:call-template>
          </Value>
        </Selection>
      </xsl:for-each>
      <xsl:for-each select="/*/f:Filter/f:And[@bcdDimension=concat($dimensionName, '_exclude')]/f:Or">
        <Selection>
          <Caption>
            <xsl:call-template name="string_builder">
              <xsl:with-param name="prefix" select="'&#8722; '"/>
              <xsl:with-param name="data" select="."/>
              <xsl:with-param name="separator">|</xsl:with-param>
            </xsl:call-template>
          </Caption>
          <Value>
            <xsl:call-template name="removal_xpath">
              <xsl:with-param name="exclude" select="true()"/>
              <xsl:with-param name="data" select="."/>
            </xsl:call-template>
          </Value>
        </Selection>
      </xsl:for-each>
    </Selections>
  </xsl:template>

  <xsl:template name="removal_xpath">
    <xsl:param name='data' />
    <xsl:param name='exclude' select="false()" />
    <xsl:for-each select='$data/*[@value]'>
      <xsl:if test='position() = 1'>
        <xsl:choose>
          <xsl:when test="$exclude">
            <xsl:value-of select="concat('/*/f:Filter/f:And[@bcdDimension=', $SQ, $dimensionName, '_exclude', $SQ,']/f:Or[')"/>
          </xsl:when>
          <xsl:otherwise>
            <xsl:value-of select="concat('/*/f:Filter/f:Or[@bcdDimension=', $SQ, $dimensionName, $SQ,']/f:And[')"/>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:if>
      <xsl:choose>
        <xsl:when test="$exclude">
          <xsl:value-of select="concat( './', name(),'[ @bRef=',$SQ, @bRef, $SQ,' and @op=', $SQ, '!=', $SQ,  ' and @value=',$SQ,  @value,$SQ, ' ]')"/>
          <xsl:text> and </xsl:text>
          <xsl:value-of select="concat( './', name(),'[ @bRef=',$SQ, @bRef, $SQ,' and @op=', $SQ, '=', $SQ,' ]')"/>
        </xsl:when>
        <xsl:otherwise>
          <xsl:value-of select="concat( './', name(),'[ @bRef=',$SQ, @bRef, $SQ,' and @op=', $SQ, '=', $SQ,  ' and @value=',$SQ,  @value,$SQ, ' ]')"/>
        </xsl:otherwise>
      </xsl:choose>
      <xsl:if test='position() != last()'>
        <xsl:text> and </xsl:text>
      </xsl:if>
    </xsl:for-each>
    <xsl:text>]</xsl:text>
  </xsl:template>

  <xsl:template name='string_builder'>
    <xsl:param name='prefix' select="''"/>
    <xsl:param name='data' />
    <xsl:param name='separator' />
    <xsl:variable name="value">
      <xsl:for-each select='$data/*[@value]'>
        <xsl:value-of select='current()[normalize-space(@caption)]/@caption | current()[not(normalize-space(@caption))]/@value'/>
        <xsl:if test='position() != last()'>
          <xsl:value-of select='$separator'/>
        </xsl:if>
      </xsl:for-each>
    </xsl:variable>
    <xsl:value-of select="concat($prefix, $value)"/>
  </xsl:template>
</xsl:stylesheet>