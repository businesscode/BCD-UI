<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
  version="1.0"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:cust="http://www.businesscode.de/schema/bcdui/customization-1.0.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

  <!-- 
    extension: define CSS classes for dimensions / measures
   -->

  <xsl:import href="../../widgetNg/universalFilter/rendering.xslt"/>

  <xsl:output method="html" encoding="UTF-8" indent="no" media-type="text/html"/>

  <xsl:param name="cssClassPrefix" select="'bcd-unifilter-'"/>
  <!-- attribute name of which provides uniquelly generated node id -->
  <xsl:param name="nodeIdAttribute" select="'bcd-univ-node-id'"/>
  <!-- OptionsDataProvider -->
  <xsl:param name="bRefModel"/>
  <xsl:param name="universalFilterModel"/>

  <!-- extension point for css class name generation -->
  <xsl:template match="f:Expression" mode="class">
    <xsl:choose>
      <xsl:when test="$universalFilterModel/*/Item[@id=current()/@bRef]/@isDim"><xsl:text>bcd-far-dims</xsl:text></xsl:when>
      <xsl:otherwise><xsl:text>bcd-far-meas</xsl:text></xsl:otherwise>
    </xsl:choose>
  </xsl:template>
</xsl:stylesheet>