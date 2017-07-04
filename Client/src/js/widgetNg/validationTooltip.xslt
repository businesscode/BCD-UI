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
  xmlns="http://www.w3.org/1999/xhtml"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

  <!--
    TODO: rename and move, since this tooltip is general purpose widget tooltip / balloon renderer
   -->
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="no"/>

  <!-- its a default referencing the value in bcdui.i18n.I18N_TAG, but anyway explicitelly set during renderer creation -->
  <xsl:param name="I18N_TAG" select="'&#xE0FF;'"/>

  <!-- no output if we dont have data -->
  <xsl:template match="/Empty"/>

  <xsl:template match="/BalloonData">
    <div class="bcdWidgetBalloon">
      <xsl:apply-templates select="ValidationMessages"/>
      <xsl:apply-templates select="Tooltip"/>
    </div>
  </xsl:template>

  <xsl:template match="Tooltip">
    <span><xsl:apply-templates select="text()" mode="i18n"/></span>
  </xsl:template>

  <xsl:template match="ValidationMessages">
    <div class="bcdValidationMessages">
      <ul>
        <xsl:apply-templates select="Item"/>
      </ul>
    </div>
  </xsl:template>

  <xsl:template match="Item">
    <li><xsl:apply-templates select="text()" mode="i18n"/></li>
  </xsl:template>

  <!-- i18n handling: check if token is tagged with i18n tag, then treat it as i18n-key otherwise as plain-text -->
  <xsl:template match="text()" mode="i18n">
    <xsl:if test="starts-with(.,$I18N_TAG)">
      <xsl:attribute name="bcdTranslate"><xsl:value-of select="substring-after(.,$I18N_TAG)"/></xsl:attribute>
    </xsl:if>
    <xsl:value-of select="."/>
  </xsl:template>
</xsl:stylesheet>