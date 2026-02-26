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
  xmlns:gen="http://businesscode.de/generated"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0">

  <xsl:output method="xml" version="1.0" encoding="UTF-8"/>

  <xsl:variable name="invalidDateRange">The "From" date should be less or equal to the "To" date.</xsl:variable>
  <xsl:variable name="invalidDateFormat">Invalid format.</xsl:variable>
  <xsl:variable name="emptyDate">Empty value.</xsl:variable>

  <xsl:template name="validateDate">
    <xsl:param name="value"/>
    <xsl:param name="mandatory"/>
    <xsl:choose>
      <xsl:when test="string-length($value) = 0">
        <xsl:if test="$mandatory = 'true'"><xsl:value-of select="$emptyDate"/></xsl:if>
      </xsl:when>
      <!-- checking date with timespan first: for backwards compatibilty we allow a stamp to be delimited by either ' ' or 'T', xs:dateTime is only implemented partially up to now -->
      <xsl:when test="string-length($value) = 19 and substring($value,5,1) = '-' and substring($value,8,1) = '-' and contains(' T',substring($value,11,1)) and substring($value,14,1) = ':' and substring($value,17,1) = ':'">
        <xsl:variable name="yearToken" select="number(substring($value,1,4))"/>
        <xsl:variable name="monthToken" select="number(substring($value,6,2))"/>
        <xsl:variable name="dayToken" select="number(substring($value,9,2))"/>
        <xsl:variable name="hourToken" select="substring($value,12,2)"/>
        <xsl:variable name="minuteToken" select="substring($value,15,2)"/>
        <xsl:variable name="secondToken" select="substring($value,18,2)"/>
        <xsl:choose>

          <xsl:when test="string-length(normalize-space(substring($value,1,4))) != 4"><xsl:value-of select="$invalidDateFormat"/>4</xsl:when>
          <xsl:when test="string-length(normalize-space(substring($value,6,2))) != 2"><xsl:value-of select="$invalidDateFormat"/>6</xsl:when>
          <xsl:when test="string-length(normalize-space(substring($value,9,2))) != 2"><xsl:value-of select="$invalidDateFormat"/>6</xsl:when>
          <xsl:when test="string-length(normalize-space(substring($value,12,2))) != 2"><xsl:value-of select="$invalidDateFormat"/>7</xsl:when>
          <xsl:when test="string-length(normalize-space(substring($value,15,2))) != 2"><xsl:value-of select="$invalidDateFormat"/>8</xsl:when>
          <xsl:when test="string-length(normalize-space(substring($value,18,2))) != 2"><xsl:value-of select="$invalidDateFormat"/>9</xsl:when>

          <xsl:when test="not(number($yearToken)) or not(number($monthToken)) or not(number($dayToken)) or string(number($hourToken)) = 'NaN' or string(number($minuteToken)) = 'NaN' or string(number($secondToken)) = 'NaN'"><xsl:value-of select="$invalidDateFormat"/></xsl:when>
          <xsl:when test="(number($hourToken) &gt; 23) or (number($minuteToken) &gt; 59) or (number($secondToken) &gt; 59)"><xsl:value-of select="$invalidDateFormat"/></xsl:when>
          <xsl:when test="(number($hourToken) &lt; 0) or (number($minuteToken) &lt; 0) or (number($secondToken) &lt; 0)"><xsl:value-of select="$invalidDateFormat"/></xsl:when>
          <xsl:otherwise>
            <xsl:choose>
              <xsl:when test="number($monthToken) = 2">
                <xsl:choose>
                  <xsl:when test="(((number($yearToken) mod 4) = 0 and (number($yearToken) mod 100) != 0) or ((number($yearToken) mod 400) = 0))">
                    <xsl:if test="number($dayToken) &lt; 1 or number($dayToken) &gt; 29"><xsl:value-of select="$invalidDateFormat"/>11</xsl:if>
                  </xsl:when>
                  <xsl:otherwise>
                    <xsl:if test="number($dayToken) &lt; 1 or number($dayToken) &gt; 28"><xsl:value-of select="$invalidDateFormat"/>12</xsl:if>
                  </xsl:otherwise>
                </xsl:choose>
              </xsl:when>
              <xsl:otherwise>
                <xsl:if test="$monthToken &lt; 1 or $monthToken &gt; 12 or $yearToken &lt; 1 or (($monthToken &lt; 7 and $monthToken mod 2 = 0 and $dayToken &gt; 30) or ($monthToken &gt; 7 and $monthToken mod 2 != 0 and $dayToken &gt; 30)) or $dayToken &gt; 31"><xsl:value-of select="$invalidDateFormat"/>13</xsl:if>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:when>
      <xsl:when test="string-length($value) = 10 and substring($value,5,1) = '-' and substring($value,8,1) = '-'">
        <xsl:variable name="yearToken" select="number(substring($value,1,4))"/>
        <xsl:variable name="monthToken" select="number(substring($value,6,2))"/>
        <xsl:variable name="dayToken" select="number(substring($value,9,2))"/>
        <xsl:choose>

          <xsl:when test="string-length(normalize-space(substring($value,1,4))) != 4"><xsl:value-of select="$invalidDateFormat"/></xsl:when>
          <xsl:when test="string-length(normalize-space(substring($value,6,2))) != 2"><xsl:value-of select="$invalidDateFormat"/></xsl:when>
          <xsl:when test="string-length(normalize-space(substring($value,9,2))) != 2"><xsl:value-of select="$invalidDateFormat"/></xsl:when>

          <xsl:when test="not(number($yearToken)) or not(number($monthToken)) or not(number($dayToken))"><xsl:value-of select="$invalidDateFormat"/></xsl:when>
          <xsl:otherwise>
            <xsl:choose>
              <xsl:when test="number($monthToken) = 2">
                <xsl:choose>
                  <xsl:when test="(((number($yearToken) mod 4) = 0 and (number($yearToken) mod 100) != 0) or ((number($yearToken) mod 400) = 0))">
                    <xsl:if test="number($dayToken) &lt; 1 or number($dayToken) &gt; 29"><xsl:value-of select="$invalidDateFormat"/></xsl:if>
                  </xsl:when>
                  <xsl:otherwise>
                    <xsl:if test="number($dayToken) &lt; 1 or number($dayToken) &gt; 28"><xsl:value-of select="$invalidDateFormat"/></xsl:if>
                  </xsl:otherwise>
                </xsl:choose>
              </xsl:when>
              <xsl:otherwise>
                <xsl:if test="$monthToken &lt; 1 or $monthToken &gt; 12 or $yearToken &lt; 1 or (($monthToken &lt; 7 and $monthToken mod 2 = 0 and $dayToken &gt; 30) or ($monthToken &gt; 7 and $monthToken mod 2 != 0 and $dayToken &gt; 30)) or $dayToken &gt; 31"><xsl:value-of select="$invalidDateFormat"/></xsl:if>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:otherwise>
        </xsl:choose>
      </xsl:when>
      <xsl:otherwise><xsl:value-of select="$invalidDateFormat"/></xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template name="validateTwoDates">
    <xsl:param name="from"/>
    <xsl:param name="to"/>

    <xsl:choose>
      <xsl:when test="$from and $to">
        <xsl:variable name="yearTokenFrom" select="number(substring($from,1,4))"/>
        <xsl:variable name="yearTokenTo" select="number(substring($to,1,4))"/>
        <xsl:choose>
          <xsl:when test="$yearTokenFrom &gt; $yearTokenTo"><xsl:value-of select="$invalidDateRange"/></xsl:when>
          <xsl:when test="$yearTokenFrom = $yearTokenTo">
            <xsl:variable name="monthTokenFrom" select="number(substring($from,6,2))"/>
            <xsl:variable name="monthTokenTo" select="number(substring($to,6,2))"/>
            <xsl:choose>
              <xsl:when test="$monthTokenFrom &gt; $monthTokenTo"><xsl:value-of select="$invalidDateRange"/></xsl:when>
              <xsl:when test="$monthTokenFrom = $monthTokenTo">
                <xsl:variable name="dayTokenFrom" select="number(substring($from,9,2))"/>
                <xsl:variable name="dayTokenTo" select="number(substring($to,9,2))"/>
                <xsl:if test="$dayTokenFrom &gt; $dayTokenTo"><xsl:value-of select="$invalidDateRange"/></xsl:if>
                <xsl:if test="$dayTokenFrom = $dayTokenTo">
                  <xsl:if test="string-length($from) = 19">
                    <xsl:variable name="hourTokenFrom" select="number(substring($from,12,2))"/>
                    <xsl:variable name="minuteTokenFrom" select="number(substring($from,15,2))"/>
                    <xsl:variable name="secondTokenFrom" select="number(substring($from,18,2))"/>
                    <xsl:variable name="hourTokenTo" select="number(substring($to,12,2))"/>
                    <xsl:variable name="minuteTokenTo" select="number(substring($to,15,2))"/>
                    <xsl:variable name="secondTokenTo" select="number(substring($to,18,2))"/>
                    <xsl:choose>
                      <xsl:when test="$hourTokenFrom &gt; $hourTokenTo"><xsl:value-of select="$invalidDateRange"/></xsl:when>
                      <xsl:when test="$hourTokenFrom = $hourTokenTo">
                        <xsl:choose>
                          <xsl:when test="$minuteTokenFrom &gt; $minuteTokenTo"><xsl:value-of select="$invalidDateRange"/></xsl:when>
                          <xsl:when test="$minuteTokenFrom = $minuteTokenTo">
                            <xsl:choose>
                              <xsl:when test="$secondTokenFrom &gt; $secondTokenTo"><xsl:value-of select="$invalidDateRange"/></xsl:when>
                            </xsl:choose>
                          </xsl:when>
                        </xsl:choose>
                      </xsl:when>
                    </xsl:choose>
                  </xsl:if>
                </xsl:if>
              </xsl:when>
            </xsl:choose>
          </xsl:when>
        </xsl:choose>
      </xsl:when>
      <xsl:when test="$from or $to"><xsl:value-of select="$emptyDate"/></xsl:when>
    </xsl:choose>
  </xsl:template>

</xsl:stylesheet>