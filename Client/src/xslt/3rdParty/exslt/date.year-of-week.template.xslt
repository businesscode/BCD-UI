<?xml version="1.0"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:date="http://exslt.org/dates-and-times"
                extension-element-prefixes="date"
                version="1.0">

  <xsl:import href="date.week-in-year.template.xslt"/>

  <xsl:output method="text" version="1.0" encoding="UTF-8"/>


  <!--~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
   the template returns the year number of the week,
   where the date is
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~-->
  <xsl:template name="get-year-of-week">
    <xsl:param name="date-time" select="'2005-01-01T00:00:00Z'"/>

    <xsl:variable name="isoWeek">
      <xsl:call-template name="date:week-in-year">
        <xsl:with-param name="date-time" select="$date-time"/>
      </xsl:call-template>
    </xsl:variable>

    <xsl:variable name="year"><xsl:value-of select="substring($date-time,1,4)"/></xsl:variable>
    <xsl:variable name="month"><xsl:value-of select="substring($date-time,6,2)"/></xsl:variable>

    <xsl:choose>
      <xsl:when test="number($isoWeek) &gt; 30 and number($month) &lt; 3">
        <xsl:value-of select="number($year - 1)"/>
      </xsl:when>
      <xsl:when test="number($isoWeek) &lt; 10 and number($month) &gt; 10">
        <xsl:value-of select="number($year + 1)"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$year"/>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

</xsl:stylesheet>