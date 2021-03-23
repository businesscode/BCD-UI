/*
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
*/
"use strict";
/**
 * @fileoverview
 * bcdui.widget.menu
 */

/**
 * @namespace bcdui.widget.menu
 */
bcdui.util.namespace("bcdui.widget.menu").Menu = class
/**
 * @lends bcdui.widget.menu.Menu.prototype
 */
{
  /**
   * @param args
   * @param {String|HTMLElement} args.rootIdOrElement         root Node of the menu (ul)
   * @param {String} args.name                                name of the variable that stores the result
   *                                                           of this constructor function
   * @param {function} args.customConfigFunction              optional config function to override the default settings
   *                                                          for an example see Menu.prototype.config
   * @constructs
   */
  constructor(args) {

    this.name = (args.name != null && args.name != "") ? args.name : "$menu";
    this.rootId = (args.rootIdOrElement != null && args.rootIdOrElement != "") ? args.rootIdOrElement : "root_bcdDefault";
    this.type = this.getClassName();
    this.closeDelayTimer = null;
    this.closingMenuItem = null;

    this._config();
    if (typeof args.customConfigFunction == "function") {
      this.customConfig = args.customConfigFunction;
      this.customConfig();
    }
    this.rootContainer = this._createMenuContainer(this.rootId, this);
  }

  getClassName() {return "menu";}

  /**
   * these two create methods make it possible to extend MenuContainer and MenuItem without
   * replacing all other classes. So please never directly new those classes. You never know
   * what the client wants to have for those classes.
   * @private
   */
  _createMenuItem( node, menuContainer ) {
    return new bcdui.widget.menu.MenuItem( node, menuContainer );
  }

  /**
   * @private
   */
  _createMenuContainer( node, menuContainer ) {
    return new bcdui.widget.menu.MenuContainer( node, menuContainer );
  }

  /**
   * @private
   */
  _config() {
    this.collapseBorders = true;
    this.quickCollapse = true;
    this.closeDelayTime = 500;
  }

};

/**
 *  MenuContainer
 */
bcdui.util.namespace("bcdui.widget.menu").MenuContainer = class
/**
 * @lends bcdui.widget.menu.MenuContainer.prototype
 */
{
  /**
   * @constructs
   */
  constructor(idOrElement, parent, args) {

    if (args && args.bcdPreInit)
      args.bcdPreInit.call(this);

    this.type = this.getClassName();
    this.menuItems = [];
    this.init(idOrElement, parent);
  }

  /**
   * @private
   */
  init(idOrElement, parent) {
    this.element = bcdui._migPjs._$(idOrElement).get(0);
    this.parent = parent;
    this.parentMenu = (this.type == "menuContainer") ? ((parent) ? parent.parent : null) : parent;
    this.root = parent.type == "menu" ? parent : parent.root;

    if (this.type == "menuContainer") {
      if (bcdui._migPjs._$(this.element).hasClass("bcdLevel1")) this.menuType = "horizontal";
      else
        if (bcdui._migPjs._$(this.element).hasClass("bcdLevel2")) this.menuType = "dropdown";
        else this.menuType = "flyout";

      if (this.menuType == "flyout" || this.menuType == "dropdown") {
        this.isOpen = false;
        bcdui._migPjs._$(this.element).css({
          position: "absolute",
          top: "0px",
          left: "0px",
          visibility: "hidden"
        });
      } else {
        this.isOpen = true;
      }
    } else {
      this.isOpen = this.parentMenu.isOpen;
    }

    var childNodes = this.element.childNodes;
    if (childNodes == null) return;

    for (var i = 0; i < childNodes.length; i++) {
      var node = childNodes[i];
      if (node.nodeType == 1) {
        if (this.type == "menuContainer") {
          if (node.tagName.toLowerCase() == "li") {
            this.menuItems.push( this.root._createMenuItem(node, this));
          }
        } else {
          if (node.tagName.toLowerCase() == "ul") {
            this.subMenu = this.root._createMenuContainer(node, this);
          }
        }
      }
    }
  }

  getClassName() {return "menuContainer";}
  /**
   * @private
   */
  _getBorders(element) {
    var ltrb = ["Left","Top","Right","Bottom"];
    var result = {};
    for (var i = 0; i < ltrb.length; ++i) {
      if (bcdui.browserCompatibility.isIE)
        var value = parseInt(this.element.currentStyle["border"+ltrb[i]+"Width"]);
      else if (window.getComputedStyle)
        var value = parseInt(window.getComputedStyle(this.element, "").getPropertyValue("border-"+ltrb[i].toLowerCase()+"-width"), 10);
      else
        var value = parseInt(this.element.style["border"+ltrb[i]], 10);
      result[ltrb[i].toLowerCase()] = isNaN(value) ? 0 : value;
    }
    return result;
  }
  /**
   * open function
   * @private
   */
  _open() {
    if (this.root.closeDelayTimer) window.clearTimeout(this.root.closeDelayTimer);
    this.parentMenu._closeAll(this);
    this.isOpen = true;
    if (this.menuType == "dropdown") {// set UL position
      bcdui.util.clonePosition(this.element, this.parent.element, {
        setWidth: false,
        setHeight: false,
        offsetTop: bcdui._migPjs._$(this.parent.element).outerHeight()
      });
    }
    else if (this.menuType == "flyout") {

      var parentMenuBorders = this.parentMenu ? this.parentMenu._getBorders() : new Object();
      var thisBorders = this._getBorders();
      // reposition

      var nextLeft = jQuery(this.parent.element).offset().left + this.parentMenu.element.offsetWidth + this.element.offsetWidth + 20;
      var winLeft  = jQuery(window).outerWidth();

      if( nextLeft > winLeft ) {
        bcdui._migPjs._$(this.element).css({left: (- this.element.offsetWidth - (this.root.collapseBorders ?  0 : parentMenuBorders["left"])) + "px"});
      }
      else {
        bcdui._migPjs._$(this.element).css({left: (this.parentMenu.element.offsetWidth - parentMenuBorders["left"] - (this.root.collapseBorders ?  Math.min(parentMenuBorders["right"], thisBorders["left"]) : 0)) + "px"});
      }

      bcdui._migPjs._$(this.element).css({top: (this.parent.element.offsetTop - parentMenuBorders["top"] - this.menuItems[0].element.offsetTop) + "px"});

    }
    bcdui._migPjs._$(this.element).css({visibility: "visible"});
  }

  /**
   * Close the menu
   * @private
   */
  _close() {
    bcdui._migPjs._$(this.element).css({visibility: "hidden"});
    this.isOpen = false;
    this._closeAll();
  }

  /**
   * Close all menu items
   * @private
   */
  _closeAll(trigger) {
    for (var i = 0; i < this.menuItems.length; ++i) {
      this.menuItems[i]._closeItem(trigger);
    }
  }

};

