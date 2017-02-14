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

<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0" xmlns:bd="http://www.businesscode.de/schema/bcdui/doc-1.1.0">
  <xsl:import href="common.xslt"/>

  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="no"
              doctype-system="http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"
              doctype-public="-//W3C//DTD XHTML 1.0 Transitional//EN"/>
  <xsl:variable name="quot">"</xsl:variable>
  <xsl:param name="contentPath" select="concat(translate(substring-before(substring-after(/processing-instruction('xml-stylesheet'),'href='),'_generator'),$quot,''),'content')"/>


  <xsl:template match="/bd:Doc">
    <xsl:param name="docUrl"/>
    <html>
      <xsl:call-template name="docHead">
        <xsl:with-param name="contentPath" select="$contentPath"/>
      </xsl:call-template>
      <body style="text-align:center; font-family: 'jaf-bernino-sans', 'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Geneva, Verdana, sans-serif; font-size: 0.9em">
        <div style="width:1024px;text-align:left;">
          <xsl:variable name="title">
            <xsl:choose>
              <xsl:when test="@state='draft'"><xsl:value-of select="concat(@title,' - Draft')"/></xsl:when>
              <xsl:otherwise><xsl:value-of select="@title"/></xsl:otherwise>
            </xsl:choose>
          </xsl:variable>
          <xsl:call-template name="header">
            <xsl:with-param name="title" select="$title"/>
            <xsl:with-param name="targetForBcdUiLink" select="concat($contentPath,'/overviewPage.xml')"/>
            <xsl:with-param name="chapterOneTitle" select="bd:Chapter[1]/@title"/>
          </xsl:call-template>
          <xsl:apply-templates select="bd:Chapter"><xsl:with-param name="docUrl" select="$docUrl"/></xsl:apply-templates>
        </div>
      </body>
    </html>
  </xsl:template>

  <xsl:template match="HtmlComment">
    <span style="color: #8080ff; font-weight: bold;">
    &lt;-- <xsl:value-of select="."/> --&gt;
    </span>
  </xsl:template>

  <!--
    renders a fieldset Extension(Point,Text)
   -->
  <xsl:template match="bd:Extension">
    <fieldset>
      <xsl:if test="Point">
        <legend><xsl:value-of select="Point"/></legend>
      </xsl:if>
      <div>
        <xsl:value-of select="Text"/>
      </div>
    </fieldset>
  </xsl:template>

  <xsl:template match="bd:Chapter">
    <xsl:param name="docUrl"/>
    <xsl:variable name="position" select="position()"/>
    <a id="{@title}" generated="true"></a>
    <!-- We want the first chapter to have its header above the page header because we want pdf to jump there -->
    <xsl:choose>
      <xsl:when test="preceding-sibling::bd:Chapter">
        <h3 style="color: #ff7f00;"><xsl:value-of select="concat($position,'. ',@title)"/></h3>
      </xsl:when>
      <xsl:otherwise>
        <div class="h3Style"><xsl:value-of select="concat($position,'. ',@title)"/></div>
      </xsl:otherwise>
    </xsl:choose>
    <xsl:apply-templates select="bd:Body"><xsl:with-param name="docUrl" select="$docUrl"/></xsl:apply-templates>
    <div style="margin-left: 10px">
      <xsl:apply-templates select="bd:SubChapter">
        <xsl:with-param name="chapterPosition" select="$position"/>
        <xsl:with-param name="docUrl" select="$docUrl"/>
      </xsl:apply-templates>
    </div>
  </xsl:template>

  <xsl:template match="bd:SubChapter">
  <xsl:param name="docUrl"/>
  <xsl:param name="chapterPosition"/>
    <xsl:variable name="position" select="concat($chapterPosition,'.',position())"/>
    <a id="{@title}" generated="true"><h4 style="color: #ff7f00;"><xsl:value-of select="concat($position,'. ',@title)"/></h4></a>
    <xsl:apply-templates select="bd:Body"><xsl:with-param name="docUrl" select="$docUrl"/></xsl:apply-templates>
    <xsl:apply-templates select="bd:SubChapter">
      <xsl:with-param name="chapterPosition" select="$position"/>
      <xsl:with-param name="docUrl" select="$docUrl"/>
    </xsl:apply-templates>
  </xsl:template>

  <xsl:template match="bd:Body">
    <xsl:param name="docUrl"/>
    <p>
      <xsl:apply-templates><xsl:with-param name="docUrl" select="$docUrl"/></xsl:apply-templates>
    </p>
  </xsl:template>

  <xsl:template match="bd:JspAttributesTable">
    <table class="jspAttributes" width="80%">
      <thead>
        <tr>
          <th>Name</th>
          <th>Properties</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        <xsl:apply-templates select="bd:Attribute"/>
      </tbody>
    </table>
  </xsl:template>

  <xsl:template match="bd:Attribute">
    <tr>
      <td><xsl:value-of select="@name"/></td>
      <td>
      <nobr>Required: <xsl:apply-templates select="@required" mode="boolean"/></nobr>
      </td>
      <td><xsl:value-of select="@description"/></td>
    </tr>
  </xsl:template>

  <xsl:template match="@*" mode="boolean">
    <xsl:choose>
      <xsl:when test="boolean(. = 'true')"><b>TRUE</b></xsl:when>
      <xsl:otherwise>FALSE</xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template match="node()|@*">
    <xsl:param name="docUrl"/>
    <xsl:copy><xsl:apply-templates select="node()|@*"><xsl:with-param name="docUrl" select="$docUrl"/></xsl:apply-templates></xsl:copy>
  </xsl:template>

  <xsl:template match="bd:pre">
    <xsl:variable name="minIndent">
      <xsl:call-template name="computeMinIndent">
        <xsl:with-param name="content" select="."/>
      </xsl:call-template>
    </xsl:variable>
    <xsl:copy>
      <xsl:call-template name="printRows">
        <xsl:with-param name="content" select="."/>
        <xsl:with-param name="minIndent" select="number($minIndent)"/>
      </xsl:call-template>
    </xsl:copy>
  </xsl:template>


  <xsl:template match="bd:xml">
    <pre onClick="bcdui.widget.visualizeXml._handleClick(event);">
      <xsl:apply-templates select="*|comment()" mode="visualizeXml"/>
    </pre>
  </xsl:template>

</xsl:stylesheet>
