<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:cube="http://www.businesscode.de/schema/bcdui/cube-2.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  version="1.0"
>

<xsl:param name="bcdRowIdent"/>
<xsl:param name="bcdColIdent"/>
<xsl:param name="cubeConfig" select="/*[1=0]"/>
<xsl:param name="cubeId"/>

<xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <xsl:if test="$bcdRowIdent!=''">
      <table class="bcdTooltip bcdCubeDndTooltip">
        <xsl:variable name="node" select="$cubeConfig/*/dm:Dimensions/dm:LevelRef[@bRef=$bcdRowIdent]|$cubeConfig/*/dm:Measures/dm:Measure[@id=$bcdRowIdent]"/>
        <tbody>
          <!-- Only the description, the caption is already visible in the list. Empty output hides the tooltip -->
          <xsl:if test="normalize-space($node/@description)!=''">
            <tr><td class="bcdLeft"><xsl:value-of select="$node/@description" disable-output-escaping="yes"/></td></tr>
          </xsl:if>
        </tbody>
      </table>
    </xsl:if>
 </xsl:template>
</xsl:stylesheet>