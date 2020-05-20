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

 * @module mod_bigbluebuttonbn/rooms
*/

define(['jquery', 'core/config', 'core/str', 'core/yui', 'mod_bigbluebuttonbn/broker'],
    function ($, MDLCFG, STR, Y, BROKER) {

        var Rooms = function () {
            //
        };

        Rooms.init = function (bigbluebuttonbn) {
            this.datasource = MDLCFG.wwwroot + "/mod/bigbluebuttonbn/bbb_ajax.php?sesskey=" + MDLCFG.sesskey + "&";
            this.bigbluebuttonbn = bigbluebuttonbn;
            this.pinginterval = bigbluebuttonbn.ping_interval;
            if (this.pinginterval === 0) {
                this.pinginterval = 10000;
            }
            if (this.bigbluebuttonbn.profile_features.indexOf('all') != -1 ||
                this.bigbluebuttonbn.profile_features.indexOf('showroom') != -1) {
                this.initRoom();
            }
            this.initCompletionValidate();
        };

        Rooms.initRoom = function () {
            console.log(this.bigbluebuttonbn);
            if (this.bigbluebuttonbn.activity !== 'open') {
                STR.get_string('view_message_conference_has_ended', 'bigbluebuttonbn')
                    .done(function (string) {
                        $('#status_bar').append(Rooms.initStatusBar(string));
                    });
                if (this.bigbluebuttonbn.activity !== 'ended') {
                    STR.get_string('view_message_conference_not_started', 'bigbluebuttonbn')
                        .done(function (string) {
                            var statusBar = [
                                string,
                                this.bigbluebuttonbn.opening,
                                this.bigbluebuttonbn.closing
                            ];
                            $('#status_bar').append(Rooms.initStatusBar(statusBar));
                        });
                }
                return;
            }
            this.updateRoom();
        };

        Rooms.initStatusBar = function (statusMessage) {
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
        };

        Rooms.updateRoom = function (f) {
            var updatecache = 'false';
            if (typeof f !== 'undefined' && f) {
                updatecache = 'true';
            }
            var id = this.bigbluebuttonbn.meetingid;
            var bnid = this.bigbluebuttonbn.bigbluebuttonbnid;
            var qs = 'action=meeting_info&id=' + id + '&bigbluebuttonbn=' + bnid + '&updatecache=' + updatecache;
            $.getJSON(this.datasource + qs, function () { })
                .done(function (data) {
                    console.log(data);
                    $('#status_bar').append(Rooms.initStatusBar(data.status.message));
                    Rooms.initControlPanel(data);
                    if (typeof data.status.can_join != 'undefined') {
                        $('#join_button').append(Rooms.initJoinButton(data.status));
                    }
                    if (typeof data.status.can_end != 'undefined' && data.status.can_end) {
                        $('#end_button').append(Rooms.initEndButton(data.status));
                    }
                    if (!data.status.can_join) {
                        this.waitModerator({
                            id: id,
                            bnid: bnid
                        });
                    }
                })
                .fail(function () { });
        };

        Rooms.initControlPanel = function (data) {
            var controlPanelDivHtml = '';
            var startedAt = Rooms.msgStartedAt(data.info.startTime);
            var moderatorCount = data.info.moderatorCount;
            var participantCount = data.info.participantCount;
            var viewerCount = participantCount - moderatorCount;

            var startAtMsg = ' <b>' + startedAt.hours + ':' + (startedAt.minutes < 10 ? '0' : '') + startedAt.minutes + '</b>. ';
            var controlPanelDiv = $(document.createElement('div')).attr('id', 'control_panel_div');
            if (data.running) {
                var stringsToRetrieve = [
                    {
                        key:'view_message_session_started_at',
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
                STR.get_strings(stringsToRetrieve)
                    .done(function(results){
                        //Display start time message
                        controlPanelDivHtml += results[0] + startAtMsg;

                        //determine which strings to used based on participants
                        var msgModerators, msgViewers;

                        if (moderatorCount === 1){
                            msgModerators = results[1];
                        }
                        else{
                            msgModerators = results[2];
                        }
                        if (viewerCount === 1){
                            msgViewers = results[3];
                        }
                        else{
                            msgViewers = results[4];
                        }
                        if(participantCount >= 1){
                            controlPanelDivHtml += results[5] + ' <b>' + moderatorCount + '</b> ' + msgModerators;
                            controlPanelDivHtml += ' ' + results[6] + ' <b>' + viewerCount + '</b> ' + msgViewers + '.';
                        }
                        else{
                            controlPanelDivHtml += results[7];
                        }

                        //Add messages to control panel
                        controlPanelDiv.html(controlPanelDivHtml);
                        $('#control_panel').append(controlPanelDiv);
                    });
            }
        };

        Rooms.initJoinButton = function (status) {
            var joinButtonInput = $(document.createElement('input'));
            joinButtonInput.attr('id', 'join_button_input');
            joinButtonInput.prop('type', 'button');
            joinButtonInput.prop('value', status.join_button_text);
            joinButtonInput.addClass('btn btn-primary');
            joinButtonInput.click(function () {
                Rooms.join(status.join_url);
            });

            if (!status.can_join) {
                // Disable join button.
                joinButtonInput.prop('disabled', true);

                // Create a img element.
                var spinningWheel = $(document.createElement('img'));
                spinningWheel.attr('id', 'spinning_wheel');
                spinningWheel.attr('src', 'pix/i/processing16.gif');

                // Add the spinning wheel.
                $('#status_bar_span').after('&nbsp;', spinningWheel);
            }
            return joinButtonInput;
        };

        Rooms.initEndButton = function (status) {
            var endButtonInput = $(document.createElement('input'));
            endButtonInput.attr('id', 'end_button_input');
            endButtonInput.prop('type', 'button');
            endButtonInput.prop('value', status.end_button_text);
            endButtonInput.addClass('btn btn-secondary');

            if (status.can_end) {
                endButtonInput.click(function () {
                    BROKER.endMeeting();
                });
            }
            return endButtonInput;
        };

        Rooms.msgStartedAt = function (startTime) {
            var startTimestamp = (parseInt(startTime, 10) - parseInt(startTime, 10) % 1000);
            var date = new Date(startTimestamp);
            var hours = date.getHours();
            var minutes = date.getMinutes();
            return {
                hours: hours,
                minutes: minutes
            };
        };

        Rooms.endMeeting = function () {
            $('#control_panel_div').remove();
            $('#join_button').hide();
            $('#end_button').hide();
        };

        Rooms.remoteUpdate = function (delay) {
            setTimeout(function () {
                Rooms.cleanRoom();
                Rooms.updateRoom(true);
            }, delay);
        };

        Rooms.cleanRoom = function () {
            $('#status_bar_span').remove();
            $('#control_panel_div').remove();
            $('#join_button').empty();
            $('#end_button').empty();
        };

        Rooms.windowClose = function () {
            window.onunload = function () {
                opener.Rooms.remoteUpdate(5000);
            };
            window.close();
        };

        Rooms.waitModerator = function (payload) {
            var pooling = setInterval(function () {
                var qs = "action=meeting_info&id=" + payload.id + "&bigbluebuttonbn=" + payload.bnid;
                $.getJSON({
                    url: this.datasource + qs
                })
                    .done(function (data) {
                        if (data.running) {
                            Rooms.cleanRoom();
                            Rooms.updateRoom();
                            clearInterval(pooling);
                            return;
                        }
                    })
                    .fail(function (error) {
                        payload.message = error.message;
                    });
            }, this.pinginterval);
        };

        Rooms.join = function (joinUrl) {
            BROKER.joinRedirect(joinUrl);
            // Update view.
            setTimeout(function () {
                Rooms.cleanRoom();
                Rooms.updateRoom(true);
            }, 15000);
        };

        Rooms.initCompletionValidate = function () {
            var node = Y.one('a[href*=completion_validate]');
            if (!node) {
                return;
            }
            var qs = node.get('hash').substr(1);
            node.on("click", function () {
                BROKER.completionValidate(qs);
            });
        };

        return Rooms;
    });