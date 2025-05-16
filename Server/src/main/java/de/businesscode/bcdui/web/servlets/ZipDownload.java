/*
  Copyright 2010-2025 BusinessCode GmbH, Germany

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
package de.businesscode.bcdui.web.servlets;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import de.businesscode.bcdui.web.servlets.StaticResourceServlet.Resource;
import de.businesscode.bcdui.web.servlets.StaticResourceServlet.StaticResourceProvider;
import de.businesscode.util.StandardNamespaceContext;
import jakarta.servlet.ServletContext;
import jakarta.servlet.ServletOutputStream;

public class ZipDownload {
  
  private HashMap<String, String> fileMap = new HashMap<>(); 
  
  public ZipDownload(Document zipInfo) {
    buildFileMap(zipInfo);
  }

  private void buildFileMap(Document doc) {
    fileMap.clear();
    if (doc != null) {
      NodeList zip = doc.getElementsByTagNameNS(StandardNamespaceContext.VFS_NAMESPACE, "Zip");
      if (zip.getLength() > 0) {
        NodeList entries = zip.item(0).getChildNodes();
        parseFiles(entries, fileMap, "");
      }
    }
  }

  private void parseFiles(NodeList entries, HashMap<String, String> files, String prefix) {
    // recursively read the files in the vfs config xml
    // and remember the mapped filenames

    for (int i = 0; i < entries.getLength(); i++) {
      if ("Folder".equals(entries.item(i).getLocalName())) {
        String name = ((Element)(entries.item(i))).getAttribute("name");
        NodeList c = entries.item(i).getChildNodes();
        if (c.getLength() > 0) {
          parseFiles(c, files, prefix + (prefix.endsWith("/") ? "" : "/") + name);
        }
      }
      if ("File".equals(entries.item(i).getLocalName())) {
        String name = ((Element)(entries.item(i))).getAttribute("name");
        String pureFileName = name;
        if (pureFileName.lastIndexOf("/") != -1)
          pureFileName = pureFileName.substring(pureFileName.lastIndexOf("/") + 1);
          files.put(name, prefix + (prefix.endsWith("/") ? "" : "/") + pureFileName);
      }
    }
  }
  
  public ArrayList<String> getZip(ServletContext context, ServletOutputStream outputStream) throws IOException {
    ZipOutputStream zipOut = new ZipOutputStream(outputStream);

    ArrayList<String> fileNames = new ArrayList<>();
    ArrayList<String> badRequests = new ArrayList<>();

    for (String key : fileMap.keySet()) {
      String fileName = fileMap.get(key);

      // filenames inside the zip shouldn't start with /
      if (fileName.startsWith("/"))
        fileName = fileName.substring(1);

      // check if filename is unique
      // if a dupe exist, add a _# + number at the end but before the file extension
      int i = 1;
      while (fileNames.contains(fileName)) {
        String stem = fileName;
        String ext = "";
        if (fileName.lastIndexOf(".") != -1) {
          stem = fileName.substring(0, fileName.lastIndexOf("."));
          ext = fileName.substring(fileName.lastIndexOf("."));
        }
        if (stem.matches(".*_#[0-9]+$"))
          stem = stem.replaceAll("_#[0-9]+$", "");
        stem += ("_#" + i++);
        fileName = stem + ext;
      }

      // get resource, not accessible files get skipped
      // put it in the zip with the new name
      try {
        Resource resource = null;
        InputStream blobStream = null;
        resource = StaticResourceProvider.getInstance().getResource(context, key);
        blobStream = new ByteArrayInputStream(resource.getData());
        zipOut.putNextEntry(new ZipEntry(fileName));
        byte[] buffer = new byte[4096];
        int bytesRead;
        while ((bytesRead = blobStream.read(buffer)) != -1)
          zipOut.write(buffer, 0, bytesRead);
        zipOut.closeEntry();
        blobStream.close();
        fileNames.add(fileName);
      }
      catch (Exception e) {
        badRequests.add(fileName);
      }
    }
    zipOut.close();
    
    return badRequests;
  }
}