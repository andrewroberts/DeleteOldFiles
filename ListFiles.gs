// https://gist.github.com/mesgarpour/07317e81e9ee2b3f1699

/*
* Copyright 2017 Mohsen Mesgarpour
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
*
* -----------------------------------------------------------------------------------------------------------
*
* ListFilesFolders script: It is a Google Apps Script, which lists all files and/or folders in a
*             Google Drive folder, and then writes the list into a spreadsheet in batches. The script uses a
*             caching mechanism to allow output recovery after possible crash; however, it won't continue
*             to recover the interrupted script and continue the search.
*             If you need to reduce/remove limitation on script runtime refer to the quotas for
*             Google Services: https://developers.google.com/apps-script/guides/services/quotas
*
* Functions: There are two accessible functions that you may call:
*    - 'run': It lists all folders and optionally files in the specified location, then writes them into
*            the selected spreadsheet.
*    - 'reset': It resets the script global cache. It must be run if the script was interrupted, to
*            clean out the cache and triggers. Moreover, since the outputs are cached and are written
*            after the whole list is created, if you run the script after the crash it would write all
*            the cached output into the sheet, then clears the cache.
*
* Configurations: The following configuration parameters must be configured before running the script.
*
*    - 'folderId' (type: string):
*          The folder ID. The folder ID is everything after the 'folders/' portion of the URL.
*
*    - 'searchDepthMax' (type: unsigned integer):
*          The maximum depth for the recursive search of folders.
*

*    - 'listFiles' (type: boolean):
*          It is a flag to indicate if the listing must include files.
*

*    - 'cacheTimeout' (type: unsigned integer, in milliseconds):
*          The maximum time that internal cache persists in memory.
*

*    - 'lockWaitTime' (type: unsigned integer, in milliseconds):
*          The maximum watiting time for the cache reader/writer to wait for the memory lock.
*

*    - 'appendToSheet' (type: boolean):
*          It is a flag for appending to the selected spreadsheet.
*

*    - 'writeBatchSize' (type: unsigned integer):
*          The batch size for writing into the spreadsheet.
*
* Algorithm: The written functions uses a recursive function to list files & folders, and it uses
*            a caching mechanisem to save the outputs in cache and write at the end.
*
* -----------------------------------------------------------------------------------------------------------
* Note-1: Because Apps Script services impose daily quotas and hard limitations on some features. If
*         you exceed a quota or limitation, your script will throw an exception and terminate execution.
*
* Note-2: Firstly, set your folder ID ('folderId' variable)! You may copy the folder ID from the
*         browser's address field. The folder ID is everything after the 'folders/' portion of the URL
*         for Google Drive folder.
*         Secondly, set the 'searchDepthMax' to a reasonable number, a very large number can
*         significantly delay the outputs or may cause unexpected termination.
*         Thirdly, set the 'listFiles' to 'false', if you only require the folders to be listed.
*         Finally, other configuration parameters are preconfigured and can be left as default.
*
* Note-3: Because, this is a script and not a certified app, you must grant it permission, to run.
*         When you run it for the first time, a pop-up window will open & asks you for permission.
*
* Note-4: Files and folders must NOT be modified in the selected path, as it may corrupt the
*         generated list.
*
* Note-5: If you interrupt the script you might have to wait a few seconds (maximum 6 minutes),
*         until you can re-run it.
*
* Note-6: It is recommended to first run the script on a small set of files and folders.
*
* Note-7: Make sure there are no other script in the ccurrent Google Sheet with similar function or
*         variable names.
*
* Note-8: Refer to version 1.0 of the script, for a simplified version of the ListFilesFolders script.
*
* -----------------------------------------------------------------------------------------------------------
*
* @version 2.2 (2018.04)
* @see     https://github.com/mesgarpour
*/

// Configurable variables

var SEARCH_DEPTH_MAX_ = 10; // Max depth for recursive search of files and folders
var LIST_FILES_       = true; // flag for listing files
var CACHE_TIMEOUT_    = 24 * 60 * 60 * 1000; // set cache time-out
var LOCK_WAIT_TIME_   = 1 * 60 * 1000; // set maximium watiting time for the cache lock
var APPEND_TO_SHEET_  = true; // flag for appending to selected spreadsheet
var WRITE_BATCH_SIZE_ = 100; // the write batch size

