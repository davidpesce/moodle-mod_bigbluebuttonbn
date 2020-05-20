// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * @package    mod_bigbluebuttonbn
 * @copyright 2020 onwards, Blindside Networks Inc
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @author    David Pesce  (david.pesce [at] exputo [dt] com)

 * @module mod_bigbluebuttonbn/broker
*/

define(['jquery', 'core/config', 'core/str', 'mod_bigbluebuttonbn/rooms'], function ($, MDLCFG, STR, ROOMS) {

    return {
        datasource: null,
        bigbluebuttonbn: {},

        /**
         * Initialise the broker code.
         *
         * @method init
         * @param {object} bigbluebuttonbn
         */
        init: function (bigbluebuttonbn) {
            this.datasource = MDLCFG.wwwroot + "/mod/bigbluebuttonbn/bbb_ajax.php?sesskey=" + MDLCFG.sesskey + "&";
            this.bigbluebuttonbn = bigbluebuttonbn;
        },

        joinRedirect: function (joinUrl) {
            window.open(joinUrl);
        },

        recordingActionPerform: function (data) {
            var qs = "action=recording_" + data.action + "&id=" + data.recordingid + "&idx=" + data.meetingid;
            qs += this.recordingActionMetaQS(data);
            data.attempt = 1;
            if (typeof data.attempts === 'undefined') {
                data.attempts = 5;
            }
            $.getJSON({
                url: this.datasource + qs
            })
                .done(function (data) {
                    // Something went wrong.
                    if (!data.status) {
                        return M.mod_bigbluebuttonbn.recordings.recordingActionFailover(data);
                    }
                    // There is no need for verification.
                    if (typeof data.goalstate === 'undefined') {
                        return M.mod_bigbluebuttonbn.recordings.recordingActionCompletion(data);
                    }
                    // Use the current response for verification.
                    if (data.attempts <= 1) {
                        return M.mod_bigbluebuttonbn.recordings.recordingActionPerformedComplete(data);
                    }
                    // Iterate the verification.
                    return M.mod_bigbluebuttonbn.recordings.recordingActionPerformedValidate(data);
                })
                .fail(function (error) {
                    data.message = error.message;
                    return M.mod_bigbluebuttonbn.recordings.recordingActionFailover(data);
                });
        },

        recordingActionMetaQS: function (data) {
            var qs = '';
            if (typeof data.source !== 'undefined') {
                var meta = {};
                meta[data.source] = encodeURIComponent(data.goalstate);
                qs += "&meta=" + JSON.stringify(meta);
            }
            return qs;
        },

        recordingActionPerformedValidate: function (data) {
            var qs = "action=recording_info&id=" + data.recordingid + "&idx=" + data.meetingid;
            qs += this.recordingActionMetaQS(data);
            $.getJSON({
                url: this.datasource + qs
            })
                .done(function (data) {
                    // Evaluates if the current attempt has been completed.
                    if (this.recordingActionPerformedComplete(data)) {
                        // It has been completed, so stop the action.
                        return;
                    }
                    // Evaluates if more attempts have to be performed.
                    if (data.attempt < data.attempts) {
                        data.attempt += 1;
                        setTimeout(((function () {
                            return function () {
                                this.recordingActionPerformedValidate(data);
                            };
                        })(this)), (data.attempt - 1) * 1000);
                        return;
                    }
                    // No more attempts to perform, it stops with failing over.
                    data.message = STR.get_string('view_error_action_not_completed', 'bigbluebuttonbn');
                    M.mod_bigbluebuttonbn.recordings.recordingActionFailover(data);

                })
                .fail(function (error) {
                    data.message = error.message;
                    M.mod_bigbluebuttonbn.recordings.recordingActionFailover(data);
                });
        },

        recordingActionPerformedComplete: function (e, data) {
            // Something went wrong.
            if (typeof e.data[data.source] === 'undefined') {
                data.message = STR.get_string('view_error_current_state_not_found', 'bigbluebuttonbn');
                M.mod_bigbluebuttonbn.recordings.recordingActionFailover(data);
                return true;
            }
            // Evaluates if the state is as expected.
            if (e.data[data.source] === data.goalstate) {
                M.mod_bigbluebuttonbn.recordings.recordingActionCompletion(data);
                return true;
            }
            return false;
        },

        recordingCurrentState: function (action, data) {
            if (action === 'publish' || action === 'unpublish') {
                return data.published;
            }
            if (action === 'delete') {
                return data.status;
            }
            if (action === 'protect' || action === 'unprotect') {
                return data.secured; // The broker responds with secured as protected is a reserverd word.
            }
            if (action === 'update') {
                return data.updated;
            }
            return null;
        },

        endMeeting: function () {
            var qs = 'action=meeting_end&id=' + this.bigbluebuttonbn.meetingid;
            qs += '&bigbluebuttonbn=' + this.bigbluebuttonbn.bigbluebuttonbnid;
            $.getJSON({
                url: this.datasource + qs
            })
                .done(function (error) {
                    if (error.data.status) {
                        ROOMS.endMeeting();
                        location.reload();
                    }
                });
        },

        completionValidate: function (qs) {
            $.getJSON({
                url: this.datasource + qs
            })
                .done(function (error) {
                    if (error.data.status) {
                        var message = STR.get_string('completionvalidatestatetriggered', 'bigbluebuttonbn');
                        M.mod_bigbluebuttonbn.helpers.alertError(message, 'info');
                        return;
                    }
                });
        }
    };
});