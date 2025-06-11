/*
  Copyright 2010-2024 BusinessCode GmbH, Germany

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
package de.businesscode.bcdui.menu;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import jakarta.xml.bind.JAXBContext;
import jakarta.xml.bind.JAXBException;
import jakarta.xml.bind.Unmarshaller;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;

import org.apache.shiro.SecurityUtils;
import org.apache.shiro.UnavailableSecurityManagerException;
import org.apache.shiro.subject.Subject;
import org.w3c.dom.Document;
import org.xml.sax.SAXException;

import de.businesscode.bcdui.menu.config.Entry;
import de.businesscode.bcdui.menu.config.Include;
import de.businesscode.bcdui.menu.config.Menu;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.util.xml.SecureXmlFactory;

/**
 * A singleton container class for all the menus defined in the application.<br>
 * These menus are defined in static XML files under "/WEB-INF/bcdui/menu/" and read <br>
 *
 **/
public class Menus {
  private static final String defaultMenuFolderPath = "menu";
  private Map<String, Menu> menuMap;
  private static Menus instance=null;

  /**
   *
   * Constructor
   * @throws JAXBException
   * @throws IOException
   */
  private Menus() throws JAXBException, IOException{
    menuMap = new HashMap<String, Menu>();
    JAXBContext jaxbCon = JAXBContext.newInstance(Menu.class.getPackage().getName());
    Unmarshaller jaxbUnmarsh = jaxbCon.createUnmarshaller();
    readConfigFiles(null, jaxbUnmarsh);
  }

  /**
   *
   * Method getInstance
   * @throws JAXBException
   * @throws IOException
   * @return
   */
  public static synchronized Menus getInstance() throws JAXBException, IOException {
    if(instance == null || Configuration.isCacheDisabled()){
      Menus ins = new Menus();
      instance = ins;
    }
    return instance;
  }

  /**
   * gets Menu by ID or default menu if parameter menuId is null or empty
   * if the application contains security subject - the menu will be filtered
   * according to subject security settings
   * @param menuId
   * @return
   */
  public Menu getMenuByIdOrDefault(String menuId) {
    Menu menu = menuMap.get(menuId);
    if (menu == null)
      menu = getDefaultMenu();

    try {
      Subject subject = SecurityUtils.getSubject();
      if(subject != null && menu != null){// build secure menu
        Menu secMenu = new Menu();
        secMenu.getEntry().addAll(checkUserPermissions(menu.getEntry(), subject));
  
        secMenu.setId( menu.getId() );
        secMenu.setIsDefault( menu.isIsDefault());
  
        return secMenu;
      }
    }
    catch (UnavailableSecurityManagerException e) { /* shiro isn't used at all */ }

    return menu;
  }

  /**
   * returns default menu or null if no default menu is defined
   */
  private Menu getDefaultMenu(){
    Menu defMenu=null;
    Set<String> keys = menuMap.keySet();
    Object[] allMenKeys = keys.toArray();
    for (int i = 0; i < allMenKeys.length; i++) {
      if( menuMap.get(allMenKeys[i]).isIsDefault() != null && menuMap.get(allMenKeys[i]).isIsDefault())
        defMenu = menuMap.get(allMenKeys[i]);
    }

    return defMenu;
  }

  /**
   *
   * Method checkUserPermissions
   * @param menuEntry
   * @param userSubject
   */
  private List<Entry> checkUserPermissions(List<Entry> menuEntry, Subject userSubject) {
    ArrayList<Entry> allPermEntries = new ArrayList<Entry>();
    for (int i = 0; i < menuEntry.size(); i++) {
      Entry curEntry = menuEntry.get(i);
      if( curEntry.getRights() == null
          || curEntry.getRights().equals("")
          || isPermitted(userSubject, curEntry.getRights())){

        Entry permEntry = new Entry();
        permEntry = copyEntry(curEntry, permEntry);
        permEntry = copyAllPermittedChildren(curEntry, permEntry, userSubject);
        if (permEntry != null)
          allPermEntries.add(permEntry);
      }
    }

    return allPermEntries;
  }

  private boolean isPermitted(Subject subject, String rights) {
    boolean isPermitted = false;
    int s = 0;
    String[] r = rights.split(" ");
    while (! isPermitted && s < r.length) {
      isPermitted = subject.isPermitted(r[s]);
      s++;
    }
    return isPermitted;
  }