// ===========================================================================================================
// Global variables
var CACHE_OUTPUTS_ = 'InventoryScript_outputs';
var CACHE_KILL_FLAG_ = 'InventoryScript_killFlag';

// ===========================================================================================================
// Reset the script cache if it is required to run from the beginning
function reset_() {
  Utils_.getSpreadsheet().toast('Reseting script...', 'Status', -1);
  
  // reset triggers and delete cache variables
  setKillFlag_(true, CACHE_TIMEOUT_);
  deleteTriggers_();
  deleteCache_();
  
  Utils_.getSpreadsheet().toast('Reset is complete!', 'Status', -1);
}


// ===========================================================================================================
// List all folders and files, then write into the current spreadsheet.
function run_() {

  var spreadsheet = Utils_.getSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var buttons = ui.ButtonSet;

  spreadsheet.toast('Executing script...', 'Status', -1);
  
  var folderId = getFolderId();  
  if (!folderId) {return;}

  // load cache
  setKillFlag_(false, CACHE_TIMEOUT_);
  var outputRows = getCache_(LOCK_WAIT_TIME_);
  
  // get list
  if (outputRows === undefined || outputRows === null ||
      outputRows[0] === undefined || outputRows[0] === null) {
      
    outputRows = [];
    
    outputRows = getChildFiles_(null, DriveApp.getFolderById(folderId), 
                                LIST_FILES_, CACHE_TIMEOUT_, outputRows, LOCK_WAIT_TIME_);
    
    outputRows = getFolderTree_(outputRows, folderId, LIST_FILES_, CACHE_TIMEOUT_, 
                                LOCK_WAIT_TIME_, SEARCH_DEPTH_MAX_);
  }
   
  writeFolderTree_(outputRows, APPEND_TO_SHEET_);
  spreadsheet.toast('Execution is complete!', 'Status', -1);
  
  function getFolderId() {   
  
    var response = ui.prompt(LIST_FILES_TITLE_, FOLDER_PROMPT_, buttons.OK_CANCEL);  
    if (response.getSelectedButton() !== ui.Button.OK) {return null}; 
    responseText = response.getResponseText();
    var folderId;
    
    if (responseText !== '') {  
      folderId = responseText
    } else {
      ui.alert(LIST_FILES_TITLE_, FOLDER_PROMPT_, buttons.OK);
      folderId = null
    } 
    
    return folderId
  }
}


// ===========================================================================================================
// Get the list of folders and files
function getFolderTree_(outputRows, folderId, listFiles, cacheTimeout, lockWaitTime, searchDepthMax) {
  var parentFolder, sheet = null;
  var searchDepth = -1;
  
  try {
    // Get folder by id
    parentFolder = DriveApp.getFolderById(folderId);
    
    // Initialise the spreadsheet
    sheet = SpreadsheetApp.getActiveSheet();
    
    // Get files and/or folders
    outputRows = getChildFolders_(searchDepth, parentFolder.getName(), parentFolder, sheet,
                                  listFiles, cacheTimeout, lockWaitTime, outputRows, searchDepthMax);
  } catch (e) {
    Log_.warning('Error in getFolderTree_()' + e.message)
    Utils_.getSpreadsheet().toast('Internal Error - see Log', 'Status', -1);
  }
  
  return outputRows;
}


// ===========================================================================================================
// Write the list of folders and files into the spreadsheet
function writeFolderTree_(outputRows, appendToSheet) {
  var sheet = null;
  
  try {
    if (getKillFlag_() === false) {
      // Initialise the spreadsheet
      sheet = SpreadsheetApp.getActiveSheet();
      
      // Write to the selected spreadsheet
      writeOutputs_(sheet, outputRows, appendToSheet);
      
      // reset cache
      reset();
    }
  } catch (e) {
    Log_.warning('Error in writeFolderTree_()' + e.message)  
    Utils_.getSpreadsheet().toast('Error - see Log', 'Status', -1);
  }
}


