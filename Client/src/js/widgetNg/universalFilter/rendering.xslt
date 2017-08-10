<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet
  version="1.0"
  xmlns:f="http://www.businesscode.de/schema/bcdui/filter-1.0.0"
  xmlns:cust="http://www.businesscode.de/schema/bcdui/customization-1.0.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="no" media-type="text/html"/>

  <xsl:param name="cssClassPrefix" select="'bcd-unifilter-'"/>
  <!-- attribute name of which provides uniquelly generated node id -->
  <xsl:param name="nodeIdAttribute" select="'bcd-univ-node-id'"/>
  <!-- OptionsDataProvider -->
  <xsl:param name="bRefModel"/>

  <!--
    input: dataProviderWithXPathNodes: Root/[usersProvidedTarget]/*
   -->
  <!-- i.e. /Root/f:And -->
  <xsl:variable name="target" select="/*/*"/>

	<xsl:template match="/">
    <div contextId="default">
      <xsl:choose>
        <!-- if no filters -->
        <xsl:when test="not($target/f:*)">
          <div class="{$cssClassPrefix}empty" contextId="empty" bcdTranslate="bcd_widget_universalFilter_noFilters">
          </div>
        </xsl:when>
        <!-- if exact one nested expression, dont display junction -->
        <xsl:when test="count($target//f:Expression) = 1">
          <div contextId="non-empty">
            <xsl:apply-templates select=".//f:Expression"/>
          </div>
        </xsl:when>
        <!-- if exact one f:And and no f:And/f:Expression and only one f:Filter/And/f:Junction -->
        <xsl:when test="count($target/f:And) = 1 and not($target/f:And/f:Expression) and count($target/f:And/f:*) = 1">
          <div contextId="non-empty">
            <xsl:apply-templates select="$target/f:And/f:*"/>
          </div>
        </xsl:when>
        <xsl:otherwise>
          <div contextId="non-empty">
            <xsl:apply-templates select="$target"/>
          </div>
        </xsl:otherwise>
      </xsl:choose>
    </div>
	</xsl:template>

  <!-- extension point for css class name generation -->
  <xsl:template match="f:Expression" mode="class"/>

  <!-- as container -->
  <xsl:template match="f:Expression">
    <div data-node-id="{@*[name()=$nodeIdAttribute]}" contextId="non-empty">
      <xsl:variable name="expressionCaption" select="$bRefModel/*/cust:Option[@value = current()/@bRef]/@caption"/>
      <xsl:variable name="expressionName" select="concat(substring(@bRef,0,1 div string-length($expressionCaption)),$expressionCaption)"/>
      <xsl:variable name="customClass">
        <xsl:apply-templates select="." mode="class"/>
      </xsl:variable>
      <xsl:attribute name="class">
        <xsl:value-of select="concat($cssClassPrefix,'expression')"/>
        <xsl:if test="normalize-space($customClass)">
          <xsl:text> </xsl:text>
          <xsl:value-of select="$customClass"/>
        </xsl:if>
      </xsl:attribute>

      <span>
        <xsl:attribute name="class">
          <xsl:value-of select="concat($cssClassPrefix,'expression-name')"/>
          <xsl:if test="not($expressionCaption)">
            <xsl:value-of select="concat(' ', $cssClassPrefix,'expression-name-nomapping')"/>
          </xsl:if>
        </xsl:attribute>
        <xsl:value-of select="$expressionName"/>
      </span>

      <xsl:choose>
        <xsl:when test="(@op = '!=' or @op = '&lt;&gt;') and ( @value='' or not(@value) )"><!-- operator matters -->
          <span class="{$cssClassPrefix}expression-type-notempty" bcdTranslate="bcd_widget_universalFilter_valueNotNull"></span>
        </xsl:when>
        <xsl:when test="( @value='' or not(@value) )"><!-- operator does not matter -->
          <span class="{$cssClassPrefix}expression-type-empty" bcdTranslate="bcd_widget_universalFilter_valueNull"></span>
        </xsl:when>
        <xsl:otherwise>
          <span class="{$cssClassPrefix}expression-op"><xsl:value-of select="@op"/></span>
          <span class="{$cssClassPrefix}expression-value"><xsl:value-of select="@value"/></span>
        </xsl:otherwise>
      </xsl:choose>
    </div>
  </xsl:template>

  <!-- skip rendering empty junctions and junctions containing only 1 child -->
  <xsl:template match="*[ (self::f:And or self::f:Or) and ( count(f:*) &lt; 2 ) ]">
    <xsl:apply-templates/>
  </xsl:template>

  <xsl:template match="f:And | f:Or">
    <xsl:variable name="isReadOnly" select="generate-id($target) = generate-id(.)"/>
    <xsl:variable name="contextId">
      <xsl:choose>
        <xsl:when test="$isReadOnly"><xsl:text>default</xsl:text></xsl:when>
        <xsl:otherwise><xsl:text>non-empty</xsl:text></xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <div class="{$cssClassPrefix}conj-container" data-node-id="{@*[name()=$nodeIdAttribute]}" contextId="{$contextId}">
      <div>
        <xsl:attribute name="class">
          <xsl:value-of select="concat(' ', $cssClassPrefix, 'conj-header')"/>
          <xsl:if test="$isReadOnly"><xsl:text> bcdReadOnly</xsl:text></xsl:if>
        </xsl:attribute>
        <xsl:value-of select="local-name()"/>
      </div>
      <div class="{$cssClassPrefix}conj-spacer">&#160;</div>
      <div>
       <xsl:apply-templates/>
      </div>
    </div>
  </xsl:template>
</xsl:stylesheet>