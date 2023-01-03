<?xml version="1.0" encoding="UTF-8"?>
<!--
  Copyright 2010-2023 BusinessCode GmbH, Germany

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
  xmlns:xsla="http://www.w3.org/1999/XSL/Transform/Alias"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:bcdxml="http://www.businesscode.de/schema/bcdui/bcdxml-1.0.0"
  >

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" media-type="text/xslt"/>

  <xsl:namespace-alias stylesheet-prefix="xsla" result-prefix="xsl"/>
  
  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>

  <xsl:variable name="innerDimPos" select="number(/*/wrs:Header/wrs:Columns/wrs:C[@dimId][position()=last()]/@pos)"/>
  
  <!-- build up a string "concat(wrs:C[1],'|', ...., '|', wrs:C[innerDimPos - 1],'')" for key usage -->
  <!-- for innerDimPos <=1 it simply generates wrs:C[1], but later on we exclude such cases anyhow, this is just to get a valid string for key usage --> 
  <xsl:template name="buildConcat">
    <xsl:param name="value" select="''"/>
    <xsl:param name="limit" select="$innerDimPos - 1"/>
    <xsl:variable name="quot">'</xsl:variable>
    <xsl:choose>
      <xsl:when test="$innerDimPos=1 or not($innerDimPos)">wrs:C[1]</xsl:when>
      <xsl:when test="$limit=0"><xsl:value-of select="concat('concat(', $value, ',',$quot,$quot,')')"/></xsl:when>
      <xsl:otherwise>
        <xsl:variable name="newValue">
          <xsl:choose>
            <xsl:when test="$limit = $innerDimPos - 1"><xsl:value-of select="concat('wrs:C[', $limit, ']')"/></xsl:when>
            <xsl:otherwise><xsl:value-of select="concat('wrs:C[', $limit, '],', $quot, '|', $quot, ',',$value)"/></xsl:otherwise>
          </xsl:choose>
        </xsl:variable>
        <xsl:call-template name="buildConcat">
          <xsl:with-param name="value" select="$newValue"/>
          <xsl:with-param name="limit" select="$limit - 1"/>
        </xsl:call-template>
      </xsl:otherwise>
    </xsl:choose>
    
  </xsl:template>

  <xsl:template match="/*">

    <xsl:choose>
      <xsl:when test="not($paramModel//xp:InlineChartInnerRowDim='true')">
      <bcdxml:XsltNop>
        <xsl:comment><xsl:value-of select="$paramModel//xp:InlineChartInnerRowDim"/></xsl:comment>
      </bcdxml:XsltNop>
      
      </xsl:when>
      <xsl:otherwise>

        <xsl:variable name="concatCs"> <xsl:call-template name="buildConcat"/> </xsl:variable>
    
        <xsla:stylesheet version="1.0">
    
          <xsla:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>
    
          <xsla:variable name="innerDimPos" select="number(/*/wrs:Header/wrs:Columns/wrs:C[@dimId][position()=last()]/@pos)"/>
    
          <xsl:element name="key" namespace="http://www.w3.org/1999/XSL/Transform">
            <xsl:attribute name="name">rowDimKey</xsl:attribute>
            <xsl:attribute name="use"><xsl:value-of select="$concatCs"/></xsl:attribute>
            <xsl:attribute name="match">/*/wrs:Data/wrs:R</xsl:attribute>
          </xsl:element>
    
          <xsla:key name="measureKey" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@valueId"/>
          <xsla:variable name="measureCount" select="count(/*/wrs:Header/wrs:Columns/wrs:C[generate-id(.)=generate-id(key('measureKey', @valueId))])"/>
    
          <!-- remove inner dim from header and fix positions of following columns -->
          <xsla:template match="wrs:Header/wrs:Columns">
            <xsla:choose>
              <xsla:when test="$measureCount=1 and $innerDimPos &gt; 1">
                <wrs:Columns>
                  <xsla:copy-of select="@*"/>
                  <xsla:attribute name="innerRowDimCaption"><xsla:value-of select="wrs:C[position() = $innerDimPos]/@caption"/></xsla:attribute>
                  <xsla:for-each select="wrs:C[position() &lt; $innerDimPos]">
                    <xsla:apply-templates select="."/>
                  </xsla:for-each>
                  <xsla:for-each select="wrs:C[position() &gt; $innerDimPos]">
                    <wrs:C>
                      <xsla:copy-of select="@*"/>
                      <xsla:attribute name="pos"><xsla:value-of select="count(preceding-sibling::wrs:C)"/></xsla:attribute>
                      <xsla:copy-of select="node()"/>
                    </wrs:C>
                  </xsla:for-each>
                </wrs:Columns>
              </xsla:when>
              <xsla:otherwise><xsla:copy><xsla:apply-templates select="node()|@*"/></xsla:copy></xsla:otherwise>
            </xsla:choose>
          </xsla:template>
    
          <xsla:template match="wrs:Data">
            <xsla:choose>
              <xsla:when test="$measureCount=1 and $innerDimPos &gt; 1">
                <wrs:Data>
                  <xsla:copy-of select="@*"/>
    
                  <!-- run over unique dim key rows -->
                  <xsl:element name="for-each" namespace="http://www.w3.org/1999/XSL/Transform">
                    <xsl:attribute name="select">wrs:R[generate-id(.)=generate-id(key('rowDimKey', <xsl:value-of select="$concatCs"/>))]</xsl:attribute>
                    <wrs:R>
                      <xsla:copy-of select="@*"/>
    
                      <!-- take over all dims except innerDim -->
                      <xsla:for-each select="wrs:C[position() &lt; $innerDimPos]">
                        <xsla:apply-templates select="."/>
                      </xsla:for-each>
    
                      <!-- collect values for inner dim and write them as wrs:Value entries -->
                      <xsl:element name="for-each" namespace="http://www.w3.org/1999/XSL/Transform">
                        <xsl:attribute name="select">key('rowDimKey', <xsl:value-of select="$concatCs"/>)</xsl:attribute>
                        <xsla:if test="wrs:C[$innerDimPos]/@bcdGr='0'">
                          <wrs:Dim>
                            <xsla:value-of select="wrs:C[$innerDimPos]"/>
                            <xsla:for-each select="wrs:C[position() &gt; $innerDimPos]">
                              <wrs:Value><xsla:value-of select="."/></wrs:Value>
                            </xsla:for-each>
                          </wrs:Dim>
                        </xsla:if>
                        </xsl:element>
    
                      <!-- take over the rest of the columns -->
                      <xsla:for-each select="wrs:C[position() &gt; $innerDimPos]">
                        <xsla:apply-templates select="."/>
                      </xsla:for-each>
    
                    </wrs:R>
                  </xsl:element>
                </wrs:Data>
              </xsla:when>
              <xsla:otherwise><xsla:copy><xsla:apply-templates select="node()|@*"/></xsla:copy></xsla:otherwise>
            </xsla:choose>
          </xsla:template>
    
          <xsla:template match="node()|@*">
            <xsla:copy><xsla:apply-templates select="node()|@*"/></xsla:copy>
          </xsla:template>
    
        </xsla:stylesheet>

      </xsl:otherwise>
    </xsl:choose>

  </xsl:template>

</xsl:stylesheet>
