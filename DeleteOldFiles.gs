
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

// JSHint - TODO
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

var Log_

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

const EVENT_HANDLERS_ = {

//                           Name                            onError Message                          Main Functionality
//                           ----                            ---------------                          ------------------

  run:                       ['run()',                      'Failed to list old files',               run_],
  clearList:                 ['clearList()',                'Failed to clearList',                    clearList_],
  deleteOldFiles:            ['deleteOldFiles()',           'Failed to delete old files',             deleteOldFiles_],
  reset:                     ['reset()',                    'Failed to reset',                        reset_],
}

function run(args)            {return eventHandler_(EVENT_HANDLERS_.run, args)}
function clearList(args)      {return eventHandler_(EVENT_HANDLERS_.clearList, args)}
function deleteOldFiles(args) {return eventHandler_(EVENT_HANDLERS_.deleteOldFiles, args)}
function reset(args)          {return eventHandler_(EVENT_HANDLERS_.reset, args)}

function onOpen() {
  SpreadsheetApp
    .getUi()
    .createMenu('ListFiles')    
    .addItem('Clear list', 'clearList')
    .addItem('1. List Old Files', 'run')
    .addSeparator()
    .addItem('2. Delete Old Files', 'deleteOldFiles')
    .addItem('Reset after failed run', 'reset')       
    .addToUi()
}

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

    const userEmail = Session.getActiveUser().getEmail()

    Log_ = BBLog.getLog({
      level:                DEBUG_LOG_LEVEL_, 
      displayFunctionNames: DEBUG_LOG_DISPLAY_FUNCTION_NAMES_,
    })
    
    Log_.info('Handling ' + config[0] + ' from ' + (userEmail || 'unknown email') + ' (' + SCRIPT_NAME + ' ' + SCRIPT_VERSION + ')')
    
    // Call the main function
    return config[2](args)
    
  } catch (error) {
  
    const assertConfig = {
      error:          error,
      userMessage:    config[1],
      log:            Log_,
      handleError:    HANDLE_ERROR_, 
      sendErrorEmail: SEND_ERROR_EMAIL_, 
      emailAddress:   ADMIN_EMAIL_ADDRESS_,
      scriptName:     SCRIPT_NAME,
      scriptVersion:  SCRIPT_VERSION, 
    }

    Assert.handleError(assertConfig) 
  }
  
} // eventHandler_()

// Private event handlers
// ----------------------

function clearList() {
  var sheet = SpreadsheetApp.getActive().getSheetByName('Files')
  sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent()
}

function deleteOldFiles_() {

  try {

    var ui = SpreadsheetApp.getUi()
    var buttons = ui.ButtonSet
    var deleteDate = getDeleteDate()
    var spreadsheet = SpreadsheetApp.getActive()
    var sheet = spreadsheet.getSheetByName('Files')
    var data = sheet.getDataRange().getValues()
    data.shift() // Remove headers
    var numberOfRows = sheet.getLastRow() - 2
    var numberDeleted = processRows()
    
  } catch (error) {
  
    throw error
  
  } finally {
  
    spreadsheet.toast(
      'Deleted ' + numberDeleted.folders + ' folders, ' + 
        'and ' + numberDeleted.files + ' files.', DELETE_FILES_TITLE_, -1)
  }
  
  return
  
  // Private Functions
  // -----------------

  function getDeleteDate() {

return DateTime.getDateTimeFromString({type: 'YYYY-MM-DD mm:hh:ss', dateTime: '2020-03-26'})

    var deleteDate = DateTime.getMidnightLastNight(new Date())
    
    var response = ui.prompt(DELETE_FILES_TITLE_, DATE_PROMPT_, buttons.OK_CANCEL)
    
    if (response.getSelectedButton() !== ui.Button.OK) {return}
  
    responseText = response.getResponseText()
    
    if (responseText !== '') {  
      deleteDate = DateTime.getDateTimeFromString({type: 'YYYY-MM-DD mm:hh:ss', dateTime: responseText})
      if (!deleteDate) {throw new Error('Invalid date: "' + deleteDate + '". It has to be in the format YYYY-MM-DD')}
    }
    
    var dateString = Utilities.formatDate(deleteDate, Session.getScriptTimeZone(), 'YYYY-MM-dd')
    
    if (dateString === deleteDate) {
      response = ui.prompt('Deleting Files', 'Please confirm you want to delete all files', buttons.OK_CANCEL)
      if (response.getSelectedButton() !== ui.Button.OK) {return} 
    }  
  
    return deleteDate
  }

  function processRows() {
  
    var deleteCount = {
      folders: 0,
      files: 0
    }

    for (var rowIndex = numberOfRows - 1; rowIndex >= 0; rowIndex--) {
      
      var row = data[rowIndex]   
   
      var fullPath = row[0]
      var status = row[11]
      
      if (fullPath === 'End of List!' || (status !== '' && status.indexOf('ERROR') === -1)) {
        continue;
      } 
   
      var fileCreatedDate = DateTime.getMidnightLastNight(row[3])
      var result
      
      if (fileCreatedDate > deleteDate) {
        result = 'IGNORED'
      } else {
        
        var type = row[2]
        var nextId = row[4]
        
        try {
          
          if (type === 'Folder') {
            
            if (DISABLE_DELETE_) {
              result = 'DUMMY_DELETED'
            } else {
              result = deleteResource(DriveApp.getFolderById(nextId))
              if (result === 'DELETED') {deleteCount.folders++}
            }
            
          } else {
            
            if (DISABLE_DELETE_) {
              result = 'DUMMY_DELETED'
            } else {
              result = deleteResource(DriveApp.getFileById(nextId))              
              if (result === 'DELETED') {deleteCount.files++}              
            }        
          }
          
        } catch (error) {      
          result = 'ERROR: ' + error.message      
        } 
      }
      
      sheet.getRange(rowIndex + 2, 12).setValue(result) 
      if (rowIndex % ROW_TOAST_COUNT_ === 0) {
        spreadsheet.toast('Processed ' + rowIndex + ' rows', DELETE_FILES_TITLE_, -1)
      }
              
    } // for each row
    
    return deleteCount
    
    // Private Functions
    // -----------------
    
    function deleteResource(resource) {
      var result
      if (resource === null) {
        result = 'ERROR: Can not access or find ' + fullPath
      } else {
        resource.setTrashed(true)
        result = 'DELETED'
      }
      return result
    }
    
  } // deleteOldFiles_.processRow()  
  
} // deleteOldFiles_()
