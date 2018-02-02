<?xml version="1.0" encoding="UTF-8"?>
<!--
  Copyright 2010-2018 BusinessCode GmbH, Germany

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
<xsl:stylesheet
  version="1.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="no" media-type="text/html"/>
  
  <xsl:param name="rowId"/>
  <xsl:param name="I18N_TAG" select="'&#xE0FF;'"/>
  
  <xsl:variable name="wrsRow" select="/*/wrs:Data/wrs:*[@id=$rowId]"/>

  <xsl:template match="/">
    <!-- flexify -->
    <div>
      <div>
        <xsl:apply-templates select="$wrsRow/wrs:C"/>
      </div>
      <div class="bcd-quickedit-controls">
        <!-- restore button (if we have a modified row) -->
        <xsl:if test="$wrsRow[self::wrs:M]">
          <bcd-buttonng class="bcd-quickedit-action-restorerow" caption="{$I18N_TAG}bcd_widget_quickEdit_action_restorerecord"/>
        </xsl:if>
        <!-- controls -->
        <bcd-buttonng class="bcd-quickedit-action-close" caption="{$I18N_TAG}bcd_widget_quickEdit_action_close"/>
      </div>
    </div>
  </xsl:template>

  <xsl:template match="wrs:C">
    <xsl:param name="colPos" select="number(position())"/>
    <xsl:variable name="isModified" select=". != ../wrs:O[$colPos]"/>
    <xsl:variable name="caption" select="/*/wrs:Header/wrs:Columns/wrs:C[$colPos]/@caption"/>

    <div class="bcd-quickedit-input-container">
      <label>
        <div bcdTranslate="{$caption}">
          <xsl:attribute name="class">
            <xsl:text>bcd-quickedit-input-label</xsl:text>
            <xsl:if test="$isModified">
              <xsl:text> bcd-quickedit-input-ismodified</xsl:text>  
            </xsl:if>
          </xsl:attribute>
          <xsl:value-of select="$caption"/>
        </div>
        <div class="bcd-quickedit-widget" data-wrs-col-pos="{$colPos}"/>
      </label>
    </div>
  </xsl:template>
</xsl:stylesheet>