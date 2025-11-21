<?xml version="1.0" encoding="UTF-8"?>
<!--
  Copyright 2010-2022 BusinessCode GmbH, Germany

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
<!--
 |
 | XSLT REC Compliant Version of IE5 Default Stylesheet
 |
 | Original version by Jonathan Marsh (jmarsh@xxxxxxxxxxxxx)
 | http://msdn.microsoft.com/xml/samples/defaultss/defaultss.xsl
 |
 | Conversion to XSLT 1.0 REC Syntax by Steve Muench (smuench@xxxxxxxxxx)
 |
 | Modifications by MBernemann, BusinessCoDe to allow displaying of subtrees of documents, FireFox,
 |   making collapsable sign empty (better for copy-pase), namespace printing and
 |   changes to the indent mechanism to allow copy-paste from docu, keeping indent
 |
 | call it with mode visualizeXml_standaloneDoc to produce a stand alone HTML doc
 | or with mode visualizeXml and including the visualizeXml_head once in html:head to embedd it in a page
 +-->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">

  <xsl:import href="../../../xslt/stringUtil.xslt"/>

  <xsl:output method="html" encoding="UTF-8" indent="no"/>
  
  <xsl:template name="visualizeXml_head">
    <xsl:param name="contentPath" select="''"/>
    <xsl:if test="$contentPath != ''"> <!-- in case it is used via processing-instruction -->
      <script type="text/javascript" src="{$contentPath}/../../src/js/widget/visualizeXml/visualizeXml.js"> </script>
    </xsl:if>
    <input type="hidden"/>
    <STYLE>
      .visXml_c  {cursor:pointer}
      .visXml_b  {color:red; font-family:'Courier New'; font-weight:bold; text-decoration:none}
      .visXml_b_collaps {color:red; font-family:'Courier New'; font-weight:bold; text-decoration:none}
      .visXml_e  {margin-left:0em; text-indent:-0em; }
      .visXml_k  {margin-left:0em; text-indent:-0em; }
      .visXml_tattr  {color:#990000}
      .visXml_xtattr {color:#990099}
      .visXml_telem  {color:#000099}
      .visXml_xtelem {color:#990099}
      .visXml_ns {color:red}
      .visXml_dt {color:#000099}
      .visXml_m  {color:#000099}
      .visXml_tx {color:#006600}
      .visXml_db {text-indent:0px; margin-left:0em; margin-top:0px;
                  margin-bottom:0px;padding-left:.3em;
                  border-left:1px solid #CCCCCC; font:small Courier}
      .visXml_di {font:small Courier}
      .visXml_d  {color:#000099}
      .visXml_pi {color:#000099}
      .visXml_cb {text-indent:0px; margin-left:0em; margin-top:0px;
                  margin-bottom:0px;padding-left:.3em; font:small Courier;
                  color:#888888}
      .visXml_ci {color:#008800}
      PRE.visXml {margin:0px; display:inline}
    </STYLE>
  </xsl:template>

  <xsl:template match="*" mode="visualizeXml_standaloneDoc">
    <HTML>
      <HEAD>
        <STYLE>
          BODY {font:x-small 'Verdana'; margin-right:1.5em}
        </STYLE>
        <xsl:call-template name="visualizeXml_head"/>
      </HEAD>
      <BODY class="visXml_st" onclick="cl()">
        <xsl:apply-templates select="." mode="visualizeXml"/>
      </BODY>
    </HTML>
  </xsl:template>

  <xsl:template match="processing-instruction()" mode="visualizeXml">
    <span class="visXml_e">
      <span class="visXml_b">
        <xsl:call-template name="visualizeXml_entity-ref">
          <xsl:with-param name="name">nbsp</xsl:with-param>
        </xsl:call-template>
      </span>
      <span class="visXml_m">
        <xsl:text>&lt;?</xsl:text>
      </span>
      <span class="visXml_pi">
        <xsl:value-of select="name(.)"/>
        <xsl:value-of select="."/>
      </span>
      <span class="visXml_m">
        <xsl:text>?></xsl:text>
      </span>
    </span>
  </xsl:template>

<!--   <xsl:template match="processing-instruction('xml')" mode="visualizeXml"> -->
<!--     <span class="visXml_e"> -->
<!--       <span class="visXml_b"> -->
<!--         <xsl:call-template name="visualizeXml_entity-ref"> -->
<!--           <xsl:with-param name="name">nbsp</xsl:with-param> -->
<!--         </xsl:call-template> -->
<!--       </span> -->
<!--       <span class="visXml_m"> -->
<!--         <xsl:text>&lt;?</xsl:text> -->
<!--       </span> -->
<!--       <span class="visXml_pi"> -->
<!--         <xsl:text>xml </xsl:text> -->
<!--         <xsl:for-each select="@*"> -->
<!--           <xsl:value-of select="name(.)"/> -->
<!--           <xsl:text>="</xsl:text> -->
<!--           <xsl:value-of select="."/> -->
<!--           <xsl:text>" </xsl:text> -->
<!--         </xsl:for-each> -->
<!--       </span> -->
<!--       <span class="visXml_m"> -->
<!--         <xsl:text>?></xsl:text> -->
<!--       </span> -->
<!--     </span> -->
<!--   </xsl:template> -->

  <xsl:template match="@*" mode="visualizeXml">
    <xsl:param name="indent"/>
    <xsl:param name="p"/>
    <xsl:if test="$p mod 10 = 0"><br/>
      <xsl:value-of select="$indent"/>
      <xsl:text>&#160;&#160;&#160;&#160;</xsl:text>
      <xsl:call-template name="stringRepeater">
        <xsl:with-param name="i" select="concat($indent,string-length(name(ancestor::*[1]))+1)"/>
        <xsl:with-param name="s" select="' '"/>
      </xsl:call-template>
    </xsl:if>
    <span>
      <xsl:attribute name="class">
        <xsl:if test="xsl:*/@*">
          <xsl:text>visXml_xattr</xsl:text>
        </xsl:if>
        <xsl:text>visXml_tattr</xsl:text>
      </xsl:attribute>
      <xsl:text> </xsl:text><xsl:value-of select="name(.)"/>
    </span>
    <span class="visXml_m">="</span>
      <xsl:value-of select="."/>
    <span class="visXml_m">"</span>
  </xsl:template>

  <xsl:template match="text()" mode="visualizeXml">
    <xsl:param name="indent"/>
    <xsl:if test="string-length(substring-before(substring-after(translate(.,' ',''),'&#xA;'),'&#xA;'))=0">&#13;</xsl:if>
    <xsl:if test="string-length(normalize-space(.))">
      <span class="visXml_e">
        <xsl:value-of select="$indent"/>
        <span class="visXml_b"> </span>
        <span class="visXml_tx">
          <xsl:value-of select="normalize-space(.)"/>
          <xsl:if test="string-length(normalize-space(.))"></xsl:if>&#160;
        </span>
      </span>
    </xsl:if>
  </xsl:template>

  <xsl:template match="comment()" mode="visualizeXml">
    <xsl:param name="indent"/>
    <xsl:if test="string-length(substring-before(substring-after(translate(.,' ',''),'&#xA;'),'&#xA;'))=0">&#13;</xsl:if>
    <xsl:value-of select="$indent"/>
    <span class="visXml_k">
      <span>
        <span class="visXml_m">
          <xsl:text>&lt;!--</xsl:text>
        </span>
      </span>
      <span class="visXml_ci" id="clean">
        <PRE class="visXml">
          <xsl:value-of select="normalize-space(.)"/>
        </PRE>
      </span>
      <span class="visXml_b">
        <xsl:call-template name="visualizeXml_entity-ref">
          <xsl:with-param name="name">nbsp</xsl:with-param>
        </xsl:call-template>
      </span>
      <span class="visXml_m">
        <xsl:text>--></xsl:text>
      </span>
    </span><br/>
  </xsl:template>


  <xsl:template match="*" mode="visualizeXml">
    <xsl:param name="indent" select="''"/>
    <span class="visXml_e">
      <span STYLE="margin-left:0em;text-indent:-0em">
        <xsl:value-of select="$indent"/>
        <span class="visXml_b">
          <xsl:call-template name="visualizeXml_entity-ref">
            <xsl:with-param name="name">nbsp</xsl:with-param>
          </xsl:call-template>
        </span>
        <span class="visXml_m">&lt;</span>
        <span>
          <xsl:attribute name="class">
            <xsl:if test="xsl:*">
              <xsl:text>visXml_xelem</xsl:text>
            </xsl:if>
            <xsl:text>visXml_telem</xsl:text>
          </xsl:attribute>
          <xsl:value-of select="name(.)"/>
        </span>
        <xsl:for-each select="@*">
          <xsl:apply-templates select="." mode="visualizeXml">
            <xsl:with-param name="indent" select="$indent"/>
            <xsl:with-param name="p" select="position()"/>
          </xsl:apply-templates>
        </xsl:for-each>
        <xsl:call-template name="visualizeXml_namespace"/>
        <span class="visXml_m">/><br/></span>
      </span>
    </span>
  </xsl:template>

  <xsl:template match="*[node()]" mode="visualizeXml">
    <xsl:param name="indent"/>
    <span class="visXml_e">
      <span class="visXml_c">
        <xsl:value-of select="$indent"/>
        <a class="visXml_b_collaps" href="#" onclick="return false"></a>
        <span class="visXml_m">&lt;</span>
        <span>
          <xsl:attribute name="class">
            <xsl:if test="xsl:*">
              <xsl:text>visXml_xelem</xsl:text>
            </xsl:if>
            <xsl:text>visXml_telem</xsl:text>
          </xsl:attribute>
          <xsl:value-of select="name(.)"/>
          <xsl:if test="@*">
            <xsl:text> </xsl:text>
          </xsl:if>
        </span>
        <xsl:for-each select="@*">
          <xsl:apply-templates select="." mode="visualizeXml">
            <xsl:with-param name="indent" select="$indent"/>
            <xsl:with-param name="p" select="position()"/>
          </xsl:apply-templates>
        </xsl:for-each>
        <xsl:call-template name="visualizeXml_namespace"/>
        <span class="visXml_m">></span>
      </span>
      <span>
        <xsl:apply-templates select="node()|*" mode="visualizeXml"/>
        <span>
          <span class="visXml_b">
            <xsl:call-template name="visualizeXml_entity-ref">
              <xsl:with-param name="name">nbsp</xsl:with-param>
            </xsl:call-template>
          </span>
          <span class="visXml_m">
            <xsl:text>&lt;/</xsl:text>
          </span>
          <span>
            <xsl:attribute name="class">
              <xsl:if test="xsl:*">
                <xsl:text>visXml_xelem</xsl:text>
              </xsl:if>
              <xsl:text>visXml_telem</xsl:text>
            </xsl:attribute>
            <xsl:value-of select="name(.)"/>
          </span>
          <span class="visXml_m">><br/></span>
        </span>
      </span>
    </span>
  </xsl:template>

  <xsl:template match="*[text() and not (comment() or processing-instruction())]" mode="visualizeXml">
    <xsl:param name="indent"/>
    <span class="visXml_e">
      <span STYLE="margin-left:0em;text-indent:-0em">
        <span class="visXml_b">
          <xsl:call-template name="visualizeXml_entity-ref">
            <xsl:with-param name="name">nbsp</xsl:with-param>
          </xsl:call-template>
        </span>
        <xsl:value-of select="$indent"/>
        <span class="visXml_m">
          <xsl:text>&lt;</xsl:text>
        </span>
        <span>
          <xsl:attribute name="class">
            <xsl:if test="xsl:*">
              <xsl:text>visXml_xelem</xsl:text>
            </xsl:if>
            <xsl:text>visXml_telem</xsl:text>
          </xsl:attribute>
          <xsl:value-of select="name(.)"/>
        </span>
        <xsl:for-each select="@*">
          <xsl:apply-templates select="." mode="visualizeXml">
            <xsl:with-param name="indent" select="$indent"/>
            <xsl:with-param name="p" select="position()"/>
          </xsl:apply-templates>
        </xsl:for-each>
        <xsl:call-template name="visualizeXml_namespace"/>
        <span class="visXml_m">></span>
        <span class="visXml_tx">
          <xsl:choose>
            <xsl:when test="string-length(normalize-space(.))>64"><br/>
              <xsl:call-template name="printRows">
                <xsl:with-param name="content" select="(.)"/>
                <xsl:with-param name="indent" select="concat($indent,'&#160;&#160;')"/>
              </xsl:call-template>
              <xsl:value-of select="$indent"/>
            </xsl:when>
            <xsl:otherwise><xsl:value-of select="normalize-space(.)"/></xsl:otherwise>
          </xsl:choose>
        </span>
        <span class="visXml_m">&lt;/</span>
        <span>
          <xsl:attribute name="class">
            <xsl:if test="xsl:*">
              <xsl:text>visXml_xelem</xsl:text>
            </xsl:if>
            <xsl:text>visXml_telem</xsl:text>
          </xsl:attribute>
          <xsl:value-of select="name(.)"/>
        </span>
        <span class="visXml_m">><br/></span>
      </span>
    </span>
  </xsl:template>

  <xsl:template match="*[*]" priority="20" mode="visualizeXml">
    <xsl:param name="indent"/>
    <span class="visXml_e">
      <span STYLE="margin-left:0em;text-indent:-0em" class="visXml_c">
        <xsl:value-of select="substring($indent,2)"/>
        <a class="visXml_b_collaps bcdCollapse" href="#" onclick="return false"></a>
        <span class="visXml_m">&lt;</span>
        <span>
          <xsl:attribute name="class">
            <xsl:if test="xsl:*">
              <xsl:text>visXml_xelem</xsl:text>
            </xsl:if>
            <xsl:text>visXml_telem</xsl:text>
          </xsl:attribute>
          <xsl:value-of select="name(.)"/>
        </span>
        <xsl:for-each select="@*">
          <xsl:apply-templates select="." mode="visualizeXml">
            <xsl:with-param name="indent" select="$indent"/>
            <xsl:with-param name="p" select="position()"/>
          </xsl:apply-templates>
        </xsl:for-each>
        <xsl:call-template name="visualizeXml_namespace"/>
        <span class="visXml_m">><br/></span>
      </span>
      <span>
        <xsl:apply-templates select="text()|*|comment()" mode="visualizeXml">
          <xsl:with-param name="indent" select="concat($indent,'&#160;&#160;')"/>
        </xsl:apply-templates>
        <span>
          <xsl:value-of select="$indent"/>
            <span class="visXml_b">
              <xsl:call-template name="visualizeXml_entity-ref">
                <xsl:with-param name="name">nbsp</xsl:with-param>
              </xsl:call-template>
            </span>
            <span class="visXml_m">
              <xsl:text>&lt;/</xsl:text>
            </span>
            <span>
              <xsl:attribute name="class">
                <xsl:if test="xsl:*">
                  <xsl:text>visXml_xelem</xsl:text>
                </xsl:if>
                <xsl:text>visXml_telem</xsl:text>
              </xsl:attribute>
              <xsl:value-of select="name(.)"/>
            </span>
            <span class="visXml_m">><br/></span>
         </span>
      </span>
    </span>
  </xsl:template>

  <xsl:template name="visualizeXml_namespace">
    <xsl:variable name="ns">
      <xsl:if test="not(ancestor::*[namespace-uri()=namespace-uri(current())])">&#160;xmlns<xsl:if test="substring-before(name(),':')">:<xsl:value-of select="substring-before(name(),':')"/></xsl:if>="<xsl:value-of select="namespace-uri()"/>"</xsl:if>
    </xsl:variable>
    <xsl:if test="normalize-space($ns)"><xsl:value-of select="normalize-space($ns)" /></xsl:if>
  </xsl:template>

  <xsl:template name="visualizeXml_entity-ref">
    <xsl:param name="name"/>
    <xsl:choose>
      <xsl:when test="$name = 'nbsp'"></xsl:when>
      <xsl:otherwise>
        <xsl:text disable-output-escaping="yes">&amp;</xsl:text>
        <xsl:value-of select="$name"/>
        <xsl:text>;</xsl:text>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

</xsl:stylesheet>