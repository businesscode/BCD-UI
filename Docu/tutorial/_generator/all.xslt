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
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"
                xmlns:doc="http://www.businesscode.de/schema/bcdui/doc-1.1.0">

  <!--
       Generates a combined HTML page with all documentation based on an siteIndex.xml.
    -->
  <xsl:import href="doc.xslt"/>
  <xsl:import href="../../../Client/src/xslt/stringUtil.xslt"/>

  <xsl:param name="version" select="'Draft'"/>

  <xsl:variable name="quot">"</xsl:variable>
  <xsl:param name="contentPath" select="concat(translate(substring-before(substring-after(/processing-instruction('xml-stylesheet'),'href='),'_generator'),$quot,''),'content')"/>
  <xsl:variable name="docs" select="document('../content/siteIndex.xml')"/>

  <!-- Loop over all docs from index  -->
  <xsl:template match="/">
    <xsl:call-template name="docHead">
      <xsl:with-param name="contentPath" select="$contentPath"/>
    </xsl:call-template>
    <style>
      a.plain  {text-decoration:none; color: black; color:#074f9e }
      a.plain:hover {color: orange; text-decoration: underline; }
    </style>
    <body style="text-align:center;margin:0px; font-family: 'jaf-bernino-sans', 'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Geneva, Verdana, sans-serif">
      <a name="topOfDoc"></a>
      <h1 class="hiddenPDFHeader">BCD-UI Index</h1>
      <xsl:call-template name="header">
        <xsl:with-param name="anchor" select="topOfDoc"/>
        <xsl:with-param name="title" select="'BCD-UI Index'"/>
        <xsl:with-param name="chapterOneTitle" select="'Index'"/>
      </xsl:call-template>

      <div style="font-size:x-small ;text-align: right">Version: <xsl:value-of select="$version"/></div>

      <table style="width:800px;text-align:left;margin-bottom:20px;margin-top:50px;;page-break-after:always;">
        <tr><td style="font-size:20pt;font-weight:bold;color: #074f9e;">BCD-UI Index</td></tr>
        <tr>
          <td style="width:45%;vertical-align:top">
            <xsl:for-each select="$docs/Docs">
              <xsl:apply-templates select="Block[count(preceding-sibling::Block) &lt;= count(following-sibling::Block)]" mode="index"/>
            </xsl:for-each>
          </td>
          <td style="width:10%"/>
          <td style="width:45%;vertical-align:top">
            <xsl:for-each select="$docs/Docs">
              <xsl:apply-templates select="Block[count(preceding-sibling::Block) &gt; count(following-sibling::Block)]" mode="index"/>
            </xsl:for-each>
          </td>
        </tr>
      </table>

      <div style="width:1024px;text-align:left;">
        <xsl:apply-templates select="$docs/Docs/Block"/>
      </div>
    </body>
  </xsl:template>

  <xsl:template match="Block">
    <h1 class="hiddenPDFHeader"><xsl:value-of select="@title"/></h1>
    <xsl:for-each select="./DocUrl">
      <xsl:apply-templates select="document(.)/*"  mode="anchor">
        <xsl:with-param name="docUrl" select="."/>
      </xsl:apply-templates>
    </xsl:for-each>
  </xsl:template>

  <xsl:template match="Block" mode="index">
    <div style="color: #ff7f00;font-size:120%;margin-top:15px"><xsl:value-of select="@title"/></div>
    <xsl:apply-templates/>
  </xsl:template>

  <xsl:template match="DocUrl">
    <a href="#{.}" class="plain" generated="true">
      <xsl:value-of select="concat(count(preceding::DocUrl)+1,'. ',document(.)/doc:Doc/@title)"/><br/>
    </a>
  </xsl:template>

  <!-- Overwrites template from doc.xslt to prevent creation of individual HTML pages for each doc -->
  <xsl:template match="/doc:Doc" mode="anchor">
    <xsl:param name="docUrl"/>
    <xsl:call-template name="header">
      <xsl:with-param name="anchor" select="$docUrl"/>
      <xsl:with-param name="title" select="@title"/>
      <xsl:with-param name="chapterOneTitle" select="doc:Chapter[1]/@title"/>
    </xsl:call-template>
    <xsl:apply-templates select="doc:Chapter">
      <xsl:with-param name="docUrl" select="$docUrl"/>
    </xsl:apply-templates>
    <p style="page-break-after:always">&#160;</p>
  </xsl:template>

  <!-- Relative and img src attributes need to be adjusted relative to the carrier xml (which is not longer the doc.xml itself -->
  <xsl:template match="@src">
    <xsl:param name="docUrl"/>
    <xsl:variable name="pathLength">
      <xsl:call-template name="lastIndexOf">
        <xsl:with-param name="s" select="$docUrl"/>
        <xsl:with-param name="c" select="'/'"/>
      </xsl:call-template>
    </xsl:variable>
    <xsl:attribute name="src">
      <xsl:value-of select="substring($docUrl,1,$pathLength)"/><xsl:value-of select="."/>
    </xsl:attribute>
  </xsl:template>

  <!-- See comment on @src -->
  <xsl:template match="@href">
    <xsl:param name="docUrl"/>
    <xsl:attribute name="href">
      <xsl:choose>
        <xsl:when test="starts-with(.,'http:') or starts-with(.,'#')"> <!-- TODO issue when joined doc does contain multiple anchors with same name -->
          <xsl:value-of select="."/>
        </xsl:when>
        <xsl:otherwise>#../content/<xsl:call-template name="removeDotDot"><xsl:with-param name="string" select="."/></xsl:call-template></xsl:otherwise>
      </xsl:choose>
    </xsl:attribute>
  </xsl:template>

  <xsl:template name="removeDotDot">
    <xsl:param name="string"/>
    <xsl:choose>
      <xsl:when test="starts-with($string,'../')">
        <xsl:call-template name="removeDotDot">
          <xsl:with-param name="string" select="substring($string,4)"/>
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$string"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

</xsl:stylesheet>