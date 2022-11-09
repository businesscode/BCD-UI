/*
  Copyright 2010-2022 BusinessCode GmbH, Germany

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
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.sql.ResultSet;
import java.sql.Types;

import de.businesscode.bcdui.wrs.load.AbstractDataWriter;
import de.businesscode.bcdui.wrs.load.IDataWriter;
import de.businesscode.util.jdbc.DatabaseCompatibility;

public abstract class VFSDataWriter extends AbstractDataWriter implements IDataWriter {

  private static final String BCDVIRTUALFILESYSTEM = "bcd_virtualFileSystem";
  private static final int CLOB_COLUMN = 2;
  private static final int BLOB_COLUMN = 3;

  private InputStream iStr = null;

  public InputStream getInputStream() { return iStr; }

  @Override
  public void close() throws Exception { }

  @Override
  protected void write() throws Exception {

    ResultSet rs = getResultSet();
    if (rs != null && rs.next()) {

      // First, try to use the clob content
      // if column is not a CLOB, read it as TEXT
      if (rs.getMetaData().getColumnType(CLOB_COLUMN) == Types.CLOB)
        iStr = DatabaseCompatibility.getInstance().getClobInputStream(BCDVIRTUALFILESYSTEM, rs, CLOB_COLUMN);
      else {
        String content = rs.getString(CLOB_COLUMN);
        if (content != null)
          iStr = new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8));
      }

      // Otherwise use the binary content
      // the rs.getBinaryStream() cannot be accessed after the rs/stmt were closed so we read the content and put it in an new Stream
      if (iStr == null) {
        // if column is not a BLOB, read it as bytes
        iStr = (rs.getMetaData().getColumnType(BLOB_COLUMN) == Types.BLOB)
            ? DatabaseCompatibility.getInstance().getBlobInputStream(BCDVIRTUALFILESYSTEM, rs, BLOB_COLUMN)
            : new ByteArrayInputStream(rs.getBytes(BLOB_COLUMN));
      }
    }
  }
}
