<?xml version="1.0" encoding="UTF-8"?>

<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:guiStatus="http://www.businesscode.de/schema/bcdui/guiStatus-1.0.0"
  xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" />

  <xsl:param name="keyStroke"/>
  <xsl:param name="bindingSet"/>
  <xsl:param name="bRefCode"/>
  <xsl:param name="bRefCaption"/>
  <xsl:param name="rowEnd" select="'10'"/>
  <xsl:param name="filterDp" select="/*[0=1]"/>
  <xsl:param name="lookupType" select="'startswith'"/>
  <xsl:param name="preload" select="'false'"/>

  <xsl:template match="/*">

    <xsl:variable name="loadAll" select="boolean($preload='true')"/>

    <wrq:WrsRequest>
      <wrq:Select>
        <xsl:if test="not($loadAll)">
          <xsl:attribute name="rowEnd"><xsl:value-of select="$rowEnd"/></xsl:attribute>
        </xsl:if>
        <wrq:Columns>
          <wrq:C bRef="{$bRefCaption}"/>
          <xsl:if test="$bRefCaption!=$bRefCode">
            <wrq:C bRef="{$bRefCode}"/>
          </xsl:if>
        </wrq:Columns>
        <wrq:From>
          <wrq:BindingSet><xsl:value-of select="$bindingSet"/></wrq:BindingSet>
        </wrq:From>
        <f:Filter>
          <xsl:if test="not($loadAll)">
            <xsl:choose>
              <xsl:when test="$lookupType='contains'">
                <f:Expression op="like" ic="true" bRef="{$bRefCaption}" value="{concat('*', $keyStroke, '*')}"/>
              </xsl:when>
              <xsl:when test="$lookupType='endswith'">
                <f:Expression op="like" ic="true" bRef="{$bRefCaption}" value="{concat('*', $keyStroke)}"/>
              </xsl:when>
              <xsl:otherwise>
                <f:Expression op="like" ic="true" bRef="{$bRefCaption}" value="{concat($keyStroke, '*')}"/>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:if>
          <xsl:copy-of select="$filterDp/*/*"/>
        </f:Filter>
        <wrq:Grouping>
          <wrq:C bRef="{$bRefCaption}"/>
          <xsl:if test="$bRefCaption!=$bRefCode">
            <wrq:C bRef="{$bRefCode}"/>
          </xsl:if>
        </wrq:Grouping>
        <wrq:Ordering>
          <wrq:C bRef="{$bRefCaption}"/>
        </wrq:Ordering>
      </wrq:Select>
    </wrq:WrsRequest>

  </xsl:template>

</xsl:stylesheet>