// 34567890123456789012345678901234567890123456789012345678901234567890123456789

// JSHint - TODO
/* jshint asi: true */

(function() {"use strict"})()

// Code review all files - TODO
// JSHint review (see files) - TODO
// Unit Tests - TODO
// System Test (Dev) - TODO
// System Test (Prod) - TODO

// Config.gs
// =========
//
// Dev: AndrewRoberts.net
//
// All the constants and configuration settings

// Configuration
// =============

var SCRIPT_NAME = "DeleteOldFiles"
var SCRIPT_VERSION = "v1.0"

var PRODUCTION_VERSION_ = false

// Log Library
// -----------

var DEBUG_LOG_LEVEL_ = PRODUCTION_VERSION_ ? BBLog.Level.INFO : BBLog.Level.FINER
var DEBUG_LOG_DISPLAY_FUNCTION_NAMES_ = PRODUCTION_VERSION_ ? BBLog.DisplayFunctionNames.NO : BBLog.DisplayFunctionNames.NO

// Assert library
// --------------

var SEND_ERROR_EMAIL_ = PRODUCTION_VERSION_ ? true : false
var HANDLE_ERROR_ = PRODUCTION_VERSION_ ? Assert.HandleError.DISPLAY_FULL : Assert.HandleError.THROW
var ADMIN_EMAIL_ADDRESS_ = 'andrew@roberts.net'

// Tests
// -----

var TEST_SHEET_ID_ = '1I9RzOjYejEET6rTktDjEQqgTeekM6k5t4mLG1BGiMlU'

var TEST_DISABLE_DELETE_ = true

if (PRODUCTION_VERSION_ && !TEST_DISABLE_DELETE_) {
  throw new Error('Test flags set in production version')
}

// Constants/Enums
// ===============

var DATE_PROMPT_ = 'Please supply the date, in the past and in the form YYYY-MM-DD, after which all files will be deleted. Or leave empty to delete all files listed.'
var FOLDER_PROMPT_ = 'Please enter the ID of the folder to start from.'
var ROW_TOAST_COUNT_ = 10

var LIST_FILES_TITLE_ = 'Listing Old Files'
var DELETE_FILES_TITLE_ = 'Deleting Old Files'

// Function Template
// -----------------

/**
 *
 *
 * @param {object} 
 *
 * @return {object}
 */
/* 
function functionTemplate() {
  
  

} // functionTemplate() 
*/