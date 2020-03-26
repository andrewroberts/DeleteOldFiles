// 19:00 - 21:00
// 10:00 - 13:00

/*

TODO:

- Add toast to deletion process
- Cope with shared and normal drives

*/

/*

https://stackoverflow.com/questions/28618964/apps-script-automatically-delete-files-from-google-drive-older-than-3-days-g

*/

/*

Unknowns:

- How long it will take to run - may need batching
- Updates to "file list" function for our purposes - using shared rather than a standard drive
- Permission issues - can the gas.dev account delete all other files
- Testing - need plenty of confirmation steps
- Start folder - this is hard-coded in the "file list" function, and with the way the function handles caching it may not be simple to allow the user to specify??

*/

/* 

Tests:

- Delete all (set date today or in future)
- Delete at certain date
- Delete none

*/

/*

- Delete gas.test (content manager) with gas.dev (manager) => OK
- Delete gas.dev (manager) with gas.test (content manager) => OK
- Delete gas.dev (manager) with gas.test (contributor) => Access Denied

*/

var FILE_NAME_ = 'gas.dev GDoc2'

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

var DATE_PROMPT_ = 'Please supply the date, in the past and in the form YYYY-MM-DD, after which all files will be deleted. Or leave empty to delete all files.'
var FOLDER_PROMPT_ = 'Please supply the ID of the root folder'
var TITLE_ = 'Deleting Old Files'
var DISABLE_DELETE_ = false
var ROW_TOAST_COUNT_ = 1

function clearList() {
  var sheet = SpreadsheetApp.getActive().getSheetByName('Files')
  sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent()
}

function deleteOldFiles() {

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
    spreadsheet.toast('Deleted ' + numberDeleted.folders + ' folders, and ' + numberDeleted.files + ' files.', TITLE_, -1)
  }
  
  return
  
  // Private Functions
  // -----------------

  function getDeleteDate() {

return DateTime.getDateTimeFromString({type: 'YYYY-MM-DD mm:hh:ss', dateTime: '2020-03-26'})

    var deleteDate = DateTime.getMidnightLastNight(new Date())
    
    var response = ui.prompt(TITLE_, DATE_PROMPT_, buttons.OK_CANCEL)
    
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
      if (rowIndex % ROW_TOAST_COUNT_ === 0) {spreadsheet.toast('Processed ' + rowIndex + ' rows', TITLE_, -1)}
              
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
    
  } // deleteOldFiles.processRow()  
  
} // deleteOldFiles()

function test() {
  var date = new Date()
  var string = Utilities.formatDate(date, Session.getScriptTimeZone(), 'YYYY-MM-dd')
  debugger
}