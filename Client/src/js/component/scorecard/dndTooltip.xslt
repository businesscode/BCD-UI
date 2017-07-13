<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:scc="http://www.businesscode.de/schema/bcdui/scorecard-1.0.0"
  xmlns:dm="http://www.businesscode.de/schema/bcdui/dimmeas-1.0.0"
  version="1.0"
>

<xsl:param name="bcdRowIdent"/>
<xsl:param name="bcdColIdent"/>
<xsl:param name="scConfig" select="/*[1=0]"/>
<xsl:param name="scorecardId"/>

<xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <xsl:variable name="itemId" select="substring-before($bcdRowIdent,'|')"/>
    <table class="bcdTooltip bcdScDndTooltip">
      <xsl:variable name="kpiNode" select="$scConfig/*/scc:Kpis/scc:Kpi[@id=substring-before($bcdRowIdent,'|')]"/>
      <tbody>
        <xsl:if test="$kpiNode and $kpiNode/scc:Description/.!=''">
          <tr><th><xsl:value-of select="$kpiNode/@caption"/></th></tr>
          <tr><td class="bcdLeft"><xsl:value-of select="$kpiNode/scc:Description"/></td></tr>
        </xsl:if>
      </tbody>
    </table>
  </xsl:template>

</xsl:stylesheet>