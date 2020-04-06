// https://gist.github.com/mesgarpour/07317e81e9ee2b3f1699

// JSHint - 20200406
/* jshint asi: true */

/*
* Copyright 2017 Mohsen Mesgarpour
*
* Licensed under the Apache License, Version 2.0 (the "License")
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
*             caching mechanism to allow output recovery after possible crash however, it won't continue
*             to recover the interrupted script and continue the search.
*             If you need to reduce/remove limitation on script runtime refer to the quotas for
*             Google Services: https://developers.google.com/apps-script/guides/services/quotas
*
* Functions: There are two accessible functions that you may call:
*
*    - 'listFiles': It lists all folders and optionally files in the specified location, then writes them into
*            the selected spreadsheet.
*
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
* Note-7: Make sure there are no other script in the current Google Sheet with similar function or
*         variable names.
*
* Note-8: Refer to version 1.0 of the script, for a simplified version of the ListFilesFolders script.
*
* -----------------------------------------------------------------------------------------------------------
*
*/

var HEADER_ROW = [
  "Full Path", 
  "Name", 
  "Type", 
  "Date", 
  "URL", 
  "Last Updated", 
  "Description", 
  "Size",
  "Owner", 
  "Sharing Permission", 
  "Sharing Access"
]

var SEARCH_DEPTH_MAX_ = 10 // Max depth for recursive search of files and folders
var LIST_FILES_       = true // flag for listing files
var CACHE_TIMEOUT_    = 24 * 60 * 60 * 1000 // set cache time-out
var APPEND_TO_SHEET_  = true // flag for appending to selected spreadsheet
var WRITE_BATCH_SIZE_ = 100 // the write batch size

var CACHE_OUTPUTS_ = 'ListFile_outputs'

// Main Object