// ===========================================================================================================
// Get the list of folders and files and their metadata using a recursive loop
function getChildFolders_(searchDepth, parentFolderName, parentFolder, sheet, listFiles, cacheTimeout,
                          lockWaitTime, outputRows, searchDepthMax) {
  var childFolders = parentFolder.getFolders();
  var childFolder = null;
  searchDepth += 1;
  
  try{
    // List sub-folders inside the folder
    while (childFolders.hasNext() && searchDepth < searchDepthMax && getKillFlag_() === false) {
      childFolder = childFolders.next();
      Utils_.getSpreadsheet().toast('Searching folder ' + childFolder.getName() +
        ' at depth ' + searchDepth + " ...", 'Status', -1);
      
      // Get folder information
      outputRows.push([
        parentFolderName + "/" + childFolder.getName(),
        childFolder.getName(),
        "Folder",
        childFolder.getDateCreated(),
        childFolder.getId(),
        childFolder.getLastUpdated(),
        childFolder.getDescription(),
        childFolder.getSize(),
//        childFolder.getOwner().getEmail(),
        '',
        childFolder.getSharingPermission(),
        childFolder.getSharingAccess()
      ]);
      
      // cache outputs
      setCache_(outputRows, lockWaitTime, cacheTimeout);
      
      // List files inside the folder
      outputRows = getChildFiles_(
        parentFolder, childFolder, listFiles, cacheTimeout, outputRows, LOCK_WAIT_TIME_);
      
      // Recursive call of the current sub-folder
      outputRows = getChildFolders_(searchDepth++, parentFolderName + "/" + childFolder.getName(), 
        childFolder, sheet, listFiles, cacheTimeout, lockWaitTime, outputRows, searchDepthMax);
    }
  } catch (e) {
    Log_.warning('Internal error - ' + e.toString());
    Utils_.getSpreadsheet().toast( 'Error - see log', 'Status', -1);
  }
  
  // cache outputs
  setCache_(outputRows, lockWaitTime, cacheTimeout);
  
  return outputRows;
}


// ===========================================================================================================
// Get the list of files in the selected folder
function getChildFiles_(parentFolder, childFolder, listFiles, cacheTimeout, outputRows, lockWaitTime) {
  var childFiles = childFolder.getFiles();
  var childFile = null;
  var path = ""
  
  try{
    // List files inside the folder
    while (listFiles && childFiles.hasNext()) {
      childFile = childFiles.next();
      
      // derive path
      if (parentFolder === null){
        path = childFolder.getName() + "/" + childFile.getName()
      }else{
        path = parentFolder.getName() + "/" + childFolder.getName() + "/" + childFile.getName()
      }
      
      // Get file information
      outputRows.push([
        path,
        childFile.getName(),
        childFile.getName().split('.').pop(),
        childFile.getDateCreated(),
        childFile.getId(),
        childFile.getLastUpdated(),
        childFile.getDescription(),
        childFile.getSize(),
//        childFile.getOwner().getEmail(),
        '',
        childFile.getSharingPermission(),
        childFile.getSharingAccess()
      ]);
    }
    
    // cache outputs
    setCache_(outputRows, lockWaitTime, cacheTimeout);
  } catch (e) {
    Log_.warning('Internal Error - ' + e.toString());
    Utils_.getSpreadsheet().toast('Error - see Log', 'Status', -1);
  }
  return outputRows;
}


// ===========================================================================================================
// Get the values from cache
function setCache_(outputRows, lockWaitTime, cacheTimeout) {
  try{
    var cache = CacheService_;
    var lock = LockService_;
    
    lock.waitLock(lockWaitTime);
    cache.put(CACHE_OUTPUTS_, JSON.stringify(outputRows), cacheTimeout);
    lock.releaseLock();
  } catch (e) {
    Log_.warning('Internal Error - ' + e.toString());
    Utils_.getSpreadsheet().toast('Error - see log', 'Status', -1);
  }
}


