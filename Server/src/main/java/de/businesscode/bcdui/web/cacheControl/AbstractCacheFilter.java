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

import java.util.List;

import javax.servlet.Filter;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import de.businesscode.bcdui.toolbox.FilterUtils;

/**
 * Implements a abstract filter class for reading expire mode and value.
 *
 */
public abstract class AbstractCacheFilter implements Filter {
    private Expires definedExpires;
    private String expiresValue;

    /**
     * Constructor
     */
    public AbstractCacheFilter() {
    }

    /**
     * @see javax.servlet.Filter#init(javax.servlet.FilterConfig)
     */
    @Override
    public void init(FilterConfig filterConfig) throws ServletException
    {
        for (Expires e : Expires.values()) {
            String initParameter = filterConfig.getInitParameter(e.name());
            if (initParameter != null) {
                setDefinedExpires(e);
                if(e == Expires.CacheRequestDirective){
                    setExpiresValue(initParameter);
                }
                else{
                    List<String> valuesAsList = FilterUtils.getValuesAsList(initParameter);
                    setExpiresValue(valuesAsList.size() > 0 ? valuesAsList.get(0) : null);
                }
                break;
            }
        }
    }

    /**
     * @return the definedExpires
     */
    protected Expires getDefinedExpires() {
        return definedExpires;
    }

    /**
     * @param definedExpires
     *            the definedExpires to set
     */
    private void setDefinedExpires(Expires selectedExpires) {
        this.definedExpires = selectedExpires;
    }

    /**
     * @return the expiresValue
     */
    protected String getExpiresValue() {
        return expiresValue;
    }

    /**
     * @param expiresValue
     *            the expiresValue to set
     */
    private void setExpiresValue(String expiresValue) {
        this.expiresValue = expiresValue;
    }
}
