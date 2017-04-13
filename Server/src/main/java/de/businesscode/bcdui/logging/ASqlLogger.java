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
package de.businesscode.bcdui.logging;

import java.sql.SQLException;
import java.util.Collection;

import javax.sql.DataSource;

import org.apache.commons.dbutils.QueryRunner;

import de.businesscode.bcdui.binding.Bindings;
import de.businesscode.bcdui.binding.exc.BindingException;
import de.businesscode.bcdui.binding.exc.BindingSetNotFoundException;
import de.businesscode.bcdui.toolbox.AWorkerQueue;
import de.businesscode.bcdui.toolbox.Configuration;
import de.businesscode.bcdui.toolbox.config.BareConfiguration;

/**
 * base class for sql loggers, implement {@link #getSqlTemplate()} to provide SQL for updates and {@link #convertData(Collection)} to
 * convert the collection to appropriate multi-dim array which will be batch-processed by the SQL provided. It also takes the
 * configuration parameters from the {@link Configuration} object. This class is Binding-Aware, so if binding does not exist
 * the isEnabled flag is set to false. Prior to publishing to logger check {@link #isEnabled()} flag.
 *
 * The pattern is to implement {@link de.businesscode.bcdui.logging.ASqlLogger#getSqlTemplate()} function and {@link de.businesscode.bcdui.logging.ASqlLogger#convertData(Collection)} according to that sql,
 * read more documentation on those methods.
 *
 * @param <T> type of data logs to process
 */
abstract class ASqlLogger<T> extends AWorkerQueue<T> {
  private static final String DATASOURCE_UNDEF="_ $ undefined $ _";
  private static enum STATE {
    enabled, bindingSetNotReady, disabled
  }
  private STATE state = STATE.bindingSetNotReady;

  private final String bindingSetId;
  private String dataSourceName = DATASOURCE_UNDEF;
  private String sqlTemplate = null;

  /**
   * constructor with queue settings
   *
   * @param bindingSetId
   * @param queueSize
   * @param queueSleepMs
   */
  protected ASqlLogger(String bindingSetId, int queueSize, long queueSleepMs) {
    super(queueSize, 0, queueSleepMs);
    this.bindingSetId = bindingSetId;
    isEnabled();
  }

  /**
   * as SQL logger we are depended on Bindings, which in turn use classes using us, so we dont participate in Binding bootsrap process
   *
   * @return
   */
  public boolean isEnabled() {
    if(state == STATE.enabled){
      return true;
    } else if (state == STATE.disabled){
      return false;
    } else if (Bindings.isInitialized()) {
      /*
       * if Bindings got ready we can safely check if such binding exists
       */
      state = hasBindingSet(bindingSetId) ? STATE.enabled : STATE.disabled;
      return isEnabled();
    } else {
      return false;
    }
  }

  private boolean hasBindingSet(String bindingSetId){
    try {
      return Bindings.isInitialized() && Bindings.getInstance().hasBindingSet(bindingSetId);
    } catch(BindingSetNotFoundException bfe){
      return false;
    } catch (BindingException e) {
      log.warn("could not check binding-set id "+ bindingSetId, e);
      return false;
    }
  }

  @Override
  protected void processObjects(Collection<T> records) {
    if (log.isTraceEnabled()) {
      log.trace("processing logs #" + records.size());
    }
    try {
      executeStatement(convertData(records));
    } catch (SQLException e) {
      log.warn("failed pushing logs to database", e);
    }
  }

  /**
   * executes statement with raw parameters and returns number of updated rows
   *
   * @param params
   * @return The number of rows updated per statement
   * @throws SQLException
   */
  protected int[] executeStatement(Object[][] params) throws SQLException {
    return new QueryRunner(getDataSource()).batch(sqlTemplate == null ? (sqlTemplate = getSqlTemplate()) : sqlTemplate, params);
  }

  /**
   *
   * @return SQL template for inserts (prepared statement compatible to process batch updates) this sql template is not intented to change and is cached so this function
   * is called only once
   */
  protected abstract String getSqlTemplate();

  /**
   * processes given collection of type to dimensional object array to be consumed by batch SQL, were first dim is a row and second are columns
   * @param records
   * @return
   */
  protected abstract Object[][] convertData(Collection<T> records);

  /**
   *
   * @return a datasource as referenced by the binding-set or the default datasource
   * @throws RuntimeException in case datasource name discovery via Bindings takes place whilst Bindings has not initialized yet.
   */
  protected DataSource getDataSource() {
    try {
      if(DATASOURCE_UNDEF.equals(dataSourceName)) {
        if(Bindings.isInitialized()){
          dataSourceName = Bindings.getInstance().get(bindingSetId).getDbSourceName();
        }else{
          throw new Exception("calling datasource while Bindings have not initialized yet");
        }
      }
      return BareConfiguration.getInstance().getRawDataSource(dataSourceName);
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  }
}