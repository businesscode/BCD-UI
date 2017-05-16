<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:guiStatus="http://www.businesscode.de/schema/bcdui/guiStatus-1.0.0"
  version="1.0"
>

<xsl:param name="bcdRowIdent"/>
<xsl:param name="scConfig" select="/*[1=0]"/>
<xsl:param name="scorecardId"/>


<xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <table class="bcdTooltip">
      <xsl:variable name="dimNode" select="/*/scc:Layout[@scorecardId=$scorecardId]/scc:Dimensions/*/dm:LevelRef[@bRef=substring-before($bcdRowIdent,'|')]"/>
      <xsl:variable name="kpiNode" select="$scConfig/*/scc:Kpis/scc:Kpi[@id=substring-before($bcdRowIdent,'|')]"/>
      <tbody>
        <xsl:if test="$kpiNode and $kpiNode/scc:Description/.!=''">
          <tr><th><xsl:value-of select="$kpiNode/@caption"/></th></tr>
          <tr><td class="bcdLeft"><xsl:value-of select="$kpiNode/scc:Description"/></td></tr>
        </xsl:if>
        <xsl:if test="$dimNode/@bcdModified!=''">
          <tr><th><xsl:value-of select="/*/scc:Layout[@scorecardId=$scorecardId]/scc:Dimensions/*/dm:LevelRef[@bRef=substring-before($bcdRowIdent,'|')]/@caption"/></th></tr>
          <xsl:if test="$dimNode/@total='trailing'"><tr><td class="bcdLeft">shows total values</td></tr></xsl:if>
          <xsl:if test="not($dimNode/@total)"><tr><td class="bcdLeft">hides total values</td></tr></xsl:if>
        </xsl:if>
      </tbody>
    </table>
  </xsl:template>

</xsl:stylesheet>