<?xml version="1.0"?>
<xsl:stylesheet version="1.0"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:date="http://exslt.org/dates-and-times"
                extension-element-prefixes="date">

<!--
  This source is taken or derived from http://www.exslt.org
  -->

<xsl:param name="date:date-time" select="'2000-01-01T00:00:00Z'" />

<!--~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  the Template compute and returns
  ISO Week number of handed over date-time
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~-->
  <xsl:template name="date:week-in-year">
    <xsl:param name="date-time" select="$date:date-time"/>

    <xsl:variable name="year" select="substring($date-time, 1,4)"/>
    <xsl:variable name="month" select="substring($date-time, 6,2)"/>
    <xsl:variable name="day" select="substring($date-time, 9,2)"/>

    <xsl:variable name="varA" select="floor(( 14 - $month) div 12)"/>
    <xsl:variable name="varY" select="$year + 4800 - $varA"/>
    <xsl:variable name="varM" select="$month + (12 * $varA) - 3"/>
    <xsl:variable name="varJ" select="$day + floor((153 * $varM + 2) div 5) + (365 * $varY) + floor($varY div 4) - floor($varY div 100) + floor($varY div 400) - 32045"/>
    <xsl:variable name="varD4" select="($varJ + 31741 - ($varJ mod 7)) mod 146097 mod 36524 mod 1461"/>
    <xsl:variable name="varL" select="floor($varD4 div 1460)"/>
    <xsl:variable name="varD1" select="(($varD4 - $varL) mod 365) + $varL"/>
    <xsl:variable name="isoWeek" select="floor($varD1 div 7) + 1"/>

    <xsl:value-of select="$isoWeek"/>

  </xsl:template>

</xsl:stylesheet>