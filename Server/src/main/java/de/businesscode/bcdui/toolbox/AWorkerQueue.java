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
package de.businesscode.bcdui.toolbox;

import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;
import java.util.Timer;
import java.util.TimerTask;

import org.apache.log4j.Logger;


/**
 *
 * this is a worker with idle support and a queue
 * allows asynchronous processing of objects, supports
 * multi-object for batch processing and idle state to release resource if appropriate.
 * This worker has a Timer which is triggers queue-processing every queueDelayMs after a queue has been populated
 * via {@link #process(Object)} or {@link #process(Collection)}, you implement the {@link #processObjects(Collection)}
 * method to process batched objects gathered into the queue during queueDelayMs.
 *
 */
abstract public class AWorkerQueue<T> {
  public static final int DEFAULT_MAX_QUEUE_SIZE=50;      //when discard the objects
  /**
   * keeps references to all Timers
   */
  private static final List<WeakReference<Timer>> timers = new LinkedList<WeakReference<Timer>>();

  private Queue<T> queue = new LinkedList<T>();
  private int maxQueueSize = DEFAULT_MAX_QUEUE_SIZE;

  /**
   * (additional thread) controls queue sleep time to gather objects for batch execution
   */
  private Timer queueSleepTimer;
  /**
   * the pending queue notification task to notify queue, synchronized by queue
   */
  private TimerTask pendingQueueNotificationTask = null;

  /*
   * this thread will be montoring the idle-state, if enabled
   */
  private final IdleWatchdog idleWatchdog;
  protected Logger log = Logger.getLogger(getClass());
  /*
   * when performing the idle-handling
   * the normal operation cannot proceed
   */
  private final Object idleLock = new Object();

  /*
   * the delay for queue to gather objects
   */
  private final long queueDelayMs;

  /**
   * creates a worker with given logger and maxQueueSize
   *
   * @param maxQueueSize when set to 0 or below then default value is used, default is {@link #DEFAULT_MAX_QUEUE_SIZE}
   * @param idleThresholdMs the threshold for idle event or 0 for DISABLED
   * @param queueDelayMs the threshold for queue delay or 0 for DISABLED
   */
  protected AWorkerQueue(int maxQueueSize, long idleThresholdMs, long queueDelayMs){
    if(maxQueueSize > 0) {
      this.maxQueueSize = maxQueueSize;
    }

    if(idleThresholdMs > 0){
      idleWatchdog = new IdleWatchdog(this, idleThresholdMs);
    }else{
      idleWatchdog = null;
    }

    this.queueDelayMs = queueDelayMs;

    if(log.isDebugEnabled()){
      log.debug("configured with queue size " + this.maxQueueSize + " and idle treshold(ms) of " + idleThresholdMs + " and queue delay (ms): " + this.queueDelayMs);
    }

    queueSleepTimer = new Timer(getClass().getName()+".QueueTimer", true);
    timers.add(new WeakReference<Timer>(queueSleepTimer));
  }

  /**
   * performs a global shutdown of all timer threads
   */
  public synchronized static void shutdown() {
    for(WeakReference<Timer> tRef : timers){
      Timer t = tRef.get();
      if(t == null) continue;
      t.purge();
      t.cancel();
      tRef.clear();
    }
    timers.clear();
  }

  /**
   * triggers queue processing
   */
  private void runProcessQueue() {
    if(log.isTraceEnabled()){
      log.trace("processing queue");
    }

    processQueue();

    if(log.isTraceEnabled()){
      log.trace("queue processed");
    }

    queueSleepTimer.purge();
  }

  /**
   * implement this method to
   * realease resources if worker
   * is idle
   */
  protected void onIdle(){}

  /**
   * implement the method to process
   * the objects polled from queue (FIFO)
   *
   * @param objects to process
   */
  abstract protected void processObjects(Collection<T> objects);

  /**
   * processing objects
   *
   * @param t Objects to process
   */
  public void process(Collection<T> t){
    enqueue(t);
  }

  /**
   * conv. method to process only one element, see {@link #process(Collection)}
   *
   * @param t
   */
  public void process(final T t){
    process(new ArrayList<T>(1){
      private static final long serialVersionUID = 1L;
      {
        add(t);
      }
    });
  }

  private void invokeIdle(){
    synchronized(idleLock){
      onIdle();
    }
  }


  /*
   * processes the queue while
   * objects available, also
   * handle the watchdog
   */
  private void processQueue(){
    if(idleWatchdog != null){
      idleWatchdog.sleep();
    }
    Collection<T> objectsToProcess = new LinkedList<T>();
    synchronized(idleLock){
      //feed the collection
      if(queue.size()>0){
        T t;
        synchronized(queue){
          while((t=queue.poll())!=null)objectsToProcess.add(t);
        }
        processObjects(objectsToProcess);
      }
    }
    if(idleWatchdog != null){
      idleWatchdog.monitor();
    }
  }

  /**
   * enqueue new objects for processing, does NOT block
   * until process ends returns immediatelly
   *
   * @param t object to queue
   */
  final protected void enqueue(Collection<T> t){
    synchronized(queue){
      if(queue.size() >= this.maxQueueSize){
        log.error("queue is full - discarding object " + t);
      } else {
        if(pendingQueueNotificationTask != null){
          pendingQueueNotificationTask.cancel();
          pendingQueueNotificationTask = null;
          queueSleepTimer.purge();
        }

        queue.addAll(t);

        // scheduled or direct execution
        if(this.queueDelayMs > 0){
          pendingQueueNotificationTask = new TimerTask() {
            @Override
            public void run() {
              runProcessQueue();
            }
          };
          queueSleepTimer.schedule(pendingQueueNotificationTask, queueDelayMs);
        }else{
          runProcessQueue();
        }
      }
    }
  }

  /*
   * TODO rewrite as a schedule on the Timer
   */
  private static class IdleWatchdog extends Thread{
    private AWorkerQueue<?> worker;
    private boolean doMonitor=false, resetMonitor=false;
    private long idleMillis;
    private Object sync=new Object();
    private Logger logger = Logger.getLogger(getClass());

    public IdleWatchdog(AWorkerQueue<?> w, long idleMillis){
      worker=w;
      this.idleMillis=idleMillis;
      this.setDaemon(true);
      this.start();
    }
    @Override
    public void run() {
      if(logger.isTraceEnabled()){
        logger.trace("started");
      }

      try {
        while(!isInterrupted()){
          synchronized(sync){
            resetMonitor=false;
            sync.wait(doMonitor ? idleMillis : 0);
          }
          if(doMonitor && !resetMonitor){
            try{worker.invokeIdle();}catch(Throwable t){}
            doMonitor=false;
          }
        }
      }
      catch (InterruptedException e) {
        if(logger.isTraceEnabled()){
          logger.trace("interrupted");
        }
      }

      worker.invokeIdle();
      if(logger.isTraceEnabled()){
        logger.trace("shutdown");
      }
    }

    /**
     * disable monitoring
     */
    public void sleep(){
      if(logger.isTraceEnabled()){
        logger.trace("sleeping...");
      }
      synchronized(sync){
        this.doMonitor=false;
      }
    }
    /**
     * enable monitoring
     */
    public void monitor(){
      if(logger.isTraceEnabled()){
        logger.trace("start monitoring");
      }
      synchronized(sync){
        this.doMonitor=true;
        this.resetMonitor=true;
        sync.notify();
      }
    }
  }
}
