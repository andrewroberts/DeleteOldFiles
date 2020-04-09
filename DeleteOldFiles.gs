
/*
* Copyright 2020 Andrew@roberts.net
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

// JSHint - 20200406
/* jshint asi: true */

(function() {"use strict"})()

// DeleteOldFiles.gs
// =================
//
// Dev: AndrewRoberts.net
//
// External interface to this script - all of the event handlers.
//
// This files contains all of the event handlers, plus miscellaneous functions 
// not worthy of their own files yet
//
// The filename is prepended with _API as the Github chrome extension won't 
// push a file with the same name as the project.

var Log_ = null
var Properties_ = null
var Cache_ = null

// Public event handlers
// ---------------------
//
// All external event handlers need to be top-level function calls; they can't 
// be part of an object, and to ensure they are all processed similarily 
// for things like logging and error handling, they all go through 
// errorHandler_(). These can be called from custom menus, web apps, 
// triggers, etc
// 
// The main functionality of a call is in a function with the same name but 
// post-fixed with an underscore (to indicate it is private to the script)
//
// For debug, rather than production builds, lower level functions are exposed
// in the menu

var EVENT_HANDLERS_ = {

//                           Name                            onError Message                          Main Functionality
//                           ----                            ---------------                          ------------------

  listFiles:                 ['listFiles()',                'Failed to list old files',               listFiles_],
  clearList:                 ['clearList()',                'Failed to clearList',                    clearList_],
  resetListFiles:            ['resetListFiles()',           'Failed to resetListFiles_',              resetListFiles_],
  
  setUpAutomation:           ['setUpAutomation()',          'Failed to setUpAutomation',              setUpAutomation_],
  isTriggerCreated:          ['isTriggerCreated()',         'Failed to isTriggerCreated',             isTriggerCreated_],
  automaticDelete:           ['automaticDelete()',          'Failed to automaticDelete',              automaticDelete_],
  
  deleteOldFiles:            ['deleteOldFiles()',           'Failed to delete old files',             deleteOldFiles_],  
}

function listFiles(args)        {return eventHandler_(EVENT_HANDLERS_.listFiles, args)}
function clearList(args)        {return eventHandler_(EVENT_HANDLERS_.clearList, args)}
function resetListFiles(args)   {return eventHandler_(EVENT_HANDLERS_.resetListFiles, args)}

function setUpAutomation(args)  {return eventHandler_(EVENT_HANDLERS_.setUpAutomation, args)}
function isTriggerCreated(args) {return eventHandler_(EVENT_HANDLERS_.isTriggerCreated, args)}
function automaticDelete(args)  {return eventHandler_(EVENT_HANDLERS_.automaticDelete, args)}

function deleteOldFiles(args)   {return eventHandler_(EVENT_HANDLERS_.deleteOldFiles, args)}

// Private Functions
// =================

// General
// -------

/**
 * All external function calls should call this to ensure standard 
 * processing - logging, errors, etc - is always done.
 *
 * @param {Array} config:
 *   [0] {Function} prefunction
 *   [1] {String} eventName
 *   [2] {String} onErrorMessage
 *   [3] {Function} mainFunction
 *
 * @param {Object}   args       The argument passed to the top-level event handler
 */

function eventHandler_(config, args) {

  try {

    var userEmail = Session.getActiveUser().getEmail()

    Log_ = BBLog.getLog({
      level:                DEBUG_LOG_LEVEL_, 
      displayFunctionNames: DEBUG_LOG_DISPLAY_FUNCTION_NAMES_,
    })
    
    Log_.info('Handling ' + config[0] + ' from ' + (userEmail || 'unknown email') + ' (' + SCRIPT_NAME + ' ' + SCRIPT_VERSION + ')')
    
    if (args !== undefined) {
      Cache_ = args.cacheService
      Properties_ = args.propertiesService
    }

    // Call the main function
    return config[2]()
    
  } catch (error) {
  
    var assertConfig = {
      error:          error,
      userMessage:    config[1],
      log:            Log_,
      handleError:    HANDLE_ERROR_, 
      sendErrorEmail: SEND_ERROR_EMAIL_, 
      emailAddress:   userEmail || ADMIN_EMAIL_ADDRESS_,
      scriptName:     SCRIPT_NAME,
      scriptVersion:  SCRIPT_VERSION, 
    }

    Assert.handleError(assertConfig) 
    Utils_.toast('Finished with Error: ' + error.message)
  }
  
} // eventHandler_()

// Private event handlers
// ----------------------

function listFiles_(calledFromTrigger, config) {ListFiles_.listFiles(calledFromTrigger, config)}
function resetListFiles_()                     {ListFiles_.reset()}
function clearList_()                          {ListFiles_.clear()}

function deleteOldFiles_(calledFromTrigger, config)   {DeleteFiles_.deleteFiles(calledFromTrigger, config)}

function isTriggerCreated_() {return Automation_.isTriggerCreated()}
function setUpAutomation_()  {Automation_.setup()}
function automaticDelete_()  {Automation_.deleteFiles()}
