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
import java.io.OutputStream;

import javax.servlet.ServletOutputStream;

/**
 * This class wrapped the ServletOutputStream functionality in order to provide the possibility to write a data to two streams.
 */
public class TeeOutputStreamWrapper extends ServletOutputStream {
    private ServletOutputStream wrapped;
    private OutputStream target;

    /**
     * Constructor
     * @param streamToWrap
     * @param target
     */
    public TeeOutputStreamWrapper(ServletOutputStream streamToWrap, OutputStream target) {
        this.wrapped = streamToWrap;
        this.target = target;
    }

    /**
     * @see java.io.OutputStream#write(int)
     */
    @Override
    public void write(int b) throws IOException {
        try {
            target.write(b);
        }
        catch (Throwable t) {
            t.printStackTrace();
        }
        finally {
            wrapped.write(b);
        }
    }

    /**
     * @see java.io.OutputStream#flush()
     */
    @Override
    public void flush() throws IOException {
        try{
            target.flush();
        }
        catch (Exception e) {
            throw new IOException(e);
        }
        finally{
            try{
                wrapped.flush();
            }
            catch (Exception e) {
                throw new IOException(e);
            }
        }
    }

    /**
     * @see java.io.OutputStream#close()
     */
    @Override
    public void close() throws IOException {
        try{
            target.close();
        }
        catch (Exception e) {
            throw new IOException(e);
        }
        finally{
            try{
                wrapped.close();
            }
            catch (Exception e) {
                throw new IOException(e);
            }
        }
    }
}