// ===========================================================================================================
// Get the values in cache
function getCache_(lockWaitTime) {
  try {
    var outputRows = [];
    var cache = CacheService_;
    var lock = LockService_;
    
    lock.waitLock(lockWaitTime);
    outputRows =  JSON.parse(cache.get(CACHE_OUTPUTS_));
    if (outputRows === undefined || outputRows === null ||
        outputRows[0] === undefined || outputRows[0] === null) {
      outputRows = JSON.parse(cache.get(CACHE_OUTPUTS_));
    }
    lock.releaseLock();
  } catch (e) {
    Log_.warning('Error in getCache_(): ' + e.toString());
    Utils_.getSpreadsheet().toast('Error - see Log', 'Status', -1);
  }
  return outputRows;
}


// ===========================================================================================================
// Write outputs to the selected spreadsheet
function writeOutputs_(sheet, outputRows, appendToSheet) {
  try{
    var range, rowStart, indexStart, indexEnd = null;
    var headerRow = ["Full Path", "Name", "Type", "Date", "URL", "Last Updated", "Description", "Size",
                     "Owner", "Sharing Permission", "Sharing Access"];
    Utils_.getSpreadsheet().toast('Writing outputs...', 'Status', -1);
    
    if (sheet !== null && outputRows.length > 0) {
      if (appendToSheet === false) {
        sheet.clear();
        sheet.appendRow(headerRow);
        rowStart = 2;
      } else {
        rowStart = getRowsFilled_(sheet, "A1:A") + 1;
      }
      
      indexStart = 0;
      indexEnd = Math.min(WRITE_BATCH_SIZE_, outputRows.length);
      
      while (indexStart < outputRows.length) {
        range = sheet.getRange(rowStart + indexStart, 1, indexEnd - indexStart, headerRow.length);
        range.setValues(outputRows.slice(indexStart, indexEnd));
        a = outputRows.slice(indexStart, indexEnd);
        
        indexStart = indexEnd;
        indexEnd =  Math.min(indexStart + WRITE_BATCH_SIZE_, outputRows.length);
      }
      
      range = sheet.getRange(getRowsFilled_(sheet, "A1:A") + 1, 1, 1, 1);
      range.setValues([["End of List!"]]);
    }
    
  } catch (e) {
    Log_.warning('Error in writeOutputs_(): ' + e.toString());  
    Utils_.getSpreadsheet().toast('Error - see Log', 'Status', -1);
  }
}


// ===========================================================================================================
// Get number of rows filled in the selected spreadsheet
function getRowsFilled_(sheet, selectedRange) {
  var selectedMatrix = sheet.getRange(selectedRange).getValues();
  return selectedMatrix.filter(String).length;
}


// ===========================================================================================================
// Delete the global cache
function deleteCache_() {
  try{
    var cache = CacheService_;
    var lock = LockService_;
    
    lock.waitLock(LOCK_WAIT_TIME_);
    cache = CacheService_;
    cache.remove(CACHE_OUTPUTS_);
    lock.releaseLock();
  } catch (e) {
    Log_.warning('Failed to delete cache! ' + e.toString());
    Utils_.getSpreadsheet().toast('Failed to delete cache! Try again in a few minutes.');
  }
}


// ===========================================================================================================
// Delete triggers
function deleteTriggers_() {
  var triggers = ScriptApp.getProjectTriggers();
  try{
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === "run") {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }
  } catch (e) {
    Log_.warning('Failed to delete triggers! ' + e.toString());
    Utils_.getSpreadsheet().toast('Failed to delete triggers! Try again in a few minutes.');
  }
}


// ===========================================================================================================
// Set kill flag
function setKillFlag_(state, cacheTimeout) {
  var lock = LockService_;
  try{
    lock.waitLock(LOCK_WAIT_TIME_);
    cache = CacheService_;
    cache.put(CACHE_KILL_FLAG_, state, cacheTimeout);
    lock.releaseLock();
  } catch (e) {
    Utils_.getSpreadsheet().toast('Failed to set kill flag! Try again in a few minutes.');
  }
}


// ===========================================================================================================
// Get kill flag
function getKillFlag_() {
  killFlag = false;
  try {
    cache = CacheService_;
    //lock.waitLock(LOCK_WAIT_TIME_);
    killFlag = cache.get(CACHE_KILL_FLAG_) === 'true';
    //lock.releaseLock();
  } catch (e) {
    Utils_.getSpreadsheet().toast('Failed to set kill flag! Try again in a few minutes.');
  }
  return killFlag;
}