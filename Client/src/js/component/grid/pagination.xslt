<?xml version="1.0" encoding="UTF-8"?>
<!--
  Copyright 2010-2019 BusinessCode GmbH, Germany

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
  xmlns:grid="http://www.businesscode.de/schema/bcdui/grid-1.0.0"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  >
  <xsl:import href="../../widget/pagingPanel/pagingPanelTemplate.xslt"/>

  <xsl:output method="html" standalone="yes" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:param name="bcdControllerVariableName"/>
  <xsl:param name="targetModelId"/>
  <xsl:param name="targetModel"/>
  <xsl:param name="gridModel"/>

  <xsl:variable name="paginate" select="/*/xp:Paginate"/>
  
  <xsl:variable name="page">
    <xsl:choose>
      <xsl:when test="$targetModel/*/xp:Paginate/xp:PageNumber"><xsl:value-of select="$targetModel/*/xp:Paginate/xp:PageNumber"/></xsl:when>
      <xsl:otherwise><xsl:value-of select="$paginate/xp:PageNumber"/></xsl:otherwise>
    </xsl:choose>
  </xsl:variable>

  <xsl:template match="/">
    <div>
      <!-- render pagination if pagination is enabled and we have data in the model -->
      <xsl:if test="$paginate and $gridModel/*/wrs:Data/wrs:*">
        <xsl:call-template name="createPagingPanel">
          <xsl:with-param name="pageSize" select="$paginate/xp:PageSize"/>
          <xsl:with-param name="totalRowsCount" select="count($gridModel/*/wrs:Data/wrs:*[not(@filtered)])"/>
          <xsl:with-param name="rowsCount" select="count($gridModel/*/wrs:Data/wrs:*[not(@filtered)])"/>
          <xsl:with-param name="page" select="$page"/>
          <xsl:with-param name="targetModelId" select="$targetModelId"/>
          <xsl:with-param name="targetModelXPath">/*/xp:Paginate/xp:PageNumber</xsl:with-param>
          <xsl:with-param name="showAllOption" select="$paginate/xp:ShowAllOption"/>
          <xsl:with-param name="bcdControllerVariableName" select="$bcdControllerVariableName"/>
        </xsl:call-template>
      </xsl:if>
    </div>
  </xsl:template>
</xsl:stylesheet>
