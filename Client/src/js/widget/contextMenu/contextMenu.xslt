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
    xmlns:ctx="http://www.businesscode.de/schema/bcdui/contextMenu-1.0.0">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>

  <!-- Add a contextId attribute to an element to restrict the context menu
    If given, only entries outside of a ctx:Context node are shown plus the ones where ctx:Context[@id=contextId]
    If not given, all are shown.
   -->
  <xsl:param name="contextId"/>
  <xsl:param name="contextPath"/>


  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="/ctx:ContextMenu">
    <!--
      render only if Entry found or (no Entry - then we might only have context bound entries, which
      anyway require the contextId - so skip if such was not found
     -->
    <xsl:variable name="toBeShown" select="/*/*[not(self::ctx:Context) or (self::ctx:Context and (not($contextId) or not(@id) or @id=$contextId))]"/>
    <xsl:choose>

      <!-- Empty context menu is not shown -->
      <xsl:when test="not($toBeShown)"/>

      <xsl:otherwise>
        <div class="bcdContextMenu">
          <xsl:if test="$contextId">
            <xsl:attribute name="bcdContextId"><xsl:value-of select="$contextId"/></xsl:attribute>
          </xsl:if>
          <xsl:apply-templates select="$toBeShown"/>
        </div>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Renders a title for the context menu
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~-->
  <xsl:template match="ctx:ContextMenuTitle">
    <xsl:if test="@caption">
      <div class="bcdContextMenuTitle">
        <xsl:attribute name="bcdTranslate"><xsl:value-of select="@caption"/></xsl:attribute>
        <xsl:value-of select="@caption"/>
      </div>
    </xsl:if>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    renders a group of entries
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~-->
  <xsl:template match="ctx:ContextMenuEntryGroup | ctx:EntryGroup"> <!-- ctx:ContextMenuEntryGroup only for backward compatibility -->
    <xsl:if test="@caption">
      <div class="bcdContextGroupHeader">
        <xsl:attribute name="bcdTranslate"><xsl:value-of select="@caption"/></xsl:attribute>
        <xsl:value-of select="@caption"/>
      </div>
    </xsl:if>
    <xsl:apply-templates/>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    renders a small header
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~-->
  <xsl:template match="ctx:ContextMenuSubHeader">
    <xsl:if test="@caption">
      <div class="bcdContextSubHeader">
        <xsl:attribute name="bcdTranslate"><xsl:value-of select="@caption"/></xsl:attribute>
        <xsl:value-of select="@caption"/>
      </div>
    </xsl:if>
    <xsl:apply-templates/>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="ctx:MenuSeparator">
    <div class="hr"/>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Displays its ctx:Entry children in two columns, left, right, next row left, right next row...
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="ctx:TwoColumns">
    <table style="width:100%">
      <xsl:variable name="curr" select="."/>
      <xsl:variable name="half" select="ceiling(count(*) div 2)"/>
      <xsl:for-each select="*[position() &lt;= $half]">
        <xsl:variable name="currPos" select="position()"/>
        <tr>
          <td style="width:50%"><xsl:apply-templates select="$curr/*[$currPos*2-1]"/></td>
          <td style="width:50%"><xsl:apply-templates select="$curr/*[$currPos*2]"/></td>
        </tr>
      </xsl:for-each>
    </table>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    renders an entry
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="ctx:Entry">
    <xsl:apply-templates select="." mode="user"/>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="ctx:Url">
    <xsl:attribute name="bcdMenuCode">
      window.location.href="<xsl:value-of select="."/>";
    </xsl:attribute>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="ctx:JavaScriptAction">
    <xsl:attribute name="bcdMenuCode">
      <xsl:value-of select="."/>
    </xsl:attribute>
  </xsl:template>

  <xsl:template match="ctx:TableJavaScriptAction">
    <xsl:attribute name="bcdMenuCode">
      <xsl:value-of select="."/>
    </xsl:attribute>
    <xsl:attribute name="bcdTableAction">true</xsl:attribute>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  fallback
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="text()"/>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    "virtual" overwritable rules which are
    intented for use by "inheritance"
   ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="ctx:Entry" mode="user">
    <xsl:choose>
      <xsl:when test="not(@isDisabled='true')">
        <a class="bcdMenuitems" href="javascript:void(0)">
          <xsl:apply-templates/>
          <xsl:attribute name="bcdTranslate"><xsl:value-of select="@caption"/></xsl:attribute>
          <xsl:value-of select="@caption"/>
        </a>
      </xsl:when>
      <xsl:otherwise>
        <span class="bcdMenuitemsDisabled" href="javascript:void(0)">
        <xsl:attribute name="bcdTranslate"><xsl:value-of select="@caption"/></xsl:attribute>
          <xsl:value-of select="@caption"/>
        </span>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>
</xsl:stylesheet>
