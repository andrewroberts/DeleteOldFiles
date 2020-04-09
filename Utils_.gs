// 34567890123456789012345678901234567890123456789012345678901234567890123456789

// JSHint - 20200406
/* jshint asi: true */

(function() {"use strict"})()

// Utils_.gs
// =========
//
// Object template

var Utils_ = (function(ns) {

  /**
   * Get the active spreadsheet, failing that the test one.
   *
   * @return {Spreadsheet} spreadsheet
   */
 
  ns.getSpreadsheet = function() {
  
    var spreadsheet = SpreadsheetApp.getActive()
    
    if (spreadsheet === null) {
      if (!PRODUCTION_VERSION_) {
        spreadsheet = SpreadsheetApp.openById(TEST_SHEET_ID_)
      } else {
        throw new Error('No active spreadsheet')
      }
    }
    
    return spreadsheet
    
  } // Utils_.getSpreadsheet()
  
  ns.toast = function(message, title, timeout) {
    var spreadsheet = Utils_.getSpreadsheet()
    if (spreadsheet !== null && SpreadsheetApp.getActive() !== null) {
      timeout = timeout || null
      spreadsheet.toast(message, title, timeout)
    }
  }      
  
  ns.alert = function(message, title) {
    var spreadsheet = Utils_.getSpreadsheet()
    if (spreadsheet !== null && SpreadsheetApp.getActive() !== null) {
      var ui = SpreadsheetApp.getUi()
      ui.alert(title, message, ui.ButtonSet.OK)
    }
  }      
  
  ns.getConfig = function() {
  
    var config = {}
    
    SsObjects.addArrayToObject({
      objects: config,
      id: 'Name',
      data: Utils_
        .getSpreadsheet()
        .getSheetByName('Settings')
        .getDataRange()
        .getValues()
    })

    Log_.fine('config: ' + config)

    return config
  }
  
  return ns

})(Utils_ || {})
