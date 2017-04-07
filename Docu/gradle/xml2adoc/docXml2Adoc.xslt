<?xml version="1.0" encoding="UTF-8"?>
<!--
  Copyright 2010-2017 BusinessCode GmbH, Germany

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0"
                xmlns:doc="http://www.businesscode.de/schema/bcdui/doc-1.1.0"
                xmlns:xalan="http://xml.apache.org/xalan">

  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="yes" omit-xml-declaration="yes" xalan:indent-amount="2"/>
  <xsl:strip-space elements="* | comment()"/>

  <xsl:param name="docName"/>
  <xsl:param name="logicalName"/>

  <xsl:variable name="qquot">"</xsl:variable>
  <xsl:variable name="newLine">
    <xsl:text>
</xsl:text>
  </xsl:variable>
  <xsl:variable name="emptyLine"><xsl:value-of select="concat($newLine,$newLine)"/></xsl:variable>

  <xsl:template match="doc:Doc">
    <xsl:value-of select="concat( '[[', $docName,']]', $newLine)"/>
    <xsl:value-of select="concat( '== ', @title)"/>
    <xsl:value-of select="$newLine"/>
    <!--<xsl:text disable-output-escaping="yes">:toc: left</xsl:text><xsl:value-of select="$newLine"/>-->
    <!--<xsl:text disable-output-escaping="yes">:numbered:</xsl:text><xsl:value-of select="$newLine"/>-->
    <xsl:apply-templates select="node()"/>
  </xsl:template>

  <xsl:template match="doc:Chapter | doc:SubChapter">
    <xsl:param name="level" select="'==='"/>
    <xsl:if test="self::doc:Doc">
      <xsl:text>(C) BusinessCode &lt;info@business-code.de></xsl:text>
    </xsl:if>
    <xsl:value-of select="$newLine"/>
    <xsl:value-of select="concat( $level, ' ', @title)"/>
    <xsl:value-of select="$newLine"/>
    <xsl:apply-templates select="node()">
      <xsl:with-param name="level" select="concat($level,'=')"/>
    </xsl:apply-templates>
  </xsl:template>

  <xsl:template match="doc:Body">
    <xsl:apply-templates select="node()"/>
  </xsl:template>

  <!-- Standard text is cleared from indent (n*2 spaces) -->
  <xsl:template match="text()">
    <xsl:param name="listContinuation" select="''"/>
    <xsl:param name="skipInitialLinebreak" select="false()"/>
    <xsl:variable name="content">
      <xsl:choose>
        <xsl:when test="$skipInitialLinebreak and starts-with(.,'&#10;')"><xsl:value-of select="translate(substring(.,2),'&#160;','')"/></xsl:when>
        <xsl:otherwise><xsl:value-of select="translate(.,'&#160;','')"/></xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <xsl:call-template name="string-replace-all">
      <xsl:with-param name="text" select="$content" />
      <xsl:with-param name="replace" select="'  '" />
      <xsl:with-param name="by" select="''" />
    </xsl:call-template>
    <xsl:apply-templates select="node()">
      <xsl:with-param name="listContinuation" select="$listContinuation"/>
    </xsl:apply-templates>
  </xsl:template>

  <xsl:template match="doc:dl | dl">
    <xsl:param name="listContinuation" select="''"/>
    <xsl:for-each select="doc:dt | dt">
      <xsl:value-of select="concat($listContinuation,$newLine)"/>
      <xsl:apply-templates select="node()"/>
      <xsl:text>:: </xsl:text>
      <xsl:apply-templates select="following-sibling::doc:dd[1]/node() | following-sibling::dd[1]/node()">
        <xsl:with-param name="listContinuation" select="'+'"/>
      </xsl:apply-templates>
    </xsl:for-each>
    <xsl:value-of select="$newLine"/>
  </xsl:template>

  <xsl:template match="doc:ol | ol">
    <xsl:param name="listContinuation" select="''"/>
    <xsl:for-each select="doc:li | li">
     <xsl:value-of select="$newLine"/>
      <xsl:text>. </xsl:text>
      <xsl:apply-templates select="node()[1]">
        <xsl:with-param name="listContinuation" select="'+'"/>
        <xsl:with-param name="skipInitialLinebreak" select="true()"/>
      </xsl:apply-templates>
      <xsl:apply-templates select="node()[position()>1]">
        <xsl:with-param name="listContinuation" select="'+'"/>
      </xsl:apply-templates>
    </xsl:for-each>
    <xsl:value-of select="$newLine"/>
  </xsl:template>

  <xsl:template match="doc:ul | ul">
    <xsl:param name="listContinuation" select="''"/>
    <xsl:for-each select="doc:li | li">
     <xsl:value-of select="$newLine"/>
      <xsl:text>* </xsl:text>
      <xsl:apply-templates select="node()[1]">
        <xsl:with-param name="listContinuation" select="'+'"/>
        <xsl:with-param name="skipInitialLinebreak" select="true()"/>
      </xsl:apply-templates>
      <xsl:apply-templates select="node()[position()>1]">
        <xsl:with-param name="listContinuation" select="'+'"/>
      </xsl:apply-templates>
    </xsl:for-each>
    <xsl:value-of select="$newLine"/>
  </xsl:template>

  <xsl:template match="doc:code | code">
    <xsl:value-of select="concat(' `',text(),'` ')"/>
  </xsl:template>

  <xsl:template match="doc:pre | pre">
    <xsl:variable name="lang">
      <xsl:choose>
        <xsl:when test="contains(text(),'&lt;div')">html</xsl:when>
        <xsl:otherwise>javascript</xsl:otherwise>
      </xsl:choose>
    </xsl:variable>
    <xsl:value-of select="concat($newLine,'[source,',$lang,']',$newLine,'----',$newLine)"/>
    <xsl:call-template name="removeCommonIndent">
      <xsl:with-param name="content" select="text()"/>
    </xsl:call-template>
    <xsl:value-of select="concat($newLine,'----',$newLine)"/>
  </xsl:template>

  <xsl:template name="removeCommonIndent">
    <xsl:param name="content"/>
    <xsl:param name="offset" select="string-length(substring-before($content, substring(normalize-space($content), 1, 1)))"/>
    <xsl:variable name="row" select="substring-before(concat($content, '&#10;'), '&#10;')"/>
    <xsl:variable name="rest" select="substring-after($content, '&#10;')"/>
    <xsl:value-of select="concat(substring($row,$offset),'&#10;')" disable-output-escaping="yes"/>
    <xsl:if test="string-length(normalize-space($rest)) > 0">
      <xsl:call-template name="removeCommonIndent">
        <xsl:with-param name="content" select="$rest"/>
        <xsl:with-param name="offset" select="$offset"/>
      </xsl:call-template>
    </xsl:if>
  </xsl:template>


  <xsl:template match="doc:xml | xml">
    <xsl:param name="listContinuation" select="''"/>
    <xsl:value-of select="concat($listContinuation,$newLine)"/>
    <xsl:text>[source,xml]</xsl:text>
    <xsl:value-of select="$newLine"/>
    <xsl:text>----</xsl:text>
    <xsl:value-of select="$newLine"/>
    <xsl:apply-templates select="*" mode="ppXml"/>
    <xsl:value-of select="$newLine"/>
    <xsl:text>----</xsl:text>
    <xsl:value-of select="concat($newLine,$listContinuation)"/>
  </xsl:template>

  <xsl:template match="text()" mode="ppXml">
    <xsl:value-of select="normalize-space( translate(.,'&#160;','') )"/>
    <xsl:apply-templates select="node()"/>
  </xsl:template>

  <xsl:template match="comment()" mode="ppXml">
    <xsl:comment>
      <xsl:value-of select="concat(' ',normalize-space(.),' ')"/>
    </xsl:comment>
  </xsl:template>
  <xsl:template match="*" mode="ppXml">
    <xsl:copy>
      <xsl:copy-of select="@*"/>
      <xsl:apply-templates select="* | text() | comment()" mode="ppXml"/>
    </xsl:copy>
  </xsl:template>

  <xsl:template match="doc:br | br">
    <xsl:param name="listContinuation" select="''"/>
    <xsl:value-of select="concat($newLine,$listContinuation)"/>
    <xsl:if test="not(following-sibling::node()) and parent::doc:Body"><xsl:value-of select="$newLine"/></xsl:if>
  </xsl:template>

  <xsl:template match="doc:a | a">
    <xsl:choose>
      <xsl:when test="contains(@href,'doc.xml')">
        <xsl:value-of disable-output-escaping="yes" select="concat('&lt;&lt;',substring-before(concat(@href,'#'),'#'),',',text(),'>>')"/>
      </xsl:when>
      <xsl:when test="contains(@href,'/jsdoc/')">
        <xsl:value-of disable-output-escaping="yes" select="concat('link:../jsdoc/',substring-after(@href,'/jsdoc/'), '[', text(), ', window=',$qquot,'_blank',$qquot,']')"/>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of disable-output-escaping="yes" select="concat('link:', @href, '[', text(), ', window=',$qquot,'_blank',$qquot,']')"/>
      </xsl:otherwise>
    </xsl:choose>
    <xsl:if test="not(following-sibling::node()) and parent::doc:Body"><xsl:value-of select="$newLine"/></xsl:if>
  </xsl:template>

  <xsl:template match="doc:img | img">
    <xsl:if test="not(/doc:Doc[@title='BCD-UI components'])">
      <xsl:variable name="imgName1">
        <xsl:choose>
          <xsl:when test="contains(@src,'/')"><xsl:value-of select="substring-after(@src,'/')"/></xsl:when>
          <xsl:otherwise><xsl:value-of select="@src"/></xsl:otherwise>
        </xsl:choose>
      </xsl:variable>
      <xsl:variable name="imgName">
        <xsl:choose>
          <xsl:when test="contains($imgName1,'/')"><xsl:value-of select="concat('images/',$logicalName,'_',substring-after($imgName1,'/'))"/></xsl:when>
          <xsl:otherwise><xsl:value-of select="concat('images/',$logicalName,'_',$imgName1)"/></xsl:otherwise>
        </xsl:choose>
      </xsl:variable>
      <xsl:value-of select="concat($newLine,'image::',$imgName,'[]',$newLine)"/>
    </xsl:if>
  </xsl:template>

  <xsl:template match="doc:b | b">
    <xsl:value-of select="concat('*',text(),'*')"/>
    <xsl:if test="not(following-sibling::node()) and parent::doc:Body"><xsl:value-of select="$newLine"/></xsl:if>
  </xsl:template>

  <xsl:template match="doc:i | i">
    <xsl:value-of select="concat('_',text(),'_')"/>
    <xsl:if test="not(following-sibling::node()) and parent::doc:Body"><xsl:value-of select="$newLine"/></xsl:if>
  </xsl:template>

  <xsl:template match="doc:p | p">
    <xsl:param name="listContinuation"/>
    <xsl:apply-templates select="node()">
      <xsl:with-param name="listContinuation" select="$listContinuation"/>
    </xsl:apply-templates>
    <xsl:value-of select="$newLine"/>
  </xsl:template>

  <xsl:template match="doc:table[not(.//doc:table)] | table[not(.//table)]">
    <xsl:param name="listContinuation" select="''"/>
    <xsl:value-of select="$listContinuation"/>
    <xsl:if test=".//doc:th | .//th">
      <xsl:value-of select="concat($newLine,'[options=',$qquot,'header',$qquot,']')"/>
    </xsl:if>
    <xsl:value-of select="concat($newLine,'|===',$newLine)"/>
    <xsl:for-each select="doc:tr | tr | doc:thead/doc:tr | thead/tr | doc:tbody/doc:tr | tbody/tr">
      <xsl:if test="position()>1"><xsl:value-of select="$newLine"/></xsl:if>
      <xsl:for-each select="doc:th | th | doc:td | td">
        <xsl:text>|</xsl:text>
        <xsl:apply-templates select="node()"/>
      </xsl:for-each>
    </xsl:for-each>
    <xsl:value-of select="concat($newLine,'|===',$newLine)"/>
  </xsl:template>

  <xsl:template name="string-replace-all">
    <xsl:param name="text" />
    <xsl:param name="replace" />
    <xsl:param name="by" />
    <xsl:choose>
      <xsl:when test="$text = '' or $replace = ''or not($replace)" >
        <!-- Prevent this routine from hanging -->
        <xsl:value-of select="$text" />
      </xsl:when>
      <xsl:when test="contains($text, $replace)">
        <xsl:value-of select="substring-before($text,$replace)" />
        <xsl:value-of select="$by" />
        <xsl:call-template name="string-replace-all">
          <xsl:with-param name="text" select="substring-after($text,$replace)" />
          <xsl:with-param name="replace" select="$replace" />
          <xsl:with-param name="by" select="$by" />
        </xsl:call-template>
      </xsl:when>
      <xsl:otherwise>
        <xsl:value-of select="$text" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>


</xsl:stylesheet>