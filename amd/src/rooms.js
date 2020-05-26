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

 * @module mod_bigbluebuttonbn/rooms
*/

define(['jquery', 'core/config', 'core/str', 'core/yui', 'mod_bigbluebuttonbn/broker'],
    function ($, mdlcfg, str, yui, broker) {

        /**
         * Declare variables.
         */
        var bigbluebuttonbn = {};
        var datasource = null;
        var pinginterval = null;

        /**
         * jQuery selectors.
         */
        var SELECTORS = {
            CONTROL_PANEL: '#control_panel',
            CONTROL_PANEL_DIV: '#control_panel_div',
            END_BUTTON: '#end_button',
            JOIN_BUTTON: '#join_button',
            STATUS_BAR: '#status_bar',
            STATUS_BAR_SPAN: '#status_bar_span'
        };

        var Rooms = {

            /**
             * Initialization method called by php js_call_amd().
             * @param Object bbb
             */
            init: function (bbb) {
                datasource = mdlcfg.wwwroot + "/mod/bigbluebuttonbn/bbb_ajax.php?sesskey=" + mdlcfg.sesskey + "&";
                bigbluebuttonbn = bbb;
                pinginterval = bigbluebuttonbn.ping_interval;

                if (pinginterval === 0) {
                    pinginterval = 10000;
                }
                if (bigbluebuttonbn.profile_features.indexOf('all') != -1 ||
                    bigbluebuttonbn.profile_features.indexOf('showroom') != -1) {
                    this.initRoom();
                }
                this.initCompletionValidate();
            },

            /**
             * Room precheck to determine room status.
             */
            initRoom: function () {
                var self = this;
                var stringsToRetrieve = [
                    {
                        key: 'view_message_conference_has_ended',
                        component: 'bigbluebuttonbn'
                    },
                    {
                        key: 'view_message_conference_not_started',
                        component: 'bigbluebuttonbn'
                    }
                ];
                str.get_strings(stringsToRetrieve)
                    .done(function (s) {
                        if (bigbluebuttonbn.activity !== 'open') {
                            $(SELECTORS.STATUS_BAR).append(self.initStatusBar(s[0]));
                            if (bigbluebuttonbn.activity !== 'ended') {
                                var statusBar = [
                                    s[1],
                                    bigbluebuttonbn.opening,
                                    bigbluebuttonbn.closing
                                ];
                                $(SELECTORS.STATUS_BAR).append(self.initStatusBar(statusBar));
                            }
                            return;
                        }
                        self.updateRoom();
                });
            },

            /**
             * Create the status bar.
             * @param {string} statusMessage
             */
            initStatusBar: function (statusMessage) {
                var statusBarSpan = $(document.createElement('span')).attr('id', 'status_bar_span');
                if (statusMessage.constructor !== Array) {
                    return statusBarSpan.text(statusMessage);
                }
                for (var message in statusMessage) {
                    if (!statusMessage.hasOwnProperty(message)) {
                        continue; // Skip keys from the prototype.
                    }
                    var statusBarSpanSpan = $(document.createElement('span')).attr('id', 'status_bar_span_span');
                    statusBarSpanSpan.text(statusMessage[message]);
                    statusBarSpanSpan.after('<br/>');
                    statusBarSpan.add(statusBarSpanSpan);
                }
                return statusBarSpan;
            },

            /**
             * Refresh the room to update room status.
             * @param {string} cacheRequest
             */
            updateRoom: function (cacheRequest) {
                var self = this;
                var updatecache = 'false';
                if (typeof cacheRequest !== 'undefined' && cacheRequest) {
                    updatecache = 'true';
                }
                var id = bigbluebuttonbn.meetingid;
                var bnid = bigbluebuttonbn.bigbluebuttonbnid;
                var qs = 'action=meeting_info&id=' + id + '&bigbluebuttonbn=' + bnid + '&updatecache=' + updatecache;
                $.getJSON(datasource + qs)
                    .done(function (data) {
                        $(SELECTORS.STATUS_BAR).append(self.initStatusBar(data.status.message));
                        self.initControlPanel(data);
                        if (typeof data.status.can_join != 'undefined') {
                            $(SELECTORS.JOIN_BUTTON).append(self.initJoinButton(data.status));
                        }
                        if (typeof data.status.can_end != 'undefined' && data.status.can_end) {
                            $(SELECTORS.END_BUTTON).append(self.initEndButton(data.status));
                        }
                        if (!data.status.can_join) {
                            self.waitModerator({
                                id: id,
                                bnid: bnid
                            });
                        }
                });
            },

            /**
             * Create the control panel (where room stats are displayed).
             * @param OBJECT data - returned from bbb ajax call.
             */
            initControlPanel: function(data){
                var controlPanelDivHtml = '';
                var startedAt = this.msgStartedAt(data.info.startTime);
                var moderatorCount = data.info.moderatorCount;
                var participantCount = data.info.participantCount;
                var viewerCount = participantCount - moderatorCount;
                var startAtMsg = ' <b>' + startedAt.hours + ':' + (startedAt.minutes < 10 ? '0' : '');
                startAtMsg += startedAt.minutes + '</b>. ';
                var controlPanelDiv = $(document.createElement('div')).attr('id', 'control_panel_div');
                if (data.running) {
                    var stringsToRetrieve = [
                        {
                            key: 'view_message_session_started_at',
                            component: 'bigbluebuttonbn'
                        },
                        {
                            key: 'view_message_moderator',
                            component: 'bigbluebuttonbn'
                        },
                        {
                            key: 'view_message_moderators',
                            component: 'bigbluebuttonbn'
                        },
                        {
                            key: 'view_message_viewer',
                            component: 'bigbluebuttonbn'
                        },
                        {
                            key: 'view_message_viewers',
                            component: 'bigbluebuttonbn'
                        },
                        {
                            key: 'view_message_session_has_users',
                            component: 'bigbluebuttonbn'
                        },
                        {
                            key: 'view_message_and',
                            component: 'bigbluebuttonbn'
                        },
                        {
                            key: 'view_message_session_no_users',
                            component: 'bigbluebuttonbn'
                        }
                    ];
                    str.get_strings(stringsToRetrieve)
                        .done(function (results) {
                            //Display start time message
                            controlPanelDivHtml += results[0] + startAtMsg;

                            //determine which strings to used based on participants
                            var msgModerators, msgViewers;

                            if (moderatorCount === 1) {
                                msgModerators = results[1];
                            }
                            else {
                                msgModerators = results[2];
                            }
                            if (viewerCount === 1) {
                                msgViewers = results[3];
                            }
                            else {
                                msgViewers = results[4];
                            }
                            if (participantCount >= 1) {
                                controlPanelDivHtml += results[5] + ' <b>' + moderatorCount + '</b> ' + msgModerators;
                                controlPanelDivHtml += ' ' + results[6] + ' <b>' + viewerCount + '</b> ' + msgViewers + '.';
                            }
                            else {
                                controlPanelDivHtml += results[7];
                            }

                            //Add messages to control panel
                            controlPanelDiv.html(controlPanelDivHtml);
                            $(SELECTORS.CONTROL_PANEL).append(controlPanelDiv);
                        });
                }
            },

            /**
             * Create the join button.
             * @param status - returned from bbb ajax call.
             */
            initJoinButton: function (status) {
                var self = this;
                var joinButtonInput = $(document.createElement('input'));
                joinButtonInput.attr('id', 'join_button_input');
                joinButtonInput.prop('type', 'button');
                joinButtonInput.prop('value', status.join_button_text);
                joinButtonInput.addClass('btn btn-primary');
                joinButtonInput.click(function () {
                    self.join(status.join_url);
                });

                if (!status.can_join) {
                    // Disable join button.
                    joinButtonInput.prop('disabled', true);

                    // Create a img element.
                    var spinningWheel = $(document.createElement('img'));
                    spinningWheel.attr('id', 'spinning_wheel');
                    spinningWheel.attr('src', 'pix/i/processing16.gif');

                    // Add the spinning wheel.
                    $(SELECTORS.STATUS_BAR_SPAN).after('&nbsp;', spinningWheel);
                }
                return joinButtonInput;
            },

            /**
             * Create End button.
             * @param Object status - returned from bbb ajax call.
             */
            initEndButton: function (status) {
                var endButtonInput = $(document.createElement('input'));
                endButtonInput.attr('id', 'end_button_input');
                endButtonInput.prop('type', 'button');
                endButtonInput.prop('value', status.end_button_text);
                endButtonInput.addClass('btn btn-secondary');
                if (status.can_end) {
                    endButtonInput.click(function () {
                        broker.endMeeting();
                    });
                }
                return endButtonInput;
            },

            /**
             * Determine meeting run time.
             * @param Timestamp startTime
             */
            msgStartedAt: function (startTime) {
                var startTimestamp = (parseInt(startTime, 10) - parseInt(startTime, 10) % 1000);
                var date = new Date(startTimestamp);
                var hours = date.getHours();
                var minutes = date.getMinutes();
                return {
                    hours: hours,
                    minutes: minutes
                };
            },

            /**
             * Actions to perform at meeting end.
             */
            endMeeting: function () {
                $(SELECTORS.CONTROL_PANEL_DIV).remove();
                $(SELECTORS.JOIN_BUTTON).hide();
                $(SELECTORS.END_BUTTON).hide();
            },

            /**
             * Interval to update the room at.
             * @param delay
             */
            remoteUpdate: function (delay) {
                var self = this;
                setTimeout(function () {
                    self.cleanRoom();
                    self.updateRoom(true);
                }, delay);
            },

            /**
             * Clean the room of existing items.
             */
            cleanRoom: function () {
                $(SELECTORS.STATUS_BAR_SPAN).remove();
                $(SELECTORS.CONTROL_PANEL_DIV).remove();
                $(SELECTORS.JOIN_BUTTON).empty();
                $(SELECTORS.END_BUTTON).empty();
            },

            /**
             * Attempt to slow down window closing.
             * TODO: this most likely won't work with newer browser.
             */
            windowClose: function () {
                window.onunload = function () {
                    opener.this.remoteUpdate(5000);
                };
                window.close();
            },

            /**
             * In meetings where users can't join before moderator, wait for moderator.
             * @param payload
             */
            waitModerator: function (payload) {
                var self = this;
                var pooling = setInterval(function () {
                    var qs = "action=meeting_info&id=" + payload.id + "&bigbluebuttonbn=" + payload.bnid;
                    $.getJSON({
                        url: datasource + qs
                    })
                        .done(function (data) {
                            if (data.running) {
                                self.cleanRoom();
                                self.updateRoom();
                                clearInterval(pooling);
                                return;
                            }
                        })
                        .fail(function (error) {
                            payload.message = error.message;
                        });
                }, pinginterval);
            },

            /**
             * Join the meeting room.
             * @param {string} joinUrl
             */
            join: function (joinUrl) {
                var self = this;
                broker.joinRedirect(joinUrl);
                // Update view.
                setTimeout(function () {
                    self.cleanRoom();
                    self.updateRoom(true);
                }, 15000);
            },

            /**
             * Add completion check (if enabled).
             */
            initCompletionValidate: function () {
                var node = yui.one('a[href*=completion_validate]');
                if (!node) {
                    return;
                }
                var qs = node.get('hash').substr(1);
                node.on("click", function () {
                    broker.completionValidate(qs);
                });
            }

        };

        return Rooms;
    });