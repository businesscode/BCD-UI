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

<!--
-->
<xsl:stylesheet version="1.0" 
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:wrs="http://www.businesscode.de/schema/bcdui/wrs-1.0.0"
  xmlns:rnd="http://www.businesscode.de/schema/bcdui/renderer-1.0.0"
  xmlns:guiStatus="http://www.businesscode.de/schema/bcdui/guiStatus-1.0.0"
  xmlns:exslt="http://exslt.org/common"
  xmlns:msxsl="urn:schemas-microsoft-com:xslt"
  exclude-result-prefixes="exslt msxsl">

  <xsl:import href="bcduicp://bcdui/xslt/stringUtil.xslt"/>

  <msxsl:script language="JScript" implements-prefix="exslt">this['node-set']= function (x) { return x; }</msxsl:script>

  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:param name="bcdContextPath"/>
  <xsl:param name="scopes"/>
  <xsl:param name="instances"/>
  <xsl:param name="config" select="/*[1=0]"/>
  <xsl:param name="dataModel" select="/*[1=0]"/>
  <xsl:param name="infoModel" select="/*[1=0]"/>
  <xsl:param name="allowedScopes"/>
  <xsl:param name="i18_view" select="'VIEW'"/>
  <xsl:param name="i18_delete" select="'DELETE'"/>
  <xsl:param name="i18_comment" select="'COMMENT'"/>
  <xsl:param name="i18_download" select="'DOWNLOAD'"/>
  <xsl:param name="i18_acknowledged_off" select="'CLICK TO UNACKNOWLEDGE'"/>
  <xsl:param name="i18_acknowledged_on" select="'CLICK TO ACKNOWLEDGE'"/>
  <xsl:param name="doAcknowledge" select="'false'"/>

  <xsl:key name="colHeadById"  match="/*/wrs:Header/wrs:Columns/wrs:C" use="@id"/>
  <xsl:key name="colHeadByPos" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@pos"/>
  
  <xsl:variable name="scopesStr">
    <xsl:call-template name="tokenize">
      <xsl:with-param name="string" select="$scopes" />
      <xsl:with-param name="delimiter" select="' '" />
    </xsl:call-template>
  </xsl:variable>
  <xsl:variable name="scopesTokens" select="exslt:node-set($scopesStr)" />

  <xsl:variable name="instancesStr">
    <xsl:call-template name="tokenize">
      <xsl:with-param name="string" select="$instances" />
      <xsl:with-param name="delimiter" select="' '" />
    </xsl:call-template>
  </xsl:variable>
  <xsl:variable name="instancesTokens" select="exslt:node-set($instancesStr)" />  
  
  <xsl:template match="/*">
    <div>
      <div class='docUploaderContainer'>

        <xsl:for-each select="$scopesTokens/wrs:Wrs/wrs:Data/wrs:R[wrs:C[.!='']]">

          <xsl:variable name="scopePos" select="position()"/>
          <xsl:variable name="scope" select="wrs:C"/>
          <xsl:variable name="instance" select="$instancesTokens/wrs:Wrs/wrs:Data/wrs:R[position()=$scopePos and wrs:C[.!='']]/wrs:C"/>
          <xsl:variable name="hasWriteAccess" select="(contains($allowedScopes,'*') or contains($allowedScopes, concat('|',$scope,'|')))"/>

          <xsl:for-each select="$config/*/rnd:Scopes/rnd:Scope[@id=$scope]/rnd:Category">

            <xsl:variable name="category" select="."/>
            <xsl:variable name="maxCount">
              <xsl:choose>
                <xsl:when test="@maxCount and number(@maxCount)!='NaN'"><xsl:value-of select="number(@maxCount)"/></xsl:when>
                <xsl:otherwise>1</xsl:otherwise>
              </xsl:choose>
            </xsl:variable>
            <xsl:variable name="requiredCount">
              <xsl:choose>
                <xsl:when test="@required='true'"><xsl:value-of select="$maxCount"/></xsl:when>
                <xsl:when test="@required and number(@required)!='NaN'"><xsl:value-of select="number(@required)"/></xsl:when>
                <xsl:otherwise>0</xsl:otherwise>
              </xsl:choose>
            </xsl:variable>
            <xsl:variable name="optionalCount">
              <xsl:value-of select="$maxCount - $requiredCount"/>
            </xsl:variable>

            <xsl:variable name="docsPerCat" select="count($infoModel/*/Entry[@scope=$scope and @instance=$instance and @catId=$category/@id])"/>
            
              <div class="{concat('catContainer cat_', $category/@id, ' scope_', $scope)}">

              <h1><xsl:value-of select="$category/@caption"/></h1>

              <xsl:variable name="existingRequiredCount" select="count($infoModel/*/Entry[@scope=$scope and @instance=$instance and @catId=$category/@id and @required='true'])"/>
              <xsl:variable name="existingOptionalCount" select="count($infoModel/*/Entry[@scope=$scope and @instance=$instance and @catId=$category/@id and @required='false'])"/>
              <xsl:variable name="remainRequiredCount" select="$requiredCount - $existingRequiredCount"/>
              <xsl:variable name="remainOptionalCount" select="$optionalCount - $existingOptionalCount"/>

              <!-- loop over all docs for this category -->

              <xsl:for-each select="$infoModel/*/Entry[@scope=$scope and @instance=$instance and @catId=$category/@id and @required='true']">
                <xsl:variable name="pos" select="position()"/>
                <xsl:call-template name="renderBox">
                  <xsl:with-param name="category" select="$category"/>
                  <xsl:with-param name="entry" select="."/>
                  <xsl:with-param name="maxCount" select="$maxCount"/>
                  <xsl:with-param name="docsPerCat" select="$docsPerCat"/>
                  <xsl:with-param name="pos" select="$pos"/>
                  <xsl:with-param name="hasWriteAccess" select="$hasWriteAccess"/>
                  <xsl:with-param name="scope" select="$scope"/>
                  <xsl:with-param name="instance" select="$instance"/>
                  <xsl:with-param name="required" select="'true'"/>
                </xsl:call-template>
              </xsl:for-each>
              <xsl:if test="$remainRequiredCount &gt; 0">
                <xsl:call-template name="fillBoxes">
                  <xsl:with-param name="count" select="$remainRequiredCount"/>
                  <xsl:with-param name="category" select="$category"/>
                  <xsl:with-param name="entry" select="/*[1=0]"/>
                  <xsl:with-param name="maxCount" select="$maxCount"/>
                  <xsl:with-param name="docsPerCat" select="$docsPerCat"/>
                  <xsl:with-param name="pos" select="$existingRequiredCount + 1"/>
                  <xsl:with-param name="hasWriteAccess" select="$hasWriteAccess"/>
                  <xsl:with-param name="scope" select="$scope"/>
                  <xsl:with-param name="instance" select="$instance"/>
                  <xsl:with-param name="required" select="'true'"/>
                </xsl:call-template>
              </xsl:if>
              <xsl:for-each select="$infoModel/*/Entry[@scope=$scope and @instance=$instance and @catId=$category/@id and @required='false']">
                <xsl:variable name="pos" select="position()"/>
                <xsl:call-template name="renderBox">
                  <xsl:with-param name="category" select="$category"/>
                  <xsl:with-param name="entry" select="."/>
                  <xsl:with-param name="maxCount" select="$maxCount"/>
                  <xsl:with-param name="docsPerCat" select="$docsPerCat"/>
                  <xsl:with-param name="pos" select="$pos + $requiredCount"/>
                  <xsl:with-param name="hasWriteAccess" select="$hasWriteAccess"/>
                  <xsl:with-param name="scope" select="$scope"/>
                  <xsl:with-param name="instance" select="$instance"/>
                  <xsl:with-param name="required" select="'false'"/>
                </xsl:call-template>
              </xsl:for-each>
              <xsl:if test="$remainOptionalCount &gt; 0">
                <xsl:call-template name="fillBoxes">
                  <xsl:with-param name="count" select="1"/>
                  <xsl:with-param name="category" select="$category"/>
                  <xsl:with-param name="entry" select="/*[1=0]"/>
                  <xsl:with-param name="maxCount" select="$maxCount"/>
                  <xsl:with-param name="docsPerCat" select="$docsPerCat"/>
                  <xsl:with-param name="pos" select="$requiredCount + $existingOptionalCount + 1"/>
                  <xsl:with-param name="hasWriteAccess" select="$hasWriteAccess"/>
                  <xsl:with-param name="scope" select="$scope"/>
                  <xsl:with-param name="instance" select="$instance"/>
                  <xsl:with-param name="required" select="'false'"/>
                </xsl:call-template>
              </xsl:if>
            </div>

          </xsl:for-each>
        </xsl:for-each>
      </div>
    </div>
  </xsl:template>
  
  <xsl:template name="fillBoxes">
    <xsl:param name="count"/>
    <xsl:param name="category"/>
    <xsl:param name="entry"/>
    <xsl:param name="maxCount"/>
    <xsl:param name="docsPerCat"/>
    <xsl:param name="pos"/>
    <xsl:param name="hasWriteAccess"/>
    <xsl:param name="scope"/>
    <xsl:param name="instance"/>
    <xsl:param name="required"/>
    
    <xsl:if test="$count &gt; 0">
      <xsl:call-template name="renderBox">
        <xsl:with-param name="category" select="$category"/>
        <xsl:with-param name="entry" select="$entry"/>
        <xsl:with-param name="maxCount" select="$maxCount"/>
        <xsl:with-param name="docsPerCat" select="$docsPerCat"/>
        <xsl:with-param name="pos" select="$pos"/>
        <xsl:with-param name="hasWriteAccess" select="$hasWriteAccess"/>
        <xsl:with-param name="scope" select="$scope"/>
        <xsl:with-param name="instance" select="$instance"/>
        <xsl:with-param name="required" select="$required"/>
      </xsl:call-template>

      <xsl:call-template name="fillBoxes">
        <xsl:with-param name="count" select="$count -1"/>
        <xsl:with-param name="category" select="$category"/>
        <xsl:with-param name="entry" select="$entry"/>
        <xsl:with-param name="maxCount" select="$maxCount"/>
        <xsl:with-param name="docsPerCat" select="$docsPerCat"/>
        <xsl:with-param name="pos" select="$pos + 1"/>
        <xsl:with-param name="hasWriteAccess" select="$hasWriteAccess"/>
        <xsl:with-param name="scope" select="$scope"/>
        <xsl:with-param name="instance" select="$instance"/>
        <xsl:with-param name="required" select="$required"/>
      </xsl:call-template>
    </xsl:if>
  </xsl:template>
  
  <xsl:template name="renderBox">
    <xsl:param name="category"/>
    <xsl:param name="entry"/>
    <xsl:param name="maxCount"/>
    <xsl:param name="docsPerCat"/>
    <xsl:param name="pos"/>
    <xsl:param name="hasWriteAccess"/>
    <xsl:param name="scope"/>
    <xsl:param name="instance"/>
    <xsl:param name="required"/>
    
    <div class="{concat('category col cat_', $category/@id, ' scope_', $scope)}">
      <xsl:variable name="catId" select="$category/@id"/>
      <xsl:variable name="caption" select="$category/@caption"/>
      <xsl:variable name="dropAllowedClass" select="concat(' pointer_', string($hasWriteAccess))"/>
      <xsl:variable name="docAvailableClass" select="concat(' def_', string(boolean($entry/@fileExists='true')))"/>
      <xsl:variable name="requiredClass">
        <xsl:choose>
          <xsl:when test="$required='false' or boolean($entry/@fileExists='true')"> req_true</xsl:when>
          <xsl:otherwise> req_false</xsl:otherwise>
        </xsl:choose>
      </xsl:variable>
      <div class="{concat('bcdDropArea form-group', $docAvailableClass, $requiredClass, $dropAllowedClass)}" uuid="{$entry/@uuid}" requiredDoc="{$required}" fileSize="{$entry/@fileSize}" fileName="{$entry/@fileName}" comment="{$entry/@comment}" catId="{$catId}" rowId="{$entry/@rowId}" scope="{$scope}" instance="{$instance}">
        <xsl:if test="$hasWriteAccess">
          <xsl:attribute name="onDrop">bcdui.component.docUpload._onDndDrop(event, this)</xsl:attribute>
          <xsl:attribute name="onDragDrop">bcdui.component.docUpload._onDndDrop(event, this)</xsl:attribute>
        </xsl:if>
        <xsl:if test="not($entry) and $category/@help!=''">
          <div class='actions'>
            <span class='action info'>
              <div class='help'><xsl:value-of select="$category/@help"/></div>
            </span>
          </div>
        </xsl:if>
        <xsl:if test="$entry">
          <div class='actions'>
            <xsl:if test="$entry/@fileExists='true'">
              <xsl:if test="$doAcknowledge = 'true'">
                <xsl:variable name="ack"><xsl:if test="$entry/@acknowledged='true'">active</xsl:if></xsl:variable>
                <xsl:variable name="req"><xsl:if test="$required!='false'">required</xsl:if></xsl:variable>
                <xsl:choose>
                  <xsl:when test="$ack='active'">
                    <a target="_blank"><span title="{$i18_acknowledged_off}" class="{concat('action acknowledged ',$ack)}"></span></a>
                  </xsl:when>
                  <xsl:otherwise>
                    <a target="_blank"><span title="{$i18_acknowledged_on}" class="{concat('action acknowledged ',$ack, ' ', $req)}"></span></a>
                  </xsl:otherwise>
                </xsl:choose>
              </xsl:if>
              <a target="_blank" download="{$entry/@download}" href="{concat($bcdContextPath, $entry/@link)}"><span title="{$i18_download}" class='action download'></span></a>
              <a target="_blank" href="{concat($bcdContextPath, $entry/@link)}"><span title="{$i18_view}" class='action view'></span></a>
            </xsl:if>
            <xsl:if test="$hasWriteAccess">
              <span title="{$i18_delete}" class='action delete'></span>
            </xsl:if>
            <xsl:if test="$category/@help!=''">
              <span class='action info'>
                <div class='help'><xsl:value-of select="$category/@help"/></div>
              </span>
            </xsl:if>
          </div>
        </xsl:if>
        <div class='row title fileType'>
          <div class="{concat('title icon ', $entry/@ext, $docAvailableClass, $requiredClass)}">
            <xsl:if test="$maxCount &gt; 1">
              <xsl:value-of select="concat('[', $pos, '/', $maxCount, '] ')"/>
            </xsl:if>
            <xsl:value-of select="$entry/@fileName"/>
          </div>
        </div>
        <div class='row info small'>
          <xsl:choose>
            <xsl:when test="$entry">
              <div class='icon ts'><xsl:value-of select="substring($entry/@ts, 1, 16)"/></div>
              <div class='icon user'><xsl:value-of select="$entry/@user"/></div>
              <div class='icon fileSize'><xsl:value-of select="$entry/@fileSizePrint"/></div>
            </xsl:when>
            <xsl:otherwise>
              <xsl:choose>
                <xsl:when test="contains($requiredClass,'false')"><div bcdTranslate='bcd_DocUploader_Required'>Required Upload</div></xsl:when>
                <xsl:otherwise><div bcdTranslate='bcd_DocUploader_Optional'>Optional Upload</div></xsl:otherwise>
              </xsl:choose>
            </xsl:otherwise>
          </xsl:choose>
        </div>
        <div class='row small comment'>
          <xsl:variable name="gotCommentCss">
            <xsl:if test="$entry/@comment!=''">comment</xsl:if>
          </xsl:variable>
          <xsl:choose>
            <xsl:when test="$hasWriteAccess">
              <textarea rowId="{$entry/@rowId}" placeholder='{$i18_comment}' class="{concat('form-control commentinput ', $gotCommentCss)}" maxlength='200' type='text'><xsl:value-of select='$entry/@comment'/></textarea>
            </xsl:when>
            <xsl:otherwise>
              <span class="{concat('form-control commentinput ', $gotCommentCss)}"><xsl:value-of select='$entry/@comment'/></span>
            </xsl:otherwise>
          </xsl:choose>
        </div>
      </div>
    </div>
  </xsl:template>

</xsl:stylesheet>