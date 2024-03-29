<?xml version="1.0" encoding="UTF-8"?>

<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:guiStatus="http://www.businesscode.de/schema/bcdui/guiStatus-1.0.0"
  xmlns:wrq="http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" />

  <xsl:param name="keyStroke"/>
  <xsl:param name="bindingSet"/>
  <xsl:param name="bRef"/>
  <xsl:param name="rowEnd" select="'10'"/>
  <xsl:param name="filterDp" select="/*[0=1]"/>
  <xsl:param name="lookupType" select="'startswith'"/>

  <xsl:template match="/*">

    <wrq:WrsRequest>
      <wrq:Select rowEnd="{$rowEnd}">
        <wrq:Columns><wrq:C bRef="{$bRef}"/></wrq:Columns>
        <wrq:From>
          <wrq:BindingSet><xsl:value-of select="$bindingSet"/></wrq:BindingSet>
        </wrq:From>
        <f:Filter>
          <xsl:choose>
            <xsl:when test="$lookupType='contains'">
              <f:Expression op="like" ic="true" bRef="{$bRef}" value="{concat('*', $keyStroke, '*')}"/>
            </xsl:when>
            <xsl:when test="$lookupType='endswith'">
              <f:Expression op="like" ic="true" bRef="{$bRef}" value="{concat('*', $keyStroke)}"/>
            </xsl:when>
            <xsl:otherwise>
              <f:Expression op="like" ic="true" bRef="{$bRef}" value="{concat($keyStroke, '*')}"/>
            </xsl:otherwise>
          </xsl:choose>
          <xsl:copy-of select="$filterDp/*/*"/>
        </f:Filter>
        <wrq:Grouping>
          <wrq:C bRef="{$bRef}" />
        </wrq:Grouping>
        <wrq:Ordering>
          <wrq:C bRef="{$bRef}" />
        </wrq:Ordering>
      </wrq:Select>
    </wrq:WrsRequest>

  </xsl:template>

</xsl:stylesheet>