bcdui.util.namespace("bcdui.widget.menu")

/**
 * Menu
 */
 bcdui.widget.menu.MenuItem = class extends bcdui.widget.menu.MenuContainer
 /**
   * @lends bcdui.widget.menu.MenuItem.prototype
   */
  {
  /**
   * @constructs
   * @extends bcdui.widget.menu.MenuContainer
   */
  constructor(idOrElement, parent) {
    /**
     * @ignore
     */
    super(idOrElement, parent, {
      bcdPreInit: function() {
        this.type = this.getClassName();
        this.subMenu = null;
      }
    });
    var menuItem = this;
    if (this.subMenu) {
      this.element.onmouseover = function() {
        menuItem.subMenu._open();
      }
    }
    else
    {
      if (this.root.quickCollapse) {
        this.element.onmouseover = function() {menuItem.parentMenu._closeAll();}
      }
    }
    var linkTag = this.element.getElementsByTagName("A")[0];
    if (linkTag) {
      linkTag.onfocus = this.element.onmouseover;
      this.link = linkTag;
      this.text = linkTag.text;
    }
    if (this.subMenu) {
      this.element.onmouseout = function() {
        if (menuItem.root.openDelayTimer) window.clearTimeout(menuItem.root.openDelayTimer);
        if (menuItem.root.closeDelayTimer) window.clearTimeout(menuItem.root.closeDelayTimer);
        eval(menuItem.root.name)["closingMenuItem"] = menuItem;
        menuItem.root.closeDelayTimer = window.setTimeout(menuItem.root.name + ".closingMenuItem.subMenu._close()", menuItem.root.closeDelayTime);
      }
    }
  }

  getClassName() {return "menuItem";}

  /**
   * Open the item
   * @private
   */
  _openItem() {
    this.isOpen = true;
    if (this.subMenu) { this.subMenu._open(); }
  }

  /**
   * Close the item
   * @private
   */
  _closeItem(trigger) {
    this.isOpen = false;
    if (this.subMenu) {
      if (this.subMenu != trigger) this.subMenu._close();
    }
  }
};
