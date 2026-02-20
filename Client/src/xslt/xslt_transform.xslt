<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:fn="http://www.w3.org/2005/xpath-functions"
    xmlns:map="http://www.w3.org/2005/xpath-functions/map"
    version="3.0">

  <xsl:param name="sourceNode"/>
  <xsl:param name="stylesheetNode"/>
  <xsl:param name="stylesheetParams" as="map(*)" select="map{}"/>

  <xsl:variable name="paramsAsQNames" as="map(xs:QName, item()*)">
    <xsl:sequence select="map:merge(
        for $k in map:keys($stylesheetParams)
        return map {
          QName('', $k) : $stylesheetParams($k)
        }
      )"/>
  </xsl:variable>

  <xsl:template match="/">

    <xsl:variable name="innerResult" as="document-node()*">
      <xsl:sequence select="fn:transform(map {
          'stylesheet-node': $stylesheetNode
        , 'source-node': $sourceNode
        , 'stylesheet-params': $paramsAsQNames
        , 'destination': 'document'
      })?output"/>
    </xsl:variable>

    <xsl:copy-of select="$innerResult"/>

  </xsl:template>

</xsl:stylesheet>
