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
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  >

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:key use="@id" name="getPositionByName" match="/wrs:*/wrs:Header/wrs:Columns/wrs:C"></xsl:key>
  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="/*">
     <xsl:variable name="replacedStr">
      <xsl:for-each select="/wrs:*/wrs:Data/*/wrs:C[number(key('getPositionByName', 'key')/@pos)]">
        <xsl:if test="string-length(
          translate(.
                    , 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789-'
                    , '')
          ) > 0">x</xsl:if>
      </xsl:for-each>
     </xsl:variable>

    <Data format="bcdI18n" isKeyNormalized="{string-length($replacedStr) > 0}">
      <xsl:apply-templates select="*"/>
    </Data>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="wrs:C[number(key('getPositionByName', 'key')/@pos)]">
    <!-- removes all none NMTOKENs -->
    <xsl:variable name="elName" select="translate(., translate(., 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_0123456789-', ''), '')"/>
    <xsl:if test="string-length($elName) &gt; 0">
       <xsl:element name="{$elName}">
         <xsl:attribute name="lang"><xsl:value-of select="../wrs:C[number(key('getPositionByName', 'lang')/@pos)]"/></xsl:attribute>
        <xsl:value-of select="../wrs:C[number(key('getPositionByName', 'value')/@pos)]"/>
      </xsl:element>
     </xsl:if>
  </xsl:template>

  <xsl:template match="text()"></xsl:template>

</xsl:stylesheet>
