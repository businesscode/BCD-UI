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
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import javax.xml.stream.XMLOutputFactory;
import javax.xml.stream.XMLStreamWriter;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;
import org.xml.sax.InputSource;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

import de.businesscode.bcdui.toolbox.DownloadServlet;
import de.businesscode.bcdui.web.servlets.StaticResourceServlet.Resource;
import de.businesscode.bcdui.web.servlets.StaticResourceServlet.StaticResourceProvider;
import de.businesscode.bcdui.web.wrs.RequestOptions;
import de.businesscode.bcdui.wrs.IRequestOptions;
import de.businesscode.bcdui.wrs.load.DataLoader;
import de.businesscode.bcdui.wrs.load.Wrq2Sql;
import de.businesscode.bcdui.wrs.load.WrsDataWriter;
import de.businesscode.util.StandardNamespaceContext;
import de.businesscode.util.xml.SecureXmlFactory;
import jakarta.servlet.ServletContext;
import jakarta.servlet.ServletOutputStream;

public class ZipDownload {

  private static final Logger log = LogManager.getLogger(DownloadServlet.class);
  private static final String wrqRequest = "<wrq:WrsRequest xmlns:f=\"http://www.businesscode.de/schema/bcdui/filter-1.0.0\" xmlns:wrq=\"http://www.businesscode.de/schema/bcdui/wrs-request-1.0.0\"><wrq:Select><wrq:Columns><wrq:C bRef='scopeInstance'/><wrq:C bRef='path'/></wrq:Columns><wrq:From><wrq:BindingSet>bcd_docUpload</wrq:BindingSet></wrq:From><f:Filter><f:Expression op='in' value='#' bRef='scopeInstance'/></f:Filter></wrq:Select></wrq:WrsRequest>"; 

  private HashMap<String, ArrayList<String>> fileMap = new HashMap<>();
  private ArrayList<String> scopeInstance = new ArrayList<>();

  public ZipDownload(Document zipInfo) {
    buildFileMap(zipInfo);
  }
  
  private void buildFileMap(Document doc) {
    fileMap.clear();
    scopeInstance.clear();
    if (doc != null) {
      NodeList zip = doc.getElementsByTagNameNS(StandardNamespaceContext.VFS_NAMESPACE, "Zip");
      if (zip.getLength() > 0) {
        NodeList entries = zip.item(0).getChildNodes();
        parseFiles(entries, fileMap, "");
      }

      // did we request files by scope/instances?
      // get belonging paths for the scope/instances combinations and replace belonging entries in fileMap
      if (!scopeInstance.isEmpty()) {
        HashMap<String, ArrayList<String>> scopeInstancePathMap = new HashMap<>();
        String wrsRequestString = wrqRequest.replace("#", String.join(",", scopeInstance));

        WrsDataWriter dataWriter = null;
        try {
          StringReader strReader = new StringReader(wrsRequestString);
          Document wrqDoc = SecureXmlFactory.newDocumentBuilderFactory().newDocumentBuilder().parse(new InputSource(strReader));
          IRequestOptions options = new RequestOptions(-1);
          options.setRequestDoc(wrqDoc);
          Document wrs = null;
          ByteArrayOutputStream out = new ByteArrayOutputStream();
          XMLStreamWriter xmlWriter = XMLOutputFactory.newInstance().createXMLStreamWriter(out, StandardCharsets.UTF_8.toString());  
          dataWriter = new WrsDataWriter(xmlWriter);
          DataLoader loader = new DataLoader(options, new Wrq2Sql(options), dataWriter);
          loader.run();
          ByteArrayInputStream xmlInput = new ByteArrayInputStream(out.toByteArray());
          wrs = SecureXmlFactory.newDocumentBuilderFactory().newDocumentBuilder().parse(xmlInput);
          
          // we have some data, build up scopeInstance / path mapping
          if (wrs != null) {
            NodeList rowNodes = wrs.getElementsByTagNameNS(StandardNamespaceContext.WRS_NAMESPACE, "R");
            for (int r = 0; r < rowNodes.getLength(); r++) {
              NodeList columns = rowNodes.item(r).getChildNodes();
              if (columns.getLength() == 2) {
                if (!scopeInstancePathMap.containsKey(columns.item(0).getTextContent()))
                  scopeInstancePathMap.put(columns.item(0).getTextContent(), new ArrayList<>());
                scopeInstancePathMap.get(columns.item(0).getTextContent()).add(columns.item(1).getTextContent());
              }
            }
          }
        }
        catch (Exception e) { log.error("Error while running request!", e); }
        finally {
          if (dataWriter != null)
            try { dataWriter.close(); } catch (Exception e2) {}
        }

        // update fileMap by replacing scope/instances pairs with 1..N mapped values
        HashMap<String, ArrayList<String>> rebuildFileMap = new HashMap<>();
        for (String s : fileMap.keySet()) {
          if (scopeInstancePathMap.containsKey(s)) {
            for (String newName : scopeInstancePathMap.get(s)) {
              String pureFileName = newName;
              if (pureFileName.lastIndexOf("/") != -1)
                pureFileName = pureFileName.substring(pureFileName.lastIndexOf("/") + 1);
              if (!rebuildFileMap.containsKey(newName))
                rebuildFileMap.put(newName, new ArrayList<>());
              for (String v : fileMap.get(s))
                rebuildFileMap.get(newName).add(v + pureFileName);
            }
          }
          else {
            if (!rebuildFileMap.containsKey(s))
              rebuildFileMap.put(s, new ArrayList<>());
            for (String v : fileMap.get(s))
              rebuildFileMap.get(s).add(v);
          }
        }
        fileMap = rebuildFileMap;
      }
    }
  }

  private void parseFiles(NodeList entries, HashMap<String, ArrayList<String>> files, String prefix) {
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

        String scope = ((Element)(entries.item(i))).getAttribute("scope");
        String instance = ((Element)(entries.item(i))).getAttribute("instance");
        if (scope != null && !scope.isEmpty() && instance != null && !instance.isEmpty()) {
          if (!files.containsKey(scope + "|" + instance))
            files.put(scope + "|" + instance, new ArrayList<>());
          files.get(scope + "|" + instance).add(prefix + (prefix.endsWith("/") ? "" : "/"));
          scopeInstance.add(scope + "|" + instance);
        }
        else {
          if (!files.containsKey(name))
            files.put(name, new ArrayList<>());
          files.get(name).add(prefix + (prefix.endsWith("/") ? "" : "/") + pureFileName);
        }
      }
    }
  }
  
  public ArrayList<String> getZip(ServletContext context, ServletOutputStream outputStream) throws IOException {
    ZipOutputStream zipOut = new ZipOutputStream(outputStream);

    ArrayList<String> fileNames = new ArrayList<>();
    ArrayList<String> badRequests = new ArrayList<>();

    for (String key : fileMap.keySet()) {

      for (String fileName : fileMap.get(key)) {

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
    }
    zipOut.close();
    
    return badRequests;
  }
}