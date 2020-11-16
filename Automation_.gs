// 34567890123456789012345678901234567890123456789012345678901234567890123456789

// JSHint - TODO
/* jshint asi: true */

(function() {"use strict"})()

// Automation_.gs
// ==============
//
// Manage the automation of the file deletion

var Automation_ = (function(ns) {

  /**
   *
   *
   * @param {object} 
   *
   * @return {object}
   */
 
  ns.setup = function() {
    var trigger = Automation_.getTrigger('automaticDelete')    
    if (trigger === null) {
      Automation_.createTrigger()        
    } else {
      Automation_.deleteTrigger()        
    }    
  } 

  ns.deleteFiles = function() {
    var CALLED_FROM_TRIGGER = true
    var CONFIG = Utils_.getConfig()  
    listFiles_(CALLED_FROM_TRIGGER, CONFIG)
    deleteOldFiles_(CALLED_FROM_TRIGGER, CONFIG)
    Log_.info('Finished automatic deletion of files')
  }

  ns.createTrigger = function() {
  
    var trigger = Automation_.getTrigger('automaticDelete')
    
    if (trigger !== null) {
      throw new Error('Trying to create a trigger when there is already one: ' + trigger.getUinqueId())
    }
  
    trigger = ScriptApp
      .newTrigger('automaticDelete')
      .timeBased()
      .everyDays(1)
      .atHour(3)
      .create()
    
    var triggerId = trigger.getUniqueId()        
    
    Properties_.setProperty('AUTOMATIC_DELETE_TRIGGER_ID', triggerId)
    Utils_.alert('New "delete" trigger created to run daily at 3am.', 'Manage Trigger')
    Log_.info('Created "automaticDelete" trigger ' + triggerId)
  }

  ns.getTrigger = function() {
  
    var trigger = null
    
    ScriptApp.getProjectTriggers().forEach(function(nextTrigger) {
      if (nextTrigger.getHandlerFunction() === 'automaticDelete') {
        if (trigger !== null) {throw new Error('Multiple automaticDelete() triggers')}
        trigger = nextTrigger
        Log_.fine('Found trigger; ' + trigger.getUniqueId())
      }
    })

    if (trigger === null && !!Properties_.getProperty('AUTOMATIC_DELETE_TRIGGER_ID')) {
      
      throw new Error('Trigger ID stored, but no trigger')
    }
    
    return trigger
  }

  ns.deleteTrigger = function() {  
  
    var trigger = Automation_.getTrigger()
    
    if (trigger === null) {
      throw new Error('Trying to delete a trigger when there is not one')
    }    
    
    ScriptApp.deleteTrigger(trigger)
    Properties_.deleteProperty('AUTOMATIC_DELETE_TRIGGER_ID')
    Log_.info('Deleted trigger: ' + trigger.getUniqueId())
    Utils_.alert('"delete" trigger removed, it will no longer run daily at 3am.', 'Manage Trigger')    
  }

  ns.isTriggerCreated = function() {
    return !!Properties_.getProperty('AUTOMATIC_DELETE_TRIGGER_ID')
  }

  return ns

})(Automation_ || {})