  /**
   * 1. not permitted Entry or null if all are permitted
   *
   * Method getFirstNonPermitted
   *
   * @param entry
   * @param parentEntry
   * @param userSubject
   * @return
   */
  private Entry copyAllPermittedChildren(Entry entry, Entry parentEntry, Subject userSubject){

    int before = parentEntry != null ? parentEntry.getEntryOrInclude().size() : 0;
    if(entry != null){
      for (int i = 0; i < entry.getEntryOrInclude().size(); i++) {
        Object obj = entry.getEntryOrInclude().get(i);
        if(obj instanceof Entry){
          Entry curEntry = (Entry)obj;
          if( curEntry.getRights() == null
              || curEntry.getRights().equals("")
              || isPermitted(userSubject, curEntry.getRights())){

            Entry permEntry = new Entry();
            permEntry = copyEntry(curEntry, permEntry);
            if(parentEntry != null)
              parentEntry.getEntryOrInclude().add(permEntry);

            if(curEntry.getEntryOrInclude().size() > 0){
              Entry permEntAdd = copyAllPermittedChildren(curEntry, permEntry,userSubject);// go through all children

              // in case we don't have any children entries, we remove the recently added one 
              if (permEntAdd == null) {
                parentEntry.getEntryOrInclude().remove(permEntry);
              }

            }
          }
        }
        else if(obj instanceof Include){
          if(parentEntry != null){
            parentEntry.getEntryOrInclude().add(obj);
          }
        }
      }
    }

    // check if we've added a entry, if not (and parent doesn't hold a href on its own) signal "null" as "don't show this entry
    int after = parentEntry != null ? parentEntry.getEntryOrInclude().size() : 0;
    if (before == after && (parentEntry.getHref() == null || parentEntry.getHref().isEmpty())) {
      return null;
    }
    return parentEntry;
  }

  /**
   *
   * Method copyEntry
   * @param entry
   * @param newEntry
   * @return
   */
  private Entry copyEntry(Entry entry, Entry newEntry){
    newEntry.setCaption(entry.getCaption());
    newEntry.setDisable(entry.isDisable());
    newEntry.setHide(entry.isHide());
    newEntry.setHref(entry.getHref());
    newEntry.setId(entry.getId());
    newEntry.setNewWindow(entry.isNewWindow());
    newEntry.setOnClick(entry.getOnClick());
    newEntry.setRights(entry.getRights());
    newEntry.setTitle(entry.getTitle());
    newEntry.setSeparator(entry.isSeparator());
   return newEntry;
  }


  /**
   * if the Menu map is empty
   * @return
   */
  public boolean isEmpty() {
    return this.menuMap.isEmpty();
  }

  /**
   *
   * Method readConfigFiles
   * @param folder
   * @throws JAXBException
   * @throws IOException
   */
  private void readConfigFiles(String folder, Unmarshaller jaxbUnmarshaller ) throws JAXBException, IOException{
    if(folder == null)
      folder = (String)Configuration.getInstance().getConfigurationParameter(Configuration.CONFIG_FILE_PATH_KEY)+File.separator+defaultMenuFolderPath;

    File[] menuFiles = (new File(folder)).listFiles();
    if (menuFiles == null) {
      throw new RuntimeException("Can not read menu files from " + defaultMenuFolderPath  + ". The path is not a directory.");
    }

    DocumentBuilderFactory documentBuilderFactory = SecureXmlFactory.newDocumentBuilderFactory();
    documentBuilderFactory.setXIncludeAware(true);

    for (int i = 0; i < menuFiles.length; i++) {
      if (menuFiles[i].isDirectory()) {
        readConfigFiles(menuFiles[i].getAbsolutePath(),jaxbUnmarshaller);
        continue;
      }
      if (!menuFiles[i].isFile() || !menuFiles[i].canRead() || !menuFiles[i].getName().toLowerCase().endsWith(".xml"))
        continue;

      try {
        Document doc = documentBuilderFactory.newDocumentBuilder().parse(menuFiles[i]);
        Menu curMenu = (Menu)jaxbUnmarshaller.unmarshal(doc);
        menuMap.put(curMenu.getId(), curMenu);
      }
      catch (SAXException e) { }
      catch (ParserConfigurationException e) { }
    }
  }

}
