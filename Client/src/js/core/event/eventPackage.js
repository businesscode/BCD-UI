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
 * @namespace bcdui.core.event
 */
bcdui.util.namespace("bcdui.core.event", {
  EventType : class {
    constructor(typeId){
      this.typeId = typeId;
    }
  }
  ,
  Observable : class {
    constructor(){
      /*
       * a map of array of callback functions (listeners)
       */
      this.typeListenerMap = {GLOBAL:[]};
    }

    fire(eventType){
      var targetTypes = ["GLOBAL", eventType.typeId];
      for(var k=0;k<targetTypes.length;k++){
        var targetTypeListeners = this.typeListenerMap[targetTypes[k]];
        if(targetTypeListeners == null)continue;

        for(var i=0;i<targetTypeListeners.length;i++){
          try{
            targetTypeListeners[i]();
          }catch(e){
            bcdui.log.isDebugEnabled() && bcdui.log.debug("event listener for event " + eventType.typeId + " thrown error: ", e);
          }
        }
      }
    }

    /*
     * use eventType = null for global event listeners or a concrete one
     */
    addListener(eventType, listenerFn){
      if(eventType == null){
        this.typeListenerMap["GLOBAL"].push(listenerFn);
      }else{
        var eventTypeListeners = this.typeListenerMap[eventType.typeId];
        if(!eventTypeListeners){
          eventTypeListeners = this.typeListenerMap[eventType.typeId] = [];
        }
        eventTypeListeners.push(listenerFn);
      }
    }
  }
}); //namespace
