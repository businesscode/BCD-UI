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
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xp="http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0"
  xmlns:exslt="http://exslt.org/common"
  xmlns:msxsl="urn:schemas-microsoft-com:xslt"
  xmlns:generator="urn(bcd-xsltGenerator)">

  <msxsl:script language="JScript" implements-prefix="exslt">this['node-set'] = function (x) { return x; }</msxsl:script>

  <!--
    Apply cumulate, percentage of total or cumulate percentage of total on rows or on columns
    TODO support one-occurance-only for rows
    ToDo test with no-rowdim
    -->

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no" />

  <!-- Parameter model  -->
  <!-- (DOM) Parameter model according to xmlns http://www.businesscode.de/schema/bcdui/xsltParams-1.0.0 -->
  <xsl:param name="paramModel" select="/*[0=1]"/>
  <!-- (String) Optional specific parameter set ID  -->
  <xsl:param name="paramSetId"/>
  <!-- (NodeSet) As parameter or as default or specific parameter set from parameter model-->
  <xsl:param name="paramSet" select="$paramModel//xp:CumulAndPercOfTotal[@paramSetId=$paramSetId or not(@paramSetId) and not($paramSetId)]"/>

  <xsl:variable name="doc" select="/*"/>

  <xsl:key name="colHeadById"  match="/*/wrs:Header/wrs:Columns/wrs:C" use="@id"/>
  <xsl:key name="colHeadByPos" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@pos"/>
  <generator:Keys/>
  <xsl:variable name="firstColMeasurePos" select="number(/*/wrs:Header/wrs:Columns/wrs:C[contains(@id,'|')][1]/@pos)"/>

  <!-- We are creating here a structure indicating, which columns belong into a cumul-col group
    Sample &lt;C pos="7" sameColGroup=";4;;5;;6;;7;"/> -->
  <xsl:variable name="colPosGroupString">
    <CumulColGroup>
      <xsl:for-each select="/*/wrs:Header/wrs:Columns/wrs:C">
        <xsl:variable name="currId" select="@id"/>
        <xsl:variable name="currPos" select="position()"/>
        <generator:currColKeyLookup/>
        <C pos="{@pos}">
          <xsl:attribute name="sameColGroup">
            <xsl:for-each select="key('colDimsExclLastPlusValueIdKey',$currCumulDim)">
              <xsl:if test=".&lt;=$currPos">
                <xsl:value-of select="concat(';',.,';')"/>
              </xsl:if>
            </xsl:for-each>
          </xsl:attribute>
        </C>
      </xsl:for-each>
    </CumulColGroup>
  </xsl:variable>
  <xsl:variable name="colPosGroup" select="exslt:node-set($colPosGroupString)"/>


  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Copy 1:1
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <xsl:template match="@*|node()">
    <xsl:copy><xsl:apply-templates select="@*|node()"/></xsl:copy>
  </xsl:template>
  <xsl:template match="@*|node()" mode="cellCalc">
    <xsl:copy><xsl:apply-templates select="@*|node()"/></xsl:copy>
  </xsl:template>

  <xsl:template match="wrs:Columns/wrs:C">
    <xsl:copy>
      <xsl:copy-of select="@*"/>
      <xsl:variable name="colCumul" select="$paramSet/xp:ColCumulate/wrs:C[@valueId=current()/@valueId]/@type"/>
      <xsl:if test="$colCumul">
        <xsl:attribute name="bcdColCumulate"><xsl:value-of select="$colCumul"/></xsl:attribute>
      </xsl:if>
      <xsl:variable name="rowCumul" select="$paramSet/xp:RowCumulate/wrs:C[@valueId=current()/@valueId]/@type"/>
      <xsl:if test="$rowCumul">
        <xsl:attribute name="bcdRowCumulate"><xsl:value-of select="$rowCumul"/></xsl:attribute>
      </xsl:if>
      <xsl:apply-templates select="node()"/>
    </xsl:copy>
  </xsl:template>

  <!-- We walk cumulation-group wise through the data to have each row's pos within the group
     because we only want to cumulate the preceding ones -->
  <xsl:template match="wrs:Data">
    <xsl:copy>
      <xsl:copy-of select="@*"/>
      <xsl:choose>
        <xsl:when test="count($paramSet/xp:RowDimensions/xp:Columns/wrs:C)=0"> <!-- This is the no-row-dim case -->
          <xsl:apply-templates select="wrs:R">
            <xsl:with-param name="rowGroup" select="wrs:R"/>
          </xsl:apply-templates>
        </xsl:when>
        <xsl:otherwise>
          <xsl:for-each select="wrs:R">
            <!-- Rows taking part in the cumulation are handled in otherwise, the others are printed here as-is -->
            <xsl:choose>
              <xsl:when test="key('rowIsTotalKey',@id)">
                <xsl:apply-templates select=".">
                  <xsl:with-param name="rowGroup" select="."/>
                </xsl:apply-templates>
              </xsl:when>
              <xsl:otherwise>
                <generator:RowDimExclLastKeyOfRow/>
                <xsl:variable name="rowGroup" select="key('rowDimsExclLastKey',$rowDimExclLastKeyOfRow)"/>
                <xsl:if test="generate-id(.)=generate-id($rowGroup)">
                  <xsl:apply-templates select="$rowGroup">
                    <xsl:with-param name="rowGroup" select="$rowGroup"/>
                  </xsl:apply-templates>
                  <xsl:variable name="rowGroupTotal" select="key('rowDimsExclLastTotalKey',$rowDimExclLastKeyOfRow)"/>
                </xsl:if>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:for-each>
        </xsl:otherwise>
      </xsl:choose>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="wrs:R">
    <xsl:param name="rowGroup"/>
    <xsl:copy>
      <xsl:copy-of select="@*"/>
      <xsl:variable name="currRowPos" select="position()"/>
      <xsl:apply-templates select="wrs:C" mode="cellCalc">
        <xsl:with-param name="rowGroup" select="$rowGroup"/>
        <xsl:with-param name="currRowPos" select="$currRowPos"/>
      </xsl:apply-templates>
    </xsl:copy>
  </xsl:template>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Calculate column cumulate / cumulate percentage of totals / percentage of totals
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <generator:isColCumul>
    <xsl:template match="wrs:C[key('isColCumulKey',position()) and not(key('rowIsTotalKey',../@id))]" mode="cellCalc">
      <xsl:param name="rowGroup"/>
      <xsl:param name="currRowPos"/>
      <xsl:copy>
        <xsl:copy-of select="@*"/>
        <xsl:variable name="currRowGenId" select="generate-id(..)"/>
        <xsl:variable name="currColPos" select="position()"/>
        <xsl:value-of select="sum($rowGroup[position()&lt;=$currRowPos]/wrs:C[position()=$currColPos and number()=number()])"/>
      </xsl:copy>
    </xsl:template>

    <xsl:template match="wrs:C[key('isColCumulPercOfTotalKey',position()) and not(key('rowIsTotalKey',../@id))]" mode="cellCalc">
      <xsl:param name="rowGroup"/>
      <xsl:param name="currRowPos"/>
      <xsl:copy>
        <xsl:copy-of select="@*"/>
        <xsl:attribute name="unit">%</xsl:attribute>
        <xsl:variable name="currRowGenId" select="generate-id(..)"/>
        <xsl:variable name="currColPos" select="position()"/>
        <xsl:variable name="subTotal" select="sum($rowGroup/wrs:C[$currColPos])"/>
        <xsl:value-of select="sum($rowGroup[position()&lt;=$currRowPos]/wrs:C[position()=$currColPos and number()=number()]) div $subTotal"/>
      </xsl:copy>
    </xsl:template>

    <xsl:template match="wrs:C[key('isColPercOfTotalKey',position()) and not(key('rowIsTotalKey',../@id))]" mode="cellCalc">
      <xsl:param name="rowGroup"/>
      <xsl:param name="currRowPos"/>
      <xsl:copy>
        <xsl:copy-of select="@*"/>
        <xsl:attribute name="unit">%</xsl:attribute>
        <xsl:variable name="currColPos" select="position()"/>
        <xsl:variable name="subTotal" select="sum($rowGroup/wrs:C[position()=$currColPos and number()=number()])"/>
        <xsl:value-of select=". div $subTotal"/>
      </xsl:copy>
    </xsl:template>
  </generator:isColCumul>

  <!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    Calculate row cumulate / cumulate percentage of totals / percentage of totals
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ -->
  <generator:isRowCumul>
    <xsl:template match="wrs:C[key('isRowCumulKey',position()) and not(contains(key('colHeadByPos',position())/@id,'&#xE0F0;1'))]" mode="cellCalc">
      <xsl:copy>
        <xsl:copy-of select="@*"/>
        <xsl:variable name="currPos" select="position()"/>
        <xsl:variable name="currPosGroupMember" select="$colPosGroup/*/*[@pos=$currPos]/@sameColGroup"/>
        <xsl:variable name="currId" select="key('colHeadByPos',$currPos)/@id"/>
        <xsl:value-of select="sum(../wrs:C[contains($currPosGroupMember,concat(';',position(),';')) and number()=number()])"/>
      </xsl:copy>
    </xsl:template>

    <xsl:template match="wrs:C[key('isRowCumulPercOfTotalKey',position()) and not(contains(key('colHeadByPos',position())/@id,'&#xE0F0;1'))]" mode="cellCalc">
      <xsl:copy>
        <xsl:copy-of select="@*"/>
        <xsl:attribute name="unit">%</xsl:attribute>
        <xsl:variable name="currPos" select="position()"/>
        <xsl:variable name="currId" select="key('colHeadByPos',$currPos)/@id"/>
        <generator:currColKeyLookup/>
        <xsl:variable name="cumulSum" select="sum(../wrs:C[key('colHeadByPos',position())/@pos=key('colDimsExclLastPlusValueIdKey',$currCumulDim) and position()&lt;=$currPos and number()=number()])"/>
        <xsl:variable name="total"    select="$cumulSum + sum(../wrs:C[key('colHeadByPos',position())/@pos=key('colDimsExclLastPlusValueIdKey',$currCumulDim) and position()>$currPos and number()=number()])"/>
        <xsl:value-of select="$cumulSum div $total"/>
      </xsl:copy>
    </xsl:template>

    <xsl:template match="wrs:C[key('isRowPercOfTotalKey',position()) and not(contains(key('colHeadByPos',position())/@id,'&#xE0F0;1'))]" mode="cellCalc">
      <xsl:copy>
        <xsl:copy-of select="@*"/>
        <xsl:attribute name="unit">%</xsl:attribute>
        <xsl:variable name="currPos" select="position()"/>
        <xsl:variable name="currId" select="key('colHeadByPos',$currPos)/@id"/>
        <generator:currColKeyLookup/>
        <xsl:variable name="total" select="sum(../wrs:C[key('colHeadByPos',position())/@pos=key('colDimsExclLastPlusValueIdKey',$currCumulDim) and position()&lt;=$currPos and number()=number()])"/>
        <xsl:value-of select=". div $total"/>
      </xsl:copy>
    </xsl:template>
  </generator:isRowCumul>

</xsl:stylesheet>
