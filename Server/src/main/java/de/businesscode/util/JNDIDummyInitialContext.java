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


import java.util.Hashtable;

import javax.naming.Binding;
import javax.naming.Context;
import javax.naming.Name;
import javax.naming.NameClassPair;
import javax.naming.NameParser;
import javax.naming.NamingEnumeration;
import javax.naming.NamingException;
import javax.naming.spi.InitialContextFactory;


/**
 * some of BUI lib features requires
 * JNDI. This dummy would serve it when
 * no JNDI is available.
 *
 */
public class JNDIDummyInitialContext implements InitialContextFactory {
  /*
   * @see javax.naming.spi.InitialContextFactory#getInitialContext(java.util.Hashtable)
   */
  @Override
  public Context getInitialContext(Hashtable<?, ?> environment)throws NamingException {
    return new Context() {
      @Override
      public void unbind(String name) throws NamingException {
      }

      @Override
      public void unbind(Name name) throws NamingException {
      }

      @Override
      public void rename(String oldName, String newName) throws NamingException {
      }

      @Override
      public void rename(Name oldName, Name newName) throws NamingException {
      }

      @Override
      public Object removeFromEnvironment(String propName) throws NamingException {
        return null;
      }

      @Override
      public void rebind(String name, Object obj) throws NamingException {
      }

      @Override
      public void rebind(Name name, Object obj) throws NamingException {
      }

      @Override
      public Object lookupLink(String name) throws NamingException {
        return null;
      }

      @Override
      public Object lookupLink(Name name) throws NamingException {
        return null;
      }

      @Override
      public Object lookup(String name) throws NamingException {
        if(true){
          throw new NamingException();
        }
        return null;
      }

      @Override
      public Object lookup(Name name) throws NamingException {
        if(true){
          throw new NamingException();
        }
        return null;
      }

      @Override
      public NamingEnumeration<Binding> listBindings(String name)
          throws NamingException {
        return null;
      }

      @Override
      public NamingEnumeration<Binding> listBindings(Name name)
          throws NamingException {
        return null;
      }

      @Override
      public NamingEnumeration<NameClassPair> list(String name)
          throws NamingException {
        return null;
      }

      @Override
      public NamingEnumeration<NameClassPair> list(Name name)
          throws NamingException {
        return null;
      }

      @Override
      public NameParser getNameParser(String name) throws NamingException {
        return null;
      }

      @Override
      public NameParser getNameParser(Name name) throws NamingException {
        return null;
      }

      @Override
      public String getNameInNamespace() throws NamingException {
        return null;
      }

      @Override
      public Hashtable<?, ?> getEnvironment() throws NamingException {
        return null;
      }

      @Override
      public void destroySubcontext(String name) throws NamingException {
      }

      @Override
      public void destroySubcontext(Name name) throws NamingException {
      }

      @Override
      public Context createSubcontext(String name) throws NamingException {
        return null;
      }

      @Override
      public Context createSubcontext(Name name) throws NamingException {
        return null;
      }

      @Override
      public String composeName(String name, String prefix) throws NamingException {
        return null;
      }

      @Override
      public Name composeName(Name name, Name prefix) throws NamingException {
        return null;
      }

      @Override
      public void close() throws NamingException {

      }

      @Override
      public void bind(String name, Object obj) throws NamingException {
      }

      @Override
      public void bind(Name name, Object obj) throws NamingException {

      }

      @Override
      public Object addToEnvironment(String propName, Object propVal)
          throws NamingException {
        return null;
      }
    };
  }

}
