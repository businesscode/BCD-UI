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

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;
import java.util.concurrent.Executor;
import java.util.concurrent.Future;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.LogManager;


/**
 * <p>
 * This is a worker with idle support and a queue
 * allows asynchronous processing of objects, supports
 * multi-object for batch processing and idle state to release resource if appropriate. The default maximum queue size
 * is {@link #DEFAULT_MAX_QUEUE_SIZE} and if exceeded, new objects are not put into the queue but discarded.
 * This worker has a Timer which is triggers queue-processing every queueDelayMs after a queue has been populated
 * via {@link #process(Object)} or {@link #process(Collection)}, you implement the {@link #processObjects(Collection)}
 * method to process batched objects gathered into the queue during queueDelayMs. In a container environment you can
 * gracefully {@link #shutdownQueues()} all queues by calling the method i.e. from context listener, in a standalone
 * application you can do it via a shutdown hook or you can {@link #shutdown(boolean)} s single instance.
 * </p>
 * 
 * <p>
 * This class uses {@link Executor} for task execution which is shared among all instances of all concrete
 * implementations of this class. By design, every single instance of implementation class posseses a single
 * queue which is ought to be processed by a single thread on behalf of the executor, such as 5 instances will
 * allow the executor to create up to 5 threads. Initially, the executor
 * pool size is set to {@link #EXECUTOR_MIN_POOL_SIZE}. The core pool size is changed according to number of instances
 * of this class ranging from [ {@link #EXECUTOR_MIN_POOL_SIZE} .. {@link #EXECUTOR_MAX_POOL_SIZE} ]. If the queue is idling, the
 * executor will shrink the thread pool size down to 0 after {@link #EXECUTOR_KEEPALIVE_MINS}.
 * A {@link #shutdown(boolean)} on single instance will reduce the thread pool size.
 * </p>
 */
abstract public class AWorkerQueue<T> {
  /**
   * keep alive minutes for all executors prior removing idle threads: {@value #EXECUTOR_KEEPALIVE_MINS}
   */
  private static final long EXECUTOR_KEEPALIVE_MINS = 5;
  /**
   * the overall limit of pool size, please read more in class documentation on how the pool size is sized
   */
  private static final int EXECUTOR_MAX_POOL_SIZE = 100;
  /**
   * the lower limit of pool size: {@value #EXECUTOR_MIN_POOL_SIZE}
   */
  private static final int EXECUTOR_MIN_POOL_SIZE = 1;
  /**
   * max queue size before discarding objects: {@value #DEFAULT_MAX_QUEUE_SIZE}
   */
  public static final int DEFAULT_MAX_QUEUE_SIZE = 500;

  /**
   * keep references to all queues
   */
  private static final List<AWorkerQueue<?>> queues = new LinkedList<AWorkerQueue<?>>();
  /**
   * number of instances of this class
   */
  private static final AtomicInteger instancesCount = new AtomicInteger(0);

  private Queue<T> queue = new LinkedList<T>();
  private final int maxQueueSize;

  /**
   * the pending queue notification task to notify queue, synchronized by queue
   */
  private Future<?> pendingQueueProcessingFuture = null;

  /**
   * idle watchdog to a scheduled call {@link #invokeIdle()}
   */
  private ScheduledFuture<?> idleFuture = null;

  /**
   * Executor for {@link #idleFuture}
   */
  private static final ScheduledThreadPoolExecutor executor;

  static {
    executor = new ScheduledThreadPoolExecutor(EXECUTOR_MIN_POOL_SIZE, (r) -> {
      Thread t = new Thread(r, AWorkerQueue.class.getName() + ".Executor");
      t.setDaemon(true);
      return t;
    });
    executor.setExecuteExistingDelayedTasksAfterShutdownPolicy(false);
    executor.setContinueExistingPeriodicTasksAfterShutdownPolicy(false);
    executor.setMaximumPoolSize(EXECUTOR_MAX_POOL_SIZE);
    executor.setRemoveOnCancelPolicy(true);
    executor.setKeepAliveTime(EXECUTOR_KEEPALIVE_MINS, TimeUnit.MINUTES);
    executor.allowCoreThreadTimeOut(true);
  }
  
  protected Logger log = LogManager.getLogger(getClass());
  /*
   * when performing the idle-handling
   * the normal operation cannot proceed
   */
  private final Object idleLock = new Object();

  /*
   * the delay for queue to gather objects
   */
  private final long queueDelayMs;
  /*
   * the delay for timer task
   */
  private long idleThresholdMs;

