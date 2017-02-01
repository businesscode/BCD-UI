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
package de.businesscode.bcdui.web.cacheControl.server.wrapper;

import java.io.IOException;
import java.io.Writer;
import org.apache.log4j.Level;
import org.apache.log4j.Logger;




/**
 *
 * tees the writer, ignores exceptions on a cloned object, however
 * they are logged with warning level. Autoflushable
 *
 */
public class TeeWriterWrapper extends Writer {
  private Writer target,clone;
  private Logger log = Logger.getLogger(getClass());

  public TeeWriterWrapper(Writer target, Writer clone) {
    this.target = target;
    this.clone = clone;
  }

  @Override
  public void close() throws IOException {
    try{clone.close();}catch(Throwable t){log.log(Level.WARN, "Failed to tee", t);}
    target.close();
  }

  @Override
  public void flush() throws IOException {
    try{clone.flush();}catch(Throwable t){log.log(Level.WARN, "Failed to tee", t);}
    target.flush();
  }

  @Override
  public void write(char[] cbuf, int off, int len) throws IOException {
    try{clone.write(cbuf, off, len); flush();}catch(Throwable t){log.log(Level.WARN, "Failed to tee", t);}
    target.write(cbuf,off,len);
  }
}