var ListFiles_ = (function(ns) {

  /**
   * Reset the script cache if it is required to run from the beginning
   */
  
  ns.reset = function() {
    deleteCache()  
    Utils_.toast('Reset is complete!', 'Status')
  }

  ns.clear = function() {
    var spreadsheet = Utils_.getSpreadsheet()
    var sheet = spreadsheet.getSheetByName('Files')
    var numberOfRows = sheet.getLastRow()
    if (numberOfRows < 2) {return}
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent()
    Utils_.toast('List in "Files" cleared', 'Clear List')
  }

  /**
   * List all folders and files, then write into the current spreadsheet
   */
  
  ns.listFiles = function (calledFromTrigger, config) {
  
    try {
  
      var spreadsheet = Utils_.getSpreadsheet()
      Utils_.toast('Executing script...', 'Status', -1)
      
      var listSheet = spreadsheet.getSheetByName('Files')
      
      var startFolder = getStartFolder()  
      if (!startFolder) {return}
    
      var outputRows = getCache()
      
      if (outputRows === null) {  
        outputRows = []
        getChildFiles(null, startFolder)        
        var SEARCH_DEPTH = -1
        getChildFolders(SEARCH_DEPTH, startFolder.getName(), startFolder)
      }
      
      writeOutputs()
      ListFiles_.reset()
      
    } catch (error) {
    
      Log_.fine('Error in list files: ' + error.message)
      throw error
      
    } finally {
    
      Utils_.toast('Execution is complete!', 'Status')
    }
    
    return
    
    // Private Functions
    // -----------------
  
    function getStartFolder() {   
  
      var startFolderId
      var folder = null
  
      if (calledFromTrigger) {
      
        startFolderId = config.START_FOLDER_ID.Value
        
      } else {
      
        var ui = SpreadsheetApp.getUi()
        var buttons = ui.ButtonSet
        var response = ui.prompt(LIST_FILES_TITLE_, FOLDER_PROMPT_, buttons.OK_CANCEL)  
        if (response.getSelectedButton() !== ui.Button.OK) {return null} 
        responseText = response.getResponseText()
        
        if (responseText !== '') {  
          startFolderId = responseText
        } else {
          ui.alert(LIST_FILES_TITLE_, FOLDER_PROMPT_, buttons.OK)
          startFolderId = null
        } 
      }    
      
      if (startFolderId) {
        folder = DriveApp.getFolderById(startFolderId)
      }
      
      return folder
      
    } // listFiles_.getStartFolder()
    
    /**
     * Get the list of files in the selected folder
     */
    
    function getChildFiles(parentFolder, childFolder) {
    
      if (!LIST_FILES_) {return}
    
      var childFiles = childFolder.getFiles()
      var childFile = null
      var path
      
      while (childFiles.hasNext()) {
        
        childFile = childFiles.next()
        
        if (parentFolder === null) {
          path = childFolder.getName() + "/" + childFile.getName()
        } else {
          path = parentFolder.getName() + "/" + childFolder.getName() + "/" + childFile.getName()
        }
        
        var owner = childFile.getOwner()
        var email = (owner === null) ? '' : owner.getEmail()
        
        outputRows.push([
          path,
          childFile.getName(),
          childFile.getName().split('.').pop(),
          childFile.getDateCreated(),
          childFile.getId(),
          childFile.getLastUpdated(),
          childFile.getDescription(),
          childFile.getSize(),
          email,
          childFile.getSharingPermission(),
          childFile.getSharingAccess()
        ])
      }
      
      setCache(outputRows)
        
    } // listFiles_.getChildFiles()
    
    /**
     * Get the list of folders and files and their metadata using a recursive loop
     */
    
    function getChildFolders(searchDepth, parentFolderName, parentFolder) {
                              
      var childFolders = parentFolder.getFolders()
      var childFolder = null
      searchDepth++
      
      // List sub-folders inside the folder
      while (childFolders.hasNext() && searchDepth < SEARCH_DEPTH_MAX_) {
        
        childFolder = childFolders.next()
        
        Utils_.toast(
          'Searching folder ' + childFolder.getName() + ' ' + 
            'at depth ' + searchDepth + " ...", 
           'Status')
              
        var owner = childFolder.getOwner()
        var email = (owner === null) ? '' : owner.getEmail()
        
        outputRows.push([
          parentFolderName + "/" + childFolder.getName(),
          childFolder.getName(),
          "Folder",
          childFolder.getDateCreated(),
          childFolder.getId(),
          childFolder.getLastUpdated(),
          childFolder.getDescription(),
          childFolder.getSize(),
          email,
          childFolder.getSharingPermission(),
          childFolder.getSharingAccess()
        ])
        
        setCache(outputRows)
        getChildFiles(parentFolder, childFolder)
        
        // Recursive call of the current sub-folder
        getChildFolders(
          searchDepth++, 
          parentFolderName + "/" + childFolder.getName(), 
          childFolder)
      }
        
      setCache(outputRows)  
      
    } // listFiles_.getChildFolders()
    
    /**
    * Write outputs to the selected spreadsheet
    */
    
    function writeOutputs() {

      if (listSheet === null) {throw new Error('No "Files" sheet')}
      if (outputRows === null || outputRows.length < 1) {return}

      Utils_.toast('Writing outputs...', 'Status')
        
      if (!APPEND_TO_SHEET_) {
        listSheet.clear()
        listSheet.appendRow(HEADER_ROW)
        rowStart = 2
      } else {
        rowStart = getRowsFilled_(listSheet, "A1:A") + 1
      }

      var range
      var rowStart
      var indexStart = 0
      var indexEnd = Math.min(WRITE_BATCH_SIZE_, outputRows.length)
      
      while (indexStart < outputRows.length) {
        
        range = listSheet.getRange(rowStart + indexStart, 1, indexEnd - indexStart, HEADER_ROW.length)
        range.setValues(outputRows.slice(indexStart, indexEnd))
        outputRows.slice(indexStart, indexEnd)
        
        indexStart = indexEnd
        indexEnd = Math.min(indexStart + WRITE_BATCH_SIZE_, outputRows.length)
      }
      
      range = listSheet.getRange(getRowsFilled_(listSheet, "A1:A") + 1, 1, 1, 1)
      range.setValues([["End of List!"]])
      return
      
      // Private Functions
      // -----------------
      
      function getRowsFilled_(sheet, selectedRange) {
        var selectedMatrix = sheet.getRange(selectedRange).getValues()
        return selectedMatrix.filter(String).length
      }  
      
    } // listFiles_.writeOutputs()
    
  } // listFiles_()
  
  // Caching
  // -------
  
  function setCache(outputRows) {
    Cache_.put(CACHE_OUTPUTS_, JSON.stringify(outputRows), CACHE_TIMEOUT_)
  }
  
  function getCache() {  
    var cache = Cache_.get(CACHE_OUTPUTS_)
    return (cache === null) ? null : JSON.parse(cache)
  }
  
  function deleteCache() {
    Cache_.remove(CACHE_OUTPUTS_)
  }
  
  return ns

})(Object1_ || {})
