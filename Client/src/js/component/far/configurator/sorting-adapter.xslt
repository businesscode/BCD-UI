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
  transforms the adapter configuration model to output suitable for sorting chooser
  input document: undefined/guiStatus (not read)

  the far:Sorting item id is encoded with semantics as:
  [D/M][separator]ID[separator][A/D], meanings:

    [D/M] = dimesnion/measure qualifier
    [separator] = delimiter (magic char)
    [A/D] = ascending/descending ordering qualifier
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:far="http://www.businesscode.de/schema/bcdui/far-1.0.0"
  xmlns="http://www.businesscode.de/schema/bcdui/far-1.0.0">
  <xsl:output method="xml" version="1.0" encoding="UTF-8" indent="no"/>

  <!-- the Status element inside a status document $/Root/guiStatus:Status -->
  <xsl:param name="statusLayoutElement"/>
  <!-- $/Root/Item* for these two -->
  <xsl:param name="dimensions"/>
  <xsl:param name="measures"/>
  <!-- attr names for Dims+Measures -->
  <xsl:param name="idAttrDimension"/>
  <xsl:param name="captionAttrDimension"/>
  <xsl:param name="idAttrMeasure"/>
  <xsl:param name="captionAttrMeasure"/>
  <!-- used to encode item semantics -->
  <xsl:param name="sortingItemSeparator" select="'__'"/>

  <!-- references the layout in status -->
  <xsl:variable name="layout" select="$statusLayoutElement/*/*"/>
  <xsl:variable name="selected.dims" select="$layout/far:Dimensions/far:Item"/>
  <xsl:variable name="selected.meas" select="$layout/far:Measures/far:Item"/>
  <xsl:variable name="selected.sorting" select="$layout/far:Sorting/far:Item"/>
  <xsl:variable name="selected.sortingcat" select="$layout/far:SortingCategory"/>

  <xsl:template match="/">
    <Configuration>
      <Sorting>
        <Categories>
          <xsl:if test="$selected.dims">
            <Item id="dims">Dimensions</Item>
          </xsl:if>
          <xsl:if test="$selected.meas">
            <Item id="meas">Measures</Item>
          </xsl:if>
        </Categories>
        <Items>
          <xsl:apply-templates select="$dimensions/*/*[@*[name()=$idAttrDimension] = $selected.dims]" mode="ordering">
            <xsl:with-param name="cat">dims</xsl:with-param>
            <xsl:with-param name="catQualifier">D</xsl:with-param>
            <xsl:with-param name="idAttr" select="$idAttrDimension"/>
            <xsl:with-param name="captionAttr" select="$captionAttrDimension"/>
          </xsl:apply-templates>  
          <xsl:apply-templates select="$measures/*/*[@*[name()=$idAttrMeasure] = $selected.meas]" mode="ordering">
            <xsl:with-param name="cat">meas</xsl:with-param>
            <xsl:with-param name="catQualifier">M</xsl:with-param>
            <xsl:with-param name="idAttr" select="$idAttrMeasure"/>
            <xsl:with-param name="captionAttr" select="$captionAttrMeasure"/>
          </xsl:apply-templates>
        </Items>
      </Sorting>
    </Configuration>
  </xsl:template>

  <!-- reuse qualifier suffixes for sorting -->
  <xsl:variable name="qsuffix.sort.asc" select="concat($sortingItemSeparator, 'A')"/>
  <xsl:variable name="qsuffix.sort.dsc" select="concat($sortingItemSeparator, 'D')"/>
  <!-- 
    sorting chooser shall only allow to select either desc or asc but not both,
    here we the Item element we define the @doShow flag which is considered in
    the chooser as a filter predicate; also we make life easier for our Dimension/Measures
    selector which we also consider in doShow flag

    @param cat The category: dims,meas
   -->
  <xsl:template match="*" mode="ordering">
    <xsl:param name="cat"/>
    <xsl:param name="catQualifier"/>
    <xsl:param name="idAttr"/>
    <xsl:param name="captionAttr"/>
    <xsl:variable name="id" select="@*[name()=$idAttr]"/>
    <xsl:variable name="caption" select="@*[name()=$captionAttr]"/>
    <!-- 
    doShow is true if:
      no candidate ( asc/desc ) has been selected
      and ( given category is selected or no category selection inplace )
     -->
    <xsl:variable name="doShow" select="
      not($selected.sorting[ substring-before(substring-after(.,$sortingItemSeparator),$sortingItemSeparator) = $id ])
      and ( $selected.sortingcat = $cat or not($selected.sortingcat) )
    "/>
    <Item id="{$catQualifier}{$sortingItemSeparator}{$id}{$qsuffix.sort.asc}" label="{$caption} (asc)" doShow="{$doShow}"/>
    <Item id="{$catQualifier}{$sortingItemSeparator}{$id}{$qsuffix.sort.dsc}" label="{$caption} (desc)" doShow="{$doShow}"/>
  </xsl:template>

</xsl:stylesheet>