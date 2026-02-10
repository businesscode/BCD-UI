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

<!-- 
  Pagination renderer

  input:  enhanced configuration
  output: html
 -->
<xsl:stylesheet
  version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:far="http://www.businesscode.de/schema/bcdui/far-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  >
  <xsl:import href="../../widget/pagingPanel/pagingPanelStylesheet.xslt"/>

  <xsl:output method="html" standalone="yes" encoding="UTF-8" indent="no"/>

  <xsl:param name="bcdControllerVariableName"/>
  <xsl:param name="enhancedConfigModelId"/>
  <xsl:param name="farModel"/>
  <!-- data provider $/Root/* -->
  <xsl:param name="totalRowCountModel"/>

  <!--
    we work on internal xp:Paginate element located under root element of enhancedConfiguration,
    which translates far:Layout/far:Paginate to xp:Paginate
  -->
  <xsl:variable name="paginate" select="/*/xp:Paginate"/>

  <xsl:template match="/">
    <div>
      <!-- render pagination if pagination is enabled and we have data in the model -->
      <xsl:if test="$paginate and $farModel/*/wrs:Data/wrs:*">
        <xsl:call-template name="createPagingPanel">
          <xsl:with-param name="pageSize" select="$paginate/xp:PageSize"/>
          <xsl:with-param name="totalRowsCount" select="number($totalRowCountModel/*/*)"/>
          <xsl:with-param name="rowsCount" select="count($farModel/*/wrs:Data/wrs:*)"/>
          <xsl:with-param name="page" select="$paginate/xp:PageNumber"/>
          <xsl:with-param name="targetModelId" select="$enhancedConfigModelId"/>
          <xsl:with-param name="targetModelXPath">/*/xp:Paginate/xp:PageNumber</xsl:with-param>
          <xsl:with-param name="showAllOption" select="$paginate/xp:ShowAllOption"/>
          <xsl:with-param name="bcdControllerVariableName" select="$bcdControllerVariableName"/>
        </xsl:call-template>
      </xsl:if>
    </div>
  </xsl:template>
</xsl:stylesheet>
