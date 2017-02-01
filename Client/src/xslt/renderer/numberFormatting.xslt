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
  This stylesheet offers a utility function for formatting numbers in a wrs
  document. It is used by various stylesheets working with the wrs format like
  "htmlBuilder.xslt"

 -->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">

  <!--
      This template formats a number according to the rules specified by the wrs column
      definition an cell overrides.
      Global param:
      decimalFormatName: 'enDecimalFormat' or 'deDecimalFormat', default is 'enDecimalFormat'
      Template param:
      value: the value, if not given the current context node is used
    -->
  <xsl:param name="bcdI18nModel" select="*[false()]"/>

  <xsl:variable name="defaultDecimalFormatNameI18n" select="$bcdI18nModel/*/bcd_DecimalFormat"/>
  <xsl:variable name="defaultDecimalFormatName">
    <xsl:choose>
      <xsl:when test="$defaultDecimalFormatNameI18n"><xsl:value-of select="$defaultDecimalFormatNameI18n"/></xsl:when>
      <xsl:otherwise>enDecimalFormat</xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:variable name="defaultFormattingPattern">
    <xsl:choose>
      <xsl:when test="$defaultDecimalFormatName='enDecimalFormat'">#,##0.</xsl:when>
      <xsl:when test="$defaultDecimalFormatName='deDecimalFormat'">#.##0,</xsl:when>
      <xsl:otherwise>#,##0.</xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:variable name="defaultFormattingPatternInteger">
    <xsl:choose>
      <xsl:when test="$defaultDecimalFormatName='enDecimalFormat'">#,##0</xsl:when>
      <xsl:when test="$defaultDecimalFormatName='deDecimalFormat'">#.##0</xsl:when>
      <xsl:otherwise>#,##0</xsl:otherwise>
    </xsl:choose>
  </xsl:variable>
  <xsl:decimal-format name="enDecimalFormat" NaN="" infinity="" digit="#" decimal-separator="." grouping-separator="," pattern-separator="|"/>
  <xsl:decimal-format name="deDecimalFormat" NaN="" infinity="" digit="#" decimal-separator="," grouping-separator="." pattern-separator="|"/>

  <xsl:key name="columnHeaderByPos" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@pos"/>

  <xsl:template name="formatNumber">
    <xsl:param name="columnDefinition" select="*[1=0]"/>
    <xsl:param name="value" select="."/>
    <xsl:param name="unit"/>
    <xsl:param name="scale"/>

    <xsl:variable name="effectiveUnit">
      <xsl:choose>
        <xsl:when test="$unit">
          <xsl:value-of select="$unit"/>
        </xsl:when>
        <xsl:when test="@unit">
          <xsl:value-of select="@unit"/>
        </xsl:when>
        <xsl:when test="$columnDefinition/@unit">
          <xsl:value-of select="$columnDefinition/@unit"/>
        </xsl:when>
      </xsl:choose>
    </xsl:variable>
    <xsl:variable name="percentUnit">
      <xsl:if test="$effectiveUnit='%'">%</xsl:if>
    </xsl:variable>
    <xsl:variable name="nonPercentUnit">
      <xsl:if test="string-length($effectiveUnit)>0 and $effectiveUnit!='%'">
        <!-- we delay this parsing as long as possible and parse only once. that's why it is nested, not added to test above -->
        <xsl:variable name="valueNum" select="number($value)"/>
        <xsl:if test="$valueNum=$valueNum">
          <xsl:value-of select="concat(' ',$effectiveUnit)"/>
        </xsl:if>
      </xsl:if>
    </xsl:variable>

    <!-- Scale defines the shown precision.
         If abs(scale) is less than 10, it gives the decimal digits. If positive, trailing 0 are preserved.
         If it is greater it is rounded to the nearest multiple of scale. If positive, trailing 0 are preserved. Negative here is only allowed for 10 pow n.
         Sample (in US format) for 14990.404: scale 2 -> 1490.40, scale -2 -> 1490.4, scale 1000 -> 15,000, scale -1000 -> 1.5
         (Implementation note, we cannot use shorter number(@scale|$columnDefinition/@scale) because document order is wrong priority order)
     -->
    <xsl:variable name="effectiveScale">
      <xsl:choose>
        <xsl:when test="$scale">
          <xsl:value-of select="$scale"/>
        </xsl:when>
        <xsl:when test="@scale">
          <xsl:value-of select="@scale"/>
        </xsl:when>
        <xsl:when test="$columnDefinition/@scale">
          <xsl:value-of select="$columnDefinition/@scale"/>
        </xsl:when>
      </xsl:choose>
    </xsl:variable>

    <xsl:choose>
      <xsl:when test="$effectiveScale > 10">
        <xsl:value-of select="concat(format-number(round($value div $effectiveScale) * $effectiveScale, concat($defaultFormattingPatternInteger, $percentUnit), $defaultDecimalFormatName), $nonPercentUnit)"/>
      </xsl:when>
      <xsl:when test="$effectiveScale &lt; -10">
        <xsl:value-of select="concat(format-number(round($value div $effectiveScale) * -1, concat($defaultFormattingPatternInteger, $percentUnit), $defaultDecimalFormatName), $nonPercentUnit)"/>
      </xsl:when>
      <xsl:when test="$effectiveScale > 0">
        <xsl:value-of select="concat(format-number($value, concat($defaultFormattingPattern, substring('000000000000000000000000000000000000000', 1, $effectiveScale), $percentUnit), $defaultDecimalFormatName), $nonPercentUnit)"/>
      </xsl:when>
      <xsl:when test="$effectiveScale &lt; 0">
        <xsl:value-of select="concat(format-number($value, concat($defaultFormattingPattern, substring('#######################################', 1, -1*$effectiveScale), $percentUnit), $defaultDecimalFormatName), $nonPercentUnit)"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="concat(format-number($value, concat($defaultFormattingPatternInteger,$percentUnit), $defaultDecimalFormatName), $nonPercentUnit)"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

</xsl:stylesheet>
