// 34567890123456789012345678901234567890123456789012345678901234567890123456789

// JSHint - 20200406
/* jshint asi: true */

(function() {"use strict"})()

// DeleteFiles_.gs
// ===============
//
// Object template

var DeleteFiles_ = (function(ns) {

  /**
   * @param {boolean} calledFromTrigger
   * @param {object} config
   */
 
  ns.deleteFiles = function(calledFromTrigger, config) {
    
    Log_.fine('calledFromTrigger: ' + calledFromTrigger + ', ' + JSON.stringify(config))
    
    var spreadsheet = Utils_.getSpreadsheet()
    var numberDeleted = null
    var ui 
    var buttons
    
    if (!calledFromTrigger) {
      ui = SpreadsheetApp.getUi()
      buttons = ui.ButtonSet
    }
    
    var deleteDate = getDeleteDate()
    if (!deleteDate) {return}    
    
    var sheet = spreadsheet.getSheetByName('Files')
    var data = sheet.getDataRange().getValues()
    data.shift() // Remove headers
    
    var numberOfRows = sheet.getLastRow() - 2
    numberDeleted = processRows()
    
    if (numberDeleted) {
      Utils_.toast(
        'Deleted ' + numberDeleted.folders + ' folders, ' + 
        'and ' + numberDeleted.files + ' files.', DELETE_FILES_TITLE_)
    }
    
    return
    
    // Private Functions
    // -----------------
    
    function getDeleteDate() {
      
      if (calledFromTrigger) {
        return getDaysBefore() 
      } else {
        return getUserDeleteDate()
      }
      
      // Private Functions
      // -----------------
      
      function getDaysBefore() {
        
        var deleteOlderThan = config.DELETE_OLDER_THAN.Value
        
        if (deleteOlderThan === undefined) {
          throw new Error('"deleteOlderThan" days not defined in Settings')
        }
        
        var deleteBeforeDate = DateTime.getDayOffsetDate(new Date(), deleteOlderThan)
        Log_.fine('deleteBeforeDate: ' + deleteBeforeDate)
        return deleteBeforeDate
      }      
      
      function getUserDeleteDate() {
        
        var deleteDate = DateTime.getMidnightLastNight(new Date())    
        var response = ui.prompt(DELETE_FILES_TITLE_, DATE_PROMPT_, buttons.OK_CANCEL)
        
        if (response.getSelectedButton() !== ui.Button.OK) {return null}
        
        var dateString = response.getResponseText()
        
        if (dateString === '') { 
          dateString = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'YYYY-MM-dd')
        }
        
        deleteDate = DateTime.getDateTimeFromString({type: 'YYYY-MM-DD mm:hh:ss', dateTime: dateString})
        if (!deleteDate) {throw new Error('Invalid date: "' + deleteDate + '". It has to be in the format YYYY-MM-DD')}
        
        response = ui.alert(
          'Deleting Files', 
          'Please confirm you want to trash (not permanently delete) \nall listed files created on or before ' + dateString + '.', 
          buttons.OK_CANCEL)
        
        if (response !== ui.Button.OK) {return null}     
        
        return deleteDate
      }
      
    } // DeleteFiles_.deleteFiles.getDeleteDate()
    
    function processRows() {
      
      var deleteCount = {
        folders: 0,
        files: 0
      }
      
      for (var rowIndex = numberOfRows - 1; rowIndex >= 0; rowIndex--) {
        
        var row = data[rowIndex]   
        
        var fullPath = row[0]
        var status = row[11]
        
        if (fullPath === 'End of List!' || status == 'TRASHED') {
          continue;
        } 
        
        var fileCreatedDate = DateTime.getMidnightLastNight(row[3])
        var result
        
        if (fileCreatedDate > deleteDate) {
          result = 'IGNORED_TOO_RECENT'
        } else {
          
          var type = row[2]
          var nextId = row[4]
          
          try {

            if (!TEST_DELETE_FILES) {
              result = 'DUMMY_DELETED'
              Log_.warning('Delete disabled')
            } else {
            
              if (type === 'Folder') {               
                  result = deleteResource(DriveApp.getFolderById(nextId))
                  if (result === 'TRASHED') {deleteCount.folders++}              
              } else {       
                  result = deleteResource(DriveApp.getFileById(nextId))              
                  if (result === 'TRASHED') {deleteCount.files++}              
              }
            }
            
          } catch (error) {      
            result = 'ERROR: ' + error.message      
          } 
        }
        
        sheet.getRange(rowIndex + 2, STATUS_COLUMN_NUMBER_).setValue(result) 
        if (rowIndex % ROW_TOAST_COUNT_ === 0) {
          Utils_.toast('Processed ' + rowIndex + ' rows', DELETE_FILES_TITLE_)
        }
        
      } // for each row
      
      return deleteCount
      
      function deleteResource(resource) {
        var result
        if (resource === null) {
          result = 'ERROR: Can not access or find ' + fullPath
        } else {
          resource.setTrashed(true)
          result = 'TRASHED'
        }
        return result
      }
      
    } // DeleteFiles_.deleteFiles.processRows()  
    
  } // DeleteFiles_.deleteFiles()

  return ns

})(DeleteFiles_ || {})
