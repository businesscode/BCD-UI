/*
  Copyright 2010-2021 BusinessCode GmbH, Germany

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
package de.businesscode.bcdui.vfs.provider.database;
import java.io.InputStream;
import java.sql.ResultSet;

import de.businesscode.bcdui.wrs.load.AbstractDataWriter;
import de.businesscode.bcdui.wrs.load.IDataWriter;
import de.businesscode.util.jdbc.DatabaseCompatibility;

public abstract class VFSDataWriter extends AbstractDataWriter implements IDataWriter {

  private static final String BCDVIRTUALFILESYSTEM = "bcd_virtualFileSystem";

  private InputStream iStr = null;

  public InputStream getInputStream() { return iStr; }

  @Override
  public void close() throws Exception { }

  @Override
  protected void write() throws Exception {

    ResultSet rs = getResultSet();
    if (rs != null && rs.next()) {

      // First, try to use the clob content
      iStr = DatabaseCompatibility.getInstance().getClobInputStream(BCDVIRTUALFILESYSTEM, rs, 2);

      // Otherwise use the binary content
      // the rs.getBinaryStream() cannot be accessed after the rs/stmt were closed so we read the content and put it in an new Stream
      if (iStr == null)
        iStr = DatabaseCompatibility.getInstance().getBlobInputStream(BCDVIRTUALFILESYSTEM, rs, 3);
    }
  }
}
