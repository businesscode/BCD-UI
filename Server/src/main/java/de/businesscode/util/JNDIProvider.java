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
package de.businesscode.util;

import java.io.File;
import java.io.FileReader;
import java.io.Reader;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

import javax.naming.Context;
import javax.naming.InitialContext;
import javax.naming.NamingException;

import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;

import de.businesscode.bcdui.toolbox.config.ConfigurationProvider;


/**
 * Provider class for JNDI access easing.
 * Per default goes to JNDI environment but LocalConfiguration will get its values from a properties file
 */
public class JNDIProvider implements ConfigurationProvider {
  /**
   * @deprecated will be removed after BCD-UI 4.5
   */
  @Deprecated
  private static JNDIProvider instance = null;

  protected Map<String, Object> configurationParameters = Collections.synchronizedMap(new HashMap<String, Object>());
  protected Logger log = LogManager.getLogger(this.getClass());


  /**
   *
   * @return
   * @deprecated will be removed after BCD-UI 4.5
   */
  @Deprecated
  public synchronized static JNDIProvider getInstance() {
    if (instance == null)
      instance = new JNDIProvider();
    return instance;
  }

  /**
   *
   * @param propsFile
   * @return
   * @deprecated will be removed after BCD-UI 4.5
   */
  @Deprecated
  public static JNDIProvider getLocalInstance(String propsFile)
  {
    if (instance == null)
    {
      instance = new LocalConfiguration(propsFile);
    }
    return instance;
  }

  private Context ctx;

  /**
   * initializes JNDI context java:comp/env, implements caching of parameters, use {@link #purgeCache()} to clear cache
   */
  public JNDIProvider() {
    init();
  }

  /**
   * purges cache ATTENTION this method also deletes parameters previously added via {@link #putConfigurationParameter(String, Object)}
   */
  public void purgeCache() {
    configurationParameters.clear();
  }

  protected void init() throws RuntimeException
  {
    try {
      ctx = (Context) new InitialContext().lookup("java:comp/env");
      if(log.isDebugEnabled()){
        log.debug("initial context loaded");
      }
    } catch (NamingException e) {
      //try to recover with dummy context
      try{
        log.info("no JNDI context found - loading dummy context");
        Properties p = new Properties();
        p.put(Context.INITIAL_CONTEXT_FACTORY,"de.businesscode.util.JNDIDummyInitialContext");

        ctx = new InitialContext(p);
      }catch(NamingException e2) {
        throw new RuntimeException(e2);
      }
    }
  }

  @SuppressWarnings("unchecked")
  @Override
  public <T> T getConfigurationParameter(String id, T defaultValue) {
    try {
      return (T)getConfigurationParameter(id);
    } catch (RuntimeException e) {
      return defaultValue;
    }
  }

  @Override
  public Object getConfigurationParameterOrNull(String id) {
    try {
      return getConfigurationParameter(id);
    } catch (RuntimeException e) {
      return null;
    }
  }

  @Override
  public Object getConfigurationParameter(String id) {
    try {
      Object o = configurationParameters.get(id);
      if (o == null) {
        o = ctx.lookup(id);
        configurationParameters.put(id, o);
      }
      return o;
    } catch (NamingException e) {
      throw new RuntimeException(e);
    }
  }

  /**
   * stores and object at given id in the properties. Does overwrite the old reference in case
   * one existed. ATTENTION: this is NOT persistent, the configuration parameters are reset during
   * reload of a context / application.
   *
   * @param id
   * @param value
   * @return an object previously set at given id or NULL in case the id has never been used before
   */
  public Object putConfigurationParameter(String id, Object value){
    return configurationParameters.put(id, value);
  }

  private static class LocalConfiguration extends JNDIProvider
  {
    private LocalConfiguration(String propsFile)
    {
      Properties props = new Properties();
      try
      {
        final File file = new File(propsFile);
        if (file != null && file.canRead())
        {
          final Reader reader = new FileReader(file);
          props.load(reader);

          for (Object k : props.keySet() )
          {
            configurationParameters.put((String) k, props.get(k));
          }
        }
        else
        {
          System.err.println("Could not load Properties from file: " + propsFile);
        }
      }
      catch (Exception e)
      {
        throw new RuntimeException(e);
      }
    }

    @Override
    protected void init() throws RuntimeException
    {
    }

    @Override
    @SuppressWarnings("unchecked")
   public <T> T getConfigurationParameter(String id, T defaultValue)
    {
      Object o = configurationParameters.get(id);
      return o == null ? defaultValue : (T) o;
    }

    @Override
    public Object getConfigurationParameter(String id)
    {
      Object o = configurationParameters.get(id);
      if (o == null)
      {
        throw new RuntimeException("JNDIProvider parameter not defined: " + id);
      }
      return o;
    }

    @Override
    public Object getConfigurationParameterOrNull(String id)
    {
      return configurationParameters.get(id);
    }
  }
}
