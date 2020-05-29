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
 * @package   mod_bigbluebuttonbn
 * @copyright 2020 onwards, Blindside Networks Inc
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @author    David Pesce  (david.pesce [at] exputo [dt] com)

 * @module mod_bigbluebuttonbn/broker
*/

define(['jquery', 'core/config', 'core/str', 'mod_bigbluebuttonbn/rooms'],
    function ($, mdlcfg, str, rooms) {

        /**
         * Declare variables.
         */
        var datasource = null;
        var bigbluebuttonbn = {};

        var Broker = {
            /**
             * Initialise the broker code.
             * @method init
             * @param {object} bigbluebuttonbn
             */
            init: function (bbb) {
                datasource = mdlcfg.wwwroot + "/mod/bigbluebuttonbn/bbb_ajax.php?sesskey=" + mdlcfg.sesskey + "&";
                bigbluebuttonbn = bbb;
            },

            /**
             * Open the bbb meeting URL.
             * @param {string} joinUrl
             */
            joinRedirect: function (joinUrl) {
                window.open(joinUrl);
            },

            endMeeting: function () {
                var qs = 'action=meeting_end&id=' + bigbluebuttonbn.meetingid;
                qs += '&bigbluebuttonbn=' + bigbluebuttonbn.bigbluebuttonbnid;
                $.getJSON({
                    url: datasource + qs
                })
                    .done(function (error) {
                        if (error.data.status) {
                            rooms.endMeeting();
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
                            var message = str.get_string('completionvalidatestatetriggered', 'bigbluebuttonbn');
                            M.mod_bigbluebuttonbn.helpers.alertError(message, 'info');
                            return;
                        }
                    });
            }
        };

        return Broker;
    });