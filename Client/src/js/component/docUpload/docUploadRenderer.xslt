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
  xmlns:guiStatus="http://www.businesscode.de/schema/bcdui/guiStatus-1.0.0">
  
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="no"/>

  <xsl:param name="bcdContextPath"/>
  <xsl:param name="scope"/>
  <xsl:param name="instance"/>
  <xsl:param name="config" select="/*[1=0]"/>
  <xsl:param name="dataModel" select="/*[1=0]"/>
  <xsl:param name="infoModel" select="/*[1=0]"/>
  <xsl:param name="scopes"/>
  <xsl:param name="i18_view" select="'VIEW'"/>
  <xsl:param name="i18_delete" select="'DELETE'"/>
  <xsl:param name="i18_comment" select="'COMMENT'"/>
  <xsl:param name="i18_download" select="'DOWNLOAD'"/>
  <xsl:param name="i18_acknowledged_off" select="'CLICK TO UNACKNOWLEDGE'"/>
  <xsl:param name="i18_acknowledged_on" select="'CLICK TO ACKNOWLEDGE'"/>
  <xsl:param name="doAcknowledge"/>

  <xsl:key name="colHeadById"  match="/*/wrs:Header/wrs:Columns/wrs:C" use="@id"/>
  <xsl:key name="colHeadByPos" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@pos"/>

  <xsl:variable name="hasWriteAccess" select="(contains($scopes,'*') or contains($scopes, concat('|',$scope,'|')))"/>

  <xsl:template match="/*">
    <div>
      <div class='docUploaderContainer'>
        <xsl:for-each select="$config/*/rnd:Scopes/rnd:Scope[@id=$scope]/rnd:Category">
          <div class='category col'>

            <xsl:variable name="category" select="."/>
            <xsl:variable name="maxCount">
              <xsl:choose>
                <xsl:when test="number(@maxCount)!='NaN'"><xsl:value-of select="number(@maxCount)"/></xsl:when>
                <xsl:otherwise>1</xsl:otherwise>
              </xsl:choose>
            </xsl:variable>
            <xsl:variable name="docsPerCat" select="count($infoModel/*/Entry[@catId=$category/@id])"/>
            
            <div class='title'><xsl:value-of select="$category/@caption"/></div>

            <xsl:choose>

              <!-- either we have some documents for current category -->
              <xsl:when test="$docsPerCat &gt; 0">
              
                <!-- loop over all docs for this category -->
                <xsl:for-each select="$infoModel/*/Entry[@catId=$category/@id]">
                  <xsl:call-template name="renderBox">
                    <xsl:with-param name="category" select="$category"/>
                    <xsl:with-param name="entry" select="."/>
                    <xsl:with-param name="maxCount" select="$maxCount"/>
                    <xsl:with-param name="docsPerCat" select="$docsPerCat"/>
                    <xsl:with-param name="pos" select="position()"/>
                  </xsl:call-template>
                </xsl:for-each>
              </xsl:when>
              
              <!-- or we render an empty box -->
              <xsl:otherwise>
                <xsl:call-template name="renderBox">
                  <xsl:with-param name="category" select="$category"/>
                  <xsl:with-param name="entry" select="/*[1=0]"/>
                  <xsl:with-param name="maxCount" select="$maxCount"/>
                  <xsl:with-param name="docsPerCat" select="$docsPerCat"/>
                  <xsl:with-param name="pos" select="position()"/>
                </xsl:call-template>
              </xsl:otherwise>
            </xsl:choose>
            
            <!-- in case we did not reach maxCount, we render an additional empty box (but not when we did not yet upload anything since this is already covered above) -->
            <xsl:if test="$docsPerCat &gt; 0 and $docsPerCat &lt; $maxCount">
              <xsl:call-template name="renderBox">
                <xsl:with-param name="category" select="$category"/>
                <xsl:with-param name="entry" select="/*[1=0]"/>
                <xsl:with-param name="maxCount" select="$maxCount"/>
                <xsl:with-param name="docsPerCat" select="$docsPerCat"/>
                <xsl:with-param name="pos" select="position()"/>
              </xsl:call-template>
            </xsl:if>
          </div>
        </xsl:for-each>
      </div>
    </div>
  </xsl:template>
  
  <xsl:template name="renderBox">
    <xsl:param name="category"/>
    <xsl:param name="entry"/>
    <xsl:param name="maxCount"/>
    <xsl:param name="docsPerCat"/>
    <xsl:param name="pos"/>
    

    <xsl:variable name="catId" select="$category/@id"/>
    <xsl:variable name="required" select="$category/@required"/>
    <xsl:variable name="caption" select="$category/@caption"/>
    <xsl:variable name="dropAllowedClass" select="concat(' pointer_', string($hasWriteAccess))"/>
    <xsl:variable name="docAvailableClass" select="concat(' def_', string(boolean($entry/@fileExists='true')))"/>
    <xsl:variable name="requiredClass" select="concat(' req_', string($required='false' or not($required) or ($required='true' and boolean($entry/@fileExists='true'))))"/>
  
    <div class="{concat('bcdDropArea form-group', $docAvailableClass, $requiredClass, $dropAllowedClass)}" uuid="{$entry/@uuid}" fileSize="{$entry/@fileSize}" fileName="{$entry/@fileName}" comment="{$entry/@comment}" catId="{$catId}" rowId="{$entry/@rowId}">
      <xsl:if test="$hasWriteAccess">
        <xsl:attribute name="onDrop">bcdui.component.docUpload._onDndDrop(event, this)</xsl:attribute>
        <xsl:attribute name="onDragDrop">bcdui.component.docUpload._onDndDrop(event, this)</xsl:attribute>
      </xsl:if>
      <xsl:if test="$entry">
        <div class='actions' style="display:none">
          <xsl:if test="$entry/@fileExists='true'">
            <xsl:if test="$doAcknowledge = 'true'">
              <xsl:variable name="ack"><xsl:if test="$entry/@acknowledged='true'">active</xsl:if></xsl:variable>
              <xsl:variable name="req"><xsl:if test="$required='true'">required</xsl:if></xsl:variable>
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
        </div>
      </xsl:if>
      <div class='row main'>
        <div class='col fileType'>
          <div class="{concat('icon ', $entry/@ext, $docAvailableClass, $requiredClass)}"></div>
        </div>
        <div class='col title'>
          <div class='title'>
            <xsl:value-of select="$caption"/>
            <xsl:choose>
              <xsl:when test="not($entry/@fileName)"></xsl:when>
              <xsl:when test="$maxCount &gt; 1">
                <xsl:value-of select="concat(' (',$pos, '/', $maxCount,')')"/>
              </xsl:when>
            </xsl:choose>
          </div>
        </div>
        <div class='col info small'>
          <xsl:choose>
            <xsl:when test="$entry">
              <div class='icon ts'><xsl:value-of select="$entry/@ts"/></div>
              <div class='icon user'><xsl:value-of select="$entry/@user"/></div>
              <div class='icon fileName'><xsl:value-of select="$entry/@fileName"/></div>
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
      </div>
      <xsl:choose>
        <xsl:when test="$hasWriteAccess">
          <div class='row small icon comment'><div class='col'><textarea rowId="{$entry/@rowId}" placeholder='{$i18_comment}' class='form-control commentinput' maxlength='200' type='text'><xsl:value-of select='$entry/@comment'/></textarea></div></div>
        </xsl:when>
        <xsl:otherwise>
          <div class='row small icon comment'><div class='col'><span class='form-control commentinput'><xsl:value-of select='$entry/@comment'/></span></div></div>
        </xsl:otherwise>
      </xsl:choose>
    </div>
  </xsl:template>
  

</xsl:stylesheet>