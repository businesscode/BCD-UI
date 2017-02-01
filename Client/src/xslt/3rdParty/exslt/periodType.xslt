<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:date="http://exslt.org/dates-and-times"
    version="1.0"
    extension-element-prefixes="date">

<xsl:import href="date.year-of-week.template.xslt"/>
<xsl:import href="date.add.template.xslt"/>


<!-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  The template computes chosen period, may be
        'd' (day)
        'w' (week)
        'm' (month)
        'r' (range) like between
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~-->

  <xsl:template name="periodType">
    <xsl:param name="startDate"/>
    <xsl:param name="endDate"/>
    <xsl:variable name="startMonth" select="number(substring($startDate, 6, 2))"/>
    <xsl:variable name="endMonth" select="number(substring($endDate, 6, 2))"/>
    <xsl:variable name="startDay" select="number(substring($startDate, 9, 2))"/>

    <xsl:variable name="weekValidEndDate">
      <xsl:call-template name="date:add">
        <xsl:with-param name="date-time" select="$startDate"/>
        <xsl:with-param name="duration" select="'P6D'"/>
      </xsl:call-template>
    </xsl:variable>

    <xsl:variable name="monthLength">
      <xsl:call-template name="date:get-month-length">
        <xsl:with-param name="month-no" select="$endMonth"></xsl:with-param>
      </xsl:call-template>
    </xsl:variable>

    <xsl:variable name="monthValidEndDate">
      <xsl:variable name="incStartDate">
        <xsl:call-template name="date:add">
          <xsl:with-param name="date-time" select="$startDate"/>
          <xsl:with-param name="duration" select="'P1M'"/>
        </xsl:call-template>
      </xsl:variable>

      <xsl:call-template name="date:add">
        <xsl:with-param name="date-time" select="$incStartDate"/>
        <xsl:with-param name="duration" select="'-P1D'"/>
      </xsl:call-template>
    </xsl:variable>

    <xsl:variable name="startWeekNumber">
      <xsl:call-template name="date:week-in-year">
        <xsl:with-param name="date-time" select="$startDate"></xsl:with-param>
      </xsl:call-template>
    </xsl:variable>

    <xsl:variable name="endWeekNumber">
      <xsl:call-template name="date:week-in-year">
        <xsl:with-param name="date-time" select="$endDate"></xsl:with-param>
      </xsl:call-template>
    </xsl:variable>

    <xsl:variable name="type_raw">
      <xsl:choose>
        <xsl:when test="not($startDate != $endDate)">d</xsl:when>
        <xsl:when test="not($weekValidEndDate != $endDate) and $startWeekNumber = $endWeekNumber">w</xsl:when>
        <xsl:when test="$startDay = 1 and not($endDate != $monthValidEndDate)">m</xsl:when>
        <xsl:otherwise>r</xsl:otherwise>
      </xsl:choose>
    </xsl:variable>

    <xsl:value-of select="normalize-space($type_raw)"/>

  </xsl:template>
</xsl:stylesheet>