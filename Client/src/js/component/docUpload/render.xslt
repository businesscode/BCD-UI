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
  <xsl:param name="isIE" select="'false'"/>

  <xsl:key name="colHeadById"  match="/*/wrs:Header/wrs:Columns/wrs:C" use="@id"/>
  <xsl:key name="colHeadByPos" match="/*/wrs:Header/wrs:Columns/wrs:C" use="@pos"/>

  <xsl:template match="/*">
    <div>
      <h2><xsl:value-of select="concat($scope, ' - ', $instance)"/></h2>
      <div class='docUploaderContainer'>
        <xsl:for-each select="$config/*/rnd:Scopes/rnd:Scope[@id=$scope and (contains($scopes,'*') or contains($scopes, concat('|',$scope,'|')))]/rnd:Category">
          <xsl:variable name="catId" select="@id"/>
          <xsl:variable name="entry" select="$infoModel/*/Entry[@catId=$catId]"/>
          <xsl:variable name="required" select="@required"/>
          <xsl:variable name="docAvailableClass" select="concat(' def_', string(boolean($entry)))"/>
          <xsl:variable name="requiredClass" select="concat(' req_', string($required='false' or not($required) or ($required='true' and boolean($entry))))"/>

          <div class="{concat('bcdDropArea form-group', $docAvailableClass, $requiredClass)}" fileSize="{$entry/@fileSize}" fileName="{$entry/@fileName}" comment="{$entry/@comment}" catId="{$catId}" rowId="{$entry/@rowId}" onDrop="bcdui.component.docUpload.Uploader._onDndDrop(event, this)" onDragDrop="bcdui.component.docUpload.Uploader._onDndDrop(event, this)">
            <xsl:if test="$entry">
              <div class='actions' style="display:none">
                <xsl:choose>
                  <xsl:when test="$isIE='true'">
                    <a class='ieDownload' href=""><span title="{$i18_download}" class='action download'></span></a>
                  </xsl:when>
                  <xsl:otherwise>
                    <a target="_blank" download="{$entry/@download}" href="{concat($bcdContextPath, $entry/@link)}"><span title="{$i18_download}" class='action download'></span></a>
                  </xsl:otherwise>
                </xsl:choose>
                <a target="_blank" href="{concat($bcdContextPath, $entry/@link)}"><span title="{$i18_view}" class='action view'></span></a>
                <span title="{$i18_delete}" class='action delete'></span>
              </div>
            </xsl:if>
            <div class='row main'>
              <div class='col fileType'>
                <div class="{concat('icon ', $entry/@ext, $docAvailableClass, $requiredClass)}"></div>
              </div>
              <div class='col title'>
                <div class='title'><xsl:value-of select="@caption"/></div>
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
            <xsl:if test="$entry">
              <div class='row small icon comment'><div class='col'><textarea rowId="{$entry/@rowId}" placeholder='{$i18_comment}' class='form-control commentinput' maxlength='200' type='text'><xsl:value-of select='$entry/@comment'/></textarea></div></div>
            </xsl:if>
          </div>
        </xsl:for-each>
      </div>
    </div>
  </xsl:template>
  

</xsl:stylesheet>