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
       Generates a navigation index from siteIndex.xml
    -->

  <xsl:variable name="docs" select="document('../content/siteIndex.xml')"/>

  <!-- Root, javascript needed and header of the index navigation -->
  <xsl:template match="/">
    <html>
      <style>
        body {  font-family: Verdana, sans-serif; font-size: 0.8em; color: #333; }
        a.plain  {text-decoration:none; color: #333; }
        a.plain span { white-space: nowrap; }
        a.plain:hover {color: #333; text-decoration: underline; }
        .icon-plus, .icon-minus  { display: inline-block; padding-top: 4px; width: 16px; cursor: hand; }
        .icon-minus:before { content: '-'; font-weight: 120; color:#333  }
        .icon-plus:before { content: '+'; font-weight: 120; color:#333 }
        a.plain.chapterHeader { color:#333; white-space: nowrap;  }
        div.chapterContent { display: none; white-space: nowrap; padding-top: 2px }
        h3 { color: #074f9e; }
      </style>
      <script>
        toggleExpand = function(pm, title) {
          var area = document.getElementById(title);
          if( area.style.display == 'block' ) {
            pm.className = "icon-plus";
            area.style.display = 'none';
          } else {
            pm.className = "icon-minus";
            area.style.display = 'block';
          }
        }
      </script>
      <body style="font-family: 'jaf-bernino-sans', 'Lucida Grande', 'Lucida Sans Unicode', 'Lucida Sans', Geneva, Verdana, sans-serif">
        <xsl:variable name="newVar">
          <xsl:apply-templates select="$docs/*/Block">
          </xsl:apply-templates>
        </xsl:variable>
        <xsl:copy-of select="$newVar"></xsl:copy-of>
      </body>
    </html>
  </xsl:template>

  <!-- Show Block title of index document -->
  <xsl:template match="Block">
    <div style="margin-top:5px">
      <span class="icon-minus" onclick="toggleExpand(this,'{@title}')"/>
      <h3 style="display:inline; cursor: hand" onclick="toggleExpand(this.previousSibling,'{@title}')"><xsl:value-of select="@title"/></h3>
    </div>
    <div id="{@title}" style="display: block">
      <xsl:apply-templates select="./DocUrl"/>
    </div>
  </xsl:template>

  <!-- For each document in the Block, name the document, then list the Chapter -->
  <xsl:template match="DocUrl">
    <xsl:param name="docUrl"/>
    <xsl:variable name="doc" select="document(.)"/>
    <xsl:variable name="superChapter" select="count(preceding::DocUrl)+1"/>
    <xsl:variable name="title" select="$doc/doc:Doc/@title"/>
    <div>
      <span class="icon-plus" style="margin-left:10px; font-size: 0.8em" onclick="toggleExpand(this,'{$title}')"/>
      <a href="{.}" class="plain chapterHeader" target="content" onclick="toggleExpand(this.previousSibling,'{$title}')">
        <xsl:value-of select="$superChapter"/>.&#160;<xsl:value-of select="$title"/>
      </a>
    </div>
    <div id="{$title}" class="chapterContent" style="margin-left:6px;">
      <xsl:apply-templates select="$doc/*/doc:Chapter">
        <xsl:with-param name="superChapter" select="$superChapter"/>
        <xsl:with-param name="docUrl" select="."/>
      </xsl:apply-templates>
    </div>
  </xsl:template>

  <!-- Per Chapter show its title and number with a link.
       Let the first chapter jump to page start, all others to the direct anchor
       Then show its SubChapter
  -->
  <xsl:template match="doc:Chapter">
    <xsl:param name="docUrl"/>
    <xsl:param name="superChapter"/>
    <xsl:variable name="chapter" select="position()"/>
    <xsl:variable name="href">
      <xsl:choose>
        <xsl:when test="preceding-sibling::doc:Chapter"><xsl:value-of select="concat($docUrl,'#',@title)"/></xsl:when>
        <xsl:otherwise><xsl:value-of select="$docUrl"/></xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <a href="{$href}" class="plain" target="content">
      <span style="display:block; margin: 5px; margin-left:20px">
        <xsl:value-of select="$chapter"/>&#160;<xsl:value-of select="@title"/>
      </span>
    </a>
    <xsl:apply-templates select="./doc:SubChapter">
      <xsl:with-param name="superChapter" select="$superChapter"/>
      <xsl:with-param name="chapter" select="$chapter"/>
      <xsl:with-param name="docUrl" select="$docUrl"/>
    </xsl:apply-templates>
  </xsl:template>

  <!-- Per SubChapter show its title and number with a link. -->
  <xsl:template match="doc:SubChapter">
    <xsl:param name="docUrl"/>
    <xsl:param name="superChapter"/>
    <xsl:param name="chapter"/>
    <xsl:variable name="subChapter" select="position()"/>
    <a href="{$docUrl}#{@title}" class="plain" target="content">
      <span style="display:block; margin-left:35px">
        <xsl:value-of select="$chapter"/>.<xsl:value-of select="$subChapter"/>&#160;<xsl:value-of select="@title"/>
      </span>
    </a>
  </xsl:template>

</xsl:stylesheet>