  /**
   * Creates a queue
   *
   * @param maxQueueSize    when set to 0 then default value is used (which is {@link #DEFAULT_MAX_QUEUE_SIZE} ). A positive value sets a maximum queue size before discarding objects.
   *                        A negative value removes any limit, which may cause memory issues in case the queue grows faster than it is processed.
   * @param idleThresholdMs the threshold for idle event or 0 for DISABLED, if disabled, the {@link #onIdle()} is never called,
   *                        otherwise it is called after the queue has been idling for given amount of time.
   * @param queueDelayMs    delay in ms or 0 for DISABLED, this is a waiting period between adding a task to process
   *                        into the queue and beginning of processing the queue, if 0 the queue is processed immediately.
   */
  protected AWorkerQueue(int maxQueueSize, long idleThresholdMs, long queueDelayMs){
    if(maxQueueSize == 0) {
      this.maxQueueSize = DEFAULT_MAX_QUEUE_SIZE;
    } else {
      this.maxQueueSize = Math.max(-1, maxQueueSize);
    }

    this.idleThresholdMs = Math.max(0, idleThresholdMs);
    this.queueDelayMs = Math.max(0, queueDelayMs);

    if(log.isDebugEnabled()){
      log.debug(" Worker configured with queue size " + this.maxQueueSize + " and idle treshold(ms) of " + idleThresholdMs + " and queue delay (ms): " + this.queueDelayMs);
    }

    queues.add(this);

    resetPoolSize(instancesCount.incrementAndGet());
  }
  
  /**
   * resets executors pool size according to {@link #instancesCount} 
   */
  private void resetPoolSize(int requestedPoolSize){
    // determine pool size, between EXECUTOR_MIN_POOL_SIZE and EXECUTOR_MAX_POOL_SIZE
    if(requestedPoolSize < EXECUTOR_MIN_POOL_SIZE){
      requestedPoolSize = EXECUTOR_MIN_POOL_SIZE;
    }else if(requestedPoolSize > EXECUTOR_MAX_POOL_SIZE){
      requestedPoolSize = EXECUTOR_MAX_POOL_SIZE;
    }
    executor.setCorePoolSize(requestedPoolSize);
  }
  
  /**
   * shuts down all queues
   *
   * @param discardQueuedObjects - if set to false, processes queued objects ( this happens in current thread ).
   */
  public static void shutdownQueues(boolean discardQueuedObjects) {
    // dont need executor
    executor.shutdownNow();
    synchronized(queues){
      while(!queues.isEmpty()){
        queues.get(0).shutdown(discardQueuedObjects);
      }
      queues.clear();
    }
  }

  /**
   * shuts down the queue optinally processing queued objects,
   * you cant reuse this queue after being shut down
   *
   * @param discardQueuedObjects - if set to false, the objects in the queue are processed in the current thread.
   */
  private void shutdown(boolean discardQueuedObjects){
    if(log.isTraceEnabled()){
      log.trace("shutting down " + getClass().getName() + ", discarding objects in queue: " + Boolean.toString(discardQueuedObjects));
    }
    resetPoolSize(instancesCount.decrementAndGet());

    synchronized(queues){
      queues.remove(this);
    }

    if(!discardQueuedObjects){
      runProcessQueue();
    }

    if(idleFuture != null){
      idleFuture.cancel(false);
      idleFuture = null;
    }
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
    if(idleFuture != null){
      idleFuture.cancel(false);
      idleFuture = null;
    }
    synchronized(idleLock){
      // keep processing objects from queue
      while(queue.size()>0){ // keep this check outside of lock on the queue
        final Collection<T> objectsToProcess = new LinkedList<T>();

        synchronized(queue){
          T t;
          // assemble collection to process, dont process yet
          // there is no guarantee that poll() returns anything
          while((t=queue.poll())!=null)objectsToProcess.add(t);
        } // unlock queue for others

        if( objectsToProcess.size() > 0) { // may be empty
          processObjects(objectsToProcess);
        }
      }
    }
    if(idleThresholdMs > 0 && !executor.isShutdown()){
      idleFuture = executor.schedule(()->invokeIdle(), idleThresholdMs, TimeUnit.MILLISECONDS);
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
      if(this.maxQueueSize > 0 && queue.size() >= this.maxQueueSize){
        log.error("queue is full - discarding object " + t);
      } else {
        if(pendingQueueProcessingFuture != null){
          // prevent pending execution
          pendingQueueProcessingFuture.cancel(false);
        }

        queue.addAll(t);

        // schedule execution
        pendingQueueProcessingFuture = executor.schedule(() -> runProcessQueue(), queueDelayMs, TimeUnit.MILLISECONDS);
      }
    }
  }
}
