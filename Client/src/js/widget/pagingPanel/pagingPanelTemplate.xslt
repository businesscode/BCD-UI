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
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

  <xsl:output method="html" standalone="yes" version="1.0" encoding="UTF-8" indent="no"/>


  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template name="createPagingPanel">
    <xsl:param name="pageSize"/>
    <!-- data rows count currently available to calculate total page count, must represent count(wrs:Data/*) -->
    <xsl:param name="rowsCount" />
    <!-- total rows count available on backend -->
    <xsl:param name="totalRowsCount" select="-1" />
    <xsl:param name="page" />
    <xsl:param name="targetModelId" />
    <xsl:param name="targetModelXPath" />
    <xsl:param name="bcdControllerVariableName"/>
    <xsl:param name="onChange" select="''"/>
    <xsl:param name="forwardsTitle" select="'forwards'"/>
    <xsl:param name="backwardsTitle" select="'backwards'"/>
    <xsl:param name="showAllOption" select="false"/>
    <xsl:param name="showAllTitle" select="'All'"/>

    <xsl:variable name="lastPage" select="(($rowsCount - ($rowsCount mod $pageSize)) div $pageSize) + 1*(boolean( ($rowsCount mod $pageSize) > 0))"/>

    <xsl:variable name="currentPage">
      <xsl:choose>
        <xsl:when test="$page!=''"><xsl:value-of select="$page"/></xsl:when>
        <xsl:otherwise>1</xsl:otherwise>
      </xsl:choose>
    </xsl:variable>

    <span class="bcdPagingPanel">
      <table db="currentPage={$currentPage} page={$page}" bcdOnLoad="bcdui.widget._pagingPanelInit(this);">
        <xsl:variable name="elId" select="concat('pageSelect_',$bcdControllerVariableName)"/>
        <tr>
          <td title="{$backwardsTitle}" class="actionBackwards bcdPagingButton" targetModelId="{$targetModelId}" targetModelXPath="{$targetModelXPath}" delta="-1" currentPage="{$currentPage}" lastPage="{$lastPage}" elementId="{$elId}" paginatedAction="{$onChange}">&#x25C4;&#x25C4;</td>

          <td class="bcdPagingSelectAction">
            <select class='form-control' id="{$elId}" targetModelId="{$targetModelId}" targetModelXPath="{$targetModelXPath}" paginatedAction="{$onChange}">
              <xsl:call-template name="createOptions">
                <xsl:with-param name="rowsCount"><xsl:value-of select="$rowsCount"/></xsl:with-param>
                <xsl:with-param name="lastPage"><xsl:value-of select="$lastPage"/></xsl:with-param>
                <xsl:with-param name="pageSize"><xsl:value-of select="$pageSize"/></xsl:with-param>
                <xsl:with-param name="currentPage"><xsl:value-of select="$currentPage"/></xsl:with-param>
              </xsl:call-template>
              <xsl:if test="$showAllOption = 'true'">
                <option value="all">
                  <xsl:if test="$currentPage = 'all'">
                    <xsl:attribute name="selected">selected</xsl:attribute>
                  </xsl:if>
                  <xsl:value-of select='$showAllTitle'/>
                </option>
              </xsl:if>
            </select>
          </td>

          <td class="bcdPagingCoutOfElements"> of <xsl:choose><xsl:when test="$totalRowsCount >= 0"><xsl:value-of select="$totalRowsCount"/></xsl:when><xsl:otherwise><xsl:value-of select="$rowsCount"/></xsl:otherwise></xsl:choose></td>
          <td title="{$forwardsTitle}" class="actionForwards bcdPagingButton" targetModelId="{$targetModelId}" targetModelXPath="{$targetModelXPath}" delta="1" currentPage="{$currentPage}" lastPage="{$lastPage}" elementId="{$elId}" paginatedAction="{$onChange}">&#x25BA;&#x25BA;</td>
        </tr>
      </table>
    </span>

  </xsl:template>


  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->

  <xsl:template name="createOptions">
    <xsl:param name="pageNum" select="1"/>
    <xsl:param name="rowsCount"/>
    <xsl:param name="lastPage"/>
    <xsl:param name="pageSize"/>
    <xsl:param name="currentPage"/>
    <xsl:if test="not($pageNum > $lastPage)">
      <xsl:choose>
        <xsl:when test="$pageNum = $lastPage">
          <option value="{$pageNum}">
            <xsl:if test="$pageNum = $currentPage">
              <xsl:attribute name="selected">selected</xsl:attribute>
            </xsl:if>
            <xsl:variable name="value">
              <xsl:value-of select="($pageSize * ($pageNum - 1 )) + 1*(boolean($rowsCount>0))" />
              -
              <xsl:choose>
                <xsl:when test="$pageSize * $pageNum > $rowsCount">
                  <xsl:value-of select="$rowsCount" />
                </xsl:when>
                <xsl:otherwise>
                  <xsl:value-of select="$pageSize * $pageNum" />
                </xsl:otherwise>
              </xsl:choose>
            </xsl:variable>
            <xsl:value-of select="normalize-space($value)" />
          </option>
        </xsl:when>
        <xsl:otherwise>
          <xsl:variable name="vMid" select="floor(($pageNum + $lastPage) div 2)" />
          <xsl:call-template name="createOptions">
            <xsl:with-param name="pageNum" select="$pageNum" />
            <xsl:with-param name="rowsCount" select="$rowsCount" />
            <xsl:with-param name="lastPage" select="$vMid" />
            <xsl:with-param name="pageSize" select="$pageSize" />
            <xsl:with-param name="currentPage" select="$currentPage" />
          </xsl:call-template>
          <xsl:call-template name="createOptions">
            <xsl:with-param name="pageNum" select="$vMid+1" />
            <xsl:with-param name="rowsCount" select="$rowsCount" />
            <xsl:with-param name="lastPage" select="$lastPage" />
            <xsl:with-param name="pageSize" select="$pageSize" />
            <xsl:with-param name="currentPage" select="$currentPage" />
          </xsl:call-template>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:if>
  </xsl:template>

</xsl:stylesheet>
