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
//package de.businesscode.bcdui.vfs.provider.database;
//
//import java.io.IOException;
//
//import javax.xml.parsers.DocumentBuilder;
//import javax.xml.parsers.DocumentBuilderFactory;
//import javax.xml.parsers.ParserConfigurationException;
//import javax.xml.transform.TransformerConfigurationException;
//import javax.xml.transform.TransformerException;
//import javax.xml.transform.TransformerFactoryConfigurationError;
//
//import junit.framework.TestCase;
//
//import org.apache.commons.vfs.FileObject;
//import org.apache.commons.vfs.FileSystemException;
//import org.apache.commons.vfs.FileSystemManager;
//import org.apache.commons.vfs.VFS;
//import org.apache.commons.vfs.impl.DefaultFileSystemManager;
//import org.apache.taglibs.standard.tag.common.sql.DataSourceWrapper;
//import org.w3c.dom.Document;
//import org.xml.sax.InputSource;
//import org.xml.sax.SAXException;
//
//import de.businesscode.bcdui.binding.BindingSet;
//import de.businesscode.bcdui.binding.Bindings;
//import de.businesscode.bcdui.binding.exc.BindingException;
//import de.businesscode.bcdui.toolbox.Configuration;
//import de.businesscode.util.Utils;
//
//
//public class TestDabaseVFS extends TestCase {
/*
  public void test_one(){
    try {
      DocumentBuilder db = DocumentBuilderFactory.newInstance().newDocumentBuilder();
      Document doc = null;
      InputSource is = null;

      //LocalOptions options = new LocalOptions("YOUR_PATH_TO_BINDING_FILES");

      FileSystemManager fsMgr;
      fsMgr = VFS.getManager();

      ((DefaultFileSystemManager)fsMgr).addProvider("sql", new DatabaseFileProvider());

//      fsMgr.addProvider("sql", new DatabaseFileProvider());
//      fsMgr.addProvider("http", new HttpFileProvider());

//      StandardFileSystemManager fileSystemManager = new StandardFileSystemManager();
//      fileSystemManager.setConfiguration( "file:"+DatabaseFileObject.class.getResource("virtualFileSystem.xml").getFile() );

//      FileObject xml = fsMgr.resolveFile("file:"+DatabaseFileObject.class.getResource("virtualFileSystem.xml").getFile());
//      FileObject vHTTP = fsMgr.resolveFile("http://cattanach:8035/bcdui/bindings/virtual/refDataSampleTwo.xml");
      FileObject vRoot = fsMgr.resolveFile("sql:/WEB-INF/bcdui/bindings/virtual/refDataSampleTwo.xml");
      DatabaseFileObject dbFileObject=null;
      if(vRoot instanceof DatabaseFileObject){
        dbFileObject = (DatabaseFileObject)vRoot;
        //dbFileObject.setIRequestOptions(options);
        is = new InputSource(dbFileObject.getInputStream());
        doc = db.parse(is);
        System.out.println(Utils.serializeElement(doc));
      }

      FileObject vRoot2 = fsMgr.resolveFile("sql:/WEB-INF/bcdui/bindings/virtual");
      //((DatabaseFileObject)vRoot2).setIRequestOptions(options);
      FileObject[] folderChlds = vRoot2.getChildren();
      System.out.println("##### folderChlds:"  + folderChlds);
      for (int i = 0; i < folderChlds.length; i++) {
        System.out.println("##### file path:"  + folderChlds[i].getName().getPath());
      }

    } catch (FileSystemException e) {
      e.printStackTrace();
    } catch (ParserConfigurationException e) {
      e.printStackTrace();
    } catch (SAXException e) {
      e.printStackTrace();
    } catch (IOException e) {
      e.printStackTrace();
    } catch (TransformerConfigurationException e) {
      e.printStackTrace();
    } catch (TransformerException e) {
      e.printStackTrace();
    } catch (TransformerFactoryConfigurationError e) {
      e.printStackTrace();
    }
  }
*/

//  @Override
//  protected void setUp() throws Exception {
//    DataSourceWrapper ds =new DataSourceWrapper();
//    ds.setDriverClassName("oracle.jdbc.OracleDriver");
//    ds.setJdbcURL("jdbc:oracle:thin:@oracle.business-code.de:1521:orcl");
//    ds.setUserName("DMKNPS02P_A");
//    ds.setPassword("bcd");
//
//    Configuration.getInstance().addConfigurationParameter("bcdui/defaultConnection", ds);
//    Configuration.getInstance().addConfigurationParameter("jdbc/kuehneNagel", ds);
//    Configuration.getInstance().addConfigurationParameter(Configuration.CONFIG_FILE_PATH_KEY, "F:/linnik/programme/eclipse/workspaces/eclipse.bcd.350_BCD-UI-Template/kuehneNagelProductionSystem_INJ/frontend/webapp/WEB-INF/bcdui");
//  }
//
//
//  /**
//   * ===========================================================================
//   */
//  public void test_two() {
//    try {
//      BindingSet bs = Bindings.getInstance().get("refDataSampleTwo");
//      System.out.println("####### virtual BS refDataSampleTwo, timestamp_2:" + bs.get("timestamp_2").getColumnExpression());
//    } catch (BindingException e) {
//      e.printStackTrace();
//    }
//  }
//
//}
