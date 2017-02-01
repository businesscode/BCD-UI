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
package de.businesscode.bcdui.web.cacheControl;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;

import javax.servlet.http.HttpServletResponse;

/**
 * This class provides the proxy implementation of the HttpServletResponse class.
 */
public class HttpServletResponseInvocationHandler implements InvocationHandler {
    private HttpServletResponse target;
    private String key;
    private ServerCachingFilter serverCacheControl;

    /**
     * Constructor
     * @param response
     * @param key
     * @param serverCacheControl
     */
    public HttpServletResponseInvocationHandler(HttpServletResponse response, String key, ServerCachingFilter serverCacheControl) {
        this.target = response;
        this.key = key;
        this.serverCacheControl = serverCacheControl;
    }

    /**
     * @see java.lang.reflect.InvocationHandler#invoke(java.lang.Object, java.lang.reflect.Method, java.lang.Object[])
     */
    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {

        if ("getOutputStream".equals(method.getName())) {
            return serverCacheControl.wrap(key, target.getOutputStream());
        } else if ("getWriter".equals(method.getName())) {
            return serverCacheControl.wrap(key, target.getWriter());
        }

        return method.invoke(target, args);
    }
}