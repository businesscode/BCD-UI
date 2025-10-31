<?xml version="1.0" encoding="UTF-8"?>
<!--
  Copyright 2010-2025 BusinessCode GmbH, Germany

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
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:cube="http://www.businesscode.de/schema/bcdui/cube-2.0.0"
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  version="1.0" >

  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes" />

  <xsl:param name="hasUserEditRole" />
  <xsl:param name="metaDataModel"/>
  <xsl:param name="metaDataModelId"/>
  <xsl:param name="targetModelId"/>
  <xsl:param name="progressGifUrl"/>
  <xsl:param name="reportName"/>
  <xsl:param name="objectId"/>

  <xsl:variable name="boolHasUserEditRole" select="boolean(translate($hasUserEditRole,'0false',''))"/>
  <xsl:template match="/">
    <div class="bcdReportTemplates">

      <xsl:attribute name="bcdTargetModelId"><xsl:value-of select="$targetModelId"/></xsl:attribute>
      <xsl:attribute name="bcdMetaDataModelId"><xsl:value-of select="$metaDataModelId"/></xsl:attribute>

      <div class="bcdReportTemplateList">

        <!--  render general commands -->
        <div class="bcdReportTemplateButtons">

          <xsl:call-template name="renderEditorLink"/>

          <a objectId='{$objectId}' class='bcdAction clear'>
            <span class="bcdTemplateItem bcdTemplateIcon"></span>
            <span>Clear current selection</span>
          </a>
        </div>

        <!-- user template editor -->

        <xsl:call-template name="renderEditorArea"/>

        <!-- readOnly layouts -->

        <xsl:if test="count($metaDataModel/*/*[local-name()='Layouts']/*[local-name()='Layout' and @isReadOnly='true' and (not(@isHidden) or @isHidden='false')]) &gt; 0">
          <div class="bcdReportTemplatesItemsReadOnly">
            <xsl:for-each select="$metaDataModel/*/*[local-name()='Layouts']/*[local-name()='Layout' and @isReadOnly='true']">
             <xsl:variable name="delTempButton" select="concat('delTempButt_', @id)" />
             <xsl:variable name="tempCaptionButton" select="concat('tempCaptionButt_', @id)" />
              <a class='bcdAction apply' objectId='{$objectId}' templateId='{@id}'>
                <span class="bcdTemplateItem bcdTemplateIcon"></span>
                <span id="{$tempCaptionButton}" class="bcdTemplateItem" title="{@description}">
                  <xsl:value-of select="@name"/>
                </span>
              </a>
            </xsl:for-each>
          </div>

        </xsl:if>

        <!-- not readOnly layouts -->

        <xsl:if test="count($metaDataModel/*/*[local-name()='Layouts']/*[local-name()='Layout' and (not(@isReadOnly) or @isReadOnly='false') and (not(@isHidden) or @isHidden='false')]) &gt; 0">
          <div class="bcdReportTemplatesItems">
            <xsl:for-each select="$metaDataModel/*/*[local-name()='Layouts']/*[local-name()='Layout' and (not(@isReadOnly) or @isReadOnly='false') and (not(@isHidden) or @isHidden='false')]">
              <xsl:variable name="delTempButton" select="concat('delTempButt_', @id)" />
              <xsl:variable name="tempCaptionButton" select="concat('tempCaptionButt_', @id)" />
              <a class='bcdAction apply' objectId='{$objectId}' templateId='{@id}'>
                <span class="bcdTemplateItem bcdTemplateIcon"></span>
                <span id="{$tempCaptionButton}" class="bcdTemplateItem" title="{@description}">
                  <xsl:value-of select="@name"/>
                </span>
                <xsl:call-template name="renderDelButton"><xsl:with-param name="id" select="@id"/></xsl:call-template>
              </a>
            </xsl:for-each>
          </div>
        </xsl:if>

       </div>
    </div>
  </xsl:template>

  <xsl:template name="renderEditorLink"></xsl:template>
  <xsl:template name="renderEditorArea"></xsl:template>
  <xsl:template name="renderDelButton"><xsl:param name="id"/></xsl:template>
    

</xsl:stylesheet>
