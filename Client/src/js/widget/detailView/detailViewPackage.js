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
/**
 * A namespace for the BCUDI GUI detailView widget.
 * @namespace bcdui.widget.detailView
 */
bcdui.util.namespace("bcdui.widget.detailView",
/** @lends bcdui.widget.detailView */
{
/**
 *
 * concept of detail-view widget / controller:
 * you attach a detail-view on specific HTML target element and optionally define on which events the
 * detail view shall be constructed, additionally you provide a CSS selector which child elements shall
 * trigger the detail view selection, the defaults are described in method: attachDetailView(), you also
 * provide your rendering function which is called once the detail view is constructed. Sample:
 *
 * x.attachDetailView({
 *   targetRenderer : 'gridRenderer',
 *   containerViewRenderedCb : function(args){
 *     var rowId=args.referenceElement.getAttribute('bcdrowident');
 *     roleSetup.renderDetails({
 *       targetHtmlElement : args.containerElement,
 *       parameters : {
 *         rowId : rowId,
 *         gridController : 'roleSetup'
 *       }
 *     });
 *   },
 *   renderViewContainerFunctionParamsFactory : function(args){
 *     var rowId=args.referenceElement.getAttribute('bcdrowident');
 *     return {
 *       dialog : {
 *         title : bcdui.factory.objectRegistry.getObject('dataModel').dataDoc.selectSingleNode('//wrs:Data/*[@id=rowId]/wrs:C[1]').text
 *       }
 *     };
 *   }
 * });
 *
 */

  /**
   * @param args
   * targetHtmlElement{String|Element}  - to attach listener to
   * targetRenderer{String|Object}      - optional the target renderer, targetHtmlElement has precedence
   * consumeEvent{Boolean}              - optional, default is: FALSE, consumes the event or allow propagation
   *
   * childElementSelector{String}       - filter (jQuery) compatible for filtering on nested children, default is "tbody tr"
   * event{String}            - event to attach on , default is 'dblclick'
   * filterFunction{Function} - a filter function to check on target element if to pass, default is a filter
   *                            function expecting targetElement to have 'bcdrowident' attribute
   *                            this function shall return TRUE of FALSE, an argument is provided to the function
   *                            containing following properties:
   *                            eventContext.event - the event
   *                            eventContext.targetElement - the target element where event has occurred
   * renderViewContainerFunction{Function}  - a function which renders the view container, the default implementation is
   *                                          renderDialogContainer(), please refer to docs for more infos, arguments passed to this function:
   *                                          factoryArgs{Object}                 - the initial factory args which were provided attachDetailView() function, may be null
   *                                          eventContext.event{Object}          - the event object which triggered this function, may be null
   *                                          eventContext.targetElement{Element} - the target element which event occurred, may be null
   *                                          referenceElement{Element}           - is eventContext.targetElement
   *                                          targetHtmlElement{Element}          - element to attach view container on
   * renderViewContainerFunctionParamsFactory{Function} - factory for additional params which are mixed-in to the argument of renderViewContainerFunction()
   *                                                      available through extra.* property; this function gets same arguments as 'renderViewContainerFunction'
   * containerViewRenderedCb{Function}      - a function which is called by renderViewContainerFunction() once container is contructed
   *
   *
   * @return args, additionally contains .unbind() function which stops this handler working; when called that function, you have to attachDetailView() again
   */
  attachDetailView : function(args){
    // check if we are attached on a renderer
    if(!args.targetHtmlElement && args.targetRenderer){
      var renderObj = bcdui.util.isString(args.targetRenderer) ? bcdui.factory.objectRegistry.getObject(args.targetRenderer) : args.targetRenderer;

      if(renderObj){
        // obtain target htmlelement from renderer
        args.targetHtmlElement = renderObj.targetHTMLElementId;
        if(!args.targetHtmlElement){
          throw "the targetRenderer does not contain .targetHTMLElementId property, are you sure it is a renderer? targetRenderer:" + args.targetRenderer;
        }
      } else {
        // ok, get ready for renderer
        bcdui.factory.objectRegistry.withReadyObjects(args.targetRenderer,function(){
          bcdui.widget.detailView.attachDetailView(args);
        }, true);
        return;
      }
    }

    args = jQuery.extend({
      // defaults
       childElementSelector : "tbody tr"
      ,listenEvent : "dblclick"
      ,filterFunction : function(args){ return !!args.eventContext.targetElement.getAttribute("bcdrowident"); }
      ,renderViewContainerFunction : bcdui.widget.detailView.renderDialogContainer
      ,consumeEvent : false
    },args);

    if(!args.targetHtmlElement){
      throw "targetHtmlElement is not provided, cannot attach";
    }
    if(!args.containerViewRenderedCb && args.renderViewContainerFunction == bcdui.widget.detailView.renderDialogContainer){
      throw "you are using the default renderViewContainerFunction but have no containerViewRenderedCb provided";
    }

    var targetEl = bcdui.util.isString(args.targetHtmlElement) ? jQuery("#" + args.targetHtmlElement) : jQuery(args.targetHtmlElement);
    args.targetHtmlElement = targetEl.get(0);

    if(!targetEl.length){
      throw "no target element found!";
    }

    var handler = function(event){
      if(!args.filterFunction || args.filterFunction({
        eventContext:{
          event : event,
          targetElement : this
        }
      })){
        var params = {
          factoryArgs:args,
          eventContext:{
            event : event,
            targetElement : this
          },
          targetHtmlElement : args.targetHtmlElement,
          containerViewRenderedCb : args.containerViewRenderedCb,
          referenceElement : this
        };
        if(args.renderViewContainerFunctionParamsFactory){
          params.extra = args.renderViewContainerFunctionParamsFactory(params);
        }
        args.renderViewContainerFunction(params);
      }

      if(args.consumeEvent){
        event.stopPropagation();
      }

      // handle dblclick event
      if(event.type == "dblclick"){
        bcdui.widget.detailView._clearAllSelection();
      }
    };

    if(args.childElementSelector){
      targetEl.on(args.listenEvent, args.childElementSelector, handler);
    } else {
      targetEl.on(args.listenEvent,handler);
    }

    args.unbind = function(){
      targetEl.off(args.listenEvent, handler);
    };

    return args;
  },

  /**
   * clears any selection
   * @private
   */
  _clearAllSelection : function() {
    if(document.selection && document.selection.empty) {
        document.selection.empty();
    } else if(window.getSelection) {
        var sel = window.getSelection();
        sel.removeAllRanges();
    }
  },

  /**
   * renders a details view container for given element, this implementation renders jQuery.dialog,
   * you can override any attributes via extra.dialog object parameter
   *
   * @param args
   *  targetHtmlElement                   - the target element this container is attached to
   *  referenceElement{Element}           - the the element this detail container is constructed for
   *  containerViewRenderedCb             - the function which is called once target container is constructed and argument with
   *                                        following properties is provided:
   *                                        targetHtmlElement{Element}  - the element to render content into, this may be reused so ensure executing .empty() before adding content
   *                                        referenceElement{Element}   - see above
   * ---
   * specific parameters, which are available in this function,
   * but is not API contract, i.e. in case you provide your custom
   * renderViewContainer function
   * ---
   *  extra.dialog{Object}                - extra parameters to jQuery Dialog UI plugin, which are mixed-in at construction time; you overwrite the defaults!
   *  extra.dialog.disableCloseControl    - special param to remove the [close] control from standard ui-dialog bar, so close() can be issued via API/Event only
   *
   *
   * @return jQuery object ( container element )
   */
  renderDialogContainer : function(args){
    // re-use container element
    var containerElement = jQuery("#" + args.targetHtmlElement.getAttribute("bcd-detail-view-container-id")).get(0);
    if(!containerElement){
      var containerElementId = "bcd_dtl_vw_container"+bcdui.factory.objectRegistry.generateTemporaryId();
      args.targetHtmlElement.setAttribute("bcd-detail-view-container-id", containerElementId);
      containerElement = jQuery("<div id='"+containerElementId+"' class='bcd-detail-view-container'/>").appendTo(document.body);
      // decorate waiting - it will be anyway removed during rendering
      containerElement.append(jQuery("<div class='statusNotReady'>&#160;</div>"));
    }

    if(!args.extra)args.extra={};
    var el = jQuery(containerElement).dialog(jQuery.extend({
      width : 800,
      //height : 640,
      minWidth : 100,
      minHeight : 80,
      modal : true,
      closeOnEscape : true,
      position : {
        my : "center center",
        at : "center center"
      },
      resizable : true,
      draggable : true,
      closeText : 'x',
      //title : "Title",
      open : function() {
        args.containerViewRenderedCb({
          targetHtmlElement : this,
          referenceElement : args.referenceElement
        });
      },
      beforeClose : function(){
        return true;
      },
      close : function() {
        // we have to clean UI to tidy up jQuery Widgets
        jQuery(containerElement).empty();
      }
    },args.extra.dialog));

    // ### lets do some decorations ###
    jQuery('.ui-widget-overlay').addClass('bcd-detailview-overlay');

    var titleBar = el.closest(".ui-dialog").addClass('bcd-detailview-dialog').find(".ui-dialog-titlebar");
    titleBar.addClass('bcd-detailview-titlebar');
    // ok they dont want to have a close-control
    if(args.extra.dialog.disableCloseControl){
      titleBar.find(".ui-dialog-titlebar-close").remove();
    }
    // remove title-bar if it has no contents
    if(!titleBar.text().trim()){
      titleBar.remove();
    }
    return el;
  }
});